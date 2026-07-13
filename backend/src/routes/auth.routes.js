import express from 'express';
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { register, login, me, refresh, logout, logoutAll } from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';
import redis, { safeSendCommand } from '../lib/redis.js';

const router = express.Router();

// Strict rate limits for auth endpoints to prevent brute force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 5, // 5 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand: (...args) => safeSendCommand(...args),
  }),
});

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.post('/logout-all', requireAuth, logoutAll);
router.get('/me', requireAuth, me);

export default router;
