// One-off fix: WOTQS006 was imported (import-wotqs-work-orders.js) as a single
// lump-sum line with no item breakdown, and the header total_value/contract_amount
// was set to the PDF's post-GST "Net Total" (28,556) instead of the pre-GST work
// value. Source: WOTQS006-S.G.S Forklift & Crane.pdf / WOTQS006-S.G.S. Forklift &
// Crane services.xlsx — both show the same 6-line breakdown, total 24,200 + 18%
// GST = 28,556.
require('dotenv').config();

const { pool } = require('../src/config/database');

const WO_NUMBER = 'WOTQS006';

const ITEMS = [
  { description: 'Hiring of Hydra Crane (12 Ton)\nMinimum 3 hours Shift', unit: 'Shift', quantity: 1, rate: 3000 },
  { description: 'Hiring of Hydra Crane (12 Ton)\nafter 3 Hours',         unit: 'Hours', quantity: 1, rate: 700 },
  { description: 'Hiring of Hydra Crane (12 Ton)\n8 Hours per Day',       unit: 'Day',   quantity: 1, rate: 6500 },
  { description: 'Hiring of F15-Farana Crane\nMinimum 3 hours',           unit: 'Shift', quantity: 1, rate: 4500 },
  { description: 'Hiring of F15-Farana Crane',                           unit: 'Hours', quantity: 1, rate: 1000 },
  { description: 'Hiring of F15-Farana Crane\n8 hours Shift',            unit: 'Day',   quantity: 1, rate: 8500 },
];
const GST_RATE = 18;

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const woRes = await client.query(
      `SELECT id, total_value, contract_amount FROM work_orders WHERE UPPER(TRIM(wo_number)) = $1`,
      [WO_NUMBER]
    );
    if (!woRes.rows.length) throw new Error(`${WO_NUMBER} not found`);
    const wo = woRes.rows[0];

    // The existing row(s) are a single lump-sum placeholder ("Hiring of Hydra
    // Crane for TQS, Yelahanka", LS x 1 @ 28,556) created from the header total
    // before the real per-item breakdown was available — replace with the
    // proper 6-line breakdown from the source PDF/Excel.
    const existing = await client.query(`SELECT id, description, amount FROM work_order_items WHERE wo_id = $1`, [wo.id]);
    if (existing.rows.length) {
      console.log(`Replacing ${existing.rows.length} existing placeholder item(s):`, existing.rows);
      await client.query(`DELETE FROM work_order_items WHERE wo_id = $1`, [wo.id]);
    }

    let subTotal = 0;
    for (const it of ITEMS) {
      subTotal += it.quantity * it.rate;
      await client.query(
        `INSERT INTO work_order_items (wo_id, description, unit, quantity, rate, gst_rate)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [wo.id, it.description, it.unit, it.quantity, it.rate, GST_RATE]
      );
    }

    await client.query(
      `UPDATE work_orders SET total_value = $1, contract_amount = $1, gst_pct = $2 WHERE id = $3`,
      [subTotal, GST_RATE, wo.id]
    );

    await client.query('COMMIT');
    console.log(JSON.stringify({
      wo_number: WO_NUMBER,
      items_inserted: ITEMS.length,
      sub_total: subTotal,
      gst_pct: GST_RATE,
      grand_total: Math.round(subTotal * (1 + GST_RATE / 100)),
      previous_total_value: wo.total_value,
    }, null, 2));
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
