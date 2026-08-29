const ClientPO = require('../models/clientPO');
const logger = require('../utils/logger');

const getAllClientPOs = async (req, res) => {
  try {
    const { client_id, page, limit, search, sortField, sortOrder } = req.query;
    if (page && limit) {
      const pageNum = parseInt(page, 10) || 1;
      const limitNum = parseInt(limit, 10) || 10;
      const offsetNum = (pageNum - 1) * limitNum;

      const { rows, total } = await ClientPO.getPaginated({
        clientId: client_id || null,
        limit: limitNum,
        offset: offsetNum,
        search: search || '',
        sortField: sortField || 'created_at',
        sortOrder: sortOrder || 'desc'
      });
      return res.json({ data: rows, total });
    }
    const pos = await ClientPO.getAll(client_id || null);
    res.json(pos);
  } catch (error) {
    logger.error('Failed to fetch client POs', error);
    res.status(500).json({ message: error.message });
  }
};

const createClientPO = async (req, res) => {
  try {
    const { client_id, po_number } = req.body;
    if (!client_id || !po_number) {
      return res.status(400).json({ message: 'Client ID and PO number are required' });
    }
    const po = await ClientPO.create(req.body, req.user.name);
    res.status(201).json(po);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ message: 'This PO number already exists for this client' });
    }
    logger.error('Failed to create client PO', error);
    res.status(500).json({ message: error.message });
  }
};

const updateClientPO = async (req, res) => {
  try {
    const { id } = req.params;
    const { client_id, po_number } = req.body;
    if (!client_id || !po_number) {
      return res.status(400).json({ message: 'Client ID and PO number are required' });
    }
    const po = await ClientPO.update(id, req.body, req.user.name);
    if (!po) return res.status(404).json({ message: 'Purchase order not found' });
    res.json(po);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ message: 'This PO number already exists for this client' });
    }
    logger.error(`Failed to update client PO ${req.params.id}`, error);
    res.status(500).json({ message: error.message });
  }
};

const deleteClientPO = async (req, res) => {
  try {
    const { id } = req.params;
    const po = await ClientPO.delete(id);
    if (!po) return res.status(404).json({ message: 'Purchase order not found' });
    res.json({ message: 'Purchase order deleted successfully' });
  } catch (error) {
    logger.error(`Failed to delete client PO ${req.params.id}`, error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAllClientPOs,
  createClientPO,
  updateClientPO,
  deleteClientPO,
};
