import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  HiOutlineCube,
  HiOutlineExclamationTriangle,
  HiOutlineMagnifyingGlass,
  HiOutlineChevronDown,
  HiOutlineChevronUp,
  HiOutlineChevronRight,
  HiOutlineArrowsUpDown,
  HiOutlineBanknotes,
  HiOutlineArchiveBox,
  HiOutlineArrowPath,
  HiOutlinePlus,
  HiOutlinePencilSquare,
  HiOutlineTrash,
  HiOutlineXMark,
  HiOutlineClipboardDocumentList,
  HiOutlinePrinter,
  HiOutlineDocumentArrowDown,
  HiOutlineTag,
  HiOutlineMapPin,
  HiOutlineQueueList,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import apiClient from '../../api/client';

// ── Helpers ─────────────────────────────────────────────────────

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

function formatDate(dateStr) {
  if (!dateStr) return '--';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '--';
  }
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

// ── Constants ───────────────────────────────────────────────────

const PAGE_SIZE = 25;

const GST_RATES = ['0', '0.25', '3', '5', '12', '18', '28'];

const UNITS = [
  'Pcs', 'Nos', 'Kg', 'Gm', 'Ltr', 'Ml', 'Mtr', 'Cm', 'Ft', 'In',
  'Box', 'Pack', 'Set', 'Pair', 'Roll', 'Bundle', 'Dozen', 'Bag', 'Yard',
];

const TRANSACTION_TYPES = [
  { value: 'Purchase', label: 'Purchase', direction: 'in' },
  { value: 'Sale', label: 'Sale', direction: 'out' },
  { value: 'Sold', label: 'Sold', direction: 'out' },
  { value: 'Shipped', label: 'Shipped', direction: 'out' },
  { value: 'Return', label: 'Return (Inbound)', direction: 'in' },
  { value: 'Returned', label: 'Returned (Inbound)', direction: 'in' },
  { value: 'Damaged', label: 'Damaged', direction: 'out' },
  { value: 'Adjustment In', label: 'Adjustment In', direction: 'in' },
  { value: 'Adjustment Out', label: 'Adjustment Out', direction: 'out' },
  { value: 'Adjustment', label: 'Adjustment (Inbound)', direction: 'in' },
  { value: 'Opening Stock', label: 'Opening Stock', direction: 'in' },
];

const INITIAL_ITEM_FORM = {
  item_name: '',
  sku: '',
  category: '',
  description: '',
  hsn_code: '',
  gst_rate: '',
  unit: 'Pcs',
  purchase_price: '',
  selling_price: '',
  opening_stock: '',
  reorder_level: '',
  location: '',
  serial_number: '',
};

const INITIAL_TXN_FORM = {
  transaction_type: 'Purchase',
  quantity: '',
  transaction_date: todayStr(),
  notes: '',
  reference: '',
};

// ── Summary Card ────────────────────────────────────────────────

