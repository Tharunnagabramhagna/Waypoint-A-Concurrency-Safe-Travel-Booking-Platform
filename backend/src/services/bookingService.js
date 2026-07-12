import { withTransaction } from '../db/pool.js';
import { AppError } from '../middleware/errorHandler.js';

const HOLD_TTL_SECONDS = parseInt(process.env.HOLD_TTL_SECONDS || '600', 10);

/**
 * Step 1 of booking: place a short-lived HOLD on specific inventory units.
 *
 * Concurrency strategy:
 *  - `SELECT ... FOR UPDATE SKIP LOCKED` inside a transaction so two requests
 *    racing for the same seat never both succeed: the second request either
 *    waits (without SKIP LOCKED) and then sees status != 'available', or is
 *    skipped entirely and gets a "not available" result immediately.
 *  - We do NOT skip locked here (we want to know definitively if a unit is
 *    unavailable), we use a plain FOR UPDATE + status check, which blocks
 *    briefly on genuine contention and rechecks status after acquiring the lock.
 *  - A stale hold (hold_expires_at < now) is treated as available and can be
 *    stolen — this is what prevents seats being stuck "held" forever if a
 *    client abandons checkout.
 */
export async function createHold({ userId, inventoryUnitIds }) {
  if (!inventoryUnitIds || inventoryUnitIds.length === 0) {
    throw new AppError(400, 'inventoryUnitIds is required', 'BAD_REQUEST');
  }

  return withTransaction(async (client) => {
    // Lock rows in a deterministic order (sorted by id) to avoid deadlocks
    // when two bookings request overlapping sets of units concurrently.
    const sortedIds = [...inventoryUnitIds].sort();

    const { rows } = await client.query(
      `SELECT id, listing_id, status, hold_expires_at, version, unit_code
       FROM inventory_units
       WHERE id = ANY($1::uuid[])
       ORDER BY id
       FOR UPDATE`,
      [sortedIds]
    );

    if (rows.length !== sortedIds.length) {
      throw new AppError(404, 'One or more inventory units do not exist', 'UNIT_NOT_FOUND');
    }

    const now = new Date();
    const unavailable = rows.filter((r) => {
      const holdActive = r.status === 'held' && r.hold_expires_at && new Date(r.hold_expires_at) > now;
      return r.status === 'booked' || r.status === 'blocked' || holdActive;
    });

    if (unavailable.length > 0) {
      // Exact edge case: someone else grabbed this seat/room a moment ago.
      throw new AppError(409, `Unit(s) no longer available: ${unavailable.map((u) => u.unit_code).join(', ')}`, 'UNIT_UNAVAILABLE');
    }

    const expiresAt = new Date(now.getTime() + HOLD_TTL_SECONDS * 1000);

    // Optimistic version bump alongside the row lock — belt & suspenders in
    // case FOR UPDATE semantics are ever weakened (e.g. read-replica misuse).
    await client.query(
      `UPDATE inventory_units
       SET status = 'held', hold_expires_at = $1, version = version + 1
       WHERE id = ANY($2::uuid[])`,
      [expiresAt, sortedIds]
    );

    return { heldUnitIds: sortedIds, expiresAt };
  });
}

/**
 * Step 2: create a `pending_payment` booking against held units.
 * Idempotency: if `idempotencyKey` was already used, return the existing
 * booking instead of creating a duplicate (handles double-click / retry-on-
 * timeout from the client).
 */
