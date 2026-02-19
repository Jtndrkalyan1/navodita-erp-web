import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  HiOutlineArrowLeft,
  HiOutlinePencilSquare,
  HiOutlineTrash,
  HiOutlineDocumentText,
  HiOutlinePrinter,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { creditNoteApi } from '../../api/creditNote.api';
import { openPdf, printPdf } from '../../utils/pdf';
import { formatINR, amountInWords } from '../../utils/currency';
import { formatIndianNumber } from '../../components/data-display/CurrencyCell';
import StatusBadge from '../../components/data-display/StatusBadge';
import DateCell from '../../components/data-display/DateCell';
import DetailRow from '../../components/data-display/DetailRow';
import LoadingSpinner from '../../components/feedback/LoadingSpinner';
import DeleteConfirmModal from '../../components/feedback/DeleteConfirmModal';
import ShareButton from '../../components/sharing/ShareButton';

// ── Constants ──────────────────────────────────────────────────────

const COMPANY_STATE = 'Haryana';

// ── Helpers ────────────────────────────────────────────────────────

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

// ── Component ──────────────────────────────────────────────────────

export default function CreditNoteDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [creditNote, setCreditNote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ── Fetch credit note ──────────────────────────────────────────

  const fetchCreditNote = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await creditNoteApi.getById(id);
      const data = res.data.data || res.data;
      if (!data) {
        setError('Credit note not found');
        return;
      }
      setCreditNote(data);
    } catch (err) {
      if (err.response?.status === 404) {
        setError('Credit note not found');
      } else if (err.response?.status !== 401) {
        setError('Failed to load credit note');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCreditNote();
  }, [fetchCreditNote]);

  // ── Actions ───────────────────────────────────────────────────

  async function handleDelete() {
    setDeleting(true);
    try {
      await creditNoteApi.remove(id);
      toast.success('Credit note deleted successfully');
      navigate('/credit-notes', { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Failed to delete credit note';
      toast.error(msg);
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  }

  // ── Loading / Error ───────────────────────────────────────────

  if (loading) {
    return (
      <div className="py-20">
        <LoadingSpinner size="lg" label="Loading credit note..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-20 text-center">
        <HiOutlineDocumentText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-lg font-medium text-[var(--zoho-text)] mb-2">{error}</h2>
        <Link
          to="/credit-notes"
          className="text-sm text-[#0071DC] hover:underline"
        >
          Back to Credit Notes
        </Link>
      </div>
    );
  }

  if (!creditNote) return null;

  // ── Compute display values ────────────────────────────────────

  const items = creditNote.items || creditNote.credit_note_items || [];
  const customerName = creditNote.customer_name || creditNote.customer?.display_name || creditNote.customer?.company_name || '--';

  const placeOfSupply = creditNote.place_of_supply || '';
  const isInterState = placeOfSupply && placeOfSupply.toLowerCase() !== COMPANY_STATE.toLowerCase();

  let subtotal = Number(creditNote.sub_total) || 0;
  let cgstTotal = Number(creditNote.cgst_amount) || 0;
  let sgstTotal = Number(creditNote.sgst_amount) || 0;
  let igstTotal = Number(creditNote.igst_amount) || 0;
  const totalTax = Number(creditNote.total_tax) || (cgstTotal + sgstTotal + igstTotal);
  const totalAmount = Number(creditNote.total_amount) || 0;

  if (!subtotal && items.length > 0) {
    subtotal = items.reduce((sum, item) => sum + computeItemAmount(item), 0);
  }

  // Status-based permissions
  const canEdit = creditNote.status === 'Draft' || creditNote.status === 'Open';
  const canDelete = creditNote.status === 'Draft';

  // Linked invoice info
  const linkedInvoice = creditNote.linked_invoice || null;
  const invoiceNumber = linkedInvoice?.invoice_number || creditNote.invoice_number || '';

  return (
    <div className="pb-8">
      {/* Header */}
      <div className="bg-white border-b border-[var(--zoho-border)] px-6 py-4 -mx-6 -mt-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/credit-notes')}
              className="p-1.5 rounded-md text-[var(--zoho-text-secondary)] hover:text-[var(--zoho-text)] hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <HiOutlineArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-semibold text-[var(--zoho-text)]">
                  {creditNote.credit_note_number || 'Credit Note'}
                </h1>
                <StatusBadge status={creditNote.status} />
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
                onClick={() => printPdf(`/api/pdf/credit-note/${id}`)}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--zoho-text-secondary)] bg-white border border-[var(--zoho-border)] px-3 py-2 rounded-md hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <HiOutlinePrinter className="w-4 h-4" />
                Print
              </button>
              <button
                onClick={() => openPdf(`/api/pdf/credit-note/${id}`)}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--zoho-text-secondary)] bg-white border border-[var(--zoho-border)] px-3 py-2 rounded-md hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <HiOutlineDocumentText className="w-4 h-4" />
                PDF
              </button>
              <ShareButton
                documentType="Credit Note"
                documentNumber={creditNote.credit_note_number || ''}
                documentId={id}
                recipientName={customerName}
                recipientEmail={creditNote.customer?.email || ''}
                recipientPhone={creditNote.customer?.phone || creditNote.customer?.mobile || ''}
                amount={totalAmount}
                date={creditNote.credit_note_date}
                pdfUrl={`/api/pdf/credit-note/${id}`}
              />
            {canEdit && (
              <Link
                to={`/credit-notes/${id}/edit`}
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
        {/* ── Credit Note Header Info ────────────────────────────── */}
        <div className="bg-white rounded-lg border border-[var(--zoho-border)] p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-0">
            <DetailRow label="Credit Note Date">
              <DateCell date={creditNote.credit_note_date} />
            </DetailRow>
            <DetailRow label="Status">
              <StatusBadge status={creditNote.status} />
            </DetailRow>
            <DetailRow label="Customer" value={customerName} />
            {placeOfSupply && (
              <DetailRow label="Place of Supply" value={placeOfSupply} />
            )}
            {invoiceNumber && (
              <DetailRow label="Linked Invoice">
                {linkedInvoice?.id ? (
                  <Link
                    to={`/invoices/${linkedInvoice.id}`}
                    className="text-sm text-[#0071DC] hover:underline font-medium"
                  >
                    {invoiceNumber}
                  </Link>
                ) : (
                  <span className="text-sm text-[var(--zoho-text)]">{invoiceNumber}</span>
                )}
              </DetailRow>
            )}
            {creditNote.reason && (
              <div className="lg:col-span-2">
                <DetailRow label="Reason" value={creditNote.reason} />
              </div>
            )}
          </div>
        </div>

        {/* ── Linked Invoice Summary ──────────────────────────────── */}
        {linkedInvoice && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
            <h4 className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-3">
              Linked Invoice Details
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-blue-600">Invoice Number</p>
                <Link
                  to={`/invoices/${linkedInvoice.id}`}
                  className="text-sm font-medium text-[#0071DC] hover:underline"
                >
                  {linkedInvoice.invoice_number}
                </Link>
              </div>
              <div>
                <p className="text-xs text-blue-600">Invoice Amount</p>
                <p className="text-sm font-medium text-[var(--zoho-text)]">
                  {formatINR(linkedInvoice.total_amount)}
                </p>
              </div>
              <div>
                <p className="text-xs text-blue-600">Invoice Status</p>
                <StatusBadge status={linkedInvoice.status} size="sm" />
              </div>
            </div>
          </div>
        )}

        {/* ── Line Items Table ─────────────────────────────────────── */}
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
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-[var(--zoho-text)] tabular-nums">
                        {'\u20B9'}{formatIndianNumber(Number(item.rate) || 0)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-[var(--zoho-text)] tabular-nums">
                        {Number(item.gst_rate) || 0}%
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-[var(--zoho-text)] tabular-nums">
                        {'\u20B9'}{formatIndianNumber(gstAmt)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-[var(--zoho-text)] tabular-nums">
                        {'\u20B9'}{formatIndianNumber(amount)}
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
                      {'\u20B9'}{formatIndianNumber(subtotal)}
                    </span>
                  </div>

                  {isInterState ? (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[var(--zoho-text-secondary)]">IGST</span>
                      <span className="text-[var(--zoho-text)] tabular-nums">
                        {'\u20B9'}{formatIndianNumber(igstTotal || totalTax)}
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[var(--zoho-text-secondary)]">CGST</span>
                        <span className="text-[var(--zoho-text)] tabular-nums">
                          {'\u20B9'}{formatIndianNumber(cgstTotal || totalTax / 2)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[var(--zoho-text-secondary)]">SGST</span>
                        <span className="text-[var(--zoho-text)] tabular-nums">
                          {'\u20B9'}{formatIndianNumber(sgstTotal || totalTax / 2)}
                        </span>
                      </div>
                    </>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-gray-300">
                    <span className="text-base font-bold text-[var(--zoho-text)]">Total</span>
                    <span className="text-lg font-bold text-[var(--zoho-text)] tabular-nums">
                      {formatINR(totalAmount)}
                    </span>
                  </div>

                  {totalAmount > 0 && (
                    <div className="pt-1">
                      <p className="text-xs text-[var(--zoho-text-secondary)] italic leading-relaxed">
                        {amountInWords(totalAmount)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Notes ──────────────────────────────────────────────── */}
        {(creditNote.remarks || creditNote.notes || creditNote.terms_and_conditions) && (
          <div className="bg-white rounded-lg border border-[var(--zoho-border)] p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {(creditNote.remarks || creditNote.notes) && (
                <div>
                  <h4 className="text-xs font-semibold text-[var(--zoho-text-secondary)] uppercase tracking-wide mb-2">
                    Notes
                  </h4>
                  <p className="text-sm text-[var(--zoho-text)] whitespace-pre-wrap leading-relaxed">
                    {creditNote.remarks || creditNote.notes}
                  </p>
                </div>
              )}
              {creditNote.terms_and_conditions && (
                <div>
                  <h4 className="text-xs font-semibold text-[var(--zoho-text-secondary)] uppercase tracking-wide mb-2">
                    Terms & Conditions
                  </h4>
                  <p className="text-sm text-[var(--zoho-text)] whitespace-pre-wrap leading-relaxed">
                    {creditNote.terms_and_conditions}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete Credit Note"
        message={`Are you sure you want to delete credit note ${creditNote.credit_note_number || ''}? This action cannot be undone.`}
        confirmLabel="Delete Credit Note"
        loading={deleting}
      />
    </div>
  );
}
