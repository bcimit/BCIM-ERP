const fs = require('fs');
const path = require('path');
const { pool } = require('../src/config/database');

const SOURCE_ROOT = path.resolve(__dirname, '../../qaqc/QC Documents');
const UPLOAD_ROOT = path.resolve(__dirname, '../uploads/documents/qaqc-lh10');
const LOCAL_URL_PREFIX = '/uploads/documents/qaqc-lh10';

const PROJECT_PATTERNS = ['%lanco%', '%lancho%', '%lh10%'];

const normalizePath = (value) => value.split(path.sep).join('/');

const classify = (relativePath) => {
  const p = relativePath.toLowerCase();
  const ext = path.extname(relativePath).toLowerCase();
  const meta = {
    doc_type: 'general',
    discipline: 'QA/QC',
    status: 'draft',
    access_level: 'internal',
    vendor_name: null,
    revision: null,
    tags: ['qaqc', 'lh10'],
  };

  if (p.includes('checklist-lh10')) {
    meta.doc_type = 'inspection_report';
    meta.status = 'approved';
    meta.tags.push('checklist', 'rfi-template');
  }
  if (p.includes('methodology')) {
    meta.doc_type = 'method_statement';
    meta.status = ext === '.pdf' ? 'approved' : 'draft';
    meta.tags.push('methodology', ext === '.pdf' ? 'approved-copy' : 'editable-source');
  }
  if (p.includes('project quality plan')) {
    meta.doc_type = 'quality_plan';
    meta.tags.push('project-quality-plan');
  }
  if (p.includes('itp')) {
    meta.doc_type = 'quality_plan';
    meta.tags.push('itp');
  }
  if (p.includes('vendor details')) {
    meta.doc_type = p.includes('nabl') || p.includes('gst') || p.includes('udayam') ? 'certificate' : 'general';
    meta.status = 'approved';
    meta.tags.push('vendor-qc-document');
  }
  if (p.includes('stedrant')) meta.vendor_name = 'Stedrant';
  if (p.includes('top notch') || p.includes('topnotch')) meta.vendor_name = 'Top Notch';
  if (p.includes('rajalaxmi')) {
    meta.vendor_name = 'Rajalaxmi';
    meta.doc_type = 'method_statement';
    meta.status = 'approved';
    meta.tags.push('vendor-methodology');
  }
  if (p.includes('waterproofing - r1')) meta.revision = 'R1';
  if (p.includes('waterproofing - r2') || p.includes('waterproofing - r2')) meta.revision = 'R2';

  return meta;
};

