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
      queryText += ` WHERE b.contractor_id = $1 AND b.deleted = false`;
      params.push(contractorId);
    } else {
      queryText += ` WHERE b.deleted = false`;
    }
    queryText += ` ORDER BY b.id DESC`;

    const { rows } = await db.query(queryText, params);
    return rows;
  },
  
  create: async (billData) => {
    const { contractor_id, project_id, amount, invoice_number, bill_date } = billData;
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');
      
      const insertQuery = `
        INSERT INTO bills (contractor_id, project_id, amount, invoice_number, bill_date, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        RETURNING *
      `;
      const { rows } = await client.query(insertQuery, [
        contractor_id,
        project_id || null,
        amount,
        invoice_number,
        bill_date || new Date()
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

module.exports = Bill;
