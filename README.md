# Eventful

Event ticketing and discovery platform for Africa.
Creators publish events · Attendees discover and buy tickets · QR check-in at the door.

**Live**
- Frontend → https://eventful-livid.vercel.app
- API → https://eventful-api-xofa.onrender.com
- Swagger docs → https://eventful-api-xofa.onrender.com/docs

---

## Stack

| Layer | Technology |
|---|---|
| API | Fastify 4 + TypeScript |
| Database | PostgreSQL (Neon serverless) + Prisma ORM |
| Cache / Queues | Redis (Render) + BullMQ |
| Payments | Tranzak (XAF, mobile money) |
| Email | Brevo (transactional) |
| Auth | JWT (access + refresh) + TOTP MFA |
| QR codes | HMAC-signed payloads + PNG generation |
| Frontend | Next.js 14 App Router + Tailwind CSS |
| Storage | Cloudinary (event cover images) |
| Monitoring | Sentry |

---

## Repository layout

```
eventful/
├── eventful-api/          # Fastify REST API + BullMQ workers
│   ├── prisma/            # Schema + migrations + seed
│   ├── src/
│   │   ├── apps/
│   │   │   ├── api/       # HTTP server entrypoint
│   │   │   └── worker/    # BullMQ worker entrypoint (standalone)
│   │   ├── config/        # Zod-validated env loader
│   │   ├── lib/           # Prisma, Redis, JWT, QR, Tranzak clients
│   │   ├── middleware/     # Auth guards, error handler
│   │   ├── modules/       # Feature modules (auth, events, orders, …)
│   │   └── workers/       # BullMQ worker implementations
│   ├── tests/             # Integration + unit tests (Jest)
│   └── render.yaml        # Render deployment blueprint
└── eventful-marketing/    # Next.js marketing + dashboard frontend
    └── src/
        ├── app/           # App Router pages
        ├── components/    # Shared UI components
        └── contexts/      # Auth context + API fetch hook
```

---

## Local development

### Prerequisites

