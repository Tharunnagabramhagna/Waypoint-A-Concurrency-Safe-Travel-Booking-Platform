import bcrypt from 'bcryptjs';
import { pool } from '../db/pool.js';
import {
  signAccessToken,
  signRefreshToken,
  setAuthCookies,
} from './authController.js';
import logger from '../lib/logger.js';

/**
 * Find or create a user from an OAuth profile.
 * 
 * Account linking rules:
 *  1. If a user with the provider-specific ID exists → return it (repeat login).
 *  2. If a user with the same email exists AND email is verified by provider → link the OAuth provider ID.
 *  3. If a user with the same email exists BUT email is NOT verified by provider → reject auto-linking for security!
 *  4. Otherwise → create a new user.
 *
 * @param {Object} params
 * @param {'google'|'facebook'} params.provider
 * @param {string} params.providerId  - e.g. Google sub or Facebook ID
 * @param {string} params.email
 * @param {string} params.fullName
 * @param {string|null} params.avatarUrl
 * @param {boolean} [params.emailVerified=false]
 * @returns {Promise<Object>} user row
 */
async function findOrCreateOAuthUser({ provider, providerId, email, fullName, avatarUrl, emailVerified = false }) {
  const providerIdColumn = provider === 'google' ? 'google_id' : 'facebook_id';

  // 1. Check if user exists by provider ID (repeat OAuth login)
  const { rows: byProvider } = await pool.query(
    `SELECT id, email, full_name, role, auth_provider, avatar_url FROM users WHERE ${providerIdColumn} = $1`,
    [providerId]
  );
  if (byProvider.length > 0) {
    // Update avatar if changed
    if (avatarUrl && avatarUrl !== byProvider[0].avatar_url) {
      await pool.query(`UPDATE users SET avatar_url = $1, updated_at = NOW() WHERE id = $2`, [avatarUrl, byProvider[0].id]);
    }
    return byProvider[0];
  }

  // 2. Check if user exists by email (account linking)
  const { rows: byEmail } = await pool.query(
    `SELECT id, email, full_name, role, auth_provider FROM users WHERE email = $1`,
    [email.toLowerCase()]
  );
  if (byEmail.length > 0) {
    // Safety check: ONLY auto-link if the provider explicitly confirmed the email is verified!
    if (!emailVerified) {
      logger.warn(
        { email, provider, providerId },
        'Account linking rejected: OAuth email is not verified by provider'
      );
      const err = new Error('Cannot link social account because email is not verified by provider');
      err.code = 'UNVERIFIED_EMAIL_LINKING';
      throw err;
    }

    // Link the OAuth provider to the existing account
    await pool.query(
      `UPDATE users SET ${providerIdColumn} = $1, avatar_url = COALESCE(avatar_url, $2), updated_at = NOW() WHERE id = $3`,
      [providerId, avatarUrl, byEmail[0].id]
    );
    logger.info({ userId: byEmail[0].id, provider }, 'OAuth account linked to existing user');
    return byEmail[0];
  }

  // 3. Create a new user (OAuth-only — no password_hash)
  const { rows: newUser } = await pool.query(
    `INSERT INTO users (email, full_name, auth_provider, ${providerIdColumn}, avatar_url)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, email, full_name, role, auth_provider`,
    [email.toLowerCase(), fullName, provider, providerId, avatarUrl]
  );
  logger.info({ userId: newUser[0].id, provider }, 'New OAuth user created');
  return newUser[0];
}

/**
 * Common handler called after Passport authenticates a user.
 * Issues JWT + refresh token, sets cookies, redirects to frontend.
 */
export async function handleOAuthCallback(req, res) {
  try {
    const user = req.user; // set by Passport
    if (!user) {
      return res.redirect(`${getFrontendUrl()}/login?error=auth_failed`);
    }

    // Issue tokens using the exact same logic as email/password auth
    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);
    const refreshTokenHash = await bcrypt.hash(refreshToken, 12);

    // Store refresh token in DB
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, device_info)
       VALUES ($1, $2, $3, $4)`,
      [user.id, refreshTokenHash, expiresAt, `OAuth ${user.auth_provider || 'social'}`]
    );

    // Set same HttpOnly cookies as email/password auth
    setAuthCookies(res, accessToken, refreshToken);

    logger.info({ userId: user.id, provider: user.auth_provider }, 'OAuth login successful');

    // Redirect to frontend
    res.redirect(getFrontendUrl());
  } catch (err) {
    logger.error(err, 'OAuth callback failed');
    const errType = err.code === 'UNVERIFIED_EMAIL_LINKING' ? 'email_not_verified' : 'auth_failed';
    res.redirect(`${getFrontendUrl()}/login?error=${errType}`);
  }
}

/**
 * Returns the frontend URL for redirects.
 * In development → localhost:5173, in production → first CORS_ORIGIN.
 */
function getFrontendUrl() {
  if (process.env.FRONTEND_URL) return process.env.FRONTEND_URL;
  const corsOrigins = process.env.CORS_ORIGIN || '';
  const origins = corsOrigins.split(',').map(o => o.trim()).filter(Boolean);
  // Prefer the non-localhost origin in production, otherwise first origin
  if (process.env.NODE_ENV === 'production') {
    const prodOrigin = origins.find(o => !o.includes('localhost'));
    if (prodOrigin) return prodOrigin;
  }
  return origins[0] || 'http://localhost:5173';
}

export { findOrCreateOAuthUser, getFrontendUrl };
