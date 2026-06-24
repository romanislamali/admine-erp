const express = require('express');
const router = express.Router();
const { getAllContractors, createContractor } = require('../controllers/contractorController');

router.get('/', getAllContractors);
router.post('/', createContractor);

module.exports = router;
