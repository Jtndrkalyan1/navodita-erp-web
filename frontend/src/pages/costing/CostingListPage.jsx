import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  HiOutlinePlus,
  HiOutlineDocumentText,
  HiOutlineCalculator,
  HiOutlineCheckBadge,
  HiOutlineChartBar,
  HiOutlineExclamationTriangle,
  HiOutlineMagnifyingGlass,
  HiOutlineChevronDown,
  HiOutlineChevronUp,
  HiOutlineArrowsUpDown,
} from 'react-icons/hi2';
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

// ── Status Badge ────────────────────────────────────────────────

function StatusBadge({ status }) {
  const styles = {
    Draft: 'bg-gray-100 text-gray-700 border-gray-300',
    Approved: 'bg-green-50 text-green-700 border-green-200',
    Revised: 'bg-amber-50 text-amber-700 border-amber-200',
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
        styles[status] || styles.Draft
      }`}
    >
      {status || 'Draft'}
    </span>
  );
}

// ── Summary Card ────────────────────────────────────────────────

function SummaryCard({ icon: Icon, label, value, color }) {
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

// ── Constants ───────────────────────────────────────────────────

const PAGE_SIZE = 25;

const STATUS_TABS = [
  { key: '', label: 'All' },
  { key: 'Draft', label: 'Draft' },
  { key: 'Approved', label: 'Approved' },
  { key: 'Revised', label: 'Revised' },
];

// ── Main Component ──────────────────────────────────────────────

export default function CostingListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // State
  const [sheets, setSheets] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters from URL params
  const currentStatus = searchParams.get('status') || '';
  const currentSearch = searchParams.get('search') || '';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const sortBy = searchParams.get('sort_by') || 'created_at';
  const sortOrder = searchParams.get('sort_order') || 'desc';

  // ── Fetch costing sheets ──────────────────────────────────────

  const fetchSheets = useCallback(async () => {
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

      const response = await apiClient.get('/costing-sheets', { params });
      const data = response.data?.data || [];
      const totalCount = response.data?.total || 0;
      setSheets(data);
      setTotal(totalCount);
    } catch (err) {
      if (err.response?.status !== 401) {
        setError('Failed to load costing sheets. Please try again.');
      }
      setSheets([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [currentPage, currentSearch, currentStatus, sortBy, sortOrder]);

  useEffect(() => {
    fetchSheets();
  }, [fetchSheets]);

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

  function handleStatusChange(status) {
    updateParam('status', status);
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

  // ── Compute summary stats ─────────────────────────────────────

  const totalSheets = total;
  const approvedCount = sheets.filter((s) => s.status === 'Approved').length;
  const avgMargin =
    sheets.length > 0
      ? sheets.reduce((sum, s) => sum + (Number(s.margin_percent) || 0), 0) /
        sheets.length
      : 0;

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
    <div className="pb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#333]">Costing Sheets</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">
            Manage style costing and margins
          </p>
        </div>
        <Link
          to="/costing/new"
          className="inline-flex items-center gap-1.5 bg-[#0071DC] hover:bg-[#005BB5] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <HiOutlinePlus className="w-4 h-4" />
          New Costing Sheet
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <SummaryCard
          icon={HiOutlineCalculator}
          label="Total Sheets"
          value={totalSheets.toLocaleString('en-IN')}
          color="#0071DC"
        />
        <SummaryCard
          icon={HiOutlineCheckBadge}
          label="Approved"
          value={approvedCount.toLocaleString('en-IN')}
          color="#16A34A"
        />
        <SummaryCard
          icon={HiOutlineChartBar}
          label="Average Margin"
          value={`${avgMargin.toFixed(1)}%`}
          color="#7C3AED"
        />
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm overflow-hidden">
        {/* Status tabs + search */}
        <div className="flex items-center justify-between border-b border-[#E5E7EB] px-4">
          <div className="flex items-center gap-0">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => handleStatusChange(tab.key)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  currentStatus === tab.key
                    ? 'border-[#0071DC] text-[#0071DC]'
                    : 'border-transparent text-[#6B7280] hover:text-[#333] hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="relative w-64 py-2">
            <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
            <input
              type="text"
              value={currentSearch}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
              placeholder="Search costing sheets..."
            />
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-3 border-[#0071DC] border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-[#6B7280]">
                Loading costing sheets...
              </span>
            </div>
          </div>
        ) : error ? (
          <div className="py-20 text-center">
            <HiOutlineExclamationTriangle className="w-12 h-12 text-red-300 mx-auto mb-3" />
            <p className="text-sm text-red-600 mb-3">{error}</p>
            <button
              onClick={fetchSheets}
              className="text-sm text-[#0071DC] hover:underline"
            >
              Try again
            </button>
          </div>
        ) : sheets.length === 0 ? (
          <div className="py-20 text-center">
            <HiOutlineDocumentText className="w-16 h-16 text-[#D1D5DB] mx-auto mb-4" />
            <h3 className="text-base font-medium text-[#333] mb-1">
              {currentSearch || currentStatus
                ? 'No costing sheets match your filters'
                : 'No costing sheets yet'}
            </h3>
            <p className="text-sm text-[#6B7280] mb-4">
              {currentSearch || currentStatus
                ? 'Try adjusting your search or filter criteria.'
                : 'Create your first costing sheet to start tracking margins.'}
            </p>
            {!currentSearch && !currentStatus && (
              <Link
                to="/costing/new"
                className="inline-flex items-center gap-1.5 bg-[#0071DC] hover:bg-[#005BB5] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                <HiOutlinePlus className="w-4 h-4" />
                New Costing Sheet
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider w-14">
                      Image
                    </th>
                    <SortableHeader
                      label="Sheet #"
                      field="sheet_number"
                      currentSort={sortBy}
                      currentOrder={sortOrder}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      label="Style Name"
                      field="style_name"
                      currentSort={sortBy}
                      currentOrder={sortOrder}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      label="Customer"
                      field="customer_name"
                      currentSort={sortBy}
                      currentOrder={sortOrder}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      label="Status"
                      field="status"
                      currentSort={sortBy}
                      currentOrder={sortOrder}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      label="Total Cost"
                      field="total_cost"
                      currentSort={sortBy}
                      currentOrder={sortOrder}
                      onSort={handleSort}
                      align="right"
                    />
                    <SortableHeader
                      label="Selling Price"
                      field="selling_price"
                      currentSort={sortBy}
                      currentOrder={sortOrder}
                      onSort={handleSort}
                      align="right"
                    />
                    <SortableHeader
                      label="Margin %"
                      field="margin_percent"
                      currentSort={sortBy}
                      currentOrder={sortOrder}
                      onSort={handleSort}
                      align="right"
                    />
                    <SortableHeader
                      label="Created"
                      field="created_at"
                      currentSort={sortBy}
                      currentOrder={sortOrder}
                      onSort={handleSort}
                    />
                  </tr>
                </thead>
                <tbody>
                  {sheets.map((sheet, index) => {
                    const margin = Number(sheet.margin_percent) || 0;
                    return (
                      <tr
                        key={sheet.id}
                        onClick={() => navigate(`/costing/${sheet.id}`)}
                        className={`border-b border-gray-100 cursor-pointer transition-colors ${
                          index % 2 === 0
                            ? 'bg-white hover:bg-blue-50/40'
                            : 'bg-gray-50/40 hover:bg-blue-50/40'
                        }`}
                      >
                        <td className="px-4 py-3">
                          {sheet.image_url ? (
                            <img
                              src={sheet.image_url}
                              alt={sheet.style_name || 'Style'}
                              className="w-10 h-10 object-cover rounded border border-[#E5E7EB]"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded border border-[#E5E7EB] bg-[#F9FAFB] flex items-center justify-center">
                              <HiOutlineDocumentText className="w-4 h-4 text-[#D1D5DB]" />
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 font-medium text-[#0071DC]">
                          {sheet.sheet_number || '--'}
                        </td>
                        <td className="px-4 py-3 font-medium text-[#333]">
                          {sheet.style_name || '--'}
                        </td>
                        <td className="px-4 py-3 text-[#6B7280]">
                          {sheet.customer_name || '--'}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={sheet.status} />
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-[#333] tabular-nums">
                          {formatIndianCurrency(sheet.total_cost)}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-[#333] tabular-nums">
                          {formatIndianCurrency(sheet.selling_price)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          <span
                            className={`font-semibold ${
                              margin >= 20
                                ? 'text-green-600'
                                : margin >= 10
                                ? 'text-amber-600'
                                : margin > 0
                                ? 'text-orange-600'
                                : 'text-red-600'
                            }`}
                          >
                            {margin.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[#6B7280]">
                          {formatDate(sheet.created_at)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-[#E5E7EB]">
                <p className="text-xs text-[#6B7280]">
                  Showing {(currentPage - 1) * PAGE_SIZE + 1}
                  {' - '}
                  {Math.min(currentPage * PAGE_SIZE, total)} of {total} sheets
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
    </div>
  );
}
