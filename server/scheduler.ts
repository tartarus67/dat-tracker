/**
 * Server-side scheduler for daily data refresh, snapshots, and report notifications.
 * 
 * Schedules:
 * - Data cache refresh: every 30 minutes
 * - MCAP cache refresh: every 2 hours
 * - Daily snapshot: 21:30 UTC (05:30 AM SGT) — after US market close
 * - Daily report (Manus): 21:00 UTC (05:00 AM SGT)
 * - Daily report (Telegram): 02:00 UTC (10:00 AM SGT)
 */
import cron from "node-cron";
import { fetchAllStockData } from "./datData";
import { getMcapData, refreshMcapCache } from "./mcapData";
import { getCmcPrices } from "./cmcData";
import { buildReportData, generateReportTitle, generateReportContent } from "./reportGenerator";
import { notifyOwner } from "./_core/notification";
import { sendTelegramMessage, formatTelegramReport } from "./telegram";
import { saveStockSnapshots, saveCryptoSnapshots, seedHoldingsIfEmpty } from "./db";
import { ALL_STOCK_TICKERS, ALL_CRYPTO_SYMBOLS, DAT_COMPANIES, CRYPTO_ASSETS } from "@shared/datConfig";

let lastDataRefresh = 0;

/**
 * Force-refresh all data caches (stock + crypto via CMC)
 */
async function refreshAllData(): Promise<void> {
  const start = Date.now();
  console.log("[Scheduler] Starting data refresh...");

  try {
    const [stockData, cmcData] = await Promise.all([
      fetchAllStockData(ALL_STOCK_TICKERS),
      getCmcPrices(ALL_CRYPTO_SYMBOLS),
    ]);

    const stockCount = Array.from(stockData.values()).filter(v => v !== null).length;
    const cryptoCount = cmcData.size;
    lastDataRefresh = Date.now();

    console.log(
      `[Scheduler] Data refresh complete in ${((Date.now() - start) / 1000).toFixed(1)}s — ${stockCount}/${ALL_STOCK_TICKERS.length} stocks, ${cryptoCount}/${ALL_CRYPTO_SYMBOLS.length} crypto`
    );
  } catch (err) {
    console.error("[Scheduler] Data refresh failed:", (err as Error).message);
  }
}

/**
 * Refresh MCAP data (uses yahoo-finance2 npm package)
 */
async function refreshMcapData(): Promise<void> {
  console.log("[Scheduler] Refreshing MCAP data...");
  try {
    await refreshMcapCache();
    const mcap = await getMcapData();
    console.log(`[Scheduler] MCAP refresh complete — ${Object.keys(mcap).length} tickers`);
  } catch (err) {
    console.error("[Scheduler] MCAP refresh failed:", (err as Error).message);
  }
}

/**
 * Save daily snapshot to database
 */
async function saveDailySnapshot(): Promise<void> {
  console.log("[Scheduler] Saving daily snapshot...");
  try {
    const [stockDataMap, cmcData, mcapData] = await Promise.all([
      fetchAllStockData(ALL_STOCK_TICKERS),
      getCmcPrices(ALL_CRYPTO_SYMBOLS),
      getMcapData(),
    ]);

    const today = new Date().toISOString().split("T")[0];

    const stockRows = DAT_COMPANIES.map(company => {
      const data = stockDataMap.get(company.ticker);
      const mcap = mcapData[company.ticker];
      const cmcToken = cmcData.get(company.datAsset);
      const tokenPrice = cmcToken?.price || 0;
      const navRaw = company.holdings > 0 && tokenPrice > 0 ? company.holdings * tokenPrice : 0;
      const nav = navRaw / 1e6;
      const mcapValue = (mcap?.marketCap || 0) / 1e6;
      const mNAV = nav > 0 && mcapValue > 0 ? mcapValue / nav : 0;

      return {
        snapshotDate: today,
        ticker: company.ticker,
        company: company.company,
        category: company.category,
        datAsset: company.datAsset,
        price: data?.quote.price || 0,
        change1d: data?.quote.change1d || 0,
        change7d: data?.change7d || 0,
        change30d: data?.change30d || 0,
        tokenPrice,
        tokenPrice7d: cmcToken?.change7d || 0,
        tokenPrice30d: cmcToken?.change30d || 0,
        mcap: mcapValue,
        nav,
        mNAV,
        vol24h: data?.volumeStats.vol24h || 0,
        vol1dPct: data?.volumeStats.vol1dPct || 0,
        vol7dAvg: data?.volumeStats.vol7dAvg || 0,
        vol7dPct: data?.volumeStats.vol7dPct || 0,
        vol30dAvg: data?.volumeStats.vol30dAvg || 0,
        vol30dPct: data?.volumeStats.vol30dPct || 0,
      };
    });

    const cryptoRows = CRYPTO_ASSETS.map(asset => {
      const cmc = cmcData.get(asset.symbol);
      return {
        snapshotDate: today,
        symbol: asset.symbol,
        name: cmc?.name || asset.name,
        price: cmc?.price || 0,
        change1d: cmc?.change24h || 0,
        change7d: cmc?.change7d || 0,
        change30d: cmc?.change30d || 0,
        volume: cmc?.volume24h || 0,
        marketCap: cmc?.marketCap || 0,
      };
    });

    const [stockCount, cryptoCount] = await Promise.all([
      saveStockSnapshots(stockRows),
      saveCryptoSnapshots(cryptoRows),
    ]);

    console.log(`[Scheduler] Snapshot saved: ${stockCount} stocks, ${cryptoCount} crypto for ${today}`);
  } catch (err) {
    console.error("[Scheduler] Snapshot save failed:", (err as Error).message);
  }
}

