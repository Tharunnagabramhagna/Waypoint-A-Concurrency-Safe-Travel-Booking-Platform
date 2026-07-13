import { pool } from '../db/pool.js';
import { AppError } from '../middleware/errorHandler.js';
import { wrap } from '../lib/cache.js';
import { searchFlights, searchHotels, isConfigured as amadeusConfigured } from '../services/amadeusService.js';
import logger from '../lib/logger.js';

/**
 * GET /listings/search
 * Generic search across flight / hotel / bus. Query params:
 *   type=flight|hotel|bus (required)
 *   origin, destination        (flight/bus)
 *   city                       (hotel)
 *   date=YYYY-MM-DD            (departure date, or check-in date for hotel)
 *   minPrice, maxPrice
 *   page, pageSize
 */
export async function search(req, res, next) {
  try {
    const { type, origin, destination, city, date, minPrice, maxPrice } = req.query;
    if (!type) throw new AppError(400, 'type is required (flight | hotel | bus)', 'VALIDATION');

    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const pageSize = Math.min(Math.max(parseInt(req.query.pageSize || '20', 10), 1), 100);
    const offset = (page - 1) * pageSize;

    const cacheKey = `listings:search:${JSON.stringify({ type, origin, destination, city, date, minPrice, maxPrice, page, pageSize })}`;

    // -----------------------------------------------------------
    // 1. DB query (unchanged — same cache, same logic, same shape)
    // -----------------------------------------------------------
    const data = await wrap(cacheKey, async () => {
      const conditions = ['l.type = $1'];
      const params = [type];
      let i = 2;

      if (origin) { conditions.push(`l.origin = $${i++}`); params.push(origin); }
      if (destination) { conditions.push(`l.destination = $${i++}`); params.push(destination); }
      if (city) { conditions.push(`l.city ILIKE $${i++}`); params.push(city); }
      if (date) { conditions.push(`l.departure_time::date = $${i++}::date`); params.push(date); }
      if (minPrice) { conditions.push(`l.base_price_cents >= $${i++}`); params.push(parseInt(minPrice, 10)); }
      if (maxPrice) { conditions.push(`l.base_price_cents <= $${i++}`); params.push(parseInt(maxPrice, 10)); }

      const where = conditions.join(' AND ');

      // available_count uses a correlated subquery on the partial "available"
      // index, so this stays fast even with large inventory tables.
      const query = `
        SELECT l.*, p.name AS provider_name,
          (SELECT count(*) FROM inventory_units iu WHERE iu.listing_id = l.id AND iu.status = 'available') AS available_count
        FROM listings l
        JOIN providers p ON p.id = l.provider_id
        WHERE ${where}
        ORDER BY l.departure_time NULLS LAST, l.base_price_cents ASC
        LIMIT $${i++} OFFSET $${i++}
      `;
      params.push(pageSize, offset);

      const { rows } = await pool.query(query, params);
      return { results: rows, page, pageSize };
    }, 60); // 1 minute TTL for search results

    // -----------------------------------------------------------
    // 2. Amadeus enrichment (only on page 1 to avoid duplicates)
    //    Runs AFTER the DB query completes. If it fails, we just
    //    return DB results. Never touches the DB cache above.
    // -----------------------------------------------------------
    if (amadeusConfigured() && page === 1) {
      try {
        let amadeusResults = [];

        if (type === 'flight') {
          // Determine the currency of our DB listings to request matching
          // currency from Amadeus (Gap #4). Fall back to 'USD' if unknown.
          const dbCurrency = data.results[0]?.currency || 'USD';
          amadeusResults = await searchFlights({
            origin,
            destination,
            date,
            currency: dbCurrency,
            minPrice,
            maxPrice,
          });
        } else if (type === 'hotel') {
          const dbCurrency = data.results[0]?.currency || 'USD';
          amadeusResults = await searchHotels({
            city,
            date,
            currency: dbCurrency,
            minPrice,
            maxPrice,
          });
        }
        // type === 'bus' — Amadeus doesn't offer bus search, skip silently

        if (amadeusResults.length > 0) {
          // DB results first, then Amadeus results appended
          data.results = [...data.results, ...amadeusResults];
        }
      } catch (err) {
        // Graceful fallback: log and return DB-only results
        logger.warn({ err: err.message }, '[Amadeus] enrichment failed — returning DB-only results');
      }
    }

    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function getById(req, res, next) {
  try {
    const { id } = req.params;
    const cacheKey = `listings:${id}`;

    const data = await wrap(cacheKey, async () => {
      const { rows } = await pool.query(
        `SELECT l.*, p.name AS provider_name FROM listings l JOIN providers p ON p.id = l.provider_id WHERE l.id = $1`,
        [id]
      );
      if (!rows[0]) throw new AppError(404, 'Listing not found', 'NOT_FOUND');

      const { rows: units } = await pool.query(
        `SELECT id, unit_code, stay_date, status, hold_expires_at
         FROM inventory_units
         WHERE listing_id = $1
         ORDER BY unit_code`,
        [id]
      );

      // Surface holds that are actually expired as "available" to the client
      // without waiting for the cleanup job — read-time truth, write-time cleanup.
      const now = Date.now();
      const normalizedUnits = units.map((u) => {
        if (u.status === 'held' && (!u.hold_expires_at || new Date(u.hold_expires_at).getTime() < now)) {
          return { ...u, status: 'available', hold_expires_at: null };
        }
        return u;
      });

      return { ...rows[0], units: normalizedUnits };
    }, 300); // 5 minutes TTL for listing details

    res.json(data);
  } catch (err) {
    next(err);
  }
}

/**
 * Static coordinate lookup for Indian cities and IATA airport codes.
 * Used by mapOverview to plot listings on a map without requiring
 * lat/lng columns in the listings table.
 */
const CITY_COORDS = {
  // Major IATA codes
  BLR: { lat: 12.9716, lng: 77.5946 },
  DEL: { lat: 28.5562, lng: 77.1000 },
  BOM: { lat: 19.0760, lng: 72.8777 },
  MAA: { lat: 13.0827, lng: 80.2707 },
  CCU: { lat: 22.5726, lng: 88.3639 },
  HYD: { lat: 17.3850, lng: 78.4867 },
  GOI: { lat: 15.3800, lng: 73.8314 },
  COK: { lat: 9.9312,  lng: 76.2673 },
  JAI: { lat: 26.9124, lng: 75.7873 },
  AMD: { lat: 23.0225, lng: 72.5714 },
  PNQ: { lat: 18.5204, lng: 73.8567 },
  GAU: { lat: 26.1445, lng: 91.7362 },
  IXC: { lat: 30.7333, lng: 76.7794 },
  LKO: { lat: 26.8467, lng: 80.9462 },
  // City names (case-insensitive lookups normalized below)
  bengaluru:  { lat: 12.9716, lng: 77.5946 },
  bangalore:  { lat: 12.9716, lng: 77.5946 },
  delhi:      { lat: 28.5562, lng: 77.1000 },
  'new delhi':{ lat: 28.5562, lng: 77.1000 },
  mumbai:     { lat: 19.0760, lng: 72.8777 },
  chennai:    { lat: 13.0827, lng: 80.2707 },
  kolkata:    { lat: 22.5726, lng: 88.3639 },
  hyderabad:  { lat: 17.3850, lng: 78.4867 },
  goa:        { lat: 15.4909, lng: 73.8278 },
  pune:       { lat: 18.5204, lng: 73.8567 },
  jaipur:     { lat: 26.9124, lng: 75.7873 },
  ahmedabad:  { lat: 23.0225, lng: 72.5714 },
  kochi:      { lat: 9.9312,  lng: 76.2673 },
  lucknow:    { lat: 26.8467, lng: 80.9462 },
  chandigarh: { lat: 30.7333, lng: 76.7794 },
  guwahati:   { lat: 26.1445, lng: 91.7362 },
};

function lookupCoords(name) {
  if (!name) return null;
  // Try exact match first (IATA codes are uppercase)
  if (CITY_COORDS[name]) return CITY_COORDS[name];
  // Try case-insensitive
  const lower = name.toLowerCase().trim();
  if (CITY_COORDS[lower]) return CITY_COORDS[lower];
  return null;
}

/**
 * GET /listings/map-overview
 * Returns all listings with resolved lat/lng coordinates for map display.
 * Flights/buses → origin + destination coordinate pairs
 * Hotels → single city coordinate
 */
export async function mapOverview(req, res, next) {
  try {
    const cacheKey = 'listings:map-overview';

    const data = await wrap(cacheKey, async () => {
      const { rows } = await pool.query(
        `SELECT l.id, l.type, l.title, l.origin, l.destination, l.city,
                l.base_price_cents, l.currency, l.departure_time, l.arrival_time,
                (SELECT count(*) FROM inventory_units iu WHERE iu.listing_id = l.id AND iu.status = 'available') AS available_count
         FROM listings l
         ORDER BY l.type, l.title`
      );

      return rows.map((listing) => {
        const item = {
          id: listing.id,
          type: listing.type,
          title: listing.title,
          base_price_cents: listing.base_price_cents,
          currency: listing.currency,
          available_count: parseInt(listing.available_count, 10),
        };

        if (listing.type === 'hotel') {
          const coords = lookupCoords(listing.city);
          item.city = listing.city;
          item.lat = coords?.lat || null;
          item.lng = coords?.lng || null;
        } else {
          // flight or bus
          const originCoords = lookupCoords(listing.origin);
          const destCoords = lookupCoords(listing.destination);
          item.origin = listing.origin;
          item.destination = listing.destination;
          item.departure_time = listing.departure_time;
          item.arrival_time = listing.arrival_time;
          item.origin_lat = originCoords?.lat || null;
          item.origin_lng = originCoords?.lng || null;
          item.dest_lat = destCoords?.lat || null;
          item.dest_lng = destCoords?.lng || null;
        }

        return item;
      });
    }, 120); // 2 minute TTL

    res.json({ listings: data });
  } catch (err) {
    next(err);
  }
}
