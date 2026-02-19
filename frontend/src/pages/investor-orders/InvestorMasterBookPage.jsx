import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  HiOutlineArrowLeft,
  HiOutlineDocumentArrowDown,
  HiOutlineExclamationTriangle,
  HiOutlineChevronDown,
  HiOutlineFunnel,
} from 'react-icons/hi2';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { investorOrderApi } from '../../api/investorOrder.api';
import { formatINR } from '../../utils/currency';
import LoadingSpinner from '../../components/feedback/LoadingSpinner';

// ── Helpers ──────────────────────────────────────────────────────

const MONTH_ORDER = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function parseMonthYear(my) {
  if (!my) return { month: '', monthIdx: -1, year: 0 };
  const parts = my.split("'");
  const month = parts[0] || '';
  const year = parseInt('20' + (parts[1] || '00'));
  const monthIdx = MONTH_ORDER.indexOf(month);
  return { month, monthIdx, year };
}

// Date range presets
const now = new Date();
const currentYear = now.getFullYear();
const currentMonth = now.getMonth(); // 0-based
// Indian Financial Year: Apr-Mar
const fyStartYear = currentMonth >= 3 ? currentYear : currentYear - 1;

const DATE_PRESETS = [
  { label: 'All', value: 'all' },
  { label: `FY ${fyStartYear}-${String(fyStartYear + 1).slice(-2)}`, value: 'this_fy' },
  { label: 'This Year', value: 'this_year' },
  { label: 'Previous Year', value: 'last_year' },
  { label: 'Last 3 Months', value: 'last_3' },
  { label: 'This Month', value: 'this_month' },
  { label: 'Q1 (Apr-Jun)', value: 'q1_fy' },
  { label: 'Q2 (Jul-Sep)', value: 'q2_fy' },
  { label: 'Q3 (Oct-Dec)', value: 'q3_fy' },
  { label: 'Q4 (Jan-Mar)', value: 'q4_fy' },
  { label: `FY ${fyStartYear - 1}-${String(fyStartYear).slice(-2)}`, value: 'last_fy' },
];

function filterSummaries(allSummaries, preset) {
  if (preset === 'all') return allSummaries;
  return allSummaries.filter((s) => {
    const { monthIdx, year } = parseMonthYear(s.month_year);
    if (monthIdx === -1) return false;
    if (preset === 'this_year') return year === currentYear;
    if (preset === 'last_year') return year === currentYear - 1;
    if (preset === 'this_month') {
      return year === currentYear && monthIdx === currentMonth;
    }
    if (preset === 'last_3') {
      const sDate = new Date(year, monthIdx, 1);
      const threeAgo = new Date(currentYear, currentMonth - 2, 1);
      return sDate >= threeAgo;
    }
    if (preset === 'last_12') {
      const sDate = new Date(year, monthIdx, 1);
      const twelveAgo = new Date(currentYear, currentMonth - 11, 1);
      return sDate >= twelveAgo;
    }
    if (preset === 'this_fy') {
      const start = new Date(fyStartYear, 3, 1); // Apr
      const end = new Date(fyStartYear + 1, 2, 28); // Mar
      const sDate = new Date(year, monthIdx, 1);
      return sDate >= start && sDate <= end;
    }
    if (preset === 'last_fy') {
      const start = new Date(fyStartYear - 1, 3, 1);
      const end = new Date(fyStartYear, 2, 28);
      const sDate = new Date(year, monthIdx, 1);
      return sDate >= start && sDate <= end;
    }
    // FY Quarter filters (Indian FY: Apr-Mar)
    if (preset === 'q1_fy') {
      // Q1: Apr-Jun of fyStartYear
      return year === fyStartYear && [3, 4, 5].includes(monthIdx);
    }
    if (preset === 'q2_fy') {
      // Q2: Jul-Sep of fyStartYear
      return year === fyStartYear && [6, 7, 8].includes(monthIdx);
    }
    if (preset === 'q3_fy') {
      // Q3: Oct-Dec of fyStartYear
      return year === fyStartYear && [9, 10, 11].includes(monthIdx);
    }
    if (preset === 'q4_fy') {
      // Q4: Jan-Mar of fyStartYear+1
      return year === (fyStartYear + 1) && [0, 1, 2].includes(monthIdx);
    }
    // Q1-Q4 for a given year (calendar quarters)
    const qMatch = preset.match(/^q(\d)_(\d{4})$/);
    if (qMatch) {
      const q = parseInt(qMatch[1]);
      const qYear = parseInt(qMatch[2]);
      if (year !== qYear) return false;
      const qMonths = [
        [0, 1, 2],   // Q1: Jan-Mar
        [3, 4, 5],   // Q2: Apr-Jun
        [6, 7, 8],   // Q3: Jul-Sep
        [9, 10, 11],  // Q4: Oct-Dec
      ];
      return qMonths[q - 1]?.includes(monthIdx);
    }
    return true;
  });
}

