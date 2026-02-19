import React, { useState, useEffect, useCallback } from 'react';
import {
  HiOutlineShieldCheck,
  HiOutlineUserPlus,
  HiOutlinePencilSquare,
  HiOutlineTrash,
  HiOutlineUsers,
  HiOutlineLockClosed,
  HiOutlineClock,
  HiOutlineComputerDesktop,
  HiOutlineXMark,
  HiOutlineCheckCircle,
  HiOutlineEyeSlash,
  HiOutlineEye,
  HiOutlineKey,
  HiOutlineDocumentText,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import apiClient from '../../api/client';
import LoadingSpinner from '../../components/feedback/LoadingSpinner';
import DeleteConfirmModal from '../../components/feedback/DeleteConfirmModal';

// ── Constants ─────────────────────────────────────────────────────

const ROLES = ['Admin', 'Accounts', 'CA', 'Accountant', 'HR', 'Sales', 'Purchase', 'Master', 'Viewer'];

const ROLE_COLORS = {
  Admin:      { bg: 'bg-red-50',     text: 'text-red-700',     dot: 'bg-red-500' },
  Accounts:   { bg: 'bg-blue-50',    text: 'text-blue-700',    dot: 'bg-blue-500' },
  CA:         { bg: 'bg-indigo-50',  text: 'text-indigo-700',  dot: 'bg-indigo-500' },
  Accountant: { bg: 'bg-cyan-50',    text: 'text-cyan-700',    dot: 'bg-cyan-500' },
  HR:         { bg: 'bg-purple-50',  text: 'text-purple-700',  dot: 'bg-purple-500' },
  Sales:      { bg: 'bg-green-50',   text: 'text-green-700',   dot: 'bg-green-500' },
  Purchase:   { bg: 'bg-orange-50',  text: 'text-orange-700',  dot: 'bg-orange-500' },
  Master:     { bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-500' },
  Viewer:     { bg: 'bg-gray-100',   text: 'text-gray-600',    dot: 'bg-gray-400' },
};

const ACTION_COLORS = {
  CREATE: { bg: 'bg-green-50', text: 'text-green-700' },
  UPDATE: { bg: 'bg-blue-50', text: 'text-blue-700' },
  DELETE: { bg: 'bg-red-50', text: 'text-red-700' },
  LOGIN: { bg: 'bg-amber-50', text: 'text-amber-700' },
  LOGOUT: { bg: 'bg-gray-100', text: 'text-gray-600' },
};

function formatDate(dateStr) {
  if (!dateStr) return 'Never';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

// ── User Form Modal ───────────────────────────────────────────────

function UserFormModal({ isOpen, onClose, onSubmit, user, loading }) {
  const [form, setForm] = useState({
    username: '',
    full_name: '',
    email: '',
    role: 'Viewer',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);

  const isEdit = !!user;

  useEffect(() => {
    if (user) {
      setForm({
        username: user.username || '',
        full_name: user.full_name || '',
        email: user.email || '',
        role: user.role || 'Viewer',
        password: '',
      });
    } else {
      setForm({
        username: '',
        full_name: '',
        email: '',
        role: 'Viewer',
        password: '',
      });
    }
    setShowPassword(false);
  }, [user, isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.username.trim()) {
      toast.error('Username is required');
      return;
    }
    if (!form.full_name.trim()) {
      toast.error('Full name is required');
      return;
    }
    if (!isEdit && !form.password) {
      toast.error('Password is required for new users');
      return;
    }

    const payload = { ...form };
    // Only include password if it was provided (for edits, blank password means no change)
    if (isEdit && !payload.password) {
      delete payload.password;
    }
    onSubmit(payload);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 animate-[scaleIn_0.15s_ease-out]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB]">
          <h3 className="text-lg font-semibold text-[#333]">
            {isEdit ? 'Edit User' : 'Add New User'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#6B7280] hover:text-[#333] hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <HiOutlineXMark className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#333] mb-1.5">
              Username <span className="text-red-500">*</span>
            </label>
            <input
              name="username"
              type="text"
              value={form.username}
              onChange={handleChange}
              placeholder="Enter username"
              disabled={isEdit}
              className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC] disabled:bg-gray-50 disabled:text-[#6B7280] transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#333] mb-1.5">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              name="full_name"
              type="text"
              value={form.full_name}
              onChange={handleChange}
              placeholder="Enter full name"
              className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC] transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#333] mb-1.5">Email</label>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="user@company.com"
              className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC] transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#333] mb-1.5">Role</label>
            <select
              name="role"
              value={form.role}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC] bg-white transition-colors"
            >
              {ROLES.map((role) => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#333] mb-1.5">
              Password {!isEdit && <span className="text-red-500">*</span>}
              {isEdit && <span className="text-xs text-[#6B7280] ml-1">(leave blank to keep unchanged)</span>}
            </label>
            <div className="relative">
              <input
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={handleChange}
                placeholder={isEdit ? 'Leave blank to keep current' : 'Enter password'}
                className="w-full px-3 py-2 pr-10 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280] cursor-pointer"
              >
                {showPassword ? <HiOutlineEyeSlash className="w-4 h-4" /> : <HiOutlineEye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-[#333] bg-white border border-[#E5E7EB] rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#0071DC] rounded-lg hover:bg-[#005BB5] transition-colors disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  <HiOutlineCheckCircle className="w-4 h-4" />
                  {isEdit ? 'Update User' : 'Create User'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Security Page ────────────────────────────────────────────

export default function SecurityPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modal state
  const [showFormModal, setShowFormModal] = useState(false);
  const [editUser, setEditUser] = useState(null);

  // Delete state
  const [deleteUser, setDeleteUser] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Audit logs state
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditPage, setAuditPage] = useState(1);
  const [auditPagination, setAuditPagination] = useState({ total: 0, totalPages: 1 });

  // ── Fetch Users ─────────────────────────────────────────────────

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/users');
      const data = res.data.data || res.data || [];
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      if (err.response?.status !== 401) {
        setUsers([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // ── Fetch Audit Logs ──────────────────────────────────────────

  const fetchAuditLogs = useCallback(async (page = 1) => {
    setAuditLoading(true);
    try {
      const res = await apiClient.get('/audit-logs', {
        params: { page, limit: 15 },
      });
      const data = res.data.data || res.data || [];
      setAuditLogs(Array.isArray(data) ? data : []);
      if (res.data.pagination) {
        setAuditPagination(res.data.pagination);
      }
    } catch (err) {
      if (err.response?.status !== 401 && err.response?.status !== 403) {
        setAuditLogs([]);
      }
    } finally {
      setAuditLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAuditLogs(auditPage);
  }, [fetchAuditLogs, auditPage]);

  // ── Create / Update User ────────────────────────────────────────

  const handleSubmitUser = async (formData) => {
    setSaving(true);
    try {
      if (editUser) {
        await apiClient.put(`/users/${editUser.id}`, formData);
        toast.success('User updated successfully');
      } else {
        await apiClient.post('/users', formData);
        toast.success('User created successfully');
      }
      setShowFormModal(false);
      setEditUser(null);
      fetchUsers();
      fetchAuditLogs(auditPage);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to save user';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // ── Delete User ─────────────────────────────────────────────────

  const handleDeleteUser = async () => {
    if (!deleteUser) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/users/${deleteUser.id}`);
      toast.success('User deleted successfully');
      fetchUsers();
      fetchAuditLogs(auditPage);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to delete user';
      toast.error(msg);
    } finally {
      setDeleting(false);
      setDeleteUser(null);
    }
  };

  // ── Toggle Active ───────────────────────────────────────────────

  const handleToggleActive = async (user) => {
    try {
      await apiClient.put(`/users/${user.id}`, {
        is_active: !user.is_active,
      });
      toast.success(`User ${user.is_active ? 'deactivated' : 'activated'}`);
      fetchUsers();
      fetchAuditLogs(auditPage);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update user';
      toast.error(msg);
    }
  };

  // ── Stats ───────────────────────────────────────────────────────

  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.is_active !== false).length;
  const adminCount = users.filter((u) => u.role === 'Admin').length;

  return (
    <div className="pb-8">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#333]">Security</h1>
          <p className="text-sm text-[#6B7280] mt-1">
            Manage users and security settings
          </p>
        </div>
        <button
          onClick={() => { setEditUser(null); setShowFormModal(true); }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#0071DC] text-white text-sm font-medium rounded-lg hover:bg-[#005BB5] transition-colors cursor-pointer"
        >
          <HiOutlineUserPlus className="w-4 h-4" />
          Add User
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-4 flex items-center gap-4">
          <div className="w-11 h-11 rounded-lg bg-blue-500 flex items-center justify-center">
            <HiOutlineUsers className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-xs text-[#6B7280] font-medium uppercase tracking-wide">Total Users</p>
            <p className="text-lg font-semibold text-[#333] mt-0.5">{totalUsers}</p>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-4 flex items-center gap-4">
          <div className="w-11 h-11 rounded-lg bg-green-500 flex items-center justify-center">
            <HiOutlineCheckCircle className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-xs text-[#6B7280] font-medium uppercase tracking-wide">Active Users</p>
            <p className="text-lg font-semibold text-[#333] mt-0.5">{activeUsers}</p>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-4 flex items-center gap-4">
          <div className="w-11 h-11 rounded-lg bg-red-500 flex items-center justify-center">
            <HiOutlineShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-xs text-[#6B7280] font-medium uppercase tracking-wide">Admins</p>
            <p className="text-lg font-semibold text-[#333] mt-0.5">{adminCount}</p>
          </div>
        </div>
      </div>

      {/* ── User Management Table ────────────────────────────────── */}
      <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm mb-6">
        <div className="px-5 py-4 border-b border-[#E5E7EB]">
          <h2 className="text-sm font-semibold text-[#333] uppercase tracking-wide">User Management</h2>
        </div>

        {loading ? (
          <div className="py-16">
            <LoadingSpinner size="lg" label="Loading users..." />
          </div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center">
            <HiOutlineUsers className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-[#6B7280] font-medium">No users found</p>
            <p className="text-xs text-[#9CA3AF] mt-1">Add your first user to get started</p>
            <button
              onClick={() => { setEditUser(null); setShowFormModal(true); }}
              className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-[#0071DC] text-white text-sm font-medium rounded-lg hover:bg-[#005BB5] transition-colors cursor-pointer"
            >
              <HiOutlineUserPlus className="w-4 h-4" />
              Add User
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Username</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Full Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Last Login</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider w-28">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {users.map((user) => {
                  const roleStyle = ROLE_COLORS[user.role] || ROLE_COLORS.Viewer;
                  return (
                    <tr key={user.id} className="hover:bg-[#F9FAFB] transition-colors group">
                      <td className="px-4 py-3 font-medium text-[#333]">{user.username}</td>
                      <td className="px-4 py-3 text-[#333]">{user.full_name || '--'}</td>
                      <td className="px-4 py-3 text-[#6B7280]">{user.email || '--'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${roleStyle.bg} ${roleStyle.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${roleStyle.dot}`} />
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleToggleActive(user)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                            user.is_active !== false
                              ? 'bg-green-50 text-green-700 hover:bg-green-100'
                              : 'bg-red-50 text-red-700 hover:bg-red-100'
                          }`}
                          title={`Click to ${user.is_active !== false ? 'deactivate' : 'activate'}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${user.is_active !== false ? 'bg-green-500' : 'bg-red-500'}`} />
                          {user.is_active !== false ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-[#6B7280] text-xs">{formatDate(user.last_login)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => { setEditUser(user); setShowFormModal(true); }}
                            className="p-1.5 rounded text-[#6B7280] hover:text-[#0071DC] hover:bg-blue-50 transition-colors cursor-pointer"
                            title="Edit user"
                          >
                            <HiOutlinePencilSquare className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteUser(user)}
                            className="p-1.5 rounded text-[#6B7280] hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                            title="Delete user"
                          >
                            <HiOutlineTrash className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Audit Logs ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm mb-6">
        <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HiOutlineDocumentText className="w-4 h-4 text-[#6B7280]" />
            <h2 className="text-sm font-semibold text-[#333] uppercase tracking-wide">Audit Logs</h2>
          </div>
          {auditPagination.total > 0 && (
            <span className="text-xs text-[#6B7280]">
              {auditPagination.total} total entries
            </span>
          )}
        </div>

        {auditLoading ? (
          <div className="py-12">
            <LoadingSpinner size="md" label="Loading audit logs..." />
          </div>
        ) : auditLogs.length === 0 ? (
          <div className="py-12 text-center">
            <HiOutlineDocumentText className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-[#6B7280] text-sm">No audit log entries found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Time</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">User</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Action</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Entity</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {auditLogs.map((log) => {
                    const actionStyle = ACTION_COLORS[log.action] || { bg: 'bg-gray-100', text: 'text-gray-600' };
                    return (
                      <tr key={log.id} className="hover:bg-[#F9FAFB] transition-colors">
                        <td className="px-4 py-3 text-[#6B7280] text-xs whitespace-nowrap">
                          {formatDate(log.performed_at)}
                        </td>
                        <td className="px-4 py-3 text-[#333] text-sm font-medium">
                          {log.user_display_name || log.username || 'System'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${actionStyle.bg} ${actionStyle.text}`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[#6B7280] text-sm">
                          {log.entity_type}
                          {log.entity_id && (
                            <span className="text-xs text-[#9CA3AF] ml-1">
                              ({log.entity_id.substring(0, 8)}...)
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-[#6B7280] text-xs font-mono">
                          {log.ip_address || '--'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {auditPagination.totalPages > 1 && (
              <div className="px-5 py-3 border-t border-[#E5E7EB] flex items-center justify-between">
                <p className="text-xs text-[#6B7280]">
                  Page {auditPage} of {auditPagination.totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                    disabled={auditPage <= 1}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-[#333] bg-white border border-[#E5E7EB] rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <HiOutlineChevronLeft className="w-3 h-3" />
                    Previous
                  </button>
                  <button
                    onClick={() => setAuditPage((p) => Math.min(auditPagination.totalPages, p + 1))}
                    disabled={auditPage >= auditPagination.totalPages}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-[#333] bg-white border border-[#E5E7EB] rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    Next
                    <HiOutlineChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Security Settings (Informational) ────────────────────── */}
      <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm">
        <div className="px-5 py-4 border-b border-[#E5E7EB]">
          <h2 className="text-sm font-semibold text-[#333] uppercase tracking-wide">Security Settings</h2>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Password Policy */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                <HiOutlineLockClosed className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-[#333]">Password Policy</h3>
                <ul className="mt-2 space-y-1 text-xs text-[#6B7280]">
                  <li className="flex items-center gap-1.5">
                    <HiOutlineCheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                    Minimum 8 characters
                  </li>
                  <li className="flex items-center gap-1.5">
                    <HiOutlineCheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                    Must contain uppercase and lowercase
                  </li>
                  <li className="flex items-center gap-1.5">
                    <HiOutlineCheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                    At least one number or special character
                  </li>
                  <li className="flex items-center gap-1.5">
                    <HiOutlineCheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                    Password expires every 90 days
                  </li>
                </ul>
              </div>
            </div>

            {/* Session Settings */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                <HiOutlineClock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-[#333]">Session Timeout</h3>
                <ul className="mt-2 space-y-1 text-xs text-[#6B7280]">
                  <li className="flex items-center gap-1.5">
                    <HiOutlineCheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                    Auto-logout after 30 minutes of inactivity
                  </li>
                  <li className="flex items-center gap-1.5">
                    <HiOutlineCheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                    Maximum session duration: 8 hours
                  </li>
                  <li className="flex items-center gap-1.5">
                    <HiOutlineCheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                    Single session per user enforced
                  </li>
                </ul>
              </div>
            </div>

            {/* Active Sessions */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
                <HiOutlineComputerDesktop className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-[#333]">Active Sessions</h3>
                <div className="mt-2 space-y-1">
                  <p className="text-2xl font-bold text-[#333]">{activeUsers}</p>
                  <p className="text-xs text-[#6B7280]">Currently active user sessions</p>
                  <div className="flex items-center gap-1.5 mt-2">
                    <HiOutlineKey className="w-3.5 h-3.5 text-[#6B7280]" />
                    <span className="text-xs text-[#6B7280]">JWT-based authentication</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* User Form Modal */}
      <UserFormModal
        isOpen={showFormModal}
        onClose={() => { setShowFormModal(false); setEditUser(null); }}
        onSubmit={handleSubmitUser}
        user={editUser}
        loading={saving}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!deleteUser}
        onClose={() => setDeleteUser(null)}
        onConfirm={handleDeleteUser}
        title="Delete User"
        message={`Are you sure you want to delete user "${deleteUser?.full_name || deleteUser?.username}"? This action cannot be undone.`}
        confirmLabel="Delete User"
        loading={deleting}
      />
    </div>
  );
}
