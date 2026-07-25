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

const updatePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { contractor_id, amount } = req.body;
    if (!contractor_id || !amount || isNaN(amount) || Number(amount) <= 0) {
      return res.status(400).json({ message: 'Contractor ID and positive numeric amount are required' });
    }
    const payment = await Payment.update(id, req.body);
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    res.json(payment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deletePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const payment = await Payment.delete(id);
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    res.json({ message: 'Payment deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAllPayments,
  createPayment,
  updatePayment,
  deletePayment,
};
