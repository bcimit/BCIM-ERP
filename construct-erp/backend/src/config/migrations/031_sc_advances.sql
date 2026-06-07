-- Migration 031: Subcontractor advances table
-- Tracks mobilization / material / equipment advances given to subcontractors per WO

CREATE TABLE IF NOT EXISTS subcontractor_advances (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       UUID         NOT NULL,
  project_id       UUID         NOT NULL REFERENCES projects(id),
  wo_id            UUID         NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  vendor_id        UUID         NOT NULL REFERENCES vendors(id),
  advance_type     VARCHAR(50)  NOT NULL DEFAULT 'mobilization',
  amount           NUMERIC(15,2) NOT NULL,
  advance_date     DATE         NOT NULL,
  recovered_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  recovery_status  VARCHAR(30)  NOT NULL DEFAULT 'pending',
  payment_mode     VARCHAR(50),
  payment_ref      VARCHAR(100),
  notes            TEXT,
  created_by       UUID REFERENCES users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sc_advances_wo      ON subcontractor_advances(wo_id);
CREATE INDEX IF NOT EXISTS idx_sc_advances_vendor  ON subcontractor_advances(vendor_id);
CREATE INDEX IF NOT EXISTS idx_sc_advances_project ON subcontractor_advances(project_id);
