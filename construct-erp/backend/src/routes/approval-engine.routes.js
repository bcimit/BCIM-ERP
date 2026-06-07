const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

let schemaReady = false;

const DEFAULT_WORKFLOWS = [
  {
    code: 'po_approval',
    name: 'Purchase Order Approval',
    module_name: 'Procurement',
    description: 'Amount-aware approval flow for purchase orders.',
    steps: [
      ['procurement_verify', 'Procurement Verification', 'procurement_manager', 'Procurement', 1, 0, null, 24],
      ['management_release', 'Management Release', 'management', 'Management', 2, 50000, null, 24],
      ['md_authorize', 'MD Authorization', 'managing_director', 'Management', 3, 500000, null, 24],
    ],
  },
  {
    code: 'mrs_approval',
    name: 'Material Requisition Approval',
    module_name: 'Stores',
    description: 'Site to management approval chain for material requisitions.',
    steps: [
      ['site_verify', 'Site Verification', 'site_engineer', 'Site', 1, 0, null, 24],
      ['pm_approve', 'PM Approval', 'project_manager', 'Projects', 2, 0, null, 24],
      ['management_approve', 'Management Approval', 'management', 'Management', 3, 100000, null, 24],
      ['md_approve', 'MD Approval', 'managing_director', 'Management', 4, 500000, null, 24],
    ],
  },
  {
    code: 'bill_tracker',
    name: 'Bill Tracker Certification',
    module_name: 'Bill Tracker',
    description: 'Department-wise bill movement from receipt to payment.',
    steps: [
      ['stores_receive', 'Stores Receipt', 'store_keeper', 'Stores', 1, 0, null, 24],
      ['document_check', 'Document Controller Check', 'document_controller', 'Document Control', 2, 0, null, 24],
      ['qs_certify', 'QS Certification', 'qs_engineer', 'QS', 3, 0, null, 24],
      ['accounts_verify', 'Accounts Verification', 'accountant', 'Accounts', 4, 0, null, 24],
      ['procurement_confirm', 'Procurement Confirmation', 'procurement_manager', 'Procurement', 5, 0, null, 24],
      ['payment_close', 'Payment Closure', 'finance_manager', 'Finance', 6, 0, null, 48],
    ],
  },
  {
    code: 'rfq_comparison',
    name: 'RFQ Comparative Approval',
    module_name: 'Procurement',
    description: 'Quotation comparison approval before purchase order generation.',
    steps: [
      ['procurement_verify', 'Procurement Verify', 'procurement_manager', 'Procurement', 1, 0, null, 24],
      ['finance_check', 'Finance Check', 'finance_manager', 'Finance', 2, 0, null, 24],
      ['md_approval', 'MD Approval', 'managing_director', 'Management', 3, 250000, null, 24],
    ],
  },
  {
    code: 'asset_transfer',
    name: 'Asset Transfer Approval',
    module_name: 'Assets & IT',
    description: 'Approval flow for moving assets between users or sites.',
    steps: [
      ['asset_admin_verify', 'Asset Admin Verification', 'it_admin', 'Assets & IT', 1, 0, null, 24],
      ['pm_accept', 'Project Acceptance', 'project_manager', 'Projects', 2, 0, null, 24],
    ],
  },
  {
    code: 'document_approval',
    name: 'Document Approval',
    module_name: 'DMS',
    description: 'Review and approval workflow for controlled documents.',
    steps: [
      ['technical_review', 'Technical Review', 'project_manager', 'Projects', 1, 0, null, 24],
      ['management_approval', 'Management Approval', 'management', 'Management', 2, 0, null, 24],
    ],
  },
  {
    code: 'quality_ncr',
    name: 'Quality NCR Closure',
    module_name: 'Quality (QA/QC)',
    description: 'Corrective action and closure approval for NCRs.',
    steps: [
      ['qa_review', 'QA/QC Review', 'qa_qc_engineer', 'Quality', 1, 0, null, 24],
      ['pm_closure', 'PM Closure', 'project_manager', 'Projects', 2, 0, null, 24],
    ],
  },
];

