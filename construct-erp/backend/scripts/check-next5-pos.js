require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
(async () => {
  const c = await pool.connect();
  const poNumbers = ['POTQS002','POTQS003','POTQS004','POTQS005','POTQS006'];
  for (const poNo of poNumbers) {
    const po = await c.query(`
      SELECT id, po_number, serial_no_formatted, po_date, status, mrs_id, mrs_ids
      FROM purchase_orders WHERE po_number=$1 OR serial_no_formatted=$1`, [poNo]);
    if (!po.rows.length) { console.log(poNo + ': NOT FOUND\n'); continue; }
    const r = po.rows[0];
    console.log('=== ' + (r.serial_no_formatted||r.po_number) + ' | date: ' + (r.po_date||'').toString().slice(0,10) + ' | status: ' + r.status + ' | mrs_id: ' + r.mrs_id + ' ===');
    const items = await c.query(`SELECT sort_order, material_name, quantity, unit FROM po_items WHERE po_id=$1 ORDER BY sort_order`, [r.id]);
    items.rows.forEach(i => console.log('  ' + i.sort_order + '. ' + i.material_name + ' | ' + i.quantity + ' ' + i.unit));
    console.log();
  }
  c.release(); await pool.end();
})();
