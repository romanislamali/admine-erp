import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FolderKanban, Loader2, Pencil, Trash2 } from 'lucide-react';
import Table, { Column } from '../components/Table';
import { useModal } from '../context/ModalContext';
import { useAuth } from '../context/AuthContext';

interface Project {
  id: string;
  name: string;
  description: string;
  contractor_id: string;
  contractor_name: string;
  start_date: string;
  end_date: string;
  status: string;
  created_by?: string;
  updated_by?: string;
}

interface Contractor {
  id: string;
  name: string;
}

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const { confirmDelete, showSuccess, showError } = useModal();

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    contractor_id: '',
    start_date: '',
    end_date: '',
    status: 'Planned'
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [projRes, contRes] = await Promise.all([
        fetch('/api/projects'),
        fetch('/api/contractors')
      ]);

      if (!projRes.ok || !contRes.ok) throw new Error('Failed to fetch data');

      const projs = await projRes.json();
      const conts = await contRes.json();

      setProjects(projs);
      setContractors(conts);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleEdit = (project: Project) => {
    setEditId(project.id);
    setFormData({
      name: project.name || '',
      description: project.description || '',
      contractor_id: project.contractor_id ? project.contractor_id.toString() : '',
      start_date: project.start_date ? project.start_date.split('T')[0] : '',
      end_date: project.end_date ? project.end_date.split('T')[0] : '',
      status: project.status || 'Planned'
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirmDelete(
      'Delete Project?',
      'This will permanently delete this project. This action cannot be undone.'
    );
    if (!confirmed) return;

    try {
      setSubmitting(true);
      const res = await fetch(`/api/projects/${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to delete project');
      }

      setSubmitting(false);

      // Refresh project list
      fetchData();

      // Show success popup with automatic 1-second dismiss
      await Promise.race([
        showSuccess(
          'Project Deleted',
          'The project has been successfully deleted.'
        ),
        new Promise((resolve) => setTimeout(resolve, 1000))
      ]);
    } catch (err: any) {
      setSubmitting(false);
      await Promise.race([
        showError(
          'Deletion Failed',
          err.message || 'Could not delete project.'
        ),
        new Promise((resolve) => setTimeout(resolve, 1000))
      ]);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditId(null);
    setFormData({
      name: '',
      description: '',
      contractor_id: '',
      start_date: '',
      end_date: '',
      status: 'Planned'
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.contractor_id) return;

    const isEditing = Boolean(editId);
    const projectName = formData.name;

    try {
      setSubmitting(true);
      const url = editId ? `/api/projects/${editId}` : '/api/projects';
      const method = editId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          contractor_id: formData.contractor_id,
          start_date: formData.start_date || null,
          end_date: formData.end_date || null
        })
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || `Failed to ${isEditing ? 'update' : 'create'} project`);

      // Close modal & stop spinner immediately before showing popup
      handleCloseModal();
      setSubmitting(false);

      // Refresh list
      fetchData();

      // Show success popup with automatic 1-second dismiss
      await Promise.race([
        showSuccess(
          isEditing ? 'Project Updated' : 'Project Created',
          isEditing
            ? `Project "${projectName}" details were successfully updated.`
            : `Project "${projectName}" was successfully created.`
        ),
        new Promise((resolve) => setTimeout(resolve, 1000))
      ]);
    } catch (err: any) {
      setSubmitting(false);

      // Show error popup with automatic 1-second dismiss
      await Promise.race([
        showError(
          'Operation Failed',
          err.message || 'Unable to save project details. Please try again.'
        ),
        new Promise((resolve) => setTimeout(resolve, 1000))
      ]);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-250';
      case 'Completed':
        return 'bg-indigo-50 text-indigo-700 border border-indigo-250';
      case 'Planned':
        return 'bg-sky-50 text-sky-700 border border-sky-250';
      case 'Suspended':
      default:
        return 'bg-rose-50 text-rose-700 border border-rose-250';
    }
  };

  const columns: Column<Project>[] = [
    {
      header: 'Action',
      key: 'action',
      render: (p: Project) => (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handleEdit(p)}
            title="Edit project"
            className="p-1 px-1.5 text-slate-400 hover:text-green-600 hover:bg-slate-50 rounded transition-colors"
          >
            <Pencil size={16} />
          </button>
          {isAdmin && (
            <button
              onClick={() => handleDelete(p.id)}
              title="Delete project"
              className="p-1 px-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-50 rounded transition-colors"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      )
    },
    {
      header: 'Project Name',
      key: 'name',
      sortable: true,
      render: (p: Project) => (
        <div>
          <div className="font-bold text-slate-900 text-sm">{p.name}</div>
        </div>
      )
    },
    {
      header: 'Contractor',
      key: 'contractor_name',
      sortable: true,
      render: (p: Project) => (
        <span className="font-semibold text-slate-700">{p.contractor_name || 'Unassigned'}</span>
      )
    },
    {
      header: 'Start Date',
      key: 'start_date',
      sortable: true,
      render: (p: Project) => (
        <span className="text-slate-600">{formatDate(p.start_date)}</span>
      )
    },
    {
      header: 'Expected End Date',
      key: 'end_date',
      sortable: true,
      render: (p: Project) => (
        <span className="text-slate-600">{formatDate(p.end_date)}</span>
      )
    },
    {
      header: 'Status',
      key: 'status',
      sortable: true,
      render: (p: Project) => (
        <span className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${getStatusBadgeClass(p.status)}`}>
          {p.status}
        </span>
      )
    },
    {
      header: 'Description',
      key: 'description',
      sortable: false,
      render: (p: Project) => (
        <span className="text-slate-500 text-xs line-clamp-1 max-w-xs" title={p.description}>
          {p.description || '—'}
        </span>
      )
    },
    ...(isAdmin ? [{
      header: 'Created / Updated By',
      key: 'created_by',
      sortable: true,
      render: (p: Project) => (
        <div className="space-y-1 text-xs">
          <div className="text-slate-600"><span className="font-semibold text-slate-500">Created:</span> {p.created_by || '—'}</div>
          <div className="text-slate-400"><span className="font-semibold text-slate-400">Updated:</span> {p.updated_by || '—'}</div>
        </div>
      )
    }] : [])
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className='bg-white shadow-sm shadow-amber-100 p-5 rounded-xl'>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-slate-800 to-slate-600">
              Project Portfolio
            </h1>
            <p className="text-slate-500 mt-1">Track active, planned, and completed projects assigned to contractors.</p>
          </div>
          <button
            onClick={() => {
              setEditId(null);
              setFormData({
                name: '',
                description: '',
                contractor_id: '',
                start_date: '',
                end_date: '',
                status: 'Planned'
              });
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-semibold rounded-xl hover:bg-primary-hover shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <FolderKanban size={18} />
            Create Project
          </button>
        </div>

        <div className='mt-6'>
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-600 p-4 rounded-xl text-sm mb-4">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="animate-spin text-primary" size={32} />
            </div>
          ) : (
            <Table<Project>
              data={projects}
              columns={columns}
              searchKeys={['name', 'contractor_name', 'status', 'description']}
              searchPlaceholder="Search projects by name, contractor, status..."
              initialItemsPerPage={10}
              keyExtractor={(row) => row.id}
              emptyMessage="No projects found."
            />
          )}
        </div>

        {/* Create / Edit Project Modal */}
        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
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
                className="relative bg-white w-full max-w-md p-6 rounded-2xl shadow-xl z-10 border border-slate-100"
              >
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-slate-900">
                    {editId ? 'Update Project' : 'Create New Project'}
                  </h3>
                  <button
                    onClick={handleCloseModal}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Project Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Enter project name"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-sm bg-slate-50 focus:bg-white transition-all text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Contractor Link *</label>
                    <select
                      required
                      value={formData.contractor_id}
                      onChange={(e) => setFormData({ ...formData, contractor_id: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-sm bg-slate-50 focus:bg-white transition-all text-slate-900"
                    >
                      <option value="" disabled>-- Select Contractor --</option>
                      {contractors.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Start Date</label>
                      <input
                        type="date"
                        value={formData.start_date}
                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-sm bg-slate-50 focus:bg-white transition-all text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Expected End Date</label>
                      <input
                        type="date"
                        value={formData.end_date}
                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-sm bg-slate-50 focus:bg-white transition-all text-slate-900"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Status</label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-sm bg-slate-50 focus:bg-white transition-all text-slate-900"
                      >
                        <option value="Planned">Planned</option>
                        <option value="Active">Active</option>
                        <option value="Completed">Completed</option>
                        <option value="Suspended">Suspended</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Project Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Provide details about the project timeline and scope..."
                      rows={3}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-sm bg-slate-50 focus:bg-white transition-all text-slate-900 resize-none select-all"
                    />
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
                      {submitting ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : editId ? (
                        'Save Changes'
                      ) : (
                        'Submit'
                      )}
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