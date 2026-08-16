import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { randomBytes, createHash } from 'crypto';
import { pool, withTransaction } from '../db/pool.js';
import { AppError } from '../middleware/errorHandler.js';
import logger from '../lib/logger.js';
import { sendPasswordResetEmail } from '../services/emailService.js';
import { getGmailAuthUrl, exchangeGmailAuthCode } from '../services/gmailService.js';
import {
  sendEmailOtp as sendOtpService,
  verifyEmailOtp as verifyOtpService,
  validateOtpSession,
} from '../services/emailOtpService.js';

const emailSchema = z.string().trim().email().max(254).transform((email) => email.toLowerCase());

const COMMON_PASSWORDS = new Set([
  'password',
  'password123',
  '12345678',
  '123456789',
  'qwerty123',
  'admin123',
  'letmein123',
  'waypoint123',
]);

export function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: 'Password is required' };
  }
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters' };
  }
  if (password.length > 128) {
    return { valid: false, message: 'Password must be 128 characters or fewer' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one special character' };
  }
  if (COMMON_PASSWORDS.has(password.toLowerCase().trim())) {
    return { valid: false, message: 'Password is too common and easily guessed' };
  }
  return { valid: true };
}

const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be 128 characters or fewer')
  .superRefine((val, ctx) => {
    const res = validatePassword(val);
    if (!res.valid) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: res.message,
      });
    }
  });

const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  fullName: z.string().trim().min(1).max(120),
  phone: z.string().trim().max(32).optional(),
});

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
  deviceInfo: z.string().trim().max(255).optional(),
});

export function generateRefreshToken() {
  return randomBytes(64).toString('hex');
}

export function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, email: user.email },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m' }
  );
}

export function signRefreshToken(user) {
  return jwt.sign(
    { sub: user ? user.id : undefined },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );
}

