require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
(async () => {
  const c = await pool.connect();
  // Load MRs ordered by date — show first 10
  const mrs = await c.query(`
    SELECT mr.id, mr.serial_no_formatted, mr.created_at::date AS mr_date
    FROM material_requisitions mr
    JOIN projects p ON p.id = mr.project_id
    WHERE LOWER(p.project_code)='wdiry0151'
    ORDER BY mr.created_at ASC LIMIT 15
  `);
  for (const mr of mrs.rows) {
    const items = await c.query(`SELECT sort_order, material_name, quantity, unit FROM mrs_items WHERE mrs_id=$1 ORDER BY sort_order`, [mr.id]);
    console.log('=== ' + mr.serial_no_formatted + ' | ' + mr.mr_date + ' ===');
    items.rows.forEach(i => console.log('  ' + i.sort_order + '. ' + i.material_name + ' | ' + i.quantity + ' ' + i.unit));
    console.log();
  }
  c.release(); await pool.end();
})();
