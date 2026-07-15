const db = require('../config/db');

const User = {
  getAll: async () => {
    const { rows } = await db.query('SELECT * FROM users ORDER BY id DESC');
    return rows;
  },
  getById: async (id) => {
    const { rows } = await db.query('SELECT * FROM users WHERE id = $1', [id]);
    return rows[0];
  },
  findByEmail: async (email) => {
    const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    return rows[0];
  },
  create: async (user) => {
    const { name, email, role } = user;
    const { rows } = await db.query(
      'INSERT INTO users (name, email, role) VALUES ($1, $2, $3) RETURNING *',
      [name, email, role]
    );
    return rows[0];
  },
  update: async (id, user) => {
    const { name, email, role } = user;
    const { rows } = await db.query(
      'UPDATE users SET name = $1, email = $2, role = $3 WHERE id = $4 RETURNING *',
      [name, email, role, id]
    );
    return rows[0];
  },
  delete: async (id) => {
    const { rows } = await db.query('DELETE FROM users WHERE id = $1 RETURNING *', [id]);
    return rows[0];
  }
};

module.exports = User;
