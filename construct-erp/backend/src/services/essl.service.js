// src/services/essl.service.js
// Connects to ESSL ETimetracklite / biometric attendance server (MySQL)
const mysql = require('mysql2/promise');

// ── Create a connection to the ESSL MySQL database ──────────────────────────
async function getEsslConnection(config) {
  return mysql.createConnection({
    host:     config.essl_host || '127.0.0.1',
    port:     parseInt(config.essl_port || 3306),
    database: config.essl_database || 'att2000',
    user:     config.essl_user || 'root',
    password: config.essl_password || '',
    connectTimeout: 10000,
    ssl: false,
  });
}

// ── Detect which ESSL schema is in use ───────────────────────────────────────
// ESSL ETimetracklite uses either:
//   Schema A (old): CHECKINOUT table  (userid, checktime, checktype I/O)
//   Schema B (new): att_log table     (emp_code/emp_pin, punch_time, punch_state)
async function detectSchema(conn) {
  try {
    const [tables] = await conn.query(`SHOW TABLES`);
    const names = tables.map(r => Object.values(r)[0].toLowerCase());
    if (names.includes('checkinout'))       return 'checkinout';
    if (names.includes('att_log'))          return 'att_log';
    if (names.includes('attlog'))           return 'attlog';
    if (names.includes('iclock_transaction')) return 'zkteco';
    return 'unknown';
  } catch { return 'unknown'; }
}

// ── List all employees from ESSL ─────────────────────────────────────────────
async function listEsslEmployees(config) {
  const conn = await getEsslConnection(config);
  try {
    const schema = await detectSchema(conn);
    let rows = [];
    if (schema === 'checkinout') {
      const [r] = await conn.query(`
        SELECT CAST(u.userid AS CHAR) AS emp_code, u.name,
               COALESCE(d.deptname,'') AS department
        FROM userinfo u
        LEFT JOIN departments d ON d.deptid = u.defaultdeptid
        WHERE u.userid IS NOT NULL
        ORDER BY u.userid`);
      rows = r;
    } else if (schema === 'att_log' || schema === 'attlog') {
      const tbl = schema === 'attlog' ? 'attlog' : 'att_log';
      const [r] = await conn.query(`
        SELECT CAST(e.emp_code AS CHAR) AS emp_code,
               CONCAT(e.first_name,' ',COALESCE(e.last_name,'')) AS name,
               COALESCE(d.dept_name,'') AS department
        FROM hr_employee e
        LEFT JOIN hr_department d ON d.id = e.department_id
        ORDER BY e.emp_code`).catch(async () => {
          // fallback: get distinct emp_codes from the log
          const tblName = schema === 'attlog' ? 'attlog' : 'att_log';
          const [fr] = await conn.query(
            `SELECT DISTINCT CAST(emp_code AS CHAR) AS emp_code, '' AS name, '' AS department FROM ${tblName} LIMIT 500`);
          return [fr];
        });
      rows = r;
    } else if (schema === 'zkteco') {
      const [r] = await conn.query(`
        SELECT CAST(u.emp_id AS CHAR) AS emp_code,
               CONCAT(u.first_name,' ',COALESCE(u.last_name,'')) AS name,
               '' AS department
        FROM personnel_employee u ORDER BY u.emp_id`);
      rows = r;
    }
    return { schema, employees: rows };
  } finally {
    await conn.end();
  }
}

