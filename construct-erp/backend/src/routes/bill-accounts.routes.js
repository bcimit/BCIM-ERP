// src/routes/bill-accounts.routes.js
// Accounts automation derived from the bill tracker (tqs_bills / tqs_bill_updates):
//   - GST Input Tax Credit (ITC) register
//   - TDS register (Form 26Q view) + challan deposit JV
//   - Retention register + retention-release JV
// Reuses the shared best-effort journal-posting engine; never blocks on COA gaps.
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { query } = require('../config/database');
const { runSchemaInit } = require('../utils/schemaInit');
const { postAutoJournalStandalone } = require('../services/journalAutoPost');

router.use(authenticate);

// ── Schema ─────────────────────────────────────────────────────────────────────
const ensureSchema = async () => {
  const safe = async (sql) => { try { await query(sql); } catch (_) {} };
  await safe(`
    CREATE TABLE IF NOT EXISTS tds_deposits (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id   UUID NOT NULL,
      period       TEXT NOT NULL,          -- 'YYYY-MM'
      section      TEXT DEFAULT '194C',
      amount       NUMERIC(14,2) NOT NULL,
      challan_no   TEXT,
      deposit_date DATE,
      bsr_code     TEXT,
      je_id        UUID,
      created_by   UUID,
      created_at   TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await safe(`CREATE UNIQUE INDEX IF NOT EXISTS idx_tds_deposit_period ON tds_deposits(company_id, period, section)`);
  // Retention release tracking on the bill-updates row
  await safe(`ALTER TABLE tqs_bill_updates ADD COLUMN IF NOT EXISTS retention_released_date DATE`);
  await safe(`ALTER TABLE tqs_bill_updates ADD COLUMN IF NOT EXISTS retention_release_je_id UUID`);
};
runSchemaInit('bill-accounts', ensureSchema);

const n = (v) => parseFloat(v || 0) || 0;
// Bills the Accounts stage has booked (so ITC / TDS / retention are real)
const BOOKED = `(u.accts_jv_date IS NOT NULL OR b.workflow_status IN ('procurement','qs_sign','paid'))`;

// ── GST INPUT TAX CREDIT REGISTER ───────────────────────────────────────────────
// Monthly ITC from booked bills, split CGST / SGST / IGST, with vendor GSTIN.
router.get('/itc-register', async (req, res) => {
  try {
    const { from, to, project_id } = req.query;
    const conditions = ['b.company_id = $1', 'b.is_deleted = FALSE', BOOKED, 'COALESCE(b.gst_amount,0) > 0'];
    const params = [req.user.company_id]; let p = 1;
    if (project_id) { conditions.push(`b.project_id = $${++p}`); params.push(project_id); }
    if (from) { conditions.push(`COALESCE(u.accts_jv_date, u.qs_certified_date, b.inv_date) >= $${++p}`); params.push(from); }
    if (to)   { conditions.push(`COALESCE(u.accts_jv_date, u.qs_certified_date, b.inv_date) <= $${++p}`); params.push(to); }

    const { rows } = await query(`
      SELECT
        b.id, b.sl_number, b.inv_number, b.inv_date, b.vendor_name,
        v.gstin AS vendor_gstin,
        to_char(COALESCE(u.accts_jv_date, u.qs_certified_date, b.inv_date), 'YYYY-MM') AS period,
        b.basic_amount, b.cgst_amt, b.sgst_amt, b.igst_amt, b.gst_amount
      FROM tqs_bills b
      LEFT JOIN tqs_bill_updates u ON u.bill_id = b.id
      LEFT JOIN vendors v ON v.id = b.vendor_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY COALESCE(u.accts_jv_date, u.qs_certified_date, b.inv_date) DESC NULLS LAST
    `, params);

    const summary = {};
    for (const r of rows) {
      const k = r.period || 'unknown';
      summary[k] ||= { period: k, taxable: 0, cgst: 0, sgst: 0, igst: 0, total_itc: 0, count: 0 };
      summary[k].taxable   += n(r.basic_amount);
      summary[k].cgst      += n(r.cgst_amt);
      summary[k].sgst      += n(r.sgst_amt);
      summary[k].igst      += n(r.igst_amt);
      summary[k].total_itc += n(r.gst_amount);
      summary[k].count     += 1;
    }
    res.json({ data: rows, summary: Object.values(summary).sort((a, b) => b.period.localeCompare(a.period)) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── TDS REGISTER (Form 26Q view) ────────────────────────────────────────────────
// TDS deducted on booked bills, section-wise, with deposited vs pending status.
router.get('/tds-register', async (req, res) => {
  try {
    const { from, to, project_id, section } = req.query;
    const conditions = ['b.company_id = $1', 'b.is_deleted = FALSE', BOOKED, 'COALESCE(u.tds_deduction,0) > 0'];
    const params = [req.user.company_id]; let p = 1;
    if (project_id) { conditions.push(`b.project_id = $${++p}`); params.push(project_id); }
    if (from) { conditions.push(`COALESCE(u.accts_jv_date, u.qs_certified_date, b.inv_date) >= $${++p}`); params.push(from); }
    if (to)   { conditions.push(`COALESCE(u.accts_jv_date, u.qs_certified_date, b.inv_date) <= $${++p}`); params.push(to); }

    const { rows } = await query(`
      SELECT
        b.id, b.sl_number, b.inv_number, b.inv_date, b.vendor_name, b.bill_type,
        v.gstin AS vendor_gstin,
        COALESCE(v.pan, substring(v.gstin from 3 for 10)) AS vendor_pan,
        to_char(COALESCE(u.accts_jv_date, u.qs_certified_date, b.inv_date), 'YYYY-MM') AS period,
        -- WO/subcontractor → 194C; default 194C for construction
        CASE WHEN b.bill_type = 'wo' THEN '194C' ELSE '194C' END AS section,
        b.total_amount, u.tds_deduction
      FROM tqs_bills b
      LEFT JOIN tqs_bill_updates u ON u.bill_id = b.id
      LEFT JOIN vendors v ON v.id = b.vendor_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY COALESCE(u.accts_jv_date, u.qs_certified_date, b.inv_date) DESC NULLS LAST
    `, params);

    // Which periods are already deposited
    const dep = await query(`SELECT period, section, amount, challan_no, deposit_date FROM tds_deposits WHERE company_id = $1`, [req.user.company_id]);
    const depMap = {};
    dep.rows.forEach(d => { depMap[`${d.period}|${d.section}`] = d; });

    const filtered = section ? rows.filter(r => r.section === section) : rows;
    const summary = {};
    for (const r of filtered) {
      const key = `${r.period}|${r.section}`;
      summary[key] ||= { period: r.period, section: r.section, tds_total: 0, count: 0, deposited: false, challan_no: null, deposit_date: null };
      summary[key].tds_total += n(r.tds_deduction);
      summary[key].count += 1;
      const d = depMap[key];
      if (d) { summary[key].deposited = true; summary[key].challan_no = d.challan_no; summary[key].deposit_date = d.deposit_date; }
    }
    res.json({ data: filtered, summary: Object.values(summary).sort((a, b) => (b.period || '').localeCompare(a.period || '')) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST TDS DEPOSIT (challan) — Dr TDS Payable, Cr Bank ─────────────────────────
router.post('/tds-deposit', async (req, res) => {
  try {
    const { period, section = '194C', challan_no, deposit_date, bsr_code } = req.body;
    if (!period) return res.status(400).json({ error: 'period (YYYY-MM) is required' });

    // Already deposited?
    const existing = await query(
      `SELECT id FROM tds_deposits WHERE company_id = $1 AND period = $2 AND section = $3`,
      [req.user.company_id, period, section]
    );
    if (existing.rows.length) return res.status(409).json({ error: `TDS for ${period} (${section}) is already recorded as deposited.` });

    // Sum pending TDS for the period from booked bills
    const sumRes = await query(`
      SELECT COALESCE(SUM(u.tds_deduction),0) AS total
      FROM tqs_bills b
      LEFT JOIN tqs_bill_updates u ON u.bill_id = b.id
      WHERE b.company_id = $1 AND b.is_deleted = FALSE AND ${BOOKED}
        AND COALESCE(u.tds_deduction,0) > 0
        AND to_char(COALESCE(u.accts_jv_date, u.qs_certified_date, b.inv_date), 'YYYY-MM') = $2
    `, [req.user.company_id, period]);
    const amount = n(sumRes.rows[0].total);
    if (amount <= 0) return res.status(400).json({ error: `No TDS found for ${period}.` });

    const depDate = deposit_date || new Date().toISOString().slice(0, 10);
    const jeId = await postAutoJournalStandalone({
      companyId: req.user.company_id,
      userId: req.user.id,
      entryDate: depDate,
      reference: challan_no || `TDS-${period}`,
      narration: `TDS deposited — ${section} for ${period}${challan_no ? ` (challan ${challan_no})` : ''}`,
      source: 'auto_tds_deposit',
      lines: [
        { code: '2200', debit: amount, description: `TDS payable cleared — ${period}` },
        { code: '1010', credit: amount, description: `TDS deposited to govt — ${period}` },
      ],
    });

    const { rows: [rec] } = await query(`
      INSERT INTO tds_deposits (company_id, period, section, amount, challan_no, deposit_date, bsr_code, je_id, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [req.user.company_id, period, section, amount, challan_no || null, depDate, bsr_code || null, jeId, req.user.id]
    );
    res.status(201).json({ data: rec, je_posted: !!jeId, amount,
      message: jeId ? `TDS challan recorded and JV posted (₹${amount.toFixed(0)}).` : `TDS challan recorded (₹${amount.toFixed(0)}); JV skipped — seed Chart of Accounts.` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/tds-deposits', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT d.*, u.name AS created_by_name FROM tds_deposits d
       LEFT JOIN users u ON u.id = d.created_by
       WHERE d.company_id = $1 ORDER BY d.period DESC, d.created_at DESC`,
      [req.user.company_id]
    );
    res.json({ data: rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── RETENTION REGISTER ──────────────────────────────────────────────────────────
// Retention withheld per booked bill, release status, and age since certification.
router.get('/retention-register', async (req, res) => {
  try {
    const { project_id, status } = req.query;
    const conditions = ['b.company_id = $1', 'b.is_deleted = FALSE', BOOKED, 'COALESCE(u.retention_money,0) > 0'];
    const params = [req.user.company_id]; let p = 1;
    if (project_id) { conditions.push(`b.project_id = $${++p}`); params.push(project_id); }

    const { rows } = await query(`
      SELECT
        b.id, b.sl_number, b.inv_number, b.vendor_name,
        pr.name AS project_name,
        u.qs_certified_date, u.accts_jv_date,
        u.retention_money,
        u.retention_released_date,
        u.retention_release_je_id,
        EXTRACT(DAY FROM NOW() - COALESCE(u.accts_jv_date, u.qs_certified_date))::int AS days_held
      FROM tqs_bills b
      LEFT JOIN tqs_bill_updates u ON u.bill_id = b.id
      LEFT JOIN projects pr ON pr.id = b.project_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY u.retention_released_date NULLS FIRST, days_held DESC NULLS LAST
    `, params);

    const data = rows.map(r => ({ ...r, released: !!r.retention_released_date }));
    const filtered = status === 'held' ? data.filter(r => !r.released)
                   : status === 'released' ? data.filter(r => r.released)
                   : data;
    const totals = {
      held:     data.filter(r => !r.released).reduce((s, r) => s + n(r.retention_money), 0),
      released: data.filter(r => r.released).reduce((s, r) => s + n(r.retention_money), 0),
    };
    res.json({ data: filtered, totals });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST RETENTION RELEASE — Dr Retention Payable, Cr Bank ───────────────────────
router.post('/retention-release/:billId', async (req, res) => {
  try {
    const { release_date } = req.body;
    const { rows: [bill] } = await query(`
      SELECT b.id, b.sl_number, b.vendor_name, b.company_id,
             u.retention_money, u.retention_released_date
      FROM tqs_bills b
      JOIN tqs_bill_updates u ON u.bill_id = b.id
      WHERE b.id = $1 AND b.company_id = $2`,
      [req.params.billId, req.user.company_id]
    );
    if (!bill) return res.status(404).json({ error: 'Bill not found' });
    if (bill.retention_released_date) return res.status(409).json({ error: 'Retention already released for this bill.' });
    const amount = n(bill.retention_money);
    if (amount <= 0) return res.status(400).json({ error: 'No retention to release on this bill.' });

    const relDate = release_date || new Date().toISOString().slice(0, 10);
    const jeId = await postAutoJournalStandalone({
      companyId: req.user.company_id,
      userId: req.user.id,
      entryDate: relDate,
      reference: bill.sl_number,
      narration: `Retention released — ${bill.vendor_name || ''} (${bill.sl_number})`,
      source: 'auto_retention_release',
      lines: [
        { code: '2300', debit: amount, description: `Retention released — ${bill.sl_number}` },
        { code: '1010', credit: amount, description: `Retention paid to ${bill.vendor_name || 'vendor'}` },
      ],
    });

    await query(
      `UPDATE tqs_bill_updates SET retention_released_date = $1, retention_release_je_id = $2, updated_at = NOW() WHERE bill_id = $3`,
      [relDate, jeId, req.params.billId]
    );
    res.json({ data: { released: true, amount, je_posted: !!jeId },
      message: jeId ? `Retention released and JV posted (₹${amount.toFixed(0)}).` : `Retention marked released (₹${amount.toFixed(0)}); JV skipped — seed Chart of Accounts.` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
