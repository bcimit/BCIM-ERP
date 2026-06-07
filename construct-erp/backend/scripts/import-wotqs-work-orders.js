require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { pool } = require('../src/config/database');

const DEFAULT_DIR = 'D:/QS SHARE/QS WORKINGS/DQS/WO';
const WO_DIR = process.argv[2] || DEFAULT_DIR;

function normalizeName(value) {
  return String(value || '')
    .replace(/\./g, '')
    .replace(/\bprivate\b/gi, 'pvt')
    .replace(/\blimited\b/gi, 'ltd')
    .replace(/\bpvt\b/gi, 'pvt')
    .replace(/\bltd\b/gi, 'ltd')
    .replace(/\bconstructions\b/gi, 'construction')
    .replace(/\bpragati\b/gi, 'pragathi')
    .replace(/[^a-z0-9]+/gi, ' ')
    .trim()
    .toLowerCase();
}

function parseFilename(fileName) {
  const base = fileName.replace(/\.pdf$/i, '').trim();
  const match = base.match(/^(WOTQS\d+(?:-A\d+)?)-(.+)$/i);
  if (match) {
    return {
      woNumber: match[1].trim().toUpperCase(),
      vendorName: match[2].trim(),
      fileName,
    };
  }
  const dash = base.indexOf('-');
  return {
    woNumber: (dash > 0 ? base.slice(0, dash) : base).trim().toUpperCase(),
    vendorName: (dash > 0 ? base.slice(dash + 1) : '').trim(),
    fileName,
  };
}

function projectCodeFor(woNumber) {
  const match = String(woNumber).match(/^WOTQS(\d+)/i);
  const sequence = match ? Number(match[1]) : 0;
  return sequence >= 21 ? 'WDIRY0194' : 'WDIRY0151';
}

function displaySubject(record) {
  const amendment = /-A\d+$/i.test(record.woNumber) ? 'Amended WO' : 'Work Order';
  return `${amendment} - ${record.vendorName || record.woNumber}`;
}

function dedupeRecords(records) {
  const byNumber = new Map();
  for (const record of records) {
    const existing = byNumber.get(record.woNumber);
    if (!existing) {
      byNumber.set(record.woNumber, record);
      continue;
    }
    const currentScore = Number(!/\s\.pdf$/i.test(record.fileName)) + Number(record.vendorName.length);
    const existingScore = Number(!/\s\.pdf$/i.test(existing.fileName)) + Number(existing.vendorName.length);
    if (currentScore > existingScore) byNumber.set(record.woNumber, record);
  }
  return [...byNumber.values()].sort((a, b) => a.woNumber.localeCompare(b.woNumber, undefined, { numeric: true }));
}

async function findVendor(client, companyId, vendorName) {
  const vendors = await client.query(
    `SELECT id, name FROM vendors WHERE company_id = $1 AND is_active = TRUE`,
    [companyId]
  );
  const wanted = normalizeName(vendorName);
  if (!wanted) return null;

  return vendors.rows.find((vendor) => normalizeName(vendor.name) === wanted)
    || vendors.rows.find((vendor) => normalizeName(vendor.name).includes(wanted) || wanted.includes(normalizeName(vendor.name)))
    || null;
}

async function createVendor(client, companyId, vendorName) {
  const seq = await client.query(`SELECT COUNT(*)::int AS count FROM vendors WHERE company_id = $1`, [companyId]);
  const vendorCode = `VEN-WOTQS-${String(seq.rows[0].count + 1).padStart(3, '0')}`;
  const result = await client.query(
    `INSERT INTO vendors (company_id, vendor_code, name, vendor_type, contact_person, state, is_active)
     VALUES ($1, $2, $3, 'subcontractor', $3, 'Karnataka', TRUE)
     RETURNING id, name`,
    [companyId, vendorCode, vendorName]
  );
  return result.rows[0];
}

async function main() {
  if (!fs.existsSync(WO_DIR)) throw new Error(`WO folder not found: ${WO_DIR}`);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const userRes = await client.query(
      `SELECT id, company_id FROM users WHERE role = 'super_admin' ORDER BY created_at LIMIT 1`
    );
    if (!userRes.rows.length) throw new Error('No super_admin user found for created_by');
    const user = userRes.rows[0];

    const projectsRes = await client.query(
      `SELECT id, project_code FROM projects WHERE company_id = $1 AND project_code IN ('WDIRY0151', 'WDIRY0194')`,
      [user.company_id]
    );
    const projectByCode = new Map(projectsRes.rows.map((project) => [project.project_code, project.id]));

    const files = fs.readdirSync(WO_DIR).filter((file) => /^WOTQS.*\.pdf$/i.test(file));
    const records = dedupeRecords(files.map(parseFilename));
    const summary = { created: 0, skipped: 0, vendors_created: 0, duplicates_in_folder: files.length - records.length };

    for (const record of records) {
      const existing = await client.query(
        `SELECT id FROM work_orders WHERE UPPER(TRIM(wo_number)) = $1`,
        [record.woNumber]
      );
      if (existing.rows.length) {
        summary.skipped += 1;
        continue;
      }

      const projectCode = projectCodeFor(record.woNumber);
      const projectId = projectByCode.get(projectCode);
      if (!projectId) throw new Error(`Project not found for ${projectCode}`);

      let vendor = await findVendor(client, user.company_id, record.vendorName);
      if (!vendor) {
        vendor = await createVendor(client, user.company_id, record.vendorName);
        summary.vendors_created += 1;
      }

      const subject = displaySubject(record);
      await client.query(
        `INSERT INTO work_orders
           (project_id, vendor_id, wo_number, subject, scope_of_work, work_description,
            start_date, end_date, total_value, contract_amount, status, created_by)
         VALUES ($1,$2,$3,$4,$5,$4,NULL,NULL,0,0,'approved',$6)`,
        [projectId, vendor.id, record.woNumber, subject, `Imported from ${record.fileName}`, user.id]
      );
      summary.created += 1;
    }

    await client.query('COMMIT');
    console.log(JSON.stringify(summary, null, 2));
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
