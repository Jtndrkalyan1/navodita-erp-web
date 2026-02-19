import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  HiOutlineBuildingLibrary,
  HiOutlinePlus,
  HiOutlineCurrencyRupee,
  HiOutlineArrowUpRight,
  HiOutlineArrowDownLeft,
  HiOutlineCheckCircle,
  HiOutlineXMark,
  HiOutlineFunnel,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineBanknotes,
  HiOutlineArrowPath,
  HiOutlineCloudArrowUp,
  HiOutlineDocumentArrowUp,
  HiOutlineXCircle,
  HiOutlineExclamationTriangle,
  HiOutlineMagnifyingGlass,
  HiOutlineTag,
  HiOutlinePencilSquare,
  HiOutlineBookOpen,
  HiOutlineEllipsisVertical,
  HiOutlineTrash,
  HiOutlineAdjustmentsHorizontal,
  HiOutlinePower,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import apiClient from '../../api/client';
import StatementImport from './StatementImport';

/* ─── Helpers ──────────────────────────────────────────────────────────── */

function formatIndianCurrency(value) {
  if (value == null || isNaN(value)) return '\u20B90.00';
  const num = Number(value);
  const isNegative = num < 0;
  const abs = Math.abs(num);
  const [intPart, decPart] = abs.toFixed(2).split('.');
  let result = '';
  const len = intPart.length;
  if (len <= 3) {
    result = intPart;
  } else {
    result = intPart.slice(-3);
    let remaining = intPart.slice(0, -3);
    while (remaining.length > 2) {
      result = remaining.slice(-2) + ',' + result;
      remaining = remaining.slice(0, -2);
    }
    if (remaining.length > 0) {
      result = remaining + ',' + result;
    }
  }
  return `${isNegative ? '-' : ''}\u20B9${result}.${decPart}`;
}

function formatDate(dateStr) {
  if (!dateStr) return '--';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '--';
  }
}

function maskAccountNumber(num) {
  if (!num) return '--';
  const str = String(num);
  if (str.length <= 4) return str;
  return 'XXXX' + str.slice(-4);
}

