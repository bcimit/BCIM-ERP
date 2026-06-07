-- ================================================================
-- Migration 018: Import all remaining QC documents into QA/QC tables
-- ================================================================
-- Project: LANCO Hills - LH 10
-- Admin:   e20ca987-0ab3-43e1-92cf-89f80c784900

DO $$
DECLARE
  proj_id  UUID := '310260ce-2166-4dd6-8472-aeb468e1f611';
  admin_id UUID := 'e20ca987-0ab3-43e1-92cf-89f80c784900';
  cid      UUID;
  doc      RECORD;
BEGIN
  SELECT company_id INTO cid FROM users WHERE id = admin_id;

  -- ────────────────────────────────────────────────────────────────
  -- 1. ITP Register — from quality_plan documents
  -- ────────────────────────────────────────────────────────────────
  -- ITP-LH10-001 : Project Quality Plan
  INSERT INTO quality_itps (project_id, company_id, itp_number, title,
    discipline, work_category, revision, status,
    description, attachments, approved_by, approved_at, created_by)
  SELECT
    proj_id, cid,
    'ITP-LH10-001',
    '1. Project Quality Plan — LANCO Hills LH10',
    'All Disciplines',
    'Quality Management',
    '1',
    'issued',
    'Project Quality Plan covering all QA/QC activities for LANCO Hills LH-10 project',
    jsonb_agg(jsonb_build_object(
      'id', d.id::text, 'name', d.file_name,
      'url', COALESCE(d.local_url,''), 'type', COALESCE(d.file_type,'pdf'),
      'size', COALESCE(d.file_size,0), 'source','dms','dms_id',d.id::text
    )),
    admin_id, NOW(), admin_id
  FROM documents d
  WHERE d.module='qaqc' AND d.doc_type='quality_plan'
    AND d.file_name ILIKE '%Quality Plan%'
  ON CONFLICT (itp_number) DO NOTHING;

  -- ITP-LH10-002 : ITP Part A — Materials
  INSERT INTO quality_itps (project_id, company_id, itp_number, title,
    discipline, work_category, revision, status,
    description, attachments, approved_by, approved_at, created_by)
  SELECT
    proj_id, cid,
    'ITP-LH10-002',
    'ITP — Part A: Materials Inspection & Testing Plan',
    'Materials',
    'Material Inspection',
    '1',
    'issued',
    'Inspection & Test Plan for all materials — hold points, witness points, review points',
    jsonb_agg(jsonb_build_object(
      'id', d.id::text, 'name', d.file_name,
      'url', COALESCE(d.local_url,''), 'type', COALESCE(d.file_type,'pdf'),
      'size', COALESCE(d.file_size,0), 'source','dms','dms_id',d.id::text
    )),
    admin_id, NOW(), admin_id
  FROM documents d
  WHERE d.module='qaqc' AND d.doc_type='quality_plan'
    AND d.file_name ILIKE '%Part A%'
  ON CONFLICT (itp_number) DO NOTHING;

  -- ITP-LH10-003 : ITP Part B — Activities
  INSERT INTO quality_itps (project_id, company_id, itp_number, title,
    discipline, work_category, revision, status,
    description, attachments, approved_by, approved_at, created_by)
  SELECT
    proj_id, cid,
    'ITP-LH10-003',
    'ITP — Part B: Construction Activities Inspection Plan',
    'Civil / Structural',
    'Construction Activities',
    '1',
    'issued',
    'Inspection & Test Plan for all construction activities — sequential hold/witness/review points',
    jsonb_agg(jsonb_build_object(
      'id', d.id::text, 'name', d.file_name,
      'url', COALESCE(d.local_url,''), 'type', COALESCE(d.file_type,'pdf'),
      'size', COALESCE(d.file_size,0), 'source','dms','dms_id',d.id::text
    )),
    admin_id, NOW(), admin_id
  FROM documents d
  WHERE d.module='qaqc' AND d.doc_type='quality_plan'
    AND d.file_name ILIKE '%Part B%'
  ON CONFLICT (itp_number) DO NOTHING;

  RAISE NOTICE 'ITP records imported';

  -- ────────────────────────────────────────────────────────────────
  -- 2. Test Certificates (MTC) — NABL vendor certificates
  -- ────────────────────────────────────────────────────────────────
  -- Stedrant NABL certificates
  FOR doc IN
    SELECT id, file_name, doc_title, local_url, file_type, file_size
    FROM documents
    WHERE module='qaqc' AND doc_type='certificate'
      AND file_name ILIKE '%NABL%'
    ORDER BY file_name
  LOOP
    INSERT INTO quality_mtc (project_id, mtc_number, internal_ref,
      material_name, test_lab, nabl_accredited,
      auto_result, status,
      pdf_path, created_by)
    VALUES (
      proj_id,
      'MTC-' || REPLACE(REPLACE(doc.file_name, '.pdf',''), '.PDF','') || '-' || LEFT(doc.id::text, 6),
      'NABL-' || LEFT(doc.id::text, 8),
      'Waterproofing Material — NABL Accredited Lab',
      CASE WHEN doc.file_name ILIKE '%TC-7523%' OR doc.file_name ILIKE '%Hyderabad%'
           THEN 'Stedrant Solutions — NABL TC-7523 (Hyderabad)'
           ELSE 'Top Notch Construction Services — NABL Accredited'
      END,
      true,
      'pass',
      'approved',
      COALESCE(doc.local_url, ''),
      admin_id
    )
    ON CONFLICT DO NOTHING;
  END LOOP;

  RAISE NOTICE 'MTC/NABL records imported';

  -- ────────────────────────────────────────────────────────────────
  -- 3. Document Control — Drawings/Submittals
  -- ────────────────────────────────────────────────────────────────
  -- "Submittal-05 Third Party Approval" → quality_submittals
  INSERT INTO quality_submittals (project_id, title, category, status,
    submitted_at, approved_at)
  SELECT
    proj_id,
    REPLACE(d.file_name, '.pdf', ''),
    'Third Party Approval',
    'approved',
    CURRENT_DATE - 30,
    CURRENT_DATE
  FROM documents d
  WHERE d.module='qaqc' AND d.doc_type='general'
    AND d.file_name ILIKE '%Submittal%'
  ON CONFLICT DO NOTHING;

  -- Vendor profiles as submittals
  INSERT INTO quality_submittals (project_id, title, category, status, submitted_at, approved_at)
  SELECT
    proj_id,
    REPLACE(REPLACE(d.file_name, '.pdf',''), '.PDF','') || ' — Prequalification',
    'Vendor Prequalification',
    'approved',
    CURRENT_DATE - 60,
    CURRENT_DATE - 30
  FROM documents d
  WHERE d.module='qaqc' AND d.doc_type='general'
    AND (d.file_name ILIKE '%Profile%' OR d.file_name ILIKE '%Rate%')
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Submittals imported';

END $$;

SELECT 'Migration 018 applied — all QA/QC documents imported' AS result;
