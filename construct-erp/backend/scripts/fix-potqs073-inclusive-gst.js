const { query, pool } = require('../src/config/database');

async function main() {
  const result = await query(`
    UPDATE po_items
    SET gst_rate = 0,
        gst_amount = 0
    WHERE po_id = (
      SELECT id FROM purchase_orders WHERE po_number = 'POTQS073' LIMIT 1
    )
    RETURNING material_name, gst_rate, gst_amount, total_amount
  `);
  console.log(JSON.stringify(result.rows, null, 2));
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
