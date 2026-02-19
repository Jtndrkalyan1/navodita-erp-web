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
import { tdsLiabilityApi } from '../../api/tdsLiability.api';

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
    Pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    Deposited: 'bg-green-50 text-green-700 border-green-200',
    Filed: 'bg-blue-50 text-blue-700 border-blue-200',
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

const TDS_SECTIONS = [
  '194C', '194H', '194I', '194J', '194A', '194B', '194D',
  '194E', '194G', '194K', '194N', '194O', '194Q', '194R', '194S', '195',
];

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

export default function TDSLiabilityListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [liabilities, setLiabilities] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [sectionFilter, setSectionFilter] = useState(searchParams.get('section') || '');
  const [financialYearFilter, setFinancialYearFilter] = useState(searchParams.get('financial_year') || '');
  const [page, setPage] = useState(parseInt(searchParams.get('page')) || 1);
  const [sortBy, setSortBy] = useState(searchParams.get('sort_by') || 'created_at');
  const [sortOrder, setSortOrder] = useState(searchParams.get('sort_order') || 'desc');
  const [limit] = useState(50);

  const [stats, setStats] = useState({ total: 0, pending: 0, totalTds: 0 });

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
    if (sectionFilter) params.section = sectionFilter;
    if (financialYearFilter) params.financial_year = financialYearFilter;
    if (sortBy !== 'created_at') params.sort_by = sortBy;
    if (sortOrder !== 'desc') params.sort_order = sortOrder;
    setSearchParams(params, { replace: true });
  }, [page, debouncedSearch, statusFilter, sectionFilter, financialYearFilter, sortBy, sortOrder, setSearchParams]);

  // Fetch
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await tdsLiabilityApi.list({
        page,
        limit,
        search: debouncedSearch || undefined,
        status: statusFilter || undefined,
        section: sectionFilter || undefined,
        financial_year: financialYearFilter || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
      });
      const { data, total: totalCount } = response.data;
      setLiabilities(data || []);
      setTotal(totalCount || 0);

      const allData = data || [];
      setStats({
        total: totalCount || 0,
        pending: allData.filter((l) => l.status === 'Pending').length,
        totalTds: allData.reduce(
          (sum, l) => sum + (parseFloat(l.total_tds) || parseFloat(l.tds_amount) || 0),
          0
        ),
      });
    } catch (err) {
      if (err.response?.status !== 401) {
        setError('Failed to load TDS liabilities. Please try again.');
      }
      setLiabilities([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch, statusFilter, sectionFilter, financialYearFilter, sortBy, sortOrder]);

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

  const hasActiveFilters = statusFilter || sectionFilter || financialYearFilter || debouncedSearch;

  const resetFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setStatusFilter('');
    setSectionFilter('');
    setFinancialYearFilter('');
    setPage(1);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#333]">TDS Liabilities</h1>
          <p className="text-sm text-[#6B7280] mt-1">Track TDS deductions and liabilities</p>
        </div>
        <Link
          to="/tds-liabilities/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#0071DC] text-white text-sm font-medium rounded-lg hover:bg-[#005BB5] transition-colors"
        >
          <HiOutlinePlus className="w-4 h-4" /> New TDS Liability
        </Link>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <SummaryCard title="Total Liabilities" value={stats.total} icon={HiOutlineDocumentText} color="bg-blue-500" />
        <SummaryCard title="Pending Deposit" value={stats.pending} icon={HiOutlineClock} color="bg-yellow-500" />
        <SummaryCard title="Total TDS Amount" value={formatIndianCurrency(stats.totalTds)} icon={HiOutlineCurrencyRupee} color="bg-purple-500" />
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm mb-4">
        {/* Filters */}
        <div className="p-4 flex flex-wrap items-center gap-3 border-b border-[#E5E7EB]">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
            <input
              type="text"
              placeholder="Search by deductee name, PAN..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
            />
          </div>
          <select
            value={sectionFilter}
            onChange={(e) => { setSectionFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] bg-white focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
          >
            <option value="">All Sections</option>
            {TDS_SECTIONS.map((s) => (
              <option key={s} value={s}>Sec {s}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] bg-white focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
          >
            <option value="">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Deposited">Deposited</option>
            <option value="Filed">Filed</option>
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
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider cursor-pointer hover:text-[#333]" onClick={() => handleSort('deductee_name')}>
                  Deductee <SortIcon field="deductee_name" />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">PAN</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider cursor-pointer hover:text-[#333]" onClick={() => handleSort('section')}>
                  Section <SortIcon field="section" />
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Rate</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[#6B7280] uppercase tracking-wider cursor-pointer hover:text-[#333]" onClick={() => handleSort('base_amount')}>
                  Base Amount <SortIcon field="base_amount" />
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[#6B7280] uppercase tracking-wider cursor-pointer hover:text-[#333]" onClick={() => handleSort('total_tds')}>
                  Total TDS <SortIcon field="total_tds" />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider cursor-pointer hover:text-[#333]" onClick={() => handleSort('deduction_date')}>
                  Deduction Date <SortIcon field="deduction_date" />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider cursor-pointer hover:text-[#333]" onClick={() => handleSort('status')}>
                  Status <SortIcon field="status" />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 border-3 border-[#0071DC] border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm text-[#6B7280]">Loading liabilities...</span>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <HiOutlineExclamationTriangle className="w-10 h-10 text-red-300" />
                      <p className="text-sm text-red-600">{error}</p>
                      <button onClick={fetchData} className="text-sm text-[#0071DC] hover:underline">Try again</button>
                    </div>
                  </td>
                </tr>
              ) : liabilities.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <HiOutlineDocumentText className="w-12 h-12 text-[#D1D5DB]" />
                      <p className="text-[#6B7280] font-medium">No TDS liabilities found</p>
                      <p className="text-xs text-[#9CA3AF]">
                        {hasActiveFilters ? 'Try adjusting your search or filters' : 'Create your first TDS liability record'}
                      </p>
                      {!hasActiveFilters && (
                        <Link to="/tds-liabilities/new" className="mt-2 inline-flex items-center gap-1 text-sm text-[#0071DC] hover:text-[#005BB5] font-medium">
                          <HiOutlinePlus className="w-4 h-4" /> Create Liability
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                liabilities.map((item, index) => (
                  <tr
                    key={item.id}
                    onClick={() => navigate(`/tds-liabilities/${item.id}`)}
                    className={`hover:bg-[#F0F7FF] cursor-pointer transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-[#F9FAFB]'}`}
                  >
                    <td className="px-4 py-3 font-medium text-[#0071DC]">{item.deductee_name || item.vendor_name || '--'}</td>
                    <td className="px-4 py-3 text-[#6B7280] font-mono text-xs">{item.deductee_pan || '--'}</td>
                    <td className="px-4 py-3 text-[#333]">{item.section ? `Sec ${item.section}` : '--'}</td>
                    <td className="px-4 py-3 text-right text-[#6B7280]">{item.tds_rate != null ? `${item.tds_rate}%` : '--'}</td>
                    <td className="px-4 py-3 text-right text-[#333]">{formatIndianCurrency(item.base_amount || item.payment_amount)}</td>
                    <td className="px-4 py-3 text-right font-medium text-[#333]">{formatIndianCurrency(item.total_tds || item.tds_amount)}</td>
                    <td className="px-4 py-3 text-[#6B7280]">{formatDate(item.deduction_date || item.payment_date)}</td>
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
              <span className="font-medium text-[#333]">{total}</span> liabilities
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
