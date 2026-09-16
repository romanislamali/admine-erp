const express = require('express');
const router = express.Router();
const {
  getActiveClients,
  getAllClients,
  getClientById,
  createClient,
  updateClient,
  updateClientStatus,
  uploadClientLogo,
  deleteClient
} = require('../controllers/cmsClientController');
const { authenticateToken } = require('../middlewares/auth');
const { upload } = require('../utils/imageUpload');

// Public: active clients for the website's Partners strip.
router.get('/', getActiveClients);

// Any authenticated user: paginated list (all statuses) for the CMS management table.
router.get('/admin', authenticateToken, getAllClients);

router.get('/:id', authenticateToken, getClientById);
router.post('/', authenticateToken, createClient);
router.put('/:id', authenticateToken, updateClient);
router.patch('/:id/status', authenticateToken, updateClientStatus);
router.post('/:id/logo', authenticateToken, upload.single('logo'), uploadClientLogo);
router.delete('/:id', authenticateToken, deleteClient);

module.exports = router;
