import express from 'express';
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import passport from 'passport';
import { register, login, me, refresh, logout, logoutAll, forgotPassword, verifyResetToken, resetPassword, sendEmailOtp, verifyEmailOtp, authorizeGmail, handleGmailCallback } from '../controllers/authController.js';
import { handleOAuthCallback, getFrontendUrl } from '../controllers/oauthController.js';
import { requireAuth } from '../middleware/auth.js';
import redis, { safeSendCommand } from '../lib/redis.js';

const router = express.Router();

// Strict rate limits for auth endpoints to prevent brute force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: process.env.NODE_ENV === 'production' ? 5 : 100, // 5 requests per window in production, 100 in development/testing
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand: (...args) => safeSendCommand(...args),
  }),
});

// Rate limit for sending OTP emails (max 3 per hour per IP)
const otpSendLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: process.env.NODE_ENV === 'production' ? 3 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many verification code requests. Please try again later.', code: 'TOO_MANY_REQUESTS' },
  store: new RedisStore({
    sendCommand: (...args) => safeSendCommand(...args),
  }),
});

// Rate limit for verifying OTP (max 10 per 15 min per IP)
const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: process.env.NODE_ENV === 'production' ? 10 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many verification attempts. Please try again later.', code: 'TOO_MANY_REQUESTS' },
  store: new RedisStore({
    sendCommand: (...args) => safeSendCommand(...args),
  }),
});

// OTP endpoints
router.post('/send-email-otp', otpSendLimiter, sendEmailOtp);
router.post('/verify-email-otp', otpVerifyLimiter, verifyEmailOtp);

// Gmail API Sender Setup Routes (Admin / Setup)
router.get('/gmail/authorize', authorizeGmail);
router.get('/gmail/callback', handleGmailCallback);

// Auth endpoints
router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/forgot-password', authLimiter, forgotPassword);
router.get('/verify-reset-token', verifyResetToken);
router.post('/reset-password', authLimiter, resetPassword);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.post('/logout-all', requireAuth, logoutAll);
router.get('/me', requireAuth, me);

// ── OAuth Routes ─────────────────────────────────────────────────
// Google OAuth
router.get('/google', (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID) {
    return res.redirect(`${getFrontendUrl()}/login?error=google_not_configured`);
  }
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })(req, res, next);
});

router.get('/google/callback',
  (req, res, next) => {
    passport.authenticate('google', { session: false }, (err, user, info) => {
      if (err) {
        const errType = err.code === 'UNVERIFIED_EMAIL_LINKING' ? 'email_not_verified' : 'google_auth_failed';
        return res.redirect(`${getFrontendUrl()}/login?error=${errType}`);
      }
      if (!user) {
        return res.redirect(`${getFrontendUrl()}/login?error=google_auth_failed`);
      }
      req.user = user;
      next();
    })(req, res, next);
  },
  handleOAuthCallback
);

// Facebook OAuth
router.get('/facebook', (req, res, next) => {
  if (!process.env.FACEBOOK_APP_ID) {
    return res.redirect(`${getFrontendUrl()}/login?error=facebook_not_configured`);
  }
  passport.authenticate('facebook', { scope: ['email'], session: false })(req, res, next);
});

router.get('/facebook/callback',
  (req, res, next) => {
    passport.authenticate('facebook', { session: false }, (err, user, info) => {
      if (err) {
        const errType = err.code === 'UNVERIFIED_EMAIL_LINKING' ? 'email_not_verified' : 'facebook_auth_failed';
        return res.redirect(`${getFrontendUrl()}/login?error=${errType}`);
      }
      if (!user) {
        return res.redirect(`${getFrontendUrl()}/login?error=facebook_auth_failed`);
      }
      req.user = user;
      next();
    })(req, res, next);
  },
  handleOAuthCallback
);

export default router;
