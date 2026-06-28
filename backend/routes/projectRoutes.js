const express = require('express');
const router = express.Router();
const { getAllProjects, getProjectById, createProject } = require('../controllers/projectController');

router.get('/', getAllProjects);
router.get('/:id', getProjectById);
router.post('/', createProject);

module.exports = router;
