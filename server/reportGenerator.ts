/**
 * Daily DAT Summary Report Generator
 * Generates a formatted text report of all DAT companies and crypto assets.
 */
import { DAT_COMPANIES, CRYPTO_ASSETS, ALL_STOCK_TICKERS, ALL_CRYPTO_YAHOO_SYMBOLS } from "@shared/datConfig";
import { fetchAllStockData, fetchAllCryptoData } from "./datData";
import { getMcapData } from "./mcapData";

export type ReportStock = {
  ticker: string;
  company: string;
  category: string;
  datAsset: string;
  holdings: number;
  price: number;
  change1d: number;
  change7d: number;
  change30d: number;
  tokenPrice: number;
  tokenPrice7d: number;
  tokenPrice30d: number;
  mcap: number;
  nav: number;
  mNAV: number;
  vol24h: number;
  vol1dPct: number;
  vol7dAvg: number;
  vol7dPct: number;
  vol30dAvg: number;
  vol30dPct: number;
  error: boolean;
};

export type ReportCrypto = {
  symbol: string;
  name: string;
  price: number;
  change1d: number;
  change7d: number;
  change30d: number;
  volume: number;
  error: boolean;
};

export type ReportData = {
  generatedAt: string;
  stocks: ReportStock[];
  crypto: ReportCrypto[];
  summary: {
    totalCompanies: number;
    majorsCount: number;
    altsCount: number;
    avgChange1d: number;
    totalMcap: number;
    totalNav: number;
    topGainer: { ticker: string; change1d: number } | null;
    topLoser: { ticker: string; change1d: number } | null;
    gainersCount: number;
    losersCount: number;
    cryptoAvgChange1d: number;
  };
};

