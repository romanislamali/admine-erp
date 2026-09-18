const db = require('../config/db');

const ClientBillSchedule = {
  getAll: async (billId = null) => {
    let queryText = `
      SELECT s.*, cb.bill_number, cb.client_id
      FROM client_bill_schedules s
      LEFT JOIN client_bills cb ON s.bill_id = cb.id
    `;
    const params = [];
    if (billId) {
      queryText += ` WHERE s.bill_id = $1 AND s.deleted = false AND cb.deleted IS NOT TRUE`;
      params.push(billId);
    } else {
      queryText += ` WHERE s.deleted = false AND cb.deleted IS NOT TRUE`;
    }
    queryText += ` ORDER BY s.sequence_number ASC NULLS LAST, s.created_at ASC`;

    const { rows } = await db.query(queryText, params);
    return rows;
  },

  getById: async (id) => {
    const { rows } = await db.query('SELECT * FROM client_bill_schedules WHERE id = $1 AND deleted = false', [id]);
    return rows[0];
  },

  // The milestone row IS the payment record (single-shot receipt) — this fills in the
  // receipt fields directly. Triggers cascade the client/status updates within the
  // same statement, so no explicit transaction is needed here.
  recordReceipt: async (id, receiptData, updatedBy) => {
    const { received_amount, deduction_amount, payment_date, bank_name, advice_reference_number, check_no, check_date, remarks } = receiptData;
    const { rows } = await db.query(
      `UPDATE client_bill_schedules
       SET received_amount = $1, deduction_amount = $2, payment_date = $3, bank_name = $4,
           advice_reference_number = $5, check_no = $6, check_date = $7, remarks = $8, updated_by = $9, updated_at = NOW()
       WHERE id = $10 AND deleted = false
       RETURNING *`,
      [received_amount || 0, deduction_amount || 0, payment_date || null, bank_name || null,
        advice_reference_number || null, check_no || null, check_date || null, remarks || null, updatedBy, id]
    );
    return rows[0];
  }
};

module.exports = ClientBillSchedule;
