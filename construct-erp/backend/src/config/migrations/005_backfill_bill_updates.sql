-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 005: Backfill tqs_bill_updates for imported bills
--
-- Imported bills (via bulk-import) were only inserted into tqs_bills.
-- The companion tqs_bill_updates row (which holds certified_net, pc_number,
-- payment info, etc.) was never created for them.
--
-- This script:
--   Step 1 — Creates missing bill_updates rows using total_amount as the
--             certified amount for bills at qs/accounts/paid/procurement stage.
--   Step 2 — Auto-generates sequential PC numbers for all accounts-stage bills
--             that still have no pc_number.
--
-- Run once:
--   psql -U postgres -d construct_erp -f 005_backfill_bill_updates.sql
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ── Step 1: Create bill_updates for bills that have none ─────────────────────
INSERT INTO tqs_bill_updates (bill_id, balance_to_pay, certified_net)
SELECT
  b.id,
  b.total_amount,
  CASE
    WHEN b.workflow_status IN ('qs', 'accounts', 'paid', 'procurement')
    THEN b.total_amount
    ELSE 0
  END
FROM tqs_bills b
LEFT JOIN tqs_bill_updates u ON u.bill_id = b.id
WHERE u.bill_id IS NULL
  AND b.is_deleted = FALSE;

-- Confirm how many were created
DO $$
DECLARE cnt INTEGER;
BEGIN
  SELECT COUNT(*) INTO cnt
  FROM tqs_bills b
  LEFT JOIN tqs_bill_updates u ON u.bill_id = b.id
  WHERE u.bill_id IS NULL AND b.is_deleted = FALSE;
  RAISE NOTICE 'Step 1 complete — % bills still missing bill_updates (should be 0)', cnt;
END $$;

-- ── Step 2: Auto-assign PC numbers to accounts-stage bills without one ────────
DO $$
DECLARE
  yr         TEXT    := EXTRACT(YEAR FROM NOW())::TEXT;
  base_count INTEGER := 0;
  counter    INTEGER := 0;
  r          RECORD;
BEGIN
  -- Get current count of existing PCs this year (so we don't collide)
  SELECT COUNT(*) INTO base_count
  FROM tqs_bill_updates
  WHERE pc_number LIKE 'PC-' || yr || '-%';

  RAISE NOTICE 'Step 2 start — % PCs already exist for %, assigning from #%',
    base_count, yr, base_count + 1;

  -- Loop over accounts-stage bills without a PC, ordered by SL number for consistency
  FOR r IN
    SELECT u.id, b.sl_number
    FROM tqs_bill_updates u
    JOIN tqs_bills b ON b.id = u.bill_id
    WHERE b.workflow_status = 'accounts'
      AND u.pc_number IS NULL
    ORDER BY b.sl_number
  LOOP
    counter := counter + 1;
    UPDATE tqs_bill_updates
    SET
      pc_number              = 'PC-' || yr || '-' || LPAD((base_count + counter)::TEXT, 4, '0'),
      pc_generated_at        = NOW(),
      handed_over_accounts_date = COALESCE(handed_over_accounts_date, NOW()::DATE)
    WHERE id = r.id;
  END LOOP;

  RAISE NOTICE 'Step 2 complete — % PC numbers assigned', counter;
END $$;

COMMIT;
