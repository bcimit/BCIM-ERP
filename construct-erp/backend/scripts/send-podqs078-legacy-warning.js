require('dotenv').config({ path: '.env' });

const { query } = require('../src/config/database');
const { sendMail } = require('../src/services/mail.service');

const poNo = process.argv[2] || 'PODQS078';
const recipient = process.argv[3] || 'it@bcim.in';
const threshold = Number(process.env.PO_ALERT_THRESHOLD_PCT || 90);

const inrText = (value) =>
  Math.round(Number(value || 0)).toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  });

async function main() {
  const { rows } = await query(`
    WITH po_totals AS (
      SELECT po.id, po.po_number, po.po_date, po.grand_total, po.project_id,
             COALESCE(v.name, 'Vendor') AS vendor_name,
             p.name AS project_name,
             p.company_id
      FROM purchase_orders po
      LEFT JOIN vendors v ON v.id = po.vendor_id
      LEFT JOIN projects p ON p.id = po.project_id
      WHERE UPPER(COALESCE(NULLIF(po.po_ref_no, ''), NULLIF(po.serial_no_formatted, ''), po.po_number)) = $1
         OR UPPER(po.po_number) = $1
      LIMIT 1
    ),
    bill_totals AS (
      SELECT COALESCE(SUM(b.total_amount), 0) AS billed_amount
      FROM tqs_bills b, po_totals po
      WHERE b.company_id = po.company_id
        AND b.is_deleted = FALSE
        AND b.workflow_status NOT IN ('rejected')
        AND (b.po_id = po.id OR UPPER(b.po_number) = $1)
    ),
    item_totals AS (
      SELECT
        COALESCE(SUM(pi.quantity), 0) AS ordered_qty,
        COALESCE(SUM(COALESCE(inv.invoiced_qty, 0)), 0) AS invoiced_qty,
        COALESCE(SUM(GREATEST(pi.quantity - COALESCE(inv.invoiced_qty, 0), 0)), 0) AS remaining_qty
      FROM po_items pi
      JOIN po_totals po ON po.id = pi.po_id
      LEFT JOIN (
        SELECT li.po_item_id, SUM(li.quantity) AS invoiced_qty
        FROM tqs_bill_line_items li
        JOIN tqs_bills b ON b.id = li.bill_id
        JOIN po_totals po ON TRUE
        WHERE b.company_id = po.company_id
          AND b.is_deleted = FALSE
          AND b.workflow_status NOT IN ('rejected')
          AND (b.po_id = po.id OR UPPER(b.po_number) = $1)
          AND li.po_item_id IS NOT NULL
        GROUP BY li.po_item_id
      ) inv ON inv.po_item_id = pi.id
      WHERE pi.po_id = (SELECT id FROM po_totals)
    ),
    latest_bill AS (
      SELECT b.sl_number, b.inv_number
      FROM tqs_bills b, po_totals po
      WHERE b.company_id = po.company_id
        AND b.is_deleted = FALSE
        AND b.workflow_status NOT IN ('rejected')
        AND (b.po_id = po.id OR UPPER(b.po_number) = $1)
      ORDER BY b.created_at DESC
      LIMIT 1
    )
    SELECT po_totals.*, bill_totals.billed_amount,
           item_totals.ordered_qty, item_totals.invoiced_qty, item_totals.remaining_qty,
           latest_bill.sl_number, latest_bill.inv_number
    FROM po_totals, bill_totals, item_totals
    LEFT JOIN latest_bill ON TRUE
  `, [poNo.toUpperCase()]);

  const po = rows[0];
  if (!po) throw new Error(`PO not found: ${poNo}`);

  const poAmount = Number(po.grand_total || 0);
  const billedAmount = Number(po.billed_amount || 0);
  const amountPct = poAmount > 0 ? Math.round((billedAmount / poAmount) * 100) : 0;
  const orderedQty = Number(po.ordered_qty || 0);
  const invoicedQty = Number(po.invoiced_qty || 0);
  const qtyPct = orderedQty > 0 ? Math.round((invoicedQty / orderedQty) * 100) : 0;

  const subject = `PO Quantity ${threshold}% WARNING: ${po.po_number}`;
  const text = [
    `Purchase Order alert: ${po.po_number}`,
    `Alert Trigger: Quantity ${threshold}% warning`,
    `Vendor: ${po.vendor_name || '-'}`,
    `Project: ${po.project_name || '-'}`,
    `Triggered by DQS Bill: ${po.sl_number || '-'} / Invoice ${po.inv_number || '-'}`,
    `PO Amount: ${inrText(poAmount)}`,
    `Billed Amount: ${inrText(billedAmount)} (${amountPct}%)`,
    `Ordered Qty: ${orderedQty}`,
    `Invoiced Qty: ${invoicedQty} (${qtyPct}%)`,
    `Remaining Qty: ${po.remaining_qty || 0}`,
  ].join('\n');

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:680px;color:#0f172a">
      <h2 style="margin:0 0 12px;color:#b91c1c">Purchase Order ${threshold}% WARNING</h2>
      <p style="padding:10px 12px;background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;color:#9a3412">
        <strong>Alert Trigger:</strong> Quantity ${threshold}% warning
      </p>
      <p><strong>PO:</strong> ${po.po_number}<br>
         <strong>Vendor:</strong> ${po.vendor_name || '-'}<br>
         <strong>Project:</strong> ${po.project_name || '-'}<br>
         <strong>DQS Bill:</strong> ${po.sl_number || '-'} / Invoice ${po.inv_number || '-'}</p>
      <table style="border-collapse:collapse;width:100%;font-size:14px">
        <tr><td style="padding:8px;border:1px solid #e2e8f0">PO Amount</td><td style="padding:8px;border:1px solid #e2e8f0">${inrText(poAmount)}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e2e8f0">Billed Amount</td><td style="padding:8px;border:1px solid #e2e8f0">${inrText(billedAmount)} (${amountPct}%)</td></tr>
        <tr><td style="padding:8px;border:1px solid #e2e8f0">Ordered Qty</td><td style="padding:8px;border:1px solid #e2e8f0">${orderedQty}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e2e8f0">Invoiced Qty</td><td style="padding:8px;border:1px solid #e2e8f0">${invoicedQty} (${qtyPct}%)</td></tr>
        <tr><td style="padding:8px;border:1px solid #e2e8f0">Remaining Qty</td><td style="padding:8px;border:1px solid #e2e8f0">${po.remaining_qty || 0}</td></tr>
      </table>
    </div>
  `;

  const mail = await sendMail({ to: recipient, subject, text, html });
  console.log(JSON.stringify({
    po: po.po_number,
    subject,
    recipient,
    amountPct,
    qtyPct,
    mail,
  }, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err.message);
    process.exit(1);
  });