function formatPct(val) {
  const n = parseFloat(val) || 0;
  return (n * 100).toFixed(1) + '%';
}

function formatCompact(val) {
  const n = Number(val) || 0;
  if (Math.abs(n) >= 100000) {
    return (n / 100000).toFixed(1) + 'L';
  }
  if (Math.abs(n) >= 1000) {
    return (n / 1000).toFixed(0) + 'K';
  }
  return n.toFixed(0);
}

const CHART_COLORS = ['#5C8DB8', '#4DB6AC', '#D4A054', '#E57373', '#9B8EC4', '#6BACB8'];
// Dynamic color lookup by partner name - uses index-based fallback for any partner
const PARTNER_COLOR_LIST = ['#5C8DB8', '#4DB6AC', '#D4A054', '#9B8EC4', '#E57373', '#6BACB8', '#F06292', '#AED581'];
function getPartnerColor(partnerName, index) {
  const staticMap = {
    Jitender: '#5C8DB8',
    Pawan: '#4DB6AC',
    'Sunil Ji': '#D4A054',
    Vijay: '#9B8EC4',
  };
  return staticMap[partnerName] || PARTNER_COLOR_LIST[index % PARTNER_COLOR_LIST.length];
}

// Helper to get a partner's share from a summary object.
// Falls back to computing share = net_profit * ratio if the named column is 0.
function getPartnerShareFromSummary(partner, summaryObj) {
  // Use first word of name for lookup (e.g. "Jitender Kaliraman" → "jitender")
  const firstName = partner.partner_name?.split(' ')[0]?.toLowerCase() || '';
  const fullKey = partner.partner_name?.toLowerCase().replace(/\s+/g, '_') + '_share';
  // Try full name key first, then first-name key, then known mappings
  const knownKeys = { jitender: 'jitender_share', pawan: 'pawan_share', sunil: 'sunil_share', vijay: 'vijay_share', sunil_ji: 'sunil_share' };
  const key = summaryObj[fullKey] !== undefined ? fullKey : (knownKeys[firstName] || null);
  const val = key ? (parseFloat(summaryObj[key]) || 0) : 0;
  if (val !== 0) return val;
  // Fallback: compute from net_profit * ratio
  const np = parseFloat(summaryObj.net_profit) || 0;
  const ratio = parseFloat(partner.ratio) || 0;
  return np * ratio;
}

