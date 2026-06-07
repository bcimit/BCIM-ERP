-- ================================================================
-- Migration 024: Complete Subcontractor Management Module
-- Prefix: sc_ to avoid conflicts with existing tables
-- ================================================================

-- ── 1. Subcontractor Master ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS sc_subcontractors (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  sc_code         VARCHAR(30) NOT NULL,        -- auto-generated SC-001
  name            VARCHAR(300) NOT NULL,
  contact_person  VARCHAR(200),
  mobile          VARCHAR(20),
  email           VARCHAR(200),
  gst_number      VARCHAR(20),
  pan_number      VARCHAR(20),
  address         TEXT,
  city            VARCHAR(100),
  state           VARCHAR(100),
  pincode         VARCHAR(10),
  trade_type      VARCHAR(100),                -- Civil, Electrical, Plumbing...
  bank_name       VARCHAR(200),
  account_number  VARCHAR(50),
  ifsc_code       VARCHAR(20),
  bank_branch     VARCHAR(200),
  status          VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','inactive','blacklisted')),
  notes           TEXT,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (company_id, sc_code)
);
CREATE INDEX IF NOT EXISTS idx_sc_company ON sc_subcontractors(company_id);

-- ── 2. Work Orders ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sc_work_orders (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id        UUID NOT NULL REFERENCES projects(id),
  sc_id             UUID NOT NULL REFERENCES sc_subcontractors(id),
  wo_number         VARCHAR(60) NOT NULL UNIQUE,  -- WO-LH10-001
  subject           VARCHAR(500) NOT NULL,
  description       TEXT,
  scope_of_work     TEXT,
  terms_conditions  TEXT,
  -- Dates
  start_date        DATE,
  end_date          DATE,
  -- Financials
  contract_amount   NUMERIC(18,2) DEFAULT 0,
  gst_pct           NUMERIC(5,2)  DEFAULT 18,
  tds_pct           NUMERIC(5,2)  DEFAULT 2,
  retention_pct     NUMERIC(5,2)  DEFAULT 5,
  advance_amount    NUMERIC(18,2) DEFAULT 0,
  advance_paid      NUMERIC(18,2) DEFAULT 0,
  -- Status
  status            VARCHAR(20)   DEFAULT 'draft'
                      CHECK (status IN ('draft','submitted','approved','active','completed','terminated','closed')),
  approved_by       UUID REFERENCES users(id),
  approved_at       TIMESTAMPTZ,
  -- Tracking
  total_billed      NUMERIC(18,2) DEFAULT 0,
  total_paid        NUMERIC(18,2) DEFAULT 0,
  retention_held    NUMERIC(18,2) DEFAULT 0,
  created_by        UUID REFERENCES users(id),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sc_wo_project ON sc_work_orders(project_id);
CREATE INDEX IF NOT EXISTS idx_sc_wo_sc      ON sc_work_orders(sc_id);

-- ── 3. Work Order BOQ Items ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS sc_wo_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wo_id           UUID NOT NULL REFERENCES sc_work_orders(id) ON DELETE CASCADE,
  item_code       VARCHAR(50),
  description     TEXT NOT NULL,
  unit            VARCHAR(30),
  qty             NUMERIC(14,3) DEFAULT 0,
  rate            NUMERIC(14,2) DEFAULT 0,
  amount          NUMERIC(18,2) GENERATED ALWAYS AS (qty * rate) STORED,
  billed_qty      NUMERIC(14,3) DEFAULT 0,
  balance_qty     NUMERIC(14,3) DEFAULT 0,
  sequence_no     INTEGER DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_sc_wo_items_wo ON sc_wo_items(wo_id);

-- ── 4. Workers / Labour Registry ─────────────────────────────────
CREATE TABLE IF NOT EXISTS sc_workers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES companies(id),
  project_id      UUID REFERENCES projects(id),
  sc_id           UUID REFERENCES sc_subcontractors(id),
  wo_id           UUID REFERENCES sc_work_orders(id),
  worker_code     VARCHAR(50),
  worker_name     VARCHAR(200) NOT NULL,
  skill_type      VARCHAR(100) DEFAULT 'Unskilled',
  daily_rate      NUMERIC(10,2) DEFAULT 0,
  mobile          VARCHAR(20),
  aadhar_number   VARCHAR(20),
  status          VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sc_workers_sc ON sc_workers(sc_id);

-- ── 5. Labour Attendance ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sc_attendance (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        UUID NOT NULL REFERENCES companies(id),
  project_id        UUID REFERENCES projects(id),
  sc_id             UUID REFERENCES sc_subcontractors(id),
  wo_id             UUID REFERENCES sc_work_orders(id),
  worker_id         UUID REFERENCES sc_workers(id),
  attendance_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  status            VARCHAR(20) DEFAULT 'present'
                      CHECK (status IN ('present','absent','half_day','holiday')),
  hours_worked      NUMERIC(5,2) DEFAULT 8,
  overtime_hours    NUMERIC(5,2) DEFAULT 0,
  wage_amount       NUMERIC(10,2) DEFAULT 0,
  overtime_amount   NUMERIC(10,2) DEFAULT 0,
  location          VARCHAR(200),
  remarks           TEXT,
  marked_by         UUID REFERENCES users(id),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sc_att_date ON sc_attendance(attendance_date);
CREATE INDEX IF NOT EXISTS idx_sc_att_sc   ON sc_attendance(sc_id);

-- ── 6. Work Progress / Measurements ──────────────────────────────
CREATE TABLE IF NOT EXISTS sc_progress (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES companies(id),
  project_id      UUID REFERENCES projects(id),
  wo_id           UUID NOT NULL REFERENCES sc_work_orders(id),
  sc_id           UUID REFERENCES sc_subcontractors(id),
  wo_item_id      UUID REFERENCES sc_wo_items(id),
  progress_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  description     TEXT NOT NULL,
  unit            VARCHAR(30),
  quantity        NUMERIC(14,3) DEFAULT 0,
  location        VARCHAR(300),      -- Block A / Floor 3
  remarks         TEXT,
  attachments     JSONB DEFAULT '[]',
  status          VARCHAR(20) DEFAULT 'pending'
                    CHECK (status IN ('pending','verified','approved','rejected')),
  verified_by     UUID REFERENCES users(id),
  verified_at     TIMESTAMPTZ,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sc_prog_wo ON sc_progress(wo_id);

-- ── 7. Bills ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sc_bills (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        UUID NOT NULL REFERENCES companies(id),
  project_id        UUID REFERENCES projects(id),
  wo_id             UUID NOT NULL REFERENCES sc_work_orders(id),
  sc_id             UUID NOT NULL REFERENCES sc_subcontractors(id),
  bill_number       VARCHAR(60) NOT NULL UNIQUE,   -- BILL-LH10-001
  bill_date         DATE NOT NULL DEFAULT CURRENT_DATE,
  bill_type         VARCHAR(20) DEFAULT 'ra'
                      CHECK (bill_type IN ('ra','final','advance','extra_item')),
  period_from       DATE,
  period_to         DATE,
  description       TEXT,
  -- Amounts
  gross_amount      NUMERIC(18,2) DEFAULT 0,
  gst_pct           NUMERIC(5,2)  DEFAULT 18,
  gst_amount        NUMERIC(18,2) DEFAULT 0,
  tds_pct           NUMERIC(5,2)  DEFAULT 2,
  tds_amount        NUMERIC(18,2) DEFAULT 0,
  retention_pct     NUMERIC(5,2)  DEFAULT 5,
  retention_amount  NUMERIC(18,2) DEFAULT 0,
  advance_recovery  NUMERIC(18,2) DEFAULT 0,
  material_recovery NUMERIC(18,2) DEFAULT 0,
  penalty_amount    NUMERIC(18,2) DEFAULT 0,
  other_deductions  NUMERIC(18,2) DEFAULT 0,
  net_payable       NUMERIC(18,2) DEFAULT 0,
  -- Approval
  status            VARCHAR(20) DEFAULT 'draft'
                      CHECK (status IN ('draft','submitted','under_review','approved','rejected','paid')),
  current_stage     VARCHAR(40) DEFAULT 'site_engineer',
  submitted_by      UUID REFERENCES users(id),
  submitted_at      TIMESTAMPTZ,
  approved_by       UUID REFERENCES users(id),
  approved_at       TIMESTAMPTZ,
  rejected_by       UUID REFERENCES users(id),
  rejection_remarks TEXT,
  -- Payment
  paid_amount       NUMERIC(18,2) DEFAULT 0,
  payment_date      DATE,
  payment_ref       VARCHAR(200),
  payment_mode      VARCHAR(30),
  attachments       JSONB DEFAULT '[]',
  created_by        UUID REFERENCES users(id),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sc_bills_wo     ON sc_bills(wo_id);
CREATE INDEX IF NOT EXISTS idx_sc_bills_status ON sc_bills(status);

-- ── 8. Bill Line Items ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sc_bill_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id         UUID NOT NULL REFERENCES sc_bills(id) ON DELETE CASCADE,
  wo_item_id      UUID REFERENCES sc_wo_items(id),
  description     TEXT NOT NULL,
  unit            VARCHAR(30),
  wo_qty          NUMERIC(14,3) DEFAULT 0,
  prev_qty        NUMERIC(14,3) DEFAULT 0,
  curr_qty        NUMERIC(14,3) DEFAULT 0,
  balance_qty     NUMERIC(14,3) DEFAULT 0,
  rate            NUMERIC(14,2) DEFAULT 0,
  amount          NUMERIC(18,2) GENERATED ALWAYS AS (curr_qty * rate) STORED,
  remarks         TEXT,
  sequence_no     INTEGER DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_sc_bill_items_bill ON sc_bill_items(bill_id);

-- ── 9. Bill Approval Log ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sc_bill_approvals (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id     UUID NOT NULL REFERENCES sc_bills(id) ON DELETE CASCADE,
  stage       VARCHAR(40) NOT NULL,
  action      VARCHAR(20) NOT NULL CHECK (action IN ('submitted','approved','rejected','revised')),
  actor_id    UUID REFERENCES users(id),
  actor_name  VARCHAR(200),
  comments    TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sc_appr_bill ON sc_bill_approvals(bill_id);

-- ── 10. Payments ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sc_payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES companies(id),
  project_id      UUID REFERENCES projects(id),
  bill_id         UUID NOT NULL REFERENCES sc_bills(id),
  sc_id           UUID REFERENCES sc_subcontractors(id),
  payment_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  amount          NUMERIC(18,2) NOT NULL,
  payment_mode    VARCHAR(30) DEFAULT 'bank_transfer'
                    CHECK (payment_mode IN ('bank_transfer','neft','rtgs','cheque','cash','upi')),
  reference_no    VARCHAR(200),
  bank_name       VARCHAR(200),
  remarks         TEXT,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sc_pay_bill ON sc_payments(bill_id);
CREATE INDEX IF NOT EXISTS idx_sc_pay_sc   ON sc_payments(sc_id);

-- ── 11. Module Settings ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sc_settings (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id            UUID NOT NULL REFERENCES companies(id) UNIQUE,
  default_gst_pct       NUMERIC(5,2) DEFAULT 18,
  default_tds_pct       NUMERIC(5,2) DEFAULT 2,
  default_retention_pct NUMERIC(5,2) DEFAULT 5,
  approval_stages       JSONB DEFAULT '["site_engineer","project_manager","qs_engineer","accounts"]',
  wo_prefix             VARCHAR(20) DEFAULT 'WO',
  bill_prefix           VARCHAR(20) DEFAULT 'BILL',
  require_wo_approval   BOOLEAN DEFAULT true,
  block_overbilling     BOOLEAN DEFAULT true,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

SELECT 'Migration 024 applied — Subcontractor Module tables created' AS result;
