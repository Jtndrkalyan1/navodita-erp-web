import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  HiOutlineArrowLeft,
  HiOutlinePencilSquare,
  HiOutlineTrash,
  HiOutlinePlus,
  HiOutlinePhone,
  HiOutlineEnvelope,
  HiOutlineMapPin,
  HiOutlineBanknotes,
  HiOutlineBuildingLibrary,
  HiOutlineIdentification,
  HiOutlineExclamationTriangle,
  HiOutlineXMark,
  HiOutlineUserCircle,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { investorOrderApi } from '../../api/investorOrder.api';
import apiClient from '../../api/client';
import { formatINR } from '../../utils/currency';
import LoadingSpinner from '../../components/feedback/LoadingSpinner';

// ── Helpers ──────────────────────────────────────────────────────

const TXN_TYPE_CONFIG = {
  received: { label: 'Received', color: 'bg-green-50 text-green-700 border-green-200' },
  returned: { label: 'Returned', color: 'bg-red-50 text-red-700 border-red-200' },
  investment: { label: 'Investment', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  withdrawal: { label: 'Withdrawal', color: 'bg-orange-50 text-orange-700 border-orange-200' },
};

function TxnTypeBadge({ type }) {
  const config = TXN_TYPE_CONFIG[type] || TXN_TYPE_CONFIG.received;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${config.color}`}>
      {config.label}
    </span>
  );
}

function InfoRow({ label, value, icon: Icon }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      {Icon && <Icon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />}
      <div className="min-w-0">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-sm text-gray-900 mt-0.5 break-words">{value || '--'}</p>
      </div>
    </div>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return '--';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

function getInitials(name) {
  if (!name) return '';
  return name
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

// ── Main Component ───────────────────────────────────────────────

export default function InvestorPartnerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [partner, setPartner] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [txnLoading, setTxnLoading] = useState(true);
  const [error, setError] = useState(null);
  const [photoUrl, setPhotoUrl] = useState(null);

  // Inline transaction form
  const [showTxnForm, setShowTxnForm] = useState(false);
  const [txnForm, setTxnForm] = useState({
    transaction_date: todayISO(),
    type: 'received',
    amount: '',
    description: '',
    reference: '',
  });
  const [txnSaving, setTxnSaving] = useState(false);

  const fetchPartner = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await investorOrderApi.getPartnerById(id);
      setPartner(res.data?.data || null);
    } catch (err) {
      if (err.response?.status === 404) {
        setError('Partner not found');
      } else if (err.response?.status !== 401) {
        setError('Failed to load partner');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchTransactions = useCallback(async () => {
    setTxnLoading(true);
    try {
      const res = await investorOrderApi.getPartnerTransactions(id);
      setTransactions(res.data?.data || []);
    } catch {
      // Silently handle - transactions may not exist yet
      setTransactions([]);
    } finally {
      setTxnLoading(false);
    }
  }, [id]);

  const fetchPhoto = useCallback(async () => {
    try {
      const response = await apiClient.get('/documents', {
        params: { entity_type: 'investor_partner', entity_id: id, category: 'photo' },
      });
      const docs = response.data?.data || response.data || [];
      if (Array.isArray(docs) && docs.length > 0) {
        const latestDoc = docs[docs.length - 1];
        const url = latestDoc.file_url || latestDoc.url || latestDoc.file_path;
        if (url) setPhotoUrl(url);
      }
    } catch {
      // No photo available
    }
  }, [id]);

  useEffect(() => {
    fetchPartner();
    fetchTransactions();
    fetchPhoto();
  }, [fetchPartner, fetchTransactions, fetchPhoto]);

  // Delete partner
  async function handleDelete() {
    if (!window.confirm(`Are you sure you want to delete "${partner?.partner_name}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await investorOrderApi.deletePartner(id);
      toast.success('Partner deleted');
      navigate('/investor-orders/partners');
    } catch {
      toast.error('Failed to delete partner');
    }
  }

  // Transaction form handlers
  function handleTxnChange(e) {
    const { name, value } = e.target;
    setTxnForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleTxnSubmit(e) {
    e.preventDefault();
    if (!txnForm.amount || parseFloat(txnForm.amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    setTxnSaving(true);
    try {
      await investorOrderApi.createPartnerTransaction(id, {
        ...txnForm,
        amount: parseFloat(txnForm.amount),
      });
      toast.success('Transaction added');
      setShowTxnForm(false);
      setTxnForm({
        transaction_date: todayISO(),
        type: 'received',
        amount: '',
        description: '',
        reference: '',
      });
      fetchTransactions();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add transaction');
    } finally {
      setTxnSaving(false);
    }
  }

  async function handleDeleteTxn(txnId) {
    if (!window.confirm('Delete this transaction?')) return;
    try {
      await investorOrderApi.deletePartnerTransaction(txnId);
      toast.success('Transaction deleted');
      fetchTransactions();
    } catch {
      toast.error('Failed to delete transaction');
    }
  }

  // Calculate statement summaries
  const totalReceived = transactions
    .filter((t) => t.type === 'received' || t.type === 'investment')
    .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

  const totalReturned = transactions
    .filter((t) => t.type === 'returned' || t.type === 'withdrawal')
    .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

  const netBalance = totalReceived - totalReturned;

  // Calculate running balance for statement
  const sortedTransactions = [...transactions].sort(
    (a, b) => new Date(a.transaction_date) - new Date(b.transaction_date)
  );
  let runningBal = 0;
  const txnWithBalance = sortedTransactions.map((t) => {
    const amt = parseFloat(t.amount) || 0;
    if (t.type === 'received' || t.type === 'investment') {
      runningBal += amt;
    } else {
      runningBal -= amt;
    }
    return { ...t, running_balance: runningBal };
  });

  // Loading state
  if (loading) {
    return (
      <div className="py-20">
        <LoadingSpinner size="lg" label="Loading partner..." />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="py-20 text-center">
        <HiOutlineExclamationTriangle className="w-12 h-12 text-red-300 mx-auto mb-3" />
        <p className="text-sm text-red-600 mb-3">{error}</p>
        <Link to="/investor-orders/partners" className="text-sm text-[#0071DC] hover:underline">
          Back to Partners
        </Link>
      </div>
    );
  }

  if (!partner) return null;

  return (
    <div>
      {/* Header */}
      <div className="bg-white border-b border-[var(--zoho-border)] px-6 py-4 -mx-6 -mt-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/investor-orders/partners"
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors flex items-center gap-1"
            >
              <HiOutlineArrowLeft className="w-4 h-4" />
              Partners
            </Link>
            <span className="text-gray-300">|</span>
            {/* Partner photo */}
            <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200 flex-shrink-0">
              {photoUrl ? (
                <img src={photoUrl} alt={partner.partner_name} className="w-9 h-9 rounded-full object-cover" />
              ) : (
                <span className="text-sm font-semibold text-gray-400">
                  {partner.partner_name ? getInitials(partner.partner_name) : <HiOutlineUserCircle className="w-5 h-5 text-gray-400" />}
                </span>
              )}
            </div>
            <h1 className="text-xl font-semibold text-[var(--zoho-text)]">
              {partner.partner_name}
            </h1>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                partner.partner_type === 'Investment'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'bg-purple-50 text-purple-700 border border-purple-200'
              }`}
            >
              {partner.partner_type || 'Investment'}
            </span>
          </div>
          <div className="flex items-center gap-2 print-hide">
            <Link
              to={`/investor-orders/partners/${id}/edit`}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-300 px-3 py-2 rounded-md hover:bg-gray-50 transition-colors"
            >
              <HiOutlinePencilSquare className="w-4 h-4" />
              Edit
            </Link>
            <button
              onClick={handleDelete}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-red-600 hover:text-red-700 border border-red-200 px-3 py-2 rounded-md hover:bg-red-50 transition-colors cursor-pointer"
            >
              <HiOutlineTrash className="w-4 h-4" />
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Profile Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Basic Info */}
        <div className="bg-white rounded-lg border border-[var(--zoho-border)] p-5">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
            Partner Details
          </h3>
          <div className="space-y-1">
            <InfoRow label="Investment Amount" value={formatINR(partner.investment_amount)} icon={HiOutlineBanknotes} />
            <InfoRow
              label="Profit Ratio"
              value={`${((parseFloat(partner.ratio) || 0) * 100).toFixed(1)}%`}
              icon={HiOutlineBanknotes}
            />
            <InfoRow label="Phone" value={partner.phone} icon={HiOutlinePhone} />
            <InfoRow label="Email" value={partner.email} icon={HiOutlineEnvelope} />
            <InfoRow label="Address" value={partner.address} icon={HiOutlineMapPin} />
          </div>
        </div>

        {/* Identity */}
        <div className="bg-white rounded-lg border border-[var(--zoho-border)] p-5">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
            Identity & Compliance
          </h3>
          <div className="space-y-1">
            <InfoRow label="PAN" value={partner.pan} icon={HiOutlineIdentification} />
            <InfoRow label="Aadhar" value={partner.aadhar} icon={HiOutlineIdentification} />
          </div>
          {partner.notes && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Notes</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{partner.notes}</p>
            </div>
          )}
        </div>

        {/* Bank Details */}
        <div className="bg-white rounded-lg border border-[var(--zoho-border)] p-5">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
            Bank Details
          </h3>
          <div className="space-y-1">
            <InfoRow label="Bank Name" value={partner.bank_name} icon={HiOutlineBuildingLibrary} />
            <InfoRow label="Account Number" value={partner.bank_account_number} icon={HiOutlineBuildingLibrary} />
            <InfoRow label="IFSC Code" value={partner.bank_ifsc} icon={HiOutlineBuildingLibrary} />
          </div>
        </div>
      </div>

      {/* Statement Section */}
      <div className="bg-white rounded-lg border border-[var(--zoho-border)] overflow-hidden">
        {/* Statement Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-[var(--zoho-text)]">
              Partner Statement
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              All transactions for this partner
            </p>
          </div>
          <button
            onClick={() => setShowTxnForm(!showTxnForm)}
            className="inline-flex items-center gap-1.5 bg-[#0071DC] hover:bg-[#005BB5] text-white text-sm font-medium px-3 py-2 rounded-md transition-colors print-hide cursor-pointer"
          >
            {showTxnForm ? (
              <>
                <HiOutlineXMark className="w-4 h-4" />
                Cancel
              </>
            ) : (
              <>
                <HiOutlinePlus className="w-4 h-4" />
                Add Transaction
              </>
            )}
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4 px-6 py-4 bg-gray-50/50 border-b border-gray-100">
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Received</p>
            <p className="text-lg font-semibold text-green-700 mt-0.5 tabular-nums">{formatINR(totalReceived)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Returned</p>
            <p className="text-lg font-semibold text-red-600 mt-0.5 tabular-nums">{formatINR(totalReturned)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Net Balance</p>
            <p className={`text-lg font-semibold mt-0.5 tabular-nums ${netBalance >= 0 ? 'text-green-700' : 'text-red-600'}`}>
              {formatINR(netBalance)}
            </p>
          </div>
        </div>

        {/* Inline Transaction Form */}
        {showTxnForm && (
          <div className="px-6 py-4 bg-blue-50/30 border-b border-blue-100 print-hide">
            <form onSubmit={handleTxnSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                {/* Date */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
                  <input
                    type="date"
                    name="transaction_date"
                    value={txnForm.transaction_date}
                    onChange={handleTxnChange}
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                {/* Type */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                  <select
                    name="type"
                    value={txnForm.type}
                    onChange={handleTxnChange}
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                  >
                    <option value="received">Received</option>
                    <option value="returned">Returned</option>
                    <option value="investment">Investment</option>
                    <option value="withdrawal">Withdrawal</option>
                  </select>
                </div>
                {/* Amount */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Amount</label>
                  <input
                    type="number"
                    name="amount"
                    value={txnForm.amount}
                    onChange={handleTxnChange}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none tabular-nums"
                  />
                </div>
                {/* Description */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                  <input
                    type="text"
                    name="description"
                    value={txnForm.description}
                    onChange={handleTxnChange}
                    placeholder="Optional"
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                {/* Reference + Submit */}
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Reference</label>
                    <input
                      type="text"
                      name="reference"
                      value={txnForm.reference}
                      onChange={handleTxnChange}
                      placeholder="Optional"
                      className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={txnSaving}
                    className="inline-flex items-center gap-1 bg-[#0071DC] hover:bg-[#005BB5] text-white text-sm font-medium px-3 py-1.5 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 cursor-pointer"
                  >
                    {txnSaving ? 'Saving...' : 'Add'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Transactions Table */}
        {txnLoading ? (
          <div className="py-12">
            <LoadingSpinner size="md" label="Loading transactions..." />
          </div>
        ) : txnWithBalance.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-gray-500">No transactions recorded yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Reference
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Balance
                  </th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider w-16 print-hide">
                    &nbsp;
                  </th>
                </tr>
              </thead>
              <tbody>
                {txnWithBalance.map((txn, index) => {
                  const isCredit = txn.type === 'received' || txn.type === 'investment';
                  return (
                    <tr
                      key={txn.id}
                      className={`border-b border-gray-100 transition-colors ${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'
                      } hover:bg-blue-50/30`}
                    >
                      <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap">
                        {formatDate(txn.transaction_date)}
                      </td>
                      <td className="px-4 py-2.5">
                        <TxnTypeBadge type={txn.type} />
                      </td>
                      <td className="px-4 py-2.5 text-gray-700 max-w-[200px] truncate">
                        {txn.description || '--'}
                      </td>
                      <td className="px-4 py-2.5 text-gray-500">
                        {txn.reference || '--'}
                      </td>
                      <td className={`px-4 py-2.5 text-right tabular-nums font-medium ${isCredit ? 'text-green-700' : 'text-red-600'}`}>
                        {isCredit ? '+' : '-'}{formatINR(txn.amount)}
                      </td>
                      <td className={`px-4 py-2.5 text-right tabular-nums font-medium ${txn.running_balance >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                        {formatINR(txn.running_balance)}
                      </td>
                      <td className="px-4 py-2.5 text-center print-hide">
                        <button
                          onClick={() => handleDeleteTxn(txn.id)}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
                          title="Delete transaction"
                        >
                          <HiOutlineTrash className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
