import { COOKIE_NAME } from "@shared/const";
import { DAT_COMPANIES, CRYPTO_ASSETS, ALL_STOCK_TICKERS, ALL_CRYPTO_SYMBOLS } from "@shared/datConfig";
import { NAV_COMPANIES } from "@shared/navConfig";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { fetchAllStockData } from "./datData";
import { getMcapData } from "./mcapData";
import { getCmcPrices } from "./cmcData";
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

      const [stockDataMap, cmcData, mcapData] = await Promise.all([
        fetchAllStockData(ALL_STOCK_TICKERS),
        getCmcPrices(ALL_CRYPTO_SYMBOLS),
        getMcapData(),
      ]);

      // Build crypto response from CMC data
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

      // Build stock response with all parameters
      const stockResponse = DAT_COMPANIES.map(company => {
        const data = stockDataMap.get(company.ticker);
        const mcap = mcapData[company.ticker];
        const cmcToken = cmcData.get(company.datAsset);

        // Token price from CMC
        const tokenPrice = cmcToken?.price || 0;
        const tokenPrice7d = cmcToken?.change7d || 0;
        const tokenPrice30d = cmcToken?.change30d || 0;

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
            price: 0, change1d: 0, change7d: 0, change30d: 0,
            tokenPrice, tokenPrice7d, tokenPrice30d,
            mcap: mcapValue, nav, mNAV,
            vol24h: 0, vol1dPct: 0, vol7dAvg: 0, vol7dPct: 0, vol30dAvg: 0, vol30dPct: 0,
            error: true,
          };
        }

        return {
          company: company.company,
          ticker: company.ticker,
          category: company.category,
          datAsset: company.datAsset,
          holdings: company.holdings,
          price: data.quote.price,
          change1d: data.quote.change1d,
          change7d: data.change7d,
          change30d: data.change30d,
          tokenPrice, tokenPrice7d, tokenPrice30d,
          mcap: mcapValue, nav, mNAV,
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

    /** Crypto Treasury NAV data */
    getNavData: publicProcedure.query(async () => {
      const cached = getCached<NavResult>("navData");
      if (cached) return cached;

      // Get all unique symbols needed
      const symbols = Array.from(new Set(NAV_COMPANIES.map(c => c.assetSymbol)));
      const cmcData = await getCmcPrices(symbols);

      const rows = NAV_COMPANIES.map(company => {
        const cmc = cmcData.get(company.assetSymbol);
        const assetPrice = cmc?.price || 0;
        const holdingsValue = company.holdings * assetPrice;
        const totalAssets = holdingsValue + company.otherAssets;
        const nav = totalAssets - company.liabilities;

        return {
          company: company.company,
          ticker: company.ticker,
          primaryAsset: company.primaryAsset,
          assetSymbol: company.assetSymbol,
          holdings: company.holdings,
          assetPrice,
          holdingsValue,
          otherAssets: company.otherAssets,
          totalAssets,
          liabilities: company.liabilities,
          nav,
        };
      });

      const result: NavResult = { rows, lastUpdated: Date.now() };
      setCache("navData", result);
      return result;
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
