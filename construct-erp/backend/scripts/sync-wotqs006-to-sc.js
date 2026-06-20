// One-off: copy WOTQS006 specifically (and only this WO) from the legacy
// work_orders table into the SC Bill Preparation module's tables
// (sc_subcontractors / sc_work_orders / sc_wo_items), mirroring the exact
// logic in sc.routes.js's syncLegacyWorkOrdersToSC. Scoped to WOTQS006 only —
// does not touch any other work order.
require('dotenv').config();

const { pool, withTransaction } = require('../src/config/database');

const WO_NUMBER = 'WOTQS006';

function normalizeContractorType(vendorType) {
  const t = String(vendorType || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (t.includes('llp')) return 'llp';
  if (t.includes('partnership')) return 'partnership';
  if (t.includes('proprietor')) return 'proprietorship';
  if (t.includes('individual')) return 'individual';
  return 'company';
}

function normalizeWOStatus(status) {
  const s = String(status || '').trim().toLowerCase();
  if (['active', 'approved', 'authorized', 'released'].includes(s)) return 'active';
  if (['rejected', 'cancelled', 'canceled'].includes(s)) return 'cancelled';
  return 'draft';
}

async function main() {
  const userRes = await pool.query(`SELECT id, company_id FROM users WHERE role = 'super_admin' ORDER BY created_at LIMIT 1`);
  if (!userRes.rows.length) throw new Error('No super_admin user found');
  const { id: userId, company_id: cid } = userRes.rows[0];

  const result = await withTransaction(async (client) => {
    const existingWO = await client.query(
      `SELECT id FROM sc_work_orders WHERE company_id=$1 AND UPPER(TRIM(wo_number))=UPPER(TRIM($2))`,
      [cid, WO_NUMBER]
    );
    if (existingWO.rows.length) {
      return { status: 'already_synced', sc_work_order_id: existingWO.rows[0].id };
    }

    const legacy = await client.query(`
      SELECT wo.*, p.company_id, v.id AS vendor_id, v.name AS vendor_name,
             v.vendor_code, v.vendor_type, v.contact_person, v.phone, v.email,
             COALESCE(v.gst_number, v.gstin) AS gst_number,
             COALESCE(v.pan_number, v.pan) AS pan_number,
             v.address, v.city, v.state, v.pincode,
             v.bank_name, COALESCE(v.bank_account_no, v.account_number) AS account_number,
             COALESCE(v.bank_ifsc, v.ifsc_code) AS ifsc_code, v.bank_branch,
             v.trade_category
      FROM work_orders wo
      JOIN projects p ON p.id = wo.project_id
      JOIN vendors v ON v.id = wo.vendor_id
      WHERE p.company_id = $1 AND UPPER(TRIM(wo.wo_number)) = $2
    `, [cid, WO_NUMBER]);
    if (!legacy.rows.length) throw new Error(`${WO_NUMBER} not found`);
    const row = legacy.rows[0];

    let sc = await client.query(
      `SELECT id FROM sc_subcontractors
       WHERE company_id=$1
         AND (
           LOWER(TRIM(name)) = LOWER(TRIM($2))
           OR ($3::text IS NOT NULL AND gst_number = $3)
           OR ($4::text IS NOT NULL AND pan_number = $4)
         )
       ORDER BY created_at ASC LIMIT 1`,
      [cid, row.vendor_name, row.gst_number || null, row.pan_number || null]
    );

    let scId = sc.rows[0]?.id;
    let createdSub = false;
    if (!scId) {
      const count = await client.query(`SELECT COUNT(*) FROM sc_subcontractors WHERE company_id=$1`, [cid]);
      const scCode = `SC-${String(parseInt(count.rows[0].count, 10) + 1).padStart(3, '0')}`;
      const inserted = await client.query(`
        INSERT INTO sc_subcontractors
          (company_id, sc_code, name, contact_person, mobile, email, gst_number,
           pan_number, address, city, state, pincode, trade_type, contractor_type,
           bank_name, account_number, ifsc_code, bank_branch, status, notes, created_by)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,'active',$19,$20)
        RETURNING id
      `, [
        cid, scCode, row.vendor_name, row.contact_person || null, row.phone || null, row.email || null,
        row.gst_number || null, row.pan_number || null, row.address || null, row.city || null, row.state || null,
        row.pincode || null, row.trade_category || row.work_category || null, normalizeContractorType(row.vendor_type),
        row.bank_name || null, row.account_number || null, row.ifsc_code || null, row.bank_branch || null,
        `Synced from vendor master (${row.vendor_code || row.vendor_id})`, userId
      ]);
      scId = inserted.rows[0].id;
      createdSub = true;
    }

    const contractAmount = Number(row.contract_amount || row.total_value || 0);
    const insertedWO = await client.query(`
      INSERT INTO sc_work_orders
        (company_id, project_id, sc_id, wo_number, subject, description, scope_of_work,
         terms_conditions, start_date, end_date, contract_amount, gst_pct, tds_pct,
         retention_pct, advance_amount, status, approved_by, approved_at, created_by, created_at, updated_at,
         tower_block, work_category)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,18,2,5,0,$12,$13,$14,$15,COALESCE($16,NOW()),NOW(),$17,$18)
      RETURNING id
    `, [
      cid, row.project_id, scId, WO_NUMBER,
      row.subject || row.work_description || WO_NUMBER,
      row.work_description || row.scope_of_work || row.subject || WO_NUMBER,
      row.scope_of_work || row.work_description || null,
      row.terms_conditions || null,
      row.start_date || row.wo_date || null,
      row.end_date || null,
      contractAmount,
      normalizeWOStatus(row.status),
      normalizeWOStatus(row.status) === 'active' ? (row.created_by || userId) : null,
      normalizeWOStatus(row.status) === 'active' ? (row.updated_at || row.created_at || new Date()) : null,
      row.created_by || userId,
      row.created_at || null,
      row.tower_block || null,
      row.work_category || null
    ]);
    const newWoId = insertedWO.rows[0].id;

    const legacyItems = await client.query(`SELECT * FROM work_order_items WHERE wo_id=$1 ORDER BY id`, [row.id]);
    let itemsCopied = 0;
    if (legacyItems.rows.length) {
      for (let i = 0; i < legacyItems.rows.length; i++) {
        const it = legacyItems.rows[i];
        let qty = Number(it.quantity || 0);
        let rate = Number(it.rate || 0);
        const itemAmount = Number(it.amount || 0);
        if ((!qty || !rate) && itemAmount) {
          if (!qty) qty = 1;
          if (!rate) rate = itemAmount / qty;
        }
        await client.query(`
          INSERT INTO sc_wo_items (wo_id, item_code, description, unit, qty, rate, billed_qty, balance_qty, sequence_no)
          VALUES ($1,$2,$3,$4,$5,$6,0,$5,$7)
        `, [newWoId, null, it.description || 'Work item', it.unit || null, qty, rate, i + 1]);
        itemsCopied++;
      }
    } else {
      await client.query(`
        INSERT INTO sc_wo_items (wo_id, item_code, description, unit, qty, rate, billed_qty, balance_qty, sequence_no)
        VALUES ($1,NULL,$2,'LS',1,$3,0,1,1)
      `, [newWoId, row.work_description || row.subject || WO_NUMBER, contractAmount]);
      itemsCopied = 1;
    }

    return { status: 'synced', sc_id: scId, sc_subcontractor_created: createdSub, sc_work_order_id: newWoId, items_copied: itemsCopied };
  });

  console.log(JSON.stringify(result, null, 2));
  await pool.end();
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
