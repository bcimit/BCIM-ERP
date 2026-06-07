-- Migration 007: Fix assets and asset_movements missing columns

-- assets table - add missing columns used by routes
ALTER TABLE assets
  ADD COLUMN IF NOT EXISTS meter_type         VARCHAR(30)   DEFAULT 'Hours',
  ADD COLUMN IF NOT EXISTS fuel_type          VARCHAR(30)   DEFAULT 'Diesel',
  ADD COLUMN IF NOT EXISTS current_meter      NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hourly_rate        NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_service_meter NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS last_service_date  DATE,
  ADD COLUMN IF NOT EXISTS next_service_date  DATE;

-- asset_movements table - add missing columns
ALTER TABLE asset_movements
  ADD COLUMN IF NOT EXISTS company_id           UUID,
  ADD COLUMN IF NOT EXISTS movement_type        VARCHAR(30) DEFAULT 'transfer',
  ADD COLUMN IF NOT EXISTS issued_by            UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS received_by          UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS expected_return_date DATE,
  ADD COLUMN IF NOT EXISTS return_date          DATE,
  ADD COLUMN IF NOT EXISTS condition_out        VARCHAR(80),
  ADD COLUMN IF NOT EXISTS condition_in         VARCHAR(80),
  ADD COLUMN IF NOT EXISTS remarks              TEXT;

-- fuel logs table
CREATE TABLE IF NOT EXISTS asset_fuel_logs (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id     UUID,
  asset_id       UUID REFERENCES assets(id) ON DELETE CASCADE,
  project_id     UUID REFERENCES projects(id),
  quantity       NUMERIC(10,2),
  rate_per_liter NUMERIC(10,2),
  total_cost     NUMERIC(12,2),
  meter_at_log   NUMERIC(12,2),
  issued_by      UUID REFERENCES users(id),
  remarks        TEXT,
  log_date       DATE DEFAULT CURRENT_DATE,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- usage logs table
CREATE TABLE IF NOT EXISTS asset_usage_logs (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id    UUID,
  asset_id      UUID REFERENCES assets(id) ON DELETE CASCADE,
  project_id    UUID REFERENCES projects(id),
  start_meter   NUMERIC(12,2),
  end_meter     NUMERIC(12,2),
  units_worked  NUMERIC(12,2),
  operator_name VARCHAR(150),
  activity_name VARCHAR(255),
  remarks       TEXT,
  log_date      DATE DEFAULT CURRENT_DATE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- maintenance logs table
CREATE TABLE IF NOT EXISTS asset_maintenance_logs (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id       UUID,
  asset_id         UUID REFERENCES assets(id) ON DELETE CASCADE,
  maintenance_type VARCHAR(50) DEFAULT 'scheduled',
  description      TEXT,
  vendor_id        UUID REFERENCES vendors(id),
  cost             NUMERIC(12,2),
  start_date       DATE,
  end_date         DATE,
  status           VARCHAR(20) DEFAULT 'open',
  technician       VARCHAR(150),
  remarks          TEXT,
  created_by       UUID REFERENCES users(id),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
