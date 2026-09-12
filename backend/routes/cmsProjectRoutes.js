const express = require('express');
const router = express.Router();
const {
  getActiveProjects,
  getAllProjects,
  getProjectById,
  createProject,
  updateProject,
  updateProjectStatus,
  setFeaturedProject,
  uploadProjectThumbnail,
  deleteProject
} = require('../controllers/cmsProjectController');
const { authenticateToken, requireRole } = require('../middlewares/auth');
const { upload } = require('../utils/imageUpload');

const requireCmsManager = requireRole(['ADMIN', 'MANAGER']);

// Public: active projects, optionally filtered by ?clientId= (used for both
// a client's project modal and the site-wide featured/portfolio section).
router.get('/', getActiveProjects);

// Admin: paginated list (all statuses) for the CMS management table.
router.get('/admin', authenticateToken, requireCmsManager, getAllProjects);

router.get('/:id', authenticateToken, requireCmsManager, getProjectById);
router.post('/', authenticateToken, requireCmsManager, createProject);
router.put('/:id', authenticateToken, requireCmsManager, updateProject);
router.patch('/:id/status', authenticateToken, requireCmsManager, updateProjectStatus);
router.patch('/:id/featured', authenticateToken, requireCmsManager, setFeaturedProject);
router.post('/:id/thumbnail', authenticateToken, requireCmsManager, upload.single('thumbnail'), uploadProjectThumbnail);
router.delete('/:id', authenticateToken, requireCmsManager, deleteProject);

module.exports = router;
