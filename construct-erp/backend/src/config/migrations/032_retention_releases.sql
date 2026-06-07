-- Migration 032: Retention release records
-- Stores each partial or full retention release against a vendor / WO

CREATE TABLE IF NOT EXISTS subcontractor_retention_releases (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   UUID         NOT NULL,
  project_id   UUID         NOT NULL REFERENCES projects(id),
  vendor_id    UUID         NOT NULL REFERENCES vendors(id),
  wo_id        UUID         REFERENCES work_orders(id) ON DELETE SET NULL,
  amount       NUMERIC(15,2) NOT NULL,
  release_date DATE         NOT NULL,
  notes        TEXT,
  created_by   UUID REFERENCES users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ret_releases_vendor  ON subcontractor_retention_releases(vendor_id);
CREATE INDEX IF NOT EXISTS idx_ret_releases_project ON subcontractor_retention_releases(project_id);
