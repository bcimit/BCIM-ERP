-- Migration 030: Add per-WO deduction config columns to work_orders
-- Enables RA bills to pre-fill GST, TDS, Retention and Advance Recovery from the work order

ALTER TABLE work_orders
  ADD COLUMN IF NOT EXISTS gst_pct              NUMERIC(5,2) DEFAULT 18,
  ADD COLUMN IF NOT EXISTS tds_pct              NUMERIC(5,2) DEFAULT 2,
  ADD COLUMN IF NOT EXISTS retention_pct        NUMERIC(5,2) DEFAULT 5,
  ADD COLUMN IF NOT EXISTS advance_recovery_pct NUMERIC(5,2) DEFAULT 10,
  ADD COLUMN IF NOT EXISTS labour_welfare_pct   NUMERIC(5,2) DEFAULT 1;
