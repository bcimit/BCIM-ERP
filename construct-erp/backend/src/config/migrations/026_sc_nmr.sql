-- ================================================================
-- Migration 026: NMR (Nominal Muster Roll) for Labour Contractors
-- Wires daily attendance → muster roll → labour bill
-- ================================================================

CREATE TABLE IF NOT EXISTS sc_nmr (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id      UUID NOT NULL REFERENCES projects(id),
  wo_id           UUID NOT NULL REFERENCES sc_work_orders(id),
  sc_id           UUID NOT NULL REFERENCES sc_subcontractors(id),

  nmr_number      VARCHAR(60) NOT NULL,          -- NMR-LH10-001
  period_from     DATE NOT NULL,
  period_to       DATE NOT NULL,

  -- Aggregated totals (computed at creation from attendance)
  total_workers   INTEGER DEFAULT 0,
  total_mandays   NUMERIC(10,2) DEFAULT 0,       -- sum of effective days (0.5 per half-day)
  skilled_wages   NUMERIC(18,2) DEFAULT 0,
  unskilled_wages NUMERIC(18,2) DEFAULT 0,
  total_wages     NUMERIC(18,2) DEFAULT 0,       -- = gross_amount when bill is raised

  remarks         TEXT,

  -- Approval workflow
  status          VARCHAR(20) DEFAULT 'draft'
                    CHECK (status IN ('draft','submitted','checked','approved','billed')),
  checked_by      UUID REFERENCES users(id),
  checked_at      TIMESTAMPTZ,
  check_remarks   TEXT,
  approved_by     UUID REFERENCES users(id),
  approved_at     TIMESTAMPTZ,
  approve_remarks TEXT,

  -- Linked bill (set after raise-bill)
  bill_id         UUID REFERENCES sc_bills(id),

  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (company_id, nmr_number)
);

CREATE INDEX IF NOT EXISTS idx_sc_nmr_wo   ON sc_nmr(wo_id);
CREATE INDEX IF NOT EXISTS idx_sc_nmr_sc   ON sc_nmr(sc_id);
CREATE INDEX IF NOT EXISTS idx_sc_nmr_proj ON sc_nmr(project_id);
CREATE INDEX IF NOT EXISTS idx_sc_nmr_stat ON sc_nmr(status);
