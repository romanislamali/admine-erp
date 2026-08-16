import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users as UsersIcon,
  ShieldAlert,
  Briefcase,
  User as UserIcon,
  Plus,
  Loader2,
  X,
  Mail,
  Phone,
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { useModal } from '../context/ModalContext';
import Table, { Column } from '../components/Table';

interface User {
  id: string;
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
  const [tableLoading, setTableLoading] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);
  const [error, setError] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('ALL');

  const [lazyParams, setLazyParams] = useState({
    page: 1,
    limit: 10,
    search: '',
    sortField: null as string | null,
    sortOrder: null as 'asc' | 'desc' | null
  });
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refreshUsers = () => setRefreshTrigger((prev) => prev + 1);

  const [stats, setStats] = useState({
    total: 0,
    admin: 0,
    manager: 0,
    employee: 0
  });

  const { showSuccess, showError, confirmDelete } = useModal();

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
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/users');
      if (!res.ok) throw new Error('Failed to fetch stats');
      const allUsers = await res.json();
      setStats({
        total: allUsers.length,
        admin: allUsers.filter((u: any) => u.role === 'ADMIN').length,
        manager: allUsers.filter((u: any) => u.role === 'MANAGER').length,
        employee: allUsers.filter((u: any) => u.role === 'EMPLOYEE').length
      });
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUsers = async (params: typeof lazyParams) => {
    try {
      setTableLoading(true);
      const query = new URLSearchParams({
        page: params.page.toString(),
        limit: params.limit.toString(),
        search: params.search,
        role: selectedRoleFilter,
        ...(params.sortField ? { sortField: params.sortField } : {}),
        ...(params.sortOrder ? { sortOrder: params.sortOrder } : {})
      });

      const res = await fetch(`/api/users?${query.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch users');

      const resData = await res.json();
      setUsers(resData.data);
      setTotalRecords(resData.total);
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching users');
    } finally {
      setTableLoading(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [refreshTrigger]);

  useEffect(() => {
    fetchUsers(lazyParams);
  }, [lazyParams, refreshTrigger]);

  useEffect(() => {
    setLazyParams((prev) => ({ ...prev, page: 1 }));
  }, [selectedRoleFilter]);

  // Handle create user
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.username.trim() || !formData.role || !formData.password) return;

    if (formData.password !== formData.confirmPassword) {
      await showError('Password Mismatch', 'Secret Password and Confirm Password do not match.');
      return;
    }



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

      // Close modal immediately
      setIsAddModalOpen(false);
      setFormData({ name: '', username: '', phone: '', email: '', role: 'EMPLOYEE', password: '', confirmPassword: '' });
      setSubmitting(false);
      refreshUsers();

      // Show success toast with 1-second auto dismiss race
      await Promise.race([
        showSuccess(
          'User Created',
          `User "${formData.name}" has been created successfully.`
        ),
        new Promise((resolve) => setTimeout(resolve, 1000))
      ]);
    } catch (err: any) {
      setSubmitting(false);
      await Promise.race([
        showError(
          'Registration Failed',
          err.message || 'Unable to create user. Please try again.'
        ),
        new Promise((resolve) => setTimeout(resolve, 1000))
      ]);
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

      // Close modal immediately
      setIsEditModalOpen(false);
      setFormData({ name: '', username: '', phone: '', email: '', role: 'EMPLOYEE', password: '', confirmPassword: '' });
      setSelectedUserId(null);
      setSubmitting(false);
      refreshUsers();

      // Show success toast with 1-second auto dismiss race
      await Promise.race([
        showSuccess(
          'User Updated',
          `User "${formData.name}" has been updated successfully.`
        ),
        new Promise((resolve) => setTimeout(resolve, 1000))
      ]);
    } catch (err: any) {
      setSubmitting(false);
      await Promise.race([
        showError(
          'Database Sync Failed',
          err.message || 'Unable to store changes. Please try again.'
        ),
        new Promise((resolve) => setTimeout(resolve, 1000))
      ]);
    }
  };

  // Handle delete user
  const handleDeleteConfirm = async (id: string) => {
    const confirmed = await confirmDelete(
      'Remove User?',
      'This will permanently revoke system access.'
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
        'User Deleted',
        `User "${formData.name}" has been deleted successfully.`
      );
      refreshUsers();
    } catch (err: any) {
      await showError(
        'Action Deauthorized',
        err.message || 'An error occurred during account removal process.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Role Statistics calculation
  const totalCount = stats.total;
  const adminCount = stats.admin;
  const managerCount = stats.manager;
  const employeeCount = stats.employee;

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

  const columns: Column<User>[] = [
    {
      header: 'Full Name',
      key: 'name',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className={`h-8 w-8 rounded-full border border-slate-200 font-bold text-xs uppercase flex items-center justify-center ${row.role === 'ADMIN' ? 'bg-indigo-50 text-indigo-600' :
            row.role === 'MANAGER' ? 'bg-sky-50 text-sky-600' : 'bg-emerald-50 text-emerald-600'
            }`}>
            {row.name.substring(0, 2)}
          </div>
          <div>
            <div className="font-semibold text-slate-900">{row.name}</div>
          </div>
        </div>
      )
    },
    {
      header: 'Username',
      key: 'username',
      render: (row) => (
        <span className="text-slate-700 font-mono text-xs font-medium">@{row.username}</span>
      )
    },
    {
      header: 'Contact Information',
      key: 'email',
      render: (row) => (
        <div className="space-y-1">
          {row.email ? (
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <Mail size={12} className="text-slate-400 shrink-0" />
              <span>{row.email}</span>
            </div>
          ) : (
            <span className="text-xs text-slate-400 italic">No email</span>
          )}
          {row.phone && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Phone size={12} className="text-slate-400 shrink-0" />
              <span>{row.phone}</span>
            </div>
          )}
        </div>
      )
    },
    {
      header: 'Role Permission',
      key: 'role',
      render: (row) => (
        <span className={`px-2.5 py-1 text-xs font-bold rounded-lg ${getRoleBadgeStyle(row.role)}`}>
          {row.role}
        </span>
      )
    },
    {
      header: 'Date Joined',
      key: 'created_at',
      render: (row) => formatDate(row.created_at)
    }
  ];

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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4 mt-2">
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

        {/* Filter Bar Section */}
        <div className="flex justify-end items-center bg-white border border-slate-200 p-4 rounded-2xl shadow-sm mb-4">
          <div className="flex gap-2 w-full md:w-auto items-center justify-end">
            <span className="text-slate-400 text-xs font-semibold uppercase shrink-0 whitespace-nowrap">Filter Role:</span>
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
        ) : (
          <Table<User>
            data={users}
            columns={columns}
            lazy={true}
            totalRecords={totalRecords}
            loading={tableLoading}
            onLazyLoad={(params) => setLazyParams(params)}
            actionsPosition="first"
            searchPlaceholder="Search by name, username, email or phone"
            keyExtractor={(row) => row.id}
            onEdit={openEditModal}
            onDelete={(row) => handleDeleteConfirm(row.id)}
            emptyMessage="No users match your criteria."
          />
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
                  <h3 className="text-xl font-bold text-slate-900">Edit User Account</h3>
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
