/**
 * Fix snapshots with mcap=0 (weekend/holiday snapshots where Yahoo Finance didn't return MCAP).
 * Strategy: For each date with mcap=0, copy MCAP from the nearest prior date that has MCAP data.
 * Then recalculate mNAV = mcap / nav.
 */
import 'dotenv/config';
import mysql from 'mysql2/promise';

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) { console.error('DATABASE_URL not set'); process.exit(1); }

  const connection = await mysql.createConnection({ uri: dbUrl, ssl: { rejectUnauthorized: true } });

  try {
    // Find all dates with mcap=0 for all rows
    const [zeroDates] = await connection.execute(
      `SELECT snapshotDate FROM stock_snapshots GROUP BY snapshotDate HAVING SUM(mcap) = 0 ORDER BY snapshotDate`
    );
    console.log(`Found ${zeroDates.length} dates with mcap=0`);

    // Get all dates that DO have mcap data
    const [goodDates] = await connection.execute(
      `SELECT DISTINCT snapshotDate FROM stock_snapshots WHERE mcap > 0 ORDER BY snapshotDate`
    );
    const goodDateList = goodDates.map(r => r.snapshotDate);
    console.log(`Found ${goodDateList.length} dates with valid MCAP data`);

    for (const { snapshotDate } of zeroDates) {
      // Find nearest prior date with MCAP
      const priorDates = goodDateList.filter(d => d < snapshotDate);
      if (priorDates.length === 0) {
        // Try next date instead
        const nextDates = goodDateList.filter(d => d > snapshotDate);
        if (nextDates.length === 0) {
          console.log(`  [SKIP] ${snapshotDate}: No reference date available`);
          continue;
        }
        var refDate = nextDates[0];
      } else {
        var refDate = priorDates[priorDates.length - 1]; // most recent prior
      }

      console.log(`  [FIX] ${snapshotDate}: Using MCAP from ${refDate}`);

      // Get MCAP values from reference date
      const [refRows] = await connection.execute(
        `SELECT ticker, mcap FROM stock_snapshots WHERE snapshotDate = ? AND mcap > 0`,
        [refDate]
      );
      const mcapMap = new Map(refRows.map(r => [r.ticker, r.mcap]));

      // Get current rows for this date
      const [currentRows] = await connection.execute(
        `SELECT id, ticker, nav, mcap, mNAV FROM stock_snapshots WHERE snapshotDate = ?`,
        [snapshotDate]
      );

      let updated = 0;
      for (const row of currentRows) {
        const refMcap = mcapMap.get(row.ticker);
        if (!refMcap) continue;

        const newMNAV = row.nav > 0 ? refMcap / row.nav : 0;
        await connection.execute(
          `UPDATE stock_snapshots SET mcap = ?, mNAV = ? WHERE id = ?`,
          [refMcap, newMNAV, row.id]
        );
        updated++;
      }
      console.log(`    Updated ${updated} rows`);
    }

    console.log('\nDone!');
  } finally {
    await connection.end();
  }
}

main().catch(err => { console.error(err); process.exit(1); });
