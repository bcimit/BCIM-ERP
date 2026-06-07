const { withTransaction, pool } = require('../src/config/database');

const PO_NUMBER = 'POTQS073';
const PDF_DATE = '2026-05-12';
const DISCOUNT_AMOUNT = -3060;

async function main() {
  const result = await withTransaction(async (client) => {
    const poRes = await client.query(`
      SELECT id, sub_total, total_gst, grand_total
      FROM purchase_orders
      WHERE po_number = $1 OR serial_no_formatted = $1 OR po_ref_no = $1
      LIMIT 1
      FOR UPDATE
    `, [PO_NUMBER]);

    if (!poRes.rows.length) {
      throw new Error(`${PO_NUMBER} not found`);
    }

    const po = poRes.rows[0];

    const itemTotals = await client.query(`
      SELECT COALESCE(SUM(total_amount), 0) AS amount_before_discount
      FROM po_items
      WHERE po_id = $1
        AND LOWER(BTRIM(material_name)) <> 'discount'
    `, [po.id]);

    const beforeDiscount = Number(itemTotals.rows[0].amount_before_discount || 0);
    const netTotal = beforeDiscount + DISCOUNT_AMOUNT;

    const existingDiscount = await client.query(`
      SELECT id
      FROM po_items
      WHERE po_id = $1 AND LOWER(BTRIM(material_name)) = 'discount'
      LIMIT 1
    `, [po.id]);

    if (existingDiscount.rows.length) {
      await client.query(`
        UPDATE po_items
        SET quantity = 0,
            unit = 'LS',
            rate = $2,
            gst_rate = 0,
            gst_amount = 0,
            total_amount = $2,
            sort_order = 8
        WHERE id = $1
      `, [existingDiscount.rows[0].id, DISCOUNT_AMOUNT]);
    } else {
      await client.query(`
        INSERT INTO po_items (
          po_id, material_name, quantity, unit, rate, gst_rate, gst_amount, total_amount, sort_order
        ) VALUES ($1, 'Discount', 0, 'LS', $2, 0, 0, $2, 8)
      `, [po.id, DISCOUNT_AMOUNT]);
    }

    const updateRes = await client.query(`
      UPDATE purchase_orders
      SET po_date = $2,
          sub_total = $3,
          total_gst = 0,
          grand_total = $3,
          serial_no_formatted = $4,
          po_ref_no = $4,
          notes = CONCAT_WS(E'\n',
            NULLIF(notes, ''),
            'Updated from scanned PO: item total 86,060 less discount 3,060. GST CGST/SGST marked inclusive in PDF.'
          ),
          updated_at = NOW()
      WHERE id = $1
      RETURNING id, po_number, po_date, sub_total, total_gst, grand_total, serial_no_formatted, po_ref_no
    `, [po.id, PDF_DATE, netTotal, PO_NUMBER]);

    const items = await client.query(`
      SELECT material_name, quantity, unit, rate, gst_rate, gst_amount, total_amount, sort_order
      FROM po_items
      WHERE po_id = $1
      ORDER BY sort_order, created_at
    `, [po.id]);

    return {
      before: po,
      after: updateRes.rows[0],
      amount_before_discount: beforeDiscount,
      discount: DISCOUNT_AMOUNT,
      items: items.rows,
    };
  });

  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
