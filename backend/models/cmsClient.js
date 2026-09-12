const db = require('../config/db');

const CmsClient = {
  getAllActive: async () => {
    const { rows } = await db.query(
      `SELECT * FROM cms_clients WHERE is_active = true AND deleted = false ORDER BY display_order ASC, created_at DESC`
    );
    return rows;
  },

  getPaginated: async ({ limit, offset, search, sortField, sortOrder }) => {
    let queryText = `SELECT * FROM cms_clients WHERE deleted = false`;
    const params = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      queryText += ` AND name ILIKE $${paramCount}`;
      params.push(`%${search}%`);
    }

    const countQueryText = `SELECT COUNT(*) FROM (${queryText}) AS temp`;
    const countResult = await db.query(countQueryText, params);
    const total = parseInt(countResult.rows[0].count, 10);

    const allowedSortFields = {
      name: 'name',
      display_order: 'display_order',
      is_active: 'is_active',
      created_at: 'created_at'
    };

    const dbSortField = allowedSortFields[sortField] || 'display_order';
    const dbSortOrder = sortOrder === 'desc' ? 'DESC' : 'ASC';

    queryText += ` ORDER BY ${dbSortField} ${dbSortOrder}, created_at DESC`;

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
    const { rows } = await db.query('SELECT * FROM cms_clients WHERE id = $1 AND deleted = false', [id]);
    return rows[0];
  },

  getActiveById: async (id) => {
    const { rows } = await db.query(
      'SELECT * FROM cms_clients WHERE id = $1 AND is_active = true AND deleted = false',
      [id]
    );
    return rows[0];
  },

  create: async (client, createdBy) => {
    const { name, short_description, detailed_description, display_order } = client;
    const { rows } = await db.query(
      `INSERT INTO cms_clients (name, short_description, detailed_description, display_order, created_by, updated_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $5, NOW())
       RETURNING *`,
      [name, short_description || null, detailed_description || null, display_order || 0, createdBy]
    );
    return rows[0];
  },

  update: async (id, client, updatedBy) => {
    const { name, short_description, detailed_description, display_order } = client;
    const { rows } = await db.query(
      `UPDATE cms_clients
       SET name = $1, short_description = $2, detailed_description = $3, display_order = $4, updated_by = $5, updated_at = NOW()
       WHERE id = $6 AND deleted = false
       RETURNING *`,
      [name, short_description || null, detailed_description || null, display_order || 0, updatedBy, id]
    );
    return rows[0];
  },

  updateLogo: async (id, logoPath, updatedBy) => {
    const { rows } = await db.query(
      `UPDATE cms_clients SET logo_path = $1, updated_by = $2, updated_at = NOW() WHERE id = $3 AND deleted = false RETURNING *`,
      [logoPath, updatedBy, id]
    );
    return rows[0];
  },

  setActive: async (id, isActive, updatedBy) => {
    const { rows } = await db.query(
      `UPDATE cms_clients SET is_active = $1, updated_by = $2, updated_at = NOW() WHERE id = $3 AND deleted = false RETURNING *`,
      [isActive, updatedBy, id]
    );
    return rows[0];
  },

  delete: async (id) => {
    const { rows } = await db.query('UPDATE cms_clients SET deleted = true WHERE id = $1 RETURNING *', [id]);
    return rows[0];
  }
};

module.exports = CmsClient;
