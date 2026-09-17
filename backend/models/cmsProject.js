const db = require('../config/db');

const CmsProject = {
  getAllActive: async ({ clientId } = {}) => {
    let queryText = `
      SELECT p.*, c.name AS client_name, c.logo_path AS client_logo_path
      FROM cms_projects p
      LEFT JOIN cms_clients c ON p.client_id = c.id
      WHERE p.is_active = true AND p.deleted = false
    `;
    const params = [];
    if (clientId) {
      params.push(clientId);
      queryText += ` AND p.client_id = $${params.length}`;
    }
    queryText += ` ORDER BY p.display_order ASC, p.created_at DESC`;

    const { rows } = await db.query(queryText, params);
    return rows;
  },

  // One project per client for the site-wide "Our Projects" showcase section
  // — as opposed to getAllActive, which lists every active project for a
  // single client's own detail modal. Prefers the project an admin explicitly
  // marked is_featured; falls back to lowest display_order for clients where
  // none has been picked yet.
  getFeaturedActive: async () => {
    const { rows } = await db.query(`
      SELECT * FROM (
        SELECT DISTINCT ON (p.client_id) p.*, c.name AS client_name, c.logo_path AS client_logo_path
        FROM cms_projects p
        LEFT JOIN cms_clients c ON p.client_id = c.id
        WHERE p.is_active = true AND p.deleted = false
        ORDER BY p.client_id, p.is_featured DESC, p.display_order ASC, p.created_at DESC
      ) featured
      ORDER BY featured.display_order ASC, featured.created_at DESC
    `);
    return rows;
  },

  // Marks one project as the featured pick for its client, clearing any
  // previous pick first — mirrors CmsProjectImage.setPrimary.
  setFeatured: async (id, clientId, updatedBy) => {
    await db.query(
      `UPDATE cms_projects SET is_featured = false, updated_at = NOW() WHERE client_id = $1 AND deleted = false`,
      [clientId]
    );
    const { rows } = await db.query(
      `UPDATE cms_projects SET is_featured = true, updated_by = $1, updated_at = NOW() WHERE id = $2 AND client_id = $3 AND deleted = false RETURNING *`,
      [updatedBy, id, clientId]
    );
    return rows[0];
  },

  getPaginated: async ({ limit, offset, search, sortField, sortOrder, clientId }) => {
    let queryText = `
      SELECT p.*, c.name AS client_name, c.logo_path AS client_logo_path
      FROM cms_projects p
      LEFT JOIN cms_clients c ON p.client_id = c.id
      WHERE p.deleted = false
    `;
    const params = [];
    let paramCount = 0;

    if (clientId) {
      paramCount++;
      queryText += ` AND p.client_id = $${paramCount}`;
      params.push(clientId);
    }

    if (search) {
      paramCount++;
      queryText += ` AND (p.name ILIKE $${paramCount} OR c.name ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    const countQueryText = `SELECT COUNT(*) FROM (${queryText}) AS temp`;
    const countResult = await db.query(countQueryText, params);
    const total = parseInt(countResult.rows[0].count, 10);

    const allowedSortFields = {
      name: 'p.name',
      client_name: 'c.name',
      display_order: 'p.display_order',
      is_active: 'p.is_active',
      completion_year: 'p.completion_year',
      created_at: 'p.created_at'
    };

    const dbSortField = allowedSortFields[sortField] || 'p.display_order';
    const dbSortOrder = sortOrder === 'desc' ? 'DESC' : 'ASC';

    queryText += ` ORDER BY ${dbSortField} ${dbSortOrder}, p.created_at DESC`;

    paramCount++;
    queryText += ` LIMIT $${paramCount}`;
    params.push(limit);

    paramCount++;
    queryText += ` OFFSET $${paramCount}`;
    params.push(offset);

    const { rows } = await db.query(queryText, params);
    return { rows, total };
  },

  getById: async (id) => {
    const { rows } = await db.query(
      `SELECT p.*, c.name AS client_name, c.logo_path AS client_logo_path
       FROM cms_projects p
       LEFT JOIN cms_clients c ON p.client_id = c.id
       WHERE p.id = $1 AND p.deleted = false`,
      [id]
    );
    return rows[0];
  },

  getActiveById: async (id) => {
    const { rows } = await db.query(
      `SELECT p.*, c.name AS client_name, c.logo_path AS client_logo_path
       FROM cms_projects p
       LEFT JOIN cms_clients c ON p.client_id = c.id
       WHERE p.id = $1 AND p.is_active = true AND p.deleted = false`,
      [id]
    );
    return rows[0];
  },

  create: async (project, createdBy) => {
    const { client_id, name, short_description, detailed_description, location, completion_year, display_order } = project;
    const { rows } = await db.query(
      `INSERT INTO cms_projects
        (client_id, name, short_description, detailed_description, location, completion_year, display_order, created_by, updated_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8, NOW())
       RETURNING *`,
      [
        client_id,
        name,
        short_description || null,
        detailed_description || null,
        location || null,
        completion_year || null,
        display_order || 0,
        createdBy
      ]
    );
    const created = rows[0];

    // Invariant: a client with any projects at all must always have exactly
    // one featured. If this client currently has none (its first project, or
    // one it lost track of), this new one becomes it automatically.
    const { rows: hasFeatured } = await db.query(
      `SELECT 1 FROM cms_projects WHERE client_id = $1 AND deleted = false AND is_featured = true LIMIT 1`,
      [client_id]
    );
    if (hasFeatured.length === 0) {
      const { rows: promoted } = await db.query(
        `UPDATE cms_projects SET is_featured = true WHERE id = $1 RETURNING *`,
        [created.id]
      );
      return promoted[0];
    }
    return created;
  },

  update: async (id, project, updatedBy) => {
    const { client_id, name, short_description, detailed_description, location, completion_year, display_order } = project;
    const { rows } = await db.query(
      `UPDATE cms_projects
       SET client_id = $1, name = $2, short_description = $3, detailed_description = $4,
           location = $5, completion_year = $6, display_order = $7, updated_by = $8, updated_at = NOW()
       WHERE id = $9 AND deleted = false
       RETURNING *`,
      [
        client_id,
        name,
        short_description || null,
        detailed_description || null,
        location || null,
        completion_year || null,
        display_order || 0,
        updatedBy,
        id
      ]
    );
    return rows[0];
  },

  updateThumbnail: async (id, thumbnailPath, updatedBy) => {
    const { rows } = await db.query(
      `UPDATE cms_projects SET thumbnail_path = $1, updated_by = $2, updated_at = NOW() WHERE id = $3 AND deleted = false RETURNING *`,
      [thumbnailPath, updatedBy, id]
    );
    return rows[0];
  },

  setActive: async (id, isActive, updatedBy) => {
    const { rows } = await db.query(
      `UPDATE cms_projects SET is_active = $1, updated_by = $2, updated_at = NOW() WHERE id = $3 AND deleted = false RETURNING *`,
      [isActive, updatedBy, id]
    );
    return rows[0];
  },

  delete: async (id) => {
    const { rows } = await db.query('DELETE FROM cms_projects WHERE id = $1 RETURNING *', [id]);
    const deleted = rows[0];

    // Maintain the "always exactly one featured, if any remain" invariant:
    // removing the featured project must hand the flag to another one of
    // the client's remaining projects, if it has any left.
    if (deleted && deleted.is_featured) {
      await db.query(
        `UPDATE cms_projects SET is_featured = true, updated_at = NOW()
         WHERE id = (
           SELECT id FROM cms_projects
           WHERE client_id = $1 AND deleted = false
           ORDER BY display_order ASC, created_at DESC
           LIMIT 1
         )`,
        [deleted.client_id]
      );
    }
    return deleted;
  }
};

module.exports = CmsProject;
