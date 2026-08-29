const db = require('../config/db');

const ClientPayment = {
  getAll: async (clientId = null) => {
    let queryText = `
      SELECT cp.*, c.name as client_name, cb.bill_number, s.installment_label
      FROM client_payments cp
      LEFT JOIN clients c ON cp.client_id = c.id
      LEFT JOIN client_bills cb ON cp.bill_id = cb.id
      LEFT JOIN client_bill_schedules s ON cp.schedule_id = s.id
    `;
    const params = [];
    if (clientId) {
      queryText += ` WHERE cp.client_id = $1 AND cp.deleted = false AND c.deleted IS NOT TRUE AND cb.deleted IS NOT TRUE AND s.deleted IS NOT TRUE`;
      params.push(clientId);
    } else {
      queryText += ` WHERE cp.deleted = false AND c.deleted IS NOT TRUE AND cb.deleted IS NOT TRUE AND s.deleted IS NOT TRUE`;
    }
    queryText += ` ORDER BY cp.created_at DESC`;

    const { rows } = await db.query(queryText, params);
    return rows;
  },

  getPaginated: async ({ clientId, limit, offset, search, sortField, sortOrder }) => {
    let queryText = `
      SELECT cp.*, c.name as client_name, cb.bill_number, s.installment_label
      FROM client_payments cp
      LEFT JOIN clients c ON cp.client_id = c.id
      LEFT JOIN client_bills cb ON cp.bill_id = cb.id
      LEFT JOIN client_bill_schedules s ON cp.schedule_id = s.id
      WHERE cp.deleted = false AND c.deleted IS NOT TRUE AND cb.deleted IS NOT TRUE AND s.deleted IS NOT TRUE
    `;
    const params = [];
    let paramCount = 0;

    if (clientId) {
      paramCount++;
      queryText += ` AND cp.client_id = $${paramCount}`;
      params.push(clientId);
    }

    if (search) {
      paramCount++;
      queryText += ` AND (
        CAST(cp.id AS TEXT) ILIKE $${paramCount} OR
        c.name ILIKE $${paramCount} OR
        cb.bill_number ILIKE $${paramCount} OR
        cp.bank_name ILIKE $${paramCount} OR
        cp.advice_reference_number ILIKE $${paramCount} OR
        CAST(cp.amount AS TEXT) ILIKE $${paramCount}
      )`;
      params.push(`%${search}%`);
    }

    const countQueryText = `SELECT COUNT(*) FROM (${queryText}) AS temp`;
    const countResult = await db.query(countQueryText, params);
    const total = parseInt(countResult.rows[0].count, 10);

    const allowedSortFields = {
      'id': 'cp.id',
      'client_name': 'c.name',
      'bill_number': 'cb.bill_number',
      'bank_name': 'cp.bank_name',
      'advice_reference_number': 'cp.advice_reference_number',
      'payment_date': 'cp.payment_date',
      'amount': 'cp.amount',
      'created_at': 'cp.created_at'
    };

    const dbSortField = allowedSortFields[sortField] || 'cp.created_at';
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
    const { client_id, bill_id, schedule_id, amount, payment_date, bank_name, advice_reference_number, remarks } = paymentData;
    const client = await db.getClient();

    try {
      await client.query('BEGIN');

      const insertQuery = `
        INSERT INTO client_payments
          (client_id, bill_id, schedule_id, amount, payment_date, bank_name, advice_reference_number, remarks, created_by, updated_by, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9, NOW())
        RETURNING *
      `;
      const { rows } = await client.query(insertQuery, [
        client_id,
        bill_id,
        schedule_id || null,
        amount,
        payment_date || new Date(),
        bank_name || null,
        advice_reference_number || null,
        remarks || null,
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
    const { client_id, bill_id, schedule_id, amount, payment_date, bank_name, advice_reference_number, remarks } = paymentData;
    const { rows } = await db.query(
      `UPDATE client_payments
       SET client_id = $1, bill_id = $2, schedule_id = $3, amount = $4, payment_date = $5,
           bank_name = $6, advice_reference_number = $7, remarks = $8, updated_by = $9, updated_at = NOW()
       WHERE id = $10 AND deleted = false
       RETURNING *`,
      [client_id, bill_id, schedule_id || null, amount, payment_date || new Date(), bank_name || null, advice_reference_number || null, remarks || null, updatedBy, id]
    );
    return rows[0];
  },

  delete: async (id) => {
    const { rows } = await db.query('UPDATE client_payments SET deleted = true WHERE id = $1 RETURNING *', [id]);
    return rows[0];
  }
};

module.exports = ClientPayment;
