import redis from './redis.js';
import logger from './logger.js';

const DEFAULT_TTL = 300; // 5 minutes

export async function get(key) {
  try {
    const data = await redis.get(key);
    if (data) {
      return JSON.parse(data);
    }
    return null;
  } catch (err) {
    logger.error(err, `Cache get failed for key: ${key}`);
    return null;
  }
}

export async function set(key, value, ttl = DEFAULT_TTL) {
  try {
    await redis.setex(key, ttl, JSON.stringify(value));
  } catch (err) {
    logger.error(err, `Cache set failed for key: ${key}`);
  }
}

export async function del(key) {
  try {
    await redis.del(key);
  } catch (err) {
    logger.error(err, `Cache delete failed for key: ${key}`);
  }
}

export async function delPattern(pattern) {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(keys);
    }
  } catch (err) {
    logger.error(err, `Cache delete pattern failed for pattern: ${pattern}`);
  }
}

export async function wrap(key, fn, ttl = DEFAULT_TTL) {
  try {
    const cached = await get(key);
    if (cached !== null) {
      return cached;
    }

    const value = await fn();
    await set(key, value, ttl);
    return value;
  } catch (err) {
    logger.error(err, `Cache wrap failed for key: ${key}`);
    // Fallback to direct execution if cache fails
    return fn();
  }
}
