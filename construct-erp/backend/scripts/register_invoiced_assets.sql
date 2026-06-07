-- Register all invoiced assets that are not yet in Asset Register
-- Project: Residential Apartments - Yelahanka
-- Company: BCIM Engineering

BEGIN;

-- ═══ IT ASSETS ══════════════════════════════════════════════════════════════

-- POTQS002 | Eternity Infotech | EIHO27532526
INSERT INTO it_assets (company_id, asset_tag, asset_type, brand, model,
  purchase_date, purchase_cost, location_project_id, status, notes)
VALUES
  ('83b84668-7840-444e-8df9-350202e7bca0','IT-BIO-001','biometric','ESSL','Uface 602 + ID',
   '2025-10-30', 19300.00, '593273cf-721f-42f1-9178-53dca3e71caa', 'in_use',
   'Face/FP attendance machine. PO: POTQS002. Invoice: EIHO27532526 - Eternity Infotech.'),
  ('83b84668-7840-444e-8df9-350202e7bca0','IT-BIO-001B','biometric','ESSL','Uface 602 Battery',
   '2025-10-30', 2000.00, '593273cf-721f-42f1-9178-53dca3e71caa', 'in_use',
   'Backup battery for biometric machine. PO: POTQS002. Invoice: EIHO27532526.')
ON CONFLICT (asset_tag) DO NOTHING;

-- POTQS020 | Sri Jaladurga | DE-428
INSERT INTO it_assets (company_id, asset_tag, asset_type, brand, model,
  purchase_date, purchase_cost, location_project_id, status, notes)
VALUES
  ('83b84668-7840-444e-8df9-350202e7bca0','IT-DT-001','desktop','HP','280 G9 MT 14th Gen i5',
   '2025-11-21', 51822.03, '593273cf-721f-42f1-9178-53dca3e71caa', 'in_use',
   '14th Gen i5/8GB/512GB SSD/Win11 Pro/HP 22" TFT. PO: POTQS020. Invoice: DE-428 - Sri Jaladurga.'),
  ('83b84668-7840-444e-8df9-350202e7bca0','IT-LT-001','laptop','HP','250-G10 13th Gen i5',
   '2025-11-21', 44915.25, '593273cf-721f-42f1-9178-53dca3e71caa', 'in_use',
   '13th Gen i5/16GB/512GB SSD/15.6" FHD/Win11 Pro. PO: POTQS020. Invoice: DE-428 - Sri Jaladurga.')
ON CONFLICT (asset_tag) DO NOTHING;

-- POTQS038 | Sri Jaladurga | DE528 — 5 Desktops
INSERT INTO it_assets (company_id, asset_tag, asset_type, brand, model,
  purchase_date, purchase_cost, location_project_id, status, notes)
SELECT
  '83b84668-7840-444e-8df9-350202e7bca0',
  'IT-DT-00' || (1 + gs.n),
  'desktop', 'HP', '280 G9 MT 14th Gen i5-14500',
  '2026-01-19', 53389.83,
  '593273cf-721f-42f1-9178-53dca3e71caa', 'in_use',
  '14th Gen i5-14500/8GB/512GB SSD/Win11 Pro/HP 22" TFT/3Yr Warranty. Unit ' || (1+gs.n) ||
  '. PO: POTQS038. Invoice: DE528 - Sri Jaladurga.'
FROM generate_series(1,5) AS gs(n)
ON CONFLICT (asset_tag) DO NOTHING;

-- POTQS069 | Faczo Tech | FACZO/26-27/1390 — Server Cabinet
INSERT INTO it_assets (company_id, asset_tag, asset_type, brand, model,
  purchase_date, purchase_cost, location_project_id, status, notes)
VALUES
  ('83b84668-7840-444e-8df9-350202e7bca0','IT-CAB-001','server',NULL,'6U Wall Mount Network Rack',
   '2026-04-17', 1728.00, '593273cf-721f-42f1-9178-53dca3e71caa', 'in_use',
   'Wall mount server cabinet 6U. PO: POTQS069. Invoice: FACZO/26-27/1390 - Faczo Tech.')
ON CONFLICT (asset_tag) DO NOTHING;


-- ═══ FIXED ASSETS (Admin / Equipment) ═══════════════════════════════════════

-- POTQS026 | Sri Jaladurga | DE-435 — Aquaguard + Washing Machine
INSERT INTO assets (company_id, asset_code, asset_name, asset_type, brand,
  purchase_value, purchase_date, current_location, status,
  meter_type, fuel_type, current_meter, qr_code, notes)
