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
  create: async (contractor, createdBy) => {
    const { name, phone, email, address } = contractor;
    const { rows } = await db.query(
      'INSERT INTO contractors (name, phone, email, address, created_by, updated_by, created_at) VALUES ($1, $2, $3, $4, $5, $5, NOW()) RETURNING *',
      [name, phone, email, address, createdBy]
    );
    return rows[0];
  },
  update: async (id, contractor, updatedBy) => {
    const { name, phone, email, address } = contractor;
    const { rows } = await db.query(
      'UPDATE contractors SET name = $1, phone = $2, email = $3, address = $4, updated_by = $5, updated_at = NOW() WHERE id = $6 RETURNING *',
      [name, phone, email, address, updatedBy, id]
    );
    return rows[0];
  },
  delete: async (id) => {
    const { rows } = await db.query('UPDATE contractors SET deleted = true WHERE id = $1 RETURNING *', [id]);
    return rows[0];
  },
};

module.exports = Contractor;
