-- Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) UNIQUE,  
    email VARCHAR(100) UNIQUE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN', 'MANAGER', 'EMPLOYEE')),
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- No mock users are seeded here. On first boot, backend/config/db.js seeds only the
-- hidden system admin account (from SYSADMIN_USERNAME/SYSADMIN_PASSWORD). Use that
-- account to log in and create the first real ADMIN user (and any others) through the
-- Users management screen/API.

-- Contractors Table
CREATE TABLE contractors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(100),
    address TEXT,
    total_bills NUMERIC DEFAULT 0.00,
    total_payments NUMERIC DEFAULT 0.00,
    balance NUMERIC DEFAULT 0.00,
    deleted BOOLEAN DEFAULT false,
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Projects Table
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    contractor_id UUID REFERENCES contractors(id),
    start_date DATE,
    end_date DATE,
    status VARCHAR(20),
    deleted BOOLEAN DEFAULT false,
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bills Table
CREATE TABLE bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contractor_id UUID REFERENCES contractors(id),
    project_id UUID REFERENCES projects(id),
    amount NUMERIC NOT NULL,
    invoice_number VARCHAR(50),
    bill_date DATE,
    deleted BOOLEAN DEFAULT false,
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payments Table
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contractor_id UUID REFERENCES contractors(id),
    project_id UUID REFERENCES projects(id),
    bill_id UUID REFERENCES bills(id),
    amount NUMERIC NOT NULL,
    payment_date DATE,
    deleted BOOLEAN DEFAULT false,
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes: foreign keys are not auto-indexed by Postgres, and every list query below
-- filters on deleted=false ordered by created_at DESC, so cover that access pattern too.
CREATE INDEX IF NOT EXISTS idx_contractors_deleted_created_at ON contractors (deleted, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_projects_contractor_id ON projects (contractor_id);
CREATE INDEX IF NOT EXISTS idx_projects_deleted_created_at ON projects (deleted, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bills_contractor_id ON bills (contractor_id);
CREATE INDEX IF NOT EXISTS idx_bills_project_id ON bills (project_id);
CREATE INDEX IF NOT EXISTS idx_bills_deleted_created_at ON bills (deleted, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payments_contractor_id ON payments (contractor_id);
CREATE INDEX IF NOT EXISTS idx_payments_project_id ON payments (project_id);
CREATE INDEX IF NOT EXISTS idx_payments_bill_id ON payments (bill_id);
CREATE INDEX IF NOT EXISTS idx_payments_deleted_created_at ON payments (deleted, created_at DESC);

-- PL/pgSQL Trigger Functions for Contractors Balance Sync
-- 1. Sync Contractor Balance on Bill Changes
CREATE OR REPLACE FUNCTION trg_fn_sync_contractor_bills()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        IF (NEW.deleted = false) THEN
            UPDATE contractors
            SET total_bills = total_bills + NEW.amount,
                balance = balance + NEW.amount
            WHERE id = NEW.contractor_id;
        END IF;
    ELSIF (TG_OP = 'UPDATE') THEN
        -- Bills are soft-deleted (UPDATE ... SET deleted = true), so a delete/restore
        -- arrives here as an UPDATE, not a DELETE — the deleted flag must gate whether
        -- this row's amount is currently counted in the contractor's totals.
        IF (OLD.deleted = false AND NEW.deleted = false) THEN
            -- Revert old bill amount
            UPDATE contractors
            SET total_bills = total_bills - OLD.amount,
                balance = balance - OLD.amount
            WHERE id = OLD.contractor_id;

            -- Apply new bill amount
            UPDATE contractors
            SET total_bills = total_bills + NEW.amount,
                balance = balance + NEW.amount
            WHERE id = NEW.contractor_id;
        ELSIF (OLD.deleted = false AND NEW.deleted = true) THEN
            -- Soft-deleted: remove it from the totals
            UPDATE contractors
            SET total_bills = total_bills - OLD.amount,
                balance = balance - OLD.amount
            WHERE id = OLD.contractor_id;
        ELSIF (OLD.deleted = true AND NEW.deleted = false) THEN
            -- Restored: add it back to the totals
            UPDATE contractors
            SET total_bills = total_bills + NEW.amount,
                balance = balance + NEW.amount
            WHERE id = NEW.contractor_id;
        END IF;
    ELSIF (TG_OP = 'DELETE') THEN
        IF (OLD.deleted = false) THEN
            UPDATE contractors
            SET total_bills = total_bills - OLD.amount,
                balance = balance - OLD.amount
            WHERE id = OLD.contractor_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Sync Contractor Balance on Payment Changes
CREATE OR REPLACE FUNCTION trg_fn_sync_contractor_payments()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        IF (NEW.deleted = false) THEN
            UPDATE contractors
            SET total_payments = total_payments + NEW.amount,
                balance = balance - NEW.amount
            WHERE id = NEW.contractor_id;
        END IF;
    ELSIF (TG_OP = 'UPDATE') THEN
        -- Payments are soft-deleted (UPDATE ... SET deleted = true), so a delete/restore
        -- arrives here as an UPDATE, not a DELETE — the deleted flag must gate whether
        -- this row's amount is currently counted in the contractor's totals.
        IF (OLD.deleted = false AND NEW.deleted = false) THEN
            -- Revert old payment amount
            UPDATE contractors
            SET total_payments = total_payments - OLD.amount,
                balance = balance + OLD.amount
            WHERE id = OLD.contractor_id;

            -- Apply new payment amount
            UPDATE contractors
            SET total_payments = total_payments + NEW.amount,
                balance = balance - NEW.amount
            WHERE id = NEW.contractor_id;
        ELSIF (OLD.deleted = false AND NEW.deleted = true) THEN
            -- Soft-deleted: remove it from the totals
            UPDATE contractors
            SET total_payments = total_payments - OLD.amount,
                balance = balance + OLD.amount
            WHERE id = OLD.contractor_id;
        ELSIF (OLD.deleted = true AND NEW.deleted = false) THEN
            -- Restored: add it back to the totals
            UPDATE contractors
            SET total_payments = total_payments + NEW.amount,
                balance = balance - NEW.amount
            WHERE id = NEW.contractor_id;
        END IF;
    ELSIF (TG_OP = 'DELETE') THEN
        IF (OLD.deleted = false) THEN
            UPDATE contractors
            SET total_payments = total_payments - OLD.amount,
                balance = balance + OLD.amount
            WHERE id = OLD.contractor_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply Triggers
CREATE TRIGGER trg_bills_sync
AFTER INSERT OR UPDATE OR DELETE ON bills
FOR EACH ROW
EXECUTE FUNCTION trg_fn_sync_contractor_bills();

CREATE TRIGGER trg_payments_sync
AFTER INSERT OR UPDATE OR DELETE ON payments
FOR EACH ROW
EXECUTE FUNCTION trg_fn_sync_contractor_payments();

-- ============================================================================
-- Client Billing & Payment Collection Module (Inflow)
-- Mirrors the contractor (outflow) module above: UUID PKs, soft delete,
-- created_by/updated_by/created_at/updated_at audit columns, plain NUMERIC,
-- and trigger-based aggregate sync on the parent (clients) row.
-- ============================================================================

-- Clients Table
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(100),
    address TEXT,
    total_billed NUMERIC DEFAULT 0.00,
    total_advance_deduction NUMERIC DEFAULT 0.00,
    total_received NUMERIC DEFAULT 0.00,
    total_due NUMERIC DEFAULT 0.00,
    deleted BOOLEAN DEFAULT false,
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Client Purchase Orders Table
CREATE TABLE client_pos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id),
    po_number VARCHAR(50) NOT NULL,
    po_date DATE,
    po_amount NUMERIC,
    description TEXT,
    deleted BOOLEAN DEFAULT false,
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (client_id, po_number)
);

-- Client Bills Table (bill header raised against a client, optionally against a PO)
-- project_id links the bill back to the same projects table the contractor module
-- bills against, so profit/loss can be reported per project (client revenue vs
-- contractor cost) without a separate mapping table.
CREATE TABLE client_bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id),
    po_id UUID REFERENCES client_pos(id),
    project_id UUID REFERENCES projects(id),
    bill_number VARCHAR(50),
    gross_amount NUMERIC NOT NULL,
    advance_deduction NUMERIC DEFAULT 0.00,
    net_payable NUMERIC NOT NULL,
    bill_date DATE,
    area VARCHAR(100),
    remarks TEXT,
    deleted BOOLEAN DEFAULT false,
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (client_id, bill_number)
);

