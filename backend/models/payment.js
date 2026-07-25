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

  create: async (paymentData) => {
    const { contractor_id, project_id, bill_id, amount, payment_date } = paymentData;
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');
      
      const insertQuery = `
        INSERT INTO payments (contractor_id, project_id, bill_id, amount, payment_date, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        RETURNING *
      `;
      const { rows } = await client.query(insertQuery, [
        contractor_id,
        project_id || null,
        bill_id || null,
        amount,
        payment_date || new Date()
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

  update: async (id, paymentData) => {
    const { contractor_id, project_id, bill_id, amount, payment_date } = paymentData;
    const { rows } = await db.query(
      `UPDATE payments
       SET contractor_id = $1, project_id = $2, bill_id = $3, amount = $4, payment_date = $5, updated_at = NOW()
       WHERE id = $6 AND deleted = false
       RETURNING *`,
      [contractor_id, project_id || null, bill_id || null, amount, payment_date || new Date(), id]
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
