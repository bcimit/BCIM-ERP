-- ============================================================
-- LANCO Hills LH 10 — Insert POs, WOs, Vendors & link docs
-- ============================================================

BEGIN;

-- ── 1. INSERT NEW VENDORS ─────────────────────────────────
INSERT INTO vendors (company_id, vendor_code, name, gstin, pan, vendor_type, state, is_active)
VALUES
  ('83b84668-7840-444e-8df9-350202e7bca0','VND-0046','M/s. GOEL TRADERS',           '36ACWPG4449B1ZH', NULL,         'supplier',      'Telangana', true),
  ('83b84668-7840-444e-8df9-350202e7bca0','VND-0047','M/s. SVR Nirman Products Inc', NULL,              NULL,         'supplier',      'Telangana', true),
  ('83b84668-7840-444e-8df9-350202e7bca0','VND-0048','M/s. SRI VINAYAKA BRICK INDUSTRY','36AAXFS7302H1ZS',NULL,       'supplier',      'Telangana', true),
  ('83b84668-7840-444e-8df9-350202e7bca0','VND-0049','NS DEMOLITION SERVICES',       '36LZWPS2614G1ZM','LZWPS2614G', 'subcontractor', 'Telangana', true),
  ('83b84668-7840-444e-8df9-350202e7bca0','VND-0050','M/S. JAI SRI RAM EARTH MOVERS',NULL,             'AITPI8760J',  'subcontractor', 'Telangana', true),
  ('83b84668-7840-444e-8df9-350202e7bca0','VND-0051','M/s. AARKA ENGINEERING CONSTRUCTIONS','36ACEFA4144K1ZF','ACEFA4144K','subcontractor','Telangana',true),
  ('83b84668-7840-444e-8df9-350202e7bca0','VND-0052','M/s. RAJALAXMI CONSTRUCTIONS', '36BTNPP0589G1Z6','BTNPP0589G',  'subcontractor', 'Telangana', true),
  ('83b84668-7840-444e-8df9-350202e7bca0','VND-0053','M/s. SRI GANESH CIVIL AND EARTH MOVERS','36CVCPM9225N1Z1','CVCPM9225N','subcontractor','Telangana',true)
ON CONFLICT (vendor_code) DO NOTHING;

-- ── 2. INSERT PURCHASE ORDERS ─────────────────────────────
INSERT INTO purchase_orders
  (project_id, vendor_id, po_number, po_date, sub_total, total_gst, grand_total,
   status, narration, created_by, cgst_rate, sgst_rate, igst_rate)
VALUES
  (
    '310260ce-2166-4dd6-8472-aeb468e1f611',
    (SELECT id FROM vendors WHERE vendor_code='VND-0046'),
    'POLANLH10001','2026-05-22',
    174319.00, 29236.32, 203555.32,
    'approved','Supply of Safety Items & Consumables for LANCO Hills LH 10',
    'e20ca987-0ab3-43e1-92cf-89f80c784900',
    9, 9, 0
  ),
  (
    '310260ce-2166-4dd6-8472-aeb468e1f611',
    '7da289f8-120c-4bfd-9b4e-e5972524cac5',   -- Royal electricals (existing)
    'POLANLH10002','2026-05-22',
    98100.00, 17658.00, 115758.00,
    'approved','Supply of Electrical Items for LANCO Hills LH 10',
    'e20ca987-0ab3-43e1-92cf-89f80c784900',
    0, 0, 18
  ),
  (
    '310260ce-2166-4dd6-8472-aeb468e1f611',
    (SELECT id FROM vendors WHERE vendor_code='VND-0047'),
    'POLANLH10003','2026-05-27',
    3753262.00, 675587.16, 4428849.16,
    'approved','Supply of Concrete Blocks for LANCO Hills LH 10',
    'e20ca987-0ab3-43e1-92cf-89f80c784900',
    9, 9, 0
  ),
  (
    '310260ce-2166-4dd6-8472-aeb468e1f611',
    (SELECT id FROM vendors WHERE vendor_code='VND-0048'),
    'POLANLH10004','2026-05-27',
    3753262.00, 675587.16, 4428849.16,
    'approved','Supply of Concrete Blocks for LANCO Hills LH 10',
    'e20ca987-0ab3-43e1-92cf-89f80c784900',
    9, 9, 0
  )
