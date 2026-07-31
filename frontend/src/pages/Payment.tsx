import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Wallet, Loader2, ArrowUpRight, Pencil, Trash2 } from 'lucide-react';
import Table, { Column } from '../components/Table';
import { useModal } from '../context/ModalContext';
import { useAuth } from '../context/AuthContext';

interface Payment {
  id: string;
  contractor_id: string;
  contractor_name: string;
  project_id?: string | null;
  project_name?: string;
  bill_id?: string | null;
  bill_invoice?: string;
  amount: string | number;
  payment_date: string;
}

interface Contractor {
  id: string;
  name: string;
}

interface Bill {
  id: string;
  invoice_number: string;
  contractor_id: string;
  amount: string | number;
}

interface Project {
  id: string;
  name: string;
  contractor_id: string;
}

export default function Payment() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const { showSuccess, showError, confirmDelete } = useModal();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
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
    bill_id: '',
    amount: '',
    payment_date: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [payRes, contRes, billRes, projRes] = await Promise.all([
        fetch('/api/payments'),
        fetch('/api/contractors'),
        fetch('/api/bills'),
        fetch('/api/projects')
      ]);

      if (!payRes.ok || !contRes.ok || !billRes.ok) throw new Error('Failed to fetch data');

      const paysData = await payRes.json();
      const contsData = await contRes.json();
      const billsData = await billRes.json();

      setPayments(paysData);
      setContractors(contsData);
      setBills(billsData);

      if (projRes.ok) {
        const projsData = await projRes.json();
        setProjects(projsData);
      }
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
      bill_id: '',
      amount: '',
      payment_date: ''
    });
  };

  const handleEdit = (payment: Payment) => {
    setEditId(payment.id);
    setFormData({
      contractor_id: payment.contractor_id || '',
      project_id: payment.project_id || '',
      bill_id: payment.bill_id || '',
      amount: payment.amount ? payment.amount.toString() : '',
      payment_date: payment.payment_date ? new Date(payment.payment_date).toISOString().split('T')[0] : ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirmDelete(
      'Delete Payment Record?',
      'Are you sure you want to remove this payment record? This action is irreversible.'
    );
    if (!confirmed) return;

    try {
      setSubmitting(true);
      const res = await fetch(`/api/payments/${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to delete payment');
      }

      setSubmitting(false);

      // Refresh payments list
      fetchData();

      // Show success popup with automatic 1-second dismiss
      await Promise.race([
        showSuccess(
          'Payment Deleted',
          'The payment record has been successfully removed.'
        ),
        new Promise((resolve) => setTimeout(resolve, 1000))
      ]);
    } catch (err: any) {
      setSubmitting(false);
      await Promise.race([
        showError(
          'Deletion Failed',
          err.message || 'We could not delete this payment record.'
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
      const url = editId ? `/api/payments/${editId}` : '/api/payments';
      const method = editId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contractor_id: formData.contractor_id,
          project_id: formData.project_id || null,
          bill_id: formData.bill_id || null,
          amount: parseFloat(formData.amount),
          payment_date: formData.payment_date || null
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || `Failed to ${isEditing ? 'update' : 'create'} payment`);
      }

      // Close modal & stop spinner immediately
      handleCloseModal();
      setSubmitting(false);

      // Refresh table data
      fetchData();

      // Show success popup with automatic 1-second dismiss
      await Promise.race([
        showSuccess(
          isEditing ? 'Payment Updated' : 'Payment Recorded',
          isEditing ? 'Payment record details were successfully updated.' : 'Payment has been recorded successfully.'
        ),
        new Promise((resolve) => setTimeout(resolve, 1000))
      ]);
    } catch (err: any) {
      setSubmitting(false);

      // Show error popup with automatic 1-second dismiss
      await Promise.race([
        showError(
          'Operation Failed',
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

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Filter bills and projects based on selected contractor
  const filteredBills = bills.filter(
    (b) => b.contractor_id === formData.contractor_id
  );

  const filteredProjects = projects.filter(
    (p) => p.contractor_id === formData.contractor_id
  );

  const columns: Column<Payment>[] = [
    {
      header: 'Action',
      key: 'action',
      render: (p: Payment) => (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handleEdit(p)}
            title="Edit payment"
            className="p-1 px-1.5 text-slate-400 hover:text-green-600 hover:bg-slate-50 rounded transition-colors"
          >
            <Pencil size={16} />
          </button>
          {isAdmin && (
            <button
              onClick={() => handleDelete(p.id)}
              title="Delete payment"
              className="p-1 px-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-50 rounded transition-colors"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      )
    },
    {
      header: 'Payment Ref',
      key: 'id',
      sortable: true,
      render: (p: Payment) => (
        <div className="flex items-center gap-2 font-mono">
          <ArrowUpRight size={16} className="text-emerald-555 shrink-0" />
          <span className="font-semibold text-slate-900">REF-{p.id.slice(0, 8)}</span>
        </div>
      )
    },
    {
      header: 'Contractor',
      key: 'contractor_name',
      sortable: true,
      render: (p: Payment) => (
        <div className="font-medium text-slate-700">{p.contractor_name || 'N/A'}</div>
      )
    },
    {
      header: 'Project',
      key: 'project_name',
      sortable: true,
      render: (p: Payment) => (
        p.project_name ? (
          <span className="font-semibold text-slate-700">{p.project_name}</span>
        ) : (
          <span className="text-slate-400 text-xs italic">N/A</span>
        )
      )
    },
    {
      header: 'Linked Invoice',
      key: 'bill_invoice',
      sortable: true,
      render: (p: Payment) => (
        p.bill_invoice ? (
          <span className="font-semibold text-slate-700">{p.bill_invoice}</span>
        ) : (
          <span className="text-amber-700 bg-amber-50/70 px-2.5 py-1 rounded-lg text-xs border border-amber-200/50 font-bold whitespace-nowrap">Unlinked / Advance</span>
        )
      )
    },
    {
      header: 'Payment Date',
      key: 'payment_date',
      sortable: true,
      render: (p: Payment) => (
        <span className="text-slate-600 font-medium font-mono">{formatDate(p.payment_date)}</span>
      )
    },
    {
      header: 'Paid Amount',
      key: 'amount',
      align: 'right',
      sortable: true,
      render: (p: Payment) => (
        <span className="font-bold text-emerald-600">{formatCurrency(p.amount)}</span>
      )
    }
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
              Payments Ledger
            </h1>
            <p className="text-slate-500 mt-1">Record contractor cash disbursements and adjust accounting ledgers.</p>
          </div>
          <button
            onClick={() => {
              setEditId(null);
              setFormData({
                contractor_id: '',
                project_id: '',
                bill_id: '',
                amount: '',
                payment_date: ''
              });
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-semibold rounded-xl hover:bg-primary-hover shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Wallet size={18} />
            New Payment
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
              data={payments}
              columns={columns}
              searchKeys={['id', 'contractor_name', 'project_name', 'bill_invoice', 'amount']}
              searchPlaceholder="Search payments by reference, contractor, project..."
              keyExtractor={(p) => p.id}
              emptyMessage="No payments found in database. Get started by recording one above."
            />
          )}
        </div>

        {/* Record/Edit Payment Modal */}
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
                  <h3 className="text-xl font-bold text-slate-900">{editId ? 'Edit Payment' : 'New Payment'}</h3>
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
                      onChange={(e) => setFormData({ ...formData, contractor_id: e.target.value, project_id: '', bill_id: '' })}
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
                    <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Link to Invoice (Optional)</label>
                    <select
                      value={formData.bill_id}
                      disabled={!formData.contractor_id}
                      onChange={(e) => setFormData({ ...formData, bill_id: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-sm bg-slate-50 focus:bg-white focus:disabled:bg-slate-100 disabled:opacity-65 transition-all text-slate-900"
                    >
                      <option value="">-- Unlinked / Advance Payment --</option>
                      {filteredBills.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.invoice_number || `INV-${b.id}`} ({formatCurrency(b.amount)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Payment Date</label>
                    <input
                      type="date"
                      value={formData.payment_date}
                      onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-sm bg-slate-50 focus:bg-white transition-all text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Payment Amount *</label>
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