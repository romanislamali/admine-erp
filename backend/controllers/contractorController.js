const Contractor = require('../models/contractor');

const getAllContractors = async (req, res) => {
  try {
    const contractors = await Contractor.getAll();
    res.json(contractors);
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
  createContractor,
};
