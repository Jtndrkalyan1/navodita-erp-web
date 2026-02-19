import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  HiOutlinePlus,
  HiOutlineMagnifyingGlass,
  HiOutlineChevronUp,
  HiOutlineChevronDown,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineUsers,
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineCurrencyRupee,
} from 'react-icons/hi2';
import { employeeApi } from '../../api/employee.api';

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

const SORTABLE_COLUMNS = {
  employee_id: 'Code',
  display_name: 'Name',
  department_id: 'Department',
  designation: 'Designation',
  date_of_joining: 'Joining Date',
  mobile_number: 'Mobile',
};

export default function EmployeeListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [employees, setEmployees] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [page, setPage] = useState(parseInt(searchParams.get('page')) || 1);
  const [limit] = useState(50);
  const [sortBy, setSortBy] = useState(searchParams.get('sort_by') || 'created_at');
  const [sortOrder, setSortOrder] = useState(searchParams.get('sort_order') || 'desc');

  const [stats, setStats] = useState({
    totalEmployees: 0,
    activeEmployees: 0,
    onProbation: 0,
    averageSalary: 0,
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const params = {};
    if (page > 1) params.page = page;
    if (debouncedSearch) params.search = debouncedSearch;
    if (sortBy !== 'created_at') params.sort_by = sortBy;
    if (sortOrder !== 'desc') params.sort_order = sortOrder;
    setSearchParams(params, { replace: true });
  }, [page, debouncedSearch, sortBy, sortOrder, setSearchParams]);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const response = await employeeApi.list({
        page,
        limit,
        search: debouncedSearch || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
      });

      const { data, total: totalCount } = response.data;
      setEmployees(data || []);
      setTotal(totalCount || 0);

      const allData = data || [];
      const activeCount = allData.filter((e) => e.is_active !== false && e.employment_status !== 'Relieved' && e.employment_status !== 'Terminated').length;
      const probationCount = allData.filter((e) => e.employment_status === 'Probation').length;
      const salaries = allData.map((e) => parseFloat(e.gross_salary) || parseFloat(e.basic_salary) || 0).filter((s) => s > 0);
      const avgSalary = salaries.length > 0 ? salaries.reduce((a, b) => a + b, 0) / salaries.length : 0;

      setStats({
        totalEmployees: totalCount || 0,
        activeEmployees: activeCount,
        onProbation: probationCount,
        averageSalary: avgSalary,
      });
    } catch (err) {
      setEmployees([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch, sortBy, sortOrder]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

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
    navigate(`/employees/${id}`);
  };

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#333]">Employees</h1>
          <p className="text-sm text-[#6B7280] mt-1">
            Manage your employee database
          </p>
        </div>
        <Link
          to="/employees/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#0071DC] text-white text-sm font-medium rounded-lg hover:bg-[#005BB5] transition-colors"
        >
          <HiOutlinePlus className="w-4 h-4" />
          New Employee
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <SummaryCard
          title="Total Employees"
          value={stats.totalEmployees.toLocaleString('en-IN')}
          icon={HiOutlineUsers}
          color="bg-blue-500"
        />
        <SummaryCard
          title="Active"
          value={stats.activeEmployees.toLocaleString('en-IN')}
          icon={HiOutlineCheckCircle}
          color="bg-green-500"
        />
        <SummaryCard
          title="On Probation"
          value={stats.onProbation.toLocaleString('en-IN')}
          icon={HiOutlineClock}
          color="bg-yellow-500"
        />
        <SummaryCard
          title="Avg. Salary"
          value={formatIndianCurrency(stats.averageSalary)}
          icon={HiOutlineCurrencyRupee}
          color="bg-purple-500"
        />
      </div>

      {/* Search & Table */}
      <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm mb-4">
        <div className="p-4">
          <div className="relative max-w-md">
            <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
            <input
              type="text"
              placeholder="Search by name, code, department, or mobile..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
            />
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
                    className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider cursor-pointer hover:text-[#333] select-none"
                  >
                    {label}
                    <SortIcon column={key} />
                  </th>
                ))}
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 border-3 border-[#0071DC] border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm text-[#6B7280]">Loading employees...</span>
                    </div>
                  </td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <HiOutlineUsers className="w-12 h-12 text-[#D1D5DB]" />
                      <p className="text-[#6B7280] font-medium">No employees found</p>
                      <p className="text-xs text-[#9CA3AF]">
                        {debouncedSearch
                          ? 'Try a different search term'
                          : 'Get started by adding your first employee'}
                      </p>
                      {!debouncedSearch && (
                        <Link
                          to="/employees/new"
                          className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-[#0071DC] text-white text-sm font-medium rounded-lg hover:bg-[#005BB5] transition-colors"
                        >
                          <HiOutlinePlus className="w-4 h-4" />
                          Add Employee
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                employees.map((emp) => (
                  <tr
                    key={emp.id}
                    onClick={() => handleRowClick(emp.id)}
                    className="hover:bg-[#F9FAFB] cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 text-[#6B7280] font-mono text-xs">
                      {emp.employee_id || emp.employee_code || '--'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-[#333]">{emp.display_name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || '--'}</span>
                    </td>
                    <td className="px-4 py-3 text-[#6B7280]">{emp.department_name || emp.department || '--'}</td>
                    <td className="px-4 py-3 text-[#6B7280]">{emp.designation || '--'}</td>
                    <td className="px-4 py-3 text-[#6B7280]">{formatDate(emp.date_of_joining || emp.joining_date)}</td>
                    <td className="px-4 py-3 text-[#6B7280]">{emp.mobile_number || emp.phone || '--'}</td>
                    <td className="px-4 py-3">
                      {emp.is_active === false || emp.employment_status === 'Relieved' || emp.employment_status === 'Terminated' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                          Inactive
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                          Active
                        </span>
                      )}
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
              <span className="font-medium text-[#333]">{total}</span> employees
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
