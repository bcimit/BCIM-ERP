// backend/src/config/subcontractor_upgrade_v2.js
// Adds: trade category + contract dates on vendors, document management,
// photo+geo on measurements, bill type variants.
// Safe to run multiple times.
const { Client } = require('pg');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const client = new Client({
  user:     process.env.DB_USER,
  host:     process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port:     process.env.DB_PORT,
});

const schema = `
-- ─────────────────────────────────────────────────────────────────────────────
-- 1. VENDORS — subcontractor extension fields
-- ─────────────────────────────────────────────────────────────────────────────

-- Drop the old strict CHECK constraint on vendor_type so mixed-case
-- values like 'Sub-contractor' / 'Labour Contractor' (used by the UI) work.
ALTER TABLE vendors DROP CONSTRAINT IF EXISTS vendors_vendor_type_check;

-- Normalise existing values to a canonical mixed-case form
UPDATE vendors SET vendor_type = 'Sub-contractor'    WHERE LOWER(vendor_type) IN ('subcontractor', 'sub-contractor', 'sub contractor');
UPDATE vendors SET vendor_type = 'Labour Contractor' WHERE LOWER(vendor_type) IN ('labour_contractor', 'labour contractor', 'labor contractor', 'labor_contractor');
UPDATE vendors SET vendor_type = 'Material Supplier' WHERE LOWER(vendor_type) IN ('material_supplier', 'material supplier');
UPDATE vendors SET vendor_type = 'Equipment Supplier' WHERE LOWER(vendor_type) IN ('equipment_supplier', 'equipment supplier');
UPDATE vendors SET vendor_type = 'Service Provider'  WHERE LOWER(vendor_type) IN ('service_provider', 'service provider');

-- Subcontractor-specific extension fields
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS trade_category VARCHAR(50);
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS contract_start_date DATE;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS contract_end_date DATE;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS subcontractor_status VARCHAR(20) DEFAULT 'active'
    CHECK (subcontractor_status IN ('active', 'inactive', 'blacklisted'));

CREATE INDEX IF NOT EXISTS idx_vendors_vendor_type_lower ON vendors (LOWER(vendor_type));
CREATE INDEX IF NOT EXISTS idx_vendors_subcontractor_status ON vendors (subcontractor_status);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. SUBCONTRACTOR DOCUMENTS — with expiry tracking
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subcontractor_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
    doc_type VARCHAR(50) NOT NULL,           -- agreement, insurance, gst_cert, pf_cert, safety_cert, work_completion, other
    title VARCHAR(200),
    file_url TEXT NOT NULL,
    file_name VARCHAR(200),
    file_size INT,
    issued_date DATE,
    expiry_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    uploaded_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sub_docs_vendor   ON subcontractor_documents (vendor_id);
CREATE INDEX IF NOT EXISTS idx_sub_docs_expiry   ON subcontractor_documents (expiry_date) WHERE expiry_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sub_docs_doc_type ON subcontractor_documents (doc_type);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. MEASUREMENTS — photo + geo support
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE subcontractor_measurements ADD COLUMN IF NOT EXISTS photo_urls JSONB DEFAULT '[]'::jsonb;
ALTER TABLE subcontractor_measurements ADD COLUMN IF NOT EXISTS geo_lat NUMERIC(10, 7);
ALTER TABLE subcontractor_measurements ADD COLUMN IF NOT EXISTS geo_lng NUMERIC(10, 7);
ALTER TABLE subcontractor_measurements ADD COLUMN IF NOT EXISTS geo_address TEXT;
ALTER TABLE subcontractor_measurements ADD COLUMN IF NOT EXISTS recorded_by UUID REFERENCES users(id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. BILLS — bill type variants
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE subcontractor_bills ADD COLUMN IF NOT EXISTS bill_type VARCHAR(20) DEFAULT 'ra'
    CHECK (bill_type IN ('ra', 'final', 'advance', 'extra_item'));

CREATE INDEX IF NOT EXISTS idx_sub_bills_type ON subcontractor_bills (bill_type);
`;

async function upgrade() {
  await client.connect();
  try {
    console.log('Deploying Subcontractor Upgrade v2 schema...');
    await client.query(schema);
    console.log('Success: Subcontractor v2 schema deployed.');
    console.log('  - vendors: trade_category, contract dates, subcontractor_status');
    console.log('  - subcontractor_documents (new)');
    console.log('  - subcontractor_measurements: photo_urls, geo_lat/lng, geo_address');
    console.log('  - subcontractor_bills: bill_type');
  } catch (err) {
    console.error('Error deploying schema:', err);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

upgrade();
