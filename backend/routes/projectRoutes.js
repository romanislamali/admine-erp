const express = require('express');
const router = express.Router();
const { getAllProjects, getProjectById, createProject, updateProject, deleteProject } = require('../controllers/projectController');
const { requireRole } = require('../middlewares/auth');

router.get('/', getAllProjects);
router.get('/:id', getProjectById);
router.post('/', createProject);
router.put('/:id', updateProject);
router.delete('/:id', requireRole(['ADMIN']), deleteProject);

module.exports = router;
