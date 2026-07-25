import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Wallet, Loader2, ArrowUpRight } from 'lucide-react';

interface Payment {
  id: number;
  contractor_id: number;
  contractor_name: string;
  bill_id: number;
  bill_invoice: string;
  amount: string | number;
  payment_date: string;
}

interface Contractor {
  id: number;
  name: string;
}

interface Bill {
  id: number;
  invoice_number: string;
  contractor_id: number;
  amount: string | number;
}

export default function Payment() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    contractor_id: '',
    bill_id: '',
    amount: '',
    payment_date: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [payRes, contRes, billRes] = await Promise.all([
        fetch('/api/payments'),
        fetch('/api/contractors'),
        fetch('/api/bills')
      ]);

      if (!payRes.ok || !contRes.ok || !billRes.ok) throw new Error('Failed to fetch data');

      const paysData = await payRes.json();
      const contsData = await contRes.json();
      const billsData = await billRes.json();

      setPayments(paysData);
      setContractors(contsData);
      setBills(billsData);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.contractor_id || !formData.amount.trim()) return;

    try {
      setSubmitting(true);
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contractor_id: parseInt(formData.contractor_id),
          bill_id: formData.bill_id ? parseInt(formData.bill_id) : null,
          amount: parseFloat(formData.amount),
          payment_date: formData.payment_date || null
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to create payment');
      }

      setFormData({
        contractor_id: '',
        bill_id: '',
        amount: '',
        payment_date: ''
      });
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to create payment');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (val: string | number) => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    if (isNaN(num) || num === null || num === undefined) return '0';
    return new Intl.NumberFormat('en-US', {
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

  // Filter bills based on selected contractor
  const filteredBills = bills.filter(
    (b) => b.contractor_id === parseInt(formData.contractor_id)
  );

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
              Payment Log
            </h1>
            <p className="text-slate-500 mt-1">Record contractor cash disbursements and adjust accounting ledgers.</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-semibold rounded-xl hover:bg-primary-hover shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Wallet size={18} />
            Record Payment
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
        ) : payments.length === 0 ? (
          <div className="glass-card py-20 flex flex-col items-center justify-center text-slate-500 border-dashed bg-slate-50/30">
            <Wallet size={48} className="text-slate-300 mb-3" />
            <p className="text-lg font-medium text-slate-600">No payments found</p>
            <p className="text-sm">Log your first supplier payment check to clear outstanding liabilities.</p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                    <th className="px-6 py-4">Payment Ref</th>
                    <th className="px-6 py-4">Contractor</th>
                    <th className="px-6 py-4">Linked Invoice</th>
                    <th className="px-6 py-4">Payment Date</th>
                    <th className="px-6 py-4 text-right">Paid Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {payments.map((p) => (
                    <motion.tr
                      key={p.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="px-6 py-4 font-mono">
                        <div className="flex items-center gap-2">
                          <ArrowUpRight size={16} className="text-emerald-555 shrink-0" />
                          <span className="font-semibold text-slate-900">REF-{p.id.toString().padStart(4, '0')}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">DB_ID: #{p.id}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-700">{p.contractor_name || 'N/A'}</div>
                        <div className="text-xs text-slate-405 font-mono">ID: #{p.contractor_id}</div>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {p.bill_invoice ? (
                          <div>
                            <div className="font-semibold text-slate-700">{p.bill_invoice}</div>
                            <div className="text-[10px] text-slate-400 font-mono">BILL_ID: #{p.bill_id}</div>
                          </div>
                        ) : (
                          <span className="text-amber-700 bg-amber-50/70 px-2.5 py-1 rounded-lg text-xs border border-amber-200/50 font-bold whitespace-nowrap">Unlinked / Advance</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-600 font-medium font-mono">
                        {formatDate(p.payment_date)}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-emerald-600">
                        {formatCurrency(p.amount)}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        </div>

        {/* Record Payment Modal */}
        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsModalOpen(false)}
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative bg-white w-full max-w-md p-6 rounded-2xl shadow-xl z-10 border border-slate-100"
              >
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-slate-900">Record Payment</h3>
                  <button
                    onClick={() => setIsModalOpen(false)}
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
                      onChange={(e) => setFormData({ ...formData, contractor_id: e.target.value, bill_id: '' })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-sm bg-slate-50 focus:bg-white transition-all text-slate-900"
                    >
                      <option value="" disabled>-- Select Contractor --</option>
                      {contractors.map((c) => (
                        <option key={c.id} value={c.id}>{c.name} (ID: #{c.id})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Link to Invoice (Optional)</label>
                    <select
                      value={formData.bill_id}
                      disabled={!formData.contractor_id}
                      onChange={(e) => {
                        const selectedBill = bills.find((b) => b.id === parseInt(e.target.value));
                        setFormData({
                          ...formData,
                          bill_id: e.target.value,
                          amount: selectedBill ? selectedBill.amount.toString() : formData.amount
                        });
                      }}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-sm bg-slate-50 focus:bg-white focus:disabled:bg-slate-100 disabled:opacity-65 transition-all text-slate-900"
                    >
                      <option value="">-- No Direct Link (Advance Payment) --</option>
                      {filteredBills.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.invoice_number || `INV-${b.id}`} ({formatCurrency(b.amount)})
                        </option>
                      ))}
                    </select>
                    {!formData.contractor_id && (
                      <p className="text-[10px] text-slate-400 mt-1">Please select a contractor to view outstanding invoices.</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Payment Date</label>
                      <input
                        type="date"
                        value={formData.payment_date}
                        onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-sm bg-slate-50 focus:bg-white transition-all text-slate-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Paid Amount *</label>
                    <div className="relative">
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
                  </div>

                  <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
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