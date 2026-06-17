#!/usr/bin/env node
/**
 * renumber-yelahanka-mrs.js
 *
 * Renames the two existing Yelahanka MRs to the correct legacy serials:
 *   BCIM-DQS-BLR-MR-001  (cement)        →  BCIM-DQS-BLR-MR053
 *   BCIM-DQS-BLR-MR-002  (mobile Toilets) →  BCIM-DQS-BLR-MR054
 *
 * Updates both serial_no_formatted and mrs_number (they mirror each other).
 *
 * Modes:
 *   node scripts/renumber-yelahanka-mrs.js            # DRY RUN
 *   node scripts/renumber-yelahanka-mrs.js --create   # Apply
 *
 * Run against production:
 *   railway run node scripts/renumber-yelahanka-mrs.js --create
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');

const pool = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
    : {
        host:     process.env.DB_HOST     || 'localhost',
        port:     parseInt(process.env.DB_PORT) || 5432,
        database: process.env.DB_NAME     || 'constructerp',
        user:     process.env.DB_USER     || 'postgres',
        password: process.env.DB_PASSWORD || '',
        ssl:      false,
      }
);

const DO_CREATE = process.argv.includes('--create');

// old serial → new serial
const RENAMES = [
  { from: 'BCIM-DQS-BLR-MR-001', to: 'BCIM-DQS-BLR-MR053' },
  { from: 'BCIM-DQS-BLR-MR-002', to: 'BCIM-DQS-BLR-MR054' },
];

(async () => {
  const client = await pool.connect();
  try {
    // 1. Show current state of the targets
    console.log('\n=== Current state ===');
    for (const r of RENAMES) {
      const cur = await client.query(
        `SELECT mr.id, mr.serial_no_formatted, mr.mrs_number, mr.status, p.name AS project
         FROM material_requisitions mr JOIN projects p ON p.id = mr.project_id
         WHERE mr.serial_no_formatted = $1`,
        [r.from]
      );
      if (!cur.rows.length) {
        console.log(`  ⚠️  ${r.from} — NOT FOUND`);
      } else {
        cur.rows.forEach(row =>
          console.log(`  ${row.serial_no_formatted}  (mrs_number=${row.mrs_number})  [${row.status}]  ${row.project}  → will become ${r.to}`)
        );
        if (cur.rows.length > 1) console.log(`     ⚠️  ${cur.rows.length} rows share this serial — all would be renamed!`);
      }
      // Conflict check on target
      const clash = await client.query(
        `SELECT id, status FROM material_requisitions WHERE serial_no_formatted = $1 OR mrs_number = $1`,
        [r.to]
      );
      if (clash.rows.length) console.log(`     ❌ Target ${r.to} ALREADY EXISTS (${clash.rows.length} row) — would violate unique constraint`);
    }

    if (!DO_CREATE) {
      console.log('\n(DRY RUN — nothing changed. Re-run with --create to apply.)\n');
      return;
    }

    // 2. Apply renames in a transaction
    await client.query('BEGIN');
    for (const r of RENAMES) {
      const upd = await client.query(
        `UPDATE material_requisitions
         SET serial_no_formatted = $2, mrs_number = $2, updated_at = NOW()
         WHERE serial_no_formatted = $1
         RETURNING id, serial_no_formatted`,
        [r.from, r.to]
      );
      if (upd.rows.length) {
        upd.rows.forEach(row => console.log(`  ✅ ${r.from} → ${row.serial_no_formatted}  (id ${row.id})`));
      } else {
        console.log(`  ⚠️  ${r.from} — no row updated (already renamed or missing)`);
      }
    }
    await client.query('COMMIT');
    console.log('\n✅ Done.\n');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('\n❌ Error:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
})();
