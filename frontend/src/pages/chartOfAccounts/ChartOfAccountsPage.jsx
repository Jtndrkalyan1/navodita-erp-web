import React, { useState, useEffect, useCallback } from 'react';
import {
  HiOutlinePlus,
  HiOutlineMagnifyingGlass,
  HiOutlineChevronDown,
  HiOutlineChevronRight,
  HiOutlineBuildingLibrary,
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiOutlinePencilSquare,
  HiOutlineTrash,
  HiOutlineXMark,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { chartOfAccountApi } from '../../api/chartOfAccount.api';

const ACCOUNT_TYPES = ['Asset', 'Liability', 'Equity', 'Income', 'Expense'];

// Maps all 16 granular account types to their 5 parent categories
const TYPE_CATEGORY_MAP = {
  Asset: 'Asset',
  Cash: 'Asset',
  Bank: 'Asset',
  'Fixed Asset': 'Asset',
  Stock: 'Asset',
  'Other Current Asset': 'Asset',
  'Accounts Receivable': 'Asset',
  'Payment Clearing': 'Asset',
  Liability: 'Liability',
  'Accounts Payable': 'Liability',
  'Other Current Liability': 'Liability',
  'Other Liability': 'Liability',
  'Long Term Liability': 'Liability',
  Equity: 'Equity',
  Income: 'Income',
  'Other Income': 'Income',
  Expense: 'Expense',
  'Other Expense': 'Expense',
  'Cost Of Goods Sold': 'Expense',
};

// All granular account types grouped by parent category (for form dropdown)
const ACCOUNT_SUB_TYPES = {
  Asset: ['Asset', 'Cash', 'Bank', 'Fixed Asset', 'Stock', 'Other Current Asset', 'Accounts Receivable', 'Payment Clearing'],
  Liability: ['Liability', 'Accounts Payable', 'Other Current Liability', 'Other Liability', 'Long Term Liability'],
  Equity: ['Equity'],
  Income: ['Income', 'Other Income'],
  Expense: ['Expense', 'Other Expense', 'Cost Of Goods Sold'],
};

// All valid granular types (flat list for validation)
const ALL_ACCOUNT_TYPES = Object.values(ACCOUNT_SUB_TYPES).flat();

const ACCOUNT_TYPE_COLORS = {
  Asset: 'bg-blue-50 text-blue-700 border-blue-200',
  Liability: 'bg-red-50 text-red-700 border-red-200',
  Equity: 'bg-purple-50 text-purple-700 border-purple-200',
  Income: 'bg-green-50 text-green-700 border-green-200',
  Expense: 'bg-orange-50 text-orange-700 border-orange-200',
};

const ACCOUNT_TYPE_ICONS = {
  Asset: 'bg-blue-500',
  Liability: 'bg-red-500',
  Equity: 'bg-purple-500',
  Income: 'bg-green-500',
  Expense: 'bg-orange-500',
};

// Colors for sub-type badges
const SUB_TYPE_COLORS = {
  Cash: 'bg-emerald-50 text-emerald-700',
  Bank: 'bg-sky-50 text-sky-700',
  'Fixed Asset': 'bg-indigo-50 text-indigo-700',
  Stock: 'bg-teal-50 text-teal-700',
  'Other Current Asset': 'bg-cyan-50 text-cyan-700',
  'Accounts Receivable': 'bg-blue-50 text-blue-700',
  'Payment Clearing': 'bg-violet-50 text-violet-700',
  'Accounts Payable': 'bg-rose-50 text-rose-700',
  'Other Current Liability': 'bg-pink-50 text-pink-700',
  'Other Liability': 'bg-fuchsia-50 text-fuchsia-700',
  'Long Term Liability': 'bg-red-50 text-red-700',
  'Other Income': 'bg-lime-50 text-lime-700',
  'Other Expense': 'bg-amber-50 text-amber-700',
  'Cost Of Goods Sold': 'bg-yellow-50 text-yellow-700',
};

const CURRENCIES = [
  { code: 'INR', label: 'INR - Indian Rupee' },
  { code: 'USD', label: 'USD - US Dollar' },
  { code: 'EUR', label: 'EUR - Euro' },
  { code: 'GBP', label: 'GBP - British Pound' },
];

const INITIAL_FORM = {
  account_name: '',
  account_code: '',
  account_type: 'Asset',
  parent_account_id: '',
  currency_code: 'INR',
  description: '',
};

export default function ChartOfAccountsPage() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedTypes, setExpandedTypes] = useState(
    ACCOUNT_TYPES.reduce((acc, type) => ({ ...acc, [type]: true }), {})
  );

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  // Delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await chartOfAccountApi.list({ flat: 'true' });
      const data = response.data?.data;
      // Backend may return flat array or grouped object
      if (Array.isArray(data)) {
        setAccounts(data);
      } else if (data && typeof data === 'object') {
        // Flatten grouped object { Asset: [...], Liability: [...] }
        const flat = Object.values(data).flat();
        setAccounts(flat);
      } else {
        setAccounts([]);
      }
    } catch {
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  // Group accounts by parent category using TYPE_CATEGORY_MAP
  const groupedAccounts = ACCOUNT_TYPES.reduce((acc, type) => {
    acc[type] = accounts.filter((a) => TYPE_CATEGORY_MAP[a.account_type] === type);
    return acc;
  }, {});

  // Filter by search
  const filteredGrouped = ACCOUNT_TYPES.reduce((acc, type) => {
    if (!search.trim()) {
      acc[type] = groupedAccounts[type];
    } else {
      const q = search.toLowerCase();
      acc[type] = groupedAccounts[type].filter(
        (a) =>
          (a.account_name || '').toLowerCase().includes(q) ||
          (a.account_code || '').toLowerCase().includes(q) ||
          (a.description || '').toLowerCase().includes(q)
      );
    }
    return acc;
  }, {});

  const toggleType = (type) => {
    setExpandedTypes((prev) => ({ ...prev, [type]: !prev[type] }));
  };

  const totalAccounts = accounts.length;
  const activeAccounts = accounts.filter((a) => a.is_active !== false).length;

  // Form handlers
  const openAddModal = () => {
    setEditingAccount(null);
    setFormData(INITIAL_FORM);
    setErrors({});
    setShowModal(true);
  };

  const openEditModal = (account) => {
    setEditingAccount(account);
    setFormData({
      account_name: account.account_name || '',
      account_code: account.account_code || '',
      account_type: account.account_type || 'Asset',
      parent_account_id: account.parent_account_id || '',
      currency_code: account.currency_code || 'INR',
      description: account.description || '',
    });
    setErrors({});
    setShowModal(true);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.account_name.trim()) newErrors.account_name = 'Account name is required';
    if (!formData.account_code.trim()) newErrors.account_code = 'Account code is required';
    if (!formData.account_type) newErrors.account_type = 'Account type is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        ...formData,
        parent_account_id: formData.parent_account_id || null,
      };
      if (editingAccount) {
        await chartOfAccountApi.update(editingAccount.id, payload);
        toast.success('Account updated successfully');
      } else {
        await chartOfAccountApi.create(payload);
        toast.success('Account created successfully');
      }
      setShowModal(false);
      fetchAccounts();
    } catch (err) {
      if (err.response?.data?.error) {
        toast.error(err.response.data.error);
      }
    } finally {
      setSaving(false);
    }
  };

  const openDeleteModal = (account) => {
    setDeletingAccount(account);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!deletingAccount) return;
    setDeleting(true);
    try {
      await chartOfAccountApi.remove(deletingAccount.id);
      toast.success('Account deleted successfully');
      setShowDeleteModal(false);
      setDeletingAccount(null);
      fetchAccounts();
    } catch (err) {
      if (err.response?.data?.error) {
        toast.error(err.response.data.error);
      }
    } finally {
      setDeleting(false);
    }
  };

  // Get parent accounts for dropdown (exclude current account if editing)
  // Shows accounts from the same parent category, not just the exact sub-type
  const getParentOptions = () => {
    const selectedCategory = TYPE_CATEGORY_MAP[formData.account_type] || formData.account_type;
    return accounts.filter((a) => {
      if (editingAccount && a.id === editingAccount.id) return false;
      return TYPE_CATEGORY_MAP[a.account_type] === selectedCategory;
    });
  };

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#333]">Chart of Accounts</h1>
          <p className="text-sm text-[#6B7280] mt-1">
            Manage your account structure for bookkeeping
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#0071DC] text-white text-sm font-medium rounded-lg hover:bg-[#005BB5] transition-colors"
        >
          <HiOutlinePlus className="w-4 h-4" />
          New Account
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-4 flex items-center gap-4">
          <div className="w-11 h-11 rounded-lg flex items-center justify-center bg-blue-500">
            <HiOutlineBuildingLibrary className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-xs text-[#6B7280] font-medium uppercase tracking-wide">Total Accounts</p>
            <p className="text-lg font-semibold text-[#333] mt-0.5">{totalAccounts}</p>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-4 flex items-center gap-4">
          <div className="w-11 h-11 rounded-lg flex items-center justify-center bg-green-500">
            <HiOutlineCheckCircle className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-xs text-[#6B7280] font-medium uppercase tracking-wide">Active</p>
            <p className="text-lg font-semibold text-[#333] mt-0.5">{activeAccounts}</p>
          </div>
        </div>
        {ACCOUNT_TYPES.slice(0, 2).map((type) => (
          <div key={type} className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-4 flex items-center gap-4">
            <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${ACCOUNT_TYPE_ICONS[type]}`}>
              <HiOutlineBuildingLibrary className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-[#6B7280] font-medium uppercase tracking-wide">{type} Accounts</p>
              <p className="text-lg font-semibold text-[#333] mt-0.5">{groupedAccounts[type]?.length || 0}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm mb-4">
        <div className="p-4">
          <div className="relative max-w-md">
            <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
            <input
              type="text"
              placeholder="Search by account name or code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
            />
          </div>
        </div>
      </div>

      {/* Account Groups */}
      {loading ? (
        <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-16">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-[#0071DC] border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-[#6B7280]">Loading accounts...</span>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {ACCOUNT_TYPES.map((type) => {
            const typeAccounts = filteredGrouped[type] || [];
            return (
              <div key={type} className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm overflow-hidden">
                {/* Group Header */}
                <button
                  onClick={() => toggleType(type)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-[#F9FAFB] hover:bg-[#F3F4F6] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {expandedTypes[type] ? (
                      <HiOutlineChevronDown className="w-4 h-4 text-[#6B7280]" />
                    ) : (
                      <HiOutlineChevronRight className="w-4 h-4 text-[#6B7280]" />
                    )}
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${ACCOUNT_TYPE_COLORS[type]}`}>
                      {type}
                    </span>
                    <span className="text-sm font-medium text-[#333]">{type} Accounts</span>
                  </div>
                  <span className="text-xs text-[#6B7280] font-medium">{typeAccounts.length} accounts</span>
                </button>

                {/* Accounts Table */}
                {expandedTypes[type] && (
                  <div className="overflow-x-auto">
                    {typeAccounts.length === 0 ? (
                      <div className="py-8 text-center text-sm text-[#9CA3AF]">
                        No {type.toLowerCase()} accounts found
                      </div>
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-t border-b border-[#E5E7EB]">
                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Code</th>
                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Account Name</th>
                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Currency</th>
                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Status</th>
                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Description</th>
                            <th className="px-4 py-2.5 text-right text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E5E7EB]">
                          {typeAccounts.map((account) => (
                            <tr key={account.id} className="hover:bg-[#F9FAFB] transition-colors">
                              <td className="px-4 py-3 font-mono text-xs text-[#6B7280]">
                                {account.account_code || '--'}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-[#333]">{account.account_name}</span>
                                  {account.account_type && account.account_type !== type && (
                                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${SUB_TYPE_COLORS[account.account_type] || 'bg-gray-50 text-gray-600'}`}>
                                      {account.account_type}
                                    </span>
                                  )}
                                </div>
                                {account.parent_account_name && (
                                  <p className="text-xs text-[#9CA3AF] mt-0.5">Parent: {account.parent_account_name}</p>
                                )}
                              </td>
                              <td className="px-4 py-3 text-[#6B7280]">{account.currency_code || 'INR'}</td>
                              <td className="px-4 py-3">
                                {account.is_active !== false ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                                    Active
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                                    Inactive
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-[#6B7280] text-xs max-w-[200px] truncate">
                                {account.description || '--'}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    onClick={() => openEditModal(account)}
                                    className="p-1.5 rounded hover:bg-[#F3F4F6] text-[#6B7280] hover:text-[#0071DC] transition-colors"
                                    title="Edit"
                                  >
                                    <HiOutlinePencilSquare className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => openDeleteModal(account)}
                                    className="p-1.5 rounded hover:bg-red-50 text-[#6B7280] hover:text-red-600 transition-colors"
                                    title="Delete"
                                  >
                                    <HiOutlineTrash className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => !saving && setShowModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-[#333]">
                {editingAccount ? 'Edit Account' : 'New Account'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded hover:bg-[#F3F4F6] transition-colors"
              >
                <HiOutlineXMark className="w-5 h-5 text-[#6B7280]" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#333] mb-1">
                    Account Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="account_name"
                    value={formData.account_name}
                    onChange={handleFormChange}
                    className={`w-full px-3 py-2 border rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC] ${
                      errors.account_name ? 'border-red-400 bg-red-50' : 'border-[#E5E7EB]'
                    }`}
                    placeholder="e.g. Cash in Hand"
                  />
                  {errors.account_name && <p className="text-xs text-red-500 mt-1">{errors.account_name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#333] mb-1">
                    Account Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="account_code"
                    value={formData.account_code}
                    onChange={handleFormChange}
                    className={`w-full px-3 py-2 border rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC] ${
                      errors.account_code ? 'border-red-400 bg-red-50' : 'border-[#E5E7EB]'
                    }`}
                    placeholder="e.g. 1001"
                  />
                  {errors.account_code && <p className="text-xs text-red-500 mt-1">{errors.account_code}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#333] mb-1">
                    Account Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="account_type"
                    value={formData.account_type}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] bg-white focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
                  >
                    {ACCOUNT_TYPES.map((category) => (
                      <optgroup key={category} label={category}>
                        {ACCOUNT_SUB_TYPES[category].map((subType) => (
                          <option key={subType} value={subType}>{subType}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#333] mb-1">Parent Account</label>
                  <select
                    name="parent_account_id"
                    value={formData.parent_account_id}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] bg-white focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
                  >
                    <option value="">-- None --</option>
                    {getParentOptions().map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.account_code} - {a.account_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#333] mb-1">Currency</label>
                <select
                  name="currency_code"
                  value={formData.currency_code}
                  onChange={handleFormChange}
                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] bg-white focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#333] mb-1">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleFormChange}
                  rows={2}
                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC] resize-vertical"
                  placeholder="Optional description..."
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-medium text-[#333] bg-white border border-[#E5E7EB] rounded-lg hover:bg-[#F9FAFB] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#0071DC] rounded-lg hover:bg-[#005BB5] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  {saving ? 'Saving...' : editingAccount ? 'Update Account' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => !deleting && setShowDeleteModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <HiOutlineTrash className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#333]">Delete Account</h3>
                <p className="text-sm text-[#6B7280] mt-1">
                  Are you sure you want to delete <strong>{deletingAccount.account_name}</strong> ({deletingAccount.account_code})?
                  This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-[#333] bg-white border border-[#E5E7EB] rounded-lg hover:bg-[#F9FAFB] transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {deleting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {deleting ? 'Deleting...' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
