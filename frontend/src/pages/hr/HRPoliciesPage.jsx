import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HiOutlinePlus, HiOutlineMagnifyingGlass, HiOutlineDocumentText, HiOutlineCheckCircle, HiOutlineShieldCheck, HiOutlineScale } from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { hrPolicyApi } from '../../api/hrPolicy.api';

function SummaryCard({ title, value, icon: Icon, color }) {
  return (
    <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-4 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${color}`}><Icon className="w-5 h-5 text-white" /></div>
      <div><p className="text-xs text-[#6B7280] font-medium uppercase tracking-wide">{title}</p><p className="text-lg font-semibold text-[#333] mt-0.5">{value}</p></div>
    </div>
  );
}

const CATEGORIES = ['POSH', 'ESI', 'PF', 'Minimum Wages', 'Leave', 'Working Hours', 'Safety', 'General'];
const CATEGORY_COLORS = { POSH: 'bg-red-100 text-red-700', ESI: 'bg-blue-100 text-blue-700', PF: 'bg-green-100 text-green-700', 'Minimum Wages': 'bg-yellow-100 text-yellow-700', Leave: 'bg-purple-100 text-purple-700', 'Working Hours': 'bg-indigo-100 text-indigo-700', Safety: 'bg-orange-100 text-orange-700', General: 'bg-gray-100 text-gray-700' };

export default function HRPoliciesPage() {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('');

  useEffect(() => { const t = setTimeout(() => setDebouncedSearch(search), 400); return () => clearTimeout(t); }, [search]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const r = await hrPolicyApi.list({ search: debouncedSearch || undefined, category: activeCategory || undefined, limit: 100 });
      setData(r.data?.data || []);
    } catch { setData([]); }
    finally { setLoading(false); }
  }, [debouncedSearch, activeCategory]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSeed = async () => {
    try { const r = await hrPolicyApi.seed(); toast.success(r.data?.message || 'Policies seeded'); fetchData(); }
    catch (e) { toast.error(e.response?.data?.error || 'Seed failed'); }
  };

  const mandatory = data.filter(d => d.is_mandatory).length;
  const active = data.filter(d => d.status === 'Active').length;

  // Group by category
  const grouped = {};
  data.forEach(p => { if (!grouped[p.category]) grouped[p.category] = []; grouped[p.category].push(p); });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-semibold text-[#333]">HR Policies</h1><p className="text-sm text-[#6B7280] mt-1">Haryana labor law compliance policies</p></div>
        <div className="flex items-center gap-2">
          <button onClick={handleSeed} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#333] bg-white border border-[#E5E7EB] rounded-lg hover:bg-[#F9FAFB]">Seed Default Policies</button>
          <Link to="/hr-policies/new" className="inline-flex items-center gap-2 px-4 py-2 bg-[#0071DC] text-white text-sm font-medium rounded-lg hover:bg-[#005BB5]"><HiOutlinePlus className="w-4 h-4" /> New Policy</Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <SummaryCard title="Total Policies" value={data.length} icon={HiOutlineDocumentText} color="bg-blue-500" />
        <SummaryCard title="Active" value={active} icon={HiOutlineCheckCircle} color="bg-green-500" />
        <SummaryCard title="Mandatory" value={mandatory} icon={HiOutlineShieldCheck} color="bg-red-500" />
        <SummaryCard title="Categories" value={Object.keys(grouped).length} icon={HiOutlineScale} color="bg-purple-500" />
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
        <button onClick={() => setActiveCategory('')} className={`px-3 py-1.5 text-sm font-medium rounded-full border transition-colors ${!activeCategory ? 'bg-[#0071DC] text-white border-[#0071DC]' : 'bg-white text-[#6B7280] border-[#E5E7EB] hover:bg-[#F9FAFB]'}`}>All</button>
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setActiveCategory(cat === activeCategory ? '' : cat)} className={`px-3 py-1.5 text-sm font-medium rounded-full border whitespace-nowrap transition-colors ${activeCategory === cat ? 'bg-[#0071DC] text-white border-[#0071DC]' : 'bg-white text-[#6B7280] border-[#E5E7EB] hover:bg-[#F9FAFB]'}`}>{cat}</button>
        ))}
      </div>

      <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm mb-4">
        <div className="p-4"><div className="relative max-w-md"><HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" /><input type="text" placeholder="Search policies..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20" /></div></div>

        {loading ? (
          <div className="py-16 text-center"><div className="w-8 h-8 border-3 border-[#0071DC] border-t-transparent rounded-full animate-spin mx-auto" /></div>
        ) : data.length === 0 ? (
          <div className="py-16 text-center"><HiOutlineDocumentText className="w-12 h-12 text-[#D1D5DB] mx-auto mb-2" /><p className="text-[#6B7280]">No policies found</p><button onClick={handleSeed} className="mt-3 px-4 py-2 bg-[#0071DC] text-white text-sm rounded-lg">Seed Default Policies</button></div>
        ) : (
          <div className="p-4 space-y-6">
            {Object.keys(grouped).sort().map(cat => (
              <div key={cat}>
                <h3 className="text-sm font-semibold text-[#6B7280] uppercase tracking-wider mb-3">{cat}</h3>
                <div className="space-y-2">
                  {grouped[cat].map(p => (
                    <div key={p.id} onClick={() => navigate(`/hr-policies/${p.id}`)} className="flex items-center justify-between p-4 rounded-lg border border-[#E5E7EB] hover:bg-[#F9FAFB] cursor-pointer transition-colors">
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold ${CATEGORY_COLORS[p.category] || CATEGORY_COLORS.General}`}>
                          {p.policy_number ? p.policy_number.split('-').pop() : '#'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-[#333]">{p.policy_name}</p>
                            {p.is_mandatory && <span className="px-1.5 py-0.5 bg-red-50 text-red-600 text-[10px] font-medium rounded border border-red-200">MANDATORY</span>}
                          </div>
                          <p className="text-xs text-[#6B7280] mt-0.5">{p.description || 'No description'}</p>
                          <div className="flex items-center gap-3 mt-1">
                            {p.policy_number && <span className="text-xs text-[#9CA3AF] font-mono">{p.policy_number}</span>}
                            <span className="text-xs text-[#9CA3AF]">v{p.version || '1.0'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${p.status === 'Active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>{p.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
