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

const approveSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const schedule = await ClientBillSchedule.approve(id, req.user.name);
    if (!schedule) {
      return res.status(400).json({ message: 'Only a DUE installment can be approved' });
    }
    res.json(schedule);
  } catch (error) {
    logger.error(`Failed to approve milestone schedule ${req.params.id}`, error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAllSchedules,
  approveSchedule,
};