async function ensureSchema() {
  if (schemaReady) return;
  await query(`
    CREATE TABLE IF NOT EXISTS approval_workflows (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
      code VARCHAR(80) NOT NULL,
      name TEXT NOT NULL,
      module_name TEXT NOT NULL,
      description TEXT,
      is_enabled BOOLEAN NOT NULL DEFAULT true,
      created_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(company_id, code)
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS approval_workflow_steps (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      workflow_id UUID REFERENCES approval_workflows(id) ON DELETE CASCADE,
      sequence_no INT NOT NULL,
      step_code VARCHAR(80) NOT NULL,
      step_name TEXT NOT NULL,
      approver_role VARCHAR(80),
      approver_department TEXT,
      min_amount NUMERIC(15,2) DEFAULT 0,
      max_amount NUMERIC(15,2),
      sla_hours INT DEFAULT 24,
      is_required BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(workflow_id, sequence_no)
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS approval_instances (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      workflow_id UUID REFERENCES approval_workflows(id) ON DELETE SET NULL,
      company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
      project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
      entity_type VARCHAR(80) NOT NULL,
      entity_id UUID,
      entity_number VARCHAR(120),
      title TEXT NOT NULL,
      amount NUMERIC(15,2) DEFAULT 0,
      status VARCHAR(30) NOT NULL DEFAULT 'pending',
      current_step_id UUID REFERENCES approval_workflow_steps(id) ON DELETE SET NULL,
      current_sequence_no INT,
      requested_by UUID REFERENCES users(id) ON DELETE SET NULL,
      requested_at TIMESTAMPTZ DEFAULT NOW(),
      completed_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT approval_instances_status_check CHECK (status IN ('pending','approved','rejected','cancelled'))
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS approval_actions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      instance_id UUID REFERENCES approval_instances(id) ON DELETE CASCADE,
      step_id UUID REFERENCES approval_workflow_steps(id) ON DELETE SET NULL,
      action VARCHAR(30) NOT NULL,
      actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
      comments TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT approval_actions_action_check CHECK (action IN ('submitted','approved','rejected','cancelled','skipped'))
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_approval_workflows_company ON approval_workflows(company_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_approval_steps_workflow ON approval_workflow_steps(workflow_id, sequence_no)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_approval_instances_company ON approval_instances(company_id, status)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_approval_actions_instance ON approval_actions(instance_id, created_at)`);
  schemaReady = true;
}

async function seedDefaults(companyId, userId) {
  for (const wf of DEFAULT_WORKFLOWS) {
    const inserted = await query(
      `INSERT INTO approval_workflows (company_id, code, name, module_name, description, created_by)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (company_id, code) DO UPDATE
       SET name = EXCLUDED.name, module_name = EXCLUDED.module_name, description = EXCLUDED.description, updated_at = NOW()
       RETURNING id`,
      [companyId, wf.code, wf.name, wf.module_name, wf.description, userId]
    );
    const workflowId = inserted.rows[0].id;
    for (const step of wf.steps) {
      await query(
        `INSERT INTO approval_workflow_steps
           (workflow_id, step_code, step_name, approver_role, approver_department, sequence_no, min_amount, max_amount, sla_hours)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (workflow_id, sequence_no) DO UPDATE
         SET step_code = EXCLUDED.step_code,
             step_name = EXCLUDED.step_name,
             approver_role = EXCLUDED.approver_role,
             approver_department = EXCLUDED.approver_department,
             min_amount = EXCLUDED.min_amount,
             max_amount = EXCLUDED.max_amount,
             sla_hours = EXCLUDED.sla_hours`,
        [workflowId, ...step]
      );
    }
  }
}

async function getFirstStep(workflowId, amount) {
  const { rows } = await query(
    `SELECT * FROM approval_workflow_steps
     WHERE workflow_id = $1
       AND is_required = true
       AND COALESCE(min_amount, 0) <= $2
       AND (max_amount IS NULL OR max_amount >= $2)
     ORDER BY sequence_no ASC
     LIMIT 1`,
    [workflowId, Number(amount || 0)]
  );
  return rows[0] || null;
}

async function getNextStep(workflowId, amount, currentSequence) {
  const { rows } = await query(
    `SELECT * FROM approval_workflow_steps
     WHERE workflow_id = $1
       AND sequence_no > $2
       AND is_required = true
       AND COALESCE(min_amount, 0) <= $3
       AND (max_amount IS NULL OR max_amount >= $3)
     ORDER BY sequence_no ASC
     LIMIT 1`,
    [workflowId, currentSequence, Number(amount || 0)]
  );
  return rows[0] || null;
}

