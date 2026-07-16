import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FolderKanban, Users, ReceiptText, BarChart3, LogOut, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import logo from '../public/logo.png';
import { useAuth } from '../context/AuthContext';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Contractors', href: '/contractors', icon: Users },
  { name: 'Projects', href: '/projects', icon: FolderKanban },
  { name: 'Billing', href: '/billing', icon: ReceiptText },
  { name: 'Payment', href: '/payment', icon: BarChart3 },
  { name: 'Users', href: '/users', icon: Users },
];

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth(); // Extracted logout action from your auth hook

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close the dropdown cleanly if clicking anywhere else on the page layout
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      // TypeScript now safely checks if target belongs inside HTMLDivElement nodes
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const initials = user
    ? user.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase()
    : '??';

  return (
    <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm shadow-gray-300">
      <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">

          {/* Left Section: Logo & Brand Navigation */}
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2 group">
              <div>
                <img src={logo} alt="logo" className="w-50 h-10" />
              </div>
            </Link>

            {/* Desktop Navigation Link Tabs */}
            {user && (
              <nav className="hidden md:flex items-center gap-1">
                {navigation.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${isActive ? 'text-primary bg-primary/5' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                        }`}
                    >
                      <div className="flex items-center gap-2">
                        <item.icon size={18} className={isActive ? 'text-primary' : ''} />
                        {item.name}
                      </div>
                      {isActive && (
                        <motion.div
                          layoutId="activeTab"
                          className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full mx-4"
                        />
                      )}
                    </Link>
                  );
                })}
              </nav>
            )}
          </div>

          {/* Right Section: Actions & Profile Dropdown Container */}
          <div className="relative flex items-center gap-4" ref={dropdownRef}>
            {user ? (
              <>
                {/* Trigger Button */}
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  title={`Signed in as ${user.name} (${user.role}).`}
                  className="h-8 w-8 rounded-full border border-slate-200 bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 hover:bg-slate-200 transition-all hover:scale-105 active:scale-95 cursor-pointer focus:outline-none"
                >
                  {initials}
                </button>

                {/* Floating Absolute Dropdown Menu Panel Panel */}
                <AnimatePresence>
                  {isDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.96 }}
                      transition={{ duration: 0.15, ease: 'easeOut' }}
                      className="absolute right-0 top-full mt-4 w-64 bg-white border border-slate-200 rounded-2xl p-4 shadow-xl z-50 origin-top-right"
                    >
                      {/* Active User Information */}
                      <div className="border-b border-slate-100 pb-3 mb-2">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full border border-slate-200 bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 hover:bg-slate-200 transition-all hover:scale-105 active:scale-95 cursor-pointer focus:outline-none">
                            {initials}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800 truncate">{user.name}</p>
                            <p className="text-xs text-slate-500 truncate">{user.role || 'User'}</p>
                          </div>
                        </div>
                      </div>

                      {/* Dynamic Control Actions */}
                      <div className="flex flex-col gap-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            setIsDropdownOpen(false);
                            if (logout) logout();
                            navigate('/login');
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 rounded-xl transition-colors text-left font-semibold"
                        >
                          <LogOut size={16} />
                          Log Out
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            ) : (
              <Link
                to="/login"
                className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-primary/10"
              >
                Sign In
              </Link>
            )}
          </div>

        </div>
      </div>
    </header>
  );
}