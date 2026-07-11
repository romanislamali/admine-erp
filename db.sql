-- Users Table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN', 'MANAGER', 'EMPLOYEE')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Mock Users
INSERT INTO users (name, email, role) VALUES 
('Admine Admin', 'admine@admin.com', 'ADMIN'),
('Admine Manager', 'admine@manager.com', 'MANAGER'),
('Admine Employee', 'admine@employee.com', 'EMPLOYEE');

-- Contractors Table
CREATE TABLE contractors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(100),
    address TEXT,
    total_bills DECIMAL(12, 2) DEFAULT 0.00,
    total_payments DECIMAL(12, 2) DEFAULT 0.00,
    balance DECIMAL(12, 2) DEFAULT 0.00,
    created_by VARCHAR(100) REFERENCES users(email),
    updated_by VARCHAR(100) REFERENCES users(email),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Projects Table
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    contractor_id INT REFERENCES contractors(id),
    start_date DATE,
    end_date DATE,
    status VARCHAR(20),
    created_by VARCHAR(100) REFERENCES users(email),
    updated_by VARCHAR(100) REFERENCES users(email),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bills Table
CREATE TABLE bills (
    id SERIAL PRIMARY KEY,
    contractor_id INT REFERENCES contractors(id),
    project_id INT REFERENCES projects(id),
    amount DECIMAL(12, 2) NOT NULL,
    invoice_number VARCHAR(50),
    bill_date DATE,
    created_by VARCHAR(100) REFERENCES users(email),
    updated_by VARCHAR(100) REFERENCES users(email),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payments Table
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    contractor_id INT REFERENCES contractors(id),
    bill_id INT REFERENCES bills(id),
    amount DECIMAL(12, 2) NOT NULL,
    payment_date DATE,
    created_by VARCHAR(100) REFERENCES users(email),
    updated_by VARCHAR(100) REFERENCES users(email),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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