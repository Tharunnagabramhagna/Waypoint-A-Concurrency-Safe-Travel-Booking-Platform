import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

/** Whether Redis connected successfully and is usable. */
export let redisReady = false;

function normalizeRedisUrl(redisUrl) {
  if (!redisUrl) {
    return redisUrl;
  }

  try {
    const parsed = new URL(redisUrl);
    const shouldUseTls = parsed.protocol === 'rediss:' || process.env.REDIS_TLS === 'true' || process.env.REDIS_TLS === '1' || parsed.hostname.includes('upstash') || parsed.hostname.includes('redis') && parsed.hostname.includes('cloud');

    if (shouldUseTls && parsed.protocol === 'redis:') {
      parsed.protocol = 'rediss:';
    }

    return parsed.toString();
  } catch {
    return redisUrl;
  }
}

function buildRedisOptions(redisUrl) {
  const normalizedUrl = normalizeRedisUrl(redisUrl);
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

  if (normalizedUrl?.startsWith('rediss://') || process.env.REDIS_TLS === 'true' || process.env.REDIS_TLS === '1') {
    redisOptions.tls = { rejectUnauthorized: false };
  }

  if (process.env.REDIS_USERNAME) {
    redisOptions.username = process.env.REDIS_USERNAME;
  }

  if (process.env.REDIS_PASSWORD && !normalizedUrl?.includes('@')) {
    redisOptions.password = process.env.REDIS_PASSWORD;
  }

  return redisOptions;
}

export function createRedisConnection(redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL) {
  const normalizedUrl = normalizeRedisUrl(redisUrl);
  return new Redis(normalizedUrl, buildRedisOptions(normalizedUrl));
}

const redis = createRedisConnection();

export function waitForRedis(timeoutMs = 5000) {
  if (redis.status === 'ready') {
    return Promise.resolve(true);
  }

  if (redis.status === 'connecting' || redis.status === 'connect') {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        cleanup();
        resolve(false);
      }, timeoutMs);

      const cleanup = () => {
        clearTimeout(timer);
        redis.off('ready', onReady);
        redis.off('error', onError);
        redis.off('close', onClose);
      };

      const onReady = () => {
        cleanup();
        resolve(true);
      };
      const onError = () => {
        cleanup();
        resolve(false);
      };
      const onClose = () => {
        cleanup();
        resolve(false);
      };

      redis.once('ready', onReady);
      redis.once('error', onError);
      redis.once('close', onClose);
    });
  }

  return Promise.resolve(false);
}

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

redis.on('close', () => {
  redisReady = false;
});

// Attempt to connect, but don't crash if it fails
redis.connect().catch(() => {
  console.warn('[Redis] Not available — cache and rate limiting will use in-memory fallbacks');
});

await waitForRedis(3000);

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

