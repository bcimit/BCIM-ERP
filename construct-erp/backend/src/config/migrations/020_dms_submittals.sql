-- Migration 020: Add submittal docs to DMS with proper folder & categorization
DO $$
DECLARE
  cid      UUID;
  admin_id UUID := 'e20ca987-0ab3-43e1-92cf-89f80c784900';
  proj_id  UUID := '310260ce-2166-4dd6-8472-aeb468e1f611';
  fid      UUID;
BEGIN
  SELECT company_id INTO cid FROM users WHERE id = admin_id;

  -- Create Submittals folder in DMS
  INSERT INTO document_folders (company_id, project_id, folder_name, folder_type, path, created_by)
  VALUES (cid, proj_id, 'Submittals & Transmittals', 'project',
    '/LANCO Hills LH10/Submittals', admin_id)
  ON CONFLICT DO NOTHING
  RETURNING id INTO fid;

  IF fid IS NULL THEN
    SELECT id INTO fid FROM document_folders
    WHERE company_id=cid AND folder_name='Submittals & Transmittals' LIMIT 1;
  END IF;

  -- Update the 6 submittal docs with proper DMS metadata
  UPDATE documents SET
    doc_type   = 'correspondence',
    discipline = 'QA/QC',
    folder_id  = fid,
    status     = 'approved',
    updated_at = NOW()
  WHERE doc_number IN (
    'SUB-TRANS-01','SUB-TRANS-02','SUB-TRANS-03',
    'SUB-TRANS-03R1','SUB-TRANS-04','SUB-TRANS-05'
  );

  RAISE NOTICE 'DMS submittals updated, folder: %', fid;
END $$;

-- Also update descriptions separately to avoid encoding issues
UPDATE documents SET description = 'Transmittal 01 to SAVILLS: Quality Plan, ITP Materials & Activities, MS Blockwork/Plastering/Screed. Date: 13 May 2026' WHERE doc_number = 'SUB-TRANS-01';
UPDATE documents SET description = 'Transmittal 02 to SAVILLS: HSE Policy and Site Safety Plan. Date: 13 May 2026' WHERE doc_number = 'SUB-TRANS-02';
UPDATE documents SET description = 'Transmittal 03 to SAVILLS: Corporate Guarantee for Advance. Date: 16 May 2026' WHERE doc_number = 'SUB-TRANS-03';
UPDATE documents SET description = 'Transmittal 03 R1 to SAVILLS: Corporate Guarantee for Advance Revised. Date: 21 May 2026' WHERE doc_number = 'SUB-TRANS-03R1';
UPDATE documents SET description = 'Transmittal 04 to SAVILLS: Waterproofing Method Statements 5 locations. Date: 25 May 2026' WHERE doc_number = 'SUB-TRANS-04';
UPDATE documents SET description = 'Transmittal 05 to SAVILLS: Vendor Approval Top Notch Testing Services + NABL Certificate. Date: 25 May 2026' WHERE doc_number = 'SUB-TRANS-05';

-- Also update doc_title to be cleaner
UPDATE documents SET doc_title = 'Submittal 01 - Quality Documents (ITP, Method Statements)' WHERE doc_number = 'SUB-TRANS-01';
UPDATE documents SET doc_title = 'Submittal 02 - Safety Documents (HSE Policy, Site Safety Plan)' WHERE doc_number = 'SUB-TRANS-02';
UPDATE documents SET doc_title = 'Submittal 03 - Corporate Guarantee for Advance' WHERE doc_number = 'SUB-TRANS-03';
UPDATE documents SET doc_title = 'Submittal 03 R1 - Corporate Guarantee for Advance (Revised)' WHERE doc_number = 'SUB-TRANS-03R1';
UPDATE documents SET doc_title = 'Submittal 04 - Waterproofing Method Statements (5 Locations)' WHERE doc_number = 'SUB-TRANS-04';
UPDATE documents SET doc_title = 'Submittal 05 - Vendor Approval for 3rd Party (Top Notch Testing)' WHERE doc_number = 'SUB-TRANS-05';

SELECT 'Migration 020 applied' AS result;
