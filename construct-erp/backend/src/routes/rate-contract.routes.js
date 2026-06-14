// src/routes/rate-contract.routes.js
const express = require('express');
const { authenticate } = require('../middleware/auth');
const { loadProjectScope } = require('../middleware/projectScope');
const { query } = require('../config/database');
const { runSchemaInit } = require('../utils/schemaInit');
const router = express.Router();

runSchemaInit('rate_contracts_table', async () => {
  await query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
  await query(`
    CREATE TABLE IF NOT EXISTS rate_contracts (
      id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      company_id    UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      vendor_id     UUID REFERENCES vendors(id) ON DELETE SET NULL,
      material_name TEXT NOT NULL,
      unit          VARCHAR(50),
      contracted_rate NUMERIC(15,4) NOT NULL,
      valid_from    DATE NOT NULL,
      valid_to      DATE,
      contracted_qty NUMERIC(15,3),
      notes         TEXT,
      status        VARCHAR(20) DEFAULT 'active',
      created_by    UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at    TIMESTAMPTZ DEFAULT NOW(),
      updated_at    TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_rate_contracts_company ON rate_contracts(company_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_rate_contracts_vendor ON rate_contracts(vendor_id)`);
});

router.use(authenticate);
router.use(loadProjectScope);

// GET /procurement/rate-contracts
router.get('/', async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT rc.*, v.name AS vendor_name
      FROM rate_contracts rc
      LEFT JOIN vendors v ON v.id = rc.vendor_id
      WHERE rc.company_id = $1
      ORDER BY rc.created_at DESC
    `, [req.user.company_id]);
    res.json({ data: rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /procurement/rate-contracts
router.post('/', async (req, res) => {
  try {
    const { vendor_id, material_name, unit, contracted_rate, valid_from, valid_to, contracted_qty, notes } = req.body;
    if (!material_name || !contracted_rate || !valid_from) {
      return res.status(400).json({ error: 'material_name, contracted_rate, and valid_from are required' });
    }
    const { rows } = await query(`
      INSERT INTO rate_contracts (company_id, vendor_id, material_name, unit, contracted_rate, valid_from, valid_to, contracted_qty, notes, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING *
    `, [req.user.company_id, vendor_id || null, material_name, unit || null, contracted_rate, valid_from, valid_to || null, contracted_qty || null, notes || null, req.user.id]);
    res.status(201).json({ data: rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /procurement/rate-contracts/:id
router.patch('/:id', async (req, res) => {
  try {
    const { vendor_id, material_name, unit, contracted_rate, valid_from, valid_to, contracted_qty, notes, status } = req.body;
    const check = await query(`SELECT id FROM rate_contracts WHERE id = $1 AND company_id = $2`, [req.params.id, req.user.company_id]);
    if (!check.rows.length) return res.status(404).json({ error: 'Rate contract not found' });
    const { rows } = await query(`
      UPDATE rate_contracts SET
        vendor_id       = COALESCE($1, vendor_id),
        material_name   = COALESCE($2, material_name),
        unit            = COALESCE($3, unit),
        contracted_rate = COALESCE($4, contracted_rate),
        valid_from      = COALESCE($5, valid_from),
        valid_to        = $6,
        contracted_qty  = $7,
        notes           = $8,
        status          = COALESCE($9, status),
        updated_at      = NOW()
      WHERE id = $10
      RETURNING *
    `, [vendor_id || null, material_name || null, unit || null, contracted_rate || null, valid_from || null, valid_to || null, contracted_qty || null, notes || null, status || null, req.params.id]);
    res.json({ data: rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /procurement/rate-contracts/:id
router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await query(`DELETE FROM rate_contracts WHERE id = $1 AND company_id = $2`, [req.params.id, req.user.company_id]);
    if (!rowCount) return res.status(404).json({ error: 'Rate contract not found' });
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
