import { pool } from '../db/pool.js';
import { AppError } from '../middleware/errorHandler.js';
import { getSimulatedPosition, setAdminOverride, clearAdminOverride, hasAdminOverride, getWaypoints } from '../services/vehicleTrackingService.js';
import logger from '../lib/logger.js';

/**
 * GET /api/bookings/:id/tracking
 * Get the live/simulated tracking status of a booking.
 */
export async function getTracking(req, res, next) {
  try {
    const bookingId = req.params.id;
    const userId = req.user.id;

    // Fetch booking details along with the associated listing
    const { rows } = await pool.query(
      `SELECT b.id AS booking_id, b.user_id, b.status AS booking_status,
              b.total_amount_cents, b.currency,
              l.id AS listing_id, l.type AS listing_type, l.title AS listing_title,
              l.departure_time, l.arrival_time, l.origin, l.destination, l.city
       FROM bookings b
       JOIN booking_items bi ON bi.booking_id = b.id
       JOIN listings l ON l.id = bi.listing_id
       WHERE b.id = $1`,
      [bookingId]
    );

    const booking = rows[0];
    if (!booking) {
      throw new AppError(404, 'Booking not found', 'NOT_FOUND');
    }

    // Gate access: only the user who owns the booking can view tracking data
    if (booking.user_id !== userId) {
      throw new AppError(403, 'Forbidden: You do not own this booking', 'FORBIDDEN');
    }

    // Gate status: must be confirmed
    if (booking.booking_status !== 'confirmed') {
      throw new AppError(400, 'Tracking is only available for confirmed bookings', 'INVALID_STATE');
    }

    // Gate type: must be flight or bus (hotels cannot be tracked)
    if (!['bus', 'flight'].includes(booking.listing_type)) {
      throw new AppError(400, 'Tracking is not supported for this listing type', 'NOT_SUPPORTED');
    }

    const now = new Date();
    const departureTime = new Date(booking.departure_time);

    // Gate departure: don't track before departure has occurred unless overridden by an admin
    if (departureTime > now && !hasAdminOverride(booking.listing_id)) {
      // Still fetch waypoints so the frontend can show the route preview
      const waypoints = await getWaypoints(booking.listing_id);
      return res.json({
        status: 'scheduled',
        message: 'Trip has not departed yet',
        booking_id: booking.booking_id,
        listing_id: booking.listing_id,
        listing_title: booking.listing_title,
        listing_type: booking.listing_type,
        origin: booking.origin,
        destination: booking.destination,
        departure_time: booking.departure_time,
        arrival_time: booking.arrival_time,
        total_amount_cents: booking.total_amount_cents,
        currency: booking.currency,
        waypoints: waypoints || [],
      });
    }

    // Get position tracking data
    const trackingInfo = await getSimulatedPosition({
      id: booking.listing_id,
      departure_time: booking.departure_time,
      arrival_time: booking.arrival_time,
    });

    // Handle missing waypoint route data gracefully (Requirement #5)
    if (trackingInfo.error === 'ROUTE_DATA_UNAVAILABLE') {
      return res.json({
        status: 'unavailable',
        message: 'Route tracking data is not available for this trip',
        listing_title: booking.listing_title,
      });
    }

    if (trackingInfo.error) {
      throw new AppError(500, `Tracking computation failed: ${trackingInfo.error}`, 'INTERNAL_ERROR');
    }

    // If the vehicle is in transit, log its position to vehicle_position_log
    if (trackingInfo.status === 'in_transit') {
      try {
        await pool.query(
          `INSERT INTO vehicle_position_log (listing_id, lat, lng, heading_degrees, speed_kmh, source)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            booking.listing_id,
            trackingInfo.lat,
            trackingInfo.lng,
            trackingInfo.heading_degrees,
            trackingInfo.speed_kmh,
            'simulated',
          ]
        );
      } catch (err) {
        // Log logging failures, but do not fail the request
        logger.error(err, 'Failed to log vehicle position history');
      }
    }

    // Merge booking info into response
    res.json({
      booking_id: booking.booking_id,
      listing_id: booking.listing_id,
      listing_title: booking.listing_title,
      listing_type: booking.listing_type,
      origin: booking.origin,
      destination: booking.destination,
      departure_time: booking.departure_time,
      arrival_time: booking.arrival_time,
      total_amount_cents: booking.total_amount_cents,
      currency: booking.currency,
      ...trackingInfo,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/listings/:id/tracking/override
 * Admin override to manually set progress (0-100) for a listing
 */
export async function setOverride(req, res, next) {
  try {
    const { progressPercentage } = req.body;
    if (progressPercentage === undefined || typeof progressPercentage !== 'number') {
      throw new AppError(400, 'progressPercentage (number) is required', 'VALIDATION');
    }

    setAdminOverride(req.params.id, progressPercentage);
    res.json({ status: 'ok', message: `Progress override set to ${progressPercentage}%` });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/listings/:id/tracking/override
 * Clear admin override for a listing
 */
export async function clearOverride(req, res, next) {
  try {
    clearAdminOverride(req.params.id);
    res.json({ status: 'ok', message: 'Progress override cleared' });
  } catch (err) {
    next(err);
  }
}
