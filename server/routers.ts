import { COOKIE_NAME } from "@shared/const";
import { DAT_COMPANIES, CRYPTO_ASSETS, ALL_STOCK_TICKERS, ALL_CRYPTO_SYMBOLS } from "@shared/datConfig";
import { NAV_COMPANIES } from "@shared/navConfig";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { fetchAllStockData } from "./datData";
import { getMcapData } from "./mcapData";
import { getCmcPrices } from "./cmcData";
import { buildReportData, generateReportTitle, generateReportContent } from "./reportGenerator";
import { notifyOwner } from "./_core/notification";
import { sendTelegramMessage, formatTelegramReport } from "./telegram";
import {
  saveStockSnapshots, saveCryptoSnapshots,
  getStockSnapshotsByDate, getCryptoSnapshotsByDate,
  getSnapshotDates, getAllStockSnapshots,
  getAllHoldings, upsertHolding, seedHoldingsIfEmpty,
} from "./db";
import { z } from "zod";

// In-memory cache with TTL
type CacheEntry<T> = { data: T; timestamp: number };
const cache: Record<string, CacheEntry<unknown>> = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCached<T>(key: string): T | null {
  const entry = cache[key] as CacheEntry<T> | undefined;
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.data;
  }
  return null;
}

function setCache<T>(key: string, data: T): void {
  cache[key] = { data, timestamp: Date.now() };
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  dat: router({
    /** Fetch both stock and crypto data in one call */
    getDashboardData: publicProcedure.query(async () => {
      const cached = getCached<DashboardResult>("dashboardData");
      if (cached) return cached;

      const [stockDataMap, cmcData, mcapData] = await Promise.all([
        fetchAllStockData(ALL_STOCK_TICKERS),
        getCmcPrices(ALL_CRYPTO_SYMBOLS),
        getMcapData(),
      ]);

      const cryptoResponse = CRYPTO_ASSETS.map(asset => {
        const cmc = cmcData.get(asset.symbol);
        return {
          symbol: asset.symbol,
          name: cmc?.name || asset.name,
          price: cmc?.price || 0,
          change1d: cmc?.change24h || 0,
          change7d: cmc?.change7d || 0,
          change30d: cmc?.change30d || 0,
          volume: cmc?.volume24h || 0,
          marketCap: cmc?.marketCap || 0,
          error: !cmc,
        };
      });

      const stockResponse = DAT_COMPANIES.map(company => {
        const data = stockDataMap.get(company.ticker);
        const mcap = mcapData[company.ticker];
        const cmcToken = cmcData.get(company.datAsset);

        const tokenPrice = cmcToken?.price || 0;
        const tokenPrice7d = cmcToken?.change7d || 0;
        const tokenPrice30d = cmcToken?.change30d || 0;

        const navRaw = company.holdings > 0 && tokenPrice > 0
          ? company.holdings * tokenPrice : 0;
        const nav = navRaw / 1e6;
        const mcapValue = (mcap?.marketCap || 0) / 1e6;
        const mNAV = nav > 0 && mcapValue > 0 ? mcapValue / nav : 0;

        if (!data) {
          return {
            company: company.company, ticker: company.ticker,
            category: company.category, datAsset: company.datAsset,
            holdings: company.holdings,
            price: 0, change1d: 0, change7d: 0, change30d: 0,
            tokenPrice, tokenPrice7d, tokenPrice30d,
            mcap: mcapValue, nav, mNAV,
            vol24h: 0, vol1dPct: 0, vol7dAvg: 0, vol7dPct: 0, vol30dAvg: 0, vol30dPct: 0,
            error: true,
          };
        }

        return {
          company: company.company, ticker: company.ticker,
          category: company.category, datAsset: company.datAsset,
          holdings: company.holdings,
          price: data.quote.price, change1d: data.quote.change1d,
          change7d: data.change7d, change30d: data.change30d,
          tokenPrice, tokenPrice7d, tokenPrice30d,
          mcap: mcapValue, nav, mNAV,
          vol24h: data.volumeStats.vol24h, vol1dPct: data.volumeStats.vol1dPct,
          vol7dAvg: data.volumeStats.vol7dAvg, vol7dPct: data.volumeStats.vol7dPct,
          vol30dAvg: data.volumeStats.vol30dAvg, vol30dPct: data.volumeStats.vol30dPct,
          error: false,
        };
      });

      const result: DashboardResult = {
        stocks: stockResponse,
        crypto: cryptoResponse,
        lastUpdated: Date.now(),
      };
      const hasMcap = stockResponse.some(s => s.mcap > 0);
      if (hasMcap) setCache("dashboardData", result);
      return result;
    }),

    /** Generate and return a daily summary report */
    generateReport: publicProcedure.query(async () => {
      const reportData = await buildReportData();
      const title = generateReportTitle(reportData);
      const content = generateReportContent(reportData);
      return { title, content, data: reportData };
    }),

    /** Crypto Treasury NAV data */
    getNavData: publicProcedure.query(async () => {
      const cached = getCached<NavResult>("navData");
      if (cached) return cached;

      const symbols = Array.from(new Set(NAV_COMPANIES.map(c => c.assetSymbol)));
      const cmcData = await getCmcPrices(symbols);

      const rows = NAV_COMPANIES.map(company => {
        const cmc = cmcData.get(company.assetSymbol);
        const assetPrice = cmc?.price || 0;
        const holdingsValue = company.holdings * assetPrice;
        const totalAssets = holdingsValue + company.otherAssets;
        const nav = totalAssets - company.liabilities;

        return {
          company: company.company, ticker: company.ticker,
          primaryAsset: company.primaryAsset, assetSymbol: company.assetSymbol,
          holdings: company.holdings, assetPrice, holdingsValue,
          otherAssets: company.otherAssets, totalAssets, liabilities: company.liabilities, nav,
        };
      });

      const result: NavResult = { rows, lastUpdated: Date.now() };
      setCache("navData", result);
      return result;
    }),

    /** Generate report and send via Manus + Telegram */
    sendReport: publicProcedure.mutation(async () => {
      const reportData = await buildReportData();
      const title = generateReportTitle(reportData);
      const content = generateReportContent(reportData);

      const [manusSent, telegramSent] = await Promise.all([
        notifyOwner({ title, content }),
        sendTelegramMessage(formatTelegramReport(reportData)),
      ]);

      return {
        success: manusSent || telegramSent,
        manusSent, telegramSent,
        title, content,
        generatedAt: reportData.generatedAt,
      };
    }),

    // ─── Snapshots ───────────────────────────────────────────

    /** Save today's snapshot (called by scheduler or manually) */
    saveSnapshot: publicProcedure.mutation(async () => {
      // Get current dashboard data
      const [stockDataMap, cmcData, mcapData] = await Promise.all([
        fetchAllStockData(ALL_STOCK_TICKERS),
        getCmcPrices(ALL_CRYPTO_SYMBOLS),
        getMcapData(),
      ]);

      const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

      // Build stock snapshot rows
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

      // Build crypto snapshot rows
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

      return { date: today, stockCount, cryptoCount };
    }),

    /** Get list of available snapshot dates */
    getSnapshotDates: publicProcedure.query(async () => {
      return getSnapshotDates();
    }),

    /** Get snapshot data for a specific date */
    getSnapshot: publicProcedure
      .input(z.object({ date: z.string() }))
      .query(async ({ input }) => {
        const [stocks, crypto] = await Promise.all([
          getStockSnapshotsByDate(input.date),
          getCryptoSnapshotsByDate(input.date),
        ]);
        return { date: input.date, stocks, crypto };
      }),

    /** Get all stock snapshots for trend charts (all dates, all tickers) */
    getTrendData: publicProcedure.query(async () => {
      return getAllStockSnapshots();
    }),

    // ─── Holdings (Admin) ────────────────────────────────────────
    /** Get all company holdings */
    getHoldings: publicProcedure.query(async () => {
      return getAllHoldings();
    }),

    /** Update a company holding (admin only) */
    updateHolding: protectedProcedure
      .input(z.object({
        ticker: z.string(),
        company: z.string(),
        category: z.string(),
        datAsset: z.string(),
        holdings: z.number(),
        otherAssets: z.number().default(0),
        liabilities: z.number().default(0),
      }))
      .mutation(async ({ input, ctx }) => {
        await upsertHolding({
          ...input,
          updatedBy: ctx.user?.name || ctx.user?.email || "admin",
        });
        // Clear dashboard cache so next request picks up new holdings
        delete cache["dashboardData"];
        delete cache["navData"];
        return { success: true };
      }),

    /** Seed holdings from hardcoded config (one-time setup) */
    seedHoldings: publicProcedure.mutation(async () => {
      const companies = DAT_COMPANIES.map(c => ({
        ticker: c.ticker,
        company: c.company,
        category: c.category,
        datAsset: c.datAsset,
        holdings: c.holdings,
      }));
      const count = await seedHoldingsIfEmpty(companies);
      return { seeded: count };
    }),
  }),
});

type DashboardResult = {
  stocks: Array<{
    company: string;
    ticker: string;
    category: "Majors" | "Alts";
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
  }>;
  crypto: Array<{
    symbol: string;
    name: string;
    price: number;
    change1d: number;
    change7d: number;
    change30d: number;
    volume: number;
    marketCap: number;
    error: boolean;
  }>;
  lastUpdated: number;
};

type NavResult = {
  rows: Array<{
    company: string;
    ticker: string;
    primaryAsset: string;
    assetSymbol: string;
    holdings: number;
    assetPrice: number;
    holdingsValue: number;
    otherAssets: number;
    totalAssets: number;
    liabilities: number;
    nav: number;
  }>;
  lastUpdated: number;
};

export type AppRouter = typeof appRouter;
