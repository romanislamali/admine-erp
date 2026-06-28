-- Contractors Table
CREATE TABLE contractors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(100),
    address TEXT,
    total_bills DECIMAL(12, 2) DEFAULT 0.00,
    total_payments DECIMAL(12, 2) DEFAULT 0.00,
    balance DECIMAL(12, 2) DEFAULT 0.00
);

-- Projects Table
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    contractor_id INT REFERENCES contractors(id),
    start_date DATE,
    end_date DATE,
    status VARCHAR(20)
);

-- Bills Table
CREATE TABLE bills (
    id SERIAL PRIMARY KEY,
    contractor_id INT REFERENCES contractors(id),
    project_id INT REFERENCES projects(id),
    amount DECIMAL(12, 2) NOT NULL,
    invoice_number VARCHAR(50),
    bill_date DATE
);

-- Payments Table
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    contractor_id INT REFERENCES contractors(id),
    bill_id INT REFERENCES bills(id),
    amount DECIMAL(12, 2) NOT NULL,
    payment_date DATE
);

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