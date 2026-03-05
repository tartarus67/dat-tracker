import { COOKIE_NAME } from "@shared/const";
import { DAT_COMPANIES, CRYPTO_ASSETS, ALL_STOCK_TICKERS, ALL_CRYPTO_YAHOO_SYMBOLS } from "@shared/datConfig";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { fetchAllStockData, fetchAllCryptoData } from "./datData";
import { getMcapData } from "./mcapData";
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
    /** Fetch both stock and crypto data in one call */
    getDashboardData: publicProcedure.query(async () => {
      const cached = getCached<DashboardResult>("dashboardData");
      if (cached) return cached;

      const [stockDataMap, cryptoDataMap, mcapData] = await Promise.all([
        fetchAllStockData(ALL_STOCK_TICKERS),
        fetchAllCryptoData(ALL_CRYPTO_YAHOO_SYMBOLS),
        getMcapData(),
      ]);

      // Build crypto lookup: asset symbol -> crypto data
      const cryptoBySymbol = new Map<string, {
        price: number;
        change7d: number;
        change30d: number;
      }>();

      const cryptoResponse = CRYPTO_ASSETS.map(asset => {
        const data = cryptoDataMap.get(asset.yahooSymbol);
        const entry = {
          symbol: asset.symbol,
          name: asset.name,
          yahooSymbol: asset.yahooSymbol,
          price: data?.quote.price || 0,
          change1d: data?.quote.change1d || 0,
          change7d: data?.change7d || 0,
          change30d: data?.change30d || 0,
          volume: data?.quote.volume || 0,
          marketCap: data?.quote.marketCap || 0,
          error: !data,
        };
        cryptoBySymbol.set(asset.symbol, {
          price: entry.price,
          change7d: entry.change7d,
          change30d: entry.change30d,
        });
        return entry;
      });

      // Build stock response with all parameters
      const stockResponse = DAT_COMPANIES.map(company => {
        const data = stockDataMap.get(company.ticker);
        const mcap = mcapData[company.ticker];
        const cryptoData = cryptoBySymbol.get(company.datAsset);

        // Token price data
        const tokenPrice = cryptoData?.price || 0;
        const tokenPrice7d = cryptoData?.change7d || 0;
        const tokenPrice30d = cryptoData?.change30d || 0;

        // NAV = holdings × token price (in $M)
        const navRaw = company.holdings > 0 && tokenPrice > 0
          ? company.holdings * tokenPrice
          : 0;
        const nav = navRaw / 1e6; // Convert to $M

        // MCAP from yfinance (in $M)
        const mcapValue = (mcap?.marketCap || 0) / 1e6;

        // mNAV = MCAP / NAV (premium/discount multiplier)
        const mNAV = nav > 0 && mcapValue > 0 ? mcapValue / nav : 0;

        if (!data) {
          return {
            company: company.company,
            ticker: company.ticker,
            category: company.category,
            datAsset: company.datAsset,
            holdings: company.holdings,
            // Stock price
            price: 0,
            change1d: 0,
            change7d: 0,
            change30d: 0,
            // Token price
            tokenPrice,
            tokenPrice7d,
            tokenPrice30d,
            // Valuation
            mcap: mcapValue,
            nav,
            mNAV,
            // Volume
            vol24h: 0,
            vol1dPct: 0,
            vol7dAvg: 0,
            vol7dPct: 0,
            vol30dAvg: 0,
            vol30dPct: 0,
            error: true,
          };
        }

        return {
          company: company.company,
          ticker: company.ticker,
          category: company.category,
          datAsset: company.datAsset,
          holdings: company.holdings,
          // Stock price
          price: data.quote.price,
          change1d: data.quote.change1d,
          change7d: data.change7d,
          change30d: data.change30d,
          // Token price
          tokenPrice,
          tokenPrice7d,
          tokenPrice30d,
          // Valuation
          mcap: mcapValue,
          nav,
          mNAV,
          // Volume
          vol24h: data.volumeStats.vol24h,
          vol1dPct: data.volumeStats.vol1dPct,
          vol7dAvg: data.volumeStats.vol7dAvg,
          vol7dPct: data.volumeStats.vol7dPct,
          vol30dAvg: data.volumeStats.vol30dAvg,
          vol30dPct: data.volumeStats.vol30dPct,
          error: false,
        };
      });

      const result: DashboardResult = {
        stocks: stockResponse,
        crypto: cryptoResponse,
        lastUpdated: Date.now(),
      };
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
    yahooSymbol: string;
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

export type AppRouter = typeof appRouter;
