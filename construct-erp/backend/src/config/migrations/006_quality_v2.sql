-- =========================================================
-- QA/QC MODULE v2 — Migration 006
-- New tables: ITP, Method Statements, MIR, MTC, Pour Cards, Audits
-- Extends: quality_rfis, quality_lab_tests, quality_ncrs, snag_items, quality_checklists
-- =========================================================

-- ─── SUB-MODULE 1: QUALITY PLANNING ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS quality_itps (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id      UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    company_id      UUID        NOT NULL REFERENCES companies(id),
    itp_number      VARCHAR(60) UNIQUE NOT NULL,
    title           VARCHAR(255) NOT NULL,
    discipline      VARCHAR(100),
    work_category   VARCHAR(100),
    revision        VARCHAR(10)  DEFAULT '0',
    status          VARCHAR(30)  DEFAULT 'draft'
                    CHECK (status IN ('draft','issued','superseded')),
    approved_by     UUID        REFERENCES users(id),
    approved_at     TIMESTAMPTZ,
    description     TEXT,
    applicable_codes TEXT,
    attachments     JSONB        DEFAULT '[]'::jsonb,
    created_by      UUID        REFERENCES users(id),
    created_at      TIMESTAMPTZ  DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quality_itp_activities (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    itp_id          UUID        NOT NULL REFERENCES quality_itps(id) ON DELETE CASCADE,
    sequence_no     INTEGER     NOT NULL DEFAULT 1,
    activity_name   VARCHAR(255) NOT NULL,
    point_type      VARCHAR(5)  DEFAULT 'R'
                    CHECK (point_type IN ('R','H','W','M')),
    responsibility  VARCHAR(100),
    applicable_spec TEXT,
    acceptance_criteria TEXT,
    checklist_id    UUID        REFERENCES quality_checklists(id),
    is_active       BOOLEAN     DEFAULT true,
    created_at      TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quality_method_statements (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id      UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    ms_number       VARCHAR(60) UNIQUE NOT NULL,
    title           VARCHAR(255) NOT NULL,
    discipline      VARCHAR(100),
    work_type       VARCHAR(100),
    revision        VARCHAR(10)  DEFAULT '0',
    status          VARCHAR(30)  DEFAULT 'draft'
                    CHECK (status IN ('draft','submitted','approved','rejected','superseded')),
    submitted_by    UUID        REFERENCES users(id),
    approved_by     UUID        REFERENCES users(id),
    approved_at     TIMESTAMPTZ,
    rejection_remarks TEXT,
    itp_id          UUID        REFERENCES quality_itps(id),
    attachments     JSONB        DEFAULT '[]'::jsonb,
    created_by      UUID        REFERENCES users(id),
    created_at      TIMESTAMPTZ  DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  DEFAULT NOW()
);

-- ─── SUB-MODULE 2: RFI ENHANCEMENT ───────────────────────────────────────────
ALTER TABLE quality_rfis
    ADD COLUMN IF NOT EXISTS itp_id                UUID REFERENCES quality_itps(id),
    ADD COLUMN IF NOT EXISTS itp_activity_id       UUID REFERENCES quality_itp_activities(id),
    ADD COLUMN IF NOT EXISTS wir_number            VARCHAR(60),
    ADD COLUMN IF NOT EXISTS hold_point_type       VARCHAR(5),
    ADD COLUMN IF NOT EXISTS stage                 VARCHAR(100),
    ADD COLUMN IF NOT EXISTS rejection_reason      TEXT,
    ADD COLUMN IF NOT EXISTS re_inspection_required BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS re_inspection_at      TIMESTAMPTZ;

-- ─── SUB-MODULE 3: MATERIAL INSPECTION REQUEST (MIR) ─────────────────────────
CREATE TABLE IF NOT EXISTS quality_mir (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id      UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    mir_number      VARCHAR(60) UNIQUE NOT NULL,
    material_name   VARCHAR(255) NOT NULL,
    material_code   VARCHAR(100),
    vendor_id       UUID        REFERENCES vendors(id),
    vendor_name     VARCHAR(255),
    delivery_date   DATE,
    delivery_location VARCHAR(200),
    quantity        DECIMAL(12,3),
    unit            VARCHAR(30),
    purchase_order_ref VARCHAR(100),
    grn_ref         VARCHAR(100),
    status          VARCHAR(40)  DEFAULT 'pending'
                    CHECK (status IN ('pending','inspecting','approved','rejected','conditionally_approved')),
    inspection_date DATE,
    inspected_by    UUID        REFERENCES users(id),
    approval_date   DATE,
    approved_by     UUID        REFERENCES users(id),
    rejection_reason TEXT,
    conditions_of_approval TEXT,
    checklist_id    UUID        REFERENCES quality_checklists(id),
    checklist_responses JSONB   DEFAULT '{}'::jsonb,
    mtc_required    BOOLEAN     DEFAULT false,
    traceability_ref VARCHAR(200),
    attachments     JSONB        DEFAULT '[]'::jsonb,
    remarks         TEXT,
    raised_by       UUID        REFERENCES users(id),
    created_at      TIMESTAMPTZ  DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quality_mir_lab_tests (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    mir_id      UUID        NOT NULL REFERENCES quality_mir(id) ON DELETE CASCADE,
    lab_test_id UUID        NOT NULL REFERENCES quality_lab_tests(id) ON DELETE CASCADE,
    linked_at   TIMESTAMPTZ  DEFAULT NOW(),
    UNIQUE (mir_id, lab_test_id)
);

-- ─── SUB-MODULE 4: MATERIAL TEST CERTIFICATES (MTC) ─────────────────────────
CREATE TABLE IF NOT EXISTS quality_mtc (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id      UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    mtc_number      VARCHAR(100) NOT NULL,
    internal_ref    VARCHAR(60)  UNIQUE NOT NULL,
    material_name   VARCHAR(255) NOT NULL,
    material_grade  VARCHAR(100),
    manufacturer    VARCHAR(255),
    heat_number     VARCHAR(100),
    batch_number    VARCHAR(100),
    quantity        DECIMAL(12,3),
    unit            VARCHAR(30),
    test_lab        VARCHAR(255),
    nabl_accredited BOOLEAN      DEFAULT false,
    iso_certified   BOOLEAN      DEFAULT false,
    accreditation_no VARCHAR(100),
    cert_date       DATE,
    expiry_date     DATE,
    applicable_spec VARCHAR(200),
    test_parameters JSONB        DEFAULT '[]'::jsonb,
    auto_result     VARCHAR(10)  DEFAULT 'pending'
                    CHECK (auto_result IN ('pending','pass','fail')),
    status          VARCHAR(30)  DEFAULT 'pending_review'
                    CHECK (status IN ('pending_review','accepted','rejected','conditional')),
    reviewed_by     UUID        REFERENCES users(id),
    reviewed_at     TIMESTAMPTZ,
    review_remarks  TEXT,
    mir_id          UUID        REFERENCES quality_mir(id),
    vendor_id       UUID        REFERENCES vendors(id),
    pdf_path        TEXT,
    attachments     JSONB        DEFAULT '[]'::jsonb,
    created_by      UUID        REFERENCES users(id),
    created_at      TIMESTAMPTZ  DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quality_mtc_lab_tests (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    mtc_id      UUID        NOT NULL REFERENCES quality_mtc(id) ON DELETE CASCADE,
    lab_test_id UUID        NOT NULL REFERENCES quality_lab_tests(id) ON DELETE CASCADE,
    linked_at   TIMESTAMPTZ  DEFAULT NOW(),
    UNIQUE (mtc_id, lab_test_id)
);

-- ─── SUB-MODULE 5: LAB TEST ENHANCEMENTS ─────────────────────────────────────
ALTER TABLE quality_lab_tests
    ADD COLUMN IF NOT EXISTS test_category       VARCHAR(50),
    ADD COLUMN IF NOT EXISTS target_strength     DECIMAL(10,2),
    ADD COLUMN IF NOT EXISTS test_age_days       INTEGER,
    ADD COLUMN IF NOT EXISTS result_7day         DECIMAL(10,2),
    ADD COLUMN IF NOT EXISTS result_28day        DECIMAL(10,2),
    ADD COLUMN IF NOT EXISTS acceptance_criteria TEXT,
    ADD COLUMN IF NOT EXISTS is_failed           BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS auto_ncr_created    BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS ncr_id              UUID REFERENCES quality_ncrs(id),
    ADD COLUMN IF NOT EXISTS mtc_id              UUID REFERENCES quality_mtc(id);

-- ─── SUB-MODULE 6: POUR CARD MANAGEMENT ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS quality_pour_cards (
    id                      UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id              UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    pour_card_number        VARCHAR(60)  UNIQUE NOT NULL,
    pour_description        VARCHAR(255) NOT NULL,
    pour_type               VARCHAR(50)  DEFAULT 'slab'
                            CHECK (pour_type IN ('slab','column','beam','footing','wall','pile_cap','raft','staircase','other')),
    concrete_grade          VARCHAR(20),
    location                VARCHAR(200),
    drawing_ref             VARCHAR(100),
    drawing_id              UUID        REFERENCES quality_drawings(id),
    planned_pour_date       DATE,
    actual_pour_start       TIMESTAMPTZ,
    actual_pour_end         TIMESTAMPTZ,
    volume_planned          DECIMAL(10,3),
    volume_actual           DECIMAL(10,3),
    pre_pour_checklist_id   UUID        REFERENCES quality_checklists(id),
    pre_pour_responses      JSONB        DEFAULT '{}'::jsonb,
    pre_pour_approved_by    UUID        REFERENCES users(id),
    pre_pour_approved_at    TIMESTAMPTZ,
    pre_pour_status         VARCHAR(20)  DEFAULT 'pending'
                            CHECK (pre_pour_status IN ('pending','approved','rejected')),
    post_pour_checklist_id  UUID        REFERENCES quality_checklists(id),
    post_pour_responses     JSONB        DEFAULT '{}'::jsonb,
    post_pour_signed_by     UUID        REFERENCES users(id),
    post_pour_signed_at     TIMESTAMPTZ,
    post_pour_status        VARCHAR(20)  DEFAULT 'pending'
                            CHECK (post_pour_status IN ('pending','completed')),
    rfi_id                  UUID        REFERENCES quality_rfis(id),
    status                  VARCHAR(30)  DEFAULT 'pre_pour'
                            CHECK (status IN ('pre_pour','poured','curing','certs_pending','closed','rejected')),
    cube_sets_required      INTEGER      DEFAULT 3,
    cube_sets_taken         INTEGER      DEFAULT 0,
    all_certs_verified      BOOLEAN      DEFAULT false,
    ncr_id                  UUID        REFERENCES quality_ncrs(id),
    site_engineer_id        UUID        REFERENCES users(id),
    contractor_rep          VARCHAR(100),
    remarks                 TEXT,
    attachments             JSONB        DEFAULT '[]'::jsonb,
    created_by              UUID        REFERENCES users(id),
    created_at              TIMESTAMPTZ  DEFAULT NOW(),
    updated_at              TIMESTAMPTZ  DEFAULT NOW()
);

ALTER TABLE quality_lab_tests
    ADD COLUMN IF NOT EXISTS pour_card_id UUID REFERENCES quality_pour_cards(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS quality_pour_card_mtc (
    id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    pour_card_id UUID        NOT NULL REFERENCES quality_pour_cards(id) ON DELETE CASCADE,
    mtc_id       UUID        NOT NULL REFERENCES quality_mtc(id) ON DELETE CASCADE,
    linked_at    TIMESTAMPTZ  DEFAULT NOW(),
    UNIQUE (pour_card_id, mtc_id)
);

-- ─── NCR ENHANCEMENTS ────────────────────────────────────────────────────────
ALTER TABLE quality_ncrs
    ADD COLUMN IF NOT EXISTS source            VARCHAR(30) DEFAULT 'manual'
                             CHECK (source IN ('manual','lab_failure','audit_finding')),
    ADD COLUMN IF NOT EXISTS pour_card_id      UUID REFERENCES quality_pour_cards(id),
    ADD COLUMN IF NOT EXISTS corrective_action TEXT,
    ADD COLUMN IF NOT EXISTS preventive_action TEXT,
    ADD COLUMN IF NOT EXISTS capa_due_date     DATE,
    ADD COLUMN IF NOT EXISTS capa_closed_at    TIMESTAMPTZ;

-- ─── SNAG ENHANCEMENTS ───────────────────────────────────────────────────────
ALTER TABLE snag_items
    ADD COLUMN IF NOT EXISTS itp_id  UUID REFERENCES quality_itps(id),
    ADD COLUMN IF NOT EXISTS rfi_id  UUID REFERENCES quality_rfis(id),
    ADD COLUMN IF NOT EXISTS ncr_id  UUID REFERENCES quality_ncrs(id);

-- ─── CHECKLIST ENHANCEMENTS ──────────────────────────────────────────────────
ALTER TABLE quality_checklists
    ADD COLUMN IF NOT EXISTS use_as_pre_pour  BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS use_as_post_pour BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS discipline       VARCHAR(100);

-- ─── SUB-MODULE 9: QUALITY AUDITS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quality_audits (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id      UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    company_id      UUID        NOT NULL REFERENCES companies(id),
    audit_number    VARCHAR(60)  UNIQUE NOT NULL,
    audit_type      VARCHAR(30)  DEFAULT 'internal'
                    CHECK (audit_type IN ('internal','external','third_party','client')),
    audit_standard  VARCHAR(100),
    scope           TEXT,
    audit_date      DATE,
    auditor_name    VARCHAR(255),
    auditor_company VARCHAR(255),
    status          VARCHAR(30)  DEFAULT 'scheduled'
                    CHECK (status IN ('scheduled','in_progress','completed','closed')),
    summary         TEXT,
    overall_rating  VARCHAR(20)
                    CHECK (overall_rating IN ('satisfactory','needs_improvement','unsatisfactory')),
    attachments     JSONB        DEFAULT '[]'::jsonb,
    created_by      UUID        REFERENCES users(id),
    created_at      TIMESTAMPTZ  DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quality_audit_findings (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    audit_id        UUID        NOT NULL REFERENCES quality_audits(id) ON DELETE CASCADE,
    finding_number  VARCHAR(30),
    finding_type    VARCHAR(30)  DEFAULT 'observation'
                    CHECK (finding_type IN ('major_nc','minor_nc','observation','opportunity')),
    clause_reference VARCHAR(100),
    description     TEXT        NOT NULL,
    location        VARCHAR(200),
    assigned_to     UUID        REFERENCES users(id),
    target_date     DATE,
    response        TEXT,
    evidence        JSONB        DEFAULT '[]'::jsonb,
    status          VARCHAR(30)  DEFAULT 'open'
                    CHECK (status IN ('open','in_progress','closed','verified')),
    closed_by       UUID        REFERENCES users(id),
    closed_at       TIMESTAMPTZ,
    ncr_id          UUID        REFERENCES quality_ncrs(id),
    created_at      TIMESTAMPTZ  DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  DEFAULT NOW()
);

-- ─── INDEXES ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_qitp_project         ON quality_itps(project_id);
CREATE INDEX IF NOT EXISTS idx_qitp_act_itp         ON quality_itp_activities(itp_id);
CREATE INDEX IF NOT EXISTS idx_qms_project          ON quality_method_statements(project_id);
CREATE INDEX IF NOT EXISTS idx_qmir_project         ON quality_mir(project_id);
CREATE INDEX IF NOT EXISTS idx_qmir_status          ON quality_mir(status);
CREATE INDEX IF NOT EXISTS idx_qmtc_project         ON quality_mtc(project_id);
CREATE INDEX IF NOT EXISTS idx_qmtc_status          ON quality_mtc(status);
CREATE INDEX IF NOT EXISTS idx_qmtc_mir             ON quality_mtc(mir_id);
CREATE INDEX IF NOT EXISTS idx_qpour_project        ON quality_pour_cards(project_id);
CREATE INDEX IF NOT EXISTS idx_qpour_status         ON quality_pour_cards(status);
CREATE INDEX IF NOT EXISTS idx_qaudits_project      ON quality_audits(project_id);
CREATE INDEX IF NOT EXISTS idx_qaudit_findings      ON quality_audit_findings(audit_id);
CREATE INDEX IF NOT EXISTS idx_qlab_pour            ON quality_lab_tests(pour_card_id);
CREATE INDEX IF NOT EXISTS idx_qlab_ncr             ON quality_lab_tests(ncr_id);
CREATE INDEX IF NOT EXISTS idx_qrfi_itp             ON quality_rfis(itp_id);
