const db = require('../config/db');

const insertSchedules = async (client, billId, schedules, createdBy) => {
  for (const s of schedules) {
    await client.query(
      `INSERT INTO client_bill_schedules
         (bill_id, installment_label, percentage, expected_amount, due_date, remarks, created_by, updated_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $7, NOW())`,
      [billId, s.installment_label, s.percentage || null, s.expected_amount, s.due_date || null, s.remarks || null, createdBy]
    );
  }
};

const ClientBill = {
  getAll: async (clientId = null) => {
    let queryText = `
      SELECT cb.*, c.name as client_name, po.po_number, p.name as project_name
      FROM client_bills cb
      LEFT JOIN clients c ON cb.client_id = c.id
      LEFT JOIN client_pos po ON cb.po_id = po.id
      LEFT JOIN projects p ON cb.project_id = p.id
    `;
    const params = [];
    if (clientId) {
      queryText += ` WHERE cb.client_id = $1 AND cb.deleted = false AND c.deleted IS NOT TRUE AND po.deleted IS NOT TRUE AND p.deleted IS NOT TRUE`;
      params.push(clientId);
    } else {
      queryText += ` WHERE cb.deleted = false AND c.deleted IS NOT TRUE AND po.deleted IS NOT TRUE AND p.deleted IS NOT TRUE`;
    }
    queryText += ` ORDER BY cb.created_at DESC`;

    const { rows } = await db.query(queryText, params);
    return rows;
  },

  getPaginated: async ({ clientId, limit, offset, search, sortField, sortOrder }) => {
    let queryText = `
      SELECT cb.*, c.name as client_name, po.po_number, p.name as project_name
      FROM client_bills cb
      LEFT JOIN clients c ON cb.client_id = c.id
      LEFT JOIN client_pos po ON cb.po_id = po.id
      LEFT JOIN projects p ON cb.project_id = p.id
      WHERE cb.deleted = false AND c.deleted IS NOT TRUE AND po.deleted IS NOT TRUE AND p.deleted IS NOT TRUE
    `;
    const params = [];
    let paramCount = 0;

    if (clientId) {
      paramCount++;
      queryText += ` AND cb.client_id = $${paramCount}`;
      params.push(clientId);
    }

    if (search) {
      paramCount++;
      queryText += ` AND (
        cb.bill_number ILIKE $${paramCount} OR
        c.name ILIKE $${paramCount} OR
        po.po_number ILIKE $${paramCount} OR
        cb.area ILIKE $${paramCount} OR
        CAST(cb.net_payable AS TEXT) ILIKE $${paramCount}
      )`;
      params.push(`%${search}%`);
    }

    const countQueryText = `SELECT COUNT(*) FROM (${queryText}) AS temp`;
    const countResult = await db.query(countQueryText, params);
    const total = parseInt(countResult.rows[0].count, 10);

    const allowedSortFields = {
      'bill_number': 'cb.bill_number',
      'client_name': 'c.name',
      'po_number': 'po.po_number',
      'bill_date': 'cb.bill_date',
      'gross_amount': 'cb.gross_amount',
      'net_payable': 'cb.net_payable',
      'created_at': 'cb.created_at'
    };

    const dbSortField = allowedSortFields[sortField] || 'cb.created_at';
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

  getById: async (id) => {
    const { rows } = await db.query('SELECT * FROM client_bills WHERE id = $1 AND deleted = false', [id]);
    return rows[0];
  },

  // Bill header + its full milestone split are created together in one transaction —
  // the deferred trg_client_bill_schedules_validate_total trigger only checks that
  // SUM(expected_amount) == net_payable once, at COMMIT.
  create: async (billData, createdBy) => {
    const { client_id, po_id, project_id, bill_number, gross_amount, advance_deduction, bill_date, area, remarks, schedules } = billData;
    const netPayable = Number(gross_amount) - Number(advance_deduction || 0);
    const client = await db.getClient();

    try {
      await client.query('BEGIN');

      const insertQuery = `
        INSERT INTO client_bills
          (client_id, po_id, project_id, bill_number, gross_amount, advance_deduction, net_payable, bill_date, area, remarks, created_by, updated_by, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11, NOW())
        RETURNING *
      `;
      const { rows } = await client.query(insertQuery, [
        client_id,
        po_id || null,
        project_id || null,
        bill_number || null,
        gross_amount,
        advance_deduction || 0,
        netPayable,
        bill_date || new Date(),
        area || null,
        remarks || null,
        createdBy
      ]);

      await insertSchedules(client, rows[0].id, schedules, createdBy);

      await client.query('COMMIT');
      return rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  // Once a payment has been recorded against a bill, its billed amounts and milestone
  // split are locked — only header/reference fields stay editable. Callers must check
  // hasPayments (via ClientBill.paymentCount) before deciding whether to pass `schedules`.
  update: async (id, billData, updatedBy, { locked }) => {
    const { po_id, project_id, bill_number, gross_amount, advance_deduction, bill_date, area, remarks, schedules } = billData;
    const client = await db.getClient();

    try {
      await client.query('BEGIN');

      let rows;
      if (!locked && Array.isArray(schedules)) {
        const netPayable = Number(gross_amount) - Number(advance_deduction || 0);

        ({ rows } = await client.query(
          `UPDATE client_bills
           SET po_id = $1, project_id = $2, bill_number = $3, gross_amount = $4, advance_deduction = $5,
               net_payable = $6, bill_date = $7, area = $8, remarks = $9, updated_by = $10, updated_at = NOW()
           WHERE id = $11 AND deleted = false
           RETURNING *`,
          [po_id || null, project_id || null, bill_number || null, gross_amount, advance_deduction || 0,
            netPayable, bill_date || new Date(), area || null, remarks || null, updatedBy, id]
        ));

        if (rows[0]) {
          await client.query(
            'UPDATE client_bill_schedules SET deleted = true, updated_by = $1, updated_at = NOW() WHERE bill_id = $2 AND deleted = false',
            [updatedBy, id]
          );
          await insertSchedules(client, id, schedules, updatedBy);
        }
      } else {
        ({ rows } = await client.query(
          `UPDATE client_bills
           SET po_id = $1, project_id = $2, bill_number = $3, bill_date = $4, area = $5, remarks = $6, updated_by = $7, updated_at = NOW()
           WHERE id = $8 AND deleted = false
           RETURNING *`,
          [po_id || null, project_id || null, bill_number || null, bill_date || new Date(), area || null, remarks || null, updatedBy, id]
        ));
      }

      await client.query('COMMIT');
      return rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  delete: async (id) => {
    const { rows } = await db.query('UPDATE client_bills SET deleted = true WHERE id = $1 RETURNING *', [id]);
    return rows[0];
  },

  paymentCount: async (id) => {
    const { rows } = await db.query(
      'SELECT COUNT(*) FROM client_payments WHERE bill_id = $1 AND deleted = false',
      [id]
    );
    return parseInt(rows[0].count, 10);
  }
};

module.exports = ClientBill;
