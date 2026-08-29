const express = require('express');
const router = express.Router();
const { getAllSchedules, approveSchedule } = require('../controllers/clientBillScheduleController');

router.get('/', getAllSchedules);
router.put('/:id/approve', approveSchedule);

module.exports = router;
