const cron = require('node-cron');
const logger = require('./logger');
const { query } = require('../config/database');
const { sendMail } = require('../services/mail.service');
const { getVendorLiabilitySummary } = require('../services/tqsLiability.service');

const LINK = '/tqs/liability-register';
const TYPE = 'liability_aging';
const TARGET_ROLES = [
  'super_admin',
  'admin',
  'accounts_manager',
  'finance_manager',
  'procurement_manager',
];

const inr = (value) => Math.round(Number(value || 0)).toLocaleString('en-IN');

const parseEmails = (value) =>
  String(value || '')
    .split(/[;,]/)
    .map(v => v.trim())
    .filter(Boolean);

const getFrontendUrl = () =>
  (process.env.PUBLIC_FRONTEND_URL || process.env.FRONTEND_URL || 'http://bcim.ddns.net:3000').replace(/\/$/, '');

const getAlertEmails = async (companyId) => {
  const envEmails = parseEmails(
    process.env.LIABILITY_ALERT_EMAILS ||
    process.env.ALERT_EMAILS ||
    process.env.PO_ALERT_EMAILS ||
    'bkmanjunath@bcim.in'
  );
  const excluded = new Set(parseEmails(
    process.env.LIABILITY_ALERT_EXCLUDE_EMAILS ||
    process.env.ALERT_EXCLUDE_EMAILS ||
    process.env.PO_ALERT_EXCLUDE_EMAILS ||
    ''
  ).map(email => email.toLowerCase()));

  const { rows } = await query(
    `SELECT DISTINCT email
     FROM users
     WHERE company_id = $1
       AND is_active = TRUE
       AND email IS NOT NULL
       AND role = ANY($2::text[])`,
    [companyId, TARGET_ROLES]
  ).catch(() => ({ rows: [] }));

  return [...new Set([...envEmails, ...rows.map(r => r.email).filter(Boolean)])]
    .filter(email => !excluded.has(String(email).toLowerCase()));
};

