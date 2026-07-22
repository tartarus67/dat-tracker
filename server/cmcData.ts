/**
 * CoinMarketCap API integration for accurate crypto token prices.
 * Uses the /v1/cryptocurrency/quotes/latest endpoint.
 */
import axios from "axios";
import { ENV } from "./_core/env";

export type CmcTokenData = {
  symbol: string;
  name: string;
  price: number;
  change1h: number;
  change24h: number;
  change7d: number;
  change30d: number;
  volume24h: number;
  marketCap: number;
  lastUpdated: string;
};

const CMC_BASE = "https://pro-api.coinmarketcap.com";

// Map our internal symbols to CMC slugs/IDs for tokens that might be ambiguous
const CMC_SYMBOL_MAP: Record<string, string> = {
  BTC: "BTC",
  ETH: "ETH",
  SOL: "SOL",
  BNB: "BNB",
  XRP: "XRP",
  SUI: "SUI",
  TRX: "TRX",
  ATH: "ATH",     // Aethir
  TAO: "TAO",     // Bittensor
  DOGE: "DOGE",
  HBAR: "HBAR",
  IP: "IP",       // Story Protocol
  WLD: "WLD",     // Worldcoin
  "0G": "ZG",     // 0G uses ZG on some platforms
};

// CMC IDs for tokens that are ambiguous by symbol
const CMC_ID_MAP: Record<string, number> = {
  ATH: 30083,   // Aethir
  IP: 35626,    // Story Protocol
  "0G": 38337,  // 0G (Zero Gravity)
  TON: 11419,   // Toncoin (now Gram on CMC)
  DATA: 35626,  // Data Network (prev Story Protocol $IP)
};

let tokenCache: Map<string, CmcTokenData> = new Map();
let lastFetchTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch token prices from CoinMarketCap API
 */
export async function fetchCmcPrices(symbols: string[]): Promise<Map<string, CmcTokenData>> {
  const apiKey = ENV.cmcApiKey;
  if (!apiKey) {
    console.warn("[CMC] No API key configured");
    return new Map();
  }

  const results = new Map<string, CmcTokenData>();

  try {
    // Split into two groups: those with known IDs and those by symbol
    const idSymbols = symbols.filter(s => CMC_ID_MAP[s]);
    const regularSymbols = symbols.filter(s => !CMC_ID_MAP[s]);

    // Fetch by symbol for regular tokens
    if (regularSymbols.length > 0) {
      const cmcSymbols = regularSymbols.map(s => CMC_SYMBOL_MAP[s] || s).join(",");
      const resp = await axios.get(`${CMC_BASE}/v1/cryptocurrency/quotes/latest`, {
        headers: {
          "X-CMC_PRO_API_KEY": apiKey,
          Accept: "application/json",
        },
        params: {
          symbol: cmcSymbols,
          convert: "USD",
        },
        timeout: 15000,
      });

      if (resp.data?.data) {
        for (const sym of regularSymbols) {
          const cmcSym = CMC_SYMBOL_MAP[sym] || sym;
          const tokenData = resp.data.data[cmcSym];
          // CMC returns array when there are multiple matches
          const token = Array.isArray(tokenData) ? tokenData[0] : tokenData;
          if (token) {
            const quote = token.quote?.USD;
            if (quote) {
              results.set(sym, {
                symbol: sym,
                name: token.name,
                price: quote.price || 0,
                change1h: quote.percent_change_1h || 0,
                change24h: quote.percent_change_24h || 0,
                change7d: quote.percent_change_7d || 0,
                change30d: quote.percent_change_30d || 0,
                volume24h: quote.volume_24h || 0,
                marketCap: quote.market_cap || 0,
                lastUpdated: quote.last_updated || "",
              });
            }
          }
        }
      }
    }

    // Fetch by ID for ambiguous tokens
    if (idSymbols.length > 0) {
      const ids = idSymbols.map(s => CMC_ID_MAP[s]).join(",");
      const resp = await axios.get(`${CMC_BASE}/v1/cryptocurrency/quotes/latest`, {
        headers: {
          "X-CMC_PRO_API_KEY": apiKey,
          Accept: "application/json",
        },
        params: {
          id: ids,
          convert: "USD",
        },
        timeout: 15000,
      });

      if (resp.data?.data) {
        for (const sym of idSymbols) {
          const id = CMC_ID_MAP[sym];
          const token = resp.data.data[String(id)];
          if (token) {
            const quote = token.quote?.USD;
            if (quote) {
              results.set(sym, {
                symbol: sym,
                name: token.name,
                price: quote.price || 0,
                change1h: quote.percent_change_1h || 0,
                change24h: quote.percent_change_24h || 0,
                change7d: quote.percent_change_7d || 0,
                change30d: quote.percent_change_30d || 0,
                volume24h: quote.volume_24h || 0,
                marketCap: quote.market_cap || 0,
                lastUpdated: quote.last_updated || "",
              });
            }
          }
        }
      }
    }

    console.log(`[CMC] Fetched ${results.size}/${symbols.length} token prices`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[CMC] API error:", msg.slice(0, 200));
  }

  return results;
}

/**
 * Get cached token prices, refreshing if stale
 */
export async function getCmcPrices(symbols: string[]): Promise<Map<string, CmcTokenData>> {
  const now = Date.now();
  if (now - lastFetchTime < CACHE_TTL && tokenCache.size > 0) {
    return tokenCache;
  }

  const fresh = await fetchCmcPrices(symbols);
  if (fresh.size > 0) {
    tokenCache = fresh;
    lastFetchTime = now;
  }

  return tokenCache;
}

/**
 * Get a single token's data from cache
 */
export function getCmcToken(symbol: string): CmcTokenData | undefined {
  return tokenCache.get(symbol);
}
