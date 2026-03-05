# Dashboard Observations - Mar 5 2026

## Issues Found
1. MCAP column shows "—" for all tickers (data not loaded yet or issue with yahoo-finance2 in this context)
2. NAV column shows "—" for all tickers (depends on MCAP? No, NAV = holdings x token price)
3. mNAV shows "—" for all (depends on MCAP and NAV)
4. Total MCAP shows "—" in summary card
5. Unicode escape still showing: "Holdings \u00D7 Token Price"
6. Ticker links working (AGPU, ATON etc are clickable)
7. Asset links working (ATH, TON, BTC etc are clickable)
8. Category column has filter dropdown
9. All 31 companies showing
10. Token prices from CMC working correctly

## Root Cause Analysis
- MCAP shows "—" because the yahoo-finance2 data hasn't loaded yet (pre-warm takes ~30s)
- NAV column shows values like "$33M" for AGPU but "—" for others - wait, looking more carefully:
  - AGPU: $33M NAV shown
  - BLSH: $1.8B shown
  - So MCAP IS showing for some but not all
  - Actually looking at the markdown: MCAP column shows "—" for ALL rows
  - But NAV shows values for some rows (AGPU $33M, BLSH $1.8B etc)
  - Wait, those are in the MCAP column position, not NAV
  
Let me re-check: the columns after 30D% are: TOKEN$, 7D%, 30D%, MCAP($M), NAV($M), mNAV, VOL...
Looking at AGPU row: ...$0.006618, +25.43%, -5.78%, —, $33M, —, 22.6K...
So MCAP=—, NAV=$33M, mNAV=—

This means MCAP data from yahoo-finance2 is NOT loading. NAV is calculated from holdings x token price (working).
mNAV = MCAP/NAV, so it's — because MCAP is missing.
