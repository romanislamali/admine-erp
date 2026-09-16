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
const { authenticateToken } = require('../middlewares/auth');
const { upload } = require('../utils/imageUpload');

// Public: active projects, optionally filtered by ?clientId= (used for both
// a client's project modal and the site-wide featured/portfolio section).
router.get('/', getActiveProjects);

// Any authenticated user: paginated list (all statuses) for the CMS management table.
router.get('/admin', authenticateToken, getAllProjects);

router.get('/:id', authenticateToken, getProjectById);
router.post('/', authenticateToken, createProject);
router.put('/:id', authenticateToken, updateProject);
router.patch('/:id/status', authenticateToken, updateProjectStatus);
router.patch('/:id/featured', authenticateToken, setFeaturedProject);
router.post('/:id/thumbnail', authenticateToken, upload.single('thumbnail'), uploadProjectThumbnail);
router.delete('/:id', authenticateToken, deleteProject);

module.exports = router;
