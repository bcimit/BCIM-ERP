require('dotenv').config({ path: '.env' });

const { query } = require('../src/config/database');

async function main() {
  const { rows } = await query(`
    SELECT
      b.id,
      b.sl_number,
      b.vendor_name,
      b.inv_number,
      b.workflow_status,
      h.dept,
      h.action,
      h.ts
    FROM tqs_bill_history h
    JOIN tqs_bills b ON b.id = h.bill_id
    WHERE h.ts::date = CURRENT_DATE
      AND (
        h.action ILIKE '%QS%'
        OR h.action ILIKE '%Document Controller%'
        OR h.action ILIKE '%Advanced%'
      )
    ORDER BY h.ts DESC
    LIMIT 80
  `);

  console.log(JSON.stringify(rows, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err.message);
    process.exit(1);
  });
