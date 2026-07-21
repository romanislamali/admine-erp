const express = require('express');
const router = express.Router();
const { 
  getAllContractors, 
  getContractorById, 
  createContractor,
  updateContractor,
  deleteContractor 
} = require('../controllers/contractorController');
const { requireRole } = require('../middlewares/auth');

router.get('/', getAllContractors);
router.get('/:id', getContractorById);
router.post('/', createContractor);
router.put('/:id', requireRole(['ADMIN']), updateContractor);
router.delete('/:id', requireRole(['ADMIN']), deleteContractor);

module.exports = router;


