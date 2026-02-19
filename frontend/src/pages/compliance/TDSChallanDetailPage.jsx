import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  HiOutlineArrowLeft,
  HiOutlinePencilSquare,
  HiOutlineTrash,
  HiOutlineExclamationTriangle,
  HiOutlineDocumentText,
  HiOutlinePrinter,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { tdsChallanApi } from '../../api/tdsChallan.api';
import { openPdf, printPdf } from '../../utils/pdf';

// ── Helpers ────────────────────────────────────────────────────────

function formatIndianCurrency(value) {
  if (value == null || isNaN(value)) return '\u20B90.00';
  const num = Number(value);
  const isNegative = num < 0;
  const abs = Math.abs(num);
  const [intPart, decPart] = abs.toFixed(2).split('.');
  let result = '';
  if (intPart.length <= 3) {
    result = intPart;
  } else {
    result = intPart.slice(-3);
    let remaining = intPart.slice(0, -3);
    while (remaining.length > 2) {
      result = remaining.slice(-2) + ',' + result;
      remaining = remaining.slice(0, -2);
    }
    if (remaining.length > 0) result = remaining + ',' + result;
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

function StatusBadge({ status }) {
  const styles = {
    Draft: 'bg-gray-50 text-gray-700 border-gray-200',
    Pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    Deposited: 'bg-green-50 text-green-700 border-green-200',
    Paid: 'bg-green-50 text-green-700 border-green-200',
    Verified: 'bg-blue-50 text-blue-700 border-blue-200',
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
        styles[status] || styles.Pending
      }`}
    >
      {status || 'Pending'}
    </span>
  );
}

function InfoRow({ label, value, className = '' }) {
  return (
    <div className={className}>
      <p className="text-xs text-[#6B7280] font-medium uppercase tracking-wide">{label}</p>
      <p className="text-sm text-[#333] mt-0.5">{value || '--'}</p>
    </div>
  );
}

function AmountRow({ label, value, bold, color = 'text-[#333]' }) {
  return (
    <div className="flex justify-between items-center">
      <span className={`text-sm ${bold ? 'font-medium text-[#333]' : 'text-[#6B7280]'}`}>{label}</span>
      <span className={`text-sm ${bold ? 'font-bold' : 'font-semibold'} ${color}`}>
        {formatIndianCurrency(value)}
      </span>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────

export default function TDSChallanDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ── Fetch ────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await tdsChallanApi.getById(id);
      const d = res.data?.data || res.data;
      if (!d) {
        setError('TDS Challan not found');
        return;
      }
      setItem(d);
    } catch (err) {
      if (err.response?.status === 404) {
        setError('TDS Challan not found');
      } else if (err.response?.status !== 401) {
        setError('Failed to load TDS challan');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Delete ───────────────────────────────────────────────────────

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await tdsChallanApi.remove(id);
      toast.success('TDS Challan deleted successfully');
      navigate('/tds-challans', { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Failed to delete challan';
      toast.error(msg);
    } finally {
      setDeleting(false);
      setShowDelete(false);
    }
  };

  // ── Loading ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#0071DC] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-[#6B7280]">Loading challan...</span>
        </div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="py-20 text-center">
        <HiOutlineDocumentText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-lg font-medium text-[#333] mb-2">{error}</h2>
        <Link to="/tds-challans" className="text-sm text-[#0071DC] hover:underline">
          Back to TDS Challans
        </Link>
      </div>
    );
  }

  if (!item) return null;

  // ── Computed ─────────────────────────────────────────────────────

  const challanNumber = item.challan_number || '--';
  const tdsAmount = parseFloat(item.total_tds_amount) || 0;
  const surcharge = parseFloat(item.total_surcharge) || 0;
  const cess = parseFloat(item.total_cess) || 0;
  const totalAmount = parseFloat(item.total_amount) || parseFloat(item.amount) || (tdsAmount + surcharge + cess);

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/tds-challans')}
            className="p-2 rounded-lg hover:bg-[#F3F4F6] transition-colors"
          >
            <HiOutlineArrowLeft className="w-5 h-5 text-[#6B7280]" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-[#333]">
                Challan {challanNumber}
              </h1>
              <StatusBadge status={item.status} />
            </div>
            <p className="text-sm text-[#6B7280] mt-0.5">
              {formatDate(item.deposit_date || item.challan_date)}
              {item.bsr_code ? ` | BSR: ${item.bsr_code}` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => printPdf(`/api/pdf/tds-challan/${id}`)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--zoho-text-secondary)] bg-white border border-[var(--zoho-border)] px-3 py-2 rounded-md hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <HiOutlinePrinter className="w-4 h-4" />
            Print
          </button>
          <button
            onClick={() => openPdf(`/api/pdf/tds-challan/${id}`)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--zoho-text-secondary)] bg-white border border-[var(--zoho-border)] px-3 py-2 rounded-md hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <HiOutlineDocumentText className="w-4 h-4" />
            PDF
          </button>
          <Link
            to={`/tds-challans/${id}/edit`}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-[#333] bg-white border border-[#E5E7EB] rounded-lg hover:bg-[#F9FAFB] transition-colors"
          >
            <HiOutlinePencilSquare className="w-4 h-4" /> Edit
          </Link>
          <button
            onClick={() => setShowDelete(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
          >
            <HiOutlineTrash className="w-4 h-4" /> Delete
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left */}
        <div className="lg:col-span-2 space-y-6">
          {/* Challan Info */}
          <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6">
            <h2 className="text-base font-semibold text-[#333] mb-4">Challan Information</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <InfoRow label="Challan Number" value={challanNumber} />
              <InfoRow label="BSR Code" value={item.bsr_code} />
              <InfoRow label="Deposit Date" value={formatDate(item.deposit_date || item.challan_date)} />
              <InfoRow label="Assessment Year" value={item.assessment_year ? `AY ${item.assessment_year}` : '--'} />
              <InfoRow label="Section" value={item.section ? `Sec ${item.section}` : '--'} />
              <InfoRow label="Status" value={<StatusBadge status={item.status} />} />
            </div>
          </div>

          {/* Amount Breakdown */}
          <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6">
            <h2 className="text-base font-semibold text-[#333] mb-4">Amount Breakdown</h2>
            <div className="space-y-3">
              <AmountRow label="TDS Amount" value={tdsAmount} />
              {surcharge > 0 && <AmountRow label="Surcharge" value={surcharge} />}
              {cess > 0 && <AmountRow label="Education Cess" value={cess} />}
              <div className="border-t border-[#E5E7EB] pt-3">
                <AmountRow label="Total Amount" value={totalAmount} bold />
              </div>
            </div>
          </div>

          {/* Payment Details */}
          {(item.payment_mode || item.bank_name) && (
            <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6">
              <h2 className="text-base font-semibold text-[#333] mb-4">Payment Details</h2>
              <div className="grid grid-cols-2 gap-4">
                <InfoRow label="Payment Mode" value={item.payment_mode} />
                <InfoRow label="Bank Name" value={item.bank_name} />
              </div>
            </div>
          )}
        </div>

        {/* Right */}
        <div className="space-y-6">
          {/* Total Amount Card */}
          <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6">
            <h2 className="text-base font-semibold text-[#333] mb-3">Total Deposit</h2>
            <p className="text-2xl font-bold text-[#333] mb-3">{formatIndianCurrency(totalAmount)}</p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-[#6B7280]">TDS Amount</span>
                <span className="font-semibold text-[#333]">{formatIndianCurrency(tdsAmount)}</span>
              </div>
              {(surcharge > 0 || cess > 0) && (
                <div className="flex justify-between text-sm">
                  <span className="text-[#6B7280]">Surcharge + Cess</span>
                  <span className="font-semibold text-[#333]">{formatIndianCurrency(surcharge + cess)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          {(item.remarks || item.notes) && (
            <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6">
              <h2 className="text-base font-semibold text-[#333] mb-3">Notes</h2>
              <p className="text-sm text-[#6B7280] whitespace-pre-wrap">{item.remarks || item.notes}</p>
            </div>
          )}

          {/* Activity */}
          <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6">
            <h2 className="text-base font-semibold text-[#333] mb-3">Activity</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Created</span>
                <span className="text-[#333]">{formatDate(item.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Updated</span>
                <span className="text-[#333]">{formatDate(item.updated_at)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => !deleting && setShowDelete(false)} />
          <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <HiOutlineExclamationTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#333]">Delete TDS Challan</h3>
                <p className="text-sm text-[#6B7280] mt-1">
                  Are you sure you want to delete Challan {challanNumber}? This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setShowDelete(false)}
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
                {deleting ? 'Deleting...' : 'Delete Challan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
