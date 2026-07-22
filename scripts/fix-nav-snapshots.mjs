/**
 * Fix historical snapshot NAVs for companies that had holdings=0 when snapshots were taken.
 * Also fix GPUS tokenPrice (stored XRP price instead of BTC after asset rebrand).
 * 
 * Issues:
 * 1. FWDI, BMNR, HSDT, GPUS, IPST: nav=0 in ALL snapshots because holdings were 0 at snapshot time
 *    - These companies were added to datConfig with holdings later, but old snapshots weren't updated
 *    - Fix: recalculate nav = holdings * tokenPrice (from crypto_snapshots for that date)
 * 2. GPUS: tokenPrice shows XRP price (~$1) instead of BTC (~$64K) because asset was rebranded XRP→BTC
 *    - Fix: replace tokenPrice with BTC price from crypto_snapshots, then recalculate NAV
 * 3. After fixing NAV, recalculate mNAV = mcap / nav
 */
import 'dotenv/config';
import mysql from 'mysql2/promise';

// Current holdings from datConfig
const HOLDINGS = {
  FWDI: { holdings: 7044079, asset: 'SOL' },
  BMNR: { holdings: 5740000, asset: 'ETH' },
  HSDT: { holdings: 2300000, asset: 'SOL' },
  GPUS: { holdings: 900, asset: 'BTC' },  // was XRP, now BTC
  IPST: { holdings: 329000000, asset: 'DATA' },
};

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) { console.error('DATABASE_URL not set'); process.exit(1); }
  const conn = await mysql.createConnection({ uri: dbUrl, ssl: { rejectUnauthorized: true } });

  try {
    // Get all crypto prices by date
    const [cryptoRows] = await conn.execute(
      'SELECT snapshotDate, symbol, price FROM crypto_snapshots ORDER BY snapshotDate'
    );
    // Build lookup: date -> symbol -> price
    const priceMap = new Map();
    for (const r of cryptoRows) {
      if (!priceMap.has(r.snapshotDate)) priceMap.set(r.snapshotDate, new Map());
      priceMap.get(r.snapshotDate).set(r.symbol, r.price);
    }
    console.log(`Loaded crypto prices for ${priceMap.size} dates`);

    let totalUpdated = 0;

    for (const [ticker, config] of Object.entries(HOLDINGS)) {
      console.log(`\nFixing ${ticker} (${config.holdings.toLocaleString()} ${config.asset}):`);

      // Get all snapshots for this ticker
      const [rows] = await conn.execute(
        'SELECT id, snapshotDate, nav, tokenPrice, mcap, mNAV FROM stock_snapshots WHERE ticker = ? ORDER BY snapshotDate',
        [ticker]
      );

      let updated = 0;
      for (const row of rows) {
        const datePrices = priceMap.get(row.snapshotDate);
        if (!datePrices) {
          console.log(`  [SKIP] ${row.snapshotDate}: No crypto prices`);
          continue;
        }

        const correctPrice = datePrices.get(config.asset) || 0;
        if (correctPrice === 0) {
          console.log(`  [SKIP] ${row.snapshotDate}: No ${config.asset} price`);
          continue;
        }

        const newNav = (config.holdings * correctPrice) / 1e6;
        const newTokenPrice = correctPrice;
        const newMNAV = newNav > 0 && row.mcap > 0 ? row.mcap / newNav : 0;

        // Only update if nav was 0 or tokenPrice was wrong (GPUS case)
        const needsUpdate = row.nav === 0 || (ticker === 'GPUS' && Math.abs(row.tokenPrice - correctPrice) > 1000);
        
        if (!needsUpdate) continue;

        await conn.execute(
          'UPDATE stock_snapshots SET nav = ?, tokenPrice = ?, mNAV = ? WHERE id = ?',
          [newNav, newTokenPrice, newMNAV, row.id]
        );
        updated++;
      }
      console.log(`  Updated ${updated}/${rows.length} snapshots`);
      totalUpdated += updated;
    }

    console.log(`\nTotal: ${totalUpdated} snapshots fixed`);
  } finally {
    await conn.end();
  }
}

main().catch(err => { console.error(err); process.exit(1); });
