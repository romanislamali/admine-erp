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
  }
};

module.exports = ClientBillSchedule;
