import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';

const stats = [
  { name: 'Revenue', value: '$45,231.89', change: '+20.1%', trend: 'up' },
  { name: 'Contractors', value: '1,324', change: '+18.2%', trend: 'up' },
  { name: 'Active Projects', value: '42', change: '-2.4%', trend: 'down' },
  { name: 'Invoices', value: '284', change: '+4.5%', trend: 'up' },
];

export default function Dashboard() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div>
        <h1 className="text-3xl font-bold text-white">System Overview</h1>
        <p className="text-slate-400 mt-1">Real-time performance and resource monitoring.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((item) => (
          <div key={item.name} className="glass-card">
            <p className="text-sm text-slate-400 font-medium">{item.name}</p>
            <div className="mt-2 flex items-baseline justify-between">
              <p className="text-2xl font-bold text-white">{item.value}</p>
              <span className={`flex items-center text-xs font-bold ${item.trend === 'up' ? 'text-emerald-400' : 'text-rose-400'}`}>
                {item.change}
                {item.trend === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 glass-card h-[400px] flex flex-col items-center justify-center border-dashed">
          <Activity size={48} className="text-slate-700 mb-4" />
          <p className="text-slate-500 font-medium">Activity visualization placeholder</p>
        </div>
        <div className="glass-card flex flex-col">
          <h3 className="font-bold mb-4">Latest Events</h3>
          <div className="space-y-4 flex-1">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex gap-3 text-sm p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
                <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                <div>
                  <p className="text-white font-medium">System updated to v2.4.{i}</p>
                  <p className="text-slate-500 text-xs">2 hours ago</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
