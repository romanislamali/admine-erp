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
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative min-h-[65vh] flex justify-end items-start">
      {/* Background Decorative Gradient Blobs in the top right */}
      <div className="absolute top-0 right-1/4 w-72 h-72 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-10 right-10 w-64 h-64 bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: -15, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="w-full max-w-sm bg-white/95 backdrop-blur-md border border-slate-200 rounded-3xl p-6 shadow-xl relative z-10 mt-2"
      >
        {/* User Card info Header */}
        <div className="flex items-center gap-3 p-4 bg-slate-50/50 border border-slate-100 rounded-2xl text-left mb-5">
          <div className="h-12 w-12 rounded-full bg-linear-to-tr from-indigo-500 to-primary text-white flex items-center justify-center font-bold text-base shadow-sm shrink-0">
            {user.name.substring(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 grow">
            <div className="font-bold text-slate-900 text-sm truncate leading-tight mb-0.5">{user.name}</div>
            <div className="text-xs text-slate-500 truncate mb-1.5">{user.email}</div>
            <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-full inline-block">
              {user.role}
            </span>
          </div>
        </div>

        {/* Confirmation Message */}
        <div className="text-left mb-6 px-1">
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
            <ShieldAlert size={16} className="text-amber-500" />
            Confirm Sign Out
          </h3>
          <p className="text-slate-500 text-xs mt-1.5 leading-relaxed">
            Are you sure you want to terminate your administrative session and sign out of Admine ERP?
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleCancel}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition-all cursor-pointer"
          >
            <ArrowLeft size={14} />
            Cancel
          </button>
          
          <button
            onClick={handleLogout}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-rose-600/10 disabled:opacity-60 cursor-pointer"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={14} />
            ) : (
              <>
                <LogOut size={14} />
                Sign Out
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
