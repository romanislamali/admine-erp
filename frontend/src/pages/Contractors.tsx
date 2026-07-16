import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, Phone, Mail, MapPin, X, Loader2 } from 'lucide-react';
import Table from '../components/Table';

interface Contractor {
  id: number;
  name: string;
  phone: string;
  email: string;
  address: string;
  total_bills: string | number;
  total_payments: string | number;
  balance: string | number;
}

export default function Contractors() {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: ''
  });

  const fetchContractors = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/contractors');
      if (!res.ok) throw new Error('Failed to fetch contractors');
      const data = await res.json();
      setContractors(data);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContractors();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      setSubmitting(true);
      const res = await fetch('/api/contractors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!res.ok) throw new Error('Failed to create contractor');
      
      setFormData({ name: '', phone: '', email: '', address: '' });
      setIsModalOpen(false);
      fetchContractors();
    } catch (err: any) {
      alert(err.message || 'Failed to create contractor');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (val: string | number) => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(num || 0);
  };

  const columns = [
    {
      header: 'Contractor',
      key: 'name',
      sortable: true,
      render: (c: Contractor) => (
        <div>
          <div className="font-semibold text-slate-900">{c.name}</div>
          <div className="text-xs text-slate-400 font-mono mt-0.5">ID: #{c.id}</div>
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
      render: (c: Contractor) => formatCurrency(c.total_bills)
    },
    {
      header: 'Total Paid',
      key: 'total_payments',
      align: 'right' as const,
      sortable: true,
      render: (c: Contractor) => (
        <span className="font-semibold text-amber-700">
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
          <div className={`font-semibold inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs ${
            isNegative 
              ? 'bg-amber-50 text-emerald-600 border border-amber-200/50' 
              : balanceNum > 0 
              ? 'bg-rose-50 text-rose-700 border border-rose-200/50'
              : 'bg-slate-50 text-slate-600 border border-slate-200/50'
          }`}>
            {formatCurrency(Math.abs(balanceNum))}
            {isNegative && <span className="text-[10px] uppercase font-bold tracking-tight">(Advance)</span>}
            {balanceNum > 0 && <span className="text-[10px] uppercase font-bold tracking-tight">(Due)</span>}
          </div>
        );
      }
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
            Contractor Directory
          </h1>
          <p className="text-slate-500 mt-1">Manage vendor details, track invoices, payments, and live balances.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-semibold rounded-xl hover:bg-primary-hover shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <UserPlus size={18} />
          Add Contractor
        </button>
      </div>

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
          data={contractors}
          columns={columns}
          searchKeys={['name', 'email', 'phone', 'address']}
          searchPlaceholder="Search contractors by name, email, phone or address..."
          keyExtractor={(c) => c.id}
          emptyMessage="No contractors found in database. Get started by adding one above."
        />
      )}

      {/* Add Contractor Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-md p-6 rounded-2xl shadow-xl z-10 border border-slate-100"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-slate-900">New Contractor</h3>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Company / Contractor Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter name"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-sm bg-slate-50 focus:bg-white transition-all text-slate-900"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="e.g. +1 555-0199"
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
