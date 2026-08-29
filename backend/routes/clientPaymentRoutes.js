const express = require('express');
const router = express.Router();
const { getAllClientPayments, createClientPayment, updateClientPayment, deleteClientPayment } = require('../controllers/clientPaymentController');
const { requireRole } = require('../middlewares/auth');

router.get('/', getAllClientPayments);
router.post('/', createClientPayment);
router.put('/:id', updateClientPayment);
router.delete('/:id', requireRole(['ADMIN']), deleteClientPayment);

module.exports = router;
