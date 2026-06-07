-- =====================================================================
-- Migration 012 : Planning Module — Primavera P6-Style Extensions
-- Adds: WBS, dependencies, resources, baselines, EVM, risk, MRP
-- =====================================================================

-- ── 1. Project Phases ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_phases (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  phase_code    VARCHAR(20) NOT NULL,
  phase_name    VARCHAR(200) NOT NULL,
  description   TEXT,
  planned_start DATE,
  planned_end   DATE,
  actual_start  DATE,
  actual_end    DATE,
  sequence_no   INTEGER DEFAULT 1,
  status        VARCHAR(20) DEFAULT 'not_started'
                  CHECK (status IN ('not_started','in_progress','completed','on_hold')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (project_id, phase_code)
);
CREATE INDEX IF NOT EXISTS idx_phases_project ON project_phases(project_id);

-- ── 2. WBS (Work Breakdown Structure) — hierarchical ──────────────────
CREATE TABLE IF NOT EXISTS wbs_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  parent_id    UUID REFERENCES wbs_items(id) ON DELETE CASCADE,
  phase_id     UUID REFERENCES project_phases(id),
  wbs_code     VARCHAR(50) NOT NULL,  -- e.g. 1.2.3
  wbs_name     VARCHAR(200) NOT NULL,
  description  TEXT,
  level        INTEGER NOT NULL DEFAULT 1, -- depth in tree
  sequence_no  INTEGER DEFAULT 1,
  planned_start DATE,
  planned_end   DATE,
  planned_cost  NUMERIC(18,2) DEFAULT 0,
  actual_cost   NUMERIC(18,2) DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (project_id, wbs_code)
);
CREATE INDEX IF NOT EXISTS idx_wbs_project ON wbs_items(project_id);
CREATE INDEX IF NOT EXISTS idx_wbs_parent  ON wbs_items(parent_id);

-- ── 3. Extend project_activities for CPM + EVM + WBS link ─────────────
ALTER TABLE project_activities
  ADD COLUMN IF NOT EXISTS wbs_id              UUID REFERENCES wbs_items(id),
  ADD COLUMN IF NOT EXISTS phase_id            UUID REFERENCES project_phases(id),
  -- CPM results (calculated by engine, stored for display)
  ADD COLUMN IF NOT EXISTS early_start         DATE,
  ADD COLUMN IF NOT EXISTS early_finish        DATE,
  ADD COLUMN IF NOT EXISTS late_start          DATE,
  ADD COLUMN IF NOT EXISTS late_finish         DATE,
  ADD COLUMN IF NOT EXISTS total_float         INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS free_float          INTEGER DEFAULT 0,
  -- EVM fields
  ADD COLUMN IF NOT EXISTS planned_value       NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS earned_value        NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS actual_cost         NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS budget_at_completion NUMERIC(18,2) DEFAULT 0,
  -- Resource summary
  ADD COLUMN IF NOT EXISTS planned_manhours    NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS actual_manhours     NUMERIC(10,2) DEFAULT 0,
  -- Weight for progress roll-up
  ADD COLUMN IF NOT EXISTS weight_pct          NUMERIC(5,2)  DEFAULT 0,
  -- Predecessors count (denormalised for fast CPM)
  ADD COLUMN IF NOT EXISTS predecessor_count  INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_act_wbs ON project_activities(wbs_id);

-- ── 4. Activity Dependencies (FS / SS / FF / SF) ──────────────────────
CREATE TABLE IF NOT EXISTS activity_dependencies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  predecessor_id  UUID NOT NULL REFERENCES project_activities(id) ON DELETE CASCADE,
  successor_id    UUID NOT NULL REFERENCES project_activities(id) ON DELETE CASCADE,
  dependency_type VARCHAR(2) NOT NULL DEFAULT 'FS'
                    CHECK (dependency_type IN ('FS','SS','FF','SF')),
  lag_days        INTEGER DEFAULT 0,  -- positive = lag, negative = lead
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (predecessor_id, successor_id)
);
CREATE INDEX IF NOT EXISTS idx_dep_predecessor ON activity_dependencies(predecessor_id);
CREATE INDEX IF NOT EXISTS idx_dep_successor   ON activity_dependencies(successor_id);
CREATE INDEX IF NOT EXISTS idx_dep_project     ON activity_dependencies(project_id);

