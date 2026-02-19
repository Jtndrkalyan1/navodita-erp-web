import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  HiOutlineArrowLeft,
  HiOutlinePencilSquare,
  HiOutlineTrash,
  HiOutlinePrinter,
  HiOutlineCheckCircle,
  HiOutlineDocumentText,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import apiClient from '../../api/client';
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
  return (Number(item.quantity) || 0) * (Number(item.rate) || 0);
}

function computeItemGst(item) {
  return (computeItemAmount(item) * (Number(item.gst_rate) || 0)) / 100;
}

export default function PurchaseOrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [po, setPo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [markingSent, setMarkingSent] = useState(false);

  const fetchPO = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get(`/purchase-orders/${id}`);
      const data = res.data.data || res.data;
      if (!data) {
        setError('Purchase order not found');
        return;
      }
      setPo(data);
    } catch (err) {
      if (err.response?.status === 404) {
        setError('Purchase order not found');
      } else if (err.response?.status !== 401) {
        setError('Failed to load purchase order');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPO();
  }, [fetchPO]);

  async function handleDelete() {
    setDeleting(true);
    try {
      await apiClient.delete(`/purchase-orders/${id}`);
      toast.success('Purchase order deleted successfully');
      navigate('/purchase-orders', { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to delete purchase order';
      toast.error(msg);
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  }

  async function handleMarkAsSent() {
    setMarkingSent(true);
    try {
      await apiClient.put(`/purchase-orders/${id}`, { status: 'Sent' });
      toast.success('Purchase order marked as Sent');
      fetchPO();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update status';
      toast.error(msg);
    } finally {
      setMarkingSent(false);
    }
  }

  if (loading) {
    return (
      <div className="py-20">
        <LoadingSpinner size="lg" label="Loading purchase order..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-20 text-center">
        <HiOutlineDocumentText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-lg font-medium text-[var(--zoho-text)] mb-2">{error}</h2>
        <Link to="/purchase-orders" className="text-sm text-[#0071DC] hover:underline">
          Back to Purchase Orders
        </Link>
      </div>
    );
  }

  if (!po) return null;

  const items = po.items || po.purchase_order_items || [];
  const vendor = po.vendor || {};

  const placeOfSupply = po.place_of_supply || '';
  const isInterState = placeOfSupply && placeOfSupply.toLowerCase() !== COMPANY_STATE.toLowerCase();

  let subtotal = Number(po.sub_total) || 0;
  let cgstTotal = Number(po.cgst_amount) || 0;
  let sgstTotal = Number(po.sgst_amount) || 0;
  let igstTotal = Number(po.igst_amount) || 0;
  const totalTax = Number(po.total_tax) || (cgstTotal + sgstTotal + igstTotal);
  const shipping = Number(po.shipping_charge) || 0;
  const totalAmount = Number(po.total_amount) || 0;

  if (!subtotal && items.length > 0) {
    subtotal = items.reduce((sum, item) => sum + computeItemAmount(item), 0);
  }

  const canEdit = po.status === 'Draft';
  const canDelete = po.status === 'Draft';
  const canMarkSent = po.status === 'Draft';

  return (
    <div className="pb-8">
      {/* Header */}
      <div className="bg-white border-b border-[var(--zoho-border)] px-6 py-4 -mx-6 -mt-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/purchase-orders')}
              className="p-1.5 rounded-md text-[var(--zoho-text-secondary)] hover:text-[var(--zoho-text)] hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <HiOutlineArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-semibold text-[var(--zoho-text)]">
                  {po.po_number || 'Purchase Order'}
                </h1>
                <StatusBadge status={po.status} />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canMarkSent && (
              <button
                onClick={handleMarkAsSent}
                disabled={markingSent}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-green-700 bg-green-50 border border-green-200 px-3 py-2 rounded-md hover:bg-green-100 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <HiOutlineCheckCircle className="w-4 h-4" />
                {markingSent ? 'Updating...' : 'Mark as Sent'}
              </button>
            )}

            <button
              onClick={() => printPdf(`/api/pdf/purchase-order/${id}`)}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--zoho-text-secondary)] bg-white border border-[var(--zoho-border)] px-3 py-2 rounded-md hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <HiOutlinePrinter className="w-4 h-4" />
              Print
            </button>
            <button
              onClick={() => openPdf(`/api/pdf/purchase-order/${id}`)}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--zoho-text-secondary)] bg-white border border-[var(--zoho-border)] px-3 py-2 rounded-md hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <HiOutlineDocumentText className="w-4 h-4" />
              PDF
            </button>
            <ShareButton
              documentType="Purchase Order"
              documentNumber={po.po_number || ''}
              documentId={id}
              recipientName={vendor.display_name || vendor.company_name || po.vendor_name || ''}
              recipientEmail={vendor.email || ''}
              recipientPhone={vendor.phone || vendor.mobile || ''}
              amount={totalAmount}
              date={po.po_date}
              pdfUrl={`/api/pdf/purchase-order/${id}`}
            />

            {canEdit && (
              <Link
                to={`/purchase-orders/${id}/edit`}
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
        {/* PO Header Info */}
        <div className="bg-white rounded-lg border border-[var(--zoho-border)] p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-0">
            <DetailRow label="PO Date">
              <DateCell date={po.po_date} />
            </DetailRow>
            <DetailRow label="Expected Date">
              <DateCell date={po.expected_date} />
            </DetailRow>
            <DetailRow label="Status">
              <StatusBadge status={po.status} />
            </DetailRow>
            <DetailRow label="Vendor">
              {vendor.display_name || vendor.company_name || po.vendor_name || '--'}
            </DetailRow>
            <DetailRow label="Place of Supply" value={placeOfSupply || '--'} />
          </div>
        </div>

        {/* Line Items Table */}
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
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--zoho-text-secondary)] w-10">#</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--zoho-text-secondary)] min-w-[200px]">Item</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--zoho-text-secondary)] w-28">HSN/SAC</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--zoho-text-secondary)] w-20">Qty</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--zoho-text-secondary)] w-28">Rate</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--zoho-text-secondary)] w-20">GST %</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--zoho-text-secondary)] w-28">GST Amt</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--zoho-text-secondary)] w-32">Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => {
                  const amount = Number(item.amount) || computeItemAmount(item);
                  const gstAmt = computeItemGst(item);
                  return (
                    <tr key={item.id || index} className="border-b border-gray-100 hover:bg-gray-50/50">
                      <td className="px-4 py-3 text-xs text-[var(--zoho-text-secondary)]">{index + 1}</td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-[var(--zoho-text)]">{item.item_name || '--'}</div>
                        {item.description && <div className="text-xs text-[var(--zoho-text-secondary)] mt-0.5">{item.description}</div>}
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--zoho-text)]">{item.hsn_code || '--'}</td>
                      <td className="px-4 py-3 text-right text-sm text-[var(--zoho-text)] tabular-nums">
                        {item.quantity ?? '--'}
                        {item.unit && <span className="text-xs text-[var(--zoho-text-secondary)] ml-1">{item.unit}</span>}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-[var(--zoho-text)] tabular-nums">{'\u20B9'}{formatIndianNumber(Number(item.rate) || 0)}</td>
                      <td className="px-4 py-3 text-right text-sm text-[var(--zoho-text)] tabular-nums">{Number(item.gst_rate) || 0}%</td>
                      <td className="px-4 py-3 text-right text-sm text-[var(--zoho-text)] tabular-nums">{'\u20B9'}{formatIndianNumber(gstAmt)}</td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-[var(--zoho-text)] tabular-nums">{'\u20B9'}{formatIndianNumber(amount)}</td>
                    </tr>
                  );
                })}
                {items.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-400">No line items</td></tr>
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
                    <span className="font-medium text-[var(--zoho-text)] tabular-nums">{'\u20B9'}{formatIndianNumber(subtotal)}</span>
                  </div>

                  {isInterState ? (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[var(--zoho-text-secondary)]">IGST</span>
                      <span className="text-[var(--zoho-text)] tabular-nums">{'\u20B9'}{formatIndianNumber(igstTotal || totalTax)}</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[var(--zoho-text-secondary)]">CGST</span>
                        <span className="text-[var(--zoho-text)] tabular-nums">{'\u20B9'}{formatIndianNumber(cgstTotal || totalTax / 2)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[var(--zoho-text-secondary)]">SGST</span>
                        <span className="text-[var(--zoho-text)] tabular-nums">{'\u20B9'}{formatIndianNumber(sgstTotal || totalTax / 2)}</span>
                      </div>
                    </>
                  )}

                  {shipping > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[var(--zoho-text-secondary)]">Freight / Shipping</span>
                      <span className="text-[var(--zoho-text)] tabular-nums">{'\u20B9'}{formatIndianNumber(shipping)}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-gray-300">
                    <span className="text-base font-bold text-[var(--zoho-text)]">Total</span>
                    <span className="text-lg font-bold text-[var(--zoho-text)] tabular-nums">{formatINR(totalAmount)}</span>
                  </div>

                  {totalAmount > 0 && (
                    <div className="pt-1">
                      <p className="text-xs text-[var(--zoho-text-secondary)] italic leading-relaxed">{amountInWords(totalAmount)}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Remarks */}
        {po.remarks && (
          <div className="bg-white rounded-lg border border-[var(--zoho-border)] p-6">
            <h4 className="text-xs font-semibold text-[var(--zoho-text-secondary)] uppercase tracking-wide mb-2">
              Remarks
            </h4>
            <p className="text-sm text-[var(--zoho-text)] whitespace-pre-wrap leading-relaxed">
              {po.remarks}
            </p>
          </div>
        )}
      </div>

      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete Purchase Order"
        message={`Are you sure you want to delete purchase order ${po.po_number || ''}? This action cannot be undone.`}
        confirmLabel="Delete Purchase Order"
        loading={deleting}
      />
    </div>
  );
}