function SummaryCard({ icon: Icon, label, value, color, subtext }) {
  return (
    <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-5">
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${color}15` }}
        >
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        <div>
          <p className="text-xs font-medium text-[#6B7280] uppercase tracking-wide">
            {label}
          </p>
          <p className="text-xl font-bold text-[#333] mt-0.5">{value}</p>
          {subtext && (
            <p className="text-xs text-[#6B7280] mt-0.5">{subtext}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sortable Column Header ──────────────────────────────────────

function SortableHeader({ label, field, currentSort, currentOrder, onSort, align }) {
  const isActive = currentSort === field;
  const nextOrder = isActive && currentOrder === 'asc' ? 'desc' : 'asc';

  return (
    <th
      className={`px-4 py-3 text-xs font-semibold text-[#6B7280] uppercase tracking-wider cursor-pointer hover:text-[#333] select-none ${
        align === 'right' ? 'text-right' : 'text-left'
      }`}
      onClick={() => onSort(field, nextOrder)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {isActive ? (
          currentOrder === 'asc' ? (
            <HiOutlineChevronUp className="w-3 h-3" />
          ) : (
            <HiOutlineChevronDown className="w-3 h-3" />
          )
        ) : (
          <HiOutlineArrowsUpDown className="w-3 h-3 opacity-40" />
        )}
      </span>
    </th>
  );
}

// ── Modal Wrapper ───────────────────────────────────────────────

function Modal({ open, onClose, title, width = 'max-w-2xl', children }) {
  const overlayRef = useRef(null);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-start justify-center pt-12 pb-12 bg-black/40"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className={`bg-white rounded-xl shadow-xl w-full ${width} mx-4 flex flex-col max-h-[calc(100vh-6rem)]`}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB]">
          <h2 className="text-lg font-semibold text-[#333]">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[#F3F4F6] transition-colors"
          >
            <HiOutlineXMark className="w-5 h-5 text-[#6B7280]" />
          </button>
        </div>
        {/* Body */}
        <div className="overflow-y-auto px-6 py-5 flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}

// ── Confirm Dialog ──────────────────────────────────────────────

function ConfirmDialog({ open, onClose, onConfirm, title, message, loading }) {
  const overlayRef = useRef(null);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <h3 className="text-lg font-semibold text-[#333] mb-2">{title}</h3>
        <p className="text-sm text-[#6B7280] mb-6">{message}</p>
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-[#333] bg-white border border-[#E5E7EB] rounded-lg hover:bg-[#F9FAFB] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {loading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────

export default function InventoryPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // State
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedItemId, setExpandedItemId] = useState(null);
  const [expandedData, setExpandedData] = useState(null);
  const [expandLoading, setExpandLoading] = useState(false);

  // Categories
  const [categories, setCategories] = useState([]);
  const [showCategories, setShowCategories] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryLoading, setCategoryLoading] = useState(false);

  // Item form modal
  const [showItemModal, setShowItemModal] = useState(false);
  const [itemForm, setItemForm] = useState(INITIAL_ITEM_FORM);
  const [editingItemId, setEditingItemId] = useState(null);
  const [itemSaving, setItemSaving] = useState(false);
  const [itemFormErrors, setItemFormErrors] = useState({});
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryInForm, setNewCategoryInForm] = useState('');

  // Transaction form modal
  const [showTxnModal, setShowTxnModal] = useState(false);
  const [txnForm, setTxnForm] = useState(INITIAL_TXN_FORM);
  const [txnItemId, setTxnItemId] = useState(null);
  const [txnItemName, setTxnItemName] = useState('');
  const [txnSaving, setTxnSaving] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Summary from backend
  const [summaryData, setSummaryData] = useState(null);

  // Filters from URL params
  const currentSearch = searchParams.get('search') || '';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const sortBy = searchParams.get('sort_by') || 'item_name';
  const sortOrder = searchParams.get('sort_order') || 'asc';

  // ── Fetch inventory items ─────────────────────────────────────

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page: currentPage,
        limit: PAGE_SIZE,
        sort_by: sortBy,
        sort_order: sortOrder,
      };
      if (currentSearch) params.search = currentSearch;

      const response = await apiClient.get('/inventory', { params });
      const data = response.data?.data || [];
      const totalCount = response.data?.total || 0;
      setItems(data);
      setTotal(totalCount);
    } catch (err) {
      if (err.response?.status !== 401) {
        setError('Failed to load inventory items. Please try again.');
      }
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [currentPage, currentSearch, sortBy, sortOrder]);

  const fetchSummary = useCallback(async () => {
    try {
      const response = await apiClient.get('/inventory/summary');
      setSummaryData(response.data?.data || null);
    } catch {
      // Silently fail - fall back to client-side calculation
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await apiClient.get('/inventory/categories');
      setCategories(response.data?.data || []);
    } catch {
      // Silently fail
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    fetchSummary();
    fetchCategories();
  }, [fetchSummary, fetchCategories]);

  // ── Expand/collapse item detail ───────────────────────────────

  const toggleExpand = async (itemId) => {
    if (expandedItemId === itemId) {
      setExpandedItemId(null);
      setExpandedData(null);
      return;
    }

    setExpandedItemId(itemId);
    setExpandLoading(true);
    try {
      const response = await apiClient.get(`/inventory/${itemId}`);
      setExpandedData(response.data?.data || response.data || null);
    } catch {
      setExpandedData(null);
    } finally {
      setExpandLoading(false);
    }
  };

  // ── URL param helpers ─────────────────────────────────────────

  function updateParam(key, value) {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    if (key !== 'page') {
      next.set('page', '1');
    }
    setSearchParams(next, { replace: true });
  }

  function handleSearchChange(value) {
    updateParam('search', value);
  }

  function handleSort(field, order) {
    const next = new URLSearchParams(searchParams);
    next.set('sort_by', field);
    next.set('sort_order', order);
    next.set('page', '1');
    setSearchParams(next, { replace: true });
  }

  function handlePageChange(page) {
    updateParam('page', String(page));
  }

  // ── Item form handlers ────────────────────────────────────────

  function openAddItem() {
    setItemForm(INITIAL_ITEM_FORM);
    setEditingItemId(null);
    setItemFormErrors({});
    setShowNewCategoryInput(false);
    setNewCategoryInForm('');
    setShowItemModal(true);
  }

  function openEditItem(item) {
    setItemForm({
      item_name: item.item_name || '',
      sku: item.sku || '',
      category: item.category || '',
      description: item.description || '',
      hsn_code: item.hsn_code || '',
      gst_rate: item.gst_rate != null ? String(item.gst_rate) : '',
      unit: item.unit || 'Pcs',
      purchase_price: item.purchase_price != null ? String(item.purchase_price) : '',
      selling_price: item.selling_price != null ? String(item.selling_price) : '',
      opening_stock: item.opening_stock != null ? String(item.opening_stock) : '',
      reorder_level: item.reorder_level != null ? String(item.reorder_level) : '',
      location: item.location || '',
      serial_number: item.serial_number || '',
    });
    setEditingItemId(item.id);
    setItemFormErrors({});
    setShowNewCategoryInput(false);
    setNewCategoryInForm('');
    setShowItemModal(true);
  }

  function handleItemFormChange(e) {
    const { name, value } = e.target;
    setItemForm((prev) => ({ ...prev, [name]: value }));
    if (itemFormErrors[name]) {
      setItemFormErrors((prev) => { const n = { ...prev }; delete n[name]; return n; });
    }
  }

  function validateItemForm() {
    const errors = {};
    if (!itemForm.item_name.trim()) errors.item_name = 'Item name is required';
    if (itemForm.purchase_price && isNaN(Number(itemForm.purchase_price))) errors.purchase_price = 'Must be a number';
    if (itemForm.selling_price && isNaN(Number(itemForm.selling_price))) errors.selling_price = 'Must be a number';
    if (itemForm.opening_stock && isNaN(Number(itemForm.opening_stock))) errors.opening_stock = 'Must be a number';
    if (itemForm.reorder_level && isNaN(Number(itemForm.reorder_level))) errors.reorder_level = 'Must be a number';
    setItemFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSaveItem() {
    if (!validateItemForm()) {
      toast.error('Please fix the form errors.');
      return;
    }

    setItemSaving(true);
    try {
      const payload = { ...itemForm };
      // Convert numeric fields
      if (payload.purchase_price) payload.purchase_price = Number(payload.purchase_price);
      if (payload.selling_price) payload.selling_price = Number(payload.selling_price);
      if (payload.opening_stock) payload.opening_stock = Number(payload.opening_stock);
      if (payload.reorder_level) payload.reorder_level = Number(payload.reorder_level);
      if (payload.gst_rate) payload.gst_rate = Number(payload.gst_rate);

      if (editingItemId) {
        await apiClient.put(`/inventory/${editingItemId}`, payload);
        toast.success('Item updated successfully');
      } else {
        await apiClient.post('/inventory', payload);
        toast.success('Item created successfully');
      }

      setShowItemModal(false);
      fetchItems();
      fetchSummary();
      fetchCategories();
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to save item';
      toast.error(msg);
    } finally {
      setItemSaving(false);
    }
  }

  async function handleAddCategoryInForm() {
    const name = newCategoryInForm.trim();
    if (!name) return;

    try {
      await apiClient.post('/inventory/categories', { name });
      await fetchCategories();
      setItemForm((prev) => ({ ...prev, category: name }));
      setNewCategoryInForm('');
      setShowNewCategoryInput(false);
      toast.success('Category added');
    } catch (err) {
      if (err.response?.status === 409) {
        // Category already exists, just use it
        setItemForm((prev) => ({ ...prev, category: name }));
        setNewCategoryInForm('');
        setShowNewCategoryInput(false);
      } else {
        toast.error('Failed to create category');
      }
    }
  }

  // ── Transaction form handlers ─────────────────────────────────

  function openRecordTxn(item) {
    setTxnForm(INITIAL_TXN_FORM);
    setTxnItemId(item.id);
    setTxnItemName(item.item_name);
    setShowTxnModal(true);
  }

  function handleTxnFormChange(e) {
    const { name, value } = e.target;
    setTxnForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSaveTxn() {
    if (!txnForm.quantity || Number(txnForm.quantity) <= 0) {
      toast.error('Quantity must be greater than zero');
      return;
    }
    if (!txnForm.transaction_type) {
      toast.error('Please select a transaction type');
      return;
    }

    setTxnSaving(true);
    try {
      const payload = {
        transaction_type: txnForm.transaction_type,
        quantity: Number(txnForm.quantity),
        transaction_date: txnForm.transaction_date || todayStr(),
        notes: txnForm.notes,
        reference: txnForm.reference,
      };

      await apiClient.post(`/inventory/${txnItemId}/transactions`, payload);
      toast.success('Transaction recorded successfully');
      setShowTxnModal(false);
      fetchItems();
      fetchSummary();

      // Refresh expanded data if this item is expanded
      if (expandedItemId === txnItemId) {
        const response = await apiClient.get(`/inventory/${txnItemId}`);
        setExpandedData(response.data?.data || response.data || null);
      }
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to record transaction';
      toast.error(msg);
    } finally {
      setTxnSaving(false);
    }
  }

  // ── Delete handler ────────────────────────────────────────────

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await apiClient.delete(`/inventory/${deleteTarget.id}`);
      toast.success(deleteTarget.item_name + ' deleted');
      setDeleteTarget(null);
      if (expandedItemId === deleteTarget.id) {
        setExpandedItemId(null);
        setExpandedData(null);
      }
      fetchItems();
      fetchSummary();
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to delete item';
      toast.error(msg);
    } finally {
      setDeleteLoading(false);
    }
  }

  // ── Category management ───────────────────────────────────────

  async function handleAddCategory() {
    const name = newCategoryName.trim();
    if (!name) return;

    setCategoryLoading(true);
    try {
      await apiClient.post('/inventory/categories', { name });
      toast.success('Category added');
      setNewCategoryName('');
      fetchCategories();
    } catch (err) {
      if (err.response?.status === 409) {
        toast.error('Category already exists');
      } else {
        toast.error('Failed to add category');
      }
    } finally {
      setCategoryLoading(false);
    }
  }

  // ── Print handler ─────────────────────────────────────────────

  function handlePrint() {
    window.print();
  }

  function handleExportPDF() {
    // Generate a printable PDF view
    const printContent = document.getElementById('inventory-print-area');
    if (!printContent) {
      window.print();
      return;
    }
    window.print();
  }

  // ── Compute summary stats (fallback if /summary fails) ───────

  const totalItems = summaryData ? summaryData.total_items : total;
  const lowStockItems = summaryData
    ? summaryData.low_stock_count
    : items.filter((item) => {
        const stock = Number(item.current_stock) || 0;
        const reorder = Number(item.reorder_level) || 0;
        return reorder > 0 && stock < reorder;
      }).length;
  const totalStockValue = summaryData
    ? summaryData.total_value
    : items.reduce((sum, item) => {
        const stock = Number(item.current_stock) || 0;
        const price = Number(item.purchase_price) || 0;
        return sum + stock * price;
      }, 0);
  const totalQuantity = summaryData
    ? summaryData.total_quantity
    : items.reduce((sum, item) => sum + (Number(item.current_stock) || 0), 0);

  // ── Pagination ────────────────────────────────────────────────

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const pageNumbers = [];
  const maxVisiblePages = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
  if (endPage - startPage < maxVisiblePages - 1) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }
  for (let i = startPage; i <= endPage; i++) {
    pageNumbers.push(i);
  }

  // ── Helper: check low stock ───────────────────────────────────

  function isLowStock(item) {
    const stock = Number(item.current_stock) || 0;
    const reorder = Number(item.reorder_level) || 0;
    return reorder > 0 && stock < reorder;
  }

  // ── Render ────────────────────────────────────────────────────

  return (
    <div className="pb-8" id="inventory-print-area">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#333]">Inventory</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">
            Manage your inventory items and stock levels
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-[#333] bg-white border border-[#E5E7EB] rounded-lg hover:bg-[#F9FAFB] transition-colors print:hidden"
            title="Print inventory list"
          >
            <HiOutlinePrinter className="w-4 h-4" />
            Print
          </button>
          <button
            onClick={handleExportPDF}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-[#333] bg-white border border-[#E5E7EB] rounded-lg hover:bg-[#F9FAFB] transition-colors print:hidden"
            title="Export as PDF"
          >
            <HiOutlineDocumentArrowDown className="w-4 h-4" />
            PDF
          </button>
          <button
            onClick={() => setShowCategories(!showCategories)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-[#333] bg-white border border-[#E5E7EB] rounded-lg hover:bg-[#F9FAFB] transition-colors print:hidden"
            title="Manage categories"
          >
            <HiOutlineTag className="w-4 h-4" />
            Categories
          </button>
          <button
            onClick={fetchItems}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-[#333] bg-white border border-[#E5E7EB] rounded-lg hover:bg-[#F9FAFB] transition-colors print:hidden"
          >
            <HiOutlineArrowPath className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={openAddItem}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#0071DC] rounded-lg hover:bg-[#005BB5] transition-colors print:hidden"
          >
            <HiOutlinePlus className="w-4 h-4" />
            Add Item
          </button>
        </div>
      </div>

      {/* Category Management Panel */}
      {showCategories && (
        <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-5 mb-6 print:hidden">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[#333] uppercase tracking-wide">
              <HiOutlineTag className="w-4 h-4 inline mr-1.5 -mt-0.5" />
              Category Management
            </h3>
            <button
              onClick={() => setShowCategories(false)}
              className="p-1 rounded hover:bg-[#F3F4F6]"
            >
              <HiOutlineXMark className="w-4 h-4 text-[#6B7280]" />
            </button>
          </div>
          <div className="flex items-center gap-2 mb-4">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="New category name..."
              className="flex-1 max-w-xs px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddCategory(); }}
            />
            <button
              onClick={handleAddCategory}
              disabled={categoryLoading || !newCategoryName.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#0071DC] rounded-lg hover:bg-[#005BB5] disabled:opacity-50 transition-colors"
            >
              {categoryLoading && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              Add
            </button>
          </div>
          {categories.length === 0 ? (
            <p className="text-sm text-[#9CA3AF]">No categories yet. Add one above.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <span
                  key={cat}
                  className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-[#F0F7FF] text-[#0071DC] border border-[#0071DC]/20"
                >
                  {cat}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <SummaryCard
          icon={HiOutlineCube}
          label="Total Items"
          value={totalItems.toLocaleString('en-IN')}
          color="#0071DC"
          subtext="Inventory items"
        />
        <SummaryCard
          icon={HiOutlineExclamationTriangle}
          label="Low Stock Items"
          value={lowStockItems.toLocaleString('en-IN')}
          color={lowStockItems > 0 ? '#DC2626' : '#16A34A'}
          subtext={
            lowStockItems > 0
              ? 'Items below reorder level'
              : 'All items in stock'
          }
        />
        <SummaryCard
          icon={HiOutlineBanknotes}
          label="Total Stock Value"
          value={formatIndianCurrency(totalStockValue)}
          color="#7C3AED"
          subtext="Based on purchase price"
        />
        <SummaryCard
          icon={HiOutlineQueueList}
          label="Total Quantity"
          value={totalQuantity.toLocaleString('en-IN')}
          color="#059669"
          subtext="Units in stock"
        />
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm overflow-hidden">
        {/* Search bar */}
        <div className="px-4 py-3 border-b border-[#E5E7EB] print:hidden">
          <div className="relative w-72">
            <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
            <input
              type="text"
              value={currentSearch}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
              placeholder="Search items by name, SKU, or HSN..."
            />
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-3 border-[#0071DC] border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-[#6B7280]">
                Loading inventory...
              </span>
            </div>
          </div>
        ) : error ? (
          <div className="py-20 text-center">
            <HiOutlineExclamationTriangle className="w-12 h-12 text-red-300 mx-auto mb-3" />
            <p className="text-sm text-red-600 mb-3">{error}</p>
            <button
              onClick={fetchItems}
              className="text-sm text-[#0071DC] hover:underline"
            >
              Try again
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="py-20 text-center">
            <HiOutlineArchiveBox className="w-16 h-16 text-[#D1D5DB] mx-auto mb-4" />
            <h3 className="text-base font-medium text-[#333] mb-1">
              {currentSearch
                ? 'No items match your search'
                : 'No inventory items yet'}
            </h3>
            <p className="text-sm text-[#6B7280] mb-4">
              {currentSearch
                ? 'Try adjusting your search criteria.'
                : 'Get started by adding your first inventory item.'}
            </p>
            {!currentSearch && (
              <button
                onClick={openAddItem}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#0071DC] rounded-lg hover:bg-[#005BB5] transition-colors"
              >
                <HiOutlinePlus className="w-4 h-4" />
                Add Item
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider w-8" />
                    <SortableHeader
                      label="Item Name"
                      field="item_name"
                      currentSort={sortBy}
                      currentOrder={sortOrder}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      label="SKU"
                      field="sku"
                      currentSort={sortBy}
                      currentOrder={sortOrder}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      label="Category"
                      field="category"
                      currentSort={sortBy}
                      currentOrder={sortOrder}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      label="Stock"
                      field="current_stock"
                      currentSort={sortBy}
                      currentOrder={sortOrder}
                      onSort={handleSort}
                      align="right"
                    />
                    <SortableHeader
                      label="Reorder Level"
                      field="reorder_level"
                      currentSort={sortBy}
                      currentOrder={sortOrder}
                      onSort={handleSort}
                      align="right"
                    />
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                      Unit
                    </th>
                    <SortableHeader
                      label="Selling Price"
                      field="selling_price"
                      currentSort={sortBy}
                      currentOrder={sortOrder}
                      onSort={handleSort}
                      align="right"
                    />
                    <SortableHeader
                      label="Purchase Price"
                      field="purchase_price"
                      currentSort={sortBy}
                      currentOrder={sortOrder}
                      onSort={handleSort}
                      align="right"
                    />
                    <th className="px-4 py-3 text-right text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                      Stock Value
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-[#6B7280] uppercase tracking-wider print:hidden">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => {
                    const stock = Number(item.current_stock) || 0;
                    const purchasePrice = Number(item.purchase_price) || 0;
                    const stockValue = stock * purchasePrice;
                    const low = isLowStock(item);
                    const isExpanded = expandedItemId === item.id;

                    return (
                      <React.Fragment key={item.id}>
                        <tr
                          className={`border-b border-gray-100 transition-colors ${
                            low
                              ? 'bg-red-50/50 hover:bg-red-50'
                              : index % 2 === 0
                              ? 'bg-white hover:bg-blue-50/40'
                              : 'bg-gray-50/40 hover:bg-blue-50/40'
                          }`}
                        >
                          <td
                            className="px-4 py-3 text-[#6B7280] cursor-pointer"
                            onClick={() => toggleExpand(item.id)}
                          >
                            <HiOutlineChevronRight
                              className={`w-4 h-4 transition-transform ${
                                isExpanded ? 'rotate-90' : ''
                              }`}
                            />
                          </td>
                          <td
                            className="px-4 py-3 cursor-pointer"
                            onClick={() => toggleExpand(item.id)}
                          >
                            <span className="font-medium text-[#333]">
                              {item.item_name || '--'}
                            </span>
                            {item.location && (
                              <span className="block text-xs text-[#9CA3AF] mt-0.5">
                                <HiOutlineMapPin className="w-3 h-3 inline mr-0.5 -mt-0.5" />
                                {item.location}
                              </span>
                            )}
                          </td>
                          <td
                            className="px-4 py-3 text-[#6B7280] font-mono text-xs cursor-pointer"
                            onClick={() => toggleExpand(item.id)}
                          >
                            {item.sku || '--'}
                          </td>
                          <td
                            className="px-4 py-3 text-[#6B7280] cursor-pointer"
                            onClick={() => toggleExpand(item.id)}
                          >
                            {item.category || '--'}
                          </td>
                          <td
                            className="px-4 py-3 text-right tabular-nums cursor-pointer"
                            onClick={() => toggleExpand(item.id)}
                          >
                            <span
                              className={`font-medium ${
                                low ? 'text-red-600' : 'text-[#333]'
                              }`}
                            >
                              {stock.toLocaleString('en-IN')}
                            </span>
                            {low && (
                              <HiOutlineExclamationTriangle className="w-3.5 h-3.5 inline ml-1 text-red-500" />
                            )}
                          </td>
                          <td
                            className="px-4 py-3 text-right text-[#6B7280] tabular-nums cursor-pointer"
                            onClick={() => toggleExpand(item.id)}
                          >
                            {Number(item.reorder_level) || '--'}
                          </td>
                          <td
                            className="px-4 py-3 text-[#6B7280] cursor-pointer"
                            onClick={() => toggleExpand(item.id)}
                          >
                            {item.unit || '--'}
                          </td>
                          <td
                            className="px-4 py-3 text-right font-medium text-[#333] tabular-nums cursor-pointer"
                            onClick={() => toggleExpand(item.id)}
                          >
                            {formatIndianCurrency(item.selling_price)}
                          </td>
                          <td
                            className="px-4 py-3 text-right text-[#6B7280] tabular-nums cursor-pointer"
                            onClick={() => toggleExpand(item.id)}
                          >
                            {formatIndianCurrency(item.purchase_price)}
                          </td>
                          <td
                            className="px-4 py-3 text-right font-medium text-[#333] tabular-nums cursor-pointer"
                            onClick={() => toggleExpand(item.id)}
                          >
                            {formatIndianCurrency(stockValue)}
                          </td>
                          <td className="px-4 py-3 print:hidden">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={(e) => { e.stopPropagation(); openRecordTxn(item); }}
                                className="p-1.5 rounded-md hover:bg-[#F0F7FF] text-[#0071DC] transition-colors"
                                title="Record transaction"
                              >
                                <HiOutlineClipboardDocumentList className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); openEditItem(item); }}
                                className="p-1.5 rounded-md hover:bg-[#F0F7FF] text-[#6B7280] hover:text-[#0071DC] transition-colors"
                                title="Edit item"
                              >
                                <HiOutlinePencilSquare className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); setDeleteTarget(item); }}
                                className="p-1.5 rounded-md hover:bg-red-50 text-[#6B7280] hover:text-red-600 transition-colors"
                                title="Delete item"
                              >
                                <HiOutlineTrash className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Expanded detail row */}
                        {isExpanded && (
                          <tr className="bg-[#FAFBFC]">
                            <td colSpan={11} className="px-6 py-4">
                              {expandLoading ? (
                                <div className="flex items-center gap-2 py-4">
                                  <div className="w-5 h-5 border-2 border-[#0071DC] border-t-transparent rounded-full animate-spin" />
                                  <span className="text-sm text-[#6B7280]">
                                    Loading details...
                                  </span>
                                </div>
                              ) : expandedData ? (
                                <div className="space-y-4">
                                  {/* Item details grid */}
                                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                    <div>
                                      <p className="text-xs text-[#6B7280] font-medium uppercase tracking-wide">
                                        HSN/SAC
                                      </p>
                                      <p className="text-sm text-[#333] mt-0.5">
                                        {expandedData.hsn_code || '--'}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-[#6B7280] font-medium uppercase tracking-wide">
                                        GST Rate
                                      </p>
                                      <p className="text-sm text-[#333] mt-0.5">
                                        {expandedData.gst_rate != null
                                          ? `${expandedData.gst_rate}%`
                                          : '--'}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-[#6B7280] font-medium uppercase tracking-wide">
                                        Opening Stock
                                      </p>
                                      <p className="text-sm text-[#333] mt-0.5">
                                        {expandedData.opening_stock != null
                                          ? Number(expandedData.opening_stock).toLocaleString('en-IN')
                                          : '--'}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-[#6B7280] font-medium uppercase tracking-wide">
                                        Location
                                      </p>
                                      <p className="text-sm text-[#333] mt-0.5">
                                        {expandedData.location || '--'}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-[#6B7280] font-medium uppercase tracking-wide">
                                        Serial / Model No.
                                      </p>
                                      <p className="text-sm text-[#333] mt-0.5">
                                        {expandedData.serial_number || '--'}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Second row of details */}
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div>
                                      <p className="text-xs text-[#6B7280] font-medium uppercase tracking-wide">
                                        Last Updated
                                      </p>
                                      <p className="text-sm text-[#333] mt-0.5">
                                        {formatDate(expandedData.updated_at)}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-[#6B7280] font-medium uppercase tracking-wide">
                                        Created
                                      </p>
                                      <p className="text-sm text-[#333] mt-0.5">
                                        {formatDate(expandedData.created_at)}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Description */}
                                  {expandedData.description && (
                                    <div>
                                      <p className="text-xs text-[#6B7280] font-medium uppercase tracking-wide mb-1">
                                        Description
                                      </p>
                                      <p className="text-sm text-[#333]">
                                        {expandedData.description}
                                      </p>
                                    </div>
                                  )}

                                  {/* Action buttons in expanded view */}
                                  <div className="flex items-center gap-2 print:hidden">
                                    <button
                                      onClick={() => openRecordTxn(expandedData)}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#0071DC] bg-[#F0F7FF] border border-[#0071DC]/20 rounded-lg hover:bg-[#E0EFFF] transition-colors"
                                    >
                                      <HiOutlineClipboardDocumentList className="w-3.5 h-3.5" />
                                      Record Transaction
                                    </button>
                                    <button
                                      onClick={() => openEditItem(expandedData)}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#333] bg-white border border-[#E5E7EB] rounded-lg hover:bg-[#F9FAFB] transition-colors"
                                    >
                                      <HiOutlinePencilSquare className="w-3.5 h-3.5" />
                                      Edit Item
                                    </button>
                                  </div>

                                  {/* Recent transactions / stock movements */}
                                  {expandedData.transactions &&
                                    expandedData.transactions.length > 0 && (
                                      <div>
                                        <h4 className="text-xs text-[#6B7280] font-semibold uppercase tracking-wide mb-2">
                                          Recent Stock Movements
                                        </h4>
                                        <div className="border border-[#E5E7EB] rounded-lg overflow-hidden">
                                          <table className="w-full text-sm">
                                            <thead>
                                              <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                                                <th className="px-3 py-2 text-left text-xs font-semibold text-[#6B7280] uppercase">
                                                  Date
                                                </th>
                                                <th className="px-3 py-2 text-left text-xs font-semibold text-[#6B7280] uppercase">
                                                  Type
                                                </th>
                                                <th className="px-3 py-2 text-left text-xs font-semibold text-[#6B7280] uppercase">
                                                  Reference
                                                </th>
                                                <th className="px-3 py-2 text-left text-xs font-semibold text-[#6B7280] uppercase">
                                                  Notes
                                                </th>
                                                <th className="px-3 py-2 text-right text-xs font-semibold text-[#6B7280] uppercase">
                                                  Quantity
                                                </th>
                                              </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[#E5E7EB]">
                                              {expandedData.transactions
                                                .slice(0, 10)
                                                .map((txn, i) => {
                                                  const txnType = txn.transaction_type || txn.type || '';
                                                  const isInbound = ['Purchase', 'Return', 'Returned', 'Opening Stock', 'Adjustment In', 'Adjustment'].includes(txnType);
                                                  return (
                                                    <tr
                                                      key={txn.id || i}
                                                      className="hover:bg-[#F9FAFB]"
                                                    >
                                                      <td className="px-3 py-2 text-[#333]">
                                                        {formatDate(txn.transaction_date || txn.date)}
                                                      </td>
                                                      <td className="px-3 py-2">
                                                        <span
                                                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                                            isInbound
                                                              ? 'bg-green-50 text-green-700'
                                                              : 'bg-orange-50 text-orange-700'
                                                          }`}
                                                        >
                                                          {txnType || '--'}
                                                        </span>
                                                      </td>
                                                      <td className="px-3 py-2 text-[#6B7280]">
                                                        {txn.reference || '--'}
                                                      </td>
                                                      <td className="px-3 py-2 text-[#6B7280] text-xs max-w-[200px] truncate">
                                                        {txn.notes || '--'}
                                                      </td>
                                                      <td className="px-3 py-2 text-right font-medium tabular-nums">
                                                        <span
                                                          className={isInbound ? 'text-green-600' : 'text-red-600'}
                                                        >
                                                          {isInbound ? '+' : '-'}
                                                          {Number(txn.quantity).toLocaleString('en-IN')}
                                                        </span>
                                                      </td>
                                                    </tr>
                                                  );
                                                })}
                                            </tbody>
                                          </table>
                                        </div>
                                      </div>
                                    )}

                                  {/* No transactions message */}
                                  {(!expandedData.transactions ||
                                    expandedData.transactions.length === 0) && (
                                    <div className="text-sm text-[#9CA3AF] text-center py-3 border border-dashed border-[#E5E7EB] rounded-lg">
                                      No recent stock movements found
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <p className="text-sm text-[#9CA3AF] text-center py-4">
                                  Unable to load item details
                                </p>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-[#E5E7EB] print:hidden">
                <p className="text-xs text-[#6B7280]">
                  Showing {(currentPage - 1) * PAGE_SIZE + 1}
                  {' - '}
                  {Math.min(currentPage * PAGE_SIZE, total)} of {total} items
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage <= 1}
                    className="px-3 py-1.5 text-xs font-medium text-[#6B7280] bg-white border border-[#E5E7EB] rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  {pageNumbers.map((p) => (
                    <button
                      key={p}
                      onClick={() => handlePageChange(p)}
                      className={`w-8 h-8 text-xs font-medium rounded-md transition-colors ${
                        p === currentPage
                          ? 'bg-[#0071DC] text-white'
                          : 'text-[#6B7280] hover:bg-gray-100'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                    className="px-3 py-1.5 text-xs font-medium text-[#6B7280] bg-white border border-[#E5E7EB] rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Add/Edit Item Modal ──────────────────────────────── */}
      <Modal
        open={showItemModal}
        onClose={() => setShowItemModal(false)}
        title={editingItemId ? 'Edit Inventory Item' : 'Add Inventory Item'}
        width="max-w-3xl"
      >
        <div className="space-y-5">
          {/* Basic Info */}
          <div>
            <h3 className="text-sm font-semibold text-[#6B7280] uppercase tracking-wide mb-3">
              Basic Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#333] mb-1">
                  Item Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="item_name"
                  value={itemForm.item_name}
                  onChange={handleItemFormChange}
                  className={`w-full px-3 py-2 border rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC] ${
                    itemFormErrors.item_name ? 'border-red-400 bg-red-50' : 'border-[#E5E7EB]'
                  }`}
                  placeholder="e.g. Cotton Fabric 60inch"
                />
                {itemFormErrors.item_name && <p className="text-xs text-red-500 mt-1">{itemFormErrors.item_name}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-[#333] mb-1">SKU</label>
                <input
                  type="text"
                  name="sku"
                  value={itemForm.sku}
                  onChange={handleItemFormChange}
                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
                  placeholder="e.g. FAB-COT-60"
                />
              </div>
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-[#333] mb-1">Category</label>
            <div className="flex items-center gap-2">
              {!showNewCategoryInput ? (
                <>
                  <select
                    name="category"
                    value={itemForm.category}
                    onChange={handleItemFormChange}
                    className="flex-1 px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] bg-white focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
                  >
                    <option value="">-- Select Category --</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowNewCategoryInput(true)}
                    className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-[#0071DC] bg-[#F0F7FF] border border-[#0071DC]/20 rounded-lg hover:bg-[#E0EFFF] transition-colors whitespace-nowrap"
                  >
                    <HiOutlinePlus className="w-3.5 h-3.5" />
                    New
                  </button>
                </>
              ) : (
                <>
                  <input
                    type="text"
                    value={newCategoryInForm}
                    onChange={(e) => setNewCategoryInForm(e.target.value)}
                    placeholder="New category name..."
                    className="flex-1 px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddCategoryInForm(); }}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleAddCategoryInForm}
                    disabled={!newCategoryInForm.trim()}
                    className="px-3 py-2 text-sm font-medium text-white bg-[#0071DC] rounded-lg hover:bg-[#005BB5] disabled:opacity-50 transition-colors"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowNewCategoryInput(false); setNewCategoryInForm(''); }}
                    className="px-3 py-2 text-sm font-medium text-[#6B7280] bg-white border border-[#E5E7EB] rounded-lg hover:bg-[#F9FAFB] transition-colors"
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-[#333] mb-1">Description</label>
            <textarea
              name="description"
              value={itemForm.description}
              onChange={handleItemFormChange}
              rows={2}
              className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC] resize-vertical"
              placeholder="Item description..."
            />
          </div>

          {/* Tax & Code */}
          <div>
            <h3 className="text-sm font-semibold text-[#6B7280] uppercase tracking-wide mb-3">
              Tax & Codes
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#333] mb-1">HSN/SAC Code</label>
                <input
                  type="text"
                  name="hsn_code"
                  value={itemForm.hsn_code}
                  onChange={handleItemFormChange}
                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
                  placeholder="e.g. 5208"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#333] mb-1">GST Rate (%)</label>
                <select
                  name="gst_rate"
                  value={itemForm.gst_rate}
                  onChange={handleItemFormChange}
                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] bg-white focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
                >
                  <option value="">-- Select --</option>
                  {GST_RATES.map((rate) => (
                    <option key={rate} value={rate}>{rate}%</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#333] mb-1">Unit</label>
                <select
                  name="unit"
                  value={itemForm.unit}
                  onChange={handleItemFormChange}
                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] bg-white focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
                >
                  {UNITS.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div>
            <h3 className="text-sm font-semibold text-[#6B7280] uppercase tracking-wide mb-3">
              Pricing
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#333] mb-1">Purchase Price</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#6B7280]">{'\u20B9'}</span>
                  <input
                    type="text"
                    name="purchase_price"
                    value={itemForm.purchase_price}
                    onChange={handleItemFormChange}
                    className={`w-full pl-8 pr-3 py-2 border rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC] ${
                      itemFormErrors.purchase_price ? 'border-red-400 bg-red-50' : 'border-[#E5E7EB]'
                    }`}
                    placeholder="0.00"
                  />
                </div>
                {itemFormErrors.purchase_price && <p className="text-xs text-red-500 mt-1">{itemFormErrors.purchase_price}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-[#333] mb-1">Selling Price</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#6B7280]">{'\u20B9'}</span>
                  <input
                    type="text"
                    name="selling_price"
                    value={itemForm.selling_price}
                    onChange={handleItemFormChange}
                    className={`w-full pl-8 pr-3 py-2 border rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC] ${
                      itemFormErrors.selling_price ? 'border-red-400 bg-red-50' : 'border-[#E5E7EB]'
                    }`}
                    placeholder="0.00"
                  />
                </div>
                {itemFormErrors.selling_price && <p className="text-xs text-red-500 mt-1">{itemFormErrors.selling_price}</p>}
              </div>
            </div>
          </div>

          {/* Stock & Location */}
          <div>
            <h3 className="text-sm font-semibold text-[#6B7280] uppercase tracking-wide mb-3">
              Stock & Location
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#333] mb-1">
                  Opening Stock
                  {editingItemId && (
                    <span className="text-xs text-[#9CA3AF] ml-1">(read-only when editing)</span>
                  )}
                </label>
                <input
                  type="text"
                  name="opening_stock"
                  value={itemForm.opening_stock}
                  onChange={handleItemFormChange}
                  disabled={!!editingItemId}
                  className={`w-full px-3 py-2 border rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC] disabled:bg-gray-50 disabled:text-gray-500 ${
                    itemFormErrors.opening_stock ? 'border-red-400 bg-red-50' : 'border-[#E5E7EB]'
                  }`}
                  placeholder="0"
                />
                {itemFormErrors.opening_stock && <p className="text-xs text-red-500 mt-1">{itemFormErrors.opening_stock}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-[#333] mb-1">Reorder Level</label>
                <input
                  type="text"
                  name="reorder_level"
                  value={itemForm.reorder_level}
                  onChange={handleItemFormChange}
                  className={`w-full px-3 py-2 border rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC] ${
                    itemFormErrors.reorder_level ? 'border-red-400 bg-red-50' : 'border-[#E5E7EB]'
                  }`}
                  placeholder="Minimum stock before reorder"
                />
                {itemFormErrors.reorder_level && <p className="text-xs text-red-500 mt-1">{itemFormErrors.reorder_level}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-[#333] mb-1">
                  Location
                  <span className="text-xs text-[#9CA3AF] ml-1">(warehouse/storage)</span>
                </label>
                <input
                  type="text"
                  name="location"
                  value={itemForm.location}
                  onChange={handleItemFormChange}
                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
                  placeholder="e.g. Warehouse A, Rack 3"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#333] mb-1">
                  Serial / Model Number
                </label>
                <input
                  type="text"
                  name="serial_number"
                  value={itemForm.serial_number}
                  onChange={handleItemFormChange}
                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
                  placeholder="e.g. SN-12345"
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E5E7EB]">
            <button
              type="button"
              onClick={() => setShowItemModal(false)}
              className="px-5 py-2 text-sm font-medium text-[#333] bg-white border border-[#E5E7EB] rounded-lg hover:bg-[#F9FAFB] transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveItem}
              disabled={itemSaving}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-[#0071DC] rounded-lg hover:bg-[#005BB5] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {itemSaving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {itemSaving
                ? editingItemId ? 'Updating...' : 'Creating...'
                : editingItemId ? 'Update Item' : 'Create Item'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Record Transaction Modal ─────────────────────────── */}
      <Modal
        open={showTxnModal}
        onClose={() => setShowTxnModal(false)}
        title={`Record Transaction - ${txnItemName}`}
        width="max-w-lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#333] mb-1">
              Transaction Type <span className="text-red-500">*</span>
            </label>
            <select
              name="transaction_type"
              value={txnForm.transaction_type}
              onChange={handleTxnFormChange}
              className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] bg-white focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
            >
              {TRANSACTION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label} ({t.direction === 'in' ? 'Stock In' : 'Stock Out'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#333] mb-1">
              Quantity <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="quantity"
              value={txnForm.quantity}
              onChange={handleTxnFormChange}
              min="0"
              step="1"
              className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
              placeholder="Enter quantity"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#333] mb-1">Transaction Date</label>
            <input
              type="date"
              name="transaction_date"
              value={txnForm.transaction_date}
              onChange={handleTxnFormChange}
              className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#333] mb-1">Reference</label>
            <input
              type="text"
              name="reference"
              value={txnForm.reference}
              onChange={handleTxnFormChange}
              className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
              placeholder="e.g. PO-2024-001, INV-123"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#333] mb-1">Notes</label>
            <textarea
              name="notes"
              value={txnForm.notes}
              onChange={handleTxnFormChange}
              rows={2}
              className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC] resize-vertical"
              placeholder="Additional notes..."
            />
          </div>

          {/* Transaction Type Info */}
          <div className="bg-[#F9FAFB] rounded-lg p-3 border border-[#E5E7EB]">
            <p className="text-xs text-[#6B7280]">
              {TRANSACTION_TYPES.find((t) => t.value === txnForm.transaction_type)?.direction === 'in'
                ? 'This transaction will ADD stock to the item.'
                : 'This transaction will DEDUCT stock from the item.'}
            </p>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E5E7EB]">
            <button
              type="button"
              onClick={() => setShowTxnModal(false)}
              className="px-5 py-2 text-sm font-medium text-[#333] bg-white border border-[#E5E7EB] rounded-lg hover:bg-[#F9FAFB] transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveTxn}
              disabled={txnSaving}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-[#0071DC] rounded-lg hover:bg-[#005BB5] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {txnSaving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {txnSaving ? 'Recording...' : 'Record Transaction'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Delete Confirmation Dialog ───────────────────────── */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Inventory Item"
        message={`Are you sure you want to delete "${deleteTarget?.item_name || ''}"? If this item has transaction history, it will be deactivated instead.`}
        loading={deleteLoading}
      />
    </div>
  );
}
