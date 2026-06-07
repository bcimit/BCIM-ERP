require('dotenv').config({ path: '.env' });

const { query } = require('../src/config/database');
const { sendMail } = require('../src/services/mail.service');

const poNo = process.argv[2] || 'PODQS078';
const recipient = process.argv[3] || 'it@bcim.in';

const inr = (value) =>
  Number(value || 0).toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

const num = (value) => Number(value || 0).toLocaleString('en-IN');

async function main() {
  const poRes = await query(`
    SELECT
      po.id,
      po.po_number,
      COALESCE(NULLIF(po.po_ref_no, ''), NULLIF(po.serial_no_formatted, ''), po.po_number) AS display_no,
      po.grand_total,
      po.project_id,
      p.company_id,
      COALESCE(v.name, 'Vendor') AS vendor_name,
      p.name AS project_name
    FROM purchase_orders po
    LEFT JOIN vendors v ON v.id = po.vendor_id
    LEFT JOIN projects p ON p.id = po.project_id
    WHERE UPPER(COALESCE(NULLIF(po.po_ref_no, ''), NULLIF(po.serial_no_formatted, ''), po.po_number)) = $1
       OR UPPER(po.po_number) = $1
    LIMIT 1
  `, [poNo.toUpperCase()]);

  const po = poRes.rows[0];
  if (!po) throw new Error(`PO not found: ${poNo}`);

  const bills = (await query(`
    SELECT b.sl_number, b.inv_number, b.total_amount, b.created_at
    FROM tqs_bills b
    WHERE b.company_id = $1
      AND b.is_deleted = FALSE
      AND b.workflow_status NOT IN ('rejected')
      AND (b.po_id = $2 OR UPPER(b.po_number) = $3)
    ORDER BY b.created_at DESC
  `, [po.company_id, po.id, poNo.toUpperCase()])).rows;

  const billed = bills.reduce((sum, bill) => sum + Number(bill.total_amount || 0), 0);
  const pct = Number(po.grand_total || 0) > 0
    ? Math.round((billed / Number(po.grand_total || 0)) * 100)
    : 0;

  const items = (await query(`
    SELECT
      pi.material_name,
      COALESCE(pi.unit, '-') AS unit,
      COALESCE(pi.quantity, 0) AS ordered_qty,
      COALESCE(inv.qty, 0) AS invoiced_qty,
      GREATEST(COALESCE(pi.quantity, 0) - COALESCE(inv.qty, 0), 0) AS remaining_qty
    FROM po_items pi
    LEFT JOIN (
      SELECT li.po_item_id, SUM(COALESCE(li.quantity, 0)) AS qty
      FROM tqs_bill_line_items li
      JOIN tqs_bills b ON b.id = li.bill_id
      WHERE b.company_id = $1
        AND b.is_deleted = FALSE
        AND b.workflow_status NOT IN ('rejected')
        AND (b.po_id = $2 OR UPPER(b.po_number) = $3)
        AND li.po_item_id IS NOT NULL
      GROUP BY li.po_item_id
    ) inv ON inv.po_item_id = pi.id
    WHERE pi.po_id = $2
    ORDER BY pi.sort_order NULLS LAST, pi.material_name
  `, [po.company_id, po.id, poNo.toUpperCase()])).rows;

  const recent = bills[0] || {};
  const itemRows = items.map(item => `
    <tr>
      <td style="padding:8px;border:1px solid #dbe4f0">${item.material_name || '-'}</td>
      <td style="padding:8px;border:1px solid #dbe4f0;white-space:nowrap">${item.unit}</td>
      <td style="padding:8px;border:1px solid #dbe4f0;text-align:right">${num(item.ordered_qty)}</td>
      <td style="padding:8px;border:1px solid #dbe4f0;text-align:right">${num(item.invoiced_qty)}</td>
      <td style="padding:8px;border:1px solid #dbe4f0;text-align:right">${num(item.remaining_qty)}</td>
    </tr>
  `).join('');

  const subject = `TEST - PO Amount Warning: ${po.display_no}`;
  const text = [
    'TEST PO warning alert',
    `PO: ${po.display_no}`,
    `Vendor: ${po.vendor_name}`,
    `Project: ${po.project_name}`,
    `PO Amount: ${inr(po.grand_total)}`,
    `Billed Amount: ${inr(billed)} (${pct}%)`,
    `Recent DQS Bill: ${recent.sl_number || '-'} / Invoice ${recent.inv_number || '-'}`,
    '',
    'Quantity balance is shown item-wise with units in the HTML mail.',
  ].join('\n');

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:920px;color:#10233f">
      <h2 style="margin:0 0 12px;color:#b45309">TEST - Purchase Order Amount Warning</h2>
      <p style="padding:10px 12px;background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;color:#9a3412">
        <strong>This is a test mail.</strong> Amount consumption warning for ${po.display_no}.
        Quantity balance is shown item-wise with its own unit.
      </p>
      <table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:13px">
        <tr>
          <td style="padding:8px;border:1px solid #dbe4f0;font-weight:700">PO</td>
          <td style="padding:8px;border:1px solid #dbe4f0">${po.display_no}</td>
          <td style="padding:8px;border:1px solid #dbe4f0;font-weight:700">Vendor</td>
          <td style="padding:8px;border:1px solid #dbe4f0">${po.vendor_name}</td>
        </tr>
        <tr>
          <td style="padding:8px;border:1px solid #dbe4f0;font-weight:700">Project</td>
          <td style="padding:8px;border:1px solid #dbe4f0" colspan="3">${po.project_name}</td>
        </tr>
        <tr>
          <td style="padding:8px;border:1px solid #dbe4f0;font-weight:700">PO Amount</td>
          <td style="padding:8px;border:1px solid #dbe4f0">${inr(po.grand_total)}</td>
          <td style="padding:8px;border:1px solid #dbe4f0;font-weight:700">Billed Amount</td>
          <td style="padding:8px;border:1px solid #dbe4f0">${inr(billed)} (${pct}%)</td>
        </tr>
        <tr>
          <td style="padding:8px;border:1px solid #dbe4f0;font-weight:700">Recent Bill</td>
          <td style="padding:8px;border:1px solid #dbe4f0" colspan="3">${recent.sl_number || '-'} / Invoice ${recent.inv_number || '-'}</td>
        </tr>
      </table>
      <h3 style="margin:16px 0 8px">Item-wise Quantity Balance</h3>
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead>
          <tr>
            <th style="padding:8px;border:1px solid #dbe4f0;background:#eef4fb;text-align:left">Item</th>
            <th style="padding:8px;border:1px solid #dbe4f0;background:#eef4fb;text-align:left">Unit</th>
            <th style="padding:8px;border:1px solid #dbe4f0;background:#eef4fb;text-align:right">Ordered</th>
            <th style="padding:8px;border:1px solid #dbe4f0;background:#eef4fb;text-align:right">Invoiced</th>
            <th style="padding:8px;border:1px solid #dbe4f0;background:#eef4fb;text-align:right">Remaining</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>
    </div>
  `;

  const mail = await sendMail({ to: recipient, subject, text, html });
  console.log(JSON.stringify({
    po: po.display_no,
    vendor: po.vendor_name,
    bills: bills.length,
    billed_amount: billed,
    recipient,
    mail,
  }, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err.message);
    process.exit(1);
  });