// ── Pull attendance for a date range ─────────────────────────────────────────
// Returns: [{ emp_code, date, first_in, last_out, hours_worked, punch_count }]
async function pullAttendance(config, fromDate, toDate, empCodes = []) {
  const conn = await getEsslConnection(config);
  try {
    const schema = await detectSchema(conn);
    let rows = [];

    const codeFilter = empCodes.length
      ? `AND CAST(emp_code_col AS CHAR) IN (${empCodes.map(() => '?').join(',')})`
      : '';

    if (schema === 'checkinout') {
      const params = [fromDate, toDate, ...(empCodes.length ? empCodes : [])];
      const [r] = await conn.query(`
        SELECT
          CAST(userid AS CHAR)                              AS emp_code,
          DATE(checktime)                                   AS att_date,
          MIN(checktime)                                    AS first_punch,
          MAX(checktime)                                    AS last_punch,
          COUNT(*)                                          AS punch_count,
          ROUND(TIMESTAMPDIFF(MINUTE, MIN(checktime), MAX(checktime)) / 60.0, 2) AS hours_worked
        FROM checkinout
        WHERE DATE(checktime) BETWEEN ? AND ?
          ${empCodes.length ? `AND CAST(userid AS CHAR) IN (${empCodes.map(()=>'?').join(',')})` : ''}
        GROUP BY CAST(userid AS CHAR), DATE(checktime)
        ORDER BY att_date, emp_code`, params);
      rows = r;

    } else if (schema === 'att_log' || schema === 'attlog') {
      const tbl = schema === 'attlog' ? 'attlog' : 'att_log';
      const timeCol = schema === 'attlog' ? 'checktime' : 'punch_time';
      const codeCol = schema === 'attlog' ? 'userid' : 'emp_code';
      const params = [fromDate, toDate, ...(empCodes.length ? empCodes : [])];
      const [r] = await conn.query(`
        SELECT
          CAST(${codeCol} AS CHAR)                           AS emp_code,
          DATE(${timeCol})                                   AS att_date,
          MIN(${timeCol})                                    AS first_punch,
          MAX(${timeCol})                                    AS last_punch,
          COUNT(*)                                           AS punch_count,
          ROUND(TIMESTAMPDIFF(MINUTE,MIN(${timeCol}),MAX(${timeCol}))/60.0,2) AS hours_worked
        FROM ${tbl}
        WHERE DATE(${timeCol}) BETWEEN ? AND ?
          ${empCodes.length ? `AND CAST(${codeCol} AS CHAR) IN (${empCodes.map(()=>'?').join(',')})` : ''}
        GROUP BY CAST(${codeCol} AS CHAR), DATE(${timeCol})
        ORDER BY att_date, emp_code`, params);
      rows = r;

    } else if (schema === 'zkteco') {
      const params = [fromDate, toDate, ...(empCodes.length ? empCodes : [])];
      const [r] = await conn.query(`
        SELECT
          CAST(emp_id AS CHAR)                               AS emp_code,
          DATE(punch_time)                                   AS att_date,
          MIN(punch_time)                                    AS first_punch,
          MAX(punch_time)                                    AS last_punch,
          COUNT(*)                                           AS punch_count,
          ROUND(TIMESTAMPDIFF(MINUTE,MIN(punch_time),MAX(punch_time))/60.0,2) AS hours_worked
        FROM iclock_transaction
        WHERE DATE(punch_time) BETWEEN ? AND ?
          ${empCodes.length ? `AND CAST(emp_id AS CHAR) IN (${empCodes.map(()=>'?').join(',')})` : ''}
        GROUP BY CAST(emp_id AS CHAR), DATE(punch_time)
        ORDER BY att_date, emp_code`, params);
      rows = r;
    }

    return { schema, records: rows };
  } finally {
    await conn.end();
  }
}

// ── Test connection ───────────────────────────────────────────────────────────
async function testConnection(config) {
  let conn;
  try {
    conn = await getEsslConnection(config);
    await conn.ping();
    const schema = await detectSchema(conn);
    // Count records as sanity check
    let count = 0;
    try {
      if (schema === 'checkinout') {
        const [[r]] = await conn.query('SELECT COUNT(*) AS c FROM checkinout');
        count = r.c;
      } else if (schema === 'att_log') {
        const [[r]] = await conn.query('SELECT COUNT(*) AS c FROM att_log');
        count = r.c;
      } else if (schema === 'attlog') {
        const [[r]] = await conn.query('SELECT COUNT(*) AS c FROM attlog');
        count = r.c;
      }
    } catch(_) {}
    return { success: true, schema, record_count: count };
  } catch(e) {
    return { success: false, error: e.message };
  } finally {
    if (conn) await conn.end().catch(()=>{});
  }
}

module.exports = { listEsslEmployees, pullAttendance, testConnection, detectSchema };
