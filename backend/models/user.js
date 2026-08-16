const db = require('../config/db');
const bcrypt = require('bcryptjs');

const User = {
  getAll: async () => {
    const { rows } = await db.query("SELECT id, name, username, phone, email, role, created_at, updated_at FROM users WHERE is_system = FALSE ORDER BY created_at DESC");
    return rows;
  },
  getById: async (id) => {
    const { rows } = await db.query('SELECT id, name, username, phone, email, role, created_at, updated_at FROM users WHERE id = $1 AND is_system = FALSE', [id]);
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
    let queryText = 'UPDATE users SET name = $1, username = $2, phone = $3, email = $4, role = $5, updated_at = NOW() WHERE id = $6 AND is_system = FALSE RETURNING id, name, username, phone, email, role, created_at, updated_at';
    let params = [name, username, phone || null, email || null, role, id];

    if (password) {
      const passwordHash = await bcrypt.hash(password, 10);
      queryText = 'UPDATE users SET name = $1, username = $2, phone = $3, email = $4, role = $5, password = $6, updated_at = NOW() WHERE id = $7 AND is_system = FALSE RETURNING id, name, username, phone, email, role, created_at, updated_at';
      params = [name, username, phone || null, email || null, role, passwordHash, id];
    }
    const { rows } = await db.query(queryText, params);
    return rows[0];
  },
  delete: async (id) => {
    const { rows } = await db.query('DELETE FROM users WHERE id = $1 AND is_system = FALSE RETURNING id, name, username, phone, email, role, created_at, updated_at', [id]);
    return rows[0];
  },
  getPaginated: async ({ limit, offset, search, role, sortField, sortOrder }) => {
    let queryText = `
      SELECT id, name, username, phone, email, role, created_at, updated_at
      FROM users
      WHERE is_system = FALSE
    `;
    const params = [];
    let paramCount = 0;

    if (role && role !== 'ALL') {
      paramCount++;
      queryText += ` AND role = $${paramCount}`;
      params.push(role);
    }

    if (search) {
      paramCount++;
      queryText += ` AND (
        name ILIKE $${paramCount} OR 
        username ILIKE $${paramCount} OR 
        email ILIKE $${paramCount} OR 
        phone ILIKE $${paramCount}
      )`;
      params.push(`%${search}%`);
    }

    const countQueryText = `SELECT COUNT(*) FROM (${queryText}) AS temp`;
    const countResult = await db.query(countQueryText, params);
    const total = parseInt(countResult.rows[0].count, 10);

    const allowedSortFields = {
      'id': 'id',
      'name': 'name',
      'username': 'username',
      'email': 'email',
      'phone': 'phone',
      'role': 'role',
      'created_at': 'created_at'
    };
    
    const dbSortField = allowedSortFields[sortField] || 'created_at';
    const dbSortOrder = sortOrder === 'asc' ? 'ASC' : 'DESC';
    
    queryText += ` ORDER BY ${dbSortField} ${dbSortOrder}`;

    paramCount++;
    queryText += ` LIMIT $${paramCount}`;
    params.push(limit);

    paramCount++;
    queryText += ` OFFSET $${paramCount}`;
    params.push(offset);

    const { rows } = await db.query(queryText, params);
    return { rows, total };
  }
};

module.exports = User;

