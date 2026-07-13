import { pool } from '../db/pool.js';
import logger from '../lib/logger.js';

// In-memory cache for route waypoints to avoid hitting the database constantly
const waypointsCache = new Map();

// In-memory store for admin overrides: listingId -> progressPercentage (0 to 100)
const adminOverrides = new Map();

/**
 * Sets an admin override for progress percentage of a listing.
 * @param {string} listingId 
 * @param {number} progressPercentage - A number between 0 and 100
 */
export function setAdminOverride(listingId, progressPercentage) {
  const progress = Math.max(0, Math.min(100, progressPercentage));
  adminOverrides.set(listingId, progress);
  logger.info(`[Tracking] Admin override set for listing ${listingId}: ${progress}%`);
}

/**
 * Checks if an admin override is active for a listing.
 * @param {string} listingId
 * @returns {boolean}
 */
export function hasAdminOverride(listingId) {
  return adminOverrides.has(listingId);
}

/**
 * Clears an admin override for a listing.
 * @param {string} listingId 
 */
export function clearAdminOverride(listingId) {
  adminOverrides.delete(listingId);
  logger.info(`[Tracking] Admin override cleared for listing ${listingId}`);
}

/**
 * Helper to calculate bearing/heading between two points in degrees (0-360)
 */
function getBearing(lat1, lng1, lat2, lng2) {
  const rLat1 = (lat1 * Math.PI) / 180;
  const rLng1 = (lng1 * Math.PI) / 180;
  const rLat2 = (lat2 * Math.PI) / 180;
  const rLng2 = (lng2 * Math.PI) / 180;

  const dLng = rLng2 - rLng1;
  const y = Math.sin(dLng) * Math.cos(rLat2);
  const x =
    Math.cos(rLat1) * Math.sin(rLat2) -
    Math.sin(rLat1) * Math.cos(rLat2) * Math.cos(dLng);
  const brng = Math.atan2(y, x);
  return ((brng * 180) / Math.PI + 360) % 360;
}

/**
 * Fetch waypoints for a listing. Caches results in memory.
 */
export async function getWaypoints(listingId) {
  if (waypointsCache.has(listingId)) {
    return waypointsCache.get(listingId);
  }

  const { rows } = await pool.query(
    `SELECT lat, lng, stop_name, distance_from_start_km 
     FROM route_waypoints 
     WHERE listing_id = $1 
     ORDER BY sequence_order ASC`,
    [listingId]
  );

  if (rows.length > 0) {
    waypointsCache.set(listingId, rows);
  }
  return rows;
}

/**
 * Calculates simulated vehicle position and ETA details based on elapsed scheduled time
 * or admin progress overrides.
 *
 * @param {Object} listing - The listing database row
 * @returns {Promise<Object>} Position tracking data or { error: 'ROUTE_DATA_UNAVAILABLE' }
 */
export async function getSimulatedPosition(listing) {
  const waypoints = await getWaypoints(listing.id);

  // Requirement #5: Handle "no waypoints found" gracefully
  if (!waypoints || waypoints.length === 0) {
    return { error: 'ROUTE_DATA_UNAVAILABLE' };
  }

  const departureTime = new Date(listing.departure_time);
  const arrivalTime = new Date(listing.arrival_time);
  const totalDurationMs = arrivalTime.getTime() - departureTime.getTime();

  if (totalDurationMs <= 0) {
    logger.warn(`[Tracking] Listing ${listing.id} has invalid departure/arrival times.`);
    return { error: 'INVALID_TIMES' };
  }

  const now = new Date();
  
  // Calculate scheduled progress fraction
  const elapsedMs = now.getTime() - departureTime.getTime();
  const scheduledProgress = Math.max(0, Math.min(1, elapsedMs / totalDurationMs));

  // Determine actual progress based on admin override or time
  let actualProgress = scheduledProgress;
  const isOverridden = adminOverrides.has(listing.id);
  if (isOverridden) {
    actualProgress = adminOverrides.get(listing.id) / 100;
  }

  const totalDist = waypoints[waypoints.length - 1].distance_from_start_km;
  const targetDist = actualProgress * totalDist;

  // If already arrived (100% progress), return finalized state
  if (actualProgress >= 1 && !isOverridden) {
    const finalWp = waypoints[waypoints.length - 1];
    return {
      status: 'arrived',
      lat: finalWp.lat,
      lng: finalWp.lng,
      heading_degrees: 0,
      speed_kmh: 0,
      eta: arrivalTime.toISOString(),
      distance_remaining_km: 0,
      delay_minutes: 0,
      waypoints,
      last_updated: now.toISOString(),
    };
  }

  // Find the waypoints flanking our current distance
  let currentWp = waypoints[0];
  let nextWp = waypoints[waypoints.length - 1];
  let segmentIndex = 0;

  for (let i = 0; i < waypoints.length - 1; i++) {
    if (
      targetDist >= waypoints[i].distance_from_start_km &&
      targetDist <= waypoints[i + 1].distance_from_start_km
    ) {
      currentWp = waypoints[i];
      nextWp = waypoints[i + 1];
      segmentIndex = i;
      break;
    }
  }

  // Interpolate position along the current segment
  const segmentDist = nextWp.distance_from_start_km - currentWp.distance_from_start_km;
  let segmentProgress = 0;
  if (segmentDist > 0) {
    segmentProgress = (targetDist - currentWp.distance_from_start_km) / segmentDist;
  }

  const lat = currentWp.lat + segmentProgress * (nextWp.lat - currentWp.lat);
  const lng = currentWp.lng + segmentProgress * (nextWp.lng - currentWp.lng);

  // Compute bearing/heading
  const heading = getBearing(lat, lng, nextWp.lat, nextWp.lng);

  // Speed calculation with small random jitter (±10%)
  const avgSpeed = totalDist / (totalDurationMs / 3600000); // km/h
  const jitter = 0.9 + Math.random() * 0.2; // 0.9 to 1.1
  const speed = Math.round(avgSpeed * jitter * 10) / 10;

  // Delay calculation
  // Delay is the difference between scheduled progress and actual progress
  let delayMinutes = 0;
  if (scheduledProgress > actualProgress) {
    const progressDiff = scheduledProgress - actualProgress;
    delayMinutes = Math.round((progressDiff * totalDurationMs) / 60000);
  }

  // Recalculate ETA based on remaining distance and average speed
  const distanceRemaining = totalDist - targetDist;
  let remainingMs = 0;
  if (speed > 0) {
    remainingMs = (distanceRemaining / speed) * 3600000;
  }
  const eta = new Date(now.getTime() + remainingMs);

  return {
    status: actualProgress >= 1 ? 'arrived' : 'in_transit',
    lat,
    lng,
    heading_degrees: Math.round(heading * 10) / 10,
    speed_kmh: speed,
    eta: eta.toISOString(),
    distance_remaining_km: Math.round(distanceRemaining * 10) / 10,
    delay_minutes: delayMinutes,
    next_stop: nextWp.stop_name || null,
    waypoints,
    last_updated: now.toISOString(),
  };
}
