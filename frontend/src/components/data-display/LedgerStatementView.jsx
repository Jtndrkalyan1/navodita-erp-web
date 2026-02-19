import React, { useState, useEffect, useRef } from 'react';
import {
  HiOutlinePrinter,
  HiOutlineArrowDownTray,
  HiOutlineCalendarDays,
  HiOutlineDocumentText,
  HiOutlineBanknotes,
  HiOutlineReceiptRefund,
} from 'react-icons/hi2';

/**
 * LedgerStatementView - Shared component for Customer and Vendor ledger statements
 *
 * Redesigned with:
 * - 2 date modes: "As on date" (from creation to today) and "Custom date"
 * - Previous month balance shown as opening balance
 * - Current period transactions with invoice/bill numbers
 * - Grand total at bottom
 *
 * Props:
 *   entityId        - ID of the customer or vendor
 *   entityType      - 'customer' or 'vendor'
 *   entityName      - Display name of the customer/vendor
 *   currencyCode    - Currency code (default 'INR')
 *   fetchStatement  - async function(id, params) => returns { data: { ... } }
 */

/**
 * Format currency in Indian numbering
 */
function formatIndianCurrency(value, currencyCode = 'INR') {
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

  const symbols = { INR: '\u20B9', USD: '$', EUR: '\u20AC', GBP: '\u00A3' };
  const symbol = symbols[currencyCode] || currencyCode + ' ';

  return `${isNegative ? '-' : ''}${symbol}${result}.${decPart}`;
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

function TransactionTypeIcon({ type }) {
  switch (type) {
    case 'invoice':
    case 'bill':
      return <HiOutlineDocumentText className="w-4 h-4 text-[#6B7280]" />;
    case 'payment':
      return <HiOutlineBanknotes className="w-4 h-4 text-green-600" />;
    case 'credit-note':
    case 'debit-note':
      return <HiOutlineReceiptRefund className="w-4 h-4 text-orange-600" />;
    default:
      return <HiOutlineDocumentText className="w-4 h-4 text-[#6B7280]" />;
  }
}

function TransactionTypeBadge({ type, entityType }) {
  const labels = {
    invoice: 'Invoice',
    bill: 'Bill',
    payment: entityType === 'customer' ? 'Payment Received' : 'Payment Made',
    'credit-note': 'Credit Note',
    'debit-note': 'Debit Note',
  };

  const styles = {
    invoice: 'bg-blue-50 text-blue-700 border-blue-200',
    bill: 'bg-blue-50 text-blue-700 border-blue-200',
    payment: 'bg-green-50 text-green-700 border-green-200',
    'credit-note': 'bg-orange-50 text-orange-700 border-orange-200',
    'debit-note': 'bg-orange-50 text-orange-700 border-orange-200',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
        styles[type] || 'bg-gray-100 text-gray-600 border-gray-200'
      }`}
    >
      {labels[type] || type}
    </span>
  );
}

export default function LedgerStatementView({
  entityId,
  entityType = 'customer',
  entityName = '',
  currencyCode = 'INR',
  fetchStatement,
}) {
  const [statementData, setStatementData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Period selection: 'as_on_date' or 'custom'
  const [mode, setMode] = useState('as_on_date');

  // Custom date range
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const printRef = useRef(null);

  // Fetch statement data when period changes
  useEffect(() => {
    if (!entityId || !fetchStatement) return;

    const loadStatement = async () => {
      setLoading(true);
      setError(null);
      try {
        let params = {};
        if (mode === 'as_on_date') {
          params = { mode: 'as_on_date' };
        } else if (mode === 'custom' && customStartDate && customEndDate) {
          params = { start_date: customStartDate, end_date: customEndDate };
        } else {
          params = { mode: 'as_on_date' };
        }

        const response = await fetchStatement(entityId, params);
        setStatementData(response.data?.data || null);
      } catch (err) {
        console.error('Error loading statement:', err);
        setError('Failed to load statement. Please try again.');
        setStatementData(null);
      } finally {
        setLoading(false);
      }
    };

    loadStatement();
  }, [entityId, fetchStatement, mode, customStartDate, customEndDate]);

  const handlePrint = () => {
    if (!printRef.current) return;

    const printContent = printRef.current.innerHTML;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Ledger Statement - ${entityName}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 12px; color: #333; padding: 20px; }
          table { width: 100%; border-collapse: collapse; }
          th { background: #f3f4f6; text-align: left; padding: 8px 12px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; border-bottom: 2px solid #e5e7eb; }
          td { padding: 8px 12px; border-bottom: 1px solid #e5e7eb; }
          .text-right { text-align: right; }
          .font-semibold { font-weight: 600; }
          .font-bold { font-weight: 700; }
          .text-blue { color: #0071DC; }
          .bg-blue { background: #EFF6FF; }
          .bg-gray { background: #F9FAFB; }
          .text-gray { color: #6b7280; }
          .header { text-align: center; margin-bottom: 20px; }
          .header h1 { font-size: 18px; font-weight: 700; color: #333; }
          .header p { font-size: 12px; color: #6b7280; margin-top: 4px; }
          .summary-row { font-weight: 600; background: #EFF6FF; }
          .opening-row, .closing-row { background: #F9FAFB; font-weight: 600; }
          .closing-row { background: #EFF6FF; font-weight: 700; }
          .tabular { font-variant-numeric: tabular-nums; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        ${printContent}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  const handleExportCSV = () => {
    if (!statementData) return;

    const { opening_balance, transactions, closing_balance, period } = statementData;
    const entity = statementData.customer || statementData.vendor;

    const rows = [];
    rows.push(['Ledger Statement']);
    rows.push([`${entityType === 'customer' ? 'Customer' : 'Vendor'}: ${entity?.display_name || entityName}`]);
    rows.push([`Period: ${formatDate(period?.start_date)} to ${formatDate(period?.end_date)}`]);
    rows.push([]);
    rows.push(['Date', 'Type', 'Document #', 'Description', 'Debit', 'Credit', 'Balance']);
    rows.push(['', '', '', 'Opening Balance', '', '', opening_balance.toFixed(2)]);

    transactions.forEach((txn) => {
      rows.push([
        txn.date,
        txn.type,
        txn.document_number,
        txn.description,
        txn.debit ? txn.debit.toFixed(2) : '',
        txn.credit ? txn.credit.toFixed(2) : '',
        txn.running_balance.toFixed(2),
      ]);
    });

    rows.push(['', '', '', 'Closing Balance', '', '', closing_balance.toFixed(2)]);

    const csvContent = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${entityType}-statement-${entity?.display_name || entityId}-${period?.start_date}-to-${period?.end_date}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Compute summary from statement data
  const getSummary = () => {
    if (!statementData) return { totalInvoiced: 0, totalPaid: 0, outstanding: 0 };
    const totalDebit = statementData.summary?.total_debit || 0;
    const totalCredit = statementData.summary?.total_credit || 0;
    return {
      totalDebit,
      totalCredit,
      outstanding: statementData.closing_balance || 0,
    };
  };

  const summary = getSummary();

  return (
    <div>
      {/* Period Selector */}
      <div className="mb-5">
        {/* Mode Toggle + Actions */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1 bg-[#F3F4F6] rounded-lg p-1">
            <button
              onClick={() => setMode('as_on_date')}
              className={`px-4 py-2 text-xs font-medium rounded-md transition-all ${
                mode === 'as_on_date'
                  ? 'bg-white text-[#0071DC] shadow-sm border border-[#E5E7EB]'
                  : 'text-[#6B7280] hover:text-[#333]'
              }`}
            >
              As on Date
            </button>
            <button
              onClick={() => setMode('custom')}
              className={`px-4 py-2 text-xs font-medium rounded-md transition-all ${
                mode === 'custom'
                  ? 'bg-white text-[#0071DC] shadow-sm border border-[#E5E7EB]'
                  : 'text-[#6B7280] hover:text-[#333]'
              }`}
            >
              Custom Date
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              disabled={!statementData || loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#6B7280] bg-white border border-[#E5E7EB] rounded-md hover:bg-[#F9FAFB] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <HiOutlinePrinter className="w-3.5 h-3.5" />
              Print
            </button>
            <button
              onClick={handleExportCSV}
              disabled={!statementData || loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#6B7280] bg-white border border-[#E5E7EB] rounded-md hover:bg-[#F9FAFB] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <HiOutlineArrowDownTray className="w-3.5 h-3.5" />
              Export CSV
            </button>
          </div>
        </div>

        {/* "As on Date" description */}
        {mode === 'as_on_date' && statementData && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 flex items-center gap-2">
            <HiOutlineCalendarDays className="w-4 h-4 text-[#0071DC]" />
            <span className="text-xs text-[#333]">
              Showing all transactions from <strong>{formatDate(statementData.period?.start_date)}</strong> to <strong>{formatDate(statementData.period?.end_date)}</strong>
            </span>
          </div>
        )}

        {/* Custom Date Range */}
        {mode === 'custom' && (
          <div className="bg-[#F9FAFB] rounded-lg border border-[#E5E7EB] p-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <HiOutlineCalendarDays className="w-4 h-4 text-[#6B7280]" />
                <label className="text-xs font-medium text-[#6B7280]">From</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-2 py-1.5 text-xs border border-[#E5E7EB] rounded-md focus:outline-none focus:ring-1 focus:ring-[#0071DC] focus:border-[#0071DC]"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-[#6B7280]">To</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-2 py-1.5 text-xs border border-[#E5E7EB] rounded-md focus:outline-none focus:ring-1 focus:ring-[#0071DC] focus:border-[#0071DC]"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <div className="w-6 h-6 border-2 border-[#0071DC] border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-[#6B7280]">Loading statement...</span>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="text-center py-12">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && statementData && statementData.transactions.length === 0 && statementData.opening_balance === 0 && (
        <div className="text-center py-12">
          <HiOutlineDocumentText className="w-10 h-10 text-[#D1D5DB] mx-auto mb-3" />
          <p className="text-sm text-[#6B7280]">
            No transactions found for this period.
          </p>
        </div>
      )}

      {/* Statement Content */}
      {!loading && !error && statementData && (statementData.transactions.length > 0 || statementData.opening_balance !== 0) && (
        <div>
          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-3 mb-5">
            <div className="bg-white rounded-lg border border-[#E5E7EB] p-3">
              <p className="text-xs text-[#6B7280] font-medium uppercase tracking-wide">Opening Balance</p>
              <p className="text-base font-semibold text-[#333] mt-0.5 tabular-nums">
                {formatIndianCurrency(statementData.opening_balance, currencyCode)}
              </p>
            </div>
            <div className="bg-white rounded-lg border border-[#E5E7EB] p-3">
              <p className="text-xs text-[#6B7280] font-medium uppercase tracking-wide">
                {entityType === 'customer' ? 'Total Invoiced' : 'Total Billed'}
              </p>
              <p className="text-base font-semibold text-[#333] mt-0.5 tabular-nums">
                {formatIndianCurrency(summary.totalDebit > 0 ? summary.totalDebit : summary.totalCredit, currencyCode)}
              </p>
            </div>
            <div className="bg-white rounded-lg border border-[#E5E7EB] p-3">
              <p className="text-xs text-[#6B7280] font-medium uppercase tracking-wide">
                {entityType === 'customer' ? 'Total Received' : 'Total Paid'}
              </p>
              <p className="text-base font-semibold text-green-600 mt-0.5 tabular-nums">
                {formatIndianCurrency(summary.totalCredit > 0 ? summary.totalCredit : summary.totalDebit, currencyCode)}
              </p>
            </div>
            <div className="bg-white rounded-lg border border-[#E5E7EB] p-3">
              <p className="text-xs text-[#6B7280] font-medium uppercase tracking-wide">
                {entityType === 'customer' ? 'Balance Due' : 'Balance Payable'}
              </p>
              <p className={`text-base font-semibold mt-0.5 tabular-nums ${
                summary.outstanding > 0 ? 'text-orange-600' : summary.outstanding < 0 ? 'text-green-600' : 'text-[#333]'
              }`}>
                {formatIndianCurrency(Math.abs(summary.outstanding), currencyCode)}
              </p>
            </div>
          </div>

          {/* Printable Content */}
          <div ref={printRef}>
            {/* Print-only header */}
            <div style={{ display: 'none' }} className="print-header">
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <h1 style={{ fontSize: '18px', fontWeight: '700', color: '#333' }}>Ledger Statement</h1>
                <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                  {entityType === 'customer' ? 'Customer' : 'Vendor'}: {(statementData.customer || statementData.vendor)?.display_name || entityName}
                </p>
                <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                  Period: {formatDate(statementData.period?.start_date)} to {formatDate(statementData.period?.end_date)}
                </p>
              </div>
            </div>

            {/* Statement Table */}
            <div className="overflow-x-auto rounded-lg border border-[#E5E7EB]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#0071DC]">
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-white uppercase tracking-wider w-[110px]">Date</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-white uppercase tracking-wider w-[130px]">Type</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-white uppercase tracking-wider w-[130px]">
                      {entityType === 'customer' ? 'Invoice #' : 'Bill #'}
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-white uppercase tracking-wider">Description</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-white uppercase tracking-wider w-[130px]">
                      {entityType === 'customer' ? 'Invoiced' : 'Billed'}
                    </th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-white uppercase tracking-wider w-[130px]">
                      {entityType === 'customer' ? 'Received' : 'Paid'}
                    </th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-white uppercase tracking-wider w-[140px]">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Opening Balance Row */}
                  <tr className="bg-[#F0F7FF] border-b border-[#E5E7EB]">
                    <td className="px-4 py-2.5 text-[#333] font-medium" colSpan="4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">Opening Balance</span>
                        <span className="text-[10px] text-[#6B7280]">(Previous balance carried forward)</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right text-[#9CA3AF]">--</td>
                    <td className="px-4 py-2.5 text-right text-[#9CA3AF]">--</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-[#333] tabular-nums">
                      {formatIndianCurrency(statementData.opening_balance, currencyCode)}
                    </td>
                  </tr>

                  {/* Transaction Rows */}
                  {statementData.transactions.map((txn, index) => (
                    <tr
                      key={index}
                      className={`border-b border-[#E5E7EB] ${
                        index % 2 === 0 ? 'bg-white' : 'bg-[#F9FAFB]'
                      } hover:bg-[#F0F7FF] transition-colors`}
                    >
                      <td className="px-4 py-2.5 text-[#6B7280] whitespace-nowrap text-xs">{formatDate(txn.date)}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <TransactionTypeIcon type={txn.type} />
                          <TransactionTypeBadge type={txn.type} entityType={entityType} />
                        </div>
                      </td>
                      <td className="px-4 py-2.5 font-medium text-[#0071DC] whitespace-nowrap text-xs">{txn.document_number || '--'}</td>
                      <td className="px-4 py-2.5 text-[#6B7280] truncate max-w-[200px] text-xs">{txn.description || '--'}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-medium">
                        {txn.debit > 0 ? (
                          <span className="text-[#333]">{formatIndianCurrency(txn.debit, currencyCode)}</span>
                        ) : (
                          <span className="text-[#D1D5DB]">--</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-medium">
                        {txn.credit > 0 ? (
                          <span className="text-green-600">{formatIndianCurrency(txn.credit, currencyCode)}</span>
                        ) : (
                          <span className="text-[#D1D5DB]">--</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-[#333]">
                        {formatIndianCurrency(txn.running_balance, currencyCode)}
                      </td>
                    </tr>
                  ))}

                  {/* Totals Row */}
                  {statementData.transactions.length > 0 && (
                    <tr className="bg-[#F3F4F6] border-b-2 border-[#E5E7EB]">
                      <td className="px-4 py-2.5 font-bold text-[#333] text-xs uppercase tracking-wider" colSpan="4">
                        Total ({statementData.summary?.transaction_count || 0} transactions)
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold text-[#333] tabular-nums">
                        {statementData.summary?.total_debit > 0
                          ? formatIndianCurrency(statementData.summary.total_debit, currencyCode)
                          : '--'}
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold text-green-600 tabular-nums">
                        {statementData.summary?.total_credit > 0
                          ? formatIndianCurrency(statementData.summary.total_credit, currencyCode)
                          : '--'}
                      </td>
                      <td className="px-4 py-2.5"></td>
                    </tr>
                  )}

                  {/* Grand Total / Closing Balance Row */}
                  <tr className="bg-[#EFF6FF]">
                    <td className="px-4 py-3" colSpan="4">
                      <div>
                        <span className="font-bold text-[#333] text-sm">Closing Balance</span>
                        <span className="text-[10px] text-[#6B7280] ml-2">
                          (As on {formatDate(statementData.period?.end_date)})
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-[#9CA3AF]">--</td>
                    <td className="px-4 py-3 text-right text-[#9CA3AF]">--</td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-bold text-[#0071DC] text-base tabular-nums">
                        {formatIndianCurrency(statementData.closing_balance, currencyCode)}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Balance Indicator */}
          <div className="mt-4 flex items-center justify-between">
            <div className="text-xs text-[#6B7280]">
              {entityType === 'customer' ? (
                statementData.closing_balance > 0 ? (
                  <span>Amount receivable from customer: <strong className="text-orange-600">{formatIndianCurrency(statementData.closing_balance, currencyCode)}</strong></span>
                ) : statementData.closing_balance < 0 ? (
                  <span>Advance received from customer: <strong className="text-green-600">{formatIndianCurrency(Math.abs(statementData.closing_balance), currencyCode)}</strong></span>
                ) : (
                  <span className="text-green-600 font-medium">No outstanding balance - All settled</span>
                )
              ) : (
                statementData.closing_balance > 0 ? (
                  <span>Amount payable to vendor: <strong className="text-orange-600">{formatIndianCurrency(statementData.closing_balance, currencyCode)}</strong></span>
                ) : statementData.closing_balance < 0 ? (
                  <span>Advance paid to vendor: <strong className="text-green-600">{formatIndianCurrency(Math.abs(statementData.closing_balance), currencyCode)}</strong></span>
                ) : (
                  <span className="text-green-600 font-medium">No outstanding balance - All settled</span>
                )
              )}
            </div>
            <div className="text-[10px] text-[#9CA3AF]">
              Period: {formatDate(statementData.period?.start_date)} to {formatDate(statementData.period?.end_date)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
