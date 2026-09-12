// Website CMS integration: fetches active clients/projects from the ERP's
// Website CMS API and renders them into the containers left in index.html
// (#clients-container, #projects-container), preserving the existing
// .client-logo / .project-card markup and CSS untouched.
(function () {
  // Same-origin '/api' is correct in the real deployment (nginx proxies it to
  // the backend). When this file is opened through a plain static server that
  // has no such proxy — e.g. VSCode's Live Server on 127.0.0.1:5500 — that
  // path 404s. In that case only, fall back to hitting the backend's exposed
  // dev port directly; its CORS is wide open, so the cross-origin call works.
  const LOCAL_BACKEND_ORIGIN = 'http://localhost:3001';
  let API_BASE = '/api/cms';
  let ORIGIN_BASE = ''; // prefixed onto relative /uploads/... image paths from the API

  async function resolveApiBase() {
    try {
      const res = await fetch('/api/health');
      if (res.ok) return;
    } catch (err) {
      // same-origin /api isn't reachable (likely a static-only preview server)
    }
    API_BASE = `${LOCAL_BACKEND_ORIGIN}/api/cms`;
    ORIGIN_BASE = LOCAL_BACKEND_ORIGIN;
  }

  // Image paths from the API are always relative (e.g. /uploads/cms/...);
  // resolve them against ORIGIN_BASE so they still load under the local
  // static-preview fallback above, and pass absolute URLs through untouched.
  function resolveImageUrl(path) {
    if (!path) return path;
    return /^https?:\/\//.test(path) ? path : `${ORIGIN_BASE}${path}`;
  }

  const clientsContainer = document.getElementById('clients-container');
  const projectsContainer = document.getElementById('projects-container');

  const clientModalOverlay = document.getElementById('client-modal-overlay');
  const clientModalName = document.getElementById('client-modal-name');
  const clientModalDescription = document.getElementById('client-modal-description');
  const clientModalProjects = document.getElementById('client-modal-projects');
  const clientModalClose = document.getElementById('client-modal-close');

  const projectModalOverlay = document.getElementById('project-modal-overlay');
  const projectModalName = document.getElementById('project-modal-name');
  const projectModalMeta = document.getElementById('project-modal-meta');
  const projectModalDescription = document.getElementById('project-modal-description');
  const projectModalImage = document.getElementById('project-modal-image');
  const projectModalClose = document.getElementById('project-modal-close');

  function openModal(overlay) {
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeModal(overlay) {
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  [clientModalOverlay, projectModalOverlay].forEach((overlay) => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal(overlay);
    });
  });
  clientModalClose.addEventListener('click', () => closeModal(clientModalOverlay));
  projectModalClose.addEventListener('click', () => closeModal(projectModalOverlay));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal(clientModalOverlay);
      closeModal(projectModalOverlay);
    }
  });

  async function fetchJson(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Request failed: ' + url);
    return res.json();
  }

  function openProject(project) {
    openModal(projectModalOverlay);
    projectModalName.textContent = project.name || '';
    projectModalDescription.textContent = project.detailed_description || project.short_description || '';

    const metaParts = [];
    if (project.location) metaParts.push(`📍 ${project.location}`);
    if (project.completion_year) metaParts.push(`📅 ${project.completion_year}`);
    projectModalMeta.innerHTML = metaParts.map((m) => `<span>${m}</span>`).join('');

    projectModalImage.innerHTML = project.thumbnail_path
      ? `<img src="${resolveImageUrl(project.thumbnail_path)}" alt="${project.name || ''}">`
      : '';
  }

  async function openClient(client) {
    openModal(clientModalOverlay);
    clientModalName.textContent = client.name || '';
    clientModalDescription.textContent = client.detailed_description || client.short_description || '';
    clientModalProjects.innerHTML = '<p class="cms-loading">Loading projects…</p>';

    try {
      const projects = await fetchJson(`${API_BASE}/projects?clientId=${encodeURIComponent(client.id)}`);
      if (projects.length === 0) {
        clientModalProjects.innerHTML = '<p class="cms-empty">No projects listed for this client yet.</p>';
        return;
      }
      clientModalProjects.innerHTML = '';
      projects.forEach((project) => {
        const card = document.createElement('div');
        card.className = 'cms-client-project-card';
        card.innerHTML = `
          ${project.thumbnail_path ? `<img src="${resolveImageUrl(project.thumbnail_path)}" alt="${project.name || ''}">` : ''}
          <div class="cms-cp-info">
            <h4></h4>
            <p></p>
          </div>
        `;
        card.querySelector('h4').textContent = project.name || '';
        card.querySelector('p').textContent = project.short_description || '';
        card.addEventListener('click', () => {
          closeModal(clientModalOverlay);
          openProject(project);
        });
        clientModalProjects.appendChild(card);
      });
    } catch (err) {
      clientModalProjects.innerHTML = '<p class="cms-error">Unable to load projects for this client.</p>';
    }
  }

  async function loadClients() {
    try {
      const clients = await fetchJson(`${API_BASE}/clients`);
      if (clients.length === 0) {
        clientsContainer.innerHTML = '<p class="cms-empty">No partners to display yet.</p>';
        return;
      }
      clientsContainer.innerHTML = '';
      clients.forEach((client) => {
        const el = document.createElement('div');
        el.className = 'client-logo';
        if (client.logo_path) {
          const img = document.createElement('img');
          img.src = resolveImageUrl(client.logo_path);
          img.alt = client.name || '';
          el.appendChild(img);
        } else {
          el.textContent = client.name || '';
        }
        el.addEventListener('click', () => openClient(client));
        clientsContainer.appendChild(el);
      });
    } catch (err) {
      clientsContainer.innerHTML = '<p class="cms-error">Unable to load partners right now.</p>';
    }
  }

  async function loadProjects() {
    try {
      // One project per client (its lowest display_order) for this site-wide
      // showcase — a client's full project list still shows in its modal.
      const projects = await fetchJson(`${API_BASE}/projects?featured=true`);
      if (projects.length === 0) {
        projectsContainer.innerHTML = '<p class="cms-empty">No projects to display yet.</p>';
        return;
      }
      projectsContainer.innerHTML = '';
      projects.forEach((project) => {
        const card = document.createElement('div');
        card.className = 'project-card';
        card.innerHTML = `
          <div class="img-container">
            <span class="tag"></span>
            ${project.thumbnail_path ? `<img class="project-img" src="${resolveImageUrl(project.thumbnail_path)}" alt="${project.name || ''}">` : ''}
          </div>
          <div class="project-info">
            <h3></h3>
            <p></p>
          </div>
        `;
        card.querySelector('.tag').textContent = project.client_name || '';
        card.querySelector('h3').textContent = project.name || '';
        card.querySelector('.project-info p').textContent = project.short_description || '';
        card.addEventListener('click', () => openProject(project));
        projectsContainer.appendChild(card);
      });
    } catch (err) {
      projectsContainer.innerHTML = '<p class="cms-error">Unable to load projects right now.</p>';
    }
  }

  (async function init() {
    await resolveApiBase();
    loadClients();
    loadProjects();
  })();
})();
