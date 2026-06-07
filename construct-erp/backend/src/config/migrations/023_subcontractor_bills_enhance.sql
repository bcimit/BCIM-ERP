-- ================================================================
-- Migration 023: Enhance subcontractor bills for full billing workflow
-- ================================================================

-- Add missing columns to subcontractor_bills
ALTER TABLE subcontractor_bills
  ADD COLUMN IF NOT EXISTS bill_type        VARCHAR(20) DEFAULT 'ra'
                             CHECK (bill_type IN ('ra','final','advance','debit_note','credit_note')),
  ADD COLUMN IF NOT EXISTS vendor_id        UUID REFERENCES vendors(id),
  ADD COLUMN IF NOT EXISTS bill_description TEXT,
  ADD COLUMN IF NOT EXISTS gst_pct          NUMERIC(5,2) DEFAULT 18,
  ADD COLUMN IF NOT EXISTS gst_amount       NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS penalty_amount   NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS material_recovery NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS labour_welfare   NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS submitted_by     UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS submitted_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by      UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS approved_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejected_by      UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS rejected_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_remarks TEXT,
  ADD COLUMN IF NOT EXISTS current_stage    VARCHAR(30) DEFAULT 'prepared',
  ADD COLUMN IF NOT EXISTS attachments      JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS updated_at       TIMESTAMPTZ DEFAULT NOW();

-- Bill items (BOQ-wise breakdown)
CREATE TABLE IF NOT EXISTS subcontractor_bill_line_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id         UUID NOT NULL REFERENCES subcontractor_bills(id) ON DELETE CASCADE,
  wo_id           UUID REFERENCES work_orders(id),
  item_description TEXT NOT NULL,
  unit            VARCHAR(30),
  wo_quantity     NUMERIC(14,3) DEFAULT 0,   -- total in work order
  prev_quantity   NUMERIC(14,3) DEFAULT 0,   -- previously billed
  curr_quantity   NUMERIC(14,3) DEFAULT 0,   -- this bill
  balance_quantity NUMERIC(14,3) DEFAULT 0,  -- remaining
  rate            NUMERIC(14,2) DEFAULT 0,
  amount          NUMERIC(18,2) DEFAULT 0,
  remarks         TEXT,
  sequence_no     INTEGER DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_sbli_bill ON subcontractor_bill_line_items(bill_id);

-- Worker/labour billing table
CREATE TABLE IF NOT EXISTS subcontractor_workers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID REFERENCES projects(id) ON DELETE CASCADE,
  vendor_id       UUID REFERENCES vendors(id),
  wo_id           UUID REFERENCES work_orders(id),
  worker_code     VARCHAR(50),
  worker_name     VARCHAR(200) NOT NULL,
  skill_type      VARCHAR(100) DEFAULT 'Unskilled',
  daily_rate      NUMERIC(10,2) DEFAULT 0,
  mobile          VARCHAR(20),
  status          VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sw_project ON subcontractor_workers(project_id);
CREATE INDEX IF NOT EXISTS idx_sw_vendor  ON subcontractor_workers(vendor_id);

-- Labour attendance table
CREATE TABLE IF NOT EXISTS subcontractor_labour_attendance (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id       UUID REFERENCES projects(id),
  vendor_id        UUID REFERENCES vendors(id),
  wo_id            UUID REFERENCES work_orders(id),
  worker_id        UUID REFERENCES subcontractor_workers(id),
  attendance_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  attendance_status VARCHAR(20) DEFAULT 'present' CHECK (attendance_status IN ('present','absent','half_day','overtime')),
  overtime_hours   NUMERIC(5,2) DEFAULT 0,
  wage_amount      NUMERIC(10,2) DEFAULT 0,
  remarks          TEXT,
  marked_by        UUID REFERENCES users(id),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sla_project ON subcontractor_labour_attendance(project_id);
CREATE INDEX IF NOT EXISTS idx_sla_date    ON subcontractor_labour_attendance(attendance_date);

-- Work progress / measurements table
CREATE TABLE IF NOT EXISTS subcontractor_measurements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID REFERENCES projects(id) ON DELETE CASCADE,
  wo_id           UUID NOT NULL REFERENCES work_orders(id),
  vendor_id       UUID REFERENCES vendors(id),
  measurement_date DATE DEFAULT CURRENT_DATE,
  item_description TEXT NOT NULL,
  unit            VARCHAR(30),
  quantity        NUMERIC(14,3) DEFAULT 0,
  rate            NUMERIC(14,2) DEFAULT 0,
  amount          NUMERIC(18,2) GENERATED ALWAYS AS (quantity * rate) STORED,
  location        VARCHAR(300),
  remarks         TEXT,
  attachments     JSONB DEFAULT '[]',
  verified_by     UUID REFERENCES users(id),
  verified_at     TIMESTAMPTZ,
  status          VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','verified','approved')),
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sm_project ON subcontractor_measurements(project_id);
CREATE INDEX IF NOT EXISTS idx_sm_wo      ON subcontractor_measurements(wo_id);

-- Subcontractor settings table
CREATE TABLE IF NOT EXISTS subcontractor_settings (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id           UUID NOT NULL REFERENCES companies(id) UNIQUE,
  default_gst_pct      NUMERIC(5,2) DEFAULT 18,
  default_tds_pct      NUMERIC(5,2) DEFAULT 1,
  default_retention_pct NUMERIC(5,2) DEFAULT 5,
  default_security_pct NUMERIC(5,2) DEFAULT 0,
  require_approved_wo  BOOLEAN DEFAULT true,
  block_overbilling    BOOLEAN DEFAULT true,
  approval_flow        JSONB DEFAULT '["site_engineer","project_manager","qs_billing","accounts_management"]'::jsonb,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

SELECT 'Migration 023 applied — subcontractor billing enhanced' AS result;
