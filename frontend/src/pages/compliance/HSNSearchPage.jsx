import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  HiOutlineMagnifyingGlass,
  HiOutlineTag,
  HiOutlineFunnel,
  HiOutlineXMark,
  HiOutlineInformationCircle,
  HiOutlineArrowPath,
} from 'react-icons/hi2';
import apiClient from '../../api/client';

// ── GST Rate Badge ────────────────────────────────────────────────
function GSTRateBadge({ rate }) {
  const rateNum = parseFloat(rate);
  const colorClass =
    rateNum === 0
      ? 'bg-green-100 text-green-700 border-green-200'
      : rateNum <= 5
        ? 'bg-blue-100 text-blue-700 border-blue-200'
        : rateNum <= 12
          ? 'bg-yellow-100 text-yellow-700 border-yellow-200'
          : rateNum <= 18
            ? 'bg-orange-100 text-orange-700 border-orange-200'
            : 'bg-red-100 text-red-700 border-red-200';

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${colorClass}`}>
      {rateNum}%
    </span>
  );
}

// ── Section Label ─────────────────────────────────────────────────
function SectionLabel({ section }) {
  const sectionNames = {
    I: 'Live Animals',
    II: 'Vegetable Products',
    III: 'Fats & Oils',
    IV: 'Food Preparations',
    V: 'Mineral Products',
    VI: 'Chemicals',
    VII: 'Plastics & Rubber',
    VIII: 'Leather',
    IX: 'Wood',
    X: 'Paper & Pulp',
    XI: 'Textiles',
    XII: 'Footwear & Headgear',
    XIII: 'Stone, Ceramic, Glass',
    XIV: 'Precious Metals',
    XV: 'Base Metals',
    XVI: 'Machinery & Electronics',
    XVII: 'Vehicles',
    XVIII: 'Instruments',
    XX: 'Miscellaneous',
    XXI: 'Works of Art',
    Services: 'Services (SAC)',
  };

  return (
    <span className="text-xs text-[#6B7280]" title={sectionNames[section] || section}>
      {section} {sectionNames[section] ? `- ${sectionNames[section]}` : ''}
    </span>
  );
}

// ── Main HSN Search Page ──────────────────────────────────────────
export default function HSNSearchPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [selectedDetail, setSelectedDetail] = useState(null);

  // Filters
  const [filterChapter, setFilterChapter] = useState('');
  const [filterSection, setFilterSection] = useState('');
  const [filterGSTRate, setFilterGSTRate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  // Fetch stats and chapters on mount
  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const [statsRes, chaptersRes] = await Promise.all([
          apiClient.get('/hsn/stats'),
          apiClient.get('/hsn/chapters'),
        ]);
        setStats(statsRes.data?.data || null);
        setChapters(chaptersRes.data?.data || []);
      } catch {
        // Silently fail - meta data is optional
      }
    };
    fetchMeta();
    inputRef.current?.focus();
  }, []);

  // Search function
  const doSearch = useCallback(async (term, chapter, section, gstRate) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (term) params.set('q', term);
      if (chapter) params.set('chapter', chapter);
      if (section) params.set('section', section);
      if (gstRate !== '' && gstRate !== undefined) params.set('gst_rate', gstRate);
      params.set('limit', '50');

      const res = await apiClient.get(`/hsn/search?${params.toString()}`);
      const data = res.data;
      setResults(data.data || []);
      setTotal(data.total || 0);
    } catch {
      setResults([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search on input change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      if (searchTerm.trim() || filterChapter || filterSection || filterGSTRate !== '') {
        doSearch(searchTerm.trim(), filterChapter, filterSection, filterGSTRate);
      } else {
        // Load default results
        doSearch('', '', '', '');
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchTerm, filterChapter, filterSection, filterGSTRate, doSearch]);

  const clearFilters = () => {
    setFilterChapter('');
    setFilterSection('');
    setFilterGSTRate('');
    setSearchTerm('');
    inputRef.current?.focus();
  };

  const hasActiveFilters = filterChapter || filterSection || filterGSTRate !== '';

  // Get unique sections for filter
  const uniqueSections = [...new Set(chapters.map((c) => c.section))].sort();

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <HiOutlineTag className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-[#333]">HSN / SAC Code Search</h1>
            <p className="text-xs text-[#6B7280]">
              Search {stats ? `${stats.totalCodes} ` : ''}HSN codes for goods and SAC codes for services with GST rates
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mb-6">
          {stats.gstBreakdown.map((item) => (
            <div
              key={item.gst_rate}
              className={`px-3 py-2 rounded-lg border cursor-pointer transition-all ${
                filterGSTRate === String(item.gst_rate)
                  ? 'border-[#0071DC] bg-blue-50 shadow-sm'
                  : 'border-[#E5E7EB] bg-white hover:border-[#0071DC]/30'
              }`}
              onClick={() => {
                setFilterGSTRate(
                  filterGSTRate === String(item.gst_rate) ? '' : String(item.gst_rate)
                );
              }}
            >
              <p className="text-lg font-semibold text-[#333]">{item.gst_rate}%</p>
              <p className="text-[10px] text-[#6B7280]">{item.count} codes</p>
            </div>
          ))}
        </div>
      )}

      {/* Search Bar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 relative">
          <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[#9CA3AF]" />
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by HSN/SAC code (e.g., 6101) or description (e.g., cotton shirts, IT services)..."
            className="w-full pl-10 pr-4 py-2.5 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC] transition-colors bg-white"
          />
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm('');
                inputRef.current?.focus();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#333] transition-colors"
            >
              <HiOutlineXMark className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`inline-flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium rounded-lg border transition-colors cursor-pointer ${
            showFilters || hasActiveFilters
              ? 'bg-[#0071DC] text-white border-[#0071DC]'
              : 'bg-white text-[#6B7280] border-[#E5E7EB] hover:bg-gray-50'
          }`}
        >
          <HiOutlineFunnel className="w-4 h-4" />
          Filters
          {hasActiveFilters && (
            <span className="ml-1 w-4 h-4 flex items-center justify-center text-[10px] font-bold bg-white text-[#0071DC] rounded-full">
              !
            </span>
          )}
        </button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="flex items-center gap-4 mb-4 p-3 bg-white border border-[#E5E7EB] rounded-lg">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-[#6B7280]">Section:</label>
            <select
              value={filterSection}
              onChange={(e) => setFilterSection(e.target.value)}
              className="px-2 py-1.5 text-xs border border-[#E5E7EB] rounded-md bg-white text-[#333] focus:outline-none focus:ring-1 focus:ring-[#0071DC]"
            >
              <option value="">All Sections</option>
              {uniqueSections.map((s) => (
                <option key={s} value={s}>
                  {s}{s === 'Services' ? ' (SAC)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-[#6B7280]">GST Rate:</label>
            <select
              value={filterGSTRate}
              onChange={(e) => setFilterGSTRate(e.target.value)}
              className="px-2 py-1.5 text-xs border border-[#E5E7EB] rounded-md bg-white text-[#333] focus:outline-none focus:ring-1 focus:ring-[#0071DC]"
            >
              <option value="">All Rates</option>
              <option value="0">0% (Exempt)</option>
              <option value="0.25">0.25%</option>
              <option value="3">3%</option>
              <option value="5">5%</option>
              <option value="12">12%</option>
              <option value="18">18%</option>
              <option value="28">28%</option>
            </select>
          </div>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1 px-2 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
            >
              <HiOutlineXMark className="w-3.5 h-3.5" />
              Clear all
            </button>
          )}
        </div>
      )}

      {/* Results Count */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-[#6B7280]">
          {loading ? (
            <span className="inline-flex items-center gap-1">
              <HiOutlineArrowPath className="w-3 h-3 animate-spin" /> Searching...
            </span>
          ) : (
            <>
              Showing <span className="font-semibold text-[#333]">{results.length}</span>
              {total > results.length && <> of <span className="font-semibold text-[#333]">{total}</span></>}
              {' '}results
              {searchTerm && <> for &quot;<span className="font-medium text-[#333]">{searchTerm}</span>&quot;</>}
            </>
          )}
        </p>
      </div>

      {/* Results Table */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider w-[120px]">
                  HSN/SAC Code
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                  Description
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-[#6B7280] uppercase tracking-wider w-[100px]">
                  GST Rate
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-[#6B7280] uppercase tracking-wider w-[80px]">
                  Chapter
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider w-[180px]">
                  Section
                </th>
              </tr>
            </thead>
            <tbody>
              {results.length === 0 && !loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <HiOutlineTag className="w-10 h-10 text-[#D1D5DB]" />
                      <p className="text-sm text-[#6B7280]">
                        {searchTerm || hasActiveFilters
                          ? 'No HSN/SAC codes found matching your search'
                          : 'Start typing to search HSN/SAC codes'}
                      </p>
                      <p className="text-xs text-[#9CA3AF]">
                        Try searching by code number (e.g., 6101) or product name (e.g., cotton shirts)
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                results.map((item, idx) => (
                  <tr
                    key={item.id || idx}
                    className={`border-b border-[#E5E7EB] hover:bg-blue-50/30 transition-colors cursor-pointer ${
                      selectedDetail?.id === item.id ? 'bg-blue-50' : idx % 2 === 0 ? 'bg-white' : 'bg-[#FAFAFA]'
                    }`}
                    onClick={() => setSelectedDetail(selectedDetail?.id === item.id ? null : item)}
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm font-semibold text-[#0071DC]">{item.hsn_code}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-[#333]">{item.description}</p>
                      {selectedDetail?.id === item.id && item.notes && (
                        <div className="mt-2 flex items-start gap-1.5 px-2.5 py-1.5 bg-blue-50 border border-blue-100 rounded-md">
                          <HiOutlineInformationCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                          <p className="text-xs text-blue-700">{item.notes}</p>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <GSTRateBadge rate={item.gst_rate} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm text-[#6B7280] font-medium">{item.chapter}</span>
                    </td>
                    <td className="px-4 py-3">
                      <SectionLabel section={item.section} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* GST Rate Legend */}
      <div className="mt-6 p-4 bg-white border border-[#E5E7EB] rounded-lg">
        <h3 className="text-sm font-semibold text-[#333] mb-3">GST Rate Quick Reference</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs text-[#6B7280]">
          <div className="flex items-start gap-2">
            <GSTRateBadge rate={0} />
            <span>Essential items: fresh food, books, healthcare</span>
          </div>
          <div className="flex items-start gap-2">
            <GSTRateBadge rate={5} />
            <span>Economy items, garments below Rs 1000, basic food</span>
          </div>
          <div className="flex items-start gap-2">
            <GSTRateBadge rate={12} />
            <span>Garments above Rs 1000, processed foods, footwear</span>
          </div>
          <div className="flex items-start gap-2">
            <GSTRateBadge rate={18} />
            <span>Standard rate: most goods and services</span>
          </div>
          <div className="flex items-start gap-2">
            <GSTRateBadge rate={28} />
            <span>Luxury items, tobacco, aerated drinks, cars</span>
          </div>
          <div className="flex items-start gap-2">
            <GSTRateBadge rate={3} />
            <span>Gold, silver, precious metals and jewellery</span>
          </div>
        </div>
      </div>
    </div>
  );
}
