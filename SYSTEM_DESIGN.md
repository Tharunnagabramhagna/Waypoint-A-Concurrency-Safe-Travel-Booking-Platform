# Waypoint — System Design

A generic travel booking platform covering flights, hotels, and buses through
one data model and one booking pipeline. This document explains the
architecture choices and, more importantly, the edge cases they exist to
handle.

## 1. High-level architecture

```
[ React SPA ]  --HTTPS-->  [ Express API ]  --SQL-->  [ PostgreSQL ]
                                  |
                                  +-- [ Hold-cleanup background job ]
                                  +-- [ Mock payment gateway (in-process) ]
```

At real scale this splits into:
- **API layer**: stateless Node instances behind a load balancer, horizontally scaled.
- **Search path**: read-heavy, read-replica friendly, cacheable (Redis) per route/date.
- **Booking path**: write-heavy, strongly consistent, must stay on the primary DB.
- **Payment path**: calls an external gateway; must be designed assuming it can time out, retry, or double-notify.

The single biggest design decision: **search and booking are different
consistency domains**. Search can serve slightly stale availability (a seat
count that's a few seconds old is fine). Booking cannot — two people must
never both receive the same seat. Everything below follows from that split.

## 2. Data model

- `listings`: one bookable trip/product (a flight, a hotel's room-type, a bus departure).
- `inventory_units`: the atomic sellable thing — one seat, one room-night. This is the row we lock.
- `bookings` / `booking_items`: a booking can bundle multiple units (a family's seats, a multi-night stay).
- `payments`: append-only, keyed by an idempotency key.
- `booking_events`: append-only audit trail / outbox for state transitions.

Modeling inventory at the unit level (rather than just a counter on
`listings`) is what makes "which exact seat" or "which exact room" bookings
possible, and it's what row-level locking (`SELECT ... FOR UPDATE`) attaches to.

## 3. The double-booking problem (the core edge case)

Two users click "Book" on seat 12A within the same millisecond. Naively:

```
read: seat 12A is available
read: seat 12A is available
write: mark booked   <- both succeed, seat sold twice
write: mark booked
```

**Fix — pessimistic row locks inside a transaction:**

```sql
BEGIN;
SELECT * FROM inventory_units WHERE id = $1 FOR UPDATE;  -- second request blocks here
-- check status is still 'available'
UPDATE inventory_units SET status = 'held', ... ;
COMMIT;
```

The second transaction blocks on `FOR UPDATE` until the first commits, then
re-reads the row and sees `status = 'held'` — it fails cleanly with 409
instead of double-booking. This is implemented in `bookingService.createHold`.

**Deadlock avoidance**: when a booking touches multiple units (multi-seat,
multi-night), we always lock rows in a deterministic sort order (by UUID).
Without this, booking A locking [seat1, seat2] while booking B locks
[seat2, seat1] concurrently can deadlock.

**Why not optimistic locking only (version column, no `FOR UPDATE`)?**
Optimistic locking (`WHERE version = $expected`) works but under high
contention (a popular flight selling out) it causes a storm of failed
retries. We use `FOR UPDATE` as the primary mechanism and keep a `version`
column as a secondary defense/audit trail, and because it's cheap insurance
if the locking discipline is ever bypassed (e.g. a read-replica misuse, a
future service that forgets to open the same transaction).

## 4. The abandoned-checkout problem

A user selects a seat, then closes the tab. If we mark the seat `booked`
immediately on selection, it's gone forever with no purchase.

**Fix — time-boxed holds:**
- Selecting a unit creates a `held` status with `hold_expires_at = now() + 10min`.
- A held unit is only "unavailable" to others while the hold is still valid; an
  expired hold is treated as available again — checked at *read time* in every
  query (`listingsController.getById`, `bookingService`) so correctness never
  depends on a background job running on schedule.
- A background job (`holdCleanupJob`) also physically flips expired holds back
  to `available` every 30s, so indexes/counts stay accurate without waiting for
  the next read.
- The booking row itself has an `expires_at` (15 min) — if payment never
  completes, the booking flips to `expired` and its held units are freed.

This means the worst case for a "stuck" seat is bounded by the hold TTL, not
infinite.

## 5. Idempotency and the double-charge problem

Networks are unreliable. A client can send the same "confirm booking" or
"capture payment" request twice — because of a timeout, a double-tap, or an
automatic retry — even though the *first* request actually succeeded server-side.

**Fix — client-generated idempotency keys, persisted uniquely:**
- `bookings.idempotency_key` and `payments.idempotency_key` are both `UNIQUE`.
- Before doing any work, the handler checks "has this key been seen?" and if
  so returns the *original* result instead of creating a new booking/charge.
- The key is generated once on the client (`newIdempotencyKey()`) when the
  user starts checkout, and reused across retries of that same attempt — not
  regenerated per HTTP call.

This is the single most important pattern for correctness in a payments
system, and it's why the "hold → booking → payment" flow is three separate,
each-idempotent steps rather than one big endpoint.

## 6. Partial-failure / saga pattern for multi-leg bookings

A "trip" can require booking a flight AND a hotel AND a bus as one purchase.
These are independent listings, sometimes from different providers, with no
single database transaction spanning all of them in a real multi-service
architecture.

**Fix — saga with compensating actions, using `booking_events` as an outbox:**
1. Hold flight seat → hold hotel room → hold bus seat (each independently retryable).
2. If any hold fails (e.g. bus sold out), release the already-acquired holds — a compensating action, not a rollback of a shared transaction.
3. Create one logical booking spanning all `booking_items` once every hold succeeds.
4. Single payment capture for the total; on payment failure, release **all** holds (not partial).
5. Every transition writes a `booking_events` row, so a crashed process can be resumed by replaying from the last recorded event instead of guessing state.

This repo implements the single-listing version of the flow end-to-end;
the multi-leg version is the same primitives (`createHold` /
`cancelBooking`) called once per leg with a saga coordinator on top.

## 7. Overbooking policy

Airlines intentionally oversell seats based on historical no-show rates;
hotels sometimes do too. This system defaults to **strict inventory** (never
sell more units than exist) because that's the correct default for a bus/hotel
platform and for a demo. To support airline-style overbooking later:
- Add a `overbook_allowance` column per listing.
- Allow holds up to `capacity + allowance`, but track an `overbooked` flag on
  the booking so downstream systems (check-in, compensation policy) can act on it.
- This is a business-policy toggle, not a re-architecture — the locking model above still applies unchanged.

## 8. Timezones

Flights/buses cross timezones; a departure at "18:00" is meaningless without
knowing whose 18:00. `listings.departure_time`/`arrival_time` are stored as
`TIMESTAMPTZ` (absolute instants, UTC internally), and `timezone_origin` /
`timezone_destination` are stored alongside so the UI can render "6:00 PM
IST → 8:30 PM IST" rather than doing silent UTC conversion that confuses
travelers. Search-by-date (`departure_time::date`) is intentionally naive in
this implementation — a production system would compare against the
*origin's local date*, not the server's, to avoid off-by-one-day search bugs
for red-eye departures near midnight.

## 9. High-demand / flash-sale traffic

A popular route (holiday flight, concert-weekend hotel) can get a traffic
spike that dwarfs steady-state load.

- **Rate limiting** on booking/payment endpoints specifically (`bookingLimiter`
  in `server.js`), tighter than the general API limit, to blunt bot/scalper retry storms.
- **`FOR UPDATE` contention is inherently self-throttling** per-row, but many
  users hammering *different* seats on the *same* listing still means many
  small transactions — acceptable, but at extreme scale you'd add a
  short-lived Redis-based "seat map lock" in front of Postgres to shed load
  before it reaches the DB.
- **Read/write split**: search traffic (the vast majority of requests during
  a spike — everyone refreshing to see if a seat opened up) hits read
  replicas / a cache; only the actual hold/booking calls hit the primary.
- **Queueing at extreme scale**: for a true flash-sale (single-digit seats,
  massive demand), the standard pattern is a virtual waiting-room queue that
  admits users at a controlled rate into the booking flow, rather than letting
  everyone race for `FOR UPDATE` at once.

## 10. Cancellations, refunds, and race with check-in

- Cancellation releases inventory back to `available` inside the same kind
  of locked transaction as booking, so a cancellation racing a new booking
  attempt on the *same* unit resolves deterministically.
- Refunds are modeled as a separate `payments` row transitioning to
  `refunded` rather than deleting the original payment — payment history
  must be immutable/append-only for accounting and dispute handling.
- Cancellation policy (refundable window, penalty %) is intentionally left
  as a business-rule hook in `cancelBooking` — the mechanics (lock, release,
  audit event) are policy-agnostic.

## 11. Currency and rounding

All money is stored as **integer minor units** (`_cents`), never floats —
avoids the classic `0.1 + 0.2 !== 0.3` class of bugs when summing multi-item
bookings. Currency is stored per-listing/booking/payment rather than assumed
global, since a multi-provider platform will legitimately mix currencies.

## 12. Security notes (mock payment caveat)

The payment gateway here is intentionally mocked in-process for a runnable
demo — a real integration (Stripe/Razorpay/etc.) would mean the platform
never touches raw card numbers (PCI scope), uses gateway-hosted tokenization,
and treats the gateway call as an external, retryable, possibly-slow
dependency (hence the idempotency-key design above, which would carry over
unchanged to a real gateway). JWTs are short-lived-ish (7d default) and
carry only `id`/`role`/`email` — no sensitive data in the token payload.

## 13. Observability hook

`booking_events` doubles as a lightweight event log: every state transition
(`BOOKING_CREATED`, `BOOKING_CONFIRMED`, `BOOKING_CANCELLED`, ...) is recorded
with a payload. In production this table is the natural source to stream
into an outbox/message queue (Kafka/SNS) for downstream consumers (email
receipts, analytics, fraud checks) without coupling the booking transaction
itself to those side effects.
