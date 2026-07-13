import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { randomBytes } from 'crypto';
import { pool, withTransaction } from '../db/pool.js';
import { AppError } from '../middleware/errorHandler.js';
import logger from '../lib/logger.js';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().min(1),
  phone: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  deviceInfo: z.string().optional(),
});

function generateRefreshToken() {
  return randomBytes(64).toString('hex');
}

function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, email: user.email },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m' }
  );
}

function signRefreshToken() {
  return jwt.sign(
    {},
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );
}

function setAuthCookies(res, accessToken, refreshToken) {
  const isProduction = process.env.NODE_ENV === 'production';
  
  res.cookie('access-token', accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
    maxAge: 15 * 60 * 1000, // 15 minutes
  });

  res.cookie('refresh-token', refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/api/auth/refresh',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}

function clearAuthCookies(res) {
  const isProduction = process.env.NODE_ENV === 'production';
  res.clearCookie('access-token', { 
    path: '/',
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax'
  });
  res.clearCookie('refresh-token', { 
    path: '/api/auth/refresh',
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax'
  });
}

export async function register(req, res, next) {
  try {
    const data = registerSchema.parse(req.body);
    const passwordHash = await bcrypt.hash(data.password, 12);

    const result = await withTransaction(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO users (email, password_hash, full_name, phone)
         VALUES ($1, $2, $3, $4)
         RETURNING id, email, full_name, role, created_at`,
        [data.email.toLowerCase(), passwordHash, data.fullName, data.phone || null]
      );
      return rows[0];
    });

    const user = result;
    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken();
    const refreshTokenHash = await bcrypt.hash(refreshToken, 12);

    // Store refresh token in DB
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, device_info)
       VALUES ($1, $2, $3, $4)`,
      [user.id, refreshTokenHash, expiresAt, req.body.deviceInfo || null]
    );

    setAuthCookies(res, accessToken, refreshToken);
    res.status(201).json({ 
      user: { id: user.id, email: user.email, fullName: user.full_name, role: user.role } 
    });
  } catch (err) {
    logger.error(err, 'Registration failed');
    if (err.issues) return next(new AppError(400, err.issues[0].message, 'VALIDATION'));
    if (err.code === '23505') return next(new AppError(409, 'Email already registered', 'EMAIL_TAKEN'));
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const data = loginSchema.parse(req.body);
    const { rows } = await pool.query(`SELECT * FROM users WHERE email = $1`, [data.email.toLowerCase()]);
    const user = rows[0];
    if (!user) throw new AppError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');

    const ok = await bcrypt.compare(data.password, user.password_hash);
    if (!ok) throw new AppError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken();
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
      `SELECT rt.*, u.id, u.email, u.full_name, u.role 
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
        user = { id: row.id, email: row.email, fullName: row.full_name, role: row.role };
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
        [validToken.id]
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
      // Revoke the refresh token
      const { rows } = await pool.query(
        `SELECT id, token_hash FROM refresh_tokens WHERE expires_at > NOW() AND revoked_at IS NULL`
      );
      
      for (const row of rows) {
        const match = await bcrypt.compare(refreshToken, row.token_hash);
        if (match) {
          await pool.query(
            `UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1`,
            [row.id]
          );
          break;
        }
      }
    }

    clearAuthCookies(res);
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    logger.error(err, 'Logout failed');
    next(err);
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
