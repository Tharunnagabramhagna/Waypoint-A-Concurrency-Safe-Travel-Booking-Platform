import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config({ path: 'c:/Users/tarun/OneDrive/Desktop/travel-booking-app/backend/.env' });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function migrate() {
  console.log('Running OAuth migration...');

  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id TEXT UNIQUE`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS facebook_id TEXT UNIQUE`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider TEXT NOT NULL DEFAULT 'local'`);
  await pool.query(`ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL`);

  console.log('Migration successful!');

  const { rows } = await pool.query(
    `SELECT column_name, is_nullable, column_default
     FROM information_schema.columns
     WHERE table_name = 'users'
     ORDER BY ordinal_position`
  );
  console.table(rows);
  await pool.end();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
