-- ================================================================
-- Migration 015: Subcontractor Management — Full Enhancement
-- ================================================================

-- ── Extend vendors table for subcontractor fields ─────────────────
ALTER TABLE vendors
  ADD COLUMN IF NOT EXISTS vendor_category        VARCHAR(30) DEFAULT 'vendor'
                             CHECK (vendor_category IN ('vendor','subcontractor','consultant','labour_contractor','both')),
  ADD COLUMN IF NOT EXISTS trade_categories       TEXT[],       -- ['Civil','Electrical','Plumbing']
  ADD COLUMN IF NOT EXISTS prequalification_status VARCHAR(20) DEFAULT 'not_evaluated'
                             CHECK (prequalification_status IN ('not_evaluated','under_review','approved','conditional','rejected')),
  ADD COLUMN IF NOT EXISTS overall_rating         NUMERIC(3,1),  -- 1-10
  ADD COLUMN IF NOT EXISTS last_evaluation_date   DATE,
  ADD COLUMN IF NOT EXISTS pan_number             VARCHAR(20),
  ADD COLUMN IF NOT EXISTS gst_number             VARCHAR(20),
  ADD COLUMN IF NOT EXISTS bank_account_no        VARCHAR(50),
  ADD COLUMN IF NOT EXISTS bank_name              VARCHAR(200),
  ADD COLUMN IF NOT EXISTS bank_ifsc              VARCHAR(20),
  ADD COLUMN IF NOT EXISTS insurance_expiry       DATE,
  ADD COLUMN IF NOT EXISTS labour_license_no      VARCHAR(100),
  ADD COLUMN IF NOT EXISTS labour_license_expiry  DATE;

