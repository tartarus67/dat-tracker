#!/usr/bin/env python3
"""
Fetch market cap and shares outstanding for all DAT tickers using yfinance.
Outputs JSON to stdout for consumption by the Node.js server.
"""
import json
import sys
import warnings
warnings.filterwarnings("ignore")
import os
os.environ["PYTHONWARNINGS"] = "ignore"
sys.stderr = open(os.devnull, 'w')

try:
    import yfinance as yf
except ImportError:
    print(json.dumps({"error": "yfinance not installed"}))
    sys.exit(1)

TICKERS = [
    "FORD", "DFDV", "UPXI", "CEPO", "MSTR", "TRON", "MTPLF", "MARA",
    "COIN", "BLSH", "RIOT", "CLSK", "HUT", "BMNR", "BTBT", "SBET",
    "HSDT", "STKE", "XXI", "TAOX", "ZBAI", "GPUS", "IPST", "BNC",
    "STSS", "SUIG", "GDC", "ORBS", "AGPU", "ATON", "ZSTK",
]

results = {}
for ticker in TICKERS:
    try:
        t = yf.Ticker(ticker)
        info = t.info
        results[ticker] = {
            "marketCap": info.get("marketCap", 0) or 0,
            "sharesOutstanding": info.get("sharesOutstanding", 0) or 0,
        }
    except Exception:
        results[ticker] = {"marketCap": 0, "sharesOutstanding": 0}

print(json.dumps(results))
