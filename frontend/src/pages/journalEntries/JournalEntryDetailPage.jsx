import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  HiOutlineArrowLeft,
  HiOutlinePencilSquare,
  HiOutlineTrash,
  HiOutlineExclamationTriangle,
  HiOutlineDocumentText,
  HiOutlinePrinter,
  HiOutlineCalendarDays,
  HiOutlineHashtag,
  HiOutlineBookOpen,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import apiClient from '../../api/client';
import { openPdf, printPdf } from '../../utils/pdf';

// ── Helpers ─────────────────────────────────────────────────────

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

// ── Status Badge ────────────────────────────────────────────────

function StatusBadge({ status }) {
  const styles = {
    Draft: 'bg-gray-100 text-gray-700 border-gray-300',
    Posted: 'bg-green-50 text-green-700 border-green-200',
    Reversed: 'bg-red-50 text-red-700 border-red-200',
    Approved: 'bg-blue-50 text-blue-700 border-blue-200',
    Voided: 'bg-red-50 text-red-700 border-red-200',
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
        styles[status] || styles.Draft
      }`}
    >
      {status || 'Draft'}
    </span>
  );
}

// ── Main Component ──────────────────────────────────────────────

export default function JournalEntryDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [entry, setEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ── Fetch entry ─────────────────────────────────────────────

  useEffect(() => {
    const fetchEntry = async () => {
      setLoading(true);
      try {
        const response = await apiClient.get(`/journal-entries/${id}`);
        const data = response.data?.data;
        if (!data) {
          toast.error('Journal entry not found');
          navigate('/journal-entries');
          return;
        }
        setEntry(data);
      } catch (err) {
        if (err.response?.status === 404) {
          toast.error('Journal entry not found');
          navigate('/journal-entries');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchEntry();
  }, [id, navigate]);

  // ── Delete handler ──────────────────────────────────────────

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await apiClient.delete(`/journal-entries/${id}`);
      toast.success('Journal entry deleted successfully');
      navigate('/journal-entries');
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Failed to delete journal entry';
      toast.error(msg);
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  // ── Loading state ───────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#0071DC] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-[#6B7280]">Loading journal entry...</span>
        </div>
      </div>
    );
  }

  if (!entry) return null;

  const lines = entry.lines || [];
  const isDraft = entry.status === 'Draft';
  const totalDebit = Number(entry.total_debit) || 0;
  const totalCredit = Number(entry.total_credit) || 0;
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  // ── Render ──────────────────────────────────────────────────

  return (
    <div className="pb-8">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/journal-entries')}
            className="p-2 rounded-lg hover:bg-[#F3F4F6] transition-colors"
            title="Back to Journal Entries"
          >
            <HiOutlineArrowLeft className="w-5 h-5 text-[#6B7280]" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-[#333]">
                {entry.entry_number || 'Journal Entry'}
              </h1>
              <StatusBadge status={entry.status} />
            </div>
            <p className="text-sm text-[#6B7280] mt-0.5">
              {formatDate(entry.entry_date)}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => printPdf(`/api/pdf/journal-entry/${id}`)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--zoho-text-secondary)] bg-white border border-[var(--zoho-border)] px-3 py-2 rounded-md hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <HiOutlinePrinter className="w-4 h-4" />
            Print
          </button>
          <button
            onClick={() => openPdf(`/api/pdf/journal-entry/${id}`)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--zoho-text-secondary)] bg-white border border-[var(--zoho-border)] px-3 py-2 rounded-md hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <HiOutlineDocumentText className="w-4 h-4" />
            PDF
          </button>
          {isDraft && (
            <>
            <Link
              to={`/journal-entries/${id}/edit`}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-[#333] bg-white border border-[#E5E7EB] rounded-lg hover:bg-[#F9FAFB] transition-colors"
            >
              <HiOutlinePencilSquare className="w-4 h-4" />
              Edit
            </Link>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
            >
              <HiOutlineTrash className="w-4 h-4" />
              Delete
            </button>
            </>
          )}
        </div>
      </div>

      {/* ── Entry Info ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6">
            <h2 className="text-base font-semibold text-[#333] mb-4 flex items-center gap-2">
              <HiOutlineBookOpen className="w-5 h-5 text-[#0071DC]" />
              Entry Information
            </h2>
            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              <div>
                <p className="text-xs text-[#6B7280] font-medium uppercase tracking-wide">
                  Entry Number
                </p>
                <p className="text-sm text-[#333] mt-1 font-medium">
                  {entry.entry_number || '--'}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#6B7280] font-medium uppercase tracking-wide">
                  Entry Date
                </p>
                <p className="text-sm text-[#333] mt-1 flex items-center gap-1.5">
                  <HiOutlineCalendarDays className="w-4 h-4 text-[#6B7280]" />
                  {formatDate(entry.entry_date)}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#6B7280] font-medium uppercase tracking-wide">
                  Reference
                </p>
                <p className="text-sm text-[#333] mt-1 font-mono flex items-center gap-1.5">
                  <HiOutlineHashtag className="w-4 h-4 text-[#6B7280]" />
                  {entry.reference || '--'}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#6B7280] font-medium uppercase tracking-wide">
                  Status
                </p>
                <div className="mt-1">
                  <StatusBadge status={entry.status} />
                </div>
              </div>
              {entry.description && (
                <div className="col-span-2">
                  <p className="text-xs text-[#6B7280] font-medium uppercase tracking-wide">
                    Description
                  </p>
                  <p className="text-sm text-[#333] mt-1 whitespace-pre-wrap">
                    {entry.description}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar cards */}
        <div className="space-y-6">
          {/* Totals Card */}
          <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6">
            <h2 className="text-base font-semibold text-[#333] mb-3">Totals</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-[#6B7280]">Total Debit</span>
                <span className="text-sm font-semibold text-[#333] tabular-nums">
                  {formatIndianCurrency(totalDebit)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-[#6B7280]">Total Credit</span>
                <span className="text-sm font-semibold text-[#333] tabular-nums">
                  {formatIndianCurrency(totalCredit)}
                </span>
              </div>
              <div className="border-t border-[#E5E7EB] pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#6B7280]">Difference</span>
                  <span
                    className={`text-sm font-semibold tabular-nums ${
                      isBalanced ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {isBalanced
                      ? 'Balanced'
                      : formatIndianCurrency(Math.abs(totalDebit - totalCredit))}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes Card */}
          {(entry.notes || entry.description) && (
            <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6">
              <h2 className="text-base font-semibold text-[#333] mb-3">Notes</h2>
              <p className="text-sm text-[#6B7280] whitespace-pre-wrap">
                {entry.notes || entry.description}
              </p>
            </div>
          )}

          {/* Activity Card */}
          <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6">
            <h2 className="text-base font-semibold text-[#333] mb-3">Activity</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Created</span>
                <span className="text-[#333]">{formatDate(entry.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Updated</span>
                <span className="text-[#333]">{formatDate(entry.updated_at)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Journal Lines Table ─────────────────────────────────── */}
      <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E5E7EB] flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#333] flex items-center gap-2">
            <HiOutlineDocumentText className="w-5 h-5 text-[#0071DC]" />
            Journal Lines
          </h2>
          <span className="text-xs text-[#6B7280] bg-[#F3F4F6] px-2 py-1 rounded-full">
            {lines.length} {lines.length === 1 ? 'line' : 'lines'}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider w-10">
                  #
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                  Account Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                  Debit
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                  Credit
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {lines.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="py-12 text-center text-sm text-[#9CA3AF]"
                  >
                    <HiOutlineDocumentText className="w-8 h-8 mx-auto mb-2 text-[#D1D5DB]" />
                    No journal lines recorded
                  </td>
                </tr>
              ) : (
                lines.map((line, index) => (
                  <tr key={line.id || index} className="hover:bg-[#F9FAFB] transition-colors">
                    <td className="px-6 py-3 text-xs text-[#9CA3AF]">{index + 1}</td>
                    <td className="px-6 py-3">
                      <span className="font-medium text-[#333]">
                        {line.account_name || '--'}
                      </span>
                      {line.account_code && (
                        <p className="text-xs text-[#9CA3AF] mt-0.5">
                          {line.account_code}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-3 text-[#6B7280]">
                      {line.description || '--'}
                    </td>
                    <td className="px-6 py-3 text-right font-medium text-[#333] tabular-nums">
                      {Number(line.debit_amount || line.debit) > 0
                        ? formatIndianCurrency(line.debit_amount || line.debit)
                        : '--'}
                    </td>
                    <td className="px-6 py-3 text-right font-medium text-[#333] tabular-nums">
                      {Number(line.credit_amount || line.credit) > 0
                        ? formatIndianCurrency(line.credit_amount || line.credit)
                        : '--'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {lines.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-[#E5E7EB] bg-[#F9FAFB]">
                  <td colSpan={3} className="px-6 py-3 text-right text-sm font-semibold text-[#333]">
                    Totals
                  </td>
                  <td className="px-6 py-3 text-right text-sm font-bold text-[#333] tabular-nums">
                    {formatIndianCurrency(totalDebit)}
                  </td>
                  <td className="px-6 py-3 text-right text-sm font-bold text-[#333] tabular-nums">
                    {formatIndianCurrency(totalCredit)}
                  </td>
                </tr>
                {!isBalanced && (
                  <tr className="bg-red-50">
                    <td colSpan={3} className="px-6 py-2 text-right text-xs font-medium text-red-600">
                      <HiOutlineExclamationTriangle className="w-4 h-4 inline mr-1" />
                      Entry is not balanced
                    </td>
                    <td colSpan={2} className="px-6 py-2 text-right text-xs font-medium text-red-600 tabular-nums">
                      Difference: {formatIndianCurrency(Math.abs(totalDebit - totalCredit))}
                    </td>
                  </tr>
                )}
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* ── Delete Confirmation Modal ───────────────────────────── */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => !deleting && setShowDeleteModal(false)}
          />
          <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <HiOutlineExclamationTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#333]">
                  Delete Journal Entry
                </h3>
                <p className="text-sm text-[#6B7280] mt-1">
                  Are you sure you want to delete entry{' '}
                  <strong>{entry.entry_number}</strong>? This action cannot be
                  undone.
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
                {deleting && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                {deleting ? 'Deleting...' : 'Delete Entry'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
