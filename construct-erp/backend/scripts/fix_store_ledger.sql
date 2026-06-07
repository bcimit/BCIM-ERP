-- ============================================================
-- Fix Store Ledger:
-- 1. Remove service charges (not stock items)
-- 2. Move fixed assets to Asset Register
-- 3. Move IT assets to IT Assets table
-- ============================================================

BEGIN;

-- ─── STEP 1: Remove service charges from inventory ───────────────────────────
-- These are transport, labour, installation charges - not physical stock
DELETE FROM stock_transactions
WHERE inventory_id IN (
  SELECT id FROM inventory WHERE material_name IN (
    'Transportation Charges',
    'Standard Installation charges',
    'Halting Charges (one day) for Container type vehicle',
    'Hiring of 5 Ton Vehicle (17ft Length) - shifting of J70 materials from Thane to TQS Project',
    'Hiring of Container type Vehicle - shifting of J70 and other materials; Empty Storage Container 20ft x 8ft x 8ft - 3 Nos; 6 MT capacity',
    'Shifting of Empty Storage / Office Container from Thane, Mumbai to TQS Project, Yelahanka - total 4 containers',
    'Shifting of Shuttering & Scaffolding material from Techridge P3, Manikonda Village, Rajendranagar Mandal, RR District, Hyderabad to TQS Project, Yelahanka, near Mother Dairy. 10 Ton Capacity, 20ft Len',
    'Shifting of shuttering and scaffolding material from Hyderabad to TQS Project - 10 Ton capacity, 20ft length',
    'Transport',
    'LABOUR'
  )
);

DELETE FROM inventory WHERE material_name IN (
  'Transportation Charges',
  'Standard Installation charges',
  'Halting Charges (one day) for Container type vehicle',
  'Hiring of 5 Ton Vehicle (17ft Length) - shifting of J70 materials from Thane to TQS Project',
  'Hiring of Container type Vehicle - shifting of J70 and other materials; Empty Storage Container 20ft x 8ft x 8ft - 3 Nos; 6 MT capacity',
  'Shifting of Empty Storage / Office Container from Thane, Mumbai to TQS Project, Yelahanka - total 4 containers',
  'Shifting of Shuttering & Scaffolding material from Techridge P3, Manikonda Village, Rajendranagar Mandal, RR District, Hyderabad to TQS Project, Yelahanka, near Mother Dairy. 10 Ton Capacity, 20ft Len',
  'Shifting of shuttering and scaffolding material from Hyderabad to TQS Project - 10 Ton capacity, 20ft length',
  'Transport',
  'LABOUR'
);


-- ─── STEP 2: Move fixed/equipment assets to Asset Register ────────────────────
-- Air Conditioner x4 (2 from each bill)
INSERT INTO assets (company_id, asset_code, asset_name, asset_type, brand, model,
                    purchase_value, purchase_date, current_location, status,
                    meter_type, fuel_type, current_meter, qr_code, notes)
SELECT
  '83b84668-7840-444e-8df9-350202e7bca0',
  'EQ-AC-00' || gs.n,
  'Air Conditioner 1 Ton - DAIKEN FTKL35 Inverter 3 Star (Unit ' || gs.n || ')',
  'Other',
  'DAIKIN', 'FTKL35 INVERTER 3 STAR',
  26271.19, '2026-05-14',
  '593273cf-721f-42f1-9178-53dca3e71caa', 'available',
  'Hours', 'Electric', 0,
  'QR-EQ-AC-00' || gs.n || '-' || EXTRACT(EPOCH FROM NOW())::bigint,
  'Installed at Yelahanka project. From Invoice B088 - Sri Jaladurga Enterprises.'
FROM generate_series(1,4) AS gs(n);

-- Voltage Stabilizer x4
INSERT INTO assets (company_id, asset_code, asset_name, asset_type, brand,
                    purchase_value, purchase_date, current_location, status,
                    meter_type, fuel_type, current_meter, qr_code, notes)
