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
    // client_payments is intentionally absent here — milestones are now the payment
    // record directly (see the cutover block below for databases that still have it).
    await pool.query(`
      CREATE TABLE IF NOT EXISTS clients (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(100) NOT NULL,
          phone VARCHAR(20),
          email VARCHAR(100),
          address TEXT,
          total_billed NUMERIC DEFAULT 0.00,
          total_advance NUMERIC DEFAULT 0.00,
          total_deduction NUMERIC DEFAULT 0.00,
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
          advance_amount NUMERIC DEFAULT 0.00,
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
          deduction_amount NUMERIC DEFAULT 0.00,
          status VARCHAR(20) NOT NULL DEFAULT 'DUE' CHECK (status IN ('DUE', 'PAID')),
          due_date DATE,
          payment_date DATE,
          bank_name VARCHAR(100),
          advice_reference_number VARCHAR(100),
          check_no VARCHAR(100),
          check_date DATE,
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
    `);

    // Patch columns onto any client_bills/client_bill_schedules/clients created by an
    // older version of the block above (pre-dating the milestone/payment merge and the
    // advance/deduction split).
    await pool.query(`
      ALTER TABLE clients ADD COLUMN IF NOT EXISTS total_advance NUMERIC DEFAULT 0.00;
      ALTER TABLE clients ADD COLUMN IF NOT EXISTS total_deduction NUMERIC DEFAULT 0.00;
      ALTER TABLE client_bills ADD COLUMN IF NOT EXISTS advance_amount NUMERIC DEFAULT 0.00;
      ALTER TABLE client_bill_schedules ADD COLUMN IF NOT EXISTS deduction_amount NUMERIC DEFAULT 0.00;
      ALTER TABLE client_bill_schedules ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100);
      ALTER TABLE client_bill_schedules ADD COLUMN IF NOT EXISTS advice_reference_number VARCHAR(100);
      ALTER TABLE client_bill_schedules ADD COLUMN IF NOT EXISTS payment_date DATE;
      ALTER TABLE client_bill_schedules ADD COLUMN IF NOT EXISTS sequence_number INTEGER;
      ALTER TABLE client_bill_schedules ADD COLUMN IF NOT EXISTS check_no VARCHAR(100);
      ALTER TABLE client_bill_schedules ADD COLUMN IF NOT EXISTS check_date DATE;
    `);

    // Backfill/self-heal sequence_number for rows predating that column. The frontend's
    // installment_label field is disabled/auto-computed ("1st Installment", "2nd
    // Installment", ...), so its leading ordinal is the one value that always reflects
    // true installment order — unlike due_date or created_at, which don't reliably
    // track it (that mismatch is exactly what scrambled the display order before).
    // Runs on every boot (not gated on IS NULL) so it also repairs rows an earlier,
    // due_date-based version of this backfill already got wrong.
    await pool.query(`
      UPDATE client_bill_schedules
      SET sequence_number = (substring(installment_label FROM '^(\\d+)'))::int
      WHERE installment_label ~ '^[0-9]+(st|nd|rd|th) ';
    `);

    // Rename the client_bill_schedules 'PENDING' status to 'DUE'. Same split-statement
    // reasoning as the status-check ALTER below in the old-schema cutover: the deferred
    // total-validation trigger must commit before ALTER TABLE can run. Idempotent —
    // DROP/ADD CONSTRAINT IF EXISTS and an empty UPDATE are both no-ops once migrated.
    await pool.query(`ALTER TABLE client_bill_schedules DROP CONSTRAINT IF EXISTS client_bill_schedules_status_check`);
    await pool.query(`UPDATE client_bill_schedules SET status = 'DUE' WHERE status = 'PENDING'`);
    await pool.query(`ALTER TABLE client_bill_schedules ADD CONSTRAINT client_bill_schedules_status_check CHECK (status IN ('DUE', 'PAID'))`);

    // One-time cutover for any database still on the old schema: merges milestones and
    // payments into one record, splits advance from deduction, and archives (renames,
    // doesn't drop — this is real production billing data) client_payments. Gated on
    // client_bills.advance_deduction still existing, so this only ever runs once per
    // database — every later boot finds the column gone and skips straight past.
    const { rows: preCutoverCol } = await pool.query(`
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'client_bills' AND column_name = 'advance_deduction'
    `);
    if (preCutoverCol.length > 0) {
      logger.info('Running one-time client-billing cutover (merge milestones/payments, split advance/deduction)...');

      await pool.query(`UPDATE client_bills SET advance_amount = advance_deduction`);

      const { rows: paymentsTableExists } = await pool.query(`
        SELECT 1 FROM information_schema.tables WHERE table_name = 'client_payments'
      `);
      if (paymentsTableExists.length > 0) {
        // received_amount is already correct (the old payment triggers kept it in sync).
        // Bank/reference/date/remarks can only carry over from the single latest payment
        // per schedule — lossy for any milestone that historically received more than
        // one partial payment, but there's no equivalent single-row home for a history.
        await pool.query(`
          UPDATE client_bill_schedules s
          SET bank_name = lp.bank_name,
              advice_reference_number = lp.advice_reference_number,
              payment_date = lp.payment_date,
              remarks = COALESCE(lp.remarks, s.remarks)
          FROM (
            SELECT DISTINCT ON (schedule_id) schedule_id, bank_name, advice_reference_number, payment_date, remarks
            FROM client_payments
            WHERE schedule_id IS NOT NULL AND deleted = false
            ORDER BY schedule_id, created_at DESC
          ) lp
          WHERE s.id = lp.schedule_id;
        `);
      }

      // Each statement runs as its own round trip (own implicit transaction) rather than
      // one batched call: the UPDATE fires client_bill_schedules' DEFERRABLE INITIALLY
      // DEFERRED constraint trigger (trg_fn_validate_bill_schedule_total), which stays
      // "pending" until its transaction commits — and Postgres refuses to ALTER TABLE a
      // relation that still has pending trigger events in the same transaction. Splitting
      // these lets the UPDATE's deferred trigger commit before the ADD CONSTRAINT begins.
      await pool.query(`ALTER TABLE client_bill_schedules DROP CONSTRAINT IF EXISTS client_bill_schedules_status_check`);
      // Coerce any value the new CHECK wouldn't accept (stray/legacy statuses included,
      // not just the old 'PENDING') to 'DUE' rather than assuming 'PENDING' is the only
      // one that can exist.
      await pool.query(`UPDATE client_bill_schedules SET status = 'DUE' WHERE status NOT IN ('DUE', 'PAID')`);
      await pool.query(`ALTER TABLE client_bill_schedules ADD CONSTRAINT client_bill_schedules_status_check CHECK (status IN ('DUE', 'PAID'))`);

      await pool.query(`
        DROP TRIGGER IF EXISTS trg_client_payments_sync ON client_payments;
        DROP TRIGGER IF EXISTS trg_client_payments_schedule_sync ON client_payments;
        DROP FUNCTION IF EXISTS trg_fn_sync_client_payments();
        DROP FUNCTION IF EXISTS trg_fn_sync_schedule_on_payment();
        ALTER TABLE client_bills DROP COLUMN advance_deduction;
        ALTER TABLE clients DROP COLUMN IF EXISTS total_advance_deduction;
        ALTER TABLE IF EXISTS client_payments RENAME TO client_payments_archived;
      `);

      logger.info('Client-billing cutover complete — client_payments archived as client_payments_archived.');
    }

    // Full recompute of the cached client aggregates from source, every boot — cheap at
    // this scale and self-healing (matches how total_billed was already unconditionally
    // re-derived here before this refactor). Safe pre- and post-cutover alike, since it
    // only ever reads the current client_bills/client_bill_schedules columns.
    await pool.query(`
      UPDATE clients c
      SET total_billed = COALESCE((
            SELECT SUM(cb.gross_amount) FROM client_bills cb WHERE cb.client_id = c.id AND cb.deleted = false
          ), 0),
          total_advance = COALESCE((
            SELECT SUM(cb.advance_amount) FROM client_bills cb WHERE cb.client_id = c.id AND cb.deleted = false
          ), 0),
          total_received = COALESCE((
            SELECT SUM(s.received_amount) FROM client_bill_schedules s
            JOIN client_bills cb ON s.bill_id = cb.id
            WHERE cb.client_id = c.id AND cb.deleted = false AND s.deleted = false
          ), 0),
          total_deduction = COALESCE((
            SELECT SUM(s.deduction_amount) FROM client_bill_schedules s
            JOIN client_bills cb ON s.bill_id = cb.id
            WHERE cb.client_id = c.id AND cb.deleted = false AND s.deleted = false
          ), 0);

      UPDATE clients SET total_due = total_billed - total_advance - total_deduction - total_received;
    `);

    await pool.query(`
      CREATE OR REPLACE FUNCTION trg_fn_sync_client_bills()
      RETURNS TRIGGER AS $$
      BEGIN
          IF (TG_OP = 'INSERT') THEN
              IF (NEW.deleted = false) THEN
                  UPDATE clients
                  SET total_billed = total_billed + NEW.gross_amount,
                      total_advance = total_advance + COALESCE(NEW.advance_amount, 0),
                      total_due = total_due + NEW.net_payable
                  WHERE id = NEW.client_id;
              END IF;
          ELSIF (TG_OP = 'UPDATE') THEN
              IF (OLD.deleted = false AND NEW.deleted = false) THEN
                  UPDATE clients
                  SET total_billed = total_billed - OLD.gross_amount,
                      total_advance = total_advance - COALESCE(OLD.advance_amount, 0),
                      total_due = total_due - OLD.net_payable
                  WHERE id = OLD.client_id;

                  UPDATE clients
                  SET total_billed = total_billed + NEW.gross_amount,
                      total_advance = total_advance + COALESCE(NEW.advance_amount, 0),
                      total_due = total_due + NEW.net_payable
                  WHERE id = NEW.client_id;
              ELSIF (OLD.deleted = false AND NEW.deleted = true) THEN
                  UPDATE clients
                  SET total_billed = total_billed - OLD.gross_amount,
                      total_advance = total_advance - COALESCE(OLD.advance_amount, 0),
                      total_due = total_due - OLD.net_payable
                  WHERE id = OLD.client_id;
              ELSIF (OLD.deleted = true AND NEW.deleted = false) THEN
                  UPDATE clients
                  SET total_billed = total_billed + NEW.gross_amount,
                      total_advance = total_advance + COALESCE(NEW.advance_amount, 0),
                      total_due = total_due + NEW.net_payable
                  WHERE id = NEW.client_id;
              END IF;
          ELSIF (TG_OP = 'DELETE') THEN
              IF (OLD.deleted = false) THEN
                  UPDATE clients
                  SET total_billed = total_billed - OLD.gross_amount,
                      total_advance = total_advance - COALESCE(OLD.advance_amount, 0),
                      total_due = total_due - OLD.net_payable
                  WHERE id = OLD.client_id;
              END IF;
          END IF;
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      CREATE OR REPLACE FUNCTION trg_fn_sync_client_schedule_receipts()
      RETURNS TRIGGER AS $$
      DECLARE
          v_old_client_id UUID;
          v_new_client_id UUID;
      BEGIN
          IF (TG_OP = 'INSERT') THEN
              IF (NEW.deleted = false) THEN
                  SELECT client_id INTO v_new_client_id FROM client_bills WHERE id = NEW.bill_id;
                  UPDATE clients
                  SET total_received = total_received + NEW.received_amount,
                      total_deduction = total_deduction + NEW.deduction_amount,
                      total_due = total_due - (NEW.received_amount + NEW.deduction_amount)
                  WHERE id = v_new_client_id;
              END IF;
          ELSIF (TG_OP = 'UPDATE') THEN
              IF (OLD.deleted = false AND NEW.deleted = false) THEN
                  SELECT client_id INTO v_old_client_id FROM client_bills WHERE id = OLD.bill_id;
                  UPDATE clients
                  SET total_received = total_received - OLD.received_amount,
                      total_deduction = total_deduction - OLD.deduction_amount,
                      total_due = total_due + (OLD.received_amount + OLD.deduction_amount)
                  WHERE id = v_old_client_id;

                  SELECT client_id INTO v_new_client_id FROM client_bills WHERE id = NEW.bill_id;
                  UPDATE clients
                  SET total_received = total_received + NEW.received_amount,
                      total_deduction = total_deduction + NEW.deduction_amount,
                      total_due = total_due - (NEW.received_amount + NEW.deduction_amount)
                  WHERE id = v_new_client_id;
              ELSIF (OLD.deleted = false AND NEW.deleted = true) THEN
                  SELECT client_id INTO v_old_client_id FROM client_bills WHERE id = OLD.bill_id;
                  UPDATE clients
                  SET total_received = total_received - OLD.received_amount,
                      total_deduction = total_deduction - OLD.deduction_amount,
                      total_due = total_due + (OLD.received_amount + OLD.deduction_amount)
                  WHERE id = v_old_client_id;
              ELSIF (OLD.deleted = true AND NEW.deleted = false) THEN
                  SELECT client_id INTO v_new_client_id FROM client_bills WHERE id = NEW.bill_id;
                  UPDATE clients
                  SET total_received = total_received + NEW.received_amount,
                      total_deduction = total_deduction + NEW.deduction_amount,
                      total_due = total_due - (NEW.received_amount + NEW.deduction_amount)
                  WHERE id = v_new_client_id;
              END IF;
          ELSIF (TG_OP = 'DELETE') THEN
              IF (OLD.deleted = false) THEN
                  SELECT client_id INTO v_old_client_id FROM client_bills WHERE id = OLD.bill_id;
                  UPDATE clients
                  SET total_received = total_received - OLD.received_amount,
                      total_deduction = total_deduction - OLD.deduction_amount,
                      total_due = total_due + (OLD.received_amount + OLD.deduction_amount)
                  WHERE id = v_old_client_id;
              END IF;
          END IF;
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      CREATE OR REPLACE FUNCTION trg_fn_set_schedule_status()
      RETURNS TRIGGER AS $$
      BEGIN
          IF (NEW.expected_amount > 0 AND (NEW.received_amount + NEW.deduction_amount) >= NEW.expected_amount) THEN
              NEW.status := 'PAID';
          ELSE
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

      DROP TRIGGER IF EXISTS trg_client_bill_schedules_receipts_sync ON client_bill_schedules;
      CREATE TRIGGER trg_client_bill_schedules_receipts_sync
      AFTER INSERT OR UPDATE OR DELETE ON client_bill_schedules
      FOR EACH ROW
      EXECUTE FUNCTION trg_fn_sync_client_schedule_receipts();

      DROP TRIGGER IF EXISTS trg_client_bill_schedules_status ON client_bill_schedules;
      CREATE TRIGGER trg_client_bill_schedules_status
      BEFORE INSERT OR UPDATE OF received_amount, deduction_amount ON client_bill_schedules
      FOR EACH ROW
      EXECUTE FUNCTION trg_fn_set_schedule_status();

      DROP TRIGGER IF EXISTS trg_client_bill_schedules_validate_total ON client_bill_schedules;
      CREATE CONSTRAINT TRIGGER trg_client_bill_schedules_validate_total
      AFTER INSERT OR UPDATE OR DELETE ON client_bill_schedules
      DEFERRABLE INITIALLY DEFERRED
      FOR EACH ROW
      EXECUTE FUNCTION trg_fn_validate_bill_schedule_total();
    `);

    // Website CMS module: public marketing-site content (clients/partners,
    // portfolio projects), namespaced `cms_` to avoid colliding with the
    // existing clients/projects billing tables above.
    // Mirrors db.sql — CREATE TABLE IF NOT EXISTS patches any database that
    // ran an older db.sql without these tables.
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cms_clients (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(100) NOT NULL,
          logo_path VARCHAR(255),
          short_description TEXT,
          detailed_description TEXT,
          display_order INTEGER NOT NULL DEFAULT 0,
          is_active BOOLEAN NOT NULL DEFAULT true,
          deleted BOOLEAN DEFAULT false,
          created_by VARCHAR(100),
          updated_by VARCHAR(100),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS cms_projects (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          client_id UUID REFERENCES cms_clients(id),
          name VARCHAR(150) NOT NULL,
          thumbnail_path VARCHAR(255),
          short_description TEXT,
          detailed_description TEXT,
          location VARCHAR(150),
          completion_year INTEGER,
          display_order INTEGER NOT NULL DEFAULT 0,
          is_active BOOLEAN NOT NULL DEFAULT true,
          is_featured BOOLEAN NOT NULL DEFAULT false,
          deleted BOOLEAN DEFAULT false,
          created_by VARCHAR(100),
          updated_by VARCHAR(100),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- cms_projects existed before is_featured was added; patch it in for
      -- any database that already ran the block above without this column.
      ALTER TABLE cms_projects ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false;

      CREATE INDEX IF NOT EXISTS idx_cms_clients_active_deleted_order ON cms_clients (is_active, deleted, display_order);

      CREATE INDEX IF NOT EXISTS idx_cms_projects_client_id ON cms_projects (client_id);
      CREATE INDEX IF NOT EXISTS idx_cms_projects_active_deleted_order ON cms_projects (is_active, deleted, display_order);
    `);

    // Backfill: is_featured is a new column, so every client's projects
    // created before it existed have none marked. Every client with any
    // project must always have exactly one featured (create/delete now
    // maintain this going forward) — promote each such client's
    // lowest-display_order project once. Naturally idempotent: once a
    // client has a featured project, the NOT EXISTS guard skips it.
    await pool.query(`
      UPDATE cms_projects p
      SET is_featured = true
      WHERE p.deleted = false
        AND p.id = (
          SELECT id FROM cms_projects p2
          WHERE p2.client_id = p.client_id AND p2.deleted = false
          ORDER BY p2.display_order ASC, p2.created_at DESC
          LIMIT 1
        )
        AND NOT EXISTS (
          SELECT 1 FROM cms_projects p3
          WHERE p3.client_id = p.client_id AND p3.deleted = false AND p3.is_featured = true
        );
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


