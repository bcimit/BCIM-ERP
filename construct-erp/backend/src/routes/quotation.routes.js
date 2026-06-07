// src/routes/quotation.routes.js
const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { loadProjectScope, userCanAccessProject } = require('../middleware/projectScope');
const { query, withTransaction } = require('../config/database');
const { sendMail } = require('../services/mail.service');

// Auto-migrate: add cs_status to material_requisitions, mrs_id to quotations table
(async () => {
  try {
    const alters = [
      // CS workflow columns on material_requisitions
      `ALTER TABLE material_requisitions ADD COLUMN IF NOT EXISTS cs_status TEXT DEFAULT 'pending_entry'`,
      `ALTER TABLE material_requisitions ADD COLUMN IF NOT EXISTS cs_verified_by UUID`,
      `ALTER TABLE material_requisitions ADD COLUMN IF NOT EXISTS cs_verified_at TIMESTAMPTZ`,
      `ALTER TABLE material_requisitions ADD COLUMN IF NOT EXISTS cs_checked_by UUID`,
      `ALTER TABLE material_requisitions ADD COLUMN IF NOT EXISTS cs_checked_at TIMESTAMPTZ`,
      `ALTER TABLE material_requisitions ADD COLUMN IF NOT EXISTS cs_approved_by UUID`,
      `ALTER TABLE material_requisitions ADD COLUMN IF NOT EXISTS cs_approved_at TIMESTAMPTZ`,
      `ALTER TABLE material_requisitions ADD COLUMN IF NOT EXISTS cs_selected_vendor_id UUID`,
      `DO $$ BEGIN IF to_regclass('public.rfqs') IS NOT NULL THEN ALTER TABLE rfqs ADD COLUMN IF NOT EXISTS delivery_location TEXT; END IF; END $$`,
      `DO $$ BEGIN IF to_regclass('public.rfqs') IS NOT NULL THEN ALTER TABLE rfqs ADD COLUMN IF NOT EXISTS terms TEXT; END IF; END $$`,
      // Add mrs_id to quotations (quotation system now references MRS, not indents)
      `ALTER TABLE quotations ADD COLUMN IF NOT EXISTS mrs_id UUID`,
      // Add mrs_item_id to quotation_items
      `ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS mrs_item_id UUID`,
      // Make unit_rate nullable (it was per-item, not per-header)
      `ALTER TABLE quotations ALTER COLUMN unit_rate DROP NOT NULL`,
      `CREATE TABLE IF NOT EXISTS rfqs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        company_id UUID NOT NULL REFERENCES companies(id),
        mrs_id UUID NOT NULL REFERENCES material_requisitions(id) ON DELETE CASCADE,
        rfq_number VARCHAR(40) UNIQUE,
        subject TEXT,
        due_date DATE,
        remarks TEXT,
        delivery_location TEXT,
        terms TEXT,
        status TEXT DEFAULT 'sent',
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(company_id, mrs_id)
      )`,
      `CREATE TABLE IF NOT EXISTS rfq_vendors (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        rfq_id UUID NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
        vendor_id UUID NOT NULL REFERENCES vendors(id),
        status TEXT DEFAULT 'sent',
        sent_at TIMESTAMPTZ DEFAULT NOW(),
        responded_at TIMESTAMPTZ,
        portal_token TEXT UNIQUE,
        opened_at TIMESTAMPTZ,
        expires_at TIMESTAMPTZ,
        UNIQUE(rfq_id, vendor_id)
      )`,
      `CREATE TABLE IF NOT EXISTS rfq_settings (
        company_id UUID PRIMARY KEY REFERENCES companies(id),
        from_name TEXT DEFAULT 'BCIM Procurement Team',
        reply_to_email TEXT DEFAULT 'bkmanjunath@bcim.in',
        cc_emails TEXT DEFAULT '',
        subject_template TEXT DEFAULT 'RFQ {rfq_no} - {project_name} - {mrs_no}',
        body_template TEXT DEFAULT 'Dear Sir/Madam,\n\nWe request you to submit your best quotation for the below materials.\n\nProject: {project_name}\nMR No: {mrs_no}\nRFQ No: {rfq_no}\nQuotation Due Date: {due_date}\n\nPlease quote item-wise basic rate, GST, delivery period, payment terms, and validity.\n\nRegards,\nProcurement Team\nBCIM Engineering Pvt Ltd',
        default_terms TEXT DEFAULT 'Quote should include GST, delivery period, payment terms, validity, warranty if applicable, transportation/loading/unloading, and all applicable taxes.',
        attach_item_table BOOLEAN DEFAULT true,
        updated_by UUID REFERENCES users(id),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS rfq_mail_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        company_id UUID NOT NULL REFERENCES companies(id),
        rfq_id UUID REFERENCES rfqs(id) ON DELETE CASCADE,
        vendor_id UUID REFERENCES vendors(id),
        email TEXT,
        subject TEXT,
        status TEXT DEFAULT 'pending',
        provider TEXT,
        error TEXT,
        sent_at TIMESTAMPTZ DEFAULT NOW(),
        created_by UUID REFERENCES users(id)
      )`,
    ];
    for (const sql of alters) await query(sql);
  } catch (e) {
    console.warn('[quotation] migration skipped:', e.message);
  }
})();

