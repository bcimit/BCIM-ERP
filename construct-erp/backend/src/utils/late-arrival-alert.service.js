// src/utils/late-arrival-alert.service.js
// Sends individual late-arrival warning emails to employees who checked in late.
// Can be triggered manually via API or scheduled via cron.

const fs   = require('fs');
const path = require('path');
const cron = require('node-cron');
const logger = require('./logger');
const { query } = require('../config/database');
const { sendMail } = require('../services/mail.service');

const ERP_URL = process.env.API_BASE_URL || 'https://erp.bcim.in';
// Daily late-arrival sweep — 11:00 AM IST by default, after morning punches
// have synced from the biometric devices. Override with env vars.
const DEFAULT_CRON = '0 11 * * *';

// Embed BCIM logo as base64 so it renders even when external images are blocked
let LOGO_SRC = `${ERP_URL}/bcim-logo.png`;
try {
  const logoPath = path.join(__dirname, '../../../frontend/public/bcim-logo.png');
  const b64 = fs.readFileSync(logoPath).toString('base64');
  LOGO_SRC = `data:image/png;base64,${b64}`;
} catch (_) { /* fall back to hosted URL */ }

// ── HTML email template ───────────────────────────────────────────────────────
function buildLateEmail({ employeeName, employeeCode, date, checkInTime, lateMinutes, shiftStart, companyName, managerName }) {
  const lateHrs  = Math.floor(lateMinutes / 60);
  const lateMins = lateMinutes % 60;
  const lateStr  = lateHrs > 0 ? `${lateHrs}h ${lateMins}m` : `${lateMins} min`;
  const dateStr  = new Date(date).toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

  const subject = `Late Arrival Notice — ${dateStr}`;

  const row = (label, value, valueStyle = '') =>
    `<tr>
       <td style="padding:10px 16px;color:#64748b;font-size:13px;border-bottom:1px solid #f1f5f9;width:42%">${label}</td>
       <td style="padding:10px 16px;font-size:13px;font-weight:600;border-bottom:1px solid #f1f5f9;${valueStyle}">${value}</td>
     </tr>`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#eef2f7;font-family:Arial,Helvetica,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f7;padding:32px 0">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">

  <!-- ── HEADER ── -->
  <tr><td style="background:linear-gradient(135deg,#0a1d3e 0%,#1e3a8a 100%);border-radius:12px 12px 0 0;padding:0">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <!-- Logo + Company -->
        <td style="padding:24px 28px 20px">
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="background:#fff;border-radius:8px;padding:6px 10px;vertical-align:middle">
                <img src="${LOGO_SRC}" alt="BCIM" height="38" style="display:block;height:38px;max-width:120px">
              </td>
              <td style="padding-left:14px;vertical-align:middle">
                <div style="color:#ffffff;font-size:15px;font-weight:800;letter-spacing:0.3px;line-height:1.2">
                  ${companyName.toUpperCase()}
                </div>
                <div style="color:#93c5fd;font-size:11px;font-weight:600;letter-spacing:1px;margin-top:3px">HR DEPARTMENT</div>
              </td>
            </tr>
          </table>
        </td>
        <!-- Late Badge -->
        <td align="right" style="padding:24px 28px 20px;vertical-align:middle">
          <div style="display:inline-block;background:rgba(239,68,68,0.18);border:2px solid rgba(239,68,68,0.5);border-radius:12px;padding:10px 18px;text-align:center">
            <div style="color:#fca5a5;font-size:26px;font-weight:900;line-height:1;letter-spacing:-0.5px">${lateStr}</div>
            <div style="color:#ef4444;font-size:10px;font-weight:700;letter-spacing:2px;margin-top:4px">LATE</div>
          </div>
        </td>
      </tr>
      <!-- Title strip -->
      <tr>
        <td colspan="2" style="background:rgba(255,255,255,0.08);padding:12px 28px;border-top:1px solid rgba(255,255,255,0.1)">
          <div style="color:#e2e8f0;font-size:13px;font-weight:700;letter-spacing:0.5px">&#9888;&nbsp; LATE ARRIVAL NOTICE</div>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- ── BODY ── -->
  <tr><td style="background:#ffffff;padding:28px 28px 0">

    <p style="margin:0 0 6px;font-size:15px;color:#1e293b">
      Dear <strong style="color:#0f172a">${employeeName}</strong>,
    </p>
    <p style="margin:0 0 24px;font-size:14px;color:#475569;line-height:1.7">
      Our records show that you arrived
      <strong style="color:#dc2626;background:#fee2e2;padding:1px 6px;border-radius:4px">${lateStr} late</strong>
      to work on <strong style="color:#0f172a">${dateStr}</strong>.
      We kindly request you to ensure punctuality going forward.
    </p>

    <!-- Details card -->
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;margin-bottom:24px">
      <div style="background:#1e3a8a;padding:10px 16px">
        <span style="color:#bfdbfe;font-size:11px;font-weight:700;letter-spacing:1px">ATTENDANCE DETAILS</span>
      </div>
      <table width="100%" cellpadding="0" cellspacing="0">
        ${row('Employee Name',  `<span style="color:#0f172a">${employeeName}</span>`)}
        ${row('Employee Code',  `<span style="color:#334155">${employeeCode || '—'}</span>`)}
        ${row('Date',           `<span style="color:#0f172a">${dateStr}</span>`)}
        ${shiftStart ? row('Shift Start Time', `<span style="color:#0369a1">${shiftStart}</span>`) : ''}
        ${row('Actual Check-in', `<span style="color:#dc2626;font-size:14px">${checkInTime}</span>`)}
        ${row('Late By',
          `<span style="display:inline-block;background:#fee2e2;color:#dc2626;font-weight:700;font-size:12px;padding:3px 12px;border-radius:20px">${lateStr}</span>`
        )}
      </table>
    </div>

    <!-- Warning note -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
      <tr>
        <td style="background:#fffbeb;border-left:4px solid #f59e0b;border-radius:0 8px 8px 0;padding:14px 16px">
          <p style="margin:0;font-size:13px;color:#78350f;line-height:1.6">
            <strong>&#9888; Please Note:</strong> Repeated late arrivals may impact your attendance record,
            performance evaluation, and salary calculations as per company policy.
            If you have a valid reason, please submit an
            <strong>Attendance Regularization</strong> request via the ESS portal.
          </p>
        </td>
      </tr>
    </table>

    <!-- CTA -->
    <p style="margin:0 0 8px;font-size:13px;color:#475569">
      View your attendance or submit a regularization request:
    </p>
    <p style="margin:0 0 24px">
      <a href="${ERP_URL}/ess"
         style="display:inline-block;background:linear-gradient(135deg,#0a1d3e,#1e3a8a);color:#fff;padding:12px 26px;border-radius:8px;text-decoration:none;font-weight:700;font-size:13px;letter-spacing:0.3px">
        View My Attendance &rarr;
      </a>
    </p>

  </td></tr>

  <!-- ── FOOTER ── -->
  <tr><td style="background:#ffffff;padding:0 28px 28px">
    ${managerName ? `<p style="margin:0 0 12px;font-size:12px;color:#64748b;background:#f8fafc;border-radius:6px;padding:10px 14px">
      &#128203; This notice has also been sent to your reporting manager <strong>${managerName}</strong>.
    </p>` : ''}

    <p style="margin:0 0 4px;font-size:13px;color:#475569">Regards,</p>
    <p style="margin:0 0 24px;font-size:13px;color:#0f172a">
      <strong style="color:#1e3a8a">HR Department</strong><br>
      <strong>${companyName}</strong>
    </p>

    <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 16px">

    <!-- Footer branding -->
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="vertical-align:middle">
          <img src="${LOGO_SRC}" alt="BCIM" height="24" style="display:inline-block;height:24px;vertical-align:middle;opacity:0.5">
          <span style="color:#94a3b8;font-size:11px;margin-left:8px;vertical-align:middle">${companyName}</span>
        </td>
        <td align="right" style="vertical-align:middle">
          <span style="color:#cbd5e1;font-size:11px">Automated &bull; Do not reply &bull;
            <a href="mailto:hr@bcim.in" style="color:#3b82f6;text-decoration:none">hr@bcim.in</a>
          </span>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- Bottom border accent -->
  <tr><td style="background:linear-gradient(90deg,#0a1d3e,#1e3a8a,#3b82f6);height:4px;border-radius:0 0 12px 12px"></td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;

  const text = [
    `Late Arrival Notice — ${companyName}`,
    '',
    `Dear ${employeeName},`,
    '',
    `You arrived ${lateStr} late on ${dateStr}.`,
    `Check-in time: ${checkInTime}${shiftStart ? ` (Shift starts: ${shiftStart})` : ''}`,
    '',
    'Please ensure punctuality. If you have a valid reason, submit an Attendance Regularization request via ESS portal.',
    '',
    `ESS Portal: ${ERP_URL}/ess`,
    '',
    'Regards,',
    'HR Department',
    companyName,
  ].join('\n');

  return { subject, html, text };
}

