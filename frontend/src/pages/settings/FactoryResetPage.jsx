import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HiOutlineExclamationTriangle,
  HiOutlineTrash,
  HiOutlineArrowPath,
  HiOutlineShieldCheck,
  HiOutlineCheckCircle,
  HiOutlineLockClosed,
  HiOutlineEye,
  HiOutlineEyeSlash,
  HiOutlineArchiveBoxXMark,
  HiOutlineShieldExclamation,
  HiOutlineCloudArrowUp,
  HiOutlineCloudArrowDown,
  HiOutlineKey,
  HiOutlinePencilSquare,
  HiOutlineClock,
  HiOutlineXMark,
  HiOutlineDocumentDuplicate,
  HiOutlineArrowDownTray,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import apiClient from '../../api/client';

// ── Constants ─────────────────────────────────────────────────────

const RESET_TIERS = [
  {
    id: 'soft-reset',
    label: 'Soft Reset',
    icon: HiOutlineArchiveBoxXMark,
    confirmText: 'SOFT RESET',
    endpoint: '/factory-reset/soft-reset',
    color: 'amber',
    description: 'Clear all transaction records while keeping your master data intact. Ideal for starting a new financial year.',
    deletedItems: [
      'Invoices & Quotations',
      'Bills & Purchase Orders',
      'Credit/Debit Notes',
      'Delivery Challans & Packing Lists',
      'E-Way Bills',
      'Payments (Received & Made)',
      'Expenses',
      'Journal Entries',
      'Salary Records',
      'Bank Transactions',
      'GST Filings & TDS Records',
      'Inventory Transactions',
      'Costing Sheets',
      'Investor Orders & Partners',
      'Offer/Joining Letters',
      'Documents & Audit Logs',
    ],
    preservedItems: [
      'Company Profile',
      'User Accounts & Login',
      'Customers & Vendors',
      'Items & Products',
      'Employees & Departments',
      'Bank Accounts (balances reset)',
      'App Settings & Configuration',
      'Chart of Accounts',
      'HSN/SAC Codes',
      'HR Policies & Government Holidays',
    ],
  },
  {
    id: 'factory-reset',
    label: 'Factory Reset',
    icon: HiOutlineShieldExclamation,
    confirmText: 'FACTORY RESET',
    endpoint: '/factory-reset/factory-reset',
    color: 'red',
    description: 'Delete ALL business data including master records. Only company profile, user accounts, and app settings are preserved.',
    deletedItems: [
      'Everything in Soft Reset, PLUS:',
      'All Customers & Customer Addresses',
      'All Vendors & Vendor Addresses',
      'All Items & Products',
      'All Employees & Departments',
      'All Bank Accounts',
      'HR Policies & Government Holidays',
    ],
    preservedItems: [
      'Company Profile',
      'User Accounts & Login',
      'App Settings',
      'Chart of Accounts',
      'Currency Settings',
      'HSN/SAC Codes',
    ],
  },
  {
    id: 'lock-erase',
    label: 'Lock Erase',
    icon: HiOutlineExclamationTriangle,
    confirmText: 'LOCK ERASE',
    endpoint: '/factory-reset/lock-erase',
    color: 'rose',
    description: 'COMPLETE WIPE — Removes absolutely everything. Only your current user account survives. The application returns to a fresh-install state.',
    deletedItems: [
      'Everything in Factory Reset, PLUS:',
      'Company Profile & Branding',
      'All Other User Accounts',
      'App Settings & Configuration',
      'Secure Vault Data',
      'Biometric/WebAuthn Credentials',
    ],
    preservedItems: [
      'Your Current User Account (only)',
      'Chart of Accounts (default)',
      'HSN/SAC Codes',
      'System Database Schema',
    ],
  },
];

// ── Color Maps ───────────────────────────────────────────────────

