import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, FolderKanban, Users, ReceiptText, BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';
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
  const { user } = useAuth();

  const initials = user
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase()
    : '??';

  return (
    <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo & Brand */}
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2 group">
              <div>
                <img src={logo} alt="logo" className="w-50 h-10" />
              </div>
            </Link>

            {/* Desktop Navigation */}
            {user && (
              <nav className="hidden md:flex items-center gap-1">
                {navigation.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        isActive ? 'text-primary bg-primary/5' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
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

          {/* Right Section: Actions & Profile */}
          <div className="flex items-center gap-4">
            {user ? (
              <Link
                to="/logout"
                title={`Signed in as ${user.name} (${user.role}). Click to Logout.`}
                className="h-8 w-8 rounded-full border border-slate-200 bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                {initials}
              </Link>
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
