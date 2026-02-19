import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  HiOutlineArrowLeft,
  HiOutlinePencilSquare,
  HiOutlineTrash,
  HiOutlinePrinter,
  HiOutlineDocumentText,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import apiClient from '../../api/client';
import { openPdf, printPdf } from '../../utils/pdf';
import StatusBadge from '../../components/data-display/StatusBadge';
import DateCell from '../../components/data-display/DateCell';
import DetailRow from '../../components/data-display/DetailRow';
import LoadingSpinner from '../../components/feedback/LoadingSpinner';
import DeleteConfirmModal from '../../components/feedback/DeleteConfirmModal';
import ShareButton from '../../components/sharing/ShareButton';

function computeCBM(item) {
  const l = Number(item.length_cm) || 0;
  const w = Number(item.width_cm) || 0;
  const h = Number(item.height_cm) || 0;
  return (l * w * h) / 1000000;
}

export default function PackingListDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [pl, setPl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchPL = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await apiClient.get(`/packing-lists/${id}`);
      const data = res.data.data || res.data;
      if (!data) { setError('Packing list not found'); return; }
      setPl(data);
    } catch (err) {
      if (err.response?.status === 404) setError('Packing list not found');
      else if (err.response?.status !== 401) setError('Failed to load packing list');
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { fetchPL(); }, [fetchPL]);

  async function handleDelete() {
    setDeleting(true);
    try { await apiClient.delete(`/packing-lists/${id}`); toast.success('Packing list deleted successfully'); navigate('/packing-lists', { replace: true }); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed to delete packing list'); }
    finally { setDeleting(false); setShowDeleteModal(false); }
  }

  if (loading) return <div className="py-20"><LoadingSpinner size="lg" label="Loading packing list..." /></div>;
  if (error) return (
    <div className="py-20 text-center">
      <HiOutlineDocumentText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
      <h2 className="text-lg font-medium text-[var(--zoho-text)] mb-2">{error}</h2>
      <Link to="/packing-lists" className="text-sm text-[#0071DC] hover:underline">Back to Packing Lists</Link>
    </div>
  );
  if (!pl) return null;

  const items = pl.items || pl.packing_list_items || [];
  const customer = pl.customer || {};
  const canEdit = pl.status === 'Draft';
  const canDelete = pl.status === 'Draft';

  let totalCartons = Number(pl.total_cartons) || items.length;
  let totalNet = Number(pl.total_net_weight) || 0;
  let totalGross = Number(pl.total_gross_weight) || 0;
  let totalCbm = Number(pl.total_cbm) || 0;
  let totalQty = 0;

  if (items.length > 0 && !totalNet) {
    totalNet = items.reduce((s, i) => s + (Number(i.net_weight) || 0), 0);
    totalGross = items.reduce((s, i) => s + (Number(i.gross_weight) || 0), 0);
    totalCbm = items.reduce((s, i) => s + computeCBM(i), 0);
  }
  totalQty = items.reduce((s, i) => s + (Number(i.quantity) || 0), 0);

  const shipAddress = [pl.ship_to_address, [pl.ship_to_city, pl.ship_to_state, pl.ship_to_pincode].filter(Boolean).join(', ')].filter(Boolean);

  return (
    <div className="pb-8">
      <div className="bg-white border-b border-[var(--zoho-border)] px-6 py-4 -mx-6 -mt-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/packing-lists')} className="p-1.5 rounded-md text-[var(--zoho-text-secondary)] hover:text-[var(--zoho-text)] hover:bg-gray-100 transition-colors cursor-pointer"><HiOutlineArrowLeft className="w-5 h-5" /></button>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold text-[var(--zoho-text)]">{pl.packing_number || 'Packing List'}</h1>
              <StatusBadge status={pl.status} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => printPdf(`/api/pdf/packing-list/${id}`)} className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--zoho-text-secondary)] bg-white border border-[var(--zoho-border)] px-3 py-2 rounded-md hover:bg-gray-50 transition-colors cursor-pointer"><HiOutlinePrinter className="w-4 h-4" /> Print</button>
            <button onClick={() => openPdf(`/api/pdf/packing-list/${id}`)} className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--zoho-text-secondary)] bg-white border border-[var(--zoho-border)] px-3 py-2 rounded-md hover:bg-gray-50 transition-colors cursor-pointer"><HiOutlineDocumentText className="w-4 h-4" /> PDF</button>
            <ShareButton
              documentType="Packing List"
              documentNumber={pl.packing_number || ''}
              documentId={id}
              recipientName={customer.display_name || customer.company_name || pl.customer_name || ''}
              recipientEmail={customer.email || ''}
              recipientPhone={customer.phone || customer.mobile || ''}
              date={pl.packing_date}
              pdfUrl={`/api/pdf/packing-list/${id}`}
            />
            {canEdit && <Link to={`/packing-lists/${id}/edit`} className="inline-flex items-center gap-1.5 text-sm font-medium text-white bg-[#0071DC] px-3 py-2 rounded-md hover:bg-[#005BB5] transition-colors"><HiOutlinePencilSquare className="w-4 h-4" /> Edit</Link>}
            {canDelete && <button onClick={() => setShowDeleteModal(true)} className="inline-flex items-center gap-1.5 text-sm font-medium text-red-600 bg-white border border-red-200 px-3 py-2 rounded-md hover:bg-red-50 transition-colors cursor-pointer"><HiOutlineTrash className="w-4 h-4" /> Delete</button>}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-white rounded-lg border border-[var(--zoho-border)] p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-0">
            <DetailRow label="Packing Date"><DateCell date={pl.packing_date} /></DetailRow>
            <DetailRow label="Status"><StatusBadge status={pl.status} /></DetailRow>
            <DetailRow label="Customer">{customer.display_name || customer.company_name || pl.customer_name || '--'}</DetailRow>
            {pl.notify_party && <DetailRow label="Notify Party" value={pl.notify_party} />}
          </div>
        </div>

        {shipAddress.length > 0 && (
          <div className="bg-white rounded-lg border border-[var(--zoho-border)] p-6">
            <h4 className="text-xs font-semibold text-[var(--zoho-text-secondary)] uppercase tracking-wide mb-3">Ship To</h4>
            <div className="text-sm text-[var(--zoho-text)] leading-relaxed">{shipAddress.map((line, i) => <div key={i}>{line}</div>)}</div>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'Total Cartons', value: totalCartons },
            { label: 'Total Qty', value: totalQty },
            { label: 'Net Weight', value: `${totalNet.toFixed(2)} kg` },
            { label: 'Gross Weight', value: `${totalGross.toFixed(2)} kg` },
            { label: 'Total CBM', value: `${totalCbm.toFixed(4)} m\u00B3` },
          ].map((card) => (
            <div key={card.label} className="bg-white rounded-lg border border-[var(--zoho-border)] p-4 text-center">
              <p className="text-xs text-[var(--zoho-text-secondary)] uppercase tracking-wide">{card.label}</p>
              <p className="text-lg font-bold text-[var(--zoho-text)] mt-1 tabular-nums">{card.value}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-lg border border-[var(--zoho-border)] overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--zoho-border)]"><h3 className="text-sm font-semibold text-[var(--zoho-text)] uppercase tracking-wide">Carton / Item Details</h3></div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="bg-gray-50 border-b border-[var(--zoho-border)]">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--zoho-text-secondary)] w-10">#</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--zoho-text-secondary)] min-w-[160px]">Item</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--zoho-text-secondary)] w-28">Carton #</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--zoho-text-secondary)] w-16">Qty</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--zoho-text-secondary)] w-32">Dimensions (cm)</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--zoho-text-secondary)] w-24">Net Wt</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--zoho-text-secondary)] w-24">Gross Wt</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--zoho-text-secondary)] w-24">CBM</th>
              </tr></thead>
              <tbody>
                {items.map((item, index) => {
                  const cbm = Number(item.cbm) || computeCBM(item);
                  const dims = [item.length_cm, item.width_cm, item.height_cm].filter(v => Number(v) > 0).join(' x ') || '--';
                  return (
                    <tr key={item.id || index} className="border-b border-gray-100 hover:bg-gray-50/50">
                      <td className="px-4 py-3 text-xs text-[var(--zoho-text-secondary)]">{index + 1}</td>
                      <td className="px-4 py-3 text-sm font-medium text-[var(--zoho-text)]">{item.item_name || '--'}</td>
                      <td className="px-4 py-3 text-sm text-[var(--zoho-text)]">{item.carton_number || '--'}</td>
                      <td className="px-4 py-3 text-right text-sm text-[var(--zoho-text)] tabular-nums">{item.quantity ?? '--'}</td>
                      <td className="px-4 py-3 text-right text-sm text-[var(--zoho-text)] tabular-nums">{dims}</td>
                      <td className="px-4 py-3 text-right text-sm text-[var(--zoho-text)] tabular-nums">{Number(item.net_weight) ? `${Number(item.net_weight).toFixed(2)} kg` : '--'}</td>
                      <td className="px-4 py-3 text-right text-sm text-[var(--zoho-text)] tabular-nums">{Number(item.gross_weight) ? `${Number(item.gross_weight).toFixed(2)} kg` : '--'}</td>
                      <td className="px-4 py-3 text-right text-sm text-[var(--zoho-text)] tabular-nums">{cbm.toFixed(4)}</td>
                    </tr>
                  );
                })}
                {items.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-400">No items</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        {pl.remarks && (
          <div className="bg-white rounded-lg border border-[var(--zoho-border)] p-6">
            <h4 className="text-xs font-semibold text-[var(--zoho-text-secondary)] uppercase tracking-wide mb-2">Remarks</h4>
            <p className="text-sm text-[var(--zoho-text)] whitespace-pre-wrap leading-relaxed">{pl.remarks}</p>
          </div>
        )}
      </div>

      <DeleteConfirmModal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} onConfirm={handleDelete} title="Delete Packing List" message={`Are you sure you want to delete packing list ${pl.packing_number || ''}? This action cannot be undone.`} confirmLabel="Delete Packing List" loading={deleting} />
    </div>
  );
}
