# Coffee Shop POS

Single-shop point-of-sale for a coffee shop.

## Stack

- **Backend:** NestJS + TypeORM + PostgreSQL + JWT
- **Frontend:** Next.js (App Router) + TypeScript

## Roles

| Capability | Super Admin | Cashier |
|---|---|---|
| POS checkout | yes | yes |
| Update order status | yes | yes |
| Today's orders/sales | yes | yes |
| Menu / inventory / users / reports / settings | yes | no |

## Setup

### 1. Database

Using Docker (if available):

```bash
docker compose up -d
```

Or local Postgres — create DB/user matching `backend/.env`. This repo defaults to port **5434** so it does not clash with other Postgres installs on 5432:

```bash
# example with Homebrew postgresql@14 listening on 5434
createdb -p 5434 coffee_pos
```

### 2. Backend

```bash
cd backend
cp .env.example .env   # edit if needed
npm install
npm run start:dev
```

API: `http://localhost:3001/api`

### 3. Frontend

```bash
# from repo root
cp .env.example .env.local   # set NEXT_PUBLIC_API_URL if needed
npm install
npm run dev
```

App: `http://localhost:3000`

## Seed accounts

| Role | Email | Password |
|---|---|---|
| Super Admin | `admin@coffee.local` | `Admin123!` |
| Cashier | `cashier@coffee.local` | `Cashier123!` |
| Customer | `customer@coffee.local` | `Customer123!` |

Demo menu (espresso, brew, pastries) is seeded on first backend start when `SEED_ON_START=true`.

## Customer website

- Landing: `http://localhost:3000`
- Order online: `http://localhost:3000/shop/login`
- Cashier receives online orders at **Online Orders** in the staff app
- **Print invoice** is available on POS (after sale), Orders, Online Orders, and customer My Orders

## Install as PWA (phone & desktop)

PWA install works with a **production** frontend build (service worker is disabled in `npm run dev`):

```bash
npm run build
npm run start
```

Then open the app in Chrome/Edge/Safari:

- **Android / desktop Chrome:** use the Install banner, or browser menu → **Install Brew & Bean**
- **iPhone/iPad Safari:** Share → **Add to Home Screen**
- **macOS Safari / Chrome:** Install from the address bar or File → Add to Dock / Install app
