import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  HiOutlinePlus,
  HiOutlineDocumentText,
  HiOutlineTruck,
  HiOutlineCheckCircle,
  HiOutlineExclamationTriangle,
  HiOutlineClock,
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

// ── Status filter tabs ─────────────────────────────────────────────

const STATUS_TABS = [
  { key: '', label: 'All' },
  { key: 'Active', label: 'Active' },
  { key: 'Expired', label: 'Expired' },
  { key: 'Cancelled', label: 'Cancelled' },
];

const PAGE_SIZE = 50;

// ── Main Component ─────────────────────────────────────────────────

export default function EWayBillListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // State
  const [ewayBills, setEwayBills] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters from URL params
  const currentStatus = searchParams.get('status') || '';
  const currentSearch = searchParams.get('search') || '';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const sortBy = searchParams.get('sort_by') || 'created_at';
  const sortOrder = searchParams.get('sort_order') || 'desc';

  // Summary stats
  const [summary, setSummary] = useState({
    totalBills: 0,
    activeBills: 0,
    expiredBills: 0,
  });

  // ── Fetch E-Way Bills ──────────────────────────────────────────────

  const fetchEwayBills = useCallback(async () => {
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

      const res = await apiClient.get('/eway-bills', { params });
      const { data, total: totalCount } = res.data;
      setEwayBills(data || []);
      setTotal(totalCount || 0);

      // Compute summary from returned data
      computeSummary(data || []);
    } catch (err) {
      if (err.response?.status !== 401) {
        setError('Failed to load e-way bills. Please try again.');
      }
      setEwayBills([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [currentPage, currentSearch, currentStatus, sortBy, sortOrder]);

  useEffect(() => {
    fetchEwayBills();
  }, [fetchEwayBills]);

  // ── Compute summary values ─────────────────────────────────────────

  function computeSummary(data) {
    let totalBills = data.length;
    let activeBills = 0;
    let expiredBills = 0;

    data.forEach((bill) => {
      const status = (bill.status || '').toLowerCase();
      if (status === 'active') {
        activeBills += 1;
      } else if (status === 'expired' || isExpired(bill)) {
        expiredBills += 1;
      }
    });

    setSummary({ totalBills, activeBills, expiredBills });
  }

  // ── Check if a bill is expired ─────────────────────────────────────

  function isExpired(bill) {
    if (!bill.valid_until) return false;
    if (bill.status === 'Cancelled') return false;
    const validUntil = new Date(bill.valid_until);
    const today = new Date();
    validUntil.setHours(23, 59, 59, 999);
    today.setHours(0, 0, 0, 0);
    return validUntil < today;
  }

  // ── URL param helpers ──────────────────────────────────────────────

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

  // ── Pagination ─────────────────────────────────────────────────────

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

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div className="bg-white border-b border-[var(--zoho-border)] px-6 py-4 -mx-6 -mt-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-[var(--zoho-text)]">E-Way Bills</h1>
            {!loading && (
              <span className="text-xs font-medium text-[var(--zoho-text-secondary)] bg-gray-100 rounded-full px-2.5 py-0.5">
                {total}
              </span>
            )}
          </div>
          <Link
            to="/eway-bills/new"
            className="inline-flex items-center gap-1.5 bg-[#0071DC] hover:bg-[#005BB5] text-white text-sm font-medium px-4 py-2 rounded-md transition-colors duration-150"
          >
            <HiOutlinePlus className="w-4 h-4" />
            New E-Way Bill
          </Link>
        </div>
      </div>

      {/* Summary Banner */}
      <ZohoPaymentBanner
        items={[
          { label: 'Total E-Way Bills', value: String(summary.totalBills), color: '#0071DC' },
          { label: 'Active', value: String(summary.activeBills), color: '#16A34A' },
          { label: 'Expired', value: String(summary.expiredBills), color: '#F59E0B' },
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

          <div className="ml-auto py-2">
            <ZohoSearchBar
              value={currentSearch}
              onChange={handleSearchChange}
              placeholder="Search e-way bills..."
              className="w-64"
            />
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="py-20">
            <LoadingSpinner size="lg" label="Loading e-way bills..." />
          </div>
        ) : error ? (
          <div className="py-20 text-center">
            <HiOutlineExclamationTriangle className="w-12 h-12 text-red-300 mx-auto mb-3" />
            <p className="text-sm text-red-600 mb-3">{error}</p>
            <button
              onClick={fetchEwayBills}
              className="text-sm text-[#0071DC] hover:underline cursor-pointer"
            >
              Try again
            </button>
          </div>
        ) : ewayBills.length === 0 ? (
          <ZohoEmptyState
            icon={HiOutlineTruck}
            title={currentSearch || currentStatus ? 'No e-way bills match your filters' : 'No e-way bills yet'}
            description={
              currentSearch || currentStatus
                ? 'Try adjusting your search or filter criteria.'
                : 'Create your first e-way bill to start tracking goods transport.'
            }
            actionLabel={!currentSearch && !currentStatus ? 'New E-Way Bill' : undefined}
            onAction={
              !currentSearch && !currentStatus
                ? () => navigate('/eway-bills/new')
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
                      label="E-Way Bill #"
                      field="eway_bill_number"
                      currentSort={sortBy}
                      currentOrder={sortOrder}
                      onSort={handleSort}
                    />
                    <ZohoColumnHeader
                      label="Date"
                      field="bill_date"
                      currentSort={sortBy}
                      currentOrder={sortOrder}
                      onSort={handleSort}
                    />
                    <ZohoColumnHeader
                      label="Valid Until"
                      field="valid_until"
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
                      label="Status"
                      field="status"
                      currentSort={sortBy}
                      currentOrder={sortOrder}
                      onSort={handleSort}
                    />
                    <ZohoColumnHeader
                      label="Supply Type"
                      field="supply_type"
                      currentSort={sortBy}
                      currentOrder={sortOrder}
                      onSort={handleSort}
                    />
                    <ZohoColumnHeader
                      label="Transporter"
                      field="transporter_name"
                      currentSort={sortBy}
                      currentOrder={sortOrder}
                      onSort={handleSort}
                    />
                    <ZohoColumnHeader
                      label="Vehicle No."
                      field="vehicle_number"
                      currentSort={sortBy}
                      currentOrder={sortOrder}
                      onSort={handleSort}
                    />
                    <ZohoColumnHeader
                      label="Distance (km)"
                      field="distance_km"
                      currentSort={sortBy}
                      currentOrder={sortOrder}
                      onSort={handleSort}
                      align="right"
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
                  {ewayBills.map((bill, index) => {
                    const expired = isExpired(bill);
                    const displayStatus =
                      expired && bill.status !== 'Expired' && bill.status !== 'Cancelled'
                        ? 'Expired'
                        : bill.status;
                    return (
                      <tr
                        key={bill.id}
                        onClick={() => navigate(`/eway-bills/${bill.id}`)}
                        className={`border-b border-gray-100 cursor-pointer transition-colors duration-100 ${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'
                        } hover:bg-blue-50/50`}
                      >
                        <td className="px-4 py-3 text-sm font-medium text-[#0071DC]">
                          {bill.eway_bill_number || '--'}
                        </td>
                        <td className="px-4 py-3">
                          <DateCell date={bill.bill_date} />
                        </td>
                        <td className="px-4 py-3">
                          <DateCell
                            date={bill.valid_until}
                            className={expired ? 'text-red-600 font-medium' : ''}
                          />
                        </td>
                        <td className="px-4 py-3 text-sm text-[var(--zoho-text)]">
                          {bill.customer?.company_name || bill.customer?.display_name || bill.customer_name || '--'}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={displayStatus} size="sm" />
                        </td>
                        <td className="px-4 py-3 text-sm text-[var(--zoho-text)]">
                          {bill.supply_type || '--'}
                        </td>
                        <td className="px-4 py-3 text-sm text-[var(--zoho-text)]">
                          {bill.transporter_name || '--'}
                        </td>
                        <td className="px-4 py-3 text-sm text-[var(--zoho-text)] font-mono">
                          {bill.vehicle_number || '--'}
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-[var(--zoho-text)] tabular-nums">
                          {bill.distance_km != null ? `${bill.distance_km}` : '--'}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-medium text-[var(--zoho-text)] tabular-nums">
                          {formatINR(bill.total_amount)}
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
                  {Math.min(currentPage * PAGE_SIZE, total)} of {total} e-way bills
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
