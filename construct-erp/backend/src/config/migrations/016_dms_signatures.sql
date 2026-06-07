-- ================================================================
-- Migration 016: DMS — Digital Signatures + Folders
-- ================================================================

-- ── Digital Signatures ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS document_signatures (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id     UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  signer_id       UUID REFERENCES users(id),
  signer_name     VARCHAR(200),
  signer_role     VARCHAR(100),
  signature_type  VARCHAR(20) DEFAULT 'approval'
                    CHECK (signature_type IN ('approval','review','witness','acknowledgement')),
  signature_data  TEXT,                      -- base64 signature image / typed name
  signature_method VARCHAR(20) DEFAULT 'typed'
                    CHECK (signature_method IN ('typed','drawn','uploaded','otp')),
  signed_at       TIMESTAMPTZ DEFAULT NOW(),
  ip_address      VARCHAR(50),
  hash_value      VARCHAR(128),              -- integrity hash at sign time
  comments        TEXT,
  is_valid        BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sig_document ON document_signatures(document_id);
CREATE INDEX IF NOT EXISTS idx_sig_signer   ON document_signatures(signer_id);

-- ── Document Folders (virtual folder structure) ──────────────────
CREATE TABLE IF NOT EXISTS document_folders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL,
  parent_id       UUID REFERENCES document_folders(id) ON DELETE CASCADE,
  folder_name     VARCHAR(200) NOT NULL,
  folder_type     VARCHAR(30) DEFAULT 'general'
                    CHECK (folder_type IN ('project','department','client','vendor','employee','general')),
  project_id      UUID REFERENCES projects(id),
  path            TEXT,                       -- materialized path e.g. /Projects/Yelahanka
  description     TEXT,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_folder_company ON document_folders(company_id);
CREATE INDEX IF NOT EXISTS idx_folder_parent  ON document_folders(parent_id);

-- Link documents to folders
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS folder_id      UUID REFERENCES document_folders(id),
  ADD COLUMN IF NOT EXISTS is_signed      BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS signature_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ocr_text       TEXT;        -- extracted text for full-text search

CREATE INDEX IF NOT EXISTS idx_doc_folder ON documents(folder_id);
-- Full text search index on ocr_text + title
CREATE INDEX IF NOT EXISTS idx_doc_fts ON documents
  USING gin(to_tsvector('english', COALESCE(doc_title,'') || ' ' || COALESCE(description,'') || ' ' || COALESCE(ocr_text,'')));

SELECT 'Migration 016 applied — DMS signatures & folders' AS result;
