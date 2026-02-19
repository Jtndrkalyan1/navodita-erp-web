import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  HiOutlinePlus,
  HiOutlineMagnifyingGlass,
  HiOutlineChevronUp,
  HiOutlineChevronDown,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineCube,
  HiOutlineCheckCircle,
  HiOutlineArchiveBox,
  HiOutlineWrenchScrewdriver,
} from 'react-icons/hi2';
import { itemApi } from '../../api/item.api';

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
  sku: 'SKU',
  name: 'Name',
  item_type: 'Type',
  hsn_code: 'HSN Code',
  selling_price: 'Selling Price',
  purchase_price: 'Purchase Price',
  gst_rate: 'GST Rate',
};

const ITEM_TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'Goods', label: 'Goods' },
  { value: 'Service', label: 'Service' },
];

export default function ItemListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // State
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [itemTypeFilter, setItemTypeFilter] = useState(searchParams.get('item_type') || '');
  const [page, setPage] = useState(parseInt(searchParams.get('page')) || 1);
  const [limit] = useState(50);
  const [sortBy, setSortBy] = useState(searchParams.get('sort_by') || 'created_at');
  const [sortOrder, setSortOrder] = useState(searchParams.get('sort_order') || 'desc');

  // Summary stats
  const [stats, setStats] = useState({
    totalItems: 0,
    activeItems: 0,
    goods: 0,
    services: 0,
  });

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset to page 1 when filter changes
  useEffect(() => {
    setPage(1);
  }, [itemTypeFilter]);

  // Sync URL params
  useEffect(() => {
    const params = {};
    if (page > 1) params.page = page;
    if (debouncedSearch) params.search = debouncedSearch;
    if (sortBy !== 'created_at') params.sort_by = sortBy;
    if (sortOrder !== 'desc') params.sort_order = sortOrder;
    if (itemTypeFilter) params.item_type = itemTypeFilter;
    setSearchParams(params, { replace: true });
  }, [page, debouncedSearch, sortBy, sortOrder, itemTypeFilter, setSearchParams]);

  // Fetch items
  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit,
        sort_by: sortBy,
        sort_order: sortOrder,
      };
      if (debouncedSearch) params.search = debouncedSearch;
      if (itemTypeFilter) params.item_type = itemTypeFilter;

      const response = await itemApi.list(params);
      const { data, total: totalCount } = response.data;
      setItems(data || []);
      setTotal(totalCount || 0);

      // Compute summary stats from the returned page
      const allData = data || [];
      setStats({
        totalItems: totalCount || 0,
        activeItems: allData.filter((i) => i.is_active !== false).length,
        goods: allData.filter((i) => i.item_type === 'Goods').length,
        services: allData.filter((i) => i.item_type === 'Service').length,
      });
    } catch (err) {
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch, sortBy, sortOrder, itemTypeFilter]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

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
    navigate(`/items/${id}`);
  };

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#333]">Items</h1>
          <p className="text-sm text-[#6B7280] mt-1">
            Manage your products and services
          </p>
        </div>
        <Link
          to="/items/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#0071DC] text-white text-sm font-medium rounded-lg hover:bg-[#005BB5] transition-colors"
        >
          <HiOutlinePlus className="w-4 h-4" />
          New Item
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <SummaryCard
          title="Total Items"
          value={stats.totalItems.toLocaleString('en-IN')}
          icon={HiOutlineCube}
          color="bg-blue-500"
        />
        <SummaryCard
          title="Active Items"
          value={stats.activeItems.toLocaleString('en-IN')}
          icon={HiOutlineCheckCircle}
          color="bg-green-500"
        />
        <SummaryCard
          title="Goods"
          value={stats.goods.toLocaleString('en-IN')}
          icon={HiOutlineArchiveBox}
          color="bg-purple-500"
        />
        <SummaryCard
          title="Services"
          value={stats.services.toLocaleString('en-IN')}
          icon={HiOutlineWrenchScrewdriver}
          color="bg-orange-500"
        />
      </div>

      {/* Search & Filters Bar */}
      <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm mb-4">
        <div className="p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
            <input
              type="text"
              placeholder="Search by name, SKU, HSN code, or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
            />
          </div>
          <select
            value={itemTypeFilter}
            onChange={(e) => setItemTypeFilter(e.target.value)}
            className="px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] bg-white focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
          >
            {ITEM_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
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
                    className={`px-4 py-3 text-xs font-semibold text-[#6B7280] uppercase tracking-wider cursor-pointer hover:text-[#333] select-none ${
                      key === 'selling_price' || key === 'purchase_price' || key === 'gst_rate'
                        ? 'text-right'
                        : 'text-left'
                    }`}
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
                      <span className="text-sm text-[#6B7280]">Loading items...</span>
                    </div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <HiOutlineCube className="w-12 h-12 text-[#D1D5DB]" />
                      <p className="text-[#6B7280] font-medium">No items found</p>
                      <p className="text-xs text-[#9CA3AF]">
                        {debouncedSearch || itemTypeFilter
                          ? 'Try a different search term or filter'
                          : 'Get started by adding your first item'}
                      </p>
                      {!debouncedSearch && !itemTypeFilter && (
                        <Link
                          to="/items/new"
                          className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-[#0071DC] text-white text-sm font-medium rounded-lg hover:bg-[#005BB5] transition-colors"
                        >
                          <HiOutlinePlus className="w-4 h-4" />
                          Add Item
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => handleRowClick(item.id)}
                    className="hover:bg-[#F9FAFB] cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 text-[#6B7280] font-mono text-xs">
                      {item.sku || '--'}
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <span className="font-medium text-[#333]">{item.name}</span>
                        {item.description && (
                          <p className="text-xs text-[#6B7280] mt-0.5 truncate max-w-xs">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                          item.item_type === 'Goods'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-purple-50 text-purple-700 border-purple-200'
                        }`}
                      >
                        {item.item_type || 'Goods'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#6B7280] font-mono text-xs">
                      {item.hsn_code || '--'}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-[#333]">
                      {formatIndianCurrency(item.selling_price)}
                    </td>
                    <td className="px-4 py-3 text-right text-[#6B7280]">
                      {formatIndianCurrency(item.purchase_price)}
                    </td>
                    <td className="px-4 py-3 text-right text-[#6B7280]">
                      {item.gst_rate != null ? `${item.gst_rate}%` : '--'}
                    </td>
                    <td className="px-4 py-3">
                      {item.is_active !== false ? (
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
              <span className="font-medium text-[#333]">{total}</span> items
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
