-- ================================================================
-- Migration 011: Planning & Execution Module — All Missing Tables
-- ================================================================
-- Creates: project_activities, project_milestones, look_ahead_plans,
--          progress_tracking, scurve_data, delay_analysis

-- ── 1. Project Activities ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_activities (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id           UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  activity_code        VARCHAR(50) NOT NULL,
  activity_name        TEXT        NOT NULL,
  description          TEXT,
  location             VARCHAR(200),
  activity_type        VARCHAR(30) DEFAULT 'other'
                         CHECK (activity_type IN ('structural','civil','finishing','mechanical','electrical','other')),
  -- Baseline (planned)
  baseline_start_date  DATE        NOT NULL,
  baseline_end_date    DATE        NOT NULL,
  baseline_duration    INTEGER,
  -- Actual
  actual_start_date    DATE,
  actual_end_date      DATE,
  progress_pct         NUMERIC(5,2) DEFAULT 0 CHECK (progress_pct BETWEEN 0 AND 100),
  status               VARCHAR(20)  DEFAULT 'planned'
                         CHECK (status IN ('planned','in_progress','delayed','completed','cancelled')),
  -- Critical path
  is_critical_path     BOOLEAN      DEFAULT false,
  slack_days           INTEGER      DEFAULT 0,
  -- Quantities
  boq_item_id          UUID         REFERENCES boq_items(id),
  planned_quantity     NUMERIC(15,3),
  actual_quantity      NUMERIC(15,3),
  measurement_unit     VARCHAR(20),
  -- Assignment
  assigned_to          UUID         REFERENCES users(id),
  created_by           UUID         REFERENCES users(id),
  created_at           TIMESTAMPTZ  DEFAULT NOW(),
  updated_at           TIMESTAMPTZ  DEFAULT NOW(),
  UNIQUE (project_id, activity_code)
);
CREATE INDEX IF NOT EXISTS idx_proj_act_project  ON project_activities(project_id);
CREATE INDEX IF NOT EXISTS idx_proj_act_status   ON project_activities(status);
CREATE INDEX IF NOT EXISTS idx_proj_act_baseline ON project_activities(baseline_start_date);

-- ── 2. Project Milestones ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_milestones (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id               UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  milestone_code           VARCHAR(50) NOT NULL,
  milestone_name           TEXT        NOT NULL,
  description              TEXT,
  milestone_type           VARCHAR(30) DEFAULT 'other'
                             CHECK (milestone_type IN (
                               'foundation','structural','finishing','inspection',
                               'certification','handover','payment','testing','other'
                             )),
  target_date              DATE        NOT NULL,
  actual_date              DATE,
  deviation_days           INTEGER,
  is_achieved              BOOLEAN     DEFAULT false,
  affects_payment_release  BOOLEAN     DEFAULT false,
  related_activity_id      UUID        REFERENCES project_activities(id),
  remarks                  TEXT,
  verified_by              UUID        REFERENCES users(id),
  created_by               UUID        REFERENCES users(id),
  created_at               TIMESTAMPTZ DEFAULT NOW(),
  updated_at               TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (project_id, milestone_code)
);
CREATE INDEX IF NOT EXISTS idx_milestone_project     ON project_milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_milestone_target_date ON project_milestones(target_date);

-- ── 3. Look-Ahead Plans ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS look_ahead_plans (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id           UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  plan_week_start      DATE        NOT NULL,
  plan_week_end        DATE        NOT NULL,
  planned_activities   JSONB       DEFAULT '[]',
  planned_manpower     TEXT,
  planned_materials    JSONB       DEFAULT '[]',
  planned_equipment    JSONB       DEFAULT '[]',
  potential_risks      TEXT,
  mitigation_measures  TEXT,
  dependencies         TEXT,
  status               VARCHAR(20) DEFAULT 'draft'
                         CHECK (status IN ('draft','approved','in_execution','completed')),
  planned_by           UUID        REFERENCES users(id),
  approved_by          UUID        REFERENCES users(id),
  approved_at          TIMESTAMPTZ,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (project_id, plan_week_start)
);
CREATE INDEX IF NOT EXISTS idx_look_ahead_project ON look_ahead_plans(project_id);
CREATE INDEX IF NOT EXISTS idx_look_ahead_week    ON look_ahead_plans(plan_week_start);

-- ── 4. Progress Tracking ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS progress_tracking (
  id                    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id            UUID         NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  activity_id           UUID         REFERENCES project_activities(id) ON DELETE SET NULL,
  tracking_date         DATE         NOT NULL,
  planned_progress_pct  NUMERIC(5,2),
  actual_progress_pct   NUMERIC(5,2),
  planned_qty           NUMERIC(15,3),
  actual_qty            NUMERIC(15,3),
  planned_manpower      INTEGER,
  actual_manpower       INTEGER,
  remarks               TEXT,
  tracked_by            UUID         REFERENCES users(id),
  created_at            TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_progress_project ON progress_tracking(project_id);
CREATE INDEX IF NOT EXISTS idx_progress_date    ON progress_tracking(tracking_date);

-- ── 5. S-Curve Data ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scurve_data (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id               UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  reporting_date           DATE        NOT NULL,
  baseline_progress_pct    NUMERIC(5,2),
  actual_progress_pct      NUMERIC(5,2),
  forecast_progress_pct    NUMERIC(5,2),
  forecast_completion_date DATE,
  schedule_variance_days   INTEGER,
  created_at               TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (project_id, reporting_date)
);
CREATE INDEX IF NOT EXISTS idx_scurve_project ON scurve_data(project_id);
CREATE INDEX IF NOT EXISTS idx_scurve_date    ON scurve_data(reporting_date);

-- ── 6. Delay Analysis ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS delay_analysis (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id         UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  activity_id        UUID        REFERENCES project_activities(id) ON DELETE SET NULL,
  analysis_date      DATE        NOT NULL DEFAULT CURRENT_DATE,
  delay_days         INTEGER     NOT NULL DEFAULT 0,
  delay_category     VARCHAR(30)
                       CHECK (delay_category IN (
                         'material_supply','manpower','equipment','weather',
                         'design_change','client_approval','subcontractor','other'
                       )),
  root_cause         TEXT,
  impact_on_project  VARCHAR(20) DEFAULT 'minor'
                       CHECK (impact_on_project IN ('no_impact','minor','major','critical')),
  mitigation_plan    TEXT,
  responsible_party  TEXT,
  is_resolved        BOOLEAN     DEFAULT false,
  resolved_date      DATE,
  analyzed_by        UUID        REFERENCES users(id),
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_delay_project ON delay_analysis(project_id);

SELECT 'Migration 011 applied — 6 planning tables created' AS result;
