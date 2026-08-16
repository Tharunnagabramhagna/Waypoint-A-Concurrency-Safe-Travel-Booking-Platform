import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config({ path: 'c:/Users/tarun/OneDrive/Desktop/travel-booking-app/backend/.env' });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function migrate() {
  console.log('Running Email Verification Migration...');

  // 1. Add email_verified column to users table
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false`);

  // 2. Existing users migration strategy: mark pre-existing users as email_verified = true
  const { rowCount } = await pool.query(`UPDATE users SET email_verified = true WHERE email_verified = false`);
  console.log(`Updated ${rowCount} existing users to email_verified = true for backward compatibility.`);

  // 3. Create email_verification_tokens table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS email_verification_tokens (
      id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash   TEXT NOT NULL UNIQUE,
      expires_at   TIMESTAMPTZ NOT NULL,
      used_at      TIMESTAMPTZ,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  // 4. Create indexes
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_hash ON email_verification_tokens (token_hash)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user ON email_verification_tokens (user_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_expires ON email_verification_tokens (expires_at)`);

  console.log('Email Verification Migration completed successfully!');

  const { rows } = await pool.query(
    `SELECT column_name, is_nullable, column_default
     FROM information_schema.columns
     WHERE table_name = 'users' AND column_name = 'email_verified'`
  );
  console.table(rows);

  await pool.end();
}

migrate().catch((err) => {
  console.error('Email Verification Migration failed:', err);
  process.exit(1);
});
