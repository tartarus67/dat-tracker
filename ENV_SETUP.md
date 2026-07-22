# Environment Variables

Copy these into your `.env` file and fill in the values.

## Required

```
DATABASE_URL=mysql://user:password@host:port/dbname?ssl={"rejectUnauthorized":true}
JWT_SECRET=your-random-secret-string
VITE_APP_ID=your-manus-app-id
OAUTH_SERVER_URL=https://oauth.manus.im
VITE_OAUTH_PORTAL_URL=https://portal.manus.im
OWNER_OPEN_ID=your-owner-open-id
OWNER_NAME=Your Name
CMC_API_KEY=your-coinmarketcap-api-key
PUBLIC_API_KEY=your-chosen-api-key
```

## Optional

```
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
```

## Platform-only (Manus hosting)

These are auto-injected when hosted on Manus. Not needed for local dev unless you want LLM/notification features.

```
BUILT_IN_FORGE_API_KEY=provided-by-platform
BUILT_IN_FORGE_API_URL=provided-by-platform
VITE_FRONTEND_FORGE_API_KEY=provided-by-platform
VITE_FRONTEND_FORGE_API_URL=provided-by-platform
```

## How to get keys

| Variable | Where to get it |
|----------|----------------|
| `DATABASE_URL` | Any MySQL 8+ or TiDB instance. TiDB Cloud free tier works. |
| `CMC_API_KEY` | [coinmarketcap.com/api](https://coinmarketcap.com/api/) — free Basic plan gives 10K calls/month |
| `TELEGRAM_BOT_TOKEN` | Message [@BotFather](https://t.me/BotFather) on Telegram |
| `JWT_SECRET` | Any random string (e.g., `openssl rand -hex 32`) |
| `PUBLIC_API_KEY` | Choose any string — this is YOUR key for authenticating API consumers |
