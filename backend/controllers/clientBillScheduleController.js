const ClientBillSchedule = require('../models/clientBillSchedule');
const logger = require('../utils/logger');

const getAllSchedules = async (req, res) => {
  try {
    const { bill_id } = req.query;
    const schedules = await ClientBillSchedule.getAll(bill_id || null);
    res.json(schedules);
  } catch (error) {
    logger.error('Failed to fetch milestone schedules', error);
    res.status(500).json({ message: error.message });
  }
};

// Records (or edits/reverses) a receipt directly against a milestone — the milestone
// row IS the payment record. Reducing what's already recorded (a reversal/correction)
// is ADMIN-only, mirroring the old ADMIN-only delete on the retired client_payments table.
const recordReceipt = async (req, res) => {
  try {
    const { id } = req.params;
    const { received_amount, deduction_amount } = req.body;

    const received = received_amount === undefined || received_amount === null ? 0 : Number(received_amount);
    const deduction = deduction_amount === undefined || deduction_amount === null ? 0 : Number(deduction_amount);

    if (isNaN(received) || received < 0 || isNaN(deduction) || deduction < 0) {
      return res.status(400).json({ message: 'Received and deduction amounts must be zero or a positive number' });
    }

    const existing = await ClientBillSchedule.getById(id);
    if (!existing) return res.status(404).json({ message: 'Milestone not found' });

    const oldTotal = Number(existing.received_amount) + Number(existing.deduction_amount);
    const newTotal = received + deduction;
    if (newTotal < oldTotal && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only an admin can reduce or reverse a recorded receipt' });
    }

    const schedule = await ClientBillSchedule.recordReceipt(id, { ...req.body, received_amount: received, deduction_amount: deduction }, req.user.name);
    res.json(schedule);
  } catch (error) {
    logger.error(`Failed to record receipt for milestone ${req.params.id}`, error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAllSchedules,
  recordReceipt,
};
