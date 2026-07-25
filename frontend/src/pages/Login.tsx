import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { Loader2, User, ShieldAlert, KeyRound, ArrowRight, Eye, EyeOff } from 'lucide-react';
import logo from '../public/logo.png';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;

    try {
      setLoading(true);
      setError('');
      await login(username.trim(), password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (demoUsername: string) => {
    let demoPass = 'password123';
    if (demoUsername === 'admineadmin') demoPass = 'admin123';
    else if (demoUsername === 'adminemanager') demoPass = 'manager123';
    else if (demoUsername === 'admineemployee') demoPass = 'employee123';

    setUsername(demoUsername);
    setPassword(demoPass);
    try {
      setLoading(true);
      setError('');
      await login(demoUsername, demoPass);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-center items-center px-4 relative overflow-hidden">

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-white shadow-xl rounded-xl p-10 relative z-10"
      >
        {/* Brand Header */}
        <div className="flex flex-col border border-gray-300 items-center mb-8 p-5">
          <img src={logo} className="h-7 w-auto mb-2" />
          <h1 className='text-3xl font-bold text-slate-900 tracking-tight mb-4'>Admine ERP System</h1>
          <h2 className="text-3xl font-medium text-slate-700 tracking-tight">Login</h2>
        </div>

        {/* Error Banner */}
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-sm flex gap-3 items-start"
          >
            <ShieldAlert className="shrink-0 mt-0.5" size={16} />
            <span>{error}</span>
          </motion.div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5 tracking-wider">
              Username
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-sm bg-slate-50 focus:bg-white transition-all text-slate-900 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5 tracking-wider">
              Password
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-11 pr-11 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-sm bg-slate-50 focus:bg-white transition-all text-slate-900 font-medium"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-primary/20 disabled:opacity-60 hover:scale-[1.01] active:scale-[0.99]"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <>
                Log In
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Demo Accounts Quick-Select */}
        {/* <div className="mt-8 pt-6 border-t border-slate-100">
          <div className="flex items-center gap-2 mb-4 text-xs font-semibold uppercase text-slate-400 tracking-wider">
            <KeyRound size={14} />
            <span>Quick-Access Demo Credentials</span>
          </div>

          <div className="space-y-2">
            {[
              { username: 'admineadmin', label: 'Administrator', style: 'bg-indigo-50 text-indigo-700 border-indigo-200/50 hover:bg-indigo-100/50' },
              { username: 'adminemanager', label: 'Billing Manager', style: 'bg-sky-50 text-sky-700 border-sky-200/50 hover:bg-sky-100/50' },
              { username: 'admineemployee', label: 'Staff Member', style: 'bg-emerald-50 text-emerald-700 border-emerald-200/50 hover:bg-emerald-100/50' },
            ].map((account) => (
              <button
                key={account.username}
                type="button"
                onClick={() => handleDemoLogin(account.username)}
                disabled={loading}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl border text-xs font-medium transition-all ${account.style}`}
              >
                <span>{account.label}</span>
                <span className="font-mono text-[11px] opacity-80">{account.username}</span>
              </button>
            ))}
          </div>
        </div> */}
      </motion.div>
    </div>
  );
}
