const db = require('../config/db');

const Payment = {
  getAll: async (contractorId = null) => {
    let queryText = `
      SELECT p.*, c.name as contractor_name, b.invoice_number as bill_invoice
      FROM payments p
      LEFT JOIN contractors c ON p.contractor_id = c.id
      LEFT JOIN bills b ON p.bill_id = b.id
    `;
    const params = [];
    if (contractorId) {
      queryText += ` WHERE p.contractor_id = $1 AND p.deleted = false`;
      params.push(contractorId);
    } else {
      queryText += ` WHERE p.deleted = false`;
    }
    queryText += ` ORDER BY p.id DESC`;

    const { rows } = await db.query(queryText, params);
    return rows;
  },

  create: async (paymentData) => {
    const { contractor_id, bill_id, amount, payment_date } = paymentData;
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');
      
      const insertQuery = `
        INSERT INTO payments (contractor_id, bill_id, amount, payment_date, created_at)
        VALUES ($1, $2, $3, $4, NOW())
        RETURNING *
      `;
      const { rows } = await client.query(insertQuery, [
        contractor_id,
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
  }
};

module.exports = Payment;