ON CONFLICT (po_number) DO NOTHING;

-- ── 3. INSERT WORK ORDERS ─────────────────────────────────
INSERT INTO work_orders
  (project_id, wo_number, vendor_id, work_description, subject, scope_of_work,
   start_date, contract_amount, total_value, status, created_by)
VALUES
  (
    '310260ce-2166-4dd6-8472-aeb468e1f611',
    'WOLANLH10001',
    (SELECT id FROM vendors WHERE vendor_code='VND-0049'),
    'Dismantling of Block Masonry Wall from 1st to 20th Floor',
    'Dismantling Work - LANCO Hills LH 10 (1st–20th Floor)',
    'Dismantling of Block Masonry Wall from 1st to 20th Floor as per approved drawings and site engineer instructions.',
    '2026-05-12', 2194400.00, 2589392.00, 'active',
    'e20ca987-0ab3-43e1-92cf-89f80c784900'
  ),
  (
    '310260ce-2166-4dd6-8472-aeb468e1f611',
    'WOLANLH10002',
    (SELECT id FROM vendors WHERE vendor_code='VND-0050'),
    'Debris Removal using Bob Cat, Tractor, JCB and Dumper',
    'Debris Removal - LANCO Hills LH 10',
    'Removal of debris and waste material from the site using Bob Cat, Tractor, JCB, and Dumper as per site requirement.',
    '2026-05-16', 1157000.00, 1157000.00, 'active',
    'e20ca987-0ab3-43e1-92cf-89f80c784900'
  ),
  (
    '310260ce-2166-4dd6-8472-aeb468e1f611',
    'WOLANLH10003',
    (SELECT id FROM vendors WHERE vendor_code='VND-0051'),
    'Block Work and Plastering for 20 Floors (11th to 30th Floor)',
    'Block Work & Plastering - LANCO Hills LH 10 (11th–30th Floor)',
    'Execution of Block Work and Plastering for 20 Floors (11th to 30th Floor) as per approved drawings, BOQ and specifications.',
    '2026-05-25', 25826718.85, 30475528.24, 'active',
    'e20ca987-0ab3-43e1-92cf-89f80c784900'
  ),
  (
    '310260ce-2166-4dd6-8472-aeb468e1f611',
    'WOLANLH10004',
    (SELECT id FROM vendors WHERE vendor_code='VND-0052'),
    'Waterproofing Work - LANCO Hills LH 10',
    'Waterproofing Work - LANCO Hills LH 10',
    'Waterproofing work for all applicable areas as per approved drawings and waterproofing specifications.',
    '2026-05-18', 5622821.50, 6634929.37, 'active',
    'e20ca987-0ab3-43e1-92cf-89f80c784900'
  ),
  (
    '310260ce-2166-4dd6-8472-aeb468e1f611',
    'WOLANLH10005',
    (SELECT id FROM vendors WHERE vendor_code='VND-0053'),
    'Dismantling of Block Masonry Wall from 11th to 20th Floor',
    'Dismantling Work - LANCO Hills LH 10 (11th–20th Floor)',
    'Dismantling of Block Masonry Wall from 11th to 20th Floor as per approved drawings and site engineer instructions.',
    '2026-05-27', 1055000.00, 1244900.00, 'active',
    'e20ca987-0ab3-43e1-92cf-89f80c784900'
  )
ON CONFLICT (wo_number) DO NOTHING;

-- ── 4. UPDATE DOCUMENTS — set project_id, fix module, link module_record_id ──
-- PO documents
UPDATE documents SET
  project_id       = '310260ce-2166-4dd6-8472-aeb468e1f611',
  module           = 'purchase_order',
  module_record_id = (SELECT id FROM purchase_orders WHERE po_number='POLANLH10001')
WHERE id = '8fe98b7c-6651-447e-bde6-34bce7691b36';   -- POLANLH10001 Goel Traders

