CREATE TABLE IF NOT EXISTS subcontractor_bill_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID NOT NULL REFERENCES subcontractor_bills(id) ON DELETE CASCADE,
  wo_id UUID REFERENCES work_orders(id),
  item_description TEXT NOT NULL,
  unit VARCHAR(30),
  wo_quantity NUMERIC(14,3) DEFAULT 0,
  prev_quantity NUMERIC(14,3) DEFAULT 0,
  curr_quantity NUMERIC(14,3) DEFAULT 0,
  balance_quantity NUMERIC(14,3) DEFAULT 0,
  rate NUMERIC(14,2) DEFAULT 0,
  amount NUMERIC(18,2) DEFAULT 0,
  remarks TEXT,
  sequence_no INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS subcontractor_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) UNIQUE,
  default_gst_pct NUMERIC(5,2) DEFAULT 18,
  default_tds_pct NUMERIC(5,2) DEFAULT 1,
  default_retention_pct NUMERIC(5,2) DEFAULT 5,
  default_security_pct NUMERIC(5,2) DEFAULT 0,
  require_approved_wo BOOLEAN DEFAULT true,
  block_overbilling BOOLEAN DEFAULT true,
  approval_flow JSONB DEFAULT '["site_engineer","project_manager","qs_billing","accounts_management"]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE subcontractor_bills
  ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES vendors(id),
  ADD COLUMN IF NOT EXISTS bill_description TEXT,
  ADD COLUMN IF NOT EXISTS gst_pct NUMERIC(5,2) DEFAULT 18,
  ADD COLUMN IF NOT EXISTS gst_amount NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS penalty_amount NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS material_recovery NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS labour_welfare NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS submitted_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS rejection_remarks TEXT,
  ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]';

SELECT 'Migration 023b done' AS result;
