import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  HiOutlinePlus,
  HiOutlineDocumentText,
  HiOutlineExclamationTriangle,
  HiOutlineTrash,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { creditNoteApi } from '../../api/creditNote.api';
import apiClient from '../../api/client';
import { formatINR } from '../../utils/currency';
import StatusBadge from '../../components/data-display/StatusBadge';
import DateCell from '../../components/data-display/DateCell';
import ZohoSearchBar from '../../components/layout/ZohoSearchBar';
import ZohoPaymentBanner from '../../components/layout/ZohoPaymentBanner';
import ZohoColumnHeader from '../../components/layout/ZohoColumnHeader';
import ZohoEmptyState from '../../components/layout/ZohoEmptyState';
import LoadingSpinner from '../../components/feedback/LoadingSpinner';

// ── Constants ──────────────────────────────────────────────────────

const STATUS_TABS = [
  { key: '', label: 'All' },
  { key: 'Draft', label: 'Draft' },
  { key: 'Open', label: 'Open' },
  { key: 'Closed', label: 'Closed' },
];

const PAGE_SIZE = 50;

// ── Component ──────────────────────────────────────────────────────

export default function CreditNoteListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // State
  const [creditNotes, setCreditNotes] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Client-side sort state
  const [clientSortBy, setClientSortBy] = useState('date_desc');

  // Filters from URL params
  const currentStatus = searchParams.get('status') || '';
  const currentSearch = searchParams.get('search') || '';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const sortBy = searchParams.get('sort_by') || 'created_at';
  const sortOrder = searchParams.get('sort_order') || 'desc';

  // Summary stats
  const [summary, setSummary] = useState({
    totalCount: 0,
    draftCount: 0,
    openCount: 0,
    closedCount: 0,
    totalAmount: 0,
  });

  // ── Fetch credit notes ─────────────────────────────────────────

  const fetchCreditNotes = useCallback(async () => {
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

      const res = await creditNoteApi.list(params);
      const { data, total: totalCount } = res.data;
      setCreditNotes(data || []);
      setTotal(totalCount || 0);
      computeSummary(data || []);
    } catch (err) {
      if (err.response?.status !== 401) {
        setError('Failed to load credit notes. Please try again.');
      }
      setCreditNotes([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [currentPage, currentSearch, currentStatus, sortBy, sortOrder]);

  useEffect(() => {
    fetchCreditNotes();
  }, [fetchCreditNotes]);

  // ── Compute summary ──────────────────────────────────────────

  function computeSummary(data) {
    let totalAmount = 0;
    let draftCount = 0;
    let openCount = 0;
    let closedCount = 0;

    data.forEach((cn) => {
      const amount = Number(cn.total_amount) || 0;
      totalAmount += amount;

      switch (cn.status) {
        case 'Draft':
          draftCount++;
          break;
        case 'Open':
          openCount++;
          break;
        case 'Closed':
          closedCount++;
          break;
        default:
          break;
      }
    });

    setSummary({
      totalCount: data.length,
      draftCount,
      openCount,
      closedCount,
      totalAmount,
    });
  }

  // ── URL param helpers ────────────────────────────────────────

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

  function handleDeleteClick(e, item) {
    e.stopPropagation();
    setDeleteConfirm(item);
  }

  async function handleDeleteConfirm() {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/credit-notes/${deleteConfirm.id}`);
      toast.success(`Credit note ${deleteConfirm.credit_note_number} deleted successfully.`);
      setDeleteConfirm(null);
      fetchCreditNotes();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete credit note.');
    } finally {
      setDeleting(false);
    }
  }

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

  // ── Render ────────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div className="bg-white border-b border-[var(--zoho-border)] px-6 py-4 -mx-6 -mt-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-[var(--zoho-text)]">Credit Notes</h1>
            {!loading && (
              <span className="text-xs font-medium text-[var(--zoho-text-secondary)] bg-gray-100 rounded-full px-2.5 py-0.5">
                {total}
              </span>
            )}
          </div>
          <Link
            to="/credit-notes/new"
            className="inline-flex items-center gap-1.5 bg-[#0071DC] hover:bg-[#005BB5] text-white text-sm font-medium px-4 py-2 rounded-md transition-colors duration-150"
          >
            <HiOutlinePlus className="w-4 h-4" />
            New Credit Note
          </Link>
        </div>
      </div>

      {/* Summary Banner */}
      <ZohoPaymentBanner
        items={[
          { label: 'Total Credit Notes', value: String(summary.totalCount), color: '#0071DC' },
          { label: 'Draft', value: String(summary.draftCount), color: '#6B7280' },
          { label: 'Open', value: String(summary.openCount), color: '#2563EB' },
          { label: 'Closed', value: String(summary.closedCount), color: '#16A34A' },
          { label: 'Total Amount', value: formatINR(summary.totalAmount), color: '#0071DC' },
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
              placeholder="Search credit notes..."
              className="w-64"
            />
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="py-20">
            <LoadingSpinner size="lg" label="Loading credit notes..." />
          </div>
        ) : error ? (
          <div className="py-20 text-center">
            <HiOutlineExclamationTriangle className="w-12 h-12 text-red-300 mx-auto mb-3" />
            <p className="text-sm text-red-600 mb-3">{error}</p>
            <button
              onClick={fetchCreditNotes}
              className="text-sm text-[#0071DC] hover:underline cursor-pointer"
            >
              Try again
            </button>
          </div>
        ) : creditNotes.length === 0 ? (
          <ZohoEmptyState
            icon={HiOutlineDocumentText}
            title={currentSearch || currentStatus ? 'No credit notes match your filters' : 'No credit notes yet'}
            description={
              currentSearch || currentStatus
                ? 'Try adjusting your search or filter criteria.'
                : 'Create your first credit note to track refunds and adjustments.'
            }
            actionLabel={!currentSearch && !currentStatus ? 'New Credit Note' : undefined}
            onAction={
              !currentSearch && !currentStatus
                ? () => navigate('/credit-notes/new')
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
                      label="Credit Note #"
                      field="credit_note_number"
                      currentSort={sortBy}
                      currentOrder={sortOrder}
                      onSort={handleSort}
                    />
                    <ZohoColumnHeader
                      label="Date"
                      field="credit_note_date"
                      currentSort={sortBy}
                      currentOrder={sortOrder}
                      onSort={handleSort}
                    />
                    <ZohoColumnHeader
                      label="Customer"
                      field="customer_name"
                      currentSort={sortBy}
                      currentOrder={sortOrder}
                      onSort={handleSort}
                    />
                    <ZohoColumnHeader
                      label="Invoice #"
                      field="invoice_number"
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
                    <th className="w-12" />
                  </tr>
                </thead>
                <tbody>
                  {sortedCreditNotes.map((cn, index) => (
                    <tr
                      key={cn.id}
                      onClick={() => navigate(`/credit-notes/${cn.id}`)}
                      className={`border-b border-gray-100 cursor-pointer transition-colors duration-100 ${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'
                      } hover:bg-blue-50/50`}
                    >
                      <td className="px-4 py-3 text-sm font-medium text-[#0071DC]">
                        {cn.credit_note_number || '--'}
                      </td>
                      <td className="px-4 py-3">
                        <DateCell date={cn.credit_note_date} />
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--zoho-text)]">
                        {cn.customer_name || cn.customer?.display_name || cn.customer?.company_name || '--'}
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--zoho-text)]">
                        {cn.invoice_number || cn.linked_invoice?.invoice_number || '--'}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={cn.status} size="sm" />
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-[var(--zoho-text)] tabular-nums">
                        {formatINR(cn.total_amount)}
                      </td>
                      <td className="px-2 py-3 text-center">
                        <button
                          onClick={(e) => handleDeleteClick(e, cn)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors duration-150 cursor-pointer"
                          title="Delete credit note"
                        >
                          <HiOutlineTrash className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--zoho-border)]">
                <p className="text-xs text-[var(--zoho-text-secondary)]">
                  Showing {(currentPage - 1) * PAGE_SIZE + 1}
                  {' - '}
                  {Math.min(currentPage * PAGE_SIZE, total)} of {total} credit notes
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

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <HiOutlineTrash className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Delete Credit Note</h3>
                <p className="text-sm text-gray-500 mt-0.5">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-sm text-gray-700 mb-6">
              Are you sure you want to delete credit note <span className="font-semibold text-gray-900">{deleteConfirm.credit_note_number}</span>?
            </p>
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50 transition-colors cursor-pointer"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}  // Client-side sorted data
  const sortedCreditNotes = useMemo(() => {
    const arr = [...creditNotes];
    switch (clientSortBy) {
      case 'date_asc': return arr.sort((a, b) => new Date(a.credit_note_date||a.created_at||0) - new Date(b.credit_note_date||b.created_at||0));
      case 'date_desc': return arr.sort((a, b) => new Date(b.credit_note_date||b.created_at||0) - new Date(a.credit_note_date||a.created_at||0));
      case 'amount_desc': return arr.sort((a, b) => parseFloat(b.total_amount||0) - parseFloat(a.total_amount||0));
      case 'amount_asc': return arr.sort((a, b) => parseFloat(a.total_amount||0) - parseFloat(b.total_amount||0));
      case 'name_asc': return arr.sort((a, b) => (a.customer_name||'').localeCompare(b.customer_name||''));
      default: return arr;
    }
  }, [creditNotes, clientSortBy]);