VALUES
  ('83b84668-7840-444e-8df9-350202e7bca0','EQ-WP-001',
   'Aquaguard Water Purifier RO+UV Enrich Vector 6L','Other','Aquaguard',
   16500.00,'2025-11-27','593273cf-721f-42f1-9178-53dca3e71caa','available',
   'Hours','Electric',0,'QR-EQ-WP-001',
   'RO+UV 6L storage with sediment filter. PO: POTQS026. Invoice: DE-435.'),
  ('83b84668-7840-444e-8df9-350202e7bca0','EQ-WM-002',
   'Haier Washing Machine Top Load 7kg HWM30658N1','Other','Haier',
   16000.00,'2025-11-27','593273cf-721f-42f1-9178-53dca3e71caa','available',
   'Hours','Electric',0,'QR-EQ-WM-002',
   'Top load 7kg washing machine. PO: POTQS026. Invoice: DE-435.');

-- POTQS003 | A.M. Steel Furniture | Invoice 81 — Mattresses x7
INSERT INTO assets (company_id, asset_code, asset_name, asset_type, brand,
  purchase_value, purchase_date, current_location, status,
  meter_type, fuel_type, current_meter, qr_code, notes)
SELECT
  '83b84668-7840-444e-8df9-350202e7bca0',
  'EQ-MAT-00' || gs.n,
  'Mattress 3x6 ft 5 inch (Unit ' || gs.n || ')','Other','A.M. Steel Furniture',
  1600.00,'2025-11-07','593273cf-721f-42f1-9178-53dca3e71caa','available',
  'Hours','Manual',0,'QR-EQ-MAT-00'||gs.n,
  'Site accommodation mattress. PO: POTQS003. Invoice: 81 - A.M. Steel Furniture.'
FROM generate_series(1,7) AS gs(n);

-- POTQS030 | Inderjeet International | G14641/25-26 — DB Panel x4
INSERT INTO assets (company_id, asset_code, asset_name, asset_type,
  purchase_value, purchase_date, current_location, status,
  meter_type, fuel_type, current_meter, qr_code, notes)
SELECT
  '83b84668-7840-444e-8df9-350202e7bca0',
  'EQ-DBP-00' || gs.n,
  'Industrial DB Panel Board 8-plug 16A/32A/63A (Unit ' || gs.n || ')','Other',
  26000.00,'2025-12-10','593273cf-721f-42f1-9178-53dca3e71caa','available',
  'Hours','Electric',0,'QR-EQ-DBP-00'||gs.n,
  'DB panel with MCBs, RCCB, indicator, volt meter, 500mm MS stand. PO: POTQS030. Invoice: G14641/25-26.'
FROM generate_series(1,4) AS gs(n);

-- POTQS057 | Amaze Portable Cabin | 17/BLR/26-27 — Office Container + Furniture
INSERT INTO assets (company_id, asset_code, asset_name, asset_type, brand,
  purchase_value, purchase_date, current_location, status,
  meter_type, fuel_type, current_meter, qr_code, notes)
VALUES
  ('83b84668-7840-444e-8df9-350202e7bca0','EQ-OC-001',
   'Site Office Container MS Fabricated 22x10x10 ft','Other','Amaze Portable Cabin',
   231000.00,'2026-02-25','593273cf-721f-42f1-9178-53dca3e71caa','available',
   'Hours','Manual',0,'QR-EQ-OC-001',
   'Portable site office with interior fittings & electrical. PO: POTQS057. Invoice: 17/BLR/26-27.'),
  ('83b84668-7840-444e-8df9-350202e7bca0','EQ-MCH-001',
   'Manager Chair','Other','Amaze Portable Cabin',
   8000.00,'2026-02-25','593273cf-721f-42f1-9178-53dca3e71caa','available',
   'Hours','Manual',0,'QR-EQ-MCH-001',
   'Office manager chair. PO: POTQS057. Invoice: 17/BLR/26-27.'),
  ('83b84668-7840-444e-8df9-350202e7bca0','EQ-MTB-001',
   'Manager Table 4x2 ft','Other','Amaze Portable Cabin',
   5000.00,'2026-02-25','593273cf-721f-42f1-9178-53dca3e71caa','available',
   'Hours','Manual',0,'QR-EQ-MTB-001',
   'Manager table 4ft x 2ft. PO: POTQS057. Invoice: 17/BLR/26-27.');

-- Overhead File Cabinets x9
INSERT INTO assets (company_id, asset_code, asset_name, asset_type, brand,
  purchase_value, purchase_date, current_location, status,
  meter_type, fuel_type, current_meter, qr_code, notes)
