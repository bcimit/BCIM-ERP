// scripts/attach-wotqs-pdf-documents.js
// Copies WO PDFs from the share folder into uploads/documents and creates
// document records linked to each work_order row.
//
// Usage (from backend/):
//   node scripts/attach-wotqs-pdf-documents.js
//
require('dotenv').config();

const fs   = require('fs');
const path = require('path');
const { v4: uuid } = require('uuid');
const { pool } = require('../src/config/database');

const WO_DIR      = process.argv[2] || 'D:/QS SHARE/QS WORKINGS/DQS/WO';
const UPLOADS_DIR = path.join(__dirname, '../uploads/documents');

function parseFilename(fileName) {
  const base  = fileName.replace(/\.pdf$/i, '').trim();
  const match = base.match(/^(WOTQS\d+(?:-A\d+)?)-(.+)$/i);
  if (match) return { woNumber: match[1].toUpperCase(), fileName };
  const dash = base.indexOf('-');
  return { woNumber: (dash > 0 ? base.slice(0, dash) : base).trim().toUpperCase(), fileName };
}

async function main() {
  if (!fs.existsSync(WO_DIR)) throw new Error(`WO folder not found: ${WO_DIR}`);
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });

  const client = await pool.connect();
  try {
    const userRes = await client.query(
      `SELECT id, company_id FROM users WHERE role = 'super_admin' ORDER BY created_at LIMIT 1`
    );
    if (!userRes.rows.length) throw new Error('No super_admin user found');
    const { id: userId, company_id: companyId } = userRes.rows[0];

    const files = fs.readdirSync(WO_DIR).filter(f => /^WOTQS.*\.pdf$/i.test(f));
    const summary = { attached: 0, skipped_no_wo: 0, skipped_already_exists: 0, errors: [] };

    for (const fileName of files) {
      const { woNumber } = parseFilename(fileName);
      const srcPath      = path.join(WO_DIR, fileName);

      // Find the work order
      const woRes = await client.query(
        `SELECT id, project_id FROM work_orders WHERE UPPER(TRIM(wo_number)) = $1 LIMIT 1`,
        [woNumber]
      );
      if (!woRes.rows.length) {
        console.log(`  ⚠  No WO found for ${woNumber} (${fileName})`);
        summary.skipped_no_wo += 1;
        continue;
      }
      const wo = woRes.rows[0];

      // Skip if a document with this filename is already linked to this WO
      const dupRes = await client.query(
        `SELECT id FROM documents WHERE module_record_id = $1 AND file_name = $2 LIMIT 1`,
        [wo.id, fileName]
      );
      if (dupRes.rows.length) {
        console.log(`  ↩  Already attached: ${fileName}`);
        summary.skipped_already_exists += 1;
        continue;
      }

      try {
        // Copy to uploads/documents/ with a UUID filename
        const destName = `${uuid()}.pdf`;
        const destPath = path.join(UPLOADS_DIR, destName);
        fs.copyFileSync(srcPath, destPath);

        const fileSize = fs.statSync(srcPath).size;
        const localUrl = `/uploads/documents/${destName}`;

        await client.query(
          `INSERT INTO documents
             (company_id, project_id, module, module_record_id,
              file_name, file_type, file_size, local_url, tags, uploaded_by)
           VALUES ($1,$2,'work_order',$3,$4,'pdf',$5,$6,'{work-order,wotqs}',$7)`,
          [companyId, wo.project_id, wo.id, fileName, fileSize, localUrl, userId]
        );

        console.log(`  ✅  ${woNumber} ← ${fileName}`);
        summary.attached += 1;
      } catch (err) {
        console.error(`  ❌  ${fileName}: ${err.message}`);
        summary.errors.push({ file: fileName, error: err.message });
      }
    }

    console.log('\n── Summary ──────────────────────────────');
    console.log(`  Attached:              ${summary.attached}`);
    console.log(`  WO not found (skipped):${summary.skipped_no_wo}`);
    console.log(`  Already attached:      ${summary.skipped_already_exists}`);
    console.log(`  Errors:                ${summary.errors.length}`);
    if (summary.errors.length) {
      console.log('\n  Errors:');
      summary.errors.forEach(e => console.log(`    ${e.file}: ${e.error}`));
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error(err.message);
  process.exit(1);
});
