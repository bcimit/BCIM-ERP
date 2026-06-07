-- Fix sequential numbering to remove visual duplicates

-- Drilling machines: renumber 1,2,3,4 sequentially
UPDATE assets SET asset_name = 'Ply Drilling Machine Bosch GSB 16 RE (Unit 2)' WHERE asset_code='TL-DM-003' AND company_id='83b84668-7840-444e-8df9-350202e7bca0';
UPDATE assets SET asset_name = 'Ply Drilling Machine Bosch GSB 16 RE (Unit 3)' WHERE asset_code='TL-DM-004' AND company_id='83b84668-7840-444e-8df9-350202e7bca0';
UPDATE assets SET asset_name = 'Ply Drilling Machine Bosch GSB 16 RE (Unit 4)' WHERE asset_code='TL-DM-005' AND company_id='83b84668-7840-444e-8df9-350202e7bca0';

-- Vibrator: renumber to Unit 2
UPDATE assets SET asset_name = 'Electric Vibrator 2HP Crompton (Unit 2)' WHERE asset_code='TL-EV-003' AND company_id='83b84668-7840-444e-8df9-350202e7bca0';

-- Grinding machines: remove (Unit 1) from unique models, keep for same-model sets
UPDATE assets SET asset_name = 'Grinding Machine 5inch Dewalt DWE4235-IN' WHERE asset_code='TL-GM-001' AND company_id='83b84668-7840-444e-8df9-350202e7bca0';
UPDATE assets SET asset_name = 'Grinding Machine A7 Dewalt DWE493' WHERE asset_code='TL-GM-003' AND company_id='83b84668-7840-444e-8df9-350202e7bca0';
UPDATE assets SET asset_name = 'Grinding Machine 4inch Dewalt (Unit 1)' WHERE asset_code='TL-GM-005' AND company_id='83b84668-7840-444e-8df9-350202e7bca0';
UPDATE assets SET asset_name = 'Grinding Machine 4inch Dewalt (Unit 2)' WHERE asset_code='TL-GM-006' AND company_id='83b84668-7840-444e-8df9-350202e7bca0';

-- Fix EV-001 name consistency
UPDATE assets SET asset_name = 'Electric Vibrator 2HP Crompton (Unit 1)' WHERE asset_code='TL-EV-001' AND company_id='83b84668-7840-444e-8df9-350202e7bca0';

-- Show final clean list
SELECT asset_code, asset_name, brand FROM assets
WHERE company_id = '83b84668-7840-444e-8df9-350202e7bca0'
  AND (asset_name ILIKE '%Drilling%' OR asset_name ILIKE '%Grinding%'
    OR asset_name ILIKE '%Vibrator%' OR asset_name ILIKE '%Circular%'
    OR asset_name ILIKE '%Cut Off%' OR asset_name ILIKE '%Chipping%'
    OR asset_name ILIKE '%Hammer%')
ORDER BY asset_code;
