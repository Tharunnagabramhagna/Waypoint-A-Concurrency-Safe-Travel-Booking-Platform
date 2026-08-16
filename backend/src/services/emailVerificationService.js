import { randomBytes, createHash, timingSafeEqual } from 'crypto';
import bcrypt from 'bcryptjs';
import { pool, withTransaction } from '../db/pool.js';
import { AppError } from '../middleware/errorHandler.js';
import logger from '../lib/logger.js';
import { sendVerificationEmail, getEmailVerificationTtlHours } from './emailService.js';

/**
 * Helper to generate a 32-byte random verification token string and its SHA-256 hash.
 */
function generateTokenPair() {
  const rawToken = randomBytes(32).toString('hex');
  const tokenHash = createHash('sha256').update(rawToken).digest('hex');
  return { rawToken, tokenHash };
}

/**
 * Safe timing-equal compare for token hashes to prevent timing side-channel attacks.
 */
function isHashMatch(candidateHash, storedHash) {
  if (!candidateHash || !storedHash) return false;
  const candidateBuf = Buffer.from(candidateHash, 'utf8');
  const storedBuf = Buffer.from(storedHash, 'utf8');
  if (candidateBuf.length !== storedBuf.length) return false;
  return timingSafeEqual(candidateBuf, storedBuf);
}

/**
 * Register user with email verification.
 * Wraps user insertion and token storage in a single PostgreSQL transaction.
 */
