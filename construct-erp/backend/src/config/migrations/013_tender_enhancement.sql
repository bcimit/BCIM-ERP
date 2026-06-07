-- ================================================================
-- Migration 013: Tender Management — Full Enhancement
-- ================================================================

-- ── Extend tenders table ─────────────────────────────────────────
ALTER TABLE tenders
  ADD COLUMN IF NOT EXISTS client_name          VARCHAR(300),
  ADD COLUMN IF NOT EXISTS client_contact       VARCHAR(200),
  ADD COLUMN IF NOT EXISTS client_email         VARCHAR(200),
  ADD COLUMN IF NOT EXISTS client_phone         VARCHAR(30),
  ADD COLUMN IF NOT EXISTS client_type          VARCHAR(30) DEFAULT 'private'
                             CHECK (client_type IN ('government','psu','private','semi_govt','international')),
  ADD COLUMN IF NOT EXISTS tender_source        VARCHAR(50) DEFAULT 'direct'
                             CHECK (tender_source IN ('direct','cppp','gem','e_tender','newspaper','reference','other')),
  ADD COLUMN IF NOT EXISTS tender_category      VARCHAR(50) DEFAULT 'civil'
                             CHECK (tender_category IN ('civil','electrical','mechanical','hvac','plumbing','interior','landscaping','mixed','other')),
  ADD COLUMN IF NOT EXISTS location             VARCHAR(300),
  ADD COLUMN IF NOT EXISTS submission_mode      VARCHAR(20) DEFAULT 'online'
                             CHECK (submission_mode IN ('online','offline','both')),
  ADD COLUMN IF NOT EXISTS submission_deadline  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS submission_date      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_shortlisted       BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS go_no_go_status      VARCHAR(20) DEFAULT 'pending'
                             CHECK (go_no_go_status IN ('pending','go','no_go')),
  ADD COLUMN IF NOT EXISTS go_no_go_remarks     TEXT,
  ADD COLUMN IF NOT EXISTS bid_bond_required    BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS bid_bond_amount      NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS bid_bond_expiry      DATE,
  ADD COLUMN IF NOT EXISTS technical_score      NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS commercial_score     NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS our_bid_value        NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS l1_value             NUMERIC(15,2),    -- competitor L1
  ADD COLUMN IF NOT EXISTS result_date          DATE,
  ADD COLUMN IF NOT EXISTS loss_reason          TEXT,
  ADD COLUMN IF NOT EXISTS remarks              TEXT,
  ADD COLUMN IF NOT EXISTS assigned_to          UUID REFERENCES users(id);

