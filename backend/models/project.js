const db = require('../config/db');

const Project = {
  getAll: async () => {
    const { rows } = await db.query(`
      SELECT p.*, c.name as contractor_name
      FROM projects p
      LEFT JOIN contractors c ON p.contractor_id = c.id
      WHERE p.deleted = false AND c.deleted IS NOT TRUE
      ORDER BY p.created_at DESC
    `);
    return rows;
  },

  getPaginated: async ({ limit, offset, search, sortField, sortOrder }) => {
    let queryText = `
      SELECT p.*, c.name as contractor_name
      FROM projects p
      LEFT JOIN contractors c ON p.contractor_id = c.id
      WHERE p.deleted = false AND c.deleted IS NOT TRUE
    `;
    const params = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      queryText += ` AND (
        p.name ILIKE $${paramCount} OR 
        c.name ILIKE $${paramCount} OR 
        p.status ILIKE $${paramCount} OR 
        p.description ILIKE $${paramCount}
      )`;
      params.push(`%${search}%`);
    }

    const countQueryText = `SELECT COUNT(*) FROM (${queryText}) AS temp`;
    const countResult = await db.query(countQueryText, params);
    const total = parseInt(countResult.rows[0].count, 10);

    const allowedSortFields = {
      'name': 'p.name',
      'contractor_name': 'c.name',
      'start_date': 'p.start_date',
      'end_date': 'p.end_date',
      'status': 'p.status',
      'created_at': 'p.created_at'
    };
    
    const dbSortField = allowedSortFields[sortField] || 'p.created_at';
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
  },

  getById: async (id) => {
    const { rows } = await db.query('SELECT * FROM projects WHERE id = $1 AND deleted = false', [id]);
    return rows[0];
  },

  create: async (projectData, createdBy) => {
    const { name, description, contractor_id, start_date, end_date, status } = projectData;
    const { rows } = await db.query(
      `INSERT INTO projects (name, description, contractor_id, start_date, end_date, status, created_by, updated_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $7, NOW())
       RETURNING *`,
      [name, description, contractor_id, start_date || null, end_date || null, status || 'Planned', createdBy]
    );
    return rows[0];
  },

  update: async (id, projectData, updatedBy) => {
    const { name, description, contractor_id, start_date, end_date, status } = projectData;
    const { rows } = await db.query(
      `UPDATE projects
       SET name = $1, description = $2, contractor_id = $3, start_date = $4, end_date = $5, status = $6, updated_by = $7, updated_at = NOW()
       WHERE id = $8 AND deleted = false
       RETURNING *`,
      [name, description, contractor_id, start_date || null, end_date || null, status || 'Planned', updatedBy, id]
    );
    return rows[0];
  },

  delete: async (id) => {
    const { rows } = await db.query(
      'UPDATE projects SET deleted = true WHERE id = $1 RETURNING *',
      [id]
    );
    return rows[0];
  }
};

module.exports = Project;
