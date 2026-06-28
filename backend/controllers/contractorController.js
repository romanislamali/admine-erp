const Contractor = require('../models/contractor');

const getAllContractors = async (req, res) => {
  try {
    const contractors = await Contractor.getAll();
    res.json(contractors);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getContractorById = async (req, res) => {
  try {
    const contractor = await Contractor.getById(req.params.id);
    if (!contractor) return res.status(404).json({ message: 'Contractor not found' });
    res.json(contractor);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createContractor = async (req, res) => {
  try {
    const contractor = await Contractor.create(req.body);
    res.status(201).json(contractor);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  getAllContractors,
  getContractorById,
  createContractor,
};

