-- Migration 022: Link DMS files to submittals

-- SUB-LH10-006: Project Quality Plan → Project Quality Plan PDF
UPDATE quality_submittals SET attachments = jsonb_build_array(jsonb_build_object(
  'dms_id','8b9f0632-db8e-4f7b-beaf-301d419230ea',
  'name','1. Project Quality Plan.pdf',
  'url','/uploads/documents/qaqc-lh10/Methodology/PDF/1. Project Quality Plan.pdf',
  'type','pdf','source','dms'))
WHERE submittal_number = 'SUB-LH10-006';

-- SUB-LH10-007: ITP Part A → ITP Part A Materials PDF
UPDATE quality_submittals SET attachments = jsonb_build_array(jsonb_build_object(
  'dms_id','ce88d70d-7e5f-432f-ad73-a582da9d448d',
  'name','ITP - Lanco Hills LH10  -Part A - Materials.pdf',
  'url','/uploads/documents/qaqc-lh10/Methodology/PDF/ITP - Lanco Hills LH10  -Part A - Materials.pdf',
  'type','pdf','source','dms'))
WHERE submittal_number = 'SUB-LH10-007';

-- SUB-LH10-008: ITP Part B → ITP Part B Activities PDF
UPDATE quality_submittals SET attachments = jsonb_build_array(jsonb_build_object(
  'dms_id','413258a2-d593-440f-b08c-bec895ec2cfa',
  'name','ITP - Lanco Hills LH10 -Part B - Activites.pdf',
  'url','/uploads/documents/qaqc-lh10/Methodology/PDF/ITP - Lanco Hills LH10 -Part B - Activites.pdf',
  'type','pdf','source','dms'))
WHERE submittal_number = 'SUB-LH10-008';

-- SUB-LH10-009: MS Blockwork → Methodology For Block Work PDF
UPDATE quality_submittals SET attachments = jsonb_build_array(jsonb_build_object(
  'dms_id','f049a9b3-1d2b-4158-96f6-02f701465805',
  'name','Methodology For Block Work-Lanco.pdf',
  'url','/uploads/documents/qaqc-lh10/Methodology/PDF/Methodology For Block Work-Lanco.pdf',
  'type','pdf','source','dms'))
WHERE submittal_number = 'SUB-LH10-009';

-- SUB-LH10-010: MS Plastering → Methodology For Plastering PDF
UPDATE quality_submittals SET attachments = jsonb_build_array(jsonb_build_object(
  'dms_id','5f1b4e2b-8c6d-4e71-ab73-3298c6e38abc',
  'name','Methodology For Plastering-Lanco.pdf',
  'url','/uploads/documents/qaqc-lh10/Methodology/PDF/Methodology For Plastering-Lanco.pdf',
  'type','pdf','source','dms'))
WHERE submittal_number = 'SUB-LH10-010';

-- SUB-LH10-011: MS Screed → Methodology For Screed PDF
UPDATE quality_submittals SET attachments = jsonb_build_array(jsonb_build_object(
  'dms_id','97e5e9ad-e680-48cf-9735-c3d63308777e',
  'name','Methodology For Screed-Lanco.pdf',
  'url','/uploads/documents/qaqc-lh10/Methodology/PDF/Methodology For Screed-Lanco.pdf',
  'type','pdf','source','dms'))
WHERE submittal_number = 'SUB-LH10-011';

-- SUB-LH10-012: HSE Policy → link to transmittal 02 docx (no standalone file)
UPDATE quality_submittals SET attachments = jsonb_build_array(jsonb_build_object(
  'dms_id','764f465c-58e8-459b-bef0-3a50506aee43',
  'name','Submittal 02 - Safety Documents.docx',
  'url','/uploads/documents/qaqc-lh10/Submittals/Submittal 02 - Safety Documents.docx',
  'type','docx','source','dms'))
WHERE submittal_number = 'SUB-LH10-012';

-- SUB-LH10-013: Site Safety Plan → same transmittal 02 docx
UPDATE quality_submittals SET attachments = jsonb_build_array(jsonb_build_object(
  'dms_id','764f465c-58e8-459b-bef0-3a50506aee43',
  'name','Submittal 02 - Safety Documents.docx',
  'url','/uploads/documents/qaqc-lh10/Submittals/Submittal 02 - Safety Documents.docx',
  'type','docx','source','dms'))
WHERE submittal_number = 'SUB-LH10-013';

-- SUB-LH10-014: Corporate Guarantee → transmittal 03 docx
UPDATE quality_submittals SET attachments = jsonb_build_array(jsonb_build_object(
  'dms_id','cfd38f6a-b52e-4263-8abe-1498fe8bfeb6',
  'name','Submittal 03 -Corporate Guarentee for Advance.docx',
  'url','/uploads/documents/qaqc-lh10/Submittals/Submittal 03 -Corporate Guarentee for Advance.docx',
  'type','docx','source','dms'))
WHERE submittal_number = 'SUB-LH10-014';

