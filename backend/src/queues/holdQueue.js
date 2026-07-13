import { Queue, Worker } from 'bullmq';
import { pool } from '../db/pool.js';
import logger from '../lib/logger.js';
import redis, { redisReady } from '../lib/redis.js';

async function runCleanup() {
  try {
    const { rowCount: releasedHolds } = await pool.query(
      `UPDATE inventory_units
       SET status = 'available', hold_expires_at = NULL, version = version + 1
       WHERE status = 'held' AND hold_expires_at < NOW()`
    );
    if (releasedHolds > 0) {
      logger.info(`Released ${releasedHolds} expired holds`);
    }

    const { rowCount: expiredBookings } = await pool.query(
      `UPDATE bookings SET status = 'expired', updated_at = NOW()
       WHERE status = 'pending_payment' AND expires_at < NOW()`
    );
    if (expiredBookings > 0) {
      logger.info(`Expired ${expiredBookings} pending bookings`);
    }

    return { releasedHolds, expiredBookings };
  } catch (err) {
    logger.error(err, 'Hold cleanup failed');
    throw err;
  }
}

export async function startHoldWorker() {
  if (!redisReady && redis.status !== 'ready') {
    logger.warn('Redis not ready; skipping BullMQ hold worker startup');
    return null;
  }

  try {
    const connection = redis;

    const holdQueue = new Queue('hold-cleanup', { connection });

    const worker = new Worker(
      'hold-cleanup',
      async () => {
        logger.info('Processing hold cleanup job');
        return runCleanup();
      },
      { connection }
    );

    worker.on('completed', (job) => {
      logger.info(`Hold cleanup job ${job.id} completed`);
    });

    worker.on('failed', (job, err) => {
      logger.error(err, `Hold cleanup job ${job?.id} failed`);
    });

    await holdQueue.add('cleanup', {}, {
      repeat: { every: 30000 },
      jobId: 'hold-cleanup-repeating',
    });

    logger.info('Hold cleanup worker started (BullMQ/Redis)');
    return worker;
  } catch (err) {
    logger.warn({ err: err.message }, 'BullMQ worker failed to start — falling back to setInterval');
  }

  // Fallback: simple setInterval-based cleanup when Redis is not available
  logger.info('Hold cleanup worker started (setInterval fallback — no Redis)');
  const interval = setInterval(() => {
    runCleanup().catch(() => { });
  }, 30000);

  // Run once immediately
  runCleanup().catch(() => { });

  return { close: () => clearInterval(interval) };
}

