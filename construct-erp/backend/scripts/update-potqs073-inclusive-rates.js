const { withTransaction, pool } = require('../src/config/database');

const PO_NUMBER = 'POTQS073';
const GST_RATE = 18;
const TAX_FACTOR = 1 + GST_RATE / 100;

const inclusiveRows = [
  { sort_order: 1, inclusive_rate: 31000, inclusive_total: 62000 },
  { sort_order: 2, inclusive_rate: 1500, inclusive_total: 3000 },
  { sort_order: 3, inclusive_rate: 950, inclusive_total: 9500 },
  { sort_order: 4, inclusive_rate: 180, inclusive_total: 2160 },
  { sort_order: 5, inclusive_rate: 950, inclusive_total: 1900 },
  { sort_order: 6, inclusive_rate: 180, inclusive_total: 1800 },
  { sort_order: 7, inclusive_rate: 2850, inclusive_total: 5700 },
];

const DISCOUNT_TOTAL = -3060;

const round2 = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

async function main() {
  const result = await withTransaction(async (client) => {
    const poRes = await client.query(`
      SELECT id, po_number, sub_total, total_gst, grand_total
      FROM purchase_orders
      WHERE po_number = $1 OR serial_no_formatted = $1 OR po_ref_no = $1
      LIMIT 1
      FOR UPDATE
    `, [PO_NUMBER]);

    if (!poRes.rows.length) throw new Error(`${PO_NUMBER} not found`);
    const po = poRes.rows[0];

    for (const row of inclusiveRows) {
      const exclusiveRate = round2(row.inclusive_rate / TAX_FACTOR);
      const taxableAmount = round2(row.inclusive_total / TAX_FACTOR);
      const gstAmount = round2(row.inclusive_total - taxableAmount);

      await client.query(`
        UPDATE po_items
        SET rate = $3,
            gst_rate = $4,
            gst_amount = $5,
            total_amount = $6
        WHERE po_id = $1
          AND sort_order = $2
      `, [po.id, row.sort_order, exclusiveRate, GST_RATE, gstAmount, row.inclusive_total]);
    }

    const discountRes = await client.query(`
      SELECT id FROM po_items
      WHERE po_id = $1 AND LOWER(BTRIM(material_name)) = 'discount'
      LIMIT 1
    `, [po.id]);

    if (discountRes.rows.length) {
      await client.query(`
        UPDATE po_items
        SET quantity = 0,
            unit = 'LS',
            rate = 0,
            gst_rate = 0,
            gst_amount = 0,
            total_amount = $2,
            sort_order = 8
        WHERE id = $1
      `, [discountRes.rows[0].id, DISCOUNT_TOTAL]);
    } else {
      await client.query(`
        INSERT INTO po_items (
          po_id, material_name, quantity, unit, rate, gst_rate, gst_amount, total_amount, sort_order
        ) VALUES ($1, 'Discount', 0, 'LS', 0, 0, 0, $2, 8)
      `, [po.id, DISCOUNT_TOTAL]);
    }

    const totals = await client.query(`
      SELECT
        COALESCE(SUM(CASE WHEN total_amount > 0 THEN total_amount - gst_amount ELSE total_amount END), 0) AS sub_total,
        COALESCE(SUM(gst_amount), 0) AS total_gst,
        COALESCE(SUM(total_amount), 0) AS grand_total
      FROM po_items
      WHERE po_id = $1
    `, [po.id]);

    const total = totals.rows[0];
    const updated = await client.query(`
      UPDATE purchase_orders
      SET sub_total = $2,
          total_gst = $3,
          grand_total = $4,
          serial_no_formatted = $5,
          po_ref_no = $5,
          notes = CONCAT_WS(E'\n',
            NULLIF(notes, ''),
            'Updated from scanned PO: listed item rates are inclusive of 18% GST; ERP rates converted to tax-exclusive rates. Discount 3,060 kept as separate discount amount.'
          ),
          updated_at = NOW()
      WHERE id = $1
      RETURNING id, po_number, sub_total, total_gst, grand_total, serial_no_formatted, po_ref_no
    `, [po.id, total.sub_total, total.total_gst, total.grand_total, PO_NUMBER]);

    const items = await client.query(`
      SELECT sort_order, material_name, quantity, unit, rate, gst_rate, gst_amount, total_amount
      FROM po_items
      WHERE po_id = $1
      ORDER BY sort_order
    `, [po.id]);

    return { before: po, after: updated.rows[0], items: items.rows };
  });

  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