// ── Core function: send late alerts for a given date ─────────────────────────
async function sendLateArrivalAlerts({ date, companyId, minLateMinutes = 5, overrideRecipients, dryRun = false } = {}) {
  const targetDate = date || new Date().toISOString().slice(0, 10);

  // Get company info
  const companyFilter = companyId ? `WHERE id = '${companyId}'` : `WHERE COALESCE(is_active, TRUE) = TRUE`;
  const companies = await query(`SELECT id, name FROM companies ${companyFilter}`);

  const results = [];

  for (const company of companies.rows) {
    // Get late employees for the date
    const { rows: lateEmps } = await query(`
      SELECT
        a.id, a.user_id, a.attendance_date, a.in_time AS check_in, a.late_minutes,
        u.name AS employee_name, u.email AS employee_email, u.employee_code,
        s.start_time AS shift_start,
        m.name AS manager_name, m.email AS manager_email
      FROM hr_attendance a
      JOIN users u ON u.id = a.user_id
      LEFT JOIN employee_profiles ep ON ep.user_id = a.user_id
      LEFT JOIN users m ON m.id = ep.reporting_manager_id
      -- Shift start (optional, for display) comes from the active assignment in
      -- hr_employee_shifts, not employee_profiles (which has no shift column).
      LEFT JOIN LATERAL (
        SELECT hs.start_time
        FROM hr_employee_shifts es
        JOIN hr_shifts hs ON hs.id = es.shift_id
        WHERE es.employee_id = a.user_id
          AND es.effective_from <= a.attendance_date
          AND (es.effective_to IS NULL OR es.effective_to >= a.attendance_date)
        ORDER BY es.effective_from DESC
        LIMIT 1
      ) s ON TRUE
      WHERE a.company_id = $1
        AND a.attendance_date = $2
        AND a.late_minutes >= $3
        AND a.status = 'present'
        AND u.is_active = TRUE
        AND u.email IS NOT NULL
      ORDER BY a.late_minutes DESC
    `, [company.id, targetDate, minLateMinutes]);

    const sent = [], failed = [];

    for (const emp of lateEmps) {
      try {
        const mail = buildLateEmail({
          employeeName: emp.employee_name,
          employeeCode: emp.employee_code,
          date:         emp.attendance_date,
          checkInTime:  emp.check_in,
          lateMinutes:  emp.late_minutes,
          shiftStart:   emp.shift_start,
          companyName:  company.name,
          managerName:  emp.manager_name,
        });

        const to = overrideRecipients
          ? (Array.isArray(overrideRecipients) ? overrideRecipients : [overrideRecipients])
          : [emp.employee_email, emp.manager_email].filter(Boolean);

        if (!dryRun && to.length) {
          await sendMail({ to, ...mail });
        }

        sent.push({ employee: emp.employee_name, email: emp.employee_email, lateMinutes: emp.late_minutes });
      } catch (e) {
        failed.push({ employee: emp.employee_name, error: e.message });
      }
    }

    results.push({ company: company.name, date: targetDate, sent: sent.length, failed: failed.length, employees: sent, errors: failed });
  }

  return { ok: true, date: targetDate, results };
}

