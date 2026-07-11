import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import Contractors from './pages/Contractors';
import Billing from './pages/Billing';
import Settings from './pages/Settings';
import Payment from './pages/Payment';
import Users from './pages/Users';
import { ModalProvider } from './context/ModalContext';
import { GlobalModal } from './components/GlobalModal';

function App() {
  return (
    <Router>
      <ModalProvider>
        <div className="min-h-screen bg-bg-page text-text-main">
          {/* Navigation Header */}
          <Header />

          {/* Dynamic Route Content */}
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/contractors" element={<Contractors />} />
              <Route path="/billing" element={<Billing />} />
              <Route path="/payment" element={<Payment />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/users" element={<Users />} />
            </Routes>
          </main>

          {/* Global Footer (Optional but good for ERP) */}
          <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 border-t border-white/5 text-center text-slate-500 text-sm">
            &copy; {new Date().getFullYear()} Admine ERP Solution. All rights reserved.
          </footer>
        </div>

        {/* Global Modal Overlay */}
        <GlobalModal />
      </ModalProvider>
    </Router>
  );
}

export default App;
