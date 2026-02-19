import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  HiOutlinePlus,
  HiOutlineDocumentText,
  HiOutlineBanknotes,
  HiOutlineClock,
  HiOutlineExclamationTriangle,
  HiOutlineCalendarDays,
  HiOutlineFunnel,
  HiOutlineTrash,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import apiClient from '../../api/client';
import { formatINR, formatCurrency } from '../../utils/currency';
import StatusBadge from '../../components/data-display/StatusBadge';
import DateCell from '../../components/data-display/DateCell';
import ZohoSearchBar from '../../components/layout/ZohoSearchBar';
import ZohoPaymentBanner from '../../components/layout/ZohoPaymentBanner';
import ZohoColumnHeader from '../../components/layout/ZohoColumnHeader';
import ZohoEmptyState from '../../components/layout/ZohoEmptyState';
import LoadingSpinner from '../../components/feedback/LoadingSpinner';

/** Compute date range for a preset key */
function getDateRangeForPreset(preset) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (preset) {
    case 'today':
      return { start: today, end: today };
    case 'this_week': {
      const day = today.getDay();
      const start = new Date(today);
      start.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return { start, end };
    }
    case 'this_month':
      return { start: new Date(today.getFullYear(), today.getMonth(), 1), end: new Date(today.getFullYear(), today.getMonth() + 1, 0) };
    case 'this_quarter': {
      const q = Math.floor(today.getMonth() / 3);
      return { start: new Date(today.getFullYear(), q * 3, 1), end: new Date(today.getFullYear(), q * 3 + 3, 0) };
    }
    case 'this_fy': {
      const fyStart = today.getMonth() >= 3 ? new Date(today.getFullYear(), 3, 1) : new Date(today.getFullYear() - 1, 3, 1);
      const fyEnd = new Date(fyStart.getFullYear() + 1, 2, 31);
      return { start: fyStart, end: fyEnd };
    }
    case 'last_month':
      return { start: new Date(today.getFullYear(), today.getMonth() - 1, 1), end: new Date(today.getFullYear(), today.getMonth(), 0) };
    case 'last_fy': {
      const curFyStart = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
      return { start: new Date(curFyStart - 1, 3, 1), end: new Date(curFyStart, 2, 31) };
    }
    default:
      return null;
  }
}

function fmtISO(d) {
  return d.toISOString().split('T')[0];
}

const STATUS_TABS = [
  { key: '', label: 'All' },
  { key: 'Draft', label: 'Draft' },
  { key: 'Sent', label: 'Sent' },
  { key: 'Partial', label: 'Partial' },
  { key: 'Paid', label: 'Paid' },
  { key: 'Overdue', label: 'Overdue' },
  { key: 'Cancelled', label: 'Cancelled' },
];

const DATE_FILTERS = [
  { key: '', label: 'All Time' },
  { key: 'today', label: 'Today' },
  { key: 'this_week', label: 'This Week' },
  { key: 'this_month', label: 'This Month' },
  { key: 'this_quarter', label: 'This Quarter' },
  { key: 'this_fy', label: 'This FY' },
  { key: 'last_month', label: 'Last Month' },
  { key: 'last_fy', label: 'Last FY' },
  { key: 'custom', label: 'Custom' },
];

const PAGE_SIZE = 50;

