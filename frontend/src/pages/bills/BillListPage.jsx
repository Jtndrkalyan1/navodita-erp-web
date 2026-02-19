import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  HiOutlinePlus,
  HiOutlineDocumentText,
  HiOutlineBanknotes,
  HiOutlineClock,
  HiOutlineExclamationTriangle,
  HiOutlineCalendarDays,
  HiOutlineTrash,
} from 'react-icons/hi2';
import { toast } from 'react-hot-toast';
import { billApi } from '../../api/bill.api';
import { formatINR } from '../../utils/currency';
import StatusBadge from '../../components/data-display/StatusBadge';
import DateCell from '../../components/data-display/DateCell';
import ZohoSearchBar from '../../components/layout/ZohoSearchBar';
import ZohoPaymentBanner from '../../components/layout/ZohoPaymentBanner';
import ZohoColumnHeader from '../../components/layout/ZohoColumnHeader';
import ZohoEmptyState from '../../components/layout/ZohoEmptyState';
import LoadingSpinner from '../../components/feedback/LoadingSpinner';

const STATUS_TABS = [
  { key: '', label: 'All' },
  { key: 'Pending', label: 'Pending' },
  { key: 'Partial', label: 'Partial' },
  { key: 'Paid', label: 'Paid' },
  { key: 'Overdue', label: 'Overdue' },
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

function getDateRangeForPreset(preset) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (preset) {
    case 'today': return { start: today, end: today };
    case 'this_week': { const d = today.getDay(); const s = new Date(today); s.setDate(today.getDate() - (d === 0 ? 6 : d - 1)); const e = new Date(s); e.setDate(s.getDate() + 6); return { start: s, end: e }; }
    case 'this_month': return { start: new Date(today.getFullYear(), today.getMonth(), 1), end: new Date(today.getFullYear(), today.getMonth() + 1, 0) };
    case 'this_quarter': { const q = Math.floor(today.getMonth() / 3); return { start: new Date(today.getFullYear(), q * 3, 1), end: new Date(today.getFullYear(), q * 3 + 3, 0) }; }
    case 'this_fy': { const fs = today.getMonth() >= 3 ? new Date(today.getFullYear(), 3, 1) : new Date(today.getFullYear() - 1, 3, 1); return { start: fs, end: new Date(fs.getFullYear() + 1, 2, 31) }; }
    case 'last_month': return { start: new Date(today.getFullYear(), today.getMonth() - 1, 1), end: new Date(today.getFullYear(), today.getMonth(), 0) };
    case 'last_fy': { const c = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1; return { start: new Date(c - 1, 3, 1), end: new Date(c, 2, 31) }; }
    default: return null;
  }
}
function fmtISO(d) { return d.toISOString().split('T')[0]; }

const PAGE_SIZE = 50;

