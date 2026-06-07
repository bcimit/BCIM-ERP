-- ================================================================
-- Migration 025: SC Module Enterprise Enhancement
-- Adds: MB, Advances, Material Recovery, Retention Release,
--       Final Bill, enhanced master fields, audit trail
-- ================================================================

-- ── Enhance Subcontractor Master ─────────────────────────────────
ALTER TABLE sc_subcontractors
  ADD COLUMN IF NOT EXISTS contractor_type     VARCHAR(50)  DEFAULT 'company'
                             CHECK (contractor_type IN ('company','individual','partnership','llp','proprietorship')),
  ADD COLUMN IF NOT EXISTS labour_license_no   VARCHAR(100),
  ADD COLUMN IF NOT EXISTS labour_license_expiry DATE,
  ADD COLUMN IF NOT EXISTS insurance_policy_no VARCHAR(100),
  ADD COLUMN IF NOT EXISTS insurance_expiry    DATE,
  ADD COLUMN IF NOT EXISTS insurance_amount    NUMERIC(18,2),
  ADD COLUMN IF NOT EXISTS documents           JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS rating              SMALLINT CHECK (rating BETWEEN 1 AND 5);

-- ── Enhance Work Orders ────────────────────────────────────────────
ALTER TABLE sc_work_orders
  ADD COLUMN IF NOT EXISTS tower_block         VARCHAR(100),
  ADD COLUMN IF NOT EXISTS work_category       VARCHAR(100),
  ADD COLUMN IF NOT EXISTS revision_no         SMALLINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS revised_from        UUID REFERENCES sc_work_orders(id),
  ADD COLUMN IF NOT EXISTS revision_notes      TEXT,
  ADD COLUMN IF NOT EXISTS labour_welfare_fund_pct NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS safety_penalty_pct  NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS approved_at         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_by        UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS cancel_reason       TEXT;

-- ── Enhance Bills ──────────────────────────────────────────────────
ALTER TABLE sc_bills
  ADD COLUMN IF NOT EXISTS mb_ids              JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS labour_welfare_fund NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS safety_penalty      NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rejected_by         UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS rejection_remarks   TEXT,
  ADD COLUMN IF NOT EXISTS submitted_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_final_bill       BOOLEAN DEFAULT FALSE;

-- ── Enhance Payments ──────────────────────────────────────────────
ALTER TABLE sc_payments
  ADD COLUMN IF NOT EXISTS voucher_number      VARCHAR(60),
  ADD COLUMN IF NOT EXISTS utr_number          VARCHAR(100),
  ADD COLUMN IF NOT EXISTS payment_type        VARCHAR(20) DEFAULT 'full'
                             CHECK (payment_type IN ('full','partial')),
  ADD COLUMN IF NOT EXISTS verified_by         UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS verified_at         TIMESTAMPTZ;

-- ── 1. Measurement Book ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sc_mb_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id      UUID NOT NULL REFERENCES projects(id),
  wo_id           UUID NOT NULL REFERENCES sc_work_orders(id),
  wo_item_id      UUID REFERENCES sc_wo_items(id),
  sc_id           UUID NOT NULL REFERENCES sc_subcontractors(id),

  mb_number       VARCHAR(60) NOT NULL,          -- MB-LH10-001
  mb_date         DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Location
  tower_block     VARCHAR(100),
  floor_number    VARCHAR(50),
  location_detail VARCHAR(300),
  drawing_ref     VARCHAR(200),

  -- Measurement
  description     TEXT NOT NULL,
  unit            VARCHAR(30),
  executed_qty    NUMERIC(14,3) NOT NULL DEFAULT 0,
  previous_qty    NUMERIC(14,3) DEFAULT 0,       -- sum of prev approved MBs for this item

  -- Supporting
  site_photos     JSONB DEFAULT '[]',
  remarks         TEXT,

  -- Workflow
  status          VARCHAR(20) DEFAULT 'draft'
                    CHECK (status IN ('draft','submitted','checked','approved','rejected')),
  checked_by      UUID REFERENCES users(id),
  checked_at      TIMESTAMPTZ,
  check_remarks   TEXT,
  approved_by     UUID REFERENCES users(id),
  approved_at     TIMESTAMPTZ,
  approve_remarks TEXT,
  rejected_by     UUID REFERENCES users(id),
  rejection_remarks TEXT,

  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (company_id, mb_number)
);
CREATE INDEX IF NOT EXISTS idx_sc_mb_wo     ON sc_mb_entries(wo_id);
CREATE INDEX IF NOT EXISTS idx_sc_mb_item   ON sc_mb_entries(wo_item_id);
CREATE INDEX IF NOT EXISTS idx_sc_mb_date   ON sc_mb_entries(mb_date);
CREATE INDEX IF NOT EXISTS idx_sc_mb_status ON sc_mb_entries(status);

