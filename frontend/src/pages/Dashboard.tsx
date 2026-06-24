import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';

const stats = [
  { name: 'Total Revenue', value: '$45,231.89', change: '+20.1%', trend: 'up' },
  { name: 'Active Contractors', value: '1,324', change: '+18.2%', trend: 'up' },
  { name: 'Active Projects', value: '42', change: '-2.4%', trend: 'down' },
  { name: 'Pending Invoices', value: '284', change: '+4.5%', trend: 'up' },
];

export default function Dashboard() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div>
        <h1 className="text-3xl font-bold text-slate-900">System Overview</h1>
        <p className="text-slate-500 mt-1">Real-time performance and resource monitoring dashboard.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((item) => (
          <div key={item.name} className="glass-card">
            <p className="text-sm text-slate-500 font-medium">{item.name}</p>
            <div className="mt-2 flex items-baseline justify-between">
              <p className="text-2xl font-bold text-slate-900">{item.value}</p>
              <span className={`flex items-center text-xs font-bold px-2 py-1 rounded-full ${
                item.trend === 'up' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
              }`}>
                {item.change}
                {item.trend === 'up' ? <ArrowUpRight size={14} className="ml-1" /> : <ArrowDownRight size={14} className="ml-1" />}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 glass-card h-[400px] flex flex-col items-center justify-center border-dashed border-slate-200 bg-slate-50/50">
          <Activity size={48} className="text-slate-300 mb-4" />
          <p className="text-slate-500 font-medium">Activity Analytics visualization placeholder</p>
        </div>
        <div className="glass-card flex flex-col">
          <h3 className="font-bold text-slate-900 mb-4">Latest System Events</h3>
          <div className="space-y-4 flex-1">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex gap-3 text-sm p-3 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group">
                <div className="w-2 h-2 rounded-full bg-primary mt-1.5 opacity-40 group-hover:opacity-100 transition-opacity" />
                <div className="min-w-0">
                  <p className="text-slate-700 font-medium truncate">Update log v2.4.{i} push successful</p>
                  <p className="text-slate-400 text-xs">2 hours ago</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
