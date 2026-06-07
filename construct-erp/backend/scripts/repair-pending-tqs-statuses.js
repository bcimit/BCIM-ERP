require('dotenv').config({ path: '.env' });

const { query, withTransaction } = require('../src/config/database');

async function main() {
  const result = await withTransaction(async (client) => {
    const paid = await client.query(`
      UPDATE tqs_bills b
      SET workflow_status = 'paid', updated_at = NOW()
      FROM tqs_bill_updates u
      WHERE u.bill_id = b.id
        AND b.is_deleted = FALSE
        AND b.workflow_status = 'pending'
        AND (
          u.payment_status = 'paid'
          OR COALESCE(u.paid_amount, 0) > 0
          OR u.payment_date IS NOT NULL
        )
      RETURNING b.sl_number, b.vendor_name, b.inv_number, b.workflow_status
    `);

    const accounts = await client.query(`
      UPDATE tqs_bills b
      SET workflow_status = 'accounts', updated_at = NOW()
      FROM tqs_bill_updates u
      WHERE u.bill_id = b.id
        AND b.is_deleted = FALSE
        AND b.workflow_status = 'pending'
        AND (
          COALESCE(u.certified_net, 0) > 0
          OR u.qs_certified_date IS NOT NULL
          OR u.handed_over_accounts_date IS NOT NULL
        )
      RETURNING b.sl_number, b.vendor_name, b.inv_number, b.workflow_status
    `);

    const qsSign = await client.query(`
      UPDATE tqs_bills b
      SET workflow_status = 'qs_sign', updated_at = NOW()
      FROM tqs_bill_updates u
      WHERE u.bill_id = b.id
        AND b.is_deleted = FALSE
        AND b.workflow_status = 'pending'
        AND (
          u.qs_sign_received_from_procurement_date IS NOT NULL
          OR u.qs_sign_date IS NOT NULL
          OR u.qs_sign_handed_to_accounts_date IS NOT NULL
        )
      RETURNING b.sl_number, b.vendor_name, b.inv_number, b.workflow_status
    `);

    const procurement = await client.query(`
      UPDATE tqs_bills b
      SET workflow_status = 'procurement', updated_at = NOW()
      FROM tqs_bill_updates u
      WHERE u.bill_id = b.id
        AND b.is_deleted = FALSE
        AND b.workflow_status = 'pending'
        AND (
          u.proc_received_from_accounts_date IS NOT NULL
          OR u.proc_handed_over_to_accounts_date IS NOT NULL
        )
      RETURNING b.sl_number, b.vendor_name, b.inv_number, b.workflow_status
    `);

    const qs = await client.query(`
      UPDATE tqs_bills b
      SET workflow_status = 'qs', updated_at = NOW()
      FROM tqs_bill_updates u
      WHERE u.bill_id = b.id
        AND b.is_deleted = FALSE
        AND b.workflow_status = 'pending'
        AND u.handed_over_qs_date IS NOT NULL
      RETURNING b.sl_number, b.vendor_name, b.inv_number, b.workflow_status
    `);

    const documentController = await client.query(`
      UPDATE tqs_bills b
      SET workflow_status = 'document_controller', updated_at = NOW()
      FROM tqs_bill_updates u
      WHERE u.bill_id = b.id
        AND b.is_deleted = FALSE
        AND b.workflow_status = 'pending'
        AND (
          u.store_recv_date IS NOT NULL
          OR u.dc_number IS NOT NULL
        )
      RETURNING b.sl_number, b.vendor_name, b.inv_number, b.workflow_status
    `);

    return {
      paid: paid.rows,
      accounts: accounts.rows,
      qs_sign: qsSign.rows,
      procurement: procurement.rows,
      qs: qs.rows,
      document_controller: documentController.rows,
    };
  });

  console.log(JSON.stringify(result, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err.message);
    process.exit(1);
  });
