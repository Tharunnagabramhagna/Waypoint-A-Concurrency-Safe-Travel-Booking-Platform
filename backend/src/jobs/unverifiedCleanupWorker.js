import logger from '../lib/logger.js';
import { cleanupExpiredOtps } from '../services/emailOtpService.js';

const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Start periodic cleanup of expired OTP records (>24h old).
 */
export function startOtpCleanupWorker() {
  logger.info('[OTP Cleanup Worker] Started — runs every 1 hour');

  setInterval(async () => {
    try {
      const count = await cleanupExpiredOtps();
      if (count > 0) {
        logger.info({ deleted: count }, '[OTP Cleanup Worker] Cleaned expired OTP records');
      }
    } catch (err) {
      logger.error(err, '[OTP Cleanup Worker] Error during cleanup');
    }
  }, CLEANUP_INTERVAL_MS);
}
