const db = require('../config/db');

const ClientPO = {
  getAll: async (clientId = null) => {
    let queryText = `
      SELECT po.*, c.name as client_name
      FROM client_pos po
      LEFT JOIN clients c ON po.client_id = c.id
    `;
    const params = [];
    if (clientId) {
      queryText += ` WHERE po.client_id = $1 AND po.deleted = false AND c.deleted IS NOT TRUE`;
      params.push(clientId);
    } else {
      queryText += ` WHERE po.deleted = false AND c.deleted IS NOT TRUE`;
    }
    queryText += ` ORDER BY po.created_at DESC`;

    const { rows } = await db.query(queryText, params);
    return rows;
  },

  getPaginated: async ({ clientId, limit, offset, search, sortField, sortOrder }) => {
    let queryText = `
      SELECT po.*, c.name as client_name
      FROM client_pos po
      LEFT JOIN clients c ON po.client_id = c.id
      WHERE po.deleted = false AND c.deleted IS NOT TRUE
    `;
    const params = [];
    let paramCount = 0;

    if (clientId) {
      paramCount++;
      queryText += ` AND po.client_id = $${paramCount}`;
      params.push(clientId);
    }

    if (search) {
      paramCount++;
      queryText += ` AND (
        po.po_number ILIKE $${paramCount} OR
        c.name ILIKE $${paramCount} OR
        CAST(po.po_amount AS TEXT) ILIKE $${paramCount}
      )`;
      params.push(`%${search}%`);
    }

    const countQueryText = `SELECT COUNT(*) FROM (${queryText}) AS temp`;
    const countResult = await db.query(countQueryText, params);
    const total = parseInt(countResult.rows[0].count, 10);

    const allowedSortFields = {
      'po_number': 'po.po_number',
      'client_name': 'c.name',
      'po_date': 'po.po_date',
      'po_amount': 'po.po_amount',
      'created_at': 'po.created_at'
    };

    const dbSortField = allowedSortFields[sortField] || 'po.created_at';
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

  create: async (poData, createdBy) => {
    const { client_id, po_number, po_date, po_amount, description } = poData;
    const { rows } = await db.query(
      `INSERT INTO client_pos (client_id, po_number, po_date, po_amount, description, created_by, updated_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $6, NOW())
       RETURNING *`,
      [client_id, po_number, po_date || null, po_amount || null, description || null, createdBy]
    );
    return rows[0];
  },

  update: async (id, poData, updatedBy) => {
    const { client_id, po_number, po_date, po_amount, description } = poData;
    const { rows } = await db.query(
      `UPDATE client_pos
       SET client_id = $1, po_number = $2, po_date = $3, po_amount = $4, description = $5, updated_by = $6, updated_at = NOW()
       WHERE id = $7 AND deleted = false
       RETURNING *`,
      [client_id, po_number, po_date || null, po_amount || null, description || null, updatedBy, id]
    );
    return rows[0];
  },

  delete: async (id) => {
    const { rows } = await db.query('UPDATE client_pos SET deleted = true WHERE id = $1 RETURNING *', [id]);
    return rows[0];
  }
};

module.exports = ClientPO;
