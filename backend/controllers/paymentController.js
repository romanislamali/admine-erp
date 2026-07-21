const Payment = require('../models/payment');

const getAllPayments = async (req, res) => {
  try {
    const { contractor_id } = req.query;
    const payments = await Payment.getAll(contractor_id ? parseInt(contractor_id) : null);
    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createPayment = async (req, res) => {
  try {
    const { contractor_id, amount } = req.body;
    if (!contractor_id || !amount || isNaN(amount) || Number(amount) <= 0) {
      return res.status(400).json({ message: 'Contractor ID and positive numeric amount are required' });
    }
    const payment = await Payment.create(req.body);
    res.status(201).json(payment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAllPayments,
  createPayment,
};
