# Crypto Treasury NAV Sheet Data

## How to Use tab
- Calculates NAV, NAV/share, P/E, and Premium/Discount to NAV for crypto-treasury companies
- Key Formulas:
  - Holdings Value = Units × Asset Price
  - Total Assets = Holdings Value + Other Assets
  - NAV = Total Assets - Liabilities
  - NAV/share = NAV / Shares/Float
  - Premium/Discount = (Market Cap / NAV) - 1

## Tabs available:
- How to Use
- 1 DAT_Fundamentals
- March 3 Snapshot, Feb 25 Snapshot, Feb 11 Snapshot, etc.
- Price Tracking, Volume Tracking
- Crypto Treasury NAV
- Inputs

## Crypto Treasury NAV tab - Columns:
Company | Ticker | Primary Asset | Asset Symbol | Holdings (Units) | Asset Price (USD) | Holdings Value (USD) | Other Assets (USD) | Total Assets (USD) | Liabilities (USD) | NAV (USD)

## Data rows (visible):
1. Strategy Inc. | MSTR | Bitcoin Treasury | BTC | 641692 | $72,405.82 | $46,462,235,057.63
2. MARA Holdings, Inc. | MARA | Bitcoin Miner | BTC | 53250 | $72,405.82 | $3,855,609,882.65
3. Twenty-One Capital (XXI) | XXI | Bitcoin Treasury | BTC | 43514 | $72,405.82 | $3,150,666,825.05
4. Metaplanet Inc. | MTPLF | Bitcoin Treasury | BTC | 30823 | $72,405.82 | $2,231,764,571.14
5. Bitcoin Standard Treasury Co. | CEPO | Bitcoin Treasury | BTC | 30021 | $72,405.82 | $2,173,695,103.98
6. Bullish | BLSH | Exchange / Treasury | BTC | 24300 | $72,405.82 | $1,759,461,411.24
7. Riot Platforms, Inc. | RIOT | Bitcoin Miner | BTC | 19324 | $72,405.82 | $1,399,170,053.94
8. Coinbase Global, Inc. | COIN | Exchange / Treasury | BTC | 14548 | $72,405.82 | $1,053,359,860.52
9. Hut 8 Mining Corp | HUT | Bitcoin Miner | BTC | 13696 | $72,405.82 | $991,670,102.40
10. CleanSpark Inc. | CLSK | Bitcoin Miner | BTC | 13011 | $72,405.82 | $942,072,116.12

## Additional columns visible after scrolling right:
Other Assets (USD) | Total Assets (USD) | Liabilities (USD) | NAV (USD) | Shares / Float | NAV per Share (USD) | Market Cap (USD) | Premium/Discount to NAV

## Key observations:
- Most companies have empty "Other Assets" and "Liabilities" columns
- Total Assets = Holdings Value (when Other Assets is empty)
- NAV = Total Assets - Liabilities (= Total Assets when Liabilities is empty)
- Only 10 companies visible (MSTR, MARA, XXI, MTPLF, CEPO, BLSH, RIOT, COIN, HUT, CLSK)
- The sheet has more columns than the user requested: Shares/Float, NAV per Share, Market Cap, Premium/Discount

## Full column list in the sheet:
Company | Ticker | Primary Asset | Asset Symbol | Holdings (Units) | Asset Price (USD) | Holdings Value (USD) | Other Assets (USD) | Total Assets (USD) | Liabilities (USD) | NAV (USD) | Shares / Float | NAV per Share (USD) | Market Cap (USD) | Premium/Discount to NAV

## Full company list from CSV (20 rows):
1. Strategy Inc. | MSTR | Bitcoin Treasury | BTC | 641692
2. MARA Holdings | MARA | Bitcoin Miner | BTC | 53250
3. Twenty-One Capital | XXI | Bitcoin Treasury | BTC | 43514
4. Metaplanet Inc. | MTPLF | Bitcoin Treasury | BTC | 30823
5. CEPO | CEPO | Bitcoin Treasury | BTC | 30021
6. Bullish | BLSH | Exchange / Treasury | BTC | 24300
7. Riot Platforms | RIOT | Bitcoin Miner | BTC | 19324
8. Coinbase | COIN | Exchange / Treasury | BTC | 14548
9. Hut 8 | HUT | Bitcoin Miner | BTC | 13696
10. CleanSpark | CLSK | Bitcoin Miner | BTC | 13011
11. Tesla | TSLA | Corporate Treasury | BTC | 11509
12. Block Inc | SQ | Fintech / Treasury | BTC | 8584
13. Eightco Holdings | ORBS | Fintech / Treasury | WLD | 272253898
14. Eightco Holdings | ORBS | Fintech / Treasury | ETH | 11068
15. CEA Industries | BNC | | BNB | 515054
16. SUI Group Holdings | SUIG | | SUI | 105393692.6
17. Hyperscale Data | GPUS | | XRP | (empty)
18. TRON Inc | TRON | | TRX | 677596945
19. GD Culture | GDC | | BTC | 7500

Note: Some companies have multiple rows (ORBS has WLD + ETH holdings)
Note: Some "Other Assets", "Liabilities" columns are mostly empty
Note: Sheet has additional columns: Shares/Float, NAV per Share, Market Cap, P/E Ratio, P/NAV, Source/Year, Notes
