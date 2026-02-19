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
import { tdsLiabilityApi } from '../../api/tdsLiability.api';
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
    Pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    Deposited: 'bg-green-50 text-green-700 border-green-200',
    Filed: 'bg-blue-50 text-blue-700 border-blue-200',
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

export default function TDSLiabilityDetailPage() {
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
      const res = await tdsLiabilityApi.getById(id);
      const d = res.data?.data || res.data;
      if (!d) {
        setError('TDS Liability not found');
        return;
      }
      setItem(d);
    } catch (err) {
      if (err.response?.status === 404) {
        setError('TDS Liability not found');
      } else if (err.response?.status !== 401) {
        setError('Failed to load TDS liability');
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
      await tdsLiabilityApi.remove(id);
      toast.success('TDS Liability deleted successfully');
      navigate('/tds-liabilities', { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Failed to delete liability';
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
          <span className="text-sm text-[#6B7280]">Loading liability...</span>
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
        <Link to="/tds-liabilities" className="text-sm text-[#0071DC] hover:underline">
          Back to TDS Liabilities
        </Link>
      </div>
    );
  }

  if (!item) return null;

  // ── Computed ─────────────────────────────────────────────────────

  const deducteeName = item.deductee_name || item.vendor_name || '--';
  const baseAmount = parseFloat(item.base_amount) || parseFloat(item.payment_amount) || 0;
  const tdsRate = item.tds_rate;
  const tdsAmount = parseFloat(item.tds_amount) || 0;
  const surcharge = parseFloat(item.surcharge) || 0;
  const cess = parseFloat(item.cess) || 0;
  const totalTds = parseFloat(item.total_tds) || tdsAmount + surcharge + cess;

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/tds-liabilities')}
            className="p-2 rounded-lg hover:bg-[#F3F4F6] transition-colors"
          >
            <HiOutlineArrowLeft className="w-5 h-5 text-[#6B7280]" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-[#333]">
                {deducteeName} - Sec {item.section || '--'}
              </h1>
              <StatusBadge status={item.status} />
            </div>
            <p className="text-sm text-[#6B7280] mt-0.5">
              TDS Liability {item.deductee_pan ? `| PAN: ${item.deductee_pan}` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => printPdf(`/api/pdf/tds-liability/${id}`)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--zoho-text-secondary)] bg-white border border-[var(--zoho-border)] px-3 py-2 rounded-md hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <HiOutlinePrinter className="w-4 h-4" />
            Print
          </button>
          <button
            onClick={() => openPdf(`/api/pdf/tds-liability/${id}`)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--zoho-text-secondary)] bg-white border border-[var(--zoho-border)] px-3 py-2 rounded-md hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <HiOutlineDocumentText className="w-4 h-4" />
            PDF
          </button>
          <Link
            to={`/tds-liabilities/${id}/edit`}
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
          {/* Deductee Info */}
          <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6">
            <h2 className="text-base font-semibold text-[#333] mb-4">Deductee Information</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <InfoRow label="Deductee Name" value={deducteeName} />
              <InfoRow label="PAN" value={item.deductee_pan} />
              <InfoRow label="Deductee Type" value={item.deductee_type} />
              <InfoRow label="Section" value={item.section ? `Sec ${item.section}` : '--'} />
              <InfoRow label="Deduction Date" value={formatDate(item.deduction_date || item.payment_date)} />
              <InfoRow label="Status" value={<StatusBadge status={item.status} />} />
            </div>
          </div>

          {/* TDS Calculation */}
          <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6">
            <h2 className="text-base font-semibold text-[#333] mb-4">TDS Calculation</h2>
            <div className="space-y-3">
              <AmountRow label="Base Amount" value={baseAmount} />
              <div className="flex justify-between items-center">
                <span className="text-sm text-[#6B7280]">TDS Rate</span>
                <span className="text-sm font-semibold text-[#333]">
                  {tdsRate != null ? `${tdsRate}%` : '--'}
                </span>
              </div>
              <AmountRow label="TDS Amount" value={tdsAmount} />
              {surcharge > 0 && <AmountRow label="Surcharge" value={surcharge} />}
              {cess > 0 && <AmountRow label="Education Cess" value={cess} />}
              <div className="border-t border-[#E5E7EB] pt-3">
                <AmountRow label="Total TDS" value={totalTds} bold />
              </div>
            </div>
          </div>

          {/* Payment Info */}
          {(item.payment_date || item.challan_number) && (
            <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6">
              <h2 className="text-base font-semibold text-[#333] mb-4">Payment Information</h2>
              <div className="grid grid-cols-2 gap-4">
                <InfoRow label="Payment Date" value={formatDate(item.payment_date)} />
                <InfoRow label="Challan Number" value={item.challan_number} />
              </div>
            </div>
          )}
        </div>

        {/* Right */}
        <div className="space-y-6">
          {/* TDS Summary Card */}
          <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6">
            <h2 className="text-base font-semibold text-[#333] mb-3">TDS Summary</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-[#6B7280]">Base Amount</span>
                <span className="text-sm font-semibold text-[#333]">{formatIndianCurrency(baseAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-[#6B7280]">TDS @ {tdsRate != null ? `${tdsRate}%` : '--'}</span>
                <span className="text-sm font-semibold text-[#333]">{formatIndianCurrency(tdsAmount)}</span>
              </div>
              {(surcharge > 0 || cess > 0) && (
                <div className="flex justify-between">
                  <span className="text-sm text-[#6B7280]">Surcharge + Cess</span>
                  <span className="text-sm font-semibold text-[#333]">{formatIndianCurrency(surcharge + cess)}</span>
                </div>
              )}
              <div className="border-t border-[#E5E7EB] pt-3 flex justify-between">
                <span className="text-sm font-medium text-[#333]">Total TDS</span>
                <span className="text-base font-bold text-[#333]">{formatIndianCurrency(totalTds)}</span>
              </div>
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
                <h3 className="text-lg font-semibold text-[#333]">Delete TDS Liability</h3>
                <p className="text-sm text-[#6B7280] mt-1">
                  Are you sure you want to delete the TDS liability for {deducteeName} (Sec {item.section || '--'})?
                  This action cannot be undone.
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
                {deleting ? 'Deleting...' : 'Delete Liability'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
