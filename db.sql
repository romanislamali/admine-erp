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