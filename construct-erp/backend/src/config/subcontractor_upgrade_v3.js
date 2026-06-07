// backend/src/config/subcontractor_upgrade_v3.js
// Adds: bill approval workflow audit trail, in-app notifications,
// subcontractor portal role flag. Safe to run multiple times.
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
-- 1. BILL APPROVAL AUDIT TRAIL
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subcontractor_bill_approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bill_id UUID REFERENCES subcontractor_bills(id) ON DELETE CASCADE,
    action VARCHAR(20) NOT NULL,         -- submitted, approved, rejected, paid, returned
    from_status VARCHAR(20),
    to_status VARCHAR(20),
    stage VARCHAR(40),                   -- site_engineer, project_manager, accounts, finance_head
    comments TEXT,
    actor_id UUID REFERENCES users(id),
    actor_name VARCHAR(200),
    actor_role VARCHAR(40),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bill_approvals_bill ON subcontractor_bill_approvals (bill_id, created_at DESC);

-- Current stage tracking on the bill itself (so we know whose turn it is)
ALTER TABLE subcontractor_bills ADD COLUMN IF NOT EXISTS current_stage VARCHAR(40) DEFAULT 'site_engineer';
ALTER TABLE subcontractor_bills ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;
ALTER TABLE subcontractor_bills ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE subcontractor_bills ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;
ALTER TABLE subcontractor_bills ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. NOTIFICATIONS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,    -- target user (null = broadcast to company)
    target_role VARCHAR(40),                                -- if user_id is null, target this role
    type VARCHAR(40) NOT NULL,                              -- bill_pending_approval, bill_approved, bill_rejected, doc_expiring, contract_expiring, payment_overdue
    title VARCHAR(200) NOT NULL,
    message TEXT,
    link TEXT,                                              -- frontend route, e.g. /subcontractor/hub?tab=bills&id=...
    severity VARCHAR(20) DEFAULT 'info',                    -- info, warning, critical
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    related_type VARCHAR(40),                               -- bill, document, contract, vendor
    related_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_user_unread ON notifications (user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notif_role        ON notifications (target_role, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notif_company     ON notifications (company_id, created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. SUBCONTRACTOR PORTAL — link users to vendor accounts
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_users_vendor ON users (vendor_id) WHERE vendor_id IS NOT NULL;
`;

async function upgrade() {
  await client.connect();
  try {
    console.log('Deploying Subcontractor Upgrade v3 schema...');
    await client.query(schema);
    console.log('Success: v3 schema deployed.');
    console.log('  - subcontractor_bill_approvals (new audit trail)');
    console.log('  - subcontractor_bills: current_stage, submitted/approved/rejected timestamps');
    console.log('  - notifications (new in-app notification table)');
    console.log('  - users: vendor_id (links subcontractor users to their vendor)');
  } catch (err) {
    console.error('Error deploying schema:', err);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

upgrade();
