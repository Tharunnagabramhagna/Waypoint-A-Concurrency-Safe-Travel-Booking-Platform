import { pool } from '../db/pool.js';
import { AppError } from '../middleware/errorHandler.js';
import { wrap } from '../lib/cache.js';

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
