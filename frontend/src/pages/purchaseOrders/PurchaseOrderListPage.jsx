import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  HiOutlinePlus,
  HiOutlineDocumentText,
  HiOutlineExclamationTriangle,
} from 'react-icons/hi2';
import apiClient from '../../api/client';
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
  { key: 'Draft', label: 'Draft' },
  { key: 'Sent', label: 'Sent' },
  { key: 'Partial', label: 'Partial' },
  { key: 'Received', label: 'Received' },
  { key: 'Cancelled', label: 'Cancelled' },
];

const PAGE_SIZE = 50;

export default function PurchaseOrderListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const currentStatus = searchParams.get('status') || '';
  const currentSearch = searchParams.get('search') || '';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const sortBy = searchParams.get('sort_by') || 'created_at';
  const sortOrder = searchParams.get('sort_order') || 'desc';

  const [summary, setSummary] = useState({
    totalOrdered: 0,
    totalDraft: 0,
    totalReceived: 0,
    totalPending: 0,
  });

  const fetchOrders = useCallback(async () => {
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

      const res = await apiClient.get('/purchase-orders', { params });
      const { data, total: totalCount } = res.data;
      setOrders(data || []);
      setTotal(totalCount || 0);
      computeSummary(data || []);
    } catch (err) {
      if (err.response?.status !== 401) {
        setError('Failed to load purchase orders. Please try again.');
      }
      setOrders([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [currentPage, currentSearch, currentStatus, sortBy, sortOrder]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  function computeSummary(data) {
    let totalOrdered = 0;
    let totalDraft = 0;
    let totalReceived = 0;
    let totalPending = 0;

    data.forEach((po) => {
      const amount = Number(po.total_amount) || 0;
      totalOrdered += amount;
      if (po.status === 'Draft') totalDraft += amount;
      else if (po.status === 'Received') totalReceived += amount;
      else if (po.status === 'Sent' || po.status === 'Partial') totalPending += amount;
    });

    setSummary({ totalOrdered, totalDraft, totalReceived, totalPending });
  }

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
            <h1 className="text-xl font-semibold text-[var(--zoho-text)]">Purchase Orders</h1>
            {!loading && (
              <span className="text-xs font-medium text-[var(--zoho-text-secondary)] bg-gray-100 rounded-full px-2.5 py-0.5">
                {total}
              </span>
            )}
          </div>
          <Link
            to="/purchase-orders/new"
            className="inline-flex items-center gap-1.5 bg-[#0071DC] hover:bg-[#005BB5] text-white text-sm font-medium px-4 py-2 rounded-md transition-colors duration-150"
          >
            <HiOutlinePlus className="w-4 h-4" />
            New Purchase Order
          </Link>
        </div>
      </div>

      {/* Summary Banner */}
      <ZohoPaymentBanner
        items={[
          { label: 'Total Ordered', value: formatINR(summary.totalOrdered), color: '#0071DC' },
          { label: 'Draft', value: formatINR(summary.totalDraft), color: '#6B7280' },
          { label: 'Pending Receipt', value: formatINR(summary.totalPending), color: '#F59E0B' },
          { label: 'Received', value: formatINR(summary.totalReceived), color: '#16A34A' },
        ]}
      />

      {/* Search + Status Tabs */}
      <div className="bg-white rounded-lg border border-[var(--zoho-border)] overflow-hidden">
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

          <div className="ml-auto py-2">
            <ZohoSearchBar
              value={currentSearch}
              onChange={handleSearchChange}
              placeholder="Search purchase orders..."
              className="w-64"
            />
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="py-20">
            <LoadingSpinner size="lg" label="Loading purchase orders..." />
          </div>
        ) : error ? (
          <div className="py-20 text-center">
            <HiOutlineExclamationTriangle className="w-12 h-12 text-red-300 mx-auto mb-3" />
            <p className="text-sm text-red-600 mb-3">{error}</p>
            <button
              onClick={fetchOrders}
              className="text-sm text-[#0071DC] hover:underline cursor-pointer"
            >
              Try again
            </button>
          </div>
        ) : orders.length === 0 ? (
          <ZohoEmptyState
            icon={HiOutlineDocumentText}
            title={currentSearch || currentStatus ? 'No purchase orders match your filters' : 'No purchase orders yet'}
            description={
              currentSearch || currentStatus
                ? 'Try adjusting your search or filter criteria.'
                : 'Create your first purchase order to start tracking purchases.'
            }
            actionLabel={!currentSearch && !currentStatus ? 'New Purchase Order' : undefined}
            onAction={
              !currentSearch && !currentStatus
                ? () => navigate('/purchase-orders/new')
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
                      label="PO #"
                      field="po_number"
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
                      label="PO Date"
                      field="po_date"
                      currentSort={sortBy}
                      currentOrder={sortOrder}
                      onSort={handleSort}
                    />
                    <ZohoColumnHeader
                      label="Expected Date"
                      field="expected_date"
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
                  </tr>
                </thead>
                <tbody>
                  {orders.map((po, index) => (
                    <tr
                      key={po.id}
                      onClick={() => navigate(`/purchase-orders/${po.id}`)}
                      className={`border-b border-gray-100 cursor-pointer transition-colors duration-100 ${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'
                      } hover:bg-blue-50/50`}
                    >
                      <td className="px-4 py-3 text-sm font-medium text-[#0071DC]">
                        {po.po_number}
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--zoho-text)]">
                        {po.vendor?.company_name || po.vendor?.display_name || po.vendor_name || '--'}
                      </td>
                      <td className="px-4 py-3">
                        <DateCell date={po.po_date} />
                      </td>
                      <td className="px-4 py-3">
                        <DateCell date={po.expected_date} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={po.status} size="sm" />
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-[var(--zoho-text)] tabular-nums">
                        {formatINR(po.total_amount)}
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
                  {Math.min(currentPage * PAGE_SIZE, total)} of {total} purchase orders
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
    </div>
  );
}
