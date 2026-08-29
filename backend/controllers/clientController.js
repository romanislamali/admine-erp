const Client = require('../models/client');
const logger = require('../utils/logger');

const getAllClients = async (req, res) => {
  try {
    const { page, limit, search, sortField, sortOrder } = req.query;
    if (page && limit) {
      const pageNum = parseInt(page, 10) || 1;
      const limitNum = parseInt(limit, 10) || 10;
      const offsetNum = (pageNum - 1) * limitNum;

      const { rows, total } = await Client.getPaginated({
        limit: limitNum,
        offset: offsetNum,
        search: search || '',
        sortField: sortField || 'created_at',
        sortOrder: sortOrder || 'desc'
      });
      return res.json({ data: rows, total });
    }
    const clients = await Client.getAll();
    res.json(clients);
  } catch (error) {
    logger.error('Failed to fetch clients', error);
    res.status(500).json({ message: error.message });
  }
};

const getClientById = async (req, res) => {
  try {
    const client = await Client.getById(req.params.id);
    if (!client) return res.status(404).json({ message: 'Client not found' });
    res.json(client);
  } catch (error) {
    logger.error(`Failed to fetch client ${req.params.id}`, error);
    res.status(500).json({ message: error.message });
  }
};

const createClient = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'Client name is required' });
    }
    const client = await Client.create(req.body, req.user.name);
    res.status(201).json(client);
  } catch (error) {
    logger.error('Failed to create client', error);
    res.status(400).json({ message: error.message });
  }
};

const updateClient = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'Client name is required' });
    }
    const client = await Client.update(req.params.id, req.body, req.user.name);
    if (!client) return res.status(404).json({ message: 'Client not found' });
    res.json(client);
  } catch (error) {
    logger.error(`Failed to update client ${req.params.id}`, error);
    res.status(400).json({ message: error.message });
  }
};

const deleteClient = async (req, res) => {
  try {
    const client = await Client.delete(req.params.id);
    if (!client) return res.status(404).json({ message: 'Client not found' });
    res.json({ message: 'Client deleted successfully', client });
  } catch (error) {
    if (error.code === '23503') {
      return res.status(400).json({
        message: 'Cannot delete client because it has associated purchase orders, bills, or payments.'
      });
    }
    logger.error(`Failed to delete client ${req.params.id}`, error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAllClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
};
