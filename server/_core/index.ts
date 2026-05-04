import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { initScheduler } from "../scheduler";
import { sdk } from "./sdk";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);

  // Scheduled task endpoint: daily snapshot
  // Called by Manus scheduled task with auto-injected session cookie
  app.post("/api/scheduled/snapshot", async (req, res) => {
    try {
      // Authenticate the request (scheduled task provides a valid session cookie)
      const user = await sdk.authenticateRequest(req);
      if (!user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      // Import snapshot logic
      const { fetchAllStockData } = await import("../datData");
      const { getCmcPrices } = await import("../cmcData");
      const { getMcapData } = await import("../mcapData");
      const { saveStockSnapshots, saveCryptoSnapshots, hasSnapshotForDate } = await import("../db");
      const { ALL_STOCK_TICKERS, ALL_CRYPTO_SYMBOLS, DAT_COMPANIES, CRYPTO_ASSETS } = await import("@shared/datConfig");

      const today = new Date().toISOString().split("T")[0];

      // Check if snapshot already exists
      const exists = await hasSnapshotForDate(today);
      if (exists) {
        res.json({ success: true, message: `Snapshot for ${today} already exists`, date: today, skipped: true });
        return;
      }

      // Fetch all data
      const [stockDataMap, cmcData, mcapData] = await Promise.all([
        fetchAllStockData(ALL_STOCK_TICKERS),
        getCmcPrices(ALL_CRYPTO_SYMBOLS),
        getMcapData(),
      ]);

      // Build stock rows
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
          snapshotDate: today, ticker: company.ticker, company: company.company,
          category: company.category, datAsset: company.datAsset,
          price: data?.quote.price || 0, change1d: data?.quote.change1d || 0,
          change7d: data?.change7d || 0, change30d: data?.change30d || 0,
          tokenPrice, tokenPrice7d: cmcToken?.change7d || 0, tokenPrice30d: cmcToken?.change30d || 0,
          mcap: mcapValue, nav, mNAV,
          vol24h: data?.volumeStats.vol24h || 0, vol1dPct: data?.volumeStats.vol1dPct || 0,
          vol7dAvg: data?.volumeStats.vol7dAvg || 0, vol7dPct: data?.volumeStats.vol7dPct || 0,
          vol30dAvg: data?.volumeStats.vol30dAvg || 0, vol30dPct: data?.volumeStats.vol30dPct || 0,
        };
      });

      // Build crypto rows
      const cryptoRows = CRYPTO_ASSETS.map(asset => {
        const cmc = cmcData.get(asset.symbol);
        return {
          snapshotDate: today, symbol: asset.symbol, name: cmc?.name || asset.name,
          price: cmc?.price || 0, change1d: cmc?.change24h || 0,
          change7d: cmc?.change7d || 0, change30d: cmc?.change30d || 0,
          volume: cmc?.volume24h || 0, marketCap: cmc?.marketCap || 0,
        };
      });

      const [stockCount, cryptoCount] = await Promise.all([
        saveStockSnapshots(stockRows),
        saveCryptoSnapshots(cryptoRows),
      ]);

      console.log(`[Scheduled] Snapshot saved: ${stockCount} stocks, ${cryptoCount} crypto for ${today}`);
      res.json({ success: true, date: today, stockCount, cryptoCount });
    } catch (err: any) {
      console.error("[Scheduled] Snapshot failed:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    // Start scheduled tasks after server is listening
    initScheduler();
  });
}

startServer().catch(console.error);