const COLOR_MAP = {
  amber: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    headerBg: 'bg-gradient-to-r from-amber-50 to-yellow-50',
    headerBorder: 'border-amber-200',
    iconBg: 'bg-amber-100',
    iconBorder: 'border-amber-200',
    iconText: 'text-amber-600',
    button: 'bg-amber-600 hover:bg-amber-700',
    tabActive: 'bg-amber-50 text-amber-700 border-amber-500',
    tabBadge: 'bg-amber-100 text-amber-700',
    deleteBg: 'bg-amber-50',
    deleteBorder: 'border-amber-200',
    deleteHeader: 'text-amber-700',
    dotColor: 'bg-amber-400',
    confirmRing: 'focus:ring-amber-500/20 focus:border-amber-400',
    textAccent: 'text-amber-600',
  },
  red: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    headerBg: 'bg-gradient-to-r from-red-50 to-orange-50',
    headerBorder: 'border-red-200',
    iconBg: 'bg-red-100',
    iconBorder: 'border-red-200',
    iconText: 'text-red-600',
    button: 'bg-red-600 hover:bg-red-700',
    tabActive: 'bg-red-50 text-red-700 border-red-500',
    tabBadge: 'bg-red-100 text-red-700',
    deleteBg: 'bg-red-50',
    deleteBorder: 'border-red-200',
    deleteHeader: 'text-red-700',
    dotColor: 'bg-red-400',
    confirmRing: 'focus:ring-red-500/20 focus:border-red-400',
    textAccent: 'text-red-600',
  },
  rose: {
    bg: 'bg-rose-50',
    border: 'border-rose-300',
    headerBg: 'bg-gradient-to-r from-rose-100 to-red-100',
    headerBorder: 'border-rose-300',
    iconBg: 'bg-rose-200',
    iconBorder: 'border-rose-300',
    iconText: 'text-rose-700',
    button: 'bg-rose-700 hover:bg-rose-800',
    tabActive: 'bg-rose-50 text-rose-700 border-rose-600',
    tabBadge: 'bg-rose-100 text-rose-700',
    deleteBg: 'bg-rose-50',
    deleteBorder: 'border-rose-300',
    deleteHeader: 'text-rose-700',
    dotColor: 'bg-rose-500',
    confirmRing: 'focus:ring-rose-500/20 focus:border-rose-400',
    textAccent: 'text-rose-700',
  },
};

// ── Main Component ────────────────────────────────────────────────

