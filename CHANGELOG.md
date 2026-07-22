# Changelog

All notable changes to the DAT Tracker Dashboard.

## 2026-07-22

### Data Model
- **ORBS dual-asset support**: ORBS now holds both 283,452,700 WLD and 16,278 ETH. Added `secondaryAsset`/`secondaryHoldings` fields to `DATCompany` type.
- **Historical snapshot fixes**: Backfilled MCAP for 18 weekend/holiday dates, fixed 235 individual ticker MCAP gaps, recalculated NAV for BMNR/HSDT/GPUS/IPST across all history (351 rows).
- **GPUS tokenPrice corrected**: Was storing XRP price ($1.09) instead of BTC ($64K) after asset rebrand.

### Reports
- mNAV averages now exclude outliers >20x (TSLA 1970x, COIN 46x, HUT 11.7x) for meaningful cohort comparison.

### Docs
- Added README.md, ENV_SETUP.md, CHANGELOG.md for collaborator onboarding.

## 2026-07-17

### Data Model
- **Ticker renames**: STSS→SKYA, ZBAI→AUC, FORD→FWDI (with `previousTicker` for historical continuity)
- **Asset rebrands**: GPUS XRP→BTC, IPST IP→DATA (with `previousAsset`)
- **Company name updates**: Sharps Technology→Sky AI Inc, Strategy→Microstrategy
- Added DATA crypto asset to CRYPTO_ASSETS list

### Holdings Updates
- Updated navConfig.ts holdings: AGPU, MSTR, MARA, MTPLF, ORBS, SBET
- Added 7 companies to navConfig: DFDV, UPXI, FWDI, HSDT, STKE, IPST, BMNR
- Added GPUS (900 BTC), ATON (12.8M TON)

## 2026-07-10

### Features
- Trend chart with metric selector, AGPU highlight, Top/Bottom filters, date range picker
- Fixed daily snapshot automation (moved to Manus scheduled task)
- Added public JSON API with API key auth

## 2026-06-28

### Features
- Historical snapshots page with date picker
- Admin holdings editor
- Scheduled snapshot saving (daily 05:30 SGT)

## 2026-06-15

### Features
- CoinMarketCap API integration (replaced Yahoo Finance for token prices)
- Column filter dropdowns (Google Sheets-style A-Z/Z-A sorting)
- Crypto Treasury NAV page (25 companies, 26 asset rows)

## 2026-06-01

### Features
- Telegram daily report delivery (10am SGT)
- Full 19-column dashboard matching spreadsheet layout
- NAV, MCAP, mNAV calculations

## 2026-05-15

### Initial Release
- Dark theme dashboard (Bloomberg Terminal aesthetic)
- 32 DAT companies tracked (Majors + Alts)
- Real-time stock prices from Yahoo Finance
- Auto-refresh every 5 minutes
- Daily report generation
