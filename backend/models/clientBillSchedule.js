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
    queryText += ` ORDER BY s.due_date ASC NULLS LAST, s.created_at ASC`;

    const { rows } = await db.query(queryText, params);
    return rows;
  },

  // Only a DUE installment can be manually approved (a pre-payment sign-off step).
  // PAID is only ever set by the trg_fn_set_schedule_status trigger on full receipt.
  approve: async (id, updatedBy) => {
    const { rows } = await db.query(
      `UPDATE client_bill_schedules
       SET status = 'APPROVED', updated_by = $1, updated_at = NOW()
       WHERE id = $2 AND deleted = false AND status = 'DUE'
       RETURNING *`,
      [updatedBy, id]
    );
    return rows[0];
  }
};

module.exports = ClientBillSchedule;
