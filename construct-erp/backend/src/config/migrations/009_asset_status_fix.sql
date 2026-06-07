-- Migration 009: Fix assets status constraint to include all new statuses
-- and add 'assigned' status used by allocation flow

ALTER TABLE assets DROP CONSTRAINT IF EXISTS assets_status_check;

ALTER TABLE assets ADD CONSTRAINT assets_status_check
  CHECK (status IN (
    'available',
    'assigned',
    'in_use',
    'maintenance',
    'breakdown',
    'disposed',
    'lost',
    'stolen',
    'retired',
    'transferred'
  ));

SELECT 'Migration 009 applied' AS result;
