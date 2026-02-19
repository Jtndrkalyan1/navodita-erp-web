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
import { gstFilingApi } from '../../api/gstFiling.api';
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
    Filed: 'bg-green-50 text-green-700 border-green-200',
    Late: 'bg-red-50 text-red-700 border-red-200',
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
      <span className={`text-sm ${bold ? 'font-medium text-[#333]' : 'text-[#6B7280]'}`}>
        {label}
      </span>
      <span className={`text-sm ${bold ? 'font-bold' : 'font-semibold'} ${color}`}>
        {formatIndianCurrency(value)}
      </span>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────

export default function GSTFilingDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [filing, setFiling] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ── Fetch filing ─────────────────────────────────────────────────

  const fetchFiling = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await gstFilingApi.getById(id);
      const d = res.data?.data || res.data;
      if (!d) {
        setError('GST Filing not found');
        return;
      }
      setFiling(d);
    } catch (err) {
      if (err.response?.status === 404) {
        setError('GST Filing not found');
      } else if (err.response?.status !== 401) {
        setError('Failed to load GST filing');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchFiling();
  }, [fetchFiling]);

  // ── Delete handler ───────────────────────────────────────────────

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await gstFilingApi.remove(id);
      toast.success('GST Filing deleted successfully');
      navigate('/gst-filings', { replace: true });
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Failed to delete filing';
      toast.error(msg);
    } finally {
      setDeleting(false);
      setShowDelete(false);
    }
  };

  // ── Loading state ────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#0071DC] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-[#6B7280]">Loading filing...</span>
        </div>
      </div>
    );
  }

  // ── Error state ──────────────────────────────────────────────────

  if (error) {
    return (
      <div className="py-20 text-center">
        <HiOutlineDocumentText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-lg font-medium text-[#333] mb-2">{error}</h2>
        <Link to="/gst-filings" className="text-sm text-[#0071DC] hover:underline">
          Back to GST Filings
        </Link>
      </div>
    );
  }

  if (!filing) return null;

  // ── Computed values ──────────────────────────────────────────────

  const returnType = filing.return_type || filing.filing_type || '--';
  const period = filing.filing_period || filing.period || '--';
  const totalIgst = parseFloat(filing.total_igst) || 0;
  const totalCgst = parseFloat(filing.total_cgst) || 0;
  const totalSgst = parseFloat(filing.total_sgst) || 0;
  const totalCess = parseFloat(filing.total_cess) || 0;
  const totalTaxLiability = parseFloat(filing.total_tax_liability) || (totalIgst + totalCgst + totalSgst + totalCess);
  const totalItc = parseFloat(filing.total_itc) || parseFloat(filing.total_itc_claimed) || 0;
  const netPayable = parseFloat(filing.net_tax_payable) || 0;
  const lateFee = parseFloat(filing.late_fee) || 0;
  const interest = parseFloat(filing.interest) || 0;
  const totalPayable = netPayable + lateFee + interest;

  // ── Render ───────────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/gst-filings')}
            className="p-2 rounded-lg hover:bg-[#F3F4F6] transition-colors"
          >
            <HiOutlineArrowLeft className="w-5 h-5 text-[#6B7280]" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-[#333]">
                {returnType} - {period}
              </h1>
              <StatusBadge status={filing.status} />
            </div>
            {filing.financial_year && (
              <p className="text-sm text-[#6B7280] mt-0.5">FY {filing.financial_year}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => printPdf(`/api/pdf/gst-filing/${id}`)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--zoho-text-secondary)] bg-white border border-[var(--zoho-border)] px-3 py-2 rounded-md hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <HiOutlinePrinter className="w-4 h-4" />
            Print
          </button>
          <button
            onClick={() => openPdf(`/api/pdf/gst-filing/${id}`)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--zoho-text-secondary)] bg-white border border-[var(--zoho-border)] px-3 py-2 rounded-md hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <HiOutlineDocumentText className="w-4 h-4" />
            PDF
          </button>
          <Link
            to={`/gst-filings/${id}/edit`}
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
        {/* Left: Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Filing Details */}
          <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6">
            <h2 className="text-base font-semibold text-[#333] mb-4">Filing Details</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <InfoRow label="Return Type" value={returnType} />
              <InfoRow label="Filing Period" value={period} />
              <InfoRow label="Financial Year" value={filing.financial_year ? `FY ${filing.financial_year}` : '--'} />
              <InfoRow label="Due Date" value={formatDate(filing.due_date)} />
              <InfoRow label="Filing Date" value={formatDate(filing.filing_date)} />
              <InfoRow
                label="Status"
                value={<StatusBadge status={filing.status} />}
              />
              <InfoRow
                label="ARN Number"
                value={filing.arn_number}
                className="col-span-2 md:col-span-3"
              />
            </div>
          </div>

          {/* Tax Liability Breakdown */}
          <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6">
            <h2 className="text-base font-semibold text-[#333] mb-4">Tax Liability</h2>
            <div className="space-y-3">
              <AmountRow label="IGST" value={totalIgst} />
              <AmountRow label="CGST" value={totalCgst} />
              <AmountRow label="SGST" value={totalSgst} />
              <AmountRow label="Cess" value={totalCess} />
              <div className="border-t border-[#E5E7EB] pt-3">
                <AmountRow label="Total Tax Liability" value={totalTaxLiability} bold />
              </div>
            </div>
          </div>

          {/* ITC Details */}
          <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6">
            <h2 className="text-base font-semibold text-[#333] mb-4">Input Tax Credit</h2>
            <div className="space-y-3">
              <AmountRow label="Total ITC Claimed" value={totalItc} color="text-green-600" />
              <div className="border-t border-[#E5E7EB] pt-3">
                <AmountRow label="Net Tax Payable" value={netPayable} bold />
              </div>
            </div>
          </div>

          {/* Payment Details */}
          {(lateFee > 0 || interest > 0) && (
            <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6">
              <h2 className="text-base font-semibold text-[#333] mb-4">Payment Details</h2>
              <div className="space-y-3">
                <AmountRow label="Net Tax Payable" value={netPayable} />
                {lateFee > 0 && (
                  <AmountRow label="Late Fee" value={lateFee} color="text-red-600" />
                )}
                {interest > 0 && (
                  <AmountRow label="Interest" value={interest} color="text-red-600" />
                )}
                <div className="border-t border-[#E5E7EB] pt-3">
                  <AmountRow label="Total Payable" value={totalPayable} bold />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Summary & Notes */}
        <div className="space-y-6">
          {/* Tax Summary Card */}
          <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6">
            <h2 className="text-base font-semibold text-[#333] mb-3">Tax Summary</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-[#6B7280]">Tax Liability</span>
                <span className="text-sm font-semibold text-[#333]">
                  {formatIndianCurrency(totalTaxLiability)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-[#6B7280]">ITC Claimed</span>
                <span className="text-sm font-semibold text-green-600">
                  {formatIndianCurrency(totalItc)}
                </span>
              </div>
              <div className="border-t border-[#E5E7EB] pt-3 flex justify-between">
                <span className="text-sm font-medium text-[#333]">Net Payable</span>
                <span className="text-sm font-bold text-[#333]">
                  {formatIndianCurrency(netPayable)}
                </span>
              </div>
              {(lateFee > 0 || interest > 0) && (
                <>
                  <div className="border-t border-[#E5E7EB] pt-3 flex justify-between">
                    <span className="text-sm text-[#6B7280]">Late Fee + Interest</span>
                    <span className="text-sm font-semibold text-red-600">
                      {formatIndianCurrency(lateFee + interest)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-[#333]">Total Payable</span>
                    <span className="text-base font-bold text-[#333]">
                      {formatIndianCurrency(totalPayable)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Notes */}
          {(filing.remarks || filing.notes) && (
            <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6">
              <h2 className="text-base font-semibold text-[#333] mb-3">Notes</h2>
              <p className="text-sm text-[#6B7280] whitespace-pre-wrap">
                {filing.remarks || filing.notes}
              </p>
            </div>
          )}

          {/* Activity */}
          <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6">
            <h2 className="text-base font-semibold text-[#333] mb-3">Activity</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Created</span>
                <span className="text-[#333]">{formatDate(filing.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Updated</span>
                <span className="text-[#333]">{formatDate(filing.updated_at)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => !deleting && setShowDelete(false)}
          />
          <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <HiOutlineExclamationTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#333]">Delete GST Filing</h3>
                <p className="text-sm text-[#6B7280] mt-1">
                  Are you sure you want to delete the {returnType} filing for {period}? This
                  action cannot be undone.
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
                {deleting && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                {deleting ? 'Deleting...' : 'Delete Filing'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
