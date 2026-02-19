import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  HiOutlineArrowLeft,
  HiOutlinePencilSquare,
  HiOutlineTrash,
  HiOutlineTruck,
  HiOutlineClock,
  HiOutlineDocumentText,
  HiOutlinePrinter,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import apiClient from '../../api/client';
import { openPdf, printPdf } from '../../utils/pdf';
import { formatINR } from '../../utils/currency';
import { formatIndianNumber } from '../../components/data-display/CurrencyCell';
import StatusBadge from '../../components/data-display/StatusBadge';
import DateCell from '../../components/data-display/DateCell';
import DetailRow from '../../components/data-display/DetailRow';
import LoadingSpinner from '../../components/feedback/LoadingSpinner';
import DeleteConfirmModal from '../../components/feedback/DeleteConfirmModal';
import ShareButton from '../../components/sharing/ShareButton';

// ── Helpers ────────────────────────────────────────────────────────

function computeItemTaxable(item) {
  const qty = Number(item.quantity) || 0;
  const rate = Number(item.rate) || 0;
  return qty * rate;
}

function computeItemGst(item) {
  const taxable = computeItemTaxable(item);
  const gstRate = Number(item.gst_rate) || 0;
  return (taxable * gstRate) / 100;
}

// ── Main Component ─────────────────────────────────────────────────

