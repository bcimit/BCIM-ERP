require('dotenv').config({ path: '.env' });

const { query } = require('../src/config/database');

async function main() {
  const { rows } = await query(`
    SELECT
      b.id,
      b.sl_number,
      b.bill_type,
      b.vendor_name,
      b.inv_number,
      COALESCE(b.wo_number, b.po_number) AS order_number,
      b.total_amount,
      b.workflow_status,
      b.created_at,
      b.updated_at,
      u.store_recv_date,
      u.dc_number,
      u.qs_certified_date,
      u.certified_net,
      u.proc_received_from_accounts_date,
      u.proc_handed_over_to_accounts_date,
      u.qs_sign_received_from_procurement_date,
      u.qs_sign_date,
      u.handed_over_accounts_date,
      u.payment_status,
      u.paid_amount,
      u.payment_date
    FROM tqs_bills b
    LEFT JOIN tqs_bill_updates u ON u.bill_id = b.id
    WHERE b.is_deleted = FALSE
      AND b.workflow_status = 'pending'
    ORDER BY b.updated_at DESC NULLS LAST, b.created_at DESC
    LIMIT 80
  `);

  const stuck = rows.filter(row =>
    row.store_recv_date ||
    row.dc_number ||
    row.qs_certified_date ||
    Number(row.certified_net || 0) > 0 ||
    row.proc_received_from_accounts_date ||
    row.proc_handed_over_to_accounts_date ||
    row.qs_sign_received_from_procurement_date ||
    row.qs_sign_date ||
    row.handed_over_accounts_date ||
    row.payment_status === 'paid' ||
    Number(row.paid_amount || 0) > 0 ||
    row.payment_date
  );

  console.log(JSON.stringify({
    pending_checked: rows.length,
    pending_with_stage_updates: stuck.length,
    rows: stuck,
  }, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err.message);
    process.exit(1);
  });