async function ensureSchema(client) {
  await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
  await client.query(`
    ALTER TABLE documents
      ADD COLUMN IF NOT EXISTS folder_id UUID,
      ADD COLUMN IF NOT EXISTS doc_type VARCHAR(50) DEFAULT 'general',
      ADD COLUMN IF NOT EXISTS doc_number VARCHAR(120),
      ADD COLUMN IF NOT EXISTS doc_title TEXT,
      ADD COLUMN IF NOT EXISTS discipline VARCHAR(80),
      ADD COLUMN IF NOT EXISTS description TEXT,
      ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT ARRAY[]::TEXT[],
      ADD COLUMN IF NOT EXISTS expiry_date DATE,
      ADD COLUMN IF NOT EXISTS access_level VARCHAR(30) DEFAULT 'internal',
      ADD COLUMN IF NOT EXISTS is_confidential BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS revision VARCHAR(20) DEFAULT 'A',
      ADD COLUMN IF NOT EXISTS revision_no INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS document_folders (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
      parent_id UUID REFERENCES document_folders(id) ON DELETE CASCADE,
      folder_name TEXT NOT NULL,
      folder_type VARCHAR(30) DEFAULT 'general',
      project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
      path TEXT,
      description TEXT,
      created_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

async function getProject(client) {
  const res = await client.query(
    `SELECT id, name, project_code, company_id
     FROM projects
     WHERE lower(name) LIKE $1 OR lower(name) LIKE $2 OR lower(name) LIKE $3 OR lower(coalesce(project_code,'')) LIKE $3
     ORDER BY name
     LIMIT 1`,
    PROJECT_PATTERNS
  );
  if (!res.rows.length) throw new Error('LANCO/LH10 project not found');
  return res.rows[0];
}

async function getSystemUser(client, companyId) {
  const res = await client.query(
    `SELECT id FROM users
     WHERE company_id = $1 AND is_active = true
     ORDER BY CASE WHEN role IN ('super_admin','admin') THEN 0 ELSE 1 END, created_at NULLS LAST
     LIMIT 1`,
    [companyId]
  );
  return res.rows[0]?.id || null;
}

async function upsertFolder(client, { companyId, projectId, folderName, folderPath, parentId, userId }) {
  const existing = await client.query(
    `SELECT id FROM document_folders WHERE company_id = $1 AND project_id = $2 AND path = $3 LIMIT 1`,
    [companyId, projectId, folderPath]
  );
  if (existing.rows.length) return existing.rows[0].id;
  const created = await client.query(
    `INSERT INTO document_folders (company_id, parent_id, folder_name, folder_type, project_id, path, description, created_by)
     VALUES ($1,$2,$3,'project',$4,$5,$6,$7)
     RETURNING id`,
    [companyId, parentId, folderName, projectId, folderPath, 'Imported QA/QC document folder for LANCO Hills LH10', userId]
  );
  return created.rows[0].id;
}

function listFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return listFiles(full);
    if (!entry.isFile()) return [];
    return [full];
  });
}

async function main() {
  if (!fs.existsSync(SOURCE_ROOT)) throw new Error(`Source folder not found: ${SOURCE_ROOT}`);
  fs.mkdirSync(UPLOAD_ROOT, { recursive: true });

  const client = await pool.connect();
  const summary = { copied: 0, inserted: 0, skipped: 0, folders: 0, files: 0 };
  try {
    await client.query('BEGIN');
    await ensureSchema(client);
    const project = await getProject(client);
    const userId = await getSystemUser(client, project.company_id);

    const rootFolderId = await upsertFolder(client, {
      companyId: project.company_id,
      projectId: project.id,
      folderName: 'QA/QC Documents - LH10',
      folderPath: 'QA/QC Documents - LH10',
      parentId: null,
      userId,
    });
    summary.folders += 1;

    const folderCache = new Map([['', rootFolderId]]);
    const files = listFiles(SOURCE_ROOT);
    summary.files = files.length;

    for (const file of files) {
      const rel = normalizePath(path.relative(SOURCE_ROOT, file));
      const relDir = normalizePath(path.dirname(rel));
      const dest = path.join(UPLOAD_ROOT, rel);
      const localUrl = `${LOCAL_URL_PREFIX}/${rel}`;
      const stat = fs.statSync(file);
      const ext = path.extname(file).replace(/^\./, '').toLowerCase();
      const parsed = path.parse(file);
      const meta = classify(rel);

      fs.mkdirSync(path.dirname(dest), { recursive: true });
      if (!fs.existsSync(dest) || fs.statSync(dest).size !== stat.size) {
        fs.copyFileSync(file, dest);
        summary.copied += 1;
      }

      let parentId = rootFolderId;
      let builtPath = '';
      if (relDir !== '.') {
        for (const part of relDir.split('/')) {
          builtPath = builtPath ? `${builtPath}/${part}` : part;
          if (!folderCache.has(builtPath)) {
            const folderId = await upsertFolder(client, {
              companyId: project.company_id,
              projectId: project.id,
              folderName: part,
              folderPath: `QA/QC Documents - LH10/${builtPath}`,
              parentId,
              userId,
            });
            folderCache.set(builtPath, folderId);
            summary.folders += 1;
          }
          parentId = folderCache.get(builtPath);
        }
      }

      const duplicate = await client.query(
        `SELECT id FROM documents WHERE company_id = $1 AND local_url = $2 LIMIT 1`,
        [project.company_id, localUrl]
      );
      if (duplicate.rows.length) {
        summary.skipped += 1;
        continue;
      }

      await client.query(
        `INSERT INTO documents (
          company_id, project_id, folder_id, module, file_name, file_type, file_size, local_url,
          tags, uploaded_by, doc_type, doc_title, discipline, description, access_level,
          status, revision, metadata
        ) VALUES (
          $1,$2,$3,'qaqc',$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17
        )`,
        [
          project.company_id,
          project.id,
          parentId,
          parsed.base,
          ext,
          stat.size,
          localUrl,
          meta.tags,
          userId,
          meta.doc_type,
          parsed.name,
          meta.discipline,
          `Imported from QA/QC document pack: ${rel}`,
          meta.access_level,
          meta.status,
          meta.revision || 'A',
          JSON.stringify({
            source: 'qaqc_lh10_folder_import',
            original_path: rel,
            vendor_name: meta.vendor_name,
            imported_at: new Date().toISOString(),
          }),
        ]
      );
      summary.inserted += 1;
    }

    await client.query('COMMIT');
    console.log(JSON.stringify({ project, summary }, null, 2));
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