export default function FactoryResetPage() {
  const navigate = useNavigate();

  // ── Section tabs: Data Reset | Backups | Password ──
  const [activeSection, setActiveSection] = useState('reset');

  // ── Reset State ──
  const [activeTab, setActiveTab] = useState('soft-reset');
  const [confirmText, setConfirmText] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);
  const [completedType, setCompletedType] = useState('');

  // ── Backup Before Reset ──
  const [showBackupPrompt, setShowBackupPrompt] = useState(false);
  const [backupName, setBackupName] = useState('');
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [backupCreated, setBackupCreated] = useState(false);

  // ── Backup List State ──
  const [backups, setBackups] = useState([]);
  const [loadingBackups, setLoadingBackups] = useState(false);
  const [restoringId, setRestoringId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [restorePassword, setRestorePassword] = useState('');
  const [showRestorePassword, setShowRestorePassword] = useState(false);
  const [restoreConfirmId, setRestoreConfirmId] = useState(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // ── Password Change State ──
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const activeTier = RESET_TIERS.find((t) => t.id === activeTab);
  const colors = COLOR_MAP[activeTier.color];
  const isConfirmed = confirmText === activeTier.confirmText;

  // ── Load backups when section changes ──
  useEffect(() => {
    if (activeSection === 'backups') {
      fetchBackups();
    }
  }, [activeSection]);

  const fetchBackups = async () => {
    setLoadingBackups(true);
    try {
      const res = await apiClient.get('/backups/list');
      setBackups(res.data.backups || []);
    } catch (err) {
      console.error('Failed to load backups:', err);
      toast.error('Failed to load backups');
    } finally {
      setLoadingBackups(false);
    }
  };

  // ── Generate default backup name ──
  const generateBackupName = () => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `Backup_${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}`;
  };

  // ── Handle Reset (with backup prompt) ──
  const handleResetClick = () => {
    if (!isConfirmed) return;
    if (!password.trim()) {
      toast.error('Please enter your password for verification.');
      return;
    }
    // Show backup prompt before proceeding
    setBackupName(generateBackupName());
    setShowBackupPrompt(true);
    setBackupCreated(false);
  };

  const handleCreateBackupAndReset = async () => {
    if (!backupName.trim()) {
      toast.error('Please enter a backup name.');
      return;
    }
    setCreatingBackup(true);
    try {
      await apiClient.post('/backups/create', {
        password,
        backupName: backupName.trim(),
      });
      setBackupCreated(true);
      toast.success('Backup created successfully!');
      // Now proceed with the reset
      setTimeout(() => {
        executeReset();
      }, 1000);
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to create backup.';
      toast.error(message);
      setCreatingBackup(false);
    }
  };

  const handleSkipBackupAndReset = () => {
    setShowBackupPrompt(false);
    executeReset();
  };

  const executeReset = async () => {
    setShowBackupPrompt(false);
    setResetting(true);
    try {
      await apiClient.post(activeTier.endpoint, {
        password,
        confirmText: activeTier.confirmText,
      });
      setResetComplete(true);
      setCompletedType(activeTier.label);
      toast.success(`${activeTier.label} completed successfully.`);
      setTimeout(() => {
        if (activeTab === 'lock-erase') {
          localStorage.removeItem('auth_token');
          window.location.href = '/login';
        } else {
          navigate('/dashboard');
        }
      }, 3000);
    } catch (err) {
      const message =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Reset failed. Please check your password and try again.';
      toast.error(message);
    } finally {
      setResetting(false);
      setCreatingBackup(false);
    }
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setConfirmText('');
    setPassword('');
    setShowPassword(false);
  };

  // ── Backup Actions ──
  const handleRestoreBackup = async () => {
    if (!restorePassword.trim()) {
      toast.error('Password is required to restore a backup.');
      return;
    }
    setRestoringId(restoreConfirmId);
    try {
      await apiClient.post('/backups/restore', {
        password: restorePassword,
        backupId: restoreConfirmId,
      });
      toast.success('Backup restored successfully!');
      setRestoreConfirmId(null);
      setRestorePassword('');
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to restore backup.';
      toast.error(message);
    } finally {
      setRestoringId(null);
    }
  };

  const handleDeleteBackup = async () => {
    if (!deletePassword.trim()) {
      toast.error('Password is required to delete a backup.');
      return;
    }
    setDeletingId(deleteConfirmId);
    try {
      await apiClient.delete(`/backups/delete/${deleteConfirmId}`, {
        data: { password: deletePassword },
      });
      toast.success('Backup deleted.');
      setDeleteConfirmId(null);
      setDeletePassword('');
      fetchBackups();
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to delete backup.';
      toast.error(message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleRenameBackup = async (id) => {
    if (!editName.trim()) return;
    try {
      await apiClient.post(`/backups/rename/${id}`, { backupName: editName.trim() });
      toast.success('Backup renamed.');
      setEditingId(null);
      setEditName('');
      fetchBackups();
    } catch (err) {
      toast.error('Failed to rename backup.');
    }
  };

  // ── Password Change ──
  const handleChangePassword = async () => {
    if (!currentPassword.trim() || !newPassword.trim()) {
      toast.error('All password fields are required.');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast.error('New passwords do not match.');
      return;
    }
    setChangingPassword(true);
    try {
      await apiClient.post('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      toast.success('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err) {
      const message = err.response?.data?.error || err.response?.data?.message || 'Failed to change password.';
      toast.error(message);
    } finally {
      setChangingPassword(false);
    }
  };

  // ── Success State ──────────────────────────────────────────────

  if (resetComplete) {
    return (
      <div className="pb-8">
        <div className="max-w-2xl mx-auto mt-12">
          <div className="bg-white rounded-lg border border-green-200 shadow-sm overflow-hidden">
            <div className="bg-green-50 px-6 py-8 text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <HiOutlineCheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold text-green-800">{completedType} Complete</h2>
              <p className="text-sm text-green-700 mt-2">
                Your data has been successfully cleared. The application is now ready for fresh data entry.
              </p>
              <p className="text-xs text-green-600 mt-4">
                Redirecting {activeTab === 'lock-erase' ? 'to login' : 'to dashboard'} in a few seconds...
              </p>
              <button
                onClick={() => {
                  if (activeTab === 'lock-erase') {
                    localStorage.removeItem('auth_token');
                    window.location.href = '/login';
                  } else {
                    navigate('/dashboard');
                  }
                }}
                className="mt-4 inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors cursor-pointer"
              >
                <HiOutlineArrowPath className="w-4 h-4" />
                {activeTab === 'lock-erase' ? 'Go to Login' : 'Go to Dashboard'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Main Render ────────────────────────────────────────────────

  return (
    <div className="pb-8">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#333]">Data Management</h1>
        <p className="text-sm text-[#6B7280] mt-1">
          Manage data resets, backups, restore points, and account security
        </p>
      </div>

      {/* Section Tabs */}
      <div className="max-w-5xl">
        <div className="flex gap-1 mb-6 border-b border-[#E5E7EB]">
          {[
            { id: 'reset', label: 'Data Reset', icon: HiOutlineTrash },
            { id: 'backups', label: 'Backups & Restore', icon: HiOutlineCloudArrowUp },
            { id: 'password', label: 'Change Password', icon: HiOutlineKey },
          ].map((section) => {
            const SIcon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors cursor-pointer -mb-[1px] ${
                  activeSection === section.id
                    ? 'border-[#0071DC] text-[#0071DC]'
                    : 'border-transparent text-[#6B7280] hover:text-[#333] hover:border-gray-300'
                }`}
              >
                <SIcon className="w-4 h-4" />
                {section.label}
              </button>
            );
          })}
        </div>

        {/* ═══════════════ DATA RESET SECTION ═══════════════ */}
        {activeSection === 'reset' && (
          <>
            {/* Tier Tabs */}
            <div className="flex gap-2 mb-6">
              {RESET_TIERS.map((tier) => {
                const TierIcon = tier.icon;
                const tierColors = COLOR_MAP[tier.color];
                const isActive = activeTab === tier.id;
                return (
                  <button
                    key={tier.id}
                    onClick={() => handleTabChange(tier.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border-2 transition-all cursor-pointer ${
                      isActive
                        ? `${tierColors.tabActive} border-current`
                        : 'border-[#E5E7EB] text-[#6B7280] hover:bg-gray-50 hover:text-[#333]'
                    }`}
                  >
                    <TierIcon className="w-4 h-4" />
                    {tier.label}
                    {tier.id === 'lock-erase' && (
                      <span className="text-[10px] font-bold bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded uppercase">
                        Danger
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Active Tier Card */}
            <div className={`bg-white rounded-lg border-2 ${colors.border} shadow-sm overflow-hidden`}>
              {/* Warning Header */}
              <div className={`${colors.headerBg} border-b ${colors.headerBorder} px-6 py-5`}>
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-lg ${colors.iconBg} border ${colors.iconBorder} flex items-center justify-center shrink-0`}>
                    {React.createElement(activeTier.icon, { className: `w-6 h-6 ${colors.iconText}` })}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-[#333] flex items-center gap-2">
                      {activeTier.label}
                      <HiOutlineLockClosed className="w-4 h-4 text-[#6B7280]" title="Password protected" />
                    </h2>
                    <p className="text-sm text-[#6B7280] mt-1">{activeTier.description}</p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="px-6 py-6">
                {/* Two-Column Data Impact */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  {/* What Will Be DELETED */}
                  <div className={`rounded-lg border ${colors.deleteBorder} overflow-hidden`}>
                    <div className={`${colors.deleteBg} px-4 py-3 border-b ${colors.deleteBorder}`}>
                      <div className="flex items-center gap-2">
                        <HiOutlineTrash className={`w-4 h-4 ${colors.iconText}`} />
                        <h3 className={`text-sm font-semibold ${colors.deleteHeader}`}>What will be DELETED</h3>
                      </div>
                    </div>
                    <div className="p-4">
                      <ul className="space-y-1.5">
                        {activeTier.deletedItems.map((item, i) => (
                          <li key={i} className={`flex items-center gap-2 text-sm ${item.includes('PLUS') ? 'font-semibold text-[#333] mt-2' : 'text-[#333]'}`}>
                            {!item.includes('PLUS') && (
                              <span className={`w-1.5 h-1.5 rounded-full ${colors.dotColor} shrink-0`} />
                            )}
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* What Will Be PRESERVED */}
                  <div className="rounded-lg border border-green-200 overflow-hidden">
                    <div className="bg-green-50 px-4 py-3 border-b border-green-200">
                      <div className="flex items-center gap-2">
                        <HiOutlineShieldCheck className="w-4 h-4 text-green-600" />
                        <h3 className="text-sm font-semibold text-green-700">What will be PRESERVED</h3>
                      </div>
                    </div>
                    <div className="p-4">
                      <ul className="space-y-1.5">
                        {activeTier.preservedItems.map((item, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm text-[#333]">
                            <HiOutlineCheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Security Verification Section */}
                <div className="border-t border-[#E5E7EB] pt-6">
                  <div className="max-w-lg">
                    <h3 className="text-sm font-semibold text-[#333] mb-1 flex items-center gap-2">
                      <HiOutlineLockClosed className="w-4 h-4" />
                      Security Verification
                    </h3>
                    <p className="text-xs text-[#6B7280] mb-4">
                      Enter your login password and the confirmation text to proceed. You will be prompted to save a backup before the reset executes.
                    </p>

                    {/* Password Field */}
                    <div className="mb-4">
                      <label htmlFor="reset-password" className="block text-sm font-medium text-[#333] mb-1.5">
                        Your Password
                      </label>
                      <div className="relative">
                        <input
                          id="reset-password"
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter your login password"
                          disabled={resetting}
                          autoComplete="current-password"
                          className="w-full px-3 py-2.5 pr-10 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC] disabled:bg-gray-50 disabled:text-[#6B7280] transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                          tabIndex={-1}
                        >
                          {showPassword ? (
                            <HiOutlineEyeSlash className="w-4 h-4" />
                          ) : (
                            <HiOutlineEye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Confirmation Text */}
                    <div className="mb-4">
                      <label htmlFor="reset-confirm" className="block text-sm font-medium text-[#333] mb-1.5">
                        Confirmation Text
                      </label>
                      <p className="text-sm text-[#6B7280] mb-2">
                        Type{' '}
                        <code className={`px-2 py-0.5 ${colors.bg} ${colors.textAccent} text-xs font-mono font-semibold rounded border ${colors.border}`}>
                          {activeTier.confirmText}
                        </code>{' '}
                        to confirm.
                      </p>
                      <input
                        id="reset-confirm"
                        type="text"
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                        placeholder={`Type "${activeTier.confirmText}" to confirm`}
                        disabled={resetting}
                        className={`w-full px-3 py-2.5 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 ${colors.confirmRing} disabled:bg-gray-50 disabled:text-[#6B7280] transition-colors font-mono`}
                        autoComplete="off"
                        spellCheck="false"
                      />
                      {confirmText.length > 0 && !isConfirmed && (
                        <p className="text-xs text-red-500 mt-1.5">
                          Text does not match. Please type exactly: {activeTier.confirmText}
                        </p>
                      )}
                      {isConfirmed && (
                        <p className="text-xs text-green-600 mt-1.5 flex items-center gap-1">
                          <HiOutlineCheckCircle className="w-3.5 h-3.5" />
                          Confirmation text matches.
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={handleResetClick}
                      disabled={!isConfirmed || !password.trim() || resetting}
                      className={`inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white ${colors.button} rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer`}
                    >
                      {resetting ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Processing {activeTier.label}... Please wait
                        </>
                      ) : (
                        <>
                          <HiOutlineTrash className="w-4 h-4" />
                          Execute {activeTier.label}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ═══════════════ BACKUPS & RESTORE SECTION ═══════════════ */}
        {activeSection === 'backups' && (
          <div className="space-y-6">
            {/* Create Backup Card */}
            <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 border border-blue-200 flex items-center justify-center">
                    <HiOutlineCloudArrowUp className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-[#333]">Create New Backup</h3>
                    <p className="text-xs text-[#6B7280]">Save a snapshot of all your data that can be restored later</p>
                  </div>
                </div>
              </div>
              <div className="px-6 py-5">
                <div className="flex items-end gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-[#333] mb-1.5">Backup Name</label>
                    <input
                      type="text"
                      value={backupName || generateBackupName()}
                      onChange={(e) => setBackupName(e.target.value)}
                      placeholder="e.g., Before Year End 2025"
                      className="w-full px-3 py-2.5 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-[#333] mb-1.5">Password (for security)</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your login password"
                      className="w-full px-3 py-2.5 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
                    />
                  </div>
                  <button
                    onClick={async () => {
                      const name = (backupName || generateBackupName()).trim();
                      if (!password.trim()) {
                        toast.error('Password is required.');
                        return;
                      }
                      setCreatingBackup(true);
                      try {
                        await apiClient.post('/backups/create', { password, backupName: name });
                        toast.success('Backup created!');
                        setBackupName('');
                        setPassword('');
                        fetchBackups();
                      } catch (err) {
                        toast.error(err.response?.data?.message || 'Failed to create backup.');
                      } finally {
                        setCreatingBackup(false);
                      }
                    }}
                    disabled={creatingBackup}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-[#0071DC] rounded-lg hover:bg-[#005BB5] transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap"
                  >
                    {creatingBackup ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Creating...
                      </>
                    ) : (
                      <>
                        <HiOutlineCloudArrowUp className="w-4 h-4" />
                        Create Backup
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Backup List */}
            <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-[#E5E7EB] flex items-center justify-between">
                <h3 className="text-base font-semibold text-[#333] flex items-center gap-2">
                  <HiOutlineDocumentDuplicate className="w-5 h-5 text-[#6B7280]" />
                  Saved Backups
                </h3>
                <button
                  onClick={fetchBackups}
                  className="text-sm text-[#0071DC] hover:text-[#005BB5] flex items-center gap-1 cursor-pointer"
                >
                  <HiOutlineArrowPath className="w-4 h-4" />
                  Refresh
                </button>
              </div>

              {loadingBackups ? (
                <div className="px-6 py-12 text-center">
                  <svg className="w-6 h-6 animate-spin text-[#0071DC] mx-auto mb-2" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <p className="text-sm text-[#6B7280]">Loading backups...</p>
                </div>
              ) : backups.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <HiOutlineCloudArrowUp className="w-10 h-10 text-[#D1D5DB] mx-auto mb-2" />
                  <p className="text-sm text-[#6B7280]">No backups found. Create one above to protect your data.</p>
                </div>
              ) : (
                <div className="divide-y divide-[#E5E7EB]">
                  {backups.map((backup) => (
                    <div key={backup.id} className="px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                            <HiOutlineCloudArrowDown className="w-4 h-4 text-blue-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            {editingId === backup.id ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  className="px-2 py-1 border border-[#E5E7EB] rounded text-sm flex-1 focus:outline-none focus:ring-1 focus:ring-[#0071DC]"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleRenameBackup(backup.id);
                                    if (e.key === 'Escape') setEditingId(null);
                                  }}
                                />
                                <button
                                  onClick={() => handleRenameBackup(backup.id)}
                                  className="text-xs text-[#0071DC] hover:text-[#005BB5] font-medium cursor-pointer"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => setEditingId(null)}
                                  className="text-xs text-[#6B7280] hover:text-[#333] cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-[#333] truncate">{backup.backup_name}</p>
                                <button
                                  onClick={() => {
                                    setEditingId(backup.id);
                                    setEditName(backup.backup_name);
                                  }}
                                  className="text-[#9CA3AF] hover:text-[#0071DC] cursor-pointer"
                                  title="Rename"
                                >
                                  <HiOutlinePencilSquare className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                            <p className="text-xs text-[#6B7280] flex items-center gap-1 mt-0.5">
                              <HiOutlineClock className="w-3 h-3" />
                              {new Date(backup.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          {restoreConfirmId === backup.id ? (
                            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                              <input
                                type={showRestorePassword ? 'text' : 'password'}
                                value={restorePassword}
                                onChange={(e) => setRestorePassword(e.target.value)}
                                placeholder="Your password"
                                className="px-2 py-1 border border-[#E5E7EB] rounded text-xs w-36 focus:outline-none focus:ring-1 focus:ring-amber-400"
                                onKeyDown={(e) => e.key === 'Enter' && handleRestoreBackup()}
                              />
                              <button
                                onClick={handleRestoreBackup}
                                disabled={restoringId === backup.id}
                                className="text-xs font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 px-2.5 py-1 rounded transition-colors cursor-pointer disabled:opacity-50"
                              >
                                {restoringId === backup.id ? 'Restoring...' : 'Confirm'}
                              </button>
                              <button
                                onClick={() => {
                                  setRestoreConfirmId(null);
                                  setRestorePassword('');
                                }}
                                className="text-[#6B7280] hover:text-[#333] cursor-pointer"
                              >
                                <HiOutlineXMark className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setRestoreConfirmId(backup.id)}
                              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#0071DC] bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                            >
                              <HiOutlineArrowDownTray className="w-3.5 h-3.5" />
                              Restore
                            </button>
                          )}
                          {deleteConfirmId === backup.id ? (
                            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                              <input
                                type="password"
                                value={deletePassword}
                                onChange={(e) => setDeletePassword(e.target.value)}
                                placeholder="Your password"
                                className="px-2 py-1 border border-[#E5E7EB] rounded text-xs w-36 focus:outline-none focus:ring-1 focus:ring-red-400"
                                onKeyDown={(e) => e.key === 'Enter' && handleDeleteBackup()}
                              />
                              <button
                                onClick={handleDeleteBackup}
                                disabled={deletingId === backup.id}
                                className="text-xs font-medium text-red-700 bg-red-100 hover:bg-red-200 px-2.5 py-1 rounded transition-colors cursor-pointer disabled:opacity-50"
                              >
                                {deletingId === backup.id ? 'Deleting...' : 'Delete'}
                              </button>
                              <button
                                onClick={() => {
                                  setDeleteConfirmId(null);
                                  setDeletePassword('');
                                }}
                                className="text-[#6B7280] hover:text-[#333] cursor-pointer"
                              >
                                <HiOutlineXMark className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirmId(backup.id)}
                              className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                            >
                              <HiOutlineTrash className="w-3.5 h-3.5" />
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════ PASSWORD CHANGE SECTION ═══════════════ */}
        {activeSection === 'password' && (
          <div className="max-w-lg">
            <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-100 border border-indigo-200 flex items-center justify-center">
                    <HiOutlineKey className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-[#333]">Change Login Password</h3>
                    <p className="text-xs text-[#6B7280]">Update your account password. Minimum 6 characters required.</p>
                  </div>
                </div>
              </div>
              <div className="px-6 py-5 space-y-4">
                {/* Current Password */}
                <div>
                  <label className="block text-sm font-medium text-[#333] mb-1.5">Current Password</label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter your current password"
                      className="w-full px-3 py-2.5 pr-10 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                      tabIndex={-1}
                    >
                      {showCurrentPassword ? <HiOutlineEyeSlash className="w-4 h-4" /> : <HiOutlineEye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-sm font-medium text-[#333] mb-1.5">New Password</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password (min 6 characters)"
                      className="w-full px-3 py-2.5 pr-10 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                      tabIndex={-1}
                    >
                      {showNewPassword ? <HiOutlineEyeSlash className="w-4 h-4" /> : <HiOutlineEye className="w-4 h-4" />}
                    </button>
                  </div>
                  {newPassword.length > 0 && newPassword.length < 6 && (
                    <p className="text-xs text-red-500 mt-1">Password must be at least 6 characters.</p>
                  )}
                </div>

                {/* Confirm New Password */}
                <div>
                  <label className="block text-sm font-medium text-[#333] mb-1.5">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full px-3 py-2.5 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
                  />
                  {confirmNewPassword.length > 0 && newPassword !== confirmNewPassword && (
                    <p className="text-xs text-red-500 mt-1">Passwords do not match.</p>
                  )}
                  {confirmNewPassword.length > 0 && newPassword === confirmNewPassword && newPassword.length >= 6 && (
                    <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                      <HiOutlineCheckCircle className="w-3.5 h-3.5" />
                      Passwords match.
                    </p>
                  )}
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleChangePassword}
                    disabled={
                      changingPassword ||
                      !currentPassword.trim() ||
                      !newPassword.trim() ||
                      newPassword.length < 6 ||
                      newPassword !== confirmNewPassword
                    }
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-[#0071DC] rounded-lg hover:bg-[#005BB5] transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {changingPassword ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Changing Password...
                      </>
                    ) : (
                      <>
                        <HiOutlineKey className="w-4 h-4" />
                        Change Password
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════ BACKUP PROMPT MODAL ═══════════════ */}
      {showBackupPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 border border-blue-200 flex items-center justify-center">
                  <HiOutlineCloudArrowUp className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[#333]">Save Backup Before Reset?</h3>
                  <p className="text-xs text-[#6B7280]">We strongly recommend creating a backup before proceeding</p>
                </div>
              </div>
            </div>
            <div className="px-6 py-5">
              {backupCreated ? (
                <div className="text-center py-4">
                  <HiOutlineCheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
                  <p className="text-sm font-medium text-green-700">Backup created! Proceeding with {activeTier.label}...</p>
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-[#333] mb-1.5">Backup Name</label>
                    <input
                      type="text"
                      value={backupName}
                      onChange={(e) => setBackupName(e.target.value)}
                      placeholder="e.g., Before Soft Reset Feb 2026"
                      className="w-full px-3 py-2.5 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
                    />
                    <p className="text-xs text-[#6B7280] mt-1">You can edit this name. The backup will be available under Backups & Restore.</p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleCreateBackupAndReset}
                      disabled={creatingBackup}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-[#0071DC] rounded-lg hover:bg-[#005BB5] transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {creatingBackup ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Creating Backup...
                        </>
                      ) : (
                        <>
                          <HiOutlineCloudArrowUp className="w-4 h-4" />
                          Backup & Reset
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleSkipBackupAndReset}
                      disabled={creatingBackup}
                      className="px-4 py-2.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                    >
                      Skip Backup
                    </button>
                    <button
                      onClick={() => setShowBackupPrompt(false)}
                      disabled={creatingBackup}
                      className="px-4 py-2.5 text-sm font-medium text-[#6B7280] bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
