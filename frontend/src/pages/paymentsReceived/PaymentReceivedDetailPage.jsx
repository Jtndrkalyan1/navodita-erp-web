import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  HiOutlineArrowLeft,
  HiOutlinePencilSquare,
  HiOutlineTrash,
  HiOutlineBanknotes,
  HiOutlineExclamationTriangle,
  HiOutlinePrinter,
  HiOutlineDocumentText,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { paymentReceivedApi } from '../../api/paymentReceived.api';
import { openPdf, printPdf } from '../../utils/pdf';
import ShareButton from '../../components/sharing/ShareButton';

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

function InfoRow({ label, value }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <div className="min-w-0">
        <p className="text-xs text-[#6B7280] font-medium uppercase tracking-wide">{label}</p>
        <p className="text-sm text-[#333] mt-0.5 break-words">{value || '--'}</p>
      </div>
    </div>
  );
}

export default function PaymentReceivedDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchPayment = async () => {
      setLoading(true);
      try {
        const response = await paymentReceivedApi.getById(id);
        const data = response.data?.data;
        if (!data) {
          toast.error('Payment not found');
          navigate('/payments-received');
          return;
        }
        setPayment(data);
      } catch (err) {
        if (err.response?.status === 404) {
          toast.error('Payment not found');
          navigate('/payments-received');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchPayment();
  }, [id, navigate]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await paymentReceivedApi.remove(id);
      toast.success('Payment deleted successfully');
      navigate('/payments-received');
    } catch (err) {
      if (err.response?.data?.error) {
        toast.error(err.response.data.error);
      }
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#0071DC] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-[#6B7280]">Loading payment details...</span>
        </div>
      </div>
    );
  }

  if (!payment) return null;

  const allocations = payment.allocations || [];
  const totalAllocated = allocations.reduce((sum, a) => sum + (parseFloat(a.apply_amount) || 0), 0);
  const paymentAmount = parseFloat(payment.amount) || 0;
  const unallocated = paymentAmount - totalAllocated;

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/payments-received')}
            className="p-2 rounded-lg hover:bg-[#F3F4F6] transition-colors"
            title="Back to payments"
          >
            <HiOutlineArrowLeft className="w-5 h-5 text-[#6B7280]" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-[#333]">
              {payment.payment_number || 'Payment Details'}
            </h1>
            <p className="text-sm text-[#6B7280] mt-0.5">
              Payment from {payment.customer_name || payment.customer?.display_name || 'Unknown'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
              onClick={() => printPdf(`/api/pdf/payment-received/${id}`)}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--zoho-text-secondary)] bg-white border border-[var(--zoho-border)] px-3 py-2 rounded-md hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <HiOutlinePrinter className="w-4 h-4" />
              Print
            </button>
            <button
              onClick={() => openPdf(`/api/pdf/payment-received/${id}`)}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--zoho-text-secondary)] bg-white border border-[var(--zoho-border)] px-3 py-2 rounded-md hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <HiOutlineDocumentText className="w-4 h-4" />
              PDF
            </button>
            <ShareButton
              documentType="Payment Receipt"
              documentNumber={payment.payment_number || ''}
              documentId={id}
              recipientName={payment.customer_name || payment.customer?.display_name || ''}
              recipientEmail={payment.customer?.email || ''}
              recipientPhone={payment.customer?.phone || payment.customer?.mobile || ''}
              amount={payment.amount}
              date={payment.payment_date}
              pdfUrl={`/api/pdf/payment-received/${id}`}
            />
          <Link
            to={`/payments-received/${id}/edit`}
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
        </div>
      </div>

      {/* Amount Banner */}
      <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-lg bg-green-100 flex items-center justify-center">
            <HiOutlineBanknotes className="w-7 h-7 text-green-600" />
          </div>
          <div>
            <p className="text-xs text-[#6B7280] font-medium uppercase tracking-wide">Amount Received</p>
            <p className="text-3xl font-bold text-[#333] mt-1">{formatIndianCurrency(payment.amount)}</p>
            {payment.currency_code && payment.currency_code !== 'INR' && payment.original_amount && (
              <p className="text-sm text-[#6B7280] mt-1">
                {payment.currency_code} {Number(payment.original_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })} @ {'\u20B9'}{Number(payment.exchange_rate).toFixed(4)} per {payment.currency_code}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Payment Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6">
            <h2 className="text-base font-semibold text-[#333] mb-4">Payment Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
              <InfoRow label="Payment Number" value={payment.payment_number} />
              <InfoRow label="Payment Date" value={formatDate(payment.payment_date)} />
              <InfoRow label="Customer" value={payment.customer_name || payment.customer?.display_name} />
              <InfoRow label="Payment Mode" value={payment.payment_mode} />
              <InfoRow label="Reference Number" value={payment.reference_number} />
              <InfoRow label="Currency" value={payment.currency_code || 'INR'} />
              {payment.currency_code && payment.currency_code !== 'INR' && (
                <>
                  <InfoRow
                    label={`Original Amount (${payment.currency_code})`}
                    value={payment.original_amount != null ? `${payment.currency_code} ${Number(payment.original_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '--'}
                  />
                  <InfoRow
                    label="Exchange Rate"
                    value={payment.exchange_rate ? `1 ${payment.currency_code} = \u20B9${Number(payment.exchange_rate).toFixed(4)}` : '--'}
                  />
                </>
              )}
              <InfoRow label="Bank Charge" value={payment.bank_charge ? formatIndianCurrency(payment.bank_charge) : '--'} />
            </div>
          </div>

          {/* Invoice Allocations */}
          {allocations.length > 0 && (
            <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6">
              <h2 className="text-base font-semibold text-[#333] mb-4">Invoice Allocations</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Invoice #</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Date</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Invoice Amount</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Applied</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB]">
                    {allocations.map((alloc, index) => (
                      <tr key={index} className="hover:bg-[#F9FAFB]">
                        <td className="px-4 py-2.5 font-medium text-[#0071DC]">
                          {alloc.invoice_number || '--'}
                        </td>
                        <td className="px-4 py-2.5 text-[#6B7280]">
                          {formatDate(alloc.invoice_date)}
                        </td>
                        <td className="px-4 py-2.5 text-right text-[#333]">
                          {formatIndianCurrency(alloc.total_amount)}
                        </td>
                        <td className="px-4 py-2.5 text-right font-medium text-green-600">
                          {formatIndianCurrency(alloc.apply_amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Allocation Summary */}
              <div className="mt-4 pt-4 border-t border-[#E5E7EB]">
                <div className="flex justify-end">
                  <div className="w-64 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[#6B7280]">Total Allocated</span>
                      <span className="font-medium text-[#333]">{formatIndianCurrency(totalAllocated)}</span>
                    </div>
                    {unallocated > 0 && (
                      <div className="flex justify-between">
                        <span className="text-[#6B7280]">Unallocated</span>
                        <span className="font-medium text-orange-600">{formatIndianCurrency(unallocated)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Notes + Timestamps */}
        <div className="space-y-6">
          {/* Notes */}
          {payment.notes && (
            <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6">
              <h2 className="text-base font-semibold text-[#333] mb-3">Notes</h2>
              <p className="text-sm text-[#6B7280] whitespace-pre-wrap">{payment.notes}</p>
            </div>
          )}

          {/* Timestamps */}
          <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6">
            <h2 className="text-base font-semibold text-[#333] mb-3">Activity</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Created</span>
                <span className="text-[#333]">{formatDate(payment.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Last Updated</span>
                <span className="text-[#333]">{formatDate(payment.updated_at)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
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
                <h3 className="text-lg font-semibold text-[#333]">Delete Payment</h3>
                <p className="text-sm text-[#6B7280] mt-1">
                  Are you sure you want to delete payment <strong>{payment.payment_number}</strong>?
                  This will also remove all invoice allocations. This action cannot be undone.
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
                {deleting ? 'Deleting...' : 'Delete Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
