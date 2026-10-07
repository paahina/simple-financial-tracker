# Simple Financial Tracker

Personal finance tracker for manually recording accounts, income, expenses, transfers, and money other people owe you. Planning documents live in `docs/`.

The apps keep the folder names already in this repository:

- `aurellano-financial-tracker/` — React client (Vite)
- `aurellano-financial-tracker-server/` — Express API

## Requirements

- Node.js
- MongoDB running locally, or a MongoDB connection string

## Setup

1. Copy the environment template and adjust it if needed:

```bash
cp aurellano-financial-tracker-server/.env.example aurellano-financial-tracker-server/.env
```

On Windows PowerShell:

```powershell
Copy-Item aurellano-financial-tracker-server\.env.example aurellano-financial-tracker-server\.env
```

2. Install dependencies:

```bash
npm install --prefix aurellano-financial-tracker
npm install --prefix aurellano-financial-tracker-server
```

## Run locally

Client:

```bash
npm run dev --prefix aurellano-financial-tracker
```

API (connects to MongoDB, then listens on port 5000):

```bash
npm run dev --prefix aurellano-financial-tracker-server
```

Health check: `GET http://localhost:5000/api/health`

A local `.env` is created for development. It is gitignored. The default database is `mongodb://127.0.0.1:27017/simple-financial-tracker`.
