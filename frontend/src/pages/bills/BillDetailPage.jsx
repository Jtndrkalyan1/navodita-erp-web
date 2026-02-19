import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  HiOutlineArrowLeft,
  HiOutlinePencilSquare,
  HiOutlineTrash,
  HiOutlineDocumentText,
  HiOutlineBanknotes,
  HiOutlinePrinter,
  HiOutlinePaperClip,
  HiOutlineArrowDownTray,
  HiOutlineXMark,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import apiClient from '../../api/client';
import { billApi } from '../../api/bill.api';
import { openPdf, printPdf } from '../../utils/pdf';
import { formatINR, amountInWords } from '../../utils/currency';
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

export default function BillDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);

  // ── Fetch attachments ──────────────────────────────────────────
  const fetchAttachments = useCallback(async () => {
    try {
      const res = await apiClient.get('/documents', { params: { entity_type: 'bill', entity_id: id } });
      setAttachments(res.data?.data || []);
    } catch { /* ignore */ }
  }, [id]);

  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('entity_type', 'bill');
      formData.append('entity_id', id);
      formData.append('category', 'attachment');
      formData.append('description', `Bill attachment: ${file.name}`);

      await apiClient.post('/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('File uploaded successfully');
      fetchAttachments();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to upload file');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  async function handleDeleteAttachment(docId) {
    try {
      await apiClient.delete(`/documents/${docId}`);
      toast.success('Attachment removed');
      fetchAttachments();
    } catch {
      toast.error('Failed to remove attachment');
    }
  }

  // ── Fetch bill ──────────────────────────────────────────────────

  const fetchBill = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await billApi.getById(id);
      const data = res.data.data || res.data;
      if (!data) {
        setError('Bill not found');
        return;
      }
      setBill(data);
    } catch (err) {
      if (err.response?.status === 404) {
        setError('Bill not found');
      } else if (err.response?.status !== 401) {
        setError('Failed to load bill');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchBill();
    fetchAttachments();
  }, [fetchBill, fetchAttachments]);

  // ── Actions ───────────────────────────────────────────────────────

  async function handleDelete() {
    setDeleting(true);
    try {
      await billApi.remove(id);
      toast.success('Bill deleted successfully');
      navigate('/bills', { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Failed to delete bill';
      toast.error(msg);
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  }

  // ── Loading / Error ───────────────────────────────────────────────

  if (loading) {
    return (
      <div className="py-20">
        <LoadingSpinner size="lg" label="Loading bill..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-20 text-center">
        <HiOutlineDocumentText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-lg font-medium text-[var(--zoho-text)] mb-2">{error}</h2>
        <Link
          to="/bills"
          className="text-sm text-[#0071DC] hover:underline"
        >
          Back to Bills
        </Link>
      </div>
    );
  }

  if (!bill) return null;

  // ── Compute display values ──────────────────────────────────────

  const items = bill.items || bill.bill_items || [];
  const payments = bill.payments || [];

  const placeOfSupply = bill.place_of_supply || '';
  const isInterState = placeOfSupply && placeOfSupply.toLowerCase() !== COMPANY_STATE.toLowerCase();

  // Calculate totals from bill data
  let subtotal = Number(bill.sub_total) || 0;
  let cgstTotal = Number(bill.cgst_amount) || 0;
  let sgstTotal = Number(bill.sgst_amount) || 0;
  let igstTotal = Number(bill.igst_amount) || 0;
  const totalTax = Number(bill.total_tax) || (cgstTotal + sgstTotal + igstTotal);
  const shipping = Number(bill.shipping_charge) || 0;
  const totalAmount = Number(bill.total_amount) || 0;
  const amountPaid = Number(bill.amount_paid) || 0;
  const balanceDue = Number(bill.balance_due) ?? Math.max(totalAmount - amountPaid, 0);

  // If backend didn't compute subtotal, calculate from items
  if (!subtotal && items.length > 0) {
    subtotal = items.reduce((sum, item) => sum + computeItemAmount(item), 0);
  }

  const canEdit = bill.status === 'Pending';
  const canDelete = bill.status === 'Pending';

  // ── Detect overdue ──────────────────────────────────────────────

  function isOverdue() {
    if (!bill.due_date) return false;
    if (bill.status === 'Paid') return false;
    const due = new Date(bill.due_date);
    const today = new Date();
    due.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return due < today;
  }

  const displayStatus = isOverdue() && bill.status !== 'Overdue' ? 'Overdue' : bill.status;

  return (
    <div className="pb-8">
      {/* Header */}
      <div className="bg-white border-b border-[var(--zoho-border)] px-6 py-4 -mx-6 -mt-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/bills')}
              className="p-1.5 rounded-md text-[var(--zoho-text-secondary)] hover:text-[var(--zoho-text)] hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <HiOutlineArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-semibold text-[var(--zoho-text)]">
                  {bill.bill_number || 'Bill'}
                </h1>
                <StatusBadge status={displayStatus} />
              </div>
              {bill.vendor_invoice_number && (
                <p className="text-xs text-[var(--zoho-text-secondary)] mt-0.5">
                  Vendor Bill: {bill.vendor_invoice_number}
                </p>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
                onClick={() => printPdf(`/api/pdf/bill/${id}`)}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--zoho-text-secondary)] bg-white border border-[var(--zoho-border)] px-3 py-2 rounded-md hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <HiOutlinePrinter className="w-4 h-4" />
                Print
              </button>
              <button
                onClick={() => openPdf(`/api/pdf/bill/${id}`)}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--zoho-text-secondary)] bg-white border border-[var(--zoho-border)] px-3 py-2 rounded-md hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <HiOutlineDocumentText className="w-4 h-4" />
                PDF
              </button>
              <ShareButton
                documentType="Bill"
                documentNumber={bill.bill_number || ''}
                documentId={id}
                recipientName={bill.vendor_name || ''}
                recipientEmail={bill.vendor_email || ''}
                recipientPhone={bill.vendor_phone || bill.vendor_mobile || ''}
                amount={totalAmount}
                date={bill.bill_date}
                pdfUrl={`/api/pdf/bill/${id}`}
              />
            {canEdit && (
              <Link
                to={`/bills/${id}/edit`}
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
        {/* ── Overdue Warning Banner ──────────────────────────────── */}
        {isOverdue() && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-5 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
              <HiOutlineBanknotes className="w-4 h-4 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-red-800">This bill is overdue</p>
              <p className="text-xs text-red-600 mt-0.5">
                Due date was <DateCell date={bill.due_date} className="inline text-red-600 font-medium" />.
                Balance due: <span className="font-semibold">{formatINR(balanceDue)}</span>
              </p>
            </div>
          </div>
        )}

        {/* ── Payment Summary Banner ─────────────────────────────── */}
        <div className="bg-white rounded-lg border border-[var(--zoho-border)] overflow-hidden">
          <div className="grid grid-cols-3 divide-x divide-[var(--zoho-border)]">
            <div className="px-5 py-4">
              <p className="text-xs font-medium text-[var(--zoho-text-secondary)] uppercase tracking-wide">
                Total Amount
              </p>
              <p className="text-lg font-semibold text-[var(--zoho-text)] mt-1 tabular-nums">
                {formatINR(totalAmount)}
              </p>
            </div>
            <div className="px-5 py-4">
              <p className="text-xs font-medium text-[var(--zoho-text-secondary)] uppercase tracking-wide">
                Amount Paid
              </p>
              <p className="text-lg font-semibold text-green-600 mt-1 tabular-nums">
                {formatINR(amountPaid)}
              </p>
            </div>
            <div className="px-5 py-4">
              <p className="text-xs font-medium text-[var(--zoho-text-secondary)] uppercase tracking-wide">
                Balance Due
              </p>
              <p className={`text-lg font-semibold mt-1 tabular-nums ${balanceDue > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                {formatINR(balanceDue)}
              </p>
            </div>
          </div>
        </div>

        {/* ── Bill Header Info ──────────────────────────────────── */}
        <div className="bg-white rounded-lg border border-[var(--zoho-border)] p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-0">
            <DetailRow label="Bill Date">
              <DateCell date={bill.bill_date} />
            </DetailRow>
            <DetailRow label="Due Date">
              <DateCell
                date={bill.due_date}
                className={isOverdue() ? 'text-red-600 font-medium' : ''}
              />
            </DetailRow>
            <DetailRow label="Status">
              <StatusBadge status={displayStatus} />
            </DetailRow>
            <DetailRow label="Vendor" value={bill.vendor_name || '--'} />
            <DetailRow label="Vendor Bill #" value={bill.vendor_invoice_number || '--'} />
            <DetailRow label="Place of Supply" value={placeOfSupply || '--'} />
          </div>
        </div>

        {/* ── Line Items Table ─────────────────────────────────── */}
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

                  {/* GST breakdown */}
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

                  {/* Shipping */}
                  {shipping > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[var(--zoho-text-secondary)]">Freight / Shipping</span>
                      <span className="text-[var(--zoho-text)] tabular-nums">
                        {'\u20B9'}{formatIndianNumber(shipping)}
                      </span>
                    </div>
                  )}

                  {/* Total */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-300">
                    <span className="text-base font-bold text-[var(--zoho-text)]">Total</span>
                    <span className="text-lg font-bold text-[var(--zoho-text)] tabular-nums">
                      {formatINR(totalAmount)}
                    </span>
                  </div>

                  {/* Amount in words */}
                  {totalAmount > 0 && (
                    <div className="pt-1">
                      <p className="text-xs text-[var(--zoho-text-secondary)] italic leading-relaxed">
                        {amountInWords(totalAmount)}
                      </p>
                    </div>
                  )}

                  {/* Payment summary */}
                  {amountPaid > 0 && (
                    <>
                      <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-200 mt-2">
                        <span className="text-green-700">Amount Paid</span>
                        <span className="text-green-700 font-medium tabular-nums">
                          -{'\u20B9'}{formatIndianNumber(amountPaid)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold text-[var(--zoho-text)]">Balance Due</span>
                        <span className={`font-semibold tabular-nums ${balanceDue > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                          {formatINR(balanceDue)}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Payment History ──────────────────────────────────── */}
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
                      <td className="px-4 py-3 text-right text-sm font-medium text-green-600 tabular-nums">
                        {formatINR(payment.allocated_amount || payment.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Attachments ────────────────────────────────────── */}
        <div className="bg-white rounded-lg border border-[var(--zoho-border)] overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--zoho-border)] flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--zoho-text)] uppercase tracking-wide flex items-center gap-2">
              <HiOutlinePaperClip className="w-4 h-4 text-[var(--zoho-text-secondary)]" />
              Attachments ({attachments.length})
            </h3>
            <label className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#0071DC] bg-[#0071DC]/5 rounded-md hover:bg-[#0071DC]/10 transition-colors cursor-pointer ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
              <HiOutlinePaperClip className="w-3.5 h-3.5" />
              {uploading ? 'Uploading...' : 'Attach File'}
              <input
                type="file"
                className="hidden"
                onChange={handleFileUpload}
                accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx,.xls,.xlsx,.csv,.txt"
                disabled={uploading}
              />
            </label>
          </div>
          <div className="p-4">
            {attachments.length === 0 ? (
              <div className="py-6 text-center">
                <HiOutlinePaperClip className="w-8 h-8 text-[#D1D5DB] mx-auto mb-2" />
                <p className="text-sm text-[#6B7280]">No attachments yet</p>
                <p className="text-xs text-[#9CA3AF] mt-0.5">Upload original bill copy, receipts, or supporting documents</p>
              </div>
            ) : (
              <div className="space-y-2">
                {attachments.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group">
                    <div className="flex items-center gap-3 min-w-0">
                      <HiOutlineDocumentText className="w-5 h-5 text-[#6B7280] shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[var(--zoho-text)] truncate">{doc.file_name}</p>
                        <p className="text-xs text-[#9CA3AF]">
                          {doc.file_size ? `${(doc.file_size / 1024).toFixed(1)} KB` : ''}
                          {doc.created_at ? ` · ${new Date(doc.created_at).toLocaleDateString('en-IN')}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {doc.file_url && (
                        <a
                          href={doc.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-[#0071DC] hover:bg-blue-50 rounded-md transition-colors"
                          title="Download"
                        >
                          <HiOutlineArrowDownTray className="w-4 h-4" />
                        </a>
                      )}
                      <button
                        onClick={() => handleDeleteAttachment(doc.id)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                        title="Remove"
                      >
                        <HiOutlineXMark className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Remarks ──────────────────────────────────────────── */}
        {bill.remarks && (
          <div className="bg-white rounded-lg border border-[var(--zoho-border)] p-6">
            <h4 className="text-xs font-semibold text-[var(--zoho-text-secondary)] uppercase tracking-wide mb-2">
              Remarks / Notes
            </h4>
            <p className="text-sm text-[var(--zoho-text)] whitespace-pre-wrap leading-relaxed">
              {bill.remarks}
            </p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete Bill"
        message={`Are you sure you want to delete bill ${bill.bill_number || ''}? This action cannot be undone. Only pending bills can be deleted.`}
        confirmLabel="Delete Bill"
        loading={deleting}
      />
    </div>
  );
}
