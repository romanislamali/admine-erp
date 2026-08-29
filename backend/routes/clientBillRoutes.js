const express = require('express');
const router = express.Router();
const { getAllClientBills, createClientBill, updateClientBill, deleteClientBill } = require('../controllers/clientBillController');
const { requireRole } = require('../middlewares/auth');

router.get('/', getAllClientBills);
router.post('/', createClientBill);
router.put('/:id', updateClientBill);
router.delete('/:id', requireRole(['ADMIN']), deleteClientBill);

module.exports = router;
