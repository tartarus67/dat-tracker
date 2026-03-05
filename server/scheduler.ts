/**
 * Server-side scheduler for daily data refresh and report notifications.
 * 
 * Schedules:
 * - Data cache refresh: every 5 minutes during market hours, every 30 min otherwise
 * - MCAP cache refresh: every 2 hours
 * - Daily report: 9:00 PM UTC (5:00 AM UTC+8 next day) — after US market close
 */
import cron from "node-cron";
import { fetchAllStockData, fetchAllCryptoData } from "./datData";
import { getMcapData, refreshMcapCache } from "./mcapData";
import { buildReportData, generateReportTitle, generateReportContent } from "./reportGenerator";
import { notifyOwner } from "./_core/notification";
import { ALL_STOCK_TICKERS, ALL_CRYPTO_YAHOO_SYMBOLS } from "@shared/datConfig";

let lastDataRefresh = 0;

/**
 * Force-refresh all data caches (stock, crypto, mcap)
 */
async function refreshAllData(): Promise<void> {
  const start = Date.now();
  console.log("[Scheduler] Starting data refresh...");

  try {
    const [stockData, cryptoData] = await Promise.all([
      fetchAllStockData(ALL_STOCK_TICKERS),
      fetchAllCryptoData(ALL_CRYPTO_YAHOO_SYMBOLS),
    ]);

    const stockCount = Array.from(stockData.values()).filter(v => v !== null).length;
    const cryptoCount = Array.from(cryptoData.values()).filter(v => v !== null).length;
    lastDataRefresh = Date.now();

    console.log(
      `[Scheduler] Data refresh complete in ${((Date.now() - start) / 1000).toFixed(1)}s — ${stockCount}/${ALL_STOCK_TICKERS.length} stocks, ${cryptoCount}/${ALL_CRYPTO_YAHOO_SYMBOLS.length} crypto`
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
 * Generate and send the daily report via Manus notification
 */
async function sendDailyReport(): Promise<void> {
  console.log("[Scheduler] Generating daily report...");
  try {
    const reportData = await buildReportData();
    const title = generateReportTitle(reportData);
    const content = generateReportContent(reportData);

    const sent = await notifyOwner({ title, content });
    if (sent) {
      console.log("[Scheduler] Daily report sent successfully");
    } else {
      console.warn("[Scheduler] Daily report notification failed to send");
    }
  } catch (err) {
    console.error("[Scheduler] Daily report generation failed:", (err as Error).message);
  }
}

/**
 * Initialize all scheduled tasks
 */
export function initScheduler(): void {
  console.log("[Scheduler] Initializing scheduled tasks...");

  // 1. Data refresh every 30 minutes (stock + crypto prices)
  //    Runs at :00 and :30 of every hour
  cron.schedule("0 0,30 * * * *", () => {
    refreshAllData().catch(console.error);
  });

  // 2. MCAP data refresh every 2 hours
  //    Runs at the top of every even hour
  cron.schedule("0 0 */2 * * *", () => {
    refreshMcapData().catch(console.error);
  });

  // 3. Daily report at 21:00 UTC (5:00 AM UTC+8, after US market close)
  cron.schedule("0 0 21 * * *", () => {
    sendDailyReport().catch(console.error);
  });

  // 4. Initial data load on startup (with 5s delay to let server stabilize)
  //    Load MCAP first (takes ~30s), then stock/crypto data
  setTimeout(async () => {
    try {
      console.log("[Scheduler] Pre-warming MCAP data...");
      await refreshMcapData();
      console.log("[Scheduler] Pre-warming stock + crypto data...");
      await refreshAllData();
      console.log("[Scheduler] Initial data load complete");
    } catch (err) {
      console.error("[Scheduler] Initial data load failed:", (err as Error).message);
    }
  }, 5_000);

  console.log("[Scheduler] Scheduled tasks:");
  console.log("  - Data refresh: every 30 min");
  console.log("  - MCAP refresh: every 2 hours");
  console.log("  - Daily report: 21:00 UTC (05:00 UTC+8)");
}

export function getLastDataRefresh(): number {
  return lastDataRefresh;
}