-- ── 2. Advances ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sc_advances (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id          UUID NOT NULL REFERENCES projects(id),
  wo_id               UUID NOT NULL REFERENCES sc_work_orders(id),
  sc_id               UUID NOT NULL REFERENCES sc_subcontractors(id),

  advance_number      VARCHAR(60) NOT NULL,       -- ADV-LH10-001
  advance_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  amount              NUMERIC(18,2) NOT NULL,
  recovery_pct        NUMERIC(5,2) DEFAULT 10,    -- % to recover per bill
  recovered_amount    NUMERIC(18,2) DEFAULT 0,
  balance_amount      NUMERIC(18,2) GENERATED ALWAYS AS (amount - recovered_amount) STORED,
  recovery_start_bill VARCHAR(60),

  payment_mode        VARCHAR(30) DEFAULT 'bank_transfer',
  reference_no        VARCHAR(200),
  remarks             TEXT,

  status              VARCHAR(20) DEFAULT 'active'
                        CHECK (status IN ('active','fully_recovered','cancelled')),

  approved_by         UUID REFERENCES users(id),
  created_by          UUID REFERENCES users(id),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (company_id, advance_number)
);
CREATE INDEX IF NOT EXISTS idx_sc_adv_wo ON sc_advances(wo_id);
CREATE INDEX IF NOT EXISTS idx_sc_adv_sc ON sc_advances(sc_id);

-- ── 3. Material Recoveries ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sc_material_recoveries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id      UUID NOT NULL REFERENCES projects(id),
  wo_id           UUID NOT NULL REFERENCES sc_work_orders(id),
  sc_id           UUID NOT NULL REFERENCES sc_subcontractors(id),
  bill_id         UUID REFERENCES sc_bills(id),  -- null = standing deduction

  recovery_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  material_name   VARCHAR(200) NOT NULL,
  material_code   VARCHAR(50),
  unit            VARCHAR(30),
  quantity        NUMERIC(14,3) DEFAULT 0,
  rate            NUMERIC(14,2) DEFAULT 0,
  amount          NUMERIC(18,2) NOT NULL,
  recovery_type   VARCHAR(20) DEFAULT 'actual'
                    CHECK (recovery_type IN ('fixed','actual','market_rate')),
  remarks         TEXT,

  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sc_matrc_wo ON sc_material_recoveries(wo_id);
CREATE INDEX IF NOT EXISTS idx_sc_matrc_bill ON sc_material_recoveries(bill_id);

-- ── 4. Retention Releases ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sc_retention_releases (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id      UUID NOT NULL REFERENCES projects(id),
  wo_id           UUID NOT NULL REFERENCES sc_work_orders(id),
  sc_id           UUID NOT NULL REFERENCES sc_subcontractors(id),

  release_number  VARCHAR(60) NOT NULL,           -- RR-LH10-001
  release_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  total_retained  NUMERIC(18,2) DEFAULT 0,
  release_amount  NUMERIC(18,2) NOT NULL,
  remarks         TEXT,

  status          VARCHAR(20) DEFAULT 'pending'
                    CHECK (status IN ('pending','approved','released','rejected')),
  approved_by     UUID REFERENCES users(id),
  approved_at     TIMESTAMPTZ,

  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (company_id, release_number)
);
CREATE INDEX IF NOT EXISTS idx_sc_ret_wo ON sc_retention_releases(wo_id);

-- ── 5. Final Bills ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sc_final_bills (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id          UUID NOT NULL REFERENCES projects(id),
  wo_id               UUID NOT NULL REFERENCES sc_work_orders(id),
  sc_id               UUID NOT NULL REFERENCES sc_subcontractors(id),

  final_bill_number   VARCHAR(60) NOT NULL,
  bill_date           DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Summary figures
  total_wo_value      NUMERIC(18,2) DEFAULT 0,
  total_ra_billed     NUMERIC(18,2) DEFAULT 0,
  total_ra_paid       NUMERIC(18,2) DEFAULT 0,
  retention_released  NUMERIC(18,2) DEFAULT 0,
  advance_recovered   NUMERIC(18,2) DEFAULT 0,
  other_adjustments   NUMERIC(18,2) DEFAULT 0,
  net_final_amount    NUMERIC(18,2) DEFAULT 0,

  remarks             TEXT,
  status              VARCHAR(20) DEFAULT 'draft'
                        CHECK (status IN ('draft','submitted','approved','paid')),

  approved_by         UUID REFERENCES users(id),
  approved_at         TIMESTAMPTZ,
  created_by          UUID REFERENCES users(id),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (company_id, final_bill_number)
);
CREATE INDEX IF NOT EXISTS idx_sc_fb_wo ON sc_final_bills(wo_id);

-- ── 6. Activity Log / Audit Trail ─────────────────────────────────
CREATE TABLE IF NOT EXISTS sc_activity_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  entity_type VARCHAR(50) NOT NULL,  -- 'work_order','bill','payment','mb','advance'
  entity_id   UUID NOT NULL,
  action      VARCHAR(100) NOT NULL,
  old_data    JSONB,
  new_data    JSONB,
  actor_id    UUID REFERENCES users(id),
  actor_name  VARCHAR(200),
  ip_address  VARCHAR(45),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sc_log_entity ON sc_activity_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_sc_log_actor  ON sc_activity_log(actor_id);
