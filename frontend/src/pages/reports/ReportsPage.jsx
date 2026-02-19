import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  HiOutlineDocumentChartBar,
  HiOutlineBanknotes,
  HiOutlineShoppingCart,
  HiOutlineCalculator,
  HiOutlineDocumentText,
  HiOutlineUserGroup,
  HiOutlineBuildingLibrary,
  HiOutlineCube,
  HiOutlineChevronRight,
  HiOutlineMagnifyingGlass,
  HiOutlineClipboardDocumentList,
  HiOutlineCurrencyRupee,
  HiOutlineChartBarSquare,
  HiOutlineArchiveBox,
  HiOutlineXMark,
  HiOutlineCalendarDays,
  HiOutlineArrowPath,
  HiOutlineExclamationTriangle,
  HiOutlineArrowDownTray,
  HiOutlinePrinter,
  HiOutlineDocumentArrowDown,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import apiClient from '../../api/client';

// ── Indian Currency Formatter ────────────────────────────────────
function formatIndianCurrency(value) {
  if (value === null || value === undefined || isNaN(value)) return '\u20B90.00';
  const num = parseFloat(value);
  const isNeg = num < 0;
  const abs = Math.abs(num);
  const parts = abs.toFixed(2).split('.');
  let intPart = parts[0];
  const decPart = parts[1];
  if (intPart.length > 3) {
    const last3 = intPart.slice(-3);
    let rest = intPart.slice(0, -3);
    const groups = [];
    while (rest.length > 2) {
      groups.unshift(rest.slice(-2));
      rest = rest.slice(0, -2);
    }
    if (rest.length > 0) groups.unshift(rest);
    intPart = groups.join(',') + ',' + last3;
  }
  return (isNeg ? '-\u20B9' : '\u20B9') + intPart + '.' + decPart;
}

// ── Date Helpers ─────────────────────────────────────────────────
function getDatePreset(preset) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const fmt = (d) => d.toISOString().split('T')[0];

  switch (preset) {
    case 'this-month':
      return { start: fmt(new Date(year, month, 1)), end: fmt(today) };
    case 'last-month':
      return { start: fmt(new Date(year, month - 1, 1)), end: fmt(new Date(year, month, 0)) };
    case 'this-quarter': {
      const qStart = Math.floor(month / 3) * 3;
      return { start: fmt(new Date(year, qStart, 1)), end: fmt(today) };
    }
    case 'this-year': {
      const fyStart = month >= 3 ? new Date(year, 3, 1) : new Date(year - 1, 3, 1);
      const fyEnd = month >= 3 ? new Date(year + 1, 2, 31) : new Date(year, 2, 31);
      return { start: fmt(fyStart), end: fmt(fyEnd) };
    }
    case 'last-year': {
      const fyStartYear = month >= 3 ? year : year - 1;
      return { start: fmt(new Date(fyStartYear - 1, 3, 1)), end: fmt(new Date(fyStartYear, 2, 31)) };
    }
    case 'next-year': {
      const fyStartYear = month >= 3 ? year : year - 1;
      return { start: fmt(new Date(fyStartYear + 1, 3, 1)), end: fmt(new Date(fyStartYear + 2, 2, 31)) };
    }
    default:
      return null;
  }
}

function formatDisplayDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Report-to-Endpoint Mapping ───────────────────────────────────
const REPORT_ENDPOINT_MAP = {
  // Financial Reports
  'Profit & Loss': { endpoint: '/reports/profit-and-loss', useDates: true, type: 'profit-loss' },
  'Balance Sheet': { endpoint: '/reports/balance-sheet', useDates: false, type: 'balance-sheet' },
  'Trial Balance': { endpoint: '/reports/trial-balance', useDates: false, type: 'trial-balance' },
  'Cash Flow Statement': { endpoint: '/reports/cash-flow', useDates: true, type: 'cash-flow' },
  // Sales Reports
  'Sales Summary': { endpoint: '/reports/sales-summary', useDates: true, type: 'sales-summary' },
  'Invoice Register': { endpoint: '/reports/invoice-register', useDates: true, type: 'table-list' },
  'Customer Ledger': { endpoint: '/reports/customer-ledger', useDates: true, type: 'table-list' },
  'Sales by Item': { endpoint: '/reports/sales-by-item', useDates: true, type: 'table-list' },
  'Sales by Customer': { endpoint: '/reports/sales-by-customer', useDates: true, type: 'table-list' },
  'Receivables Aging': { endpoint: '/reports/receivables-aging', useDates: false, type: 'aging' },
  // Purchase Reports
  'Purchase Summary': { endpoint: '/reports/purchase-summary', useDates: true, type: 'purchase-summary' },
  'Bill Register': { endpoint: '/reports/bill-register', useDates: true, type: 'table-list' },
  'Vendor Ledger': { endpoint: '/reports/vendor-ledger', useDates: true, type: 'table-list' },
  'Purchase by Vendor': { endpoint: '/reports/purchases-by-vendor', useDates: true, type: 'table-list' },
  'Purchase by Item': { endpoint: '/reports/purchases-by-item', useDates: true, type: 'table-list' },
  'Payables Aging': { endpoint: '/reports/payables-aging', useDates: false, type: 'aging' },
  // Tax Reports
  'GST Summary (GSTR-1)': { endpoint: '/reports/gst-summary', useDates: true, type: 'gst-summary' },
  'GST Summary (GSTR-3B)': { endpoint: '/reports/gst-summary', useDates: true, type: 'gst-summary' },
  'TDS Summary': { endpoint: '/reports/tds-summary', useDates: true, type: 'tds-summary' },
  'Tax Payment Register': { endpoint: '/reports/tds-summary', useDates: true, type: 'tds-summary' },
  // Payroll Reports
  'Payroll Summary': { endpoint: '/reports/payroll-summary', useDates: true, type: 'table-list' },
  'PF Register': { endpoint: '/reports/pf-register', useDates: true, type: 'table-list' },
  'ESI Register': { endpoint: '/reports/esi-register', useDates: true, type: 'table-list' },
  'Department-wise Salary': { endpoint: '/reports/department-salary', useDates: true, type: 'table-list' },
  // Banking Reports
  'Bank Book': { endpoint: '/reports/bank-book', useDates: true, type: 'table-list' },
  'Bank Reconciliation': { endpoint: '/reports/bank-reconciliation', useDates: false, type: 'table-list' },
  'Transaction Register': { endpoint: '/reports/transaction-register', useDates: true, type: 'table-list' },
  // Inventory Reports
  'Stock Summary': { endpoint: '/reports/stock-summary', useDates: false, type: 'table-list' },
  'Stock Valuation': { endpoint: '/reports/stock-valuation', useDates: false, type: 'table-list' },
  'Stock Movement': { endpoint: '/reports/stock-movement', useDates: true, type: 'table-list' },
  // Expense
  'Expense Report': { endpoint: '/reports/expense-report', useDates: true, type: 'table-list' },
};

