/**
 * BCIM CONSTRUCT-ERP — ESSL Local Sync Agent
 * ============================================
 * Runs on the HRADMIN Windows machine (192.168.1.26).
 * Reads attendance from ESSL ETimetracklite SQL Server locally,
 * then pushes the data to the cloud ERP via HTTPS.
 *
 * Setup:
 *   1. Install Node.js on HRADMIN (https://nodejs.org)
 *   2. Copy this folder to C:\essl-agent\
 *   3. Edit config.json with your API key and company ID
 *   4. Run:  npm install
 *   5. Test: node sync.js --days 1
 *   6. Schedule: Windows Task Scheduler → run daily at 23:00
 *      Action: node "C:\essl-agent\sync.js"
 */

'use strict';
const sql    = require('mssql');
const https  = require('https');
const http   = require('http');
const fs     = require('fs');
const path   = require('path');

// ── Load config ───────────────────────────────────────────────────────────────
const CFG_PATH = path.join(__dirname, 'config.json');
if (!fs.existsSync(CFG_PATH)) {
  console.error('ERROR: config.json not found. Copy config.example.json → config.json and fill in your details.');
  process.exit(1);
}
const cfg = JSON.parse(fs.readFileSync(CFG_PATH, 'utf8'));

// ── Date helpers ──────────────────────────────────────────────────────────────
function toDateStr(d) {
  return d.toISOString().split('T')[0];
}
function addDays(d, n) {
  const r = new Date(d); r.setDate(r.getDate() + n); return r;
}

// ── MSSQL config for ESSL ─────────────────────────────────────────────────────
function buildMssqlCfg() {
  const c = {
    user:     cfg.essl.username,
    password: cfg.essl.password,
    server:   cfg.essl.host,       // e.g. "192.168.1.26" or "localhost"
    database: cfg.essl.database,   // e.g. "etimetrackliteweb"
    options: {
      instanceName:          cfg.essl.instance || undefined, // "SQLEXPRESS"
      encrypt:               false,
      trustServerCertificate: true,
      connectTimeout:        15000,
      requestTimeout:        30000,
    },
  };
  // For named instances (SQLEXPRESS), do NOT set port — SQL Browser resolves it
  if (!cfg.essl.instance) c.port = parseInt(cfg.essl.port) || 1433;
  return c;
}

// ── Discover monthly DeviceLogs tables ───────────────────────────────────────
function monthlyTables(from, to) {
  const tables = [];
  let cur = new Date(new Date(from).getFullYear(), new Date(from).getMonth(), 1);
  const end = new Date(to);
  while (cur <= end) {
    tables.push(`DeviceLogs_${cur.getMonth() + 1}_${cur.getFullYear()}`);
    cur.setMonth(cur.getMonth() + 1);
  }
  return tables;
}

async function existingTables(conn, tables) {
  const result = [];
  for (const t of tables) {
    try {
      await conn.request().query(`SELECT TOP 1 DeviceLogId FROM [${t}]`);
      result.push(t);
    } catch (_) {}
  }
  return result;
}

// ── Pull swipe data from ESSL ─────────────────────────────────────────────────
async function pullSwipes(conn, tables, fromDate, toDate) {
  if (!tables.length) return [];

  const unionSQL = tables.map(t => `
    SELECT
      e.EmployeeCode                                                    AS emp_code,
      CONVERT(VARCHAR(19), d.LogDate, 120)                              AS swipe_time,
      CASE WHEN DATEPART(HOUR, d.LogDate) < 12 THEN 'in' ELSE 'out' END AS direction
    FROM [${t}] d
    JOIN Employees e ON e.NumericCode = d.UserId
    WHERE d.LogDate BETWEEN @from AND @to
  `).join(' UNION ALL ');

  const r = await conn.request()
    .input('from', sql.VarChar, fromDate + ' 00:00:00')
    .input('to',   sql.VarChar, toDate   + ' 23:59:59')
    .query(`${unionSQL} ORDER BY emp_code, swipe_time`);

  return r.recordset;
}

