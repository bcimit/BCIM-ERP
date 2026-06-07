-- =========================================================
-- Asset Module Full Redesign — Migration 008
-- =========================================================

-- ── 1. Asset Categories ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS asset_categories (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id          UUID REFERENCES companies(id) ON DELETE CASCADE,
  name                VARCHAR(100) NOT NULL,
  parent_id           UUID REFERENCES asset_categories(id),
  depreciation_method VARCHAR(20) DEFAULT 'straight_line',
  useful_life_years   INTEGER DEFAULT 5,
  maintenance_interval_days INTEGER DEFAULT 90,
  description         TEXT,
  is_active           BOOLEAN DEFAULT true,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. Extend assets table ─────────────────────────────────────────
ALTER TABLE assets
  ADD COLUMN IF NOT EXISTS category_id        UUID REFERENCES asset_categories(id),
  ADD COLUMN IF NOT EXISTS sub_category       VARCHAR(100),
  ADD COLUMN IF NOT EXISTS photo_url          TEXT,
  ADD COLUMN IF NOT EXISTS fitness_expiry     DATE,
  ADD COLUMN IF NOT EXISTS pollution_expiry   DATE,
  ADD COLUMN IF NOT EXISTS road_tax_expiry    DATE,
  ADD COLUMN IF NOT EXISTS disposal_type      VARCHAR(30) CHECK (disposal_type IN ('sold','scrapped','lost','damaged','donated')),
  ADD COLUMN IF NOT EXISTS disposal_approved_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS disposal_approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS department         VARCHAR(100),
  ADD COLUMN IF NOT EXISTS assigned_employee  VARCHAR(200),
  ADD COLUMN IF NOT EXISTS assigned_date      DATE,
  ADD COLUMN IF NOT EXISTS expected_return_date DATE,
  ADD COLUMN IF NOT EXISTS condition_rating   INTEGER CHECK (condition_rating BETWEEN 1 AND 5);

-- ── 3. Asset Documents ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS asset_documents (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id      UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  company_id    UUID NOT NULL,
  doc_type      VARCHAR(40) NOT NULL,
  doc_name      VARCHAR(200),
  file_url      TEXT,
  issue_date    DATE,
  expiry_date   DATE,
  issuer        VARCHAR(200),
  notes         TEXT,
  uploaded_by   UUID REFERENCES users(id),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_asset_docs_asset ON asset_documents(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_docs_expiry ON asset_documents(expiry_date);

-- ── 4. Asset Allocation / Assignment ───────────────────────────────
CREATE TABLE IF NOT EXISTS asset_allocations (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id            UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  company_id          UUID NOT NULL,
  allocation_type     VARCHAR(20) DEFAULT 'project'
                      CHECK (allocation_type IN ('project','site','employee','department','store')),
  project_id          UUID REFERENCES projects(id),
  employee_name       VARCHAR(200),
  department          VARCHAR(100),
  issue_date          DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_return_date DATE,
  actual_return_date  DATE,
  issued_condition    VARCHAR(20) DEFAULT 'good'
                      CHECK (issued_condition IN ('excellent','good','fair','poor')),
  return_condition    VARCHAR(20)
                      CHECK (return_condition IN ('excellent','good','fair','poor','damaged')),
  return_remarks      TEXT,
  status              VARCHAR(20) DEFAULT 'active'
                      CHECK (status IN ('active','returned','overdue')),
  issued_by           UUID REFERENCES users(id),
  returned_by         UUID REFERENCES users(id),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_alloc_asset ON asset_allocations(asset_id);
CREATE INDEX IF NOT EXISTS idx_alloc_project ON asset_allocations(project_id);

-- ── 5. Asset Transfer (site-to-site) ───────────────────────────────
CREATE TABLE IF NOT EXISTS asset_transfers (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id            UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  company_id          UUID NOT NULL,
  from_project_id     UUID REFERENCES projects(id),
  to_project_id       UUID REFERENCES projects(id),
  from_location       VARCHAR(200),
  to_location         VARCHAR(200),
  transfer_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  reason              TEXT,
  status              VARCHAR(20) DEFAULT 'pending'
                      CHECK (status IN ('pending','approved','rejected','completed')),
  requested_by        UUID REFERENCES users(id),
  approved_by         UUID REFERENCES users(id),
  approved_at         TIMESTAMPTZ,
  condition_out       VARCHAR(20),
  condition_in        VARCHAR(20),
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_transfer_asset ON asset_transfers(asset_id);

-- ── 6. Maintenance Work Orders ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS asset_work_orders (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id            UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  company_id          UUID NOT NULL,
  wo_number           VARCHAR(50) UNIQUE NOT NULL,
  wo_type             VARCHAR(20) DEFAULT 'preventive'
                      CHECK (wo_type IN ('preventive','breakdown','corrective','emergency')),
  description         TEXT NOT NULL,
  priority            VARCHAR(10) DEFAULT 'medium'
                      CHECK (priority IN ('low','medium','high','critical')),
  status              VARCHAR(20) DEFAULT 'open'
                      CHECK (status IN ('open','in_progress','completed','cancelled')),
  scheduled_date      DATE,
  start_date          DATE,
  completion_date     DATE,
  vendor_id           UUID REFERENCES vendors(id),
  vendor_name         VARCHAR(200),
  technician          VARCHAR(200),
  labour_cost         NUMERIC(12,2) DEFAULT 0,
  parts_cost          NUMERIC(12,2) DEFAULT 0,
  total_cost          NUMERIC(12,2) DEFAULT 0,
  downtime_hours      NUMERIC(8,2) DEFAULT 0,
  spare_parts         TEXT,
  work_done           TEXT,
  next_service_date   DATE,
  next_service_meter  NUMERIC(12,2),
  attachments         JSONB DEFAULT '[]',
  created_by          UUID REFERENCES users(id),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wo_asset ON asset_work_orders(asset_id);

-- ── 7. Fuel Logs ───────────────────────────────────────────────────
-- Already exists as asset_fuel_logs, extend it
ALTER TABLE asset_fuel_logs
  ADD COLUMN IF NOT EXISTS operator_name  VARCHAR(200),
  ADD COLUMN IF NOT EXISTS odometer_km    NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS fuel_station   VARCHAR(200),
  ADD COLUMN IF NOT EXISTS voucher_number VARCHAR(100);

-- ── 8. Usage Logs ──────────────────────────────────────────────────
-- Already exists as asset_usage_logs, extend it
ALTER TABLE asset_usage_logs
  ADD COLUMN IF NOT EXISTS idle_hours     NUMERIC(8,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS breakdown_hrs  NUMERIC(8,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS efficiency_pct NUMERIC(5,2);

-- ── 9. Asset Disposals ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS asset_disposals (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id            UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  company_id          UUID NOT NULL,
  disposal_type       VARCHAR(30) NOT NULL
                      CHECK (disposal_type IN ('sold','scrapped','lost','damaged','donated')),
  disposal_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  book_value          NUMERIC(15,2),
  sale_value          NUMERIC(15,2) DEFAULT 0,
  scrap_value         NUMERIC(15,2) DEFAULT 0,
  buyer_name          VARCHAR(200),
  reason              TEXT,
  status              VARCHAR(20) DEFAULT 'pending'
                      CHECK (status IN ('pending','approved','completed','rejected')),
  requested_by        UUID REFERENCES users(id),
  approved_by         UUID REFERENCES users(id),
  approved_at         TIMESTAMPTZ,
  attachments         JSONB DEFAULT '[]',
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_disposal_asset ON asset_disposals(asset_id);

-- ── 10. Seed default categories ────────────────────────────────────
-- (Will be seeded per company via API, not globally here)

-- ── Indexes ────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_assets_category ON assets(category_id);
CREATE INDEX IF NOT EXISTS idx_assets_status    ON assets(status);
CREATE INDEX IF NOT EXISTS idx_asset_cat_company ON asset_categories(company_id);

SELECT 'Migration 008 applied' AS result;