// ── Report Categories Definition ─────────────────────────────────
const REPORT_CATEGORIES = [
  {
    id: 'sales', title: 'Sales Reports', description: 'Track your sales performance and customer activity',
    icon: HiOutlineBanknotes, color: 'bg-blue-500', lightColor: 'bg-blue-50', textColor: 'text-blue-700',
    reports: [
      { name: 'Sales Summary', description: 'Overview of total sales, revenue, and growth trends' },
      { name: 'Invoice Register', description: 'Complete register of all invoices with status and amounts' },
      { name: 'Customer Ledger', description: 'Account-wise ledger for each customer with balances' },
      { name: 'Sales by Item', description: 'Item-wise sales breakdown with quantities and revenue' },
      { name: 'Sales by Customer', description: 'Customer-wise sales analysis and top customers' },
    ],
  },
  {
    id: 'purchase', title: 'Purchase Reports', description: 'Monitor your purchases and vendor transactions',
    icon: HiOutlineShoppingCart, color: 'bg-orange-500', lightColor: 'bg-orange-50', textColor: 'text-orange-700',
    reports: [
      { name: 'Purchase Summary', description: 'Overview of total purchases and expense trends' },
      { name: 'Bill Register', description: 'Complete register of all bills with payment status' },
      { name: 'Vendor Ledger', description: 'Account-wise ledger for each vendor with balances' },
      { name: 'Purchase by Item', description: 'Item-wise purchase analysis with cost breakdown' },
    ],
  },
  {
    id: 'financial', title: 'Financial Reports', description: 'Key financial statements and accounting reports',
    icon: HiOutlineCalculator, color: 'bg-green-500', lightColor: 'bg-green-50', textColor: 'text-green-700',
    reports: [
      { name: 'Profit & Loss', description: 'Income and expenses summary for the period' },
      { name: 'Balance Sheet', description: 'Assets, liabilities, and equity snapshot' },
      { name: 'Trial Balance', description: 'All account balances at a point in time' },
      { name: 'Cash Flow Statement', description: 'Cash inflows and outflows by activity type' },
    ],
  },
  {
    id: 'tax', title: 'Tax Reports', description: 'GST and TDS compliance reports',
    icon: HiOutlineDocumentText, color: 'bg-purple-500', lightColor: 'bg-purple-50', textColor: 'text-purple-700',
    reports: [
      { name: 'GST Summary (GSTR-1)', description: 'Outward supply summary for GST filing' },
      { name: 'GST Summary (GSTR-3B)', description: 'Monthly return summary with tax liability' },
      { name: 'TDS Summary', description: 'Tax deducted at source summary by section' },
      { name: 'Tax Payment Register', description: 'Record of all tax payments and challans' },
    ],
  },
  {
    id: 'payroll', title: 'Payroll Reports', description: 'Employee salary and statutory reports',
    icon: HiOutlineUserGroup, color: 'bg-teal-500', lightColor: 'bg-teal-50', textColor: 'text-teal-700',
    reports: [
      { name: 'Payroll Summary', description: 'Monthly payroll overview with total disbursements' },
      { name: 'PF Register', description: 'Provident Fund contribution register for all employees' },
      { name: 'ESI Register', description: 'Employee State Insurance contribution details' },
      { name: 'Department-wise Salary', description: 'Salary breakdown by department and designation' },
    ],
  },
  {
    id: 'banking', title: 'Banking Reports', description: 'Bank account activity and reconciliation',
    icon: HiOutlineBuildingLibrary, color: 'bg-indigo-500', lightColor: 'bg-indigo-50', textColor: 'text-indigo-700',
    reports: [
      { name: 'Bank Book', description: 'Transaction-wise bank book for all accounts' },
      { name: 'Bank Reconciliation', description: 'Reconciliation status between book and bank balance' },
      { name: 'Transaction Register', description: 'Complete register of all banking transactions' },
    ],
  },
  {
    id: 'inventory', title: 'Inventory Reports', description: 'Stock levels, movements, and valuation',
    icon: HiOutlineCube, color: 'bg-amber-500', lightColor: 'bg-amber-50', textColor: 'text-amber-700',
    reports: [
      { name: 'Stock Summary', description: 'Current stock levels for all items with quantities' },
      { name: 'Stock Valuation', description: 'Inventory valuation based on costing method' },
      { name: 'Stock Movement', description: 'Inward and outward movement history per item' },
    ],
  },
];

// ── Report Data Renderers ────────────────────────────────────────

