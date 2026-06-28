const db = require('../config/db');

const Payment = {
  getAll: async () => {
    const { rows } = await db.query(`
      SELECT p.*, c.name as contractor_name, b.invoice_number as bill_invoice
      FROM payments p
      LEFT JOIN contractors c ON p.contractor_id = c.id
      LEFT JOIN bills b ON p.bill_id = b.id
      ORDER BY p.id DESC
    `);
    return rows;
  },

  create: async (paymentData) => {
    const { contractor_id, bill_id, amount, payment_date } = paymentData;
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');
      
      const insertQuery = `
        INSERT INTO payments (contractor_id, bill_id, amount, payment_date)
        VALUES ($1, $2, $3, $4)
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
