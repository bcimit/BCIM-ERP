// src/routes/petty-cash.routes.js
const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { query } = require('../config/database');
const { runSchemaInit } = require('../utils/schemaInit');

router.use(authenticate);

const ensureTable = async () => {
  await query(`
    CREATE TABLE IF NOT EXISTS petty_cash_entries (
      id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id     UUID NOT NULL,
      project_id     UUID NOT NULL,
      entry_type     VARCHAR(20) NOT NULL DEFAULT 'expense',
      entry_date     DATE NOT NULL,
      category       VARCHAR(100),
      description    TEXT,
      amount         DECIMAL(12,2) NOT NULL DEFAULT 0,
      voucher_number VARCHAR(50),
      received_by    VARCHAR(100),
      remarks        TEXT,
      created_by     UUID,
      created_at     TIMESTAMPTZ DEFAULT NOW()
    )
  `).catch(() => {});
};
runSchemaInit('petty_cash_entries', ensureTable);

// GET /petty-cash
router.get('/', async (req, res) => {
  const { project_id, from_date, to_date, entry_type } = req.query;
  let sql = `
    SELECT e.*, p.name AS project_name, u.name AS created_by_name
    FROM petty_cash_entries e
    JOIN projects p ON e.project_id = p.id
    LEFT JOIN users u ON e.created_by = u.id
    WHERE e.company_id = $1`;
  const params = [req.user.company_id]; let i = 2;
  if (project_id)  { sql += ` AND e.project_id  = $${i++}`; params.push(project_id); }
  if (entry_type)  { sql += ` AND e.entry_type  = $${i++}`; params.push(entry_type); }
  if (from_date)   { sql += ` AND e.entry_date  >= $${i++}`; params.push(from_date); }
  if (to_date)     { sql += ` AND e.entry_date  <= $${i++}`; params.push(to_date); }
  sql += ' ORDER BY e.entry_date DESC, e.created_at DESC';
  const r = await query(sql, params);
  res.json({ data: r.rows });
});

// GET /petty-cash/summary
router.get('/summary', async (req, res) => {
  const { project_id, from_date, to_date } = req.query;
  let sql = `
    SELECT
      COALESCE(SUM(CASE WHEN entry_type = 'expense'       THEN amount ELSE 0 END), 0) AS total_expenses,
      COALESCE(SUM(CASE WHEN entry_type = 'replenishment' THEN amount ELSE 0 END), 0) AS total_replenishment,
      COUNT(CASE WHEN entry_type = 'expense'       THEN 1 END)::INT AS expense_count,
      COUNT(CASE WHEN entry_type = 'replenishment' THEN 1 END)::INT AS replenishment_count
    FROM petty_cash_entries e
    JOIN projects p ON e.project_id = p.id
    WHERE e.company_id = $1`;
  const params = [req.user.company_id]; let i = 2;
  if (project_id) { sql += ` AND e.project_id = $${i++}`; params.push(project_id); }
  if (from_date)  { sql += ` AND e.entry_date >= $${i++}`; params.push(from_date); }
  if (to_date)    { sql += ` AND e.entry_date <= $${i++}`; params.push(to_date); }
  const r = await query(sql, params);
  res.json({ data: r.rows[0] });
});

// POST /petty-cash
router.post('/', authorize('super_admin', 'admin', 'accountant'), async (req, res) => {
  try {
    const {
      project_id, entry_type, entry_date, category,
      description, amount, voucher_number, received_by, remarks,
    } = req.body;

    const pc = await query(
      `SELECT 1 FROM projects WHERE id = $1 AND company_id = $2 LIMIT 1`,
      [project_id, req.user.company_id]
    );
    if (!pc.rowCount) return res.status(400).json({ error: 'Invalid project' });

    const r = await query(
      `INSERT INTO petty_cash_entries
         (company_id, project_id, entry_type, entry_date, category, description,
          amount, voucher_number, received_by, remarks, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [
        req.user.company_id, project_id,
        entry_type || 'expense', entry_date,
        category || null, description || null,
        amount, voucher_number || null, received_by || null,
        remarks || null, req.user.id,
      ]
    );
    res.status(201).json({ data: r.rows[0] });
  } catch (err) {
    console.error('[petty-cash] POST:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /petty-cash/:id
router.delete('/:id', authorize('super_admin', 'admin'), async (req, res) => {
  try {
    await query(
      `DELETE FROM petty_cash_entries WHERE id = $1 AND company_id = $2`,
      [req.params.id, req.user.company_id]
    );
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