const buildMail = ({ companyName, over90Rows, totals }) => {
  const topRows = over90Rows
    .slice(0, 12)
    .map(row => `
      <tr>
        <td style="padding:8px 10px;border:1px solid #e2e8f0">${row.vendor_name}</td>
        <td style="padding:8px 10px;border:1px solid #e2e8f0;text-align:right">Rs ${inr(row.payable_90_plus)}</td>
        <td style="padding:8px 10px;border:1px solid #e2e8f0;text-align:right">${Number(row.unpaid_bill_count || 0)}</td>
        <td style="padding:8px 10px;border:1px solid #e2e8f0">${row.last_activity_date || '-'}</td>
      </tr>
    `)
    .join('');

  const subject = `Liability Aging Alert - ${over90Rows.length} vendor(s) over 90 days`;
  const text = [
    `Liability Aging Alert - ${companyName}`,
    '',
    `${over90Rows.length} vendor(s) have payable balance over 90 days.`,
    `90+ days payable: Rs ${inr(totals.over90)}`,
    `60+ days payable: Rs ${inr(totals.over60)}`,
    `Unpaid bill count: ${totals.unpaidBills}`,
    '',
    `Open: ${getFrontendUrl()}${LINK}`,
  ].join('\n');

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:760px;margin:0 auto;color:#0f172a">
      <div style="background:#991b1b;color:#fff;padding:18px 24px;border-radius:8px 8px 0 0">
        <h2 style="margin:0;font-size:20px">Liability Aging Alert</h2>
        <p style="margin:4px 0 0;color:#fecaca">${companyName}</p>
      </div>
      <div style="padding:22px 24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;background:#fff">
        <p style="margin-top:0;line-height:1.5">
          ${over90Rows.length} vendor(s) have payable balance pending for more than 90 days.
        </p>
        <table style="width:100%;border-collapse:collapse;margin:14px 0;font-size:13px">
          <tr>
            <td style="padding:10px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:700">90+ Days Payable</td>
            <td style="padding:10px;border:1px solid #e2e8f0;font-weight:800;color:#dc2626">Rs ${inr(totals.over90)}</td>
            <td style="padding:10px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:700">60+ Days Payable</td>
            <td style="padding:10px;border:1px solid #e2e8f0;font-weight:800;color:#ea580c">Rs ${inr(totals.over60)}</td>
          </tr>
          <tr>
            <td style="padding:10px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:700">Unpaid Bills</td>
            <td style="padding:10px;border:1px solid #e2e8f0;font-weight:800">${totals.unpaidBills}</td>
            <td style="padding:10px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:700">Report Date</td>
            <td style="padding:10px;border:1px solid #e2e8f0;font-weight:800">${new Date().toLocaleDateString('en-IN')}</td>
          </tr>
        </table>
        <table style="width:100%;border-collapse:collapse;margin-top:16px;font-size:12px">
          <thead>
            <tr>
              <th style="padding:8px 10px;border:1px solid #e2e8f0;background:#f8fafc;text-align:left">Vendor</th>
              <th style="padding:8px 10px;border:1px solid #e2e8f0;background:#f8fafc;text-align:right">90+ Amount</th>
              <th style="padding:8px 10px;border:1px solid #e2e8f0;background:#f8fafc;text-align:right">Unpaid Bills</th>
              <th style="padding:8px 10px;border:1px solid #e2e8f0;background:#f8fafc;text-align:left">Last Activity</th>
            </tr>
          </thead>
          <tbody>${topRows}</tbody>
        </table>
        <p style="text-align:center;margin:22px 0 4px">
          <a href="${getFrontendUrl()}${LINK}"
             style="display:inline-block;background:#0a2057;color:#fff;text-decoration:none;padding:11px 24px;border-radius:6px;font-weight:700">
            Open Liability Register
          </a>
        </p>
      </div>
    </div>
  `;

  return { subject, text, html };
};

async function createDailyNotifications({ companyId, title, message }) {
  const existing = await query(
    `SELECT id FROM notifications
     WHERE company_id = $1
       AND type = $2
       AND related_type = 'liability_register'
       AND created_at::date = CURRENT_DATE
     LIMIT 1`,
    [companyId, TYPE]
  ).catch(() => ({ rows: [] }));

  if (existing.rows.length) return 0;

  let inserted = 0;
  for (const role of TARGET_ROLES) {
    await query(
      `INSERT INTO notifications
        (company_id, target_role, type, title, message, link, severity, related_type)
       VALUES ($1,$2,$3,$4,$5,$6,'critical','liability_register')`,
      [companyId, role, TYPE, title, message, LINK]
    );
    inserted += 1;
  }
  return inserted;
}

async function runLiabilityAutomation({ manual = false } = {}) {
  const companies = await query(
    `SELECT id, name FROM companies WHERE COALESCE(is_active, TRUE) = TRUE`
  );

  const results = [];
  for (const company of companies.rows) {
    const rows = await getVendorLiabilitySummary({ companyId: company.id });
    const over90Rows = rows
      .filter(r => Number(r.payable_90_plus || 0) > 0)
      .sort((a, b) => Number(b.payable_90_plus || 0) - Number(a.payable_90_plus || 0));

    const totals = rows.reduce((acc, row) => {
      acc.over90 += Number(row.payable_90_plus || 0);
      acc.over60 += Number(row.payable_61_90 || 0) + Number(row.payable_90_plus || 0);
      acc.unpaidBills += Number(row.unpaid_bill_count || 0);
      return acc;
    }, { over90: 0, over60: 0, unpaidBills: 0 });

    if (!over90Rows.length) {
      results.push({ company_id: company.id, company_name: company.name, vendors_over90: 0, notifications: 0, mail: { sent: false, reason: 'No 90+ liability' } });
      continue;
    }

    const title = `${over90Rows.length} vendor liabilities over 90 days`;
    const message = `90+ days payable is Rs ${inr(totals.over90)} across ${over90Rows.length} vendor(s). Please review Liability Register.`;
    const notifications = await createDailyNotifications({ companyId: company.id, title, message });

    const recipients = await getAlertEmails(company.id);
    const mail = recipients.length
      ? await sendMail({ to: recipients, ...buildMail({ companyName: company.name, over90Rows, totals }) })
      : { sent: false, reason: 'No recipients configured' };

    results.push({
      company_id: company.id,
      company_name: company.name,
      vendors_over90: over90Rows.length,
      amount_over90: Math.round(totals.over90),
      amount_over60: Math.round(totals.over60),
      unpaid_bills: totals.unpaidBills,
      notifications,
      recipients,
      mail,
      manual,
    });
  }

  return {
    ok: true,
    ran_at: new Date().toISOString(),
    companies_checked: companies.rows.length,
    results,
  };
}

function initLiabilityAutomation() {
  const schedule = process.env.LIABILITY_ALERT_CRON || '30 9 * * *';
  cron.schedule(schedule, () => {
    logger.info('Scheduled liability aging automation triggered');
    runLiabilityAutomation().catch(err => logger.error(`Liability automation failed: ${err.message}`));
  }, { timezone: process.env.TZ || 'Asia/Kolkata' });

  logger.info(`Liability aging automation initialized (${schedule}, ${process.env.TZ || 'Asia/Kolkata'})`);
}

module.exports = {
  runLiabilityAutomation,
  initLiabilityAutomation,
};
