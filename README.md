# Simple Financial Tracker

A personal **MERN** web app for manually tracking money: accounts, income and expenses, transfers between accounts, debts (money others owe you), and reports. There is no bank or e-wallet integration—you record everything yourself. Amounts are stored in **integer centavos** (PHP); the UI formats them as pesos.

Planning and rules live in [`docs/`](docs/). Caching strategy: [`docs/15_caching_rules.txt`](docs/15_caching_rules.txt). Working backlog: [`docs/backlog/implementation_tasks.txt`](docs/backlog/implementation_tasks.txt).

## Repository layout

| Folder | Role |
|--------|------|
| `aurellano-financial-tracker/` | React 19 + Vite + Tailwind client |
| `aurellano-financial-tracker-server/` | Express 5 + Mongoose API |
| `docs/` | Product, API, and implementation specs |

## Features (current)

### Auth & roles

- Register, login, logout (Bearer JWT)
- Roles: **USER** (own data) and **SYSTEM_ADMIN**
- Session check on app load (`GET /api/users/session`)

### Accounts

- Types: Cash, E-wallet, Bank
- Card grid with pagination; create/edit in modals
- Optional starting balance (zero allowed; negative not allowed)
- Deactivate accounts (soft); dashboard uses active accounts for totals

### Categories

- Income and expense categories; card grid with pagination
- Defaults seeded per user; deactivate instead of hard delete when in use

### Transactions & transfers

- **Transactions**: income/expense with category, label, amount, datetime
- **Transfers**: between owned accounts or to/from “other” with a name
- **Day grouping**: sidebar (drawer on small screens) with added/deducted chips per day
- Paginated entries per selected day (no loading entire days at once)

### Debts

- Track who owes you; due date optional
- **Added amounts** (labeled lines) and **payments** on separate tabs with modals
- Status: Pending, Partially paid, Paid, Overdue (tabs with counts on list)
- Description on edit; shown on card and detail when set

### Dashboard & reports

- **Dashboard** tabs: Summary (totals + account cards) and Recent transactions (grid)
- **Reports** tabs: Summary (month totals, category lists, yearly chart) and Daily expenses (grid)
- Monthly and yearly reports; server-side pagination where lists are large

### UI & UX

- Responsive layout (nav menu, day drawer, cards on phone/tablet)
- Custom dropdown `Select` (no native `<select>`)
- Underline **Tabs** component on Dashboard, Reports, Debts, and debt detail
- Skeleton loaders aligned to page layout; debt status tab shows skeleton while loading
- App icon: piggy bank on rounded square (favicon + navbar)

### API & data

- REST JSON API; protected routes use `Authorization: Bearer <token>`
- Unpaginated list endpoints when `page` is omitted (dropdowns/tests); paginated `{ data, total, ... }` when `page` is sent
- Inactive accounts cannot be used for new transactions, transfers, or debt payments (server enforced)

### Planned (documented, not fully built)

- Client cache (e.g. TanStack Query) + **Redis** server cache with **5-minute TTL** and **write-time invalidation** — see [`docs/15_caching_rules.txt`](docs/15_caching_rules.txt)
- Accounts **Active / Deactivated** tabs; active-only account dropdowns
- Transaction **type chips** (blue income, orange expense)
- Session bootstrap hardening — see [`docs/backlog/implementation_tasks.txt`](docs/backlog/implementation_tasks.txt)

## Requirements

- Node.js
- MongoDB (local or Atlas connection string)
- Optional for caching: Redis (`REDIS_URL` on server when implemented)

## Setup

1. Copy the environment template:

```bash
cp aurellano-financial-tracker-server/.env.example aurellano-financial-tracker-server/.env
```

Windows PowerShell:

```powershell
Copy-Item aurellano-financial-tracker-server\.env.example aurellano-financial-tracker-server\.env
```

Set `JWT_SECRET`, `MONGO_DB_URL`, and `ALLOWED_ORIGINS` as needed. Client uses `VITE_API_URL` (see client `.env` / Vite defaults).

2. Install dependencies:

```bash
npm install --prefix aurellano-financial-tracker
npm install --prefix aurellano-financial-tracker-server
```

## Run locally

**Client** (default Vite port 5173):

```bash
npm run dev --prefix aurellano-financial-tracker
```

**API** (default port 5001):

```bash
npm run dev --prefix aurellano-financial-tracker-server
```

Health check: `GET http://localhost:5001/`

**Tests** (API, in-memory Mongo):

```bash
node --test tests/finance.test.js
```

Run from `aurellano-financial-tracker-server/`.

## Auth quick reference

Register/login return `token`. Send `Authorization: Bearer <token>` on protected routes. Session length follows `JWT_EXPIRES_IN` in server env (default **7d** in `.env.example`).

Local `.env` files are gitignored. Do not commit secrets.
