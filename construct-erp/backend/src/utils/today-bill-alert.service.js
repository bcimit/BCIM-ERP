const cron = require('node-cron');
const logger = require('./logger');
const { query } = require('../config/database');
const { sendMail } = require('../services/mail.service');

const DEFAULT_RECIPIENTS = 'it@bcim.in';
const DEFAULT_CRON = '0 */6 * * *';

const parseEmails = (value, fallback = '') =>
  String(value || fallback || '')
    .split(/[;,]/)
    .map(v => v.trim())
    .filter(Boolean);

const inr = (value) =>
  Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatDate = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-IN');
};

const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  const day = date.toLocaleDateString('en-IN');
  const time = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  return `${day}<br>${time}`;
};

async function fetchTodayBills(companyId, timezone) {
  const { rows } = await query(`
    SELECT
      b.id,
      b.sl_number,
      UPPER(COALESCE(b.bill_type, 'po')) AS bill_type,
      b.vendor_name,
      b.inv_number,
      b.inv_date,
      COALESCE(NULLIF(b.po_number, ''), NULLIF(b.wo_number, ''), '-') AS order_number,
      b.total_amount,
      b.workflow_status,
      b.created_at,
      p.name AS project_name,
      u.name AS created_by_name
    FROM tqs_bills b
    LEFT JOIN projects p ON p.id = b.project_id
    LEFT JOIN users u ON u.id = b.created_by
    WHERE b.company_id = $1
      AND b.is_deleted = FALSE
      AND (b.created_at AT TIME ZONE $2)::date = (NOW() AT TIME ZONE $2)::date
    ORDER BY b.created_at DESC, b.sl_number DESC
  `, [companyId, timezone]);

  return rows;
}

function buildMail({ companyName, bills, timezone }) {
  const total = bills.reduce((sum, bill) => sum + Number(bill.total_amount || 0), 0);
  const th = 'padding:8px 6px;border:1px solid #dbe4f0;background:#eef4fb;text-align:left;font-size:11px;line-height:1.2;color:#10233f';
  const td = 'padding:8px 6px;border:1px solid #dbe4f0;font-size:11px;line-height:1.25;color:#10233f;vertical-align:top';
  const tdNoWrap = `${td};white-space:nowrap`;
  const tdWrap = `${td};word-break:break-word;overflow-wrap:anywhere`;
  const rows = bills.map(bill => `
    <tr>
      <td style="${tdNoWrap};font-weight:700">${bill.sl_number || '-'}</td>
      <td style="${tdNoWrap}">${bill.bill_type || '-'}</td>
      <td style="${tdWrap}">${bill.vendor_name || '-'}</td>
      <td style="${tdNoWrap}">${bill.inv_number || '-'}</td>
      <td style="${tdNoWrap}">${bill.order_number || '-'}</td>
      <td style="${tdWrap}">${bill.project_name || '-'}</td>
      <td style="${tdNoWrap};text-align:right;font-weight:700">Rs ${inr(bill.total_amount)}</td>
      <td style="${tdNoWrap}">${formatDate(bill.inv_date)}</td>
      <td style="${tdNoWrap}">${bill.workflow_status || '-'}</td>
      <td style="${tdNoWrap}">${formatDateTime(bill.created_at)}</td>
    </tr>
  `).join('');

  const subject = `Bill Tracker Today Alert - ${bills.length} bill(s) entered`;
  const text = [
    `Bill Tracker Today Alert - ${companyName}`,
    '',
    `${bills.length} bill(s) were entered today.`,
    `Total value: Rs ${inr(total)}`,
    `Timezone: ${timezone}`,
    '',
    ...bills.map(bill =>
      `${bill.sl_number || '-'} | ${bill.vendor_name || '-'} | Inv ${bill.inv_number || '-'} | ${bill.order_number || '-'} | Rs ${inr(bill.total_amount)}`
    ),
  ].join('\n');

  const html = `
    <div style="font-family:Arial,sans-serif;width:1180px;max-width:1180px;margin:0 auto;color:#10233f">
      <div style="background:#0a2057;color:#fff;padding:18px 22px;border-radius:8px 8px 0 0">
        <h2 style="margin:0;font-size:20px">Bill Tracker Today Alert</h2>
        <p style="margin:5px 0 0;color:#cbd5e1">${companyName} | ${timezone}</p>
      </div>
      <div style="padding:20px 22px;border:1px solid #dbe4f0;border-top:none;border-radius:0 0 8px 8px;background:#fff">
        <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
          <tr>
            <td style="padding:12px;border:1px solid #dbe4f0;background:#f6f9fc;font-weight:700">Bills Entered Today</td>
            <td style="padding:12px;border:1px solid #dbe4f0;font-size:18px;font-weight:800">${bills.length}</td>
            <td style="padding:12px;border:1px solid #dbe4f0;background:#f6f9fc;font-weight:700">Total Amount</td>
            <td style="padding:12px;border:1px solid #dbe4f0;font-size:18px;font-weight:800">Rs ${inr(total)}</td>
          </tr>
        </table>
        <table style="width:100%;border-collapse:collapse;table-layout:fixed;font-size:11px">
          <colgroup>
            <col style="width:56px">
            <col style="width:42px">
            <col style="width:150px">
            <col style="width:128px">
            <col style="width:122px">
            <col style="width:245px">
            <col style="width:112px">
            <col style="width:82px">
            <col style="width:78px">
            <col style="width:110px">
          </colgroup>
          <thead>
            <tr>
              <th style="${th}">SL No</th>
              <th style="${th}">Type</th>
              <th style="${th}">Vendor</th>
              <th style="${th}">Invoice</th>
              <th style="${th}">PO/WO</th>
              <th style="${th}">Project</th>
              <th style="${th};text-align:right">Total</th>
              <th style="${th}">Inv Date</th>
              <th style="${th}">Status</th>
              <th style="${th}">Entered</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>
  `;

  return { subject, text, html };
}

