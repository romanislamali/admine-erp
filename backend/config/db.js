const { Pool } = require('pg');
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
      ADD COLUMN IF NOT EXISTS password VARCHAR(255);
      
      ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
    `);

    // 2. Seed default passwords and usernames for mock users if not set
    const adminHash = '$2a$10$tWPmqfMIERug1BmLWAqWOu/oGA8JMqsWFppSCj9cQcchGSjOpGLA6';
    const managerHash = '$2a$10$mJTbZulHdE2cH9klUNghx.posygxvke5711WySXYUn07WioU6QD.W';
    const employeeHash = '$2a$10$jMkoTuQMptuL.qwXBRPifONUEVWQggKrg4YCrIxA0mZ/QK7FGbNu.';

    await pool.query("UPDATE users SET username = 'admineadmin', phone = '+8801710310755', password = $1 WHERE email = 'admine@admin.com' OR username = 'admineadmin'", [adminHash]);
    await pool.query("UPDATE users SET username = 'adminemanager', phone = '+8801710310756', password = $1 WHERE email = 'admine@manager.com' OR username = 'adminemanager'", [managerHash]);
    await pool.query("UPDATE users SET username = 'admineemployee', phone = '+8801710310757', password = $1 WHERE email = 'admine@employee.com' OR username = 'admineemployee'", [employeeHash]);

    console.log('Database schema successfully migrated for JWT passwords.');
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


