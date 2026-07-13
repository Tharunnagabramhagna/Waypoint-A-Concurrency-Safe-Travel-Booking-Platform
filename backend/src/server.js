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
import { safeSendCommand } from './lib/redis.js';

import authRoutes from './routes/auth.routes.js';
import listingsRoutes from './routes/listings.routes.js';
import bookingsRoutes from './routes/bookings.routes.js';
import paymentsRoutes from './routes/payments.routes.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { startHoldWorker } from './queues/holdQueue.js';
import logger from './lib/logger.js';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

if (isProduction) {
  for (const key of ['DATABASE_URL', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'CSRF_SECRET', 'REDIS_URL', 'UPSTASH_REDIS_URL']) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }
}

const app = express();

// Trust proxy for secure cookies and accurate client IP logging behind Render reverse proxy
app.set('trust proxy', 1);

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

const corsOriginsEnv = process.env.CORS_ORIGIN || '';
const allowedOrigins = corsOriginsEnv
  ? corsOriginsEnv.split(',').map((origin) => origin.trim()).filter(Boolean)
  : [];

// Dynamic connectSrc origins for Helmet CSP
const helmetConnectSrc = ["'self'", "http://localhost:5173", "https://*.vercel.app"];
allowedOrigins.forEach((origin) => {
  if (origin !== '*') {
    helmetConnectSrc.push(origin);
  }
});

// Security headers with Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: helmetConnectSrc,
    },
  },
}));

// CORS with credentials and environment-driven origin matching
const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g. tool fetches, curl, postman, server-to-server)
    if (!origin) {
      return callback(null, true);
    }

    const isExactMatch = allowedOrigins.includes(origin) || origin === 'http://localhost:5173';
    const isVercelPreview = origin.startsWith('https://') && origin.endsWith('.vercel.app');

    if (isExactMatch || isVercelPreview) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked for origin: ${origin}`);
      callback(new Error(`Not allowed by CORS: ${origin}`));
    }
  },
  credentials: true,
};
app.use(cors(corsOptions));

// Parse cookies and JSON bodies
app.use(cookieParser());
app.use(express.json());

const isProdOrRender = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

// CSRF Protection
const {
  generateCsrfToken,
  doubleCsrfProtection,
  invalidCsrfTokenError
} = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET || (isProduction ? '' : 'fallback-secret-change-in-production'),
  getSessionIdentifier: (req) => req.cookies['access-token'] || '',
  cookieName: 'csrf-token',
  cookieOptions: {
    httpOnly: true,
    secure: isProdOrRender,
    sameSite: isProdOrRender ? 'none' : 'lax',
    path: '/',
  },
  size: 64,
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
});

// Generic rate limit for all API traffic.
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: isProduction ? 120 : 500,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand: (...args) => safeSendCommand(...args),
  }),
});
app.use(apiLimiter);

// Tighter limit specifically on booking/payment endpoints — these are the
// ones a scalper bot or retry-storm would hammer during a high-demand sale.
const bookingLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: isProduction ? 20 : 100,
  store: new RedisStore({
    sendCommand: (...args) => safeSendCommand(...args),
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

const PORT = Number(process.env.PORT);
if (!Number.isInteger(PORT) || PORT <= 0) {
  throw new Error('PORT environment variable must be set');
}

app.listen(PORT, '0.0.0.0', async () => {
  logger.info(`Travel booking API listening on :${PORT}`);
  await startHoldWorker();
});
