const ClientBill = require('../models/clientBill');
const logger = require('../utils/logger');

// Amounts arrive from the client as strings/floats; tolerate cent-level rounding
// rather than demanding an exact float match.
const AMOUNT_TOLERANCE = 0.01;

const validateSchedules = (grossAmount, advanceDeduction, schedules) => {
  if (!Array.isArray(schedules) || schedules.length === 0) {
    return 'At least one milestone/installment is required';
  }
  for (const s of schedules) {
    if (!s.installment_label || s.expected_amount === undefined || s.expected_amount === null || isNaN(s.expected_amount) || Number(s.expected_amount) <= 0) {
      return 'Each installment needs a label and a positive expected amount';
    }
  }
  const netPayable = Number(grossAmount) - Number(advanceDeduction || 0);
  const scheduleTotal = schedules.reduce((sum, s) => sum + Number(s.expected_amount), 0);
  if (Math.abs(scheduleTotal - netPayable) > AMOUNT_TOLERANCE) {
    return `Milestone split totals ${scheduleTotal.toFixed(2)} but net payable is ${netPayable.toFixed(2)} — splits must sum to the net payable amount`;
  }
  return null;
};

const getAllClientBills = async (req, res) => {
  try {
    const { client_id, page, limit, search, sortField, sortOrder } = req.query;
    if (page && limit) {
      const pageNum = parseInt(page, 10) || 1;
      const limitNum = parseInt(limit, 10) || 10;
      const offsetNum = (pageNum - 1) * limitNum;

      const { rows, total } = await ClientBill.getPaginated({
        clientId: client_id || null,
        limit: limitNum,
        offset: offsetNum,
        search: search || '',
        sortField: sortField || 'created_at',
        sortOrder: sortOrder || 'desc'
      });
      return res.json({ data: rows, total });
    }
    const bills = await ClientBill.getAll(client_id || null);
    res.json(bills);
  } catch (error) {
    logger.error('Failed to fetch client bills', error);
    res.status(500).json({ message: error.message });
  }
};

const createClientBill = async (req, res) => {
  try {
    const { client_id, gross_amount, advance_deduction, schedules } = req.body;
    if (!client_id || !gross_amount || isNaN(gross_amount) || Number(gross_amount) <= 0) {
      return res.status(400).json({ message: 'Client ID and a positive numeric gross amount are required' });
    }
    const scheduleError = validateSchedules(gross_amount, advance_deduction, schedules);
    if (scheduleError) {
      return res.status(400).json({ message: scheduleError });
    }
    const bill = await ClientBill.create(req.body, req.user.name);
    res.status(201).json(bill);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ message: 'This bill number already exists for this client' });
    }
    logger.error('Failed to create client bill', error);
    res.status(500).json({ message: error.message });
  }
};

const updateClientBill = async (req, res) => {
  try {
    const { id } = req.params;
    const { gross_amount, advance_deduction, schedules } = req.body;

    const paidCount = await ClientBill.paymentCount(id);
    const locked = paidCount > 0;

    if (!locked && Array.isArray(schedules)) {
      if (!gross_amount || isNaN(gross_amount) || Number(gross_amount) <= 0) {
        return res.status(400).json({ message: 'A positive numeric gross amount is required' });
      }
      const scheduleError = validateSchedules(gross_amount, advance_deduction, schedules);
      if (scheduleError) {
        return res.status(400).json({ message: scheduleError });
      }
    } else if (locked && schedules) {
      return res.status(400).json({
        message: 'This bill already has payments recorded against it — billed amount and milestone split are locked'
      });
    }

    const bill = await ClientBill.update(id, req.body, req.user.name, { locked });
    if (!bill) return res.status(404).json({ message: 'Bill not found' });
    res.json(bill);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ message: 'This bill number already exists for this client' });
    }
    logger.error(`Failed to update client bill ${req.params.id}`, error);
    res.status(500).json({ message: error.message });
  }
};

const deleteClientBill = async (req, res) => {
  try {
    const { id } = req.params;
    const bill = await ClientBill.delete(id);
    if (!bill) return res.status(404).json({ message: 'Bill not found' });
    res.json({ message: 'Bill deleted successfully' });
  } catch (error) {
    logger.error(`Failed to delete client bill ${req.params.id}`, error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAllClientBills,
  createClientBill,
  updateClientBill,
  deleteClientBill,
};