// ── Custom tooltip ──────────────────────────────────────────────

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs">
      <p className="font-semibold text-gray-700 mb-1.5">{label}</p>
      {payload.map((entry, idx) => (
        <div key={idx} className="flex items-center gap-2 py-0.5">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-gray-600">{entry.name}:</span>
          <span className="font-medium text-gray-900">{formatINR(entry.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────

export default function InvestorMasterBookPage() {
  const navigate = useNavigate();
  const exportRef = useRef(null);

  const [allSummaries, setAllSummaries] = useState([]);
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [dateFilter, setDateFilter] = useState('all');
  const [distFilter, setDistFilter] = useState('this_fy');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryRes, partnerRes] = await Promise.all([
        investorOrderApi.listSummaries(),
        investorOrderApi.getPartners(),
      ]);
      setAllSummaries(summaryRes.data.data || []);
      setPartners(partnerRes.data.data || []);
    } catch (err) {
      if (err.response?.status !== 401) {
        setError('Failed to load master book data.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  // Apply date filter
  const summaries = useMemo(() => filterSummaries(allSummaries, dateFilter), [allSummaries, dateFilter]);

  // Separate filter for Monthly Partner Distribution grid
  const distSummaries = useMemo(() => filterSummaries(allSummaries, distFilter), [allSummaries, distFilter]);

  // Compute grand totals
  const grandTotals = summaries.reduce(
    (acc, s) => ({
      total_qty: acc.total_qty + (parseInt(s.total_qty) || 0),
      revenue: acc.revenue + (parseFloat(s.revenue) || 0),
      gross_profit: acc.gross_profit + (parseFloat(s.gross_profit) || 0),
      total_fix_cost: acc.total_fix_cost + (parseFloat(s.total_fix_cost) || 0),
      net_profit: acc.net_profit + (parseFloat(s.net_profit) || 0),
      jitender_share: acc.jitender_share + (parseFloat(s.jitender_share) || 0),
      pawan_share: acc.pawan_share + (parseFloat(s.pawan_share) || 0),
      sunil_share: acc.sunil_share + (parseFloat(s.sunil_share) || 0),
      vijay_share: acc.vijay_share + (parseFloat(s.vijay_share) || 0),
    }),
    { total_qty: 0, revenue: 0, gross_profit: 0, total_fix_cost: 0, net_profit: 0, jitender_share: 0, pawan_share: 0, sunil_share: 0, vijay_share: 0 }
  );

  // Compute partner totals (using helper that falls back to ratio * net_profit)
  function getPartnerTotal(partner) {
    return summaries.reduce((sum, s) => sum + getPartnerShareFromSummary(partner, s), 0);
  }

  // Chart data
  const chartData = summaries.map((s) => ({
    name: s.month_year,
    Revenue: parseFloat(s.revenue) || 0,
    'Gross Profit': parseFloat(s.gross_profit) || 0,
    'Net Profit': parseFloat(s.net_profit) || 0,
    'Fix Cost': parseFloat(s.total_fix_cost) || 0,
    Qty: parseInt(s.total_qty) || 0,
  }));

  // Partner pie data — shows ownership RATIO (investment percentage) from profile
  const partnerPieData = partners.map((p, idx) => ({
    name: p.partner_name,
    value: parseFloat(p.ratio) * 100 || 0,
    color: getPartnerColor(p.partner_name, idx),
  }));

  // Export Master Book CSV
  function handleExportCSV() {
    setShowExportMenu(false);
    if (!summaries.length) return;
    const partnerHeaders = partners.map((p) => p.partner_name);
    const headers = ['Month', 'Qty', 'Revenue', 'Gross Profit', 'Fix Cost', 'Net Profit', 'GP%', 'NP%', ...partnerHeaders];
    const rows = summaries.map((s) => [
      s.month_year, s.total_qty, s.revenue, s.gross_profit, s.total_fix_cost, s.net_profit,
      formatPct(s.gross_profit_percentage), formatPct(s.net_profit_percentage),
      ...partners.map((p) => getPartnerShareFromSummary(p, s)),
    ]);
    // Add total row with computed GP% and NP%
    const gpPct = grandTotals.revenue > 0 ? formatPct(grandTotals.gross_profit / grandTotals.revenue) : '0.0%';
    const npPct = grandTotals.revenue > 0 ? formatPct(grandTotals.net_profit / grandTotals.revenue) : '0.0%';
    rows.push([
      'TOTAL', grandTotals.total_qty, grandTotals.revenue, grandTotals.gross_profit,
      grandTotals.total_fix_cost, grandTotals.net_profit, gpPct, npPct,
      ...partners.map((p) => getPartnerTotal(p)),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'investor-master-book.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  // Print/PDF - opens a clean print popup with table + summary cards
  function handlePrint() {
    setShowExportMenu(false);

    const filterLabel = dateFilter !== 'all' ? (DATE_PRESETS.find((p) => p.value === dateFilter)?.label || '') : 'All';

    // Build summary card rows
    const summaryCards = [
      { label: 'Total Qty', value: grandTotals.total_qty.toLocaleString('en-IN') },
      { label: 'Total Revenue', value: formatINR(grandTotals.revenue) },
      { label: 'Gross Profit', value: formatINR(grandTotals.gross_profit) },
      { label: 'Total Fix Cost', value: formatINR(grandTotals.total_fix_cost) },
      { label: 'Net Profit', value: formatINR(grandTotals.net_profit) },
    ];

    // Build table rows
    const tableRows = summaries
      .map(
        (s) => `
      <tr>
        <td class="bold blue">${s.month_year}</td>
        <td class="num">${(parseInt(s.total_qty) || 0).toLocaleString('en-IN')}</td>
        <td class="num">${formatINR(s.revenue)}</td>
        <td class="num ${parseFloat(s.gross_profit) >= 0 ? 'profit' : 'red'}">${formatINR(s.gross_profit)}</td>
        <td class="num">${formatPct(s.gross_profit_percentage)}</td>
        <td class="num red">${formatINR(s.total_fix_cost)}</td>
        <td class="num bold ${parseFloat(s.net_profit) >= 0 ? 'profit' : 'red'}">${formatINR(s.net_profit)}</td>
        <td class="num">${formatPct(s.net_profit_percentage)}</td>
        ${partners.map((p) => `<td class="num">${formatINR(getPartnerShareFromSummary(p, s))}</td>`).join('')}
      </tr>`
      )
      .join('');

    // Partner summary — uses getPartnerTotal helper that falls back to ratio * net_profit
    const partnerSummary = partners
      .map((p) => {
        const totalShare = getPartnerTotal(p);
        return `<tr><td>${p.partner_name} (${(parseFloat(p.ratio) * 100).toFixed(0)}%)</td><td class="num bold ${totalShare >= 0 ? 'profit' : 'red'}">${formatINR(totalShare)}</td></tr>`;
      })
      .join('');

    const html = `<!DOCTYPE html>
<html><head><title>Investor Report - ${filterLabel}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; color: #111; padding: 24px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  h2 { font-size: 18px; margin-bottom: 4px; color: #000; }
  .subtitle { color: #444; font-size: 13px; margin-bottom: 16px; }
  .summary-row { display: flex; gap: 12px; margin-bottom: 16px; }
  .summary-item { flex: 1; border: 1px solid #bbb; border-radius: 4px; padding: 10px; }
  .summary-item .label { font-size: 11px; text-transform: uppercase; color: #333; font-weight: 700; }
  .summary-item .value { font-size: 16px; font-weight: 800; margin-top: 4px; font-variant-numeric: tabular-nums; color: #000; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th, td { padding: 6px 8px; border: 1px solid #ccc; text-align: left; white-space: nowrap; }
  th { background: #e8e8e8; font-size: 11px; text-transform: uppercase; font-weight: 700; color: #222; }
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  .profit { color: #0a7c2e; }
  .red { color: #b91c1c; }
  .blue { color: #005599; }
  .bold { font-weight: 800; }
  .totals-row td { background: #e0e0e0; font-weight: 800; border-top: 2px solid #666; }
  .partner-section { margin-top: 16px; }
  .partner-section h3 { font-size: 13px; font-weight: 700; margin-bottom: 8px; color: #000; }
  .partner-table { width: auto; min-width: 300px; }
  .partner-table td { border: none; padding: 4px 12px 4px 0; font-size: 12px; color: #111; }
  .partner-table .total td { border-top: 1px solid #666; font-weight: 800; padding-top: 6px; }
  @media print { body { padding: 10px; } @page { margin: 0.5cm; size: landscape; } }
</style></head><body>
<h2>Investor Report - Master Book</h2>
<p class="subtitle">Filter: ${filterLabel} &bull; ${summaries.length} month${summaries.length !== 1 ? 's' : ''} &bull; Generated on ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>

<div class="summary-row">
  ${summaryCards.map((c) => `<div class="summary-item"><div class="label">${c.label}</div><div class="value">${c.value}</div></div>`).join('')}
</div>

<table>
  <thead>
    <tr>
      <th>Month</th><th class="num">Qty</th><th class="num">Revenue</th><th class="num">Gross Profit</th><th class="num">GP%</th>
      <th class="num">Fix Cost</th><th class="num">Net Profit</th><th class="num">NP%</th>
      ${partners.map((p) => `<th class="num">${p.partner_name}</th>`).join('')}
    </tr>
  </thead>
  <tbody>
    ${tableRows}
    <tr class="totals-row">
      <td>Grand Total</td>
      <td class="num">${grandTotals.total_qty.toLocaleString('en-IN')}</td>
      <td class="num">${formatINR(grandTotals.revenue)}</td>
      <td class="num ${grandTotals.gross_profit >= 0 ? 'profit' : 'red'}">${formatINR(grandTotals.gross_profit)}</td>
      <td class="num">${grandTotals.revenue > 0 ? formatPct(grandTotals.gross_profit / grandTotals.revenue) : '0.0%'}</td>
      <td class="num red">${formatINR(grandTotals.total_fix_cost)}</td>
      <td class="num ${grandTotals.net_profit >= 0 ? 'profit' : 'red'}">${formatINR(grandTotals.net_profit)}</td>
      <td class="num">${grandTotals.revenue > 0 ? formatPct(grandTotals.net_profit / grandTotals.revenue) : '0.0%'}</td>
      ${partners.map((p) => `<td class="num">${formatINR(getPartnerTotal(p))}</td>`).join('')}
    </tr>
  </tbody>
</table>

<div class="partner-section">
  <h3>Partner Profit Summary</h3>
  <table class="partner-table">
    ${partnerSummary}
    <tr class="total"><td>Total Net Profit</td><td class="num bold">${formatINR(grandTotals.net_profit)}</td></tr>
  </table>
</div>

<div style="margin-top:24px; page-break-before:always;">
  <h3 style="font-size:14px;font-weight:700;margin-bottom:12px;color:#000;">Investor-wise Monthly Profit Breakdown</h3>
  ${partners.map((p) => {
    const partnerTotal = getPartnerTotal(p);
    const monthRows = summaries.map((s) => {
      const share = getPartnerShareFromSummary(p, s);
      return `<tr>
        <td class="bold blue">${s.month_year}</td>
        <td class="num">${formatINR(s.revenue)}</td>
        <td class="num ${parseFloat(s.net_profit) >= 0 ? 'profit' : 'red'}">${formatINR(s.net_profit)}</td>
        <td class="num ${share >= 0 ? 'profit' : 'red'}">${formatINR(share)}</td>
        <td class="num">${s.net_profit > 0 ? ((share / parseFloat(s.net_profit)) * 100).toFixed(1) + '%' : '—'}</td>
      </tr>`;
    }).join('');
    return `
    <div style="margin-bottom:20px; break-inside:avoid;">
      <div style="background:#f0f4ff;border-left:4px solid #0055aa;padding:8px 12px;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:13px;font-weight:700;color:#003388;">${p.partner_name}</span>
        <span style="font-size:11px;color:#555;">Share: ${(parseFloat(p.ratio || 0) * 100).toFixed(0)}% &nbsp;|&nbsp; Total Profit: <strong>${formatINR(partnerTotal)}</strong></span>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:11px;">
        <thead><tr style="background:#e8e8e8;">
          <th style="padding:5px 8px;text-align:left;border:1px solid #ccc;">Month</th>
          <th style="padding:5px 8px;text-align:right;border:1px solid #ccc;">Revenue</th>
          <th style="padding:5px 8px;text-align:right;border:1px solid #ccc;">Net Profit</th>
          <th style="padding:5px 8px;text-align:right;border:1px solid #ccc;">Share (₹)</th>
          <th style="padding:5px 8px;text-align:right;border:1px solid #ccc;">% of Profit</th>
        </tr></thead>
        <tbody>
          ${monthRows}
          <tr style="background:#e0e0e0;font-weight:800;border-top:2px solid #666;">
            <td style="padding:5px 8px;border:1px solid #ccc;">Total</td>
            <td style="padding:5px 8px;text-align:right;border:1px solid #ccc;">${formatINR(grandTotals.revenue)}</td>
            <td style="padding:5px 8px;text-align:right;border:1px solid #ccc;">${formatINR(grandTotals.net_profit)}</td>
            <td style="padding:5px 8px;text-align:right;border:1px solid #ccc;color:${partnerTotal >= 0 ? '#0a7c2e' : '#b91c1c'}">${formatINR(partnerTotal)}</td>
            <td style="padding:5px 8px;text-align:right;border:1px solid #ccc;">${grandTotals.net_profit > 0 ? ((partnerTotal / grandTotals.net_profit) * 100).toFixed(1) + '%' : '—'}</td>
          </tr>
        </tbody>
      </table>
    </div>`;
  }).join('')}
</div>

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

  return (
    <div>
      {/* Header */}
      <div className="bg-white border-b border-[var(--zoho-border)] px-6 py-4 -mx-6 -mt-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/investor-orders')}
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors cursor-pointer print-hide"
            >
              <HiOutlineArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-semibold text-[var(--zoho-text)]">Investor Report</h1>
            <span className="text-xs font-medium text-gray-500 bg-gray-100 rounded-full px-2.5 py-0.5">
              {summaries.length} month{summaries.length !== 1 ? 's' : ''}
              {dateFilter !== 'all' ? ` · ${DATE_PRESETS.find(p => p.value === dateFilter)?.label || ''}` : ''}
            </span>
          </div>
          <div className="relative print-hide" ref={exportRef}>
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
                  onClick={handleExportCSV}
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
        </div>
      </div>

      {/* Date Range Filter Bar */}
      <div className="bg-white rounded-lg border border-[var(--zoho-border)] px-4 py-3 mb-4 print-hide">
        <div className="flex items-center gap-2 flex-wrap">
          <HiOutlineFunnel className="w-4 h-4 text-gray-400 flex-shrink-0" />
          {DATE_PRESETS.map((p) => (
            <button
              key={p.value}
              onClick={() => setDateFilter(p.value)}
              className={`px-3 py-1 text-xs font-medium rounded-full transition-colors cursor-pointer ${
                dateFilter === p.value
                  ? 'bg-[#0071DC] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-20">
          <LoadingSpinner size="lg" label="Loading master book..." />
        </div>
      ) : error ? (
        <div className="py-20 text-center">
          <HiOutlineExclamationTriangle className="w-12 h-12 text-red-300 mx-auto mb-3" />
          <p className="text-sm text-red-600 mb-3">{error}</p>
          <button onClick={fetchData} className="text-sm text-[#0071DC] hover:underline cursor-pointer">
            Try again
          </button>
        </div>
      ) : (
        <>
          {/* Grand Total Summary Cards */}
          <div className="grid grid-cols-5 gap-4 mb-6">
            {[
              { label: 'Total Qty', value: grandTotals.total_qty.toLocaleString('en-IN'), color: '#7B8794' },
              { label: 'Total Revenue', value: formatINR(grandTotals.revenue), color: '#5C8DB8' },
              { label: 'Gross Profit', value: formatINR(grandTotals.gross_profit), color: '#4DB6AC' },
              { label: 'Total Fix Cost', value: formatINR(grandTotals.total_fix_cost), color: '#E57373' },
              { label: 'Net Profit', value: formatINR(grandTotals.net_profit), color: grandTotals.net_profit >= 0 ? '#4DB6AC' : '#E57373' },
            ].map((card) => (
              <div key={card.label} className="bg-white rounded-lg border border-[var(--zoho-border)] p-4">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">{card.label}</p>
                <p className="text-lg font-bold tabular-nums" style={{ color: card.color }}>{card.value}</p>
              </div>
            ))}
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Revenue & Profit Trend */}
            <div className="bg-white rounded-lg border border-[var(--zoho-border)] p-5">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Revenue & Profit Trend</h3>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={formatCompact} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="Revenue" stroke="#5C8DB8" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="Gross Profit" stroke="#4DB6AC" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="Net Profit" stroke="#D4A054" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Revenue vs Fix Cost Bar */}
            <div className="bg-white rounded-lg border border-[var(--zoho-border)] p-5">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Revenue vs Fix Cost</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={formatCompact} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Revenue" fill="#5C8DB8" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Fix Cost" fill="#E57373" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Partner Distribution Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="bg-white rounded-lg border border-[var(--zoho-border)] p-5">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Partner Ratio (Ownership)</h3>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={partnerPieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    innerRadius={50}
                    label={({ name, value }) => `${name.charAt(0)}. ${name} (${value.toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {partnerPieData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val) => `${val.toFixed(1)}%`} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Partner Totals Cards */}
            <div className="lg:col-span-2 bg-white rounded-lg border border-[var(--zoho-border)] p-5">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Partner Profit Summary</h3>
              <div className="grid grid-cols-2 gap-4">
                {partners.map((p, idx) => {
                  const totalShare = getPartnerTotal(p);

                  return (
                    <div key={p.id} className="border border-gray-100 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getPartnerColor(p.partner_name, idx) }} />
                        <Link
                          to={`/investor-orders/partners/${p.id}`}
                          className="text-sm font-semibold text-[#3a7bbf] hover:text-[#2a5d8f] hover:underline transition-colors"
                        >
                          {p.partner_name}
                        </Link>
                        <span className="text-xs text-gray-400">({(parseFloat(p.ratio) * 100).toFixed(0)}%)</span>
                      </div>
                      <p className="text-[11px] text-gray-400 mb-1">
                        {p.partner_type === 'Time' ? 'Time Investment' : `Investment: ${formatINR(p.investment_amount)}`}
                      </p>
                      <p className={`text-lg font-bold tabular-nums ${totalShare >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                        {formatINR(totalShare)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Monthly P&L Table */}
          <div className="bg-white rounded-lg border border-[var(--zoho-border)] overflow-hidden mb-6">
            <div className="px-5 py-3 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700">Monthly Profit & Loss</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-gray-200" style={{ background: '#f8f9fa' }}>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Month</th>
                    <th className="px-3 py-2.5 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Qty</th>
                    <th className="px-3 py-2.5 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Revenue</th>
                    <th className="px-3 py-2.5 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Gross Profit</th>
                    <th className="px-2 py-2.5 text-right text-[11px] font-semibold text-gray-400 uppercase tracking-wide">GP%</th>
                    <th className="px-3 py-2.5 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Fix Cost</th>
                    <th className="px-3 py-2.5 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Net Profit</th>
                    <th className="px-2 py-2.5 text-right text-[11px] font-semibold text-gray-400 uppercase tracking-wide">NP%</th>
                  </tr>
                </thead>
                <tbody>
                  {summaries.map((s, index) => (
                    <tr
                      key={s.id}
                      onClick={() => navigate(`/investor-orders?month=${encodeURIComponent(s.month_year)}`)}
                      className={`border-b border-gray-50 cursor-pointer transition-colors ${
                        index % 2 === 0 ? 'bg-white' : 'bg-[#fafbfc]'
                      } hover:bg-blue-50/40`}
                    >
                      <td className="px-4 py-2 font-medium text-[#3a7bbf]">{s.month_year}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-gray-800">{(parseInt(s.total_qty) || 0).toLocaleString('en-IN')}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-gray-800">{formatINR(s.revenue)}</td>
                      <td className={`px-3 py-2 text-right tabular-nums font-medium ${parseFloat(s.gross_profit) >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                        {formatINR(s.gross_profit)}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums text-gray-400 text-xs">{formatPct(s.gross_profit_percentage)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-red-500">{formatINR(s.total_fix_cost)}</td>
                      <td className={`px-3 py-2 text-right tabular-nums font-semibold ${parseFloat(s.net_profit) >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                        {formatINR(s.net_profit)}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums text-gray-400 text-xs">{formatPct(s.net_profit_percentage)}</td>
                    </tr>
                  ))}

                  {/* Grand Total Row */}
                  <tr className="border-t-2 border-gray-200 font-bold" style={{ background: '#f3f4f6' }}>
                    <td className="px-4 py-2.5 text-gray-700 text-xs uppercase font-bold">Total</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-gray-900">{grandTotals.total_qty.toLocaleString('en-IN')}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-gray-900">{formatINR(grandTotals.revenue)}</td>
                    <td className={`px-3 py-2.5 text-right tabular-nums ${grandTotals.gross_profit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                      {formatINR(grandTotals.gross_profit)}
                    </td>
                    <td className="px-2 py-2.5 text-right tabular-nums text-gray-400 text-xs">
                      {grandTotals.revenue > 0 ? formatPct(grandTotals.gross_profit / grandTotals.revenue) : '0.0%'}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-red-500">{formatINR(grandTotals.total_fix_cost)}</td>
                    <td className={`px-3 py-2.5 text-right tabular-nums ${grandTotals.net_profit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                      {formatINR(grandTotals.net_profit)}
                    </td>
                    <td className="px-2 py-2.5 text-right tabular-nums text-gray-400 text-xs">
                      {grandTotals.revenue > 0 ? formatPct(grandTotals.net_profit / grandTotals.revenue) : '0.0%'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Monthly Partner Distribution Grid */}
          <div className="bg-white rounded-lg border border-[var(--zoho-border)] overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-sm font-semibold text-gray-700">
                Monthly Partner Distribution
                <span className="ml-2 text-xs font-normal text-gray-400">({distSummaries.length} months)</span>
              </h3>
              <div className="flex items-center gap-1 flex-wrap">
                {[
                  { label: 'This FY', value: 'this_fy' },
                  { label: 'Last FY', value: 'last_fy' },
                  { label: 'Last 3M', value: 'last_3' },
                  { label: 'This Year', value: 'this_year' },
                  { label: 'Q1', value: 'q1_fy' },
                  { label: 'Q2', value: 'q2_fy' },
                  { label: 'Q3', value: 'q3_fy' },
                  { label: 'Q4', value: 'q4_fy' },
                  { label: 'All', value: 'all' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setDistFilter(opt.value)}
                    className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                      distFilter === opt.value
                        ? 'bg-[#0071DC] text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-0">
              {distSummaries.map((s, index) => {
                const np = parseFloat(s.net_profit) || 0;
                return (
                  <div
                    key={s.id}
                    onClick={() => navigate(`/investor-orders?month=${encodeURIComponent(s.month_year)}`)}
                    className="p-3.5 border-b border-r border-gray-100 cursor-pointer hover:bg-blue-50/30 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-[#3a7bbf]">{s.month_year}</span>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${np >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                        {formatPct(s.net_profit_percentage)}
                      </span>
                    </div>
                    <div className={`text-sm font-bold tabular-nums mb-2 ${np >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                      {formatINR(s.net_profit)}
                    </div>
                    <div className="space-y-0.5">
                      {partners.map((p) => {
                        const share = getPartnerShareFromSummary(p, s);
                        return (
                          <div key={p.id} className="flex items-center justify-between">
                            <div className="flex items-center gap-1">
                              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: getPartnerColor(p.partner_name, partners.indexOf(p)) }} />
                              <span className="text-[10px] text-gray-500 truncate">{p.partner_name}</span>
                            </div>
                            <span className={`text-[10px] tabular-nums font-medium ${share >= 0 ? 'text-gray-700' : 'text-red-500'}`}>
                              {formatINR(share)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