const RFQ_DEFAULT_SETTINGS = {
  from_name: 'BCIM Procurement Team',
  reply_to_email: 'bkmanjunath@bcim.in',
  cc_emails: '',
  subject_template: 'RFQ {rfq_no} - {project_name} - {mrs_no}',
  body_template: [
    'Dear Sir/Madam,',
    '',
    'We request you to submit your best quotation for the below materials.',
    '',
    'Project: {project_name}',
    'MR No: {mrs_no}',
    'RFQ No: {rfq_no}',
    'Quotation Due Date: {due_date}',
    '',
    'Please quote item-wise basic rate, GST, delivery period, payment terms, and validity.',
    '',
    'Regards,',
    'Procurement Team',
    'BCIM Engineering Pvt Ltd',
  ].join('\n'),
  default_terms: 'Quote should include GST, delivery period, payment terms, validity, warranty if applicable, transportation/loading/unloading, and all applicable taxes.',
  attach_item_table: true,
};

const fillTemplate = (template, vars) =>
  String(template || '').replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? '');

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, ch => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[ch]));

const parseEmails = (value) => String(value || '')
  .split(/[;,]/)
  .map(v => v.trim())
  .filter(Boolean);

let rfqMailSchemaReady = false;
async function ensureRFQMailSchema() {
  if (rfqMailSchemaReady) return;
  await query(`
    CREATE TABLE IF NOT EXISTS rfq_settings (
      company_id UUID PRIMARY KEY REFERENCES companies(id),
      from_name TEXT DEFAULT 'BCIM Procurement Team',
      reply_to_email TEXT DEFAULT 'bkmanjunath@bcim.in',
      cc_emails TEXT DEFAULT '',
      subject_template TEXT DEFAULT 'RFQ {rfq_no} - {project_name} - {mrs_no}',
      body_template TEXT DEFAULT 'Dear Sir/Madam,\n\nWe request you to submit your best quotation for the below materials.\n\nProject: {project_name}\nMR No: {mrs_no}\nRFQ No: {rfq_no}\nQuotation Due Date: {due_date}\n\nPlease quote item-wise basic rate, GST, delivery period, payment terms, and validity.\n\nRegards,\nProcurement Team\nBCIM Engineering Pvt Ltd',
      default_terms TEXT DEFAULT 'Quote should include GST, delivery period, payment terms, validity, warranty if applicable, transportation/loading/unloading, and all applicable taxes.',
      attach_item_table BOOLEAN DEFAULT true,
      updated_by UUID REFERENCES users(id),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS rfq_mail_logs (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      company_id UUID NOT NULL REFERENCES companies(id),
      rfq_id UUID REFERENCES rfqs(id) ON DELETE CASCADE,
      vendor_id UUID REFERENCES vendors(id),
      email TEXT,
      subject TEXT,
      status TEXT DEFAULT 'pending',
      provider TEXT,
      error TEXT,
      sent_at TIMESTAMPTZ DEFAULT NOW(),
      created_by UUID REFERENCES users(id)
    );
    ALTER TABLE rfqs ADD COLUMN IF NOT EXISTS delivery_location TEXT;
    ALTER TABLE rfqs ADD COLUMN IF NOT EXISTS terms TEXT;
    ALTER TABLE rfq_vendors ADD COLUMN IF NOT EXISTS portal_token TEXT UNIQUE;
    ALTER TABLE rfq_vendors ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ;
    ALTER TABLE rfq_vendors ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
  `);
  rfqMailSchemaReady = true;
}

const getFrontendBaseUrl = () =>
  (process.env.PUBLIC_FRONTEND_URL || process.env.FRONTEND_URL || 'http://bcim.ddns.net:3000').replace(/\/$/, '');

const makePortalToken = () => crypto.randomBytes(32).toString('hex');

async function getRFQSettings(companyId) {
  await ensureRFQMailSchema();
  const r = await query('SELECT * FROM rfq_settings WHERE company_id = $1', [companyId]);
  return { ...RFQ_DEFAULT_SETTINGS, ...(r.rows[0] || {}) };
}

function buildRFQMail({ settings, rfq, mrs, vendor, items }) {
  const mrsNo = mrs.serial_no_formatted || mrs.mrs_number || '';
  const vars = {
    rfq_no: rfq.rfq_number || '',
    mrs_no: mrsNo,
    project_name: mrs.project_name || '',
    due_date: rfq.due_date ? new Date(rfq.due_date).toLocaleDateString('en-IN') : 'As per discussion',
    vendor_name: vendor.name || '',
    delivery_location: rfq.delivery_location || '',
    terms: rfq.terms || settings.default_terms || '',
    portal_link: vendor.portal_link || '',
  };
  const subject = fillTemplate(settings.subject_template, vars);
  const bodyText = fillTemplate(settings.body_template, vars);
  const itemRows = items.map((it, idx) => `
    <tr>
      <td style="padding:8px;border:1px solid #d9e2ef;">${idx + 1}</td>
      <td style="padding:8px;border:1px solid #d9e2ef;">${esc(it.material_name)}</td>
      <td style="padding:8px;border:1px solid #d9e2ef;text-align:right;">${esc(it.quantity)}</td>
      <td style="padding:8px;border:1px solid #d9e2ef;">${esc(it.unit)}</td>
    </tr>`).join('');
  const table = settings.attach_item_table ? `
    <table style="border-collapse:collapse;width:100%;font-family:Arial,sans-serif;font-size:13px;margin:14px 0;">
      <thead>
        <tr style="background:#f1f5f9;">
          <th style="padding:8px;border:1px solid #d9e2ef;text-align:left;">Sl</th>
          <th style="padding:8px;border:1px solid #d9e2ef;text-align:left;">Description</th>
          <th style="padding:8px;border:1px solid #d9e2ef;text-align:right;">Qty</th>
          <th style="padding:8px;border:1px solid #d9e2ef;text-align:left;">Unit</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>` : '';
  const html = `
    <div style="font-family:Arial,sans-serif;font-size:14px;color:#0f172a;line-height:1.55;">
      ${esc(bodyText).replace(/\n/g, '<br>')}
      ${table}
      ${rfq.delivery_location ? `<p><strong>Delivery Location:</strong> ${esc(rfq.delivery_location)}</p>` : ''}
      ${(rfq.terms || settings.default_terms) ? `<p><strong>Terms:</strong><br>${esc(rfq.terms || settings.default_terms).replace(/\n/g, '<br>')}</p>` : ''}
      <p style="font-size:12px;color:#64748b;margin-top:18px;">Please reply to ${esc(settings.reply_to_email || 'bkmanjunath@bcim.in')} with your quotation.</p>
      ${vendor.portal_link ? `<p style="margin-top:16px;"><a href="${esc(vendor.portal_link)}" style="background:#1d4ed8;color:#fff;text-decoration:none;padding:10px 14px;border-radius:8px;display:inline-block;">Submit Quotation Online</a></p>` : ''}
    </div>`;
  const text = `${bodyText}\n\nItems:\n${items.map((it, i) => `${i + 1}. ${it.material_name} - ${it.quantity} ${it.unit}`).join('\n')}\n\nDelivery Location: ${rfq.delivery_location || '-'}\nTerms: ${rfq.terms || settings.default_terms || '-'}\n\nSubmit Online: ${vendor.portal_link || '-'}`;
  return { subject, html, text };
}

