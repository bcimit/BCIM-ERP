#!/usr/bin/env node
/**
 * approve-yelahanka-mrs-001-049.js
 *
 * Marks MR-001 through MR-049 (+ MR-044A) for WDIRY0151
 * (Residential Apartments - Yelahanka, Retaining Wall & STP) as fully approved.
 *
 * Project workflow = ['stores-approve','approve-pm','approve-md'] → final status 'approved_md'.
 * Stamps stores_approved_by/at, approved_pm_by/at, approved_md_by/at, plus the
 * legacy approved_by/approved_on columns, using each MR's own created_at as the
 * approval timestamp (same-day catch-up for historical data).
 *
 *   node scripts/approve-yelahanka-mrs-001-049.js            # DRY RUN
 *   railway run node scripts/approve-yelahanka-mrs-001-049.js --create
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

(async () => {
  const client = await pool.connect();
  try {
    const projRes = await client.query(
      `SELECT id, name, company_id FROM projects WHERE LOWER(project_code) = 'wdiry0151'`
    );
    if (!projRes.rows.length) { console.error('❌ Project WDIRY0151 not found.'); process.exit(1); }
    const proj = projRes.rows[0];
    console.log(`\nTarget project: "${proj.name}"\n`);

    const userRes = await client.query(
      `SELECT id, name FROM users
       WHERE company_id = $1 AND is_active = true AND role IN ('super_admin','admin')
       ORDER BY created_at ASC LIMIT 1`,
      [proj.company_id]
    );
    if (!userRes.rows.length) { console.error('❌ No admin user found.'); process.exit(1); }
    const approver = userRes.rows[0];
    console.log(`Approver stamp: ${approver.name}\n`);

    const mrRes = await client.query(
      `SELECT id, serial_no_formatted, status, created_at
       FROM material_requisitions
       WHERE project_id = $1
         AND serial_no_formatted ~ '^BCIM-TQS-BLR-MR-0(0[1-9]|[1-3][0-9]|4[0-9])A?$'
       ORDER BY serial_no_formatted`,
      [proj.id]
    );

    const toApprove = mrRes.rows.filter(r => r.status !== 'approved_md');
    const already   = mrRes.rows.filter(r => r.status === 'approved_md');

    console.log(`Matched ${mrRes.rows.length} MRs (MR-001 to MR-049 range).`);
    if (already.length) console.log(`Already approved_md (skip): ${already.map(r => r.serial_no_formatted).join(', ')}`);
    console.log(`To approve: ${toApprove.length}`);
    toApprove.forEach(r => console.log(`  ${r.serial_no_formatted}  (currently: ${r.status})`));

    if (!DO_CREATE) {
      console.log('\n(DRY RUN — nothing changed. Re-run with --create to commit.)\n');
      return;
    }

    await client.query('BEGIN');
    for (const mr of toApprove) {
      await client.query(
        `UPDATE material_requisitions SET
           status = 'approved_md',
           stores_approved_by = $1::text, stores_approved_at = $2,
           approved_pm_by     = $1::uuid, approved_pm_at     = $2,
           approved_md_by     = $1::uuid, approved_md_at     = $2,
           approved_by        = $1::uuid, approved_on        = $2
         WHERE id = $3`,
        [approver.id, mr.created_at, mr.id]
      );
      console.log(`  ✅ Approved ${mr.serial_no_formatted}`);
    }
    await client.query('COMMIT');
    console.log(`\n✅ Done. ${toApprove.length} MR(s) set to approved_md.\n`);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('❌ Error — rolled back:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
})();
