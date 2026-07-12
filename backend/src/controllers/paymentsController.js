import { z } from 'zod';
import crypto from 'crypto';
import { pool, withTransaction } from '../db/pool.js';
import { AppError } from '../middleware/errorHandler.js';
import { confirmBooking } from '../services/bookingService.js';
import logger from '../lib/logger.js';

const captureSchema = z.object({
  bookingId: z.string().uuid(),
  idempotencyKey: z.string().min(8),
  cardNumberLast4: z.string().length(4).optional(),
});

/**
 * Mock "capture payment" endpoint standing in for Stripe/Razorpay/etc.
 *
 * Idempotency: the payments.idempotency_key column is UNIQUE. If the client
 * retries (e.g. network timeout after the first request actually succeeded),
 * the unique constraint / pre-check returns the original payment instead of
 * charging twice — this is the #1 real-world payment bug to design against.
 */
export async function capture(req, res, next) {
  try {
    const data = captureSchema.parse(req.body);
    const idempotencyKey = req.headers['idempotency-key'] || data.idempotencyKey;

    const existing = await pool.query(`SELECT * FROM payments WHERE idempotency_key = $1`, [idempotencyKey]);
    if (existing.rows[0]) {
      return res.status(200).json(existing.rows[0]); // already processed — return same result
    }

    const { rows: bookingRows } = await pool.query(`SELECT * FROM bookings WHERE id = $1`, [data.bookingId]);
    const booking = bookingRows[0];
    if (!booking) throw new AppError(404, 'Booking not found', 'NOT_FOUND');
    if (booking.status !== 'pending_payment') {
      throw new AppError(409, `Booking is in status ${booking.status}, cannot pay`, 'INVALID_STATE');
    }
    if (new Date(booking.expires_at) < new Date()) {
      throw new AppError(409, 'Booking hold expired before payment completed', 'BOOKING_EXPIRED');
    }

    // Simulated gateway: deterministic "failure" only for a magic test card,
    // otherwise succeeds. In production this call would hit a real gateway
    // over the network and must be treated as capable of timing out —
    // hence idempotency keys rather than trusting the HTTP response alone.
    const simulatedFailure = data.cardNumberLast4 === '0002';

    const payment = await withTransaction(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO payments (booking_id, amount_cents, currency, status, provider_ref, idempotency_key)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          booking.id,
          booking.total_amount_cents,
          booking.currency,
          simulatedFailure ? 'failed' : 'captured',
          `mock_${crypto.randomUUID()}`,
          idempotencyKey,
        ]
      );
      return rows[0];
    });

    if (simulatedFailure) {
      logger.warn('Payment declined', { bookingId: booking.id });
      return res.status(402).json({ error: 'Payment declined', payment });
    }

    const confirmed = await confirmBooking({ bookingId: booking.id, paymentId: payment.id });
    res.status(200).json({ payment, booking: confirmed });
  } catch (err) {
    logger.error(err, 'Payment capture failed');
    if (err.issues) return next(new AppError(400, err.issues[0].message, 'VALIDATION'));
    next(err);
  }
}
