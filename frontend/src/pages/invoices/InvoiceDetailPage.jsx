import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  HiOutlineArrowLeft,
  HiOutlinePencilSquare,
  HiOutlineTrash,
  HiOutlinePrinter,
  HiOutlineCheckCircle,
  HiOutlineDocumentText,
  HiOutlineBanknotes,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import apiClient from '../../api/client';
import { formatINR, formatCurrency, amountInWords } from '../../utils/currency';
import { openPdf, printPdf } from '../../utils/pdf';
import { formatIndianNumber } from '../../components/data-display/CurrencyCell';
import StatusBadge from '../../components/data-display/StatusBadge';
import DateCell from '../../components/data-display/DateCell';
import DetailRow from '../../components/data-display/DetailRow';
import LoadingSpinner from '../../components/feedback/LoadingSpinner';
import DeleteConfirmModal from '../../components/feedback/DeleteConfirmModal';
import ShareButton from '../../components/sharing/ShareButton';

const COMPANY_STATE = 'Haryana';

function computeItemAmount(item) {
  const qty = Number(item.quantity) || 0;
  const rate = Number(item.rate) || 0;
  return qty * rate;
}

function computeItemGst(item) {
  const amount = computeItemAmount(item);
  const gstRate = Number(item.gst_rate) || 0;
  return (amount * gstRate) / 100;
}

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [markingFinal, setMarkingFinal] = useState(false);

  // ── Fetch invoice ─────────────────────────────────────────────

  const fetchInvoice = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get(`/invoices/${id}`);
      const data = res.data.data || res.data;
      if (!data) {
        setError('Invoice not found');
        return;
      }
      setInvoice(data);
    } catch (err) {
      if (err.response?.status === 404) {
        setError('Invoice not found');
      } else if (err.response?.status !== 401) {
        setError('Failed to load invoice');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  // ── Actions ─────────────────────────────────────────────────────

  async function handleDelete() {
    setDeleting(true);
    try {
      await apiClient.delete(`/invoices/${id}`);
      toast.success('Invoice deleted successfully');
      navigate('/invoices', { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to delete invoice';
      toast.error(msg);
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  }

  async function handleMarkAsFinal() {
    setMarkingFinal(true);
    try {
      await apiClient.put(`/invoices/${id}`, { status: 'Sent' });
      toast.success('Invoice marked as Sent');
      fetchInvoice();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update invoice status';
      toast.error(msg);
    } finally {
      setMarkingFinal(false);
    }
  }

  // ── Loading / Error ─────────────────────────────────────────────

  if (loading) {
    return (
      <div className="py-20">
        <LoadingSpinner size="lg" label="Loading invoice..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-20 text-center">
        <HiOutlineDocumentText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-lg font-medium text-[var(--zoho-text)] mb-2">{error}</h2>
        <Link
          to="/invoices"
          className="text-sm text-[#0071DC] hover:underline"
        >
          Back to Invoices
        </Link>
      </div>
    );
  }

  if (!invoice) return null;

  // ── Compute display values ────────────────────────────────────

  const items = invoice.items || invoice.invoice_items || [];
  const customer = invoice.customer || {};
  const payments = invoice.payments || invoice.payments_received || [];

  const placeOfSupply = invoice.place_of_supply || invoice.bill_to_state || '';
  const isInterState = placeOfSupply && placeOfSupply.toLowerCase() !== COMPANY_STATE.toLowerCase();

  // Calculate totals from items
  let subtotal = Number(invoice.sub_total) || 0;
  let cgstTotal = Number(invoice.cgst_amount) || 0;
  let sgstTotal = Number(invoice.sgst_amount) || 0;
  let igstTotal = Number(invoice.igst_amount) || 0;
  const totalTax = Number(invoice.total_tax) || (cgstTotal + sgstTotal + igstTotal);
  const shipping = Number(invoice.shipping_charge) || 0;
  const totalAmount = Number(invoice.total_amount) || 0;
  const amountPaid = Number(invoice.amount_paid) || 0;
  const balanceDue = Number(invoice.balance_due) ?? Math.max(totalAmount - amountPaid, 0);

  // If backend didn't compute subtotal, calculate from items
  if (!subtotal && items.length > 0) {
    subtotal = items.reduce((sum, item) => sum + computeItemAmount(item), 0);
  }

  // Currency formatter scoped to this invoice's currency
  const currencyCode = invoice.currency_code || 'INR';
  const fmtAmt = (amt) => formatCurrency(amt, currencyCode);

  const canEdit = invoice.status === 'Draft';
  const canDelete = invoice.status === 'Draft';
  const canMarkFinal = invoice.status === 'Draft';

  // ── Detect overdue ────────────────────────────────────────────

  function isOverdue() {
    if (!invoice.due_date) return false;
    if (invoice.status === 'Paid' || invoice.status === 'Cancelled') return false;
    const due = new Date(invoice.due_date);
    const today = new Date();
    due.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return due < today;
  }

  const displayStatus = isOverdue() && invoice.status !== 'Overdue' ? 'Overdue' : invoice.status;

  // Format address
  function formatAddress(prefix) {
    const parts = [
      invoice[`${prefix}_attention`],
      invoice[`${prefix}_address_line1`],
      invoice[`${prefix}_address_line2`],
      [invoice[`${prefix}_city`], invoice[`${prefix}_state`], invoice[`${prefix}_pincode`]]
        .filter(Boolean)
        .join(', '),
      invoice[`${prefix}_country`],
    ].filter(Boolean);
    return parts;
  }

  const billToAddress = formatAddress('bill_to');
  const shipToAddress = formatAddress('ship_to');

  return (
    <div className="pb-8">
      {/* Header */}
      <div className="bg-white border-b border-[var(--zoho-border)] px-6 py-4 -mx-6 -mt-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/invoices')}
              className="p-1.5 rounded-md text-[var(--zoho-text-secondary)] hover:text-[var(--zoho-text)] hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <HiOutlineArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-semibold text-[var(--zoho-text)]">
                  {invoice.invoice_number || 'Invoice'}
                </h1>
                <StatusBadge status={displayStatus} />
              </div>
              {invoice.reference_number && (
                <p className="text-xs text-[var(--zoho-text-secondary)] mt-0.5">
                  Ref: {invoice.reference_number}
                </p>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {canMarkFinal && (
              <button
                onClick={handleMarkAsFinal}
                disabled={markingFinal}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-green-700 bg-green-50 border border-green-200 px-3 py-2 rounded-md hover:bg-green-100 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <HiOutlineCheckCircle className="w-4 h-4" />
                {markingFinal ? 'Updating...' : 'Mark as Final'}
              </button>
            )}

            <button
              onClick={() => printPdf(`/api/pdf/invoice/${id}`)}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--zoho-text-secondary)] bg-white border border-[var(--zoho-border)] px-3 py-2 rounded-md hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <HiOutlinePrinter className="w-4 h-4" />
              Print
            </button>
            <button
              onClick={() => openPdf(`/api/pdf/invoice/${id}`)}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--zoho-text-secondary)] bg-white border border-[var(--zoho-border)] px-3 py-2 rounded-md hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <HiOutlineDocumentText className="w-4 h-4" />
              PDF
            </button>
            <ShareButton
              documentType="Invoice"
              documentNumber={invoice.invoice_number || ''}
              documentId={id}
              recipientName={customer.display_name || customer.company_name || invoice.customer_name || ''}
              recipientEmail={customer.email || ''}
              recipientPhone={customer.phone || customer.mobile || ''}
              amount={totalAmount}
              date={invoice.invoice_date}
              pdfUrl={`/api/pdf/invoice/${id}`}
            />

            {canEdit && (
              <Link
                to={`/invoices/${id}/edit`}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-white bg-[#0071DC] px-3 py-2 rounded-md hover:bg-[#005BB5] transition-colors"
              >
                <HiOutlinePencilSquare className="w-4 h-4" />
                Edit
              </Link>
            )}

            {canDelete && (
              <button
                onClick={() => setShowDeleteModal(true)}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-red-600 bg-white border border-red-200 px-3 py-2 rounded-md hover:bg-red-50 transition-colors cursor-pointer"
              >
                <HiOutlineTrash className="w-4 h-4" />
                Delete
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* ── Overdue Warning Banner ─────────────────────────────── */}
        {isOverdue() && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-5 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
              <HiOutlineBanknotes className="w-4 h-4 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-red-800">This invoice is overdue</p>
              <p className="text-xs text-red-600 mt-0.5">
                Due date was <DateCell date={invoice.due_date} className="inline text-red-600 font-medium" />.
                Balance due: <span className="font-semibold">{fmtAmt(balanceDue)}</span>
              </p>
            </div>
          </div>
        )}

        {/* ── Invoice Header Info ────────────────────────────────── */}
        <div className="bg-white rounded-lg border border-[var(--zoho-border)] p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-0">
            <DetailRow label="Invoice Date">
              <DateCell date={invoice.invoice_date} />
            </DetailRow>
            <DetailRow label="Due Date">
              <DateCell
                date={invoice.due_date}
                className={isOverdue() ? 'text-red-600 font-medium' : ''}
              />
            </DetailRow>
            <DetailRow label="Status">
              <StatusBadge status={displayStatus} />
            </DetailRow>
            <DetailRow label="Customer">
              {customer.display_name || customer.company_name || invoice.customer_name || '--'}
            </DetailRow>
            <DetailRow label="Currency" value={invoice.currency_code || 'INR'} />
            <DetailRow label="Place of Supply" value={placeOfSupply || '--'} />
          </div>
        </div>

        {/* ── Addresses ──────────────────────────────────────────── */}
        {(billToAddress.length > 0 || shipToAddress.length > 0) && (
          <div className="bg-white rounded-lg border border-[var(--zoho-border)] p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Bill To */}
              <div>
                <h3 className="text-xs font-semibold text-[var(--zoho-text-secondary)] uppercase tracking-wide mb-3">
                  Bill To
                </h3>
                {billToAddress.length > 0 ? (
                  <div className="text-sm text-[var(--zoho-text)] leading-relaxed">
                    {billToAddress.map((line, i) => (
                      <div key={i}>{line}</div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[var(--zoho-text-secondary)]">--</p>
                )}
              </div>

              {/* Ship To */}
              <div>
                <h3 className="text-xs font-semibold text-[var(--zoho-text-secondary)] uppercase tracking-wide mb-3">
                  Ship To
                </h3>
                {shipToAddress.length > 0 ? (
                  <div className="text-sm text-[var(--zoho-text)] leading-relaxed">
                    {shipToAddress.map((line, i) => (
                      <div key={i}>{line}</div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[var(--zoho-text-secondary)]">--</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Line Items Table ───────────────────────────────────── */}
        <div className="bg-white rounded-lg border border-[var(--zoho-border)] overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--zoho-border)]">
            <h3 className="text-sm font-semibold text-[var(--zoho-text)] uppercase tracking-wide">
              Line Items
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-[var(--zoho-border)]">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--zoho-text-secondary)] w-10">
                    #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--zoho-text-secondary)] min-w-[200px]">
                    Item
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--zoho-text-secondary)] w-28">
                    HSN/SAC
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--zoho-text-secondary)] w-20">
                    Qty
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--zoho-text-secondary)] w-28">
                    Rate
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--zoho-text-secondary)] w-20">
                    GST %
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--zoho-text-secondary)] w-28">
                    GST Amt
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--zoho-text-secondary)] w-32">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => {
                  const amount = Number(item.amount) || computeItemAmount(item);
                  const gstAmt = computeItemGst(item);
                  return (
                    <tr
                      key={item.id || index}
                      className="border-b border-gray-100 hover:bg-gray-50/50"
                    >
                      <td className="px-4 py-3 text-xs text-[var(--zoho-text-secondary)]">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-[var(--zoho-text)]">
                          {item.item_name || '--'}
                        </div>
                        {item.description && (
                          <div className="text-xs text-[var(--zoho-text-secondary)] mt-0.5">
                            {item.description}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--zoho-text)]">
                        {item.hsn_code || '--'}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-[var(--zoho-text)] tabular-nums">
                        {item.quantity ?? '--'}
                        {item.unit && <span className="text-xs text-[var(--zoho-text-secondary)] ml-1">{item.unit}</span>}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-[var(--zoho-text)] tabular-nums">
                        {fmtAmt(Number(item.rate) || 0)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-[var(--zoho-text)] tabular-nums">
                        {Number(item.gst_rate) || 0}%
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-[var(--zoho-text)] tabular-nums">
                        {fmtAmt(gstAmt)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-[var(--zoho-text)] tabular-nums">
                        {fmtAmt(amount)}
                      </td>
                    </tr>
                  );
                })}

                {items.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-400">
                      No line items
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          {items.length > 0 && (
            <div className="border-t border-[var(--zoho-border)] bg-gray-50">
              <div className="flex justify-end px-6 py-5">
                <div className="w-full max-w-md space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--zoho-text-secondary)]">Subtotal</span>
                    <span className="font-medium text-[var(--zoho-text)] tabular-nums">
                      {fmtAmt(subtotal)}
                    </span>
                  </div>

                  {/* GST breakdown */}
                  {isInterState ? (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[var(--zoho-text-secondary)]">IGST</span>
                      <span className="text-[var(--zoho-text)] tabular-nums">
                        {fmtAmt(igstTotal || totalTax)}
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[var(--zoho-text-secondary)]">CGST</span>
                        <span className="text-[var(--zoho-text)] tabular-nums">
                          {fmtAmt(cgstTotal || totalTax / 2)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[var(--zoho-text-secondary)]">SGST</span>
                        <span className="text-[var(--zoho-text)] tabular-nums">
                          {fmtAmt(sgstTotal || totalTax / 2)}
                        </span>
                      </div>
                    </>
                  )}

                  {/* Shipping */}
                  {shipping > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[var(--zoho-text-secondary)]">Freight / Shipping</span>
                      <span className="text-[var(--zoho-text)] tabular-nums">
                        {fmtAmt(shipping)}
                      </span>
                    </div>
                  )}

                  {/* Total */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-300">
                    <span className="text-base font-bold text-[var(--zoho-text)]">Total</span>
                    <span className="text-lg font-bold text-[var(--zoho-text)] tabular-nums">
                      {fmtAmt(totalAmount)}
                    </span>
                  </div>

                  {/* Amount in words */}
                  {totalAmount > 0 && (
                    <div className="pt-1">
                      <p className="text-xs text-[var(--zoho-text-secondary)] italic leading-relaxed">
                        {currencyCode === 'INR' ? amountInWords(totalAmount) : `${currencyCode} ${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Only`}
                      </p>
                    </div>
                  )}

                  {/* Payment summary */}
                  {amountPaid > 0 && (
                    <>
                      <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-200 mt-2">
                        <span className="text-green-700">Amount Paid</span>
                        <span className="text-green-700 font-medium tabular-nums">
                          -{fmtAmt(amountPaid)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold text-[var(--zoho-text)]">Balance Due</span>
                        <span className={`font-semibold tabular-nums ${balanceDue > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                          {fmtAmt(balanceDue)}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Payment History ────────────────────────────────────── */}
        {payments.length > 0 && (
          <div className="bg-white rounded-lg border border-[var(--zoho-border)] overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--zoho-border)]">
              <h3 className="text-sm font-semibold text-[var(--zoho-text)] uppercase tracking-wide">
                Payment History
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-[var(--zoho-border)]">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--zoho-text-secondary)]">
                      Payment #
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--zoho-text-secondary)]">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--zoho-text-secondary)]">
                      Mode
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--zoho-text-secondary)]">
                      Reference
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--zoho-text-secondary)]">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment, index) => (
                    <tr
                      key={payment.id || index}
                      className="border-b border-gray-100 hover:bg-gray-50/50"
                    >
                      <td className="px-4 py-3 text-sm font-medium text-[#0071DC]">
                        {payment.payment_number || `PMT-${index + 1}`}
                      </td>
                      <td className="px-4 py-3">
                        <DateCell date={payment.payment_date} />
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--zoho-text)]">
                        {payment.payment_mode || '--'}
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--zoho-text)]">
                        {payment.reference_number || '--'}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-green-600 tabular-nums">
                        {fmtAmt(payment.allocated_amount || payment.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Notes ──────────────────────────────────────────────── */}
        {(invoice.customer_notes || invoice.terms_and_conditions || invoice.internal_notes) && (
          <div className="bg-white rounded-lg border border-[var(--zoho-border)] p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {invoice.customer_notes && (
                <div>
                  <h4 className="text-xs font-semibold text-[var(--zoho-text-secondary)] uppercase tracking-wide mb-2">
                    Customer Notes
                  </h4>
                  <p className="text-sm text-[var(--zoho-text)] whitespace-pre-wrap leading-relaxed">
                    {invoice.customer_notes}
                  </p>
                </div>
              )}
              {invoice.terms_and_conditions && (
                <div>
                  <h4 className="text-xs font-semibold text-[var(--zoho-text-secondary)] uppercase tracking-wide mb-2">
                    Terms & Conditions
                  </h4>
                  <p className="text-sm text-[var(--zoho-text)] whitespace-pre-wrap leading-relaxed">
                    {invoice.terms_and_conditions}
                  </p>
                </div>
              )}
            </div>
            {invoice.internal_notes && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <h4 className="text-xs font-semibold text-[var(--zoho-text-secondary)] uppercase tracking-wide mb-2">
                  Internal Notes
                </h4>
                <p className="text-sm text-[var(--zoho-text)] whitespace-pre-wrap leading-relaxed bg-yellow-50 border border-yellow-100 rounded-md px-3 py-2">
                  {invoice.internal_notes}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete Invoice"
        message={`Are you sure you want to delete invoice ${invoice.invoice_number || ''}? This action cannot be undone. Only draft invoices can be deleted.`}
        confirmLabel="Delete Invoice"
        loading={deleting}
      />
    </div>
  );
}