export default function InvoiceListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // State
  const [invoices, setInvoices] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters from URL params
  const currentStatus = searchParams.get('status') || '';
  const currentSearch = searchParams.get('search') || '';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const urlSortBy = searchParams.get('sort_by') || 'invoice_date';
  const urlSortOrder = searchParams.get('sort_order') || 'desc';

  // Derive client-side sortBy key from URL params (keeps dropdown in sync)
  const sortBy = useMemo(() => {
    const key = `${urlSortBy}_${urlSortOrder}`;
    const map = {
      'invoice_date_desc': 'date_desc',
      'invoice_date_asc':  'date_asc',
      'total_amount_desc': 'amount_desc',
      'total_amount_asc':  'amount_asc',
      'customer_name_asc': 'name_asc',
      'customer_name_desc':'name_desc',
    };
    return map[key] || 'date_desc';
  }, [urlSortBy, urlSortOrder]);
  const currentDateFilter = searchParams.get('date_filter') || '';
  const currentStartDate = searchParams.get('start_date') || '';
  const currentEndDate = searchParams.get('end_date') || '';

  // Summary stats
  const [summary, setSummary] = useState({
    totalInvoiced: 0,
    totalPaid: 0,
    totalOverdue: 0,
    totalBalance: 0,
  });

  // Delete state
  const [deleteConfirm, setDeleteConfirm] = useState(null); // invoice object to delete
  const [deleting, setDeleting] = useState(false);

  const handleDeleteClick = (e, invoice) => {
    e.stopPropagation();
    setDeleteConfirm(invoice);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/invoices/${deleteConfirm.id}`);
      toast.success(`Invoice ${deleteConfirm.invoice_number} deleted`);
      setDeleteConfirm(null);
      fetchInvoices();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete invoice');
    } finally {
      setDeleting(false);
    }
  };

  // Fetch invoices
  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page: currentPage,
        limit: PAGE_SIZE,
        sort_by: urlSortBy,
        sort_order: urlSortOrder,
      };
      if (currentSearch) params.search = currentSearch;
      if (currentStatus) params.status = currentStatus;

      // Apply date filter
      if (currentDateFilter && currentDateFilter !== 'custom') {
        const range = getDateRangeForPreset(currentDateFilter);
        if (range) {
          params.start_date = fmtISO(range.start);
          params.end_date = fmtISO(range.end);
        }
      } else if (currentDateFilter === 'custom') {
        if (currentStartDate) params.start_date = currentStartDate;
        if (currentEndDate) params.end_date = currentEndDate;
      }

      // Fetch paginated list + global stats in parallel
      const [res, statsRes] = await Promise.all([
        apiClient.get('/invoices', { params }),
        apiClient.get('/invoices/stats', { params: { ...params, page: undefined, limit: undefined } }),
      ]);
      const { data, total: totalCount } = res.data;
      setInvoices(data || []);
      setTotal(totalCount || 0);

      // Use server-side stats (accurate across all pages)
      const s = statsRes.data || {};
      setSummary({
        totalInvoiced: s.totalInvoiced || 0,
        totalPaid: s.totalPaid || 0,
        totalOverdue: s.totalOverdue || 0,
        totalBalance: s.totalBalance || 0,
      });
    } catch (err) {
      if (err.response?.status !== 401) {
        setError('Failed to load invoices. Please try again.');
      }
      setInvoices([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [currentPage, currentSearch, currentStatus, urlSortBy, urlSortOrder, currentDateFilter, currentStartDate, currentEndDate]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  function isOverdue(inv) {
    if (!inv.due_date) return false;
    if (inv.status === 'Paid' || inv.status === 'Cancelled') return false;
    const due = new Date(inv.due_date);
    const today = new Date();
    due.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return due < today;
  }

  // Client-side sorted data
  const sortedInvoices = useMemo(() => {
    const arr = [...invoices];
    switch (sortBy) {
      case 'date_desc': return arr.sort((a, b) => new Date(b.invoice_date || b.created_at || 0) - new Date(a.invoice_date || a.created_at || 0));
      case 'date_asc': return arr.sort((a, b) => new Date(a.invoice_date || a.created_at || 0) - new Date(b.invoice_date || b.created_at || 0));
      case 'amount_desc': return arr.sort((a, b) => (parseFloat(b.total_amount) || 0) - (parseFloat(a.total_amount) || 0));
      case 'amount_asc': return arr.sort((a, b) => (parseFloat(a.total_amount) || 0) - (parseFloat(b.total_amount) || 0));
      case 'name_asc': return arr.sort((a, b) => (a.customer_name || '').localeCompare(b.customer_name || ''));
      case 'name_desc': return arr.sort((a, b) => (b.customer_name || '').localeCompare(a.customer_name || ''));
      default: return arr;
    }
  }, [invoices, sortBy]);

  // URL param helpers
  function updateParam(key, value) {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    // Reset to page 1 when filters change (unless changing page)
    if (key !== 'page') {
      next.set('page', '1');
    }
    setSearchParams(next, { replace: true });
  }

  function handleStatusChange(status) {
    updateParam('status', status);
  }

  function handleSearchChange(search) {
    updateParam('search', search);
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

  // Pagination
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

  return (
    <div>
      {/* Header */}
      <div className="bg-white border-b border-[var(--zoho-border)] px-6 py-4 -mx-6 -mt-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-[var(--zoho-text)]">Invoices</h1>
            {!loading && (
              <span className="text-xs font-medium text-[var(--zoho-text-secondary)] bg-gray-100 rounded-full px-2.5 py-0.5">
                {total}
              </span>
            )}
          </div>
          <Link
            to="/invoices/new"
            className="inline-flex items-center gap-1.5 bg-[#0071DC] hover:bg-[#005BB5] text-white text-sm font-medium px-4 py-2 rounded-md transition-colors duration-150"
          >
            <HiOutlinePlus className="w-4 h-4" />
            New Invoice
          </Link>
        </div>
      </div>

      {/* Summary Banner */}
      <ZohoPaymentBanner
        items={[
          { label: 'Total Invoiced', value: formatINR(summary.totalInvoiced), color: '#0071DC' },
          { label: 'Amount Paid', value: formatINR(summary.totalPaid), color: '#16A34A' },
          { label: 'Overdue', value: formatINR(summary.totalOverdue), color: '#DC2626' },
          { label: 'Balance Due', value: formatINR(summary.totalBalance), color: '#F59E0B' },
        ]}
      />

      {/* Search + Status Tabs */}
      <div className="bg-white rounded-lg border border-[var(--zoho-border)] overflow-hidden">
        {/* Tab bar */}
        <div className="flex items-center gap-0 border-b border-[var(--zoho-border)] px-4">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleStatusChange(tab.key)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors duration-150 cursor-pointer whitespace-nowrap ${
                currentStatus === tab.key
                  ? 'border-[#0071DC] text-[#0071DC]'
                  : 'border-transparent text-[var(--zoho-text-secondary)] hover:text-[var(--zoho-text)] hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}

          <div className="ml-auto py-2 flex items-center gap-2">
            {/* Date filter dropdown */}
            <div className="relative">
              <select
                value={currentDateFilter}
                onChange={(e) => {
                  const val = e.target.value;
                  const next = new URLSearchParams(searchParams);
                  if (val) {
                    next.set('date_filter', val);
                  } else {
                    next.delete('date_filter');
                    next.delete('start_date');
                    next.delete('end_date');
                  }
                  next.set('page', '1');
                  setSearchParams(next, { replace: true });
                }}
                className="text-xs font-medium text-[var(--zoho-text-secondary)] bg-white border border-[var(--zoho-border)] rounded-md px-2.5 py-1.5 pr-7 focus:outline-none focus:ring-1 focus:ring-[#0071DC] cursor-pointer appearance-none"
              >
                {DATE_FILTERS.map((df) => (
                  <option key={df.key} value={df.key}>{df.label}</option>
                ))}
              </select>
              <HiOutlineCalendarDays className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>
            {/* Custom date range inputs */}
            {currentDateFilter === 'custom' && (
              <>
                <input
                  type="date"
                  value={currentStartDate}
                  onChange={(e) => updateParam('start_date', e.target.value)}
                  className="text-xs border border-[var(--zoho-border)] rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#0071DC]"
                />
                <span className="text-xs text-gray-400">to</span>
                <input
                  type="date"
                  value={currentEndDate}
                  onChange={(e) => updateParam('end_date', e.target.value)}
                  className="text-xs border border-[var(--zoho-border)] rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#0071DC]"
                />
              </>
            )}
            {/* Sort dropdown */}
            <select
              value={sortBy}
              onChange={e => {
                const val = e.target.value;
                // Push to URL — sortBy is derived from URL params
                const sortMap = {
                  date_desc:   { field: 'invoice_date', order: 'desc' },
                  date_asc:    { field: 'invoice_date', order: 'asc' },
                  amount_desc: { field: 'total_amount', order: 'desc' },
                  amount_asc:  { field: 'total_amount', order: 'asc' },
                  name_asc:    { field: 'customer_name', order: 'asc' },
                  name_desc:   { field: 'customer_name', order: 'desc' },
                };
                const s = sortMap[val] || { field: 'invoice_date', order: 'desc' };
                handleSort(s.field, s.order);
              }}
              className="px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] bg-white focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
            >
              <option value="date_desc">Date: Newest First</option>
              <option value="date_asc">Date: Oldest First</option>
              <option value="amount_desc">Amount: High to Low</option>
              <option value="amount_asc">Amount: Low to High</option>
              <option value="name_asc">Name: A to Z</option>
              <option value="name_desc">Name: Z to A</option>
            </select>
            <ZohoSearchBar
              value={currentSearch}
              onChange={handleSearchChange}
              placeholder="Search invoices..."
              className="w-64"
            />
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="py-20">
            <LoadingSpinner size="lg" label="Loading invoices..." />
          </div>
        ) : error ? (
          <div className="py-20 text-center">
            <HiOutlineExclamationTriangle className="w-12 h-12 text-red-300 mx-auto mb-3" />
            <p className="text-sm text-red-600 mb-3">{error}</p>
            <button
              onClick={fetchInvoices}
              className="text-sm text-[#0071DC] hover:underline cursor-pointer"
            >
              Try again
            </button>
          </div>
        ) : invoices.length === 0 ? (
          <ZohoEmptyState
            icon={HiOutlineDocumentText}
            title={currentSearch || currentStatus ? 'No invoices match your filters' : 'No invoices yet'}
            description={
              currentSearch || currentStatus
                ? 'Try adjusting your search or filter criteria.'
                : 'Create your first invoice to start tracking your sales.'
            }
            actionLabel={!currentSearch && !currentStatus ? 'New Invoice' : undefined}
            onAction={
              !currentSearch && !currentStatus
                ? () => navigate('/invoices/new')
                : undefined
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <ZohoColumnHeader
                      label="Invoice #"
                      field="invoice_number"
                      currentSort={urlSortBy}
                      currentOrder={urlSortOrder}
                      onSort={handleSort}
                    />
                    <ZohoColumnHeader
                      label="Date"
                      field="invoice_date"
                      currentSort={urlSortBy}
                      currentOrder={urlSortOrder}
                      onSort={handleSort}
                    />
                    <ZohoColumnHeader
                      label="Customer"
                      field="customer_name"
                      currentSort={urlSortBy}
                      currentOrder={urlSortOrder}
                      onSort={handleSort}
                    />
                    <ZohoColumnHeader
                      label="Status"
                      field="status"
                      currentSort={urlSortBy}
                      currentOrder={urlSortOrder}
                      onSort={handleSort}
                    />
                    <ZohoColumnHeader
                      label="Amount"
                      field="total_amount"
                      currentSort={urlSortBy}
                      currentOrder={urlSortOrder}
                      onSort={handleSort}
                      align="right"
                    />
                    <ZohoColumnHeader
                      label="Balance Due"
                      field="balance_due"
                      currentSort={urlSortBy}
                      currentOrder={urlSortOrder}
                      onSort={handleSort}
                      align="right"
                    />
                    <ZohoColumnHeader
                      label="Due Date"
                      field="due_date"
                      currentSort={urlSortBy}
                      currentOrder={urlSortOrder}
                      onSort={handleSort}
                    />
                    <th className="px-4 py-3 text-xs font-medium text-[var(--zoho-text-secondary)] w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {sortedInvoices.map((invoice, index) => {
                    const overdue = isOverdue(invoice);
                    const displayStatus = overdue && invoice.status !== 'Overdue' && invoice.status !== 'Paid' && invoice.status !== 'Cancelled'
                      ? 'Overdue'
                      : invoice.status;
                    return (
                      <tr
                        key={invoice.id}
                        onClick={() => navigate(`/invoices/${invoice.id}`)}
                        className={`border-b border-gray-100 cursor-pointer transition-colors duration-100 ${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'
                        } hover:bg-blue-50/50`}
                      >
                        <td className="px-4 py-3 text-sm font-medium text-[#0071DC]">
                          {invoice.invoice_number}
                        </td>
                        <td className="px-4 py-3">
                          <DateCell date={invoice.invoice_date} />
                        </td>
                        <td className="px-4 py-3 text-sm text-[var(--zoho-text)]">
                          {invoice.customer?.company_name || invoice.customer?.display_name || invoice.customer_name || '--'}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={displayStatus} size="sm" />
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-medium text-[var(--zoho-text)] tabular-nums">
                          {formatCurrency(invoice.total_amount, invoice.currency_code)}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-medium tabular-nums">
                          <span className={Number(invoice.balance_due) > 0 ? 'text-orange-600' : 'text-green-600'}>
                            {formatCurrency(invoice.balance_due, invoice.currency_code)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <DateCell
                            date={invoice.due_date}
                            className={overdue ? 'text-red-600 font-medium' : ''}
                          />
                        </td>
                        <td className="px-2 py-3 text-right">
                          <button
                            onClick={(e) => handleDeleteClick(e, invoice)}
                            title="Delete invoice"
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          >
                            <HiOutlineTrash className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--zoho-border)]">
                <p className="text-xs text-[var(--zoho-text-secondary)]">
                  Showing {(currentPage - 1) * PAGE_SIZE + 1}
                  {' - '}
                  {Math.min(currentPage * PAGE_SIZE, total)} of {total} invoices
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage <= 1}
                    className="px-3 py-1.5 text-xs font-medium text-[var(--zoho-text-secondary)] bg-white border border-[var(--zoho-border)] rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    Previous
                  </button>
                  {pageNumbers.map((p) => (
                    <button
                      key={p}
                      onClick={() => handlePageChange(p)}
                      className={`w-8 h-8 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                        p === currentPage
                          ? 'bg-[#0071DC] text-white'
                          : 'text-[var(--zoho-text-secondary)] hover:bg-gray-100'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                    className="px-3 py-1.5 text-xs font-medium text-[var(--zoho-text-secondary)] bg-white border border-[var(--zoho-border)] rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <HiOutlineTrash className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Delete Invoice</h3>
                <p className="text-sm text-gray-500">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-sm text-gray-700 mb-5">
              Are you sure you want to delete invoice <strong>{deleteConfirm.invoice_number}</strong>?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-60 transition-colors"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
