-- Check registered count vs PO ordered quantity for each tool type
SELECT
  tool_type,
  total_registered,
  total_ordered,
  CASE WHEN total_registered > total_ordered THEN 'OVER-REGISTERED BY ' || (total_registered - total_ordered)
       WHEN total_registered = total_ordered THEN 'CORRECT'
       ELSE 'UNDER-REGISTERED BY ' || (total_ordered - total_registered)
  END AS status,
  codes,
  po_details
FROM (
  SELECT
    r.tool_type,
    r.total_registered,
    r.codes,
    COALESCE(o.total_ordered, 0) AS total_ordered,
    COALESCE(o.po_details, '?') AS po_details
  FROM (
    SELECT
      CASE
        WHEN asset_name ILIKE '%Drilling Machine%' THEN 'Drilling Machine'
        WHEN asset_name ILIKE '%Grinding Machine%' THEN 'Grinding Machine'
        WHEN asset_name ILIKE '%Vibrator%' THEN 'Electric Vibrator 2HP'
        WHEN asset_name ILIKE '%Chipping%' THEN 'Chipping Machine'
        WHEN asset_name ILIKE '%Circular Saw%' THEN 'Circular Saw'
        WHEN asset_name ILIKE '%Cut Off%' THEN 'Cut Off Machine'
        WHEN asset_name ILIKE '%Hammer Drill%' THEN 'Hammer Drill'
      END AS tool_type,
      COUNT(*) AS total_registered,
      STRING_AGG(asset_code, ', ' ORDER BY asset_code) AS codes
    FROM assets
    WHERE company_id = '83b84668-7840-444e-8df9-350202e7bca0'
      AND (asset_name ILIKE '%Drilling Machine%'
        OR asset_name ILIKE '%Grinding Machine%'
        OR (asset_name ILIKE '%Vibrator%' AND asset_name ILIKE '%Crompton%')
        OR asset_name ILIKE '%Chipping Machine%'
        OR asset_name ILIKE '%Circular Saw%'
        OR asset_name ILIKE '%Cut Off%'
        OR asset_name ILIKE '%Hammer Drill%')
    GROUP BY 1
  ) r
  LEFT JOIN (
    SELECT
      CASE
        WHEN pi.material_name ILIKE '%Drilling Machine%' THEN 'Drilling Machine'
        WHEN pi.material_name ILIKE '%Grinding Machine%' AND pi.rate > 2000 THEN 'Grinding Machine'
        WHEN pi.material_name ILIKE '%Vibrator%' AND pi.material_name ILIKE '%HP%' THEN 'Electric Vibrator 2HP'
        WHEN pi.material_name ILIKE '%Chipping Machine%' THEN 'Chipping Machine'
        WHEN pi.material_name ILIKE '%Circular Saw%' THEN 'Circular Saw'
        WHEN pi.material_name ILIKE '%Cut Off%' THEN 'Cut Off Machine'
        WHEN pi.material_name ILIKE '%Hammer Drill%' THEN 'Hammer Drill'
      END AS tool_type,
      STRING_AGG(po.po_number || ' x' || pi.quantity::int::text, ', ') AS po_details,
      SUM(pi.quantity) AS total_ordered
    FROM po_items pi
    JOIN purchase_orders po ON po.id = pi.po_id
    JOIN projects p ON p.id = po.project_id
    WHERE p.company_id = '83b84668-7840-444e-8df9-350202e7bca0'
      AND (pi.material_name ILIKE '%Drilling Machine%'
        OR (pi.material_name ILIKE '%Grinding Machine%' AND pi.rate > 2000)
        OR (pi.material_name ILIKE '%Vibrator%' AND pi.material_name ILIKE '%HP%')
        OR pi.material_name ILIKE '%Chipping Machine%'
        OR pi.material_name ILIKE '%Circular Saw%'
        OR pi.material_name ILIKE '%Cut Off%'
        OR pi.material_name ILIKE '%Hammer Drill%')
    GROUP BY 1
  ) o ON o.tool_type = r.tool_type
) final
ORDER BY tool_type;
