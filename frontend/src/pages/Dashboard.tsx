import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, FolderKanban, ReceiptText, Wallet, Loader2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Contractor {
  id: string;
  name: string;
  balance: string | number;
}

interface Bill {
  id: string;
  contractor_name: string;
  amount: string | number;
  invoice_number: string;
  bill_date: string;
}

interface Payment {
  id: string;
  contractor_name: string;
  amount: string | number;
  payment_date: string;
}

interface Project {
  id: string;
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
    if (isNaN(amount) || amount === null || amount === undefined) return '0';
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const getLiabilityStat = () => {
    if (outstandingBalance === 0) {
      return {
        value: formatCurrency(0),
        color: 'text-slate-800 border-slate-800',
        iconBg: ''
      };
    }
    if (outstandingBalance < 0) {
      return {
        value: `${formatCurrency(Math.abs(outstandingBalance))} (ADV)`,
        color: 'text-green-700 border-emerald-700',
        iconBg: ''
      };
    }
    return {
      value: `${formatCurrency(outstandingBalance)} (DUE)`,
      color: 'text-rose-800 border-rose-800',
      iconBg: ''
    };
  };

  const liabilityStat = getLiabilityStat();

  // Compile recent activities chronologically
  const recentActivities = [
    ...data.bills.map(b => ({
      id: `bill-${b.id}`,
      type: 'Bill Logged',
      title: `${b.contractor_name} invoiced ${formatCurrency(parseFloat(b.amount as string))}`,
      ref: b.invoice_number || `INV-${b.id.slice(0, 8)}`,
      date: new Date(b.bill_date),
      amount: parseFloat(b.amount as string),
    })),
    ...data.payments.map(p => ({
      id: `pay-${p.id}`,
      type: 'Payment Made',
      title: `Disbursed ${formatCurrency(parseFloat(p.amount as string))} to ${p.contractor_name}`,
      ref: `REF-${p.id.slice(0, 8)}`,
      date: new Date(p.payment_date),
      amount: parseFloat(p.amount as string),
    }))
  ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 5);

  const stats = [
    { name: 'Total Invoiced (Bills)', value: formatCurrency(totalInvoiced), icon: ReceiptText, color: 'text-amber-700 border-amber-700', iconBg: '' },
    { name: 'Total Disbursed (Payments)', value: formatCurrency(totalPaid), icon: Wallet, color: 'text-green-600 border-green-600', iconBg: '' },
    {
      name: 'Outstanding Liability',
      value: liabilityStat.value,
      icon: ArrowUpRight,
      color: liabilityStat.color,
      iconBg: liabilityStat.iconBg
    },
    { name: 'Active Projects', value: `${activeProjectsCount} / ${totalProjectsCount}`, icon: FolderKanban, color: 'text-sky-700 border-sky-700', iconBg: '' }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className='bg-white shadow-sm shadow-amber-100 p-5 rounded-xl'>
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-slate-800 to-slate-600">System Overview</h1>
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
            <div key={item.name} className="glass-card flex items-center gap-4">

              <div className={`w-12 h-12 rounded-xl flex items-center justify-center border shrink-0 ${item.iconBg} ${item.color}`}>
                <item.icon size={26} />
              </div>

              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{item.name}</p>
                <div className={`text-md font-bold mt-1 ${item.color}`}>{item.value}</div>
              </div>

            </div>
          ))}
        </div>

        {/* Main dashboard content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-4">

          {/* Contractor summaries */}
          <div className="lg:col-span-2 glass-card flex flex-col justify-between">
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
                        </div>
                        <div className={`text-sm font-extrabold ${bal < 0 ? 'text-green-700' : bal > 0 ? 'text-rose-800' : 'text-slate-500'
                          }`}>
                          {bal < 0 ? <span className="text-[9px] uppercase font-black px-1.5 py-0.5 rounded bg-green-50 mr-1.5 border border-green-500/50">ADV</span>
                            : bal > 0 ? <span className="text-[9px] uppercase font-black px-1.5 py-0.5 rounded bg-red-50 mr-1.5 border border-red-500/50">DUE</span>
                              : <span></span>}
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
          <div className="glass-card flex flex-col">
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
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border border-slate-300 ${act.type.includes('Bill') ? 'bg-rose-50 border-rose-100 text-rose-600' : 'bg-emerald-50 border-emerald-100 text-emerald-600'
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
