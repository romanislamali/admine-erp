const express = require('express');
const router = express.Router();
const { getAllClientPOs, createClientPO, updateClientPO, deleteClientPO } = require('../controllers/clientPOController');
const { requireRole } = require('../middlewares/auth');

router.get('/', getAllClientPOs);
router.post('/', createClientPO);
router.put('/:id', updateClientPO);
router.delete('/:id', requireRole(['ADMIN']), deleteClientPO);

module.exports = router;
