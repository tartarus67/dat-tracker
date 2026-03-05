/**
 * DAT data fetching module — uses Yahoo Finance v8 API directly via axios.
 */
import axios from "axios";

export type StockQuote = {
  ticker: string;
  price: number;
  previousClose: number;
  change1d: number;
  volume: number;
  marketCap: number;
  dayHigh: number;
  dayLow: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  name: string;
};

export type CryptoQuote = {
  symbol: string;
  yahooSymbol: string;
  price: number;
  change1d: number;
  volume: number;
  marketCap: number;
  name: string;
};

export type HistoricalPoint = {
  date: string;
  close: number;
  volume: number;
};

export type VolumeStats = {
  vol24h: number;
  vol1dPct: number;  // volume change vs previous day
  vol7dAvg: number;
  vol7dPct: number;  // current vol vs 7d avg
  vol30dAvg: number;
  vol30dPct: number; // current vol vs 30d avg
};

const YAHOO_BASE = "https://query1.finance.yahoo.com/v8/finance/chart";

const YAHOO_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  Accept: "application/json",
};

async function fetchYahooChart(symbol: string, range = "1mo", interval = "1d") {
  try {
    const resp = await axios.get(`${YAHOO_BASE}/${encodeURIComponent(symbol)}`, {
      params: { region: "US", interval, range },
      headers: YAHOO_HEADERS,
      timeout: 15000,
    });
    const data = resp.data;
    if (data?.chart?.result?.[0]) return data;
    return null;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(`[DAT] Failed to fetch ${symbol}:`, msg.slice(0, 120));
    return null;
  }
}

function calcPctChange(currentPrice: number, historicalPrices: number[], daysBack: number): number {
  if (historicalPrices.length === 0) return 0;
  const idx = Math.max(0, historicalPrices.length - daysBack - 1);
  const oldPrice = historicalPrices[idx];
  if (!oldPrice || oldPrice === 0) return 0;
  return ((currentPrice - oldPrice) / oldPrice) * 100;
}

