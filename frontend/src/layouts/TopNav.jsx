import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  HiOutlineBookOpen,
  HiOutlineUserGroup,
  HiOutlineBanknotes,
  HiOutlineQuestionMarkCircle,
  HiOutlineMagnifyingGlass,
  HiOutlineBell,
  HiOutlineArrowRightOnRectangle,
  HiOutlineLockClosed,
  HiOutlineXMark,
  HiOutlineEye,
  HiOutlineEyeSlash,
  HiOutlineSparkles,
  HiOutlineEnvelope,
  HiOutlinePhone,
  HiOutlineGlobeAlt,
  HiOutlineDocumentText,
  HiOutlineCommandLine,
} from 'react-icons/hi2';
import { useAuth } from '../context/AuthContext';
import { useCompany } from '../context/CompanyContext';
import apiClient from '../api/client';
import toast from 'react-hot-toast';

// Module definitions for the top nav bar
const TOP_NAV_MODULES = [
  {
    id: 'books',
    label: 'Books',
    icon: HiOutlineBookOpen,
    items: [
      { label: 'Dashboard', path: '/dashboard' },
      { label: 'Customers', path: '/customers' },
      { label: 'Vendors', path: '/vendors' },
      { label: 'Items', path: '/items' },
      { label: 'Invoices', path: '/invoices' },
      { label: 'Quotations', path: '/quotations' },
      { label: 'Bills', path: '/bills' },
      { label: 'Purchase Orders', path: '/purchase-orders' },
      { label: 'Credit Notes', path: '/credit-notes' },
      { label: 'Debit Notes', path: '/debit-notes' },
      { label: 'Payments Received', path: '/payments-received' },
      { label: 'Payments Made', path: '/payments-made' },
      { label: 'Expenses', path: '/expenses' },
      { label: 'Chart of Accounts', path: '/chart-of-accounts' },
      { label: 'Journal Entries', path: '/journal-entries' },
      { label: 'Reports', path: '/reports' },
    ],
  },
  {
    id: 'hr',
    label: 'HR & Payroll',
    icon: HiOutlineUserGroup,
    items: [
      { label: 'Employees', path: '/employees' },
      { label: 'Payroll', path: '/payroll' },
      { label: 'Offer Letters', path: '/offer-letters' },
      { label: 'Joining Letters', path: '/joining-letters' },
      { label: 'Government Holidays', path: '/government-holidays' },
      { label: 'HR Policies', path: '/hr-policies' },
    ],
  },
  {
    id: 'banking',
    label: 'Banking',
    icon: HiOutlineBanknotes,
    items: [
      { label: 'Bank Accounts', path: '/banking' },
      { label: 'Transactions', path: '/banking' },
      { label: 'Reconciliation', path: '/banking' },
    ],
  },
];

// ── Entity type → path mapping for search results ─────────────────
const ENTITY_PATH_MAP = {
  customer: '/customers',
  vendor: '/vendors',
  item: '/items',
  invoice: '/invoices',
  bill: '/bills',
  quotation: '/quotations',
  purchase_order: '/purchase-orders',
  employee: '/employees',
  delivery_challan: '/delivery-challans',
  packing_list: '/packing-lists',
  credit_note: '/credit-notes',
  debit_note: '/debit-notes',
  expense: '/expenses',
  payment_received: '/payments-received',
  payment_made: '/payments-made',
};

const ENTITY_LABELS = {
  customer: 'Customer',
  vendor: 'Vendor',
  item: 'Item',
  invoice: 'Invoice',
  bill: 'Bill',
  quotation: 'Quotation',
  purchase_order: 'Purchase Order',
  employee: 'Employee',
  delivery_challan: 'Delivery Challan',
  packing_list: 'Packing List',
  credit_note: 'Credit Note',
  debit_note: 'Debit Note',
  expense: 'Expense',
  payment_received: 'Payment Received',
  payment_made: 'Payment Made',
};

