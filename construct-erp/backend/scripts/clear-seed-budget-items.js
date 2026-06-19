/**
 * clear-seed-budget-items.js
 *
 * Removes the auto-generated SEED budget rows from budget_items so each
 * project's "Budget vs Actual" starts clean and only shows budgets that the
 * user actually enters.
 *
 * A "seed batch" is detected as: 2+ rows for the same project that share the
 * EXACT same created_at timestamp (a batch INSERT) AND have budget_pct set.
 * Manually entered budget lines get distinct timestamps, so they are kept.
 *
 * Connects through the app's own config/database.js, so it always targets the
 * SAME database the running server uses (local construct_erp, or the cloud DB
 * when DATABASE_URL points at Neon/Render/etc.).
 *
 * Usage (run from the backend/ directory, with the same env as the server):
 *   node scripts/clear-seed-budget-items.js            # DRY RUN (lists only, deletes nothing)
 *   node scripts/clear-seed-budget-items.js --commit   # actually delete
 */
const { pool, query } = require('../src/config/database');

const COMMIT = process.argv.includes('--commit');

(async () => {
  try {
    // Identify seed batches: per (project_id, created_at) groups with 2+ rows and budget_pct set.
    const seed = await query(`
      WITH batches AS (
        SELECT project_id, created_at, COUNT(*) AS n
        FROM budget_items
        WHERE budget_pct IS NOT NULL
        GROUP BY project_id, created_at
        HAVING COUNT(*) >= 2
      )
      SELECT bi.id, bi.project_id, p.name AS project_name,
             bi.cost_head, bi.budgeted_amount, bi.budget_pct, bi.created_at
      FROM budget_items bi
      JOIN batches b ON b.project_id = bi.project_id AND b.created_at = bi.created_at
      LEFT JOIN projects p ON p.id = bi.project_id
      ORDER BY p.name, bi.created_at, bi.cost_head
    `);

    if (!seed.rows.length) {
      console.log('No seed budget batches found. Nothing to delete.');
      return;
    }

    // Group by project for a readable summary
    const byProject = {};
    for (const r of seed.rows) {
      const key = r.project_name || r.project_id;
      (byProject[key] ||= []).push(r);
    }

    console.log(`\n${COMMIT ? 'DELETING' : 'DRY RUN — would delete'} ${seed.rows.length} seed budget rows across ${Object.keys(byProject).length} project(s):\n`);
    for (const [proj, rows] of Object.entries(byProject)) {
      const total = rows.reduce((s, r) => s + Number(r.budgeted_amount || 0), 0);
      console.log(`  ${proj}  —  ${rows.length} rows, total budget INR ${total.toLocaleString('en-IN')}`);
      for (const r of rows) {
        console.log(`      - ${r.cost_head.padEnd(38)} INR ${Number(r.budgeted_amount).toLocaleString('en-IN')}  (${r.budget_pct}%)`);
      }
    }

    if (!COMMIT) {
      console.log('\nDRY RUN complete. Re-run with --commit to actually delete these rows.');
      return;
    }

    const ids = seed.rows.map(r => r.id);
    const del = await query(`DELETE FROM budget_items WHERE id = ANY($1::uuid[])`, [ids]);
    console.log(`\nDeleted ${del.rowCount} seed budget rows. Projects now start with a clean budget.`);
  } catch (err) {
    console.error('Error:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
