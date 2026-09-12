import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, X, Loader2, Pencil, Trash2, ImageOff, FolderKanban } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Table from '../../components/Table';
import ImageUpload from '../../components/ImageUpload';
import ToggleSwitch from '../../components/ToggleSwitch';
import { useModal } from '../../context/ModalContext';

interface CmsClient {
  id: string;
  name: string;
  logo_path: string | null;
  short_description: string | null;
  detailed_description: string | null;
  display_order: number;
  is_active: boolean;
  created_by?: string;
  updated_by?: string;
}

const emptyForm = {
  name: '',
  short_description: '',
  detailed_description: '',
  display_order: 0
};

export default function CmsClients() {
  const navigate = useNavigate();
  const { showSuccess, showError, confirmDelete } = useModal();

  const [clients, setClients] = useState<CmsClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editingLogoPath, setEditingLogoPath] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const [lazyParams, setLazyParams] = useState({
    page: 1,
    limit: 10,
    search: '',
    sortField: null as string | null,
    sortOrder: null as 'asc' | 'desc' | null
  });
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const refreshClients = () => setRefreshTrigger((prev) => prev + 1);

  const [formData, setFormData] = useState(emptyForm);

  const fetchClients = async (params: typeof lazyParams) => {
    try {
      setTableLoading(true);
      const query = new URLSearchParams({
        page: params.page.toString(),
        limit: params.limit.toString(),
        search: params.search,
        ...(params.sortField ? { sortField: params.sortField } : {}),
        ...(params.sortOrder ? { sortOrder: params.sortOrder } : {})
      });

      const res = await fetch(`/api/cms/clients/admin?${query.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch clients');

      const resData = await res.json();
      setClients(resData.data);
      setTotalRecords(resData.total);
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching clients');
    } finally {
      setTableLoading(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients(lazyParams);
  }, [lazyParams, refreshTrigger]);

  const uploadLogo = async (clientId: string) => {
    if (!logoFile) return;
    const body = new FormData();
    body.append('logo', logoFile);
    const res = await fetch(`/api/cms/clients/${clientId}/logo`, { method: 'POST', body });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || 'Failed to upload logo');
    }
  };

  const handleEdit = (client: CmsClient) => {
    setEditId(client.id);
    setEditingLogoPath(client.logo_path);
    setLogoFile(null);
    setFormData({
      name: client.name,
      short_description: client.short_description || '',
      detailed_description: client.detailed_description || '',
      display_order: client.display_order
    });
    setIsModalOpen(true);
  };

  const handleToggleActive = async (client: CmsClient) => {
    try {
      const res = await fetch(`/api/cms/clients/${client.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !client.is_active })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update status');
      refreshClients();
    } catch (err: any) {
      await showError('Update Failed', err.message || 'Unable to update client status.');
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirmDelete(
      'Remove Client?',
      'This will remove the client and its logo from the public website.'
    );
    if (!confirmed) return;

    try {
      setSubmitting(true);
      const res = await fetch(`/api/cms/clients/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to delete client');

      setSubmitting(false);
      await Promise.race([
        showSuccess('Client Deleted', 'Client has been successfully deleted.'),
        new Promise((resolve) => setTimeout(resolve, 1000))
      ]);
      refreshClients();
    } catch (err: any) {
      setSubmitting(false);
      await Promise.race([
        showError('Deletion Failed', err.message || 'Unable to delete the client. Please try again.'),
        new Promise((resolve) => setTimeout(resolve, 1000))
      ]);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditId(null);
    setEditingLogoPath(null);
    setLogoFile(null);
    setFormData(emptyForm);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    const currentName = formData.name;
    const isEditing = Boolean(editId);

    try {
      setSubmitting(true);
      const url = editId ? `/api/cms/clients/${editId}` : '/api/cms/clients';
      const method = editId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || `Failed to ${isEditing ? 'update' : 'create'} client`);

      if (logoFile) {
        await uploadLogo(data.id);
      }

      handleCloseModal();
      setSubmitting(false);
      refreshClients();

      await Promise.race([
        showSuccess(
          isEditing ? 'Client Updated' : 'Client Added',
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
      render: (c: CmsClient) => (
        <div className="flex items-center gap-1.5 justify-center">
          <button
            onClick={() => navigate(`/cms/clients/${c.id}/projects`)}
            title="Manage projects"
            className="p-1 px-1.5 text-slate-400 hover:text-primary hover:bg-slate-50 rounded transition-colors"
          >
            <FolderKanban size={16} />
          </button>
          <button
            onClick={() => handleEdit(c)}
            title="Edit client"
            className="p-1 px-1.5 text-slate-400 hover:text-green-600 hover:bg-slate-50 rounded transition-colors"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={() => handleDelete(c.id)}
            title="Delete client"
            className="p-1 px-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-50 rounded transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )
    },
    {
      header: 'Logo',
      key: 'logo_path',
      sortable: false,
      render: (c: CmsClient) =>
        c.logo_path ? (
          <img src={c.logo_path} alt={c.name} className="h-12 w-12 object-cover rounded-lg border border-slate-200" />
        ) : (
          <div className="h-12 w-12 flex items-center justify-center rounded-lg bg-slate-100 text-slate-300">
            <ImageOff size={18} />
          </div>
        )
    },
    {
      header: 'Name',
      key: 'name',
      sortable: true,
      render: (c: CmsClient) => (
        <div>
          <div className="font-semibold text-slate-900">{c.name}</div>
          {c.short_description && <div className="text-xs text-slate-400 truncate max-w-[220px]">{c.short_description}</div>}
        </div>
      )
    },
    {
      header: 'Display Order',
      key: 'display_order',
      align: 'center' as const,
      sortable: true,
      render: (c: CmsClient) => <span className="text-slate-600 font-semibold">{c.display_order}</span>
    },
    {
      header: 'Status',
      key: 'is_active',
      align: 'center' as const,
      sortable: true,
      render: (c: CmsClient) => (
        <div className="flex items-center justify-center gap-2">
          <ToggleSwitch checked={c.is_active} onChange={() => handleToggleActive(c)} />
          <span className={`text-xs font-semibold ${c.is_active ? 'text-green-600' : 'text-slate-400'}`}>
            {c.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>
      )
    }
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="bg-white shadow-sm shadow-amber-100 p-5 rounded-xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-slate-800 to-slate-600">
              Website Clients / Partners
            </h1>
            <p className="text-slate-500 mt-1">Manage the client logos shown on the public website's Partners section.</p>
          </div>
          <button
            onClick={() => {
              setEditId(null);
              setEditingLogoPath(null);
              setLogoFile(null);
              setFormData(emptyForm);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-semibold rounded-xl hover:bg-primary-hover shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <UserPlus size={18} />
            Add Client
          </button>
        </div>

        <div className="mt-2">
          {error && <div className="bg-rose-50 border border-rose-200 text-rose-600 p-4 rounded-xl text-sm">{error}</div>}

          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="animate-spin text-primary" size={32} />
            </div>
          ) : (
            <Table<CmsClient>
              data={clients}
              columns={columns}
              keyExtractor={(c) => c.id}
              emptyMessage="No clients found. Get started by adding one above."
              lazy
              totalRecords={totalRecords}
              loading={tableLoading}
              onLazyLoad={(params) => setLazyParams(params)}
              searchPlaceholder="Search by client name"
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
                className="relative bg-white w-full max-w-md p-6 rounded-2xl shadow-xl z-10 border border-slate-100 max-h-[90vh] overflow-y-auto"
              >
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-slate-900">{editId ? 'Update Client' : 'Add New Client'}</h3>
                  <button onClick={handleCloseModal} className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 transition-colors">
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <ImageUpload label="Logo" currentImageUrl={editingLogoPath} onFileSelect={setLogoFile} />

                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                      Client Name <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Shah Cement"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-sm bg-slate-50 focus:bg-white transition-all text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Short Description</label>
                    <input
                      type="text"
                      value={formData.short_description}
                      onChange={(e) => setFormData({ ...formData, short_description: e.target.value })}
                      placeholder="One-line summary shown in previews"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-sm bg-slate-50 focus:bg-white transition-all text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Detailed Description</label>
                    <textarea
                      value={formData.detailed_description}
                      onChange={(e) => setFormData({ ...formData, detailed_description: e.target.value })}
                      placeholder="Full description shown in the client details modal"
                      rows={3}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-sm bg-slate-50 focus:bg-white transition-all text-slate-900 resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Display Order</label>
                    <input
                      type="number"
                      value={formData.display_order}
                      onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value, 10) || 0 })}
                      placeholder="0"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-sm bg-slate-50 focus:bg-white transition-all text-slate-900"
                    />
                    <p className="text-xs text-slate-400 mt-1">Lower numbers appear first on the public website.</p>
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
