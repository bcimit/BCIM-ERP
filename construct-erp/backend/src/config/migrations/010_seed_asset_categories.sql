-- Migration 010: Seed default asset categories for BCIM
-- Only inserts if no categories exist for that company

DO $$
DECLARE
  cid UUID;
  cat_equipment UUID;
  cat_tools     UUID;
  cat_it        UUID;
  cat_furniture UUID;
  cat_vehicle   UUID;
BEGIN
  -- Get company ID (first active company)
  SELECT id INTO cid FROM companies LIMIT 1;
  IF cid IS NULL THEN RETURN; END IF;

  -- Skip if already seeded
  IF (SELECT COUNT(*) FROM asset_categories WHERE company_id = cid) > 0 THEN
    RAISE NOTICE 'Categories already seeded, skipping.';
    RETURN;
  END IF;

  -- Top-level categories
  INSERT INTO asset_categories (company_id, name, depreciation_method, useful_life_years, maintenance_interval_days, description)
  VALUES (cid, 'Heavy Equipment', 'written_down_value', 10, 90, 'Cranes, excavators, concrete mixers')
  RETURNING id INTO cat_equipment;

  INSERT INTO asset_categories (company_id, name, depreciation_method, useful_life_years, maintenance_interval_days, description)
  VALUES (cid, 'Tools & Machinery', 'straight_line', 5, 180, 'Power tools, hand tools, machinery')
  RETURNING id INTO cat_tools;

  INSERT INTO asset_categories (company_id, name, depreciation_method, useful_life_years, maintenance_interval_days, description)
  VALUES (cid, 'IT Equipment', 'straight_line', 3, 365, 'Computers, servers, network devices')
  RETURNING id INTO cat_it;

  INSERT INTO asset_categories (company_id, name, depreciation_method, useful_life_years, maintenance_interval_days, description)
  VALUES (cid, 'Furniture & Fixtures', 'straight_line', 7, 730, 'Office furniture, cabinets, fittings')
  RETURNING id INTO cat_furniture;

  INSERT INTO asset_categories (company_id, name, depreciation_method, useful_life_years, maintenance_interval_days, description)
  VALUES (cid, 'Vehicles', 'written_down_value', 8, 60, 'Cars, trucks, lorries, motorbikes')
  RETURNING id INTO cat_vehicle;

  -- Sub-categories for Tools
  INSERT INTO asset_categories (company_id, parent_id, name, depreciation_method, useful_life_years, maintenance_interval_days)
  VALUES (cid, cat_tools, 'Power Tools', 'straight_line', 5, 180);

  INSERT INTO asset_categories (company_id, parent_id, name, depreciation_method, useful_life_years, maintenance_interval_days)
  VALUES (cid, cat_tools, 'Pumps & Compressors', 'straight_line', 7, 90);

  INSERT INTO asset_categories (company_id, parent_id, name, depreciation_method, useful_life_years, maintenance_interval_days)
  VALUES (cid, cat_tools, 'Survey Instruments', 'straight_line', 5, 365);

  -- Sub-categories for IT
  INSERT INTO asset_categories (company_id, parent_id, name, depreciation_method, useful_life_years, maintenance_interval_days)
  VALUES (cid, cat_it, 'Computers & Laptops', 'straight_line', 3, 365);

  INSERT INTO asset_categories (company_id, parent_id, name, depreciation_method, useful_life_years, maintenance_interval_days)
  VALUES (cid, cat_it, 'Network Equipment', 'straight_line', 5, 365);

  INSERT INTO asset_categories (company_id, parent_id, name, depreciation_method, useful_life_years, maintenance_interval_days)
  VALUES (cid, cat_it, 'Peripherals', 'straight_line', 3, 730);

  RAISE NOTICE 'Default asset categories seeded for company %', cid;
END $$;

SELECT 'Migration 010 applied' AS result;
