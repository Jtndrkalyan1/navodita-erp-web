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
import { debitNoteApi } from '../../api/debitNote.api';
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

export default function DebitNoteDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [debitNote, setDebitNote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ── Fetch debit note ──────────────────────────────────────────

  const fetchDebitNote = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await debitNoteApi.getById(id);
      const data = res.data.data || res.data;
      if (!data) {
        setError('Debit note not found');
        return;
      }
      setDebitNote(data);
    } catch (err) {
      if (err.response?.status === 404) {
        setError('Debit note not found');
      } else if (err.response?.status !== 401) {
        setError('Failed to load debit note');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDebitNote();
  }, [fetchDebitNote]);

  // ── Actions ───────────────────────────────────────────────────

  async function handleDelete() {
    setDeleting(true);
    try {
      await debitNoteApi.remove(id);
      toast.success('Debit note deleted successfully');
      navigate('/debit-notes', { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Failed to delete debit note';
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
        <LoadingSpinner size="lg" label="Loading debit note..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-20 text-center">
        <HiOutlineDocumentText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-lg font-medium text-[var(--zoho-text)] mb-2">{error}</h2>
        <Link
          to="/debit-notes"
          className="text-sm text-[#0071DC] hover:underline"
        >
          Back to Debit Notes
        </Link>
      </div>
    );
  }

  if (!debitNote) return null;

  // ── Compute display values ────────────────────────────────────

  const items = debitNote.items || debitNote.debit_note_items || [];
  const vendorName = debitNote.vendor_name || debitNote.vendor?.display_name || debitNote.vendor?.company_name || '--';

  const placeOfSupply = debitNote.place_of_supply || '';
  const isInterState = placeOfSupply && placeOfSupply.toLowerCase() !== COMPANY_STATE.toLowerCase();

  let subtotal = Number(debitNote.sub_total) || 0;
  let cgstTotal = Number(debitNote.cgst_amount) || 0;
  let sgstTotal = Number(debitNote.sgst_amount) || 0;
  let igstTotal = Number(debitNote.igst_amount) || 0;
  const totalTax = Number(debitNote.total_tax) || (cgstTotal + sgstTotal + igstTotal);
  const totalAmount = Number(debitNote.total_amount) || 0;

  if (!subtotal && items.length > 0) {
    subtotal = items.reduce((sum, item) => sum + computeItemAmount(item), 0);
  }

  // Status-based permissions
  const canEdit = debitNote.status === 'Draft' || debitNote.status === 'Open';
  const canDelete = debitNote.status === 'Draft';

  // Linked bill info
  const linkedBill = debitNote.linked_bill || null;
  const billNumber = linkedBill?.bill_number || debitNote.bill_number || '';

  return (
    <div className="pb-8">
      {/* Header */}
      <div className="bg-white border-b border-[var(--zoho-border)] px-6 py-4 -mx-6 -mt-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/debit-notes')}
              className="p-1.5 rounded-md text-[var(--zoho-text-secondary)] hover:text-[var(--zoho-text)] hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <HiOutlineArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-semibold text-[var(--zoho-text)]">
                  {debitNote.debit_note_number || 'Debit Note'}
                </h1>
                <StatusBadge status={debitNote.status} />
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
                onClick={() => printPdf(`/api/pdf/debit-note/${id}`)}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--zoho-text-secondary)] bg-white border border-[var(--zoho-border)] px-3 py-2 rounded-md hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <HiOutlinePrinter className="w-4 h-4" />
                Print
              </button>
              <button
                onClick={() => openPdf(`/api/pdf/debit-note/${id}`)}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--zoho-text-secondary)] bg-white border border-[var(--zoho-border)] px-3 py-2 rounded-md hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <HiOutlineDocumentText className="w-4 h-4" />
                PDF
              </button>
              <ShareButton
                documentType="Debit Note"
                documentNumber={debitNote.debit_note_number || ''}
                documentId={id}
                recipientName={vendorName}
                recipientEmail={debitNote.vendor?.email || ''}
                recipientPhone={debitNote.vendor?.phone || debitNote.vendor?.mobile || ''}
                amount={totalAmount}
                date={debitNote.debit_note_date}
                pdfUrl={`/api/pdf/debit-note/${id}`}
              />
            {canEdit && (
              <Link
                to={`/debit-notes/${id}/edit`}
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
        {/* ── Debit Note Header Info ──────────────────────────────── */}
        <div className="bg-white rounded-lg border border-[var(--zoho-border)] p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-0">
            <DetailRow label="Debit Note Date">
              <DateCell date={debitNote.debit_note_date} />
            </DetailRow>
            <DetailRow label="Status">
              <StatusBadge status={debitNote.status} />
            </DetailRow>
            <DetailRow label="Vendor" value={vendorName} />
            {placeOfSupply && (
              <DetailRow label="Place of Supply" value={placeOfSupply} />
            )}
            {billNumber && (
              <DetailRow label="Linked Bill">
                {linkedBill?.id ? (
                  <Link
                    to={`/bills/${linkedBill.id}`}
                    className="text-sm text-[#0071DC] hover:underline font-medium"
                  >
                    {billNumber}
                  </Link>
                ) : (
                  <span className="text-sm text-[var(--zoho-text)]">{billNumber}</span>
                )}
              </DetailRow>
            )}
            {debitNote.reason && (
              <div className="lg:col-span-2">
                <DetailRow label="Reason" value={debitNote.reason} />
              </div>
            )}
          </div>
        </div>

        {/* ── Linked Bill Summary ─────────────────────────────────── */}
        {linkedBill && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-5">
            <h4 className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-3">
              Linked Bill Details
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-amber-600">Bill Number</p>
                <Link
                  to={`/bills/${linkedBill.id}`}
                  className="text-sm font-medium text-[#0071DC] hover:underline"
                >
                  {linkedBill.bill_number}
                </Link>
              </div>
              <div>
                <p className="text-xs text-amber-600">Bill Amount</p>
                <p className="text-sm font-medium text-[var(--zoho-text)]">
                  {formatINR(linkedBill.total_amount)}
                </p>
              </div>
              <div>
                <p className="text-xs text-amber-600">Bill Status</p>
                <StatusBadge status={linkedBill.status} size="sm" />
              </div>
            </div>
          </div>
        )}

        {/* ── Line Items Table ────────────────────────────────────── */}
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
        {(debitNote.remarks || debitNote.notes || debitNote.terms_and_conditions) && (
          <div className="bg-white rounded-lg border border-[var(--zoho-border)] p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {(debitNote.remarks || debitNote.notes) && (
                <div>
                  <h4 className="text-xs font-semibold text-[var(--zoho-text-secondary)] uppercase tracking-wide mb-2">
                    Notes
                  </h4>
                  <p className="text-sm text-[var(--zoho-text)] whitespace-pre-wrap leading-relaxed">
                    {debitNote.remarks || debitNote.notes}
                  </p>
                </div>
              )}
              {debitNote.terms_and_conditions && (
                <div>
                  <h4 className="text-xs font-semibold text-[var(--zoho-text-secondary)] uppercase tracking-wide mb-2">
                    Terms & Conditions
                  </h4>
                  <p className="text-sm text-[var(--zoho-text)] whitespace-pre-wrap leading-relaxed">
                    {debitNote.terms_and_conditions}
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
        title="Delete Debit Note"
        message={`Are you sure you want to delete debit note ${debitNote.debit_note_number || ''}? This action cannot be undone.`}
        confirmLabel="Delete Debit Note"
        loading={deleting}
      />
    </div>
  );
}
