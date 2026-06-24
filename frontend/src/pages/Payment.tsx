import { motion } from 'framer-motion';

export default function Payment() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
        >
            <h1 className="text-3xl font-bold text-white">Payment</h1>
            <div className="glass-card py-20 flex flex-col items-center justify-center text-slate-500 border-dashed">
                <p className="text-lg font-medium text-slate-400">Payment Module</p>
            </div>
        </motion.div>
    );
}   