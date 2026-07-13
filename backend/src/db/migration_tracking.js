import { pool } from './pool.js';

async function migrateAndSeed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('Creating route_waypoints table if not exists...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS route_waypoints (
        id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        listing_id          UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
        sequence_order      INTEGER NOT NULL,
        lat                 DOUBLE PRECISION NOT NULL,
        lng                 DOUBLE PRECISION NOT NULL,
        stop_name           TEXT,
        distance_from_start_km DOUBLE PRECISION NOT NULL,
        UNIQUE (listing_id, sequence_order)
      )
    `);

    console.log('Creating vehicle_position_log table if not exists...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS vehicle_position_log (
        id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        listing_id         UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
        recorded_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
        lat                DOUBLE PRECISION NOT NULL,
        lng                DOUBLE PRECISION NOT NULL,
        heading_degrees    DOUBLE PRECISION NOT NULL,
        speed_kmh          DOUBLE PRECISION NOT NULL,
        source             TEXT NOT NULL CHECK (source IN ('simulated','live'))
      )
    `);

    console.log('Creating index if not exists...');
    // Postgres 9.5+ supports CREATE INDEX IF NOT EXISTS
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_vehicle_position_log_listing_time 
      ON vehicle_position_log (listing_id, recorded_at)
    `);

    // Look up the seeded bus listing: Pune -> Mumbai
    console.log('Looking up Pune -> Mumbai bus listing...');
    const { rows: listings } = await client.query(
      `SELECT id FROM listings WHERE type = 'bus' AND origin = 'Pune' AND destination = 'Mumbai' LIMIT 1`
    );

    if (listings.length === 0) {
      console.warn('WARNING: Seeded Pune -> Mumbai bus listing not found. Skipping waypoint seeding.');
    } else {
      const listingId = listings[0].id;
      console.log(`Found listing ID: ${listingId}. Checking existing waypoints...`);

      const { rows: existingWaypoints } = await client.query(
        `SELECT COUNT(*) FROM route_waypoints WHERE listing_id = $1`,
        [listingId]
      );

      const count = parseInt(existingWaypoints[0].count, 10);
      if (count > 0) {
        console.log(`Waypoints already seeded (${count} rows). Skipping duplicate seeding.`);
      } else {
        console.log('Seeding waypoints for Pune -> Mumbai bus...');
        const waypoints = [
          { seq: 1, lat: 18.5204, lng: 73.8567, stop: 'Pune Swargate', dist: 0.0 },
          { seq: 2, lat: 18.7298, lng: 73.6826, stop: 'Talegaon Toll Plaza', dist: 35.0 },
          { seq: 3, lat: 18.7557, lng: 73.4091, stop: 'Lonavala Expressway Exit', dist: 60.0 },
          { seq: 4, lat: 18.7845, lng: 73.3364, stop: 'Khopoli', dist: 80.0 },
          { seq: 5, lat: 19.0644, lng: 72.9984, stop: 'Vashi (Navi Mumbai)', dist: 125.0 },
          { seq: 6, lat: 19.0178, lng: 72.8478, stop: 'Mumbai Dadar', dist: 150.0 }
        ];

        for (const wp of waypoints) {
          await client.query(
            `INSERT INTO route_waypoints (listing_id, sequence_order, lat, lng, stop_name, distance_from_start_km)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [listingId, wp.seq, wp.lat, wp.lng, wp.stop, wp.dist]
          );
        }
        console.log('Waypoint seeding complete.');
      }
    }

    // ── Seed flight waypoints: Bengaluru → Delhi ──────────────────────
    const { rows: flightListings } = await client.query(
      `SELECT id FROM listings WHERE title ILIKE '%Bengaluru to Delhi%' AND type = 'flight' LIMIT 1`
    );

    if (flightListings.length === 0) {
      console.warn('WARNING: Bengaluru → Delhi flight listing not found. Skipping flight waypoint seeding.');
    } else {
      const flightId = flightListings[0].id;
      console.log(`Found flight listing ID: ${flightId}. Checking existing waypoints...`);

      const { rows: existingFlightWp } = await client.query(
        `SELECT COUNT(*) FROM route_waypoints WHERE listing_id = $1`,
        [flightId]
      );

      const flightCount = parseInt(existingFlightWp[0].count, 10);
      if (flightCount > 0) {
        console.log(`Flight waypoints already seeded (${flightCount} rows). Skipping.`);
      } else {
        console.log('Seeding waypoints for Bengaluru → Delhi flight...');
        const flightWaypoints = [
          { seq: 1, lat: 12.9716, lng: 77.5946, stop: 'Kempegowda Intl Airport (BLR)', dist: 0 },
          { seq: 2, lat: 15.3991, lng: 78.5000, stop: 'Over Kurnool (Cruising)', dist: 350 },
          { seq: 3, lat: 17.3850, lng: 78.4867, stop: 'Over Hyderabad (Cruising)', dist: 600 },
          { seq: 4, lat: 21.1458, lng: 79.0882, stop: 'Over Nagpur (Cruising)', dist: 1000 },
          { seq: 5, lat: 25.4358, lng: 78.5700, stop: 'Over Jhansi (Cruising)', dist: 1500 },
          { seq: 6, lat: 28.5562, lng: 77.1000, stop: 'Indira Gandhi Intl Airport (DEL)', dist: 1750 },
        ];

        for (const wp of flightWaypoints) {
          await client.query(
            `INSERT INTO route_waypoints (listing_id, sequence_order, lat, lng, stop_name, distance_from_start_km)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [flightId, wp.seq, wp.lat, wp.lng, wp.stop, wp.dist]
          );
        }
        console.log('Flight waypoint seeding complete.');
      }
    }

    await client.query('COMMIT');
    console.log('Migration complete.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
    throw err;
  } finally {
    client.release();
  }
}

migrateAndSeed()
  .then(() => {
    console.log('Process completed successfully.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Process exited with error.', err);
    process.exit(1);
  });
