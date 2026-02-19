import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  HiOutlinePlus,
  HiOutlineDocumentText,
  HiOutlineExclamationTriangle,
} from 'react-icons/hi2';
import apiClient from '../../api/client';
import StatusBadge from '../../components/data-display/StatusBadge';
import DateCell from '../../components/data-display/DateCell';
import ZohoSearchBar from '../../components/layout/ZohoSearchBar';
import ZohoPaymentBanner from '../../components/layout/ZohoPaymentBanner';
import ZohoColumnHeader from '../../components/layout/ZohoColumnHeader';
import ZohoEmptyState from '../../components/layout/ZohoEmptyState';
import LoadingSpinner from '../../components/feedback/LoadingSpinner';

// ── Helpers ────────────────────────────────────────────────────────

function formatWeight(value) {
  const num = Number(value) || 0;
  if (num === 0) return '--';
  return num.toFixed(2) + ' kg';
}

function formatCBM(value) {
  const num = Number(value) || 0;
  if (num === 0) return '--';
  return num.toFixed(4) + ' m\u00B3';
}

// ── Constants ──────────────────────────────────────────────────────

const STATUS_TABS = [
  { key: '', label: 'All' },
  { key: 'Draft', label: 'Draft' },
  { key: 'Packed', label: 'Packed' },
  { key: 'Shipped', label: 'Shipped' },
  { key: 'Delivered', label: 'Delivered' },
];

const PAGE_SIZE = 50;

// ── Main Component ─────────────────────────────────────────────────

