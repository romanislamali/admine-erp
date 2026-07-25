const db = require('../config/db');
const bcrypt = require('bcryptjs');

const User = {
  getAll: async () => {
    const { rows } = await db.query('SELECT id, name, username, phone, email, role, created_at, updated_at FROM users ORDER BY created_at DESC');
    return rows;
  },
  getById: async (id) => {
    const { rows } = await db.query('SELECT id, name, username, phone, email, role, created_at, updated_at FROM users WHERE id = $1', [id]);
    return rows[0];
  },
  findByUsername: async (username) => {
    const { rows } = await db.query('SELECT * FROM users WHERE username = $1 OR email = $1', [username]);
    return rows[0];
  },
  findByEmail: async (email) => {
    const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    return rows[0];
  },
  create: async (user) => {
    const { name, username, phone, email, role, password } = user;
    const passwordHash = password ? await bcrypt.hash(password, 10) : null;
    const { rows } = await db.query(
      'INSERT INTO users (name, username, phone, email, role, password) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, username, phone, email, role, created_at, updated_at',
      [name, username, phone || null, email || null, role, passwordHash]
    );
    return rows[0];
  },
  update: async (id, user) => {
    const { name, username, phone, email, role, password } = user;
    let queryText = 'UPDATE users SET name = $1, username = $2, phone = $3, email = $4, role = $5, updated_at = NOW() WHERE id = $6 RETURNING id, name, username, phone, email, role, created_at, updated_at';
    let params = [name, username, phone || null, email || null, role, id];
    
    if (password) {
      const passwordHash = await bcrypt.hash(password, 10);
      queryText = 'UPDATE users SET name = $1, username = $2, phone = $3, email = $4, role = $5, password = $6, updated_at = NOW() WHERE id = $7 RETURNING id, name, username, phone, email, role, created_at, updated_at';
      params = [name, username, phone || null, email || null, role, passwordHash, id];
    }
    const { rows } = await db.query(queryText, params);
    return rows[0];
  },
  delete: async (id) => {
    const { rows } = await db.query('DELETE FROM users WHERE id = $1 RETURNING id, name, username, phone, email, role, created_at, updated_at', [id]);
    return rows[0];
  }
};

module.exports = User;