SELECT
  '83b84668-7840-444e-8df9-350202e7bca0',
  'EQ-CAB-00' || gs.n,
  'Overhead File Cabinet 42" x 1.5" (Unit ' || gs.n || ')','Other','Amaze Portable Cabin',
  3500.00,'2026-02-25','593273cf-721f-42f1-9178-53dca3e71caa','available',
  'Hours','Manual',0,'QR-EQ-CAB-00'||gs.n,
  'Office file cabinet. PO: POTQS057. Invoice: 17/BLR/26-27.'
FROM generate_series(1,9) AS gs(n);


-- ═══ POWER TOOLS / MACHINERY ════════════════════════════════════════════════

-- POTQS008 | Power Tools & Tackles | PTT/23147, PTT/23149
INSERT INTO assets (company_id, asset_code, asset_name, asset_type, brand,
  purchase_value, purchase_date, current_location, status,
  meter_type, fuel_type, current_meter, qr_code, notes)
VALUES
  ('83b84668-7840-444e-8df9-350202e7bca0','TL-GM-001',
   'Grinding Machine 5" Dewalt DWE4235-IN (Unit 1)','Power Tools','Dewalt',
   6300.00,'2025-11-08','593273cf-721f-42f1-9178-53dca3e71caa','available',
   'Hours','Electric',0,'QR-TL-GM-001','PO: POTQS008. Invoice: PTT/23147.'),
  ('83b84668-7840-444e-8df9-350202e7bca0','TL-GM-002',
   'Grinding Machine 5" Dewalt DWE4235-IN (Unit 2)','Power Tools','Dewalt',
   6300.00,'2025-11-08','593273cf-721f-42f1-9178-53dca3e71caa','available',
   'Hours','Electric',0,'QR-TL-GM-002','PO: POTQS008. Invoice: PTT/23149.'),
  ('83b84668-7840-444e-8df9-350202e7bca0','TL-GM-003',
   'Grinding Machine A-7 Dewalt DWE493 (Unit 1)','Power Tools','Dewalt',
   7100.00,'2025-11-08','593273cf-721f-42f1-9178-53dca3e71caa','available',
   'Hours','Electric',0,'QR-TL-GM-003','PO: POTQS008. Invoice: PTT/23147.'),
  ('83b84668-7840-444e-8df9-350202e7bca0','TL-GM-004',
   'Grinding Machine A-7 Dewalt DWE493 (Unit 2)','Power Tools','Dewalt',
   7100.00,'2025-11-08','593273cf-721f-42f1-9178-53dca3e71caa','available',
   'Hours','Electric',0,'QR-TL-GM-004','PO: POTQS008. Invoice: PTT/23149.'),
  ('83b84668-7840-444e-8df9-350202e7bca0','TL-CS-001',
   'Circular Saw Bosch GKS 190 (Unit 1)','Power Tools','Bosch',
   8300.00,'2025-11-08','593273cf-721f-42f1-9178-53dca3e71caa','available',
   'Hours','Electric',0,'QR-TL-CS-001','PO: POTQS008. Invoice: PTT/23147.'),
  ('83b84668-7840-444e-8df9-350202e7bca0','TL-CS-002',
   'Circular Saw Bosch GKS 190 (Unit 2)','Power Tools','Bosch',
   8300.00,'2025-11-08','593273cf-721f-42f1-9178-53dca3e71caa','available',
   'Hours','Electric',0,'QR-TL-CS-002','PO: POTQS008. Invoice: PTT/23149.'),
  ('83b84668-7840-444e-8df9-350202e7bca0','TL-COM-001',
   'Cut Off Machine 14" Bosch GCO 14-24 (Unit 1)','Power Tools','Bosch',
   12900.00,'2025-11-08','593273cf-721f-42f1-9178-53dca3e71caa','available',
   'Hours','Electric',0,'QR-TL-COM-001','PO: POTQS008. Invoice: PTT/23147.'),
  ('83b84668-7840-444e-8df9-350202e7bca0','TL-COM-002',
   'Cut Off Machine 14" Bosch GCO 14-24 (Unit 2)','Power Tools','Bosch',
   12900.00,'2025-11-08','593273cf-721f-42f1-9178-53dca3e71caa','available',
   'Hours','Electric',0,'QR-TL-COM-002','PO: POTQS008. Invoice: PTT/23149.'),
  ('83b84668-7840-444e-8df9-350202e7bca0','TL-DM-001',
   'Ply Drilling Machine Dewalt GSB 16 RE (Unit 1)','Power Tools','Dewalt',
   6800.00,'2025-11-08','593273cf-721f-42f1-9178-53dca3e71caa','available',
   'Hours','Electric',0,'QR-TL-DM-001','PO: POTQS008. Invoice: PTT/23147.'),
  ('83b84668-7840-444e-8df9-350202e7bca0','TL-DM-002',
   'Ply Drilling Machine Dewalt GSB 16 RE (Unit 2)','Power Tools','Dewalt',
   6800.00,'2025-11-08','593273cf-721f-42f1-9178-53dca3e71caa','available',
   'Hours','Electric',0,'QR-TL-DM-002','PO: POTQS008. Invoice: PTT/23149.'),
  ('83b84668-7840-444e-8df9-350202e7bca0','TL-EV-001',
   'Electric Vibrator 2HP Single Phase Crompton (Unit 1)','Other','Crompton',
   11300.00,'2025-11-08','593273cf-721f-42f1-9178-53dca3e71caa','available',
   'Hours','Electric',0,'QR-TL-EV-001','PO: POTQS008. Invoice: PTT/23147.'),
  ('83b84668-7840-444e-8df9-350202e7bca0','TL-EV-002',
   'Electric Vibrator 2HP Single Phase Crompton (Unit 2)','Other','Crompton',
   11300.00,'2025-11-08','593273cf-721f-42f1-9178-53dca3e71caa','available',
   'Hours','Electric',0,'QR-TL-EV-002','PO: POTQS008. Invoice: PTT/23149.'),
  ('83b84668-7840-444e-8df9-350202e7bca0','TL-CP-001',
   'Curing Pump 1HP Sharp (Unit 1)','Other','Sharp',
   5300.00,'2025-11-08','593273cf-721f-42f1-9178-53dca3e71caa','available',
   'Hours','Electric',0,'QR-TL-CP-001','PO: POTQS008. Invoice: PTT/23147.'),
  ('83b84668-7840-444e-8df9-350202e7bca0','TL-CP-002',
   'Curing Pump 1HP Sharp (Unit 2)','Other','Sharp',
   5300.00,'2025-11-08','593273cf-721f-42f1-9178-53dca3e71caa','available',
   'Hours','Electric',0,'QR-TL-CP-002','PO: POTQS008. Invoice: PTT/23149.');

