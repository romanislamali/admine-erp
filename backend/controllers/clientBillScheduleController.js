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

module.exports = {
  getAllSchedules,
};
