const express = require('express');
const router = express.Router();
const { getAllBills, createBill, updateBill, deleteBill } = require('../controllers/billController');

router.get('/', getAllBills);
router.post('/', createBill);
router.put('/:id', updateBill);
router.delete('/:id', deleteBill);

module.exports = router;
