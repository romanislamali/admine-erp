const Bill = require('../models/bill');

const getAllBills = async (req, res) => {
  try {
    const bills = await Bill.getAll();
    res.json(bills);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createBill = async (req, res) => {
  try {
    const { contractor_id, amount } = req.body;
    if (!contractor_id || !amount || isNaN(amount) || Number(amount) <= 0) {
      return res.status(400).json({ message: 'Contractor ID and positive numeric amount are required' });
    }
    const bill = await Bill.create(req.body);
    res.status(201).json(bill);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAllBills,
  createBill,
};
