import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  HiOutlineCurrencyRupee,
  HiOutlineUsers,
  HiOutlineDocumentText,
  HiOutlineBanknotes,
  HiOutlineExclamationTriangle,
  HiOutlineArrowTrendingUp,
  HiOutlineArrowTrendingDown,
  HiOutlineBuildingLibrary,
  HiOutlineCalendarDays,
  HiOutlineArrowPath,
  HiOutlineChevronRight,
} from 'react-icons/hi2';
import apiClient from '../../api/client';
import CashFlowChart from './charts/CashFlowChart';
import IncomeExpenseChart from './charts/IncomeExpenseChart';
import ReceivablesDonutChart from './charts/ReceivablesDonutChart';
import ExpenseBreakdownChart from './charts/ExpenseBreakdownChart';

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

function formatCompact(value) {
  if (value == null || isNaN(value)) return '\u20B90';
  const num = Number(value);
  if (num >= 10000000) return `\u20B9${(num / 10000000).toFixed(1)}Cr`;
  if (num >= 100000) return `\u20B9${(num / 100000).toFixed(1)}L`;
  if (num >= 1000) return `\u20B9${(num / 1000).toFixed(1)}K`;
  return formatIndianCurrency(num);
}

function SummaryCard({ title, value, subtitle, icon: Icon, color, trend, trendValue, to, breakdown }) {
  const cardContent = (
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <p className="text-xs text-[#6B7280] font-medium uppercase tracking-wide">{title}</p>
        <p className="text-xl font-semibold text-[#333] mt-1">{value}</p>
        {breakdown ? (
          <div className="flex items-center gap-3 mt-1.5">
            <span className="text-xs text-green-600 font-medium">
              Current: {breakdown.current}
            </span>
            <span className="text-xs text-red-500 font-medium">
              Overdue: {breakdown.overdue}
            </span>
          </div>
        ) : subtitle ? (
          <p className="text-xs text-[#9CA3AF] mt-1">{subtitle}</p>
        ) : null}
        {trend && (
          <div className={`flex items-center gap-1 mt-1.5 text-xs font-medium ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
            {trend === 'up' ? (
              <HiOutlineArrowTrendingUp className="w-3.5 h-3.5" />
            ) : (
              <HiOutlineArrowTrendingDown className="w-3.5 h-3.5" />
            )}
            {trendValue}
          </div>
        )}
      </div>
      <div className={`w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="block no-underline bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-5 hover:shadow-md hover:border-[#0071DC]/30 hover:-translate-y-0.5 transition-all cursor-pointer">
        {cardContent}
      </Link>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-5 hover:shadow-md transition-shadow">
      {cardContent}
    </div>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return '--';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
    });
  } catch {
    return '--';
  }
}

function ActivityIcon({ type }) {
  const styles = {
    invoice: 'bg-blue-100 text-blue-600',
    bill: 'bg-orange-100 text-orange-600',
    expense: 'bg-red-100 text-red-600',
    payment_received: 'bg-green-100 text-green-600',
  };
  const icons = {
    invoice: HiOutlineDocumentText,
    bill: HiOutlineBanknotes,
    expense: HiOutlineCurrencyRupee,
    payment_received: HiOutlineArrowTrendingUp,
  };
  const Icon = icons[type] || HiOutlineDocumentText;
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${styles[type] || 'bg-gray-100 text-gray-600'}`}>
      <Icon className="w-4 h-4" />
    </div>
  );
}

function activityLabel(type) {
  const labels = {
    invoice: 'Invoice',
    bill: 'Bill',
    expense: 'Expense',
    payment_received: 'Payment Received',
  };
  return labels[type] || type;
}

function activityLink(type, id) {
  const links = {
    invoice: `/invoices/${id}`,
    bill: `/bills/${id}`,
    expense: `/expenses/${id}`,
    payment_received: `/payments-received/${id}`,
  };
  return links[type] || '#';
}

// ── Date Range Helpers ──────────────────────────────────────────
function getCurrentFYStart() {
  const now = new Date();
  const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return new Date(year, 3, 1); // April 1
}

function getDateRange(preset) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const fyStart = getCurrentFYStart();

  switch (preset) {
    case 'this_month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start, end: today, label: 'This Month' };
    }
    case 'last_month': {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return { start, end, label: 'Last Month' };
    }
    case 'this_quarter': {
      // FY quarters: Q1=Apr-Jun, Q2=Jul-Sep, Q3=Oct-Dec, Q4=Jan-Mar
      const month = now.getMonth();
      let qStart;
      if (month >= 3 && month <= 5) qStart = new Date(now.getFullYear(), 3, 1);
      else if (month >= 6 && month <= 8) qStart = new Date(now.getFullYear(), 6, 1);
      else if (month >= 9 && month <= 11) qStart = new Date(now.getFullYear(), 9, 1);
      else qStart = new Date(now.getFullYear(), 0, 1);
      return { start: qStart, end: today, label: 'This Quarter' };
    }
    case 'last_quarter': {
      const month = now.getMonth();
      let qStart, qEnd;
      if (month >= 3 && month <= 5) {
        qStart = new Date(now.getFullYear(), 0, 1);
        qEnd = new Date(now.getFullYear(), 2, 31);
      } else if (month >= 6 && month <= 8) {
        qStart = new Date(now.getFullYear(), 3, 1);
        qEnd = new Date(now.getFullYear(), 5, 30);
      } else if (month >= 9 && month <= 11) {
        qStart = new Date(now.getFullYear(), 6, 1);
        qEnd = new Date(now.getFullYear(), 8, 30);
      } else {
        qStart = new Date(now.getFullYear() - 1, 9, 1);
        qEnd = new Date(now.getFullYear() - 1, 11, 31);
      }
      return { start: qStart, end: qEnd, label: 'Last Quarter' };
    }
    case 'this_fy':
      return { start: fyStart, end: today, label: `FY ${fyStart.getFullYear()}-${fyStart.getFullYear() + 1}` };
    case 'last_fy': {
      const lastFyStart = new Date(fyStart.getFullYear() - 1, 3, 1);
      const lastFyEnd = new Date(fyStart.getFullYear(), 2, 31);
      return { start: lastFyStart, end: lastFyEnd, label: `FY ${lastFyStart.getFullYear()}-${lastFyStart.getFullYear() + 1}` };
    }
    case 'last_7_days': {
      const start = new Date(today);
      start.setDate(start.getDate() - 7);
      return { start, end: today, label: 'Last 7 Days' };
    }
    case 'last_30_days': {
      const start = new Date(today);
      start.setDate(start.getDate() - 30);
      return { start, end: today, label: 'Last 30 Days' };
    }
    default:
      return { start: null, end: null, label: 'All Time' };
  }
}

const DATE_PRESETS = [
  { id: 'all', label: 'All Time' },
  { id: 'this_month', label: 'This Month' },
  { id: 'last_month', label: 'Last Month' },
  { id: 'this_quarter', label: 'This Quarter' },
  { id: 'last_quarter', label: 'Last Quarter' },
  { id: 'this_fy', label: 'This FY' },
  { id: 'last_fy', label: 'Last FY' },
  { id: 'last_7_days', label: 'Last 7 Days' },
  { id: 'last_30_days', label: 'Last 30 Days' },
  { id: 'custom', label: 'Custom' },
];

function fmtISO(d) {
  if (!d) return '';
  // Use local date parts to avoid UTC conversion shifting the date by timezone offset
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function DashboardPage() {
  const [summary, setSummary] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Date filtering for summary cards (receivables/payables)
  const [datePreset, setDatePreset] = useState('this_month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Separate date filter for charts section
  const [chartPreset, setChartPreset] = useState('this_fy');

  // Compute date params for summary cards
  const dateParams = useMemo(() => {
    if (datePreset === 'all') return {};
    if (datePreset === 'custom' && customStart && customEnd) {
      return { start_date: customStart, end_date: customEnd };
    }
    if (datePreset !== 'custom') {
      const range = getDateRange(datePreset);
      const p = {};
      if (range.start) p.start_date = fmtISO(range.start);
      if (range.end) p.end_date = fmtISO(range.end);
      return p;
    }
    return {};
  }, [datePreset, customStart, customEnd]);

  // Compute date params for charts (separate filter)
  const chartDateParams = useMemo(() => {
    if (chartPreset === 'all') return {};
    const range = getDateRange(chartPreset);
    const p = {};
    if (range.start) p.start_date = fmtISO(range.start);
    if (range.end) p.end_date = fmtISO(range.end);
    return p;
  }, [chartPreset]);

  const fetchDashboardData = useCallback(async (preset, cStart, cEnd) => {
    setLoading(true);
    try {
      const params = { limit: 10 };

      // Add date params if not "all"
      if (preset !== 'all') {
        if (preset === 'custom' && cStart && cEnd) {
          params.start_date = cStart;
          params.end_date = cEnd;
        } else if (preset !== 'custom') {
          const range = getDateRange(preset);
          if (range.start) params.start_date = fmtISO(range.start);
          if (range.end) params.end_date = fmtISO(range.end);
        }
      }

      const [summaryRes, activityRes, banksRes] = await Promise.allSettled([
        apiClient.get('/dashboard/summary', { params }),
        apiClient.get('/dashboard/recent-activity', { params }),
        apiClient.get('/bank-accounts', { params: { limit: 10, is_active: true } }),
      ]);

      if (summaryRes.status === 'fulfilled') {
        setSummary(summaryRes.value.data?.data || {});
      }
      if (activityRes.status === 'fulfilled') {
        setRecentActivity(activityRes.value.data?.data || []);
      }
      if (banksRes.status === 'fulfilled') {
        setBankAccounts(banksRes.value.data?.data || []);
      }
    } catch {
      // Errors handled by interceptor
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData(datePreset, customStart, customEnd);
  }, [fetchDashboardData, datePreset, customStart, customEnd]);

  const handlePresetChange = (preset) => {
    setDatePreset(preset);
    if (preset === 'custom') {
      setShowDatePicker(true);
    } else {
      setShowDatePicker(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#0071DC] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-[#6B7280]">Loading dashboard...</span>
        </div>
      </div>
    );
  }

  const s = summary || {};
  const periodLabel = datePreset === 'all' ? 'All Time'
    : datePreset === 'custom' ? 'Selected Period'
    : (DATE_PRESETS.find(p => p.id === datePreset)?.label || 'Period');

  return (
    <div>
      {/* Header + Date Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#333]">Dashboard</h1>
          <p className="text-sm text-[#6B7280] mt-1">
            Welcome to NavoditaERP. Your business overview at a glance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Date Preset Selector */}
          <div className="relative">
            <div className="flex items-center gap-1.5">
              <HiOutlineCalendarDays className="w-4 h-4 text-[#6B7280]" />
              <select
                value={datePreset}
                onChange={(e) => handlePresetChange(e.target.value)}
                className="px-3 py-1.5 text-sm bg-white border border-[#E5E7EB] rounded-lg text-[#333] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC] cursor-pointer"
              >
                {DATE_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Custom Date Range */}
          {showDatePicker && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="px-2 py-1.5 text-sm bg-white border border-[#E5E7EB] rounded-lg text-[#333] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
              />
              <span className="text-xs text-[#9CA3AF]">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-2 py-1.5 text-sm bg-white border border-[#E5E7EB] rounded-lg text-[#333] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
              />
            </div>
          )}

          {/* Refresh Button */}
          <button
            onClick={() => fetchDashboardData(datePreset, customStart, customEnd)}
            disabled={loading}
            className="p-2 text-[#6B7280] hover:text-[#0071DC] hover:bg-blue-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh"
          >
            <HiOutlineArrowPath className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Summary Cards - Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <SummaryCard
          title="Total Receivables"
          value={formatCompact(s.totalReceivables)}
          icon={HiOutlineCurrencyRupee}
          color="bg-blue-400/80"
          to="/invoices?status=Overdue"
          breakdown={{
            current: formatCompact(s.currentReceivables || 0),
            overdue: formatCompact(s.overdueReceivables || 0),
          }}
        />
        <SummaryCard
          title="Total Payables"
          value={formatCompact(s.totalPayables)}
          icon={HiOutlineBanknotes}
          color="bg-amber-400/80"
          to="/bills?status=Pending"
          breakdown={{
            current: formatCompact(s.currentPayables || 0),
            overdue: formatCompact(s.overduePayables || 0),
          }}
        />
        <SummaryCard
          title={`Income (${periodLabel})`}
          value={formatCompact(s.totalIncome)}
          subtitle="Payments received"
          icon={HiOutlineArrowTrendingUp}
          color="bg-emerald-400/80"
          to="/payments-received"
        />
        <SummaryCard
          title={`Expenses (${periodLabel})`}
          value={formatCompact(s.totalExpenses)}
          subtitle="Bills + direct expenses"
          icon={HiOutlineArrowTrendingDown}
          color="bg-rose-400/80"
          to="/expenses"
        />
      </div>

      {/* Overdue Alerts */}
      {(s.overdueInvoices > 0 || s.overdueBills > 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <HiOutlineExclamationTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800">Overdue Items</p>
              <div className="flex flex-wrap gap-4 mt-1">
                {s.overdueInvoices > 0 && (
                  <Link to="/invoices?status=Overdue" className="text-sm text-amber-700 hover:text-amber-900 underline">
                    {s.overdueInvoices} overdue invoice{s.overdueInvoices > 1 ? 's' : ''}
                  </Link>
                )}
                {s.overdueBills > 0 && (
                  <Link to="/bills?status=Pending" className="text-sm text-amber-700 hover:text-amber-900 underline">
                    {s.overdueBills} overdue bill{s.overdueBills > 1 ? 's' : ''}
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Charts Filter Bar */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-[#333]">Analytics</h2>
        <div className="flex items-center gap-1.5">
          {[
            { id: 'this_month', label: 'This Month' },
            { id: 'this_quarter', label: 'Quarter' },
            { id: 'this_fy', label: 'This FY' },
            { id: 'last_fy', label: 'Last FY' },
            { id: 'all', label: 'All Time' },
          ].map((p) => (
            <button
              key={p.id}
              onClick={() => setChartPreset(p.id)}
              className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors cursor-pointer ${
                chartPreset === p.id
                  ? 'bg-[#0071DC] text-white border-[#0071DC]'
                  : 'bg-white text-[#6B7280] border-[#E5E7EB] hover:bg-gray-50'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6">
          <h2 className="text-base font-semibold text-[#333] mb-4">Cash Flow</h2>
          <CashFlowChart dateParams={chartDateParams} />
        </div>
        <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6">
          <h2 className="text-base font-semibold text-[#333] mb-4">Income vs Expenses</h2>
          <IncomeExpenseChart dateParams={chartDateParams} />
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6">
          <h2 className="text-base font-semibold text-[#333] mb-4">Receivables Aging</h2>
          <ReceivablesDonutChart dateParams={chartDateParams} />
        </div>
        <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6">
          <h2 className="text-base font-semibold text-[#333] mb-4">Top Expenses</h2>
          <ExpenseBreakdownChart dateParams={chartDateParams} />
        </div>
      </div>

      {/* Bottom Row: Recent Activity + Bank Accounts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-[#E5E7EB] shadow-sm">
          <div className="px-6 py-4 border-b border-[#E5E7EB]">
            <h2 className="text-base font-semibold text-[#333]">Recent Activity</h2>
          </div>
          <div className="divide-y divide-[#F3F4F6]">
            {recentActivity.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <HiOutlineDocumentText className="w-10 h-10 text-[#D1D5DB] mx-auto mb-2" />
                <p className="text-sm text-[#6B7280]">No recent activity</p>
              </div>
            ) : (
              recentActivity.map((item, idx) => (
                <Link
                  key={`${item.type}-${item.id}-${idx}`}
                  to={activityLink(item.type, item.id)}
                  className="flex items-center gap-3 px-6 py-3 hover:bg-[#F9FAFB] transition-colors"
                >
                  <ActivityIcon type={item.type} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[#333] truncate">
                        {item.number || '--'}
                      </span>
                      <span className="text-xs text-[#9CA3AF]">{activityLabel(item.type)}</span>
                    </div>
                    <p className="text-xs text-[#6B7280] truncate">{item.party_name || '--'}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-medium text-[#333]">{formatIndianCurrency(item.amount)}</p>
                    <p className="text-xs text-[#9CA3AF]">{formatDate(item.created_at)}</p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Bank Accounts */}
        <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm">
          <div className="px-6 py-4 border-b border-[#E5E7EB] flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#333]">Bank Accounts</h2>
            <Link to="/banking" className="text-xs text-[#0071DC] hover:text-[#005BB5] font-medium">
              View All
            </Link>
          </div>
          <div className="divide-y divide-[#F3F4F6]">
            {bankAccounts.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <HiOutlineBuildingLibrary className="w-10 h-10 text-[#D1D5DB] mx-auto mb-2" />
                <p className="text-sm text-[#6B7280]">No bank accounts</p>
                <Link
                  to="/banking"
                  className="inline-block mt-2 text-sm text-[#0071DC] hover:text-[#005BB5] font-medium"
                >
                  Add Bank Account
                </Link>
              </div>
            ) : (
              bankAccounts.map((bank) => (
                <Link
                  key={bank.id}
                  to={`/banking?account=${bank.id}`}
                  className="block px-6 py-3 hover:bg-[#F0F7FF] transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-[#333]">{bank.account_name}</p>
                      <p className="text-xs text-[#6B7280]">{bank.bank_name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-[#333]">
                        {formatIndianCurrency(bank.current_balance)}
                      </p>
                      <HiOutlineChevronRight className="w-4 h-4 text-[#9CA3AF]" />
                    </div>
                  </div>
                </Link>
              ))
            )}
            {bankAccounts.length > 0 && (
              <div className="px-6 py-3 bg-[#F9FAFB]">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-[#6B7280] uppercase">Total Balance</p>
                  <p className="text-sm font-bold text-[#333]">
                    {formatIndianCurrency(
                      bankAccounts.reduce((sum, b) => sum + (parseFloat(b.current_balance) || 0), 0)
                    )}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
