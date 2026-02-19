import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  HiOutlineArrowLeft,
  HiOutlinePencilSquare,
  HiOutlineTrash,
  HiOutlinePrinter,
  HiOutlineDocumentText,
  HiOutlineTruck,
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

function computeItemAmount(item) {
  const qty = Number(item.quantity) || 0;
  const rate = Number(item.rate) || 0;
  return qty * rate;
}

// ── Main Component ─────────────────────────────────────────────────

export default function DeliveryChallanDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [challan, setChallan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ── Fetch challan ─────────────────────────────────────────────

  const fetchChallan = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get(`/delivery-challans/${id}`);
      const data = res.data.data || res.data;
      if (!data) {
        setError('Delivery challan not found');
        return;
      }
      setChallan(data);
    } catch (err) {
      if (err.response?.status === 404) {
        setError('Delivery challan not found');
      } else if (err.response?.status !== 401) {
        setError('Failed to load delivery challan');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchChallan();
  }, [fetchChallan]);

  // ── Actions ─────────────────────────────────────────────────────

  async function handleDelete() {
    setDeleting(true);
    try {
      await apiClient.delete(`/delivery-challans/${id}`);
      toast.success('Delivery challan deleted successfully');
      navigate('/delivery-challans', { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to delete delivery challan';
      toast.error(msg);
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  }

  // ── Loading / Error ─────────────────────────────────────────────

  if (loading) {
    return (
      <div className="py-20">
        <LoadingSpinner size="lg" label="Loading delivery challan..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-20 text-center">
        <HiOutlineDocumentText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-lg font-medium text-[var(--zoho-text)] mb-2">{error}</h2>
        <Link
          to="/delivery-challans"
          className="text-sm text-[#0071DC] hover:underline"
        >
          Back to Delivery Challans
        </Link>
      </div>
    );
  }

  if (!challan) return null;

  // ── Compute display values ────────────────────────────────────

  const items = challan.items || challan.delivery_challan_items || [];
  const customer = challan.customer || {};

  // Calculate totals from items
  let subtotal = Number(challan.total_amount) || 0;
  if (!subtotal && items.length > 0) {
    subtotal = items.reduce((sum, item) => sum + computeItemAmount(item), 0);
  }

  const canEdit = challan.status === 'Draft' || challan.status === 'Open';
  const canDelete = challan.status === 'Draft';

  // Format shipping address
  const shipAddress = [
    challan.ship_to_address,
    [challan.ship_to_city, challan.ship_to_state, challan.ship_to_pincode]
      .filter(Boolean)
      .join(', '),
  ].filter(Boolean);

  return (
    <div className="pb-8">
      {/* Header */}
      <div className="bg-white border-b border-[var(--zoho-border)] px-6 py-4 -mx-6 -mt-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/delivery-challans')}
              className="p-1.5 rounded-md text-[var(--zoho-text-secondary)] hover:text-[var(--zoho-text)] hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <HiOutlineArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-semibold text-[var(--zoho-text)]">
                  {challan.challan_number || 'Delivery Challan'}
                </h1>
                <StatusBadge status={challan.status} />
              </div>
              {challan.challan_type && (
                <p className="text-xs text-[var(--zoho-text-secondary)] mt-0.5">
                  Type: {challan.challan_type}
                </p>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => printPdf(`/api/pdf/delivery-challan/${id}`)}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--zoho-text-secondary)] bg-white border border-[var(--zoho-border)] px-3 py-2 rounded-md hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <HiOutlinePrinter className="w-4 h-4" />
              Print
            </button>
            <button
              onClick={() => openPdf(`/api/pdf/delivery-challan/${id}`)}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--zoho-text-secondary)] bg-white border border-[var(--zoho-border)] px-3 py-2 rounded-md hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <HiOutlineDocumentText className="w-4 h-4" />
              PDF
            </button>
            <ShareButton
              documentType="Delivery Challan"
              documentNumber={challan.challan_number || ''}
              documentId={id}
              recipientName={customer.display_name || customer.company_name || challan.customer_name || ''}
              recipientEmail={customer.email || ''}
              recipientPhone={customer.phone || customer.mobile || ''}
              amount={subtotal}
              date={challan.challan_date}
              pdfUrl={`/api/pdf/delivery-challan/${id}`}
            />

            {canEdit && (
              <Link
                to={`/delivery-challans/${id}/edit`}
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
        {/* ── Challan Info ──────────────────────────────────────────── */}
        <div className="bg-white rounded-lg border border-[var(--zoho-border)] p-6">
          <h3 className="text-xs font-semibold text-[var(--zoho-text-secondary)] uppercase tracking-wide mb-4">
            Challan Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-0">
            <DetailRow label="Challan Number" value={challan.challan_number || '--'} />
            <DetailRow label="Challan Date">
              <DateCell date={challan.challan_date} />
            </DetailRow>
            <DetailRow label="Status">
              <StatusBadge status={challan.status} />
            </DetailRow>
            <DetailRow label="Customer">
              {customer.display_name || customer.company_name || challan.customer_name || '--'}
            </DetailRow>
            <DetailRow label="Challan Type" value={challan.challan_type || '--'} />
            {challan.invoice_id && (
              <DetailRow label="Invoice Ref" value={challan.invoice_id} />
            )}
          </div>
        </div>

        {/* ── Transport Details ─────────────────────────────────────── */}
        {(challan.transporter_name || challan.vehicle_number) && (
          <div className="bg-white rounded-lg border border-[var(--zoho-border)] p-6">
            <div className="flex items-center gap-2 mb-4">
              <HiOutlineTruck className="w-4 h-4 text-[var(--zoho-text-secondary)]" />
              <h3 className="text-xs font-semibold text-[var(--zoho-text-secondary)] uppercase tracking-wide">
                Transport Details
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-0">
              <DetailRow label="Transporter" value={challan.transporter_name || '--'} />
              <DetailRow label="Vehicle Number" value={challan.vehicle_number || '--'} />
            </div>
          </div>
        )}

        {/* ── Shipping Address ──────────────────────────────────────── */}
        {shipAddress.length > 0 && (
          <div className="bg-white rounded-lg border border-[var(--zoho-border)] p-6">
            <h3 className="text-xs font-semibold text-[var(--zoho-text-secondary)] uppercase tracking-wide mb-3">
              Shipping Address
            </h3>
            <div className="text-sm text-[var(--zoho-text)] leading-relaxed">
              {shipAddress.map((line, i) => (
                <div key={i}>{line}</div>
              ))}
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
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--zoho-text-secondary)] w-32">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => {
                  const amount = Number(item.amount) || computeItemAmount(item);
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
                      <td className="px-4 py-3 text-right text-sm font-medium text-[var(--zoho-text)] tabular-nums">
                        {'\u20B9'}{formatIndianNumber(amount)}
                      </td>
                    </tr>
                  );
                })}

                {items.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">
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
                  <div className="flex items-center justify-between pt-3 border-t border-gray-300">
                    <span className="text-base font-bold text-[var(--zoho-text)]">Total</span>
                    <span className="text-lg font-bold text-[var(--zoho-text)] tabular-nums">
                      {formatINR(subtotal)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Remarks ──────────────────────────────────────────────── */}
        {challan.remarks && (
          <div className="bg-white rounded-lg border border-[var(--zoho-border)] p-6">
            <h4 className="text-xs font-semibold text-[var(--zoho-text-secondary)] uppercase tracking-wide mb-2">
              Remarks
            </h4>
            <p className="text-sm text-[var(--zoho-text)] whitespace-pre-wrap leading-relaxed">
              {challan.remarks}
            </p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete Delivery Challan"
        message={`Are you sure you want to delete delivery challan ${challan.challan_number || ''}? This action cannot be undone.`}
        confirmLabel="Delete Delivery Challan"
        loading={deleting}
      />
    </div>
  );
}
