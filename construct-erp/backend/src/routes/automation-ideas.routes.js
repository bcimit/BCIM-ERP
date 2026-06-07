const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

let schemaReady = false;

const ensureSchema = async () => {
  if (schemaReady) return;
  await query(`
    CREATE TABLE IF NOT EXISTS automation_ideas (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
      project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      department TEXT NOT NULL DEFAULT 'General',
      target_module TEXT NOT NULL DEFAULT 'General',
      pain_point TEXT,
      suggested_automation TEXT,
      expected_benefit TEXT,
      is_enabled BOOLEAN NOT NULL DEFAULT true,
      priority TEXT NOT NULL DEFAULT 'medium',
      status TEXT NOT NULL DEFAULT 'idea',
      owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      target_date DATE,
      created_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT automation_ideas_priority_check CHECK (priority IN ('low','medium','high','critical')),
      CONSTRAINT automation_ideas_status_check CHECK (status IN ('idea','review','approved','in_progress','done','on_hold'))
    )
  `);
  await query(`ALTER TABLE automation_ideas ADD COLUMN IF NOT EXISTS is_enabled BOOLEAN NOT NULL DEFAULT true`);
  await query(`CREATE INDEX IF NOT EXISTS idx_automation_ideas_company ON automation_ideas(company_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_automation_ideas_project ON automation_ideas(project_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_automation_ideas_status ON automation_ideas(status)`);
  schemaReady = true;
};

router.use(authenticate);
router.use(async (req, res, next) => {
  try {
    await ensureSchema();
    next();
  } catch (err) {
    next(err);
  }
});

const baseSelect = `
  SELECT ai.*,
         creator.name AS created_by_name,
         owner.name AS owner_name,
         p.name AS project_name
  FROM automation_ideas ai
  LEFT JOIN users creator ON creator.id = ai.created_by
  LEFT JOIN users owner ON owner.id = ai.owner_user_id
  LEFT JOIN projects p ON p.id = ai.project_id
`;

router.get('/stats', async (req, res) => {
  const { rows } = await query(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE status = 'idea')::int AS ideas,
       COUNT(*) FILTER (WHERE status = 'review')::int AS review,
       COUNT(*) FILTER (WHERE status = 'approved')::int AS approved,
       COUNT(*) FILTER (WHERE status = 'in_progress')::int AS in_progress,
       COUNT(*) FILTER (WHERE status = 'done')::int AS done,
       COUNT(*) FILTER (WHERE is_enabled = true)::int AS enabled,
       COUNT(*) FILTER (WHERE is_enabled = false)::int AS disabled,
       COUNT(*) FILTER (WHERE priority IN ('high','critical') AND status != 'done')::int AS urgent
     FROM automation_ideas
     WHERE company_id = $1`,
    [req.user.company_id]
  );
  res.json({ data: rows[0] });
});

router.get('/', async (req, res) => {
  const where = ['ai.company_id = $1'];
  const params = [req.user.company_id];
  const add = (sql, value) => {
    params.push(value);
    where.push(sql.replace('?', `$${params.length}`));
  };

  if (req.query.project_id) add('ai.project_id = ?', req.query.project_id);
  if (req.query.status && req.query.status !== 'all') add('ai.status = ?', req.query.status);
  if (req.query.priority && req.query.priority !== 'all') add('ai.priority = ?', req.query.priority);
  if (req.query.department && req.query.department !== 'all') add('ai.department = ?', req.query.department);
  if (req.query.target_module && req.query.target_module !== 'all') add('ai.target_module = ?', req.query.target_module);
  if (req.query.enabled === 'on') add('ai.is_enabled = ?', true);
  if (req.query.enabled === 'off') add('ai.is_enabled = ?', false);
  if (req.query.search) {
    params.push(`%${String(req.query.search).trim()}%`);
    where.push(`(ai.title ILIKE $${params.length} OR ai.pain_point ILIKE $${params.length} OR ai.suggested_automation ILIKE $${params.length})`);
  }

  const { rows } = await query(
    `${baseSelect}
     WHERE ${where.join(' AND ')}
     ORDER BY
       CASE ai.priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
       ai.updated_at DESC`,
    params
  );
  res.json({ data: rows });
});

router.post('/', async (req, res) => {
  const {
    project_id, title, department, target_module, pain_point, suggested_automation,
    expected_benefit, is_enabled, priority, status, owner_user_id, target_date,
  } = req.body;

  if (!title || !String(title).trim()) {
    return res.status(400).json({ error: 'Automation idea title is required.' });
  }

  const { rows } = await query(
    `INSERT INTO automation_ideas
       (company_id, project_id, title, department, target_module, pain_point, suggested_automation,
        expected_benefit, is_enabled, priority, status, owner_user_id, target_date, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     RETURNING *`,
    [
      req.user.company_id,
      project_id || null,
      String(title).trim(),
      department || 'General',
      target_module || 'General',
      pain_point || null,
      suggested_automation || null,
      expected_benefit || null,
      is_enabled !== undefined ? Boolean(is_enabled) : true,
      priority || 'medium',
      status || 'idea',
      owner_user_id || null,
      target_date || null,
      req.user.id,
    ]
  );
  res.status(201).json({ data: rows[0] });
});

router.patch('/:id', async (req, res) => {
  const allowed = [
    'project_id', 'title', 'department', 'target_module', 'pain_point', 'suggested_automation',
    'expected_benefit', 'is_enabled', 'priority', 'status', 'owner_user_id', 'target_date',
  ];
  const updates = [];
  const params = [];
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(req.body, key)) {
      params.push(key === 'is_enabled' ? Boolean(req.body[key]) : (req.body[key] || null));
      updates.push(`${key} = $${params.length}`);
    }
  }
  if (!updates.length) return res.status(400).json({ error: 'No fields to update.' });
  params.push(req.params.id, req.user.company_id);
  const { rows } = await query(
    `UPDATE automation_ideas
     SET ${updates.join(', ')}, updated_at = NOW()
     WHERE id = $${params.length - 1} AND company_id = $${params.length}
     RETURNING *`,
    params
  );
  if (!rows[0]) return res.status(404).json({ error: 'Automation idea not found.' });
  res.json({ data: rows[0] });
});

router.delete('/:id', authorize('super_admin', 'admin'), async (req, res) => {
  const { rowCount } = await query(
    'DELETE FROM automation_ideas WHERE id = $1 AND company_id = $2',
    [req.params.id, req.user.company_id]
  );
  if (!rowCount) return res.status(404).json({ error: 'Automation idea not found.' });
  res.json({ message: 'Automation idea deleted.' });
});

module.exports = router;
