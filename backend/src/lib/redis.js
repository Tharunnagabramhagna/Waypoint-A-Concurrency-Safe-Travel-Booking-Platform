import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

/** Whether Redis connected successfully and is usable. */
export let redisReady = false;

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redisOptions = {
  maxRetriesPerRequest: 0,   // fail fast instead of buffering commands
  enableReadyCheck: false,   // don't run internal INFO ready checks
  enableOfflineQueue: false, // don't buffer commands when offline
  lazyConnect: true,         // don't block module load on connect
  retryStrategy(times) {
    // Give up after 3 connection attempts — let the server start without Redis
    if (times > 3) {
      console.warn('[Redis] Could not connect after 3 attempts — running without Redis (in-memory fallbacks)');
      return null;  // stop retrying
    }
    return Math.min(times * 200, 1000);
  },
};

if (redisUrl.startsWith('rediss://')) {
  redisOptions.tls = { rejectUnauthorized: false };
}

const redis = new Redis(redisUrl, redisOptions);

redis.on('error', (err) => {
  if (redisReady) {
    console.error('[Redis] Connection error:', err.message);
  }
  // Don't log repetitive connection-refused errors during startup
});

redis.on('ready', () => {
  redisReady = true;
  console.log('[Redis] Connected successfully');
});

redis.on('connect', () => {
  // If enableReadyCheck is false, ready is emitted shortly after connect.
  // We can treat ready or connect as the indicator, but ready is safer.
});

redis.on('close', () => {
  redisReady = false;
});

// Attempt to connect, but don't crash if it fails
redis.connect().catch(() => {
  console.warn('[Redis] Not available — cache and rate limiting will use in-memory fallbacks');
});

/**
 * Resilient wrapper around redis.call() specifically for rate-limit-redis.
 * If Redis is offline or crashes, it returns a mock success response so
 * rate limiting degrades gracefully to unrestricted access instead of throwing/crashing.
 */
export async function safeSendCommand(...args) {
  if (redis.status !== 'ready') {
    const cmd = args[0]?.toLowerCase();
    if (cmd === 'script') {
      return 'mock-sha-hash';
    }
    // rate-limit-redis expects: [totalHits, resetTimeMs]
    return [1, Date.now() + 60000];
  }
  try {
    return await redis.call(...args);
  } catch (err) {
    return [1, Date.now() + 60000];
  }
}

export default redis;