export default function PackingListListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [packingLists, setPackingLists] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const currentStatus = searchParams.get('status') || '';
  const currentSearch = searchParams.get('search') || '';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const sortBy = searchParams.get('sort_by') || 'created_at';
  const sortOrder = searchParams.get('sort_order') || 'desc';

  const [summary, setSummary] = useState({
    totalCount: 0,
    shippedCount: 0,
    pendingCount: 0,
    totalCartons: 0,
  });

  const fetchPackingLists = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page: currentPage,
        limit: PAGE_SIZE,
        sort_by: sortBy,
        sort_order: sortOrder,
      };
      if (currentSearch) params.search = currentSearch;
      if (currentStatus) params.status = currentStatus;

      const res = await apiClient.get('/packing-lists', { params });
      const { data, total: totalCount } = res.data;
      setPackingLists(data || []);
      setTotal(totalCount || 0);
      computeSummary(data || []);
    } catch (err) {
      if (err.response?.status !== 401) {
        setError('Failed to load packing lists. Please try again.');
      }
      setPackingLists([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [currentPage, currentSearch, currentStatus, sortBy, sortOrder]);

  useEffect(() => {
    fetchPackingLists();
  }, [fetchPackingLists]);

  function computeSummary(data) {
    let totalCount = data.length;
    let shippedCount = 0;
    let pendingCount = 0;
    let totalCartons = 0;

    data.forEach((pl) => {
      if (pl.status === 'Shipped') shippedCount++;
      else if (pl.status === 'Draft' || pl.status === 'Packed') pendingCount++;
      totalCartons += Number(pl.total_cartons) || 0;
    });

    setSummary({ totalCount, shippedCount, pendingCount, totalCartons });
  }

  function updateParam(key, value) {
    const next = new URLSearchParams(searchParams);
    if (value) { next.set(key, value); } else { next.delete(key); }
    if (key !== 'page') next.set('page', '1');
    setSearchParams(next, { replace: true });
  }

  function handleSort(field, order) {
    const next = new URLSearchParams(searchParams);
    next.set('sort_by', field);
    next.set('sort_order', order);
    next.set('page', '1');
    setSearchParams(next, { replace: true });
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const pageNumbers = [];
  const maxVisiblePages = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
  if (endPage - startPage < maxVisiblePages - 1) startPage = Math.max(1, endPage - maxVisiblePages + 1);
  for (let i = startPage; i <= endPage; i++) pageNumbers.push(i);

  return (
    <div>
      <div className="bg-white border-b border-[var(--zoho-border)] px-6 py-4 -mx-6 -mt-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-[var(--zoho-text)]">Packing Lists</h1>
            {!loading && (
              <span className="text-xs font-medium text-[var(--zoho-text-secondary)] bg-gray-100 rounded-full px-2.5 py-0.5">{total}</span>
            )}
          </div>
          <Link to="/packing-lists/new" className="inline-flex items-center gap-1.5 bg-[#0071DC] hover:bg-[#005BB5] text-white text-sm font-medium px-4 py-2 rounded-md transition-colors duration-150">
            <HiOutlinePlus className="w-4 h-4" />
            New Packing List
          </Link>
        </div>
      </div>

      <ZohoPaymentBanner
        items={[
          { label: 'Total Packing Lists', value: String(summary.totalCount), color: '#0071DC' },
          { label: 'Shipped', value: String(summary.shippedCount), color: '#16A34A' },
          { label: 'Pending', value: String(summary.pendingCount), color: '#F59E0B' },
          { label: 'Total Cartons', value: String(summary.totalCartons), color: '#8B5CF6' },
        ]}
      />

      <div className="bg-white rounded-lg border border-[var(--zoho-border)] overflow-hidden">
        <div className="flex items-center gap-0 border-b border-[var(--zoho-border)] px-4">
          {STATUS_TABS.map((tab) => (
            <button key={tab.key} onClick={() => updateParam('status', tab.key)} className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors duration-150 cursor-pointer whitespace-nowrap ${currentStatus === tab.key ? 'border-[#0071DC] text-[#0071DC]' : 'border-transparent text-[var(--zoho-text-secondary)] hover:text-[var(--zoho-text)] hover:border-gray-300'}`}>
              {tab.label}
            </button>
          ))}
          <div className="ml-auto py-2">
            <ZohoSearchBar value={currentSearch} onChange={(s) => updateParam('search', s)} placeholder="Search packing lists..." className="w-64" />
          </div>
        </div>

        {loading ? (
          <div className="py-20"><LoadingSpinner size="lg" label="Loading packing lists..." /></div>
        ) : error ? (
          <div className="py-20 text-center">
            <HiOutlineExclamationTriangle className="w-12 h-12 text-red-300 mx-auto mb-3" />
            <p className="text-sm text-red-600 mb-3">{error}</p>
            <button onClick={fetchPackingLists} className="text-sm text-[#0071DC] hover:underline cursor-pointer">Try again</button>
          </div>
        ) : packingLists.length === 0 ? (
          <ZohoEmptyState
            icon={HiOutlineDocumentText}
            title={currentSearch || currentStatus ? 'No packing lists match your filters' : 'No packing lists yet'}
            description={currentSearch || currentStatus ? 'Try adjusting your search or filter criteria.' : 'Create your first packing list to start tracking shipments.'}
            actionLabel={!currentSearch && !currentStatus ? 'New Packing List' : undefined}
            onAction={!currentSearch && !currentStatus ? () => navigate('/packing-lists/new') : undefined}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <ZohoColumnHeader label="Packing #" field="packing_number" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
                    <ZohoColumnHeader label="Customer" field="customer_name" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
                    <ZohoColumnHeader label="Date" field="packing_date" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
                    <ZohoColumnHeader label="Status" field="status" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
                    <ZohoColumnHeader label="Cartons" field="total_cartons" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} align="right" />
                    <ZohoColumnHeader label="Net Weight" field="total_net_weight" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} align="right" />
                    <ZohoColumnHeader label="Gross Weight" field="total_gross_weight" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} align="right" />
                    <ZohoColumnHeader label="CBM" field="total_cbm" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} align="right" />
                  </tr>
                </thead>
                <tbody>
                  {packingLists.map((pl, index) => (
                    <tr key={pl.id} onClick={() => navigate(`/packing-lists/${pl.id}`)} className={`border-b border-gray-100 cursor-pointer transition-colors duration-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'} hover:bg-blue-50/50`}>
                      <td className="px-4 py-3 text-sm font-medium text-[#0071DC]">{pl.packing_number}</td>
                      <td className="px-4 py-3 text-sm text-[var(--zoho-text)]">{pl.customer?.company_name || pl.customer?.display_name || pl.customer_name || '--'}</td>
                      <td className="px-4 py-3"><DateCell date={pl.packing_date} /></td>
                      <td className="px-4 py-3"><StatusBadge status={pl.status} size="sm" /></td>
                      <td className="px-4 py-3 text-right text-sm text-[var(--zoho-text)] tabular-nums">{Number(pl.total_cartons) || '--'}</td>
                      <td className="px-4 py-3 text-right text-sm text-[var(--zoho-text)] tabular-nums">{formatWeight(pl.total_net_weight)}</td>
                      <td className="px-4 py-3 text-right text-sm text-[var(--zoho-text)] tabular-nums">{formatWeight(pl.total_gross_weight)}</td>
                      <td className="px-4 py-3 text-right text-sm text-[var(--zoho-text)] tabular-nums">{formatCBM(pl.total_cbm)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--zoho-border)]">
                <p className="text-xs text-[var(--zoho-text-secondary)]">Showing {(currentPage - 1) * PAGE_SIZE + 1} - {Math.min(currentPage * PAGE_SIZE, total)} of {total}</p>
                <div className="flex items-center gap-1">
                  <button onClick={() => updateParam('page', String(currentPage - 1))} disabled={currentPage <= 1} className="px-3 py-1.5 text-xs font-medium text-[var(--zoho-text-secondary)] bg-white border border-[var(--zoho-border)] rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer">Previous</button>
                  {pageNumbers.map((p) => (
                    <button key={p} onClick={() => updateParam('page', String(p))} className={`w-8 h-8 text-xs font-medium rounded-md transition-colors cursor-pointer ${p === currentPage ? 'bg-[#0071DC] text-white' : 'text-[var(--zoho-text-secondary)] hover:bg-gray-100'}`}>{p}</button>
                  ))}
                  <button onClick={() => updateParam('page', String(currentPage + 1))} disabled={currentPage >= totalPages} className="px-3 py-1.5 text-xs font-medium text-[var(--zoho-text-secondary)] bg-white border border-[var(--zoho-border)] rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer">Next</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