function canActionStep(user, step) {
  if (!user || !step) return false;
  if (['super_admin', 'admin'].includes(user.role)) return true;
  return step.approver_role === user.role;
}

router.use(authenticate);
router.use(async (req, res, next) => {
  try {
    await ensureSchema();
    next();
  } catch (err) {
    next(err);
  }
});

router.post('/seed-defaults', authorize('super_admin', 'admin'), async (req, res) => {
  await seedDefaults(req.user.company_id, req.user.id);
  res.json({ message: 'Default approval workflows are ready.' });
});

router.get('/stats', async (req, res) => {
  const { rows } = await query(
    `SELECT
       (SELECT COUNT(*) FROM approval_workflows WHERE company_id=$1)::int AS workflows,
       (SELECT COUNT(*) FROM approval_workflows WHERE company_id=$1 AND is_enabled=true)::int AS enabled,
       (SELECT COUNT(*) FROM approval_instances WHERE company_id=$1 AND status='pending')::int AS pending,
       (SELECT COUNT(*) FROM approval_instances WHERE company_id=$1 AND status='approved')::int AS approved,
       (SELECT COUNT(*) FROM approval_instances WHERE company_id=$1 AND status='rejected')::int AS rejected`,
    [req.user.company_id]
  );
  res.json({ data: rows[0] });
});

router.get('/workflows', async (req, res) => {
  const { rows } = await query(
    `SELECT w.*,
            COALESCE(json_agg(s ORDER BY s.sequence_no) FILTER (WHERE s.id IS NOT NULL), '[]') AS steps
     FROM approval_workflows w
     LEFT JOIN approval_workflow_steps s ON s.workflow_id = w.id
     WHERE w.company_id = $1
     GROUP BY w.id
     ORDER BY w.module_name, w.name`,
    [req.user.company_id]
  );
  res.json({ data: rows });
});

