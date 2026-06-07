-- ================================================================
-- Migration 017: Import QC DMS documents into QA/QC module tables
-- Project: LANCO Hills - LH 10 (310260ce-2166-4dd6-8472-aeb468e1f611)
-- Admin user: e20ca987-0ab3-43e1-92cf-89f80c784900
-- ================================================================

-- ── 1. Import Method Statements from DMS ─────────────────────────
-- Each method_statement doc becomes a proper MS record with status=approved
-- and the file linked as an attachment

DO $$
DECLARE
  proj_id UUID := '310260ce-2166-4dd6-8472-aeb468e1f611';
  admin_id UUID := 'e20ca987-0ab3-43e1-92cf-89f80c784900';
  doc RECORD;
  ms_num VARCHAR(60);
  seq INTEGER := 1;
  disc VARCHAR(100);
  wtype VARCHAR(100);
  rev VARCHAR(10);
BEGIN
  FOR doc IN
    SELECT id, file_name, doc_title, local_url, file_type, file_size
    FROM documents
    WHERE module = 'qaqc' AND doc_type = 'method_statement'
    ORDER BY file_name
  LOOP
    ms_num := 'MS-LH10-' || LPAD(seq::text, 3, '0');

    -- Auto-detect discipline & work type from filename
    IF doc.file_name ILIKE '%waterproof%' OR doc.file_name ILIKE '%WP%' THEN
      disc  := 'Waterproofing';
      wtype := 'Waterproofing Works';
    ELSIF doc.file_name ILIKE '%block%' THEN
      disc  := 'Civil'; wtype := 'Block Work';
    ELSIF doc.file_name ILIKE '%plaster%' THEN
      disc  := 'Finishing'; wtype := 'Plastering';
    ELSIF doc.file_name ILIKE '%screed%' THEN
      disc  := 'Finishing'; wtype := 'IPS Screed';
    ELSE
      disc  := 'Civil'; wtype := 'General';
    END IF;

    -- Detect revision from folder name
    IF doc.file_name ILIKE '%R2%' OR doc.local_url ILIKE '%R2%' THEN
      rev := 'R2';
    ELSIF doc.file_name ILIKE '%R1%' OR doc.local_url ILIKE '%R1%' THEN
      rev := 'R1';
    ELSE
      rev := '0';
    END IF;

    -- Insert if not already exists (idempotent)
    INSERT INTO quality_method_statements
      (project_id, ms_number, title, discipline, work_type, revision,
       status, attachments, created_by, submitted_by, approved_by, approved_at)
    VALUES (
      proj_id,
      ms_num,
      COALESCE(doc.doc_title, REPLACE(doc.file_name, '.pdf', ''), doc.file_name),
      disc, wtype, rev,
      'approved',
      jsonb_build_array(jsonb_build_object(
        'id',       doc.id::text,
        'name',     doc.file_name,
        'url',      COALESCE(doc.local_url, ''),
        'type',     COALESCE(doc.file_type, 'pdf'),
        'size',     COALESCE(doc.file_size, 0),
        'source',   'dms',
        'dms_id',   doc.id::text
      )),
      admin_id, admin_id, admin_id, NOW()
    )
    ON CONFLICT (ms_number) DO NOTHING;

    seq := seq + 1;
  END LOOP;

  RAISE NOTICE 'Imported % method statements', seq - 1;
END $$;

-- ── 2. Import Inspection Checklists as Checklist Templates ────────
DO $$
DECLARE
  admin_id UUID := 'e20ca987-0ab3-43e1-92cf-89f80c784900';
  cid UUID;
  doc RECORD;
  seq INTEGER := 1;
  cat VARCHAR(100);
BEGIN
  SELECT company_id INTO cid FROM users WHERE id = admin_id;

  FOR doc IN
    SELECT id, file_name, doc_title, local_url, file_type, file_size
    FROM documents
    WHERE module = 'qaqc' AND doc_type = 'inspection_report'
    ORDER BY file_name
  LOOP
    -- Auto-detect category from filename
    IF doc.file_name ILIKE '%blockwork%' OR doc.file_name ILIKE '%block%' THEN
      cat := 'Structural';
    ELSIF doc.file_name ILIKE '%plaster%' THEN
      cat := 'Finishing';
    ELSIF doc.file_name ILIKE '%waterproof%' OR doc.file_name ILIKE '%WP%' THEN
      cat := 'Waterproofing';
    ELSIF doc.file_name ILIKE '%rebar%' OR doc.file_name ILIKE '%steel%' THEN
      cat := 'Structural';
    ELSIF doc.file_name ILIKE '%screed%' OR doc.file_name ILIKE '%IPS%' THEN
      cat := 'Finishing';
    ELSIF doc.file_name ILIKE '%pedestal%' THEN
      cat := 'Civil';
    ELSIF doc.file_name ILIKE '%mullion%' THEN
      cat := 'Structural';
    ELSIF doc.file_name ILIKE '%lintel%' THEN
      cat := 'Structural';
    ELSIF doc.file_name ILIKE '%lightweight%' OR doc.file_name ILIKE '%filling%' THEN
      cat := 'Civil';
    ELSIF doc.file_name ILIKE '%dismantl%' THEN
      cat := 'Structural';
    ELSE
      cat := 'General';
    END IF;

    INSERT INTO quality_checklists
      (company_id, name, category, items, created_by)
    VALUES (
      cid,
      COALESCE(doc.doc_title, REPLACE(REPLACE(doc.file_name, '.xlsx', ''), '.pdf', ''), doc.file_name),
      cat,
      jsonb_build_array(jsonb_build_object(
        'label',      'Download checklist template',
        'type',       'note',
        'required',   false,
        'dms_doc_id', doc.id::text,
        'file_name',  doc.file_name,
        'file_url',   COALESCE(doc.local_url, '')
      )),
      admin_id
    )
    ON CONFLICT DO NOTHING;

    seq := seq + 1;
  END LOOP;

  RAISE NOTICE 'Imported % checklist templates', seq - 1;
END $$;

SELECT 'Migration 017 applied — QC documents imported to QA/QC module' AS result;
