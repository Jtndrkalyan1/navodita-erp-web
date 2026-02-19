import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  HiOutlinePlus, HiOutlineMagnifyingGlass, HiOutlineChevronLeft,
  HiOutlineChevronRight, HiOutlineDocumentText, HiOutlineCheckCircle,
  HiOutlineClock, HiOutlineXCircle,
} from 'react-icons/hi2';
import { offerLetterApi } from '../../api/offerLetter.api';

function formatIndianCurrency(value) {
  if (value == null || isNaN(value)) return '\u20B90.00';
  const num = Number(value);
  const abs = Math.abs(num);
  const [intPart, decPart] = abs.toFixed(2).split('.');
  let result = '';
  if (intPart.length <= 3) { result = intPart; }
  else {
    result = intPart.slice(-3);
    let remaining = intPart.slice(0, -3);
    while (remaining.length > 2) { result = remaining.slice(-2) + ',' + result; remaining = remaining.slice(0, -2); }
    if (remaining.length > 0) result = remaining + ',' + result;
  }
  return `${num < 0 ? '-' : ''}\u20B9${result}.${decPart}`;
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
  try { return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return '--'; }
}

function StatusBadge({ status }) {
  const styles = {
    Draft: 'bg-gray-100 text-gray-700 border-gray-200',
    Sent: 'bg-blue-50 text-blue-700 border-blue-200',
    Accepted: 'bg-green-50 text-green-700 border-green-200',
    Declined: 'bg-red-50 text-red-700 border-red-200',
    Expired: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${styles[status] || styles.Draft}`}>
      {status || 'Draft'}
    </span>
  );
}

export default function OfferLettersPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [page, setPage] = useState(parseInt(searchParams.get('page')) || 1);
  const [limit] = useState(50);

  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await offerLetterApi.list({ page, limit, search: debouncedSearch || undefined, sort_order: 'desc' });
      setData(response.data?.data || []);
      setTotal(response.data?.total || 0);
    } catch { setData([]); setTotal(0); }
    finally { setLoading(false); }
  }, [page, limit, debouncedSearch]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const allData = data;
  const stats = {
    total: total,
    draft: allData.filter(d => d.status === 'Draft').length,
    sent: allData.filter(d => d.status === 'Sent').length,
    accepted: allData.filter(d => d.status === 'Accepted').length,
  };
  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#333]">Offer Letters</h1>
          <p className="text-sm text-[#6B7280] mt-1">Manage candidate offer letters</p>
        </div>
        <Link to="/offer-letters/new" className="inline-flex items-center gap-2 px-4 py-2 bg-[#0071DC] text-white text-sm font-medium rounded-lg hover:bg-[#005BB5] transition-colors">
          <HiOutlinePlus className="w-4 h-4" /> New Offer Letter
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <SummaryCard title="Total" value={stats.total} icon={HiOutlineDocumentText} color="bg-blue-500" />
        <SummaryCard title="Draft" value={stats.draft} icon={HiOutlineClock} color="bg-gray-500" />
        <SummaryCard title="Sent" value={stats.sent} icon={HiOutlineDocumentText} color="bg-yellow-500" />
        <SummaryCard title="Accepted" value={stats.accepted} icon={HiOutlineCheckCircle} color="bg-green-500" />
      </div>

      <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm mb-4">
        <div className="p-4">
          <div className="relative max-w-md">
            <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
            <input type="text" placeholder="Search by name, number, or position..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-t border-b border-[#E5E7EB] bg-[#F9FAFB]">
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Offer #</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Candidate</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Position</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Department</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">CTC</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Offer Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {loading ? (
                <tr><td colSpan={7} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-3 border-[#0071DC] border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm text-[#6B7280]">Loading offer letters...</span>
                  </div>
                </td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={7} className="py-16 text-center">
                  <HiOutlineDocumentText className="w-12 h-12 text-[#D1D5DB] mx-auto mb-2" />
                  <p className="text-[#6B7280] font-medium">No offer letters found</p>
                  {!debouncedSearch && (
                    <Link to="/offer-letters/new" className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-[#0071DC] text-white text-sm font-medium rounded-lg hover:bg-[#005BB5] transition-colors">
                      <HiOutlinePlus className="w-4 h-4" /> Create Offer Letter
                    </Link>
                  )}
                </td></tr>
              ) : data.map((row) => (
                <tr key={row.id} onClick={() => navigate(`/offer-letters/${row.id}`)} className="hover:bg-[#F9FAFB] cursor-pointer transition-colors">
                  <td className="px-4 py-3 text-[#6B7280] font-mono text-xs">{row.offer_number}</td>
                  <td className="px-4 py-3 font-medium text-[#333]">{row.candidate_name}</td>
                  <td className="px-4 py-3 text-[#6B7280]">{row.position || '--'}</td>
                  <td className="px-4 py-3 text-[#6B7280]">{row.department || '--'}</td>
                  <td className="px-4 py-3 text-[#333] font-medium">{formatIndianCurrency(row.ctc_amount)}</td>
                  <td className="px-4 py-3 text-[#6B7280]">{formatDate(row.offer_date)}</td>
                  <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && total > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#E5E7EB]">
            <p className="text-sm text-[#6B7280]">Showing {Math.min((page-1)*limit+1, total)} to {Math.min(page*limit, total)} of {total}</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page <= 1} className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border border-[#E5E7EB] rounded-lg hover:bg-[#F9FAFB] disabled:opacity-40 disabled:cursor-not-allowed"><HiOutlineChevronLeft className="w-4 h-4" /> Previous</button>
              <span className="text-sm text-[#6B7280]">Page {page} of {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page >= totalPages} className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border border-[#E5E7EB] rounded-lg hover:bg-[#F9FAFB] disabled:opacity-40 disabled:cursor-not-allowed">Next <HiOutlineChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
