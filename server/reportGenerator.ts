/**
 * Daily DAT Summary Report Generator
 * Generates a formatted text report of all DAT companies and crypto assets.
 */
import { DAT_COMPANIES, CRYPTO_ASSETS, ALL_STOCK_TICKERS, ALL_CRYPTO_YAHOO_SYMBOLS } from "@shared/datConfig";
import { fetchAllStockData, fetchAllCryptoData } from "./datData";

export type ReportData = {
  generatedAt: string;
  stocks: Array<{
    ticker: string;
    company: string;
    category: string;
    datAsset: string;
    price: number;
    change1d: number;
    change7d: number;
    change30d: number;
    volume: number;
    error: boolean;
  }>;
  crypto: Array<{
    symbol: string;
    name: string;
    price: number;
    change1d: number;
    change7d: number;
    change30d: number;
    volume: number;
    error: boolean;
  }>;
  summary: {
    totalCompanies: number;
    majorsCount: number;
    altsCount: number;
    avgChange1d: number;
    topGainer: { ticker: string; change1d: number } | null;
    topLoser: { ticker: string; change1d: number } | null;
    gainersCount: number;
    losersCount: number;
    cryptoAvgChange1d: number;
  };
};

/**
 * Fetch all data and build report data structure
 */
export async function buildReportData(): Promise<ReportData> {
  const [stockDataMap, cryptoDataMap] = await Promise.all([
    fetchAllStockData(ALL_STOCK_TICKERS),
    fetchAllCryptoData(ALL_CRYPTO_YAHOO_SYMBOLS),
  ]);

  const stocks = DAT_COMPANIES.map(company => {
    const data = stockDataMap.get(company.ticker);
    return {
      ticker: company.ticker,
      company: company.company,
      category: company.category,
      datAsset: company.datAsset,
      price: data?.quote.price ?? 0,
      change1d: data?.quote.change1d ?? 0,
      change7d: data?.change7d ?? 0,
      change30d: data?.change30d ?? 0,
      volume: data?.quote.volume ?? 0,
      error: !data,
    };
  });

  const crypto = CRYPTO_ASSETS.map(asset => {
    const data = cryptoDataMap.get(asset.yahooSymbol);
    return {
      symbol: asset.symbol,
      name: asset.name,
      price: data?.quote.price ?? 0,
      change1d: data?.quote.change1d ?? 0,
      change7d: data?.change7d ?? 0,
      change30d: data?.change30d ?? 0,
      volume: data?.quote.volume ?? 0,
      error: !data,
    };
  });

  const validStocks = stocks.filter(s => !s.error);
  const avgChange1d = validStocks.length > 0
    ? validStocks.reduce((sum, s) => sum + s.change1d, 0) / validStocks.length
    : 0;

  const sorted = [...validStocks].sort((a, b) => b.change1d - a.change1d);
  const topGainer = sorted.length > 0 ? { ticker: sorted[0].ticker, change1d: sorted[0].change1d } : null;
  const topLoser = sorted.length > 0 ? { ticker: sorted[sorted.length - 1].ticker, change1d: sorted[sorted.length - 1].change1d } : null;

  const validCrypto = crypto.filter(c => !c.error);
  const cryptoAvgChange1d = validCrypto.length > 0
    ? validCrypto.reduce((sum, c) => sum + c.change1d, 0) / validCrypto.length
    : 0;

  return {
    generatedAt: new Date().toISOString(),
    stocks,
    crypto,
    summary: {
      totalCompanies: stocks.length,
      majorsCount: stocks.filter(s => s.category === "Majors").length,
      altsCount: stocks.filter(s => s.category === "Alts").length,
      avgChange1d,
      topGainer,
      topLoser,
      gainersCount: validStocks.filter(s => s.change1d > 0).length,
      losersCount: validStocks.filter(s => s.change1d < 0).length,
      cryptoAvgChange1d,
    },
  };
}

