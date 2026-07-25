const db = require('../config/db');

const Project = {
  getAll: async () => {
    const { rows } = await db.query(`
      SELECT p.*, c.name as contractor_name
      FROM projects p
      LEFT JOIN contractors c ON p.contractor_id = c.id
      ORDER BY p.id DESC
    `);
    return rows;
  },

  getById: async (id) => {
    const { rows } = await db.query('SELECT * FROM projects WHERE id = $1', [id]);
    return rows[0];
  },

  create: async (projectData) => {
    const { name, description, contractor_id, start_date, end_date, status } = projectData;
    const { rows } = await db.query(
      `INSERT INTO projects (name, description, contractor_id, start_date, end_date, status, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, NOW()) 
       RETURNING *`,
      [name, description, contractor_id, start_date || null, end_date || null, status || 'Planned']
    );
    return rows[0];
  }
};

module.exports = Project;
