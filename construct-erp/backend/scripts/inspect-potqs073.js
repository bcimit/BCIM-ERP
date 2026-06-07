const { query, pool } = require('../src/config/database');

async function main() {
  const poRes = await query(`
    SELECT po.id, po.po_number, po.serial_no_formatted, po.po_ref_no, po.po_date,
           po.sub_total, po.total_gst, po.grand_total, po.status,
           v.name AS vendor_name, p.name AS project_name
    FROM purchase_orders po
    LEFT JOIN vendors v ON v.id = po.vendor_id
    LEFT JOIN projects p ON p.id = po.project_id
    WHERE po.po_number = 'POTQS073'
       OR po.serial_no_formatted = 'POTQS073'
       OR po.po_ref_no = 'POTQS073'
    LIMIT 1
  `);

  if (!poRes.rows.length) {
    console.log(JSON.stringify({ found: false }, null, 2));
    return;
  }

  const po = poRes.rows[0];
  const itemRes = await query(`
    SELECT id, material_name, quantity, unit, rate, gst_rate, gst_amount, total_amount, sort_order
    FROM po_items
    WHERE po_id = $1
    ORDER BY sort_order, created_at
  `, [po.id]);

  console.log(JSON.stringify({ found: true, po, items: itemRes.rows }, null, 2));
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
