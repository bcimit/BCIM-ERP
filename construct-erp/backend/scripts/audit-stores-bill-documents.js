require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const fs = require('fs');
const path = require('path');
const { pool } = require('../src/config/database');

const uploadRoot = path.resolve(__dirname, '..');
const toDiskPath = (localUrl) => {
  if (!localUrl) return null;
  const rel = String(localUrl).replace(/^\/+/, '');
  return path.join(uploadRoot, rel);
};

(async () => {
  const summary = await pool.query(`
    SELECT
      COALESCE(NULLIF(module,''),'(blank)') AS module,
      COALESCE(NULLIF(doc_type,''),'(blank)') AS doc_type,
      COUNT(*)::int AS count
    FROM documents
    WHERE LOWER(COALESCE(module,'')) IN ('stores','grn','inventory','store','procurement')
       OR LOWER(COALESCE(doc_type,'')) LIKE '%grn%'
       OR LOWER(COALESCE(doc_type,'')) LIKE '%bill%'
       OR LOWER(COALESCE(file_name,'')) LIKE '%bill%'
       OR LOWER(COALESCE(file_name,'')) LIKE '%invoice%'
    GROUP BY 1,2
    ORDER BY count DESC, module, doc_type
  `);

  console.log('\nDocument classification summary');
  console.table(summary.rows);

  const recent = await pool.query(`
    SELECT d.id, d.file_name, d.module, d.doc_type, d.module_record_id,
           d.project_id, p.name AS project_name, d.local_url, d.file_size,
           d.created_at, d.uploaded_by, u.name AS uploaded_by_name
    FROM documents d
    LEFT JOIN projects p ON p.id = d.project_id
    LEFT JOIN users u ON u.id = d.uploaded_by
    WHERE LOWER(COALESCE(d.module,'')) IN ('stores','grn','inventory','store','procurement')
       OR LOWER(COALESCE(d.doc_type,'')) LIKE '%grn%'
       OR LOWER(COALESCE(d.doc_type,'')) LIKE '%bill%'
       OR LOWER(COALESCE(d.file_name,'')) LIKE '%bill%'
       OR LOWER(COALESCE(d.file_name,'')) LIKE '%invoice%'
    ORDER BY d.created_at DESC NULLS LAST
    LIMIT 80
  `);

  const rows = recent.rows.map((row) => {
    const disk = toDiskPath(row.local_url);
    return {
      created_at: row.created_at ? new Date(row.created_at).toISOString().slice(0, 19) : null,
      file_name: row.file_name,
      module: row.module,
      doc_type: row.doc_type,
      linked_to: row.module_record_id ? 'linked' : 'not linked',
      project: row.project_name || row.project_id || '-',
      uploaded_by: row.uploaded_by_name || row.uploaded_by || '-',
      file_exists: disk ? fs.existsSync(disk) : false,
      size: row.file_size,
      id: row.id,
    };
  });

  console.log('\nRecent stores/GRN/bill/invoice document records');
  console.table(rows);

  const missing = rows.filter((row) => !row.file_exists);
  if (missing.length) {
    console.log('\nMissing physical files');
    console.table(missing.map((row) => ({ file_name: row.file_name, id: row.id })));
  }

  const unlinked = rows.filter((row) => row.module?.toLowerCase() === 'grn' && row.linked_to === 'not linked');
  if (unlinked.length) {
    console.log('\nGRN-classified documents not linked to a GRN record');
    console.table(unlinked.map((row) => ({ file_name: row.file_name, doc_type: row.doc_type, id: row.id })));
  }
})()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
