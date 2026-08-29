const ClientPayment = require('../models/clientPayment');
const logger = require('../utils/logger');

const getAllClientPayments = async (req, res) => {
  try {
    const { client_id, page, limit, search, sortField, sortOrder } = req.query;
    if (page && limit) {
      const pageNum = parseInt(page, 10) || 1;
      const limitNum = parseInt(limit, 10) || 10;
      const offsetNum = (pageNum - 1) * limitNum;

      const { rows, total } = await ClientPayment.getPaginated({
        clientId: client_id || null,
        limit: limitNum,
        offset: offsetNum,
        search: search || '',
        sortField: sortField || 'created_at',
        sortOrder: sortOrder || 'desc'
      });
      return res.json({ data: rows, total });
    }
    const payments = await ClientPayment.getAll(client_id || null);
    res.json(payments);
  } catch (error) {
    logger.error('Failed to fetch client payments', error);
    res.status(500).json({ message: error.message });
  }
};

const createClientPayment = async (req, res) => {
  try {
    const { client_id, bill_id, amount } = req.body;
    if (!client_id || !bill_id || !amount || isNaN(amount) || Number(amount) <= 0) {
      return res.status(400).json({ message: 'Client, bill, and a positive numeric amount are required' });
    }
    const payment = await ClientPayment.create(req.body, req.user.name);
    res.status(201).json(payment);
  } catch (error) {
    logger.error('Failed to create client payment', error);
    res.status(500).json({ message: error.message });
  }
};

const updateClientPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { client_id, bill_id, amount } = req.body;
    if (!client_id || !bill_id || !amount || isNaN(amount) || Number(amount) <= 0) {
      return res.status(400).json({ message: 'Client, bill, and a positive numeric amount are required' });
    }
    const payment = await ClientPayment.update(id, req.body, req.user.name);
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    res.json(payment);
  } catch (error) {
    logger.error(`Failed to update client payment ${req.params.id}`, error);
    res.status(500).json({ message: error.message });
  }
};

const deleteClientPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const payment = await ClientPayment.delete(id);
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    res.json({ message: 'Payment deleted successfully' });
  } catch (error) {
    logger.error(`Failed to delete client payment ${req.params.id}`, error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAllClientPayments,
  createClientPayment,
  updateClientPayment,
  deleteClientPayment,
};