export function setAuthCookies(res, accessToken, refreshToken) {
  const isProdOrRender = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';
  
  res.cookie('access-token', accessToken, {
    httpOnly: true,
    secure: isProdOrRender,
    sameSite: isProdOrRender ? 'none' : 'lax',
    path: '/',
    maxAge: 15 * 60 * 1000, // 15 minutes
  });

  res.cookie('refresh-token', refreshToken, {
    httpOnly: true,
    secure: isProdOrRender,
    sameSite: isProdOrRender ? 'none' : 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}

export function clearAuthCookies(res) {
  const isProdOrRender = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';
  res.clearCookie('access-token', { 
    path: '/',
    httpOnly: true,
    secure: isProdOrRender,
    sameSite: isProdOrRender ? 'none' : 'lax'
  });
  res.clearCookie('refresh-token', { 
    path: '/',
    httpOnly: true,
    secure: isProdOrRender,
    sameSite: isProdOrRender ? 'none' : 'lax'
  });
  res.clearCookie('csrf-token', { 
    path: '/',
    httpOnly: true,
    secure: isProdOrRender,
    sameSite: isProdOrRender ? 'none' : 'lax'
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// OTP Endpoints
// ──────────────────────────────────────────────────────────────────────────────

export async function sendEmailOtp(req, res, next) {
  try {
    const { email } = req.body;
    if (!email) throw new AppError(400, 'Email address is required.', 'VALIDATION');
    const parsed = emailSchema.parse(email);
    const result = await sendOtpService(parsed);
    res.json(result);
  } catch (err) {
    logger.error(err, 'Send email OTP failed');
    if (err.code === 'OTP_COOLDOWN') {
      if (err.retryAfter) res.setHeader('Retry-After', String(err.retryAfter));
      return next(err);
    }
    if (err.issues) return next(new AppError(400, err.issues[0].message, 'VALIDATION'));
    next(err);
  }
}

export async function verifyEmailOtp(req, res, next) {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) throw new AppError(400, 'Email and verification code are required.', 'VALIDATION');

    const result = await verifyOtpService(email, otp);

    // Set OTP verification session as HttpOnly cookie (10 min TTL)
    const isProdOrRender = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';
    res.cookie('otp-session', result.otpSessionToken, {
      httpOnly: true,
      secure: isProdOrRender,
      sameSite: isProdOrRender ? 'none' : 'lax',
      path: '/',
      maxAge: 10 * 60 * 1000, // 10 minutes
    });

    res.json({ verified: true });
  } catch (err) {
    logger.error(err, 'Verify email OTP failed');
    next(err);
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Register (requires OTP verification session)
// ──────────────────────────────────────────────────────────────────────────────

export async function register(req, res, next) {
  try {
    const data = registerSchema.parse(req.body);

    // 1. Validate OTP verification session (from HttpOnly cookie)
    const otpSessionToken = req.cookies['otp-session'];
    const verifiedEmail = validateOtpSession(otpSessionToken);

    // 2. Ensure the email in the form matches the verified email
    if (data.email !== verifiedEmail) {
      throw new AppError(403, 'Email does not match verified email. Please verify your email again.', 'EMAIL_MISMATCH');
    }

    // 3. Create user account with email_verified = true
    const passwordHash = await bcrypt.hash(data.password, 12);

    const user = await withTransaction(async (client) => {
      // Check if verified user already exists
      const { rows: existing } = await client.query(
        `SELECT id, email_verified FROM users WHERE email = $1 FOR UPDATE`,
        [data.email]
      );
      if (existing.length > 0 && existing[0].email_verified) {
        throw new AppError(409, 'An account with this email already exists. Please sign in.', 'EMAIL_TAKEN');
      }
      // If unverified user exists (from old flow), delete it
      if (existing.length > 0) {
        await client.query(`DELETE FROM users WHERE id = $1`, [existing[0].id]);
      }

      const { rows: newUserRows } = await client.query(
        `INSERT INTO users (email, password_hash, full_name, phone, email_verified, auth_provider)
         VALUES ($1, $2, $3, $4, true, 'local')
         RETURNING id, email, full_name, role, created_at`,
        [data.email, passwordHash, data.fullName, data.phone || null]
      );

      return newUserRows[0];
    });

    // 4. Clear OTP session cookie (single-use)
    const isProdOrRender = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';
    res.clearCookie('otp-session', {
      path: '/',
      httpOnly: true,
      secure: isProdOrRender,
      sameSite: isProdOrRender ? 'none' : 'lax',
    });

    // 5. Do NOT issue JWTs — redirect user to login page
    logger.info({ userId: user.id, email: user.email }, '[Register] Account created successfully');
    res.status(201).json({
      message: 'Account created successfully. Please sign in.',
      email: user.email,
    });
  } catch (err) {
    logger.error(err, 'Registration failed');
    if (err.issues) return next(new AppError(400, err.issues[0].message, 'VALIDATION'));
    if (err.code === 'EMAIL_TAKEN' || err.code === '23505') {
      return next(new AppError(409, 'An account with this email already exists. Please sign in.', 'EMAIL_TAKEN'));
    }
    next(err);
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Login
// ──────────────────────────────────────────────────────────────────────────────

export async function login(req, res, next) {
  try {
    const data = loginSchema.parse(req.body);
    const { rows } = await pool.query(`SELECT * FROM users WHERE email = $1`, [data.email]);
    const user = rows[0];
    if (!user) throw new AppError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');

    // Guard: OAuth-only users have no password_hash — reject email/password login
    if (!user.password_hash) {
      throw new AppError(401, 'This account uses social login. Please sign in with Google or Facebook.', 'OAUTH_ONLY_ACCOUNT');
    }

    // Guard: Unverified users cannot sign in
    if (!user.email_verified) {
      throw new AppError(403, 'Please verify your email address before signing in.', 'EMAIL_NOT_VERIFIED');
    }

    const ok = await bcrypt.compare(data.password, user.password_hash);
    if (!ok) throw new AppError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);
    const refreshTokenHash = await bcrypt.hash(refreshToken, 12);

    // Store refresh token in DB
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, device_info)
       VALUES ($1, $2, $3, $4)`,
      [user.id, refreshTokenHash, expiresAt, data.deviceInfo || null]
    );

    setAuthCookies(res, accessToken, refreshToken);
    res.json({
      user: { id: user.id, email: user.email, fullName: user.full_name, role: user.role },
    });
  } catch (err) {
    logger.error(err, 'Login failed');
    if (err.issues) return next(new AppError(400, err.issues[0].message, 'VALIDATION'));
    next(err);
  }
}

export async function refresh(req, res, next) {
  try {
    const refreshToken = req.cookies['refresh-token'];
    if (!refreshToken) {
      throw new AppError(401, 'Missing refresh token', 'UNAUTHORIZED');
    }

    // Verify refresh token
    jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    // Find valid refresh token in DB (not expired, not revoked)
    const { rows } = await pool.query(
      `SELECT rt.id AS refresh_token_id,
              rt.token_hash,
              rt.device_info,
              rt.expires_at,
              rt.revoked_at,
              rt.created_at AS refresh_token_created_at,
              u.id AS user_id,
              u.email,
              u.full_name,
              u.role
       FROM refresh_tokens rt 
       JOIN users u ON rt.user_id = u.id 
       WHERE rt.expires_at > NOW() AND rt.revoked_at IS NULL
       ORDER BY rt.created_at DESC`
    );

    // Find matching refresh token by hash
    let validToken = null;
    let user = null;
    for (const row of rows) {
      const match = await bcrypt.compare(refreshToken, row.token_hash);
      if (match) {
        validToken = row;
        user = { id: row.user_id, email: row.email, fullName: row.full_name, role: row.role };
        break;
      }
    }

    if (!validToken) {
      throw new AppError(401, 'Invalid refresh token', 'UNAUTHORIZED');
    }

    // Rotate refresh token: revoke old, issue new
    await withTransaction(async (client) => {
      await client.query(
        `UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1`,
        [validToken.refresh_token_id]
      );

      const newAccessToken = signAccessToken(user);
      const newRefreshToken = signRefreshToken();
      const newRefreshTokenHash = await bcrypt.hash(newRefreshToken, 12);
      const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await client.query(
        `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, device_info)
         VALUES ($1, $2, $3, $4)`,
        [user.id, newRefreshTokenHash, newExpiresAt, validToken.device_info]
      );

      setAuthCookies(res, newAccessToken, newRefreshToken);
    });

    res.json({ user });
  } catch (err) {
    logger.error(err, 'Token refresh failed');
    clearAuthCookies(res);
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return next(new AppError(401, 'Invalid refresh token', 'UNAUTHORIZED'));
    }
    next(err);
  }
}

export async function logout(req, res, next) {
  try {
    const refreshToken = req.cookies['refresh-token'];
    if (refreshToken) {
      try {
        const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        if (payload && payload.sub) {
          await pool.query(
            `UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL`,
            [payload.sub]
          );
        }
      } catch (jwtErr) {
        // If JWT invalid or expired, continue to clear cookies
      }
    }

    clearAuthCookies(res);
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    logger.error(err, 'Logout failed');
    clearAuthCookies(res);
    res.json({ message: 'Logged out successfully' });
  }
}

export async function logoutAll(req, res, next) {
  try {
    // Revoke all refresh tokens for user
    await pool.query(
      `UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL`,
      [req.user.id]
    );
    clearAuthCookies(res);
    res.json({ message: 'Logged out from all devices' });
  } catch (err) {
    logger.error(err, 'Logout all failed');
    next(err);
  }
}

export async function me(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT id, email, full_name, role, created_at FROM users WHERE id = $1`,
      [req.user.id]
    );
    if (!rows[0]) throw new AppError(404, 'User not found', 'NOT_FOUND');
    res.json(rows[0]);
  } catch (err) {
    logger.error(err, 'Get user info failed');
    next(err);
  }
}

const forgotPasswordSchema = z.object({
  email: emailSchema,
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: passwordSchema,
});

export async function forgotPassword(req, res, next) {
  try {
    const data = forgotPasswordSchema.parse(req.body);
    const { rows } = await pool.query(`SELECT id, email, full_name, email_verified FROM users WHERE email = $1`, [data.email]);
    const user = rows[0];

    // Generic success response regardless of email existence to prevent email enumeration
    const genericResponse = {
      message: 'If an account with that email exists, a password reset link has been sent.',
    };

    // Only allow password reset for verified accounts
    if (!user || !user.email_verified) {
      logger.info({ email: data.email }, '[ForgotPassword] Email not found or unverified — returning generic success');
      return res.json(genericResponse);
    }

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour validity

    await withTransaction(async (client) => {
      // Invalidate previous unused reset tokens for this user
      await client.query(
        `UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL`,
        [user.id]
      );

      // Insert new token
      await client.query(
        `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
        [user.id, tokenHash, expiresAt]
      );
    });

    // Send email (or log link if SMTP unconfigured)
    await sendPasswordResetEmail({
      toEmail: user.email,
      resetToken: rawToken,
      userFullName: user.full_name,
    });

    res.json(genericResponse);
  } catch (err) {
    logger.error(err, 'Forgot password request failed');
    if (err.issues) return next(new AppError(400, err.issues[0].message, 'VALIDATION'));
    next(err);
  }
}

export async function verifyResetToken(req, res, next) {
  try {
    const token = req.query.token;
    if (!token || typeof token !== 'string') {
      throw new AppError(400, 'Reset token is required', 'VALIDATION');
    }

    const tokenHash = createHash('sha256').update(token).digest('hex');
    const { rows } = await pool.query(
      `SELECT prt.id, prt.expires_at, prt.used_at, u.email
       FROM password_reset_tokens prt
       JOIN users u ON prt.user_id = u.id
       WHERE prt.token_hash = $1 AND prt.used_at IS NULL AND prt.expires_at > NOW()`,
      [tokenHash]
    );

    if (!rows[0]) {
      throw new AppError(400, 'Invalid or expired password reset token', 'INVALID_TOKEN');
    }

    res.json({ valid: true, email: rows[0].email });
  } catch (err) {
    logger.error(err, 'Verify reset token failed');
    next(err);
  }
}

export async function resetPassword(req, res, next) {
  try {
    const data = resetPasswordSchema.parse(req.body);
    const tokenHash = createHash('sha256').update(data.token).digest('hex');

    await withTransaction(async (client) => {
      const { rows } = await client.query(
        `SELECT prt.id AS token_id, prt.user_id, prt.expires_at, prt.used_at, u.email
         FROM password_reset_tokens prt
         JOIN users u ON prt.user_id = u.id
         WHERE prt.token_hash = $1 AND prt.used_at IS NULL AND prt.expires_at > NOW()
         FOR UPDATE`,
        [tokenHash]
      );

      const tokenRecord = rows[0];
      if (!tokenRecord) {
        throw new AppError(400, 'Invalid or expired password reset token', 'INVALID_TOKEN');
      }

      const passwordHash = await bcrypt.hash(data.newPassword, 12);

      // 1. Update user's password
      await client.query(
        `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
        [passwordHash, tokenRecord.user_id]
      );

      // 2. Mark reset token as used
      await client.query(
        `UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1`,
        [tokenRecord.token_id]
      );

      // 3. Invalidate ALL active refresh tokens/sessions for security
      await client.query(
        `UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL`,
        [tokenRecord.user_id]
      );
    });

    clearAuthCookies(res);
    res.json({ message: 'Password reset successful. Please sign in with your new password.' });
  } catch (err) {
    logger.error(err, 'Reset password failed');
    if (err.issues) return next(new AppError(400, err.issues[0].message, 'VALIDATION'));
    next(err);
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Gmail API Authorization Endpoints (Admin / Setup)
// ──────────────────────────────────────────────────────────────────────────────

export async function authorizeGmail(req, res, next) {
  try {
    const authUrl = getGmailAuthUrl();
    res.redirect(authUrl);
  } catch (err) {
    logger.error(err, '[Gmail Auth] Failed to generate authorization URL');
    next(err);
  }
}

export async function handleGmailCallback(req, res, next) {
  try {
    const { code, error } = req.query;

    if (error) {
      logger.error({ error }, '[Gmail Auth] Google returned authorization error');
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
          <head><title>Gmail Authorization Failed</title><style>body{font-family:sans-serif;padding:40px;background:#fef2f2;color:#991b1b;}</style></head>
          <body>
            <h2>Gmail Authorization Failed</h2>
            <p>Google OAuth error: ${error}</p>
          </body>
        </html>
      `);
    }

    if (!code) {
      throw new AppError(400, 'Authorization code missing in callback request', 'MISSING_CODE');
    }

    const tokens = await exchangeGmailAuthCode(code);
    logger.info('[Gmail Auth] Gmail sender authorization completed successfully.');

    const hasRefreshToken = Boolean(tokens?.refresh_token);

    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Waypoint — Gmail API Authorization</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; color: #0f172a; padding: 40px; }
            .card { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; padding: 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
            h2 { color: #059669; margin-top: 0; }
            code { background: #f1f5f9; padding: 6px 10px; border-radius: 6px; font-size: 13px; word-break: break-all; display: block; margin: 12px 0; }
            .box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>✓ Gmail Sender Authorization Successful</h2>
            <div class="box">
              <p style="margin:0;color:#166534;font-weight:600;">Google authorization completed successfully.</p>
            </div>
            ${hasRefreshToken ? `
              <p>A new <strong>refresh token</strong> was obtained from Google.</p>
              <p>Add it to your <code>backend/.env</code> file:</p>
              <code>GOOGLE_GMAIL_REFRESH_TOKEN=${tokens.refresh_token}</code>
              <p style="color:#64748b;font-size:13px;">After updating <code>.env</code>, restart your backend server to enable live Gmail API OTP delivery.</p>
            ` : `
              <p>Google returned an access token. If you did not receive a new refresh token, offline consent was previously granted. You can use your existing <code>GOOGLE_GMAIL_REFRESH_TOKEN</code> in <code>.env</code>.</p>
            `}
          </div>
        </body>
      </html>
    `);
  } catch (err) {
    logger.error(err, '[Gmail Auth] Failed to exchange authorization code for tokens');
    next(err);
  }
}

