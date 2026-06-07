-- Backfill ALL bills that have line items but no stock_transactions
-- Runs only for bills where auto-update was missed (before 30 May 2026)
DO $$
DECLARE
  r RECORD;
  inv_id UUID;
  inserted INT := 0;
  skipped  INT := 0;
BEGIN
  FOR r IN
    SELECT DISTINCT
      b.id AS bill_id, b.sl_number, b.inv_number, b.vendor_name,
      b.project_id, b.created_at,
      li.item_name, li.unit, li.quantity, li.rate, li.category
    FROM tqs_bills b
    JOIN tqs_bill_line_items li ON li.bill_id = b.id
    WHERE b.is_deleted = FALSE
      AND li.quantity > 0
      AND LOWER(li.item_name) NOT LIKE '%discount%'
      AND li.item_name IS NOT NULL
      AND li.item_name <> ''
      AND NOT EXISTS (
        SELECT 1 FROM stock_transactions t
        WHERE t.reference_id = b.id AND t.transaction_type = 'bill_receipt'
      )
    ORDER BY b.created_at, b.sl_number
  LOOP
    -- Skip if no project
    IF r.project_id IS NULL THEN
      skipped := skipped + 1;
      CONTINUE;
    END IF;

    -- Upsert inventory (truncate material_name to 200 chars if needed)
    INSERT INTO inventory (project_id, material_name, unit, category, unit_rate,
                           closing_stock, site_location, last_updated)
    VALUES (r.project_id, LEFT(r.item_name, 200), COALESCE(NULLIF(r.unit,''),'Nos'),
            r.category, COALESCE(r.rate, 0), r.quantity, 'main', NOW())
    ON CONFLICT (project_id, material_name, site_location)
    DO UPDATE SET
      closing_stock = inventory.closing_stock + r.quantity,
      unit_rate     = CASE WHEN COALESCE(r.rate,0) > 0 THEN r.rate ELSE inventory.unit_rate END,
      unit          = CASE WHEN NULLIF(r.unit,'') IS NOT NULL THEN r.unit ELSE inventory.unit END,
      category      = COALESCE(NULLIF(r.category,''), inventory.category),
      last_updated  = NOW()
    RETURNING id INTO inv_id;

    IF inv_id IS NULL THEN
      SELECT id INTO inv_id FROM inventory
      WHERE project_id = r.project_id
        AND material_name = LEFT(r.item_name, 200)
        AND site_location = 'main'
      LIMIT 1;
    END IF;

    IF inv_id IS NOT NULL THEN
      INSERT INTO stock_transactions
        (project_id, inventory_id, transaction_type, quantity,
         reference_id, reference_number, remarks, transacted_at)
      VALUES (
        r.project_id, inv_id, 'bill_receipt', r.quantity,
        r.bill_id, r.sl_number,
        'Backfill - Invoice ' || COALESCE(r.inv_number,'') || ' - ' || COALESCE(r.vendor_name,''),
        r.created_at
      );
      inserted := inserted + 1;
    ELSE
      skipped := skipped + 1;
    END IF;
  END LOOP;

  RAISE NOTICE 'Backfill complete: % stock transactions inserted, % skipped', inserted, skipped;
END;
$$;

-- Final summary
SELECT
  b.sl_number,
  b.inv_number,
  b.vendor_name,
  b.created_at::date AS bill_date,
  COUNT(DISTINCT t.id) AS stock_txns_added
FROM tqs_bills b
JOIN stock_transactions t ON t.reference_id = b.id AND t.transaction_type = 'bill_receipt'
GROUP BY b.id, b.sl_number, b.inv_number, b.vendor_name, b.created_at
ORDER BY b.created_at DESC;
