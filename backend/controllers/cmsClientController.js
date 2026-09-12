const CmsClient = require('../models/cmsClient');
const { saveOptimizedImage, deleteImage } = require('../utils/imageUpload');
const logger = require('../utils/logger');

// Public: active clients only, for the website's Partners strip.
const getActiveClients = async (req, res) => {
  try {
    const clients = await CmsClient.getAllActive();
    res.json(clients);
  } catch (error) {
    logger.error('Failed to fetch active CMS clients', error);
    res.status(500).json({ message: error.message });
  }
};

// Admin: paginated list, all statuses, search + sort.
const getAllClients = async (req, res) => {
  try {
    const { page, limit, search, sortField, sortOrder } = req.query;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const offsetNum = (pageNum - 1) * limitNum;

    const { rows, total } = await CmsClient.getPaginated({
      limit: limitNum,
      offset: offsetNum,
      search: search || '',
      sortField: sortField || 'display_order',
      sortOrder: sortOrder || 'asc'
    });
    res.json({ data: rows, total });
  } catch (error) {
    logger.error('Failed to fetch CMS clients', error);
    res.status(500).json({ message: error.message });
  }
};

const getClientById = async (req, res) => {
  try {
    const client = await CmsClient.getById(req.params.id);
    if (!client) return res.status(404).json({ message: 'Client not found' });
    res.json(client);
  } catch (error) {
    logger.error(`Failed to fetch CMS client ${req.params.id}`, error);
    res.status(500).json({ message: error.message });
  }
};

const createClient = async (req, res) => {
  try {
    if (!req.body.name || !req.body.name.trim()) {
      return res.status(400).json({ message: 'Client name is required' });
    }
    const client = await CmsClient.create(req.body, req.user.name);
    res.status(201).json(client);
  } catch (error) {
    logger.error('Failed to create CMS client', error);
    res.status(400).json({ message: error.message });
  }
};

const updateClient = async (req, res) => {
  try {
    if (!req.body.name || !req.body.name.trim()) {
      return res.status(400).json({ message: 'Client name is required' });
    }
    const client = await CmsClient.update(req.params.id, req.body, req.user.name);
    if (!client) return res.status(404).json({ message: 'Client not found' });
    res.json(client);
  } catch (error) {
    logger.error(`Failed to update CMS client ${req.params.id}`, error);
    res.status(400).json({ message: error.message });
  }
};

const updateClientStatus = async (req, res) => {
  try {
    if (typeof req.body.is_active !== 'boolean') {
      return res.status(400).json({ message: 'is_active (boolean) is required' });
    }
    const client = await CmsClient.setActive(req.params.id, req.body.is_active, req.user.name);
    if (!client) return res.status(404).json({ message: 'Client not found' });
    res.json(client);
  } catch (error) {
    logger.error(`Failed to update CMS client status ${req.params.id}`, error);
    res.status(400).json({ message: error.message });
  }
};

const uploadClientLogo = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Logo image file is required' });

    const existing = await CmsClient.getById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Client not found' });

    const logoPath = await saveOptimizedImage(req.file.buffer, 'clients');
    const client = await CmsClient.updateLogo(req.params.id, logoPath, req.user.name);

    deleteImage(existing.logo_path);
    res.json(client);
  } catch (error) {
    logger.error(`Failed to upload CMS client logo ${req.params.id}`, error);
    res.status(400).json({ message: error.message });
  }
};

const deleteClient = async (req, res) => {
  try {
    const client = await CmsClient.delete(req.params.id);
    if (!client) return res.status(404).json({ message: 'Client not found' });
    res.json({ message: 'Client deleted successfully' });
  } catch (error) {
    logger.error(`Failed to delete CMS client ${req.params.id}`, error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getActiveClients,
  getAllClients,
  getClientById,
  createClient,
  updateClient,
  updateClientStatus,
  uploadClientLogo,
  deleteClient
};
