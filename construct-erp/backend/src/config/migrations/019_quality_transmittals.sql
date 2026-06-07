-- ================================================================
-- Migration 019: QA/QC Transmittals & fix quality_submittals columns
-- ================================================================

-- ── Fix quality_submittals — add missing columns ─────────────────
ALTER TABLE quality_submittals
  ADD COLUMN IF NOT EXISTS submittal_number VARCHAR(60),
  ADD COLUMN IF NOT EXISTS description      TEXT,
  ADD COLUMN IF NOT EXISTS material_name    VARCHAR(255),
  ADD COLUMN IF NOT EXISTS vendor_name      VARCHAR(255),
  ADD COLUMN IF NOT EXISTS review_date      DATE,
  ADD COLUMN IF NOT EXISTS remarks          TEXT,
  ADD COLUMN IF NOT EXISTS attachments      JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS created_by       UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS created_at       TIMESTAMPTZ DEFAULT NOW();

-- Auto-generate submittal_number for existing records
UPDATE quality_submittals
SET submittal_number = 'SUB-LH10-' || LPAD(ROW_NUMBER() OVER (ORDER BY created_at)::text, 3, '0')
WHERE submittal_number IS NULL;

-- ── QA/QC Transmittals ────────────────────────────────────────────
-- A Transmittal is a formal document covering letter sent when
-- transmitting drawings/submittals to client/consultant.
CREATE TABLE IF NOT EXISTS quality_transmittals (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id       UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  transmittal_no   VARCHAR(60) NOT NULL UNIQUE,
  transmittal_date DATE NOT NULL DEFAULT CURRENT_DATE,
  -- Parties
  to_party         VARCHAR(300) NOT NULL,   -- client / consultant name
  to_contact       VARCHAR(200),
  to_email         VARCHAR(200),
  from_party       VARCHAR(300),            -- contractor / us
  -- Purpose
  subject          VARCHAR(500) NOT NULL,
  purpose          VARCHAR(40) DEFAULT 'information'
                     CHECK (purpose IN ('information','approval','review','record','action','comment')),
  -- Delivery
  delivery_method  VARCHAR(30) DEFAULT 'email'
                     CHECK (delivery_method IN ('email','courier','hand','registered_post','portal')),
  -- Documents transmitted (list)
  documents        JSONB DEFAULT '[]',   -- [{doc_no, title, revision, copies, remarks}]
  -- Status & tracking
  status           VARCHAR(30) DEFAULT 'sent'
                     CHECK (status IN ('draft','sent','acknowledged','overdue')),
  sent_date        DATE,
  ack_date         DATE,           -- acknowledgment date
  ack_by           VARCHAR(200),   -- who acknowledged
  ack_remarks      TEXT,
  remarks          TEXT,
  -- Attachments (DMS links)
  attachments      JSONB DEFAULT '[]',
  created_by       UUID REFERENCES users(id),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_qtrans_project ON quality_transmittals(project_id);
CREATE INDEX IF NOT EXISTS idx_qtrans_date    ON quality_transmittals(transmittal_date DESC);
CREATE INDEX IF NOT EXISTS idx_qtrans_status  ON quality_transmittals(status);

SELECT 'Migration 019 applied — quality_transmittals created' AS result;
