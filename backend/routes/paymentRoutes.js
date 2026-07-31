const express = require('express');
const router = express.Router();
const { getAllPayments, createPayment, updatePayment, deletePayment } = require('../controllers/paymentController');
const { requireRole } = require('../middlewares/auth');

router.get('/', getAllPayments);
router.post('/', createPayment);
router.put('/:id', updatePayment);
router.delete('/:id', requireRole(['ADMIN']), deletePayment);

module.exports = router;
