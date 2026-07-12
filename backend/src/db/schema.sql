-- ============================================================
-- Travel Booking Platform — PostgreSQL Schema
-- Generic across flights / hotels / buses via a polymorphic
-- "listings" + "inventory_units" model.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "citext";

-- ---------- USERS ----------
CREATE TABLE users (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email          CITEXT UNIQUE NOT NULL,
  password_hash  TEXT NOT NULL,
  full_name      TEXT NOT NULL,
  phone          TEXT,
  role           TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer','provider_admin','platform_admin')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- PROVIDERS (airline / hotel chain / bus operator) ----------
CREATE TABLE providers (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         TEXT NOT NULL,
  type         TEXT NOT NULL CHECK (type IN ('flight','hotel','bus')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- LISTINGS ----------
-- A "listing" is a bookable trip/product:
--   flight  = one scheduled flight (origin/dest/departure/arrival)
--   hotel   = one room-type at a property, sold per night
--   bus     = one scheduled bus route/departure
CREATE TABLE listings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id     UUID NOT NULL REFERENCES providers(id),
  type            TEXT NOT NULL CHECK (type IN ('flight','hotel','bus')),
  title           TEXT NOT NULL,
  origin          TEXT,                 -- flight/bus: IATA/city code. hotel: NULL
  destination     TEXT,                 -- flight/bus only
  city            TEXT,                 -- hotel: property city
  departure_time  TIMESTAMPTZ,          -- flight/bus
  arrival_time    TIMESTAMPTZ,          -- flight/bus
  timezone_origin      TEXT,            -- IANA tz, required for flight/bus edge cases
  timezone_destination TEXT,
  base_price_cents INTEGER NOT NULL CHECK (base_price_cents >= 0),
  currency        TEXT NOT NULL DEFAULT 'USD',
  metadata        JSONB NOT NULL DEFAULT '{}',   -- amenities, aircraft type, star rating, etc.
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_listings_search ON listings (type, origin, destination, departure_time);
CREATE INDEX idx_listings_hotel_city ON listings (type, city) WHERE type = 'hotel';

-- ---------- INVENTORY UNITS ----------
-- The sellable unit under a listing:
--   flight -> a seat (or a fare-class bucket, modeled here as individual seats
--             for simplicity + strong concurrency guarantees)
--   hotel  -> a room, for a specific stay-night (one row per room per night)
--   bus    -> a seat
-- `version` implements optimistic locking on top of row locks (belt & suspenders).
CREATE TABLE inventory_units (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id    UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  unit_code     TEXT NOT NULL,           -- e.g. "12A" seat, "Room 304", "Night 2026-08-01"
  stay_date     DATE,                    -- hotel only: which night this row represents
  status        TEXT NOT NULL DEFAULT 'available'
                  CHECK (status IN ('available','held','booked','blocked')),
  hold_expires_at TIMESTAMPTZ,           -- set when status = 'held'
  version       INTEGER NOT NULL DEFAULT 0,
  UNIQUE (listing_id, unit_code, stay_date)
);

CREATE INDEX idx_inventory_listing_status ON inventory_units (listing_id, status);
-- Partial index makes the hot-path "find available units for listing" query cheap.
CREATE INDEX idx_inventory_available ON inventory_units (listing_id) WHERE status = 'available';

-- ---------- BOOKINGS ----------
-- One booking can span multiple inventory_units (e.g. 3 seats on one flight,
-- or a multi-night hotel stay = N nightly rows).
CREATE TABLE bookings (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES users(id),
  status           TEXT NOT NULL DEFAULT 'pending_payment'
                     CHECK (status IN ('pending_payment','confirmed','cancelled','expired','refunded')),
  total_amount_cents INTEGER NOT NULL,
  currency         TEXT NOT NULL DEFAULT 'USD',
  idempotency_key  TEXT UNIQUE,          -- client-supplied, prevents duplicate bookings on retry
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at       TIMESTAMPTZ           -- pending bookings auto-expire if unpaid
);

CREATE TABLE booking_items (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id         UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  inventory_unit_id  UUID NOT NULL REFERENCES inventory_units(id),
  listing_id         UUID NOT NULL REFERENCES listings(id),
  price_cents        INTEGER NOT NULL,
  UNIQUE (inventory_unit_id)   -- an inventory unit can only ever belong to ONE active booking item
);

-- ---------- PAYMENTS (mocked gateway) ----------
CREATE TABLE payments (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id       UUID NOT NULL REFERENCES bookings(id),
  amount_cents     INTEGER NOT NULL,
  currency         TEXT NOT NULL,
  status           TEXT NOT NULL CHECK (status IN ('authorized','captured','failed','refunded')),
  provider_ref     TEXT,                 -- mock gateway transaction id
  idempotency_key  TEXT UNIQUE NOT NULL, -- prevents double-charge on client retry
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- AUDIT / OUTBOX (for saga-style consistency, see SYSTEM_DESIGN.md) ----------
CREATE TABLE booking_events (
  id           BIGSERIAL PRIMARY KEY,
  booking_id   UUID NOT NULL REFERENCES bookings(id),
  event_type   TEXT NOT NULL,   -- HOLD_CREATED, HOLD_EXPIRED, PAYMENT_CAPTURED, BOOKING_CONFIRMED, ...
  payload      JSONB NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_booking_events_booking ON booking_events (booking_id, created_at);

-- ---------- REFRESH TOKENS (for secure auth) ----------
CREATE TABLE refresh_tokens (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash   TEXT NOT NULL UNIQUE, -- store hash of refresh token (never plaintext)
  device_info  TEXT,                 -- e.g. browser/OS, for user's "sessions" page
  expires_at   TIMESTAMPTZ NOT NULL,
  revoked_at   TIMESTAMPTZ,          -- set if token was revoked before expiry
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens (user_id, created_at);
