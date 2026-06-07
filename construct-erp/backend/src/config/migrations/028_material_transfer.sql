-- Migration 028: Material Transfer (Site-to-Site / Store-to-Site stock movement)

CREATE TABLE IF NOT EXISTS material_transfers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        UUID NOT NULL REFERENCES companies(id),
  mtr_number        VARCHAR(30) NOT NULL,

  transfer_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  transfer_type     VARCHAR(30) NOT NULL DEFAULT 'site_to_site'
                      CHECK (transfer_type IN ('site_to_site','store_to_site','site_to_store','inter_store','return_to_store')),

  from_project_id   UUID REFERENCES projects(id),
  from_location     VARCHAR(200),
  to_project_id     UUID REFERENCES projects(id),
  to_location       VARCHAR(200),

  purpose           TEXT,
  vehicle_number    VARCHAR(50),
  driver_name       VARCHAR(100),
  driver_mobile     VARCHAR(20),
  lr_number         VARCHAR(50),

  status            VARCHAR(20) NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('draft','pending_approval','approved','issued','in_transit','received','cancelled')),

  approved_by       UUID REFERENCES users(id),
  approved_at       TIMESTAMPTZ,
  issued_by         UUID REFERENCES users(id),
  issued_at         TIMESTAMPTZ,
  received_by       UUID REFERENCES users(id),
  received_at       TIMESTAMPTZ,
  cancelled_by      UUID REFERENCES users(id),
  cancelled_at      TIMESTAMPTZ,
  cancel_reason     TEXT,

  remarks           TEXT,
  created_by        UUID REFERENCES users(id),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (company_id, mtr_number)
);

CREATE TABLE IF NOT EXISTS material_transfer_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mtr_id            UUID NOT NULL REFERENCES material_transfers(id) ON DELETE CASCADE,
  material_name     VARCHAR(300) NOT NULL,
  material_code     VARCHAR(100),
  unit              VARCHAR(30) NOT NULL,
  requested_qty     NUMERIC(14,3) NOT NULL DEFAULT 0,
  approved_qty      NUMERIC(14,3),
  issued_qty        NUMERIC(14,3),
  received_qty      NUMERIC(14,3),
  rate              NUMERIC(14,2) DEFAULT 0,
  amount            NUMERIC(18,2) GENERATED ALWAYS AS (
                      COALESCE(issued_qty, approved_qty, requested_qty, 0) * COALESCE(rate, 0)
                    ) STORED,
  source_bin        VARCHAR(100),
  dest_bin          VARCHAR(100),
  condition_note    VARCHAR(200),
  remarks           TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mtr_company   ON material_transfers(company_id);
CREATE INDEX IF NOT EXISTS idx_mtr_from_proj ON material_transfers(from_project_id);
CREATE INDEX IF NOT EXISTS idx_mtr_to_proj   ON material_transfers(to_project_id);
CREATE INDEX IF NOT EXISTS idx_mtr_status    ON material_transfers(status);
CREATE INDEX IF NOT EXISTS idx_mtr_items     ON material_transfer_items(mtr_id);
