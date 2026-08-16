const db = require('../config/db');

const Payment = {
  getAll: async (contractorId = null) => {
    let queryText = `
      SELECT p.*, c.name as contractor_name, b.invoice_number as bill_invoice, pr.name as project_name
      FROM payments p
      LEFT JOIN contractors c ON p.contractor_id = c.id
      LEFT JOIN bills b ON p.bill_id = b.id
      LEFT JOIN projects pr ON p.project_id = pr.id
    `;
    const params = [];
    if (contractorId) {
      queryText += ` WHERE p.contractor_id = $1 AND p.deleted = false`;
      params.push(contractorId);
    } else {
      queryText += ` WHERE p.deleted = false`;
    }
    queryText += ` ORDER BY p.created_at DESC`;

    const { rows } = await db.query(queryText, params);
    return rows;
  },

  getPaginated: async ({ contractorId, limit, offset, search, sortField, sortOrder }) => {
    let queryText = `
      SELECT p.*, c.name as contractor_name, b.invoice_number as bill_invoice, pr.name as project_name
      FROM payments p
      LEFT JOIN contractors c ON p.contractor_id = c.id
      LEFT JOIN bills b ON p.bill_id = b.id
      LEFT JOIN projects pr ON p.project_id = pr.id
      WHERE p.deleted = false
    `;
    const params = [];
    let paramCount = 0;

    if (contractorId) {
      paramCount++;
      queryText += ` AND p.contractor_id = $${paramCount}`;
      params.push(contractorId);
    }

    if (search) {
      paramCount++;
      queryText += ` AND (
        CAST(p.id AS TEXT) ILIKE $${paramCount} OR
        c.name ILIKE $${paramCount} OR 
        pr.name ILIKE $${paramCount} OR 
        b.invoice_number ILIKE $${paramCount} OR
        CAST(p.amount AS TEXT) ILIKE $${paramCount}
      )`;
      params.push(`%${search}%`);
    }

    const countQueryText = `SELECT COUNT(*) FROM (${queryText}) AS temp`;
    const countResult = await db.query(countQueryText, params);
    const total = parseInt(countResult.rows[0].count, 10);

    const allowedSortFields = {
      'id': 'p.id',
      'contractor_name': 'c.name',
      'project_name': 'pr.name',
      'bill_invoice': 'b.invoice_number',
      'payment_date': 'p.payment_date',
      'amount': 'p.amount',
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

  create: async (paymentData, createdBy) => {
    const { contractor_id, project_id, bill_id, amount, payment_date } = paymentData;
    const client = await db.getClient();

    try {
      await client.query('BEGIN');

      const insertQuery = `
        INSERT INTO payments (contractor_id, project_id, bill_id, amount, payment_date, created_by, updated_by, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $6, NOW())
        RETURNING *
      `;
      const { rows } = await client.query(insertQuery, [
        contractor_id,
        project_id || null,
        bill_id || null,
        amount,
        payment_date || new Date(),
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

  update: async (id, paymentData, updatedBy) => {
    const { contractor_id, project_id, bill_id, amount, payment_date } = paymentData;
    const { rows } = await db.query(
      `UPDATE payments
       SET contractor_id = $1, project_id = $2, bill_id = $3, amount = $4, payment_date = $5, updated_by = $6, updated_at = NOW()
       WHERE id = $7 AND deleted = false
       RETURNING *`,
      [contractor_id, project_id || null, bill_id || null, amount, payment_date || new Date(), updatedBy, id]
    );
    return rows[0];
  },

  delete: async (id) => {
    const { rows } = await db.query(
      'UPDATE payments SET deleted = true WHERE id = $1 RETURNING *',
      [id]
    );
    return rows[0];
  }
};

module.exports = Payment;
