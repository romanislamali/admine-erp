const express = require('express');
const router = express.Router();
const { getAllSchedules, recordReceipt } = require('../controllers/clientBillScheduleController');

router.get('/', getAllSchedules);
router.put('/:id', recordReceipt);

module.exports = router;
