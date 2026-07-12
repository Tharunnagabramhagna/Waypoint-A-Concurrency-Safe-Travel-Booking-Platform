import { pool } from '../db/pool.js';
import logger from '../lib/logger.js';

/**
 * @deprecated Use BullMQ queue from src/queues/holdQueue.js instead
 */
export async function releaseExpiredHolds() {
  const { rowCount } = await pool.query(
    `UPDATE inventory_units
     SET status = 'available', hold_expires_at = NULL, version = version + 1
     WHERE status = 'held' AND hold_expires_at < now()`
  );
  if (rowCount > 0) {
    logger.info(`[holdCleanupJob] released ${rowCount} expired holds`);
  }

  // Also expire stale pending_payment bookings so their held units free up
  // and the booking record reflects reality instead of hanging forever.
  await pool.query(
    `UPDATE bookings SET status = 'expired', updated_at = now()
     WHERE status = 'pending_payment' AND expires_at < now()`
  );
}

/**
 * @deprecated Use startHoldWorker from src/queues/holdQueue.js instead
 */
export function startHoldCleanupJob(intervalMs = 30_000) {
  const handle = setInterval(() => {
    releaseExpiredHolds().catch((err) => logger.error(err, '[holdCleanupJob] error'));
  }, intervalMs);
  return handle;
}