// ── Global Search Component ───────────────────────────────────────
function GlobalSearch({ onNavigate }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const searchRef = useRef(null);
  const debounceRef = useRef(null);

  // Debounced search
  const doSearch = useCallback(async (searchText) => {
    if (!searchText || searchText.length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }

    setLoading(true);
    try {
      const res = await apiClient.get('/search', { params: { q: searchText, limit: 15 } });
      const data = res.data?.data || res.data?.results || [];
      setResults(Array.isArray(data) ? data : []);
      setShowResults(true);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    setSelectedIdx(-1);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(value), 300);
  };

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (!showResults || results.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && selectedIdx >= 0) {
      e.preventDefault();
      handleSelect(results[selectedIdx]);
    } else if (e.key === 'Escape') {
      setShowResults(false);
    }
  };

  const handleSelect = (item) => {
    const basePath = ENTITY_PATH_MAP[item.type] || '/';
    onNavigate(`${basePath}/${item.id}`);
    setQuery('');
    setResults([]);
    setShowResults(false);
  };

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Ctrl+K shortcut
  useEffect(() => {
    const handleShortcut = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.querySelector('input')?.focus();
      }
    };
    document.addEventListener('keydown', handleShortcut);
    return () => document.removeEventListener('keydown', handleShortcut);
  }, []);

  // Group results by type
  const grouped = results.reduce((acc, item) => {
    const label = ENTITY_LABELS[item.type] || item.type;
    if (!acc[label]) acc[label] = [];
    acc[label].push(item);
    return acc;
  }, {});

  let flatIdx = -1;

  return (
    <div className="relative hidden sm:block" ref={searchRef}>
      <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      <input
        type="text"
        placeholder="Search... (Ctrl+K)"
        value={query}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => { if (results.length > 0) setShowResults(true); }}
        className="w-52 lg:w-64 pl-9 pr-4 py-1.5 text-sm bg-white/10 border border-white/20 rounded-lg
                   text-white placeholder-gray-400
                   focus:outline-none focus:bg-white/15 focus:border-blue-400 transition-colors"
      />

      {/* Results Dropdown */}
      {showResults && (query.length >= 2) && (
        <div className="absolute top-full mt-2 w-96 bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden z-[200] max-h-[400px] overflow-y-auto">
          {loading ? (
            <div className="px-4 py-6 text-center">
              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs text-gray-500">Searching...</p>
            </div>
          ) : results.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <HiOutlineMagnifyingGlass className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No results found</p>
              <p className="text-xs text-gray-400 mt-0.5">Try a different search term</p>
            </div>
          ) : (
            Object.entries(grouped).map(([label, items]) => (
              <div key={label}>
                <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-100">
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{label}</span>
                </div>
                {items.map((item) => {
                  flatIdx++;
                  const currentIdx = flatIdx;
                  const isSelected = currentIdx === selectedIdx;
                  return (
                    <button
                      key={`${item.type}-${item.id}`}
                      onClick={() => handleSelect(item)}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                        isSelected ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="font-medium truncate">{item.title}</p>
                        {item.subtitle && (
                          <p className="text-xs text-gray-400 truncate mt-0.5">{item.subtitle}</p>
                        )}
                      </div>
                      {item.amount && (
                        <span className="text-xs font-medium text-gray-500 whitespace-nowrap shrink-0">
                          {item.amount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── Help Panel ──────────────────────────────────────────────────
function HelpPanel({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200]" onClick={onClose}>
      <div
        className="absolute right-4 top-12 w-80 bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#333]">Help & Support</h3>
          <button
            onClick={onClose}
            className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <HiOutlineXMark className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {/* AI Assistant */}
          <Link
            to="/ai-assistant"
            onClick={onClose}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-blue-50 transition-colors group"
          >
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <HiOutlineSparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-[#333] group-hover:text-blue-700 transition-colors">AI Assistant</p>
              <p className="text-xs text-[#9CA3AF]">Get help from AI for your queries</p>
            </div>
          </Link>

          {/* Documentation */}
          <Link
            to="/documents"
            onClick={onClose}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors group"
          >
            <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center">
              <HiOutlineDocumentText className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-[#333] group-hover:text-green-700 transition-colors">Documents</p>
              <p className="text-xs text-[#9CA3AF]">View and manage your documents</p>
            </div>
          </Link>

          {/* Keyboard Shortcuts */}
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-50">
            <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
              <HiOutlineCommandLine className="w-4 h-4 text-gray-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-[#333]">Keyboard Shortcuts</p>
              <div className="flex items-center gap-2 mt-0.5">
                <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-[10px] font-mono text-gray-600">Ctrl+K</kbd>
                <span className="text-xs text-[#9CA3AF]">Global Search</span>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-3 mt-3">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-1">Contact Us</h4>

            <div className="space-y-2">
              <div className="flex items-center gap-3 px-3 py-2">
                <HiOutlineEnvelope className="w-4 h-4 text-[#6B7280]" />
                <div>
                  <p className="text-xs text-[#6B7280]">Email</p>
                  <p className="text-sm text-[#333]">support@navoditafashion.com</p>
                </div>
              </div>
              <div className="flex items-center gap-3 px-3 py-2">
                <HiOutlinePhone className="w-4 h-4 text-[#6B7280]" />
                <div>
                  <p className="text-xs text-[#6B7280]">Phone</p>
                  <p className="text-sm text-[#333]">+91 XXXXXXXXXX</p>
                </div>
              </div>
              <div className="flex items-center gap-3 px-3 py-2">
                <HiOutlineGlobeAlt className="w-4 h-4 text-[#6B7280]" />
                <div>
                  <p className="text-xs text-[#6B7280]">Website</p>
                  <p className="text-sm text-[#333]">navoditafashion.com</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
          <p className="text-[10px] text-gray-400 text-center">
            NavoditaERP v2.0 &middot; Built with care
          </p>
        </div>
      </div>
    </div>
  );
}


// -- Change Password Modal --------------------------------------------------

function ChangePasswordModal({ isOpen, onClose }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      toast.error('Please fill in all fields.');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match.');
      return;
    }

    if (currentPassword === newPassword) {
      toast.error('New password must be different from current password.');
      return;
    }

    setSaving(true);
    try {
      await apiClient.post('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      toast.success('Password changed successfully!');
      onClose();
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.response?.data?.error ||
        'Failed to change password. Please try again.';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#0071DC]/10 flex items-center justify-center">
              <HiOutlineLockClosed className="w-5 h-5 text-[#0071DC]" />
            </div>
            <h2 className="text-lg font-semibold text-[#333]">Change Password</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <HiOutlineXMark className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Current Password */}
          <div>
            <label
              htmlFor="change-current-password"
              className="block text-sm font-medium text-[#333] mb-1.5"
            >
              Current Password
            </label>
            <div className="relative">
              <input
                id="change-current-password"
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter your current password"
                autoComplete="current-password"
                autoFocus
                className="w-full px-3 py-2.5 pr-10 text-sm border border-[#E5E7EB] rounded-lg
                           focus:outline-none focus:border-[#0071DC] focus:ring-1 focus:ring-[#0071DC]
                           placeholder-gray-400"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
              >
                {showCurrentPassword ? (
                  <HiOutlineEyeSlash className="w-4 h-4" />
                ) : (
                  <HiOutlineEye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label
              htmlFor="change-new-password"
              className="block text-sm font-medium text-[#333] mb-1.5"
            >
              New Password
            </label>
            <div className="relative">
              <input
                id="change-new-password"
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                autoComplete="new-password"
                className="w-full px-3 py-2.5 pr-10 text-sm border border-[#E5E7EB] rounded-lg
                           focus:outline-none focus:border-[#0071DC] focus:ring-1 focus:ring-[#0071DC]
                           placeholder-gray-400"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
              >
                {showNewPassword ? (
                  <HiOutlineEyeSlash className="w-4 h-4" />
                ) : (
                  <HiOutlineEye className="w-4 h-4" />
                )}
              </button>
            </div>
            {newPassword.length > 0 && newPassword.length < 6 && (
              <p className="text-xs text-red-500 mt-1">Password must be at least 6 characters</p>
            )}
          </div>

          {/* Confirm New Password */}
          <div>
            <label
              htmlFor="change-confirm-password"
              className="block text-sm font-medium text-[#333] mb-1.5"
            >
              Confirm New Password
            </label>
            <div className="relative">
              <input
                id="change-confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your new password"
                autoComplete="new-password"
                className="w-full px-3 py-2.5 pr-10 text-sm border border-[#E5E7EB] rounded-lg
                           focus:outline-none focus:border-[#0071DC] focus:ring-1 focus:ring-[#0071DC]
                           placeholder-gray-400"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
              >
                {showConfirmPassword ? (
                  <HiOutlineEyeSlash className="w-4 h-4" />
                ) : (
                  <HiOutlineEye className="w-4 h-4" />
                )}
              </button>
            </div>
            {confirmPassword.length > 0 && newPassword !== confirmPassword && (
              <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-[#6B7280] border border-[#E5E7EB] rounded-lg
                         hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-sm font-medium text-white bg-[#0071DC] rounded-lg
                         hover:bg-[#005BB5] transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Changing...' : 'Change Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ModuleDropdown({ module, isOpen, onToggle, onSelect, isActive }) {
  const Icon = module.icon;
  const dropdownRef = useRef(null);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => onToggle(module.id)}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150
          ${isActive
            ? 'bg-white/15 text-white'
            : 'text-gray-300 hover:bg-white/10 hover:text-white'
          }`}
        title={module.label}
      >
        <Icon className="w-5 h-5" />
        <span className="hidden lg:inline">{module.label}</span>
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-[100]">
          <div className="px-3 py-2 border-b border-gray-100">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {module.label}
            </span>
          </div>
          {module.items.map((item, idx) => (
            <Link
              key={idx}
              to={item.path}
              onClick={() => onSelect(module.id)}
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TopNav({ activeModule, onModuleChange }) {
  const { user, logout } = useAuth();
  const { companyLogo, companyName } = useCompany();
  const navigate = useNavigate();
  const [openDropdown, setOpenDropdown] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showHelpPanel, setShowHelpPanel] = useState(false);
  const topNavRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (topNavRef.current && !topNavRef.current.contains(e.target)) {
        setOpenDropdown(null);
        setShowUserMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleDropdown = (moduleId) => {
    setOpenDropdown((prev) => (prev === moduleId ? null : moduleId));
    setShowUserMenu(false);
  };

  const handleSelectItem = (moduleId) => {
    setOpenDropdown(null);
    onModuleChange(moduleId);
  };

  const handleLogout = () => {
    setShowUserMenu(false);
    logout();
    navigate('/login');
  };

  const handleOpenChangePassword = () => {
    setShowUserMenu(false);
    setShowChangePassword(true);
  };

  return (
    <>
      <header
      ref={topNavRef}
      className="flex items-center justify-between px-4 bg-[#1B2631] select-none"
      style={{ height: 'var(--topnav-height)', minHeight: 'var(--topnav-height)' }}
    >
      {/* Left: Logo */}
      <div className="flex items-center gap-2">
        <Link to="/dashboard" className="flex items-center gap-2 mr-2">
          {companyLogo ? (
            <img
              src={companyLogo}
              alt={companyName}
              className="h-9 max-w-[120px] rounded-lg object-contain flex-shrink-0 bg-white p-0.5"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextElementSibling && (e.target.nextElementSibling.style.display = 'flex');
              }}
            />
          ) : null}
          <div
            className={`w-9 h-9 rounded-lg bg-blue-600 items-center justify-center flex-shrink-0 ${companyLogo ? 'hidden' : 'flex'}`}
          >
            <span className="text-white font-bold text-base">{companyName?.charAt(0)?.toUpperCase() || 'N'}</span>
          </div>
          <span className="text-white font-semibold text-sm hidden md:block">{companyName || 'NavoditaERP'}</span>
        </Link>
      </div>

      {/* Right: Module icons + Help + AI + Search + Notifications + User */}
      <div className="flex items-center gap-1">
        {/* Module icons with dropdowns */}
        {TOP_NAV_MODULES.map((mod) => (
          <ModuleDropdown
            key={mod.id}
            module={mod}
            isOpen={openDropdown === mod.id}
            onToggle={handleToggleDropdown}
            onSelect={handleSelectItem}
            isActive={activeModule === mod.id}
          />
        ))}

        {/* Separator */}
        <div className="w-px h-5 bg-white/20 mx-1" />

        {/* Help icon */}
        <button
          onClick={() => { setShowHelpPanel(!showHelpPanel); setOpenDropdown(null); setShowUserMenu(false); }}
          className="flex items-center gap-1.5 px-2 py-2 rounded-md text-sm font-medium text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
          title="Help & Support"
        >
          <HiOutlineQuestionMarkCircle className="w-5 h-5" />
        </button>

        {/* AI Assistant shortcut */}
        <Link
          to="/ai-assistant"
          className="flex items-center gap-1.5 px-2 py-2 rounded-md text-sm font-medium text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
          title="AI Assistant"
        >
          <HiOutlineSparkles className="w-5 h-5" />
        </Link>

        {/* Separator */}
        <div className="w-px h-5 bg-white/20 mx-1" />

        {/* Global Search */}
        <GlobalSearch onNavigate={(path) => { navigate(path); setOpenDropdown(null); setShowUserMenu(false); }} />

        {/* Notifications */}
        <button
          className="relative p-2 rounded-md text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
          title="Notifications"
        >
          <HiOutlineBell className="w-5 h-5" />
        </button>

        {/* User avatar dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setShowUserMenu(!showUserMenu);
              setOpenDropdown(null);
            }}
            className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/10 transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-semibold">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <span className="text-sm text-gray-200 hidden md:block">
              {user?.name || 'User'}
            </span>
          </button>

          {showUserMenu && (
            <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-[100]">
              <div className="px-4 py-2.5 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-900">{user?.name || 'User'}</p>
                <p className="text-xs text-gray-500 mt-0.5">{user?.email || ''}</p>
              </div>
              <Link
                to="/company"
                onClick={() => setShowUserMenu(false)}
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Company Profile
              </Link>
              <Link
                to="/settings"
                onClick={() => setShowUserMenu(false)}
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Settings
              </Link>
              <button
                onClick={handleOpenChangePassword}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <HiOutlineLockClosed className="w-4 h-4" />
                Change Password
              </button>
              <div className="border-t border-gray-100 mt-1">
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <HiOutlineArrowRightOnRectangle className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={showChangePassword}
        onClose={() => setShowChangePassword(false)}
      />

      {/* Help Panel */}
      <HelpPanel
        isOpen={showHelpPanel}
        onClose={() => setShowHelpPanel(false)}
      />
    </>
  );
}