-- Client Bill Payment Schedules (dynamic milestone splits, e.g. 80/20, 50/25/25)
-- One row per installment. expected_amount is the app-computed slice of the
-- bill's net_payable; received_amount and status are kept in sync by triggers
-- as client_payments are recorded against a schedule row.
CREATE TABLE client_bill_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id UUID REFERENCES client_bills(id),
    installment_label VARCHAR(50),
    percentage NUMERIC,
    expected_amount NUMERIC NOT NULL,
    received_amount NUMERIC DEFAULT 0.00,
    status VARCHAR(20) NOT NULL DEFAULT 'DUE' CHECK (status IN ('DUE', 'PAID')),
    due_date DATE,
    remarks TEXT,
    deleted BOOLEAN DEFAULT false,
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Client Payments Table (receipts from clients, incl. bank advice references)
-- bill_id is kept even when schedule_id is set so payment listing/reporting
-- doesn't need to join through client_bill_schedules just to find the bill.
CREATE TABLE client_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id),
    bill_id UUID REFERENCES client_bills(id),
    schedule_id UUID REFERENCES client_bill_schedules(id),
    amount NUMERIC NOT NULL,
    payment_date DATE,
    bank_name VARCHAR(100),
    advice_reference_number VARCHAR(100),
    remarks TEXT,
    deleted BOOLEAN DEFAULT false,
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes: same access pattern as the contractor module (FKs, deleted+created_at).
CREATE INDEX IF NOT EXISTS idx_clients_deleted_created_at ON clients (deleted, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_client_pos_client_id ON client_pos (client_id);
CREATE INDEX IF NOT EXISTS idx_client_pos_deleted_created_at ON client_pos (deleted, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_client_bills_client_id ON client_bills (client_id);
CREATE INDEX IF NOT EXISTS idx_client_bills_po_id ON client_bills (po_id);
CREATE INDEX IF NOT EXISTS idx_client_bills_project_id ON client_bills (project_id);
CREATE INDEX IF NOT EXISTS idx_client_bills_deleted_created_at ON client_bills (deleted, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_client_bill_schedules_bill_id ON client_bill_schedules (bill_id);
CREATE INDEX IF NOT EXISTS idx_client_bill_schedules_deleted_created_at ON client_bill_schedules (deleted, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_client_payments_client_id ON client_payments (client_id);
CREATE INDEX IF NOT EXISTS idx_client_payments_bill_id ON client_payments (bill_id);
CREATE INDEX IF NOT EXISTS idx_client_payments_schedule_id ON client_payments (schedule_id);
CREATE INDEX IF NOT EXISTS idx_client_payments_deleted_created_at ON client_payments (deleted, created_at DESC);

-- PL/pgSQL Trigger Functions for Client Balance Sync
-- 1. Sync Client Balance on Bill Changes (mirrors trg_fn_sync_contractor_bills).
--    total_billed tracks gross_amount — the actual invoiced/billed value — so it reads
--    as a real ledger: Billed - Advance/Deduction - Received = Due. total_due still
--    tracks net_payable (gross less advance/deduction) minus received, which is the
--    real amount currently owed; it's just no longer the same figure as total_billed.
CREATE OR REPLACE FUNCTION trg_fn_sync_client_bills()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        IF (NEW.deleted = false) THEN
            UPDATE clients
            SET total_billed = total_billed + NEW.gross_amount,
                total_advance_deduction = total_advance_deduction + COALESCE(NEW.advance_deduction, 0),
                total_due = total_due + NEW.net_payable
            WHERE id = NEW.client_id;
        END IF;
    ELSIF (TG_OP = 'UPDATE') THEN
        -- Bills are soft-deleted (UPDATE ... SET deleted = true), so a delete/restore
        -- arrives here as an UPDATE, not a DELETE — the deleted flag must gate whether
        -- this row's amount is currently counted in the client's totals.
        IF (OLD.deleted = false AND NEW.deleted = false) THEN
            UPDATE clients
            SET total_billed = total_billed - OLD.gross_amount,
                total_advance_deduction = total_advance_deduction - COALESCE(OLD.advance_deduction, 0),
                total_due = total_due - OLD.net_payable
            WHERE id = OLD.client_id;

            UPDATE clients
            SET total_billed = total_billed + NEW.gross_amount,
                total_advance_deduction = total_advance_deduction + COALESCE(NEW.advance_deduction, 0),
                total_due = total_due + NEW.net_payable
            WHERE id = NEW.client_id;
        ELSIF (OLD.deleted = false AND NEW.deleted = true) THEN
            UPDATE clients
            SET total_billed = total_billed - OLD.gross_amount,
                total_advance_deduction = total_advance_deduction - COALESCE(OLD.advance_deduction, 0),
                total_due = total_due - OLD.net_payable
            WHERE id = OLD.client_id;
        ELSIF (OLD.deleted = true AND NEW.deleted = false) THEN
            UPDATE clients
            SET total_billed = total_billed + NEW.gross_amount,
                total_advance_deduction = total_advance_deduction + COALESCE(NEW.advance_deduction, 0),
                total_due = total_due + NEW.net_payable
            WHERE id = NEW.client_id;
        END IF;
    ELSIF (TG_OP = 'DELETE') THEN
        IF (OLD.deleted = false) THEN
            UPDATE clients
            SET total_billed = total_billed - OLD.gross_amount,
                total_advance_deduction = total_advance_deduction - COALESCE(OLD.advance_deduction, 0),
                total_due = total_due - OLD.net_payable
            WHERE id = OLD.client_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Sync Client Balance on Payment Changes (mirrors trg_fn_sync_contractor_payments)
CREATE OR REPLACE FUNCTION trg_fn_sync_client_payments()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        IF (NEW.deleted = false) THEN
            UPDATE clients
            SET total_received = total_received + NEW.amount,
                total_due = total_due - NEW.amount
            WHERE id = NEW.client_id;
        END IF;
    ELSIF (TG_OP = 'UPDATE') THEN
        IF (OLD.deleted = false AND NEW.deleted = false) THEN
            UPDATE clients
            SET total_received = total_received - OLD.amount,
                total_due = total_due + OLD.amount
            WHERE id = OLD.client_id;

            UPDATE clients
            SET total_received = total_received + NEW.amount,
                total_due = total_due - NEW.amount
            WHERE id = NEW.client_id;
        ELSIF (OLD.deleted = false AND NEW.deleted = true) THEN
            UPDATE clients
            SET total_received = total_received - OLD.amount,
                total_due = total_due + OLD.amount
            WHERE id = OLD.client_id;
        ELSIF (OLD.deleted = true AND NEW.deleted = false) THEN
            UPDATE clients
            SET total_received = total_received + NEW.amount,
                total_due = total_due - NEW.amount
            WHERE id = NEW.client_id;
        END IF;
    ELSIF (TG_OP = 'DELETE') THEN
        IF (OLD.deleted = false) THEN
            UPDATE clients
            SET total_received = total_received - OLD.amount,
                total_due = total_due + OLD.amount
            WHERE id = OLD.client_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Sync installment received_amount on client_bill_schedules whenever a
--    payment referencing that schedule is inserted/updated/soft-deleted/deleted.
--    Mirrors the same INSERT/UPDATE(soft-delete transitions)/DELETE shape as
--    the two functions above, scoped to schedule_id instead of client_id.
CREATE OR REPLACE FUNCTION trg_fn_sync_schedule_on_payment()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        IF (NEW.deleted = false AND NEW.schedule_id IS NOT NULL) THEN
            UPDATE client_bill_schedules
            SET received_amount = received_amount + NEW.amount
            WHERE id = NEW.schedule_id;
        END IF;
    ELSIF (TG_OP = 'UPDATE') THEN
        IF (OLD.deleted = false AND NEW.deleted = false) THEN
            IF (OLD.schedule_id IS NOT NULL) THEN
                UPDATE client_bill_schedules
                SET received_amount = received_amount - OLD.amount
                WHERE id = OLD.schedule_id;
            END IF;
            IF (NEW.schedule_id IS NOT NULL) THEN
                UPDATE client_bill_schedules
                SET received_amount = received_amount + NEW.amount
                WHERE id = NEW.schedule_id;
            END IF;
        ELSIF (OLD.deleted = false AND NEW.deleted = true) THEN
            IF (OLD.schedule_id IS NOT NULL) THEN
                UPDATE client_bill_schedules
                SET received_amount = received_amount - OLD.amount
                WHERE id = OLD.schedule_id;
            END IF;
        ELSIF (OLD.deleted = true AND NEW.deleted = false) THEN
            IF (NEW.schedule_id IS NOT NULL) THEN
                UPDATE client_bill_schedules
                SET received_amount = received_amount + NEW.amount
                WHERE id = NEW.schedule_id;
            END IF;
        END IF;
    ELSIF (TG_OP = 'DELETE') THEN
        IF (OLD.deleted = false AND OLD.schedule_id IS NOT NULL) THEN
            UPDATE client_bill_schedules
            SET received_amount = received_amount - OLD.amount
            WHERE id = OLD.schedule_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Derive installment status from received_amount whenever it changes.
--    A schedule is only ever force-flipped to PAID (full receipt) or reverted
--    from PAID back to DUE (a reversed/deleted payment drops it below full).
CREATE OR REPLACE FUNCTION trg_fn_set_schedule_status()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.expected_amount > 0 AND NEW.received_amount >= NEW.expected_amount) THEN
        NEW.status := 'PAID';
    ELSIF (TG_OP = 'UPDATE' AND OLD.status = 'PAID' AND NEW.received_amount < NEW.expected_amount) THEN
        NEW.status := 'DUE';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Guard the dynamic milestone split: whatever percentages/amounts the app
--    breaks a bill into (80/20, 50/25/25, custom), the schedule rows for a
--    bill must always sum exactly to that bill's net_payable. Deferred to
--    COMMIT so a bill + all of its schedule rows can be inserted across
--    several statements in one transaction and only validated once, at the end.
CREATE OR REPLACE FUNCTION trg_fn_validate_bill_schedule_total()
RETURNS TRIGGER AS $$
DECLARE
    v_bill_id UUID := COALESCE(NEW.bill_id, OLD.bill_id);
    v_net_payable NUMERIC;
    v_schedule_total NUMERIC;
BEGIN
    SELECT net_payable INTO v_net_payable FROM client_bills WHERE id = v_bill_id;

    -- Bill row itself is gone (e.g. deleted earlier in the same transaction)
    IF v_net_payable IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT COALESCE(SUM(expected_amount), 0) INTO v_schedule_total
    FROM client_bill_schedules
    WHERE bill_id = v_bill_id AND deleted = false;

    IF v_schedule_total <> v_net_payable THEN
        RAISE EXCEPTION 'Milestone schedule for bill % totals % but net payable is % — splits must sum exactly to net payable', v_bill_id, v_schedule_total, v_net_payable;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Apply Triggers
CREATE TRIGGER trg_client_bills_sync
AFTER INSERT OR UPDATE OR DELETE ON client_bills
FOR EACH ROW
EXECUTE FUNCTION trg_fn_sync_client_bills();

CREATE TRIGGER trg_client_payments_sync
AFTER INSERT OR UPDATE OR DELETE ON client_payments
FOR EACH ROW
EXECUTE FUNCTION trg_fn_sync_client_payments();

CREATE TRIGGER trg_client_payments_schedule_sync
AFTER INSERT OR UPDATE OR DELETE ON client_payments
FOR EACH ROW
EXECUTE FUNCTION trg_fn_sync_schedule_on_payment();

CREATE TRIGGER trg_client_bill_schedules_status
BEFORE INSERT OR UPDATE OF received_amount ON client_bill_schedules
FOR EACH ROW
EXECUTE FUNCTION trg_fn_set_schedule_status();

CREATE CONSTRAINT TRIGGER trg_client_bill_schedules_validate_total
AFTER INSERT OR UPDATE OR DELETE ON client_bill_schedules
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION trg_fn_validate_bill_schedule_total();