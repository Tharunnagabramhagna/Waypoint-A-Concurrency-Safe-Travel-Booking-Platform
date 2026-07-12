import { z } from 'zod';
import { pool } from '../db/pool.js';
import { AppError } from '../middleware/errorHandler.js';
import { createHold, createBookingFromHold, cancelBooking } from '../services/bookingService.js';
import logger from '../lib/logger.js';

const holdSchema = z.object({
  inventoryUnitIds: z.array(z.string().uuid()).min(1),
});

const bookingSchema = z.object({
  inventoryUnitIds: z.array(z.string().uuid()).min(1),
  idempotencyKey: z.string().min(8),
});

export async function hold(req, res, next) {
  try {
    const data = holdSchema.parse(req.body);
    const result = await createHold({ userId: req.user.id, inventoryUnitIds: data.inventoryUnitIds });
    res.status(201).json(result);
  } catch (err) {
    logger.error(err, 'Hold failed');
    if (err.issues) return next(new AppError(400, err.issues[0].message, 'VALIDATION'));
    next(err);
  }
}

export async function create(req, res, next) {
  try {
    const data = bookingSchema.parse(req.body);
    // Idempotency-Key header takes precedence if both are supplied.
    const idempotencyKey = req.headers['idempotency-key'] || data.idempotencyKey;
    const booking = await createBookingFromHold({
      userId: req.user.id,
      inventoryUnitIds: data.inventoryUnitIds,
      idempotencyKey,
    });
    res.status(201).json(booking);
  } catch (err) {
    logger.error(err, 'Create booking failed');
    if (err.issues) return next(new AppError(400, err.issues[0].message, 'VALIDATION'));
    next(err);
  }
}

export async function listMine(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT b.*, json_agg(json_build_object(
          'unitCode', iu.unit_code, 'listingId', l.id, 'listingTitle', l.title, 'listingType', l.type
        )) AS items
       FROM bookings b
       JOIN booking_items bi ON bi.booking_id = b.id
       JOIN inventory_units iu ON iu.id = bi.inventory_unit_id
       JOIN listings l ON l.id = bi.listing_id
       WHERE b.user_id = $1
       GROUP BY b.id
       ORDER BY b.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    logger.error(err, 'List bookings failed');
    next(err);
  }
}

export async function getOne(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM bookings WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (!rows[0]) throw new AppError(404, 'Booking not found', 'NOT_FOUND');
    res.json(rows[0]);
  } catch (err) {
    logger.error(err, 'Get booking failed');
    next(err);
  }
}

export async function cancel(req, res, next) {
  try {
    const booking = await cancelBooking({ bookingId: req.params.id, userId: req.user.id });
    res.json(booking);
  } catch (err) {
    logger.error(err, 'Cancel booking failed');
    next(err);
  }
}
