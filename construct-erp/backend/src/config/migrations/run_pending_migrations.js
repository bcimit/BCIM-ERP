// Run all pending migrations (003, 004, 005)
// Usage: node src/config/migrations/run_pending_migrations.js
require('dotenv').config();
const { pool } = require('../database');

async function run() {
  const client = await pool.connect();
  try {
    console.log('═══════════════════════════════════════════');
    console.log(' Running pending migrations: 003, 004, 005');
    console.log('═══════════════════════════════════════════\n');

    // ── Migration 002: Session expiry (login_at column) ───────────────────────
    console.log('▶ Migration 002: Add login_at to refresh_tokens (idempotent)...');
    await client.query(`
      ALTER TABLE refresh_tokens
        ADD COLUMN IF NOT EXISTS login_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    `);
    console.log('  ✅ refresh_tokens.login_at — OK\n');

    // ── Migration 003: PO Register fields ─────────────────────────────────────
    console.log('▶ Migration 003: PO register fields (payment_terms, tcs_amount)...');
    await client.query(`
      ALTER TABLE purchase_orders
        ADD COLUMN IF NOT EXISTS payment_terms VARCHAR(200),
        ADD COLUMN IF NOT EXISTS tcs_amount NUMERIC(15,2) DEFAULT 0;
    `);
    console.log('  ✅ purchase_orders.payment_terms — OK');
    console.log('  ✅ purchase_orders.tcs_amount    — OK\n');

    // ── Migration 004: PO / WO cost_head ──────────────────────────────────────
    console.log('▶ Migration 004: Cost head columns (PO + WO)...');
    await client.query(`
      ALTER TABLE purchase_orders
        ADD COLUMN IF NOT EXISTS cost_head VARCHAR(100);
    `);
    await client.query(`
      ALTER TABLE work_orders
        ADD COLUMN IF NOT EXISTS cost_head VARCHAR(100);
    `);
    console.log('  ✅ purchase_orders.cost_head — OK');
    console.log('  ✅ work_orders.cost_head     — OK\n');

    // ── Migration 005: Backfill tqs_bill_updates ───────────────────────────────
    console.log('▶ Migration 005: Backfill missing tqs_bill_updates rows...');

    const before = await client.query(`
      SELECT COUNT(*) FROM tqs_bills b
      LEFT JOIN tqs_bill_updates u ON u.bill_id = b.id
      WHERE u.bill_id IS NULL AND b.is_deleted = FALSE
    `);
    const missingCount = parseInt(before.rows[0].count);
    console.log(`  Found ${missingCount} bills missing bill_updates rows`);

    if (missingCount > 0) {
      await client.query(`
        INSERT INTO tqs_bill_updates (bill_id, balance_to_pay, certified_net)
        SELECT
          b.id,
          b.total_amount,
          CASE
            WHEN b.workflow_status IN ('qs','accounts','paid','procurement')
            THEN b.total_amount
            ELSE 0
          END
        FROM tqs_bills b
        LEFT JOIN tqs_bill_updates u ON u.bill_id = b.id
        WHERE u.bill_id IS NULL
          AND b.is_deleted = FALSE
      `);
      console.log(`  ✅ Created bill_updates for ${missingCount} bills`);
    } else {
      console.log('  ✅ All bills already have bill_updates rows — skipped');
    }

    // Auto-assign PC numbers to accounts-stage bills without one
    const noPCResult = await client.query(`
      SELECT COUNT(*) FROM tqs_bill_updates u
      JOIN tqs_bills b ON b.id = u.bill_id
      WHERE b.workflow_status = 'accounts' AND u.pc_number IS NULL
    `);
    const noPCCount = parseInt(noPCResult.rows[0].count);
    console.log(`  Found ${noPCCount} accounts-stage bills without PC numbers`);

    if (noPCCount > 0) {
      const yr = new Date().getFullYear().toString();
      const baseResult = await client.query(
        `SELECT COUNT(*) FROM tqs_bill_updates WHERE pc_number LIKE $1`,
        [`PC-${yr}-%`]
      );
      const base = parseInt(baseResult.rows[0].count);

      const billsNeedingPC = await client.query(`
        SELECT u.bill_id, b.sl_number
        FROM tqs_bill_updates u
        JOIN tqs_bills b ON b.id = u.bill_id
        WHERE b.workflow_status = 'accounts' AND u.pc_number IS NULL
        ORDER BY b.sl_number
      `);

      for (let i = 0; i < billsNeedingPC.rows.length; i++) {
        const row = billsNeedingPC.rows[i];
        const pcNum = `PC-${yr}-${String(base + i + 1).padStart(4, '0')}`;
        await client.query(`
          UPDATE tqs_bill_updates
          SET pc_number = $1,
              pc_generated_at = NOW(),
              handed_over_accounts_date = COALESCE(handed_over_accounts_date, NOW()::DATE)
          WHERE bill_id = $2
        `, [pcNum, row.bill_id]);
      }
      console.log(`  ✅ Assigned ${noPCCount} PC numbers (starting PC-${yr}-${String(base + 1).padStart(4, '0')})`);
    } else {
      console.log('  ✅ All accounts-stage bills already have PC numbers — skipped');
    }

    console.log('\n═══════════════════════════════════════════');
    console.log(' ✅ All migrations completed successfully!');
    console.log('═══════════════════════════════════════════');
  } catch (err) {
    console.error('\n❌ Migration failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
