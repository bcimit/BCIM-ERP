-- ================================================================
-- Migration 027: Client BOQ vs Subcontractor BOQ Mapping
-- Links client BOQ items to SC work allocations for margin tracking
-- ================================================================

-- ── 1. BOQ → SC Mapping table ────────────────────────────────────
CREATE TABLE IF NOT EXISTS boq_sc_mapping (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id      UUID NOT NULL REFERENCES projects(id),
  boq_item_id     UUID NOT NULL REFERENCES boq_items(id),

  -- Executor: SC vendor or BCIM own team
  sc_id           UUID REFERENCES sc_subcontractors(id),  -- NULL when own_team
  execution_type  VARCHAR(20) DEFAULT 'subcontractor'
                    CHECK (execution_type IN ('subcontractor','own_team')),
  sc_name_override VARCHAR(300),  -- display name for own_team or unlisted SC

  -- Quantity & Rate allocation
  allocated_qty   NUMERIC(14,3) NOT NULL CHECK (allocated_qty > 0),
  client_rate     NUMERIC(14,2) NOT NULL,   -- rate from boq_items (revenue rate)
  sc_rate         NUMERIC(14,2) NOT NULL,   -- negotiated cost rate to SC
  client_amount   NUMERIC(18,2) GENERATED ALWAYS AS (allocated_qty * client_rate) STORED,
  sc_amount       NUMERIC(18,2) GENERATED ALWAYS AS (allocated_qty * sc_rate) STORED,
  margin_amount   NUMERIC(18,2) GENERATED ALWAYS AS (
                    (allocated_qty * client_rate) - (allocated_qty * sc_rate)) STORED,

  -- Linked WO (populated when WO is generated from this mapping)
  wo_id           UUID REFERENCES sc_work_orders(id),

  notes           TEXT,
  status          VARCHAR(20) DEFAULT 'draft'
                    CHECK (status IN ('draft','confirmed','wo_issued','completed','cancelled')),
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_boq_map_boq_item ON boq_sc_mapping(boq_item_id);
CREATE INDEX IF NOT EXISTS idx_boq_map_sc       ON boq_sc_mapping(sc_id);
CREATE INDEX IF NOT EXISTS idx_boq_map_project  ON boq_sc_mapping(project_id);
CREATE INDEX IF NOT EXISTS idx_boq_map_wo       ON boq_sc_mapping(wo_id);

-- ── 2. Own-team cost tracking ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS own_team_costs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  mapping_id      UUID NOT NULL REFERENCES boq_sc_mapping(id) ON DELETE CASCADE,
  cost_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  cost_type       VARCHAR(20) DEFAULT 'labour'
                    CHECK (cost_type IN ('labour','material','equipment','overhead')),
  description     TEXT NOT NULL,
  qty             NUMERIC(10,3) DEFAULT 1 CHECK (qty > 0),
  rate            NUMERIC(10,2) NOT NULL CHECK (rate >= 0),
  amount          NUMERIC(14,2) GENERATED ALWAYS AS (qty * rate) STORED,
  floor_ref       VARCHAR(100),   -- e.g. "Floor 16-22 / Tower A"
  remarks         TEXT,
  recorded_by     UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_own_team_mapping ON own_team_costs(mapping_id);

-- ── 3. Add boq traceability FK to existing SC tables ─────────────
ALTER TABLE sc_work_orders ADD COLUMN IF NOT EXISTS boq_mapping_id UUID REFERENCES boq_sc_mapping(id);
ALTER TABLE sc_wo_items    ADD COLUMN IF NOT EXISTS boq_item_id    UUID REFERENCES boq_items(id);
ALTER TABLE sc_mb_entries  ADD COLUMN IF NOT EXISTS boq_item_id    UUID REFERENCES boq_items(id);
ALTER TABLE sc_bill_items  ADD COLUMN IF NOT EXISTS boq_item_id    UUID REFERENCES boq_items(id);

CREATE INDEX IF NOT EXISTS idx_sc_wo_boq_mapping ON sc_work_orders(boq_mapping_id);
