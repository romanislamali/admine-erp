const db = require('../config/db');

const Bill = {
  getAll: async (contractorId = null) => {
    let queryText = `
      SELECT b.*, c.name as contractor_name, p.name as project_name
      FROM bills b
      LEFT JOIN contractors c ON b.contractor_id = c.id
      LEFT JOIN projects p ON b.project_id = p.id
    `;
    const params = [];
    if (contractorId) {
      queryText += ` WHERE b.contractor_id = $1 AND b.deleted = false AND c.deleted IS NOT TRUE AND p.deleted IS NOT TRUE`;
      params.push(contractorId);
    } else {
      queryText += ` WHERE b.deleted = false AND c.deleted IS NOT TRUE AND p.deleted IS NOT TRUE`;
    }
    queryText += ` ORDER BY b.created_at DESC`;

    const { rows } = await db.query(queryText, params);
    return rows;
  },

  getPaginated: async ({ contractorId, limit, offset, search, sortField, sortOrder }) => {
    let queryText = `
      SELECT b.*, c.name as contractor_name, p.name as project_name
      FROM bills b
      LEFT JOIN contractors c ON b.contractor_id = c.id
      LEFT JOIN projects p ON b.project_id = p.id
      WHERE b.deleted = false AND c.deleted IS NOT TRUE AND p.deleted IS NOT TRUE
    `;
    const params = [];
    let paramCount = 0;

    if (contractorId) {
      paramCount++;
      queryText += ` AND b.contractor_id = $${paramCount}`;
      params.push(contractorId);
    }

    if (search) {
      paramCount++;
      queryText += ` AND (
        b.invoice_number ILIKE $${paramCount} OR 
        c.name ILIKE $${paramCount} OR 
        p.name ILIKE $${paramCount} OR 
        CAST(b.amount AS TEXT) ILIKE $${paramCount}
      )`;
      params.push(`%${search}%`);
    }

    const countQueryText = `SELECT COUNT(*) FROM (${queryText}) AS temp`;
    const countResult = await db.query(countQueryText, params);
    const total = parseInt(countResult.rows[0].count, 10);

    const allowedSortFields = {
      'invoice_number': 'b.invoice_number',
      'contractor_name': 'c.name',
      'project_name': 'p.name',
      'bill_date': 'b.bill_date',
      'amount': 'b.amount',
      'created_at': 'b.created_at'
    };
    
    const dbSortField = allowedSortFields[sortField] || 'b.created_at';
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
  
  create: async (billData, createdBy) => {
    const { contractor_id, project_id, amount, invoice_number, bill_date } = billData;
    const client = await db.getClient();

    try {
      await client.query('BEGIN');

      const insertQuery = `
        INSERT INTO bills (contractor_id, project_id, amount, invoice_number, bill_date, created_by, updated_by, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $6, NOW())
        RETURNING *
      `;
      const { rows } = await client.query(insertQuery, [
        contractor_id,
        project_id || null,
        amount,
        invoice_number,
        bill_date || new Date(),
        createdBy
      ]);
      
      await client.query('COMMIT');
      return rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  update: async (id, billData, updatedBy) => {
    const { contractor_id, project_id, amount, invoice_number, bill_date } = billData;
    const { rows } = await db.query(
      `UPDATE bills
       SET contractor_id = $1, project_id = $2, amount = $3, invoice_number = $4, bill_date = $5, updated_by = $6, updated_at = NOW()
       WHERE id = $7 AND deleted = false
       RETURNING *`,
      [contractor_id, project_id || null, amount, invoice_number, bill_date || new Date(), updatedBy, id]
    );
    return rows[0];
  },

  delete: async (id) => {
    const { rows } = await db.query(
      'UPDATE bills SET deleted = true WHERE id = $1 RETURNING *',
      [id]
    );
    return rows[0];
  }
};

module.exports = Bill;
