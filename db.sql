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
        UPDATE contractors
        SET total_bills = total_bills + NEW.amount,
            balance = balance + NEW.amount
        WHERE id = NEW.contractor_id;
    ELSIF (TG_OP = 'UPDATE') THEN
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
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE contractors
        SET total_bills = total_bills - OLD.amount,
            balance = balance - OLD.amount
        WHERE id = OLD.contractor_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Sync Contractor Balance on Payment Changes
CREATE OR REPLACE FUNCTION trg_fn_sync_contractor_payments()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE contractors
        SET total_payments = total_payments + NEW.amount,
            balance = balance - NEW.amount
        WHERE id = NEW.contractor_id;
    ELSIF (TG_OP = 'UPDATE') THEN
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
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE contractors
        SET total_payments = total_payments - OLD.amount,
            balance = balance + OLD.amount
        WHERE id = OLD.contractor_id;
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