-- Migration 021: Fix submittals - remove duplicates of transmittals, add proper individual items

-- Step 1: Remove transmittal forms wrongly registered as submittals
DELETE FROM quality_submittals
WHERE submittal_number IN (
  'SUB-LH10-006','SUB-LH10-007','SUB-LH10-008',
  'SUB-LH10-008R1','SUB-LH10-009','SUB-LH10-010'
);

-- Step 2: Add proper submittals - the actual documents submitted per transmittal
INSERT INTO quality_submittals
  (project_id, submittal_number, title, description, category, status, submitted_at, review_date, created_by)
VALUES
-- Transmittal 01 contents: Quality Documents
('310260ce-2166-4dd6-8472-aeb468e1f611','SUB-LH10-006','Project Quality Plan',
 'Project Quality Plan for LANCO Hills LH10. Ref: BCIM-LH10-001',
 'Quality Plan','pending','2026-05-13','2026-05-14','e20ca987-0ab3-43e1-92cf-89f80c784900'),

('310260ce-2166-4dd6-8472-aeb468e1f611','SUB-LH10-007','ITP Part A - Materials Inspection & Testing',
 'ITP for all incoming materials. Ref: BCIM-LH10-001',
 'Quality Plan','pending','2026-05-13','2026-05-14','e20ca987-0ab3-43e1-92cf-89f80c784900'),

('310260ce-2166-4dd6-8472-aeb468e1f611','SUB-LH10-008','ITP Part B - Construction Activities',
 'ITP for all construction activities. Ref: BCIM-LH10-001',
 'Quality Plan','pending','2026-05-13','2026-05-14','e20ca987-0ab3-43e1-92cf-89f80c784900'),

('310260ce-2166-4dd6-8472-aeb468e1f611','SUB-LH10-009','Method Statement - Blockwork',
 'Methodology for Block Work. Ref: BCIM-LH10-001',
 'Method Statement','pending','2026-05-13','2026-05-14','e20ca987-0ab3-43e1-92cf-89f80c784900'),

('310260ce-2166-4dd6-8472-aeb468e1f611','SUB-LH10-010','Method Statement - Plastering',
 'Methodology for Plastering Internal & External. Ref: BCIM-LH10-001',
 'Method Statement','pending','2026-05-13','2026-05-14','e20ca987-0ab3-43e1-92cf-89f80c784900'),

('310260ce-2166-4dd6-8472-aeb468e1f611','SUB-LH10-011','Method Statement - Screed (IPS)',
 'Methodology for IPS Screed. Ref: BCIM-LH10-001',
 'Method Statement','pending','2026-05-13','2026-05-14','e20ca987-0ab3-43e1-92cf-89f80c784900'),

-- Transmittal 02 contents: Safety Documents
('310260ce-2166-4dd6-8472-aeb468e1f611','SUB-LH10-012','HSE Policy',
 'BCIM Engineering HSE Policy for LANCO Hills LH10. Ref: BCIM-LH10-002',
 'Safety Documents','pending','2026-05-13','2026-05-14','e20ca987-0ab3-43e1-92cf-89f80c784900'),

('310260ce-2166-4dd6-8472-aeb468e1f611','SUB-LH10-013','Site Safety Plan',
 'Site-specific Safety Plan for LANCO Hills LH10. Ref: BCIM-LH10-002',
 'Safety Documents','pending','2026-05-13','2026-05-14','e20ca987-0ab3-43e1-92cf-89f80c784900'),

-- Transmittal 03 & 03R1 contents: Corporate Guarantee
('310260ce-2166-4dd6-8472-aeb468e1f611','SUB-LH10-014','Corporate Guarantee for Advance',
 'Corporate Guarantee for Advance Original. Ref: BCIM-Techridge P3-JLL-003',
 'Financial / Guarantee','pending','2026-05-16','2026-05-16','e20ca987-0ab3-43e1-92cf-89f80c784900'),

('310260ce-2166-4dd6-8472-aeb468e1f611','SUB-LH10-014R1','Corporate Guarantee for Advance (Revised)',
 'Corporate Guarantee for Advance Revised R1. Ref: BCIM-LH10-003(R1)',
 'Financial / Guarantee','pending','2026-05-21','2026-05-22','e20ca987-0ab3-43e1-92cf-89f80c784900'),

-- Transmittal 04 contents: Waterproofing Method Statements
('310260ce-2166-4dd6-8472-aeb468e1f611','SUB-LH10-015','Method Statement - WP Toilet Balcony Non-Sunken',
 'Waterproofing at Toilet, Balcony, Utility Non Sunken. Ref: BCIM-LH10-004',
 'Method Statement','pending','2026-05-25','2026-05-26','e20ca987-0ab3-43e1-92cf-89f80c784900'),

('310260ce-2166-4dd6-8472-aeb468e1f611','SUB-LH10-016','Method Statement - WP Toilet Utility Sunken',
 'Waterproofing at Toilet, Utility Sunken. Ref: BCIM-LH10-004',
 'Method Statement','pending','2026-05-25','2026-05-26','e20ca987-0ab3-43e1-92cf-89f80c784900'),

('310260ce-2166-4dd6-8472-aeb468e1f611','SUB-LH10-017','Method Statement - WP Terrace',
 'Waterproofing at Terrace. Ref: BCIM-LH10-004',
 'Method Statement','pending','2026-05-25','2026-05-26','e20ca987-0ab3-43e1-92cf-89f80c784900'),

('310260ce-2166-4dd6-8472-aeb468e1f611','SUB-LH10-018','Method Statement - WP Over Head Tank',
 'Waterproofing at Over Head Tank. Ref: BCIM-LH10-004',
 'Method Statement','pending','2026-05-25','2026-05-26','e20ca987-0ab3-43e1-92cf-89f80c784900'),

('310260ce-2166-4dd6-8472-aeb468e1f611','SUB-LH10-019','Method Statement - WP Expansion Joint RCC Wall EDECK',
 'Waterproofing at Expansion Joint RCC Wall at EDECK Level. Ref: BCIM-LH10-004',
 'Method Statement','pending','2026-05-25','2026-05-26','e20ca987-0ab3-43e1-92cf-89f80c784900'),

-- Transmittal 05 contents: Vendor Approval
('310260ce-2166-4dd6-8472-aeb468e1f611','SUB-LH10-020','Vendor Approval - Top Notch Testing Services Pvt Ltd',
 'Vendor Approval for 3rd Party Testing Lab Top Notch Testing Services. Ref: BCIM-LH10-005',
 'Third Party Approval','pending','2026-05-25','2026-05-26','e20ca987-0ab3-43e1-92cf-89f80c784900'),

('310260ce-2166-4dd6-8472-aeb468e1f611','SUB-LH10-021','NABL Accreditation Certificate - Top Notch',
 'NABL Certificate for Top Notch Testing Services. Ref: BCIM-LH10-005',
 'Third Party Approval','pending','2026-05-25','2026-05-26','e20ca987-0ab3-43e1-92cf-89f80c784900');

SELECT COUNT(*) AS total_submittals FROM quality_submittals;
SELECT 'Migration 021 done' AS result;
