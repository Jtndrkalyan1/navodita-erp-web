import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  HiOutlinePlus,
  HiOutlineMagnifyingGlass,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineDocumentText,
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineCurrencyRupee,
  HiOutlineExclamationTriangle,
  HiOutlineFunnel,
} from 'react-icons/hi2';
import { gstFilingApi } from '../../api/gstFiling.api';

// ── Helpers ────────────────────────────────────────────────────────

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
    if (remaining.length > 0) result = remaining + ',' + result;
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

function StatusBadge({ status }) {
  const styles = {
    Pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    Filed: 'bg-green-50 text-green-700 border-green-200',
    Late: 'bg-red-50 text-red-700 border-red-200',
    Verified: 'bg-blue-50 text-blue-700 border-blue-200',
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
        styles[status] || styles.Pending
      }`}
    >
      {status || 'Pending'}
    </span>
  );
}

function SummaryCard({ title, value, icon: Icon, color }) {
  return (
    <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-4 flex items-center gap-4">
      <div
        className={`w-11 h-11 rounded-lg flex items-center justify-center ${color}`}
      >
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-xs text-[#6B7280] font-medium uppercase tracking-wide">
          {title}
        </p>
        <p className="text-lg font-semibold text-[#333] mt-0.5">{value}</p>
      </div>
    </div>
  );
}

// ── Financial Year Options ─────────────────────────────────────────

function getFinancialYearOptions() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const startYear = currentMonth >= 3 ? currentYear : currentYear - 1;
  const options = [];
  // 2 future years + current + 5 past years
  for (let i = -2; i <= 5; i++) {
    const fy = startYear - i;
    options.push(`${fy}-${String(fy + 1).slice(-2)}`);
  }
  return options;
}

const FILING_TYPES = ['GSTR-1', 'GSTR-3B', 'GSTR-9', 'GSTR-2A', 'GSTR-2B', 'GSTR-4'];

// ── Main Component ─────────────────────────────────────────────────

export default function GSTFilingListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // State
  const [filings, setFilings] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [filingTypeFilter, setFilingTypeFilter] = useState(searchParams.get('filing_type') || '');
  const [financialYearFilter, setFinancialYearFilter] = useState(searchParams.get('financial_year') || '');
  const [page, setPage] = useState(parseInt(searchParams.get('page')) || 1);
  const [sortBy, setSortBy] = useState(searchParams.get('sort_by') || 'created_at');
  const [sortOrder, setSortOrder] = useState(searchParams.get('sort_order') || 'desc');
  const [limit] = useState(50);

  // Summary stats
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    filed: 0,
    late: 0,
    totalTax: 0,
  });

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Sync URL params
  useEffect(() => {
    const params = {};
    if (page > 1) params.page = page;
    if (debouncedSearch) params.search = debouncedSearch;
    if (statusFilter) params.status = statusFilter;
    if (filingTypeFilter) params.filing_type = filingTypeFilter;
    if (financialYearFilter) params.financial_year = financialYearFilter;
    if (sortBy !== 'created_at') params.sort_by = sortBy;
    if (sortOrder !== 'desc') params.sort_order = sortOrder;
    setSearchParams(params, { replace: true });
  }, [page, debouncedSearch, statusFilter, filingTypeFilter, financialYearFilter, sortBy, sortOrder, setSearchParams]);

  // Fetch data
  const fetchFilings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await gstFilingApi.list({
        page,
        limit,
        search: debouncedSearch || undefined,
        status: statusFilter || undefined,
        filing_type: filingTypeFilter || undefined,
        financial_year: financialYearFilter || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
      });
      const { data, total: totalCount } = response.data;
      setFilings(data || []);
      setTotal(totalCount || 0);

      // Compute summary from current page data
      const allData = data || [];
      setStats({
        total: totalCount || 0,
        pending: allData.filter((f) => f.status === 'Pending').length,
        filed: allData.filter((f) => f.status === 'Filed' || f.status === 'Verified').length,
        late: allData.filter((f) => f.status === 'Late').length,
        totalTax: allData.reduce(
          (sum, f) => sum + (parseFloat(f.total_tax_liability) || 0),
          0
        ),
      });
    } catch (err) {
      if (err.response?.status !== 401) {
        setError('Failed to load GST filings. Please try again.');
      }
      setFilings([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch, statusFilter, filingTypeFilter, financialYearFilter, sortBy, sortOrder]);

  useEffect(() => {
    fetchFilings();
  }, [fetchFilings]);

  // Sort handler
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setPage(1);
  };

  // Pagination
  const totalPages = Math.ceil(total / limit);
  const startRecord = total === 0 ? 0 : (page - 1) * limit + 1;
  const endRecord = Math.min(page * limit, total);

  // Sort indicator
  const SortIcon = ({ field }) => {
    if (sortBy !== field) return null;
    return (
      <span className="ml-1 text-[#0071DC]">
        {sortOrder === 'asc' ? '\u2191' : '\u2193'}
      </span>
    );
  };

  // Reset all filters
  const hasActiveFilters = statusFilter || filingTypeFilter || financialYearFilter || debouncedSearch;

  const resetFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setStatusFilter('');
    setFilingTypeFilter('');
    setFinancialYearFilter('');
    setPage(1);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#333]">GST Filings</h1>
          <p className="text-sm text-[#6B7280] mt-1">
            Track and manage your GST return filings
          </p>
        </div>
        <Link
          to="/gst-filings/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#0071DC] text-white text-sm font-medium rounded-lg hover:bg-[#005BB5] transition-colors"
        >
          <HiOutlinePlus className="w-4 h-4" /> New GST Filing
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <SummaryCard
          title="Total Filings"
          value={stats.total}
          icon={HiOutlineDocumentText}
          color="bg-blue-500"
        />
        <SummaryCard
          title="Pending"
          value={stats.pending}
          icon={HiOutlineClock}
          color="bg-yellow-500"
        />
        <SummaryCard
          title="Filed"
          value={stats.filed}
          icon={HiOutlineCheckCircle}
          color="bg-green-500"
        />
        <SummaryCard
          title="Late"
          value={stats.late}
          icon={HiOutlineExclamationTriangle}
          color="bg-red-500"
        />
      </div>

      {/* Filters + Table */}
      <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm mb-4">
        {/* Filter Row */}
        <div className="p-4 flex flex-wrap items-center gap-3 border-b border-[#E5E7EB]">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
            <input
              type="text"
              placeholder="Search by return type, period, ARN..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
            />
          </div>

          {/* Filing Type Filter */}
          <select
            value={filingTypeFilter}
            onChange={(e) => {
              setFilingTypeFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] bg-white focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
          >
            <option value="">All Types</option>
            {FILING_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] bg-white focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
          >
            <option value="">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Filed">Filed</option>
            <option value="Late">Late</option>
            <option value="Verified">Verified</option>
          </select>

          {/* Financial Year Filter */}
          <select
            value={financialYearFilter}
            onChange={(e) => {
              setFinancialYearFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] bg-white focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
          >
            <option value="">All FY</option>
            {getFinancialYearOptions().map((fy) => (
              <option key={fy} value={fy}>
                FY {fy}
              </option>
            ))}
          </select>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="inline-flex items-center gap-1 px-3 py-2 text-sm text-[#6B7280] hover:text-[#333] transition-colors"
            >
              <HiOutlineFunnel className="w-4 h-4" />
              Clear
            </button>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                <th
                  className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider cursor-pointer hover:text-[#333]"
                  onClick={() => handleSort('filing_type')}
                >
                  Return Type <SortIcon field="filing_type" />
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider cursor-pointer hover:text-[#333]"
                  onClick={() => handleSort('period')}
                >
                  Period <SortIcon field="period" />
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider cursor-pointer hover:text-[#333]"
                  onClick={() => handleSort('due_date')}
                >
                  Due Date <SortIcon field="due_date" />
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider cursor-pointer hover:text-[#333]"
                  onClick={() => handleSort('filing_date')}
                >
                  Filing Date <SortIcon field="filing_date" />
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider cursor-pointer hover:text-[#333]"
                  onClick={() => handleSort('status')}
                >
                  Status <SortIcon field="status" />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                  ARN
                </th>
                <th
                  className="px-4 py-3 text-right text-xs font-semibold text-[#6B7280] uppercase tracking-wider cursor-pointer hover:text-[#333]"
                  onClick={() => handleSort('total_tax_liability')}
                >
                  Tax Liability <SortIcon field="total_tax_liability" />
                </th>
                <th
                  className="px-4 py-3 text-right text-xs font-semibold text-[#6B7280] uppercase tracking-wider cursor-pointer hover:text-[#333]"
                  onClick={() => handleSort('net_tax_payable')}
                >
                  Net Payable <SortIcon field="net_tax_payable" />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 border-3 border-[#0071DC] border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm text-[#6B7280]">Loading filings...</span>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <HiOutlineExclamationTriangle className="w-10 h-10 text-red-300" />
                      <p className="text-sm text-red-600">{error}</p>
                      <button
                        onClick={fetchFilings}
                        className="text-sm text-[#0071DC] hover:underline"
                      >
                        Try again
                      </button>
                    </div>
                  </td>
                </tr>
              ) : filings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <HiOutlineDocumentText className="w-12 h-12 text-[#D1D5DB]" />
                      <p className="text-[#6B7280] font-medium">No GST filings found</p>
                      <p className="text-xs text-[#9CA3AF]">
                        {hasActiveFilters
                          ? 'Try adjusting your search or filters'
                          : 'Create your first GST filing to get started'}
                      </p>
                      {!hasActiveFilters && (
                        <Link
                          to="/gst-filings/new"
                          className="mt-2 inline-flex items-center gap-1 text-sm text-[#0071DC] hover:text-[#005BB5] font-medium"
                        >
                          <HiOutlinePlus className="w-4 h-4" /> Create Filing
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filings.map((filing, index) => (
                  <tr
                    key={filing.id}
                    onClick={() => navigate(`/gst-filings/${filing.id}`)}
                    className={`hover:bg-[#F0F7FF] cursor-pointer transition-colors ${
                      index % 2 === 0 ? 'bg-white' : 'bg-[#F9FAFB]'
                    }`}
                  >
                    <td className="px-4 py-3 font-medium text-[#0071DC]">
                      {filing.filing_type || filing.return_type || '--'}
                    </td>
                    <td className="px-4 py-3 text-[#333]">
                      {filing.period || filing.filing_period || '--'}
                    </td>
                    <td className="px-4 py-3 text-[#6B7280]">
                      {formatDate(filing.due_date)}
                    </td>
                    <td className="px-4 py-3 text-[#6B7280]">
                      {formatDate(filing.filing_date)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={filing.status} />
                    </td>
                    <td className="px-4 py-3 text-[#6B7280] text-xs font-mono">
                      {filing.arn_number || '--'}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-[#333]">
                      {formatIndianCurrency(filing.total_tax_liability)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-[#333]">
                      {formatIndianCurrency(filing.net_tax_payable)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && total > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#E5E7EB]">
            <p className="text-sm text-[#6B7280]">
              Showing{' '}
              <span className="font-medium text-[#333]">{startRecord}</span> to{' '}
              <span className="font-medium text-[#333]">{endRecord}</span> of{' '}
              <span className="font-medium text-[#333]">{total}</span> filings
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border border-[#E5E7EB] rounded-lg hover:bg-[#F9FAFB] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <HiOutlineChevronLeft className="w-4 h-4" /> Previous
              </button>
              <span className="text-sm text-[#6B7280]">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border border-[#E5E7EB] rounded-lg hover:bg-[#F9FAFB] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next <HiOutlineChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
