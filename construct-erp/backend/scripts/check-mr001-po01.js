require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
(async () => {
  const c = await pool.connect();

  // MR-001
  const mr = await c.query(`
    SELECT mr.id, mr.serial_no_formatted, mr.created_at::date AS mr_date, mr.required_by
    FROM material_requisitions mr
    WHERE mr.serial_no_formatted = 'BCIM-TQS-BLR-MR-001'
  `);
  if (!mr.rows.length) { console.log('MR-001 not found'); } else {
    const r = mr.rows[0];
    console.log('MR-001:', r.serial_no_formatted, '| date:', r.mr_date, '| required_by:', r.required_by, '| id:', r.id);
    const items = await c.query(`SELECT sort_order, material_name, quantity, unit FROM mrs_items WHERE mrs_id=$1 ORDER BY sort_order`, [r.id]);
    console.log('  Items (' + items.rows.length + '):');
    items.rows.forEach(i => console.log(`    ${i.sort_order}. ${i.material_name} | ${i.quantity} ${i.unit}`));
  }

  console.log();

  // PO POTQS001
  const po = await c.query(`
    SELECT po.id, po.po_number, po.serial_no_formatted, po.po_date, po.status, po.mrs_id, po.mrs_ids
    FROM purchase_orders po
    WHERE po.po_number = 'POTQS001' OR po.serial_no_formatted = 'POTQS001'
  `);
  if (!po.rows.length) { console.log('PO POTQS001 not found'); } else {
    const r = po.rows[0];
    console.log('PO POTQS001:', (r.serial_no_formatted||r.po_number), '| date:', r.po_date, '| status:', r.status, '| mrs_id:', r.mrs_id);
    const items = await c.query(`SELECT sort_order, material_name, quantity, unit FROM po_items WHERE po_id=$1 ORDER BY sort_order`, [r.id]);
    console.log('  Items (' + items.rows.length + '):');
    items.rows.forEach(i => console.log(`    ${i.sort_order}. ${i.material_name} | ${i.quantity} ${i.unit}`));
  }

  c.release(); await pool.end();
})();
