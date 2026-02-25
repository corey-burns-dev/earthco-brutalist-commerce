# Earth/Co Market

Professional, Earth-brutalist storefront with full checkout flow, admin dashboard, and PostgreSQL data persistence.

## Highlights

- Multi-page storefront: Home, Shop, Product Detail, Cart, Checkout, Auth, Account
- Earth Brutalist UI system preserved across all views
- PostgreSQL + Prisma data model for products, users, sessions, cart, orders
- Token-based auth sessions persisted in Postgres
- Stripe test checkout flow (hosted Checkout Session + payment confirmation)
- Admin dashboard for product create/update/delete
- Guest cart support with merge on login/register

## Tech Stack

### Frontend

- Vite
- React + TypeScript
- React Router
- Framer Motion

### Backend

- Express + TypeScript
- Prisma ORM
- PostgreSQL
- Stripe API (`sk_test_*`)

## Project Layout

```text
earthco-market/
  src/                    # Frontend app
  server/
    src/                  # Express API
    prisma/               # Prisma schema + seed
  docker-compose.yml      # Local Postgres
```

## Environment

Create env files:

```bash
cp .env.example .env
cp server/.env.example server/.env
```

### Frontend `.env`

- `VITE_API_URL` (default: `http://localhost:4000`)

### Backend `server/.env`

- `DATABASE_URL` Postgres connection string
- `PORT` API port (default: `4000`)
- `CLIENT_ORIGIN` frontend origin (default: `http://localhost:5173`)
- `SESSION_DAYS` auth session length
- `ADMIN_EMAILS` comma-separated admin emails (these become admin on registration)
- `STRIPE_SECRET_KEY` Stripe test secret key (`sk_test_...`)
- `STRIPE_WEBHOOK_SECRET` Stripe webhook signing secret (`whsec_...`)

## Local Setup

1. Install dependencies:

```bash
bun install
```

1. Start Postgres:

```bash
bun run db:up
```

1. Generate Prisma client, run migration, and seed:

```bash
bun run prisma:generate
bun run db:migrate
bun run db:seed
```

## Run

Terminal A:

```bash
bun run dev:server
```

Terminal B:

```bash
bun run dev:client
```

- Frontend: `http://localhost:5173`
- API: `http://localhost:4000`

## Stripe Test Flow

1. Fill shipping form on `/checkout`
2. Click `Pay with Stripe (Test)`
3. Complete Stripe Checkout using test card data from Stripe docs
4. App confirms payment via API and finalizes order in Postgres

## Admin CRUD

1. Set an email in `ADMIN_EMAILS`
2. Register with that email
3. Visit `/admin` to create/edit/delete products

## Build

```bash
bun run build
```

## Scripts

- `bun run dev:client`
- `bun run dev:server`
- `bun run build`
- `bun run test`
- `bun run lint`
- `bun run format`
- `bun run db:up`
- `bun run db:down`
- `bun run prisma:generate`
- `bun run db:migrate`
- `bun run db:seed`
