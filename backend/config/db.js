const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const logger = require('../utils/logger');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'user',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'erp_db',
  port: process.env.DB_PORT || 5432,
});

pool.on('connect', () => {
  logger.info('Connected to the database');
});

pool.on('error', (err) => {
  logger.error('Unexpected error on idle database client', err);
});

const initDb = async () => {
  try {
    // 1. Add username, phone, password columns if they do not exist and make email optional
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS username VARCHAR(100) UNIQUE,
      ADD COLUMN IF NOT EXISTS phone VARCHAR(20) UNIQUE,
      ADD COLUMN IF NOT EXISTS password VARCHAR(255),
      ADD COLUMN IF NOT EXISTS is_system BOOLEAN NOT NULL DEFAULT FALSE;

      ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
    `);

    // Foreign keys aren't auto-indexed by Postgres, and every list query filters
    // deleted=false ordered by created_at DESC — index that access pattern too.
    // (Mirrors db.sql for existing databases whose init script already ran.)
    await pool.query(`
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
    `);

    // Bills/payments are soft-deleted (UPDATE ... SET deleted = true), which fires these
    // triggers' UPDATE branch, not DELETE. The previous version reverted OLD.amount and
    // reapplied NEW.amount unconditionally — since a soft-delete only flips `deleted` and
    // leaves amount/contractor_id unchanged, that netted to zero, so contractor totals never
    // moved when a bill/payment was deleted (or restored). Re-running this on every backend
    // start (CREATE OR REPLACE) patches any database that already ran the old db.sql version.
    await pool.query(`
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
              IF (OLD.deleted = false AND NEW.deleted = false) THEN
                  UPDATE contractors
                  SET total_bills = total_bills - OLD.amount,
                      balance = balance - OLD.amount
                  WHERE id = OLD.contractor_id;

                  UPDATE contractors
                  SET total_bills = total_bills + NEW.amount,
                      balance = balance + NEW.amount
                  WHERE id = NEW.contractor_id;
              ELSIF (OLD.deleted = false AND NEW.deleted = true) THEN
                  UPDATE contractors
                  SET total_bills = total_bills - OLD.amount,
                      balance = balance - OLD.amount
                  WHERE id = OLD.contractor_id;
              ELSIF (OLD.deleted = true AND NEW.deleted = false) THEN
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
              IF (OLD.deleted = false AND NEW.deleted = false) THEN
                  UPDATE contractors
                  SET total_payments = total_payments - OLD.amount,
                      balance = balance + OLD.amount
                  WHERE id = OLD.contractor_id;

                  UPDATE contractors
                  SET total_payments = total_payments + NEW.amount,
                      balance = balance - NEW.amount
                  WHERE id = NEW.contractor_id;
              ELSIF (OLD.deleted = false AND NEW.deleted = true) THEN
                  UPDATE contractors
                  SET total_payments = total_payments - OLD.amount,
                      balance = balance + OLD.amount
                  WHERE id = OLD.contractor_id;
              ELSIF (OLD.deleted = true AND NEW.deleted = false) THEN
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
    `);

    // Client Billing & Payment Collection module (inflow). Tables don't exist on any
    // database that ran db.sql before this was added, so CREATE TABLE IF NOT EXISTS
    // performs the initial create here; CREATE OR REPLACE FUNCTION + DROP/CREATE TRIGGER
    // keep the trigger logic patchable on every future boot, same as the block above.
    await pool.query(`
      CREATE TABLE IF NOT EXISTS clients (
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

      CREATE TABLE IF NOT EXISTS client_pos (
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

      CREATE TABLE IF NOT EXISTS client_bills (
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

      CREATE TABLE IF NOT EXISTS client_bill_schedules (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          bill_id UUID REFERENCES client_bills(id),
          installment_label VARCHAR(50),
          percentage NUMERIC,
          expected_amount NUMERIC NOT NULL,
          received_amount NUMERIC DEFAULT 0.00,
          status VARCHAR(20) NOT NULL DEFAULT 'DUE' CHECK (status IN ('DUE', 'APPROVED', 'PAID')),
          due_date DATE,
          remarks TEXT,
          deleted BOOLEAN DEFAULT false,
          created_by VARCHAR(100),
          updated_by VARCHAR(100),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS client_payments (
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
    `);

    // total_advance_deduction didn't exist when clients was first created on any
    // database that already ran the block above, so patch it in directly and backfill
    // it from the bills that already exist (the trigger below only maintains it for
    // bill changes going forward — it can't retroactively cover rows inserted before
    // this column existed). Also re-backfill total_billed: it used to track net_payable
    // (gross less advance/deduction) which read as a mysteriously-short "Billed" figure
    // next to a real invoice value — it now tracks gross_amount, the actual billed
    // amount, so re-derive it from source on every boot the same way.
    await pool.query(`
      ALTER TABLE clients ADD COLUMN IF NOT EXISTS total_advance_deduction NUMERIC DEFAULT 0.00;

      UPDATE clients c
      SET total_advance_deduction = COALESCE((
            SELECT SUM(cb.advance_deduction) FROM client_bills cb WHERE cb.client_id = c.id AND cb.deleted = false
          ), 0),
          total_billed = COALESCE((
            SELECT SUM(cb.gross_amount) FROM client_bills cb WHERE cb.client_id = c.id AND cb.deleted = false
          ), 0);
    `);

    await pool.query(`
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

      CREATE OR REPLACE FUNCTION trg_fn_validate_bill_schedule_total()
      RETURNS TRIGGER AS $$
      DECLARE
          v_bill_id UUID := COALESCE(NEW.bill_id, OLD.bill_id);
          v_net_payable NUMERIC;
          v_schedule_total NUMERIC;
      BEGIN
          SELECT net_payable INTO v_net_payable FROM client_bills WHERE id = v_bill_id;

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
    `);

    // Triggers can't be CREATE OR REPLACE'd (pre-PG14 compatibility), so drop and
    // recreate them each boot to stay idempotent, same rationale as the comment above
    // for the contractor triggers.
    await pool.query(`
      DROP TRIGGER IF EXISTS trg_client_bills_sync ON client_bills;
      CREATE TRIGGER trg_client_bills_sync
      AFTER INSERT OR UPDATE OR DELETE ON client_bills
      FOR EACH ROW
      EXECUTE FUNCTION trg_fn_sync_client_bills();

      DROP TRIGGER IF EXISTS trg_client_payments_sync ON client_payments;
      CREATE TRIGGER trg_client_payments_sync
      AFTER INSERT OR UPDATE OR DELETE ON client_payments
      FOR EACH ROW
      EXECUTE FUNCTION trg_fn_sync_client_payments();

      DROP TRIGGER IF EXISTS trg_client_payments_schedule_sync ON client_payments;
      CREATE TRIGGER trg_client_payments_schedule_sync
      AFTER INSERT OR UPDATE OR DELETE ON client_payments
      FOR EACH ROW
      EXECUTE FUNCTION trg_fn_sync_schedule_on_payment();

      DROP TRIGGER IF EXISTS trg_client_bill_schedules_status ON client_bill_schedules;
      CREATE TRIGGER trg_client_bill_schedules_status
      BEFORE INSERT OR UPDATE OF received_amount ON client_bill_schedules
      FOR EACH ROW
      EXECUTE FUNCTION trg_fn_set_schedule_status();

      DROP TRIGGER IF EXISTS trg_client_bill_schedules_validate_total ON client_bill_schedules;
      CREATE CONSTRAINT TRIGGER trg_client_bill_schedules_validate_total
      AFTER INSERT OR UPDATE OR DELETE ON client_bill_schedules
      DEFERRABLE INITIALLY DEFERRED
      FOR EACH ROW
      EXECUTE FUNCTION trg_fn_validate_bill_schedule_total();
    `);

    logger.info('Database schema up to date.');

    // 2. Seed/sync a hidden system admin account: full (ADMIN) access, but excluded from
    // the users list and protected from update/delete at the query level (see models/user.js).
    // Credentials are fixed via env vars (not random) so they always match SYSADMIN_USERNAME /
    // SYSADMIN_PASSWORD in .env — every restart re-syncs the row to whatever is currently set.
    const sysAdminUsername = process.env.SYSADMIN_USERNAME;
    const sysAdminPassword = process.env.SYSADMIN_PASSWORD;

    if (!sysAdminUsername || !sysAdminPassword) {
      logger.warn('SYSADMIN_USERNAME/SYSADMIN_PASSWORD not set — skipping system admin seed.');
    } else {
      const passwordHash = await bcrypt.hash(sysAdminPassword, 10);
      const { rows: existingSystemAdmin } = await pool.query(
        'SELECT id FROM users WHERE is_system = TRUE LIMIT 1'
      );
      if (existingSystemAdmin.length === 0) {
        await pool.query(
          'INSERT INTO users (name, username, password, role, is_system) VALUES ($1, $2, $3, $4, $5)',
          ['System Administrator', sysAdminUsername, passwordHash, 'ADMIN', true]
        );
      } else {
        await pool.query(
          'UPDATE users SET username = $1, password = $2, role = $3, updated_at = NOW() WHERE id = $4',
          [sysAdminUsername, passwordHash, 'ADMIN', existingSystemAdmin[0].id]
        );
      }
      logger.info(`System admin ready (username: ${sysAdminUsername}).`);
    }
  } catch (err) {
    logger.error('Error migrating database schema', err);
  }
};

initDb();

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
  getClient: () => pool.connect(),
};