-- POTQS018 | PTT/23637/25-26 — Chipping Machine
INSERT INTO assets (company_id, asset_code, asset_name, asset_type, brand,
  purchase_value, purchase_date, current_location, status,
  meter_type, fuel_type, current_meter, qr_code, notes)
VALUES
  ('83b84668-7840-444e-8df9-350202e7bca0','TL-CHM-003',
   'Concrete Chipping Machine 11Kg Dong Cheng','Power Tools','Dong Cheng',
   14000.00,'2025-11-19','593273cf-721f-42f1-9178-53dca3e71caa','available',
   'Hours','Electric',0,'QR-TL-CHM-003',
   'PO: POTQS018. Invoice: PTT/23637/25-26 - Power Tools & Tackles.');

-- POTQS028 | Evergreen Engineering | EE/25-26/198, EE/25-26/199
INSERT INTO assets (company_id, asset_code, asset_name, asset_type, brand,
  purchase_value, purchase_date, current_location, status,
  meter_type, fuel_type, current_meter, qr_code, notes)
VALUES
  ('83b84668-7840-444e-8df9-350202e7bca0','TL-HD-003',
   'Hammer Drilling Machine Bosch GBH 4-32 DFR (Unit 1)','Power Tools','Bosch',
   26500.00,'2025-12-10','593273cf-721f-42f1-9178-53dca3e71caa','available',
   'Hours','Electric',0,'QR-TL-HD-003',
   'SDS Plus Rotary Hammer Drill. PO: POTQS028. Invoice: EE/25-26/198.'),
  ('83b84668-7840-444e-8df9-350202e7bca0','TL-HD-004',
   'Hammer Drilling Machine Bosch GBH 4-32 DFR (Unit 2)','Power Tools','Bosch',
   26500.00,'2025-12-10','593273cf-721f-42f1-9178-53dca3e71caa','available',
   'Hours','Electric',0,'QR-TL-HD-004',
   'SDS Plus Rotary Hammer Drill. PO: POTQS028. Invoice: EE/25-26/199.');

-- POTQS033 | Evergreen Engineering | EE/25-26/212, EE/25-26/216 — Vibrators x2
INSERT INTO assets (company_id, asset_code, asset_name, asset_type, brand,
  purchase_value, purchase_date, current_location, status,
  meter_type, fuel_type, current_meter, qr_code, notes)