export default function EWayBillDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [ewayBill, setEwayBill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ── Fetch e-way bill ─────────────────────────────────────────────

  const fetchEwayBill = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get(`/eway-bills/${id}`);
      const data = res.data.data || res.data;
      if (!data) {
        setError('E-Way Bill not found');
        return;
      }
      setEwayBill(data);
    } catch (err) {
      if (err.response?.status === 404) {
        setError('E-Way Bill not found');
      } else if (err.response?.status !== 401) {
        setError('Failed to load e-way bill');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchEwayBill();
  }, [fetchEwayBill]);

  // ── Actions ─────────────────────────────────────────────────────

  async function handleDelete() {
    setDeleting(true);
    try {
      await apiClient.delete(`/eway-bills/${id}`);
      toast.success('E-Way Bill deleted successfully');
      navigate('/eway-bills', { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to delete e-way bill';
      toast.error(msg);
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  }

  // ── Check if expired ──────────────────────────────────────────────

  function isExpired() {
    if (!ewayBill?.valid_until) return false;
    if (ewayBill.status === 'Cancelled') return false;
    const validUntil = new Date(ewayBill.valid_until);
    const today = new Date();
    validUntil.setHours(23, 59, 59, 999);
    today.setHours(0, 0, 0, 0);
    return validUntil < today;
  }

  // ── Loading / Error states ────────────────────────────────────────

  if (loading) {
    return (
      <div className="py-20">
        <LoadingSpinner size="lg" label="Loading e-way bill..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-20 text-center">
        <HiOutlineTruck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-lg font-medium text-[var(--zoho-text)] mb-2">{error}</h2>
        <Link
          to="/eway-bills"
          className="text-sm text-[#0071DC] hover:underline"
        >
          Back to E-Way Bills
        </Link>
      </div>
    );
  }

  if (!ewayBill) return null;

  // ── Compute display values ────────────────────────────────────────

  const items = ewayBill.items || [];
  const customer = ewayBill.customer || {};

  const expired = isExpired();
  const displayStatus =
    expired && ewayBill.status !== 'Expired' && ewayBill.status !== 'Cancelled'
      ? 'Expired'
      : ewayBill.status;

  // Calculate totals from items (fallback if backend doesn't provide)
  let totalTaxable = 0;
  let totalGst = 0;

  if (items.length > 0) {
    items.forEach((item) => {
      totalTaxable += Number(item.taxable_amount) || computeItemTaxable(item);
      totalGst += Number(item.gst_amount) || computeItemGst(item);
    });
  }

  const totalAmount = Number(ewayBill.total_amount) || (totalTaxable + totalGst);
  const totalGstAmount = Number(ewayBill.total_gst) || totalGst;

  // Determine if bill can be edited/deleted
  const canEdit = ewayBill.status !== 'Cancelled';
  const canDelete = true;

  // ── Render ──────────────────────────────────────────────────────

  return (
    <div className="pb-8">
      {/* Header */}
      <div className="bg-white border-b border-[var(--zoho-border)] px-6 py-4 -mx-6 -mt-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/eway-bills')}
              className="p-1.5 rounded-md text-[var(--zoho-text-secondary)] hover:text-[var(--zoho-text)] hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <HiOutlineArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-semibold text-[var(--zoho-text)]">
                  {ewayBill.eway_bill_number || 'E-Way Bill'}
                </h1>
                <StatusBadge status={displayStatus} />
              </div>
              {ewayBill.valid_until && (
                <p className="text-xs text-[var(--zoho-text-secondary)] mt-0.5">
                  Valid until: <DateCell date={ewayBill.valid_until} className={`inline ${expired ? 'text-red-600 font-medium' : ''}`} />
                </p>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
                onClick={() => printPdf(`/api/pdf/eway-bill/${id}`)}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--zoho-text-secondary)] bg-white border border-[var(--zoho-border)] px-3 py-2 rounded-md hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <HiOutlinePrinter className="w-4 h-4" />
                Print
              </button>
              <button
                onClick={() => openPdf(`/api/pdf/eway-bill/${id}`)}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--zoho-text-secondary)] bg-white border border-[var(--zoho-border)] px-3 py-2 rounded-md hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <HiOutlineDocumentText className="w-4 h-4" />
                PDF
              </button>
              <ShareButton
                documentType="E-Way Bill"
                documentNumber={ewayBill.eway_bill_number || ''}
                documentId={id}
                recipientName={customer.display_name || customer.company_name || ewayBill.customer_name || ''}
                recipientEmail={customer.email || ''}
                recipientPhone={customer.phone || customer.mobile || ''}
                amount={totalAmount}
                date={ewayBill.bill_date}
                pdfUrl={`/api/pdf/eway-bill/${id}`}
              />
            {canEdit && (
              <Link
                to={`/eway-bills/${id}/edit`}
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
        {/* ── Expired Warning Banner ──────────────────────────────── */}
        {expired && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg px-5 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
              <HiOutlineClock className="w-4 h-4 text-orange-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-orange-800">This e-way bill has expired</p>
              <p className="text-xs text-orange-600 mt-0.5">
                Validity expired on <DateCell date={ewayBill.valid_until} className="inline text-orange-600 font-medium" />.
                Please generate a new e-way bill if transport is still required.
              </p>
            </div>
          </div>
        )}

        {/* ── E-Way Bill Info ─────────────────────────────────────── */}
        <div className="bg-white rounded-lg border border-[var(--zoho-border)] p-6">
          <h3 className="text-xs font-semibold text-[var(--zoho-text-secondary)] uppercase tracking-wide mb-4">
            E-Way Bill Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-0">
            <DetailRow label="Bill Number" value={ewayBill.eway_bill_number || '--'} />
            <DetailRow label="Bill Date">
              <DateCell date={ewayBill.bill_date} />
            </DetailRow>
            <DetailRow label="Valid Until">
              <DateCell
                date={ewayBill.valid_until}
                className={expired ? 'text-red-600 font-medium' : ''}
              />
            </DetailRow>
            <DetailRow label="Status">
              <StatusBadge status={displayStatus} />
            </DetailRow>
            <DetailRow label="Customer">
              {customer.display_name || customer.company_name || ewayBill.customer_name || '--'}
            </DetailRow>
            <DetailRow label="Supply Type" value={ewayBill.supply_type || '--'} />
            <DetailRow label="Document Type" value={ewayBill.document_type || '--'} />
            {ewayBill.invoice_id && (
              <DetailRow label="Invoice Ref" value={ewayBill.invoice_id} />
            )}
            <DetailRow label="Distance">
              {ewayBill.distance_km != null ? `${ewayBill.distance_km} km` : '--'}
            </DetailRow>
          </div>
        </div>

        {/* ── Transport Details ────────────────────────────────────── */}
        <div className="bg-white rounded-lg border border-[var(--zoho-border)] p-6">
          <h3 className="text-xs font-semibold text-[var(--zoho-text-secondary)] uppercase tracking-wide mb-4">
            Transport Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-0">
            <DetailRow label="Transporter" value={ewayBill.transporter_name || '--'} />
            <DetailRow label="Transporter ID" value={ewayBill.transporter_id || '--'} />
            <DetailRow label="Transport Mode" value={ewayBill.transport_mode || '--'} />
            <DetailRow label="Vehicle Number">
              {ewayBill.vehicle_number ? (
                <span className="font-mono">{ewayBill.vehicle_number}</span>
              ) : (
                '--'
              )}
            </DetailRow>
          </div>
        </div>

        {/* ── Dispatch From & Ship To ─────────────────────────────── */}
        {(ewayBill.dispatch_from_gstin || ewayBill.dispatch_from_address ||
          ewayBill.ship_to_gstin || ewayBill.ship_to_address) && (
          <div className="bg-white rounded-lg border border-[var(--zoho-border)] p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Dispatch From */}
              <div>
                <h3 className="text-xs font-semibold text-[var(--zoho-text-secondary)] uppercase tracking-wide mb-3">
                  Dispatch From
                </h3>
                {ewayBill.dispatch_from_gstin && (
                  <div className="mb-2">
                    <span className="text-xs font-medium text-[var(--zoho-text-secondary)]">GSTIN: </span>
                    <span className="text-sm text-[var(--zoho-text)] font-mono">
                      {ewayBill.dispatch_from_gstin}
                    </span>
                  </div>
                )}
                {ewayBill.dispatch_from_address ? (
                  <p className="text-sm text-[var(--zoho-text)] leading-relaxed whitespace-pre-wrap">
                    {ewayBill.dispatch_from_address}
                  </p>
                ) : (
                  <p className="text-sm text-[var(--zoho-text-secondary)]">--</p>
                )}
              </div>

              {/* Ship To */}
              <div>
                <h3 className="text-xs font-semibold text-[var(--zoho-text-secondary)] uppercase tracking-wide mb-3">
                  Ship To
                </h3>
                {ewayBill.ship_to_gstin && (
                  <div className="mb-2">
                    <span className="text-xs font-medium text-[var(--zoho-text-secondary)]">GSTIN: </span>
                    <span className="text-sm text-[var(--zoho-text)] font-mono">
                      {ewayBill.ship_to_gstin}
                    </span>
                  </div>
                )}
                {ewayBill.ship_to_address ? (
                  <p className="text-sm text-[var(--zoho-text)] leading-relaxed whitespace-pre-wrap">
                    {ewayBill.ship_to_address}
                  </p>
                ) : (
                  <p className="text-sm text-[var(--zoho-text-secondary)]">--</p>
                )}
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
                    HSN
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--zoho-text-secondary)] w-20">
                    Qty
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--zoho-text-secondary)] w-16">
                    Unit
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--zoho-text-secondary)] w-28">
                    Rate
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--zoho-text-secondary)] w-32">
                    Taxable Amt
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--zoho-text-secondary)] w-20">
                    GST %
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => {
                  const taxable = Number(item.taxable_amount) || computeItemTaxable(item);
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
                      <td className="px-4 py-3 text-sm text-[var(--zoho-text)]">
                        {item.unit || '--'}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-[var(--zoho-text)] tabular-nums">
                        {'\u20B9'}{formatIndianNumber(Number(item.rate) || 0)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-[var(--zoho-text)] tabular-nums">
                        {'\u20B9'}{formatIndianNumber(taxable)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-[var(--zoho-text)] tabular-nums">
                        {Number(item.gst_rate) || 0}%
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
                  {/* Taxable Amount */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--zoho-text-secondary)]">Taxable Amount</span>
                    <span className="font-medium text-[var(--zoho-text)] tabular-nums">
                      {'\u20B9'}{formatIndianNumber(totalTaxable)}
                    </span>
                  </div>

                  {/* Total GST */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--zoho-text-secondary)]">Total GST</span>
                    <span className="text-[var(--zoho-text)] tabular-nums">
                      {'\u20B9'}{formatIndianNumber(totalGstAmount)}
                    </span>
                  </div>

                  {/* Total Amount */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-300">
                    <span className="text-base font-bold text-[var(--zoho-text)]">Total Amount</span>
                    <span className="text-lg font-bold text-[var(--zoho-text)] tabular-nums">
                      {formatINR(totalAmount)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Remarks ─────────────────────────────────────────────── */}
        {ewayBill.remarks && (
          <div className="bg-white rounded-lg border border-[var(--zoho-border)] p-6">
            <h4 className="text-xs font-semibold text-[var(--zoho-text-secondary)] uppercase tracking-wide mb-2">
              Remarks
            </h4>
            <p className="text-sm text-[var(--zoho-text)] whitespace-pre-wrap leading-relaxed">
              {ewayBill.remarks}
            </p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete E-Way Bill"
        message={`Are you sure you want to delete e-way bill ${ewayBill.eway_bill_number || ''}? This action cannot be undone.`}
        confirmLabel="Delete E-Way Bill"
        loading={deleting}
      />
    </div>
  );
}
