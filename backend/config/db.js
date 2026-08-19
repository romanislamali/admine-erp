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


