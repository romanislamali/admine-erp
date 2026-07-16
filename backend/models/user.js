const db = require('../config/db');
const bcrypt = require('bcryptjs');

const User = {
  getAll: async () => {
    const { rows } = await db.query('SELECT id, name, email, role, created_at, updated_at FROM users ORDER BY id DESC');
    return rows;
  },
  getById: async (id) => {
    const { rows } = await db.query('SELECT id, name, email, role, created_at, updated_at FROM users WHERE id = $1', [id]);
    return rows[0];
  },
  findByEmail: async (email) => {
    const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    return rows[0];
  },
  create: async (user) => {
    const { name, email, role, password } = user;
    const passwordHash = password ? await bcrypt.hash(password, 10) : null;
    const { rows } = await db.query(
      'INSERT INTO users (name, email, role, password) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, created_at, updated_at',
      [name, email, role, passwordHash]
    );
    return rows[0];
  },
  update: async (id, user) => {
    const { name, email, role, password } = user;
    let queryText = 'UPDATE users SET name = $1, email = $2, role = $3 WHERE id = $4 RETURNING id, name, email, role, created_at, updated_at';
    let params = [name, email, role, id];
    
    if (password) {
      const passwordHash = await bcrypt.hash(password, 10);
      queryText = 'UPDATE users SET name = $1, email = $2, role = $3, password = $4 WHERE id = $5 RETURNING id, name, email, role, created_at, updated_at';
      params = [name, email, role, passwordHash, id];
    }
    const { rows } = await db.query(queryText, params);
    return rows[0];
  },
  delete: async (id) => {
    const { rows } = await db.query('DELETE FROM users WHERE id = $1 RETURNING id, name, email, role, created_at, updated_at', [id]);
    return rows[0];
  }
};

module.exports = User;