UPDATE documents SET
  project_id       = '310260ce-2166-4dd6-8472-aeb468e1f611',
  module           = 'purchase_order',
  module_record_id = (SELECT id FROM purchase_orders WHERE po_number='POLANLH10002')
WHERE id = '846464c4-39fb-4aad-91f5-946414629937';   -- POLANLH10002 Royal Electricals

UPDATE documents SET
  project_id       = '310260ce-2166-4dd6-8472-aeb468e1f611',
  module           = 'purchase_order',
  module_record_id = (SELECT id FROM purchase_orders WHERE po_number='POLANLH10003')
WHERE id = 'b69ef5ef-2dee-45a6-90f7-f4923bcba255';   -- POLANLH10003 SVR Nirman

UPDATE documents SET
  project_id       = '310260ce-2166-4dd6-8472-aeb468e1f611',
  module           = 'purchase_order',
  module_record_id = (SELECT id FROM purchase_orders WHERE po_number='POLANLH10004')
WHERE id = '1485c33b-d5b1-4c3e-8099-47b9a636ed8a';   -- POLANLH10004 Sri Vinayaka

-- WO documents (fix module from 'purchase_order' → 'work_order')
UPDATE documents SET
  project_id       = '310260ce-2166-4dd6-8472-aeb468e1f611',
  module           = 'work_order',
  module_record_id = (SELECT id FROM work_orders WHERE wo_number='WOLANLH10001')
WHERE id = '5b077611-3e09-41b9-9101-018952075923';   -- WOLANLH10001 NS Demolition

UPDATE documents SET
  project_id       = '310260ce-2166-4dd6-8472-aeb468e1f611',
  module           = 'work_order',
  module_record_id = (SELECT id FROM work_orders WHERE wo_number='WOLANLH10002')
WHERE id = '29530f66-ffd5-47eb-bfcc-5fd98738397a';   -- WOLANLH10002 Jai Sri Ram

UPDATE documents SET
  project_id       = '310260ce-2166-4dd6-8472-aeb468e1f611',
  module           = 'work_order',
  module_record_id = (SELECT id FROM work_orders WHERE wo_number='WOLANLH10003')
WHERE id = '7c256ed7-29bf-4c53-af79-499b69f52698';   -- WOLANLH10003 Aarka

UPDATE documents SET
  project_id       = '310260ce-2166-4dd6-8472-aeb468e1f611',
  module           = 'work_order',
  module_record_id = (SELECT id FROM work_orders WHERE wo_number='WOLANLH10004')
WHERE id = '3bc00133-3386-4a9c-a891-b061f4af43f9';   -- WOLANLH10004 Rajalaxmi

UPDATE documents SET
  project_id       = '310260ce-2166-4dd6-8472-aeb468e1f611',
  module           = 'work_order',
  module_record_id = (SELECT id FROM work_orders WHERE wo_number='WOLANLH10005')
WHERE id = 'e30f56e3-31af-4716-bdec-bce54ebc9830';   -- WOLANLH10005 Sri Ganesh

-- ── 5. MAP ALL NEW VENDORS TO LANCO HILLS PROJECT ─────────
INSERT INTO project_vendors (project_id, vendor_id, added_by)
SELECT '310260ce-2166-4dd6-8472-aeb468e1f611', id, 'e20ca987-0ab3-43e1-92cf-89f80c784900'
FROM vendors
WHERE vendor_code IN ('VND-0046','VND-0047','VND-0048','VND-0049','VND-0050','VND-0051','VND-0052','VND-0053')
ON CONFLICT (project_id, vendor_id) DO NOTHING;

-- Also map existing Royal Electricals to this project
INSERT INTO project_vendors (project_id, vendor_id, added_by)
VALUES ('310260ce-2166-4dd6-8472-aeb468e1f611','7da289f8-120c-4bfd-9b4e-e5972524cac5','e20ca987-0ab3-43e1-92cf-89f80c784900')
ON CONFLICT (project_id, vendor_id) DO NOTHING;

COMMIT;
