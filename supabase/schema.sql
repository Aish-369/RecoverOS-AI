-- ==============================================================================
-- RecoverOS AI - Production PostgreSQL / Supabase Relational Schema
-- Multi-Tenant Isolation with Row-Level Security (RLS)
-- ==============================================================================

-- 1. Workspaces (Tenant Isolation)
CREATE TABLE IF NOT EXISTS workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    owner_user_id UUID NOT NULL, -- references auth.users(id)
    entity_type VARCHAR(100) DEFAULT 'B2B Consultancy / Agency',
    gstin VARCHAR(15),
    msme_registration_number VARCHAR(50),
    is_msme_registered BOOLEAN DEFAULT FALSE,
    standard_payment_term_days INTEGER DEFAULT 30 CHECK (standard_payment_term_days BETWEEN 1 AND 90),
    upi_id VARCHAR(100),
    contact_person VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Invoices
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    invoice_number VARCHAR(100) NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255),
    customer_phone VARCHAR(50),
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    total_amount NUMERIC(14, 2) NOT NULL CHECK (total_amount > 0),
    paid_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (paid_amount >= 0),
    balance_amount NUMERIC(14, 2) GENERATED ALWAYS AS (total_amount - paid_amount) STORED,
    status VARCHAR(30) NOT NULL DEFAULT 'current' 
        CHECK (status IN ('current', 'overdue_0_30', 'overdue_31_44', 'overdue_45_plus', 'paid', 'disputed')),
    is_msme_eligible BOOLEAN DEFAULT TRUE,
    project_milestone TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uq_workspace_invoice_number UNIQUE (workspace_id, invoice_number),
    CONSTRAINT chk_paid_lte_total CHECK (paid_amount <= total_amount)
);

CREATE INDEX IF NOT EXISTS idx_invoices_workspace_status ON invoices(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);

-- 3. Payments (Partial & Full Remittances)
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
    payment_date DATE NOT NULL,
    reference_number VARCHAR(100) NOT NULL,
    payment_method VARCHAR(30) NOT NULL DEFAULT 'neft_rtgs'
        CHECK (payment_method IN ('neft_rtgs', 'upi', 'cheque', 'imps', 'other')),
    verification_status VARCHAR(50) NOT NULL DEFAULT 'user_recorded_pending_verification'
        CHECK (verification_status IN ('user_recorded_pending_verification', 'bank_feed_verified')),
    notes TEXT,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_workspace_date ON payments(workspace_id, payment_date);

-- 4. Audit Trail (Immutable Event Log)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    invoice_number VARCHAR(100),
    event_type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_workspace_created ON audit_logs(workspace_id, created_at DESC);

-- ==============================================================================
-- Row-Level Security (RLS) Policies
-- Enforces strict tenant separation: users can ONLY access rows for their workspace
-- ==============================================================================

ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Workspaces policy
CREATE POLICY "Users can access their own workspace" 
ON workspaces FOR ALL 
USING (owner_user_id = auth.uid());

-- Invoices policy
CREATE POLICY "Users can access invoices in their workspace" 
ON invoices FOR ALL 
USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_user_id = auth.uid()));

-- Payments policy
CREATE POLICY "Users can access payments in their workspace" 
ON payments FOR ALL 
USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_user_id = auth.uid()));

-- Audit logs policy
CREATE POLICY "Users can access audit logs in their workspace" 
ON audit_logs FOR ALL 
USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_user_id = auth.uid()));
