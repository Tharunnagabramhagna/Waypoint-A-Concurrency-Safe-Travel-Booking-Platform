<div align="center">

# Waypoint

### One route. Three ways to get there.

A full-stack travel booking platform that unifies **flights**, **hotels**, and **buses** under a single search and checkout flow — built around the hard problems of real booking systems: no double bookings, no double charges, no seats stuck in limbo.

[![Node](https://img.shields.io/badge/Node.js-20-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Express](https://img.shields.io/badge/Express-4-000000?logo=express&logoColor=white)](https://expressjs.com)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://docs.docker.com/compose/)
[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-000000?logo=vercel&logoColor=white)](https://waypoint-a-concurrency-safe-travel.vercel.app/)
[![Backend](https://img.shields.io/badge/Backend-Render-46E3B7?logo=render&logoColor=white)](https://waypoint-backend-ahsd.onrender.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](#-license)

[Live Demo](#-live-demo) · [Quick Start](#-quick-start) · [Architecture](#-architecture) · [Edge Cases](#-the-hard-problems-this-solves) · [API](#-api-reference) · [Screenshots](#-preview)

</div>

---

## 🌐 Live Demo

| Resource | Link |
|---|---|
| 🖥 **Live Frontend** | [waypoint-a-concurrency-safe-travel.vercel.app](https://waypoint-a-concurrency-safe-travel.vercel.app/) |
| ⚙️ **Backend API** | [waypoint-backend-ahsd.onrender.com](https://waypoint-backend-ahsd.onrender.com/) |
| 💓 **Health Check** | [waypoint-backend-ahsd.onrender.com/health](https://waypoint-backend-ahsd.onrender.com/health) |

> ⏳ **Note:** The backend is deployed on Render's free tier, so the first request after a period of inactivity may take **30–60 seconds** while the service spins back up. Subsequent requests will be fast.

## ✨ Overview

Booking a trip usually means juggling three different apps — one for flights, one for hotels, one for buses. **Waypoint** puts all three behind one generic data model and one booking pipeline: search any of them, hold your pick while you decide, pay when you're ready, and see everything in one "My Bookings" list.

This isn't just a UI wrapper — the backend is engineered the way a real booking system has to be: seats and rooms are locked at the database row level so two people can never buy the same one, payments are idempotent so a network retry can never double-charge, and abandoned checkouts automatically release their hold instead of freezing inventory forever.

## 🖼 Preview

| Home | Search Results | Seat Selection | Checkout |
|---|---|---|---|
| Hero + Flights/Hotels/Buses toggle search | Ticket-stub result cards with live availability | Interactive seat/room grid with hold states | Mock payment with idempotent capture |

> Visit the [live demo](https://waypoint-a-concurrency-safe-travel.vercel.app/) or run it locally with the Quick Start below to see the full interactive flow.

## 🧩 Features

- 🔍 **Unified search** across flights, hotels, and buses with type-specific filters (origin/destination, city, date, price range)
- 🔒 **Seat & room holds** — a 10-minute reservation window while checkout is in progress, so nobody else can grab your pick mid-purchase
- 💳 **Idempotent payments** — client-generated idempotency keys guarantee a retried request never creates a duplicate booking or charge
- 🧾 **Ticket-stub UI** — a custom design system styled like real boarding passes, with monospace booking codes and perforated card edges
- 👤 **JWT authentication** with bcrypt-hashed passwords
- ↩️ **Cancellations** that atomically release inventory back to available
- 🐳 **One-command deployment** via Docker Compose, including migrations and seed data
- ☁️ **Live production deployment** — frontend on Vercel, backend + database on Render
- 📜 **Full system design doc** — every architectural decision is documented with the failure mode it prevents

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, React Router |
| Backend | Node.js, Express, JWT, bcryptjs, Zod, express-rate-limit, Helmet |
| Database | PostgreSQL (row-level locking, `uuid-ossp`, `citext`) |
| Deployment | Docker Compose (local) · Vercel (frontend) · Render (backend + DB) |

## 🚀 Quick Start

### 🌐 Try it live (no setup required)

| Service | URL |
|---|---|
| Frontend | https://waypoint-a-concurrency-safe-travel.vercel.app/ |
| Backend API | https://waypoint-backend-ahsd.onrender.com/ |
| Health check | https://waypoint-backend-ahsd.onrender.com/health |

Create an account, search, pick a seat, and pay with **any card except one ending in `0002`** — that one's wired to simulate a decline. Remember: the backend may take 30–60 seconds to wake up on its first request.

### 💻 Run it locally

#### Option A — Docker (recommended)

```bash
git clone https://github.com/<your-username>/waypoint.git
cd waypoint
docker compose up --build
```

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:4000 |
| Health check | http://localhost:4000/health |

Migrations and seed data (one flight, one hotel, one bus route) run automatically.

#### Option B — Manual setup

```bash
# 1. Database
createdb travel_booking
cd backend
cp .env.example .env
npm install
npm run migrate
npm run seed

# 2. Backend
npm run dev            # → http://localhost:4000

# 3. Frontend (new terminal)
cd ../frontend
npm install
npm run dev             # → http://localhost:5173
```

## 🏗 Architecture

```
┌─────────────────┐      HTTPS       ┌──────────────────┐      SQL      ┌──────────────┐
│   React SPA      │ ───────────────▶ │   Express API     │ ─────────────▶ │  PostgreSQL   │
│  (Vite + Router) │ ◀─────────────── │  JWT · Zod · Rate │ ◀───────────── │ Row-level     │
│  Hosted: Vercel   │                  │  Limiting          │                │ locking        │
└─────────────────┘                  │  Hosted: Render    │                │ Hosted: Render │
                                      └──────────────────┘                └──────────────┘
                                              │
                                      ┌───────┴────────┐
                                      │ Hold-cleanup    │
                                      │ background job  │
                                      └────────────────┘
```

**Data model** — one polymorphic `listings` table (type: flight/hotel/bus) with an `inventory_units` table underneath representing the atomic sellable thing: one seat, one room-night. Everything else — bookings, payments, audit events — hangs off that.

```
users ─┐
       ├─▶ bookings ─▶ booking_items ─▶ inventory_units ─▶ listings ─▶ providers
       └─▶ payments                                              
                bookings ─▶ booking_events   (append-only audit log)
```

## 🧠 The hard problems this solves

Real booking systems live and die on a handful of concurrency edge cases. Waypoint's [`SYSTEM_DESIGN.md`](./SYSTEM_DESIGN.md) walks through each one in depth — here's the short version:

| Problem | How it's solved |
|---|---|
| **Double booking** | Inventory rows are locked with `SELECT ... FOR UPDATE` inside a transaction, in sorted-ID order to avoid deadlocks, before any status change |
| **Abandoned checkout** | Holds expire after 10 minutes — checked live at read time *and* swept by a background job, so a seat is never stuck forever |
| **Double charge on retry** | Booking creation and payment capture both require a client-generated idempotency key, stored as a `UNIQUE` column — a retry returns the original result, never a duplicate |
| **Multi-leg trips** | Documented saga pattern: hold each leg independently, release already-acquired holds if one leg fails, single payment for the bundle |
| **Timezone confusion** | Departure/arrival stored as absolute UTC instants alongside explicit IANA timezone columns for correct local-time rendering |
| **Flash-sale traffic** | Tighter rate limits specifically on booking/payment endpoints to blunt bot/retry storms |
| **Money rounding** | All amounts stored as integer minor units (`_cents`), never floats |

## 📡 API Reference

Base URL (production): `https://waypoint-backend-ahsd.onrender.com`
Base URL (local): `http://localhost:4000`

| Method | Endpoint | Auth | Description |
|---|---|:---:|---|
| `POST` | `/api/auth/register` | – | Create an account |
| `POST` | `/api/auth/login` | – | Get a JWT |
| `GET` | `/api/auth/me` | ✅ | Current user |
| `GET` | `/api/listings/search` | – | Search flights / hotels / buses |
| `GET` | `/api/listings/:id` | – | Listing detail + live inventory |
| `POST` | `/api/bookings/hold` | ✅ | Hold seats/rooms (10 min TTL) |
| `POST` | `/api/bookings` | ✅ | Create a pending booking from a hold *(idempotent)* |
| `GET` | `/api/bookings` | ✅ | List my bookings |
| `POST` | `/api/bookings/:id/cancel` | ✅ | Cancel + release inventory |
| `POST` | `/api/payments/capture` | ✅ | Mock payment capture *(idempotent)*, confirms booking |

## 📁 Project Structure

```
waypoint/
├── backend/
│   └── src/
│       ├── db/            # schema.sql, connection pool, migrate, seed
│       ├── services/      # bookingService.js — the concurrency-critical core
│       ├── controllers/   # auth · listings · bookings · payments
│       ├── routes/
│       ├── middleware/     # auth, centralized error handling
│       └── jobs/           # expired-hold cleanup
├── frontend/
│   └── src/
│       ├── pages/          # Home · SearchResults · ListingDetail · Checkout · MyBookings
│       ├── components/     # Navbar · ListingCard · SeatSelector
│       ├── context/         # AuthContext
│       └── api/             # fetch client
├── SYSTEM_DESIGN.md         # architecture decisions + edge cases, in depth
├── docker-compose.yml
└── README.md
```

## 🗺 Roadmap

- [ ] Bundled multi-leg checkout (flight + hotel + bus as one purchase) — backend primitives already exist
- [ ] Filters & sorting on search results (price, duration, amenities)
- [ ] Real payment gateway integration
- [ ] Reviews, ratings, and saved trips
- [ ] Admin/provider dashboard
- [ ] Email/SMS notifications via the existing `booking_events` outbox

## 🤝 Contributing

Issues and pull requests are welcome. Please read `SYSTEM_DESIGN.md` before touching anything in `bookingService.js` — the locking and idempotency model there is load-bearing.

## 📄 License

MIT — free to use, modify, and learn from.

---

<div align="center">

Built as an exploration of concurrency-safe booking systems.
**Waypoint** · *pick a route, any route.*

[🌐 Live Demo](https://waypoint-a-concurrency-safe-travel.vercel.app/) · [⚙️ Backend API](https://waypoint-backend-ahsd.onrender.com/)

</div>
