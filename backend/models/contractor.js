const db = require('../config/db');

const Contractor = {
  getAll: async () => {
    const { rows } = await db.query('SELECT * FROM contractors ORDER BY id DESC');
    return rows;
  },
  getById: async (id) => {
    const { rows } = await db.query('SELECT * FROM contractors WHERE id = $1', [id]);
    return rows[0];
  },
  create: async (contractor) => {
    const { name, phone, email, address } = contractor;
    const { rows } = await db.query(
      'INSERT INTO contractors (name, phone, email, address) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, phone, email, address]
    );
    return rows[0];
  },
};

module.exports = Contractor;
