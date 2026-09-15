import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FolderPlus, X, Loader2, Pencil, Trash2, ImageOff, ArrowLeft, Star } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import Table from '../../components/Table';
import ImageUpload from '../../components/ImageUpload';
import ToggleSwitch from '../../components/ToggleSwitch';
import { useModal } from '../../context/ModalContext';

interface CmsProject {
  id: string;
  client_id: string;
  name: string;
  thumbnail_path: string | null;
  short_description: string | null;
  detailed_description: string | null;
  location: string | null;
  completion_year: number | null;
  display_order: number;
  is_active: boolean;
  is_featured: boolean;
}

interface CmsClient {
  id: string;
  name: string;
}

const emptyForm = {
  name: '',
  short_description: '',
  detailed_description: '',
  location: '',
  completion_year: '',
  display_order: 0
};

export default function CmsClientProjects() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { showSuccess, showError, confirmDelete } = useModal();

  const [client, setClient] = useState<CmsClient | null>(null);
  const [projects, setProjects] = useState<CmsProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editingThumbnailPath, setEditingThumbnailPath] = useState<string | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);

  const [lazyParams, setLazyParams] = useState({
    page: 1,
    limit: 10,
    search: '',
    sortField: null as string | null,
    sortOrder: null as 'asc' | 'desc' | null
  });
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const refreshProjects = () => setRefreshTrigger((prev) => prev + 1);

  const [formData, setFormData] = useState(emptyForm);

  const fetchClient = async () => {
    const res = await fetch(`/api/cms/clients/${clientId}`);
    if (res.ok) setClient(await res.json());
  };

  const fetchProjects = async (params: typeof lazyParams) => {
    try {
      setTableLoading(true);
      const query = new URLSearchParams({
        page: params.page.toString(),
        limit: params.limit.toString(),
        search: params.search,
        clientId: clientId || '',
        ...(params.sortField ? { sortField: params.sortField } : {}),
        ...(params.sortOrder ? { sortOrder: params.sortOrder } : {})
      });

      const res = await fetch(`/api/cms/projects/admin?${query.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch projects');

      const resData = await res.json();
      setProjects(resData.data);
      setTotalRecords(resData.total);
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching projects');
    } finally {
      setTableLoading(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClient();
  }, [clientId]);

  useEffect(() => {
    fetchProjects(lazyParams);
  }, [lazyParams, refreshTrigger, clientId]);

  const uploadThumbnail = async (projectId: string) => {
    if (!thumbnailFile) return;
    const body = new FormData();
    body.append('thumbnail', thumbnailFile);
    const res = await fetch(`/api/cms/projects/${projectId}/thumbnail`, { method: 'POST', body });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || 'Failed to upload thumbnail');
    }
  };

  const handleEdit = (project: CmsProject) => {
    setEditId(project.id);
    setEditingThumbnailPath(project.thumbnail_path);
    setThumbnailFile(null);
    setFormData({
      name: project.name,
      short_description: project.short_description || '',
      detailed_description: project.detailed_description || '',
      location: project.location || '',
      completion_year: project.completion_year ? String(project.completion_year) : '',
      display_order: project.display_order
    });
    setIsModalOpen(true);
  };

  const handleToggleActive = async (project: CmsProject) => {
    try {
      const res = await fetch(`/api/cms/projects/${project.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !project.is_active })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update status');
      refreshProjects();
    } catch (err: any) {
      await showError('Update Failed', err.message || 'Unable to update project status.');
    }
  };

  const handleSetFeatured = async (project: CmsProject) => {
    if (project.is_featured) return;
    try {
      const res = await fetch(`/api/cms/projects/${project.id}/featured`, { method: 'PATCH' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to set featured project');
      refreshProjects();
    } catch (err: any) {
      await showError('Update Failed', err.message || 'Unable to set this project as featured.');
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirmDelete(
      'Remove Project?',
      'This will permanently delete the project and its image. This cannot be undone.'
    );
    if (!confirmed) return;

    try {
      setSubmitting(true);
      const res = await fetch(`/api/cms/projects/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to delete project');

      setSubmitting(false);
      await Promise.race([
        showSuccess('Project Deleted', 'Project has been successfully deleted.'),
        new Promise((resolve) => setTimeout(resolve, 1000))
      ]);
      refreshProjects();
    } catch (err: any) {
      setSubmitting(false);
      await Promise.race([
        showError('Deletion Failed', err.message || 'Unable to delete the project. Please try again.'),
        new Promise((resolve) => setTimeout(resolve, 1000))
      ]);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditId(null);
    setEditingThumbnailPath(null);
    setThumbnailFile(null);
    setFormData(emptyForm);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !clientId) return;
    if (!thumbnailFile && !editingThumbnailPath) {
      await showError('Image Required', 'Please upload an image for the project.');
      return;
    }

    const currentName = formData.name;
    const isEditing = Boolean(editId);

    try {
      setSubmitting(true);
      const url = editId ? `/api/cms/projects/${editId}` : '/api/cms/projects';
      const method = editId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          client_id: clientId,
          completion_year: formData.completion_year ? parseInt(formData.completion_year, 10) : null
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || `Failed to ${isEditing ? 'update' : 'create'} project`);

      if (thumbnailFile) {
        await uploadThumbnail(data.id);
      }

      handleCloseModal();
      setSubmitting(false);
      refreshProjects();

      await Promise.race([
        showSuccess(
          isEditing ? 'Project Updated' : 'Project Added',
          isEditing ? `${currentName} has been updated successfully.` : `${currentName} has been added successfully.`
        ),
        new Promise((resolve) => setTimeout(resolve, 1000))
      ]);
    } catch (err: any) {
      setSubmitting(false);
      await Promise.race([
        showError('Save Failed', err.message || 'Unable to store changes. Please try again.'),
        new Promise((resolve) => setTimeout(resolve, 1000))
      ]);
    }
  };

  const columns = [
    {
      header: 'Action',
      key: 'action',
      align: 'center' as const,
      sortable: false,
      render: (p: CmsProject) => (
        <div className="flex items-center gap-1.5 justify-center">
          <button
            onClick={() => handleSetFeatured(p)}
            disabled={p.is_featured}
            title={p.is_featured ? 'Featured project for this client' : 'Set as featured project'}
            className={`p-1 px-1.5 rounded transition-colors ${p.is_featured
              ? 'text-amber-500 cursor-default'
              : 'text-slate-400 hover:text-amber-500 hover:bg-slate-50'
              }`}
          >
            <Star size={16} className={p.is_featured ? 'fill-amber-500' : ''} />
          </button>
          <button
            onClick={() => handleEdit(p)}
            title="Edit project"
            className="p-1 px-1.5 text-slate-400 hover:text-green-600 hover:bg-slate-50 rounded transition-colors"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={() => handleDelete(p.id)}
            title="Delete project"
            className="p-1 px-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-50 rounded transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )
    },
    {
      header: 'Thumbnail',
      key: 'thumbnail_path',
      sortable: false,
      render: (p: CmsProject) =>
        p.thumbnail_path ? (
          <img src={p.thumbnail_path} alt={p.name} className="h-12 w-16 object-cover rounded-lg border border-slate-200" />
        ) : (
          <div className="h-12 w-16 flex items-center justify-center rounded-lg bg-slate-100 text-slate-300">
            <ImageOff size={18} />
          </div>
        )
    },
    {
      header: 'Project',
      key: 'name',
      sortable: true,
      render: (p: CmsProject) => (
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-900">{p.name}</span>
          {p.is_featured && (
            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
              <Star size={10} className="fill-amber-500 text-amber-500" />
              Featured
            </span>
          )}
        </div>
      )
    },
    {
      header: 'Location / Year',
      key: 'location',
      sortable: false,
      render: (p: CmsProject) => (
        <div className="text-xs text-slate-500 space-y-0.5">
          <div>{p.location || '—'}</div>
          <div>{p.completion_year || '—'}</div>
        </div>
      )
    },
    {
      header: 'Order',
      key: 'display_order',
      align: 'center' as const,
      sortable: true,
      render: (p: CmsProject) => <span className="text-slate-600 font-semibold">{p.display_order}</span>
    },
    {
      header: 'Status',
      key: 'is_active',
      align: 'center' as const,
      sortable: true,
      render: (p: CmsProject) => (
        <div className="flex items-center justify-center gap-2">
          <ToggleSwitch checked={p.is_active} onChange={() => handleToggleActive(p)} />
          <span className={`text-xs font-semibold ${p.is_active ? 'text-green-600' : 'text-slate-400'}`}>
            {p.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>
      )
    }
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="bg-white shadow-sm shadow-amber-100 p-5 rounded-xl">
        <div className="flex items-start gap-3 mb-4">
          <button
            onClick={() => navigate('/cms/clients')}
            className="p-2 mt-1 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-slate-800 to-slate-600">
                  {client ? `${client.name} — Web Projects Management` : 'Projects'}
                </h1>
                <p className="text-slate-500 mt-1">Manage the portfolio projects shown for this client on the public website.</p>
              </div>
              <button
                onClick={() => {
                  setEditId(null);
                  setEditingThumbnailPath(null);
                  setThumbnailFile(null);
                  setFormData(emptyForm);
                  setIsModalOpen(true);
                }}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-semibold rounded-xl hover:bg-primary-hover shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <FolderPlus size={18} />
                Add Project
              </button>
            </div>
          </div>
        </div>

        <div className="mt-2">
          {error && <div className="bg-rose-50 border border-rose-200 text-rose-600 p-4 rounded-xl text-sm">{error}</div>}

          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="animate-spin text-primary" size={32} />
            </div>
          ) : (
            <Table<CmsProject>
              data={projects}
              columns={columns}
              keyExtractor={(p) => p.id}
              emptyMessage="No projects found for this client. Get started by adding one above."
              lazy
              totalRecords={totalRecords}
              loading={tableLoading}
              onLazyLoad={(params) => setLazyParams(params)}
              searchPlaceholder="Search by project name"
            />
          )}
        </div>

        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={handleCloseModal}
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative bg-white w-full max-w-lg p-6 rounded-2xl shadow-xl z-10 border border-slate-100 max-h-[90vh] overflow-y-auto"
              >
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-slate-900">{editId ? 'Update Project' : 'Add New Project'}</h3>
                  <button onClick={handleCloseModal} className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 transition-colors">
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                      Project Name <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. High-Load Freeway Billboard"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-sm bg-slate-50 focus:bg-white transition-all text-slate-900"
                    />
                  </div>
                  <ImageUpload label="Image" required currentImageUrl={editingThumbnailPath} onFileSelect={setThumbnailFile} />

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Location</label>
                      <input
                        type="text"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        placeholder="e.g. Dhaka-Chattogram Highway"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-sm bg-slate-50 focus:bg-white transition-all text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Completion Year</label>
                      <input
                        type="number"
                        value={formData.completion_year}
                        onChange={(e) => setFormData({ ...formData, completion_year: e.target.value })}
                        placeholder="e.g. 2025"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-sm bg-slate-50 focus:bg-white transition-all text-slate-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Short Description</label>
                    <input
                      type="text"
                      value={formData.short_description}
                      onChange={(e) => setFormData({ ...formData, short_description: e.target.value })}
                      placeholder="Shown on the project card"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-sm bg-slate-50 focus:bg-white transition-all text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Detailed Description</label>
                    <textarea
                      value={formData.detailed_description}
                      onChange={(e) => setFormData({ ...formData, detailed_description: e.target.value })}
                      placeholder="Full description shown in the project details modal"
                      rows={3}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-sm bg-slate-50 focus:bg-white transition-all text-slate-900 resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Display Order</label>
                    <input
                      type="number"
                      value={formData.display_order === 0 ? '' : formData.display_order}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData({ ...formData, display_order: val === '' ? 0 : parseInt(val, 10) || 0 });
                      }}
                      onWheel={(e) => e.currentTarget.blur()}
                      placeholder="0"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-sm bg-slate-50 focus:bg-white transition-all text-slate-900"
                    />
                    <p className="text-xs text-slate-400 mt-1">Lower numbers appear first, both here and on the public website.</p>
                  </div>

                  <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-800 rounded-xl hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex items-center gap-2 px-5 py-2 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-primary/10 disabled:opacity-50"
                    >
                      {submitting ? <Loader2 size={16} className="animate-spin" /> : editId ? 'Save Changes' : 'Submit'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
