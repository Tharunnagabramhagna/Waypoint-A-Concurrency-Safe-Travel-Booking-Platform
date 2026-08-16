import { randomInt, createHash, timingSafeEqual } from 'crypto';
import jwt from 'jsonwebtoken';
import { pool } from '../db/pool.js';
import { AppError } from '../middleware/errorHandler.js';
import logger from '../lib/logger.js';
import { isDisposableEmail } from '../lib/disposableEmails.js';
import { sendOtpEmail } from './emailService.js';

const OTP_EXPIRY_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;
const OTP_COOLDOWN_SECONDS = 60;
const OTP_SESSION_SECRET = process.env.JWT_ACCESS_SECRET; // Reuse existing secret for signing short-lived OTP session tokens

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

function generateOtp() {
  return String(randomInt(100000, 999999));
}

function hashOtp(otp) {
  return createHash('sha256').update(otp).digest('hex');
}

function isHashMatch(candidateHash, storedHash) {
  if (!candidateHash || !storedHash) return false;
  const a = Buffer.from(candidateHash, 'utf8');
  const b = Buffer.from(storedHash, 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// ──────────────────────────────────────────────────────────────────────────────
// sendEmailOtp
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Validate email, check duplicates, enforce cooldown, generate OTP, store hash, send email.
 */
export async function sendEmailOtp(email) {
  const normalizedEmail = email.trim().toLowerCase();

  // 1. Optional disposable email rejection
  if (process.env.EMAIL_REJECT_DISPOSABLE === 'true' && isDisposableEmail(normalizedEmail)) {
    throw new AppError(400, 'Disposable email addresses are not allowed. Please use a permanent email.', 'DISPOSABLE_EMAIL');
  }

  // 2. Check if verified user already exists with this email
  const { rows: existingUsers } = await pool.query(
    `SELECT id, email_verified FROM users WHERE email = $1`,
    [normalizedEmail]
  );
  if (existingUsers.length > 0 && existingUsers[0].email_verified) {
    throw new AppError(409, 'An account with this email already exists. Please sign in.', 'EMAIL_TAKEN');
  }

  // 3. Enforce 60-second cooldown
  const { rows: recentOtps } = await pool.query(
    `SELECT created_at FROM email_otps
     WHERE email = $1 AND status = 'pending'
     ORDER BY created_at DESC LIMIT 1`,
    [normalizedEmail]
  );
  if (recentOtps.length > 0) {
    const elapsed = (Date.now() - new Date(recentOtps[0].created_at).getTime()) / 1000;
    if (elapsed < OTP_COOLDOWN_SECONDS) {
      const waitSeconds = Math.ceil(OTP_COOLDOWN_SECONDS - elapsed);
      const err = new AppError(429, `Please wait ${waitSeconds} seconds before requesting another code.`, 'OTP_COOLDOWN');
      err.retryAfter = waitSeconds;
      throw err;
    }
  }

  // 4. Generate OTP + hash
  const otp = generateOtp();
  const otpHash = hashOtp(otp);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  // 5. Mark all previous pending OTPs for this email as expired (soft-delete)
  await pool.query(
    `UPDATE email_otps SET status = 'expired' WHERE email = $1 AND status = 'pending'`,
    [normalizedEmail]
  );

  // 6. Insert new OTP record
  await pool.query(
    `INSERT INTO email_otps (email, otp_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [normalizedEmail, otpHash, expiresAt]
  );

  // 7. Send email via Resend API
  try {
    await sendOtpEmail({ toEmail: normalizedEmail, otp });
  } catch (emailErr) {
    // If email dispatch fails, mark OTP as failed so cooldown doesn't lock out the user
    await pool.query(
      `UPDATE email_otps SET status = 'failed' WHERE email = $1 AND otp_hash = $2`,
      [normalizedEmail, otpHash]
    );
    logger.error({ err: emailErr, email: normalizedEmail }, '[OTP Service] Email dispatch failed — marked OTP as failed');
    throw emailErr;
  }

  logger.info({ email: normalizedEmail }, '[OTP Service] OTP generated and dispatched');
  return { success: true };
}

// ──────────────────────────────────────────────────────────────────────────────
// verifyEmailOtp
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Verify 6-digit OTP for the given email.
 * Returns an OTP verification session token (signed JWT, 10-min TTL).
 */
export async function verifyEmailOtp(email, otp) {
  const normalizedEmail = email.trim().toLowerCase();
  const candidateHash = hashOtp(otp.trim());

  // 1. Find the latest pending OTP for this email
  const { rows } = await pool.query(
    `SELECT id, otp_hash, expires_at, attempts, status
     FROM email_otps
     WHERE email = $1 AND status = 'pending'
     ORDER BY created_at DESC LIMIT 1`,
    [normalizedEmail]
  );

  const record = rows[0];

  if (!record) {
    throw new AppError(400, 'No verification code found. Please request a new code.', 'OTP_NOT_FOUND');
  }

  // 2. Check expiry
  if (new Date(record.expires_at) < new Date()) {
    await pool.query(`UPDATE email_otps SET status = 'expired' WHERE id = $1`, [record.id]);
    throw new AppError(400, 'Verification code has expired. Please request a new code.', 'OTP_EXPIRED');
  }

  // 3. Atomically increment attempts (persists even if verification fails)
  const { rows: updatedRows } = await pool.query(
    `UPDATE email_otps SET attempts = attempts + 1 WHERE id = $1 RETURNING attempts`,
    [record.id]
  );
  const newAttempts = updatedRows[0].attempts;

  // 4. Max attempts check
  if (newAttempts >= OTP_MAX_ATTEMPTS) {
    await pool.query(`UPDATE email_otps SET status = 'failed' WHERE id = $1`, [record.id]);
    throw new AppError(429, 'Too many failed attempts. Please request a new verification code.', 'MAX_ATTEMPTS_EXCEEDED');
  }

  // 5. Compare hashes (timing-safe)
  if (!isHashMatch(candidateHash, record.otp_hash)) {
    const remaining = OTP_MAX_ATTEMPTS - newAttempts;
    throw new AppError(400, `Invalid verification code. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`, 'INVALID_OTP');
  }

  // 6. ✓ OTP verified — mark record in a transaction
  await pool.query(`UPDATE email_otps SET status = 'verified' WHERE id = $1`, [record.id]);

  logger.info({ email: normalizedEmail }, '[OTP Service] Email OTP verified successfully');

  // 7. Issue a short-lived OTP verification session token (10 min)
  const otpSessionToken = jwt.sign(
    { email: normalizedEmail, purpose: 'otp_verified' },
    OTP_SESSION_SECRET,
    { expiresIn: '10m' }
  );

  return { verified: true, otpSessionToken };
}

// ──────────────────────────────────────────────────────────────────────────────
// isEmailOtpVerified (via session token)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Validate the OTP verification session token from the request cookie.
 * Returns the verified email if valid, throws otherwise.
 */
export function validateOtpSession(otpSessionToken) {
  if (!otpSessionToken) {
    throw new AppError(403, 'Email verification is required before registration.', 'OTP_NOT_VERIFIED');
  }
  try {
    const decoded = jwt.verify(otpSessionToken, OTP_SESSION_SECRET);
    if (decoded.purpose !== 'otp_verified' || !decoded.email) {
      throw new AppError(403, 'Invalid verification session.', 'OTP_NOT_VERIFIED');
    }
    return decoded.email;
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new AppError(403, 'Verification session has expired. Please verify your email again.', 'OTP_SESSION_EXPIRED');
    }
    throw new AppError(403, 'Invalid verification session.', 'OTP_NOT_VERIFIED');
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// cleanupExpiredOtps
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Delete OTP records that are expired/failed/verified AND older than 24 hours.
 */
export async function cleanupExpiredOtps() {
  try {
    const { rowCount } = await pool.query(
      `DELETE FROM email_otps
       WHERE status IN ('expired', 'failed', 'verified')
       AND created_at < NOW() - INTERVAL '24 hours'`
    );
    if (rowCount > 0) {
      logger.info({ deletedCount: rowCount }, '[OTP Cleanup] Deleted expired OTP records (>24h)');
    }
    return rowCount;
  } catch (err) {
    logger.error(err, '[OTP Cleanup] Cleanup job failed');
    return 0;
  }
}