router.patch('/workflows/:id/toggle', authorize('super_admin', 'admin'), async (req, res) => {
  const { rows } = await query(
    `UPDATE approval_workflows
     SET is_enabled = $1, updated_at = NOW()
     WHERE id = $2 AND company_id = $3
     RETURNING *`,
    [Boolean(req.body.is_enabled), req.params.id, req.user.company_id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Workflow not found.' });
  res.json({ data: rows[0] });
});

router.get('/instances', async (req, res) => {
  const status = req.query.status || 'pending';
  const params = [req.user.company_id];
  const where = ['i.company_id = $1'];
  if (status !== 'all') {
    params.push(status);
    where.push(`i.status = $${params.length}`);
  }
  const { rows } = await query(
    `SELECT i.*, w.name AS workflow_name, w.module_name, s.step_name, s.approver_role, p.name AS project_name, u.name AS requested_by_name
     FROM approval_instances i
     LEFT JOIN approval_workflows w ON w.id = i.workflow_id
     LEFT JOIN approval_workflow_steps s ON s.id = i.current_step_id
     LEFT JOIN projects p ON p.id = i.project_id
     LEFT JOIN users u ON u.id = i.requested_by
     WHERE ${where.join(' AND ')}
     ORDER BY i.requested_at DESC
     LIMIT 200`,
    params
  );
  res.json({ data: rows });
});

router.get('/pending', async (req, res) => {
  const { rows } = await query(
    `SELECT i.*, w.name AS workflow_name, w.module_name, s.step_name, s.approver_role, p.name AS project_name
     FROM approval_instances i
     JOIN approval_workflows w ON w.id = i.workflow_id
     JOIN approval_workflow_steps s ON s.id = i.current_step_id
     LEFT JOIN projects p ON p.id = i.project_id
     WHERE i.company_id = $1
       AND i.status = 'pending'
       AND ($2 = ANY(ARRAY['super_admin','admin']) OR s.approver_role = $2)
     ORDER BY i.requested_at ASC`,
    [req.user.company_id, req.user.role]
  );
  res.json({ data: rows });
});

router.post('/instances', async (req, res) => {
  const { workflow_id, entity_type, entity_id, entity_number, title, amount, project_id } = req.body;
  if (!workflow_id || !entity_type || !title) {
    return res.status(400).json({ error: 'Workflow, entity type, and title are required.' });
  }

  const wf = await query(
    `SELECT * FROM approval_workflows WHERE id=$1 AND company_id=$2 AND is_enabled=true`,
    [workflow_id, req.user.company_id]
  );
  if (!wf.rows[0]) return res.status(404).json({ error: 'Enabled workflow not found.' });

  const firstStep = await getFirstStep(workflow_id, amount || 0);
  const status = firstStep ? 'pending' : 'approved';

  const { rows } = await query(
    `INSERT INTO approval_instances
       (workflow_id, company_id, project_id, entity_type, entity_id, entity_number, title, amount,
        status, current_step_id, current_sequence_no, requested_by, completed_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12, CASE WHEN $9='approved' THEN NOW() ELSE NULL END)
     RETURNING *`,
    [
      workflow_id, req.user.company_id, project_id || null, entity_type, entity_id || null,
      entity_number || null, title, Number(amount || 0), status, firstStep?.id || null,
      firstStep?.sequence_no || null, req.user.id,
    ]
  );
  await query(
    `INSERT INTO approval_actions (instance_id, step_id, action, actor_id, comments)
     VALUES ($1,$2,'submitted',$3,$4)`,
    [rows[0].id, firstStep?.id || null, req.user.id, 'Submitted to approval engine']
  );
  res.status(201).json({ data: rows[0] });
});

router.patch('/instances/:id/action', async (req, res) => {
  const { action, comments } = req.body;
  if (!['approved', 'rejected', 'cancelled'].includes(action)) {
    return res.status(400).json({ error: 'Invalid approval action.' });
  }

  const locked = await query(
    `SELECT i.*, s.step_name, s.approver_role
     FROM approval_instances i
     LEFT JOIN approval_workflow_steps s ON s.id = i.current_step_id
     WHERE i.id=$1 AND i.company_id=$2`,
    [req.params.id, req.user.company_id]
  );
  const instance = locked.rows[0];
  if (!instance) return res.status(404).json({ error: 'Approval instance not found.' });
  if (instance.status !== 'pending') return res.status(400).json({ error: 'This approval is already closed.' });
  if (!canActionStep(req.user, instance)) return res.status(403).json({ error: 'This approval is not assigned to your role.' });

  await query(
    `INSERT INTO approval_actions (instance_id, step_id, action, actor_id, comments)
     VALUES ($1,$2,$3,$4,$5)`,
    [instance.id, instance.current_step_id, action, req.user.id, comments || null]
  );

  if (action !== 'approved') {
    const { rows } = await query(
      `UPDATE approval_instances
       SET status=$1, completed_at=NOW(), updated_at=NOW()
       WHERE id=$2
       RETURNING *`,
      [action === 'cancelled' ? 'cancelled' : 'rejected', instance.id]
    );
    return res.json({ data: rows[0] });
  }

  const nextStep = await getNextStep(instance.workflow_id, instance.amount, instance.current_sequence_no || 0);
  if (!nextStep) {
    const { rows } = await query(
      `UPDATE approval_instances
       SET status='approved', current_step_id=NULL, current_sequence_no=NULL, completed_at=NOW(), updated_at=NOW()
       WHERE id=$1
       RETURNING *`,
      [instance.id]
    );
    return res.json({ data: rows[0] });
  }

  const { rows } = await query(
    `UPDATE approval_instances
     SET current_step_id=$1, current_sequence_no=$2, updated_at=NOW()
     WHERE id=$3
     RETURNING *`,
    [nextStep.id, nextStep.sequence_no, instance.id]
  );
  res.json({ data: rows[0] });
});

router.get('/instances/:id/history', async (req, res) => {
  const owned = await query(
    `SELECT 1 FROM approval_instances WHERE id=$1 AND company_id=$2`,
    [req.params.id, req.user.company_id]
  );
  if (!owned.rows[0]) return res.status(404).json({ error: 'Approval instance not found.' });
  const { rows } = await query(
    `SELECT a.*, s.step_name, u.name AS actor_name
     FROM approval_actions a
     LEFT JOIN approval_workflow_steps s ON s.id = a.step_id
     LEFT JOIN users u ON u.id = a.actor_id
     WHERE a.instance_id=$1
     ORDER BY a.created_at ASC`,
    [req.params.id]
  );
  res.json({ data: rows });
});

module.exports = router;
