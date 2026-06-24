import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, FolderKanban, Users, ReceiptText, BarChart3, Settings, Rocket, Bell, Search } from 'lucide-react';
import { motion } from 'framer-motion';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Contractors', href: '/contractors', icon: Users },
  { name: 'Projects', href: '/projects', icon: FolderKanban },
  { name: 'Billing', href: '/billing', icon: ReceiptText },
  { name: 'Payment', href: '/payment', icon: BarChart3 },
];

export default function Header() {
  const location = useLocation();

  return (
    <header className="sticky top-0 z-50 w-full bg-bg-dark/80 backdrop-blur-md border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo & Brand */}
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform">
                <Rocket size={20} className="text-white" />
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                Admine
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive ? 'text-white bg-white/5' : 'text-slate-400 hover:text-white hover:bg-white/5'
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
          </div>

          {/* Right Section: Actions & Profile */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center bg-white/5 border border-white/5 rounded-full px-3 py-1.5 focus-within:ring-2 ring-primary/20 transition-all">
              <Search size={16} className="text-slate-400" />
              <input 
                type="text" 
                placeholder="Search resources..." 
                className="bg-transparent border-none outline-none text-sm px-2 text-white w-32 md:w-48 placeholder:text-slate-500"
              />
            </div>
            
            <button className="relative p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-full transition-colors">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full ring-2 ring-bg-dark" />
            </button>

            <Link to="/settings" className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-full transition-colors">
              <Settings size={20} />
            </Link>

            <div className="h-8 w-8 rounded-full border border-white/10 bg-slate-800 flex items-center justify-center text-xs font-bold text-primary">
              JS
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
