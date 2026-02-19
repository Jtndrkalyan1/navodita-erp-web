import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  HiOutlineArrowLeft,
  HiOutlinePencilSquare,
  HiOutlineTrash,
  HiOutlineCube,
  HiOutlineDocumentText,
  HiOutlineCurrencyRupee,
  HiOutlineArchiveBox,
  HiOutlineExclamationTriangle,
  HiOutlinePrinter,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { itemApi } from '../../api/item.api';
import { openPdf, printPdf } from '../../utils/pdf';

/**
 * Format a number in Indian numbering system (lakhs/crores).
 */
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

export default function ItemDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchItem = async () => {
      setLoading(true);
      try {
        const response = await itemApi.getById(id);
        const data = response.data?.data;
        if (!data) {
          toast.error('Item not found');
          navigate('/items');
          return;
        }
        setItem(data);
      } catch (err) {
        if (err.response?.status === 404) {
          toast.error('Item not found');
          navigate('/items');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchItem();
  }, [id, navigate]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await itemApi.remove(id);
      toast.success('Item deleted successfully');
      navigate('/items');
    } catch (err) {
      if (err.response?.data?.error) {
        toast.error(err.response.data.error);
      }
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#0071DC] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-[#6B7280]">Loading item details...</span>
        </div>
      </div>
    );
  }

  if (!item) return null;

  const isGoods = item.item_type === 'Goods';

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/items')}
            className="p-2 rounded-lg hover:bg-[#F3F4F6] transition-colors"
            title="Back to items"
          >
            <HiOutlineArrowLeft className="w-5 h-5 text-[#6B7280]" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-[#333]">{item.name}</h1>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                  item.item_type === 'Goods'
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-purple-50 text-purple-700 border-purple-200'
                }`}
              >
                {item.item_type || 'Goods'}
              </span>
              {item.is_active !== false ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                  Active
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                  Inactive
                </span>
              )}
            </div>
            {item.sku && (
              <p className="text-xs text-[#9CA3AF] font-mono mt-0.5">SKU: {item.sku}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => printPdf(`/api/pdf/item/${id}`)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--zoho-text-secondary)] bg-white border border-[var(--zoho-border)] px-3 py-2 rounded-md hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <HiOutlinePrinter className="w-4 h-4" />
            Print
          </button>
          <button
            onClick={() => openPdf(`/api/pdf/item/${id}`)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--zoho-text-secondary)] bg-white border border-[var(--zoho-border)] px-3 py-2 rounded-md hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <HiOutlineDocumentText className="w-4 h-4" />
            PDF
          </button>
          <Link
            to={`/items/${id}/edit`}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-[#333] bg-white border border-[#E5E7EB] rounded-lg hover:bg-[#F9FAFB] transition-colors"
          >
            <HiOutlinePencilSquare className="w-4 h-4" />
            Edit
          </Link>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
          >
            <HiOutlineTrash className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Overview + Pricing */}
        <div className="lg:col-span-2 space-y-6">
          {/* Overview Section */}
          <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6">
            <h2 className="text-base font-semibold text-[#333] mb-4">Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
              <InfoRow label="Item Name" value={item.name} icon={HiOutlineCube} />
              <InfoRow label="SKU" value={item.sku} icon={HiOutlineDocumentText} />
              <InfoRow label="Item Type" value={item.item_type} />
              <InfoRow label="Unit" value={item.unit} />
              <InfoRow label="HSN / SAC Code" value={item.hsn_code} icon={HiOutlineDocumentText} />
            </div>
            {item.description && (
              <div className="mt-4 pt-4 border-t border-[#E5E7EB]">
                <p className="text-xs text-[#6B7280] font-medium uppercase tracking-wide mb-1">Description</p>
                <p className="text-sm text-[#333] whitespace-pre-wrap">{item.description}</p>
              </div>
            )}
          </div>

          {/* Pricing Section */}
          <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6">
            <h2 className="text-base font-semibold text-[#333] mb-4">Pricing</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
              <InfoRow
                label="Selling Price"
                value={formatIndianCurrency(item.selling_price)}
                icon={HiOutlineCurrencyRupee}
              />
              <InfoRow
                label="Purchase Price"
                value={formatIndianCurrency(item.purchase_price)}
                icon={HiOutlineCurrencyRupee}
              />
              <InfoRow
                label="GST Rate"
                value={item.gst_rate != null ? `${item.gst_rate}%` : '--'}
              />
              <InfoRow
                label="Cess Rate"
                value={item.cess_rate ? `${item.cess_rate}%` : '--'}
              />
            </div>
          </div>

          {/* Inventory Section (only for Goods) */}
          {isGoods && (
            <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6">
              <h2 className="text-base font-semibold text-[#333] mb-4">Inventory</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
                <InfoRow
                  label="Opening Stock"
                  value={
                    item.opening_stock != null
                      ? `${Number(item.opening_stock).toLocaleString('en-IN')} ${item.unit || 'nos'}`
                      : '--'
                  }
                  icon={HiOutlineArchiveBox}
                />
                <InfoRow
                  label="Reorder Level"
                  value={
                    item.reorder_level != null
                      ? `${Number(item.reorder_level).toLocaleString('en-IN')} ${item.unit || 'nos'}`
                      : '--'
                  }
                  icon={HiOutlineArchiveBox}
                />
                <InfoRow
                  label="Preferred Vendor"
                  value={item.preferred_vendor}
                />
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Notes + Activity */}
        <div className="space-y-6">
          {/* Notes */}
          {item.notes && (
            <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6">
              <h2 className="text-base font-semibold text-[#333] mb-3">Notes</h2>
              <p className="text-sm text-[#6B7280] whitespace-pre-wrap">{item.notes}</p>
            </div>
          )}

          {/* Activity / Timestamps */}
          <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6">
            <h2 className="text-base font-semibold text-[#333] mb-3">Activity</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Created</span>
                <span className="text-[#333]">
                  {item.created_at
                    ? new Date(item.created_at).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })
                    : '--'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Last Updated</span>
                <span className="text-[#333]">
                  {item.updated_at
                    ? new Date(item.updated_at).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })
                    : '--'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => !deleting && setShowDeleteModal(false)}
          />

          {/* Modal */}
          <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <HiOutlineExclamationTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#333]">Delete Item</h3>
                <p className="text-sm text-[#6B7280] mt-1">
                  Are you sure you want to delete <strong>{item.name}</strong>? This action cannot
                  be undone. Items referenced in invoices or bills cannot be deleted.
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
                {deleting ? 'Deleting...' : 'Delete Item'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
