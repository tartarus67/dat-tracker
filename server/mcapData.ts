/**
 * Market cap data fetcher — uses yahoo-finance2 npm package (pure Node.js).
 * No Python dependency needed. Works in both dev and production.
 */
import YahooFinance from "yahoo-finance2";
import { ALL_STOCK_TICKERS } from "@shared/datConfig";

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

export type McapEntry = {
  marketCap: number;
  sharesOutstanding: number;
};

let mcapCache: Record<string, McapEntry> = {};
let lastFetchTime = 0;
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes
let refreshInProgress = false;

async function fetchSingleMcap(ticker: string): Promise<McapEntry | null> {
  try {
    const q = await yf.quote(ticker);
    return {
      marketCap: (q as Record<string, unknown>).marketCap as number || 0,
      sharesOutstanding: (q as Record<string, unknown>).sharesOutstanding as number || 0,
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(`[MCAP] Failed to fetch ${ticker}:`, msg.slice(0, 80));
    return null;
  }
}

async function fetchAllMcap(): Promise<Record<string, McapEntry>> {
  const results: Record<string, McapEntry> = {};
  const batchSize = 5;

  for (let i = 0; i < ALL_STOCK_TICKERS.length; i += batchSize) {
    const batch = ALL_STOCK_TICKERS.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(t => fetchSingleMcap(t)));
    batch.forEach((ticker, idx) => {
      if (batchResults[idx]) {
        results[ticker] = batchResults[idx]!;
      }
    });
    // Small delay between batches to avoid rate limiting
    if (i + batchSize < ALL_STOCK_TICKERS.length) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  console.log(`[MCAP] Fetched ${Object.keys(results).length}/${ALL_STOCK_TICKERS.length} tickers`);
  return results;
}

export async function refreshMcapCache(): Promise<void> {
  if (refreshInProgress) return;
  refreshInProgress = true;
  try {
    const fresh = await fetchAllMcap();
    if (Object.keys(fresh).length > 0) {
      mcapCache = fresh;
      lastFetchTime = Date.now();
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[MCAP] Refresh failed:", msg.slice(0, 200));
  } finally {
    refreshInProgress = false;
  }
}

export async function getMcapData(): Promise<Record<string, McapEntry>> {
  const now = Date.now();
  const isStale = now - lastFetchTime > CACHE_TTL;

  if (Object.keys(mcapCache).length === 0 || isStale) {
    // Don't await — return stale cache if available, refresh in background
    if (Object.keys(mcapCache).length > 0) {
      refreshMcapCache(); // fire and forget
      return mcapCache;
    }
    // First load — must await
    await refreshMcapCache();
  }

  return mcapCache;
}

export function getTickerMcap(ticker: string): McapEntry {
  return mcapCache[ticker] || { marketCap: 0, sharesOutstanding: 0 };
}
