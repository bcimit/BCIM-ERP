-- Import MTC (NABL certs) and Submittals
DO $$
DECLARE
  proj_id  UUID := '310260ce-2166-4dd6-8472-aeb468e1f611';
  admin_id UUID := 'e20ca987-0ab3-43e1-92cf-89f80c784900';
  doc      RECORD;
BEGIN
  -- NABL Certificates as MTC records
  FOR doc IN
    SELECT id, file_name, doc_title, local_url FROM documents
    WHERE module='qaqc' AND doc_type='certificate' AND file_name ILIKE '%NABL%'
  LOOP
    INSERT INTO quality_mtc (project_id, mtc_number, internal_ref,
      material_name, test_lab, nabl_accredited, auto_result, status, pdf_path, created_by)
    VALUES (
      proj_id,
      'MTC-NABL-' || LEFT(doc.id::text, 8),
      'NABL-' || LEFT(doc.id::text, 8),
      'Waterproofing Material Test Certificate',
      CASE WHEN doc.file_name ILIKE '%TC-7523%' THEN 'Stedrant Solutions - NABL TC-7523'
           ELSE 'Top Notch Construction Services - NABL' END,
      true, 'pass', 'accepted',
      COALESCE(doc.local_url,''), admin_id
    ) ON CONFLICT DO NOTHING;
  END LOOP;

  -- Vendor profiles and submittals
  INSERT INTO quality_submittals (project_id, title, category, status, submitted_at, approved_at)
  SELECT proj_id,
    REPLACE(REPLACE(d.file_name, '.pdf',''), '.PDF',''),
    CASE WHEN d.file_name ILIKE '%Submittal%' THEN 'Third Party Approval'
         WHEN d.file_name ILIKE '%Profile%'   THEN 'Vendor Prequalification'
         WHEN d.file_name ILIKE '%Rate%'      THEN 'Rate Schedule'
         ELSE 'General Document' END,
    'approved', CURRENT_DATE - 60, CURRENT_DATE - 30
  FROM documents d
  WHERE d.module='qaqc' AND d.doc_type='general'
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'MTC and Submittals imported';
END $$;

SELECT 'Migration 018b done' AS result;
