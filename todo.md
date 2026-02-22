# DAT Tracker Dashboard - TODO

- [x] Design dark theme (Bloomberg Terminal aesthetic) with custom CSS variables
- [ ] Create database schema for DAT companies, crypto assets, and daily snapshots
- [x] Build server-side API routes to fetch stock data from Yahoo Finance
- [x] Build server-side API routes to fetch crypto data from Yahoo Finance
- [x] Create main dashboard page with DAT company table (price, volume, 1d/7d/30d %)
- [x] Create crypto assets section with price tracking (1d/7d/30d %)
- [x] Add category filtering (Majors vs Alts)
- [x] Add sorting functionality to tables
- [x] Build daily summary report generation endpoint
- [ ] Implement email notification system (victor.x@aethir.com) [pending API key]
- [ ] Implement Telegram notification system (@nvxin) [pending bot token]
- [x] Add auto-refresh mechanism for live data (5-min interval)
- [x] Write vitest tests for API routes
- [x] Build report generation logic (daily summary format)
- [x] Add tRPC endpoint to trigger report manually
- [x] Send first test report via Manus built-in notification
- [ ] Add report page to view reports in the dashboard