function ProfitLossReport({ data }) {
  if (!data) return null;
  const d = data.data || data;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-xs text-green-600 font-medium uppercase tracking-wide">Total Income</p>
          <p className="text-xl font-semibold text-green-700 mt-1">{formatIndianCurrency(d.income)}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-xs text-red-600 font-medium uppercase tracking-wide">Total Expenses</p>
          <p className="text-xl font-semibold text-red-700 mt-1">{formatIndianCurrency(d.expenses)}</p>
        </div>
        <div className={`${d.netProfit >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'} border rounded-lg p-4`}>
          <p className={`text-xs font-medium uppercase tracking-wide ${d.netProfit >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>Net {d.netProfit >= 0 ? 'Profit' : 'Loss'}</p>
          <p className={`text-xl font-semibold mt-1 ${d.netProfit >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>{formatIndianCurrency(Math.abs(d.netProfit))}</p>
        </div>
      </div>
      <div className="bg-white rounded-lg border border-[#E5E7EB] overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 border-b border-[#E5E7EB]"><th className="text-left px-4 py-3 font-semibold text-[#333]">Particulars</th><th className="text-right px-4 py-3 font-semibold text-[#333]">Amount</th></tr></thead>
          <tbody>
            <tr className="border-b border-[#E5E7EB]"><td className="px-4 py-3 text-[#333]">Revenue / Income</td><td className="px-4 py-3 text-right text-green-600 font-medium">{formatIndianCurrency(d.income)}</td></tr>
            <tr className="border-b border-[#E5E7EB]"><td className="px-4 py-3 text-[#333]">Expenses (Bills + Direct Expenses)</td><td className="px-4 py-3 text-right text-red-600 font-medium">{formatIndianCurrency(d.expenses)}</td></tr>
            <tr className="bg-gray-50 font-semibold"><td className="px-4 py-3 text-[#333]">Net {d.netProfit >= 0 ? 'Profit' : 'Loss'}</td><td className={`px-4 py-3 text-right ${d.netProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>{formatIndianCurrency(d.netProfit)}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BalanceSheetReport({ data }) {
  if (!data) return null;
  const d = data.data || data;
  const { assets = [], liabilities = [], equity = [] } = d;
  const totalAssets = assets.reduce((s, a) => s + (parseFloat(a.balance) || 0), 0);
  const totalLiabilities = liabilities.reduce((s, a) => s + (parseFloat(a.balance) || 0), 0);
  const totalEquity = equity.reduce((s, a) => s + (parseFloat(a.balance) || 0), 0);
  const renderSection = (title, accounts, total, colorClass) => (
    <div className="mb-6">
      <h4 className={`text-sm font-semibold ${colorClass} mb-2 uppercase tracking-wide`}>{title}</h4>
      <div className="bg-white rounded-lg border border-[#E5E7EB] overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 border-b border-[#E5E7EB]"><th className="text-left px-4 py-2.5 font-medium text-[#6B7280]">Code</th><th className="text-left px-4 py-2.5 font-medium text-[#6B7280]">Account Name</th><th className="text-right px-4 py-2.5 font-medium text-[#6B7280]">Balance</th></tr></thead>
          <tbody>
            {accounts.length === 0 ? (<tr><td colSpan={3} className="px-4 py-6 text-center text-[#9CA3AF]">No accounts found</td></tr>) : (
              accounts.map((a, i) => (<tr key={a.id || i} className="border-b border-[#E5E7EB] last:border-b-0"><td className="px-4 py-2.5 text-[#6B7280] font-mono text-xs">{a.account_code}</td><td className="px-4 py-2.5 text-[#333]">{a.account_name}</td><td className="px-4 py-2.5 text-right font-medium text-[#333]">{formatIndianCurrency(a.balance)}</td></tr>))
            )}
            <tr className="bg-gray-50 font-semibold"><td colSpan={2} className="px-4 py-2.5 text-[#333]">Total {title}</td><td className="px-4 py-2.5 text-right text-[#333]">{formatIndianCurrency(total)}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
  return (
    <div>
      {renderSection('Assets', assets, totalAssets, 'text-blue-700')}
      {renderSection('Liabilities', liabilities, totalLiabilities, 'text-red-700')}
      {renderSection('Equity', equity, totalEquity, 'text-green-700')}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
        <span className="font-semibold text-blue-700">Liabilities + Equity</span>
        <span className="font-semibold text-blue-700">{formatIndianCurrency(totalLiabilities + totalEquity)}</span>
      </div>
    </div>
  );
}

function TrialBalanceReport({ data }) {
  if (!data) return null;
  const d = data.data || data;
  const { accounts = [], totalDebit = 0, totalCredit = 0 } = d;
  return (
    <div className="bg-white rounded-lg border border-[#E5E7EB] overflow-hidden">
      <table className="w-full text-sm">
        <thead><tr className="bg-gray-50 border-b border-[#E5E7EB]"><th className="text-left px-4 py-3 font-medium text-[#6B7280]">Code</th><th className="text-left px-4 py-3 font-medium text-[#6B7280]">Account Name</th><th className="text-left px-4 py-3 font-medium text-[#6B7280]">Type</th><th className="text-right px-4 py-3 font-medium text-[#6B7280]">Debit</th><th className="text-right px-4 py-3 font-medium text-[#6B7280]">Credit</th></tr></thead>
        <tbody>
          {accounts.length === 0 ? (<tr><td colSpan={5} className="px-4 py-8 text-center text-[#9CA3AF]">No accounts found</td></tr>) : (
            accounts.map((a, i) => { const bal = parseFloat(a.balance) || 0; const isDebit = ['Asset', 'Expense'].includes(a.account_type); return (<tr key={a.id || i} className="border-b border-[#E5E7EB] last:border-b-0"><td className="px-4 py-2.5 text-[#6B7280] font-mono text-xs">{a.account_code}</td><td className="px-4 py-2.5 text-[#333]">{a.account_name}</td><td className="px-4 py-2.5 text-[#6B7280]">{a.account_type}</td><td className="px-4 py-2.5 text-right font-medium text-[#333]">{isDebit ? formatIndianCurrency(bal) : ''}</td><td className="px-4 py-2.5 text-right font-medium text-[#333]">{!isDebit ? formatIndianCurrency(bal) : ''}</td></tr>); })
          )}
          <tr className="bg-gray-50 font-semibold border-t-2 border-[#E5E7EB]"><td colSpan={3} className="px-4 py-3 text-[#333]">Total</td><td className="px-4 py-3 text-right text-[#333]">{formatIndianCurrency(totalDebit)}</td><td className="px-4 py-3 text-right text-[#333]">{formatIndianCurrency(totalCredit)}</td></tr>
        </tbody>
      </table>
    </div>
  );
}

function CashFlowReport({ data }) {
  if (!data) return null;
  const d = data.data || data;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4"><p className="text-xs text-blue-600 font-medium uppercase tracking-wide">Operating Activities</p><p className="text-lg font-semibold text-blue-700 mt-1">{formatIndianCurrency(d.operating)}</p></div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4"><p className="text-xs text-purple-600 font-medium uppercase tracking-wide">Investing Activities</p><p className="text-lg font-semibold text-purple-700 mt-1">{formatIndianCurrency(d.investing)}</p></div>
        <div className="bg-teal-50 border border-teal-200 rounded-lg p-4"><p className="text-xs text-teal-600 font-medium uppercase tracking-wide">Financing Activities</p><p className="text-lg font-semibold text-teal-700 mt-1">{formatIndianCurrency(d.financing)}</p></div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4"><p className="text-xs text-green-600 font-medium uppercase tracking-wide">Net Cash Flow</p><p className="text-lg font-semibold text-green-700 mt-1">{formatIndianCurrency(d.netCashFlow)}</p></div>
      </div>
      <div className="bg-white rounded-lg border border-[#E5E7EB] overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 border-b border-[#E5E7EB]"><th className="text-left px-4 py-3 font-semibold text-[#333]">Activity</th><th className="text-right px-4 py-3 font-semibold text-[#333]">Amount</th></tr></thead>
          <tbody>
            <tr className="border-b border-[#E5E7EB]"><td className="px-4 py-3 text-[#333]">Cash from Operating Activities</td><td className="px-4 py-3 text-right font-medium text-[#333]">{formatIndianCurrency(d.operating)}</td></tr>
            <tr className="border-b border-[#E5E7EB]"><td className="px-4 py-3 text-[#333]">Cash from Investing Activities</td><td className="px-4 py-3 text-right font-medium text-[#333]">{formatIndianCurrency(d.investing)}</td></tr>
            <tr className="border-b border-[#E5E7EB]"><td className="px-4 py-3 text-[#333]">Cash from Financing Activities</td><td className="px-4 py-3 text-right font-medium text-[#333]">{formatIndianCurrency(d.financing)}</td></tr>
            <tr className="bg-gray-50 font-semibold"><td className="px-4 py-3 text-[#333]">Net Cash Flow</td><td className={`px-4 py-3 text-right ${d.netCashFlow >= 0 ? 'text-green-700' : 'text-red-700'}`}>{formatIndianCurrency(d.netCashFlow)}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AgingReport({ data, reportName }) {
  if (!data) return null;
  const rows = Array.isArray(data.data || data) ? (data.data || data) : [];
  const isReceivables = reportName.toLowerCase().includes('receivable');
  const nameLabel = isReceivables ? 'Customer' : 'Vendor';
  const numberLabel = isReceivables ? 'Invoice #' : 'Bill #';
  const nameKey = isReceivables ? 'customer_name' : 'vendor_name';
  const numberKey = isReceivables ? 'invoice_number' : 'bill_number';
  const dateKey = isReceivables ? 'invoice_date' : 'bill_date';

  // Classify by aging buckets
  const now = new Date();
  const buckets = { current: [], '1_30': [], '31_60': [], '61_90': [], '90_plus': [] };
  rows.forEach((row) => {
    const dueDate = new Date(row.due_date);
    const daysOverdue = Math.floor((now - dueDate) / (1000 * 60 * 60 * 24));
    if (daysOverdue <= 0) buckets.current.push(row);
    else if (daysOverdue <= 30) buckets['1_30'].push(row);
    else if (daysOverdue <= 60) buckets['31_60'].push(row);
    else if (daysOverdue <= 90) buckets['61_90'].push(row);
    else buckets['90_plus'].push(row);
  });

  const bucketTotal = (items) => items.reduce((s, r) => s + (parseFloat(r.balance_due) || 0), 0);
  const grandTotal = rows.reduce((s, r) => s + (parseFloat(r.balance_due) || 0), 0);

  const bucketSummary = [
    { label: 'Current', items: buckets.current, color: 'bg-green-100 text-green-800' },
    { label: '1-30 Days', items: buckets['1_30'], color: 'bg-yellow-100 text-yellow-800' },
    { label: '31-60 Days', items: buckets['31_60'], color: 'bg-orange-100 text-orange-800' },
    { label: '61-90 Days', items: buckets['61_90'], color: 'bg-red-100 text-red-800' },
    { label: '90+ Days', items: buckets['90_plus'], color: 'bg-red-200 text-red-900' },
  ];

  return (
    <div className="space-y-4">
      {/* Aging Bucket Summary */}
      <div className="grid grid-cols-5 gap-3">
        {bucketSummary.map((b) => (
          <div key={b.label} className={`rounded-lg p-3 ${b.color}`}>
            <p className="text-xs font-medium opacity-80">{b.label}</p>
            <p className="text-sm font-bold mt-1">{formatIndianCurrency(bucketTotal(b.items))}</p>
            <p className="text-xs opacity-70 mt-0.5">{b.items.length} items</p>
          </div>
        ))}
      </div>

      {/* Detail Table */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-[#E5E7EB]">
              <th className="text-left px-4 py-3 text-xs font-medium text-[#6B7280] uppercase tracking-wide">{nameLabel}</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#6B7280] uppercase tracking-wide">{numberLabel}</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#6B7280] uppercase tracking-wide">Date</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#6B7280] uppercase tracking-wide">Due Date</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-[#6B7280] uppercase tracking-wide">Balance Due</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB]">
            {rows.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-[#9CA3AF]">No outstanding {isReceivables ? 'receivables' : 'payables'} found</td></tr>
            ) : (
              rows.map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-[#333]">{row[nameKey] || 'N/A'}</td>
                  <td className="px-4 py-2.5 text-[#0071DC] font-medium">{row[numberKey]}</td>
                  <td className="px-4 py-2.5 text-[#6B7280]">{row[dateKey] ? new Date(row[dateKey]).toLocaleDateString('en-IN') : '-'}</td>
                  <td className="px-4 py-2.5 text-[#6B7280]">{row.due_date ? new Date(row.due_date).toLocaleDateString('en-IN') : '-'}</td>
                  <td className="px-4 py-2.5 text-right font-medium tabular-nums">{formatIndianCurrency(row.balance_due)}</td>
                </tr>
              ))
            )}
            {rows.length > 0 && (
              <tr className="bg-gray-50 font-semibold">
                <td colSpan={4} className="px-4 py-3 text-[#333]">Grand Total</td>
                <td className="px-4 py-3 text-right tabular-nums text-[#333]">{formatIndianCurrency(grandTotal)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SalesSummaryReport({ data }) {
  if (!data) return null;
  const d = data.data || data;
  const totalAmount = parseFloat(d.total_amount) || 0;
  const totalPaid = parseFloat(d.total_paid) || 0;
  const totalDue = totalAmount - totalPaid;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4"><p className="text-xs text-blue-600 font-medium uppercase tracking-wide">Total Invoices</p><p className="text-xl font-semibold text-blue-700 mt-1">{d.total_invoices || 0}</p></div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4"><p className="text-xs text-green-600 font-medium uppercase tracking-wide">Total Amount</p><p className="text-xl font-semibold text-green-700 mt-1">{formatIndianCurrency(totalAmount)}</p></div>
        <div className="bg-teal-50 border border-teal-200 rounded-lg p-4"><p className="text-xs text-teal-600 font-medium uppercase tracking-wide">Amount Received</p><p className="text-xl font-semibold text-teal-700 mt-1">{formatIndianCurrency(totalPaid)}</p></div>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4"><p className="text-xs text-orange-600 font-medium uppercase tracking-wide">Balance Due</p><p className="text-xl font-semibold text-orange-700 mt-1">{formatIndianCurrency(totalDue)}</p></div>
      </div>
      <div className="bg-white rounded-lg border border-[#E5E7EB] overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 border-b border-[#E5E7EB]"><th className="text-left px-4 py-3 font-semibold text-[#333]">Particulars</th><th className="text-right px-4 py-3 font-semibold text-[#333]">Value</th></tr></thead>
          <tbody>
            <tr className="border-b border-[#E5E7EB]"><td className="px-4 py-3 text-[#333]">Number of Invoices</td><td className="px-4 py-3 text-right font-medium text-[#333]">{d.total_invoices || 0}</td></tr>
            <tr className="border-b border-[#E5E7EB]"><td className="px-4 py-3 text-[#333]">Total Invoiced Amount</td><td className="px-4 py-3 text-right font-medium text-green-600">{formatIndianCurrency(totalAmount)}</td></tr>
            <tr className="border-b border-[#E5E7EB]"><td className="px-4 py-3 text-[#333]">Total Amount Received</td><td className="px-4 py-3 text-right font-medium text-teal-600">{formatIndianCurrency(totalPaid)}</td></tr>
            <tr className="bg-gray-50 font-semibold"><td className="px-4 py-3 text-[#333]">Outstanding Balance</td><td className="px-4 py-3 text-right text-orange-600">{formatIndianCurrency(totalDue)}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PurchaseSummaryReport({ data }) {
  if (!data) return null;
  const d = data.data || data;
  const totalAmount = parseFloat(d.total_amount) || 0;
  const totalPaid = parseFloat(d.total_paid) || 0;
  const totalDue = totalAmount - totalPaid;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4"><p className="text-xs text-orange-600 font-medium uppercase tracking-wide">Total Bills</p><p className="text-xl font-semibold text-orange-700 mt-1">{d.total_bills || 0}</p></div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4"><p className="text-xs text-red-600 font-medium uppercase tracking-wide">Total Amount</p><p className="text-xl font-semibold text-red-700 mt-1">{formatIndianCurrency(totalAmount)}</p></div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4"><p className="text-xs text-green-600 font-medium uppercase tracking-wide">Amount Paid</p><p className="text-xl font-semibold text-green-700 mt-1">{formatIndianCurrency(totalPaid)}</p></div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4"><p className="text-xs text-purple-600 font-medium uppercase tracking-wide">Balance Due</p><p className="text-xl font-semibold text-purple-700 mt-1">{formatIndianCurrency(totalDue)}</p></div>
      </div>
      <div className="bg-white rounded-lg border border-[#E5E7EB] overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 border-b border-[#E5E7EB]"><th className="text-left px-4 py-3 font-semibold text-[#333]">Particulars</th><th className="text-right px-4 py-3 font-semibold text-[#333]">Value</th></tr></thead>
          <tbody>
            <tr className="border-b border-[#E5E7EB]"><td className="px-4 py-3 text-[#333]">Number of Bills</td><td className="px-4 py-3 text-right font-medium text-[#333]">{d.total_bills || 0}</td></tr>
            <tr className="border-b border-[#E5E7EB]"><td className="px-4 py-3 text-[#333]">Total Billed Amount</td><td className="px-4 py-3 text-right font-medium text-red-600">{formatIndianCurrency(totalAmount)}</td></tr>
            <tr className="border-b border-[#E5E7EB]"><td className="px-4 py-3 text-[#333]">Total Amount Paid</td><td className="px-4 py-3 text-right font-medium text-green-600">{formatIndianCurrency(totalPaid)}</td></tr>
            <tr className="bg-gray-50 font-semibold"><td className="px-4 py-3 text-[#333]">Outstanding Balance</td><td className="px-4 py-3 text-right text-purple-600">{formatIndianCurrency(totalDue)}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function GSTSummaryReport({ data }) {
  if (!data) return null;
  const d = data.data || data;
  const { outputTax = {}, inputTax = {}, netLiability = 0 } = d;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4"><p className="text-xs text-blue-600 font-medium uppercase tracking-wide">Output Tax (Sales)</p><p className="text-xl font-semibold text-blue-700 mt-1">{formatIndianCurrency(outputTax.total)}</p></div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4"><p className="text-xs text-green-600 font-medium uppercase tracking-wide">Input Tax (Purchases)</p><p className="text-xl font-semibold text-green-700 mt-1">{formatIndianCurrency(inputTax.total)}</p></div>
        <div className={`${netLiability >= 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'} border rounded-lg p-4`}>
          <p className={`text-xs font-medium uppercase tracking-wide ${netLiability >= 0 ? 'text-red-600' : 'text-green-600'}`}>Net {netLiability >= 0 ? 'Liability' : 'Refundable'}</p>
          <p className={`text-xl font-semibold mt-1 ${netLiability >= 0 ? 'text-red-700' : 'text-green-700'}`}>{formatIndianCurrency(Math.abs(netLiability))}</p>
        </div>
      </div>
      <div className="bg-white rounded-lg border border-[#E5E7EB] overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 border-b border-[#E5E7EB]"><th className="text-left px-4 py-3 font-semibold text-[#333]">Tax Component</th><th className="text-right px-4 py-3 font-semibold text-[#333]">Output (Sales)</th><th className="text-right px-4 py-3 font-semibold text-[#333]">Input (Purchases)</th><th className="text-right px-4 py-3 font-semibold text-[#333]">Net</th></tr></thead>
          <tbody>
            <tr className="border-b border-[#E5E7EB]"><td className="px-4 py-3 text-[#333]">CGST</td><td className="px-4 py-3 text-right text-[#333]">{formatIndianCurrency(outputTax.cgst)}</td><td className="px-4 py-3 text-right text-[#333]">{formatIndianCurrency(inputTax.cgst)}</td><td className="px-4 py-3 text-right font-medium text-[#333]">{formatIndianCurrency((parseFloat(outputTax.cgst) || 0) - (parseFloat(inputTax.cgst) || 0))}</td></tr>
            <tr className="border-b border-[#E5E7EB]"><td className="px-4 py-3 text-[#333]">SGST</td><td className="px-4 py-3 text-right text-[#333]">{formatIndianCurrency(outputTax.sgst)}</td><td className="px-4 py-3 text-right text-[#333]">{formatIndianCurrency(inputTax.sgst)}</td><td className="px-4 py-3 text-right font-medium text-[#333]">{formatIndianCurrency((parseFloat(outputTax.sgst) || 0) - (parseFloat(inputTax.sgst) || 0))}</td></tr>
            <tr className="border-b border-[#E5E7EB]"><td className="px-4 py-3 text-[#333]">IGST</td><td className="px-4 py-3 text-right text-[#333]">{formatIndianCurrency(outputTax.igst)}</td><td className="px-4 py-3 text-right text-[#333]">{formatIndianCurrency(inputTax.igst)}</td><td className="px-4 py-3 text-right font-medium text-[#333]">{formatIndianCurrency((parseFloat(outputTax.igst) || 0) - (parseFloat(inputTax.igst) || 0))}</td></tr>
            <tr className="bg-gray-50 font-semibold border-t-2 border-[#E5E7EB]"><td className="px-4 py-3 text-[#333]">Total</td><td className="px-4 py-3 text-right text-blue-700">{formatIndianCurrency(outputTax.total)}</td><td className="px-4 py-3 text-right text-green-700">{formatIndianCurrency(inputTax.total)}</td><td className={`px-4 py-3 text-right ${netLiability >= 0 ? 'text-red-700' : 'text-green-700'}`}>{formatIndianCurrency(netLiability)}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TDSSummaryReport({ data }) {
  if (!data) return null;
  const rows = data.data || data;
  if (!Array.isArray(rows)) return <NoDataMessage />;
  const totalTDS = rows.reduce((s, r) => s + (parseFloat(r.total_tds) || 0), 0);
  const totalGross = rows.reduce((s, r) => s + (parseFloat(r.total_gross) || 0), 0);
  return (
    <div className="bg-white rounded-lg border border-[#E5E7EB] overflow-hidden">
      <table className="w-full text-sm">
        <thead><tr className="bg-gray-50 border-b border-[#E5E7EB]"><th className="text-left px-4 py-3 font-medium text-[#6B7280]">Section</th><th className="text-right px-4 py-3 font-medium text-[#6B7280]">Transactions</th><th className="text-right px-4 py-3 font-medium text-[#6B7280]">Gross Amount</th><th className="text-right px-4 py-3 font-medium text-[#6B7280]">TDS Amount</th></tr></thead>
        <tbody>
          {rows.length === 0 ? (<tr><td colSpan={4} className="px-4 py-8 text-center text-[#9CA3AF]">No TDS data found</td></tr>) : (
            rows.map((r, i) => (<tr key={i} className="border-b border-[#E5E7EB] last:border-b-0"><td className="px-4 py-2.5 text-[#333] font-medium">{r.section || '-'}</td><td className="px-4 py-2.5 text-right text-[#6B7280]">{r.count}</td><td className="px-4 py-2.5 text-right text-[#333]">{formatIndianCurrency(r.total_gross)}</td><td className="px-4 py-2.5 text-right font-medium text-[#333]">{formatIndianCurrency(r.total_tds)}</td></tr>))
          )}
          {rows.length > 0 && (<tr className="bg-gray-50 font-semibold border-t-2 border-[#E5E7EB]"><td className="px-4 py-3 text-[#333]">Total</td><td className="px-4 py-3 text-right text-[#333]">{rows.reduce((s, r) => s + (parseInt(r.count) || 0), 0)}</td><td className="px-4 py-3 text-right text-[#333]">{formatIndianCurrency(totalGross)}</td><td className="px-4 py-3 text-right text-[#333]">{formatIndianCurrency(totalTDS)}</td></tr>)}
        </tbody>
      </table>
    </div>
  );
}

function GenericTableReport({ data, reportName }) {
  if (!data) return null;
  // Handle multiple data shapes:
  // 1. { data: { items: [...], summary: {...} } }  → invoice/bill register
  // 2. { data: [...] }                              → simple array
  // 3. [...]                                        → plain array
  let rawData = data.data || data;
  const rows = Array.isArray(rawData)
    ? rawData
    : Array.isArray(rawData?.items)
      ? rawData.items
      : [];
  if (rows.length === 0) return <NoDataMessage />;
  const columns = Object.keys(rows[0]);
  const currencyFields = ['total_amount', 'amount', 'balance', 'balance_due', 'total_tds', 'total_gross'];
  const numericAlignFields = [...currencyFields, 'invoice_count', 'bill_count', 'total_quantity', 'count'];
  const totals = {};
  columns.forEach((col) => { if (currencyFields.includes(col)) { totals[col] = rows.reduce((s, r) => s + (parseFloat(r[col]) || 0), 0); } });
  const formatHeader = (key) => key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <div className="bg-white rounded-lg border border-[#E5E7EB] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 border-b border-[#E5E7EB]">{columns.map((col) => (<th key={col} className={`px-4 py-3 font-medium text-[#6B7280] whitespace-nowrap ${numericAlignFields.includes(col) ? 'text-right' : 'text-left'}`}>{formatHeader(col)}</th>))}</tr></thead>
          <tbody>
            {rows.map((row, i) => (<tr key={i} className="border-b border-[#E5E7EB] last:border-b-0">{columns.map((col) => (<td key={col} className={`px-4 py-2.5 whitespace-nowrap ${numericAlignFields.includes(col) ? 'text-right font-medium text-[#333]' : 'text-[#333]'}`}>{currencyFields.includes(col) ? formatIndianCurrency(row[col]) : (row[col] ?? '-')}</td>))}</tr>))}
            {Object.keys(totals).length > 0 && (<tr className="bg-gray-50 font-semibold border-t-2 border-[#E5E7EB]">{columns.map((col, idx) => (<td key={col} className={`px-4 py-3 ${currencyFields.includes(col) ? 'text-right text-[#333]' : 'text-[#333]'}`}>{idx === 0 ? 'Total' : totals[col] !== undefined ? formatIndianCurrency(totals[col]) : ''}</td>))}</tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NoDataMessage() {
  return (
    <div className="bg-white rounded-lg border border-[#E5E7EB] p-16 text-center">
      <HiOutlineExclamationTriangle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
      <p className="text-[#6B7280] font-medium">No data available</p>
      <p className="text-xs text-[#9CA3AF] mt-1">This report has no data for the selected period</p>
    </div>
  );
}

// ── Report Viewer Modal ──────────────────────────────────────────

const DATE_PRESETS = [
  { value: 'this-month', label: 'This Month' },
  { value: 'last-month', label: 'Last Month' },
  { value: 'this-quarter', label: 'This Quarter' },
  { value: 'this-year', label: 'This FY' },
  { value: 'last-year', label: 'Last FY' },
  { value: 'next-year', label: 'Next FY' },
  { value: 'custom', label: 'Custom' },
];

// ── Export type mapping from report endpoint to export route ──────
const EXPORT_TYPE_MAP = {
  '/reports/profit-and-loss': 'profit-and-loss',
  '/reports/balance-sheet': 'balance-sheet',
  '/reports/trial-balance': 'trial-balance',
  '/reports/sales-summary': 'sales-summary',
  '/reports/purchase-summary': 'purchase-summary',
  '/reports/sales-by-customer': 'sales-by-customer',
  '/reports/sales-by-item': 'sales-by-item',
  '/reports/purchases-by-vendor': 'purchases-by-vendor',
  '/reports/gst-summary': 'gst-summary',
  '/reports/tds-summary': 'tds-summary',
  '/reports/expense-report': 'expense-report',
  '/reports/receivables-aging': 'receivables-aging',
  '/reports/payables-aging': 'payables-aging',
};

function ReportViewerModal({ isOpen, reportName, onClose }) {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [datePreset, setDatePreset] = useState('this-month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const config = useMemo(() => {
    if (!reportName) return null;
    return REPORT_ENDPOINT_MAP[reportName] || null;
  }, [reportName]);

  const [exporting, setExporting] = useState(false);

  const hasEndpoint = config && config.endpoint;
  const usesDates = config?.useDates ?? false;
  const isPlaceholder = !config || config.type === 'placeholder';
  const exportType = config ? EXPORT_TYPE_MAP[config.endpoint] : null;

  // Excel download handler
  const handleExcelDownload = async () => {
    if (!exportType) {
      toast.error('Excel export not available for this report');
      return;
    }
    setExporting(true);
    try {
      const token = localStorage.getItem('auth_token');
      const params = new URLSearchParams();
      params.append('format', 'xlsx');
      if (usesDates && currentDates) {
        if (currentDates.start) params.append('start_date', currentDates.start);
        if (currentDates.end) params.append('end_date', currentDates.end);
      }
      const response = await fetch(`/api/export/${exportType}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to export');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${exportType}-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Excel file downloaded');
    } catch (err) {
      console.error('Excel export error:', err);
      toast.error('Failed to download Excel file');
    } finally {
      setExporting(false);
    }
  };

  // Zoho-style Print handler — renders a clean branded report in an iframe
  const handlePrint = () => {
    if (!reportData) return;

    // Gather rows
    let rawData = reportData.data || reportData;
    const rows = Array.isArray(rawData) ? rawData
      : Array.isArray(rawData?.items) ? rawData.items : [];
    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
    const currencyFields = ['total_amount', 'amount', 'balance', 'balance_due', 'total_tds', 'total_gross',
      'sub_total', 'total_tax', 'amount_paid', 'igst_amount', 'cgst_amount', 'sgst_amount'];
    const numericFields = [...currencyFields, 'invoice_count', 'bill_count', 'total_quantity', 'count', 'qty'];
    const formatHeader = (k) => k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const fmtCur = (v) => {
      const n = parseFloat(v) || 0;
      return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    // Period label
    const periodLabel = (usesDates && currentDates && currentDates.start && currentDates.end)
      ? `${currentDates.start} to ${currentDates.end}`
      : 'All Periods';

    // Totals row
    const totals = {};
    columns.forEach(col => {
      if (currencyFields.includes(col)) totals[col] = rows.reduce((s, r) => s + (parseFloat(r[col]) || 0), 0);
    });
    const hasTotals = Object.keys(totals).length > 0;

    // Table header
    const thHtml = columns.map(col =>
      `<th class="${numericFields.includes(col) ? 'num' : ''}">${formatHeader(col)}</th>`
    ).join('');

    // Table rows
    const trHtml = rows.map((row, i) =>
      `<tr class="${i % 2 === 0 ? 'even' : ''}">
        ${columns.map(col =>
          `<td class="${numericFields.includes(col) ? 'num' : ''}">${
            currencyFields.includes(col) ? fmtCur(row[col]) : (row[col] ?? '—')
          }</td>`
        ).join('')}
      </tr>`
    ).join('');

    // Totals row
    const totalHtml = hasTotals
      ? `<tr class="totals-row">
          ${columns.map((col, idx) =>
            `<td class="${numericFields.includes(col) ? 'num' : ''}">${
              idx === 0 ? `<strong>Total (${rows.length} records)</strong>`
              : totals[col] !== undefined ? `<strong>${fmtCur(totals[col])}</strong>` : ''
            }</td>`
          ).join('')}
        </tr>`
      : '';

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${reportName}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; font-size:11px; color:#222; background:#fff; padding:20px 24px; }
  /* Header */
  .report-header { display:flex; justify-content:space-between; align-items:flex-start; padding-bottom:12px; border-bottom:2px solid #0071DC; margin-bottom:16px; }
  .company-name { font-size:17px; font-weight:800; color:#0071DC; letter-spacing:-0.3px; }
  .company-meta { font-size:10px; color:#555; margin-top:3px; line-height:1.5; }
  .report-title-block { text-align:right; }
  .report-title { font-size:15px; font-weight:700; color:#111; }
  .report-period { font-size:10px; color:#666; margin-top:3px; }
  .report-generated { font-size:9px; color:#999; margin-top:2px; }
  /* Summary strip */
  .summary-strip { display:flex; gap:0; border:1px solid #e0e0e0; border-radius:4px; overflow:hidden; margin-bottom:14px; }
  .summary-item { flex:1; padding:8px 12px; border-right:1px solid #e0e0e0; }
  .summary-item:last-child { border-right:none; }
  .summary-item .s-label { font-size:9px; text-transform:uppercase; font-weight:700; color:#777; letter-spacing:0.5px; }
  .summary-item .s-val { font-size:13px; font-weight:800; color:#111; margin-top:2px; }
  /* Table */
  table { width:100%; border-collapse:collapse; font-size:11px; }
  thead tr { background:#0071DC; color:#fff; }
  thead th { padding:7px 8px; text-align:left; font-weight:600; font-size:10px; letter-spacing:0.3px; white-space:nowrap; }
  thead th.num { text-align:right; }
  tbody tr.even { background:#f7f9fc; }
  tbody td { padding:5px 8px; border-bottom:1px solid #eee; white-space:nowrap; color:#333; }
  tbody td.num { text-align:right; font-variant-numeric:tabular-nums; }
  .totals-row td { background:#e8f0fe; border-top:2px solid #0071DC; padding:7px 8px; font-size:11px; }
  .totals-row td.num { text-align:right; }
  /* Footer */
  .report-footer { margin-top:14px; padding-top:8px; border-top:1px solid #ddd; display:flex; justify-content:space-between; font-size:9px; color:#999; }
  @media print { body { padding:12px; } @page { margin:0.6cm; size:A4 landscape; } }
</style></head><body>
<div class="report-header">
  <div>
    <div class="company-name">Navodita Apparel Pvt. Ltd.</div>
    <div class="company-meta">GSTIN: 06AAJCN9102G1ZJ &nbsp;|&nbsp; Sohna, Haryana</div>
  </div>
  <div class="report-title-block">
    <div class="report-title">${reportName}</div>
    <div class="report-period">Period: ${periodLabel}</div>
    <div class="report-generated">Generated: ${new Date().toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}</div>
  </div>
</div>

${hasTotals && Object.keys(totals).length > 0 ? `
<div class="summary-strip">
  <div class="summary-item"><div class="s-label">Total Records</div><div class="s-val">${rows.length}</div></div>
  ${Object.entries(totals).slice(0, 3).map(([k, v]) => `
  <div class="summary-item"><div class="s-label">${formatHeader(k)}</div><div class="s-val">${fmtCur(v)}</div></div>`).join('')}
</div>` : ''}

<table>
  <thead><tr>${thHtml}</tr></thead>
  <tbody>${trHtml}${totalHtml}</tbody>
</table>

<div class="report-footer">
  <span>NavoditaERP &mdash; Navodita Apparel Pvt. Ltd.</span>
  <span>Page 1 &nbsp;|&nbsp; Confidential</span>
</div>
</body></html>`;

    // Print via hidden iframe
    const existing = document.getElementById('report-print-frame');
    if (existing) existing.remove();
    const iframe = document.createElement('iframe');
    iframe.id = 'report-print-frame';
    Object.assign(iframe.style, { position:'fixed', right:'0', bottom:'0', width:'0', height:'0', border:'none' });
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.open(); doc.write(html); doc.close();
    setTimeout(() => {
      try { iframe.contentWindow.focus(); iframe.contentWindow.print(); }
      catch(e) { window.print(); }
    }, 500);
  };

  const currentDates = useMemo(() => {
    if (!usesDates) return null;
    if (datePreset === 'custom') {
      return { start: customStartDate, end: customEndDate };
    }
    return getDatePreset(datePreset);
  }, [datePreset, customStartDate, customEndDate, usesDates]);

  const fetchReport = useCallback(async () => {
    if (!hasEndpoint) return;
    setLoading(true);
    setError(null);
    setReportData(null);

    try {
      const params = {};
      if (usesDates && currentDates) {
        if (currentDates.start) params.start_date = currentDates.start;
        if (currentDates.end) params.end_date = currentDates.end;
      }
      const response = await apiClient.get(config.endpoint, { params });
      setReportData(response.data);
    } catch (err) {
      const message = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to fetch report data';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [hasEndpoint, usesDates, currentDates, config]);

  // Fetch data when modal opens or dates change
  useEffect(() => {
    if (isOpen && hasEndpoint && !isPlaceholder) {
      fetchReport();
    }
  }, [isOpen, hasEndpoint, isPlaceholder, fetchReport]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setReportData(null);
      setError(null);
      setLoading(false);
      setDatePreset('this-month');
      setCustomStartDate('');
      setCustomEndDate('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const renderReportContent = () => {
    if (isPlaceholder) {
      return (
        <div className="bg-white border border-[#E5E7EB] rounded-lg p-12 text-center">
          <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <HiOutlineChartBarSquare className="w-7 h-7 text-[#6B7280]" />
          </div>
          <h4 className="text-sm font-semibold text-[#333] mb-2">No Data Available</h4>
          <p className="text-xs text-[#6B7280] leading-relaxed max-w-xs mx-auto">
            This report does not have a backend endpoint yet. It will be available in a future update.
          </p>
        </div>
      );
    }

    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center py-16">
          <HiOutlineArrowPath className="w-8 h-8 text-[#0071DC] animate-spin mb-4" />
          <p className="text-sm text-[#6B7280]">Loading report data...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4">
            <HiOutlineExclamationTriangle className="w-6 h-6 text-red-500" />
          </div>
          <p className="text-sm font-medium text-[#333] mb-1">Failed to load report</p>
          <p className="text-xs text-[#6B7280] mb-4 max-w-sm text-center">{error}</p>
          <button
            onClick={fetchReport}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#0071DC] rounded-md hover:bg-[#005BB5] transition-colors cursor-pointer"
          >
            <HiOutlineArrowPath className="w-4 h-4" />
            Retry
          </button>
        </div>
      );
    }

    if (!reportData) return <NoDataMessage />;

    const d = reportData.data || reportData;
    if (Array.isArray(d) && d.length === 0) return <NoDataMessage />;

    switch (config.type) {
      case 'profit-loss': return <ProfitLossReport data={reportData} />;
      case 'balance-sheet': return <BalanceSheetReport data={reportData} />;
      case 'trial-balance': return <TrialBalanceReport data={reportData} />;
      case 'cash-flow': return <CashFlowReport data={reportData} />;
      case 'aging': return <AgingReport data={reportData} reportName={reportName} />;
      case 'sales-summary': return <SalesSummaryReport data={reportData} />;
      case 'purchase-summary': return <PurchaseSummaryReport data={reportData} />;
      case 'gst-summary': return <GSTSummaryReport data={reportData} />;
      case 'tds-summary': return <TDSSummaryReport data={reportData} />;
      case 'table-list': return <GenericTableReport data={reportData} reportName={reportName} />;
      default: return <GenericTableReport data={reportData} reportName={reportName} />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 pb-8">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-5xl w-full mx-4 flex flex-col max-h-[calc(100vh-4rem)] animate-[scaleIn_0.15s_ease-out]">
        {/* Title Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#0071DC]/10 flex items-center justify-center">
              <HiOutlineChartBarSquare className="w-4 h-4 text-[#0071DC]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[#333]">{reportName}</h2>
              {usesDates && hasEndpoint && !isPlaceholder && currentDates && currentDates.start && currentDates.end && datePreset !== 'custom' && (
                <p className="text-xs text-[#6B7280] mt-0.5">
                  {formatDisplayDate(currentDates.start)} &mdash; {formatDisplayDate(currentDates.end)}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasEndpoint && !isPlaceholder && reportData && (
              <>
                {exportType && (
                  <button
                    onClick={handleExcelDownload}
                    disabled={exporting}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-md hover:bg-green-100 transition-colors disabled:opacity-50 cursor-pointer print:hidden"
                  >
                    <HiOutlineArrowDownTray className={`w-3.5 h-3.5 ${exporting ? 'animate-bounce' : ''}`} />
                    Excel
                  </button>
                )}
                <button
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#0071DC] bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors cursor-pointer print:hidden"
                >
                  <HiOutlinePrinter className="w-3.5 h-3.5" />
                  Print
                </button>
              </>
            )}
            {hasEndpoint && !isPlaceholder && (
              <button
                onClick={fetchReport}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#6B7280] bg-gray-100 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50 cursor-pointer print:hidden"
              >
                <HiOutlineArrowPath className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-[#6B7280] hover:text-[#333] hover:bg-gray-100 rounded-md transition-colors cursor-pointer print:hidden"
            >
              <HiOutlineXMark className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Date Filter Bar */}
        {usesDates && hasEndpoint && !isPlaceholder && (
          <div className="flex items-center gap-3 px-6 py-3 border-b border-[#E5E7EB] bg-gray-50 shrink-0 flex-wrap">
            <HiOutlineCalendarDays className="w-4 h-4 text-[#6B7280] shrink-0" />
            <div className="flex items-center gap-1.5">
              {DATE_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => setDatePreset(preset.value)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    datePreset === preset.value
                      ? 'bg-[#0071DC] text-white'
                      : 'bg-white text-[#6B7280] border border-[#E5E7EB] hover:bg-gray-100'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            {datePreset === 'custom' && (
              <div className="flex items-center gap-2 ml-2">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-2 py-1.5 text-xs border border-[#E5E7EB] rounded-md bg-white text-[#333] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
                />
                <span className="text-xs text-[#6B7280]">to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-2 py-1.5 text-xs border border-[#E5E7EB] rounded-md bg-white text-[#333] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
                />
              </div>
            )}
          </div>
        )}

        {/* Report Content (scrollable) */}
        <div className="flex-1 overflow-y-auto p-6">
          {renderReportContent()}
        </div>
      </div>
    </div>
  );
}

// ── Report Card Component ────────────────────────────────────────
function ReportCard({ report, onView }) {
  return (
    <div className="flex items-center justify-between py-3 px-4 rounded-lg hover:bg-gray-50 transition-colors group">
      <div className="flex items-center gap-3 min-w-0">
        <HiOutlineClipboardDocumentList className="w-4 h-4 text-[#6B7280] shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-[#333] truncate">{report.name}</p>
          <p className="text-xs text-[#6B7280] mt-0.5 truncate">{report.description}</p>
        </div>
      </div>
      <button
        onClick={() => onView(report.name)}
        className="shrink-0 ml-3 inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-[#0071DC] bg-[#0071DC]/5 rounded-md hover:bg-[#0071DC]/10 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
      >
        View
        <HiOutlineChevronRight className="w-3 h-3" />
      </button>
    </div>
  );
}

// ── Category Section Component ────────────────────────────────────
function CategorySection({ category, onViewReport }) {
  const Icon = category.icon;
  return (
    <div className="bg-white rounded-lg border border-[#E5E7EB] overflow-hidden hover:shadow-sm transition-shadow">
      <div className="p-5 border-b border-[#E5E7EB]">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg ${category.color} flex items-center justify-center`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#333]">{category.title}</h3>
            <p className="text-xs text-[#6B7280] mt-0.5">{category.description}</p>
          </div>
        </div>
      </div>
      <div className="p-2 divide-y divide-gray-50">
        {category.reports.map((report) => (
          <ReportCard key={report.name} report={report} onView={onViewReport} />
        ))}
      </div>
    </div>
  );
}

// ── Main Reports Page ─────────────────────────────────────────────
export default function ReportsPage() {
  const [search, setSearch] = useState('');
  const [selectedReport, setSelectedReport] = useState(null);

  const filteredCategories = REPORT_CATEGORIES.map((category) => {
    if (!search.trim()) return category;
    const query = search.toLowerCase();
    const matchingReports = category.reports.filter(
      (r) => r.name.toLowerCase().includes(query) || r.description.toLowerCase().includes(query)
    );
    if (matchingReports.length > 0 || category.title.toLowerCase().includes(query) || category.description.toLowerCase().includes(query)) {
      return { ...category, reports: matchingReports.length > 0 ? matchingReports : category.reports };
    }
    return null;
  }).filter(Boolean);

  const totalReports = REPORT_CATEGORIES.reduce((sum, cat) => sum + cat.reports.length, 0);

  return (
    <div className="pb-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#333]">Reports</h1>
          <p className="text-sm text-[#6B7280] mt-1">{totalReports} reports across {REPORT_CATEGORIES.length} categories</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-[#E5E7EB] p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center"><HiOutlineDocumentChartBar className="w-5 h-5 text-white" /></div>
          <div><p className="text-xs text-[#6B7280] font-medium uppercase tracking-wide">Total Reports</p><p className="text-lg font-semibold text-[#333]">{totalReports}</p></div>
        </div>
        <div className="bg-white rounded-lg border border-[#E5E7EB] p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-500 flex items-center justify-center"><HiOutlineCurrencyRupee className="w-5 h-5 text-white" /></div>
          <div><p className="text-xs text-[#6B7280] font-medium uppercase tracking-wide">Financial</p><p className="text-lg font-semibold text-[#333]">4</p></div>
        </div>
        <div className="bg-white rounded-lg border border-[#E5E7EB] p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-500 flex items-center justify-center"><HiOutlineDocumentText className="w-5 h-5 text-white" /></div>
          <div><p className="text-xs text-[#6B7280] font-medium uppercase tracking-wide">Tax</p><p className="text-lg font-semibold text-[#333]">4</p></div>
        </div>
        <div className="bg-white rounded-lg border border-[#E5E7EB] p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500 flex items-center justify-center"><HiOutlineArchiveBox className="w-5 h-5 text-white" /></div>
          <div><p className="text-xs text-[#6B7280] font-medium uppercase tracking-wide">Inventory</p><p className="text-lg font-semibold text-[#333]">3</p></div>
        </div>
      </div>

      <div className="mb-6">
        <div className="relative max-w-md">
          <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
          <input
            type="text"
            placeholder="Search reports by name or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC] bg-white"
          />
        </div>
      </div>

      {filteredCategories.length === 0 ? (
        <div className="bg-white rounded-lg border border-[#E5E7EB] p-16 text-center">
          <HiOutlineMagnifyingGlass className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-[#6B7280] font-medium">No reports match your search</p>
          <p className="text-xs text-[#9CA3AF] mt-1">Try a different keyword</p>
          <button onClick={() => setSearch('')} className="mt-3 text-sm text-[#0071DC] hover:underline cursor-pointer">Clear search</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredCategories.map((category) => (
            <CategorySection key={category.id} category={category} onViewReport={(name) => setSelectedReport(name)} />
          ))}
        </div>
      )}

      {/* Report Viewer Modal */}
      <ReportViewerModal
        isOpen={!!selectedReport}
        reportName={selectedReport}
        onClose={() => setSelectedReport(null)}
      />
    </div>
  );
}
