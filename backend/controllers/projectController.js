const Project = require('../models/project');
const logger = require('../utils/logger');

const getAllProjects = async (req, res) => {
  try {
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