-- ── EMD & Bank Guarantee Tracking ────────────────────────────────
CREATE TABLE IF NOT EXISTS tender_emd (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id        UUID NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,
  company_id       UUID NOT NULL,
  instrument_type  VARCHAR(20) NOT NULL DEFAULT 'dd'
                     CHECK (instrument_type IN ('dd','bg','emi','online','fdr','other')),
  instrument_no    VARCHAR(100),
  issuing_bank     VARCHAR(200),
  amount           NUMERIC(15,2) NOT NULL DEFAULT 0,
  issue_date       DATE,
  expiry_date      DATE,
  purpose          VARCHAR(20) DEFAULT 'emd'
                     CHECK (purpose IN ('emd','bid_bond','performance_bg','advance_bg','retention_bg','other')),
  status           VARCHAR(20) DEFAULT 'active'
                     CHECK (status IN ('active','expired','returned','forfeited','extended')),
  submitted_to     VARCHAR(200),
  submitted_date   DATE,
  returned_date    DATE,
  remarks          TEXT,
  created_by       UUID REFERENCES users(id),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_emd_tender  ON tender_emd(tender_id);
CREATE INDEX IF NOT EXISTS idx_emd_expiry  ON tender_emd(expiry_date);
CREATE INDEX IF NOT EXISTS idx_emd_status  ON tender_emd(status);

-- ── Pre-Bid Meetings & Clarifications ────────────────────────────
CREATE TABLE IF NOT EXISTS tender_prebid (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id      UUID NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,
  meeting_date   TIMESTAMPTZ,
  venue          VARCHAR(300),
  meeting_notes  TEXT,
  attended       BOOLEAN DEFAULT false,
  attendees      JSONB DEFAULT '[]',
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tender_clarifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id       UUID NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,
  query_number    VARCHAR(30),
  query_date      DATE DEFAULT CURRENT_DATE,
  query_type      VARCHAR(30) DEFAULT 'technical'
                    CHECK (query_type IN ('technical','commercial','drawing','specification','other')),
  query_text      TEXT NOT NULL,
  response_text   TEXT,
  response_date   DATE,
  status          VARCHAR(20) DEFAULT 'pending'
                    CHECK (status IN ('pending','responded','closed')),
  raised_by       UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_clar_tender ON tender_clarifications(tender_id);

-- ── Tender Addendum / Corrigendum ────────────────────────────────
CREATE TABLE IF NOT EXISTS tender_addendums (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id       UUID NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,
  addendum_no     VARCHAR(20) NOT NULL,
  issue_date      DATE DEFAULT CURRENT_DATE,
  subject         VARCHAR(500),
  description     TEXT,
  impact_type     VARCHAR(20) DEFAULT 'scope'
                    CHECK (impact_type IN ('scope','price','date','technical','other')),
  new_deadline    TIMESTAMPTZ,
  file_url        TEXT,
  acknowledged    BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── Bid Costing ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tender_bid_costing (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id        UUID NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,
  version          INTEGER DEFAULT 1,
  is_final         BOOLEAN DEFAULT false,
  -- Cost components
  material_cost    NUMERIC(18,2) DEFAULT 0,
  labour_cost      NUMERIC(18,2) DEFAULT 0,
  equipment_cost   NUMERIC(18,2) DEFAULT 0,
  subcontract_cost NUMERIC(18,2) DEFAULT 0,
  direct_cost      NUMERIC(18,2) GENERATED ALWAYS AS
                     (material_cost + labour_cost + equipment_cost + subcontract_cost) STORED,
  overhead_pct     NUMERIC(5,2) DEFAULT 10,
  overhead_amount  NUMERIC(18,2) DEFAULT 0,
  risk_provision_pct NUMERIC(5,2) DEFAULT 3,
  risk_amount      NUMERIC(18,2) DEFAULT 0,
  profit_margin_pct NUMERIC(5,2) DEFAULT 5,
  profit_amount    NUMERIC(18,2) DEFAULT 0,
  contingency_pct  NUMERIC(5,2) DEFAULT 2,
  contingency_amount NUMERIC(18,2) DEFAULT 0,
  total_cost       NUMERIC(18,2) DEFAULT 0,   -- sum of all
  bid_price        NUMERIC(18,2) DEFAULT 0,   -- final quoted price
  notes            TEXT,
  created_by       UUID REFERENCES users(id),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_costing_tender ON tender_bid_costing(tender_id);

-- Bid cost line items (BOQ breakdown)
CREATE TABLE IF NOT EXISTS tender_cost_items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  costing_id     UUID NOT NULL REFERENCES tender_bid_costing(id) ON DELETE CASCADE,
  tender_id      UUID NOT NULL,
  item_code      VARCHAR(50),
  description    TEXT NOT NULL,
  unit           VARCHAR(30),
  quantity       NUMERIC(14,3) DEFAULT 0,
  unit_rate      NUMERIC(14,2) DEFAULT 0,
  amount         NUMERIC(18,2) GENERATED ALWAYS AS (quantity * unit_rate) STORED,
  category       VARCHAR(20) DEFAULT 'material'
                   CHECK (category IN ('material','labour','equipment','subcontract','overhead','other')),
  remarks        TEXT,
  sequence_no    INTEGER DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_cost_items_costing ON tender_cost_items(costing_id);

-- ── Competitor Database ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tender_competitors (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL,
  competitor_name VARCHAR(300) NOT NULL,
  competitor_type VARCHAR(30) DEFAULT 'local'
                    CHECK (competitor_type IN ('local','national','international','jv')),
  strengths       TEXT,
  weaknesses      TEXT,
  typical_margin  NUMERIC(5,2),
  notes           TEXT,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Per-tender competitor bids (for win/loss analysis)
CREATE TABLE IF NOT EXISTS tender_competitor_bids (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id       UUID NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,
  competitor_id   UUID REFERENCES tender_competitors(id),
  competitor_name VARCHAR(300),  -- if not in master
  bid_value       NUMERIC(15,2),
  rank            INTEGER,
  is_l1           BOOLEAN DEFAULT false,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_comp_bids_tender ON tender_competitor_bids(tender_id);

-- ── Tender Approval Workflow ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS tender_approvals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id       UUID NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,
  approval_stage  VARCHAR(30) NOT NULL
                    CHECK (approval_stage IN ('technical','commercial','management','go_no_go')),
  status          VARCHAR(20) DEFAULT 'pending'
                    CHECK (status IN ('pending','approved','rejected','deferred')),
  reviewer        UUID REFERENCES users(id),
  review_date     TIMESTAMPTZ,
  comments        TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tapproval_tender ON tender_approvals(tender_id);

SELECT 'Migration 013 applied — Tender Management enhanced' AS result;
