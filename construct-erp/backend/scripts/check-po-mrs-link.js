require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
(async () => {
  const c = await pool.connect();

  const cols = await c.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'purchase_orders'
    AND column_name IN ('id','po_number','serial_no_formatted','mrs_id','mrs_ids','project_id','status','po_date')
    ORDER BY ordinal_position
  `);
  console.log('--- purchase_orders key columns ---');
  cols.rows.forEach(r => console.log(' ', r.column_name, ':', r.data_type));

  const itemCols = await c.query(`
    SELECT column_name, data_type FROM information_schema.columns
    WHERE table_name = 'po_items'
    AND column_name IN ('id','po_id','material_name','quantity','rate','mrs_item_id','mrs_id')
    ORDER BY ordinal_position
  `);
  console.log('\n--- po_items key columns ---');
  itemCols.rows.forEach(r => console.log(' ', r.column_name, ':', r.data_type));

  const proj = await c.query(`SELECT id FROM projects WHERE LOWER(project_code)='wdiry0151' AND is_active=true`);
  const pid = proj.rows[0].id;
  const pos = await c.query(`
    SELECT po_number, serial_no_formatted, status, mrs_id, mrs_ids, po_date
    FROM purchase_orders WHERE project_id = $1 ORDER BY po_date ASC NULLS LAST
  `, [pid]);
  console.log('\n--- POs for WDIRY0151 (' + pos.rows.length + ' total) ---');
  pos.rows.forEach(r => console.log(' ', (r.serial_no_formatted || r.po_number), '|', r.status, '| mrs_id:', r.mrs_id, '| mrs_ids:', JSON.stringify(r.mrs_ids)));

  c.release(); await pool.end();
})();
