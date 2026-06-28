const express = require('express');
const router = express.Router();
const { getAllContractors, getContractorById, createContractor } = require('../controllers/contractorController');

router.get('/', getAllContractors);
router.get('/:id', getContractorById);
router.post('/', createContractor);

module.exports = router;

