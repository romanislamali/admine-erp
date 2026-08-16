const Project = require('../models/project');
const logger = require('../utils/logger');

const getAllProjects = async (req, res) => {
  try {
    const { page, limit, search, sortField, sortOrder } = req.query;
    if (page && limit) {
      const pageNum = parseInt(page, 10) || 1;
      const limitNum = parseInt(limit, 10) || 10;
      const offsetNum = (pageNum - 1) * limitNum;

      const { rows, total } = await Project.getPaginated({
        limit: limitNum,
        offset: offsetNum,
        search: search || '',
        sortField: sortField || 'created_at',
        sortOrder: sortOrder || 'desc'
      });
      return res.json({ data: rows, total });
    }
    const projects = await Project.getAll();
    res.json(projects);
  } catch (error) {
    logger.error('Failed to fetch projects', error);
    res.status(500).json({ message: error.message });
  }
};

const getProjectById = async (req, res) => {
  try {
    const project = await Project.getById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    res.json(project);
  } catch (error) {
    logger.error(`Failed to fetch project ${req.params.id}`, error);
    res.status(500).json({ message: error.message });
  }
};

const createProject = async (req, res) => {
  try {
    const project = await Project.create(req.body, req.user.name);
    res.status(201).json(project);
  } catch (error) {
    logger.error('Failed to create project', error);
    res.status(400).json({ message: error.message });
  }
};

const updateProject = async (req, res) => {
  try {
    const project = await Project.update(req.params.id, req.body, req.user.name);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    res.json(project);
  } catch (error) {
    logger.error(`Failed to update project ${req.params.id}`, error);
    res.status(400).json({ message: error.message });
  }
};

const deleteProject = async (req, res) => {
  try {
    const project = await Project.delete(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    logger.error(`Failed to delete project ${req.params.id}`, error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAllProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
};