// ── Scheduled automation: runs every day and emails whoever came in late ──────
function initLateArrivalAlert() {
  if (String(process.env.HR_LATE_ALERT_ENABLED || 'true').toLowerCase() === 'false') {
    logger.info('Late-arrival alert scheduler disabled (HR_LATE_ALERT_ENABLED=false)');
    return;
  }
  const schedule = process.env.HR_LATE_ALERT_CRON || DEFAULT_CRON;
  const minLateMinutes = parseInt(process.env.HR_LATE_ALERT_MIN_MINUTES, 10) || 5;

  cron.schedule(schedule, () => {
    logger.info('Scheduled late-arrival alert triggered');
    // No companyId → sweeps every active company for today's date.
    sendLateArrivalAlerts({ minLateMinutes })
      .then((r) => {
        const total = (r.results || []).reduce((s, x) => s + (x.sent || 0), 0);
        logger.info(`Late-arrival alerts sent: ${total} across ${r.results?.length || 0} company(ies)`);
      })
      .catch((err) => logger.error(`Late-arrival alert failed: ${err.message}`));
  }, { timezone: process.env.HR_LATE_ALERT_TZ || process.env.TZ || 'Asia/Kolkata' });

  logger.info(`Late-arrival alert scheduler initialized (${schedule}, ≥${minLateMinutes} min)`);
}

module.exports = { sendLateArrivalAlerts, buildLateEmail, initLateArrivalAlert };