SELECT
  '83b84668-7840-444e-8df9-350202e7bca0',
  'EQ-VS-00' || gs.n,
  'Voltage Stabilizer V-GUARD 4 KVA (Unit ' || gs.n || ')',
  'Other',
  'V-GUARD',
  1771.94, '2026-05-14',
  '593273cf-721f-42f1-9178-53dca3e71caa', 'available',
  'Hours', 'Electric', 0,
  'QR-EQ-VS-00' || gs.n || '-' || EXTRACT(EPOCH FROM NOW())::bigint,
  'Paired with AC units at Yelahanka project. From Invoice B088.'
FROM generate_series(1,4) AS gs(n);

-- Weighing Machine x1
INSERT INTO assets (company_id, asset_code, asset_name, asset_type, brand,
                    purchase_value, purchase_date, current_location, status,
                    meter_type, fuel_type, current_meter, qr_code, notes)
VALUES (
  '83b84668-7840-444e-8df9-350202e7bca0',
  'EQ-WM-001',
  'Weighing Machine 100 Kgs Capacity',
  'Other', NULL,
  5800.00, '2026-05-13',
  '593273cf-721f-42f1-9178-53dca3e71caa', 'available',
  'Hours', 'Manual', 0,
  'QR-EQ-WM-001',
  'Site weighing machine at Yelahanka project.'
);

-- Floor Mounted Stand x4 (AC accessory)
INSERT INTO assets (company_id, asset_code, asset_name, asset_type, brand,
                    purchase_value, purchase_date, current_location, status,
                    meter_type, fuel_type, current_meter, qr_code, notes)
SELECT
  '83b84668-7840-444e-8df9-350202e7bca0',
  'EQ-FMS-00' || gs.n,
  'Floor Mounted Stand - JOBU (Unit ' || gs.n || ')',
  'Other', 'JOBU',
  805.08, '2026-05-14',
  '593273cf-721f-42f1-9178-53dca3e71caa', 'available',
  'Hours', 'Manual', 0,
  'QR-EQ-FMS-00' || gs.n,
  'Floor stand for AC unit. From Invoice B088.'
FROM generate_series(1,4) AS gs(n);

-- CLAMP METER x1
INSERT INTO assets (company_id, asset_code, asset_name, asset_type, brand,
                    purchase_date, current_location, status,
                    meter_type, fuel_type, current_meter, qr_code, notes)
VALUES (
  '83b84668-7840-444e-8df9-350202e7bca0',
  'TL-CM-001',
  'Clamp Meter 1000A - MECO',
  'Survey Equipment', 'MECO',
  NULL, '593273cf-721f-42f1-9178-53dca3e71caa', 'available',
  'Hours', 'Manual', 0, 'QR-TL-CM-001',
  'Electrical measurement tool at Yelahanka project.'
);

-- CRIMPING TOOL x1
INSERT INTO assets (company_id, asset_code, asset_name, asset_type,
                    purchase_date, current_location, status,
                    meter_type, fuel_type, current_meter, qr_code, notes)
VALUES (
  '83b84668-7840-444e-8df9-350202e7bca0',
  'TL-CT-001',
  'Crimping Tool',
  'Power Tools',
  NULL, '593273cf-721f-42f1-9178-53dca3e71caa', 'available',
  'Hours', 'Manual', 0, 'QR-TL-CT-001',
  'Cable crimping tool at Yelahanka project.'
);

-- CONTINUITY TESTER x1
INSERT INTO assets (company_id, asset_code, asset_name, asset_type,
                    purchase_date, current_location, status,
                    meter_type, fuel_type, current_meter, qr_code, notes)
VALUES (
  '83b84668-7840-444e-8df9-350202e7bca0',
  'TL-CT-002',
  'Continuity Tester',
  'Survey Equipment',
  NULL, '593273cf-721f-42f1-9178-53dca3e71caa', 'available',
  'Hours', 'Manual', 0, 'QR-TL-CT-002',
  'Electrical continuity testing tool at Yelahanka project.'
);


