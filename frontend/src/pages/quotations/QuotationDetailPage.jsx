import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  HiOutlineArrowLeft,
  HiOutlinePencilSquare,
  HiOutlineTrash,
  HiOutlineDocumentText,
  HiOutlineDocumentDuplicate,
  HiOutlinePaperAirplane,
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiOutlineExclamationTriangle,
  HiOutlineMapPin,
  HiOutlineCalendarDays,
  HiOutlineCurrencyRupee,
  HiOutlineClipboardDocumentList,
  HiOutlinePrinter,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import apiClient from '../../api/client';
import { openPdf, printPdf } from '../../utils/pdf';
import ShareButton from '../../components/sharing/ShareButton';

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

/* ─── Status Badge ─────────────────────────────────────────────────────── */

function StatusBadge({ status }) {
  const styles = {
    Draft: 'bg-gray-100 text-gray-700 border-gray-200',
    Sent: 'bg-blue-50 text-blue-700 border-blue-200',
    Accepted: 'bg-green-50 text-green-700 border-green-200',
    Rejected: 'bg-red-50 text-red-700 border-red-200',
    Declined: 'bg-red-50 text-red-700 border-red-200',
    Expired: 'bg-orange-50 text-orange-700 border-orange-200',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status] || styles.Draft}`}>
      {status || 'Draft'}
    </span>
  );
}

/* ─── Info Row ─────────────────────────────────────────────────────────── */

function InfoRow({ label, value, icon: Icon }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      {Icon && <Icon className="w-4 h-4 text-[#6B7280] mt-0.5 flex-shrink-0" />}
      <div className="min-w-0">
        <p className="text-xs text-[#6B7280] font-medium uppercase tracking-wide">{label}</p>
        <p className="text-sm text-[#333] mt-0.5 break-words">{value || '--'}</p>
      </div>
    </div>
  );
}

const COMPANY_STATE = 'Haryana';

/* ─── Main Component ───────────────────────────────────────────────────── */

export default function QuotationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [quotation, setQuotation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  /* ── Fetch quotation ───────────────────────────────────────────────── */

  const fetchQuotation = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(`/quotations/${id}`);
      const data = response.data?.data;
      if (!data) {
        toast.error('Quotation not found');
        navigate('/quotations');
        return;
      }
      setQuotation(data);
    } catch (err) {
      if (err.response?.status === 404) {
        toast.error('Quotation not found');
        navigate('/quotations');
      }
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchQuotation();
  }, [fetchQuotation]);

  /* ── Actions ───────────────────────────────────────────────────────── */

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await apiClient.delete(`/quotations/${id}`);
      toast.success('Quotation deleted successfully');
      navigate('/quotations');
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Failed to delete quotation';
      toast.error(msg);
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const handleStatusUpdate = async (newStatus) => {
    setUpdatingStatus(true);
    try {
      await apiClient.put(`/quotations/${id}`, { status: newStatus });
      toast.success(`Quotation marked as ${newStatus}`);
      fetchQuotation();
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Failed to update status';
      toast.error(msg);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleConvertToInvoice = () => {
    navigate(`/invoices/new?from_quotation=${id}`);
  };

  /* ── Loading state ─────────────────────────────────────────────────── */

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#0071DC] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-[#6B7280]">Loading quotation...</span>
        </div>
      </div>
    );
  }

  if (!quotation) return null;

  /* ── Computed values ───────────────────────────────────────────────── */

  const items = quotation.items || [];
  const subtotal = Number(quotation.sub_total) || items.reduce((sum, item) => {
    return sum + ((Number(item.quantity) || 0) * (Number(item.rate) || 0));
  }, 0);
  const igst = Number(quotation.igst_amount) || 0;
  const cgst = Number(quotation.cgst_amount) || 0;
  const sgst = Number(quotation.sgst_amount) || 0;
  const freight = Number(quotation.freight_amount) || 0;
  const totalAmount = Number(quotation.total_amount) || 0;

  const placeOfSupply = quotation.bill_to_state || '';
  const isInterState = placeOfSupply && placeOfSupply.toLowerCase() !== COMPANY_STATE.toLowerCase();
  const totalTax = igst + cgst + sgst;

  // Status permissions
  const canEdit = quotation.status === 'Draft' || quotation.status === 'Sent';
  const canDelete = quotation.status === 'Draft';
  const canMarkSent = quotation.status === 'Draft';
  const canMarkAccepted = quotation.status === 'Draft' || quotation.status === 'Sent';
  const canMarkRejected = quotation.status === 'Draft' || quotation.status === 'Sent';
  const canConvert = quotation.status === 'Accepted';

  // Detect expired
  const isExpired = (() => {
    if (!quotation.expiry_date) return false;
    if (quotation.status === 'Accepted' || quotation.status === 'Rejected') return false;
    const expiry = new Date(quotation.expiry_date);
    const today = new Date();
    expiry.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return expiry < today;
  })();

  const displayStatus = isExpired && quotation.status !== 'Expired' && quotation.status !== 'Accepted' && quotation.status !== 'Rejected'
    ? 'Expired'
    : quotation.status;

  // Format address helper
  const formatAddress = (address, city, state) => {
    return [address, city, state].filter(Boolean).join(', ');
  };

  const billToFull = formatAddress(quotation.bill_to_address, quotation.bill_to_city, quotation.bill_to_state);
  const shipToFull = formatAddress(quotation.ship_to_address, quotation.ship_to_city, quotation.ship_to_state);

  return (
    <div>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/quotations')}
            className="p-2 rounded-lg hover:bg-[#F3F4F6] transition-colors"
            title="Back to quotations"
          >
            <HiOutlineArrowLeft className="w-5 h-5 text-[#6B7280]" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-[#333]">
                {quotation.quotation_number || 'Quotation'}
              </h1>
              <StatusBadge status={displayStatus} />
            </div>
            <p className="text-sm text-[#6B7280] mt-0.5">
              {quotation.customer_name || '--'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {canMarkSent && (
            <button
              onClick={() => handleStatusUpdate('Sent')}
              disabled={updatingStatus}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
            >
              <HiOutlinePaperAirplane className="w-4 h-4" />
              {updatingStatus ? 'Updating...' : 'Mark as Sent'}
            </button>
          )}
          {canMarkAccepted && (
            <button
              onClick={() => handleStatusUpdate('Accepted')}
              disabled={updatingStatus}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50"
            >
              <HiOutlineCheckCircle className="w-4 h-4" />
              {updatingStatus ? 'Updating...' : 'Accept'}
            </button>
          )}
          {canMarkRejected && (
            <button
              onClick={() => handleStatusUpdate('Rejected')}
              disabled={updatingStatus}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
            >
              <HiOutlineXCircle className="w-4 h-4" />
              {updatingStatus ? 'Updating...' : 'Reject'}
            </button>
          )}
          {canConvert && (
            <button
              onClick={handleConvertToInvoice}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors"
            >
              <HiOutlineDocumentDuplicate className="w-4 h-4" />
              Convert to Invoice
            </button>
          )}
          <button
              onClick={() => printPdf(`/api/pdf/quotation/${id}`)}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--zoho-text-secondary)] bg-white border border-[var(--zoho-border)] px-3 py-2 rounded-md hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <HiOutlinePrinter className="w-4 h-4" />
              Print
            </button>
            <button
              onClick={() => openPdf(`/api/pdf/quotation/${id}`)}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--zoho-text-secondary)] bg-white border border-[var(--zoho-border)] px-3 py-2 rounded-md hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <HiOutlineDocumentText className="w-4 h-4" />
              PDF
            </button>
            <ShareButton
              documentType="Quotation"
              documentNumber={quotation.quotation_number || ''}
              documentId={id}
              recipientName={quotation.customer_name || ''}
              recipientEmail={quotation.customer_email || ''}
              recipientPhone={quotation.customer_phone || quotation.customer_mobile || ''}
              amount={totalAmount}
              date={quotation.quotation_date}
              pdfUrl={`/api/pdf/quotation/${id}`}
            />
          {canEdit && (
            <Link
              to={`/quotations/${id}/edit`}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#0071DC] rounded-lg hover:bg-[#005BB5] transition-colors"
            >
              <HiOutlinePencilSquare className="w-4 h-4" />
              Edit
            </Link>
          )}
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

      {/* ── Expired Warning ────────────────────────────────────────────── */}
      {isExpired && (
        <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
            <HiOutlineExclamationTriangle className="w-4 h-4 text-orange-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-orange-800">This quotation has expired</p>
            <p className="text-xs text-orange-600 mt-0.5">
              Expiry date was {formatDate(quotation.expiry_date)}. You can still edit or create a new quotation.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* ── Quotation Info ──────────────────────────────────────────── */}
        <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6">
          <h2 className="text-sm font-semibold text-[#6B7280] uppercase tracking-wide mb-3 flex items-center gap-2">
            <HiOutlineDocumentText className="w-4 h-4" />
            Quotation Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-0">
            <InfoRow label="Quotation Date" value={formatDate(quotation.quotation_date)} icon={HiOutlineCalendarDays} />
            <InfoRow label="Expiry Date" value={formatDate(quotation.expiry_date)} icon={HiOutlineCalendarDays} />
            <InfoRow label="Status">
              <StatusBadge status={displayStatus} />
            </InfoRow>
            <InfoRow label="Customer" value={quotation.customer_name} />
            <InfoRow label="Currency" value={quotation.currency_code || 'INR'} icon={HiOutlineCurrencyRupee} />
          </div>
        </div>

        {/* ── Addresses ───────────────────────────────────────────────── */}
        {(billToFull || shipToFull) && (
          <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-3 flex items-center gap-2">
                  <HiOutlineMapPin className="w-4 h-4" />
                  Bill To
                </h3>
                {billToFull ? (
                  <div className="text-sm text-[#333] leading-relaxed whitespace-pre-wrap">
                    {quotation.bill_to_address && <div>{quotation.bill_to_address}</div>}
                    {(quotation.bill_to_city || quotation.bill_to_state) && (
                      <div>{[quotation.bill_to_city, quotation.bill_to_state].filter(Boolean).join(', ')}</div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-[#9CA3AF]">--</p>
                )}
              </div>
              <div>
                <h3 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-3 flex items-center gap-2">
                  <HiOutlineMapPin className="w-4 h-4" />
                  Ship To
                </h3>
                {shipToFull ? (
                  <div className="text-sm text-[#333] leading-relaxed whitespace-pre-wrap">
                    {quotation.ship_to_address && <div>{quotation.ship_to_address}</div>}
                    {(quotation.ship_to_city || quotation.ship_to_state) && (
                      <div>{[quotation.ship_to_city, quotation.ship_to_state].filter(Boolean).join(', ')}</div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-[#9CA3AF]">--</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Line Items Table ────────────────────────────────────────── */}
        <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E5E7EB]">
            <h3 className="text-sm font-semibold text-[#333] uppercase tracking-wide flex items-center gap-2">
              <HiOutlineClipboardDocumentList className="w-4 h-4 text-[#6B7280]" />
              Line Items ({items.length})
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider w-10">#</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider min-w-[200px]">Item</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider w-28">HSN/SAC</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-[#6B7280] uppercase tracking-wider w-20">Qty</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-[#6B7280] uppercase tracking-wider w-28">Rate</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-[#6B7280] uppercase tracking-wider w-20">GST %</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-[#6B7280] uppercase tracking-wider w-32">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <HiOutlineDocumentText className="w-10 h-10 text-[#D1D5DB] mx-auto mb-3" />
                      <p className="text-sm text-[#6B7280]">No line items</p>
                    </td>
                  </tr>
                ) : (
                  items.map((item, index) => {
                    const qty = Number(item.quantity) || 0;
                    const rate = Number(item.rate) || 0;
                    const amount = Number(item.amount) || qty * rate;

                    return (
                      <tr key={item.id || index} className="hover:bg-[#F9FAFB] transition-colors">
                        <td className="px-4 py-3 text-xs text-[#6B7280]">{index + 1}</td>
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-[#333]">{item.item_name || '--'}</div>
                          {item.description && (
                            <div className="text-xs text-[#6B7280] mt-0.5">{item.description}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-[#333]">{item.hsn_code || '--'}</td>
                        <td className="px-4 py-3 text-right text-sm text-[#333] tabular-nums">{qty || '--'}</td>
                        <td className="px-4 py-3 text-right text-sm text-[#333] tabular-nums">{formatIndianCurrency(rate)}</td>
                        <td className="px-4 py-3 text-right text-sm text-[#333] tabular-nums">
                          {Number(item.gst_rate) || 0}%
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-medium text-[#333] tabular-nums">
                          {formatIndianCurrency(amount)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Totals Section */}
          {items.length > 0 && (
            <div className="border-t border-[#E5E7EB] bg-[#F9FAFB]">
              <div className="flex justify-end px-6 py-5">
                <div className="w-full max-w-md space-y-2.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#6B7280]">Subtotal</span>
                    <span className="font-medium text-[#333] tabular-nums">{formatIndianCurrency(subtotal)}</span>
                  </div>

                  {/* GST Breakdown */}
                  {isInterState ? (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[#6B7280]">IGST</span>
                      <span className="text-[#333] tabular-nums">{formatIndianCurrency(igst || totalTax)}</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[#6B7280]">CGST</span>
                        <span className="text-[#333] tabular-nums">{formatIndianCurrency(cgst || totalTax / 2)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[#6B7280]">SGST</span>
                        <span className="text-[#333] tabular-nums">{formatIndianCurrency(sgst || totalTax / 2)}</span>
                      </div>
                    </>
                  )}

                  {/* Freight */}
                  {freight > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[#6B7280]">Freight / Shipping</span>
                      <span className="text-[#333] tabular-nums">{formatIndianCurrency(freight)}</span>
                    </div>
                  )}

                  {/* Total */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-300">
                    <span className="text-base font-bold text-[#333]">Total Amount</span>
                    <span className="text-lg font-bold text-[#0071DC] tabular-nums">
                      {formatIndianCurrency(totalAmount)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Terms & Remarks ─────────────────────────────────────────── */}
        {(quotation.remarks || quotation.terms_and_conditions) && (
          <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {quotation.remarks && (
                <div>
                  <h4 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-2">Remarks</h4>
                  <p className="text-sm text-[#333] whitespace-pre-wrap leading-relaxed">
                    {quotation.remarks}
                  </p>
                </div>
              )}
              {quotation.terms_and_conditions && (
                <div>
                  <h4 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-2">
                    Terms & Conditions
                  </h4>
                  <p className="text-sm text-[#333] whitespace-pre-wrap leading-relaxed">
                    {quotation.terms_and_conditions}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Delete Confirmation Modal ──────────────────────────────────── */}
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
                <h3 className="text-lg font-semibold text-[#333]">Delete Quotation</h3>
                <p className="text-sm text-[#6B7280] mt-1">
                  Are you sure you want to delete quotation{' '}
                  <strong>{quotation.quotation_number}</strong>? This action cannot be undone.
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
                {deleting ? 'Deleting...' : 'Delete Quotation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
