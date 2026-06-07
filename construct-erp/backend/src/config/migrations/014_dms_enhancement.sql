-- ================================================================
-- Migration 014: Document Management System — Full Enhancement
-- ================================================================

-- ── Extend documents table ────────────────────────────────────────
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS doc_number      VARCHAR(100),   -- DCC-001 etc.
  ADD COLUMN IF NOT EXISTS doc_title       VARCHAR(500),
  ADD COLUMN IF NOT EXISTS doc_type        VARCHAR(50) DEFAULT 'general'
                             CHECK (doc_type IN (
                               'drawing','boq','contract','purchase_order','invoice','rfi',
                               'site_report','safety_report','inspection_report','method_statement',
                               'specification','tender_doc','quality_plan','correspondence',
                               'certificate','permit','general'
                             )),
  ADD COLUMN IF NOT EXISTS revision        VARCHAR(20) DEFAULT 'A',
  ADD COLUMN IF NOT EXISTS revision_no     INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS description     TEXT,
  ADD COLUMN IF NOT EXISTS status          VARCHAR(20) DEFAULT 'draft'
                             CHECK (status IN ('draft','under_review','approved','rejected','superseded','archived')),
  ADD COLUMN IF NOT EXISTS discipline      VARCHAR(50),    -- Civil, MEP, Structural, etc.
  ADD COLUMN IF NOT EXISTS expiry_date     DATE,
  ADD COLUMN IF NOT EXISTS metadata        JSONB DEFAULT '{}',  -- custom key-value pairs
  ADD COLUMN IF NOT EXISTS is_confidential BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS parent_doc_id   UUID REFERENCES documents(id), -- for revisions
  ADD COLUMN IF NOT EXISTS approved_by     UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS approved_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS access_level    VARCHAR(20) DEFAULT 'internal'
                             CHECK (access_level IN ('public','internal','restricted','confidential'));

-- Indexes for new columns
CREATE INDEX IF NOT EXISTS idx_doc_type       ON documents(doc_type);
CREATE INDEX IF NOT EXISTS idx_doc_status     ON documents(status);
CREATE INDEX IF NOT EXISTS idx_doc_number     ON documents(doc_number);
CREATE INDEX IF NOT EXISTS idx_doc_expiry     ON documents(expiry_date);
CREATE INDEX IF NOT EXISTS idx_doc_parent     ON documents(parent_doc_id);

-- ── Document Version History ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS document_versions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id     UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version_no      INTEGER NOT NULL,
  revision        VARCHAR(20),
  file_name       VARCHAR(255),
  file_url        TEXT,
  onedrive_id     TEXT,
  file_size       INTEGER,
  change_summary  TEXT,
  uploaded_by     UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dv_document ON document_versions(document_id);

-- ── Document Approval Workflow ────────────────────────────────────
CREATE TABLE IF NOT EXISTS document_approvals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id     UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  sequence_no     INTEGER DEFAULT 1,
  approver_id     UUID REFERENCES users(id),
  approver_name   VARCHAR(200),
  approval_type   VARCHAR(30) DEFAULT 'review'
                    CHECK (approval_type IN ('review','technical','commercial','management','final')),
  status          VARCHAR(20) DEFAULT 'pending'
                    CHECK (status IN ('pending','approved','rejected','skipped')),
  comments        TEXT,
  actioned_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dapp_document ON document_approvals(document_id);
CREATE INDEX IF NOT EXISTS idx_dapp_approver ON document_approvals(approver_id);

-- ── Document Access Log (Audit Trail) ────────────────────────────
CREATE TABLE IF NOT EXISTS document_access_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id     UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES users(id),
  action          VARCHAR(20) NOT NULL
                    CHECK (action IN ('view','download','edit','approve','reject','share','delete','upload')),
  ip_address      VARCHAR(50),
  user_agent      VARCHAR(500),
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dal_document ON document_access_logs(document_id);
CREATE INDEX IF NOT EXISTS idx_dal_user     ON document_access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_dal_created  ON document_access_logs(created_at);

-- ── Document Shares (External / Time-limited) ────────────────────
CREATE TABLE IF NOT EXISTS document_shares (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id     UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  share_token     VARCHAR(100) UNIQUE NOT NULL,
  shared_by       UUID REFERENCES users(id),
  recipient_email VARCHAR(200),
  recipient_name  VARCHAR(200),
  purpose         TEXT,
  permissions     VARCHAR(20) DEFAULT 'view'
                    CHECK (permissions IN ('view','download')),
  expires_at      TIMESTAMPTZ,
  access_count    INTEGER DEFAULT 0,
  last_accessed   TIMESTAMPTZ,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_share_token    ON document_shares(share_token);
CREATE INDEX IF NOT EXISTS idx_share_document ON document_shares(document_id);

-- ── Document Register (for summary/reporting) ────────────────────
-- This is a view that aggregates document info
CREATE OR REPLACE VIEW document_register AS
  SELECT
    d.id, d.company_id, d.project_id, d.doc_number, d.doc_title,
    d.doc_type, d.revision, d.revision_no, d.status,
    d.discipline, d.module, d.expiry_date,
    d.file_name, d.file_type, d.file_size,
    d.is_confidential, d.access_level,
    d.uploaded_by, u.name AS uploaded_by_name,
    d.approved_by, ua.name AS approved_by_name,
    d.approved_at, d.created_at,
    p.name AS project_name,
    (SELECT COUNT(*) FROM document_versions dv WHERE dv.document_id = d.id) AS version_count,
    (SELECT COUNT(*) FROM document_access_logs dal WHERE dal.document_id = d.id) AS access_count
  FROM documents d
  LEFT JOIN users u  ON u.id = d.uploaded_by
  LEFT JOIN users ua ON ua.id = d.approved_by
  LEFT JOIN projects p ON p.id = d.project_id;

SELECT 'Migration 014 applied — DMS enhanced' AS result;
