const express = require('express');
const router = express.Router();
const { getAllPayments, createPayment, updatePayment, deletePayment } = require('../controllers/paymentController');

router.get('/', getAllPayments);
router.post('/', createPayment);
router.put('/:id', updatePayment);
router.delete('/:id', deletePayment);

module.exports = router;
