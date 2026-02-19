import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  HiOutlineArrowLeft,
  HiOutlinePencilSquare,
  HiOutlineTrash,
  HiOutlineDocumentText,
  HiOutlineClipboardDocumentList,
  HiOutlinePrinter,
  HiOutlineCurrencyRupee,
  HiOutlineChartBarSquare,
  HiOutlineSwatch,
  HiOutlineScissors,
  HiOutlineCube,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { costingApi } from '../../api/costing.api';
import { openPdf, printPdf } from '../../utils/pdf';
import { formatINR } from '../../utils/currency';
import StatusBadge from '../../components/data-display/StatusBadge';
import LoadingSpinner from '../../components/feedback/LoadingSpinner';
import DeleteConfirmModal from '../../components/feedback/DeleteConfirmModal';

// ── Helpers ───────────────────────────────────────────────────────

function formatDate(dateStr) {
  if (!dateStr) return '--';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function formatNumber(val) {
  if (val == null || isNaN(val)) return '--';
  return Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getMarginColor(percent) {
  const num = Number(percent);
  if (isNaN(num)) return 'text-[#6B7280]';
  if (num >= 30) return 'text-green-600';
  if (num >= 15) return 'text-amber-600';
  return 'text-red-600';
}

function getMarginBg(percent) {
  const num = Number(percent);
  if (isNaN(num)) return 'bg-gray-50';
  if (num >= 30) return 'bg-green-50 border-green-200';
  if (num >= 15) return 'bg-amber-50 border-amber-200';
  return 'bg-red-50 border-red-200';
}

// ── Cost Table Component ──────────────────────────────────────────

function CostTable({ title, icon: Icon, iconColor, columns, items, totalLabel = 'Subtotal' }) {
  if (!items || items.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-[#E5E7EB] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center gap-3">
          <Icon className={`w-5 h-5 ${iconColor}`} />
          <h3 className="text-sm font-semibold text-[#333] uppercase tracking-wide">{title}</h3>
          <span className="text-xs text-[#9CA3AF] ml-1">(0 items)</span>
        </div>
        <div className="p-8 text-center text-sm text-[#9CA3AF]">
          No {title.toLowerCase()} items
        </div>
      </div>
    );
  }

  // Calculate subtotal from last column values
  const subtotal = items.reduce((sum, item) => {
    const lastCol = columns[columns.length - 1];
    return sum + (Number(item[lastCol.key]) || 0);
  }, 0);

  return (
    <div className="bg-white rounded-lg border border-[#E5E7EB] overflow-hidden">
      <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Icon className={`w-5 h-5 ${iconColor}`} />
          <h3 className="text-sm font-semibold text-[#333] uppercase tracking-wide">{title}</h3>
          <span className="text-xs text-[#9CA3AF] ml-1">({items.length} {items.length === 1 ? 'item' : 'items'})</span>
        </div>
        <span className="text-sm font-semibold text-[#333] tabular-nums">{formatINR(subtotal)}</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-[#E5E7EB]">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#6B7280] w-10">#</th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B7280] ${
                    col.align === 'right' ? 'text-right' : 'text-left'
                  } ${col.width || ''}`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={item.id || index} className="border-b border-gray-100 hover:bg-gray-50/50">
                <td className="px-4 py-3 text-xs text-[#6B7280]">{index + 1}</td>
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-3 text-sm ${
                      col.align === 'right' ? 'text-right tabular-nums' : 'text-left'
                    } ${col.key === 'name' ? 'font-medium text-[#333]' : 'text-[#6B7280]'}`}
                  >
                    {col.format
                      ? col.format(item[col.key])
                      : col.key === 'amount'
                        ? formatINR(item[col.key])
                        : item[col.key] ?? '--'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 border-t border-[#E5E7EB]">
              <td colSpan={columns.length} className="px-4 py-3 text-right text-sm font-semibold text-[#333]">
                {totalLabel}
              </td>
              <td className="px-4 py-3 text-right text-sm font-semibold text-[#333] tabular-nums">
                {formatINR(subtotal)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// ── Main Costing Detail Page ──────────────────────────────────────

export default function CostingDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [sheet, setSheet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ── Fetch Costing Sheet ─────────────────────────────────────────

  const fetchSheet = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await costingApi.getById(id);
      const data = res.data.data || res.data;
      if (!data) {
        setError('Costing sheet not found');
        return;
      }
      setSheet(data);
    } catch (err) {
      if (err.response?.status === 404) {
        setError('Costing sheet not found');
      } else if (err.response?.status !== 401) {
        setError('Failed to load costing sheet');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchSheet();
  }, [fetchSheet]);

  // ── Delete Handler ──────────────────────────────────────────────

  async function handleDelete() {
    setDeleting(true);
    try {
      await costingApi.remove(id);
      toast.success('Costing sheet deleted successfully');
      navigate('/costing', { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Failed to delete costing sheet';
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
        <LoadingSpinner size="lg" label="Loading costing sheet..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-20 text-center">
        <HiOutlineClipboardDocumentList className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-lg font-medium text-[#333] mb-2">{error}</h2>
        <Link to="/costing" className="text-sm text-[#0071DC] hover:underline">
          Back to Costing Sheets
        </Link>
      </div>
    );
  }

  if (!sheet) return null;

  // ── Computed Values ─────────────────────────────────────────────

  const fabricItems = sheet.fabric_items || [];
  const trimItems = sheet.trim_items || [];
  const packingItems = sheet.packing_items || [];

  const fabricTotal = fabricItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const trimTotal = trimItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const packingTotal = packingItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const totalCost = Number(sheet.total_cost) || (fabricTotal + trimTotal + packingTotal);
  const sellingPrice = Number(sheet.selling_price) || 0;
  const marginPercent = Number(sheet.margin_percent) || (sellingPrice > 0 ? ((sellingPrice - totalCost) / sellingPrice * 100) : 0);

  // ── Column definitions ──────────────────────────────────────────

  const fabricColumns = [
    { key: 'name', label: 'Fabric Name' },
    { key: 'width', label: 'Width', align: 'right', format: (v) => v ? `${v}"` : '--' },
    { key: 'gsm', label: 'GSM', align: 'right' },
    { key: 'consumption', label: 'Consumption', align: 'right', format: (v) => formatNumber(v) },
    { key: 'rate', label: 'Rate', align: 'right', format: (v) => formatINR(v) },
    { key: 'wastage', label: 'Wastage %', align: 'right', format: (v) => v ? `${v}%` : '--' },
    { key: 'amount', label: 'Amount', align: 'right' },
  ];

  const trimColumns = [
    { key: 'name', label: 'Trim Name' },
    { key: 'consumption', label: 'Consumption', align: 'right', format: (v) => formatNumber(v) },
    { key: 'rate', label: 'Rate', align: 'right', format: (v) => formatINR(v) },
    { key: 'amount', label: 'Amount', align: 'right' },
  ];

  const packingColumns = [
    { key: 'name', label: 'Packing Item' },
    { key: 'qty', label: 'Qty', align: 'right' },
    { key: 'rate', label: 'Rate', align: 'right', format: (v) => formatINR(v) },
    { key: 'amount', label: 'Amount', align: 'right' },
  ];

  return (
    <div className="pb-8">
      {/* ── Header Bar ──────────────────────────────────────────── */}
      <div className="bg-white border-b border-[#E5E7EB] px-6 py-4 -mx-6 -mt-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/costing')}
              className="p-1.5 rounded-md text-[#6B7280] hover:text-[#333] hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <HiOutlineArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-semibold text-[#333]">
                  {sheet.sheet_number || 'Costing Sheet'}
                </h1>
                <StatusBadge status={sheet.status} />
              </div>
              <p className="text-xs text-[#6B7280] mt-0.5">
                {sheet.style_name && `Style: ${sheet.style_name}`}
                {sheet.style_name && sheet.customer_name && ' | '}
                {sheet.customer_name && `Customer: ${sheet.customer_name}`}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => printPdf(`/api/pdf/costing/${id}`)}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--zoho-text-secondary)] bg-white border border-[var(--zoho-border)] px-3 py-2 rounded-md hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <HiOutlinePrinter className="w-4 h-4" />
              Print
            </button>
            <button
              onClick={() => openPdf(`/api/pdf/costing/${id}`)}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--zoho-text-secondary)] bg-white border border-[var(--zoho-border)] px-3 py-2 rounded-md hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <HiOutlineDocumentText className="w-4 h-4" />
              PDF
            </button>
            <Link
              to={`/costing/${id}/edit`}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-white bg-[#0071DC] px-3 py-2 rounded-md hover:bg-[#005BB5] transition-colors"
            >
              <HiOutlinePencilSquare className="w-4 h-4" />
              Edit
            </Link>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-red-600 bg-white border border-red-200 px-3 py-2 rounded-md hover:bg-red-50 transition-colors cursor-pointer"
            >
              <HiOutlineTrash className="w-4 h-4" />
              Delete
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* ── Summary Cards ──────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-4 flex items-center gap-4">
            <div className="w-11 h-11 rounded-lg bg-blue-500 flex items-center justify-center">
              <HiOutlineCurrencyRupee className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-[#6B7280] font-medium uppercase tracking-wide">Total Cost</p>
              <p className="text-lg font-semibold text-[#333] mt-0.5 tabular-nums">{formatINR(totalCost)}</p>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-4 flex items-center gap-4">
            <div className="w-11 h-11 rounded-lg bg-green-500 flex items-center justify-center">
              <HiOutlineCurrencyRupee className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-[#6B7280] font-medium uppercase tracking-wide">Selling Price</p>
              <p className="text-lg font-semibold text-[#333] mt-0.5 tabular-nums">{formatINR(sellingPrice)}</p>
            </div>
          </div>
          <div className={`rounded-lg border shadow-sm p-4 flex items-center gap-4 ${getMarginBg(marginPercent)}`}>
            <div className="w-11 h-11 rounded-lg bg-white/80 flex items-center justify-center">
              <HiOutlineChartBarSquare className={`w-5 h-5 ${getMarginColor(marginPercent)}`} />
            </div>
            <div>
              <p className="text-xs text-[#6B7280] font-medium uppercase tracking-wide">Margin</p>
              <p className={`text-lg font-semibold mt-0.5 tabular-nums ${getMarginColor(marginPercent)}`}>
                {marginPercent.toFixed(1)}%
              </p>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-4 flex items-center gap-4">
            <div className="w-11 h-11 rounded-lg bg-purple-500 flex items-center justify-center">
              <HiOutlineDocumentText className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-[#6B7280] font-medium uppercase tracking-wide">Status</p>
              <div className="mt-1">
                <StatusBadge status={sheet.status} />
              </div>
            </div>
          </div>
        </div>

        {/* ── Style Info Section ──────────────────────────────────── */}
        <div className="bg-white rounded-lg border border-[#E5E7EB] p-6">
          <h3 className="text-sm font-semibold text-[#333] uppercase tracking-wide mb-4 flex items-center gap-2">
            <HiOutlineSwatch className="w-4 h-4 text-[#0071DC]" />
            Style Information
          </h3>
          <div className="flex gap-6">
            {/* Style Image */}
            {sheet.image_url && (
              <div className="flex-shrink-0">
                <img
                  src={sheet.image_url}
                  alt={sheet.style_name || 'Style image'}
                  className="w-40 h-40 object-cover rounded-lg border border-[#E5E7EB] shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => window.open(sheet.image_url, '_blank')}
                  title="Click to view full size"
                />
              </div>
            )}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-3">
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-sm text-[#6B7280]">Sheet Number</span>
                <span className="text-sm font-medium text-[#333]">{sheet.sheet_number || '--'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-sm text-[#6B7280]">Style Name</span>
                <span className="text-sm font-medium text-[#333]">{sheet.style_name || '--'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-sm text-[#6B7280]">Customer</span>
                <span className="text-sm font-medium text-[#333]">{sheet.customer_name || '--'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-sm text-[#6B7280]">Status</span>
                <StatusBadge status={sheet.status} size="sm" />
              </div>
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-sm text-[#6B7280]">Created</span>
                <span className="text-sm font-medium text-[#333]">{formatDate(sheet.created_at)}</span>
              </div>
              {sheet.remarks && (
                <div className="flex justify-between py-2 border-b border-gray-50 lg:col-span-3">
                  <span className="text-sm text-[#6B7280] shrink-0 mr-4">Remarks</span>
                  <span className="text-sm text-[#333] text-right">{sheet.remarks}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Fabric Cost ──────────────────────────────────────────── */}
        <CostTable
          title="Fabric Cost"
          icon={HiOutlineSwatch}
          iconColor="text-blue-600"
          columns={fabricColumns}
          items={fabricItems}
          totalLabel="Fabric Subtotal"
        />

        {/* ── Trim Cost ────────────────────────────────────────────── */}
        <CostTable
          title="Trim Cost"
          icon={HiOutlineScissors}
          iconColor="text-purple-600"
          columns={trimColumns}
          items={trimItems}
          totalLabel="Trim Subtotal"
        />

        {/* ── Packing Cost ─────────────────────────────────────────── */}
        <CostTable
          title="Packing Cost"
          icon={HiOutlineCube}
          iconColor="text-amber-600"
          columns={packingColumns}
          items={packingItems}
          totalLabel="Packing Subtotal"
        />

        {/* ── Grand Total Summary ──────────────────────────────────── */}
        <div className="bg-white rounded-lg border border-[#E5E7EB] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E5E7EB]">
            <h3 className="text-sm font-semibold text-[#333] uppercase tracking-wide">Cost Summary</h3>
          </div>
          <div className="p-6">
            <div className="max-w-md ml-auto space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#6B7280]">Fabric Cost</span>
                <span className="font-medium text-[#333] tabular-nums">{formatINR(fabricTotal)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#6B7280]">Trim Cost</span>
                <span className="font-medium text-[#333] tabular-nums">{formatINR(trimTotal)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#6B7280]">Packing Cost</span>
                <span className="font-medium text-[#333] tabular-nums">{formatINR(packingTotal)}</span>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                <span className="text-base font-bold text-[#333]">Total Cost</span>
                <span className="text-lg font-bold text-[#333] tabular-nums">{formatINR(totalCost)}</span>
              </div>

              <div className="flex items-center justify-between text-sm pt-2">
                <span className="text-[#6B7280]">Selling Price</span>
                <span className="font-semibold text-[#333] tabular-nums">{formatINR(sellingPrice)}</span>
              </div>

              <div className={`flex items-center justify-between rounded-lg px-4 py-3 border ${getMarginBg(marginPercent)}`}>
                <span className="text-sm font-semibold text-[#333]">Margin</span>
                <div className="text-right">
                  <span className={`text-lg font-bold tabular-nums ${getMarginColor(marginPercent)}`}>
                    {marginPercent.toFixed(1)}%
                  </span>
                  <p className="text-xs text-[#6B7280] mt-0.5">
                    {formatINR(sellingPrice - totalCost)} per unit
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete Costing Sheet"
        message={`Are you sure you want to delete costing sheet ${sheet.sheet_number || ''}? This action cannot be undone.`}
        confirmLabel="Delete Sheet"
        loading={deleting}
      />
    </div>
  );
}
