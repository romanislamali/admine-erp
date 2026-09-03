const express = require('express');
const router = express.Router();
const { getAllSchedules } = require('../controllers/clientBillScheduleController');

router.get('/', getAllSchedules);

module.exports = router;
