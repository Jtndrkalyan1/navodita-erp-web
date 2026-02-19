import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  HiOutlineArrowLeft,
  HiOutlinePencilSquare,
  HiOutlineTrash,
  HiOutlineCheckCircle,
  HiOutlineReceiptPercent,
  HiOutlineExclamationTriangle,
  HiOutlinePrinter,
  HiOutlineDocumentText,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { expenseApi } from '../../api/expense.api';
import { openPdf, printPdf } from '../../utils/pdf';
import ShareButton from '../../components/sharing/ShareButton';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  StatusBadge                                                        */
/* ------------------------------------------------------------------ */

const STATUS_CONFIG = {
  Pending: {
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-200',
  },
  Approved: {
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200',
  },
  Paid: {
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
    borderColor: 'border-green-200',
  },
  Rejected: {
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    borderColor: 'border-red-200',
  },
};

function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.Pending;
  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${config.bgColor} ${config.textColor} ${config.borderColor}`}
    >
      {status || 'Pending'}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  InfoRow                                                            */
/* ------------------------------------------------------------------ */

function InfoRow({ label, value }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <div className="min-w-0">
        <p className="text-xs text-[#6B7280] font-medium uppercase tracking-wide">
          {label}
        </p>
        <p className="text-sm text-[#333] mt-0.5 break-words">
          {value || '--'}
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function ExpenseDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [expense, setExpense] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [approving, setApproving] = useState(false);

  /* ---- fetch expense ---- */
  useEffect(() => {
    const fetchExpense = async () => {
      setLoading(true);
      try {
        const response = await expenseApi.getById(id);
        const data = response.data?.data;
        if (!data) {
          toast.error('Expense not found');
          navigate('/expenses');
          return;
        }
        setExpense(data);
      } catch (err) {
        if (err.response?.status === 404) {
          toast.error('Expense not found');
          navigate('/expenses');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchExpense();
  }, [id, navigate]);

  /* ---- delete ---- */
  const handleDelete = async () => {
    setDeleting(true);
    try {
      await expenseApi.remove(id);
      toast.success('Expense deleted successfully');
      navigate('/expenses');
    } catch (err) {
      if (err.response?.data?.error) {
        toast.error(err.response.data.error);
      }
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  /* ---- approve ---- */
  const handleApprove = async () => {
    setApproving(true);
    try {
      await expenseApi.update(id, { ...expense, status: 'Approved' });
      toast.success('Expense approved successfully');
      setExpense((prev) => ({ ...prev, status: 'Approved' }));
    } catch (err) {
      if (err.response?.data?.error) {
        toast.error(err.response.data.error);
      }
    } finally {
      setApproving(false);
    }
  };

  /* ---- loading ---- */
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#0071DC] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-[#6B7280]">
            Loading expense details...
          </span>
        </div>
      </div>
    );
  }

  if (!expense) return null;

  /* ---- derived values ---- */
  const canDelete = expense.status !== 'Paid';
  const gstRate = parseFloat(expense.gst_rate) || 0;
  const baseAmount = parseFloat(expense.amount) || 0;
  const gstAmount = parseFloat(expense.gst_amount) || 0;
  const totalAmount = parseFloat(expense.total_amount) || 0;

  /* ------------------------------------------------------------------ */
  /*  Render                                                             */
  /* ------------------------------------------------------------------ */

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/expenses')}
            className="p-2 rounded-lg hover:bg-[#F3F4F6] transition-colors"
            title="Back to expenses"
          >
            <HiOutlineArrowLeft className="w-5 h-5 text-[#6B7280]" />
          </button>
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-[#333]">
                {expense.expense_number || 'Expense Details'}
              </h1>
              <p className="text-sm text-[#6B7280] mt-0.5">
                {expense.category || 'Uncategorized'} expense
              </p>
            </div>
            <StatusBadge status={expense.status} />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => printPdf(`/api/pdf/expense/${id}`)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--zoho-text-secondary)] bg-white border border-[var(--zoho-border)] px-3 py-2 rounded-md hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <HiOutlinePrinter className="w-4 h-4" />
            Print
          </button>
          <button
            onClick={() => openPdf(`/api/pdf/expense/${id}`)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--zoho-text-secondary)] bg-white border border-[var(--zoho-border)] px-3 py-2 rounded-md hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <HiOutlineDocumentText className="w-4 h-4" />
            PDF
          </button>
          <ShareButton
            documentType="Expense"
            documentNumber={expense.expense_number || ''}
            documentId={id}
            recipientName={expense.vendor_name || expense.vendor?.display_name || ''}
            recipientEmail={expense.vendor?.email || ''}
            recipientPhone={expense.vendor?.phone || expense.vendor?.mobile || ''}
            amount={totalAmount}
            date={expense.expense_date}
            pdfUrl={`/api/pdf/expense/${id}`}
          />
          {expense.status === 'Pending' && (
            <button
              onClick={handleApprove}
              disabled={approving}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {approving ? (
                <div className="w-4 h-4 border-2 border-green-700 border-t-transparent rounded-full animate-spin" />
              ) : (
                <HiOutlineCheckCircle className="w-4 h-4" />
              )}
              {approving ? 'Approving...' : 'Approve'}
            </button>
          )}
          <Link
            to={`/expenses/${id}/edit`}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-[#333] bg-white border border-[#E5E7EB] rounded-lg hover:bg-[#F9FAFB] transition-colors"
          >
            <HiOutlinePencilSquare className="w-4 h-4" />
            Edit
          </Link>
          {canDelete && (
            <button
              onClick={() => setShowDeleteModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
            >
              <HiOutlineTrash className="w-4 h-4" />
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Amount Banner */}
      <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-lg bg-red-100 flex items-center justify-center">
              <HiOutlineReceiptPercent className="w-7 h-7 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-[#6B7280] font-medium uppercase tracking-wide">
                Total Expense
              </p>
              <p className="text-3xl font-bold text-[#333] mt-1">
                {formatIndianCurrency(totalAmount)}
              </p>
            </div>
          </div>

          {/* Amounts breakdown */}
          <div className="text-right space-y-1">
            <div className="flex items-center justify-end gap-4 text-sm">
              <span className="text-[#6B7280]">Base Amount:</span>
              <span className="font-medium text-[#333] w-28 text-right">
                {formatIndianCurrency(baseAmount)}
              </span>
            </div>
            <div className="flex items-center justify-end gap-4 text-sm">
              <span className="text-[#6B7280]">
                GST{gstRate > 0 ? ` (${gstRate}%)` : ''}:
              </span>
              <span className="font-medium text-[#333] w-28 text-right">
                {formatIndianCurrency(gstAmount)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Expense Info Section */}
          <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6">
            <h2 className="text-base font-semibold text-[#333] mb-4">
              Expense Info
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
              <InfoRow
                label="Expense Number"
                value={expense.expense_number}
              />
              <InfoRow
                label="Expense Date"
                value={formatDate(expense.expense_date)}
              />
              <InfoRow label="Category" value={expense.category} />
              <InfoRow
                label="Vendor"
                value={
                  expense.vendor_name || expense.vendor?.display_name
                }
              />
              <InfoRow
                label="Customer"
                value={
                  expense.customer_name || expense.customer?.display_name
                }
              />
              <InfoRow
                label="Billable"
                value={expense.is_billable ? 'Yes' : 'No'}
              />
            </div>
          </div>

          {/* Financial Section */}
          <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6">
            <h2 className="text-base font-semibold text-[#333] mb-4">
              Financial
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
              <InfoRow
                label="Base Amount"
                value={formatIndianCurrency(baseAmount)}
              />
              <InfoRow
                label="GST Rate"
                value={gstRate > 0 ? `${gstRate}%` : 'No GST'}
              />
              <InfoRow
                label="GST Amount"
                value={formatIndianCurrency(gstAmount)}
              />
              <InfoRow
                label="Total Amount"
                value={formatIndianCurrency(totalAmount)}
              />
            </div>
          </div>

          {/* Payment Info Section */}
          <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6">
            <h2 className="text-base font-semibold text-[#333] mb-4">
              Payment Info
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
              <InfoRow label="Status" value={expense.status} />
              <InfoRow label="Payment Mode" value={expense.payment_mode} />
              <InfoRow
                label="Reference Number"
                value={expense.reference_number}
              />
            </div>
          </div>

          {/* Description */}
          {expense.description && (
            <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6">
              <h2 className="text-base font-semibold text-[#333] mb-3">
                Description
              </h2>
              <p className="text-sm text-[#6B7280] whitespace-pre-wrap">
                {expense.description}
              </p>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Amount Summary Card */}
          <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6">
            <h2 className="text-base font-semibold text-[#333] mb-3">
              Amount Summary
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Base Amount</span>
                <span className="font-medium text-[#333]">
                  {formatIndianCurrency(baseAmount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B7280]">
                  GST{gstRate > 0 ? ` (${gstRate}%)` : ''}
                </span>
                <span className="font-medium text-[#333]">
                  {formatIndianCurrency(gstAmount)}
                </span>
              </div>
              <div className="flex justify-between pt-3 border-t border-[#E5E7EB]">
                <span className="text-[#333] font-semibold">Total</span>
                <span className="font-bold text-[#333]">
                  {formatIndianCurrency(totalAmount)}
                </span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {expense.notes && (
            <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6">
              <h2 className="text-base font-semibold text-[#333] mb-3">
                Notes
              </h2>
              <p className="text-sm text-[#6B7280] whitespace-pre-wrap">
                {expense.notes}
              </p>
            </div>
          )}

          {/* Timestamps */}
          <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6">
            <h2 className="text-base font-semibold text-[#333] mb-3">
              Activity
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Created</span>
                <span className="text-[#333]">
                  {formatDate(expense.created_at)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Last Updated</span>
                <span className="text-[#333]">
                  {formatDate(expense.updated_at)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal (only if not Paid) */}
      {showDeleteModal && canDelete && (
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
                  Delete Expense
                </h3>
                <p className="text-sm text-[#6B7280] mt-1">
                  Are you sure you want to delete expense{' '}
                  <strong>{expense.expense_number}</strong>? This action
                  cannot be undone.
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
                {deleting ? 'Deleting...' : 'Delete Expense'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
