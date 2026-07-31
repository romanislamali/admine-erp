const Bill = require('../models/bill');

const getAllBills = async (req, res) => {
  try {
    const { contractor_id } = req.query;
    const bills = await Bill.getAll(contractor_id || null);
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
    const bill = await Bill.create(req.body, req.user.name);
    res.status(201).json(bill);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateBill = async (req, res) => {
  try {
    const { id } = req.params;
    const { contractor_id, amount } = req.body;
    if (!contractor_id || !amount || isNaN(amount) || Number(amount) <= 0) {
      return res.status(400).json({ message: 'Contractor ID and positive numeric amount are required' });
    }
    const bill = await Bill.update(id, req.body, req.user.name);
    if (!bill) return res.status(404).json({ message: 'Bill not found' });
    res.json(bill);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteBill = async (req, res) => {
  try {
    const { id } = req.params;
    const bill = await Bill.delete(id);
    if (!bill) return res.status(404).json({ message: 'Bill not found' });
    res.json({ message: 'Bill deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAllBills,
  createBill,
  updateBill,
  deleteBill,
};