export async function buildReportData(): Promise<ReportData> {
  const [stockDataMap, cryptoDataMap, mcapData] = await Promise.all([
    fetchAllStockData(ALL_STOCK_TICKERS),
    fetchAllCryptoData(ALL_CRYPTO_YAHOO_SYMBOLS),
    getMcapData(),
  ]);

  // Build crypto lookup
  const cryptoBySymbol = new Map<string, { price: number; change7d: number; change30d: number }>();
  const crypto: ReportCrypto[] = CRYPTO_ASSETS.map(asset => {
    const data = cryptoDataMap.get(asset.yahooSymbol);
    const entry = {
      symbol: asset.symbol,
      name: asset.name,
      price: data?.quote.price ?? 0,
      change1d: data?.quote.change1d ?? 0,
      change7d: data?.change7d ?? 0,
      change30d: data?.change30d ?? 0,
      volume: data?.quote.volume ?? 0,
      error: !data,
    };
    cryptoBySymbol.set(asset.symbol, { price: entry.price, change7d: entry.change7d, change30d: entry.change30d });
    return entry;
  });

  const stocks: ReportStock[] = DAT_COMPANIES.map(company => {
    const data = stockDataMap.get(company.ticker);
    const mcap = mcapData[company.ticker];
    const cd = cryptoBySymbol.get(company.datAsset);

    const tokenPrice = cd?.price || 0;
    const tokenPrice7d = cd?.change7d || 0;
    const tokenPrice30d = cd?.change30d || 0;
    const navRaw = company.holdings > 0 && tokenPrice > 0 ? company.holdings * tokenPrice : 0;
    const nav = navRaw / 1e6;
    const mcapValue = (mcap?.marketCap || 0) / 1e6;
    const mNAV = nav > 0 && mcapValue > 0 ? mcapValue / nav : 0;

    return {
      ticker: company.ticker,
      company: company.company,
      category: company.category,
      datAsset: company.datAsset,
      holdings: company.holdings,
      price: data?.quote.price ?? 0,
      change1d: data?.quote.change1d ?? 0,
      change7d: data?.change7d ?? 0,
      change30d: data?.change30d ?? 0,
      tokenPrice,
      tokenPrice7d,
      tokenPrice30d,
      mcap: mcapValue,
      nav,
      mNAV,
      vol24h: data?.volumeStats.vol24h ?? 0,
      vol1dPct: data?.volumeStats.vol1dPct ?? 0,
      vol7dAvg: data?.volumeStats.vol7dAvg ?? 0,
      vol7dPct: data?.volumeStats.vol7dPct ?? 0,
      vol30dAvg: data?.volumeStats.vol30dAvg ?? 0,
      vol30dPct: data?.volumeStats.vol30dPct ?? 0,
      error: !data,
    };
  });

  const validStocks = stocks.filter(s => !s.error);
  const avgChange1d = validStocks.length > 0 ? validStocks.reduce((sum, s) => sum + s.change1d, 0) / validStocks.length : 0;
  const totalMcap = stocks.reduce((sum, s) => sum + s.mcap, 0);
  const totalNav = stocks.reduce((sum, s) => sum + s.nav, 0);

  const sorted = [...validStocks].sort((a, b) => b.change1d - a.change1d);
  const topGainer = sorted.length > 0 ? { ticker: sorted[0].ticker, change1d: sorted[0].change1d } : null;
  const topLoser = sorted.length > 0 ? { ticker: sorted[sorted.length - 1].ticker, change1d: sorted[sorted.length - 1].change1d } : null;

  const validCrypto = crypto.filter(c => !c.error);
  const cryptoAvgChange1d = validCrypto.length > 0 ? validCrypto.reduce((sum, c) => sum + c.change1d, 0) / validCrypto.length : 0;

  return {
    generatedAt: new Date().toISOString(),
    stocks,
    crypto,
    summary: {
      totalCompanies: stocks.length,
      majorsCount: stocks.filter(s => s.category === "Majors").length,
      altsCount: stocks.filter(s => s.category === "Alts").length,
      avgChange1d,
      totalMcap,
      totalNav,
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

function fmtMcap(val: number): string {
  if (val === 0) return "N/A";
  if (val >= 1000) return `$${(val / 1000).toFixed(1)}B`;
  return `$${val.toFixed(0)}M`;
}

export function generateReportTitle(data: ReportData): string {
  const date = new Date(data.generatedAt).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
  });
  const arrow = data.summary.avgChange1d >= 0 ? "\u2191" : "\u2193";
  return `DAT Daily Report ${date} | Avg ${arrow}${Math.abs(data.summary.avgChange1d).toFixed(2)}%`;
}

export function generateReportContent(data: ReportData): string {
  const lines: string[] = [];
  const date = new Date(data.generatedAt).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });
  const time = new Date(data.generatedAt).toLocaleTimeString("en-US", {
    hour: "2-digit", minute: "2-digit", timeZoneName: "short",
  });

  lines.push(`DAT DAILY SUMMARY REPORT`);
  lines.push(`${date} at ${time}`);
  lines.push(`${"=".repeat(60)}`);
  lines.push(``);

  // Summary
  lines.push(`MARKET OVERVIEW`);
  lines.push(`Companies: ${data.summary.totalCompanies} (${data.summary.majorsCount} Majors, ${data.summary.altsCount} Alts)`);
  lines.push(`Avg 1D Change: ${fmtPct(data.summary.avgChange1d)}`);
  lines.push(`Gainers/Losers: ${data.summary.gainersCount} / ${data.summary.losersCount}`);
  lines.push(`Total MCAP: ${fmtMcap(data.summary.totalMcap)}`);
  lines.push(`Total NAV: ${fmtMcap(data.summary.totalNav)}`);
  if (data.summary.topGainer) lines.push(`Top Gainer: ${data.summary.topGainer.ticker} (${fmtPct(data.summary.topGainer.change1d)})`);
  if (data.summary.topLoser) lines.push(`Top Loser: ${data.summary.topLoser.ticker} (${fmtPct(data.summary.topLoser.change1d)})`);
  lines.push(`Crypto Avg 1D: ${fmtPct(data.summary.cryptoAvgChange1d)}`);
  lines.push(``);

  // Top Movers
  const validStocks = data.stocks.filter(s => !s.error);
  const sortedByChange = [...validStocks].sort((a, b) => b.change1d - a.change1d);

  lines.push(`TOP 5 GAINERS`);
  sortedByChange.slice(0, 5).forEach((s, i) => {
    lines.push(`${i + 1}. ${s.ticker} ${fmtPrice(s.price)} ${fmtPct(s.change1d)} | MCAP ${fmtMcap(s.mcap)} | mNAV ${s.mNAV > 0 ? s.mNAV.toFixed(2) + "x" : "N/A"}`);
  });
  lines.push(``);

  lines.push(`TOP 5 LOSERS`);
  sortedByChange.slice(-5).reverse().forEach((s, i) => {
    lines.push(`${i + 1}. ${s.ticker} ${fmtPrice(s.price)} ${fmtPct(s.change1d)} | MCAP ${fmtMcap(s.mcap)} | mNAV ${s.mNAV > 0 ? s.mNAV.toFixed(2) + "x" : "N/A"}`);
  });
  lines.push(``);

  // Majors Table
  lines.push(`${"=".repeat(60)}`);
  lines.push(`MAJORS (${data.summary.majorsCount} companies)`);
  lines.push(``);
  lines.push(`${"Ticker".padEnd(7)} ${"Price".padStart(9)} ${"1D%".padStart(8)} ${"7D%".padStart(8)} ${"30D%".padStart(8)} ${"MCAP".padStart(8)} ${"NAV".padStart(8)} ${"mNAV".padStart(6)} ${"Vol".padStart(7)}`);
  lines.push(`${"-".repeat(76)}`);

  const majors = data.stocks.filter(s => s.category === "Majors").sort((a, b) => b.change1d - a.change1d);
  majors.forEach(s => {
    const mcapStr = s.mcap > 0 ? fmtMcap(s.mcap) : "N/A";
    const navStr = s.nav > 0 ? fmtMcap(s.nav) : "N/A";
    const mnavStr = s.mNAV > 0 ? `${s.mNAV.toFixed(1)}x` : "N/A";
    if (s.error) {
      lines.push(`${s.ticker.padEnd(7)} ${"N/A".padStart(9)} ${"N/A".padStart(8)} ${"N/A".padStart(8)} ${"N/A".padStart(8)} ${mcapStr.padStart(8)} ${navStr.padStart(8)} ${mnavStr.padStart(6)} ${"N/A".padStart(7)}`);
    } else {
      lines.push(`${s.ticker.padEnd(7)} ${fmtPrice(s.price).padStart(9)} ${fmtPct(s.change1d).padStart(8)} ${fmtPct(s.change7d).padStart(8)} ${fmtPct(s.change30d).padStart(8)} ${mcapStr.padStart(8)} ${navStr.padStart(8)} ${mnavStr.padStart(6)} ${fmtVol(s.vol24h).padStart(7)}`);
    }
  });
  lines.push(``);

  // Alts Table
  lines.push(`ALTS (${data.summary.altsCount} companies)`);
  lines.push(``);
  lines.push(`${"Ticker".padEnd(7)} ${"Asset".padEnd(5)} ${"Price".padStart(9)} ${"1D%".padStart(8)} ${"7D%".padStart(8)} ${"30D%".padStart(8)} ${"MCAP".padStart(8)} ${"Vol".padStart(7)}`);
  lines.push(`${"-".repeat(68)}`);

  const alts = data.stocks.filter(s => s.category === "Alts").sort((a, b) => b.change1d - a.change1d);
  alts.forEach(s => {
    const mcapStr = s.mcap > 0 ? fmtMcap(s.mcap) : "N/A";
    if (s.error) {
      lines.push(`${s.ticker.padEnd(7)} ${s.datAsset.padEnd(5)} ${"N/A".padStart(9)} ${"N/A".padStart(8)} ${"N/A".padStart(8)} ${"N/A".padStart(8)} ${mcapStr.padStart(8)} ${"N/A".padStart(7)}`);
    } else {
      lines.push(`${s.ticker.padEnd(7)} ${s.datAsset.padEnd(5)} ${fmtPrice(s.price).padStart(9)} ${fmtPct(s.change1d).padStart(8)} ${fmtPct(s.change7d).padStart(8)} ${fmtPct(s.change30d).padStart(8)} ${mcapStr.padStart(8)} ${fmtVol(s.vol24h).padStart(7)}`);
    }
  });
  lines.push(``);

  // Crypto Table
  lines.push(`${"=".repeat(60)}`);
  lines.push(`UNDERLYING CRYPTO ASSETS`);
  lines.push(``);
  lines.push(`${"Symbol".padEnd(7)} ${"Name".padEnd(12)} ${"Price".padStart(12)} ${"1D%".padStart(8)} ${"7D%".padStart(8)} ${"30D%".padStart(8)}`);
  lines.push(`${"-".repeat(58)}`);
  const sortedCrypto = [...data.crypto].sort((a, b) => b.change1d - a.change1d);
  sortedCrypto.forEach(c => {
    if (c.error) {
      lines.push(`${c.symbol.padEnd(7)} ${c.name.padEnd(12)} ${"N/A".padStart(12)} ${"N/A".padStart(8)} ${"N/A".padStart(8)} ${"N/A".padStart(8)}`);
    } else {
      lines.push(`${c.symbol.padEnd(7)} ${c.name.padEnd(12)} ${fmtPrice(c.price).padStart(12)} ${fmtPct(c.change1d).padStart(8)} ${fmtPct(c.change7d).padStart(8)} ${fmtPct(c.change30d).padStart(8)}`);
    }
  });
  lines.push(``);
  lines.push(`${"=".repeat(60)}`);
  lines.push(`Generated by DAT Tracker | Auto-refreshes every 5 min`);

  return lines.join("\n");
}
