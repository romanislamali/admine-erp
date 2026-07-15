import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { Loader2, LogOut, ArrowLeft, ShieldAlert } from 'lucide-react';

export default function Logout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    try {
      setLoading(true);
      // Simulate validation / api sync delay for premium feel
      await new Promise((resolve) => setTimeout(resolve, 800));
      logout();
      navigate('/login');
    } catch (err) {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate(-1);
  };

  if (!user) {
    return (
      <div className="min-h-[60vh] flex flex-col justify-center items-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-8 text-center shadow-lg"
        >
          <ShieldAlert className="mx-auto text-amber-500 mb-4" size={48} />
          <h3 className="text-xl font-bold text-slate-900">Session Inactive</h3>
          <p className="text-slate-500 mt-2 text-sm">
            You are not currently logged in. Redirecting to login...
          </p>
          <button
            onClick={() => navigate('/login')}
            className="mt-6 px-6 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-hover transition-colors shadow-md shadow-primary/10"
          >
            Access Login Screen
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-[65vh] flex flex-col justify-center items-center px-4 relative overflow-hidden">
      {/* Background Decorative Gradient Blobs */}
      <div className="absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-8 text-center shadow-xl relative z-10"
      >
        <div className="h-16 w-16 bg-rose-50 border border-rose-100 rounded-2xl flex items-center justify-center text-rose-500 mx-auto mb-6">
          <LogOut size={28} />
        </div>

        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Confirm De-authentication</h2>
        <p className="text-slate-500 text-sm mt-2">
          Are you sure you want to terminate your administrative session?
        </p>

        {/* User Card info */}
        <div className="my-6 bg-slate-50 border border-slate-100 rounded-2xl p-4 text-left">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center font-bold text-slate-700 text-sm">
              {user.name.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="font-semibold text-slate-950 text-sm">{user.name}</div>
              <div className="text-xs text-slate-500">{user.email}</div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-200/50 flex justify-between items-center">
            <span className="text-slate-400 text-xs uppercase font-semibold">Access Level:</span>
            <span className="px-2 py-0.5 text-xs font-bold bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-md">
              {user.role}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleCancel}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 py-3 border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-xl transition-all"
          >
            <ArrowLeft size={16} />
            Cancel
          </button>
          
          <button
            onClick={handleLogout}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-rose-600/10 disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              'Sign Out'
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
