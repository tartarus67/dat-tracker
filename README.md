# DAT Tracker Dashboard

Real-time tracking dashboard for Digital Asset Treasury (DAT) public companies — monitors stock prices, crypto NAV, mNAV multiples, and volume across 32 tickers.

## Live

[datdash-htsxo2qg.manus.space](https://datdash-htsxo2qg.manus.space)

## Features

- **32 DAT companies tracked** — Majors (MSTR, TSLA, COIN, etc.) and Alts (AGPU, ORBS, TRON, etc.)
- **Real-time NAV calculation** — Token holdings × live crypto price, updated every 30 min
- **mNAV multiples** — Market cap / NAV for each company
- **Historical snapshots** — Daily snapshots stored in DB with full price/volume/NAV history
- **Public JSON API** — `/api/public/snapshot/:date` for external consumers
- **Daily reports** — Auto-generated and sent via Telegram + owner notifications
- **Multi-asset support** — Companies holding multiple crypto assets (e.g., ORBS holds WLD + ETH)

## Tech Stack

- **Frontend:** React 19 + Tailwind 4 + shadcn/ui
- **Backend:** Express + tRPC 11
- **Database:** TiDB (MySQL-compatible)
- **Data sources:** CoinMarketCap API (crypto prices), Yahoo Finance (stock data)
- **Auth:** Manus OAuth

## Setup

```bash
git clone <repo-url>
cd dat-tracker
pnpm install
```

### Environment Variables

Create a `.env` file in the project root:

```env
# Database
DATABASE_URL=mysql://user:pass@host:port/dbname?ssl={"rejectUnauthorized":true}

# Auth
JWT_SECRET=your-jwt-secret
VITE_APP_ID=your-manus-app-id
OAUTH_SERVER_URL=https://oauth.manus.im
OWNER_OPEN_ID=your-owner-id

# Data APIs
CMC_API_KEY=your-coinmarketcap-api-key

# Public API access key (for external consumers)
PUBLIC_API_KEY=your-chosen-api-key

# Telegram reports (optional)
TELEGRAM_BOT_TOKEN=your-bot-token

# Manus built-in services (only needed in Manus hosting)
BUILT_IN_FORGE_API_KEY=provided-by-platform
BUILT_IN_FORGE_API_URL=provided-by-platform
```

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | MySQL/TiDB connection string with SSL |
| `JWT_SECRET` | Yes | Secret for signing session cookies |
| `CMC_API_KEY` | Yes | CoinMarketCap API key (free tier works) |
| `PUBLIC_API_KEY` | Yes | Key for authenticating public API requests |
| `VITE_APP_ID` | Yes | Manus OAuth app ID |
| `OAUTH_SERVER_URL` | Yes | Manus OAuth server URL |
| `OWNER_OPEN_ID` | Yes | Owner's Manus OpenID |
| `TELEGRAM_BOT_TOKEN` | No | For daily Telegram report delivery |
| `BUILT_IN_FORGE_API_KEY` | No | Manus platform LLM/notification services |
| `BUILT_IN_FORGE_API_URL` | No | Manus platform API endpoint |

### Database

Push the schema to your database:

```bash
pnpm db:push
```

### Run

```bash
pnpm dev
```

App runs on `http://localhost:3000`.

## Public API

All endpoints require `X-API-Key` header matching `PUBLIC_API_KEY`.

| Endpoint | Description |
|----------|-------------|
| `GET /api/public/snapshot/:date` | Full snapshot for a date (YYYY-MM-DD) |
| `GET /api/public/snapshots` | List all available snapshot dates |
| `GET /api/public/ticker/:ticker` | Historical data for a single ticker |

## Project Structure

```
client/src/pages/       → Dashboard UI pages
server/routers.ts       → tRPC procedures (data fetching, snapshots)
server/cmcData.ts       → CoinMarketCap price fetching
server/reportGenerator.ts → Daily report generation
shared/datConfig.ts     → Company definitions (ticker, holdings, asset)
shared/navConfig.ts     → NAV calculation config (token → holdings mapping)
drizzle/schema.ts       → Database schema
scripts/                → One-off data fix scripts
```

## Adding a New DAT Company

1. Add entry to `shared/datConfig.ts` with ticker, company name, asset, and holdings
2. Add corresponding entry to `shared/navConfig.ts`
3. If the token isn't already tracked, add it to the crypto symbols list in `server/cmcData.ts`
4. Run `pnpm dev` — the next snapshot cycle will pick it up automatically

## License

Private.
