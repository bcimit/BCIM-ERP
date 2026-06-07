-- Backfill invoice B088 line items into store ledger
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT b.id AS bill_id, b.sl_number, b.inv_number, b.vendor_name, b.project_id,
           li.item_name, li.unit, li.quantity, li.rate, li.category
    FROM tqs_bill_line_items li
    JOIN tqs_bills b ON b.id = li.bill_id
    WHERE b.inv_number = 'B088'
      AND li.quantity > 0
      AND LOWER(li.item_name) NOT LIKE '%discount%'
  LOOP
    -- Upsert inventory
    INSERT INTO inventory (project_id, material_name, unit, category, unit_rate, closing_stock, site_location, last_updated)
    VALUES (r.project_id, r.item_name, r.unit, r.category, r.rate, r.quantity, 'main', NOW())
    ON CONFLICT (project_id, material_name, site_location)
    DO UPDATE SET
      closing_stock = inventory.closing_stock + r.quantity,
      unit_rate     = CASE WHEN r.rate > 0 THEN r.rate ELSE inventory.unit_rate END,
      category      = COALESCE(r.category, inventory.category),
      last_updated  = NOW();

    -- Log stock transaction
    INSERT INTO stock_transactions
      (project_id, inventory_id, transaction_type, quantity, reference_id, reference_number, remarks, transacted_at)
    SELECT r.project_id, i.id, 'bill_receipt', r.quantity,
           r.bill_id, r.sl_number,
           'Backfill - Invoice ' || r.inv_number || ' - ' || r.vendor_name,
           '2026-05-22'::timestamptz
    FROM inventory i
    WHERE i.project_id = r.project_id
      AND i.material_name = r.item_name
      AND i.site_location = 'main'
    LIMIT 1;
  END LOOP;
END;
$$;
SELECT 'Backfill complete' AS result;
