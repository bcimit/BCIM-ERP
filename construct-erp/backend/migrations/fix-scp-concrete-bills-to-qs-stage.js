// migrations/fix-scp-concrete-bills-to-qs-stage.js
// One-time fix: move SCP Concrete bills to QS stage in tqs_bills
// Run: node migrations/fix-scp-concrete-bills-to-qs-stage.js
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     process.env.DB_PORT     || 5432,
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Bill numbers (inv_number) to move to QS stage
const BILL_NUMBERS = [
  '02196/2025-2026',
  '02198/2025-2026',
  '02199/2025-2026',
  '02210/2025-2026',
  '02204/2025-2026',
  '02243/2025-2026',
  '02273/2025-2026',
  '02272/2025-2026',
  '02074/2025-2026',
  '02072/2025-2026',
  '02438/2025-2026',
  '02508/2025-2026',
  '02509/2025-2026',
  '02510/2025-2026',
  '02588/2025-2026',
  '02760/2025-2026',
  '02887/2025-2026',
  '03041/2025-2026',
  '03068/2025-2026',
  '03102/2025-2026',
  '03244/2025-2026',
  '03620/2025-2026',
  '03727/2025-2026',
  '04105/2025-2026',
  '04135/2025-2026',
  '04139/2025-2026',
  '04173/2025-2026',
  '04177/2025-2026',
  '04184/2025-2026',
  'IN/00350/26-27',
  'IN/00360/26-27',
  'IN/00361/26-27',
  'IN/00363/26-27',
  'IN/00367/26-27',
  'IN/00411/26-27',
  'IN/00548/26-27',
  'IN/00700/26-27',
  'IN/00819/26-27',
  'IN/00826/26-27',
];

async function run() {
  const client = await pool.connect();
  try {
    // First: check which bills exist
    const { rows: found } = await client.query(
      `SELECT id, sl_number, inv_number, vendor_name, workflow_status
       FROM tqs_bills
       WHERE inv_number = ANY($1)
       ORDER BY inv_number`,
      [BILL_NUMBERS]
    );

    console.log(`\nFound ${found.length} of ${BILL_NUMBERS.length} bills:\n`);
    found.forEach(r => {
      console.log(`  SL ${r.sl_number || '?'} | ${r.inv_number} | ${r.vendor_name || '?'} | current: ${r.workflow_status}`);
    });

    const notFound = BILL_NUMBERS.filter(n => !found.some(r => r.inv_number === n));
    if (notFound.length) {
      console.log(`\n⚠  Not found in DB (${notFound.length}):`);
      notFound.forEach(n => console.log(`   ${n}`));
    }

    if (!found.length) {
      console.log('\nNo matching bills found — check that inv_number column stores these values.');
      return;
    }

    // Update found bills to QS stage
    const { rows: updated } = await client.query(
      `UPDATE tqs_bills
       SET workflow_status = 'qs', updated_at = NOW()
       WHERE inv_number = ANY($1)
       RETURNING sl_number, inv_number, vendor_name, workflow_status`,
      [BILL_NUMBERS]
    );

    console.log(`\n✓ Updated ${updated.length} bill(s) → workflow_status = 'qs'\n`);
    updated.forEach(r => {
      console.log(`  ✓ SL ${r.sl_number || '?'} | ${r.inv_number} | ${r.vendor_name || '?'}`);
    });

  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