export async function registerUserWithVerification({ email, password, fullName, phone }) {
  const normalizedEmail = email.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(password, 12);
  const ttlHours = getEmailVerificationTtlHours();
  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);

  const { rawToken, tokenHash } = generateTokenPair();

  // 1. Transactional DB Writes
  const user = await withTransaction(async (client) => {
    // Check if user exists by email
    const { rows: existingRows } = await client.query(
      `SELECT id, email, email_verified, created_at FROM users WHERE email = $1 FOR UPDATE`,
      [normalizedEmail]
    );

    if (existingRows.length > 0) {
      const existing = existingRows[0];
      if (existing.email_verified) {
        throw new AppError(409, 'Email already registered', 'EMAIL_TAKEN');
      }

      // Option A & B: Unverified account cleanup / re-registration
      // If an existing unverified account is older than 48 hours or expired, delete old unverified user & tokens
      const isStale = (Date.now() - new Date(existing.created_at).getTime()) > 48 * 60 * 60 * 1000;
      if (isStale) {
        logger.info({ email: normalizedEmail, userId: existing.id }, '[Verification Service] Removing stale unverified user for re-registration');
        await client.query(`DELETE FROM users WHERE id = $1`, [existing.id]);
      } else {
        // Option B: Allow re-registration for recent unverified account by replacing it
        logger.info({ email: normalizedEmail, userId: existing.id }, '[Verification Service] Overwriting unverified account for new registration');
        await client.query(`DELETE FROM users WHERE id = $1`, [existing.id]);
      }
    }

    // Insert new unverified user
    const { rows: newUserRows } = await client.query(
      `INSERT INTO users (email, password_hash, full_name, phone, email_verified, auth_provider)
       VALUES ($1, $2, $3, $4, false, 'local')
       RETURNING id, email, full_name, role, created_at`,
      [normalizedEmail, passwordHash, fullName, phone || null]
    );

    const newUser = newUserRows[0];

    // Store token hash in email_verification_tokens
    await client.query(
      `INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [newUser.id, tokenHash, expiresAt]
    );

    return newUser;
  });

  // 2. Email Delivery (Post-Commit Transaction Safety)
  // If email dispatch fails (e.g. SMTP down), log error but keep created account in DB so user can resend verification later
  try {
    await sendVerificationEmail({
      toEmail: user.email,
      verificationToken: rawToken,
      userFullName: user.full_name,
    });
  } catch (emailErr) {
    logger.error(emailErr, '[Verification Service] Email dispatch failed after user creation — user kept in DB for resend');
  }

  return user;
}

/**
 * Verify email token and mark user as email_verified = true.
 * Invalidates ALL prior verification tokens for the user.
 */
export async function verifyEmailToken(rawToken) {
  if (!rawToken || typeof rawToken !== 'string') {
    throw new AppError(400, 'Verification token is required', 'INVALID_TOKEN');
  }

  const candidateHash = createHash('sha256').update(rawToken.trim()).digest('hex');

  return await withTransaction(async (client) => {
    // Search for matching token record by token_hash
    const { rows } = await client.query(
      `SELECT evt.id AS token_id, evt.user_id, evt.token_hash, evt.expires_at, evt.used_at,
              u.email, u.full_name, u.email_verified
       FROM email_verification_tokens evt
       JOIN users u ON evt.user_id = u.id
       WHERE evt.token_hash = $1
       FOR UPDATE`,
      [candidateHash]
    );

    const tokenRecord = rows[0];

    if (!tokenRecord || !isHashMatch(candidateHash, tokenRecord.token_hash)) {
      throw new AppError(400, 'Invalid verification token', 'INVALID_TOKEN');
    }

    if (tokenRecord.used_at) {
      throw new AppError(400, 'This verification link has already been used', 'TOKEN_USED');
    }

    if (new Date(tokenRecord.expires_at) < new Date()) {
      throw new AppError(400, 'This verification link has expired', 'TOKEN_EXPIRED');
    }

    // Mark user email as verified
    await client.query(
      `UPDATE users SET email_verified = true, updated_at = NOW() WHERE id = $1`,
      [tokenRecord.user_id]
    );

    // Invalidate ALL verification tokens for this user
    await client.query(
      `UPDATE email_verification_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL`,
      [tokenRecord.user_id]
    );

    logger.info({ userId: tokenRecord.user_id, email: tokenRecord.email }, '[Verification Service] Email successfully verified');
    return { userId: tokenRecord.user_id, email: tokenRecord.email };
  });
}

/**
 * Resend verification email with rate limiting, cooldown, and token invalidation.
 */
export async function resendVerificationToken(email) {
  if (!email || typeof email !== 'string') {
    return; // Generic response — no leak
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Find user by normalized email
  const { rows } = await pool.query(
    `SELECT id, email, full_name, email_verified FROM users WHERE email = $1`,
    [normalizedEmail]
  );

  const user = rows[0];
  if (!user || user.email_verified) {
    // Generic response to prevent email enumeration
    return;
  }

  // 60-second cooldown check between resends for the same user
  const { rows: latestToken } = await pool.query(
    `SELECT created_at FROM email_verification_tokens WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [user.id]
  );

  if (latestToken.length > 0) {
    const lastCreated = new Date(latestToken[0].created_at).getTime();
    const timeSinceLast = (Date.now() - lastCreated) / 1000;
    if (timeSinceLast < 60) {
      const waitSeconds = Math.ceil(60 - timeSinceLast);
      const err = new AppError(429, `Please wait ${waitSeconds} seconds before requesting another email.`, 'RESEND_COOLDOWN');
      err.retryAfter = waitSeconds;
      throw err;
    }
  }

  const ttlHours = getEmailVerificationTtlHours();
  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);
  const { rawToken, tokenHash } = generateTokenPair();

  // Transactionally invalidate prior tokens and insert new token
  await withTransaction(async (client) => {
    // Invalidate all active prior tokens
    await client.query(
      `UPDATE email_verification_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL`,
      [user.id]
    );

    // Insert new token
    await client.query(
      `INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, tokenHash, expiresAt]
    );
  });

  // Dispatch email
  await sendVerificationEmail({
    toEmail: user.email,
    verificationToken: rawToken,
    userFullName: user.full_name,
  });

  logger.info({ userId: user.id, email: user.email }, '[Verification Service] Resent verification email');
}

/**
 * Scheduled cleanup job for unverified accounts older than 48 hours.
 */
export async function cleanupUnverifiedAccounts() {
  try {
    const { rowCount } = await pool.query(
      `DELETE FROM users WHERE email_verified = false AND created_at < NOW() - INTERVAL '48 hours'`
    );
    if (rowCount > 0) {
      logger.info({ deletedCount: rowCount }, '[Verification Cleanup] Deleted abandoned unverified accounts');
    }
    return rowCount;
  } catch (err) {
    logger.error(err, '[Verification Cleanup] Cleanup job failed');
    return 0;
  }
}