// GET /quotations/rfq-settings
router.get('/rfq-settings', authenticate, async (req, res) => {
  try {
    res.json({ data: await getRFQSettings(req.user.company_id) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /quotations/rfq-settings
router.patch('/rfq-settings', authenticate, async (req, res) => {
  try {
    await ensureRFQMailSchema();
    const data = { ...RFQ_DEFAULT_SETTINGS, ...req.body };
    const r = await query(
      `INSERT INTO rfq_settings (
         company_id, from_name, reply_to_email, cc_emails, subject_template,
         body_template, default_terms, attach_item_table, updated_by, updated_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())
       ON CONFLICT (company_id) DO UPDATE SET
         from_name = EXCLUDED.from_name,
         reply_to_email = EXCLUDED.reply_to_email,
         cc_emails = EXCLUDED.cc_emails,
         subject_template = EXCLUDED.subject_template,
         body_template = EXCLUDED.body_template,
         default_terms = EXCLUDED.default_terms,
         attach_item_table = EXCLUDED.attach_item_table,
         updated_by = EXCLUDED.updated_by,
         updated_at = NOW()
       RETURNING *`,
      [
        req.user.company_id,
        data.from_name,
        data.reply_to_email,
        data.cc_emails,
        data.subject_template,
        data.body_template,
        data.default_terms,
        Boolean(data.attach_item_table),
        req.user.id,
      ]
    );
    res.json({ data: r.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /quotations/vendor-rfq/:token — public vendor portal RFQ view
router.get('/vendor-rfq/:token', async (req, res) => {
  try {
    await ensureRFQMailSchema();
    const token = String(req.params.token || '').trim();
    if (!token) return res.status(400).json({ error: 'Invalid RFQ link' });

    const r = await query(
      `SELECT rv.*, r.rfq_number, r.subject, r.due_date, r.remarks, r.delivery_location, r.terms,
              r.company_id, r.mrs_id, v.name AS vendor_name, v.email AS vendor_email,
              mr.mrs_number, mr.serial_no_formatted, mr.required_by, p.name AS project_name
       FROM rfq_vendors rv
       JOIN rfqs r ON r.id = rv.rfq_id
       JOIN vendors v ON v.id = rv.vendor_id
       JOIN material_requisitions mr ON mr.id = r.mrs_id
       JOIN projects p ON p.id = mr.project_id
       WHERE rv.portal_token = $1
       LIMIT 1`,
      [token]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'RFQ link not found' });
    const row = r.rows[0];
    if (row.expires_at && new Date(row.expires_at) < new Date()) {
      return res.status(410).json({ error: 'This RFQ link has expired' });
    }

    await query('UPDATE rfq_vendors SET opened_at = COALESCE(opened_at, NOW()), status = CASE WHEN status = $2 THEN $3 ELSE status END WHERE id = $1', [row.id, 'sent', 'opened']);

    const items = await query(
      `SELECT id AS mrs_item_id, material_name, quantity, unit
       FROM mrs_items WHERE mrs_id = $1 ORDER BY sort_order`,
      [row.mrs_id]
    );
    const existing = await query(
      `SELECT q.id, q.delivery_days, q.payment_terms, q.notes,
              COALESCE(json_agg(json_build_object(
                'mrs_item_id', qi.mrs_item_id,
                'rate', qi.rate,
                'discount_percent', qi.discount_percent,
                'gst_rate', qi.gst_rate,
                'remarks', qi.remarks
              )) FILTER (WHERE qi.id IS NOT NULL), '[]'::json) AS items
       FROM quotations q
       LEFT JOIN quotation_items qi ON qi.quotation_id = q.id
       WHERE q.mrs_id = $1 AND q.vendor_id = $2 AND q.company_id = $3
       GROUP BY q.id
       LIMIT 1`,
      [row.mrs_id, row.vendor_id, row.company_id]
    );

    res.json({
      data: {
        rfq: {
          rfq_number: row.rfq_number,
          subject: row.subject,
          due_date: row.due_date,
          remarks: row.remarks,
          delivery_location: row.delivery_location,
          terms: row.terms,
          status: row.status,
        },
        mrs: {
          id: row.mrs_id,
          mrs_number: row.serial_no_formatted || row.mrs_number,
          project_name: row.project_name,
          required_by: row.required_by,
        },
        vendor: {
          id: row.vendor_id,
          name: row.vendor_name,
          email: row.vendor_email,
        },
        items: items.rows,
        existing: existing.rows[0] || null,
      },
    });
  } catch (err) {
    console.error('Vendor RFQ view error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /quotations/vendor-rfq/:token — public vendor quotation submission
router.post('/vendor-rfq/:token', async (req, res) => {
  try {
    await ensureRFQMailSchema();
    const token = String(req.params.token || '').trim();
    const { delivery_days, payment_terms, notes, items } = req.body;
    if (!token) return res.status(400).json({ error: 'Invalid RFQ link' });
    if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: 'Line items are required' });
    if (items.some(it => !it.mrs_item_id || it.rate === '' || it.rate === null || Number.isNaN(Number(it.rate)))) {
      return res.status(400).json({ error: 'Rate is required for every item' });
    }

    const link = await query(
      `SELECT rv.*, r.company_id, r.mrs_id
       FROM rfq_vendors rv
       JOIN rfqs r ON r.id = rv.rfq_id
       WHERE rv.portal_token = $1
       LIMIT 1`,
      [token]
    );
    if (!link.rows.length) return res.status(404).json({ error: 'RFQ link not found' });
    const row = link.rows[0];
    if (row.expires_at && new Date(row.expires_at) < new Date()) {
      return res.status(410).json({ error: 'This RFQ link has expired' });
    }

    const result = await withTransaction(async (client) => {
      let q = await client.query(
        `SELECT id FROM quotations WHERE company_id = $1 AND mrs_id = $2 AND vendor_id = $3 LIMIT 1`,
        [row.company_id, row.mrs_id, row.vendor_id]
      );
      let quoteId;
      if (q.rows.length) {
        quoteId = q.rows[0].id;
        await client.query(
          `UPDATE quotations
           SET delivery_days = $1, payment_terms = $2, notes = $3
           WHERE id = $4`,
          [delivery_days || null, payment_terms || null, notes || null, quoteId]
        );
        await client.query('DELETE FROM quotation_items WHERE quotation_id = $1', [quoteId]);
      } else {
        // Advisory lock serializes concurrent vendor submissions for the same company
        // so COUNT(*)+1 is always consistent within the transaction.
        await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`quotation_seq_${row.company_id}`]);
        const yr = new Date().getFullYear();
        const countRes = await client.query('SELECT COUNT(*) FROM quotations WHERE company_id = $1', [row.company_id]);
        const seq = String(parseInt(countRes.rows[0].count, 10) + 1).padStart(3, '0');
        const quotation_number = `QT/${yr}/${seq}`;
        q = await client.query(
          `INSERT INTO quotations (company_id, mrs_id, vendor_id, quotation_number, delivery_days, payment_terms, notes)
           VALUES ($1,$2,$3,$4,$5,$6,$7)
           RETURNING id, quotation_number`,
          [row.company_id, row.mrs_id, row.vendor_id, quotation_number, delivery_days || null, payment_terms || null, notes || null]
        );
        quoteId = q.rows[0].id;
      }

      for (const it of items) {
        await client.query(
          `INSERT INTO quotation_items (quotation_id, mrs_item_id, rate, discount_percent, gst_rate, remarks)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [quoteId, it.mrs_item_id, it.rate, it.discount_percent || 0, it.gst_rate || 18, it.remarks || null]
        );
      }

      await client.query(
        `UPDATE rfq_vendors SET status = 'submitted', responded_at = NOW() WHERE id = $1`,
        [row.id]
      );
      await client.query(
        `UPDATE material_requisitions
         SET cs_status = 'pending_verification', updated_at = NOW()
         WHERE id = $1 AND COALESCE(cs_status, 'pending_entry') IN ('pending_entry', 'rfq_sent', 'pending_verification')`,
        [row.mrs_id]
      );
      return q.rows[0] || { id: quoteId };
    });

    res.status(201).json({ data: result, message: 'Quotation submitted successfully' });
  } catch (err) {
    console.error('Vendor RFQ submit error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.use(authenticate);
router.use(loadProjectScope);

function applyMrsProjectScope(req, conditions, params, alias = 'mr') {
  if (req.isGlobalRole) return;
  const allowed = req.allowedProjectIds || [];
  if (!allowed.length) {
    conditions.push('FALSE');
    return;
  }
  params.push(allowed);
  conditions.push(`${alias}.project_id = ANY($${params.length}::uuid[])`);
}

async function getAccessibleMrs(req, mrsId) {
  const { rows } = await query(
    `SELECT mr.id, mr.project_id, p.company_id
     FROM material_requisitions mr
     JOIN projects p ON p.id = mr.project_id
     WHERE mr.id = $1 AND p.company_id = $2`,
    [mrsId, req.user.company_id]
  );
  const mrs = rows[0];
  if (!mrs) {
    const err = new Error('MRS not found or access denied');
    err.statusCode = 404;
    throw err;
  }
  if (!userCanAccessProject(req, mrs.project_id)) {
    const err = new Error('Access denied for this project.');
    err.statusCode = 403;
    throw err;
  }
  return mrs;
}

// GET /quotations?mrs_id=
router.get('/', async (req, res) => {
  try {
    const { mrs_id } = req.query;
    const conditions = ['q.company_id = $1'];
    const params = [req.user.company_id];
    applyMrsProjectScope(req, conditions, params, 'mr');
    let sql = `
      SELECT q.*, v.name AS vendor_name, v.contact_person, mr.mrs_number, mr.serial_no_formatted
      FROM quotations q
      LEFT JOIN vendors v ON q.vendor_id = v.id
      LEFT JOIN material_requisitions mr ON q.mrs_id = mr.id
      WHERE ${conditions.join(' AND ')}
    `;
    if (mrs_id) {
      await getAccessibleMrs(req, mrs_id);
      params.push(mrs_id);
      sql += ` AND q.mrs_id = $${params.length}`;
    }
    sql += ' ORDER BY q.created_at DESC';
    const r = await query(sql, params);
    res.json({ data: r.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /quotations/rfqs - RFQs issued for material requisitions
router.get('/rfqs', async (req, res) => {
  try {
    const conditions = ['r.company_id = $1'];
    const params = [req.user.company_id];
    applyMrsProjectScope(req, conditions, params, 'mr');
    const r = await query(
      `SELECT r.*,
              mr.mrs_number,
              mr.serial_no_formatted,
              mr.cs_status,
              p.name AS project_name,
              COUNT(DISTINCT rv.vendor_id) AS vendor_count,
              COUNT(DISTINCT q.vendor_id) AS quote_count
       FROM rfqs r
       JOIN material_requisitions mr ON mr.id = r.mrs_id
       JOIN projects p ON p.id = mr.project_id
       LEFT JOIN rfq_vendors rv ON rv.rfq_id = r.id
       LEFT JOIN quotations q ON q.mrs_id = r.mrs_id AND q.company_id = r.company_id
       WHERE ${conditions.join(' AND ')}
       GROUP BY r.id, mr.id, p.id
       ORDER BY r.created_at DESC`,
      params
    );
    res.json({ data: r.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /quotations/rfqs/:mrsId - RFQ details and invited vendors for one MRS
router.get('/rfqs/:mrsId', async (req, res) => {
  try {
    const { mrsId } = req.params;
    await getAccessibleMrs(req, mrsId);
    const r = await query(
      `SELECT r.*,
              COALESCE(
                json_agg(
                  json_build_object(
                    'vendor_id', v.id,
                    'vendor_name', v.name,
                    'contact_person', v.contact_person,
                    'email', v.email,
                    'status', rv.status,
                    'sent_at', rv.sent_at,
                    'responded_at', rv.responded_at
                  )
                  ORDER BY v.name
                ) FILTER (WHERE v.id IS NOT NULL),
                '[]'::json
              ) AS vendors
       FROM rfqs r
       LEFT JOIN rfq_vendors rv ON rv.rfq_id = r.id
       LEFT JOIN vendors v ON v.id = rv.vendor_id
       WHERE r.mrs_id = $1 AND r.company_id = $2
       GROUP BY r.id
       LIMIT 1`,
      [mrsId, req.user.company_id]
    );
    const rfq = r.rows[0] || null;
    if (rfq) {
      await ensureRFQMailSchema();
      const logs = await query(
        `SELECT l.*, v.name AS vendor_name
         FROM rfq_mail_logs l
         LEFT JOIN vendors v ON v.id = l.vendor_id
         WHERE l.rfq_id = $1
         ORDER BY l.sent_at DESC`,
        [rfq.id]
      );
      rfq.mail_logs = logs.rows;
    }
    res.json({ data: rfq });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /quotations/rfqs - issue/update RFQ to selected vendors
router.post('/rfqs', async (req, res) => {
  try {
    await ensureRFQMailSchema();
    const { mrs_id, vendor_ids, due_date, subject, remarks, delivery_location, terms, send_email = true } = req.body;
    const selectedVendors = Array.isArray(vendor_ids) ? [...new Set(vendor_ids.filter(Boolean))] : [];

    if (!mrs_id || !selectedVendors.length) {
      return res.status(400).json({ error: 'mrs_id and at least one vendor are required' });
    }

    const mrsCheck = await query(
      `SELECT mr.id, mr.project_id, mr.serial_no_formatted, mr.mrs_number, p.name AS project_name
       FROM material_requisitions mr
       JOIN projects p ON mr.project_id = p.id
       WHERE mr.id = $1 AND p.company_id = $2`,
      [mrs_id, req.user.company_id]
    );
    if (!mrsCheck.rows.length) {
      return res.status(404).json({ error: 'MRS not found or access denied' });
    }
    if (!userCanAccessProject(req, mrsCheck.rows[0].project_id)) {
      return res.status(403).json({ error: 'Access denied for this project.' });
    }
    const mrs = mrsCheck.rows[0];

    const result = await withTransaction(async (client) => {
      const vendorCheck = await client.query(
        `SELECT id, name, email FROM vendors WHERE company_id = $1 AND id = ANY($2::uuid[])`,
        [req.user.company_id, selectedVendors]
      );
      if (vendorCheck.rows.length !== selectedVendors.length) {
        throw new Error('One or more selected vendors are invalid');
      }
      if (send_email) {
        const missing = vendorCheck.rows.filter(v => !String(v.email || '').trim());
        if (missing.length) {
          throw new Error(`Vendor email missing: ${missing.map(v => v.name).join(', ')}`);
        }
      }

      let rfq = await client.query(
        `SELECT * FROM rfqs WHERE mrs_id = $1 AND company_id = $2 LIMIT 1`,
        [mrs_id, req.user.company_id]
      );

      if (!rfq.rows.length) {
        const yr = new Date().getFullYear();
        const countRes = await client.query(
          'SELECT COUNT(*) FROM rfqs WHERE company_id = $1',
          [req.user.company_id]
        );
        const seq = String(parseInt(countRes.rows[0].count, 10) + 1).padStart(3, '0');
        const rfqNumber = `RFQ/${yr}/${seq}`;

        rfq = await client.query(
          `INSERT INTO rfqs (company_id, mrs_id, rfq_number, subject, due_date, remarks, delivery_location, terms, status, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'sent', $9)
           RETURNING *`,
          [req.user.company_id, mrs_id, rfqNumber, subject || null, due_date || null, remarks || null, delivery_location || null, terms || null, req.user.id]
        );
      } else {
        rfq = await client.query(
          `UPDATE rfqs
           SET subject = $1, due_date = $2, remarks = $3, delivery_location = $4, terms = $5, status = 'sent', updated_at = NOW()
           WHERE id = $6 AND company_id = $7
           RETURNING *`,
          [subject || null, due_date || null, remarks || null, delivery_location || null, terms || null, rfq.rows[0].id, req.user.company_id]
        );
      }

      const rfqId = rfq.rows[0].id;
      const existingVendorRows = await client.query(
        `SELECT vendor_id, status, portal_token
         FROM rfq_vendors
         WHERE rfq_id = $1`,
        [rfqId]
      );
      const existingVendorMap = new Map(existingVendorRows.rows.map(row => [row.vendor_id, row]));
      for (const vendorId of selectedVendors) {
        const portalToken = makePortalToken();
        const expiresAt = due_date
          ? new Date(`${due_date}T23:59:59+05:30`)
          : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
        await client.query(
          `INSERT INTO rfq_vendors (rfq_id, vendor_id, status, portal_token, expires_at)
           VALUES ($1, $2, 'sent', $3, $4::timestamptz)
           ON CONFLICT (rfq_id, vendor_id)
           DO UPDATE SET
             status = CASE
               WHEN rfq_vendors.status = 'submitted' THEN rfq_vendors.status
               ELSE EXCLUDED.status
             END,
             sent_at = CASE
               WHEN rfq_vendors.status = 'submitted' THEN rfq_vendors.sent_at
               ELSE NOW()
             END,
             portal_token = COALESCE(rfq_vendors.portal_token, EXCLUDED.portal_token),
             expires_at = EXCLUDED.expires_at`,
          [rfqId, vendorId, portalToken, expiresAt]
        );
      }

      await client.query(
        `UPDATE material_requisitions
         SET cs_status = 'rfq_sent', updated_at = NOW()
         WHERE id = $1
           AND COALESCE(cs_status, 'pending_entry') IN ('pending_entry', 'rfq_sent')`,
        [mrs_id]
      );

      const portalRows = await client.query(
        `SELECT vendor_id, portal_token FROM rfq_vendors WHERE rfq_id = $1`,
        [rfqId]
      );
      const tokenByVendor = new Map(portalRows.rows.map(r => [r.vendor_id, r.portal_token]));
      return {
        rfq: rfq.rows[0],
        vendors: vendorCheck.rows.map(v => ({
          ...v,
          portal_link: `${getFrontendBaseUrl()}/vendor-rfq/${tokenByVendor.get(v.id)}`,
          should_send_email: existingVendorMap.get(v.id)?.status !== 'submitted',
        })),
      };
    });

    const rfq = result.rfq;
    const mailLogs = [];
    if (send_email) {
      const settings = await getRFQSettings(req.user.company_id);
      const itemsRes = await query(
        `SELECT material_name, quantity, unit FROM mrs_items WHERE mrs_id = $1 ORDER BY sort_order`,
        [mrs_id]
      );
      const ccEmails = parseEmails(settings.cc_emails);
      for (const vendor of result.vendors.filter(v => v.should_send_email)) {
        const mail = buildRFQMail({ settings, rfq, mrs, vendor, items: itemsRes.rows });
        // Send to vendor directly (includes vendor-specific portal link)
        const mailResult = await sendMail({ to: [vendor.email], ...mail });
        // Send CC notification without the vendor portal link so internal staff
        // don't receive a token that lets them submit quotes on the vendor's behalf
        if (ccEmails.length) {
          const ccMail = buildRFQMail({ settings, rfq, mrs, vendor: { ...vendor, portal_link: '' }, items: itemsRes.rows });
          sendMail({ to: ccEmails, ...ccMail }).catch(e => console.warn('[mail] RFQ CC send failed:', e.message));
        }
        const vendorResult = mailResult.results?.find(x => String(x.to).toLowerCase() === String(vendor.email).toLowerCase());
        const status = vendorResult?.sent ? 'sent' : 'failed';
        const log = await query(
          `INSERT INTO rfq_mail_logs (company_id, rfq_id, vendor_id, email, subject, status, provider, error, created_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
           RETURNING *`,
          [
            req.user.company_id,
            rfq.id,
            vendor.id,
            vendor.email,
            mail.subject,
            status,
            vendorResult?.provider || null,
            vendorResult?.reason || mailResult.reason || null,
            req.user.id,
          ]
        );
        await query(
          `UPDATE rfq_vendors
           SET status = $1, sent_at = NOW()
           WHERE rfq_id = $2
             AND vendor_id = $3
             AND status <> 'submitted'`,
          [status, rfq.id, vendor.id]
        );
        mailLogs.push(log.rows[0]);
      }
    }

    res.status(201).json({ data: { ...rfq, mail_logs: mailLogs } });
  } catch (err) {
    console.error('RFQ create error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /quotations/comparison/:mrsId
router.get('/comparison/:mrsId', async (req, res) => {
  try {
    const { mrsId: rawId } = req.params;

    const resolvedR = await query(
      `SELECT COALESCE(
          (SELECT mr.id FROM material_requisitions mr
           JOIN projects p ON p.id = mr.project_id
           WHERE mr.id = $1::uuid AND p.company_id = $2
           LIMIT 1),
          (SELECT r.mrs_id FROM rfqs r
           WHERE r.id = $1::uuid AND r.company_id = $2
           LIMIT 1),
          (SELECT q.mrs_id FROM quotations q
           WHERE q.id = $1::uuid AND q.company_id = $2
           LIMIT 1)
        ) AS mrs_id`,
      [rawId, req.user.company_id]
    );
    let mrsId = resolvedR.rows[0]?.mrs_id;
    if (!mrsId) return res.status(404).json({ error: 'MRS / RFQ / quotation not found for comparison' });
    await getAccessibleMrs(req, mrsId);

    const requestedQuoteCount = await query(
      `SELECT COUNT(*)::int AS count FROM quotations WHERE mrs_id = $1 AND company_id = $2`,
      [mrsId, req.user.company_id]
    );
    if (!requestedQuoteCount.rows[0]?.count) {
      const latestConditions = [
        'q.company_id = $1',
        "COALESCE(mr.cs_status, 'pending_entry') IN ('pending_verification', 'pending_finance', 'pending_approval', 'approved')",
      ];
      const latestParams = [req.user.company_id];
      applyMrsProjectScope(req, latestConditions, latestParams, 'mr');
      const latestSubmitted = await query(
        `SELECT q.mrs_id
         FROM quotations q
         JOIN material_requisitions mr ON mr.id = q.mrs_id
         WHERE ${latestConditions.join(' AND ')}
         ORDER BY q.created_at DESC
         LIMIT 1`,
        latestParams
      );
      if (latestSubmitted.rows[0]?.mrs_id) {
        mrsId = latestSubmitted.rows[0].mrs_id;
        await getAccessibleMrs(req, mrsId);
      }
    }

    // 1. Get MRS header + project info
    const mrsR = await query(
      `SELECT mr.*, p.name AS project_name, p.project_code, u.name AS raised_by_name
       FROM material_requisitions mr
       JOIN projects p ON mr.project_id = p.id
       LEFT JOIN users u ON mr.raised_by = u.id
       WHERE mr.id = $1 AND p.company_id = $2`,
      [mrsId, req.user.company_id]
    );
    if (!mrsR.rows.length) return res.status(404).json({ error: 'MRS not found' });
    const mrs = mrsR.rows[0];
    if (!userCanAccessProject(req, mrs.project_id)) {
      return res.status(403).json({ error: 'Access denied for this project.' });
    }

    // 2. Get MRS items
    const itemsR = await query(
      `SELECT * FROM mrs_items WHERE mrs_id = $1 ORDER BY sort_order`,
      [mrsId]
    );
    const items = itemsR.rows;

    // 3. Get all quotations for this MRS (LEFT JOIN so missing vendor rows still appear)
    const quotesR = await query(
      `SELECT q.*,
              COALESCE(v.name, 'Unknown Vendor') AS vendor_name,
              COALESCE(v.id,   q.vendor_id)      AS vendor_id
       FROM quotations q
       LEFT JOIN vendors v ON q.vendor_id = v.id
       WHERE q.mrs_id = $1 AND q.company_id = $2
       ORDER BY q.created_at`,
      [mrsId, req.user.company_id]
    );
    const quotes = quotesR.rows;

    // 4. For each quote, get its items (linked by mrs_item_id)
    const matrix = [];
    for (const q of quotes) {
      const qItemsR = await query(
        `SELECT * FROM quotation_items WHERE quotation_id = $1`,
        [q.id]
      );
      q.items = qItemsR.rows;
      matrix.push(q);
    }

    const qtyByItem = new Map(items.map(it => [it.id, parseFloat(it.quantity || 0)]));
    const vendorSummary = matrix.map(q => {
      let basic_total = 0;
      let discount_total = 0;
      let gst_total = 0;
      for (const it of q.items || []) {
        const qty = qtyByItem.get(it.mrs_item_id) || 0;
        const gross = qty * parseFloat(it.rate || 0);
        const discount = gross * (parseFloat(it.discount_percent || 0) / 100);
        const basic = gross - discount;
        const gst = basic * (parseFloat(it.gst_rate || 0) / 100);
        basic_total += basic;
        discount_total += discount;
        gst_total += gst;
      }
      return {
        vendor_id: q.vendor_id,
        vendor_name: q.vendor_name,
        quotation_id: q.id,
        quotation_number: q.quotation_number,
        delivery_days: q.delivery_days,
        payment_terms: q.payment_terms,
        basic_total,
        discount_total,
        gst_total,
        grand_total: basic_total + gst_total,
      };
    }).sort((a, b) => {
      if (!a.grand_total) return 1;
      if (!b.grand_total) return -1;
      return a.grand_total - b.grand_total;
    }).map((row, idx) => ({ ...row, rank: idx + 1, level: `L${idx + 1}` }));

    const itemL1 = items.map(item => {
      let winner = null;
      for (const q of matrix) {
        const qi = (q.items || []).find(x => x.mrs_item_id === item.id);
        const rate = parseFloat(qi?.rate || 0);
        if (rate > 0 && (!winner || rate < winner.rate)) {
          winner = {
            item_id: item.id,
            vendor_id: q.vendor_id,
            vendor_name: q.vendor_name,
            rate,
          };
        }
      }
      return winner;
    }).filter(Boolean);

    // 5. Check if a PO was already raised for this MRS, only on schemas that
    // have the newer purchase_orders.mrs_id link.
    let existingPO = null;
    const poMrsColumn = await query(
      `SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'purchase_orders'
         AND column_name = 'mrs_id'
       LIMIT 1`
    );
    if (poMrsColumn.rows.length) {
      const poR = await query(
        `SELECT id, po_number, serial_no_formatted, status, created_at
         FROM purchase_orders
         WHERE mrs_id = $1
         ORDER BY created_at DESC
         LIMIT 1`,
        [mrsId]
      );
      existingPO = poR.rows[0] || null;
    }

    res.json({
      data: {
        indent: { ...mrs, indent_number: mrs.serial_no_formatted || mrs.mrs_number },
        items,
        vendors: matrix,
        vendorSummary,
        recommendedVendor: vendorSummary[0] || null,
        itemL1,
        existingPO,
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /quotations — register a vendor quote for an MRS
router.post('/', async (req, res) => {
  try {
    const { mrs_id, vendor_id, delivery_days, payment_terms, notes, items } = req.body;

    if (!mrs_id || !vendor_id || !items?.length) {
      return res.status(400).json({ error: 'mrs_id, vendor_id and items are required' });
    }

    // Verify MRS belongs to this company
    const mrsCheck = await query(
      `SELECT mr.id, mr.project_id FROM material_requisitions mr
       JOIN projects p ON mr.project_id = p.id
       WHERE mr.id = $1 AND p.company_id = $2`,
      [mrs_id, req.user.company_id]
    );
    if (!mrsCheck.rows.length) {
      return res.status(404).json({ error: 'MRS not found or access denied' });
    }
    if (!userCanAccessProject(req, mrsCheck.rows[0].project_id)) {
      return res.status(403).json({ error: 'Access denied for this project.' });
    }

    const result = await withTransaction(async (client) => {
      // Generate quotation number
      const yr = new Date().getFullYear();
      const countRes = await client.query(
        'SELECT COUNT(*) FROM quotations WHERE company_id = $1',
        [req.user.company_id]
      );
      const seq = String(parseInt(countRes.rows[0].count) + 1).padStart(3, '0');
      const quotation_number = `QT/${yr}/${seq}`;

      // Insert quotation header
      const hRes = await client.query(
        `INSERT INTO quotations (company_id, mrs_id, vendor_id, quotation_number, delivery_days, payment_terms, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [req.user.company_id, mrs_id, vendor_id, quotation_number, delivery_days, payment_terms, notes]
      );
      const qId = hRes.rows[0].id;

      // Insert quotation items
      for (const it of items) {
        await client.query(
          `INSERT INTO quotation_items (quotation_id, mrs_item_id, rate, discount_percent, gst_rate, remarks)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [qId, it.mrs_item_id, it.rate, it.discount_percent || 0, it.gst_rate || 18, it.remarks]
        );
      }

      // Advance MRS cs_status from pending_entry → pending_verification
      await client.query(
        `UPDATE material_requisitions
         SET cs_status = 'pending_verification', updated_at = NOW()
         WHERE id = $1
           AND COALESCE(cs_status, 'pending_entry') IN ('pending_entry', 'rfq_sent')`,
        [mrs_id]
      );

      return hRes.rows[0];
    });

    res.status(201).json({ data: result });
  } catch (err) {
    console.error('Quotation create error:', err);
    res.status(500).json({ error: err.message });
  }
});

// CS Approval Stages — all update material_requisitions.cs_status
router.patch('/comparison/:mrsId/verify', async (req, res) => {
  try {
    await getAccessibleMrs(req, req.params.mrsId);
    const r = await query(
      `UPDATE material_requisitions
       SET cs_status = 'pending_finance', cs_verified_by = $1, cs_verified_at = NOW(), updated_at = NOW()
       WHERE id = $2 AND cs_status = 'pending_verification'
       RETURNING id`,
      [req.user.id, req.params.mrsId]
    );
    if (!r.rows.length) return res.status(400).json({ error: 'Invalid status for verify' });
    res.json({ message: 'CS Verification completed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/comparison/:mrsId/check', async (req, res) => {
  try {
    await getAccessibleMrs(req, req.params.mrsId);
    const r = await query(
      `UPDATE material_requisitions
       SET cs_status = 'pending_approval', cs_checked_by = $1, cs_checked_at = NOW(), updated_at = NOW()
       WHERE id = $2 AND cs_status = 'pending_finance'
       RETURNING id`,
      [req.user.id, req.params.mrsId]
    );
    if (!r.rows.length) return res.status(400).json({ error: 'Invalid status for check' });
    res.json({ message: 'CS Finance check completed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/comparison/:mrsId/approve', async (req, res) => {
  try {
    const { selected_vendor_id } = req.body;
    if (!selected_vendor_id) return res.status(400).json({ error: 'Winning vendor selection required' });
    await getAccessibleMrs(req, req.params.mrsId);

    await withTransaction(async (client) => {
      const r = await client.query(
        `UPDATE material_requisitions
         SET cs_status = 'approved', cs_approved_by = $1, cs_approved_at = NOW(),
             cs_selected_vendor_id = $2, updated_at = NOW()
         WHERE id = $3 AND cs_status = 'pending_approval'
         RETURNING id`,
        [req.user.id, selected_vendor_id, req.params.mrsId]
      );
      if (!r.rows.length) throw new Error('Invalid status for MD approval');

      // Mark selected quotation
      await client.query(
        `UPDATE quotations SET is_selected = true  WHERE mrs_id = $1 AND vendor_id = $2`,
        [req.params.mrsId, selected_vendor_id]
      );
      await client.query(
        `UPDATE quotations SET is_selected = false WHERE mrs_id = $1 AND vendor_id != $2`,
        [req.params.mrsId, selected_vendor_id]
      );
    });

    res.json({ message: 'CS Approved and Vendor Selected' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
