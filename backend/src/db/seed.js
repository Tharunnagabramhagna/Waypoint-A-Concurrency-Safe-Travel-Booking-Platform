import { pool } from './pool.js';

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: providers } = await client.query(
      `INSERT INTO providers (name, type) VALUES
        ('SkyLine Airways', 'flight'),
        ('Grand Horizon Hotels', 'hotel'),
        ('Metro Coach Lines', 'bus')
       RETURNING id, type`
    );
    const airline = providers.find((p) => p.type === 'flight').id;
    const hotelChain = providers.find((p) => p.type === 'hotel').id;
    const busOperator = providers.find((p) => p.type === 'bus').id;

    // Flight: BLR -> DEL, tomorrow
    const { rows: flightRows } = await client.query(
      `INSERT INTO listings (provider_id, type, title, origin, destination, departure_time, arrival_time,
         timezone_origin, timezone_destination, base_price_cents, currency, metadata)
       VALUES ($1, 'flight', 'SkyLine 202 · Bengaluru to Delhi', 'BLR', 'DEL',
         now() + interval '1 day' + interval '6 hours', now() + interval '1 day' + interval '8 hours 30 minutes',
         'Asia/Kolkata', 'Asia/Kolkata', 450000, 'INR', '{"aircraft":"A320","stops":0}')
       RETURNING id`,
      [airline]
    );
    const flightId = flightRows[0].id;
    for (const seat of ['1A', '1B', '1C', '2A', '2B', '2C', '3A', '3B']) {
      await client.query(
        `INSERT INTO inventory_units (listing_id, unit_code, status) VALUES ($1, $2, 'available')`,
        [flightId, seat]
      );
    }

    // Hotel: Grand Horizon, Goa — 3 rooms x 3 nights
    const { rows: hotelRows } = await client.query(
      `INSERT INTO listings (provider_id, type, title, city, base_price_cents, currency, metadata)
       VALUES ($1, 'hotel', 'Grand Horizon Resort · Goa', 'Goa', 550000, 'INR', '{"stars":4,"roomType":"Deluxe Sea View"}')
       RETURNING id`,
      [hotelChain]
    );
    const hotelId = hotelRows[0].id;
    for (const room of ['301', '302', '303']) {
      for (let n = 0; n < 3; n++) {
        await client.query(
          `INSERT INTO inventory_units (listing_id, unit_code, stay_date, status)
           VALUES ($1, $2, (current_date + interval '2 days' + $3 * interval '1 day')::date, 'available')`,
          [hotelId, room, n]
        );
      }
    }

    // Bus: Pune -> Mumbai
    const { rows: busRows } = await client.query(
      `INSERT INTO listings (provider_id, type, title, origin, destination, departure_time, arrival_time,
         timezone_origin, timezone_destination, base_price_cents, currency, metadata)
       VALUES ($1, 'bus', 'Metro Coach · Pune to Mumbai (AC Sleeper)', 'Pune', 'Mumbai',
         now() + interval '1 day' + interval '22 hours', now() + interval '2 days' + interval '2 hours',
         'Asia/Kolkata', 'Asia/Kolkata', 90000, 'INR', '{"busType":"AC Sleeper"}')
       RETURNING id`,
      [busOperator]
    );
    const busId = busRows[0].id;
    for (let i = 1; i <= 20; i++) {
      await client.query(
        `INSERT INTO inventory_units (listing_id, unit_code, status) VALUES ($1, $2, 'available')`,
        [busId, `S${i}`]
      );
    }

    await client.query('COMMIT');
    console.log('Seed complete.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
