import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';
const connectionString = process.env.DATABASE_URL;
const requiresSsl = isProduction || (connectionString && connectionString.includes('sslmode=require'));

export const pool = new pg.Pool({
  connectionString,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: requiresSsl ? { rejectUnauthorized: false } : false,
});


pool.on('error', (err) => {
  // Prevents a single dropped idle connection from crashing the process.
  console.error('Unexpected PG pool error', err);
});

/**
 * Run `fn` inside a single transaction. Rolls back on any thrown error.
 * Always use this (not raw pool.query) for anything touching inventory,
 * bookings, or payments — those require atomicity.
 */
export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
