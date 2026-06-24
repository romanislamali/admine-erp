import { motion } from 'framer-motion';

export default function Billing() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <h1 className="text-3xl font-bold text-white">Billing & Invoices</h1>
      <div className="glass-card py-20 flex flex-col items-center justify-center text-slate-500 border-dashed">
        <p className="text-lg font-medium text-slate-400">Billing Module</p>
        <p>This module is currently being initialized.</p>
      </div>
    </motion.div>
  );
}
