import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  HiOutlinePlus,
  HiOutlineMagnifyingGlass,
  HiOutlineChevronUp,
  HiOutlineChevronDown,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineReceiptPercent,
  HiOutlineCalendarDays,
  HiOutlineCurrencyRupee,
  HiOutlineClock,
  HiOutlineFunnel,
} from 'react-icons/hi2';
import { expenseApi } from '../../api/expense.api';

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

const STATUS_CONFIG = {
  Pending: {
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-700',
    borderColor: 'border-orange-200',
  },
  Approved: {
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200',
  },
  Paid: {
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
    borderColor: 'border-green-200',
  },
  Rejected: {
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    borderColor: 'border-red-200',
  },
};

function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.Pending;
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.bgColor} ${config.textColor} ${config.borderColor}`}
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

const STATUS_FILTER_OPTIONS = ['All', 'Pending', 'Approved', 'Paid', 'Rejected'];

const SORTABLE_COLUMNS = {
  expense_number: 'Expense #',
  expense_date: 'Date',
  category: 'Category',
  vendor_name: 'Vendor',
  description: 'Description',
  status: 'Status',
  total_amount: 'Amount',
};

export default function ExpenseListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [expenses, setExpenses] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'All');
  const [page, setPage] = useState(parseInt(searchParams.get('page')) || 1);
  const [limit] = useState(50);
  const [sortBy, setSortBy] = useState(searchParams.get('sort_by') || 'created_at');
  const [sortOrder, setSortOrder] = useState(searchParams.get('sort_order') || 'desc');

  const [stats, setStats] = useState({
    totalExpenses: 0,
    thisMonth: 0,
    pendingApproval: 0,
    totalAmount: 0,
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
    if (statusFilter !== 'All') params.status = statusFilter;
    if (sortBy !== 'created_at') params.sort_by = sortBy;
    if (sortOrder !== 'desc') params.sort_order = sortOrder;
    setSearchParams(params, { replace: true });
  }, [page, debouncedSearch, statusFilter, sortBy, sortOrder, setSearchParams]);

  // Fetch expenses
  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const response = await expenseApi.list({
        page,
        limit,
        search: debouncedSearch || undefined,
        status: statusFilter !== 'All' ? statusFilter : undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
      });

      const { data, total: totalCount } = response.data;
      setExpenses(data || []);
      setTotal(totalCount || 0);

      const allData = data || [];
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      setStats({
        totalExpenses: totalCount || 0,
        thisMonth: allData.filter((exp) => {
          if (!exp.expense_date) return false;
          const d = new Date(exp.expense_date);
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        }).length,
        pendingApproval: allData.filter((exp) => exp.status === 'Pending').length,
        totalAmount: allData.reduce(
          (sum, exp) => sum + (parseFloat(exp.total_amount) || 0),
          0
        ),
      });
    } catch (err) {
      setExpenses([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch, statusFilter, sortBy, sortOrder]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const SortIcon = ({ column }) => {
    if (sortBy !== column) {
      return <span className="ml-1 text-gray-300 text-xs">&uarr;&darr;</span>;
    }
    return sortOrder === 'asc' ? (
      <HiOutlineChevronUp className="ml-1 w-3 h-3 inline" />
    ) : (
      <HiOutlineChevronDown className="ml-1 w-3 h-3 inline" />
    );
  };

  const totalPages = Math.ceil(total / limit);
  const startRecord = total === 0 ? 0 : (page - 1) * limit + 1;
  const endRecord = Math.min(page * limit, total);

  const handleRowClick = (id) => {
    navigate(`/expenses/${id}`);
  };

  const handleStatusFilter = (status) => {
    setStatusFilter(status);
    setPage(1);
  };

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#333]">Expenses</h1>
          <p className="text-sm text-[#6B7280] mt-1">
            Track and manage business expenses
          </p>
        </div>
        <Link
          to="/expenses/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#0071DC] text-white text-sm font-medium rounded-lg hover:bg-[#005BB5] transition-colors"
        >
          <HiOutlinePlus className="w-4 h-4" />
          New Expense
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <SummaryCard
          title="Total Expenses"
          value={stats.totalExpenses.toLocaleString('en-IN')}
          icon={HiOutlineReceiptPercent}
          color="bg-blue-500"
        />
        <SummaryCard
          title="This Month"
          value={stats.thisMonth.toLocaleString('en-IN')}
          icon={HiOutlineCalendarDays}
          color="bg-green-500"
        />
        <SummaryCard
          title="Pending Approval"
          value={stats.pendingApproval.toLocaleString('en-IN')}
          icon={HiOutlineClock}
          color="bg-orange-500"
        />
        <SummaryCard
          title="Total Amount"
          value={formatIndianCurrency(stats.totalAmount)}
          icon={HiOutlineCurrencyRupee}
          color="bg-purple-500"
        />
      </div>

      {/* Search, Filter & Table */}
      <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm mb-4">
        <div className="p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
            <input
              type="text"
              placeholder="Search by expense number, category, vendor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <HiOutlineFunnel className="w-4 h-4 text-[#6B7280]" />
            {STATUS_FILTER_OPTIONS.map((status) => (
              <button
                key={status}
                onClick={() => handleStatusFilter(status)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                  statusFilter === status
                    ? 'bg-[#0071DC] text-white border-[#0071DC]'
                    : 'bg-white text-[#6B7280] border-[#E5E7EB] hover:bg-[#F9FAFB]'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-t border-b border-[#E5E7EB] bg-[#F9FAFB]">
                {Object.entries(SORTABLE_COLUMNS).map(([key, label]) => (
                  <th
                    key={key}
                    onClick={() => handleSort(key)}
                    className={`px-4 py-3 text-xs font-semibold text-[#6B7280] uppercase tracking-wider cursor-pointer hover:text-[#333] select-none ${
                      key === 'total_amount' ? 'text-right' : 'text-left'
                    }`}
                  >
                    {label}
                    <SortIcon column={key} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 border-3 border-[#0071DC] border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm text-[#6B7280]">Loading expenses...</span>
                    </div>
                  </td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <HiOutlineReceiptPercent className="w-12 h-12 text-[#D1D5DB]" />
                      <p className="text-[#6B7280] font-medium">No expenses found</p>
                      <p className="text-xs text-[#9CA3AF]">
                        {debouncedSearch || statusFilter !== 'All'
                          ? 'Try adjusting your filters'
                          : 'Get started by recording your first expense'}
                      </p>
                      {!debouncedSearch && statusFilter === 'All' && (
                        <Link
                          to="/expenses/new"
                          className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-[#0071DC] text-white text-sm font-medium rounded-lg hover:bg-[#005BB5] transition-colors"
                        >
                          <HiOutlinePlus className="w-4 h-4" />
                          Add Expense
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                expenses.map((expense) => (
                  <tr
                    key={expense.id}
                    onClick={() => handleRowClick(expense.id)}
                    className="hover:bg-[#F9FAFB] cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-[#0071DC]">
                      {expense.expense_number || '--'}
                    </td>
                    <td className="px-4 py-3 text-[#6B7280]">
                      {formatDate(expense.expense_date)}
                    </td>
                    <td className="px-4 py-3 text-[#333]">
                      {expense.category || '--'}
                    </td>
                    <td className="px-4 py-3 text-[#333]">
                      {expense.vendor_name || expense.vendor?.display_name || '--'}
                    </td>
                    <td className="px-4 py-3 text-[#6B7280] truncate max-w-[200px]">
                      {expense.description || '--'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={expense.status} />
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-[#333]">
                      {formatIndianCurrency(expense.total_amount)}
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
              Showing <span className="font-medium text-[#333]">{startRecord}</span> to{' '}
              <span className="font-medium text-[#333]">{endRecord}</span> of{' '}
              <span className="font-medium text-[#333]">{total}</span> expenses
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border border-[#E5E7EB] rounded-lg hover:bg-[#F9FAFB] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <HiOutlineChevronLeft className="w-4 h-4" />
                Previous
              </button>
              <span className="text-sm text-[#6B7280]">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border border-[#E5E7EB] rounded-lg hover:bg-[#F9FAFB] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next
                <HiOutlineChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
