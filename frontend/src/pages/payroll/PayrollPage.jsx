import React, { useState, useEffect, useCallback } from 'react';
import {
  HiOutlineCurrencyRupee,
  HiOutlineUsers,
  HiOutlineDocumentText,
  HiOutlineCheckCircle,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineFunnel,
  HiOutlineArrowPath,
  HiOutlineExclamationTriangle,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import apiClient from '../../api/client';

/* ─── Helpers ──────────────────────────────────────────────────────────── */

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

/* ─── Reusable Sub-components ──────────────────────────────────────────── */

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

function SalaryStatusBadge({ status }) {
  const styles = {
    Draft: 'bg-gray-100 text-gray-700 border-gray-200',
    Approved: 'bg-blue-50 text-blue-700 border-blue-200',
    Paid: 'bg-green-50 text-green-700 border-green-200',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${styles[status] || styles.Draft}`}>
      {status || 'Draft'}
    </span>
  );
}

const MONTH_NAMES = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

const currentDate = new Date();
const currentMonth = currentDate.getMonth() + 1;
const currentYear = currentDate.getFullYear();

/* ─── Main Component ───────────────────────────────────────────────────── */

export default function PayrollPage() {
  const [activeTab, setActiveTab] = useState('generate');

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#333]">Payroll</h1>
        <p className="text-sm text-[#6B7280] mt-1">
          Generate salaries, manage records, and view summaries
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm">
        <div className="border-b border-[#E5E7EB]">
          <nav className="flex -mb-px">
            {[
              { key: 'generate', label: 'Generate Salary' },
              { key: 'records', label: 'Salary Records' },
              { key: 'summary', label: 'Summary' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-[#0071DC] text-[#0071DC]'
                    : 'border-transparent text-[#6B7280] hover:text-[#333] hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="p-6">
          {activeTab === 'generate' && <GenerateSalaryTab />}
          {activeTab === 'records' && <SalaryRecordsTab />}
          {activeTab === 'summary' && <SalarySummaryTab />}
        </div>
      </div>
    </div>
  );
}

/* ─── Tab 1: Generate Salary ───────────────────────────────────────────── */

function GenerateSalaryTab() {
  const [month, setMonth] = useState(currentMonth);
  const [year, setYear] = useState(currentYear);
  const [departmentId, setDepartmentId] = useState('');
  const [employees, setEmployees] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState(null);

  const years = [];
  for (let y = currentYear - 2; y <= currentYear + 1; y++) {
    years.push(y);
  }

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 200, sort_by: 'name', sort_order: 'asc' };
      if (departmentId) params.department_id = departmentId;
      const response = await apiClient.get('/employees', { params });
      const allEmployees = (response.data?.data || []).filter(
        (e) => e.is_active !== false && e.is_active !== 0
      );
      setEmployees(allEmployees);
      setSelectedIds(allEmployees.map((e) => e.id));
    } catch {
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, [departmentId]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const toggleEmployee = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedIds.length === employees.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(employees.map((e) => e.id));
    }
  };

  const handleGenerate = async () => {
    if (selectedIds.length === 0) {
      toast.error('Please select at least one employee');
      return;
    }

    setGenerating(true);
    setGenerationResult(null);
    try {
      const response = await apiClient.post('/salary-records/generate', {
        month,
        year,
        employee_ids: selectedIds,
        department_id: departmentId || undefined,
      });
      const result = response.data;
      setGenerationResult(result);
      toast.success(`Salary generated for ${selectedIds.length} employee(s) - ${MONTH_NAMES[month]} ${year}`);
    } catch (err) {
      if (err.response?.data?.error) {
        toast.error(err.response.data.error);
      } else if (err.response?.data?.message) {
        toast.error(err.response.data.message);
      } else {
        toast.error('Failed to generate salary');
      }
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div>
      {/* Month/Year/Department Selector */}
      <div className="flex items-end gap-4 mb-6 flex-wrap">
        <div>
          <label className="block text-sm font-medium text-[#333] mb-1">Month</label>
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] bg-white focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
          >
            {MONTHS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-[#333] mb-1">Year</label>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] bg-white focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-[#333] mb-1">Department (optional)</label>
          <input
            type="text"
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            placeholder="All departments"
            className="px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] bg-white focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC] w-48"
          />
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating || selectedIds.length === 0}
          className="inline-flex items-center gap-2 px-5 py-2 bg-[#0071DC] text-white text-sm font-medium rounded-lg hover:bg-[#005BB5] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {generating && (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          )}
          {generating ? 'Generating...' : `Generate Salary (${selectedIds.length})`}
        </button>
      </div>

      {/* Generation Result */}
      {generationResult && (
        <div className="mb-6 p-4 rounded-lg bg-green-50 border border-green-200">
          <div className="flex items-center gap-2 mb-1">
            <HiOutlineCheckCircle className="w-5 h-5 text-green-600" />
            <p className="text-sm font-medium text-green-800">Salary Generation Complete</p>
          </div>
          <p className="text-xs text-green-700 ml-7">
            Generated: {generationResult.generated || generationResult.generated_count || 0} records
            {generationResult.errors && generationResult.errors.length > 0 && (
              <span className="text-red-600 ml-2">
                | Errors: {generationResult.errors.length}
              </span>
            )}
          </p>
        </div>
      )}

      {/* Employee Selection Table */}
      <div className="overflow-x-auto border border-[#E5E7EB] rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
              <th className="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={employees.length > 0 && selectedIds.length === employees.length}
                  onChange={toggleAll}
                  className="w-4 h-4 rounded border-[#E5E7EB] text-[#0071DC] focus:ring-[#0071DC]/20"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Employee</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Department</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Basic</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-[#6B7280] uppercase tracking-wider">HRA</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Allowances</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Gross</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Est. Deductions</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Est. Net Pay</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB]">
            {loading ? (
              <tr>
                <td colSpan={9} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-3 border-[#0071DC] border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm text-[#6B7280]">Loading employees...</span>
                  </div>
                </td>
              </tr>
            ) : employees.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-16 text-center">
                  <HiOutlineUsers className="w-12 h-12 text-[#D1D5DB] mx-auto mb-3" />
                  <p className="text-sm text-[#6B7280]">No active employees found</p>
                </td>
              </tr>
            ) : (
              employees.map((emp) => {
                const basic = parseFloat(emp.basic_salary) || 0;
                const hra = parseFloat(emp.hra) || 0;
                const allowance = (parseFloat(emp.special_allowance) || 0) + (parseFloat(emp.other_allowance) || 0);
                const gross = basic + hra + allowance;
                let deductions = 0;
                if (emp.is_pf_applicable) deductions += basic * 0.12;
                if (emp.is_esi_applicable && gross <= 21000) deductions += gross * 0.0075;
                if (emp.tds_percent) deductions += gross * (parseFloat(emp.tds_percent) / 100);
                const netPay = gross - deductions;
                const empName = emp.display_name || emp.name || [emp.first_name, emp.last_name].filter(Boolean).join(' ');

                return (
                  <tr key={emp.id} className="hover:bg-[#F9FAFB] transition-colors">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(emp.id)}
                        onChange={() => toggleEmployee(emp.id)}
                        className="w-4 h-4 rounded border-[#E5E7EB] text-[#0071DC] focus:ring-[#0071DC]/20"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <span className="font-medium text-[#333]">{empName}</span>
                        <p className="text-xs text-[#6B7280] font-mono mt-0.5">{emp.employee_id || emp.employee_code}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[#6B7280]">{emp.department_name || emp.department || '--'}</td>
                    <td className="px-4 py-3 text-right text-[#333]">{formatIndianCurrency(basic)}</td>
                    <td className="px-4 py-3 text-right text-[#333]">{formatIndianCurrency(hra)}</td>
                    <td className="px-4 py-3 text-right text-[#333]">{formatIndianCurrency(allowance)}</td>
                    <td className="px-4 py-3 text-right text-[#333] font-medium">{formatIndianCurrency(gross)}</td>
                    <td className="px-4 py-3 text-right text-red-600">{formatIndianCurrency(deductions)}</td>
                    <td className="px-4 py-3 text-right text-[#333] font-semibold">{formatIndianCurrency(netPay)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
          {employees.length > 0 && (
            <tfoot>
              <tr className="bg-[#F9FAFB] border-t-2 border-[#E5E7EB]">
                <td colSpan={3} className="px-4 py-3 text-sm font-semibold text-[#333]">
                  Total ({selectedIds.length} selected)
                </td>
                <td className="px-4 py-3 text-right text-sm font-semibold text-[#333]">
                  {formatIndianCurrency(employees.filter((e) => selectedIds.includes(e.id)).reduce((sum, e) => sum + (parseFloat(e.basic_salary) || 0), 0))}
                </td>
                <td className="px-4 py-3 text-right text-sm font-semibold text-[#333]">
                  {formatIndianCurrency(employees.filter((e) => selectedIds.includes(e.id)).reduce((sum, e) => sum + (parseFloat(e.hra) || 0), 0))}
                </td>
                <td className="px-4 py-3 text-right text-sm font-semibold text-[#333]">
                  {formatIndianCurrency(employees.filter((e) => selectedIds.includes(e.id)).reduce((sum, e) => sum + (parseFloat(e.special_allowance) || 0) + (parseFloat(e.other_allowance) || 0), 0))}
                </td>
                <td className="px-4 py-3 text-right text-sm font-semibold text-[#333]">
                  {formatIndianCurrency(
                    employees.filter((e) => selectedIds.includes(e.id)).reduce((sum, e) => {
                      const b = parseFloat(e.basic_salary) || 0;
                      const h = parseFloat(e.hra) || 0;
                      const a = (parseFloat(e.special_allowance) || 0) + (parseFloat(e.other_allowance) || 0);
                      return sum + b + h + a;
                    }, 0)
                  )}
                </td>
                <td className="px-4 py-3 text-right text-sm font-semibold text-red-600">
                  {formatIndianCurrency(
                    employees.filter((e) => selectedIds.includes(e.id)).reduce((sum, e) => {
                      const b = parseFloat(e.basic_salary) || 0;
                      const h = parseFloat(e.hra) || 0;
                      const a = (parseFloat(e.special_allowance) || 0) + (parseFloat(e.other_allowance) || 0);
                      const g = b + h + a;
                      let d = 0;
                      if (e.is_pf_applicable) d += b * 0.12;
                      if (e.is_esi_applicable && g <= 21000) d += g * 0.0075;
                      if (e.tds_percent) d += g * (parseFloat(e.tds_percent) / 100);
                      return sum + d;
                    }, 0)
                  )}
                </td>
                <td className="px-4 py-3 text-right text-sm font-semibold text-[#333]">
                  {formatIndianCurrency(
                    employees.filter((e) => selectedIds.includes(e.id)).reduce((sum, e) => {
                      const b = parseFloat(e.basic_salary) || 0;
                      const h = parseFloat(e.hra) || 0;
                      const a = (parseFloat(e.special_allowance) || 0) + (parseFloat(e.other_allowance) || 0);
                      const g = b + h + a;
                      let d = 0;
                      if (e.is_pf_applicable) d += b * 0.12;
                      if (e.is_esi_applicable && g <= 21000) d += g * 0.0075;
                      if (e.tds_percent) d += g * (parseFloat(e.tds_percent) / 100);
                      return sum + (g - d);
                    }, 0)
                  )}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

/* ─── Tab 2: Salary Records ────────────────────────────────────────────── */

function SalaryRecordsTab() {
  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');

  const years = [];
  for (let y = currentYear - 2; y <= currentYear + 1; y++) {
    years.push(y);
  }

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit,
        sort_by: 'created_at',
        sort_order: 'desc',
      };
      if (filterMonth) params.month = Number(filterMonth);
      if (filterYear) params.year = Number(filterYear);
      if (filterStatus) params.status = filterStatus;
      if (search) params.search = search;

      const response = await apiClient.get('/salary-records', { params });
      setRecords(response.data?.data || []);
      setTotal(response.data?.total || 0);
    } catch {
      setRecords([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, limit, filterMonth, filterYear, filterStatus, search]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const totalPages = Math.ceil(total / limit);
  const startRecord = total === 0 ? 0 : (page - 1) * limit + 1;
  const endRecord = Math.min(page * limit, total);

  return (
    <div>
      {/* Filters */}
      <div className="flex items-end gap-4 mb-6 flex-wrap">
        <div>
          <label className="block text-sm font-medium text-[#333] mb-1">Month</label>
          <select
            value={filterMonth}
            onChange={(e) => { setFilterMonth(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] bg-white focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
          >
            <option value="">All Months</option>
            {MONTHS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-[#333] mb-1">Year</label>
          <select
            value={filterYear}
            onChange={(e) => { setFilterYear(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] bg-white focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
          >
            <option value="">All Years</option>
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-[#333] mb-1">Status</label>
          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] bg-white focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
          >
            <option value="">All Status</option>
            <option value="Draft">Draft</option>
            <option value="Approved">Approved</option>
            <option value="Paid">Paid</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-[#333] mb-1">Search</label>
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search employee..."
            className="px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] bg-white focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC] w-48"
          />
        </div>
        {(filterMonth || filterYear || filterStatus || search) && (
          <button
            onClick={() => { setFilterMonth(''); setFilterYear(''); setFilterStatus(''); setSearch(''); setPage(1); }}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-[#6B7280] hover:text-[#333] transition-colors"
          >
            <HiOutlineFunnel className="w-4 h-4" />
            Clear Filters
          </button>
        )}
      </div>

      {/* Records Table */}
      <div className="overflow-x-auto border border-[#E5E7EB] rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
              <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Employee</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Department</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Period</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Gross Earnings</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Total Deductions</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Net Salary</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB]">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-3 border-[#0071DC] border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm text-[#6B7280]">Loading salary records...</span>
                  </div>
                </td>
              </tr>
            ) : records.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-16 text-center">
                  <HiOutlineDocumentText className="w-12 h-12 text-[#D1D5DB] mx-auto mb-3" />
                  <p className="text-[#6B7280] font-medium">No salary records found</p>
                  <p className="text-xs text-[#9CA3AF] mt-1">Generate salaries from the Generate Salary tab</p>
                </td>
              </tr>
            ) : (
              records.map((rec) => (
                <tr key={rec.id} className="hover:bg-[#F9FAFB] transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <span className="font-medium text-[#333]">{rec.employee_name || '--'}</span>
                      {rec.employee_code && (
                        <p className="text-xs text-[#6B7280] font-mono mt-0.5">{rec.employee_code}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[#6B7280]">{rec.department || rec.department_name || '--'}</td>
                  <td className="px-4 py-3 text-[#333]">
                    {MONTH_NAMES[rec.month] || rec.month} {rec.year}
                  </td>
                  <td className="px-4 py-3 text-right text-[#333]">{formatIndianCurrency(rec.gross_earnings || rec.gross_salary)}</td>
                  <td className="px-4 py-3 text-right text-red-600">{formatIndianCurrency(rec.total_deductions)}</td>
                  <td className="px-4 py-3 text-right text-[#333] font-semibold">{formatIndianCurrency(rec.net_salary || rec.net_pay)}</td>
                  <td className="px-4 py-3"><SalaryStatusBadge status={rec.status} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!loading && total > 0 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-[#6B7280]">
            Showing <span className="font-medium text-[#333]">{startRecord}</span> to{' '}
            <span className="font-medium text-[#333]">{endRecord}</span> of{' '}
            <span className="font-medium text-[#333]">{total}</span> records
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
  );
}

/* ─── Tab 3: Summary ───────────────────────────────────────────────────── */

function SalarySummaryTab() {
  const [summaryMonth, setSummaryMonth] = useState(currentMonth);
  const [summaryYear, setSummaryYear] = useState(currentYear);
  const [summaryData, setSummaryData] = useState(null);
  const [departmentBreakdown, setDepartmentBreakdown] = useState([]);
  const [loading, setLoading] = useState(true);

  const years = [];
  for (let y = currentYear - 2; y <= currentYear + 1; y++) {
    years.push(y);
  }

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/salary-records', {
        params: {
          month: summaryMonth,
          year: summaryYear,
          limit: 1000,
        },
      });
      const records = response.data?.data || [];

      // Compute summary
      let totalPayroll = 0;
      let totalPF = 0;
      let totalESI = 0;
      let totalTDS = 0;
      let totalNet = 0;
      const deptMap = {};

      records.forEach((rec) => {
        const gross = parseFloat(rec.gross_earnings || rec.gross_salary) || 0;
        const deductions = parseFloat(rec.total_deductions) || 0;
        const net = parseFloat(rec.net_salary || rec.net_pay) || 0;
        const pf = parseFloat(rec.pf_employee || rec.pf_amount || rec.pf_deduction) || 0;
        const esi = parseFloat(rec.esi_employee || rec.esi_amount || rec.esi_deduction) || 0;
        const tds = parseFloat(rec.income_tax || rec.tds_amount || rec.tds_deduction) || 0;

        totalPayroll += gross;
        totalPF += pf;
        totalESI += esi;
        totalTDS += tds;
        totalNet += net;

        const dept = rec.department || rec.department_name || 'Unassigned';
        if (!deptMap[dept]) {
          deptMap[dept] = { department: dept, count: 0, gross: 0, deductions: 0, net: 0 };
        }
        deptMap[dept].count += 1;
        deptMap[dept].gross += gross;
        deptMap[dept].deductions += deductions;
        deptMap[dept].net += net;
      });

      setSummaryData({
        totalPayroll,
        totalPF,
        totalESI,
        totalTDS,
        totalNet,
        recordCount: records.length,
      });
      setDepartmentBreakdown(Object.values(deptMap).sort((a, b) => b.gross - a.gross));
    } catch {
      // Fallback endpoint
      try {
        const response = await apiClient.get('/salary-records', {
          params: { month: summaryMonth, year: summaryYear, limit: 1000 },
        });
        const records = response.data?.data || [];
        let totalPayroll = 0;
        let totalNet = 0;
        const deptMap = {};
        records.forEach((rec) => {
          const gross = parseFloat(rec.gross_earnings || rec.gross_salary) || 0;
          const deductions = parseFloat(rec.total_deductions) || 0;
          const net = parseFloat(rec.net_salary || rec.net_pay) || 0;
          totalPayroll += gross;
          totalNet += net;
          const dept = rec.department || rec.department_name || 'Unassigned';
          if (!deptMap[dept]) {
            deptMap[dept] = { department: dept, count: 0, gross: 0, deductions: 0, net: 0 };
          }
          deptMap[dept].count += 1;
          deptMap[dept].gross += gross;
          deptMap[dept].deductions += deductions;
          deptMap[dept].net += net;
        });
        setSummaryData({ totalPayroll, totalPF: 0, totalESI: 0, totalTDS: 0, totalNet, recordCount: records.length });
        setDepartmentBreakdown(Object.values(deptMap).sort((a, b) => b.gross - a.gross));
      } catch {
        setSummaryData(null);
        setDepartmentBreakdown([]);
      }
    } finally {
      setLoading(false);
    }
  }, [summaryMonth, summaryYear]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return (
    <div>
      {/* Period Selector */}
      <div className="flex items-end gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-[#333] mb-1">Month</label>
          <select
            value={summaryMonth}
            onChange={(e) => setSummaryMonth(Number(e.target.value))}
            className="px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] bg-white focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
          >
            {MONTHS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-[#333] mb-1">Year</label>
          <select
            value={summaryYear}
            onChange={(e) => setSummaryYear(Number(e.target.value))}
            className="px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] bg-white focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-[#0071DC] border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-[#6B7280]">Loading summary...</span>
          </div>
        </div>
      ) : !summaryData || summaryData.recordCount === 0 ? (
        <div className="text-center py-16">
          <HiOutlineDocumentText className="w-12 h-12 text-[#D1D5DB] mx-auto mb-3" />
          <p className="text-[#6B7280] font-medium">No salary data for {MONTH_NAMES[summaryMonth]} {summaryYear}</p>
          <p className="text-xs text-[#9CA3AF] mt-1">Generate salaries to see the summary here</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <SummaryCard title="Total Payroll Cost" value={formatIndianCurrency(summaryData.totalPayroll)} icon={HiOutlineCurrencyRupee} color="bg-blue-500" />
            <SummaryCard title="Total PF" value={formatIndianCurrency(summaryData.totalPF)} icon={HiOutlineCurrencyRupee} color="bg-orange-500" />
            <SummaryCard title="Total ESI" value={formatIndianCurrency(summaryData.totalESI)} icon={HiOutlineCurrencyRupee} color="bg-yellow-500" />
            <SummaryCard title="Total TDS" value={formatIndianCurrency(summaryData.totalTDS)} icon={HiOutlineCurrencyRupee} color="bg-red-500" />
            <SummaryCard title="Total Net Pay" value={formatIndianCurrency(summaryData.totalNet)} icon={HiOutlineCheckCircle} color="bg-green-500" />
          </div>

          {/* Department Breakdown */}
          {departmentBreakdown.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-[#333] mb-3">Department-wise Breakdown</h3>
              <div className="overflow-x-auto border border-[#E5E7EB] rounded-lg">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Department</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Employees</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Gross Salary</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Total Deductions</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Net Pay</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB]">
                    {departmentBreakdown.map((dept) => (
                      <tr key={dept.department} className="hover:bg-[#F9FAFB] transition-colors">
                        <td className="px-4 py-3 text-[#333] font-medium">{dept.department}</td>
                        <td className="px-4 py-3 text-center text-[#333]">{dept.count}</td>
                        <td className="px-4 py-3 text-right text-[#333]">{formatIndianCurrency(dept.gross)}</td>
                        <td className="px-4 py-3 text-right text-red-600">{formatIndianCurrency(dept.deductions)}</td>
                        <td className="px-4 py-3 text-right text-[#333] font-semibold">{formatIndianCurrency(dept.net)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-[#F9FAFB] border-t-2 border-[#E5E7EB]">
                      <td className="px-4 py-3 text-sm font-semibold text-[#333]">Total</td>
                      <td className="px-4 py-3 text-center text-sm font-semibold text-[#333]">{summaryData.recordCount}</td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-[#333]">{formatIndianCurrency(summaryData.totalPayroll)}</td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-red-600">
                        {formatIndianCurrency(departmentBreakdown.reduce((s, d) => s + d.deductions, 0))}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-[#333]">{formatIndianCurrency(summaryData.totalNet)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
