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
const { authenticateToken, requireRole } = require('../middlewares/auth');
const { upload } = require('../utils/imageUpload');

const requireCmsManager = requireRole(['ADMIN', 'MANAGER']);

// Public: active clients for the website's Partners strip.
router.get('/', getActiveClients);

// Admin: paginated list (all statuses) for the CMS management table.
router.get('/admin', authenticateToken, requireCmsManager, getAllClients);

router.get('/:id', authenticateToken, requireCmsManager, getClientById);
router.post('/', authenticateToken, requireCmsManager, createClient);
router.put('/:id', authenticateToken, requireCmsManager, updateClient);
router.patch('/:id/status', authenticateToken, requireCmsManager, updateClientStatus);
router.post('/:id/logo', authenticateToken, requireCmsManager, upload.single('logo'), uploadClientLogo);
router.delete('/:id', authenticateToken, requireCmsManager, deleteClient);

module.exports = router;
