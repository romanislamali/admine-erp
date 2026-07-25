import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users as UsersIcon,
  ShieldAlert,
  Briefcase,
  User as UserIcon,
  Plus,
  Search,
  Edit2,
  Trash2,
  Loader2,
  X,
  Mail,
  Phone,
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { useModal } from '../context/ModalContext';

interface User {
  id: number;
  name: string;
  username: string;
  phone?: string;
  email?: string;
  role: 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
  created_at: string;
}

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('ALL');

  const { showSuccess, showError, confirmSave, confirmDelete } = useModal();

  // Modal control states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    phone: '',
    email: '',
    role: 'EMPLOYEE' as 'ADMIN' | 'MANAGER' | 'EMPLOYEE',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  // Fetch all users
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/users');
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();
      setUsers(data);
    } catch (err: any) {
      setError(err.message || 'An error occurred while loading staff members.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Handle create user
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.username.trim() || !formData.role || !formData.password) return;

    if (formData.password !== formData.confirmPassword) {
      await showError('Password Mismatch', 'Secret Password and Confirm Password do not match.');
      return;
    }

    const confirmed = await confirmSave(
      'Register Staff Member?',
      `Are you sure you want to add ${formData.name} to the system credentials database?`
    );
    if (!confirmed) return;

    try {
      setSubmitting(true);
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          username: formData.username.trim(),
          phone: formData.phone.trim() || null,
          email: formData.email.trim() || null,
          role: formData.role,
          password: formData.password
        })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to create user');
      }

      await showSuccess(
        'Staff Registered Successfully',
        `Access configuration for ${formData.name} is complete and live.`
      );
      setFormData({ name: '', username: '', phone: '', email: '', role: 'EMPLOYEE', password: '', confirmPassword: '' });
      setIsAddModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      await showError(
        'Registration Failed',
        err.message || 'We could not register this staff account. Please verify connectivity.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (user: User) => {
    setSelectedUserId(user.id);
    setFormData({
      name: user.name,
      username: user.username || '',
      phone: user.phone || '',
      email: user.email || '',
      role: user.role,
      password: '',
      confirmPassword: ''
    });
    setIsEditModalOpen(true);
  };

  // Handle edit user
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId || !formData.name.trim() || !formData.username.trim() || !formData.role) return;

    if (formData.password && formData.password !== formData.confirmPassword) {
      await showError('Password Mismatch', 'Secret Password and Confirm Password do not match.');
      return;
    }

    const confirmed = await confirmSave(
      'Save Account Updates?',
      'Are you sure you want to save the new credentials and authorization details?'
    );
    if (!confirmed) return;

    try {
      setSubmitting(true);
      const payload: any = {
        name: formData.name.trim(),
        username: formData.username.trim(),
        phone: formData.phone.trim() || null,
        email: formData.email.trim() || null,
        role: formData.role
      };
      if (formData.password.trim()) {
        payload.password = formData.password.trim();
      }

      const res = await fetch(`/api/users/${selectedUserId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to update user');
      }

      await showSuccess(
        'Information Saved',
        'Staff accessibility permissions were updated successfully.'
      );
      setFormData({ name: '', username: '', phone: '', email: '', role: 'EMPLOYEE', password: '', confirmPassword: '' });
      setSelectedUserId(null);
      setIsEditModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      await showError(
        'Database Sync Failed',
        err.message || 'Unable to store changes. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Handle delete user
  const handleDeleteConfirm = async (id: number) => {
    const confirmed = await confirmDelete(
      'Remove Staff Account?',
      'This will permanently revoke system access. This action is irreversible.'
    );
    if (!confirmed) return;

    try {
      setSubmitting(true);
      const res = await fetch(`/api/users/${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to delete user');
      }

      await showSuccess(
        'Staff Account Deleted',
        'System access has been systematically deconfigured for this user.'
      );
      fetchUsers();
    } catch (err: any) {
      await showError(
        'Action Deauthorized',
        err.message || 'An error occurred during account removal process.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Filter logic
  const filteredUsers = users.filter(user => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.username && user.username.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (user.email && user.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (user.phone && user.phone.includes(searchQuery));

    const matchesRole =
      selectedRoleFilter === 'ALL' ||
      user.role === selectedRoleFilter;

    return matchesSearch && matchesRole;
  });

  // Role Statistics calculation
  const totalCount = users.length;
  const adminCount = users.filter(u => u.role === 'ADMIN').length;
  const managerCount = users.filter(u => u.role === 'MANAGER').length;
  const employeeCount = users.filter(u => u.role === 'EMPLOYEE').length;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getRoleBadgeStyle = (role: 'ADMIN' | 'MANAGER' | 'EMPLOYEE') => {
    switch (role) {
      case 'ADMIN':
        return 'bg-indigo-50 text-indigo-700 border border-indigo-200/50';
      case 'MANAGER':
        return 'bg-sky-50 text-sky-700 border border-sky-200/50';
      case 'EMPLOYEE':
      default:
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200/50';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className='bg-white shadow-sm shadow-amber-100 p-5 rounded-xl'>
        {/* Top Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className='mb-2'>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-slate-800 to-slate-600">
              User Access Management
            </h1>
            <p className="text-slate-500 mt-1">Configure credentials, roles, and authorization restrictions across the ERP.</p>
          </div>
          <button
            onClick={() => {
              setFormData({ name: '', username: '', phone: '', email: '', role: 'EMPLOYEE', password: '', confirmPassword: '' });
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-semibold rounded-xl hover:bg-primary-hover shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus size={18} />
            Create User
          </button>
        </div>

        {/* Stats Counter Cards Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {/* Total Users card */}
          <motion.div
            whileHover={{ y: -2 }}
            className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between"
          >
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase text-slate-400">Total Users</p>
              <p className="text-2xl font-bold text-slate-900">{totalCount}</p>
            </div>
            <div className="h-10 w-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500">
              <UsersIcon size={20} />
            </div>
          </motion.div>

          {/* Admin Card */}
          <motion.div
            whileHover={{ y: -2 }}
            className="bg-indigo-50/20 border border-indigo-100 rounded-2xl p-5 shadow-sm flex items-center justify-between"
          >
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase text-indigo-500">Administrators</p>
              <p className="text-2xl font-bold text-indigo-900">{adminCount}</p>
            </div>
            <div className="h-10 w-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-500">
              <ShieldAlert size={20} />
            </div>
          </motion.div>

          {/* Manager Card */}
          <motion.div
            whileHover={{ y: -2 }}
            className="bg-sky-50/20 border border-sky-100 rounded-2xl p-5 shadow-sm flex items-center justify-between"
          >
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase text-sky-500">Managers</p>
              <p className="text-2xl font-bold text-sky-900">{managerCount}</p>
            </div>
            <div className="h-10 w-10 bg-sky-50 rounded-xl flex items-center justify-center text-sky-500">
              <Briefcase size={20} />
            </div>
          </motion.div>

          {/* Employee Card */}
          <motion.div
            whileHover={{ y: -2 }}
            className="bg-emerald-50/20 border border-emerald-100 rounded-2xl p-5 shadow-sm flex items-center justify-between"
          >
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase text-emerald-500">Employees</p>
              <p className="text-2xl font-bold text-emerald-900">{employeeCount}</p>
            </div>
            <div className="h-10 w-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-500">
              <UserIcon size={20} />
            </div>
          </motion.div>
        </div>

        {/* Filter and Search Bar Section */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white border border-slate-200 p-4 rounded-2xl shadow-sm mb-4">
          <div className="relative w-full md:w-80">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, username, email..."
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-sm bg-slate-50 focus:bg-white transition-all text-slate-900"
            />
          </div>

          <div className="flex gap-2 w-full md:w-auto items-center">
            <span className="text-slate-400 text-xs font-medium uppercase shrink-0 whitespace-nowrap">Filter Role:</span>
            <select
              value={selectedRoleFilter}
              onChange={(e) => setSelectedRoleFilter(e.target.value)}
              className="w-full md:w-48 px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-sm bg-slate-50 focus:bg-white transition-all text-slate-900"
            >
              <option value="ALL">All Roles</option>
              <option value="ADMIN">ADMIN</option>
              <option value="MANAGER">MANAGER</option>
              <option value="EMPLOYEE">EMPLOYEE</option>
            </select>
          </div>
        </div>

        {/* Error State Banner */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-600 p-4 rounded-xl text-sm flex items-start gap-2.5">
            <AlertCircle className="shrink-0 mt-0.5" size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Main Content Area */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="glass-card py-20 flex flex-col items-center justify-center text-slate-500 border-dashed bg-slate-50/30">
            <UsersIcon size={48} className="text-slate-300 mb-3" />
            <p className="text-lg font-medium text-slate-600">No users found</p>
            <p className="text-sm">Try clearing your filters or create a new user profile above.</p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                    <th className="px-6 py-4">Full Name</th>
                    <th className="px-6 py-4">Username</th>
                    <th className="px-6 py-4">Contact Information</th>
                    <th className="px-6 py-4">Role Permission</th>
                    <th className="px-6 py-4">Date Joined</th>
                    <th className="px-6 py-4 text-center">Modify</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredUsers.map((user) => (
                    <motion.tr
                      key={user.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      {/* User name with initials badge */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`h-8 w-8 rounded-full border border-slate-200 font-bold text-xs uppercase flex items-center justify-center ${user.role === 'ADMIN' ? 'bg-indigo-50 text-indigo-600' :
                            user.role === 'MANAGER' ? 'bg-sky-50 text-sky-600' : 'bg-emerald-50 text-emerald-600'
                            }`}>
                            {user.name.substring(0, 2)}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900">{user.name}</div>
                            <div className="text-xs text-slate-400 font-mono mt-0.5">ID: #{user.id}</div>
                          </div>
                        </div>
                      </td>

                      {/* Username */}
                      <td className="px-6 py-4 text-slate-700 font-mono text-xs font-medium">
                        @{user.username}
                      </td>

                      {/* Contact Info (Email & Phone optional) */}
                      <td className="px-6 py-4 text-slate-600 space-y-1">
                        {user.email ? (
                          <div className="flex items-center gap-1.5 text-xs text-slate-600">
                            <Mail size={12} className="text-slate-400 shrink-0" />
                            <span>{user.email}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">No email</span>
                        )}
                        {user.phone && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <Phone size={12} className="text-slate-400 shrink-0" />
                            <span>{user.phone}</span>
                          </div>
                        )}
                      </td>

                      {/* Role Permission Badge */}
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-lg ${getRoleBadgeStyle(user.role)}`}>
                          {user.role}
                        </span>
                      </td>

                      {/* Created Date */}
                      <td className="px-6 py-4 text-slate-500 font-medium">
                        {formatDate(user.created_at)}
                      </td>

                      {/* Action buttons (Edit & Delete) */}
                      <td className="px-6 py-4 text-center">
                        <div className="flex gap-2 justify-center items-center">
                          <button
                            onClick={() => openEditModal(user)}
                            title="Edit staff details"
                            className="p-1.5 text-slate-400 hover:text-primary hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-slate-100"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            onClick={() => handleDeleteConfirm(user.id)}
                            title="Delete staff account"
                            className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-100"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* CREATE STAFF MODAL */}
        <AnimatePresence>
          {isAddModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsAddModalOpen(false)}
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              />
              {/* Modal Body */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative bg-white w-full max-w-md p-6 rounded-2xl shadow-xl z-10 border border-slate-100 max-h-[90vh] overflow-y-auto"
              >
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-bold text-slate-900">Onboard User</h3>
                  <button
                    onClick={() => setIsAddModalOpen(false)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleAddSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Enter full name"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-sm bg-slate-50 focus:bg-white transition-all text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Username *</label>
                    <input
                      type="text"
                      required
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      placeholder="Enter username for login"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-sm bg-slate-50 focus:bg-white transition-all text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Phone Number (Optional)</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+8801700000000"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-sm bg-slate-50 focus:bg-white transition-all text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Email Address (Optional)</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="name@company.com"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-sm bg-slate-50 focus:bg-white transition-all text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Select Role *</label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-sm bg-slate-50 focus:bg-white transition-all text-slate-900"
                    >
                      <option value="ADMIN">ADMIN</option>
                      <option value="MANAGER">MANAGER</option>
                      <option value="EMPLOYEE">EMPLOYEE</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Secret Password *</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="Enter password (min 6 characters)"
                        className="w-full pl-3 pr-10 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-sm bg-slate-50 focus:bg-white transition-all text-slate-900"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 transition-colors"
                        title={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Confirm Secret Password *</label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                        placeholder="Confirm password"
                        className={`w-full pl-3 pr-10 py-2 border rounded-xl focus:outline-none text-sm bg-slate-50 focus:bg-white transition-all text-slate-900 ${formData.confirmPassword && formData.password !== formData.confirmPassword
                          ? 'border-rose-400 focus:border-rose-500'
                          : 'border-slate-200 focus:border-primary'
                          }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 transition-colors"
                        title={showConfirmPassword ? "Hide password" : "Show password"}
                      >
                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                      <p className="text-xs text-rose-500 font-medium mt-1 flex items-center gap-1">
                        <AlertCircle size={12} />
                        Passwords do not match
                      </p>
                    )}
                  </div>

                  <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsAddModalOpen(false)}
                      className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-800 rounded-xl hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting || (!!formData.confirmPassword && formData.password !== formData.confirmPassword)}
                      className="flex items-center gap-2 px-5 py-2 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-primary/10 disabled:opacity-50"
                    >
                      {submitting ? <Loader2 size={16} className="animate-spin" /> : 'Create User'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* EDIT STAFF MODAL */}
        <AnimatePresence>
          {isEditModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsEditModalOpen(false)}
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              />
              {/* Modal Body */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative bg-white w-full max-w-md p-6 rounded-2xl shadow-xl z-10 border border-slate-100 max-h-[90vh] overflow-y-auto"
              >
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-slate-900">Modify User Account</h3>
                  <button
                    onClick={() => setIsEditModalOpen(false)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleEditSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Enter full name"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-sm bg-slate-50 focus:bg-white transition-all text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Username *</label>
                    <input
                      type="text"
                      required
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      placeholder="Enter username for login"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-sm bg-slate-50 focus:bg-white transition-all text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Phone Number (Optional)</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+8801700000000"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-sm bg-slate-50 focus:bg-white transition-all text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Email Address (Optional)</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="name@company.com"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-sm bg-slate-50 focus:bg-white transition-all text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Select Role *</label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-sm bg-slate-50 focus:bg-white transition-all text-slate-900"
                    >
                      <option value="ADMIN">ADMIN</option>
                      <option value="MANAGER">MANAGER</option>
                      <option value="EMPLOYEE">EMPLOYEE</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Secret Password (blank to keep existing)</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="Enter new password"
                        className="w-full pl-3 pr-10 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-sm bg-slate-50 focus:bg-white transition-all text-slate-900"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 transition-colors"
                        title={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Confirm Secret Password</label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                        placeholder="Confirm new password"
                        className={`w-full pl-3 pr-10 py-2 border rounded-xl focus:outline-none text-sm bg-slate-50 focus:bg-white transition-all text-slate-900 ${formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword
                          ? 'border-rose-400 focus:border-rose-500'
                          : 'border-slate-200 focus:border-primary'
                          }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 transition-colors"
                        title={showConfirmPassword ? "Hide password" : "Show password"}
                      >
                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword && (
                      <p className="text-xs text-rose-500 font-medium mt-1 flex items-center gap-1">
                        <AlertCircle size={12} />
                        Passwords do not match
                      </p>
                    )}
                  </div>

                  <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditModalOpen(false);
                        setSelectedUserId(null);
                      }}
                      className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-800 rounded-xl hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting || (!!formData.password && !!formData.confirmPassword && formData.password !== formData.confirmPassword)}
                      className="flex items-center gap-2 px-5 py-2 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-primary/10 disabled:opacity-50"
                    >
                      {submitting ? <Loader2 size={16} className="animate-spin" /> : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
