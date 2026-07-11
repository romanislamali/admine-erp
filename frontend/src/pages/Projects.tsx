import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FolderKanban, Calendar, Loader2, User } from 'lucide-react';

interface Project {
  id: number;
  name: string;
  description: string;
  contractor_id: number;
  contractor_name: string;
  start_date: string;
  end_date: string;
  status: string;
}

interface Contractor {
  id: number;
  name: string;
}

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    contractor_id: '',
    start_date: '',
    end_date: '',
    status: 'Planned'
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [projRes, contRes] = await Promise.all([
        fetch('/api/projects'),
        fetch('/api/contractors')
      ]);

      if (!projRes.ok || !contRes.ok) throw new Error('Failed to fetch data');
      
      const projs = await projRes.json();
      const conts = await contRes.json();
      
      setProjects(projs);
      setContractors(conts);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.contractor_id) return;

    try {
      setSubmitting(true);
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          contractor_id: parseInt(formData.contractor_id)
        })
      });

      if (!res.ok) throw new Error('Failed to create project');
      
      setFormData({
        name: '',
        description: '',
        contractor_id: '',
        start_date: '',
        end_date: '',
        status: 'Planned'
      });
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to create project');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-250';
      case 'Completed':
        return 'bg-indigo-50 text-indigo-700 border border-indigo-250';
      case 'Planned':
        return 'bg-sky-50 text-sky-700 border border-sky-250';
      case 'Suspended':
      default:
        return 'bg-rose-50 text-rose-700 border border-rose-250';
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-slate-800 to-slate-600">
            Project Portfolio
          </h1>
          <p className="text-slate-500 mt-1">Track active, planned, and completed projects assigned to contractors.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-semibold rounded-xl hover:bg-primary-hover shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <FolderKanban size={18} />
          Create Project
        </button>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-600 p-4 rounded-xl text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="animate-spin text-primary" size={32} />
        </div>
      ) : projects.length === 0 ? (
        <div className="glass-card py-20 flex flex-col items-center justify-center text-slate-500 border-dashed bg-slate-50/30">
          <FolderKanban size={48} className="text-slate-300 mb-3" />
          <p className="text-lg font-medium text-slate-600">No projects found</p>
          <p className="text-sm">Kick start operations by defining your first project dashboard.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((p) => (
            <motion.div 
              key={p.id}
              layout
              className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-900 text-lg leading-tight hover:text-primary transition-colors cursor-pointer truncate">{p.name}</h3>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono mt-1">
                      <span>ID: #{p.id}</span>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 text-xs font-bold rounded-lg border shrink-0 ${getStatusBadgeClass(p.status)}`}>
                    {p.status}
                  </span>
                </div>

                <p className="text-slate-600 text-sm line-clamp-3 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                  {p.description || 'No description provided.'}
                </p>

                <div className="space-y-2 pt-2 text-xs">
                  <div className="flex items-center gap-2 text-slate-600">
                    <User size={14} className="text-slate-400" />
                    <span>Contractor: <strong className="text-slate-800">{p.contractor_name || 'Unassigned'}</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Calendar size={14} className="text-slate-400" />
                    <span>Start Date: <strong className="text-slate-800">{formatDate(p.start_date)}</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Calendar size={14} className="text-slate-400" />
                    <span>Est. End: <strong className="text-slate-800">{formatDate(p.end_date)}</strong></span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-md p-6 rounded-2xl shadow-xl z-10 border border-slate-100"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-slate-900">New Project</h3>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Project Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter project name"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-sm bg-slate-50 focus:bg-white transition-all text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Contractor Link *</label>
                  <select
                    required
                    value={formData.contractor_id}
                    onChange={(e) => setFormData({ ...formData, contractor_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-sm bg-slate-50 focus:bg-white transition-all text-slate-900"
                  >
                    <option value="" disabled>-- Select Contractor --</option>
                    {contractors.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} (ID: #{c.id})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-sm bg-slate-50 focus:bg-white transition-all text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Expected End Date</label>
                    <input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-sm bg-slate-50 focus:bg-white transition-all text-slate-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-sm bg-slate-50 focus:bg-white transition-all text-slate-900"
                    >
                      <option value="Planned">Planned</option>
                      <option value="Active">Active</option>
                      <option value="Completed">Completed</option>
                      <option value="Suspended">Suspended</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Project Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Provide details about the project timeline and scope..."
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-sm bg-slate-50 focus:bg-white transition-all text-slate-900 resize-none select-all"
                  />
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-800 rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center gap-2 px-5 py-2 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-primary/10 disabled:opacity-50"
                  >
                    {submitting ? <Loader2 size={16} className="animate-spin" /> : 'Submit'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