export default function BillListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // State
  const [bills, setBills] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Client-side sort state
  const [clientSortBy, setClientSortBy] = useState('date_desc');

  // Filters from URL params
  const currentStatus = searchParams.get('status') || '';
  const currentSearch = searchParams.get('search') || '';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const sortBy = searchParams.get('sort_by') || 'created_at';
  const sortOrder = searchParams.get('sort_order') || 'desc';
  const currentDateFilter = searchParams.get('date_filter') || '';
  const currentStartDate = searchParams.get('start_date') || '';
  const currentEndDate = searchParams.get('end_date') || '';

  // Delete state
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Summary stats
  const [summary, setSummary] = useState({
    totalBills: 0,
    totalPending: 0,
    totalPartial: 0,
    totalPaid: 0,
    totalPayable: 0,
  });

  // Fetch bills
  const fetchBills = useCallback(async () => {
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
      if (currentStatus) params.status = currentStatus;

      // Apply date filter
      if (currentDateFilter && currentDateFilter !== 'custom') {
        const range = getDateRangeForPreset(currentDateFilter);
        if (range) { params.start_date = fmtISO(range.start); params.end_date = fmtISO(range.end); }
      } else if (currentDateFilter === 'custom') {
        if (currentStartDate) params.start_date = currentStartDate;
        if (currentEndDate) params.end_date = currentEndDate;
      }

      // Fetch paginated list + global stats in parallel
      const statsParams = { ...params };
      delete statsParams.page;
      delete statsParams.limit;
      const [res, statsRes] = await Promise.all([
        billApi.list(params),
        billApi.stats(statsParams),
      ]);
      const { data, total: totalCount } = res.data;
      setBills(data || []);
      setTotal(totalCount || 0);

      // Use server-side stats (accurate across all pages)
      const s = statsRes.data || {};
      setSummary({
        totalBills: s.totalBills || 0,
        totalPending: s.totalPending || 0,
        totalPartial: s.totalPartial || 0,
        totalPaid: s.totalPaid || 0,
        totalPayable: s.totalPayable || 0,
      });
    } catch (err) {
      if (err.response?.status !== 401) {
        setError('Failed to load bills. Please try again.');
      }
      setBills([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [currentPage, currentSearch, currentStatus, sortBy, sortOrder, currentDateFilter, currentStartDate, currentEndDate]);

  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  // Delete handlers
  const handleDeleteClick = (e, bill) => {
    e.stopPropagation();
    setDeleteConfirm(bill);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await billApi.remove(deleteConfirm.id);
      toast.success(`Bill ${deleteConfirm.bill_number} deleted`);
      setDeleteConfirm(null);
      fetchBills();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete bill');
    } finally {
      setDeleting(false);
    }
  };

  function isOverdue(bill) {
    if (!bill.due_date) return false;
    if (bill.status === 'Paid') return false;
    const due = new Date(bill.due_date);
    const today = new Date();
    due.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return due < today;
  }

  // Client-side sorted data
  const sortedBills = useMemo(() => {
    const arr = [...bills];
    switch (clientSortBy) {
      case 'date_asc': return arr.sort((a, b) => new Date(a.bill_date||a.created_at||0) - new Date(b.bill_date||b.created_at||0));
      case 'date_desc': return arr.sort((a, b) => new Date(b.bill_date||b.created_at||0) - new Date(a.bill_date||a.created_at||0));
      case 'amount_desc': return arr.sort((a, b) => parseFloat(b.total_amount||0) - parseFloat(a.total_amount||0));
      case 'amount_asc': return arr.sort((a, b) => parseFloat(a.total_amount||0) - parseFloat(b.total_amount||0));
      case 'name_asc': return arr.sort((a, b) => (a.vendor_name||'').localeCompare(b.vendor_name||''));
      default: return arr;
    }
  }, [bills, clientSortBy]);

  // URL param helpers
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
            <h1 className="text-xl font-semibold text-[var(--zoho-text)]">Bills</h1>
            {!loading && (
              <span className="text-xs font-medium text-[var(--zoho-text-secondary)] bg-gray-100 rounded-full px-2.5 py-0.5">
                {total}
              </span>
            )}
          </div>
          <Link
            to="/bills/new"
            className="inline-flex items-center gap-1.5 bg-[#0071DC] hover:bg-[#005BB5] text-white text-sm font-medium px-4 py-2 rounded-md transition-colors duration-150"
          >
            <HiOutlinePlus className="w-4 h-4" />
            New Bill
          </Link>
        </div>
      </div>

      {/* Summary Banner */}
      <ZohoPaymentBanner
        items={[
          { label: 'Total Bills', value: formatINR(summary.totalBills), color: '#0071DC' },
          { label: 'Pending', value: formatINR(summary.totalPending), color: '#F59E0B' },
          { label: 'Partially Paid', value: formatINR(summary.totalPartial), color: '#EA580C' },
          { label: 'Paid', value: formatINR(summary.totalPaid), color: '#16A34A' },
          { label: 'Total Payable', value: formatINR(summary.totalPayable), color: '#DC2626' },
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
                  if (val) { next.set('date_filter', val); } else { next.delete('date_filter'); next.delete('start_date'); next.delete('end_date'); }
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
            {currentDateFilter === 'custom' && (
              <>
                <input type="date" value={currentStartDate} onChange={(e) => updateParam('start_date', e.target.value)} className="text-xs border border-[var(--zoho-border)] rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#0071DC]" />
                <span className="text-xs text-gray-400">to</span>
                <input type="date" value={currentEndDate} onChange={(e) => updateParam('end_date', e.target.value)} className="text-xs border border-[var(--zoho-border)] rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#0071DC]" />
              </>
            )}
            <select
              value={clientSortBy}
              onChange={e => setClientSortBy(e.target.value)}
              className="px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm bg-white text-[#333] focus:outline-none cursor-pointer"
            >
              <option value="date_desc">Date: Newest First</option>
              <option value="date_asc">Date: Oldest First</option>
              <option value="amount_desc">Amount: High to Low</option>
              <option value="amount_asc">Amount: Low to High</option>
              <option value="name_asc">Name: A to Z</option>
            </select>
            <ZohoSearchBar
              value={currentSearch}
              onChange={handleSearchChange}
              placeholder="Search bills..."
              className="w-64"
            />
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="py-20">
            <LoadingSpinner size="lg" label="Loading bills..." />
          </div>
        ) : error ? (
          <div className="py-20 text-center">
            <HiOutlineExclamationTriangle className="w-12 h-12 text-red-300 mx-auto mb-3" />
            <p className="text-sm text-red-600 mb-3">{error}</p>
            <button
              onClick={fetchBills}
              className="text-sm text-[#0071DC] hover:underline cursor-pointer"
            >
              Try again
            </button>
          </div>
        ) : bills.length === 0 ? (
          <ZohoEmptyState
            icon={HiOutlineDocumentText}
            title={currentSearch || currentStatus ? 'No bills match your filters' : 'No bills yet'}
            description={
              currentSearch || currentStatus
                ? 'Try adjusting your search or filter criteria.'
                : 'Create your first bill to start tracking your purchases.'
            }
            actionLabel={!currentSearch && !currentStatus ? 'New Bill' : undefined}
            onAction={
              !currentSearch && !currentStatus
                ? () => navigate('/bills/new')
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
                      label="Bill #"
                      field="bill_number"
                      currentSort={sortBy}
                      currentOrder={sortOrder}
                      onSort={handleSort}
                    />
                    <ZohoColumnHeader
                      label="Vendor"
                      field="vendor_name"
                      currentSort={sortBy}
                      currentOrder={sortOrder}
                      onSort={handleSort}
                    />
                    <ZohoColumnHeader
                      label="Vendor Bill #"
                      field="vendor_invoice_number"
                      currentSort={sortBy}
                      currentOrder={sortOrder}
                      onSort={handleSort}
                    />
                    <ZohoColumnHeader
                      label="Bill Date"
                      field="bill_date"
                      currentSort={sortBy}
                      currentOrder={sortOrder}
                      onSort={handleSort}
                    />
                    <ZohoColumnHeader
                      label="Due Date"
                      field="due_date"
                      currentSort={sortBy}
                      currentOrder={sortOrder}
                      onSort={handleSort}
                    />
                    <ZohoColumnHeader
                      label="Status"
                      field="status"
                      currentSort={sortBy}
                      currentOrder={sortOrder}
                      onSort={handleSort}
                    />
                    <ZohoColumnHeader
                      label="Amount"
                      field="total_amount"
                      currentSort={sortBy}
                      currentOrder={sortOrder}
                      onSort={handleSort}
                      align="right"
                    />
                    <ZohoColumnHeader
                      label="Balance Due"
                      field="balance_due"
                      currentSort={sortBy}
                      currentOrder={sortOrder}
                      onSort={handleSort}
                      align="right"
                    />
                    <th className="px-4 py-3 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {sortedBills.map((bill, index) => {
                    const overdue = isOverdue(bill);
                    const displayStatus =
                      overdue && bill.status !== 'Overdue' && bill.status !== 'Paid'
                        ? 'Overdue'
                        : bill.status;
                    return (
                      <tr
                        key={bill.id}
                        onClick={() => navigate(`/bills/${bill.id}`)}
                        className={`border-b border-gray-100 cursor-pointer transition-colors duration-100 ${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'
                        } hover:bg-blue-50/50`}
                      >
                        <td className="px-4 py-3 text-sm font-medium text-[#0071DC]">
                          {bill.bill_number}
                        </td>
                        <td className="px-4 py-3 text-sm text-[var(--zoho-text)]">
                          {bill.vendor_name || '--'}
                        </td>
                        <td className="px-4 py-3 text-sm text-[var(--zoho-text)]">
                          {bill.vendor_invoice_number || '--'}
                        </td>
                        <td className="px-4 py-3">
                          <DateCell date={bill.bill_date} />
                        </td>
                        <td className="px-4 py-3">
                          <DateCell
                            date={bill.due_date}
                            className={overdue ? 'text-red-600 font-medium' : ''}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={displayStatus} size="sm" />
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-medium text-[var(--zoho-text)] tabular-nums">
                          {formatINR(bill.total_amount)}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-medium tabular-nums">
                          <span
                            className={
                              Number(bill.balance_due) > 0 ? 'text-orange-600' : 'text-green-600'
                            }
                          >
                            {formatINR(bill.balance_due)}
                          </span>
                        </td>
                        <td className="px-2 py-3 text-center">
                          <button
                            onClick={(e) => handleDeleteClick(e, bill)}
                            className="p-1.5 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors cursor-pointer"
                            title="Delete bill"
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
                  {Math.min(currentPage * PAGE_SIZE, total)} of {total} bills
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
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <HiOutlineTrash className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Delete Bill</h3>
                <p className="text-sm text-gray-500 mt-0.5">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-sm text-gray-700 mb-5">
              Are you sure you want to delete bill{' '}
              <span className="font-semibold text-gray-900">{deleteConfirm.bill_number}</span>?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 cursor-pointer"
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
