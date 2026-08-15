const Contractor = require('../models/contractor');
const logger = require('../utils/logger');

const getAllContractors = async (req, res) => {
  try {
    const contractors = await Contractor.getAll();
    res.json(contractors);
  } catch (error) {
    logger.error('Failed to fetch contractors', error);
    res.status(500).json({ message: error.message });
  }
};

const getContractorById = async (req, res) => {
  try {
    const contractor = await Contractor.getById(req.params.id);
    if (!contractor) return res.status(404).json({ message: 'Contractor not found' });
    res.json(contractor);
  } catch (error) {
    logger.error(`Failed to fetch contractor ${req.params.id}`, error);
    res.status(500).json({ message: error.message });
  }
};

const createContractor = async (req, res) => {
  try {
    const contractor = await Contractor.create(req.body, req.user.name);
    res.status(201).json(contractor);
  } catch (error) {
    logger.error('Failed to create contractor', error);
    res.status(400).json({ message: error.message });
  }
};

const updateContractor = async (req, res) => {
  try {
    const contractor = await Contractor.update(req.params.id, req.body, req.user.name);
    if (!contractor) return res.status(404).json({ message: 'Contractor not found' });
    res.json(contractor);
  } catch (error) {
    logger.error(`Failed to update contractor ${req.params.id}`, error);
    res.status(400).json({ message: error.message });
  }
};

const deleteContractor = async (req, res) => {
  try {
    const contractor = await Contractor.delete(req.params.id);
    if (!contractor) return res.status(404).json({ message: 'Contractor not found' });
    res.json({ message: 'Contractor deleted successfully', contractor });
  } catch (error) {
    if (error.code === '23503') {
      return res.status(400).json({
        message: 'Cannot delete contractor because it has associated projects, bills, or payments.'
      });
    }
    logger.error(`Failed to delete contractor ${req.params.id}`, error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAllContractors,
  getContractorById,
  createContractor,
  updateContractor,
  deleteContractor,
};