function calcVolumeStats(volumes: (number | null)[], currentVolume: number): VolumeStats {
  const validVolumes = volumes.filter((v): v is number => v !== null && v !== undefined && v > 0);

  if (validVolumes.length === 0) {
    return { vol24h: currentVolume, vol1dPct: 0, vol7dAvg: 0, vol7dPct: 0, vol30dAvg: 0, vol30dPct: 0 };
  }

  // Previous day volume (second to last)
  const prevDayVol = validVolumes.length >= 2 ? validVolumes[validVolumes.length - 2] : 0;
  const vol1dPct = prevDayVol > 0 ? ((currentVolume - prevDayVol) / prevDayVol) * 100 : 0;

  // 7-day average volume
  const last7 = validVolumes.slice(-7);
  const vol7dAvg = last7.length > 0 ? last7.reduce((a, b) => a + b, 0) / last7.length : 0;
  const vol7dPct = vol7dAvg > 0 ? ((currentVolume - vol7dAvg) / vol7dAvg) * 100 : 0;

  // 30-day average volume
  const last30 = validVolumes.slice(-30);
  const vol30dAvg = last30.length > 0 ? last30.reduce((a, b) => a + b, 0) / last30.length : 0;
  const vol30dPct = vol30dAvg > 0 ? ((currentVolume - vol30dAvg) / vol30dAvg) * 100 : 0;

  return { vol24h: currentVolume, vol1dPct, vol7dAvg, vol7dPct, vol30dAvg, vol30dPct };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractData(data: any) {
  const r = data.chart.result[0];
  const meta = r.meta;
  const timestamps: number[] = r.timestamp || [];
  const q = r.indicators?.quote?.[0];
  const closes: (number | null)[] = q?.close || [];
  const volumes: (number | null)[] = q?.volume || [];

  const validCloses = closes.filter((c): c is number => c !== null && c !== undefined);
  const currentPrice = meta.regularMarketPrice || validCloses[validCloses.length - 1] || 0;
  const previousClose = meta.previousClose || (validCloses.length > 1 ? validCloses[validCloses.length - 2] : currentPrice);

  const change1d = previousClose ? ((currentPrice - previousClose) / previousClose) * 100 : 0;
  const change7d = calcPctChange(currentPrice, validCloses, 7);
  const change30d = calcPctChange(currentPrice, validCloses, 30);

  const currentVolume = meta.regularMarketVolume || 0;
  const volumeStats = calcVolumeStats(volumes, currentVolume);

  const history: HistoricalPoint[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    if (closes[i] !== null && closes[i] !== undefined) {
      history.push({
        date: new Date(timestamps[i] * 1000).toISOString().split("T")[0],
        close: closes[i]!,
        volume: volumes[i] || 0,
      });
    }
  }

  return { meta, currentPrice, previousClose, change1d, change7d, change30d, volumeStats, history };
}

export async function fetchStockData(ticker: string): Promise<{
  quote: StockQuote;
  change7d: number;
  change30d: number;
  volumeStats: VolumeStats;
  history: HistoricalPoint[];
} | null> {
  const data = await fetchYahooChart(ticker);
  if (!data) return null;

  const { meta, currentPrice, previousClose, change1d, change7d, change30d, volumeStats, history } = extractData(data);

  return {
    quote: {
      ticker: meta.symbol || ticker,
      price: currentPrice,
      previousClose,
      change1d,
      volume: meta.regularMarketVolume || 0,
      marketCap: meta.marketCap || 0,
      dayHigh: meta.regularMarketDayHigh || 0,
      dayLow: meta.regularMarketDayLow || 0,
      fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh || 0,
      fiftyTwoWeekLow: meta.fiftyTwoWeekLow || 0,
      name: meta.longName || meta.shortName || ticker,
    },
    change7d,
    change30d,
    volumeStats,
    history,
  };
}

export async function fetchCryptoData(yahooSymbol: string): Promise<{
  quote: CryptoQuote;
  change7d: number;
  change30d: number;
  history: HistoricalPoint[];
} | null> {
  const data = await fetchYahooChart(yahooSymbol);
  if (!data) return null;

  const { meta, currentPrice, change1d, change7d, change30d, history } = extractData(data);
  const displaySymbol = yahooSymbol.replace(/-USD$/, "").replace(/\d+$/, "");

  return {
    quote: {
      symbol: displaySymbol,
      yahooSymbol,
      price: currentPrice,
      change1d,
      volume: meta.regularMarketVolume || 0,
      marketCap: meta.marketCap || 0,
      name: meta.longName || meta.shortName || yahooSymbol,
    },
    change7d,
    change30d,
    history,
  };
}

/** Fetch all stock data in batches of 3 with delay */
export async function fetchAllStockData(tickers: string[]): Promise<Map<string, Awaited<ReturnType<typeof fetchStockData>>>> {
  const results = new Map<string, Awaited<ReturnType<typeof fetchStockData>>>();
  const batchSize = 3;
  for (let i = 0; i < tickers.length; i += batchSize) {
    const batch = tickers.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(t => fetchStockData(t)));
    batch.forEach((ticker, idx) => results.set(ticker, batchResults[idx]));
    if (i + batchSize < tickers.length) await new Promise(r => setTimeout(r, 300));
  }
  return results;
}

/** Fetch all crypto data in batches */
export async function fetchAllCryptoData(yahooSymbols: string[]): Promise<Map<string, Awaited<ReturnType<typeof fetchCryptoData>>>> {
  const results = new Map<string, Awaited<ReturnType<typeof fetchCryptoData>>>();
  const batchSize = 3;
  for (let i = 0; i < yahooSymbols.length; i += batchSize) {
    const batch = yahooSymbols.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(s => fetchCryptoData(s)));
    batch.forEach((symbol, idx) => results.set(symbol, batchResults[idx]));
    if (i + batchSize < yahooSymbols.length) await new Promise(r => setTimeout(r, 300));
  }
  return results;
}