function fmtPct(n: number): string {
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

function fmtPrice(price: number): string {
  if (price === 0) return "N/A";
  if (price >= 1000) return `$${price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (price >= 1) return `$${price.toFixed(2)}`;
  if (price >= 0.01) return `$${price.toFixed(4)}`;
  return `$${price.toFixed(6)}`;
}

function fmtVol(vol: number): string {
  if (vol === 0) return "N/A";
  if (vol >= 1e9) return `${(vol / 1e9).toFixed(2)}B`;
  if (vol >= 1e6) return `${(vol / 1e6).toFixed(2)}M`;
  if (vol >= 1e3) return `${(vol / 1e3).toFixed(1)}K`;
  return vol.toLocaleString();
}

/**
 * Generate the notification title
 */
export function generateReportTitle(data: ReportData): string {
  const date = new Date(data.generatedAt).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const arrow = data.summary.avgChange1d >= 0 ? "↑" : "↓";
  return `DAT Daily Report ${date} | Avg ${arrow}${Math.abs(data.summary.avgChange1d).toFixed(2)}%`;
}

/**
 * Generate formatted text report for notification
 */
export function generateReportContent(data: ReportData): string {
  const lines: string[] = [];
  const date = new Date(data.generatedAt).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const time = new Date(data.generatedAt).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });

  lines.push(`📊 DAT DAILY SUMMARY REPORT`);
  lines.push(`${date} at ${time}`);
  lines.push(`${"─".repeat(50)}`);
  lines.push(``);

  // Summary
  lines.push(`📈 MARKET OVERVIEW`);
  lines.push(`Companies Tracked: ${data.summary.totalCompanies} (${data.summary.majorsCount} Majors, ${data.summary.altsCount} Alts)`);
  lines.push(`Avg 1D Change: ${fmtPct(data.summary.avgChange1d)}`);
  lines.push(`Gainers/Losers: ${data.summary.gainersCount} / ${data.summary.losersCount}`);
  if (data.summary.topGainer) {
    lines.push(`Top Gainer: ${data.summary.topGainer.ticker} (${fmtPct(data.summary.topGainer.change1d)})`);
  }
  if (data.summary.topLoser) {
    lines.push(`Top Loser: ${data.summary.topLoser.ticker} (${fmtPct(data.summary.topLoser.change1d)})`);
  }
  lines.push(`Crypto Avg 1D: ${fmtPct(data.summary.cryptoAvgChange1d)}`);
  lines.push(``);

  // Top Movers
  const validStocks = data.stocks.filter(s => !s.error);
  const sortedByChange = [...validStocks].sort((a, b) => b.change1d - a.change1d);

  lines.push(`🔥 TOP 5 GAINERS`);
  sortedByChange.slice(0, 5).forEach((s, i) => {
    lines.push(`${i + 1}. ${s.ticker} (${s.company}) ${fmtPrice(s.price)} ${fmtPct(s.change1d)}`);
  });
  lines.push(``);

  lines.push(`❄️ TOP 5 LOSERS`);
  sortedByChange.slice(-5).reverse().forEach((s, i) => {
    lines.push(`${i + 1}. ${s.ticker} (${s.company}) ${fmtPrice(s.price)} ${fmtPct(s.change1d)}`);
  });
  lines.push(``);

  // Majors Table
  lines.push(`${"─".repeat(50)}`);
  lines.push(`📋 MAJORS (${data.summary.majorsCount} companies)`);
  lines.push(``);

  const majors = data.stocks.filter(s => s.category === "Majors").sort((a, b) => b.change1d - a.change1d);
  lines.push(`${"Ticker".padEnd(8)} ${"Price".padStart(10)} ${"1D%".padStart(9)} ${"7D%".padStart(9)} ${"30D%".padStart(9)} ${"Vol".padStart(8)}`);
  lines.push(`${"─".repeat(58)}`);
  majors.forEach(s => {
    if (s.error) {
      lines.push(`${s.ticker.padEnd(8)} ${"N/A".padStart(10)} ${"N/A".padStart(9)} ${"N/A".padStart(9)} ${"N/A".padStart(9)} ${"N/A".padStart(8)}`);
    } else {
      lines.push(`${s.ticker.padEnd(8)} ${fmtPrice(s.price).padStart(10)} ${fmtPct(s.change1d).padStart(9)} ${fmtPct(s.change7d).padStart(9)} ${fmtPct(s.change30d).padStart(9)} ${fmtVol(s.volume).padStart(8)}`);
    }
  });
  lines.push(``);

  // Alts Table
  lines.push(`📋 ALTS (${data.summary.altsCount} companies)`);
  lines.push(``);

  const alts = data.stocks.filter(s => s.category === "Alts").sort((a, b) => b.change1d - a.change1d);
  lines.push(`${"Ticker".padEnd(8)} ${"Asset".padEnd(6)} ${"Price".padStart(10)} ${"1D%".padStart(9)} ${"7D%".padStart(9)} ${"30D%".padStart(9)} ${"Vol".padStart(8)}`);
  lines.push(`${"─".repeat(64)}`);
  alts.forEach(s => {
    if (s.error) {
      lines.push(`${s.ticker.padEnd(8)} ${s.datAsset.padEnd(6)} ${"N/A".padStart(10)} ${"N/A".padStart(9)} ${"N/A".padStart(9)} ${"N/A".padStart(9)} ${"N/A".padStart(8)}`);
    } else {
      lines.push(`${s.ticker.padEnd(8)} ${s.datAsset.padEnd(6)} ${fmtPrice(s.price).padStart(10)} ${fmtPct(s.change1d).padStart(9)} ${fmtPct(s.change7d).padStart(9)} ${fmtPct(s.change30d).padStart(9)} ${fmtVol(s.volume).padStart(8)}`);
    }
  });
  lines.push(``);

  // Crypto Table
  lines.push(`${"─".repeat(50)}`);
  lines.push(`🪙 UNDERLYING CRYPTO ASSETS`);
  lines.push(``);
  lines.push(`${"Symbol".padEnd(8)} ${"Name".padEnd(14)} ${"Price".padStart(12)} ${"1D%".padStart(9)} ${"7D%".padStart(9)} ${"30D%".padStart(9)}`);
  lines.push(`${"─".repeat(64)}`);
  const sortedCrypto = [...data.crypto].sort((a, b) => b.change1d - a.change1d);
  sortedCrypto.forEach(c => {
    if (c.error) {
      lines.push(`${c.symbol.padEnd(8)} ${c.name.padEnd(14)} ${"N/A".padStart(12)} ${"N/A".padStart(9)} ${"N/A".padStart(9)} ${"N/A".padStart(9)}`);
    } else {
      lines.push(`${c.symbol.padEnd(8)} ${c.name.padEnd(14)} ${fmtPrice(c.price).padStart(12)} ${fmtPct(c.change1d).padStart(9)} ${fmtPct(c.change7d).padStart(9)} ${fmtPct(c.change30d).padStart(9)}`);
    }
  });
  lines.push(``);
  lines.push(`${"─".repeat(50)}`);
  lines.push(`Generated by DAT Tracker | Auto-refreshes every 5 min`);

  return lines.join("\n");
}
