const db = require('../config/db');

const Contractor = {
  getAll: async () => {
    const { rows } = await db.query('SELECT * FROM contractors WHERE deleted = false ORDER BY created_at DESC');
    return rows;
  },
  getById: async (id) => {
    const { rows } = await db.query('SELECT * FROM contractors WHERE id = $1 AND deleted = false', [id]);
    return rows[0];
  },
  create: async (contractor) => {
    const { name, phone, email, address } = contractor;
    const { rows } = await db.query(
      'INSERT INTO contractors (name, phone, email, address, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING *',
      [name, phone, email, address]
    );
    return rows[0];
  },
  update: async (id, contractor) => {
    const { name, phone, email, address } = contractor;
    const { rows } = await db.query(
      'UPDATE contractors SET name = $1, phone = $2, email = $3, address = $4, updated_at = NOW() WHERE id = $5 RETURNING *',
      [name, phone, email, address, id]
    );
    return rows[0];
  },
  delete: async (id) => {
    const { rows } = await db.query('UPDATE contractors SET deleted = true WHERE id = $1 RETURNING *', [id]);
    return rows[0];
  },
};

module.exports = Contractor;