-- SUB-LH10-014R1: Corporate Guarantee Revised → transmittal 03R1 docx
UPDATE quality_submittals SET attachments = jsonb_build_array(jsonb_build_object(
  'dms_id','5bc09ae6-aaae-4d10-82df-6b62439ce152',
  'name','Submittal 03 R1 -Corporate Guarentee for Advance - Copy.docx',
  'url','/uploads/documents/qaqc-lh10/Submittals/Submittal 03 R1 -Corporate Guarentee for Advance - Copy.docx',
  'type','docx','source','dms'))
WHERE submittal_number = 'SUB-LH10-014R1';

-- SUB-LH10-015: WP Toilet Balcony Non-Sunken → PDF R2
UPDATE quality_submittals SET attachments = jsonb_build_array(jsonb_build_object(
  'dms_id','40361ed8-2c46-435c-bc8c-b4dc711ba45a',
  'name','Methgod Statement - Water Proofing at Toilet, Balcony, Utility - Non Sunken.pdf',
  'url','/uploads/documents/qaqc-lh10/Methodology/PDF/WaterProofing - R2/Methgod Statement - Water Proofing at Toilet, Balcony, Utility - Non Sunken.pdf',
  'type','pdf','source','dms'))
WHERE submittal_number = 'SUB-LH10-015';

-- SUB-LH10-016: WP Toilet Utility Sunken → PDF R2
UPDATE quality_submittals SET attachments = jsonb_build_array(jsonb_build_object(
  'dms_id','31af9239-734a-4647-91b4-b3d702469b29',
  'name','Methgod Statement - Water Proofing at Toilet, Utility - Sunken.pdf',
  'url','/uploads/documents/qaqc-lh10/Methodology/PDF/WaterProofing - R2/Methgod Statement - Water Proofing at Toilet, Utility - Sunken.pdf',
  'type','pdf','source','dms'))
WHERE submittal_number = 'SUB-LH10-016';

-- SUB-LH10-017: WP Terrace → PDF R2
UPDATE quality_submittals SET attachments = jsonb_build_array(jsonb_build_object(
  'dms_id','58c31e41-99d4-455d-99fc-c33744f1f465',
  'name','Methgod Statement - Water Proofing at Terrace.pdf',
  'url','/uploads/documents/qaqc-lh10/Methodology/PDF/WaterProofing - R2/Methgod Statement - Water Proofing at Terrace.pdf',
  'type','pdf','source','dms'))
WHERE submittal_number = 'SUB-LH10-017';

-- SUB-LH10-018: WP OHT → PDF R2
UPDATE quality_submittals SET attachments = jsonb_build_array(jsonb_build_object(
  'dms_id','1aa211a5-6d63-48f6-9330-28aa00b83105',
  'name','Methgod Statement - Water Proofing at OHT.pdf',
  'url','/uploads/documents/qaqc-lh10/Methodology/PDF/WaterProofing - R2/Methgod Statement - Water Proofing at OHT.pdf',
  'type','pdf','source','dms'))
WHERE submittal_number = 'SUB-LH10-018';

-- SUB-LH10-019: WP Expansion Joint → PDF R2
UPDATE quality_submittals SET attachments = jsonb_build_array(jsonb_build_object(
  'dms_id','835fa210-b6af-44c9-9ec0-140d34ccfd85',
  'name','Methgod Statement - Water Proofing at Expansion Joint RCC Wall @ EDECK Level.pdf',
  'url','/uploads/documents/qaqc-lh10/Methodology/PDF/WaterProofing - R2/Methgod Statement - Water Proofing at Expansion Joint RCC Wall @ EDECK Level.pdf',
  'type','pdf','source','dms'))
WHERE submittal_number = 'SUB-LH10-019';

-- SUB-LH10-020: Top Notch Vendor Approval → transmittal 05 docx
UPDATE quality_submittals SET attachments = jsonb_build_array(jsonb_build_object(
  'dms_id','006f37d2-0756-4c93-bdf1-d8f4932bbca3',
  'name','Submittal 05 -Vendor Approval for 3rd Party.docx',
  'url','/uploads/documents/qaqc-lh10/Submittals/Submittal 05 -Vendor Approval for 3rd Party.docx',
  'type','docx','source','dms'))
WHERE submittal_number = 'SUB-LH10-020';

-- SUB-LH10-021: Top Notch NABL Certificate → NABL Certificate PDF
UPDATE quality_submittals SET attachments = jsonb_build_array(jsonb_build_object(
  'dms_id','232eb1db-1b67-48ff-807d-1ef9f4d63cb8',
  'name','NABL Certificate 2024-2026.pdf',
  'url','/uploads/documents/qaqc-lh10/Vendor Details/Top Notch - New Profile/NABL Certificate 2024-2026.pdf',
  'type','pdf','source','dms'))
WHERE submittal_number = 'SUB-LH10-021';

-- Verify
SELECT submittal_number, title, attachments->0->>'name' AS linked_file
FROM quality_submittals
WHERE submittal_number >= 'SUB-LH10-006'
ORDER BY submittal_number;

SELECT 'Migration 022 done' AS result;
