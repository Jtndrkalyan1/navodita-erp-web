import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  HiOutlinePlus,
  HiOutlineMagnifyingGlass,
  HiOutlineChevronUp,
  HiOutlineChevronDown,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineBuildingStorefront,
  HiOutlineCheckCircle,
  HiOutlineDocumentText,
  HiOutlineCurrencyRupee,
} from 'react-icons/hi2';
import { vendorApi } from '../../api/vendor.api';

/**
 * Format a number in Indian numbering system (lakhs/crores).
 * e.g. 1234567 => "12,34,567"
 */
function formatIndianCurrency(value) {
  if (value == null || isNaN(value)) return '\u20B90.00';
  const num = Number(value);
  const isNegative = num < 0;
  const abs = Math.abs(num);
  const [intPart, decPart] = abs.toFixed(2).split('.');

  // Indian grouping: last 3 digits, then groups of 2
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

const SORTABLE_COLUMNS = {
  vendor_code: 'Code',
  display_name: 'Name',
  email: 'Email',
  phone: 'Phone',
  gstin: 'GST / Business No.',
  place_of_supply: 'State',
  opening_balance: 'Balance',
};

export default function VendorListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // State
  const [vendors, setVendors] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [page, setPage] = useState(parseInt(searchParams.get('page')) || 1);
  const [limit] = useState(50);
  const [sortBy, setSortBy] = useState(searchParams.get('sort_by') || 'created_at');
  const [sortOrder, setSortOrder] = useState(searchParams.get('sort_order') || 'desc');

  // Summary stats
  const [stats, setStats] = useState({
    totalVendors: 0,
    activeVendors: 0,
    withGST: 0,
    totalPayables: 0,
  });

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to first page on search
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Sync URL params
  useEffect(() => {
    const params = {};
    if (page > 1) params.page = page;
    if (debouncedSearch) params.search = debouncedSearch;
    if (sortBy !== 'created_at') params.sort_by = sortBy;
    if (sortOrder !== 'desc') params.sort_order = sortOrder;
    setSearchParams(params, { replace: true });
  }, [page, debouncedSearch, sortBy, sortOrder, setSearchParams]);

  // Fetch vendors
  const fetchVendors = useCallback(async () => {
    setLoading(true);
    try {
      const response = await vendorApi.list({
        page,
        limit,
        search: debouncedSearch || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
      });

      const { data, total: totalCount } = response.data;
      setVendors(data || []);
      setTotal(totalCount || 0);

      // Compute summary stats from the returned page of data
      const allData = data || [];
      setStats({
        totalVendors: totalCount || 0,
        activeVendors: allData.filter((v) => v.is_active !== false).length,
        withGST: allData.filter((v) => v.gstin && v.gstin.trim() !== '').length,
        totalPayables: allData.reduce(
          (sum, v) => sum + (parseFloat(v.opening_balance) || 0),
          0
        ),
      });
    } catch (err) {
      // Error handled by apiClient interceptor
      setVendors([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch, sortBy, sortOrder]);

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  // Sorting
  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const SortIcon = ({ column }) => {
    if (sortBy !== column) {
      return <span className="ml-1 text-gray-300 text-xs">&uarr;&darr;</span>;
    }
    return sortOrder === 'asc' ? (
      <HiOutlineChevronUp className="ml-1 w-3 h-3 inline" />
    ) : (
      <HiOutlineChevronDown className="ml-1 w-3 h-3 inline" />
    );
  };

  // Pagination
  const totalPages = Math.ceil(total / limit);
  const startRecord = total === 0 ? 0 : (page - 1) * limit + 1;
  const endRecord = Math.min(page * limit, total);

  const handleRowClick = (id) => {
    navigate(`/vendors/${id}`);
  };

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#333]">Vendors</h1>
          <p className="text-sm text-[#6B7280] mt-1">
            Manage your vendor database
          </p>
        </div>
        <Link
          to="/vendors/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#0071DC] text-white text-sm font-medium rounded-lg hover:bg-[#005BB5] transition-colors"
        >
          <HiOutlinePlus className="w-4 h-4" />
          New Vendor
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <SummaryCard
          title="Total Vendors"
          value={stats.totalVendors.toLocaleString('en-IN')}
          icon={HiOutlineBuildingStorefront}
          color="bg-blue-500"
        />
        <SummaryCard
          title="Active"
          value={stats.activeVendors.toLocaleString('en-IN')}
          icon={HiOutlineCheckCircle}
          color="bg-green-500"
        />
        <SummaryCard
          title="With GST"
          value={stats.withGST.toLocaleString('en-IN')}
          icon={HiOutlineDocumentText}
          color="bg-purple-500"
        />
        <SummaryCard
          title="Total Payables"
          value={formatIndianCurrency(stats.totalPayables)}
          icon={HiOutlineCurrencyRupee}
          color="bg-orange-500"
        />
      </div>

      {/* Search & Filters Bar */}
      <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm mb-4">
        <div className="p-4">
          <div className="relative max-w-md">
            <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
            <input
              type="text"
              placeholder="Search by name, email, phone, or GSTIN..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
            />
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-t border-b border-[#E5E7EB] bg-[#F9FAFB]">
                {Object.entries(SORTABLE_COLUMNS).map(([key, label]) => (
                  <th
                    key={key}
                    onClick={() => handleSort(key)}
                    className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider cursor-pointer hover:text-[#333] select-none"
                  >
                    {label}
                    <SortIcon column={key} />
                  </th>
                ))}
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 border-3 border-[#0071DC] border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm text-[#6B7280]">Loading vendors...</span>
                    </div>
                  </td>
                </tr>
              ) : vendors.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <HiOutlineBuildingStorefront className="w-12 h-12 text-[#D1D5DB]" />
                      <p className="text-[#6B7280] font-medium">No vendors found</p>
                      <p className="text-xs text-[#9CA3AF]">
                        {debouncedSearch
                          ? 'Try a different search term'
                          : 'Get started by adding your first vendor'}
                      </p>
                      {!debouncedSearch && (
                        <Link
                          to="/vendors/new"
                          className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-[#0071DC] text-white text-sm font-medium rounded-lg hover:bg-[#005BB5] transition-colors"
                        >
                          <HiOutlinePlus className="w-4 h-4" />
                          Add Vendor
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                vendors.map((vendor) => (
                  <tr
                    key={vendor.id}
                    onClick={() => handleRowClick(vendor.id)}
                    className="hover:bg-[#F9FAFB] cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 text-[#6B7280] font-mono text-xs">
                      {vendor.vendor_code || '--'}
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <span className="font-medium text-[#333]">{vendor.display_name}</span>
                        {vendor.company_name && vendor.company_name !== vendor.display_name && (
                          <p className="text-xs text-[#6B7280] mt-0.5">{vendor.company_name}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[#6B7280]">{vendor.email || '--'}</td>
                    <td className="px-4 py-3 text-[#6B7280]">{vendor.phone || vendor.mobile || '--'}</td>
                    <td className="px-4 py-3 text-[#6B7280] font-mono text-xs">
                      {vendor.country && vendor.country !== 'India'
                        ? (vendor.business_number || '--')
                        : (vendor.gstin || '--')}
                    </td>
                    <td className="px-4 py-3 text-[#6B7280]">{vendor.place_of_supply || '--'}</td>
                    <td className="px-4 py-3 text-right font-medium text-[#333]">
                      {formatIndianCurrency(vendor.opening_balance)}
                    </td>
                    <td className="px-4 py-3">
                      {vendor.is_active !== false ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                          Inactive
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && total > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#E5E7EB]">
            <p className="text-sm text-[#6B7280]">
              Showing <span className="font-medium text-[#333]">{startRecord}</span> to{' '}
              <span className="font-medium text-[#333]">{endRecord}</span> of{' '}
              <span className="font-medium text-[#333]">{total}</span> vendors
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
    </div>
  );
}
