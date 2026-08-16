const db = require('../config/db');

const Contractor = {
  getAll: async () => {
    const { rows } = await db.query('SELECT * FROM contractors WHERE deleted = false ORDER BY created_at DESC');
    return rows;
  },
  getPaginated: async ({ limit, offset, search, sortField, sortOrder }) => {
    let queryText = `
      SELECT * FROM contractors
      WHERE deleted = false
    `;
    const params = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      queryText += ` AND (
        name ILIKE $${paramCount} OR 
        phone ILIKE $${paramCount} OR 
        email ILIKE $${paramCount} OR 
        address ILIKE $${paramCount}
      )`;
      params.push(`%${search}%`);
    }

    const countQueryText = `SELECT COUNT(*) FROM (${queryText}) AS temp`;
    const countResult = await db.query(countQueryText, params);
    const total = parseInt(countResult.rows[0].count, 10);

    const allowedSortFields = {
      'name': 'name',
      'email': 'email',
      'phone': 'phone',
      'address': 'address',
      'total_bills': 'total_bills',
      'total_payments': 'total_payments',
      'balance': 'balance',
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