-- ─── STEP 3: Move IT assets to IT Assets table ────────────────────────────────
-- 24-port D-Link Gigabit Switch (type: switch)
INSERT INTO it_assets (company_id, asset_tag, asset_type, brand, model,
                       purchase_date, location_project_id, status, notes)
VALUES (
  '83b84668-7840-444e-8df9-350202e7bca0',
  'IT-NET-001',
  'switch', 'D-Link', '24 Port Gigabit Switch',
  NULL, '593273cf-721f-42f1-9178-53dca3e71caa', 'in_use',
  '24 port D-link gigabit network switch at Yelahanka project.'
);

-- Wall Mount Server Cabinet 6U (type: server)
INSERT INTO it_assets (company_id, asset_tag, asset_type, brand, model,
                       purchase_date, location_project_id, status, notes)
VALUES (
  '83b84668-7840-444e-8df9-350202e7bca0',
  'IT-CAB-001',
  'server', NULL, 'Wall Mount Network Rack 6U',
  NULL, '593273cf-721f-42f1-9178-53dca3e71caa', 'in_use',
  'Wall mounted server cabinet / network rack 6U at Yelahanka project.'
);

-- Router (type: router)
INSERT INTO it_assets (company_id, asset_tag, asset_type, brand,
                       purchase_date, location_project_id, status, notes)
SELECT
  '83b84668-7840-444e-8df9-350202e7bca0',
  'IT-RTR-001',
  'router', NULL,
  NULL, '593273cf-721f-42f1-9178-53dca3e71caa', 'in_use',
  'Network Router at Yelahanka project (moved from store ledger).'
WHERE NOT EXISTS (
  SELECT 1 FROM it_assets WHERE asset_tag = 'IT-RTR-001'
    AND company_id = '83b84668-7840-444e-8df9-350202e7bca0'
);


-- ─── STEP 4: Remove asset items from inventory ────────────────────────────────
DELETE FROM stock_transactions
WHERE inventory_id IN (
  SELECT id FROM inventory WHERE material_name IN (
    'Air Conditioner 1 Ton Capacity - Model: DAIKEN AC FTKL35 INVERTER 3 STAR',
    'Voltage Stabilizer - V GUARD 4 KVA',
    'Floor Mounted Stand - JOBU',
    'Weighing Machine 100 Kgs (Capacity)',
    'Router',
    'wall mount server cabinet network rack 6u',
    '24 port D-link giga',
    'CLAMP METER 1000A MECO',
    'CRIMPING TOOL',
    'CONTINUITY TESTER'
  )
);

DELETE FROM inventory WHERE material_name IN (
  'Air Conditioner 1 Ton Capacity - Model: DAIKEN AC FTKL35 INVERTER 3 STAR',
  'Voltage Stabilizer - V GUARD 4 KVA',
  'Floor Mounted Stand - JOBU',
  'Weighing Machine 100 Kgs (Capacity)',
  'Router',
  'wall mount server cabinet network rack 6u',
  '24 port D-link giga',
  'CLAMP METER 1000A MECO',
  'CRIMPING TOOL',
  'CONTINUITY TESTER'
);


-- ─── STEP 5: Verify results ────────────────────────────────────────────────────
SELECT '--- Assets added to Asset Register ---' AS info;
SELECT asset_code, asset_name, asset_type, status
FROM assets
WHERE company_id = '83b84668-7840-444e-8df9-350202e7bca0'
  AND created_at::date = CURRENT_DATE
ORDER BY asset_code;

SELECT '--- IT Assets added ---' AS info;
SELECT asset_tag, asset_type, model, status
FROM it_assets
WHERE company_id = '83b84668-7840-444e-8df9-350202e7bca0'
  AND asset_tag IN ('IT-NET-001','IT-CAB-001','IT-RTR-001')
ORDER BY asset_tag;

SELECT '--- Store Ledger final category counts ---' AS info;
SELECT COALESCE(category,'(no category)') AS category, COUNT(*) AS items
FROM inventory
GROUP BY category ORDER BY category;

COMMIT;