-- ── 5. Resource Master ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS resources (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  resource_code   VARCHAR(50) NOT NULL,
  resource_name   VARCHAR(200) NOT NULL,
  resource_type   VARCHAR(20) NOT NULL DEFAULT 'manpower'
                    CHECK (resource_type IN ('manpower','equipment','material','subcontractor')),
  unit            VARCHAR(30),        -- nos, hours, kg, m³, etc.
  unit_cost       NUMERIC(14,2) DEFAULT 0,
  currency        VARCHAR(5) DEFAULT 'INR',
  max_units       NUMERIC(10,2),      -- max availability per day
  calendar        VARCHAR(20) DEFAULT '5day', -- 5day, 6day, 7day
  description     TEXT,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (company_id, resource_code)
);
CREATE INDEX IF NOT EXISTS idx_res_company ON resources(company_id);

-- ── 6. Activity Resource Allocation ──────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_resources (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  activity_id     UUID NOT NULL REFERENCES project_activities(id) ON DELETE CASCADE,
  resource_id     UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  planned_qty     NUMERIC(12,2) DEFAULT 0,  -- total quantity for activity
  actual_qty      NUMERIC(12,2) DEFAULT 0,
  units_per_day   NUMERIC(10,2) DEFAULT 1,  -- resources/day
  planned_cost    NUMERIC(14,2) DEFAULT 0,
  actual_cost     NUMERIC(14,2) DEFAULT 0,
  start_date      DATE,
  end_date        DATE,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (activity_id, resource_id)
);
CREATE INDEX IF NOT EXISTS idx_ar_activity ON activity_resources(activity_id);
CREATE INDEX IF NOT EXISTS idx_ar_resource ON activity_resources(resource_id);

