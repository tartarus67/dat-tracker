/**
 * Fix ORBS historical snapshots to include both WLD and ETH holdings in NAV.
 * 
 * Current state: ORBS snapshots only have WLD NAV (283,452,700 WLD × WLD price)
 * Correct state: ORBS NAV = (283,452,700 × WLD price) + (16,278 × ETH price)
 * 
 * Strategy:
 * 1. Get all ORBS stock snapshots (they have tokenPrice = WLD price for that date)
 * 2. Get ETH prices from crypto_snapshots for the same dates
 * 3. Recalculate NAV = (283452700 × WLD_price) + (16278 × ETH_price)
 * 4. Recalculate mNAV = mcap / nav
 * 5. Update the stock_snapshots rows
 */
import 'dotenv/config';
import mysql from 'mysql2/promise';

const WLD_HOLDINGS = 283452700;
const ETH_HOLDINGS = 16278;

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL not set');
    process.exit(1);
  }

  const connection = await mysql.createConnection({
    uri: dbUrl,
    ssl: { rejectUnauthorized: true },
  });

  try {
    // Get all ORBS snapshots
    const [orbsRows] = await connection.execute(
      'SELECT id, snapshotDate, nav, tokenPrice, mcap, mNAV, datAsset FROM stock_snapshots WHERE ticker = ? ORDER BY snapshotDate',
      ['ORBS']
    );
    console.log(`Found ${orbsRows.length} ORBS snapshots`);

    // Get all ETH prices from crypto_snapshots
    const [ethRows] = await connection.execute(
      'SELECT snapshotDate, price FROM crypto_snapshots WHERE symbol = ? ORDER BY snapshotDate',
      ['ETH']
    );
    const ethPriceMap = new Map();
    for (const row of ethRows) {
      ethPriceMap.set(row.snapshotDate, row.price);
    }
    console.log(`Found ${ethRows.length} ETH price snapshots`);

    // Also get WLD prices from crypto_snapshots (more reliable than tokenPrice which might be stale)
    const [wldRows] = await connection.execute(
      'SELECT snapshotDate, price FROM crypto_snapshots WHERE symbol = ? ORDER BY snapshotDate',
      ['WLD']
    );
    const wldPriceMap = new Map();
    for (const row of wldRows) {
      wldPriceMap.set(row.snapshotDate, row.price);
    }
    console.log(`Found ${wldRows.length} WLD price snapshots`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const orbs of orbsRows) {
      const date = orbs.snapshotDate;
      const wldPrice = wldPriceMap.get(date) || orbs.tokenPrice; // fallback to stored tokenPrice
      const ethPrice = ethPriceMap.get(date);

      if (!ethPrice) {
        // No ETH price for this date — skip but log
        console.log(`  [SKIP] ${date}: No ETH price available`);
        skippedCount++;
        continue;
      }

      // Calculate correct NAV (in millions)
      const wldNav = WLD_HOLDINGS * wldPrice;
      const ethNav = ETH_HOLDINGS * ethPrice;
      const totalNavRaw = wldNav + ethNav;
      const newNav = totalNavRaw / 1e6;

      // Recalculate mNAV
      const mcap = orbs.mcap;
      const newMNAV = newNav > 0 && mcap > 0 ? mcap / newNav : 0;

      const oldNav = orbs.nav;
      const diff = newNav - oldNav;

      if (Math.abs(diff) < 0.01) {
        // Already correct (within rounding)
        continue;
      }

      console.log(`  [UPDATE] ${date}: NAV ${oldNav.toFixed(2)}M → ${newNav.toFixed(2)}M (+${diff.toFixed(2)}M ETH contribution), mNAV ${orbs.mNAV.toFixed(3)} → ${newMNAV.toFixed(3)}`);

      await connection.execute(
        'UPDATE stock_snapshots SET nav = ?, mNAV = ? WHERE id = ?',
        [newNav, newMNAV, orbs.id]
      );
      updatedCount++;
    }

    console.log(`\nDone: ${updatedCount} snapshots updated, ${skippedCount} skipped (no ETH price)`);
  } finally {
    await connection.end();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
