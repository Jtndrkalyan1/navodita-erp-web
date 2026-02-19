import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  HiOutlinePlus,
  HiOutlinePencilSquare,
  HiOutlineTrash,
  HiOutlineChevronDown,
  HiOutlineArrowPath,
  HiOutlineDocumentArrowDown,
  HiOutlineExclamationTriangle,
  HiOutlineBookOpen,
  HiOutlineUserGroup,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { investorOrderApi } from '../../api/investorOrder.api';
import { formatINR } from '../../utils/currency';
import LoadingSpinner from '../../components/feedback/LoadingSpinner';

// ── Helpers ──────────────────────────────────────────────────────

const MONTH_ORDER = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getCurrentMonthYear() {
  const now = new Date();
  const m = MONTH_ORDER[now.getMonth()];
  const y = String(now.getFullYear()).slice(-2);
  return `${m}'${y}`;
}

function formatPct(val) {
  const n = parseFloat(val) || 0;
  return (n * 100).toFixed(1) + '%';
}

function formatNum(val) {
  const n = parseFloat(val) || 0;
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Main Component ───────────────────────────────────────────────

export default function InvestorOrdersPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const exportRef = useRef(null);

  // State
  const [months, setMonths] = useState([]);
  const [orders, setOrders] = useState([]);
  const [summary, setSummary] = useState(null);
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const selectedMonth = searchParams.get('month') || '';

  // Fetch available months
  const fetchMonths = useCallback(async () => {
    try {
      const res = await investorOrderApi.getMonths();
      setMonths(res.data.data || []);
      return res.data.data || [];
    } catch {
      return [];
    }
  }, []);

  // Fetch orders for a month
  const fetchOrders = useCallback(async (monthYear) => {
    if (!monthYear) return;
    setLoading(true);
    setError(null);
    try {
      const [ordersRes, summaryRes, partnersRes] = await Promise.all([
        investorOrderApi.list({ month_year: monthYear }),
        investorOrderApi.getSummary(monthYear).catch(() => ({ data: { data: null } })),
        investorOrderApi.getPartners(),
      ]);
      setOrders(ordersRes.data.data || []);
      // Ensure summary is always an object so fix cost inputs are always shown
      setSummary(summaryRes.data.data || {
        month_year: monthYear,
        building_rent: 0, mechanic: 0, worker_salary: 0, supervisor: 0, merchant: 0,
        house_keeping: 0, water_sewage: 0, office_expenses: 0, petrol: 0, electricity: 0,
        total_fix_cost: 0, revenue: 0, gross_profit: 0, net_profit: 0,
      });
      setPartners(partnersRes.data.data || []);
    } catch (err) {
      if (err.response?.status !== 401) {
        setError('Failed to load orders. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Initialize: fetch months, then select current or first
  useEffect(() => {
    (async () => {
      const m = await fetchMonths();
      if (!selectedMonth && m.length > 0) {
        const current = getCurrentMonthYear();
        const found = m.find((x) => x.month_year === current);
        const initial = found ? current : m[0].month_year;
        setSearchParams({ month: initial }, { replace: true });
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch orders when month changes
  useEffect(() => {
    if (selectedMonth) {
      fetchOrders(selectedMonth);
    }
  }, [selectedMonth, fetchOrders]);

  // Month tab click
  function selectMonth(monthYear) {
    setSearchParams({ month: monthYear }, { replace: true });
  }

  // Delete order
  async function handleDelete(id) {
    if (!window.confirm('Are you sure you want to delete this order?')) return;
    try {
      await investorOrderApi.remove(id);
      toast.success('Order deleted');
      fetchOrders(selectedMonth);
    } catch {
      toast.error('Failed to delete order');
    }
  }

  // Recalculate summary
  async function handleRecalculate() {
    try {
      await investorOrderApi.recalculate(selectedMonth);
      toast.success('Summary recalculated');
      fetchOrders(selectedMonth);
    } catch {
      toast.error('Failed to recalculate');
    }
  }

  // Create next month
  async function handleCreateNextMonth() {
    if (!selectedMonth) {
      toast.error('Please select a month first');
      return;
    }
    try {
      const res = await investorOrderApi.createNextMonth(selectedMonth);
      const newMonth = res.data.data?.month_year;
      toast.success(`Created ${newMonth || 'next month'}`);
      const m = await fetchMonths();
      if (newMonth) {
        setSearchParams({ month: newMonth }, { replace: true });
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create next month');
    }
  }

  // Export CSV (includes order table + summary + fix costs + partner distribution)
  function handleExportCSV() {
    if (!orders.length) return;
    const csvTotals = orders.reduce(
      (acc, o) => ({
        order_qty: acc.order_qty + (parseInt(o.order_qty) || 0),
        total_tailor_cost: acc.total_tailor_cost + (parseFloat(o.total_tailor_cost) || 0),
        fob_total: acc.fob_total + (parseFloat(o.fob_total) || 0),
        cost_incure_value: acc.cost_incure_value + (parseFloat(o.cost_incure_value) || 0),
        profit_value: acc.profit_value + (parseFloat(o.profit_value) || 0),
      }),
      { order_qty: 0, total_tailor_cost: 0, fob_total: 0, cost_incure_value: 0, profit_value: 0 }
    );
    const profitPctCSV = csvTotals.fob_total > 0 ? ((csvTotals.profit_value / csvTotals.fob_total) * 100).toFixed(1) + '%' : '0.0%';

    const headers = ['S.No', 'Buyer', 'Style', 'Description', 'Color', 'Qty', 'Tailor Rate', 'Total Tailor Cost', 'FOB', 'Cost Incure', 'Profit', 'FOB Total', 'Cost Incure Value', 'Profit Value', 'Profit %'];
    const rows = orders.map((o) => [
      o.s_no, o.buyer, o.style, o.description, o.color, o.order_qty,
      o.tailor_rate, o.total_tailor_cost, o.fob, o.cost_incure, o.profit,
      o.fob_total, o.cost_incure_value, o.profit_value,
      formatPct(o.profit_percentage),
    ]);
    // Add totals row
    rows.push(['', '', '', '', 'TOTALS', csvTotals.order_qty, '', csvTotals.total_tailor_cost, '', '', '', csvTotals.fob_total, csvTotals.cost_incure_value, csvTotals.profit_value, profitPctCSV]);

    let csvLines = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(','));

    // Add empty separator and summary section
    if (summary) {
      csvLines.push('');
      csvLines.push('"MONTHLY SUMMARY"');
      csvLines.push(`"Revenue (FOB Total)","${summary.revenue || 0}"`);
      csvLines.push(`"Gross Profit","${summary.gross_profit || 0}"`);
      csvLines.push(`"Gross Profit %","${formatPct(summary.gross_profit_percentage)}"`);
      csvLines.push(`"Total Fix Cost","${summary.total_fix_cost || 0}"`);
      csvLines.push(`"Net Profit","${summary.net_profit || 0}"`);
      csvLines.push(`"Net Profit %","${formatPct(summary.net_profit_percentage)}"`);
      csvLines.push('');
      csvLines.push('"FIX COSTS BREAKDOWN"');
      const fixItems = [
        ['Building Rent', summary.building_rent], ['Mechanic', summary.mechanic],
        ['Worker Salary', summary.worker_salary], ['Supervisor', summary.supervisor],
        ['Merchant', summary.merchant], ['House Keeping', summary.house_keeping],
        ['Water & Sewage', summary.water_sewage], ['Office Expenses', summary.office_expenses],
        ['Petrol', summary.petrol], ['Electricity', summary.electricity],
      ];
      fixItems.forEach(([label, val]) => csvLines.push(`"${label}","${val || 0}"`));
      csvLines.push(`"Total Fix Cost","${summary.total_fix_cost || 0}"`);
      csvLines.push('');
      csvLines.push('"PARTNER DISTRIBUTION"');
      partners.forEach((p) => {
        const firstName = p.partner_name?.split(' ')[0]?.toLowerCase() || '';
        const knownKeys = { jitender: 'jitender_share', pawan: 'pawan_share', sunil: 'sunil_share', vijay: 'vijay_share' };
        const key = knownKeys[firstName];
        let share = key ? (parseFloat(summary[key]) || 0) : 0;
        if (share === 0 && summary.net_profit) share = parseFloat(summary.net_profit) * (parseFloat(p.ratio) || 0);
        csvLines.push(`"${p.partner_name} (${(parseFloat(p.ratio) * 100).toFixed(0)}%)","${share || 0}"`);
      });
      csvLines.push(`"Total Net Profit","${summary.net_profit || 0}"`);
    }

    const csv = csvLines.join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `investor-orders-${selectedMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Print / PDF - opens a clean print popup with the order table + summary
  function handlePrint() {
    setShowExportMenu(false);

    // Compute totals locally (same logic as the component-level totals)
    const printTotals = orders.reduce(
      (acc, o) => ({
        order_qty: acc.order_qty + (parseInt(o.order_qty) || 0),
        total_tailor_cost: acc.total_tailor_cost + (parseFloat(o.total_tailor_cost) || 0),
        fob_total: acc.fob_total + (parseFloat(o.fob_total) || 0),
        cost_incure_value: acc.cost_incure_value + (parseFloat(o.cost_incure_value) || 0),
        profit_value: acc.profit_value + (parseFloat(o.profit_value) || 0),
      }),
      { order_qty: 0, total_tailor_cost: 0, fob_total: 0, cost_incure_value: 0, profit_value: 0 }
    );

    // Build order rows
    const orderRows = orders
      .map(
        (o, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${o.buyer || ''}</td>
        <td>${o.style || ''}</td>
        <td>${o.description || ''}</td>
        <td>${o.color || ''}</td>
        <td class="num">${(parseInt(o.order_qty) || 0).toLocaleString('en-IN')}</td>
        <td class="num">${formatNum(o.tailor_rate)}</td>
        <td class="num">${formatNum(o.total_tailor_cost)}</td>
        <td class="num">${formatNum(o.fob)}</td>
        <td class="num">${formatNum(o.cost_incure)}</td>
        <td class="num profit">${formatNum(o.profit)}</td>
        <td class="num bold">${formatNum(o.fob_total)}</td>
        <td class="num">${formatNum(o.cost_incure_value)}</td>
        <td class="num profit">${formatNum(o.profit_value)}</td>
        <td class="num">${formatPct(o.profit_percentage)}</td>
      </tr>`
      )
      .join('');

    const profitPct = printTotals.fob_total > 0 ? ((printTotals.profit_value / printTotals.fob_total) * 100).toFixed(1) + '%' : '0.0%';

    // Build summary section
    let summaryHTML = '';
    if (summary) {
      const fixCosts = [
        ['Building Rent', summary.building_rent],
        ['Mechanic', summary.mechanic],
        ['Worker Salary', summary.worker_salary],
        ['Supervisor', summary.supervisor],
        ['Merchant', summary.merchant],
        ['House Keeping', summary.house_keeping],
        ['Water & Sewage', summary.water_sewage],
        ['Office Expenses', summary.office_expenses],
        ['Petrol', summary.petrol],
        ['Electricity', summary.electricity],
      ];

      const partnerRows = partners
        .map((p) => {
          const firstName = p.partner_name?.split(' ')[0]?.toLowerCase() || '';
          const knownKeys = { jitender: 'jitender_share', pawan: 'pawan_share', sunil: 'sunil_share', vijay: 'vijay_share' };
          const key = knownKeys[firstName];
          let share = key ? (parseFloat(summary[key]) || 0) : 0;
          if (share === 0 && summary.net_profit) share = parseFloat(summary.net_profit) * (parseFloat(p.ratio) || 0);
          return `<tr><td>${p.partner_name} (${(parseFloat(p.ratio) * 100).toFixed(0)}%)</td><td class="num">${formatNum(share)}</td></tr>`;
        })
        .join('');

      summaryHTML = `
        <div class="summary-grid">
          <div class="summary-card">
            <h3>Monthly Summary</h3>
            <table class="summary-table">
              <tr><td>Revenue (FOB Total)</td><td class="num">${formatNum(summary.revenue)}</td></tr>
              <tr><td>Gross Profit</td><td class="num">${formatNum(summary.gross_profit)}</td></tr>
              <tr><td>Gross Profit %</td><td class="num">${formatPct(summary.gross_profit_percentage)}</td></tr>
              <tr class="sep"><td>Total Fix Cost</td><td class="num red">${formatNum(summary.total_fix_cost)}</td></tr>
              <tr class="total"><td>Net Profit</td><td class="num bold">${formatNum(summary.net_profit)}</td></tr>
              <tr><td>Net Profit %</td><td class="num">${formatPct(summary.net_profit_percentage)}</td></tr>
            </table>
          </div>
          <div class="summary-card">
            <h3>Fix Costs Breakdown</h3>
            <table class="summary-table">
              ${fixCosts.map(([l, v]) => `<tr><td>${l}</td><td class="num">${formatNum(v)}</td></tr>`).join('')}
              <tr class="total"><td>Total Fix Cost</td><td class="num red">${formatNum(summary.total_fix_cost)}</td></tr>
            </table>
          </div>
          <div class="summary-card">
            <h3>Partner Distribution</h3>
            <table class="summary-table">
              ${partnerRows}
              <tr class="total"><td>Total Net Profit</td><td class="num bold">${formatNum(summary.net_profit)}</td></tr>
            </table>
          </div>
        </div>`;
    }

    const html = `<!DOCTYPE html>
<html><head><title>Investor Report - ${selectedMonth}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; color: #111; padding: 24px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  h2 { font-size: 18px; margin-bottom: 4px; color: #000; }
  .subtitle { color: #444; font-size: 13px; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  th, td { padding: 6px 8px; border: 1px solid #ccc; text-align: left; white-space: nowrap; }
  th { background: #e8e8e8; font-size: 11px; text-transform: uppercase; font-weight: 700; color: #222; }
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  .profit { color: #0a7c2e; }
  .red { color: #b91c1c; }
  .bold { font-weight: 800; }
  .totals-row td { background: #e0e0e0; font-weight: 800; border-top: 2px solid #666; }
  .summary-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-top: 20px; }
  .summary-card { border: 1px solid #bbb; border-radius: 4px; padding: 12px; }
  .summary-card h3 { font-size: 12px; text-transform: uppercase; color: #333; margin-bottom: 8px; font-weight: 700; }
  .summary-table { border: none; }
  .summary-table td { border: none; padding: 3px 0; font-size: 12px; color: #111; }
  .summary-table .sep td { border-top: 1px solid #ccc; padding-top: 6px; }
  .summary-table .total td { border-top: 1px solid #666; font-weight: 800; padding-top: 6px; }
  @media print { body { padding: 10px; } @page { margin: 0.5cm; size: landscape; } }
</style></head><body>
<h2>Investor Order Details - ${selectedMonth}</h2>
<p class="subtitle">Generated on ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
<table>
  <thead>
    <tr>
      <th>S.No</th><th>Buyer</th><th>Style</th><th>Description</th><th>Color</th>
      <th class="num">Qty</th><th class="num">Tailor Rate</th><th class="num">Total Tailor</th>
      <th class="num">FOB</th><th class="num">Cost Incure</th><th class="num">Profit</th>
      <th class="num">FOB Total</th><th class="num">Cost Value</th><th class="num">Profit Value</th><th class="num">%</th>
    </tr>
  </thead>
  <tbody>
    ${orderRows}
    <tr class="totals-row">
      <td colspan="5">Totals</td>
      <td class="num">${printTotals.order_qty.toLocaleString('en-IN')}</td>
      <td></td>
      <td class="num">${formatNum(printTotals.total_tailor_cost)}</td>
      <td colspan="3"></td>
      <td class="num">${formatNum(printTotals.fob_total)}</td>
      <td class="num">${formatNum(printTotals.cost_incure_value)}</td>
      <td class="num profit">${formatNum(printTotals.profit_value)}</td>
      <td class="num">${profitPct}</td>
    </tr>
  </tbody>
</table>
${summaryHTML}
</body></html>`;

    // Use hidden iframe for print - shows print dialog as popup on same window
    const existingFrame = document.getElementById('print-frame');
    if (existingFrame) existingFrame.remove();

    const iframe = document.createElement('iframe');
    iframe.id = 'print-frame';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
    iframeDoc.open();
    iframeDoc.write(html);
    iframeDoc.close();

    // Wait for content to render then print
    setTimeout(() => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch (e) {
        window.print();
      }
    }, 500);
  }

  // Close export menu on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (exportRef.current && !exportRef.current.contains(e.target)) {
        setShowExportMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute totals from orders
  const totals = orders.reduce(
    (acc, o) => ({
      order_qty: acc.order_qty + (parseInt(o.order_qty) || 0),
      total_tailor_cost: acc.total_tailor_cost + (parseFloat(o.total_tailor_cost) || 0),
      fob_total: acc.fob_total + (parseFloat(o.fob_total) || 0),
      cost_incure_value: acc.cost_incure_value + (parseFloat(o.cost_incure_value) || 0),
      profit_value: acc.profit_value + (parseFloat(o.profit_value) || 0),
    }),
    { order_qty: 0, total_tailor_cost: 0, fob_total: 0, cost_incure_value: 0, profit_value: 0 }
  );

  return (
    <div>
      {/* Header */}
      <div className="bg-white border-b border-[var(--zoho-border)] px-6 py-4 -mx-6 -mt-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-[var(--zoho-text)]">
              Investor Report - Order Details
            </h1>
            <span className="text-xs font-medium text-gray-500 bg-gray-100 rounded-full px-2.5 py-0.5">
              {selectedMonth}
            </span>
          </div>
          <div className="flex items-center gap-2 print-hide">
            <Link
              to="/investor-orders/master-book"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-300 px-3 py-2 rounded-md hover:bg-gray-50 transition-colors"
            >
              <HiOutlineBookOpen className="w-4 h-4" />
              Master Book
            </Link>
            <Link
              to="/investor-orders/partners"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-300 px-3 py-2 rounded-md hover:bg-gray-50 transition-colors"
            >
              <HiOutlineUserGroup className="w-4 h-4" />
              Partners
            </Link>
            <div className="relative" ref={exportRef}>
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-300 px-3 py-2 rounded-md hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <HiOutlineDocumentArrowDown className="w-4 h-4" />
                Export
                <HiOutlineChevronDown className="w-3 h-3 ml-0.5" />
              </button>
              {showExportMenu && (
                <div className="absolute right-0 mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
                  <button
                    onClick={() => { setShowExportMenu(false); handleExportCSV(); }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer flex items-center gap-2"
                  >
                    <HiOutlineDocumentArrowDown className="w-4 h-4 text-green-600" />
                    Export as CSV
                  </button>
                  <button
                    onClick={handlePrint}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer flex items-center gap-2"
                  >
                    <HiOutlineDocumentArrowDown className="w-4 h-4 text-red-600" />
                    Print / PDF
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={handleRecalculate}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-300 px-3 py-2 rounded-md hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <HiOutlineArrowPath className="w-4 h-4" />
              Recalculate
            </button>
            <Link
              to={`/investor-orders/new?month=${encodeURIComponent(selectedMonth)}`}
              className="inline-flex items-center gap-1.5 bg-[#0071DC] hover:bg-[#005BB5] text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
            >
              <HiOutlinePlus className="w-4 h-4" />
              Add Order
            </Link>
          </div>
        </div>
      </div>

      {/* Month Selector */}
      <div className="bg-white rounded-t-lg border border-b-0 border-[var(--zoho-border)] px-4 py-3 print-hide">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-600">Month:</label>
          <select
            value={selectedMonth}
            onChange={(e) => selectMonth(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none cursor-pointer min-w-[140px]"
          >
            {months.map((m) => (
              <option key={m.month_year} value={m.month_year}>
                {m.month_year}
              </option>
            ))}
          </select>
          <button
            onClick={handleCreateNextMonth}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-300 px-3 py-1.5 rounded-md hover:bg-gray-50 transition-colors cursor-pointer"
            title="Create next month"
          >
            <HiOutlinePlus className="w-3.5 h-3.5" />
            Next Month
          </button>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-b-lg border border-[var(--zoho-border)] overflow-hidden">
        {loading ? (
          <div className="py-20">
            <LoadingSpinner size="lg" label="Loading orders..." />
          </div>
        ) : error ? (
          <div className="py-20 text-center">
            <HiOutlineExclamationTriangle className="w-12 h-12 text-red-300 mx-auto mb-3" />
            <p className="text-sm text-red-600 mb-3">{error}</p>
            <button onClick={() => fetchOrders(selectedMonth)} className="text-sm text-[#0071DC] hover:underline cursor-pointer">
              Try again
            </button>
          </div>
        ) : orders.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-sm text-gray-500 mb-3">No orders for {selectedMonth}</p>
            <Link
              to={`/investor-orders/new?month=${encodeURIComponent(selectedMonth)}`}
              className="text-sm text-[#0071DC] hover:underline"
            >
              Add first order
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">S.No</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Buyer</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Style</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Color</th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Qty</th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Tailor Rate</th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Tailor</th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">FOB</th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Cost Incure</th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Profit</th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold text-[#0071DC] uppercase tracking-wider border-l border-blue-100">FOB Total</th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold text-[#0071DC] uppercase tracking-wider">Cost Value</th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold text-[#0071DC] uppercase tracking-wider">Profit Value</th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">%</th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider w-20 print-hide">Actions</th>
                </tr>
                <tr className="bg-blue-50/50 border-b border-blue-100">
                  <th colSpan="11" className="px-3 py-1 text-left text-[10px] text-gray-400 uppercase">Per Unit</th>
                  <th colSpan="3" className="px-3 py-1 text-center text-[10px] text-blue-500 uppercase border-l border-blue-100 font-semibold">CMP (Cut Make & Pack)</th>
                  <th colSpan="2"></th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order, index) => (
                  <tr
                    key={order.id}
                    className={`border-b border-gray-100 transition-colors ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'
                    } hover:bg-blue-50/30`}
                  >
                    <td className="px-3 py-2.5 text-gray-500 font-medium">{index + 1}</td>
                    <td className="px-3 py-2.5 text-gray-900 font-medium">{order.buyer}</td>
                    <td className="px-3 py-2.5 text-gray-700">{order.style}</td>
                    <td className="px-3 py-2.5 text-gray-600 max-w-[150px] truncate">{order.description}</td>
                    <td className="px-3 py-2.5 text-gray-600">{order.color}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-gray-900">{(parseInt(order.order_qty) || 0).toLocaleString('en-IN')}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-gray-700">{formatNum(order.tailor_rate)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-gray-700">{formatINR(order.total_tailor_cost)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-gray-700">{formatNum(order.fob)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-gray-700">{formatNum(order.cost_incure)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-medium text-green-700">{formatNum(order.profit)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-medium text-gray-900 border-l border-blue-50">{formatINR(order.fob_total)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-gray-700">{formatINR(order.cost_incure_value)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-medium text-green-700">{formatINR(order.profit_value)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-gray-500">{formatPct(order.profit_percentage)}</td>
                    <td className="px-3 py-2.5 text-center print-hide">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/investor-orders/${order.id}/edit?month=${encodeURIComponent(selectedMonth)}`); }}
                          className="p-1 text-gray-400 hover:text-blue-600 transition-colors cursor-pointer"
                          title="Edit"
                        >
                          <HiOutlinePencilSquare className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(order.id); }}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
                          title="Delete"
                        >
                          <HiOutlineTrash className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {/* Totals Row */}
                <tr className="bg-gray-100 border-t-2 border-gray-300 font-semibold">
                  <td colSpan="5" className="px-3 py-3 text-gray-700 uppercase text-xs">Totals</td>
                  <td className="px-3 py-3 text-right tabular-nums text-gray-900">{totals.order_qty.toLocaleString('en-IN')}</td>
                  <td className="px-3 py-3"></td>
                  <td className="px-3 py-3 text-right tabular-nums">{formatINR(totals.total_tailor_cost)}</td>
                  <td colSpan="3" className="px-3 py-3"></td>
                  <td className="px-3 py-3 text-right tabular-nums border-l border-blue-100">{formatINR(totals.fob_total)}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{formatINR(totals.cost_incure_value)}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-green-700">{formatINR(totals.profit_value)}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-gray-700">
                    {totals.fob_total > 0 ? ((totals.profit_value / totals.fob_total) * 100).toFixed(1) + '%' : '0.0%'}
                  </td>
                  <td className="px-3 py-3 print-hide"></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Summary Section */}
      {summary && !loading && (
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue & Profit Summary */}
          <div className="bg-white rounded-lg border border-[var(--zoho-border)] p-5">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Monthly Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Revenue (FOB Total)</span>
                <span className="text-sm font-semibold text-gray-900 tabular-nums">{formatINR(summary.revenue)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Gross Profit</span>
                <span className={`text-sm font-semibold tabular-nums ${parseFloat(summary.gross_profit) >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                  {formatINR(summary.gross_profit)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Gross Profit %</span>
                <span className="text-sm font-semibold text-gray-700 tabular-nums">{formatPct(summary.gross_profit_percentage)}</span>
              </div>
              <hr className="border-gray-200" />
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Fix Cost</span>
                <span className="text-sm font-semibold text-red-600 tabular-nums">{formatINR(summary.total_fix_cost)}</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-gray-200">
                <span className="text-sm font-semibold text-gray-700">Net Profit</span>
                <span className={`text-base font-bold tabular-nums ${parseFloat(summary.net_profit) >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                  {formatINR(summary.net_profit)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Net Profit %</span>
                <span className="text-sm font-semibold text-gray-700 tabular-nums">{formatPct(summary.net_profit_percentage)}</span>
              </div>
            </div>
          </div>

          {/* Fix Costs Breakdown (Editable) */}
          <div className="bg-white rounded-lg border border-[var(--zoho-border)] p-5">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Fix Costs Breakdown</h3>
            <div className="space-y-2">
              {[
                { label: 'Building Rent', key: 'building_rent' },
                { label: 'Mechanic', key: 'mechanic' },
                { label: 'Worker Salary', key: 'worker_salary' },
                { label: 'Supervisor', key: 'supervisor' },
                { label: 'Merchant', key: 'merchant' },
                { label: 'House Keeping', key: 'house_keeping' },
                { label: 'Water & Sewage', key: 'water_sewage' },
                { label: 'Office Expenses', key: 'office_expenses' },
                { label: 'Petrol', key: 'petrol' },
                { label: 'Electricity', key: 'electricity' },
              ].map(({ label, key }) => (
                <div key={key} className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{label}</span>
                  <input
                    type="number"
                    step="0.01"
                    value={summary[key] ?? ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSummary((prev) => ({ ...prev, [key]: val === '' ? 0 : parseFloat(val) }));
                    }}
                    onBlur={async () => {
                      try {
                        await investorOrderApi.upsertSummary({ ...summary, month_year: selectedMonth });
                        // Recalculate after saving fix cost change
                        await investorOrderApi.recalculate(selectedMonth);
                        fetchOrders(selectedMonth);
                      } catch {
                        toast.error('Failed to save fix cost');
                      }
                    }}
                    className="w-28 text-right text-sm tabular-nums text-gray-800 px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-300 focus:border-blue-400"
                  />
                </div>
              ))}
              <div className="flex justify-between items-center pt-2 border-t border-gray-200 mt-2">
                <span className="text-sm font-semibold text-gray-700">Total Fix Cost</span>
                <span className="text-sm font-bold text-red-600 tabular-nums">{formatINR(summary.total_fix_cost)}</span>
              </div>
            </div>
          </div>

          {/* Partner Distribution */}
          <div className="bg-white rounded-lg border border-[var(--zoho-border)] p-5">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Partner Distribution</h3>
            <div className="space-y-3">
              {partners.map((p) => {
                // Dynamically get partner share: try first-name key then fallback to ratio * net_profit
                const firstName = p.partner_name?.split(' ')[0]?.toLowerCase() || '';
                const knownKeys = { jitender: 'jitender_share', pawan: 'pawan_share', sunil: 'sunil_share', vijay: 'vijay_share' };
                const key = knownKeys[firstName];
                let share = key ? (parseFloat(summary[key]) || 0) : 0;
                if (share === 0 && summary.net_profit) {
                  share = parseFloat(summary.net_profit) * (parseFloat(p.ratio) || 0);
                }

                return (
                  <div key={p.id} className="flex items-center justify-between">
                    <div>
                      <Link
                        to={`/investor-orders/partners/${p.id}`}
                        className="text-sm font-medium text-[#3a7bbf] hover:text-[#2a5d8f] hover:underline transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {p.partner_name}
                      </Link>
                      <span className="text-xs text-gray-400 ml-2">({(parseFloat(p.ratio) * 100).toFixed(0)}%)</span>
                      <div className="text-[10px] text-gray-400">
                        {p.partner_type === 'Time' ? 'Time Investment' : `Inv: ${formatINR(p.investment_amount)}`}
                      </div>
                    </div>
                    <span className={`text-sm font-semibold tabular-nums ${parseFloat(share) >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                      {formatINR(share)}
                    </span>
                  </div>
                );
              })}
              <hr className="border-gray-200" />
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-gray-700">Total Net Profit</span>
                <span className={`text-base font-bold tabular-nums ${parseFloat(summary.net_profit) >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                  {formatINR(summary.net_profit)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
