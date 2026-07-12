import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { pool } from '../db/pool.js';
import logger from '../lib/logger.js';

const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

export const holdQueue = new Queue('hold-cleanup', { connection });

export async function startHoldWorker() {
  const worker = new Worker(
    'hold-cleanup',
    async (job) => {
      logger.info('Processing hold cleanup job');
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
        logger.error(err, 'Hold cleanup job failed');
        throw err;
      }
    },
    { connection }
  );

  worker.on('completed', (job) => {
    logger.info(`Hold cleanup job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    logger.error(err, `Hold cleanup job ${job?.id} failed`);
  });

  // Schedule the job to run every 30 seconds
  await holdQueue.add('cleanup', {}, {
    repeat: {
      every: 30000,
    },
    jobId: 'hold-cleanup-repeating',
  });

  logger.info('Hold cleanup worker started');
  return worker;
}
