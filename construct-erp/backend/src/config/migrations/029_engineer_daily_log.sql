-- Migration 029: Engineer Daily Activity Log

CREATE TABLE IF NOT EXISTS engineer_daily_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES companies(id),
  project_id      UUID NOT NULL REFERENCES projects(id),
  log_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  engineer_id     UUID NOT NULL REFERENCES users(id),
  log_number      VARCHAR(30),

  weather         VARCHAR(20) DEFAULT 'sunny'
                    CHECK (weather IN ('sunny','cloudy','rainy','hot','windy')),
  site_conditions VARCHAR(200),
  manpower_count  INTEGER DEFAULT 0,

  general_remarks TEXT,
  issues          TEXT,
  next_day_plan   TEXT,

  status          VARCHAR(20) DEFAULT 'submitted'
                    CHECK (status IN ('draft','submitted','reviewed')),

  reviewed_by     UUID REFERENCES users(id),
  reviewed_at     TIMESTAMPTZ,
  review_remarks  TEXT,

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS engineer_log_activities (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_id        UUID NOT NULL REFERENCES engineer_daily_logs(id) ON DELETE CASCADE,
  activity_name VARCHAR(300) NOT NULL,
  location      VARCHAR(200),
  unit          VARCHAR(30) DEFAULT 'Nos',
  planned_qty   NUMERIC(14,3) DEFAULT 0,
  achieved_qty  NUMERIC(14,3) DEFAULT 0,
  status        VARCHAR(30) DEFAULT 'in_progress'
                  CHECK (status IN ('not_started','in_progress','completed','on_hold')),
  remarks       TEXT,
  sort_order    INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_edl_company   ON engineer_daily_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_edl_project   ON engineer_daily_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_edl_engineer  ON engineer_daily_logs(engineer_id);
CREATE INDEX IF NOT EXISTS idx_edl_date      ON engineer_daily_logs(log_date);
CREATE INDEX IF NOT EXISTS idx_ela_log       ON engineer_log_activities(log_id);