/**
 * Generate and send the daily report via Manus notification
 */
async function sendDailyReport(): Promise<void> {
  console.log("[Scheduler] Generating daily report (Manus notification)...");
  try {
    const reportData = await buildReportData();
    const title = generateReportTitle(reportData);
    const content = generateReportContent(reportData);

    const sent = await notifyOwner({ title, content });
    if (sent) {
      console.log("[Scheduler] Daily report sent via Manus notification");
    } else {
      console.warn("[Scheduler] Manus notification failed to send");
    }
  } catch (err) {
    console.error("[Scheduler] Daily report (Manus) failed:", (err as Error).message);
  }
}

/**
 * Generate and send the daily report via Telegram to @nvxin
 */
async function sendTelegramReport(): Promise<void> {
  console.log("[Scheduler] Generating daily report (Telegram)...");
  try {
    const reportData = await buildReportData();
    const telegramMsg = formatTelegramReport(reportData);
    const sent = await sendTelegramMessage(telegramMsg);
    if (sent) {
      console.log("[Scheduler] Daily report sent via Telegram to @nvxin");
    } else {
      console.warn("[Scheduler] Telegram report failed to send");
    }
  } catch (err) {
    console.error("[Scheduler] Daily report (Telegram) failed:", (err as Error).message);
  }
}

/**
 * Initialize all scheduled tasks
 */
export function initScheduler(): void {
  console.log("[Scheduler] Initializing scheduled tasks...");

  // 1. Data refresh every 30 minutes (stock + crypto prices)
  cron.schedule("0 0,30 * * * *", () => {
    refreshAllData().catch(console.error);
  });

  // 2. MCAP data refresh every 2 hours
  cron.schedule("0 0 */2 * * *", () => {
    refreshMcapData().catch(console.error);
  });

  // 3. Daily snapshot at 21:30 UTC (05:30 AM SGT) — after US market close
  cron.schedule("0 30 21 * * *", () => {
    saveDailySnapshot().catch(console.error);
  });

  // 4. Daily report via Manus at 21:00 UTC (05:00 AM SGT)
  cron.schedule("0 0 21 * * *", () => {
    sendDailyReport().catch(console.error);
  });

  // 5. Daily report via Telegram — DISABLED per user request
  // cron.schedule("0 0 2 * * *", () => {
  //   sendTelegramReport().catch(console.error);
  // });

  // 6. Initial data load on startup (with 5s delay to let server stabilize)
  setTimeout(async () => {
    try {
      console.log("[Scheduler] Pre-warming MCAP data...");
      await refreshMcapData();
      console.log("[Scheduler] Pre-warming stock + crypto data...");
      await refreshAllData();
      console.log("[Scheduler] Initial data load complete");

      // Seed holdings from config if DB table is empty
      const companies = DAT_COMPANIES.map(c => ({
        ticker: c.ticker, company: c.company,
        category: c.category, datAsset: c.datAsset,
        holdings: c.holdings,
      }));
      const seeded = await seedHoldingsIfEmpty(companies);
      if (seeded > 0) console.log(`[Scheduler] Seeded ${seeded} company holdings`);
    } catch (err) {
      console.error("[Scheduler] Initial data load failed:", (err as Error).message);
    }
  }, 5_000);

  console.log("[Scheduler] Scheduled tasks:");
  console.log("  - Data refresh: every 30 min");
  console.log("  - MCAP refresh: every 2 hours");
  console.log("  - Daily snapshot: 21:30 UTC (05:30 SGT)");
  console.log("  - Daily report (Manus): 21:00 UTC (05:00 SGT)");
  console.log("  - Daily report (Telegram): DISABLED");
}

export function getLastDataRefresh(): number {
  return lastDataRefresh;
}
