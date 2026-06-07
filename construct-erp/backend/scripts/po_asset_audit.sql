SELECT
  po.po_number, po.po_date::date AS po_date, v.name AS vendor,
  pi.material_name, pi.quantity, pi.rate,
  CASE
    WHEN pi.material_name ILIKE '%Desktop%' OR pi.material_name ILIKE '%Laptop%' THEN 'IT - Computer'
    WHEN pi.material_name ILIKE '%UPS%' THEN 'IT - UPS'
    WHEN pi.material_name ILIKE '%ESSL%' OR pi.material_name ILIKE '%Face%Cap%' THEN 'IT - Biometric'
    WHEN pi.material_name ILIKE '%Server Cabinet%' OR pi.material_name ILIKE '%Network Rack%' THEN 'IT - Server/Rack'
    WHEN pi.material_name ILIKE '%D Link%' OR pi.material_name ILIKE '%Digabit%Switch%' THEN 'IT - Network Switch'
    WHEN pi.material_name ILIKE '%Air Condition%' THEN 'Fixed - AC Unit'
    WHEN pi.material_name ILIKE '%Aquaguard%' OR pi.material_name ILIKE '%Water Purifier%' THEN 'Fixed - Water Purifier'
    WHEN pi.material_name ILIKE '%Washing Machine%' THEN 'Fixed - Washing Machine'
    WHEN pi.material_name ILIKE '%Battery%' AND pi.rate > 500 THEN 'Fixed - Battery Bank'
    WHEN pi.material_name ILIKE '%Voltage Stabilizer%' THEN 'Fixed - Stabilizer'
    WHEN pi.material_name ILIKE '%Floor Mounted Stand%' THEN 'Fixed - AC Stand'
    WHEN pi.material_name ILIKE '%Weighing Machine%' THEN 'Fixed - Weighing Machine'
    WHEN pi.material_name ILIKE '%Office Container%' THEN 'Fixed - Site Office Container'
    WHEN pi.material_name ILIKE '%Industrial DB Panel%' OR pi.material_name ILIKE '%DB Panel Board%' THEN 'Fixed - DB Panel'
    WHEN pi.material_name ILIKE '%Manager Chair%' THEN 'Fixed - Furniture'
    WHEN pi.material_name ILIKE '%Manager Table%' THEN 'Fixed - Furniture'
    WHEN pi.material_name ILIKE '%File Cabinet%' THEN 'Fixed - Furniture'
    WHEN pi.material_name ILIKE '%Mattress%' THEN 'Fixed - Furniture'
    WHEN pi.material_name ILIKE '%Vibrator%' AND pi.material_name ILIKE '%HP%' THEN 'Tool - Electric Vibrator'
    WHEN pi.material_name ILIKE '%Chipping Machine%' THEN 'Tool - Chipping Machine'
    WHEN pi.material_name ILIKE '%Cut off machine%' THEN 'Tool - Cut Off Machine'
    WHEN pi.material_name ILIKE '%Grinding Machine%' AND pi.rate > 2000 THEN 'Tool - Grinding Machine'
    WHEN pi.material_name ILIKE '%Drilling Machine%' AND pi.rate > 2000 THEN 'Tool - Drilling Machine'
    WHEN pi.material_name ILIKE '%Welding Machine%' THEN 'Tool - Welding Machine'
    WHEN pi.material_name ILIKE '%Hammer Drilling%' THEN 'Tool - Hammer Drill'
    WHEN pi.material_name ILIKE '%Angle Grinder%' THEN 'Tool - Angle Grinder'
    WHEN pi.material_name ILIKE '%Ply Cutting Machine%' OR pi.material_name ILIKE '%Circular Saw%' THEN 'Tool - Circular Saw'
    WHEN pi.material_name ILIKE '%Air Blower%' THEN 'Tool - Air Blower'
    WHEN pi.material_name ILIKE '%Curing Pump%' THEN 'Tool - Curing Pump'
    WHEN pi.material_name ILIKE '%Rivet Gun%' THEN 'Tool - Rivet Gun'
    ELSE 'MATERIAL'
  END AS asset_type,
  CASE
    WHEN EXISTS (SELECT 1 FROM assets a WHERE a.company_id = '83b84668-7840-444e-8df9-350202e7bca0'
                   AND a.asset_name ILIKE '%' || LEFT(pi.material_name, 20) || '%') THEN 'In Asset Register'
    WHEN EXISTS (SELECT 1 FROM it_assets ia WHERE ia.company_id = '83b84668-7840-444e-8df9-350202e7bca0'
                   AND ia.model ILIKE '%' || LEFT(pi.material_name, 15) || '%') THEN 'In IT Assets'
    ELSE 'NOT REGISTERED'
  END AS register_status
FROM po_items pi
JOIN purchase_orders po ON po.id = pi.po_id
JOIN projects p ON p.id = po.project_id
LEFT JOIN vendors v ON v.id = po.vendor_id
WHERE p.company_id = '83b84668-7840-444e-8df9-350202e7bca0'
  AND pi.quantity > 0
  AND (
    pi.material_name ILIKE '%Desktop%' OR pi.material_name ILIKE '%Laptop%'
    OR pi.material_name ILIKE '%UPS%'
    OR pi.material_name ILIKE '%ESSL%' OR pi.material_name ILIKE '%Face%Cap%'
    OR pi.material_name ILIKE '%Server Cabinet%' OR pi.material_name ILIKE '%Network Rack%'
    OR pi.material_name ILIKE '%D Link%' OR pi.material_name ILIKE '%Digabit%Switch%'
    OR pi.material_name ILIKE '%Air Condition%'
    OR pi.material_name ILIKE '%Aquaguard%' OR pi.material_name ILIKE '%Water Purifier%'
    OR pi.material_name ILIKE '%Washing Machine%'
    OR (pi.material_name ILIKE '%Battery%' AND pi.rate > 500)
    OR pi.material_name ILIKE '%Voltage Stabilizer%'
    OR pi.material_name ILIKE '%Floor Mounted Stand%'
    OR pi.material_name ILIKE '%Weighing Machine%'
    OR pi.material_name ILIKE '%Office Container%'
    OR pi.material_name ILIKE '%Industrial DB Panel%' OR pi.material_name ILIKE '%DB Panel Board%'
    OR pi.material_name ILIKE '%Manager Chair%' OR pi.material_name ILIKE '%Manager Table%'
    OR pi.material_name ILIKE '%File Cabinet%'
    OR pi.material_name ILIKE '%Mattress%'
    OR (pi.material_name ILIKE '%Vibrator%' AND pi.material_name ILIKE '%HP%')
    OR pi.material_name ILIKE '%Chipping Machine%'
    OR pi.material_name ILIKE '%Cut off machine%'
    OR (pi.material_name ILIKE '%Grinding Machine%' AND pi.rate > 2000)
    OR (pi.material_name ILIKE '%Drilling Machine%' AND pi.rate > 2000)
    OR pi.material_name ILIKE '%Welding Machine%'
    OR pi.material_name ILIKE '%Hammer Drilling%'
    OR pi.material_name ILIKE '%Angle Grinder%'
    OR pi.material_name ILIKE '%Ply Cutting Machine%' OR pi.material_name ILIKE '%Circular Saw%'
    OR pi.material_name ILIKE '%Air Blower%'
    OR pi.material_name ILIKE '%Curing Pump%'
    OR pi.material_name ILIKE '%Rivet Gun%'
  )
ORDER BY asset_type, po.po_date;