- Node.js 20+
- Docker Desktop (for Postgres + Redis)
- A [Neon](https://neon.tech) account (or local Postgres)
- A [Brevo](https://app.brevo.com) account for email
- A [Tranzak](https://developer.tranzak.me) sandbox account for payments

### 1. Clone and install

```bash
git clone https://github.com/btembong/eventful.git
cd eventful

# API
cd eventful-api && npm install

# Frontend
cd ../eventful-marketing && npm install
```

### 2. Start Postgres + Redis

```bash
# From repo root
docker compose up -d
```

### 3. Configure environment

```bash
# eventful-api
cp eventful-api/.env.example eventful-api/.env
# Fill in the values — see Environment variables section below
```

### 4. Run database migrations

```bash
cd eventful-api
npx prisma migrate dev
npx prisma generate
```

### 5. Start the API

```bash
cd eventful-api
npm run dev          # http://localhost:3001
# Swagger UI at http://localhost:3001/docs
```

### 6. Start the frontend

```bash
cd eventful-marketing
npm run dev          # http://localhost:3000
```

---

## Environment variables

### `eventful-api/.env`

```env
# ── Server ────────────────────────────────────────────────────────────────────
NODE_ENV=development
PORT=3001

# ── Database (Neon) ───────────────────────────────────────────────────────────
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
DIRECT_URL=postgresql://user:pass@host/db?sslmode=require   # non-pooled, for migrations

# ── Redis ─────────────────────────────────────────────────────────────────────
REDIS_URL=redis://localhost:6379

# ── JWT ───────────────────────────────────────────────────────────────────────
JWT_ACCESS_SECRET=at-least-32-random-chars
JWT_REFRESH_SECRET=at-least-32-different-chars
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=30d

# ── QR signing ────────────────────────────────────────────────────────────────
QR_SIGNING_SECRET=at-least-32-random-chars

# ── Tranzak (payments) ────────────────────────────────────────────────────────
TRANZAK_APP_ID=your-app-id
TRANZAK_APP_KEY=your-app-key
TRANZAK_ENV=sandbox          # sandbox | production

# ── Brevo (email) ─────────────────────────────────────────────────────────────
BREVO_API_KEY=xkeysib-...
BREVO_SENDER_EMAIL=you@example.com
BREVO_SENDER_NAME=Eventful

# ── App ───────────────────────────────────────────────────────────────────────
APP_BASE_URL=http://localhost:3000
PLATFORM_FEE_PCT=5           # percentage fee on paid tickets

# ── Cloudinary (image uploads) ────────────────────────────────────────────────
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# ── Sentry (optional) ─────────────────────────────────────────────────────────
SENTRY_DSN=
```

### `eventful-marketing/.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/v1
```

---

## API overview

All business routes are versioned under `/v1`.
Full interactive documentation at `/docs` (Swagger UI).

| Domain | Endpoints |
|---|---|
| Auth | `POST /auth/register` · `/login` · `/refresh` · `/logout` · `/forgot-password` · `/reset-password` · `/verify-email` |
| MFA | `POST /auth/mfa/enable` · `/mfa/verify` · `/mfa/disable` |
| Events | `GET /events` · `POST /events` · `GET /events/:id` · `PATCH /events/:id` · `DELETE /events/:id` |
| Ticket tiers | `GET /events/:id/tiers` · `POST /events/:id/tiers` · `PATCH /events/:id/tiers/:tierId` |
| Orders | `POST /events/:id/orders` · `GET /orders/:id` · `GET /users/me/orders` |
| Tickets | `GET /eventees/me/tickets` · `GET /eventees/me/tickets/:id` · `GET /eventees/me/tickets/:id/qr` · `POST /tickets/:id/refund` |
| Check-in | `POST /events/:id/checkin` |
| Payments | `POST /webhooks/tranzak` · `GET /creators/me/payments` |
| Analytics | `GET /creators/me/analytics` · `GET /creators/me/events/:id/analytics` |
| Creators | `GET /creators/me/events` · `PATCH /creators/me/profile` |
| Discounts | `POST /creators/me/discounts` · `GET /creators/me/discounts` |
| Webhooks | `POST /webhooks` · `GET /webhooks` · `PATCH /webhooks/:id` |
| Admin | `GET /admin/users` · `GET /admin/events` · `GET /admin/analytics` · `GET /admin/audit-log` |
| Health | `GET /health` |

### Authentication

All protected endpoints require `Authorization: Bearer <access_token>`.
Obtain tokens from `POST /v1/auth/login` or `POST /v1/auth/register`.
Access tokens expire in 15 minutes — use `POST /v1/auth/refresh` with the refresh token to renew.

---

## Ticket purchase flow

```
Client                          API                        Tranzak
  │                              │                             │
  ├─ POST /events/:id/orders ───►│                             │
  │  { tierId, quantity,         │── createPaymentRequest ────►│
  │    buyerName, buyerEmail }   │◄─ { paymentUrl } ──────────┤
  │◄─ { paymentUrl, order } ────┤                             │
  │                              │                             │
  ├─ redirect to paymentUrl ────►│                          (user pays)
  │                              │◄── webhook POST ───────────┤
  │                              │    eventType=REQUEST.COMPLETED
  │                              │── verify with Tranzak ─────►│
  │                              │── mark tickets PAID         │
  │                              │── send receipt email        │
  │                              │── schedule reminders        │
```

Free events skip Tranzak — tickets are marked `PAID` immediately.

---

## Background jobs (BullMQ)

Workers run inline in the API process (same dyno).
Jobs are persisted in Redis and survive API restarts.

| Queue | Trigger | Action |
|---|---|---|
| `receipts` | Order confirmed | Send confirmation email + PDF ticket attachment |
| `notifications` | Ticket created | Send reminder email N minutes before event start |
| `broadcasts` | Creator sends announcement | Email all event attendees |
| `webhook-delivery` | Payment / check-in events | POST to creator's registered webhook URL (5 retries, exponential backoff) |

---

## Running tests

Tests connect to a real database — set `DATABASE_URL` in `eventful-api/.env.test`.

```bash
cd eventful-api

# All tests
npm test

# Unit tests only (no DB required — all external I/O mocked)
npm run test:unit

# Integration tests only
npm run test:integration

# Watch mode
npm run test:watch
```

Test files:

```
tests/
├── auth.test.ts          # Registration, login, refresh, MFA
├── events.test.ts        # CRUD, discovery, caching
├── tickets.test.ts       # Orders, capacity, check-in, QR
├── analytics.test.ts     # Creator + event stats
├── webhook.test.ts       # Outbound webhook delivery
└── unit/
    ├── qr.test.ts        # HMAC sign/verify
    ├── auth.guard.test.ts # requireAuth / requireRole guards
    ├── reminders.test.ts  # Reminder scheduling logic
    ├── orders.test.ts     # Capacity checks, invite codes
    └── payments.test.ts   # Webhook idempotency, Tranzak verify
```

---

## Deployment

The project ships with a Render Blueprint (`eventful-api/render.yaml`).

### API (Render)

1. Push to GitHub
2. In Render → **New** → **Blueprint** → connect `btembong/eventful` → path `eventful-api/render.yaml`
3. Set the following env vars manually in the Render dashboard (marked `sync: false`):
   - `DATABASE_URL`, `DIRECT_URL` — Neon pooled + direct URLs
   - `TRANZAK_APP_ID`, `TRANZAK_APP_KEY`
   - `BREVO_API_KEY`
   - `APP_BASE_URL` — your Vercel frontend URL
4. After first deploy, run migrations:
   ```bash
   # In Render shell or locally with production DATABASE_URL
   npx prisma migrate deploy
   ```

### Frontend (Vercel)

1. Import `btembong/eventful` in Vercel
2. Set **Root Directory** to `eventful-marketing`
3. Add env var: `NEXT_PUBLIC_API_URL=https://eventful-api-xofa.onrender.com/v1`
4. Deploy

---

## Key design decisions

- **Fastify over Express** — schema-first routing, built-in Zod-compatible serialisation, faster cold starts
- **Prisma transactions for capacity** — ticket count + order creation run in a single DB transaction to prevent overselling
- **Tranzak for payments** — supports XAF and local mobile money providers (MTN MoMo, Orange Money)
- **HMAC-signed QR codes** — QR payload is `HMAC(ticketId + eventId, QR_SIGNING_SECRET)`, verified server-side on check-in without a DB round-trip for the signature check
- **Redis for caching** — discovery feed cached 60 s, event detail cached 5 min, invalidated on any write
- **BullMQ inline workers** — on Render free plan workers run in the same process as the API; jobs survive restarts via Redis persistence
- **Soft deletes** — `User.deletedAt` and `Event.deletedAt`; all queries filter `deletedAt IS NULL`

---

## Contributing

1. Branch off `main`
2. Make changes
3. Run `npm test` — all tests must pass
4. Open a pull request

---

## License

MIT
