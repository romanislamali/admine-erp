const express = require('express');
const router = express.Router();
const { getAllBills, createBill, updateBill, deleteBill } = require('../controllers/billController');
const { requireRole } = require('../middlewares/auth');

router.get('/', getAllBills);
router.post('/', createBill);
router.put('/:id', updateBill);
router.delete('/:id', requireRole(['ADMIN']), deleteBill);

module.exports = router;