-- ── Subcontractor Prequalification ────────────────────────────────
CREATE TABLE IF NOT EXISTS subcontractor_prequalification (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id            UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  project_id           UUID REFERENCES projects(id),
  evaluation_date      DATE DEFAULT CURRENT_DATE,
  evaluator_id         UUID REFERENCES users(id),
  -- Technical criteria (0-100 each)
  technical_score      NUMERIC(5,2) DEFAULT 0,
  financial_score      NUMERIC(5,2) DEFAULT 0,
  experience_score     NUMERIC(5,2) DEFAULT 0,
  safety_score         NUMERIC(5,2) DEFAULT 0,
  quality_score        NUMERIC(5,2) DEFAULT 0,
  -- Weighted overall
  overall_score        NUMERIC(5,2) DEFAULT 0,
  grade                VARCHAR(5) DEFAULT 'C'
                         CHECK (grade IN ('A+','A','B','C','D')),
  status               VARCHAR(20) DEFAULT 'pending'
                         CHECK (status IN ('pending','approved','rejected','conditional')),
  valid_until          DATE,
  remarks              TEXT,
  supporting_docs      JSONB DEFAULT '[]',
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_prequal_vendor ON subcontractor_prequalification(vendor_id);

-- ── Subcontractor Contracts ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS subcontractor_contracts (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id             UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  vendor_id              UUID NOT NULL REFERENCES vendors(id),
  contract_number        VARCHAR(100) NOT NULL,
  contract_name          VARCHAR(300),
  scope_of_work          TEXT,
  contract_value         NUMERIC(18,2) DEFAULT 0,
  start_date             DATE,
  end_date               DATE,
  actual_end_date        DATE,
  -- Financial terms
  retention_pct          NUMERIC(5,2) DEFAULT 5,
  security_deposit_pct   NUMERIC(5,2) DEFAULT 5,
  security_deposit_amount NUMERIC(14,2) DEFAULT 0,
  mobilization_advance_pct NUMERIC(5,2) DEFAULT 0,
  mobilization_advance_amount NUMERIC(14,2) DEFAULT 0,
  advance_recovery_pct   NUMERIC(5,2) DEFAULT 0,
  escalation_clause      TEXT,
  defect_liability_months INTEGER DEFAULT 12,
  -- Status
  status                 VARCHAR(20) DEFAULT 'draft'
                           CHECK (status IN ('draft','active','suspended','completed','terminated','closed')),
  termination_reason     TEXT,
  signed_date            DATE,
  file_url               TEXT,
  notes                  TEXT,
  created_by             UUID REFERENCES users(id),
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (project_id, contract_number)
);
CREATE INDEX IF NOT EXISTS idx_sc_project ON subcontractor_contracts(project_id);
CREATE INDEX IF NOT EXISTS idx_sc_vendor  ON subcontractor_contracts(vendor_id);

-- ── Work Packages ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subcontractor_work_packages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  contract_id     UUID REFERENCES subcontractor_contracts(id),
  vendor_id       UUID REFERENCES vendors(id),
  package_code    VARCHAR(50) NOT NULL,
  package_name    VARCHAR(300) NOT NULL,
  scope           TEXT,
  trade_type      VARCHAR(100),
  boq_items       JSONB DEFAULT '[]',  -- linked BOQ items
  planned_value   NUMERIC(18,2) DEFAULT 0,
  actual_value    NUMERIC(18,2) DEFAULT 0,
  start_date      DATE,
  end_date        DATE,
  progress_pct    NUMERIC(5,2) DEFAULT 0,
  status          VARCHAR(20) DEFAULT 'planned'
                    CHECK (status IN ('planned','active','completed','on_hold','cancelled')),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wp_project ON subcontractor_work_packages(project_id);
CREATE INDEX IF NOT EXISTS idx_wp_vendor  ON subcontractor_work_packages(vendor_id);

-- ── Measurement Book (MB) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subcontractor_mb (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  wo_id           UUID REFERENCES work_orders(id),
  contract_id     UUID REFERENCES subcontractor_contracts(id),
  vendor_id       UUID NOT NULL REFERENCES vendors(id),
  mb_number       VARCHAR(50) NOT NULL,
  mb_date         DATE DEFAULT CURRENT_DATE,
  period_start    DATE,
  period_end      DATE,
  location        VARCHAR(300),
  description     TEXT,
  total_amount    NUMERIC(18,2) DEFAULT 0,
  status          VARCHAR(20) DEFAULT 'draft'
                    CHECK (status IN ('draft','under_review','certified','approved','rejected')),
  site_certified_by   UUID REFERENCES users(id),
  site_certified_at   TIMESTAMPTZ,
  engineer_approved_by UUID REFERENCES users(id),
  engineer_approved_at TIMESTAMPTZ,
  pm_approved_by   UUID REFERENCES users(id),
  pm_approved_at   TIMESTAMPTZ,
  remarks         TEXT,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mb_project ON subcontractor_mb(project_id);
CREATE INDEX IF NOT EXISTS idx_mb_vendor  ON subcontractor_mb(vendor_id);

-- MB line items
CREATE TABLE IF NOT EXISTS subcontractor_mb_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mb_id           UUID NOT NULL REFERENCES subcontractor_mb(id) ON DELETE CASCADE,
  item_no         VARCHAR(20),
  description     TEXT NOT NULL,
  unit            VARCHAR(30),
  -- Quantities
  boq_qty         NUMERIC(14,3) DEFAULT 0,
  prev_qty        NUMERIC(14,3) DEFAULT 0,  -- quantity in previous bills
  this_qty        NUMERIC(14,3) DEFAULT 0,  -- quantity this bill
  total_qty       NUMERIC(14,3) GENERATED ALWAYS AS (prev_qty + this_qty) STORED,
  rate            NUMERIC(14,2) DEFAULT 0,
  amount          NUMERIC(18,2) GENERATED ALWAYS AS (this_qty * rate) STORED,
  remarks         TEXT
);
CREATE INDEX IF NOT EXISTS idx_mb_items_mb ON subcontractor_mb_items(mb_id);

-- ── Retention Tracking ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subcontractor_retention (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES projects(id),
  contract_id     UUID REFERENCES subcontractor_contracts(id),
  vendor_id       UUID NOT NULL REFERENCES vendors(id),
  bill_id         UUID REFERENCES subcontractor_bills(id),
  retention_type  VARCHAR(20) DEFAULT 'performance'
                    CHECK (retention_type IN ('performance','defect_liability','advance')),
  amount_deducted NUMERIC(14,2) DEFAULT 0,
  amount_released NUMERIC(14,2) DEFAULT 0,
  release_date    DATE,
  release_conditions TEXT,
  status          VARCHAR(20) DEFAULT 'held'
                    CHECK (status IN ('held','partially_released','fully_released')),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ret_project ON subcontractor_retention(project_id);
CREATE INDEX IF NOT EXISTS idx_ret_vendor  ON subcontractor_retention(vendor_id);

-- ── Material Issues to Subcontractors ────────────────────────────
CREATE TABLE IF NOT EXISTS subcontractor_material_issues (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES projects(id),
  vendor_id       UUID NOT NULL REFERENCES vendors(id),
  wo_id           UUID REFERENCES work_orders(id),
  issue_date      DATE DEFAULT CURRENT_DATE,
  material_name   VARCHAR(300) NOT NULL,
  material_code   VARCHAR(50),
  unit            VARCHAR(30),
  issued_qty      NUMERIC(14,3) DEFAULT 0,
  returned_qty    NUMERIC(14,3) DEFAULT 0,
  consumed_qty    NUMERIC(14,3) DEFAULT 0,
  balance_qty     NUMERIC(14,3) GENERATED ALWAYS AS
                    (issued_qty - returned_qty - consumed_qty) STORED,
  unit_rate       NUMERIC(14,2) DEFAULT 0,
  recovery_amount NUMERIC(14,2) GENERATED ALWAYS AS (consumed_qty * unit_rate) STORED,
  recovered       BOOLEAN DEFAULT false,
  recovered_in_bill_id UUID REFERENCES subcontractor_bills(id),
  remarks         TEXT,
  issued_by       UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_smi_project ON subcontractor_material_issues(project_id);
CREATE INDEX IF NOT EXISTS idx_smi_vendor  ON subcontractor_material_issues(vendor_id);

-- ── Performance Evaluation ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subcontractor_performance (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id           UUID NOT NULL REFERENCES projects(id),
  vendor_id            UUID NOT NULL REFERENCES vendors(id),
  evaluation_period    VARCHAR(50),   -- 'Q1 2026', 'Monthly', etc.
  evaluation_date      DATE DEFAULT CURRENT_DATE,
  -- Score components (0-10 each)
  quality_score        NUMERIC(3,1) DEFAULT 0,
  safety_score         NUMERIC(3,1) DEFAULT 0,
  schedule_score       NUMERIC(3,1) DEFAULT 0,
  productivity_score   NUMERIC(3,1) DEFAULT 0,
  cooperation_score    NUMERIC(3,1) DEFAULT 0,
  overall_score        NUMERIC(3,1) DEFAULT 0,
  grade                VARCHAR(5),   -- A, B, C, D
  quality_remarks      TEXT,
  safety_remarks       TEXT,
  schedule_remarks     TEXT,
  delay_days           INTEGER DEFAULT 0,
  incidents_count      INTEGER DEFAULT 0,
  quality_issues_count INTEGER DEFAULT 0,
  recommendation       VARCHAR(20) DEFAULT 'continue'
                         CHECK (recommendation IN ('continue','improve','warning','terminate')),
  evaluated_by         UUID REFERENCES users(id),
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_perf_project ON subcontractor_performance(project_id);
CREATE INDEX IF NOT EXISTS idx_perf_vendor  ON subcontractor_performance(vendor_id);

-- ── Claims & Variations ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subcontractor_claims (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES projects(id),
  wo_id           UUID REFERENCES work_orders(id),
  contract_id     UUID REFERENCES subcontractor_contracts(id),
  vendor_id       UUID NOT NULL REFERENCES vendors(id),
  claim_number    VARCHAR(50) NOT NULL,
  claim_type      VARCHAR(30) DEFAULT 'extra_work'
                    CHECK (claim_type IN ('extra_work','variation','rate_revision','extension','loss_expense','other')),
  claim_date      DATE DEFAULT CURRENT_DATE,
  description     TEXT NOT NULL,
  claim_amount    NUMERIC(18,2) DEFAULT 0,
  approved_amount NUMERIC(18,2) DEFAULT 0,
  justification   TEXT,
  status          VARCHAR(20) DEFAULT 'submitted'
                    CHECK (status IN ('draft','submitted','under_review','approved','partially_approved','rejected')),
  reviewed_by     UUID REFERENCES users(id),
  reviewed_at     TIMESTAMPTZ,
  review_comments TEXT,
  file_url        TEXT,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_claim_project ON subcontractor_claims(project_id);
CREATE INDEX IF NOT EXISTS idx_claim_vendor  ON subcontractor_claims(vendor_id);

SELECT 'Migration 015 applied — Subcontractor Management enhanced' AS result;