export async function createBookingFromHold({ userId, inventoryUnitIds, idempotencyKey }) {
  return withTransaction(async (client) => {
    if (idempotencyKey) {
      const existing = await client.query(
        `SELECT * FROM bookings WHERE idempotency_key = $1`,
        [idempotencyKey]
      );
      if (existing.rows.length > 0) {
        return existing.rows[0]; // already created — return the same booking, don't re-charge
      }
    }

    const sortedIds = [...inventoryUnitIds].sort();
    const { rows: units } = await client.query(
      `SELECT id, listing_id, status, hold_expires_at
       FROM inventory_units
       WHERE id = ANY($1::uuid[])
       FOR UPDATE`,
      [sortedIds]
    );

    const now = new Date();
    const invalid = units.filter(
      (u) => u.status !== 'held' || !u.hold_expires_at || new Date(u.hold_expires_at) <= now
    );
    if (invalid.length > 0) {
      throw new AppError(409, 'Hold expired or invalid — please re-select and try again', 'HOLD_EXPIRED');
    }

    const { rows: listings } = await client.query(
      `SELECT id, base_price_cents, currency FROM listings WHERE id = ANY($1::uuid[])`,
      [units.map((u) => u.listing_id)]
    );
    const priceByListing = new Map(listings.map((l) => [l.id, l]));

    const totalCents = units.reduce((sum, u) => sum + priceByListing.get(u.listing_id).base_price_cents, 0);
    const currency = listings[0]?.currency || 'USD';

    const { rows: bookingRows } = await client.query(
      `INSERT INTO bookings (user_id, status, total_amount_cents, currency, idempotency_key, expires_at)
       VALUES ($1, 'pending_payment', $2, $3, $4, now() + interval '15 minutes')
       RETURNING *`,
      [userId, totalCents, currency, idempotencyKey || null]
    );
    const booking = bookingRows[0];

    for (const u of units) {
      const listing = priceByListing.get(u.listing_id);
      await client.query(
        `INSERT INTO booking_items (booking_id, inventory_unit_id, listing_id, price_cents)
         VALUES ($1, $2, $3, $4)`,
        [booking.id, u.id, u.listing_id, listing.base_price_cents]
      );
    }

    await client.query(
      `INSERT INTO booking_events (booking_id, event_type, payload) VALUES ($1, 'BOOKING_CREATED', $2)`,
      [booking.id, JSON.stringify({ unitIds: sortedIds })]
    );

    return booking;
  });
}

/**
 * Step 3: confirm booking after (mock) payment capture. Flips inventory
 * status held -> booked atomically with the booking status flip, so a crash
 * between the two is impossible (single transaction).
 */
export async function confirmBooking({ bookingId, paymentId }) {
  return withTransaction(async (client) => {
    const { rows: bookingRows } = await client.query(
      `SELECT * FROM bookings WHERE id = $1 FOR UPDATE`,
      [bookingId]
    );
    const booking = bookingRows[0];
    if (!booking) throw new AppError(404, 'Booking not found', 'NOT_FOUND');
    if (booking.status === 'confirmed') return booking; // idempotent re-confirm
    if (booking.status !== 'pending_payment') {
      throw new AppError(409, `Cannot confirm booking in status ${booking.status}`, 'INVALID_STATE');
    }

    const { rows: items } = await client.query(
      `SELECT inventory_unit_id FROM booking_items WHERE booking_id = $1`,
      [bookingId]
    );
    const unitIds = items.map((i) => i.inventory_unit_id);

    await client.query(
      `UPDATE inventory_units SET status = 'booked', hold_expires_at = NULL, version = version + 1
       WHERE id = ANY($1::uuid[])`,
      [unitIds]
    );

    const { rows: updated } = await client.query(
      `UPDATE bookings SET status = 'confirmed', updated_at = now() WHERE id = $1 RETURNING *`,
      [bookingId]
    );

    await client.query(
      `INSERT INTO booking_events (booking_id, event_type, payload) VALUES ($1, 'BOOKING_CONFIRMED', $2)`,
      [bookingId, JSON.stringify({ paymentId })]
    );

    return updated[0];
  });
}

/**
 * Cancellation: releases inventory back to 'available' and marks booking
 * cancelled. Refund (mock) is handled by the payments controller separately
 * — kept as two steps deliberately (see SYSTEM_DESIGN.md: saga pattern).
 */
export async function cancelBooking({ bookingId, userId }) {
  return withTransaction(async (client) => {
    const { rows } = await client.query(
      `SELECT * FROM bookings WHERE id = $1 AND user_id = $2 FOR UPDATE`,
      [bookingId, userId]
    );
    const booking = rows[0];
    if (!booking) throw new AppError(404, 'Booking not found', 'NOT_FOUND');
    if (['cancelled', 'refunded'].includes(booking.status)) return booking;

    const { rows: items } = await client.query(
      `SELECT inventory_unit_id FROM booking_items WHERE booking_id = $1`,
      [bookingId]
    );
    const unitIds = items.map((i) => i.inventory_unit_id);

    await client.query(
      `UPDATE inventory_units SET status = 'available', hold_expires_at = NULL, version = version + 1
       WHERE id = ANY($1::uuid[])`,
      [unitIds]
    );

    const { rows: updated } = await client.query(
      `UPDATE bookings SET status = 'cancelled', updated_at = now() WHERE id = $1 RETURNING *`,
      [bookingId]
    );

    await client.query(
      `INSERT INTO booking_events (booking_id, event_type, payload) VALUES ($1, 'BOOKING_CANCELLED', '{}')`,
      [bookingId]
    );

    return updated[0];
  });
}
