import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config({ path: 'c:/Users/tarun/OneDrive/Desktop/travel-booking-app/backend/.env' });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function migrate() {
  console.log('Running Email OTP Migration...');

  // 1. Create email_otps table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS email_otps (
      id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      email        CITEXT NOT NULL,
      otp_hash     TEXT NOT NULL,
      expires_at   TIMESTAMPTZ NOT NULL,
      attempts     INTEGER NOT NULL DEFAULT 0,
      status       TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'verified', 'expired', 'failed')),
      created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  console.log('[OK] email_otps table created.');

  // 2. Create indexes
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_email_otps_email ON email_otps (email, created_at DESC);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_email_otps_expires ON email_otps (expires_at);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_email_otps_status ON email_otps (status, expires_at);`);
  console.log('[OK] Indexes created.');

  console.log('Email OTP Migration complete.');
  await pool.end();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
