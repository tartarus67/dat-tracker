/**
 * Fix individual ticker mcap=0 gaps.
 * For each ticker that has mcap=0 on some dates but mcap>0 on others,
 * propagate the last known mcap forward to fill gaps.
 * Then recalculate mNAV.
 */
import 'dotenv/config';
import mysql from 'mysql2/promise';

async function main() {
  const conn = await mysql.createConnection({ uri: process.env.DATABASE_URL, ssl: { rejectUnauthorized: true } });

  try {
    // Find tickers that have SOME dates with mcap>0 and SOME with mcap=0
    const [tickers] = await conn.execute(`
      SELECT ticker, 
        SUM(CASE WHEN mcap > 0 THEN 1 ELSE 0 END) as has_mcap,
        SUM(CASE WHEN mcap = 0 THEN 1 ELSE 0 END) as no_mcap
      FROM stock_snapshots 
      WHERE price > 0
      GROUP BY ticker
      HAVING no_mcap > 0 AND has_mcap > 0
      ORDER BY ticker
    `);

    console.log(`Found ${tickers.length} tickers with mcap gaps:`);
    for (const t of tickers) {
      console.log(`  ${t.ticker}: ${t.has_mcap} good, ${t.no_mcap} missing`);
    }
    console.log();

    let totalFixed = 0;

    for (const { ticker } of tickers) {
      // Get all snapshots for this ticker ordered by date
      const [rows] = await conn.execute(
        'SELECT id, snapshotDate, mcap, nav, mNAV FROM stock_snapshots WHERE ticker = ? ORDER BY snapshotDate',
        [ticker]
      );

      let lastGoodMcap = 0;
      let fixed = 0;

      for (const row of rows) {
        if (row.mcap > 0) {
          lastGoodMcap = row.mcap;
        } else if (lastGoodMcap > 0 && row.mcap === 0) {
          // Fill with last known mcap
          const newMNAV = row.nav > 0 ? lastGoodMcap / row.nav : 0;
          await conn.execute(
            'UPDATE stock_snapshots SET mcap = ?, mNAV = ? WHERE id = ?',
            [lastGoodMcap, newMNAV, row.id]
          );
          fixed++;
        }
      }

      if (fixed > 0) {
        console.log(`  ${ticker}: fixed ${fixed} gaps`);
        totalFixed += fixed;
      }
    }

    console.log(`\nTotal: ${totalFixed} snapshots fixed`);
  } finally {
    await conn.end();
  }
}

main().catch(err => { console.error(err); process.exit(1); });