function SummaryCard({ title, value, icon: Icon, color }) {
  return (
    <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-4 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-xs text-[#6B7280] font-medium uppercase tracking-wide">{title}</p>
        <p className="text-lg font-semibold text-[#333] mt-0.5">{value}</p>
      </div>
    </div>
  );
}

const ACCOUNT_TYPES = ['Current', 'Savings', 'Fixed Deposit', 'Overdraft'];

/* Zoho Books style category labels (key -> label mapping) */
const CATEGORY_LABELS = {
  customer_payment: 'Customer Payment',
  retainer_payment: 'Retainer Payment',
  transfer_from: 'Transfer From Account',
  interest_income: 'Interest Income',
  other_income: 'Other Income',
  expense_refund: 'Expense Refund',
  deposit_other: 'Deposit From Account',
  vendor_payment: 'Vendor Payment',
  expense: 'Expense',
  owners_contribution: "Owner's Contribution",
  vendor_credit_refund: 'Vendor Credit Refund',
  transfer_to: 'Transfer To Account',
  payroll: 'Payroll',
  // Legacy categories for backward compatibility
  Sales: 'Sales', Purchase: 'Purchase', Salary: 'Salary', Rent: 'Rent',
  Utilities: 'Utilities', 'Office Supplies': 'Office Supplies', Travel: 'Travel',
  Marketing: 'Marketing', Insurance: 'Insurance', 'Tax Payment': 'Tax Payment',
  'Loan Payment': 'Loan Payment', 'Interest Income': 'Interest Income',
  'Interest Expense': 'Interest Expense', 'Bank Charges': 'Bank Charges',
  Refund: 'Refund', Transfer: 'Transfer', Other: 'Other',
};

const CATEGORY_COLORS = {
  customer_payment: 'bg-green-50 text-green-700 border-green-200',
  retainer_payment: 'bg-green-50 text-green-700 border-green-200',
  vendor_payment: 'bg-red-50 text-red-700 border-red-200',
  expense: 'bg-orange-50 text-orange-700 border-orange-200',
  transfer_from: 'bg-blue-50 text-blue-700 border-blue-200',
  transfer_to: 'bg-blue-50 text-blue-700 border-blue-200',
  interest_income: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  other_income: 'bg-teal-50 text-teal-700 border-teal-200',
  expense_refund: 'bg-purple-50 text-purple-700 border-purple-200',
  deposit_other: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  owners_contribution: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  vendor_credit_refund: 'bg-pink-50 text-pink-700 border-pink-200',
  payroll: 'bg-violet-50 text-violet-700 border-violet-200',
};

/* ─── Main Component ───────────────────────────────────────────────────── */

export default function BankingPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [pendingAccountId, setPendingAccountId] = useState(null);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [bankAccountsLoading, setBankAccountsLoading] = useState(true);
  const [bankingSummary, setBankingSummary] = useState(null);

  // Read active tab from URL query params (default to 'accounts')
  const activeTab = searchParams.get('tab') || 'accounts';
  const setActiveTab = useCallback((tab) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('tab', tab);
    // Preserve account param if present
    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams]);

  // Fetch all bank accounts for the balance summary bar
  const fetchBankAccounts = useCallback(async () => {
    setBankAccountsLoading(true);
    try {
      const response = await apiClient.get('/bank-accounts');
      const data = response.data?.data || [];
      setBankAccounts(data);
    } catch {
      setBankAccounts([]);
    } finally {
      setBankAccountsLoading(false);
    }
  }, []);

  // Fetch banking summary (Amount in Books, Amount in Bank, Last Feed Date, per-account balances)
  const fetchBankingSummary = useCallback(async () => {
    try {
      const response = await apiClient.get('/bank-accounts/summary');
      setBankingSummary(response.data?.data || null);
    } catch {
      setBankingSummary(null);
    }
  }, []);

  // Fetch bank accounts and summary on mount
  useEffect(() => {
    fetchBankAccounts();
    fetchBankingSummary();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Refresh bank accounts when switching to accounts tab (to pick up edits/imports)
  useEffect(() => {
    if (activeTab === 'accounts') {
      fetchBankAccounts();
      fetchBankingSummary();
    }
  }, [activeTab, fetchBankAccounts, fetchBankingSummary]);

  // Check for account query parameter on mount
  useEffect(() => {
    const accountIdFromUrl = searchParams.get('account');
    if (accountIdFromUrl) {
      setPendingAccountId(accountIdFromUrl);
      // Keep the tab param but clean up account
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('account');
      if (!newParams.get('tab')) newParams.set('tab', 'transactions');
      setSearchParams(newParams, { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Callback for when accounts are loaded (used to resolve pending account from URL)
  const handleAccountsLoaded = useCallback((accounts) => {
    if (pendingAccountId && accounts.length > 0) {
      const account = accounts.find((a) => String(a.id) === String(pendingAccountId));
      if (account) {
        setSelectedAccount(account);
        setActiveTab('transactions');
      }
      setPendingAccountId(null);
    }
  }, [pendingAccountId, setActiveTab]);

  const handleSelectAccount = (account) => {
    setSelectedAccount(account);
    setActiveTab('transactions');
  };

  const tabs = [
    { key: 'accounts', label: 'Bank Accounts' },
    { key: 'transactions', label: `Transactions${selectedAccount ? ` - ${selectedAccount.account_name}` : ''}` },
    { key: 'import', label: 'Import Statement' },
    { key: 'reconciliation', label: 'Reconciliation' },
  ];

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#333]">Banking</h1>
        <p className="text-sm text-[#6B7280] mt-1">
          Manage bank accounts, view transactions, and import statements
        </p>
      </div>

      {/* Balance Summary Bar */}
      {!bankAccountsLoading && bankAccounts.length > 0 && (
        <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-5 mb-4">
          {/* Top row: Amount in Books + Amount in Bank + Last Feed Date */}
          <div className="flex items-start gap-10">
            <div>
              <p className="text-xs text-[#6B7280] font-medium uppercase tracking-wide">Amount in Books</p>
              <p className="text-xl font-bold text-[#333] mt-1">
                {formatIndianCurrency(bankingSummary?.amount_in_books ?? 0)}
              </p>
            </div>
            <div className="w-px h-12 bg-[#E5E7EB]"></div>
            <div>
              <p className="text-xs text-[#6B7280] font-medium uppercase tracking-wide">Amount in Bank</p>
              <p className="text-xl font-bold text-[#333] mt-1">
                {formatIndianCurrency(bankingSummary?.amount_in_bank ?? 0)}
              </p>
            </div>
            <div className="w-px h-12 bg-[#E5E7EB]"></div>
            <div>
              <p className="text-xs text-[#6B7280] font-medium uppercase tracking-wide">Last Feed Date</p>
              <p className="text-base font-semibold text-[#333] mt-1">
                {bankingSummary?.last_feed_date ? formatDate(bankingSummary.last_feed_date) : '--'}
              </p>
            </div>
          </div>
          {/* Bottom row: Per-bank balances */}
          {bankingSummary?.accounts && bankingSummary.accounts.length > 0 && (
            <div className="flex items-center gap-6 mt-4 pt-4 border-t border-[#E5E7EB]">
              {bankingSummary.accounts.map((acct) => (
                <div key={acct.id} className="flex items-center gap-2">
                  <span className="text-xs text-[#6B7280]">{acct.bank_name || acct.account_name}:</span>
                  <span className="text-sm font-semibold text-[#333]">{formatIndianCurrency(acct.book_balance)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm">
        <div className="border-b border-[#E5E7EB]">
          <nav className="flex -mb-px">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-6 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  activeTab === tab.key
                    ? 'border-[#0071DC] text-[#0071DC]'
                    : 'border-transparent text-[#6B7280] hover:text-[#333] hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="p-6">
          {activeTab === 'accounts' && <BankAccountsTab onSelectAccount={handleSelectAccount} onAccountsLoaded={handleAccountsLoaded} />}
          {activeTab === 'transactions' && (
            <TransactionsTab
              selectedAccount={selectedAccount}
              onChangeAccount={setSelectedAccount}
              onBack={() => setActiveTab('accounts')}
            />
          )}
          {activeTab === 'import' && (
            <StatementImport
              selectedAccount={selectedAccount}
              onImportComplete={() => {
                fetchBankAccounts(); // Refresh balance summary bar
                fetchBankingSummary(); // Refresh banking summary (statement balances + last feed date)
                if (selectedAccount) setActiveTab('transactions');
              }}
            />
          )}
          {activeTab === 'reconciliation' && (
            <ReconciliationTab
              selectedAccount={selectedAccount}
              onChangeAccount={setSelectedAccount}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Tab 1: Bank Accounts ─────────────────────────────────────────────── */

function BankAccountsTab({ onSelectAccount, onAccountsLoaded }) {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null); // null = create mode, object = edit mode
  const [formData, setFormData] = useState({
    account_name: '',
    bank_name: '',
    account_number: '',
    account_type: 'Current',
    ifsc: '',
    branch: '',
    opening_balance: '',
  });
  const [formErrors, setFormErrors] = useState({});

  // Three-dot menu state
  const [openMenuId, setOpenMenuId] = useState(null);
  const menuRef = useRef(null);

  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState(null); // account object or null
  const [deleting, setDeleting] = useState(false);

  // Update Balance modal state
  const [updateBalanceAccount, setUpdateBalanceAccount] = useState(null);
  const [newBalance, setNewBalance] = useState('');
  const [balanceNote, setBalanceNote] = useState('');
  const [updatingBalance, setUpdatingBalance] = useState(false);

  // Close three-dot menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenuId(null);
      }
    };
    if (openMenuId !== null) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openMenuId]);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/bank-accounts');
      const data = response.data?.data || [];
      setAccounts(data);
      if (onAccountsLoaded) onAccountsLoaded(data);
    } catch {
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  }, [onAccountsLoaded]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const totalBalance = accounts.reduce(
    (sum, a) => sum + (parseFloat(a.current_balance) || parseFloat(a.opening_balance) || 0), 0
  );

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.account_name.trim()) errors.account_name = 'Account name is required';
    if (!formData.bank_name.trim()) errors.bank_name = 'Bank name is required';
    if (!formData.account_number.trim()) errors.account_number = 'Account number is required';
    if (formData.opening_balance && isNaN(Number(formData.opening_balance)))
      errors.opening_balance = 'Must be a valid number';
    if (formData.ifsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(formData.ifsc))
      errors.ifsc = 'Invalid IFSC code';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const resetForm = () => {
    setFormData({
      account_name: '',
      bank_name: '',
      account_number: '',
      account_type: 'Current',
      ifsc: '',
      branch: '',
      opening_balance: '',
    });
    setEditingAccount(null);
    setFormErrors({});
  };

  const handleEditClick = (account) => {
    setEditingAccount(account);
    setFormData({
      account_name: account.account_name || '',
      bank_name: account.bank_name || '',
      account_number: account.account_number || '',
      account_type: account.account_type || 'Current',
      ifsc: account.ifsc || '',
      branch: account.branch || '',
      opening_balance: account.opening_balance != null ? String(account.opening_balance) : '',
    });
    setFormErrors({});
    setShowForm(true);
    setOpenMenuId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSaving(true);
    try {
      const payload = {
        ...formData,
        opening_balance: formData.opening_balance ? Number(formData.opening_balance) : 0,
        ifsc: formData.ifsc ? formData.ifsc.toUpperCase() : '',
      };

      if (editingAccount) {
        // Edit mode - PUT request
        await apiClient.put(`/bank-accounts/${editingAccount.id}`, payload);
        toast.success('Bank account updated successfully');
      } else {
        // Create mode - POST request
        payload.current_balance = payload.opening_balance;
        await apiClient.post('/bank-accounts', payload);
        toast.success('Bank account added successfully');
      }

      setShowForm(false);
      resetForm();
      fetchAccounts();
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || (editingAccount ? 'Failed to update bank account' : 'Failed to add bank account');
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // Delete handler
  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      const response = await apiClient.delete(`/bank-accounts/${deleteConfirm.id}`);
      const msg = response.data?.message || 'Bank account deleted successfully';
      toast.success(msg);
      setDeleteConfirm(null);
      fetchAccounts();
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Failed to delete bank account';
      toast.error(msg);
    } finally {
      setDeleting(false);
    }
  };

  // Toggle Active/Inactive handler
  const handleToggleActive = async (account) => {
    try {
      const newStatus = account.is_active === false ? true : false;
      await apiClient.put(`/bank-accounts/${account.id}`, {
        is_active: newStatus,
      });
      toast.success(`Account marked as ${newStatus ? 'Active' : 'Inactive'}`);
      fetchAccounts();
    } catch (err) {
      toast.error('Failed to update account status');
    }
  };

  // Update Balance handler
  const handleUpdateBalance = async () => {
    if (!updateBalanceAccount) return;
    if (newBalance === '' || newBalance === null || newBalance === undefined || isNaN(Number(newBalance))) {
      toast.error('Please enter a valid balance amount');
      return;
    }
    setUpdatingBalance(true);
    try {
      await apiClient.put(`/bank-accounts/${updateBalanceAccount.id}`, {
        current_balance: Number(newBalance),
      });
      toast.success('Balance updated successfully');
      setUpdateBalanceAccount(null);
      setNewBalance('');
      setBalanceNote('');
      fetchAccounts();
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Failed to update balance';
      toast.error(msg);
    } finally {
      setUpdatingBalance(false);
    }
  };

  return (
    <div>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <SummaryCard
          title="Total Accounts"
          value={accounts.length.toLocaleString('en-IN')}
          icon={HiOutlineBuildingLibrary}
          color="bg-blue-500"
        />
        <SummaryCard
          title="Total Balance"
          value={formatIndianCurrency(totalBalance)}
          icon={HiOutlineCurrencyRupee}
          color="bg-green-500"
        />
        <SummaryCard
          title="Active Accounts"
          value={accounts.filter((a) => a.is_active !== false).length.toLocaleString('en-IN')}
          icon={HiOutlineCheckCircle}
          color="bg-emerald-500"
        />
      </div>

      {/* Add Account Button */}
      <div className="flex justify-end mb-4">
        <button
          onClick={() => {
            if (showForm) {
              setShowForm(false);
              resetForm();
            } else {
              resetForm();
              setShowForm(true);
            }
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#0071DC] text-white text-sm font-medium rounded-lg hover:bg-[#005BB5] transition-colors"
        >
          {showForm ? (
            <>
              <HiOutlineXMark className="w-4 h-4" />
              Cancel
            </>
          ) : (
            <>
              <HiOutlinePlus className="w-4 h-4" />
              Add New Account
            </>
          )}
        </button>
      </div>

      {/* Inline Add/Edit Account Form */}
      {showForm && (
        <div className="bg-[#F9FAFB] rounded-lg border border-[#E5E7EB] p-6 mb-6">
          <h3 className="text-base font-semibold text-[#333] mb-4">
            {editingAccount ? 'Edit Bank Account' : 'Add New Bank Account'}
          </h3>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    formErrors.account_name ? 'border-red-400 bg-red-50' : 'border-[#E5E7EB]'
                  }`}
                  placeholder="e.g. Main Business Account"
                />
                {formErrors.account_name && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.account_name}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-[#333] mb-1">
                  Bank Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="bank_name"
                  value={formData.bank_name}
                  onChange={handleFormChange}
                  className={`w-full px-3 py-2 border rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC] ${
                    formErrors.bank_name ? 'border-red-400 bg-red-50' : 'border-[#E5E7EB]'
                  }`}
                  placeholder="e.g. HDFC Bank"
                />
                {formErrors.bank_name && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.bank_name}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-[#333] mb-1">
                  Account Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="account_number"
                  value={formData.account_number}
                  onChange={handleFormChange}
                  className={`w-full px-3 py-2 border rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC] ${
                    formErrors.account_number ? 'border-red-400 bg-red-50' : 'border-[#E5E7EB]'
                  }`}
                  placeholder="Account number"
                />
                {formErrors.account_number && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.account_number}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-[#333] mb-1">Account Type</label>
                <select
                  name="account_type"
                  value={formData.account_type}
                  onChange={handleFormChange}
                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] bg-white focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
                >
                  {ACCOUNT_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#333] mb-1">IFSC Code</label>
                <input
                  type="text"
                  name="ifsc"
                  value={formData.ifsc}
                  onChange={handleFormChange}
                  maxLength={11}
                  className={`w-full px-3 py-2 border rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] uppercase focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC] ${
                    formErrors.ifsc ? 'border-red-400 bg-red-50' : 'border-[#E5E7EB]'
                  }`}
                  placeholder="e.g. HDFC0001234"
                />
                {formErrors.ifsc && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.ifsc}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-[#333] mb-1">Branch</label>
                <input
                  type="text"
                  name="branch"
                  value={formData.branch}
                  onChange={handleFormChange}
                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
                  placeholder="Branch name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#333] mb-1">Opening Balance</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#6B7280]">{'\u20B9'}</span>
                  <input
                    type="text"
                    name="opening_balance"
                    value={formData.opening_balance}
                    onChange={handleFormChange}
                    className={`w-full pl-8 pr-3 py-2 border rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC] ${
                      formErrors.opening_balance ? 'border-red-400 bg-red-50' : 'border-[#E5E7EB]'
                    }`}
                    placeholder="0.00"
                  />
                </div>
                {formErrors.opening_balance && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.opening_balance}</p>
                )}
              </div>
              {editingAccount && (
                <div>
                  <label className="block text-sm font-medium text-[#333] mb-1">Current Balance</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#6B7280]">{'\u20B9'}</span>
                    <input
                      type="text"
                      readOnly
                      value={parseFloat(editingAccount.current_balance || editingAccount.opening_balance || 0).toFixed(2)}
                      className="w-full pl-8 pr-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] bg-gray-100 cursor-not-allowed"
                    />
                  </div>
                  <p className="text-xs text-[#9CA3AF] mt-1">Use "Update Balance" to change this value</p>
                </div>
              )}
            </div>
            <div className="flex justify-end mt-4 gap-3">
              <button
                type="button"
                onClick={() => { setShowForm(false); resetForm(); }}
                className="px-4 py-2 text-sm font-medium text-[#333] bg-white border border-[#E5E7EB] rounded-lg hover:bg-[#F9FAFB] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2 bg-[#0071DC] text-white text-sm font-medium rounded-lg hover:bg-[#005BB5] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {saving ? 'Saving...' : editingAccount ? 'Update Account' : 'Add Account'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Account Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-[#0071DC] border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-[#6B7280]">Loading bank accounts...</span>
          </div>
        </div>
      ) : accounts.length === 0 ? (
        <div className="text-center py-16">
          <HiOutlineBuildingLibrary className="w-12 h-12 text-[#D1D5DB] mx-auto mb-3" />
          <p className="text-[#6B7280] font-medium">No bank accounts found</p>
          <p className="text-xs text-[#9CA3AF] mt-1">Add your first bank account to get started</p>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-[#0071DC] text-white text-sm font-medium rounded-lg hover:bg-[#005BB5] transition-colors"
            >
              <HiOutlinePlus className="w-4 h-4" />
              Add Account
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((account) => {
            const balance = parseFloat(account.current_balance) || parseFloat(account.opening_balance) || 0;

            return (
              <div
                key={account.id}
                className="bg-white border border-[#E5E7EB] rounded-lg p-5 hover:border-[#0071DC]/30 hover:shadow-md transition-all cursor-pointer group relative"
              >
                <div className="flex items-start justify-between mb-3">
                  <div
                    className="flex items-center gap-3 flex-1 min-w-0"
                    onClick={() => onSelectAccount(account)}
                  >
                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <HiOutlineBuildingLibrary className="w-5 h-5 text-[#0071DC]" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-[#333] group-hover:text-[#0071DC] transition-colors truncate">
                        {account.account_name}
                      </h3>
                      <p className="text-xs text-[#6B7280]">{account.bank_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      account.is_active !== false
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : 'bg-gray-100 text-gray-600 border border-gray-200'
                    }`}>
                      {account.is_active !== false ? 'Active' : 'Inactive'}
                    </span>
                    {/* Three-dot menu */}
                    <div className="relative" ref={openMenuId === account.id ? menuRef : undefined}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === account.id ? null : account.id);
                        }}
                        className="p-1 rounded-md hover:bg-gray-100 text-[#6B7280] hover:text-[#333] transition-colors"
                        title="More options"
                      >
                        <HiOutlineEllipsisVertical className="w-5 h-5" />
                      </button>
                      {openMenuId === account.id && (
                        <div className="absolute right-0 top-8 z-20 w-44 bg-white rounded-lg shadow-lg border border-[#E5E7EB] py-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditClick(account);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#333] hover:bg-[#F3F4F6] transition-colors"
                          >
                            <HiOutlinePencilSquare className="w-4 h-4 text-[#6B7280]" />
                            Edit
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setUpdateBalanceAccount(account);
                              setNewBalance('');
                              setBalanceNote('');
                              setOpenMenuId(null);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#333] hover:bg-[#F3F4F6] transition-colors"
                          >
                            <HiOutlineAdjustmentsHorizontal className="w-4 h-4 text-[#6B7280]" />
                            Update Balance
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleActive(account);
                              setOpenMenuId(null);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#333] hover:bg-[#F3F4F6] transition-colors"
                          >
                            <HiOutlinePower className={`w-4 h-4 ${account.is_active !== false ? 'text-orange-500' : 'text-green-500'}`} />
                            {account.is_active !== false ? 'Mark Inactive' : 'Mark Active'}
                          </button>
                          <div className="border-t border-[#E5E7EB] my-1" />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirm(account);
                              setOpenMenuId(null);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <HiOutlineTrash className="w-4 h-4" />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2" onClick={() => onSelectAccount(account)}>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#6B7280]">Account No.</span>
                    <span className="text-[#333] font-mono">{maskAccountNumber(account.account_number)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#6B7280]">Current Balance</span>
                    <span className={`font-semibold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatIndianCurrency(balance)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[#E5E7EB]" onClick={() => onSelectAccount(account)}>
                  <div className="flex items-center gap-1.5 text-xs text-[#6B7280]">
                    <HiOutlineBanknotes className="w-3.5 h-3.5" />
                    <span>{account.transaction_count || 0} transactions</span>
                  </div>
                  {(account.unreconciled_count || 0) > 0 && (
                    <div className="flex items-center gap-1.5 text-xs text-orange-600">
                      <HiOutlineExclamationTriangle className="w-3.5 h-3.5" />
                      <span>{account.unreconciled_count} unreconciled</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <HiOutlineExclamationTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-[#333]">Delete Bank Account</h3>
                <p className="text-sm text-[#6B7280]">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-sm text-[#333] mb-1">
              Are you sure you want to delete <strong>{deleteConfirm.account_name}</strong>?
            </p>
            {(deleteConfirm.transaction_count || 0) > 0 && (
              <p className="text-xs text-orange-600 mb-4">
                This account has {deleteConfirm.transaction_count} transaction(s). It will be deactivated instead of deleted.
              </p>
            )}
            {!(deleteConfirm.transaction_count > 0) && (
              <p className="text-xs text-[#6B7280] mb-4">
                This will permanently remove the bank account.
              </p>
            )}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-[#333] bg-white border border-[#E5E7EB] rounded-lg hover:bg-[#F9FAFB] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {deleting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Transaction modal is handled inside TransactionsTab */}

      {/* Update Balance Modal */}
      {updateBalanceAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-[#333]">Update Balance</h3>
              <button
                onClick={() => { setUpdateBalanceAccount(null); setNewBalance(''); setBalanceNote(''); }}
                className="p-1 rounded-md hover:bg-gray-100 text-[#6B7280] hover:text-[#333] transition-colors"
              >
                <HiOutlineXMark className="w-5 h-5" />
              </button>
            </div>
            <div className="mb-4">
              <p className="text-sm text-[#333] font-medium">{updateBalanceAccount.account_name}</p>
              <p className="text-xs text-[#6B7280]">{updateBalanceAccount.bank_name} {updateBalanceAccount.account_number ? `- ${maskAccountNumber(updateBalanceAccount.account_number)}` : ''}</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#333] mb-1">Current Balance (Calculated)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#6B7280]">{'\u20B9'}</span>
                  <input
                    type="text"
                    readOnly
                    value={parseFloat(updateBalanceAccount.current_balance || updateBalanceAccount.opening_balance || 0).toFixed(2)}
                    className="w-full pl-8 pr-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] bg-gray-100 cursor-not-allowed"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#333] mb-1">
                  New Balance <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#6B7280]">{'\u20B9'}</span>
                  <input
                    type="text"
                    value={newBalance}
                    onChange={(e) => setNewBalance(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
                    placeholder="Enter new balance"
                    autoFocus
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#333] mb-1">Note (Reason for adjustment)</label>
                <textarea
                  value={balanceNote}
                  onChange={(e) => setBalanceNote(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC] resize-none"
                  placeholder="e.g. Reconciliation adjustment, bank charges, etc."
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button
                onClick={() => { setUpdateBalanceAccount(null); setNewBalance(''); setBalanceNote(''); }}
                disabled={updatingBalance}
                className="px-4 py-2 text-sm font-medium text-[#333] bg-white border border-[#E5E7EB] rounded-lg hover:bg-[#F9FAFB] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateBalance}
                disabled={updatingBalance || newBalance === '' || newBalance === null || newBalance === undefined}
                className="inline-flex items-center gap-2 px-5 py-2 bg-[#0071DC] text-white text-sm font-medium rounded-lg hover:bg-[#005BB5] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {updatingBalance && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {updatingBalance ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Tab 2: Transactions ──────────────────────────────────────────────── */

function TransactionsTab({ selectedAccount, onChangeAccount, onBack }) {
  const [accounts, setAccounts] = useState([]);
  const [accountId, setAccountId] = useState(selectedAccount?.id || '');
  const [transactions, setTransactions] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [search, setSearch] = useState('');
  const [filterReconciled, setFilterReconciled] = useState('');
  const [categorizationFilter, setCategorizationFilter] = useState('uncategorized');

  // Zoho-style categorize modal state
  const [showCategorizeModal, setShowCategorizeModal] = useState(false);
  const [categorizeTarget, setCategorizeTarget] = useState(null);
  const [catStep, setCatStep] = useState(1); // 1=select category, 2=select detail, 3=confirm
  const [catMainCategory, setCatMainCategory] = useState(null); // selected category object
  const [catSubAccount, setCatSubAccount] = useState('');
  const [catCustomerId, setCatCustomerId] = useState('');
  const [catVendorId, setCatVendorId] = useState('');
  const [catTransferAccountId, setCatTransferAccountId] = useState('');
  const [catSelectedInvoices, setCatSelectedInvoices] = useState([]); // [{id, amount}]
  const [catSelectedBills, setCatSelectedBills] = useState([]); // [{id, amount}]
  const [categorizeSaving, setCategorizeSaving] = useState(false);

  // Bulk categorization state
  const [selectedTxnIds, setSelectedTxnIds] = useState(new Set());
  const [showBulkCategorize, setShowBulkCategorize] = useState(false);

  // Delete & uncategorize state
  const [deleteTxnConfirm, setDeleteTxnConfirm] = useState(null); // txn to delete
  const [deleteTxnLoading, setDeleteTxnLoading] = useState(false);
  const [uncategorizeLoading, setUncategorizeLoading] = useState(null); // txn id

  // Data for categorization
  const [categorizationOptions, setCategorizationOptions] = useState(null);
  const [subAccounts, setSubAccounts] = useState([]);
  const [subAccountsLoading, setSubAccountsLoading] = useState(false);
  const [customersData, setCustomersData] = useState([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [vendorsData, setVendorsData] = useState([]);
  const [vendorsLoading, setVendorsLoading] = useState(false);
  const [bankAccountsList, setBankAccountsList] = useState([]);

  // Search within categorize modal
  const [catSearchText, setCatSearchText] = useState('');

  // Fetch accounts for the selector
  useEffect(() => {
    const fetchAccounts = async () => {
      setAccountsLoading(true);
      try {
        const response = await apiClient.get('/bank-accounts');
        const data = response.data?.data || [];
        setAccounts(data);
        setBankAccountsList(data);
      } catch {
        setAccounts([]);
      } finally {
        setAccountsLoading(false);
      }
    };
    fetchAccounts();
  }, []);

  // Fetch categorization options
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const response = await apiClient.get('/bank-transactions/categorization-options');
        setCategorizationOptions(response.data || null);
      } catch {
        setCategorizationOptions(null);
      }
    };
    fetchOptions();
  }, []);

  // Fetch sub-accounts
  useEffect(() => {
    const fetchSubAccounts = async () => {
      setSubAccountsLoading(true);
      try {
        const response = await apiClient.get('/bank-transactions/sub-accounts');
        setSubAccounts(response.data?.data || []);
      } catch {
        setSubAccounts([]);
      } finally {
        setSubAccountsLoading(false);
      }
    };
    fetchSubAccounts();
  }, []);

  // Auto-select first account if none selected
  useEffect(() => {
    if (!accountId && accounts.length > 0) {
      setAccountId(accounts[0].id);
      onChangeAccount(accounts[0]);
    }
  }, [accounts, accountId, onChangeAccount]);

  // Update account ID when prop changes
  useEffect(() => {
    if (selectedAccount?.id) {
      setAccountId(selectedAccount.id);
    }
  }, [selectedAccount]);

  // Fetch transactions
  const fetchTransactions = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    try {
      const params = {
        bank_account_id: accountId,
        page,
        limit,
        sort_by: 'transaction_date',
        sort_order: 'desc',
      };
      if (search) params.search = search;
      if (filterReconciled === 'true') params.is_reconciled = true;
      if (filterReconciled === 'false') params.is_reconciled = false;
      if (categorizationFilter !== 'all') params.categorization_status = categorizationFilter;
      // 'all' is not a real filter value - send nothing to get all transactions

      const response = await apiClient.get('/bank-transactions', { params });
      setTransactions(response.data?.data || []);
      setTotal(response.data?.total || 0);
    } catch {
      setTransactions([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [accountId, page, limit, search, filterReconciled, categorizationFilter]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleAccountChange = (e) => {
    const id = e.target.value;
    setAccountId(id);
    const acc = accounts.find((a) => String(a.id) === String(id));
    onChangeAccount(acc || null);
    setPage(1);
    setSelectedTxnIds(new Set());
  };

  // Fetch customers when needed
  const fetchCustomers = useCallback(async () => {
    if (customersData.length > 0) return;
    setCustomersLoading(true);
    try {
      const response = await apiClient.get('/bank-transactions/customers-with-invoices');
      setCustomersData(response.data?.data || []);
    } catch {
      setCustomersData([]);
    } finally {
      setCustomersLoading(false);
    }
  }, [customersData.length]);

  // Fetch vendors when needed
  const fetchVendors = useCallback(async () => {
    if (vendorsData.length > 0) return;
    setVendorsLoading(true);
    try {
      const response = await apiClient.get('/bank-transactions/vendors-with-bills');
      setVendorsData(response.data?.data || []);
    } catch {
      setVendorsData([]);
    } finally {
      setVendorsLoading(false);
    }
  }, [vendorsData.length]);

  // Open categorize modal
  const openCategorizeModal = (txn) => {
    setCategorizeTarget(txn);
    setCatStep(1);
    setCatMainCategory(null);
    setCatSubAccount('');
    setCatCustomerId('');
    setCatVendorId('');
    setCatTransferAccountId('');
    setCatSelectedInvoices([]);
    setCatSelectedBills([]);
    setCatSearchText('');
    setShowCategorizeModal(true);
  };

  // Handle category selection in step 1
  const handleCategorySelect = (cat) => {
    setCatMainCategory(cat);
    setCatSearchText('');
    if (cat.type === 'simple') {
      // Simple categories (like payroll) need no extra info - jump to confirm step
      setCatStep(3);
      return;
    }
    if (cat.type === 'customer_link') {
      fetchCustomers();
    } else if (cat.type === 'vendor_link') {
      fetchVendors();
    }
    setCatStep(2);
  };

  // Check if we can skip step 2 (for categories that just need a sub-account, go to confirm)
  const canConfirm = () => {
    if (!catMainCategory) return false;
    const { type } = catMainCategory;
    if (type === 'simple') return true; // payroll and similar simple categories need no extra info
    if (type === 'customer_link') return !!catCustomerId;
    if (type === 'vendor_link') return !!catVendorId;
    if (type === 'sub_account') return !!catSubAccount;
    if (type === 'bank_account') return !!catTransferAccountId;
    return false;
  };

  // Handle categorize submit
  const handleCategorizeSubmit = async () => {
    if (!catMainCategory) {
      toast.error('Please select a category');
      return;
    }
    setCategorizeSaving(true);
    try {
      const payload = { category: catMainCategory.key };

      if (catMainCategory.type === 'sub_account' && catSubAccount) {
        payload.sub_account_id = catSubAccount;
      }
      if (catMainCategory.type === 'customer_link' && catCustomerId) {
        payload.customer_id = catCustomerId;
        if (catSelectedInvoices.length > 0) {
          payload.invoice_ids = catSelectedInvoices.map((inv) => ({
            id: inv.id,
            amount: inv.amount,
          }));
        }
        // Calculate excess and store as advance if needed
        const txnAmt = parseFloat(isDeposit(categorizeTarget) ? categorizeTarget.deposit_amount : categorizeTarget.withdrawal_amount) || 0;
        const allocatedAmt = catSelectedInvoices.reduce((s, i) => s + (i.amount || 0), 0);
        const excessAmt = txnAmt - allocatedAmt;
        if (excessAmt > 0.01) {
          payload.advance_amount = excessAmt;
          payload.store_as_advance = true;
        }
      }
      if (catMainCategory.type === 'vendor_link' && catVendorId) {
        payload.vendor_id = catVendorId;
        if (catSelectedBills.length > 0) {
          payload.bill_ids = catSelectedBills.map((bill) => ({
            id: bill.id,
            amount: bill.amount,
          }));
        }
        // Calculate excess and store as vendor credit if needed
        const txnAmt = parseFloat(isDeposit(categorizeTarget) ? categorizeTarget.deposit_amount : categorizeTarget.withdrawal_amount) || 0;
        const allocatedAmt = catSelectedBills.reduce((s, b) => s + (b.amount || 0), 0);
        const excessAmt = txnAmt - allocatedAmt;
        if (excessAmt > 0.01) {
          payload.advance_amount = excessAmt;
          payload.store_as_advance = true;
        }
      }
      if (catMainCategory.type === 'bank_account' && catTransferAccountId) {
        payload.transfer_account_id = catTransferAccountId;
      }

      const response = await apiClient.put(`/bank-transactions/${categorizeTarget.id}/categorize`, payload);
      const updated = response.data?.data;
      setTransactions((prev) =>
        prev.map((t) =>
          t.id === categorizeTarget.id
            ? {
                ...t,
                ...updated,
                categorization_status: 'categorized',
              }
            : t
        )
      );
      toast.success('Transaction categorized successfully');
      setShowCategorizeModal(false);
      setCategorizeTarget(null);
      // Refresh customers/vendors data to show updated balances
      setCustomersData([]);
      setVendorsData([]);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to categorize transaction');
    } finally {
      setCategorizeSaving(false);
    }
  };

  // Delete a transaction
  const handleDeleteTransaction = async () => {
    if (!deleteTxnConfirm) return;
    setDeleteTxnLoading(true);
    try {
      await apiClient.delete(`/bank-transactions/${deleteTxnConfirm.id}`);
      setTransactions((prev) => prev.filter((t) => t.id !== deleteTxnConfirm.id));
      setTotal((prev) => prev - 1);
      toast.success('Transaction deleted');
      setDeleteTxnConfirm(null);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete transaction');
    } finally {
      setDeleteTxnLoading(false);
    }
  };

  // Uncategorize a transaction
  const handleUncategorize = async (txn) => {
    setUncategorizeLoading(txn.id);
    try {
      const response = await apiClient.put(`/bank-transactions/${txn.id}/uncategorize`);
      const updated = response.data?.data;
      setTransactions((prev) =>
        prev.map((t) => t.id === txn.id ? { ...t, ...updated, categorization_status: 'uncategorized', category: null } : t)
      );
      toast.success('Transaction uncategorized');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to uncategorize');
    } finally {
      setUncategorizeLoading(null);
    }
  };

  const totalPages = Math.ceil(total / limit);
  const startRecord = total === 0 ? 0 : (page - 1) * limit + 1;
  const endRecord = Math.min(page * limit, total);

  // Get display label for a category key
  const getCategoryLabel = (key) => CATEGORY_LABELS[key] || key || '--';
  const getCategoryColor = (key) => CATEGORY_COLORS[key] || 'bg-blue-50 text-blue-700 border-blue-200';

  // Determine if transaction is deposit
  const isDeposit = (txn) => (parseFloat(txn.deposit_amount) || 0) > 0;

  // Filter sub-accounts by allowed types for selected category
  const getFilteredSubAccounts = () => {
    if (!catMainCategory || !catMainCategory.account_types) return subAccounts;
    return subAccounts.filter((sa) => catMainCategory.account_types.includes(sa.account_type));
  };

  // Group sub-accounts by type
  const groupedFilteredSubAccounts = getFilteredSubAccounts().reduce((acc, sa) => {
    const type = sa.account_type || 'Other';
    if (!acc[type]) acc[type] = [];
    acc[type].push(sa);
    return acc;
  }, {});

  // Get categories for the current transaction type
  const getCategories = () => {
    if (!categorizationOptions || !categorizeTarget) return [];
    return isDeposit(categorizeTarget)
      ? categorizationOptions.deposit_categories || []
      : categorizationOptions.withdrawal_categories || [];
  };

  // Filter bank accounts (exclude current transaction's bank account)
  const getOtherBankAccounts = () => {
    return bankAccountsList.filter((a) => String(a.id) !== String(accountId));
  };

  // Get categories for bulk categorization based on selected transactions
  const getBulkCategories = () => {
    if (!categorizationOptions) return [];
    const selectedTxns = transactions.filter((t) => selectedTxnIds.has(t.id));
    const hasDeposits = selectedTxns.some((t) => (parseFloat(t.deposit_amount) || 0) > 0);
    const hasWithdrawals = selectedTxns.some((t) => (parseFloat(t.withdrawal_amount) || 0) > 0);
    // If mixed deposits and withdrawals, show all categories
    if (hasDeposits && hasWithdrawals) {
      const depositCats = categorizationOptions.deposit_categories || [];
      const withdrawalCats = categorizationOptions.withdrawal_categories || [];
      // Merge and dedupe by key
      const seen = new Set();
      const merged = [];
      [...depositCats, ...withdrawalCats].forEach((cat) => {
        if (!seen.has(cat.key)) {
          seen.add(cat.key);
          merged.push(cat);
        }
      });
      return merged;
    }
    if (hasDeposits) return categorizationOptions.deposit_categories || [];
    if (hasWithdrawals) return categorizationOptions.withdrawal_categories || [];
    return [];
  };

  // Compute bulk totals for display
  const getBulkTotals = () => {
    const selectedTxns = transactions.filter((t) => selectedTxnIds.has(t.id));
    let totalDeposit = 0;
    let totalWithdrawal = 0;
    selectedTxns.forEach((t) => {
      totalDeposit += parseFloat(t.deposit_amount) || 0;
      totalWithdrawal += parseFloat(t.withdrawal_amount) || 0;
    });
    return { totalDeposit, totalWithdrawal, count: selectedTxns.length };
  };

  // Open bulk categorize modal
  const openBulkCategorizeModal = () => {
    setCatStep(1);
    setCatMainCategory(null);
    setCatSubAccount('');
    setCatCustomerId('');
    setCatVendorId('');
    setCatTransferAccountId('');
    setCatSelectedInvoices([]);
    setCatSelectedBills([]);
    setCatSearchText('');
    setShowBulkCategorize(true);
  };

  // Handle bulk categorize submit
  const handleBulkCategorizeSubmit = async () => {
    if (!catMainCategory) return;
    setCategorizeSaving(true);
    try {
      const payload = { category: catMainCategory.key };
      if (catMainCategory.type === 'sub_account' && catSubAccount) payload.sub_account_id = catSubAccount;
      if (catMainCategory.type === 'customer_link' && catCustomerId) payload.customer_id = catCustomerId;
      if (catMainCategory.type === 'vendor_link' && catVendorId) payload.vendor_id = catVendorId;
      if (catMainCategory.type === 'bank_account' && catTransferAccountId) payload.transfer_account_id = catTransferAccountId;

      const ids = Array.from(selectedTxnIds);
      let successCount = 0;
      for (const id of ids) {
        try {
          await apiClient.put(`/bank-transactions/${id}/categorize`, payload);
          successCount++;
        } catch (err) {
          // Skip failed ones
        }
      }
      toast.success(`${successCount} of ${ids.length} transaction(s) categorized`);
      setShowBulkCategorize(false);
      setSelectedTxnIds(new Set());
      fetchTransactions();
      setCustomersData([]);
      setVendorsData([]);
    } catch (err) {
      toast.error('Failed to categorize transactions');
    } finally {
      setCategorizeSaving(false);
    }
  };

  // Toggle invoice selection for customer payment
  const toggleInvoice = (invoice) => {
    setCatSelectedInvoices((prev) => {
      const exists = prev.find((i) => i.id === invoice.id);
      if (exists) {
        return prev.filter((i) => i.id !== invoice.id);
      }
      return [...prev, { id: invoice.id, invoice_number: invoice.invoice_number, amount: invoice.amount_due }];
    });
  };

  // Toggle bill selection for vendor payment
  const toggleBill = (bill) => {
    setCatSelectedBills((prev) => {
      const exists = prev.find((b) => b.id === bill.id);
      if (exists) {
        return prev.filter((b) => b.id !== bill.id);
      }
      return [...prev, { id: bill.id, bill_number: bill.bill_number, amount: bill.amount_due }];
    });
  };

  // Update invoice allocation amount
  const updateInvoiceAmount = (invoiceId, amount) => {
    setCatSelectedInvoices((prev) =>
      prev.map((inv) => (inv.id === invoiceId ? { ...inv, amount: parseFloat(amount) || 0 } : inv))
    );
  };

  // Update bill allocation amount
  const updateBillAmount = (billId, amount) => {
    setCatSelectedBills((prev) =>
      prev.map((bill) => (bill.id === billId ? { ...bill, amount: parseFloat(amount) || 0 } : bill))
    );
  };

  // Build categorization detail string for display
  const getCatDetail = (txn) => {
    const parts = [];
    if (txn.customer_name) parts.push(txn.customer_name);
    if (txn.vendor_name) parts.push(txn.vendor_name);
    if (txn.transfer_account_name) parts.push(txn.transfer_account_name);
    if (txn.sub_account_name) parts.push(`${txn.sub_account_code || ''} ${txn.sub_account_name}`.trim());
    return parts.join(' / ') || null;
  };

  return (
    <div>
      {/* Account Selector & Filters */}
      <div className="flex items-end gap-4 mb-6 flex-wrap">
        <div>
          <label className="block text-sm font-medium text-[#333] mb-1">Bank Account</label>
          <select
            value={accountId}
            onChange={handleAccountChange}
            disabled={accountsLoading}
            className="px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] bg-white focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC] min-w-[220px]"
          >
            {accountsLoading ? (
              <option>Loading...</option>
            ) : accounts.length === 0 ? (
              <option value="">No accounts</option>
            ) : (
              accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.account_name} - {a.bank_name}
                </option>
              ))
            )}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-[#333] mb-1">Search</label>
          <div className="relative">
            <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search transactions..."
              className="pl-9 pr-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] bg-white focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC] w-56"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-[#333] mb-1">Status</label>
          <select
            value={filterReconciled}
            onChange={(e) => { setFilterReconciled(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] bg-white focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
          >
            <option value="">All</option>
            <option value="true">Reconciled</option>
            <option value="false">Unreconciled</option>
          </select>
        </div>
        {(search || filterReconciled || categorizationFilter !== 'uncategorized') && (
          <button
            onClick={() => { setSearch(''); setFilterReconciled(''); setCategorizationFilter('uncategorized'); setPage(1); setSelectedTxnIds(new Set()); }}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-[#6B7280] hover:text-[#333] transition-colors"
          >
            <HiOutlineFunnel className="w-4 h-4" />
            Clear Filters
          </button>
        )}
        <button
          onClick={fetchTransactions}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-[#6B7280] hover:text-[#333] border border-[#E5E7EB] rounded-lg hover:bg-[#F9FAFB] transition-colors"
        >
          <HiOutlineArrowPath className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Account Balance Banner */}
      {selectedAccount && (() => {
        const freshAccount = accounts.find((a) => String(a.id) === String(selectedAccount.id)) || selectedAccount;
        return (
          <div className="bg-gradient-to-r from-[#0071DC] to-[#005BB5] rounded-lg p-4 mb-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-100">{freshAccount.account_name}</p>
                <p className="text-xs text-blue-200 mt-0.5">
                  {freshAccount.bank_name} - A/C {maskAccountNumber(freshAccount.account_number)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-blue-200">Current Balance</p>
                <p className="text-2xl font-semibold">
                  {formatIndianCurrency(freshAccount.current_balance || freshAccount.opening_balance)}
                </p>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Categorization Sub-tabs */}
      <div className="flex items-center gap-1 mb-4 bg-[#F9FAFB] rounded-lg p-1 border border-[#E5E7EB] w-fit">
        {[
          { key: 'uncategorized', label: 'Uncategorized' },
          { key: 'categorized', label: 'Categorized' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setCategorizationFilter(tab.key); setPage(1); setSelectedTxnIds(new Set()); }}
            className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${
              categorizationFilter === tab.key
                ? 'bg-white text-[#0071DC] shadow-sm border border-[#E5E7EB]'
                : 'text-[#6B7280] hover:text-[#333]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Bulk Action Bar */}
      {selectedTxnIds.size > 0 && (
        <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 mb-4">
          <div className="flex items-center gap-2">
            <HiOutlineCheckCircle className="w-5 h-5 text-[#0071DC]" />
            <span className="text-sm font-medium text-[#333]">{selectedTxnIds.size} transaction(s) selected</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedTxnIds(new Set())}
              className="px-3 py-1.5 text-xs font-medium text-[#6B7280] bg-white border border-[#E5E7EB] rounded-md hover:bg-[#F9FAFB]"
            >
              Clear Selection
            </button>
            <button
              onClick={openBulkCategorizeModal}
              className="px-3 py-1.5 text-xs font-medium text-white bg-[#0071DC] rounded-md hover:bg-[#005BB5]"
            >
              Bulk Categorize
            </button>
          </div>
        </div>
      )}

      {/* Transactions Table */}
      <div className="overflow-x-auto border border-[#E5E7EB] rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
              <th className="px-3 py-3 w-10">
                <input
                  type="checkbox"
                  checked={selectedTxnIds.size > 0 && transactions.filter(t => t.categorization_status !== 'categorized').every(t => selectedTxnIds.has(t.id))}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedTxnIds(new Set(transactions.filter(t => t.categorization_status !== 'categorized').map(t => t.id)));
                    } else {
                      setSelectedTxnIds(new Set());
                    }
                  }}
                  className="w-4 h-4 text-[#0071DC] border-[#D1D5DB] rounded focus:ring-[#0071DC]/20"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Date</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider min-w-[200px]">Description</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Reference</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Deposit</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Withdrawal</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Balance</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider min-w-[180px]">Category</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-[#6B7280] uppercase tracking-wider w-28">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB]">
            {!accountId ? (
              <tr>
                <td colSpan={9} className="py-16 text-center">
                  <HiOutlineBuildingLibrary className="w-12 h-12 text-[#D1D5DB] mx-auto mb-3" />
                  <p className="text-[#6B7280] font-medium">Select a bank account to view transactions</p>
                </td>
              </tr>
            ) : loading ? (
              <tr>
                <td colSpan={9} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-3 border-[#0071DC] border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm text-[#6B7280]">Loading transactions...</span>
                  </div>
                </td>
              </tr>
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-16 text-center">
                  <HiOutlineBanknotes className="w-12 h-12 text-[#D1D5DB] mx-auto mb-3" />
                  <p className="text-[#6B7280] font-medium">No transactions found</p>
                  <p className="text-xs text-[#9CA3AF] mt-1">
                    {categorizationFilter === 'uncategorized'
                      ? 'All transactions have been categorized'
                      : categorizationFilter === 'categorized'
                      ? 'No categorized transactions yet. Categorize transactions from the Uncategorized tab.'
                      : 'Import a bank statement to add transactions'}
                  </p>
                </td>
              </tr>
            ) : (
              transactions.map((txn) => {
                const deposit = parseFloat(txn.deposit_amount) || 0;
                const withdrawal = parseFloat(txn.withdrawal_amount) || 0;
                const isCategorized = txn.categorization_status === 'categorized';
                const catDetail = getCatDetail(txn);

                return (
                  <tr
                    key={txn.id}
                    className="hover:bg-[#F9FAFB] transition-colors cursor-pointer"
                    onClick={() => openCategorizeModal(txn)}
                  >
                    <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                      {!isCategorized && (
                        <input
                          type="checkbox"
                          checked={selectedTxnIds.has(txn.id)}
                          onChange={(e) => {
                            const newSet = new Set(selectedTxnIds);
                            if (e.target.checked) {
                              newSet.add(txn.id);
                            } else {
                              newSet.delete(txn.id);
                            }
                            setSelectedTxnIds(newSet);
                          }}
                          className="w-4 h-4 text-[#0071DC] border-[#D1D5DB] rounded focus:ring-[#0071DC]/20"
                        />
                      )}
                    </td>
                    <td className="px-4 py-3 text-[#333] whitespace-nowrap">{formatDate(txn.transaction_date)}</td>
                    <td className="px-4 py-3">
                      <span className="text-[#333] text-sm">{txn.description || '--'}</span>
                    </td>
                    <td className="px-4 py-3 text-[#6B7280] font-mono text-xs">{txn.reference_number || '--'}</td>
                    <td className="px-4 py-3 text-right">
                      {deposit > 0 ? (
                        <span className="text-green-600 font-medium">{formatIndianCurrency(deposit)}</span>
                      ) : (
                        <span className="text-[#9CA3AF]">--</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {withdrawal > 0 ? (
                        <span className="text-red-600 font-medium">{formatIndianCurrency(withdrawal)}</span>
                      ) : (
                        <span className="text-[#9CA3AF]">--</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-[#333]">
                      {txn.balance != null ? formatIndianCurrency(txn.balance) : '--'}
                    </td>
                    <td className="px-4 py-3">
                      {isCategorized ? (
                        <div>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${getCategoryColor(txn.category)}`}>
                            <HiOutlineTag className="w-3 h-3" />
                            {getCategoryLabel(txn.category)}
                          </span>
                          {catDetail && (
                            <p className="text-[10px] text-[#6B7280] mt-0.5 truncate max-w-[180px]" title={catDetail}>
                              {catDetail}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-gray-50 text-gray-500 border border-gray-200">
                          Uncategorized
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1">
                        {!isCategorized ? (
                          <button
                            onClick={() => openCategorizeModal(txn)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-[#0071DC] bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
                          >
                            <HiOutlineTag className="w-3.5 h-3.5" />
                            Categorize
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => openCategorizeModal(txn)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-[#6B7280] bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100 transition-colors"
                              title="Edit categorization"
                            >
                              <HiOutlinePencilSquare className="w-3.5 h-3.5" />
                              Edit
                            </button>
                            {!txn.is_reconciled && (
                              <button
                                onClick={() => handleUncategorize(txn)}
                                disabled={uncategorizeLoading === txn.id}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-orange-600 bg-orange-50 border border-orange-200 rounded-md hover:bg-orange-100 transition-colors disabled:opacity-50"
                                title="Move back to uncategorized"
                              >
                                <HiOutlineXMark className="w-3.5 h-3.5" />
                                Undo
                              </button>
                            )}
                          </>
                        )}
                        {!txn.is_reconciled && (
                          <button
                            onClick={() => setDeleteTxnConfirm(txn)}
                            className="inline-flex items-center px-1.5 py-1 text-xs font-medium text-red-500 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-colors"
                            title="Delete transaction"
                          >
                            <HiOutlineTrash className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!loading && total > 0 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-[#6B7280]">
            Showing <span className="font-medium text-[#333]">{startRecord}</span> to{' '}
            <span className="font-medium text-[#333]">{endRecord}</span> of{' '}
            <span className="font-medium text-[#333]">{total}</span> transactions
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border border-[#E5E7EB] rounded-lg hover:bg-[#F9FAFB] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <HiOutlineChevronLeft className="w-4 h-4" />
              Previous
            </button>
            <span className="text-sm text-[#6B7280]">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border border-[#E5E7EB] rounded-lg hover:bg-[#F9FAFB] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
              <HiOutlineChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ─── Zoho-Style Categorize Modal ─── */}
      {showCategorizeModal && categorizeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB] flex-shrink-0">
              <div className="flex items-center gap-3">
                {catStep > 1 && (
                  <button
                    onClick={() => {
                      if (catStep === 3) setCatStep(2);
                      else { setCatStep(1); setCatMainCategory(null); setCatSearchText(''); }
                    }}
                    className="p-1 text-[#6B7280] hover:text-[#333] hover:bg-[#F3F4F6] rounded-md transition-colors"
                  >
                    <HiOutlineChevronLeft className="w-5 h-5" />
                  </button>
                )}
                <div>
                  <h3 className="text-base font-semibold text-[#333]">
                    {catStep === 1 && 'Categorize Transaction'}
                    {catStep === 2 && catMainCategory && getCategoryLabel(catMainCategory.key)}
                    {catStep === 3 && 'Confirm Categorization'}
                  </h3>
                  <p className="text-xs text-[#6B7280] mt-0.5">
                    {formatDate(categorizeTarget.transaction_date)} &mdash; {categorizeTarget.description || 'No description'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setShowCategorizeModal(false); setCategorizeTarget(null); }}
                className="p-1.5 text-[#6B7280] hover:text-[#333] hover:bg-[#F9FAFB] rounded-lg transition-colors"
              >
                <HiOutlineXMark className="w-5 h-5" />
              </button>
            </div>

            {/* Transaction Amount Bar */}
            <div className="px-6 py-3 bg-[#F9FAFB] border-b border-[#E5E7EB] flex items-center justify-between flex-shrink-0">
              <div className="text-sm text-[#6B7280]">Transaction Amount</div>
              <div className="text-sm font-semibold">
                {isDeposit(categorizeTarget) ? (
                  <span className="text-green-600">+ {formatIndianCurrency(categorizeTarget.deposit_amount)}</span>
                ) : (
                  <span className="text-red-600">- {formatIndianCurrency(categorizeTarget.withdrawal_amount)}</span>
                )}
              </div>
            </div>

            {/* Step indicators */}
            <div className="px-6 py-2 border-b border-[#E5E7EB] flex items-center gap-2 flex-shrink-0">
              {[1, 2, 3].map((s) => (
                <React.Fragment key={s}>
                  <div className={`flex items-center gap-1.5 ${catStep >= s ? 'text-[#0071DC]' : 'text-[#9CA3AF]'}`}>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      catStep > s ? 'bg-[#0071DC] text-white' : catStep === s ? 'bg-[#0071DC] text-white' : 'bg-[#E5E7EB] text-[#9CA3AF]'
                    }`}>
                      {catStep > s ? '\u2713' : s}
                    </div>
                    <span className="text-xs font-medium">
                      {s === 1 && 'Category'}
                      {s === 2 && 'Details'}
                      {s === 3 && 'Confirm'}
                    </span>
                  </div>
                  {s < 3 && <div className={`flex-1 h-px ${catStep > s ? 'bg-[#0071DC]' : 'bg-[#E5E7EB]'}`} />}
                </React.Fragment>
              ))}
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {/* STEP 1: Select Main Category */}
              {catStep === 1 && (
                <div className="space-y-1">
                  <p className="text-xs text-[#6B7280] mb-3 font-medium uppercase tracking-wide">
                    {isDeposit(categorizeTarget) ? 'Deposit Categories (Money In)' : 'Withdrawal Categories (Money Out)'}
                  </p>
                  {getCategories().map((cat) => (
                    <button
                      key={cat.key}
                      onClick={() => handleCategorySelect(cat)}
                      className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-[#E5E7EB] hover:border-[#0071DC]/40 hover:bg-blue-50/50 transition-all text-left group"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getCategoryColor(cat.key).split(' ')[0]} ${getCategoryColor(cat.key).split(' ')[1]}`}>
                          <HiOutlineTag className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#333] group-hover:text-[#0071DC]">{cat.label}</p>
                          <p className="text-[10px] text-[#9CA3AF]">
                            {cat.type === 'customer_link' && 'Match with customer invoices'}
                            {cat.type === 'vendor_link' && 'Match with vendor bills'}
                            {cat.type === 'sub_account' && `Map to ${(cat.account_types || []).join(', ')} account`}
                            {cat.type === 'bank_account' && 'Transfer between bank accounts'}
                          </p>
                        </div>
                      </div>
                      <HiOutlineChevronRight className="w-4 h-4 text-[#9CA3AF] group-hover:text-[#0071DC]" />
                    </button>
                  ))}
                </div>
              )}

              {/* STEP 2: Select Detail Based on Category Type */}
              {catStep === 2 && catMainCategory && (
                <div>
                  {/* --- Customer Link --- */}
                  {catMainCategory.type === 'customer_link' && (
                    <div>
                      {!catCustomerId ? (
                        <>
                          <p className="text-xs text-[#6B7280] mb-3 font-medium uppercase tracking-wide">Select Customer</p>
                          <div className="relative mb-3">
                            <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
                            <input
                              type="text"
                              value={catSearchText}
                              onChange={(e) => setCatSearchText(e.target.value)}
                              placeholder="Search customers..."
                              className="w-full pl-9 pr-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
                            />
                          </div>
                          {customersLoading ? (
                            <div className="flex items-center justify-center py-8">
                              <div className="w-6 h-6 border-2 border-[#0071DC] border-t-transparent rounded-full animate-spin" />
                              <span className="ml-2 text-sm text-[#6B7280]">Loading customers...</span>
                            </div>
                          ) : (
                            <div className="space-y-1 max-h-[300px] overflow-y-auto">
                              {customersData
                                .filter((c) => !catSearchText || c.name.toLowerCase().includes(catSearchText.toLowerCase()))
                                .map((customer) => (
                                  <button
                                    key={customer.id}
                                    onClick={() => { setCatCustomerId(customer.id); setCatSearchText(''); }}
                                    className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-[#E5E7EB] hover:border-[#0071DC]/40 hover:bg-blue-50/50 transition-all text-left"
                                  >
                                    <div>
                                      <p className="text-sm font-medium text-[#333]">{customer.name}</p>
                                      <p className="text-[10px] text-[#9CA3AF]">
                                        {customer.outstanding_invoices.length} outstanding invoice(s)
                                        {customer.total_outstanding > 0 && ` - ${formatIndianCurrency(customer.total_outstanding)}`}
                                      </p>
                                    </div>
                                    <HiOutlineChevronRight className="w-4 h-4 text-[#9CA3AF]" />
                                  </button>
                                ))}
                              {customersData.filter((c) => !catSearchText || c.name.toLowerCase().includes(catSearchText.toLowerCase())).length === 0 && (
                                <p className="text-sm text-[#9CA3AF] text-center py-4">No customers found</p>
                              )}
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          {/* Customer selected - show invoices */}
                          {(() => {
                            const customer = customersData.find((c) => c.id === catCustomerId);
                            if (!customer) return null;
                            return (
                              <div>
                                <div className="flex items-center justify-between mb-3">
                                  <div>
                                    <p className="text-sm font-semibold text-[#333]">{customer.name}</p>
                                    <p className="text-xs text-[#6B7280]">Select invoices to match this payment against</p>
                                  </div>
                                  <button
                                    onClick={() => { setCatCustomerId(''); setCatSelectedInvoices([]); }}
                                    className="text-xs text-[#0071DC] hover:underline"
                                  >
                                    Change Customer
                                  </button>
                                </div>
                                {customer.outstanding_invoices.length === 0 ? (
                                  <p className="text-sm text-[#9CA3AF] text-center py-4">No outstanding invoices for this customer</p>
                                ) : (
                                  <div className="space-y-2">
                                    {customer.outstanding_invoices.map((inv) => {
                                      const isSelected = catSelectedInvoices.some((i) => i.id === inv.id);
                                      const selectedInv = catSelectedInvoices.find((i) => i.id === inv.id);
                                      return (
                                        <div
                                          key={inv.id}
                                          className={`rounded-lg border p-3 transition-all ${
                                            isSelected ? 'border-[#0071DC] bg-blue-50/50' : 'border-[#E5E7EB] hover:border-[#0071DC]/30'
                                          }`}
                                        >
                                          <div className="flex items-center gap-3">
                                            <input
                                              type="checkbox"
                                              checked={isSelected}
                                              onChange={() => toggleInvoice(inv)}
                                              className="w-4 h-4 text-[#0071DC] border-[#D1D5DB] rounded focus:ring-[#0071DC]/20"
                                            />
                                            <div className="flex-1">
                                              <div className="flex items-center justify-between">
                                                <span className="text-sm font-medium text-[#333]">{inv.invoice_number}</span>
                                                <span className="text-sm font-semibold text-[#333]">{formatIndianCurrency(inv.amount_due)}</span>
                                              </div>
                                              <div className="flex items-center justify-between mt-0.5">
                                                <span className="text-[10px] text-[#9CA3AF]">{formatDate(inv.date)}</span>
                                                <span className="text-[10px] text-[#9CA3AF]">Total: {formatIndianCurrency(inv.total_amount)}</span>
                                              </div>
                                            </div>
                                          </div>
                                          {isSelected && (
                                            <div className="mt-2 ml-7">
                                              <label className="text-[10px] text-[#6B7280] font-medium">Amount to Apply</label>
                                              <div className="relative mt-0.5">
                                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-[#6B7280]">{'\u20B9'}</span>
                                                <input
                                                  type="number"
                                                  value={selectedInv?.amount || ''}
                                                  onChange={(e) => updateInvoiceAmount(inv.id, e.target.value)}
                                                  max={inv.amount_due}
                                                  step="0.01"
                                                  className="w-40 pl-6 pr-2 py-1 border border-[#E5E7EB] rounded text-xs text-[#333] focus:outline-none focus:ring-1 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
                                                />
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </>
                      )}
                    </div>
                  )}

                  {/* --- Vendor Link --- */}
                  {catMainCategory.type === 'vendor_link' && (
                    <div>
                      {!catVendorId ? (
                        <>
                          <p className="text-xs text-[#6B7280] mb-3 font-medium uppercase tracking-wide">Select Vendor</p>
                          <div className="relative mb-3">
                            <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
                            <input
                              type="text"
                              value={catSearchText}
                              onChange={(e) => setCatSearchText(e.target.value)}
                              placeholder="Search vendors..."
                              className="w-full pl-9 pr-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
                            />
                          </div>
                          {vendorsLoading ? (
                            <div className="flex items-center justify-center py-8">
                              <div className="w-6 h-6 border-2 border-[#0071DC] border-t-transparent rounded-full animate-spin" />
                              <span className="ml-2 text-sm text-[#6B7280]">Loading vendors...</span>
                            </div>
                          ) : (
                            <div className="space-y-1 max-h-[300px] overflow-y-auto">
                              {vendorsData
                                .filter((v) => !catSearchText || v.name.toLowerCase().includes(catSearchText.toLowerCase()))
                                .map((vendor) => (
                                  <button
                                    key={vendor.id}
                                    onClick={() => { setCatVendorId(vendor.id); setCatSearchText(''); }}
                                    className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-[#E5E7EB] hover:border-[#0071DC]/40 hover:bg-blue-50/50 transition-all text-left"
                                  >
                                    <div>
                                      <p className="text-sm font-medium text-[#333]">{vendor.name}</p>
                                      <p className="text-[10px] text-[#9CA3AF]">
                                        {vendor.outstanding_bills.length} outstanding bill(s)
                                        {vendor.total_outstanding > 0 && ` - ${formatIndianCurrency(vendor.total_outstanding)}`}
                                      </p>
                                    </div>
                                    <HiOutlineChevronRight className="w-4 h-4 text-[#9CA3AF]" />
                                  </button>
                                ))}
                              {vendorsData.filter((v) => !catSearchText || v.name.toLowerCase().includes(catSearchText.toLowerCase())).length === 0 && (
                                <p className="text-sm text-[#9CA3AF] text-center py-4">No vendors found</p>
                              )}
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          {/* Vendor selected - show bills */}
                          {(() => {
                            const vendor = vendorsData.find((v) => v.id === catVendorId);
                            if (!vendor) return null;
                            return (
                              <div>
                                <div className="flex items-center justify-between mb-3">
                                  <div>
                                    <p className="text-sm font-semibold text-[#333]">{vendor.name}</p>
                                    <p className="text-xs text-[#6B7280]">Select bills to match this payment against</p>
                                  </div>
                                  <button
                                    onClick={() => { setCatVendorId(''); setCatSelectedBills([]); }}
                                    className="text-xs text-[#0071DC] hover:underline"
                                  >
                                    Change Vendor
                                  </button>
                                </div>
                                {vendor.outstanding_bills.length === 0 ? (
                                  <p className="text-sm text-[#9CA3AF] text-center py-4">No outstanding bills for this vendor</p>
                                ) : (
                                  <div className="space-y-2">
                                    {vendor.outstanding_bills.map((bill) => {
                                      const isSelected = catSelectedBills.some((b) => b.id === bill.id);
                                      const selectedBill = catSelectedBills.find((b) => b.id === bill.id);
                                      return (
                                        <div
                                          key={bill.id}
                                          className={`rounded-lg border p-3 transition-all ${
                                            isSelected ? 'border-[#0071DC] bg-blue-50/50' : 'border-[#E5E7EB] hover:border-[#0071DC]/30'
                                          }`}
                                        >
                                          <div className="flex items-center gap-3">
                                            <input
                                              type="checkbox"
                                              checked={isSelected}
                                              onChange={() => toggleBill(bill)}
                                              className="w-4 h-4 text-[#0071DC] border-[#D1D5DB] rounded focus:ring-[#0071DC]/20"
                                            />
                                            <div className="flex-1">
                                              <div className="flex items-center justify-between">
                                                <span className="text-sm font-medium text-[#333]">{bill.bill_number}</span>
                                                <span className="text-sm font-semibold text-[#333]">{formatIndianCurrency(bill.amount_due)}</span>
                                              </div>
                                              <div className="flex items-center justify-between mt-0.5">
                                                <span className="text-[10px] text-[#9CA3AF]">{formatDate(bill.date)}</span>
                                                <span className="text-[10px] text-[#9CA3AF]">Total: {formatIndianCurrency(bill.total_amount)}</span>
                                              </div>
                                            </div>
                                          </div>
                                          {isSelected && (
                                            <div className="mt-2 ml-7">
                                              <label className="text-[10px] text-[#6B7280] font-medium">Amount to Apply</label>
                                              <div className="relative mt-0.5">
                                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-[#6B7280]">{'\u20B9'}</span>
                                                <input
                                                  type="number"
                                                  value={selectedBill?.amount || ''}
                                                  onChange={(e) => updateBillAmount(bill.id, e.target.value)}
                                                  max={bill.amount_due}
                                                  step="0.01"
                                                  className="w-40 pl-6 pr-2 py-1 border border-[#E5E7EB] rounded text-xs text-[#333] focus:outline-none focus:ring-1 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
                                                />
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </>
                      )}
                    </div>
                  )}

                  {/* --- Sub-Account Selection --- */}
                  {catMainCategory.type === 'sub_account' && (
                    <div>
                      <p className="text-xs text-[#6B7280] mb-3 font-medium uppercase tracking-wide">
                        Select Account ({(catMainCategory.account_types || []).join(', ')})
                      </p>
                      {subAccountsLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="w-6 h-6 border-2 border-[#0071DC] border-t-transparent rounded-full animate-spin" />
                          <span className="ml-2 text-sm text-[#6B7280]">Loading accounts...</span>
                        </div>
                      ) : (
                        <div>
                          <div className="relative mb-3">
                            <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
                            <input
                              type="text"
                              value={catSearchText}
                              onChange={(e) => setCatSearchText(e.target.value)}
                              placeholder="Search accounts..."
                              className="w-full pl-9 pr-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
                            />
                          </div>
                          <div className="space-y-2 max-h-[300px] overflow-y-auto">
                            {Object.entries(groupedFilteredSubAccounts).map(([type, accts]) => {
                              const filtered = accts.filter(
                                (sa) => !catSearchText || sa.account_name.toLowerCase().includes(catSearchText.toLowerCase()) || (sa.account_code || '').toLowerCase().includes(catSearchText.toLowerCase())
                              );
                              if (filtered.length === 0) return null;
                              return (
                                <div key={type}>
                                  <p className="text-[10px] text-[#9CA3AF] font-semibold uppercase tracking-wider px-1 mb-1">{type}</p>
                                  {filtered.map((sa) => (
                                    <button
                                      key={sa.id}
                                      onClick={() => setCatSubAccount(sa.id)}
                                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border transition-all text-left mb-1 ${
                                        catSubAccount === sa.id
                                          ? 'border-[#0071DC] bg-blue-50'
                                          : 'border-[#E5E7EB] hover:border-[#0071DC]/30 hover:bg-blue-50/30'
                                      }`}
                                    >
                                      <div>
                                        <span className="text-sm text-[#333]">{sa.account_code} - {sa.account_name}</span>
                                      </div>
                                      {catSubAccount === sa.id && (
                                        <HiOutlineCheckCircle className="w-4 h-4 text-[#0071DC]" />
                                      )}
                                    </button>
                                  ))}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* --- Bank Account Transfer --- */}
                  {catMainCategory.type === 'bank_account' && (
                    <div>
                      <p className="text-xs text-[#6B7280] mb-3 font-medium uppercase tracking-wide">
                        Select {catMainCategory.key === 'transfer_from' ? 'Source' : 'Destination'} Bank Account
                      </p>
                      <div className="space-y-1">
                        {getOtherBankAccounts().map((ba) => (
                          <button
                            key={ba.id}
                            onClick={() => setCatTransferAccountId(ba.id)}
                            className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-all text-left ${
                              catTransferAccountId === ba.id
                                ? 'border-[#0071DC] bg-blue-50'
                                : 'border-[#E5E7EB] hover:border-[#0071DC]/30 hover:bg-blue-50/30'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                                <HiOutlineBuildingLibrary className="w-4 h-4 text-[#0071DC]" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-[#333]">{ba.account_name}</p>
                                <p className="text-[10px] text-[#9CA3AF]">{ba.bank_name} - {maskAccountNumber(ba.account_number)}</p>
                              </div>
                            </div>
                            {catTransferAccountId === ba.id && (
                              <HiOutlineCheckCircle className="w-5 h-5 text-[#0071DC]" />
                            )}
                          </button>
                        ))}
                        {getOtherBankAccounts().length === 0 && (
                          <p className="text-sm text-[#9CA3AF] text-center py-4">No other bank accounts available</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 3: Confirmation */}
              {catStep === 3 && (() => {
                const txnAmt = parseFloat(isDeposit(categorizeTarget) ? categorizeTarget.deposit_amount : categorizeTarget.withdrawal_amount) || 0;
                const allocatedAmt = catSelectedInvoices.reduce((s, i) => s + (i.amount || 0), 0) + catSelectedBills.reduce((s, b) => s + (b.amount || 0), 0);
                const excessAmt = Math.max(0, txnAmt - allocatedAmt);
                const hasExcess = excessAmt > 0.01 && (catMainCategory?.type === 'customer_link' || catMainCategory?.type === 'vendor_link');
                const isFullAdvance = allocatedAmt === 0 && (catMainCategory?.type === 'customer_link' || catMainCategory?.type === 'vendor_link');
                return (
                <div className="space-y-4">
                  {hasExcess && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <span className="text-amber-500 font-bold">⚠</span>
                        <div>
                          <p className="text-sm font-semibold text-amber-800">Excess payment: {formatIndianCurrency(excessAmt)}</p>
                          <p className="text-xs text-amber-700 mt-0.5">
                            {formatIndianCurrency(allocatedAmt)} applied to {catMainCategory?.type === 'customer_link' ? 'invoices' : 'bills'}. Remaining <strong>{formatIndianCurrency(excessAmt)}</strong> will be stored as {catMainCategory?.type === 'customer_link' ? 'customer advance' : 'vendor credit'}.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  {isFullAdvance && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-xs text-blue-700">
                        No {catMainCategory?.type === 'customer_link' ? 'invoices' : 'bills'} selected — full <strong>{formatIndianCurrency(txnAmt)}</strong> will be stored as {catMainCategory?.type === 'customer_link' ? 'customer advance' : 'vendor credit'}.
                      </p>
                    </div>
                  )}
                  <div className="bg-[#F9FAFB] rounded-lg p-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-[#6B7280]">Category</span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${getCategoryColor(catMainCategory?.key)}`}>
                        {getCategoryLabel(catMainCategory?.key)}
                      </span>
                    </div>
                    {catMainCategory?.type === 'customer_link' && catCustomerId && (
                      <div className="flex justify-between">
                        <span className="text-sm text-[#6B7280]">Customer</span>
                        <span className="text-sm font-medium text-[#333]">
                          {customersData.find((c) => c.id === catCustomerId)?.name || '--'}
                        </span>
                      </div>
                    )}
                    {catMainCategory?.type === 'vendor_link' && catVendorId && (
                      <div className="flex justify-between">
                        <span className="text-sm text-[#6B7280]">Vendor</span>
                        <span className="text-sm font-medium text-[#333]">
                          {vendorsData.find((v) => v.id === catVendorId)?.name || '--'}
                        </span>
                      </div>
                    )}
                    {catMainCategory?.type === 'sub_account' && catSubAccount && (
                      <div className="flex justify-between">
                        <span className="text-sm text-[#6B7280]">Account</span>
                        <span className="text-sm font-medium text-[#333]">
                          {(() => {
                            const sa = subAccounts.find((s) => s.id === catSubAccount);
                            return sa ? `${sa.account_code} - ${sa.account_name}` : '--';
                          })()}
                        </span>
                      </div>
                    )}
                    {catMainCategory?.type === 'bank_account' && catTransferAccountId && (
                      <div className="flex justify-between">
                        <span className="text-sm text-[#6B7280]">Transfer Account</span>
                        <span className="text-sm font-medium text-[#333]">
                          {bankAccountsList.find((a) => a.id === catTransferAccountId)?.account_name || '--'}
                        </span>
                      </div>
                    )}
                    {catSelectedInvoices.length > 0 && (
                      <div>
                        <span className="text-sm text-[#6B7280]">Matched Invoices</span>
                        <div className="mt-1 space-y-1">
                          {catSelectedInvoices.map((inv) => (
                            <div key={inv.id} className="flex justify-between text-xs bg-white rounded px-2 py-1.5 border border-[#E5E7EB]">
                              <span className="text-[#333]">{inv.invoice_number}</span>
                              <span className="font-medium text-[#333]">{formatIndianCurrency(inv.amount)}</span>
                            </div>
                          ))}
                          <div className="flex justify-between text-xs font-semibold pt-1 border-t border-[#E5E7EB]">
                            <span className="text-[#333]">Total Applied</span>
                            <span className="text-[#0071DC]">{formatIndianCurrency(catSelectedInvoices.reduce((s, i) => s + (i.amount || 0), 0))}</span>
                          </div>
                        </div>
                      </div>
                    )}
                    {catSelectedBills.length > 0 && (
                      <div>
                        <span className="text-sm text-[#6B7280]">Matched Bills</span>
                        <div className="mt-1 space-y-1">
                          {catSelectedBills.map((bill) => (
                            <div key={bill.id} className="flex justify-between text-xs bg-white rounded px-2 py-1.5 border border-[#E5E7EB]">
                              <span className="text-[#333]">{bill.bill_number}</span>
                              <span className="font-medium text-[#333]">{formatIndianCurrency(bill.amount)}</span>
                            </div>
                          ))}
                          <div className="flex justify-between text-xs font-semibold pt-1 border-t border-[#E5E7EB]">
                            <span className="text-[#333]">Total Applied</span>
                            <span className="text-[#0071DC]">{formatIndianCurrency(catSelectedBills.reduce((s, b) => s + (b.amount || 0), 0))}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-between items-center gap-3 px-6 py-4 border-t border-[#E5E7EB] bg-[#F9FAFB] rounded-b-xl flex-shrink-0">
              <button
                onClick={() => { setShowCategorizeModal(false); setCategorizeTarget(null); }}
                className="px-4 py-2 text-sm font-medium text-[#333] bg-white border border-[#E5E7EB] rounded-lg hover:bg-[#F9FAFB] transition-colors"
              >
                Cancel
              </button>
              <div className="flex gap-2">
                {catStep === 2 && canConfirm() && (
                  <button
                    onClick={() => setCatStep(3)}
                    className="inline-flex items-center gap-1 px-4 py-2 text-sm font-medium text-[#0071DC] bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    Review
                    <HiOutlineChevronRight className="w-4 h-4" />
                  </button>
                )}
                {catStep === 3 && (
                  <button
                    onClick={handleCategorizeSubmit}
                    disabled={categorizeSaving}
                    className="inline-flex items-center gap-2 px-5 py-2 bg-[#0071DC] text-white text-sm font-medium rounded-lg hover:bg-[#005BB5] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {categorizeSaving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                    {categorizeSaving ? 'Saving...' : 'Save Categorization'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Bulk Categorize Modal ─── */}
      {showBulkCategorize && selectedTxnIds.size > 0 && (() => {
        const bulkTotals = getBulkTotals();
        const bulkCategories = getBulkCategories();
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col">
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB] flex-shrink-0">
                <div className="flex items-center gap-3">
                  {catStep > 1 && (
                    <button
                      onClick={() => {
                        if (catStep === 3) setCatStep(2);
                        else { setCatStep(1); setCatMainCategory(null); setCatSearchText(''); }
                      }}
                      className="p-1 text-[#6B7280] hover:text-[#333] hover:bg-[#F3F4F6] rounded-md transition-colors"
                    >
                      <HiOutlineChevronLeft className="w-5 h-5" />
                    </button>
                  )}
                  <div>
                    <h3 className="text-base font-semibold text-[#333]">
                      {catStep === 1 && `Bulk Categorize ${bulkTotals.count} Transactions`}
                      {catStep === 2 && catMainCategory && getCategoryLabel(catMainCategory.key)}
                      {catStep === 3 && `Confirm Bulk Categorization (${bulkTotals.count} Transactions)`}
                    </h3>
                    <p className="text-xs text-[#6B7280] mt-0.5">
                      Apply the same category to all selected transactions
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowBulkCategorize(false)}
                  className="p-1.5 text-[#6B7280] hover:text-[#333] hover:bg-[#F9FAFB] rounded-lg transition-colors"
                >
                  <HiOutlineXMark className="w-5 h-5" />
                </button>
              </div>

              {/* Bulk Totals Bar */}
              <div className="px-6 py-3 bg-[#F9FAFB] border-b border-[#E5E7EB] flex items-center justify-between flex-shrink-0">
                <div className="text-sm text-[#6B7280]">{bulkTotals.count} transaction(s) selected</div>
                <div className="flex items-center gap-4 text-sm font-semibold">
                  {bulkTotals.totalDeposit > 0 && (
                    <span className="text-green-600">Deposits: {formatIndianCurrency(bulkTotals.totalDeposit)}</span>
                  )}
                  {bulkTotals.totalWithdrawal > 0 && (
                    <span className="text-red-600">Withdrawals: {formatIndianCurrency(bulkTotals.totalWithdrawal)}</span>
                  )}
                </div>
              </div>

              {/* Step indicators */}
              <div className="px-6 py-2 border-b border-[#E5E7EB] flex items-center gap-2 flex-shrink-0">
                {[1, 2, 3].map((s) => (
                  <React.Fragment key={s}>
                    <div className={`flex items-center gap-1.5 ${catStep >= s ? 'text-[#0071DC]' : 'text-[#9CA3AF]'}`}>
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        catStep > s ? 'bg-[#0071DC] text-white' : catStep === s ? 'bg-[#0071DC] text-white' : 'bg-[#E5E7EB] text-[#9CA3AF]'
                      }`}>
                        {catStep > s ? '\u2713' : s}
                      </div>
                      <span className="text-xs font-medium">
                        {s === 1 && 'Category'}
                        {s === 2 && 'Details'}
                        {s === 3 && 'Confirm'}
                      </span>
                    </div>
                    {s < 3 && <div className={`flex-1 h-px ${catStep > s ? 'bg-[#0071DC]' : 'bg-[#E5E7EB]'}`} />}
                  </React.Fragment>
                ))}
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto px-6 py-4">
                {/* STEP 1: Select Main Category */}
                {catStep === 1 && (
                  <div className="space-y-1">
                    <p className="text-xs text-[#6B7280] mb-3 font-medium uppercase tracking-wide">
                      Select Category for All Selected Transactions
                    </p>
                    {bulkCategories.map((cat) => (
                      <button
                        key={cat.key}
                        onClick={() => {
                          setCatMainCategory(cat);
                          setCatSearchText('');
                          if (cat.type === 'customer_link') fetchCustomers();
                          else if (cat.type === 'vendor_link') fetchVendors();
                          setCatStep(2);
                        }}
                        className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-[#E5E7EB] hover:border-[#0071DC]/40 hover:bg-blue-50/50 transition-all text-left group"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getCategoryColor(cat.key).split(' ')[0]} ${getCategoryColor(cat.key).split(' ')[1]}`}>
                            <HiOutlineTag className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-[#333] group-hover:text-[#0071DC]">{cat.label}</p>
                            <p className="text-[10px] text-[#9CA3AF]">
                              {cat.type === 'customer_link' && 'Link to customer (no invoice matching in bulk)'}
                              {cat.type === 'vendor_link' && 'Link to vendor (no bill matching in bulk)'}
                              {cat.type === 'sub_account' && `Map to ${(cat.account_types || []).join(', ')} account`}
                              {cat.type === 'bank_account' && 'Transfer between bank accounts'}
                            </p>
                          </div>
                        </div>
                        <HiOutlineChevronRight className="w-4 h-4 text-[#9CA3AF] group-hover:text-[#0071DC]" />
                      </button>
                    ))}
                  </div>
                )}

                {/* STEP 2: Select Detail Based on Category Type */}
                {catStep === 2 && catMainCategory && (
                  <div>
                    {/* --- Customer Link (no invoice matching in bulk) --- */}
                    {catMainCategory.type === 'customer_link' && (
                      <div>
                        <p className="text-xs text-[#6B7280] mb-3 font-medium uppercase tracking-wide">Select Customer</p>
                        <div className="relative mb-3">
                          <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
                          <input
                            type="text"
                            value={catSearchText}
                            onChange={(e) => setCatSearchText(e.target.value)}
                            placeholder="Search customers..."
                            className="w-full pl-9 pr-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
                          />
                        </div>
                        {customersLoading ? (
                          <div className="flex items-center justify-center py-8">
                            <div className="w-6 h-6 border-2 border-[#0071DC] border-t-transparent rounded-full animate-spin" />
                            <span className="ml-2 text-sm text-[#6B7280]">Loading customers...</span>
                          </div>
                        ) : (
                          <div className="space-y-1 max-h-[300px] overflow-y-auto">
                            {customersData
                              .filter((c) => !catSearchText || c.name.toLowerCase().includes(catSearchText.toLowerCase()))
                              .map((customer) => (
                                <button
                                  key={customer.id}
                                  onClick={() => { setCatCustomerId(customer.id); setCatSearchText(''); }}
                                  className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-all text-left ${
                                    catCustomerId === customer.id
                                      ? 'border-[#0071DC] bg-blue-50'
                                      : 'border-[#E5E7EB] hover:border-[#0071DC]/40 hover:bg-blue-50/50'
                                  }`}
                                >
                                  <div>
                                    <p className="text-sm font-medium text-[#333]">{customer.name}</p>
                                    <p className="text-[10px] text-[#9CA3AF]">
                                      {customer.outstanding_invoices.length} outstanding invoice(s)
                                    </p>
                                  </div>
                                  {catCustomerId === customer.id ? (
                                    <HiOutlineCheckCircle className="w-5 h-5 text-[#0071DC]" />
                                  ) : (
                                    <HiOutlineChevronRight className="w-4 h-4 text-[#9CA3AF]" />
                                  )}
                                </button>
                              ))}
                            {customersData.filter((c) => !catSearchText || c.name.toLowerCase().includes(catSearchText.toLowerCase())).length === 0 && (
                              <p className="text-sm text-[#9CA3AF] text-center py-4">No customers found</p>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* --- Vendor Link (no bill matching in bulk) --- */}
                    {catMainCategory.type === 'vendor_link' && (
                      <div>
                        <p className="text-xs text-[#6B7280] mb-3 font-medium uppercase tracking-wide">Select Vendor</p>
                        <div className="relative mb-3">
                          <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
                          <input
                            type="text"
                            value={catSearchText}
                            onChange={(e) => setCatSearchText(e.target.value)}
                            placeholder="Search vendors..."
                            className="w-full pl-9 pr-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
                          />
                        </div>
                        {vendorsLoading ? (
                          <div className="flex items-center justify-center py-8">
                            <div className="w-6 h-6 border-2 border-[#0071DC] border-t-transparent rounded-full animate-spin" />
                            <span className="ml-2 text-sm text-[#6B7280]">Loading vendors...</span>
                          </div>
                        ) : (
                          <div className="space-y-1 max-h-[300px] overflow-y-auto">
                            {vendorsData
                              .filter((v) => !catSearchText || v.name.toLowerCase().includes(catSearchText.toLowerCase()))
                              .map((vendor) => (
                                <button
                                  key={vendor.id}
                                  onClick={() => { setCatVendorId(vendor.id); setCatSearchText(''); }}
                                  className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-all text-left ${
                                    catVendorId === vendor.id
                                      ? 'border-[#0071DC] bg-blue-50'
                                      : 'border-[#E5E7EB] hover:border-[#0071DC]/40 hover:bg-blue-50/50'
                                  }`}
                                >
                                  <div>
                                    <p className="text-sm font-medium text-[#333]">{vendor.name}</p>
                                    <p className="text-[10px] text-[#9CA3AF]">
                                      {vendor.outstanding_bills.length} outstanding bill(s)
                                    </p>
                                  </div>
                                  {catVendorId === vendor.id ? (
                                    <HiOutlineCheckCircle className="w-5 h-5 text-[#0071DC]" />
                                  ) : (
                                    <HiOutlineChevronRight className="w-4 h-4 text-[#9CA3AF]" />
                                  )}
                                </button>
                              ))}
                            {vendorsData.filter((v) => !catSearchText || v.name.toLowerCase().includes(catSearchText.toLowerCase())).length === 0 && (
                              <p className="text-sm text-[#9CA3AF] text-center py-4">No vendors found</p>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* --- Sub-Account Selection --- */}
                    {catMainCategory.type === 'sub_account' && (
                      <div>
                        <p className="text-xs text-[#6B7280] mb-3 font-medium uppercase tracking-wide">
                          Select Account ({(catMainCategory.account_types || []).join(', ')})
                        </p>
                        {subAccountsLoading ? (
                          <div className="flex items-center justify-center py-8">
                            <div className="w-6 h-6 border-2 border-[#0071DC] border-t-transparent rounded-full animate-spin" />
                            <span className="ml-2 text-sm text-[#6B7280]">Loading accounts...</span>
                          </div>
                        ) : (
                          <div>
                            <div className="relative mb-3">
                              <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
                              <input
                                type="text"
                                value={catSearchText}
                                onChange={(e) => setCatSearchText(e.target.value)}
                                placeholder="Search accounts..."
                                className="w-full pl-9 pr-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
                              />
                            </div>
                            <div className="space-y-2 max-h-[300px] overflow-y-auto">
                              {Object.entries(groupedFilteredSubAccounts).map(([type, accts]) => {
                                const filtered = accts.filter(
                                  (sa) => !catSearchText || sa.account_name.toLowerCase().includes(catSearchText.toLowerCase()) || (sa.account_code || '').toLowerCase().includes(catSearchText.toLowerCase())
                                );
                                if (filtered.length === 0) return null;
                                return (
                                  <div key={type}>
                                    <p className="text-[10px] text-[#9CA3AF] font-semibold uppercase tracking-wider px-1 mb-1">{type}</p>
                                    {filtered.map((sa) => (
                                      <button
                                        key={sa.id}
                                        onClick={() => setCatSubAccount(sa.id)}
                                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border transition-all text-left mb-1 ${
                                          catSubAccount === sa.id
                                            ? 'border-[#0071DC] bg-blue-50'
                                            : 'border-[#E5E7EB] hover:border-[#0071DC]/30 hover:bg-blue-50/30'
                                        }`}
                                      >
                                        <div>
                                          <span className="text-sm text-[#333]">{sa.account_code} - {sa.account_name}</span>
                                        </div>
                                        {catSubAccount === sa.id && (
                                          <HiOutlineCheckCircle className="w-4 h-4 text-[#0071DC]" />
                                        )}
                                      </button>
                                    ))}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* --- Bank Account Transfer --- */}
                    {catMainCategory.type === 'bank_account' && (
                      <div>
                        <p className="text-xs text-[#6B7280] mb-3 font-medium uppercase tracking-wide">
                          Select {catMainCategory.key === 'transfer_from' ? 'Source' : 'Destination'} Bank Account
                        </p>
                        <div className="space-y-1">
                          {getOtherBankAccounts().map((ba) => (
                            <button
                              key={ba.id}
                              onClick={() => setCatTransferAccountId(ba.id)}
                              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-all text-left ${
                                catTransferAccountId === ba.id
                                  ? 'border-[#0071DC] bg-blue-50'
                                  : 'border-[#E5E7EB] hover:border-[#0071DC]/30 hover:bg-blue-50/30'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                                  <HiOutlineBuildingLibrary className="w-4 h-4 text-[#0071DC]" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-[#333]">{ba.account_name}</p>
                                  <p className="text-[10px] text-[#9CA3AF]">{ba.bank_name} - {maskAccountNumber(ba.account_number)}</p>
                                </div>
                              </div>
                              {catTransferAccountId === ba.id && (
                                <HiOutlineCheckCircle className="w-5 h-5 text-[#0071DC]" />
                              )}
                            </button>
                          ))}
                          {getOtherBankAccounts().length === 0 && (
                            <p className="text-sm text-[#9CA3AF] text-center py-4">No other bank accounts available</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* STEP 3: Confirmation */}
                {catStep === 3 && (
                  <div className="space-y-4">
                    <div className="bg-[#F9FAFB] rounded-lg p-4 space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-[#6B7280]">Transactions</span>
                        <span className="text-sm font-medium text-[#333]">{bulkTotals.count} transaction(s)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-[#6B7280]">Category</span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${getCategoryColor(catMainCategory?.key)}`}>
                          {getCategoryLabel(catMainCategory?.key)}
                        </span>
                      </div>
                      {catMainCategory?.type === 'customer_link' && catCustomerId && (
                        <div className="flex justify-between">
                          <span className="text-sm text-[#6B7280]">Customer</span>
                          <span className="text-sm font-medium text-[#333]">
                            {customersData.find((c) => c.id === catCustomerId)?.name || '--'}
                          </span>
                        </div>
                      )}
                      {catMainCategory?.type === 'vendor_link' && catVendorId && (
                        <div className="flex justify-between">
                          <span className="text-sm text-[#6B7280]">Vendor</span>
                          <span className="text-sm font-medium text-[#333]">
                            {vendorsData.find((v) => v.id === catVendorId)?.name || '--'}
                          </span>
                        </div>
                      )}
                      {catMainCategory?.type === 'sub_account' && catSubAccount && (
                        <div className="flex justify-between">
                          <span className="text-sm text-[#6B7280]">Account</span>
                          <span className="text-sm font-medium text-[#333]">
                            {(() => {
                              const sa = subAccounts.find((s) => s.id === catSubAccount);
                              return sa ? `${sa.account_code} - ${sa.account_name}` : '--';
                            })()}
                          </span>
                        </div>
                      )}
                      {catMainCategory?.type === 'bank_account' && catTransferAccountId && (
                        <div className="flex justify-between">
                          <span className="text-sm text-[#6B7280]">Transfer Account</span>
                          <span className="text-sm font-medium text-[#333]">
                            {bankAccountsList.find((a) => a.id === catTransferAccountId)?.account_name || '--'}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <p className="text-xs text-amber-700">
                        This will categorize {bulkTotals.count} transaction(s) with the same category. This action can be individually edited later.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex justify-between items-center gap-3 px-6 py-4 border-t border-[#E5E7EB] bg-[#F9FAFB] rounded-b-xl flex-shrink-0">
                <button
                  onClick={() => setShowBulkCategorize(false)}
                  className="px-4 py-2 text-sm font-medium text-[#333] bg-white border border-[#E5E7EB] rounded-lg hover:bg-[#F9FAFB] transition-colors"
                >
                  Cancel
                </button>
                <div className="flex gap-2">
                  {catStep === 2 && canConfirm() && (
                    <button
                      onClick={() => setCatStep(3)}
                      className="inline-flex items-center gap-1 px-4 py-2 text-sm font-medium text-[#0071DC] bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      Review
                      <HiOutlineChevronRight className="w-4 h-4" />
                    </button>
                  )}
                  {catStep === 3 && (
                    <button
                      onClick={handleBulkCategorizeSubmit}
                      disabled={categorizeSaving}
                      className="inline-flex items-center gap-2 px-5 py-2 bg-[#0071DC] text-white text-sm font-medium rounded-lg hover:bg-[#005BB5] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {categorizeSaving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                      {categorizeSaving ? 'Categorizing...' : `Categorize ${bulkTotals.count} Transactions`}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

/* ─── Tab 3: Import Statement ──────────────────────────────────────────── */
/* Now handled by StatementImport component (./StatementImport.jsx) */

/* ─── Tab 4: Reconciliation ───────────────────────────────────────────── */

function ReconciliationTab({ selectedAccount, onChangeAccount }) {
  const [accounts, setAccounts] = useState([]);
  const [accountId, setAccountId] = useState(selectedAccount?.id || '');
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [summary, setSummary] = useState({ total: 0, reconciled: 0, unreconciled: 0 });

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editSaving, setEditSaving] = useState(false);
  const [subAccounts, setSubAccounts] = useState([]);
  const [subAccountsLoading, setSubAccountsLoading] = useState(false);

  // Fetch accounts
  useEffect(() => {
    const fetchAccounts = async () => {
      setAccountsLoading(true);
      try {
        const response = await apiClient.get('/bank-accounts');
        setAccounts(response.data?.data || []);
      } catch {
        setAccounts([]);
      } finally {
        setAccountsLoading(false);
      }
    };
    fetchAccounts();
  }, []);

  // Fetch sub-accounts for edit modal dropdown
  useEffect(() => {
    const fetchSubAccounts = async () => {
      setSubAccountsLoading(true);
      try {
        const response = await apiClient.get('/bank-transactions/sub-accounts');
        setSubAccounts(response.data?.data || []);
      } catch {
        setSubAccounts([]);
      } finally {
        setSubAccountsLoading(false);
      }
    };
    fetchSubAccounts();
  }, []);

  // Auto-select first account if none selected
  useEffect(() => {
    if (!accountId && accounts.length > 0) {
      setAccountId(accounts[0].id);
      onChangeAccount(accounts[0]);
    }
  }, [accounts, accountId, onChangeAccount]);

  useEffect(() => {
    if (selectedAccount?.id) {
      setAccountId(selectedAccount.id);
    }
  }, [selectedAccount]);

  // Fetch only CATEGORIZED transactions for reconciliation
  const fetchTransactions = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    try {
      const response = await apiClient.get('/bank-transactions', {
        params: {
          bank_account_id: accountId,
          categorization_status: 'categorized',
          limit: 200,
          sort_by: 'transaction_date',
          sort_order: 'asc',
        },
      });
      const allTxns = response.data?.data || [];
      setTransactions(allTxns);
      const reconciled = allTxns.filter((t) => t.is_reconciled).length;
      setSummary({ total: allTxns.length, reconciled, unreconciled: allTxns.length - reconciled });
    } catch {
      setTransactions([]);
      setSummary({ total: 0, reconciled: 0, unreconciled: 0 });
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleAccountChange = (e) => {
    const id = e.target.value;
    setAccountId(id);
    const acc = accounts.find((a) => String(a.id) === String(id));
    onChangeAccount(acc || null);
  };

  const toggleReconcile = async (txn) => {
    setUpdatingId(txn.id);
    try {
      const newStatus = !txn.is_reconciled;
      await apiClient.put(`/bank-transactions/${txn.id}`, { is_reconciled: newStatus });
      setTransactions((prev) =>
        prev.map((t) => (t.id === txn.id ? { ...t, is_reconciled: newStatus } : t))
      );
      setSummary((prev) => ({
        ...prev,
        reconciled: prev.reconciled + (newStatus ? 1 : -1),
        unreconciled: prev.unreconciled + (newStatus ? -1 : 1),
      }));
      toast.success(newStatus ? 'Marked as reconciled' : 'Marked as unreconciled');
    } catch {
      toast.error('Failed to update reconciliation status');
    } finally {
      setUpdatingId(null);
    }
  };

  const reconcileAll = async () => {
    const unreconciledTxns = transactions.filter((t) => !t.is_reconciled);
    if (unreconciledTxns.length === 0) {
      toast('All transactions are already reconciled');
      return;
    }
    const ids = unreconciledTxns.map((t) => t.id);
    try {
      await apiClient.post('/bank-transactions/categorize', {
        transaction_ids: ids,
        updates: { is_reconciled: true },
      });
      setTransactions((prev) => prev.map((t) => ({ ...t, is_reconciled: true })));
      setSummary((prev) => ({ ...prev, reconciled: prev.total, unreconciled: 0 }));
      toast.success(`${unreconciledTxns.length} transactions reconciled`);
    } catch {
      toast.error('Failed to reconcile all transactions. Try reconciling individually.');
    }
  };

  // Edit modal handlers
  const openEditModal = (txn) => {
    setEditTarget(txn);
    setEditForm({
      transaction_date: txn.transaction_date ? txn.transaction_date.split('T')[0] : '',
      description: txn.description || '',
      deposit_amount: txn.deposit_amount || '',
      withdrawal_amount: txn.withdrawal_amount || '',
      category: txn.category || '',
      sub_account_id: txn.sub_account_id || '',
      notes: txn.notes || '',
    });
    setShowEditModal(true);
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditSubmit = async () => {
    if (!editTarget) return;
    setEditSaving(true);
    try {
      const payload = {
        transaction_date: editForm.transaction_date,
        description: editForm.description,
        deposit_amount: editForm.deposit_amount ? parseFloat(editForm.deposit_amount) : 0,
        withdrawal_amount: editForm.withdrawal_amount ? parseFloat(editForm.withdrawal_amount) : 0,
        category: editForm.category,
        sub_account_id: editForm.sub_account_id || null,
        notes: editForm.notes || null,
      };
      const response = await apiClient.put(`/bank-transactions/${editTarget.id}`, payload);
      const updated = response.data?.data;
      const sa = subAccounts.find((s) => String(s.id) === String(editForm.sub_account_id));
      setTransactions((prev) =>
        prev.map((t) =>
          t.id === editTarget.id
            ? {
                ...t,
                ...updated,
                sub_account_name: sa?.account_name || t.sub_account_name,
                sub_account_code: sa?.account_code || t.sub_account_code,
              }
            : t
        )
      );
      toast.success('Transaction updated successfully');
      setShowEditModal(false);
      setEditTarget(null);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update transaction');
    } finally {
      setEditSaving(false);
    }
  };

  const unreconciledTxns = transactions.filter((t) => !t.is_reconciled);
  const reconciledTxns = transactions.filter((t) => t.is_reconciled);

  // Group sub-accounts by type for edit modal dropdown
  const groupedSubAccounts = subAccounts.reduce((acc, sa) => {
    const type = sa.account_type || 'Other';
    if (!acc[type]) acc[type] = [];
    acc[type].push(sa);
    return acc;
  }, {});

  return (
    <div>
      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6 flex items-start gap-2">
        <HiOutlineBookOpen className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm text-blue-800 font-medium">Only categorized transactions are shown</p>
          <p className="text-xs text-blue-600 mt-0.5">
            Transactions must be categorized (with an expense type and sub-account) before they can be reconciled.
            Go to the Transactions tab to categorize uncategorized transactions.
          </p>
        </div>
      </div>

      {/* Account Selector */}
      <div className="flex items-end gap-4 mb-6 flex-wrap">
        <div>
          <label className="block text-sm font-medium text-[#333] mb-1">Bank Account</label>
          <select
            value={accountId}
            onChange={handleAccountChange}
            disabled={accountsLoading}
            className="px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] bg-white focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC] min-w-[220px]"
          >
            {accountsLoading ? (
              <option>Loading...</option>
            ) : accounts.length === 0 ? (
              <option value="">No accounts</option>
            ) : (
              accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.account_name} - {a.bank_name}
                </option>
              ))
            )}
          </select>
        </div>
        <button
          onClick={fetchTransactions}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-[#6B7280] hover:text-[#333] border border-[#E5E7EB] rounded-lg hover:bg-[#F9FAFB] transition-colors"
        >
          <HiOutlineArrowPath className="w-4 h-4" />
          Refresh
        </button>
        {unreconciledTxns.length > 0 && (
          <button
            onClick={reconcileAll}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
          >
            <HiOutlineCheckCircle className="w-4 h-4" />
            Reconcile All ({unreconciledTxns.length})
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-4 flex items-center gap-4">
          <div className="w-11 h-11 rounded-lg flex items-center justify-center bg-blue-500">
            <HiOutlineBanknotes className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-xs text-[#6B7280] font-medium uppercase tracking-wide">Categorized Transactions</p>
            <p className="text-lg font-semibold text-[#333] mt-0.5">{summary.total}</p>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-4 flex items-center gap-4">
          <div className="w-11 h-11 rounded-lg flex items-center justify-center bg-green-500">
            <HiOutlineCheckCircle className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-xs text-[#6B7280] font-medium uppercase tracking-wide">Reconciled</p>
            <p className="text-lg font-semibold text-green-600 mt-0.5">{summary.reconciled}</p>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-4 flex items-center gap-4">
          <div className="w-11 h-11 rounded-lg flex items-center justify-center bg-orange-500">
            <HiOutlineExclamationTriangle className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-xs text-[#6B7280] font-medium uppercase tracking-wide">Unreconciled</p>
            <p className="text-lg font-semibold text-orange-600 mt-0.5">{summary.unreconciled}</p>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      {summary.total > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-[#6B7280] font-medium">Reconciliation Progress</p>
            <p className="text-xs font-medium text-[#333]">{Math.round((summary.reconciled / summary.total) * 100)}%</p>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-green-500 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${summary.total > 0 ? (summary.reconciled / summary.total) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-[#0071DC] border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-[#6B7280]">Loading categorized transactions...</span>
          </div>
        </div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-16">
          <HiOutlineTag className="w-12 h-12 text-[#D1D5DB] mx-auto mb-3" />
          <p className="text-[#6B7280] font-medium">No categorized transactions available</p>
          <p className="text-xs text-[#9CA3AF] mt-1">
            Categorize transactions first in the Transactions tab before reconciling them here.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Unreconciled Transactions */}
          {unreconciledTxns.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-orange-700 mb-3 flex items-center gap-2">
                <HiOutlineExclamationTriangle className="w-4 h-4" />
                Unreconciled Transactions ({unreconciledTxns.length})
              </h3>
              <div className="overflow-x-auto border border-[#E5E7EB] rounded-lg">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-orange-50 border-b border-[#E5E7EB]">
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Date</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider min-w-[180px]">Description</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Category</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Sub-Account</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Deposit</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Withdrawal</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Balance</th>
                      <th className="px-4 py-2.5 text-center text-xs font-semibold text-[#6B7280] uppercase tracking-wider w-44">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB]">
                    {unreconciledTxns.map((txn) => {
                      const deposit = parseFloat(txn.deposit_amount) || 0;
                      const withdrawal = parseFloat(txn.withdrawal_amount) || 0;
                      return (
                        <tr key={txn.id} className="hover:bg-[#F9FAFB] transition-colors">
                          <td className="px-4 py-2.5 text-[#333] whitespace-nowrap">{formatDate(txn.transaction_date)}</td>
                          <td className="px-4 py-2.5 text-[#333] text-sm">{txn.description || '--'}</td>
                          <td className="px-4 py-2.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                              <HiOutlineTag className="w-3 h-3" />
                              {txn.category || '--'}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-xs text-[#6B7280]">
                            {txn.sub_account_name ? `${txn.sub_account_code} - ${txn.sub_account_name}` : '--'}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            {deposit > 0 ? <span className="text-green-600 font-medium">{formatIndianCurrency(deposit)}</span> : <span className="text-[#9CA3AF]">--</span>}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            {withdrawal > 0 ? <span className="text-red-600 font-medium">{formatIndianCurrency(withdrawal)}</span> : <span className="text-[#9CA3AF]">--</span>}
                          </td>
                          <td className="px-4 py-2.5 text-right font-medium text-[#333]">{txn.balance != null ? formatIndianCurrency(txn.balance) : '--'}</td>
                          <td className="px-4 py-2.5 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => openEditModal(txn)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#6B7280] bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100 transition-colors"
                              >
                                <HiOutlinePencilSquare className="w-3.5 h-3.5" />
                                Edit
                              </button>
                              <button
                                onClick={() => toggleReconcile(txn)}
                                disabled={updatingId === txn.id}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-md hover:bg-green-100 disabled:opacity-50 transition-colors"
                              >
                                {updatingId === txn.id ? (
                                  <div className="w-3 h-3 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <HiOutlineCheckCircle className="w-3.5 h-3.5" />
                                )}
                                Reconcile
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Reconciled Transactions */}
          {reconciledTxns.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-green-700 mb-3 flex items-center gap-2">
                <HiOutlineCheckCircle className="w-4 h-4" />
                Reconciled Transactions ({reconciledTxns.length})
              </h3>
              <div className="overflow-x-auto border border-[#E5E7EB] rounded-lg">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-green-50 border-b border-[#E5E7EB]">
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Date</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider min-w-[180px]">Description</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Category</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Sub-Account</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Deposit</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Withdrawal</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Balance</th>
                      <th className="px-4 py-2.5 text-center text-xs font-semibold text-[#6B7280] uppercase tracking-wider w-44">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB]">
                    {reconciledTxns.slice(0, 20).map((txn) => {
                      const deposit = parseFloat(txn.deposit_amount) || 0;
                      const withdrawal = parseFloat(txn.withdrawal_amount) || 0;
                      return (
                        <tr key={txn.id} className="hover:bg-[#F9FAFB] transition-colors">
                          <td className="px-4 py-2.5 text-[#333] whitespace-nowrap">{formatDate(txn.transaction_date)}</td>
                          <td className="px-4 py-2.5 text-[#333] text-sm">{txn.description || '--'}</td>
                          <td className="px-4 py-2.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                              <HiOutlineTag className="w-3 h-3" />
                              {txn.category || '--'}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-xs text-[#6B7280]">
                            {txn.sub_account_name ? `${txn.sub_account_code} - ${txn.sub_account_name}` : '--'}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            {deposit > 0 ? <span className="text-green-600 font-medium">{formatIndianCurrency(deposit)}</span> : <span className="text-[#9CA3AF]">--</span>}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            {withdrawal > 0 ? <span className="text-red-600 font-medium">{formatIndianCurrency(withdrawal)}</span> : <span className="text-[#9CA3AF]">--</span>}
                          </td>
                          <td className="px-4 py-2.5 text-right font-medium text-[#333]">{txn.balance != null ? formatIndianCurrency(txn.balance) : '--'}</td>
                          <td className="px-4 py-2.5 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => openEditModal(txn)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#6B7280] bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100 transition-colors"
                              >
                                <HiOutlinePencilSquare className="w-3.5 h-3.5" />
                                Edit
                              </button>
                              <button
                                onClick={() => toggleReconcile(txn)}
                                disabled={updatingId === txn.id}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-orange-700 bg-orange-50 border border-orange-200 rounded-md hover:bg-orange-100 disabled:opacity-50 transition-colors"
                              >
                                {updatingId === txn.id ? (
                                  <div className="w-3 h-3 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <HiOutlineXCircle className="w-3.5 h-3.5" />
                                )}
                                Undo
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {reconciledTxns.length > 20 && (
                  <div className="px-4 py-2 bg-green-50 text-xs text-green-700 text-center border-t border-[#E5E7EB]">
                    Showing 20 of {reconciledTxns.length} reconciled transactions
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Edit Transaction Modal */}
      {showEditModal && editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB]">
              <div>
                <h3 className="text-base font-semibold text-[#333]">Edit Transaction</h3>
                <p className="text-xs text-[#6B7280] mt-0.5">
                  Update transaction details
                </p>
              </div>
              <button
                onClick={() => { setShowEditModal(false); setEditTarget(null); }}
                className="p-1.5 text-[#6B7280] hover:text-[#333] hover:bg-[#F9FAFB] rounded-lg transition-colors"
              >
                <HiOutlineXMark className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              {/* Transaction Date */}
              <div>
                <label className="block text-sm font-medium text-[#333] mb-1">Transaction Date</label>
                <input
                  type="date"
                  name="transaction_date"
                  value={editForm.transaction_date}
                  onChange={handleEditFormChange}
                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] bg-white focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-[#333] mb-1">Description</label>
                <input
                  type="text"
                  name="description"
                  value={editForm.description}
                  onChange={handleEditFormChange}
                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] bg-white focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
                  placeholder="Transaction description"
                />
              </div>

              {/* Deposit & Withdrawal */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#333] mb-1">Deposit Amount</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#6B7280]">{'\u20B9'}</span>
                    <input
                      type="number"
                      name="deposit_amount"
                      value={editForm.deposit_amount}
                      onChange={handleEditFormChange}
                      step="0.01"
                      min="0"
                      className="w-full pl-8 pr-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] bg-white focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#333] mb-1">Withdrawal Amount</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#6B7280]">{'\u20B9'}</span>
                    <input
                      type="number"
                      name="withdrawal_amount"
                      value={editForm.withdrawal_amount}
                      onChange={handleEditFormChange}
                      step="0.01"
                      min="0"
                      className="w-full pl-8 pr-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] bg-white focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-[#333] mb-1">Category</label>
                <select
                  name="category"
                  value={editForm.category}
                  onChange={handleEditFormChange}
                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] bg-white focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
                >
                  <option value="">Select category...</option>
                  {TRANSACTION_CATEGORIES.filter((c) => c !== 'Uncategorized').map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Sub-Account */}
              <div>
                <label className="block text-sm font-medium text-[#333] mb-1">Sub-Account</label>
                {subAccountsLoading ? (
                  <div className="flex items-center gap-2 text-sm text-[#6B7280] py-2">
                    <div className="w-4 h-4 border-2 border-[#0071DC] border-t-transparent rounded-full animate-spin" />
                    Loading accounts...
                  </div>
                ) : (
                  <select
                    name="sub_account_id"
                    value={editForm.sub_account_id}
                    onChange={handleEditFormChange}
                    className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] bg-white focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
                  >
                    <option value="">Select sub-account...</option>
                    {Object.entries(groupedSubAccounts).map(([type, accts]) => (
                      <optgroup key={type} label={type}>
                        {accts.map((sa) => (
                          <option key={sa.id} value={sa.id}>
                            {sa.account_code} - {sa.account_name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-[#333] mb-1">Notes</label>
                <textarea
                  name="notes"
                  value={editForm.notes}
                  onChange={handleEditFormChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] bg-white focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC] resize-none"
                  placeholder="Optional notes..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#E5E7EB] bg-[#F9FAFB] rounded-b-xl">
              <button
                onClick={() => { setShowEditModal(false); setEditTarget(null); }}
                className="px-4 py-2 text-sm font-medium text-[#333] bg-white border border-[#E5E7EB] rounded-lg hover:bg-[#F9FAFB] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEditSubmit}
                disabled={editSaving}
                className="inline-flex items-center gap-2 px-5 py-2 bg-[#0071DC] text-white text-sm font-medium rounded-lg hover:bg-[#005BB5] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {editSaving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {editSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
