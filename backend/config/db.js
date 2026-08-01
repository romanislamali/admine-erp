const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'user',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'erp_db',
  port: process.env.DB_PORT || 5432,
});

pool.on('connect', () => {
  console.log('Connected to the database');
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

    console.log('Database schema up to date.');

    // 2. Seed/sync a hidden system admin account: full (ADMIN) access, but excluded from
    // the users list and protected from update/delete at the query level (see models/user.js).
    // Credentials are fixed via env vars (not random) so they always match SYSADMIN_USERNAME /
    // SYSADMIN_PASSWORD in .env — every restart re-syncs the row to whatever is currently set.
    const sysAdminUsername = process.env.SYSADMIN_USERNAME;
    const sysAdminPassword = process.env.SYSADMIN_PASSWORD;

    if (!sysAdminUsername || !sysAdminPassword) {
      console.warn('SYSADMIN_USERNAME/SYSADMIN_PASSWORD not set — skipping system admin seed.');
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
      console.log(`System admin ready (username: ${sysAdminUsername}).`);
    }
  } catch (err) {
    console.error('Error migrating database schema:', err.message);
  }
};

initDb();

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
  getClient: () => pool.connect(),
};


