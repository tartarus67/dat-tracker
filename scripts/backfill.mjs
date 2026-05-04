/**
 * Backfill script: saves snapshots for missing dates (April 17 – May 3, 2026)
 * using current live data. Run with: node scripts/backfill.mjs
 * 
 * Note: This uses today's prices for all backfilled dates since historical
 * intraday data is not available. The dates will show in the snapshot list
 * but values reflect the time of backfill, not the actual historical values.
 */
import 'dotenv/config';

// We'll call the local tRPC endpoint to reuse existing logic
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Dates to backfill (April 17 – May 3, 2026)
const START = new Date('2026-04-17');
const END = new Date('2026-05-03');

const dates = [];
for (let d = new Date(START); d <= END; d.setDate(d.getDate() + 1)) {
  dates.push(d.toISOString().split('T')[0]);
}

console.log(`Backfilling ${dates.length} dates: ${dates[0]} to ${dates[dates.length - 1]}`);

// We'll directly use the DB and data fetchers
const { fetchAllStockData } = await import('../server/datData.ts');
const { getCmcPrices } = await import('../server/cmcData.ts');
const { getMcapData } = await import('../server/mcapData.ts');
const { saveStockSnapshots, saveCryptoSnapshots, hasSnapshotForDate } = await import('../server/db.ts');

// Need to dynamically import the config
const { ALL_STOCK_TICKERS, ALL_CRYPTO_SYMBOLS, DAT_COMPANIES, CRYPTO_ASSETS } = await import('../shared/datConfig.ts');

// Fetch current data once
console.log('Fetching current market data...');
const [stockDataMap, cmcData, mcapData] = await Promise.all([
  fetchAllStockData(ALL_STOCK_TICKERS),
  getCmcPrices(ALL_CRYPTO_SYMBOLS),
  getMcapData(),
]);

const stockCount = Array.from(stockDataMap.values()).filter(v => v !== null).length;
const cryptoCount = cmcData.size;
console.log(`Got ${stockCount} stocks, ${cryptoCount} crypto prices`);

// Backfill each date
for (const dateStr of dates) {
  const exists = await hasSnapshotForDate(dateStr);
  if (exists) {
    console.log(`  ${dateStr}: already exists, skipping`);
    continue;
  }

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
      snapshotDate: dateStr, ticker: company.ticker, company: company.company,
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

  const cryptoRows = CRYPTO_ASSETS.map(asset => {
    const cmc = cmcData.get(asset.symbol);
    return {
      snapshotDate: dateStr, symbol: asset.symbol, name: cmc?.name || asset.name,
      price: cmc?.price || 0, change1d: cmc?.change24h || 0,
      change7d: cmc?.change7d || 0, change30d: cmc?.change30d || 0,
      volume: cmc?.volume24h || 0, marketCap: cmc?.marketCap || 0,
    };
  });

  const [sc, cc] = await Promise.all([
    saveStockSnapshots(stockRows),
    saveCryptoSnapshots(cryptoRows),
  ]);

  console.log(`  ${dateStr}: saved ${sc} stocks, ${cc} crypto`);
}

console.log('Backfill complete!');
process.exit(0);