async function runTodayBillAlert({ manual = false } = {}) {
  const recipients = parseEmails(process.env.BILL_TRACKER_TODAY_ALERT_EMAILS, DEFAULT_RECIPIENTS);
  const timezone = process.env.BILL_TRACKER_TODAY_ALERT_TZ || process.env.TZ || 'Asia/Kolkata';

  if (!recipients.length) {
    return { ok: false, reason: 'No recipients configured' };
  }

  const companies = await query(
    `SELECT id, name FROM companies WHERE COALESCE(is_active, TRUE) = TRUE`
  );

  const results = [];
  for (const company of companies.rows) {
    const bills = await fetchTodayBills(company.id, timezone);
    if (!bills.length) {
      results.push({ company_id: company.id, company_name: company.name, bills: 0, mail: { sent: false, reason: 'No bills entered today' } });
      continue;
    }

    const mail = await sendMail({
      to: recipients,
      ...buildMail({ companyName: company.name, bills, timezone }),
    });

    results.push({
      company_id: company.id,
      company_name: company.name,
      bills: bills.length,
      total_amount: Math.round(bills.reduce((sum, bill) => sum + Number(bill.total_amount || 0), 0) * 100) / 100,
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

function initTodayBillAlert() {
  const schedule = process.env.BILL_TRACKER_TODAY_ALERT_CRON || DEFAULT_CRON;
  cron.schedule(schedule, () => {
    logger.info('Scheduled Bill Tracker today alert triggered');
    runTodayBillAlert().catch(err => logger.error(`Bill Tracker today alert failed: ${err.message}`));
  }, { timezone: process.env.BILL_TRACKER_TODAY_ALERT_TZ || process.env.TZ || 'Asia/Kolkata' });

  logger.info(`Bill Tracker today alert initialized (${schedule})`);
}

module.exports = {
  runTodayBillAlert,
  initTodayBillAlert,
};
