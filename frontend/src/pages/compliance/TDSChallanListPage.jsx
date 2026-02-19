import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  HiOutlinePlus,
  HiOutlineMagnifyingGlass,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineDocumentText,
  HiOutlineClock,
  HiOutlineCurrencyRupee,
  HiOutlineExclamationTriangle,
  HiOutlineFunnel,
  HiOutlineCheckCircle,
} from 'react-icons/hi2';
import { tdsChallanApi } from '../../api/tdsChallan.api';

// ── Helpers ────────────────────────────────────────────────────────

function formatIndianCurrency(value) {
  if (value == null || isNaN(value)) return '\u20B90.00';
  const num = Number(value);
  const isNegative = num < 0;
  const abs = Math.abs(num);
  const [intPart, decPart] = abs.toFixed(2).split('.');
  let result = '';
  if (intPart.length <= 3) {
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
    Draft: 'bg-gray-50 text-gray-700 border-gray-200',
    Pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    Deposited: 'bg-green-50 text-green-700 border-green-200',
    Paid: 'bg-green-50 text-green-700 border-green-200',
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
      <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-xs text-[#6B7280] font-medium uppercase tracking-wide">{title}</p>
        <p className="text-lg font-semibold text-[#333] mt-0.5">{value}</p>
      </div>
    </div>
  );
}

// ── Constants ──────────────────────────────────────────────────────

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

// ── Main Component ─────────────────────────────────────────────────

export default function TDSChallanListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [challans, setChallans] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [financialYearFilter, setFinancialYearFilter] = useState(searchParams.get('financial_year') || '');
  const [page, setPage] = useState(parseInt(searchParams.get('page')) || 1);
  const [sortBy, setSortBy] = useState(searchParams.get('sort_by') || 'created_at');
  const [sortOrder, setSortOrder] = useState(searchParams.get('sort_order') || 'desc');
  const [limit] = useState(50);

  const [stats, setStats] = useState({ total: 0, totalAmount: 0, deposited: 0 });

  // Debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Sync URL
  useEffect(() => {
    const params = {};
    if (page > 1) params.page = page;
    if (debouncedSearch) params.search = debouncedSearch;
    if (statusFilter) params.status = statusFilter;
    if (financialYearFilter) params.financial_year = financialYearFilter;
    if (sortBy !== 'created_at') params.sort_by = sortBy;
    if (sortOrder !== 'desc') params.sort_order = sortOrder;
    setSearchParams(params, { replace: true });
  }, [page, debouncedSearch, statusFilter, financialYearFilter, sortBy, sortOrder, setSearchParams]);

  // Fetch
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await tdsChallanApi.list({
        page,
        limit,
        search: debouncedSearch || undefined,
        status: statusFilter || undefined,
        financial_year: financialYearFilter || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
      });
      const { data, total: totalCount } = response.data;
      setChallans(data || []);
      setTotal(totalCount || 0);

      const allData = data || [];
      setStats({
        total: totalCount || 0,
        totalAmount: allData.reduce(
          (sum, c) => sum + (parseFloat(c.total_amount) || parseFloat(c.amount) || 0),
          0
        ),
        deposited: allData.filter((c) => c.status === 'Deposited' || c.status === 'Paid' || c.status === 'Verified').length,
      });
    } catch (err) {
      if (err.response?.status !== 401) {
        setError('Failed to load TDS challans. Please try again.');
      }
      setChallans([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch, statusFilter, financialYearFilter, sortBy, sortOrder]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setPage(1);
  };

  const totalPages = Math.ceil(total / limit);
  const startRecord = total === 0 ? 0 : (page - 1) * limit + 1;
  const endRecord = Math.min(page * limit, total);

  const SortIcon = ({ field }) => {
    if (sortBy !== field) return null;
    return <span className="ml-1 text-[#0071DC]">{sortOrder === 'asc' ? '\u2191' : '\u2193'}</span>;
  };

  const hasActiveFilters = statusFilter || financialYearFilter || debouncedSearch;

  const resetFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setStatusFilter('');
    setFinancialYearFilter('');
    setPage(1);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#333]">TDS Challans</h1>
          <p className="text-sm text-[#6B7280] mt-1">Manage TDS challan deposits and records</p>
        </div>
        <Link
          to="/tds-challans/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#0071DC] text-white text-sm font-medium rounded-lg hover:bg-[#005BB5] transition-colors"
        >
          <HiOutlinePlus className="w-4 h-4" /> New TDS Challan
        </Link>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <SummaryCard title="Total Challans" value={stats.total} icon={HiOutlineDocumentText} color="bg-blue-500" />
        <SummaryCard title="Total Amount" value={formatIndianCurrency(stats.totalAmount)} icon={HiOutlineCurrencyRupee} color="bg-purple-500" />
        <SummaryCard title="Deposited" value={stats.deposited} icon={HiOutlineCheckCircle} color="bg-green-500" />
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm mb-4">
        {/* Filters */}
        <div className="p-4 flex flex-wrap items-center gap-3 border-b border-[#E5E7EB]">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
            <input
              type="text"
              placeholder="Search by challan number, BSR code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] bg-white focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
          >
            <option value="">All Status</option>
            <option value="Draft">Draft</option>
            <option value="Deposited">Deposited</option>
            <option value="Verified">Verified</option>
          </select>
          <select
            value={financialYearFilter}
            onChange={(e) => { setFinancialYearFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] bg-white focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
          >
            <option value="">All FY</option>
            {getFinancialYearOptions().map((fy) => (
              <option key={fy} value={fy}>FY {fy}</option>
            ))}
          </select>
          {hasActiveFilters && (
            <button onClick={resetFilters} className="inline-flex items-center gap-1 px-3 py-2 text-sm text-[#6B7280] hover:text-[#333] transition-colors">
              <HiOutlineFunnel className="w-4 h-4" /> Clear
            </button>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider cursor-pointer hover:text-[#333]" onClick={() => handleSort('challan_number')}>
                  Challan No. <SortIcon field="challan_number" />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">BSR Code</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider cursor-pointer hover:text-[#333]" onClick={() => handleSort('deposit_date')}>
                  Deposit Date <SortIcon field="deposit_date" />
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[#6B7280] uppercase tracking-wider cursor-pointer hover:text-[#333]" onClick={() => handleSort('total_tds_amount')}>
                  TDS Amount <SortIcon field="total_tds_amount" />
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Surcharge</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Cess</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[#6B7280] uppercase tracking-wider cursor-pointer hover:text-[#333]" onClick={() => handleSort('total_amount')}>
                  Total <SortIcon field="total_amount" />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Payment Mode</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider cursor-pointer hover:text-[#333]" onClick={() => handleSort('status')}>
                  Status <SortIcon field="status" />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 border-3 border-[#0071DC] border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm text-[#6B7280]">Loading challans...</span>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <HiOutlineExclamationTriangle className="w-10 h-10 text-red-300" />
                      <p className="text-sm text-red-600">{error}</p>
                      <button onClick={fetchData} className="text-sm text-[#0071DC] hover:underline">Try again</button>
                    </div>
                  </td>
                </tr>
              ) : challans.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <HiOutlineDocumentText className="w-12 h-12 text-[#D1D5DB]" />
                      <p className="text-[#6B7280] font-medium">No TDS challans found</p>
                      <p className="text-xs text-[#9CA3AF]">
                        {hasActiveFilters ? 'Try adjusting your search or filters' : 'Create your first TDS challan'}
                      </p>
                      {!hasActiveFilters && (
                        <Link to="/tds-challans/new" className="mt-2 inline-flex items-center gap-1 text-sm text-[#0071DC] hover:text-[#005BB5] font-medium">
                          <HiOutlinePlus className="w-4 h-4" /> Create Challan
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                challans.map((item, index) => (
                  <tr
                    key={item.id}
                    onClick={() => navigate(`/tds-challans/${item.id}`)}
                    className={`hover:bg-[#F0F7FF] cursor-pointer transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-[#F9FAFB]'}`}
                  >
                    <td className="px-4 py-3 font-medium text-[#0071DC]">{item.challan_number || '--'}</td>
                    <td className="px-4 py-3 text-[#6B7280] font-mono text-xs">{item.bsr_code || '--'}</td>
                    <td className="px-4 py-3 text-[#6B7280]">{formatDate(item.deposit_date || item.challan_date)}</td>
                    <td className="px-4 py-3 text-right text-[#333]">{formatIndianCurrency(item.total_tds_amount)}</td>
                    <td className="px-4 py-3 text-right text-[#6B7280]">{formatIndianCurrency(item.total_surcharge)}</td>
                    <td className="px-4 py-3 text-right text-[#6B7280]">{formatIndianCurrency(item.total_cess)}</td>
                    <td className="px-4 py-3 text-right font-medium text-[#333]">{formatIndianCurrency(item.total_amount || item.amount)}</td>
                    <td className="px-4 py-3 text-[#6B7280]">{item.payment_mode || '--'}</td>
                    <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
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
              Showing <span className="font-medium text-[#333]">{startRecord}</span> to{' '}
              <span className="font-medium text-[#333]">{endRecord}</span> of{' '}
              <span className="font-medium text-[#333]">{total}</span> challans
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border border-[#E5E7EB] rounded-lg hover:bg-[#F9FAFB] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <HiOutlineChevronLeft className="w-4 h-4" /> Previous
              </button>
              <span className="text-sm text-[#6B7280]">Page {page} of {totalPages}</span>
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
