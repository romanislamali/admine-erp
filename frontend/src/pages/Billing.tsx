import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ReceiptText, Loader2, FileText, Pencil, Trash2 } from 'lucide-react';
import Table, { Column } from '../components/Table';
import { useModal } from '../context/ModalContext';
import { useAuth } from '../context/AuthContext';

interface Bill {
  id: string;
  contractor_id: string;
  contractor_name: string;
  project_id?: string | null;
  project_name?: string;
  amount: string | number;
  invoice_number: string;
  bill_date: string;
  created_by?: string;
  updated_by?: string;
}

interface Contractor {
  id: string;
  name: string;
}

interface Project {
  id: string;
  name: string;
  contractor_id: string;
}

export default function Billing() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const { showSuccess, showError, confirmDelete } = useModal();

  const [bills, setBills] = useState<Bill[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    contractor_id: '',
    project_id: '',
    amount: '',
    invoice_number: '',
    bill_date: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [billRes, contRes, projRes] = await Promise.all([
        fetch('/api/bills'),
        fetch('/api/contractors'),
        fetch('/api/projects')
      ]);

      if (!billRes.ok || !contRes.ok || !projRes.ok) throw new Error('Failed to fetch data');

      const billsData = await billRes.json();
      const contsData = await contRes.json();
      const projsData = await projRes.json();

      setBills(billsData);
      setContractors(contsData);
      setProjects(projsData);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditId(null);
    setFormData({
      contractor_id: '',
      project_id: '',
      amount: '',
      invoice_number: '',
      bill_date: ''
    });
  };

  const handleEdit = (bill: Bill) => {
    setEditId(bill.id);
    setFormData({
      contractor_id: bill.contractor_id || '',
      project_id: bill.project_id || '',
      amount: bill.amount ? bill.amount.toString() : '',
      invoice_number: bill.invoice_number || '',
      bill_date: bill.bill_date ? new Date(bill.bill_date).toISOString().split('T')[0] : ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirmDelete(
      'Delete Invoice Bill?',
      'Are you sure you want to remove this bill? This action is irreversible.'
    );
    if (!confirmed) return;

    try {
      setSubmitting(true);
      const res = await fetch(`/api/bills/${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to delete bill');
      }

      setSubmitting(false);

      // Refresh data
      fetchData();

      // Show success modal and automatically close it after 1 second
      await Promise.race([
        showSuccess(
          'Bill Deleted',
          'The invoice bill has been successfully removed.'
        ),
        new Promise((resolve) => setTimeout(resolve, 1000))
      ]);
    } catch (err: any) {
      setSubmitting(false);
      await Promise.race([
        showError(
          'Deletion Failed',
          err.message || 'We could not delete this bill record.'
        ),
        new Promise((resolve) => setTimeout(resolve, 1000))
      ]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.contractor_id || !formData.amount.trim()) return;

    const isEditing = Boolean(editId);

    try {
      setSubmitting(true);
      const url = editId ? `/api/bills/${editId}` : '/api/bills';
      const method = editId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contractor_id: formData.contractor_id,
          project_id: formData.project_id || null,
          amount: parseFloat(formData.amount),
          invoice_number: formData.invoice_number || null,
          bill_date: formData.bill_date || null
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || `Failed to ${isEditing ? 'update' : 'create'} bill`);
      }

      // Close modal & stop spinner immediately
      handleCloseModal();
      setSubmitting(false);

      // Refresh table data
      fetchData();

      // Show success popup with automatic 1-second dismiss
      await Promise.race([
        showSuccess(
          isEditing ? 'Bill Updated' : 'Bill Created',
          isEditing ? 'Bill details were successfully updated.' : 'New bill has been successfully created.'
        ),
        new Promise((resolve) => setTimeout(resolve, 1000))
      ]);
    } catch (err: any) {
      setSubmitting(false);

      // Show error popup with automatic 1-second dismiss
      await Promise.race([
        showError(
          'Operation Failed',
          err.message || 'Unable to save bill details. Please try again.'
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

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Filter projects based on selected contractor
  const filteredProjects = projects.filter(
    (p) => p.contractor_id === formData.contractor_id
  );

  const columns: Column<Bill>[] = [
    {
      header: 'Action',
      key: 'action',
      render: (b: Bill) => (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handleEdit(b)}
            title="Edit bill"
            className="p-1 px-1.5 text-slate-400 hover:text-green-600 hover:bg-slate-50 rounded transition-colors"
          >
            <Pencil size={16} />
          </button>
          {isAdmin && (
            <button
              onClick={() => handleDelete(b.id)}
              title="Delete bill"
              className="p-1 px-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-50 rounded transition-colors"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      )
    },
    {
      header: 'Invoice #',
      key: 'invoice_number',
      sortable: true,
      render: (b: Bill) => (
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-slate-400 shrink-0" />
          <span className="font-semibold text-slate-900">{b.invoice_number || `INV-${b.id.slice(0, 8)}`}</span>
        </div>
      )
    },
    {
      header: 'Contractor',
      key: 'contractor_name',
      sortable: true,
      render: (b: Bill) => (
        <div className="font-medium text-slate-700">{b.contractor_name || 'N/A'}</div>
      )
    },
    {
      header: 'Associated Project',
      key: 'project_name',
      sortable: true,
      render: (b: Bill) => (
        b.project_name ? (
          <span className="font-medium text-slate-800">{b.project_name}</span>
        ) : (
          <span className="text-slate-400 text-xs italic">N/A</span>
        )
      )
    },
    {
      header: 'Invoice Date',
      key: 'bill_date',
      sortable: true,
      render: (b: Bill) => (
        <span className="text-slate-600 font-medium font-mono">{formatDate(b.bill_date)}</span>
      )
    },
    {
      header: 'Amount',
      key: 'amount',
      align: 'right',
      sortable: true,
      render: (b: Bill) => (
        <span className="font-bold text-slate-900">{formatCurrency(b.amount)}</span>
      )
    },
    ...(isAdmin ? [{
      header: 'Created / Updated By',
      key: 'created_by',
      sortable: true,
      render: (b: Bill) => (
        <div className="space-y-1 text-xs">
          <div className="text-slate-600"><span className="font-semibold text-slate-500">Created:</span> {b.created_by || '—'}</div>
          <div className="text-slate-400"><span className="font-semibold text-slate-400">Updated:</span> {b.updated_by || '—'}</div>
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
              Billing & Invoices
            </h1>
            <p className="text-slate-500 mt-1">Review contractor invoices and post new bills to update accounts.</p>
          </div>
          <button
            onClick={() => {
              setEditId(null);
              setFormData({
                contractor_id: '',
                project_id: '',
                amount: '',
                invoice_number: '',
                bill_date: ''
              });
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-semibold rounded-xl hover:bg-primary-hover shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <ReceiptText size={18} />
            Create Bill
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
            <Table
              data={bills}
              columns={columns}
              searchKeys={['invoice_number', 'contractor_name', 'project_name', 'amount']}
              searchPlaceholder="Search bills by invoice number, contractor, project..."
              keyExtractor={(b) => b.id}
              emptyMessage="No bills found in database. Get started by creating one above."
            />
          )}
        </div>

        {/* Create/Edit Bill Modal */}
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
                  <h3 className="text-xl font-bold text-slate-900">{editId ? 'Edit Bill' : 'Create New Bill'}</h3>
                  <button
                    onClick={handleCloseModal}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Contractor *</label>
                    <select
                      required
                      value={formData.contractor_id}
                      onChange={(e) => setFormData({ ...formData, contractor_id: e.target.value, project_id: '' })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-sm bg-slate-50 focus:bg-white transition-all text-slate-900"
                    >
                      <option value="" disabled>-- Select Contractor --</option>
                      {contractors.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Link to Project (Optional)</label>
                    <select
                      value={formData.project_id}
                      disabled={!formData.contractor_id}
                      onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-sm bg-slate-50 focus:bg-white focus:disabled:bg-slate-100 disabled:opacity-65 transition-all text-slate-900"
                    >
                      <option value="">-- No Project Link --</option>
                      {filteredProjects.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Invoice Number</label>
                    <input
                      type="text"
                      value={formData.invoice_number}
                      onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                      placeholder="e.g. INV-2024-001"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-sm bg-slate-50 focus:bg-white transition-all text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Invoice Date</label>
                    <input
                      type="date"
                      value={formData.bill_date}
                      onChange={(e) => setFormData({ ...formData, bill_date: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-sm bg-slate-50 focus:bg-white transition-all text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Bill Amount *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      placeholder="0"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-sm bg-slate-50 focus:bg-white transition-all text-slate-900"
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
                      {submitting ? <Loader2 size={16} className="animate-spin" /> : 'Submit'}
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