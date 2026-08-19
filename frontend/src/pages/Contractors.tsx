import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, Phone, Mail, MapPin, X, Loader2, Expand, Pencil, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Table from '../components/Table';
import { useAuth } from '../context/AuthContext';
import { useModal } from '../context/ModalContext';

interface Contractor {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  total_bills: string | number;
  total_payments: string | number;
  balance: string | number;
  created_by?: string;
  updated_by?: string;
}

export default function Contractors() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showSuccess, showError, confirmDelete } = useModal();
  const isAdmin = user?.role === 'ADMIN';

  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [lazyParams, setLazyParams] = useState({
    page: 1,
    limit: 10,
    search: '',
    sortField: null as string | null,
    sortOrder: null as 'asc' | 'desc' | null
  });
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refreshContractors = () => setRefreshTrigger((prev) => prev + 1);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: ''
  });

  const fetchContractors = async (params: typeof lazyParams) => {
    try {
      setTableLoading(true);
      const query = new URLSearchParams({
        page: params.page.toString(),
        limit: params.limit.toString(),
        search: params.search,
        ...(params.sortField ? { sortField: params.sortField } : {}),
        ...(params.sortOrder ? { sortOrder: params.sortOrder } : {})
      });

      const res = await fetch(`/api/contractors?${query.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch contractors');

      const resData = await res.json();
      setContractors(resData.data);
      setTotalRecords(resData.total);
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching contractors');
    } finally {
      setTableLoading(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContractors(lazyParams);
  }, [lazyParams, refreshTrigger]);

  const handleViewBillsAndPayments = (contractorId: string) => {
    navigate(`/contractor-details/${contractorId}`);
  };

  const handleEdit = (contractor: Contractor) => {
    setEditId(contractor.id);
    setFormData({
      name: contractor.name,
      phone: contractor.phone || '',
      email: contractor.email || '',
      address: contractor.address || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirmDelete(
      'Remove Contractor?',
      'This will permanently delete this contractor from the directory.'
    );
    if (!confirmed) return;

    try {
      setSubmitting(true);
      const res = await fetch(`/api/contractors/${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to delete contractor');
      }

      setSubmitting(false);

      // Show success modal and automatically close it after 1 second
      await Promise.race([
        showSuccess(
          'Contractor Deleted',
          'Contractor has been successfully deleted.'
        ),
        new Promise((resolve) => setTimeout(resolve, 1000))
      ]);

      refreshContractors();
    } catch (err: any) {
      setSubmitting(false);
      await Promise.race([
        showError(
          'Deletion Failed',
          err.message || 'Unable to delete the contractor. Please try again.'
        ),
        new Promise((resolve) => setTimeout(resolve, 1000))
      ]);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditId(null);
    setFormData({ name: '', phone: '', email: '', address: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    const currentName = formData.name;
    const isEditing = Boolean(editId);

    try {
      setSubmitting(true);
      const url = editId ? `/api/contractors/${editId}` : '/api/contractors';
      const method = editId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || `Failed to ${isEditing ? 'update' : 'create'} contractor`);
      }

      // Close modal & stop spinner immediately before showing popup
      handleCloseModal();
      setSubmitting(false);

      // Refresh list
      refreshContractors();

      // Show success popup with automatic 1-second dismiss
      await Promise.race([
        showSuccess(
          isEditing ? 'Contractor Updated' : 'Contractor Added',
          isEditing
            ? `${currentName} has been updated successfully.`
            : `${currentName} has been added successfully.`
        ),
        new Promise((resolve) => setTimeout(resolve, 1000))
      ]);
    } catch (err: any) {
      setSubmitting(false);

      // Show error popup with automatic 1-second dismiss
      await Promise.race([
        showError(
          'Database Sync Failed',
          err.message || 'Unable to store changes. Please try again.'
        ),
        new Promise((resolve) => setTimeout(resolve, 1000))
      ]);
    }
  };

  const formatCurrency = (val: string | number) => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    if (isNaN(num) || num === null || num === undefined) return '0';
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(num);
  };

  const columns = [
    {
      header: 'Action',
      key: 'action',
      render: (c: Contractor) => (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handleViewBillsAndPayments(c.id)}
            title="Bills and Payments"
            className="p-1 px-1.5 text-slate-400 hover:text-primary hover:bg-slate-50 rounded transition-colors"
          >
            <Expand size={16} />
          </button>
          <button
            onClick={() => handleEdit(c)}
            title="Edit contractor"
            className="p-1 px-1.5 text-slate-400 hover:text-green-600 hover:bg-slate-50 rounded transition-colors"
          >
            <Pencil size={16} />
          </button>
          {isAdmin && (
            <button
              onClick={() => handleDelete(c.id)}
              title="Delete contractor"
              className="p-1 px-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-50 rounded transition-colors"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      )
    },
    {
      header: 'Name',
      key: 'name',
      sortable: true,
      render: (c: Contractor) => (
        <div>
          <div className="font-semibold text-slate-900">{c.name}</div>
        </div>
      )
    },
    {
      header: 'Contact Info',
      key: 'email',
      sortable: true,
      render: (c: Contractor) => (
        <div className="space-y-1">
          {c.phone && (
            <div className="flex items-center gap-1.5 text-slate-600 text-xs">
              <Phone size={12} className="text-slate-400" />
              {c.phone}
            </div>
          )}
          {c.email && (
            <div className="flex items-center gap-1.5 text-slate-600 text-xs">
              <Mail size={12} className="text-slate-400" />
              {c.email}
            </div>
          )}
          {c.address && (
            <div className="flex items-center gap-1.5 text-slate-400 text-xs truncate max-w-[200px]" title={c.address}>
              <MapPin size={12} />
              {c.address}
            </div>
          )}
        </div>
      )
    },
    {
      header: 'Total Invoiced',
      key: 'total_bills',
      align: 'right' as const,
      sortable: true,
      render: (c: Contractor) => (
        <span className="font-semibold text-amber-700">
          {formatCurrency(c.total_bills)}
        </span>
      )
    },
    {
      header: 'Total Paid',
      key: 'total_payments',
      align: 'right' as const,
      sortable: true,
      render: (c: Contractor) => (
        <span className="font-semibold text-green-600">
          {formatCurrency(c.total_payments)}
        </span>
      )
    },
    {
      header: 'Outstanding Balance',
      key: 'balance',
      align: 'right' as const,
      sortable: true,
      render: (c: Contractor) => {
        const balanceNum = typeof c.balance === 'string' ? parseFloat(c.balance) : c.balance;
        const isNegative = balanceNum < 0;
        return (
          <div className={`font-semibold inline-flex items-center gap-1 px-2.5 py-1 rounded-lg ${isNegative
            ? 'text-emerald-600'
            : balanceNum > 0
              ? 'text-rose-700'
              : 'text-slate-600'
            }`}>
            {formatCurrency(Math.abs(balanceNum))}
            {isNegative && <span className="uppercase font-semibold tracking-tight">(Adv)</span>}
            {balanceNum > 0 && <span className="uppercase font-semibold tracking-tight">(Due)</span>}
          </div>
        );
      }
    },
    ...(isAdmin ? [{
      header: 'Created / Updated By',
      key: 'created_by',
      sortable: true,
      render: (c: Contractor) => (
        <div className="space-y-1 text-xs">
          <div className="text-slate-600"><span className="font-semibold text-slate-500">Created:</span> {c.created_by || '—'}</div>
          <div className="text-slate-400"><span className="font-semibold text-slate-400">Updated:</span> {c.updated_by || '—'}</div>
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
              Contractor Directory
            </h1>
            <p className="text-slate-500 mt-1">Manage vendor details, track invoices, payments, and live balances.</p>
          </div>
          <button
            onClick={() => {
              setEditId(null);
              setFormData({ name: '', phone: '', email: '', address: '' });
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-semibold rounded-xl hover:bg-primary-hover shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <UserPlus size={18} />
            Add Contractor
          </button>
        </div>

        <div className='mt-2'>
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-600 p-4 rounded-xl text-sm">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="animate-spin text-primary" size={32} />
            </div>
          ) : (
            <Table<Contractor>
              data={contractors}
              columns={columns}
              keyExtractor={(c) => c.id}
              emptyMessage="No contractors found in database. Get started by adding one above."
              lazy
              totalRecords={totalRecords}
              loading={tableLoading}
              onLazyLoad={(params) => setLazyParams(params)}
              searchPlaceholder="Search by name, email, phone or address"
            />
          )}
        </div>

        {/* Add/Edit Contractor Modal */}
        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={handleCloseModal}
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              />
              {/* Modal Content */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative bg-white w-full max-w-md p-6 rounded-2xl shadow-xl z-10 border border-slate-100 max-h-[90vh] overflow-y-auto"
              >
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-slate-900">
                    {editId ? 'Update Contractor Details' : 'Add New Contractor'}
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
                    <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Contractor Name <span className='text-red-600'>*</span></label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Enter name"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-sm bg-slate-50 focus:bg-white transition-all text-slate-900"
                    />
                  </div>

                  <div className="grid grid-cols-1 xs:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Phone Number</label>
                      <input
                        type="text"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="e.g. +8801xxxxxxx"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-sm bg-slate-50 focus:bg-white transition-all text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Email Address</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="email@company.com"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-sm bg-slate-50 focus:bg-white transition-all text-slate-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Street Address</label>
                    <textarea
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Enter physical address details"
                      rows={2}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-sm bg-slate-50 focus:bg-white transition-all text-slate-900 resize-none"
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