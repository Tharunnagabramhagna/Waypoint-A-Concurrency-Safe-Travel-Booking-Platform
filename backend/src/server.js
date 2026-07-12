import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import { doubleCsrf } from 'csrf-csrf';
import pinoHttp from 'pino-http';
import { randomUUID } from 'crypto';
import RedisStore from 'rate-limit-redis';
import redis from './lib/redis.js';

import authRoutes from './routes/auth.routes.js';
import listingsRoutes from './routes/listings.routes.js';
import bookingsRoutes from './routes/bookings.routes.js';
import paymentsRoutes from './routes/payments.routes.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { startHoldWorker } from './queues/holdQueue.js';
import logger from './lib/logger.js';

dotenv.config();

const app = express();

// Request ID middleware
app.use((req, res, next) => {
  req.id = randomUUID();
  next();
});

// Pino logger middleware
app.use(pinoHttp({
  logger,
  genReqId: (req) => req.id,
}));

// Security headers with Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", process.env.CORS_ORIGIN || "*"],
    },
  },
}));

// CORS with credentials
app.use(cors({ 
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true 
}));

// Parse cookies and JSON bodies
app.use(cookieParser());
app.use(express.json());

// CSRF Protection
const { 
  generateCsrfToken, 
  doubleCsrfProtection, 
  invalidCsrfTokenError 
} = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET || 'fallback-secret-change-in-production',
  cookieName: 'csrf-token',
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  },
  size: 64,
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
});

// Generic rate limit for all API traffic.
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand: (...args) => redis.call(...args),
  }),
});
app.use(apiLimiter);

// Tighter limit specifically on booking/payment endpoints — these are the
// ones a scalper bot or retry-storm would hammer during a high-demand sale.
const bookingLimiter = rateLimit({ 
  windowMs: 60 * 1000, 
  limit: 20,
  store: new RedisStore({
    sendCommand: (...args) => redis.call(...args),
  }),
});

// Health/observability endpoints
app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.get('/ready', (req, res) => res.json({ status: 'ready' }));
app.get('/live', (req, res) => res.json({ status: 'alive' }));

// CSRF token endpoint
app.get('/api/csrf-token', (req, res) => {
  const csrfToken = generateCsrfToken(req, res);
  res.json({ csrfToken });
});
app.get('/api/v1/csrf-token', (req, res) => {
  const csrfToken = generateCsrfToken(req, res);
  res.json({ csrfToken });
});

// Apply CSRF protection to all non-GET/HEAD/OPTIONS routes
app.use(doubleCsrfProtection);

// API routes
// API versioning
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/listings', listingsRoutes);
app.use('/api/v1/bookings', bookingLimiter, bookingsRoutes);
app.use('/api/v1/payments', bookingLimiter, paymentsRoutes);
// Fallback for unversioned API (for backward compatibility)
app.use('/api/auth', authRoutes);
app.use('/api/listings', listingsRoutes);
app.use('/api/bookings', bookingLimiter, bookingsRoutes);
app.use('/api/payments', bookingLimiter, paymentsRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, async () => {
  logger.info(`Travel booking API listening on :${PORT}`);
  await startHoldWorker();
});
