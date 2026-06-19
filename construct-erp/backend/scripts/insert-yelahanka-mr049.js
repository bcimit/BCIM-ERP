#!/usr/bin/env node
/**
 * insert-yelahanka-mr049.js
 *
 * Inserts MR-049 (Drain Covers — storm water drain) for the Yelahanka Residential project.
 * Serial forced to BCIM-TQS-BLR-MR-049 (matching the physical document).
 *
 * Modes:
 *   node scripts/insert-yelahanka-mr049.js            # DRY RUN — shows what would be inserted
 *   node scripts/insert-yelahanka-mr049.js --create   # Actually inserts
 *
 * Run against production:
 *   railway run node scripts/insert-yelahanka-mr049.js --create
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');

const pool = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
    : {
        host:     process.env.DB_HOST     || 'localhost',
        port:     parseInt(process.env.DB_PORT) || 5432,
        database: process.env.DB_NAME     || 'construct_erp',
        user:     process.env.DB_USER     || 'postgres',
        password: process.env.DB_PASSWORD || '',
      }
);

const DO_CREATE = process.argv.includes('--create');

// ── MR data from physical document BCIM-TQS-BLR-MR-049 ─────────────────────
const SERIAL      = 'BCIM-TQS-BLR-MR-049';
const MR_DATE     = '2026-06-04';
const REQUIRED_BY = '2026-06-10';
const DEPARTMENT  = 'Projects';
const NARRATION   = 'Supply of Precast Drain Covers for storm water drain. Entered from physical MR BCIM-TQS-BLR-MR-049 dated 04-06-2026. Approved by Project Manager.';

// From the drawing: 6 custom-shaped covers (1 each) + 1 curved arc type (6 nos) = 12 nos total
const ITEMS = [
  { material: 'Precast Drain Cover (Type 1 — 890×865mm, pentagon)', qty: 1, unit: 'nos', remarks: 'for storm water drain' },
  { material: 'Precast Drain Cover (Type 2 — 910H, trapezoid 350×470mm)', qty: 1, unit: 'nos', remarks: 'for storm water drain' },
  { material: 'Precast Drain Cover (Type 3 — 900×900mm, irregular 490×290mm)', qty: 1, unit: 'nos', remarks: 'for storm water drain' },
  { material: 'Precast Drain Cover (Type 4 — 900×900mm, kite/diamond 365×380mm)', qty: 1, unit: 'nos', remarks: 'for storm water drain' },
  { material: 'Precast Drain Cover (Type 5 — 900×1220mm, rectangle 640×190mm)', qty: 1, unit: 'nos', remarks: 'for storm water drain' },
  { material: 'Precast Drain Cover (Type 6 — 1210×910mm, L-shape 660mm)', qty: 1, unit: 'nos', remarks: 'for storm water drain' },
  { material: 'Precast Drain Cover (Type 7 — curved arc, 6 segments, 1013–897mm width)', qty: 6, unit: 'nos', remarks: 'for storm water drain — curved section' },
];

(async () => {
  const client = await pool.connect();
  try {
    // 1. Find project — search for Yelahanka / Residential
    const projRes = await client.query(
      `SELECT id, name, project_code, company_id, mrs_prefix
       FROM projects
       WHERE is_active = true
         AND LOWER(project_code) = 'wdiry0151'
       ORDER BY name`
    );

    if (!projRes.rows.length) {
      console.error('❌ No project found matching Yelahanka/Yelkhan/Residential.');
      console.error('   Available projects:');
      const all = await client.query(`SELECT name, project_code FROM projects WHERE is_active = true ORDER BY name`);
      all.rows.forEach(p => console.error(`   - "${p.name}"  (${p.project_code})`));
      process.exit(1);
    }

    if (projRes.rows.length > 1) {
      console.log('Multiple matches — using first. All matches:');
      projRes.rows.forEach(p => console.log(`  - "${p.name}"  code=${p.project_code}  id=${p.id}`));
    }
    const proj = projRes.rows[0];
    console.log(`\nTarget project: "${proj.name}"  (${proj.id})`);
    console.log(`  project_code=${proj.project_code}  mrs_prefix=${proj.mrs_prefix || '-'}`);

    // 2. Check for duplicate serial
    const dup = await client.query(
      `SELECT id, serial_no_formatted, status FROM material_requisitions WHERE serial_no_formatted = $1`,
      [SERIAL]
    );
    if (dup.rows.length) {
      console.log(`\n⚠️  An MR with serial "${SERIAL}" already exists:`);
      dup.rows.forEach(r => console.log(`  id=${r.id}  status=${r.status}`));
      if (!DO_CREATE) console.log('(DRY RUN — would abort due to duplicate)');
      else { console.error('❌ Aborting — duplicate serial.'); process.exit(1); }
      return;
    }

    // 3. Find admin/super_admin user for raised_by
    const userRes = await client.query(
      `SELECT id, name, email FROM users
       WHERE company_id = $1 AND is_active = true AND role IN ('super_admin','admin')
       ORDER BY created_at ASC LIMIT 1`,
      [proj.company_id]
    );
    if (!userRes.rows.length) {
      console.error('❌ No admin user found for this company.');
      process.exit(1);
    }
    const raisedBy = userRes.rows[0];
    console.log(`  raised_by: ${raisedBy.name} (${raisedBy.email})`);

    console.log(`\n─── MR to insert ───`);
    console.log(`  Serial      : ${SERIAL}`);
    console.log(`  Date        : ${MR_DATE}`);
    console.log(`  Required by : ${REQUIRED_BY}`);
    console.log(`  Department  : ${DEPARTMENT}`);
    console.log(`  Items       :`);
    ITEMS.forEach((it, i) => console.log(`    ${i + 1}. ${it.material}  ${it.qty} ${it.unit}`));
    console.log(`  Total qty   : ${ITEMS.reduce((s, it) => s + it.qty, 0)} nos (12 drain covers)`);
    console.log(`  Narration   : ${NARRATION.substring(0, 80)}...`);

    if (!DO_CREATE) {
      console.log('\n(DRY RUN — nothing inserted. Re-run with --create to commit.)\n');
      return;
    }

    // 4. Insert MR header
    await client.query('BEGIN');
    const mrRes = await client.query(
      `INSERT INTO material_requisitions (
         project_id, mrs_number, serial_no_formatted, department,
         head_office_project_name, required_by, priority, remarks,
         raised_by, status, created_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending',$10) RETURNING *`,
      [
        proj.id,
        SERIAL,
        SERIAL,
        DEPARTMENT,
        proj.name,
        REQUIRED_BY,
        'medium',
        NARRATION,
        raisedBy.id,
        MR_DATE,
      ]
    );
    const mr = mrRes.rows[0];

    // 5. Insert items
    for (let i = 0; i < ITEMS.length; i++) {
      const { material, qty, unit, remarks } = ITEMS[i];
      await client.query(
        `INSERT INTO mrs_items (mrs_id, material_name, quantity, unit, sort_order, remarks)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [mr.id, material, qty, unit, i + 1, remarks]
      );
    }

    await client.query('COMMIT');
    console.log(`\n✅ Inserted MR: ${mr.serial_no_formatted}  (id: ${mr.id})`);
    console.log(`   ${ITEMS.length} line items (12 drain covers total).`);
    console.log(`   Status: pending (awaiting approval in ERP)\n`);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('\n❌ Error:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
})();