// ── Group swipes into daily attendance records ────────────────────────────────
function groupSwipes(rows) {
  const grouped = {};
  for (const row of rows) {
    const code = String(row.emp_code || '').trim();
    if (!code) continue;
    const dt   = new Date(row.swipe_time);
    const date = toDateStr(dt);
    const time = dt.toTimeString().slice(0, 8); // HH:MM:SS
    const key  = `${code}|${date}`;
    if (!grouped[key]) grouped[key] = { emp_code: code, date, ins: [], outs: [] };
    if (row.direction === 'in') grouped[key].ins.push(time);
    else grouped[key].outs.push(time);
  }

  return Object.values(grouped).map(g => {
    g.ins.sort(); g.outs.sort();
    const in_time  = g.ins[0]  || (g.outs.length === 0 ? null : null);
    const out_time = g.outs[g.outs.length - 1] || null;
    const punch_count = g.ins.length + g.outs.length;
    return { emp_code: g.emp_code, date: g.date, in_time, out_time, punch_count };
  });
}

// ── Push records to cloud ERP ─────────────────────────────────────────────────
function pushToERP(records) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      api_key:    cfg.erp.api_key,
      company_id: cfg.erp.company_id,
      records,
    });

    const url  = new URL(cfg.erp.push_url);
    const opts = {
      hostname: url.hostname,
      port:     url.port || (url.protocol === 'https:' ? 443 : 80),
      path:     url.pathname,
      method:   'POST',
      headers:  { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    };

    const lib = url.protocol === 'https:' ? https : http;
    const req = lib.request(opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve({ raw: data }); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const daysArg = args.indexOf('--days');
  const days = daysArg >= 0 ? parseInt(args[daysArg + 1]) || 1 : cfg.sync_days || 1;

  const toDate   = toDateStr(new Date());
  const fromDate = toDateStr(addDays(new Date(), -days));

  console.log(`\n[ESSL Agent] ${new Date().toLocaleString()}`);
  console.log(`[ESSL Agent] Syncing ${fromDate} → ${toDate} (${days} day(s))`);
  console.log(`[ESSL Agent] ESSL Server: ${cfg.essl.host}\\${cfg.essl.instance || 'default'}`);

  let conn;
  try {
    console.log('[ESSL Agent] Connecting to SQL Server…');
    conn = await sql.connect(buildMssqlCfg());
    console.log('[ESSL Agent] Connected.');

    const allTables  = monthlyTables(fromDate, toDate);
    const tables     = await existingTables(conn, allTables);
    console.log(`[ESSL Agent] Tables found: ${tables.join(', ') || 'none'}`);

    if (!tables.length) {
      console.log('[ESSL Agent] No DeviceLogs tables for this range. Done.');
      return;
    }

    const rawSwipes  = await pullSwipes(conn, tables, fromDate, toDate);
    console.log(`[ESSL Agent] Raw swipes: ${rawSwipes.length}`);

    const records = groupSwipes(rawSwipes);
    console.log(`[ESSL Agent] Attendance records: ${records.length}`);

    if (!records.length) { console.log('[ESSL Agent] Nothing to push.'); return; }

    console.log(`[ESSL Agent] Pushing to ERP: ${cfg.erp.push_url}`);
    const result = await pushToERP(records);
    console.log(`[ESSL Agent] ✓ Synced: ${result.synced || 0} | Skipped: ${result.skipped || 0}`);
    if (result.not_found?.length) console.log(`[ESSL Agent] Not found in ERP: ${result.not_found.join(', ')}`);
    if (result.errors?.length) console.log(`[ESSL Agent] Errors:`, result.errors);

  } catch (err) {
    console.error('[ESSL Agent] ERROR:', err.message);
    process.exit(1);
  } finally {
    if (conn) await conn.close().catch(() => {});
    console.log('[ESSL Agent] Done.\n');
  }
}

main();
