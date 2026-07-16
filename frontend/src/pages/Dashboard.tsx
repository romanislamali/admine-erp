import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, FolderKanban, ReceiptText, Wallet, Loader2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Contractor {
  id: number;
  name: string;
  balance: string | number;
}

interface Bill {
  id: number;
  contractor_name: string;
  amount: string | number;
  invoice_number: string;
  bill_date: string;
}

interface Payment {
  id: number;
  contractor_name: string;
  amount: string | number;
  payment_date: string;
}

interface Project {
  id: number;
  status: string;
}

export default function Dashboard() {
  const [data, setData] = useState({
    contractors: [] as Contractor[],
    bills: [] as Bill[],
    payments: [] as Payment[],
    projects: [] as Project[],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [contRes, billRes, payRes, projRes] = await Promise.all([
        fetch('/api/contractors'),
        fetch('/api/bills'),
        fetch('/api/payments'),
        fetch('/api/projects')
      ]);

      if (!contRes.ok || !billRes.ok || !payRes.ok || !projRes.ok) {
        throw new Error('Failed to load dashboard parameters');
      }

      setData({
        contractors: await contRes.json(),
        bills: await billRes.json(),
        payments: await payRes.json(),
        projects: await projRes.json(),
      });
    } catch (err: any) {
      setError(err.message || 'An error occurred fetching dashboard metrics');
    } finally {
      setData((prev) => ({ ...prev }));
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-40">
        <Loader2 className="animate-spin text-primary" size={36} />
      </div>
    );
  }

  // Calculations
  const totalInvoiced = data.bills.reduce((sum, b) => sum + parseFloat(b.amount as string || '0'), 0);
  const totalPaid = data.payments.reduce((sum, p) => sum + parseFloat(p.amount as string || '0'), 0);
  const outstandingBalance = totalInvoiced - totalPaid;

  const activeProjectsCount = data.projects.filter(p => p.status === 'Active').length;
  const totalProjectsCount = data.projects.length;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Compile recent activities chronologically
  const recentActivities = [
    ...data.bills.map(b => ({
      id: `bill-${b.id}`,
      type: 'Bill Logged',
      title: `${b.contractor_name} invoiced ${formatCurrency(parseFloat(b.amount as string))}`,
      ref: b.invoice_number || `INV-${b.id}`,
      date: new Date(b.bill_date),
      amount: parseFloat(b.amount as string),
    })),
    ...data.payments.map(p => ({
      id: `pay-${p.id}`,
      type: 'Payment Made',
      title: `Disbursed ${formatCurrency(parseFloat(p.amount as string))} to ${p.contractor_name}`,
      ref: `REF-${p.id.toString().padStart(4, '0')}`,
      date: new Date(p.payment_date),
      amount: parseFloat(p.amount as string),
    }))
  ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 5);

  const stats = [
    { name: 'Total Invoiced (Bills)', value: formatCurrency(totalInvoiced), icon: ReceiptText, color: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
    { name: 'Total Disbursed (Payments)', value: formatCurrency(totalPaid), icon: Wallet, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
    { name: 'Outstanding Liability', value: formatCurrency(outstandingBalance), icon: ArrowUpRight, color: 'text-rose-600 bg-rose-50 border-rose-100' },
    { name: 'Active Projects', value: `${activeProjectsCount} / ${totalProjectsCount}`, icon: FolderKanban, color: 'text-sky-600 bg-sky-50 border-sky-100' }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className='bg-white shadow-sm shadow-amber-100 p-5 rounded-xl'>
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-slate-800 to-slate-600">ERP System Overview</h1>
          <p className="text-slate-500 mt-1">Real-time status updates and contractor outstanding balances.</p>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-600 p-4 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-2">
          {stats.map((item) => (
            <div key={item.name} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">

              {/* Top Section: Icon and Name in a Row */}
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center border shrink-0 ${item.color}`}>
                  <item.icon size={22} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{item.name}</p>
                </div>
              </div>

              {/* Bottom Section: Value */}
              <div>
                <div className="text-xl font-black text-slate-800">{item.value}</div>
              </div>

            </div>
          ))}
        </div>

        {/* Main dashboard content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-4">

          {/* Contractor summaries */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">Active Ledgers</h3>
                  <p className="text-slate-500 text-xs mt-0.5">Quick lookup of outstanding contractor balances.</p>
                </div>
                <Link to="/contractors" className="flex items-center gap-1.5 text-xs text-primary font-bold hover:underline">
                  View Directory <ArrowRight size={14} />
                </Link>
              </div>
              {data.contractors.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center text-slate-450 text-sm border border-dashed rounded-xl">
                  <p className="text-slate-450">No contractors available yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 overflow-hidden">
                  {data.contractors.slice(0, 5).map(c => {
                    const bal = parseFloat(c.balance as string || '0');
                    return (
                      <div key={c.id} className="py-3.5 flex justify-between items-center hover:bg-slate-50/30 px-2 rounded-lg transition-colors">
                        <div>
                          <div className="font-bold text-slate-800">{c.name}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">Contractor ID: #{c.id}</div>
                        </div>
                        <div className={`text-sm font-extrabold ${bal < 0 ? 'text-amber-600' : bal > 0 ? 'text-rose-600' : 'text-slate-500'
                          }`}>
                          {bal < 0 && <span className="text-[9px] uppercase font-black px-1.5 py-0.5 rounded bg-amber-50 mr-1.5 border border-amber-200/50">ADV</span>}
                          {formatCurrency(Math.abs(bal))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Latest Activity logs */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col">
            <div className="mb-6">
              <h3 className="font-bold text-slate-900 text-lg">Financial Event Stream</h3>
              <p className="text-slate-500 text-xs mt-0.5">
                Chronological invoices & payments.
              </p>
            </div>
            <div className="space-y-4 flex-1">
              {recentActivities.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center text-slate-450 text-sm border border-dashed rounded-xl">
                  <p>No bills or payments logged.</p>
                </div>
              ) : (
                recentActivities.map(act => (
                  <div key={act.id} className="flex gap-3 text-xs p-3 rounded-xl border border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${act.type.includes('Bill') ? 'bg-rose-50 border-rose-100 text-rose-600' : 'bg-emerald-50 border-emerald-100 text-emerald-600'
                      }`}>
                      <span className="font-bold text-[10px] uppercase">{act.type.includes('Bill') ? 'INV' : 'PAY'}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-slate-800 font-semibold leading-normal">{act.title}</p>
                      <div className="flex justify-between items-center mt-1 text-[10px] text-slate-400 font-mono">
                        <span>Ref: {act.ref}</span>
                        <span>{new Date(act.date).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </motion.div>
  );
}
