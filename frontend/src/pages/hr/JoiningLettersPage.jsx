import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { HiOutlinePlus, HiOutlineMagnifyingGlass, HiOutlineChevronLeft, HiOutlineChevronRight, HiOutlineDocumentText, HiOutlineCheckCircle, HiOutlineClock } from 'react-icons/hi2';
import { joiningLetterApi } from '../../api/joiningLetter.api';

function formatDate(dateStr) {
  if (!dateStr) return '--';
  try { return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return '--'; }
}

function StatusBadge({ status }) {
  const styles = { Draft: 'bg-gray-100 text-gray-700 border-gray-200', Sent: 'bg-blue-50 text-blue-700 border-blue-200', Acknowledged: 'bg-green-50 text-green-700 border-green-200' };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${styles[status] || styles.Draft}`}>{status || 'Draft'}</span>;
}

function SummaryCard({ title, value, icon: Icon, color }) {
  return (
    <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-4 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${color}`}><Icon className="w-5 h-5 text-white" /></div>
      <div><p className="text-xs text-[#6B7280] font-medium uppercase tracking-wide">{title}</p><p className="text-lg font-semibold text-[#333] mt-0.5">{value}</p></div>
    </div>
  );
}

export default function JoiningLettersPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [page, setPage] = useState(1);
  const limit = 50;

  useEffect(() => { const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 400); return () => clearTimeout(t); }, [search]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const r = await joiningLetterApi.list({ page, limit, search: debouncedSearch || undefined, sort_order: 'desc' });
      setData(r.data?.data || []); setTotal(r.data?.total || 0);
    } catch { setData([]); setTotal(0); }
    finally { setLoading(false); }
  }, [page, limit, debouncedSearch]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const stats = { total, draft: data.filter(d=>d.status==='Draft').length, sent: data.filter(d=>d.status==='Sent').length, acknowledged: data.filter(d=>d.status==='Acknowledged').length };
  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-semibold text-[#333]">Joining Letters</h1><p className="text-sm text-[#6B7280] mt-1">Manage employee joining letters</p></div>
        <Link to="/joining-letters/new" className="inline-flex items-center gap-2 px-4 py-2 bg-[#0071DC] text-white text-sm font-medium rounded-lg hover:bg-[#005BB5]"><HiOutlinePlus className="w-4 h-4" /> New Joining Letter</Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <SummaryCard title="Total" value={stats.total} icon={HiOutlineDocumentText} color="bg-blue-500" />
        <SummaryCard title="Draft" value={stats.draft} icon={HiOutlineClock} color="bg-gray-500" />
        <SummaryCard title="Sent" value={stats.sent} icon={HiOutlineDocumentText} color="bg-yellow-500" />
        <SummaryCard title="Acknowledged" value={stats.acknowledged} icon={HiOutlineCheckCircle} color="bg-green-500" />
      </div>
      <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm mb-4">
        <div className="p-4"><div className="relative max-w-md"><HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" /><input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20" /></div></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-t border-b border-[#E5E7EB] bg-[#F9FAFB]">
              <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase">Joining #</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase">Employee</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase">Position</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase">Department</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase">Joining Date</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase">Status</th>
            </tr></thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {loading ? <tr><td colSpan={6} className="py-16 text-center"><div className="w-8 h-8 border-3 border-[#0071DC] border-t-transparent rounded-full animate-spin mx-auto" /></td></tr>
              : data.length === 0 ? <tr><td colSpan={6} className="py-16 text-center"><HiOutlineDocumentText className="w-12 h-12 text-[#D1D5DB] mx-auto mb-2" /><p className="text-[#6B7280]">No joining letters found</p></td></tr>
              : data.map(row => (
                <tr key={row.id} onClick={() => navigate(`/joining-letters/${row.id}`)} className="hover:bg-[#F9FAFB] cursor-pointer">
                  <td className="px-4 py-3 text-[#6B7280] font-mono text-xs">{row.joining_number}</td>
                  <td className="px-4 py-3 font-medium text-[#333]">{row.employee_name}</td>
                  <td className="px-4 py-3 text-[#6B7280]">{row.position || '--'}</td>
                  <td className="px-4 py-3 text-[#6B7280]">{row.department || '--'}</td>
                  <td className="px-4 py-3 text-[#6B7280]">{formatDate(row.date_of_joining)}</td>
                  <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && total > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#E5E7EB]">
            <p className="text-sm text-[#6B7280]">Showing {Math.min((page-1)*limit+1,total)} to {Math.min(page*limit,total)} of {total}</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p=>Math.max(1,p-1))} disabled={page<=1} className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border border-[#E5E7EB] rounded-lg disabled:opacity-40"><HiOutlineChevronLeft className="w-4 h-4" /> Previous</button>
              <span className="text-sm text-[#6B7280]">Page {page} of {totalPages}</span>
              <button onClick={() => setPage(p=>Math.min(totalPages,p+1))} disabled={page>=totalPages} className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border border-[#E5E7EB] rounded-lg disabled:opacity-40">Next <HiOutlineChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
