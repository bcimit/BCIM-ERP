require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { pool } = require('../src/config/database');

(async () => {
  await pool.query(`ALTER TABLE documents ADD COLUMN IF NOT EXISTS doc_type varchar(80) DEFAULT 'general'`);
  await pool.query(`ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_doc_type_check`);
  await pool.query(`
    ALTER TABLE documents ADD CONSTRAINT documents_doc_type_check
    CHECK (doc_type IN (
      'general','project','ra_bill','purchase_order','work_order','grn','mrs',
      'invoice','vendor_bill','bulk_scanned_bill','challan','receipt','payment',
      'hse','quality','drawing','hr','boq','contract','rfi','site_report',
      'safety_report','inspection_report','method_statement','specification',
      'tender_doc','quality_plan','correspondence','certificate','permit'
    ))
  `);

  const res = await pool.query(`
    UPDATE documents
       SET doc_type = 'bulk_scanned_bill',
           updated_at = NOW()
     WHERE module = 'grn'
       AND doc_type = 'general'
       AND (
            LOWER(COALESCE(file_name,'')) LIKE '%bill%'
         OR LOWER(COALESCE(file_name,'')) LIKE '%invoice%'
       )
     RETURNING id, file_name, module, doc_type
  `);

  console.log(`Updated ${res.rowCount} document(s)`);
  console.table(res.rows);
})()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
