import { COOKIE_NAME } from "@shared/const";
import { DAT_COMPANIES, CRYPTO_ASSETS, ALL_STOCK_TICKERS, ALL_CRYPTO_YAHOO_SYMBOLS } from "@shared/datConfig";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { fetchAllStockData, fetchAllCryptoData } from "./datData";
import { buildReportData, generateReportTitle, generateReportContent } from "./reportGenerator";
import { notifyOwner } from "./_core/notification";

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
    /** Fetch all DAT company stock data with price/volume/changes */
    getStockData: publicProcedure.query(async () => {
      const cached = getCached<Awaited<ReturnType<typeof buildStockResponse>>>("stockData");
      if (cached) return cached;

      const result = await buildStockResponse();
      setCache("stockData", result);
      return result;
    }),

    /** Fetch all underlying crypto asset data */
    getCryptoData: publicProcedure.query(async () => {
      const cached = getCached<Awaited<ReturnType<typeof buildCryptoResponse>>>("cryptoData");
      if (cached) return cached;

      const result = await buildCryptoResponse();
      setCache("cryptoData", result);
      return result;
    }),

    /** Fetch both stock and crypto data in one call */
    getDashboardData: publicProcedure.query(async () => {
      const cached = getCached<{ stocks: Awaited<ReturnType<typeof buildStockResponse>>; crypto: Awaited<ReturnType<typeof buildCryptoResponse>>; lastUpdated: number }>("dashboardData");
      if (cached) return cached;

      const [stocks, crypto] = await Promise.all([
        buildStockResponse(),
        buildCryptoResponse(),
      ]);

      const result = { stocks, crypto, lastUpdated: Date.now() };
      setCache("dashboardData", result);
      return result;
    }),

    /** Generate and return a daily summary report */
    generateReport: publicProcedure.query(async () => {
      const reportData = await buildReportData();
      const title = generateReportTitle(reportData);
      const content = generateReportContent(reportData);
      return { title, content, data: reportData };
    }),

    /** Generate report and send via Manus notification */
    sendReport: publicProcedure.mutation(async () => {
      const reportData = await buildReportData();
      const title = generateReportTitle(reportData);
      const content = generateReportContent(reportData);

      const sent = await notifyOwner({ title, content });

      return {
        success: sent,
        title,
        content,
        generatedAt: reportData.generatedAt,
      };
    }),
  }),
});

async function buildStockResponse() {
  const stockDataMap = await fetchAllStockData(ALL_STOCK_TICKERS);

  return DAT_COMPANIES.map(company => {
    const data = stockDataMap.get(company.ticker);
    if (!data) {
      return {
        ...company,
        price: 0,
        previousClose: 0,
        change1d: 0,
        change7d: 0,
        change30d: 0,
        volume: 0,
        marketCap: 0,
        dayHigh: 0,
        dayLow: 0,
        fiftyTwoWeekHigh: 0,
        fiftyTwoWeekLow: 0,
        fullName: company.company,
        error: true,
      };
    }
    return {
      ...company,
      price: data.quote.price,
      previousClose: data.quote.previousClose,
      change1d: data.quote.change1d,
      change7d: data.change7d,
      change30d: data.change30d,
      volume: data.quote.volume,
      marketCap: data.quote.marketCap,
      dayHigh: data.quote.dayHigh,
      dayLow: data.quote.dayLow,
      fiftyTwoWeekHigh: data.quote.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: data.quote.fiftyTwoWeekLow,
      fullName: data.quote.name,
      error: false,
    };
  });
}

async function buildCryptoResponse() {
  const cryptoDataMap = await fetchAllCryptoData(ALL_CRYPTO_YAHOO_SYMBOLS);

  return CRYPTO_ASSETS.map(asset => {
    const data = cryptoDataMap.get(asset.yahooSymbol);
    if (!data) {
      return {
        ...asset,
        price: 0,
        change1d: 0,
        change7d: 0,
        change30d: 0,
        volume: 0,
        marketCap: 0,
        fullName: asset.name,
        error: true,
      };
    }
    return {
      ...asset,
      price: data.quote.price,
      change1d: data.quote.change1d,
      change7d: data.change7d,
      change30d: data.change30d,
      volume: data.quote.volume,
      marketCap: data.quote.marketCap,
      fullName: data.quote.name,
      error: false,
    };
  });
}

export type AppRouter = typeof appRouter;
