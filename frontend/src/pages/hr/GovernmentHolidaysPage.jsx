import React, { useState, useEffect, useCallback } from 'react';
import { HiOutlinePlus, HiOutlineMagnifyingGlass, HiOutlineCalendarDays, HiOutlineCheckCircle, HiOutlineTrash, HiOutlinePencilSquare, HiOutlineExclamationTriangle, HiOutlineXMark } from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { governmentHolidayApi } from '../../api/governmentHoliday.api';

function formatDate(d) { if (!d) return '--'; try { return new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}); } catch { return '--'; } }
function getDayName(d) { if (!d) return ''; try { return new Date(d).toLocaleDateString('en-IN',{weekday:'long'}); } catch { return ''; } }

function SummaryCard({ title, value, icon: Icon, color }) {
  return (
    <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-4 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${color}`}><Icon className="w-5 h-5 text-white" /></div>
      <div><p className="text-xs text-[#6B7280] font-medium uppercase tracking-wide">{title}</p><p className="text-lg font-semibold text-[#333] mt-0.5">{value}</p></div>
    </div>
  );
}

function TypeBadge({ type }) {
  const s = { Gazetted:'bg-blue-50 text-blue-700 border-blue-200', Restricted:'bg-yellow-50 text-yellow-700 border-yellow-200', Optional:'bg-gray-100 text-gray-700 border-gray-200' };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${s[type]||s.Gazetted}`}>{type||'Gazetted'}</span>;
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function GovernmentHolidaysPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [year, setYear] = useState(2026);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [showDelete, setShowDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { const t = setTimeout(() => setDebouncedSearch(search), 400); return () => clearTimeout(t); }, [search]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const r = await governmentHolidayApi.list({ year, search: debouncedSearch || undefined, limit: 100, sort_by: 'holiday_date', sort_order: 'asc' });
      setData(r.data?.data || []);
    } catch { setData([]); }
    finally { setLoading(false); }
  }, [year, debouncedSearch]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSeed = async () => {
    try {
      const r = await governmentHolidayApi.seed(year);
      toast.success(r.data?.message || `${year} holidays loaded successfully`);
      fetchData();
    } catch (e) { toast.error(e.response?.data?.error || 'Failed to load holidays'); }
  };

  const handleDelete = async (id) => {
    setDeleting(true);
    try { await governmentHolidayApi.remove(id); toast.success('Holiday deleted'); fetchData(); }
    catch { toast.error('Delete failed'); }
    finally { setDeleting(false); setShowDelete(null); }
  };

  // Group by month
  const grouped = {};
  data.forEach(h => {
    const m = new Date(h.holiday_date).getMonth();
    if (!grouped[m]) grouped[m] = [];
    grouped[m].push(h);
  });

  const upcoming = data.filter(h => new Date(h.holiday_date) >= new Date()).length;
  const gazetted = data.filter(h => h.holiday_type === 'Gazetted').length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-semibold text-[#333]">Government Holidays</h1><p className="text-sm text-[#6B7280] mt-1">Haryana state government holidays for {year} — click "Load {year} Holidays" to refresh with accurate data</p></div>
        <div className="flex items-center gap-2">
          <button onClick={handleSeed} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#333] bg-white border border-[#E5E7EB] rounded-lg hover:bg-[#F9FAFB]">Load {year} Holidays</button>
          <button onClick={() => { setEditItem(null); setShowForm(true); }} className="inline-flex items-center gap-2 px-4 py-2 bg-[#0071DC] text-white text-sm font-medium rounded-lg hover:bg-[#005BB5]"><HiOutlinePlus className="w-4 h-4" /> Add Holiday</button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <SummaryCard title="Total Holidays" value={data.length} icon={HiOutlineCalendarDays} color="bg-blue-500" />
        <SummaryCard title="Gazetted" value={gazetted} icon={HiOutlineCheckCircle} color="bg-green-500" />
        <SummaryCard title="Upcoming" value={upcoming} icon={HiOutlineCalendarDays} color="bg-purple-500" />
        <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-4 flex items-center gap-4">
          <div className="w-11 h-11 rounded-lg flex items-center justify-center bg-gray-500"><HiOutlineCalendarDays className="w-5 h-5 text-white" /></div>
          <div><p className="text-xs text-[#6B7280] font-medium uppercase tracking-wide">Year</p>
            <select value={year} onChange={e => setYear(parseInt(e.target.value))} className="text-lg font-semibold text-[#333] bg-transparent border-none p-0 focus:outline-none">
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
              <option value={2027}>2027</option>
              <option value={2028}>2028</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm mb-4">
        <div className="p-4"><div className="relative max-w-md"><HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" /><input type="text" placeholder="Search holidays..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20" /></div></div>

        {loading ? (
          <div className="py-16 text-center"><div className="w-8 h-8 border-3 border-[#0071DC] border-t-transparent rounded-full animate-spin mx-auto" /></div>
        ) : data.length === 0 ? (
          <div className="py-16 text-center"><HiOutlineCalendarDays className="w-12 h-12 text-[#D1D5DB] mx-auto mb-2" /><p className="text-[#6B7280]">No holidays found for {year}</p><button onClick={handleSeed} className="mt-3 px-4 py-2 bg-[#0071DC] text-white text-sm rounded-lg hover:bg-[#005BB5]">Load Haryana {year} Holidays</button></div>
        ) : (
          <div className="p-4 space-y-6">
            {Object.keys(grouped).sort((a,b) => a-b).map(monthIdx => (
              <div key={monthIdx}>
                <h3 className="text-sm font-semibold text-[#0071DC] uppercase tracking-wider mb-3 flex items-center gap-2">
                  <HiOutlineCalendarDays className="w-4 h-4" /> {MONTHS[monthIdx]}
                </h3>
                <div className="space-y-2">
                  {grouped[monthIdx].map(h => {
                    const isPast = new Date(h.holiday_date) < new Date();
                    return (
                      <div key={h.id} className={`flex items-center justify-between p-3 rounded-lg border ${isPast ? 'bg-gray-50 border-gray-200' : 'bg-white border-[#E5E7EB]'} hover:shadow-sm transition-shadow`}>
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-lg flex flex-col items-center justify-center ${isPast ? 'bg-gray-200' : 'bg-[#0071DC]/10'}`}>
                            <span className={`text-xs font-medium ${isPast ? 'text-gray-500' : 'text-[#0071DC]'}`}>{new Date(h.holiday_date).toLocaleDateString('en-IN',{month:'short'})}</span>
                            <span className={`text-lg font-bold leading-none ${isPast ? 'text-gray-500' : 'text-[#0071DC]'}`}>{new Date(h.holiday_date).getDate()}</span>
                          </div>
                          <div>
                            <p className={`font-medium ${isPast ? 'text-gray-500' : 'text-[#333]'}`}>{h.holiday_name}</p>
                            <p className="text-xs text-[#6B7280]">{getDayName(h.holiday_date)}{h.description ? ` - ${h.description}` : ''}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <TypeBadge type={h.holiday_type} />
                          <button onClick={() => { setEditItem(h); setShowForm(true); }} className="p-1.5 rounded hover:bg-[#F3F4F6]"><HiOutlinePencilSquare className="w-4 h-4 text-[#6B7280]" /></button>
                          <button onClick={() => setShowDelete(h.id)} className="p-1.5 rounded hover:bg-red-50"><HiOutlineTrash className="w-4 h-4 text-red-400" /></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showForm && <HolidayFormModal item={editItem} onClose={() => { setShowForm(false); setEditItem(null); }} onSave={() => { setShowForm(false); setEditItem(null); fetchData(); }} />}

      {/* Delete Modal */}
      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => !deleting && setShowDelete(null)} />
          <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center"><HiOutlineExclamationTriangle className="w-5 h-5 text-red-600" /></div>
              <div><h3 className="text-lg font-semibold">Delete Holiday</h3><p className="text-sm text-[#6B7280] mt-1">Are you sure?</p></div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowDelete(null)} disabled={deleting} className="px-4 py-2 text-sm text-[#333] bg-white border border-[#E5E7EB] rounded-lg">Cancel</button>
              <button onClick={() => handleDelete(showDelete)} disabled={deleting} className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg disabled:opacity-50">
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function HolidayFormModal({ item, onClose, onSave }) {
  const isEdit = !!item;
  const [form, setForm] = useState({
    holiday_name: item?.holiday_name || '', holiday_date: item?.holiday_date?.split('T')[0] || '',
    holiday_type: item?.holiday_type || 'Gazetted', state: item?.state || 'Haryana',
    year: item?.year || 2026, description: item?.description || '', is_active: item?.is_active !== false,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.holiday_name || !form.holiday_date) { toast.error('Name and date required'); return; }
    setSaving(true);
    try {
      if (isEdit) await governmentHolidayApi.update(item.id, form);
      else await governmentHolidayApi.create(form);
      toast.success(isEdit ? 'Updated' : 'Created');
      onSave();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{isEdit ? 'Edit Holiday' : 'Add Holiday'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#F3F4F6]"><HiOutlineXMark className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#333] mb-1">Holiday Name *</label>
            <input value={form.holiday_name} onChange={e => setForm({...form, holiday_name: e.target.value})} className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#333] mb-1">Date *</label>
              <input type="date" value={form.holiday_date} onChange={e => setForm({...form, holiday_date: e.target.value, year: new Date(e.target.value).getFullYear()})} className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#333] mb-1">Type</label>
              <select value={form.holiday_type} onChange={e => setForm({...form, holiday_type: e.target.value})} className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm bg-white focus:outline-none">
                <option>Gazetted</option><option>Restricted</option><option>Optional</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#333] mb-1">Description</label>
            <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={2} className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 resize-vertical" />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-[#333] bg-white border border-[#E5E7EB] rounded-lg">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm text-white bg-[#0071DC] rounded-lg disabled:opacity-50">{saving ? 'Saving...' : (isEdit ? 'Update' : 'Add Holiday')}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
