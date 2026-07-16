import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import Contractors from './pages/Contractors';
import Billing from './pages/Billing';
import Settings from './pages/Settings';
import Payment from './pages/Payment';
import Users from './pages/Users';
import Login from './pages/Login';
import { ModalProvider } from './context/ModalContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { GlobalModal } from './components/GlobalModal';
import { Loader2 } from 'lucide-react';

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-page">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-bg-page text-text-main flex flex-col">
      {/* Navigation Header */}
      <Header />

      {/* Dynamic Route Content */}
      <main className="flex-grow max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8 w-full">
        {children}
      </main>

      {/* Global Footer */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 border-t border-white/5 text-center text-slate-500 text-sm w-full">
        &copy; {new Date().getFullYear()} Admine ERP Solution. All rights reserved.
      </footer>
    </div>
  );
}

function AppContent() {
  return (
    <Routes>
      {/* Public routes (but Header handles layout dynamically) */}
      <Route path="/login" element={
        <div className="min-h-screen bg-bg-page flex flex-col justify-between">
          <Header />
          <div className="flex-grow flex items-center justify-center">
            <Login />
          </div>
          <footer className="py-8 text-center text-slate-500 text-sm">
            &copy; {new Date().getFullYear()} Admine ERP Solution. All rights reserved.
          </footer>
        </div>
      } />
      

      {/* Protected routes */}
      <Route path="/" element={<ProtectedLayout><Dashboard /></ProtectedLayout>} />
      <Route path="/projects" element={<ProtectedLayout><Projects /></ProtectedLayout>} />
      <Route path="/contractors" element={<ProtectedLayout><Contractors /></ProtectedLayout>} />
      <Route path="/billing" element={<ProtectedLayout><Billing /></ProtectedLayout>} />
      <Route path="/payment" element={<ProtectedLayout><Payment /></ProtectedLayout>} />
      <Route path="/settings" element={<ProtectedLayout><Settings /></ProtectedLayout>} />
      <Route path="/users" element={<ProtectedLayout><Users /></ProtectedLayout>} />
      
      {/* Catch-all navigation */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <ModalProvider>
          <AppContent />
          
          {/* Global Modal Overlay */}
          <GlobalModal />
        </ModalProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
