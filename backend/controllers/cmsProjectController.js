const CmsProject = require('../models/cmsProject');
const { saveOptimizedImage, deleteImage } = require('../utils/imageUpload');
const logger = require('../utils/logger');

// Public: active projects, optionally scoped to a client (used for that
// client's project list in the client-details modal). Pass ?featured=true
// for the site-wide "Our Projects" section instead — one project per client.
const getActiveProjects = async (req, res) => {
  try {
    const projects = req.query.featured === 'true'
      ? await CmsProject.getFeaturedActive()
      : await CmsProject.getAllActive({ clientId: req.query.clientId });
    res.json(projects);
  } catch (error) {
    logger.error('Failed to fetch active CMS projects', error);
    res.status(500).json({ message: error.message });
  }
};

// Admin: paginated list, all statuses, search + sort, optional client filter.
const getAllProjects = async (req, res) => {
  try {
    const { page, limit, search, sortField, sortOrder, clientId } = req.query;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const offsetNum = (pageNum - 1) * limitNum;

    const { rows, total } = await CmsProject.getPaginated({
      limit: limitNum,
      offset: offsetNum,
      search: search || '',
      sortField: sortField || 'display_order',
      sortOrder: sortOrder || 'asc',
      clientId: clientId || null
    });
    res.json({ data: rows, total });
  } catch (error) {
    logger.error('Failed to fetch CMS projects', error);
    res.status(500).json({ message: error.message });
  }
};

const getProjectById = async (req, res) => {
  try {
    const project = await CmsProject.getById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    res.json(project);
  } catch (error) {
    logger.error(`Failed to fetch CMS project ${req.params.id}`, error);
    res.status(500).json({ message: error.message });
  }
};

const createProject = async (req, res) => {
  try {
    if (!req.body.name || !req.body.name.trim()) {
      return res.status(400).json({ message: 'Project name is required' });
    }
    if (!req.body.client_id) {
      return res.status(400).json({ message: 'A client must be selected for this project' });
    }
    const project = await CmsProject.create(req.body, req.user.name);
    res.status(201).json(project);
  } catch (error) {
    logger.error('Failed to create CMS project', error);
    res.status(400).json({ message: error.message });
  }
};

const updateProject = async (req, res) => {
  try {
    if (!req.body.name || !req.body.name.trim()) {
      return res.status(400).json({ message: 'Project name is required' });
    }
    if (!req.body.client_id) {
      return res.status(400).json({ message: 'A client must be selected for this project' });
    }
    const project = await CmsProject.update(req.params.id, req.body, req.user.name);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    res.json(project);
  } catch (error) {
    logger.error(`Failed to update CMS project ${req.params.id}`, error);
    res.status(400).json({ message: error.message });
  }
};

const updateProjectStatus = async (req, res) => {
  try {
    if (typeof req.body.is_active !== 'boolean') {
      return res.status(400).json({ message: 'is_active (boolean) is required' });
    }
    const project = await CmsProject.setActive(req.params.id, req.body.is_active, req.user.name);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    res.json(project);
  } catch (error) {
    logger.error(`Failed to update CMS project status ${req.params.id}`, error);
    res.status(400).json({ message: error.message });
  }
};

const setFeaturedProject = async (req, res) => {
  try {
    const existing = await CmsProject.getById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Project not found' });

    const project = await CmsProject.setFeatured(req.params.id, existing.client_id, req.user.name);
    res.json(project);
  } catch (error) {
    logger.error(`Failed to set featured CMS project ${req.params.id}`, error);
    res.status(400).json({ message: error.message });
  }
};

const uploadProjectThumbnail = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Thumbnail image file is required' });

    const existing = await CmsProject.getById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Project not found' });

    const thumbnailPath = await saveOptimizedImage(req.file.buffer, 'projects');
    const project = await CmsProject.updateThumbnail(req.params.id, thumbnailPath, req.user.name);

    deleteImage(existing.thumbnail_path);
    res.json(project);
  } catch (error) {
    logger.error(`Failed to upload CMS project thumbnail ${req.params.id}`, error);
    res.status(400).json({ message: error.message });
  }
};

const deleteProject = async (req, res) => {
  try {
    const project = await CmsProject.delete(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    logger.error(`Failed to delete CMS project ${req.params.id}`, error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getActiveProjects,
  getAllProjects,
  getProjectById,
  createProject,
  updateProject,
  updateProjectStatus,
  setFeaturedProject,
  uploadProjectThumbnail,
  deleteProject
};