-- ── 7. Baselines (schedule snapshots) ────────────────────────────────
CREATE TABLE IF NOT EXISTS planning_baselines (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  baseline_name   VARCHAR(200) NOT NULL,
  baseline_type   VARCHAR(20) DEFAULT 'original'
                    CHECK (baseline_type IN ('original','revision','target','current')),
  description     TEXT,
  snapshot_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  total_activities INTEGER DEFAULT 0,
  total_cost      NUMERIC(18,2) DEFAULT 0,
  planned_start   DATE,
  planned_finish  DATE,
  is_active       BOOLEAN DEFAULT true,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_baseline_project ON planning_baselines(project_id);

-- Baseline Activity Snapshot (frozen copy of activities at baseline date)
CREATE TABLE IF NOT EXISTS baseline_activities (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baseline_id      UUID NOT NULL REFERENCES planning_baselines(id) ON DELETE CASCADE,
  activity_id      UUID NOT NULL REFERENCES project_activities(id) ON DELETE CASCADE,
  activity_code    VARCHAR(50),
  activity_name    TEXT,
  planned_start    DATE,
  planned_finish   DATE,
  duration         INTEGER,
  progress_pct     NUMERIC(5,2) DEFAULT 0,
  planned_value    NUMERIC(18,2) DEFAULT 0,
  budget_at_completion NUMERIC(18,2) DEFAULT 0,
  is_critical_path BOOLEAN DEFAULT false,
  total_float      INTEGER DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ba_baseline  ON baseline_activities(baseline_id);
CREATE INDEX IF NOT EXISTS idx_ba_activity  ON baseline_activities(activity_id);

-- ── 8. Risk Register ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS risk_register (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id       UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  risk_code        VARCHAR(30),
  risk_title       VARCHAR(200) NOT NULL,
  description      TEXT,
  category         VARCHAR(40) DEFAULT 'other'
                     CHECK (category IN (
                       'technical','schedule','cost','quality','safety',
                       'environmental','legal','stakeholder','other'
                     )),
  -- Probability 1-5
  probability      INTEGER DEFAULT 3 CHECK (probability BETWEEN 1 AND 5),
  -- Impact 1-5
  impact           INTEGER DEFAULT 3 CHECK (impact BETWEEN 1 AND 5),
  risk_score       INTEGER GENERATED ALWAYS AS (probability * impact) STORED,
  risk_level       VARCHAR(10) DEFAULT 'medium'
                     CHECK (risk_level IN ('low','medium','high','critical')),
  response_strategy VARCHAR(20) DEFAULT 'mitigate'
                     CHECK (response_strategy IN ('avoid','mitigate','transfer','accept')),
  mitigation_plan  TEXT,
  contingency_plan TEXT,
  owner            VARCHAR(200),
  due_date         DATE,
  status           VARCHAR(20) DEFAULT 'open'
                     CHECK (status IN ('open','mitigated','closed','accepted')),
  linked_activity_id UUID REFERENCES project_activities(id),
  cost_impact      NUMERIC(14,2) DEFAULT 0,
  schedule_impact_days INTEGER DEFAULT 0,
  created_by       UUID REFERENCES users(id),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_risk_project ON risk_register(project_id);
CREATE INDEX IF NOT EXISTS idx_risk_level   ON risk_register(risk_level);

-- ── 9. Material Requirements Plan (MRP) ──────────────────────────────
CREATE TABLE IF NOT EXISTS material_requirements (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id       UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  activity_id      UUID REFERENCES project_activities(id) ON DELETE SET NULL,
  material_name    VARCHAR(200) NOT NULL,
  material_code    VARCHAR(50),
  specification    TEXT,
  unit             VARCHAR(30) NOT NULL DEFAULT 'nos',
  -- BOQ / planned
  boq_qty          NUMERIC(14,3) DEFAULT 0,
  planned_qty      NUMERIC(14,3) DEFAULT 0,
  -- Procurement
  ordered_qty      NUMERIC(14,3) DEFAULT 0,
  received_qty     NUMERIC(14,3) DEFAULT 0,
  consumed_qty     NUMERIC(14,3) DEFAULT 0,
  -- Balance = ordered - received  (shortage = planned - ordered)
  unit_rate        NUMERIC(14,2) DEFAULT 0,
  total_value      NUMERIC(18,2) GENERATED ALWAYS AS (planned_qty * unit_rate) STORED,
  required_date    DATE,
  status           VARCHAR(20) DEFAULT 'pending'
                     CHECK (status IN ('pending','ordered','partial','received','consumed')),
  vendor_name      VARCHAR(200),
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mrp_project  ON material_requirements(project_id);
CREATE INDEX IF NOT EXISTS idx_mrp_activity ON material_requirements(activity_id);
CREATE INDEX IF NOT EXISTS idx_mrp_status   ON material_requirements(status);

-- ── 10. EVM Snapshots (weekly SPI/CPI history) ────────────────────────
CREATE TABLE IF NOT EXISTS evm_snapshots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  snapshot_date   DATE NOT NULL,
  planned_value   NUMERIC(18,2) DEFAULT 0,    -- PV: BCWS
  earned_value    NUMERIC(18,2) DEFAULT 0,    -- EV: BCWP
  actual_cost     NUMERIC(18,2) DEFAULT 0,    -- AC: ACWP
  budget_at_completion NUMERIC(18,2) DEFAULT 0, -- BAC
  -- Derived (computed on insert/update)
  spi             NUMERIC(6,4),  -- EV/PV
  cpi             NUMERIC(6,4),  -- EV/AC
  sv              NUMERIC(18,2), -- EV-PV
  cv              NUMERIC(18,2), -- EV-AC
  eac             NUMERIC(18,2), -- BAC/CPI
  etc             NUMERIC(18,2), -- EAC-AC
  vac             NUMERIC(18,2), -- BAC-EAC
  percent_complete NUMERIC(5,2),
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (project_id, snapshot_date)
);
CREATE INDEX IF NOT EXISTS idx_evm_project ON evm_snapshots(project_id);
CREATE INDEX IF NOT EXISTS idx_evm_date    ON evm_snapshots(snapshot_date);

-- ── 11. CPM Results cache ─────────────────────────────────────────────
-- (refreshed every time CPM is recalculated)
CREATE TABLE IF NOT EXISTS cpm_results (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id     UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  calculated_at  TIMESTAMPTZ DEFAULT NOW(),
  project_duration INTEGER,         -- total project duration days
  critical_path_activities TEXT[],  -- array of activity IDs on CP
  data_date      DATE DEFAULT CURRENT_DATE
);
CREATE INDEX IF NOT EXISTS idx_cpm_project ON cpm_results(project_id);

-- ── 12. Indexes for join performance ─────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_act_phase    ON project_activities(phase_id);
CREATE INDEX IF NOT EXISTS idx_act_cp       ON project_activities(is_critical_path);

-- ── Summary ───────────────────────────────────────────────────────────
SELECT 'Migration 012 applied — P6-style planning tables created' AS result;
