require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
(async () => {
  const c = await pool.connect();
  const mr = await c.query(`SELECT id FROM material_requisitions WHERE serial_no_formatted='BCIM-TQS-BLR-MR-004'`);
  const mrId = mr.rows[0].id;
  console.log('MR-004 id:', mrId);

  const poNumbers = ['POTQS001','POTQS001-A1','POTQS001-A3','POTQS001-A4'];
  for (const poNo of poNumbers) {
    const po = await c.query(`SELECT id,po_number,serial_no_formatted,mrs_id,mrs_ids FROM purchase_orders WHERE po_number=$1 OR serial_no_formatted=$1`,[poNo]);
    if (!po.rows.length) { console.log(poNo+': NOT FOUND'); continue; }
    const r = po.rows[0];
    const existing = Array.isArray(r.mrs_ids) ? r.mrs_ids : (r.mrs_id ? [r.mrs_id] : []);
    const newIds = existing.includes(mrId) ? existing : [...existing, mrId];
    await c.query(`UPDATE purchase_orders SET mrs_id=$1, mrs_ids=$2 WHERE id=$3`,[newIds[0], newIds, r.id]);
    console.log('  linked '+(r.serial_no_formatted||r.po_number)+' -> MR-004');
  }
  console.log('\nDone.');
  c.release(); await pool.end();
})();