VALUES
  ('83b84668-7840-444e-8df9-350202e7bca0','TL-EV-003',
   'Electric Vibrator 2HP Crompton (Unit 3)','Other','Crompton',
   10500.00,'2025-12-30','593273cf-721f-42f1-9178-53dca3e71caa','available',
   'Hours','Electric',0,'QR-TL-EV-003',
   'PO: POTQS033. Invoice: EE/25-26/212.'),
  ('83b84668-7840-444e-8df9-350202e7bca0','TL-EV-004',
   'Electric Vibrator 2HP Crompton (Unit 4)','Other','Crompton',
   10500.00,'2025-12-30','593273cf-721f-42f1-9178-53dca3e71caa','available',
   'Hours','Electric',0,'QR-TL-EV-004',
   'PO: POTQS033. Invoice: EE/25-26/216.');

-- POTQS067 | Power Tools & Tackles | PTT/29803/25-26
INSERT INTO assets (company_id, asset_code, asset_name, asset_type, brand,
  purchase_value, purchase_date, current_location, status,
  meter_type, fuel_type, current_meter, qr_code, notes)
VALUES
  ('83b84668-7840-444e-8df9-350202e7bca0','TL-WM-001',
   'Portable Welding Machine 200A Single Phase Robust','Other','Robust',
   7000.00,'2026-03-25','593273cf-721f-42f1-9178-53dca3e71caa','available',
   'Hours','Electric',0,'QR-TL-WM-001',
   'PO: POTQS067. Invoice: PTT/29803/25-26.'),
  ('83b84668-7840-444e-8df9-350202e7bca0','TL-GM-005',
   'Grinding Machine 4" Dewalt (Unit 1)','Power Tools','Dewalt',
   2750.00,'2026-03-25','593273cf-721f-42f1-9178-53dca3e71caa','available',
   'Hours','Electric',0,'QR-TL-GM-005',
   'PO: POTQS067. Invoice: PTT/29803/25-26.'),
  ('83b84668-7840-444e-8df9-350202e7bca0','TL-GM-006',
   'Grinding Machine 4" Dewalt (Unit 2)','Power Tools','Dewalt',
   2750.00,'2026-03-25','593273cf-721f-42f1-9178-53dca3e71caa','available',
   'Hours','Electric',0,'QR-TL-GM-006',
   'PO: POTQS067. Invoice: PTT/29803/25-26.'),
  ('83b84668-7840-444e-8df9-350202e7bca0','TL-DM-003',
   'Ply Drilling Machine Bosch GSB 16 RE (Unit 1)','Power Tools','Bosch',
   6800.00,'2026-03-25','593273cf-721f-42f1-9178-53dca3e71caa','available',
   'Hours','Electric',0,'QR-TL-DM-003',
   'PO: POTQS067. Invoice: PTT/29803/25-26.'),
  ('83b84668-7840-444e-8df9-350202e7bca0','TL-DM-004',
   'Ply Drilling Machine Bosch GSB 16 RE (Unit 2)','Power Tools','Bosch',
   6800.00,'2026-03-25','593273cf-721f-42f1-9178-53dca3e71caa','available',
   'Hours','Electric',0,'QR-TL-DM-004',
   'PO: POTQS067. Invoice: PTT/29803/25-26.'),
  ('83b84668-7840-444e-8df9-350202e7bca0','TL-DM-005',
   'Ply Drilling Machine Bosch GSB 16 RE (Unit 3)','Power Tools','Bosch',
   6800.00,'2026-03-25','593273cf-721f-42f1-9178-53dca3e71caa','available',
   'Hours','Electric',0,'QR-TL-DM-005',
   'PO: POTQS067. Invoice: PTT/29803/25-26.');


-- ═══ VERIFICATION ═══════════════════════════════════════════════════════════

SELECT 'Assets added today:' AS info, COUNT(*) AS count
FROM assets
WHERE company_id = '83b84668-7840-444e-8df9-350202e7bca0'
  AND created_at::date = CURRENT_DATE;

SELECT 'IT Assets added today:' AS info, COUNT(*) AS count
FROM it_assets
WHERE company_id = '83b84668-7840-444e-8df9-350202e7bca0'
  AND created_at::date = CURRENT_DATE;

SELECT asset_code, asset_name, asset_type, purchase_value
FROM assets
WHERE company_id = '83b84668-7840-444e-8df9-350202e7bca0'
  AND created_at::date = CURRENT_DATE
ORDER BY asset_code;

SELECT asset_tag, asset_type, model, purchase_cost
FROM it_assets
WHERE company_id = '83b84668-7840-444e-8df9-350202e7bca0'
  AND created_at::date = CURRENT_DATE
ORDER BY asset_tag;

COMMIT;
