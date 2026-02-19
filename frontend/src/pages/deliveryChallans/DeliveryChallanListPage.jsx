import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  HiOutlinePlus,
  HiOutlineDocumentText,
  HiOutlineExclamationTriangle,
  HiOutlineTrash,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import apiClient from '../../api/client';
import { formatINR } from '../../utils/currency';
import StatusBadge from '../../components/data-display/StatusBadge';
import DateCell from '../../components/data-display/DateCell';
import ZohoSearchBar from '../../components/layout/ZohoSearchBar';
import ZohoPaymentBanner from '../../components/layout/ZohoPaymentBanner';
import ZohoColumnHeader from '../../components/layout/ZohoColumnHeader';
import ZohoEmptyState from '../../components/layout/ZohoEmptyState';
import LoadingSpinner from '../../components/feedback/LoadingSpinner';

const STATUS_TABS = [
  { key: '', label: 'All' },
  { key: 'Draft', label: 'Draft' },
  { key: 'Open', label: 'Open' },
  { key: 'Closed', label: 'Closed' },
  { key: 'Cancelled', label: 'Cancelled' },
];

const PAGE_SIZE = 50;

export default function DeliveryChallanListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [challans, setChallans] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Client-side sort state
  const [clientSortBy, setClientSortBy] = useState('date_desc');

  const currentStatus = searchParams.get('status') || '';
  const currentSearch = searchParams.get('search') || '';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const sortBy = searchParams.get('sort_by') || 'created_at';
  const sortOrder = searchParams.get('sort_order') || 'desc';

  const [summary, setSummary] = useState({
    totalAmount: 0,
    supplyCount: 0,
    jobWorkCount: 0,
    exhibitionCount: 0,
  });

  const fetchChallans = useCallback(async () => {
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

      const res = await apiClient.get('/delivery-challans', { params });
      const { data, total: totalCount } = res.data;
      setChallans(data || []);
      setTotal(totalCount || 0);
      computeSummary(data || []);
    } catch (err) {
      if (err.response?.status !== 401) {
        setError('Failed to load delivery challans. Please try again.');
      }
      setChallans([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [currentPage, currentSearch, currentStatus, sortBy, sortOrder]);

  useEffect(() => {
    fetchChallans();
  }, [fetchChallans]);

  function computeSummary(data) {
    let totalAmount = 0;
    let supplyCount = 0;
    let jobWorkCount = 0;
    let exhibitionCount = 0;

    data.forEach((dc) => {
      totalAmount += Number(dc.total_amount) || 0;
      if (dc.challan_type === 'Supply') supplyCount++;
      else if (dc.challan_type === 'Job Work') jobWorkCount++;
      else if (dc.challan_type === 'Exhibition') exhibitionCount++;
    });

    setSummary({ totalAmount, supplyCount, jobWorkCount, exhibitionCount });
  }

  // Client-side sorted data
  const sortedChallans = useMemo(() => {
    const arr = [...challans];
    switch (clientSortBy) {
      case 'date_asc': return arr.sort((a, b) => new Date(a.challan_date||a.created_at||0) - new Date(b.challan_date||b.created_at||0));
      case 'date_desc': return arr.sort((a, b) => new Date(b.challan_date||b.created_at||0) - new Date(a.challan_date||a.created_at||0));
      case 'amount_desc': return arr.sort((a, b) => parseFloat(b.total_amount||0) - parseFloat(a.total_amount||0));
      case 'amount_asc': return arr.sort((a, b) => parseFloat(a.total_amount||0) - parseFloat(b.total_amount||0));
      case 'name_asc': return arr.sort((a, b) => (a.customer_name||'').localeCompare(b.customer_name||''));
      default: return arr;
    }
  }, [challans, clientSortBy]);

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

  function handleDeleteClick(e, item) {
    e.stopPropagation();
    setDeleteConfirm(item);
  }

  async function handleDeleteConfirm() {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/delivery-challans/${deleteConfirm.id}`);
      toast.success(`Delivery challan ${deleteConfirm.challan_number} deleted successfully.`);
      setDeleteConfirm(null);
      fetchChallans();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete delivery challan.');
    } finally {
      setDeleting(false);
    }
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
            <h1 className="text-xl font-semibold text-[var(--zoho-text)]">Delivery Challans</h1>
            {!loading && (
              <span className="text-xs font-medium text-[var(--zoho-text-secondary)] bg-gray-100 rounded-full px-2.5 py-0.5">{total}</span>
            )}
          </div>
          <Link to="/delivery-challans/new" className="inline-flex items-center gap-1.5 bg-[#0071DC] hover:bg-[#005BB5] text-white text-sm font-medium px-4 py-2 rounded-md transition-colors duration-150">
            <HiOutlinePlus className="w-4 h-4" />
            New Delivery Challan
          </Link>
        </div>
      </div>

      <ZohoPaymentBanner
        items={[
          { label: 'Total Value', value: formatINR(summary.totalAmount), color: '#0071DC' },
          { label: 'Supply', value: String(summary.supplyCount), color: '#16A34A' },
          { label: 'Job Work', value: String(summary.jobWorkCount), color: '#F59E0B' },
          { label: 'Exhibition', value: String(summary.exhibitionCount), color: '#8B5CF6' },
        ]}
      />

      <div className="bg-white rounded-lg border border-[var(--zoho-border)] overflow-hidden">
        <div className="flex items-center gap-0 border-b border-[var(--zoho-border)] px-4">
          {STATUS_TABS.map((tab) => (
            <button key={tab.key} onClick={() => updateParam('status', tab.key)} className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors duration-150 cursor-pointer whitespace-nowrap ${currentStatus === tab.key ? 'border-[#0071DC] text-[#0071DC]' : 'border-transparent text-[var(--zoho-text-secondary)] hover:text-[var(--zoho-text)] hover:border-gray-300'}`}>
              {tab.label}
            </button>
          ))}
          <div className="ml-auto py-2 flex items-center gap-2">
            <select
              value={clientSortBy}
              onChange={e => setClientSortBy(e.target.value)}
              className="px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm bg-white text-[#333] focus:outline-none cursor-pointer"
            >
              <option value="date_desc">Date: Newest First</option>
              <option value="date_asc">Date: Oldest First</option>
              <option value="amount_desc">Amount: High to Low</option>
              <option value="amount_asc">Amount: Low to High</option>
              <option value="name_asc">Name: A to Z</option>
            </select>
            <ZohoSearchBar value={currentSearch} onChange={(s) => updateParam('search', s)} placeholder="Search challans..." className="w-64" />
          </div>
        </div>

        {loading ? (
          <div className="py-20"><LoadingSpinner size="lg" label="Loading delivery challans..." /></div>
        ) : error ? (
          <div className="py-20 text-center">
            <HiOutlineExclamationTriangle className="w-12 h-12 text-red-300 mx-auto mb-3" />
            <p className="text-sm text-red-600 mb-3">{error}</p>
            <button onClick={fetchChallans} className="text-sm text-[#0071DC] hover:underline cursor-pointer">Try again</button>
          </div>
        ) : challans.length === 0 ? (
          <ZohoEmptyState
            icon={HiOutlineDocumentText}
            title={currentSearch || currentStatus ? 'No delivery challans match your filters' : 'No delivery challans yet'}
            description={currentSearch || currentStatus ? 'Try adjusting your search or filter criteria.' : 'Create your first delivery challan to start tracking dispatches.'}
            actionLabel={!currentSearch && !currentStatus ? 'New Delivery Challan' : undefined}
            onAction={!currentSearch && !currentStatus ? () => navigate('/delivery-challans/new') : undefined}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <ZohoColumnHeader label="Challan #" field="challan_number" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
                    <ZohoColumnHeader label="Customer" field="customer_name" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
                    <ZohoColumnHeader label="Date" field="challan_date" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
                    <ZohoColumnHeader label="Type" field="challan_type" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
                    <ZohoColumnHeader label="Status" field="status" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
                    <ZohoColumnHeader label="Amount" field="total_amount" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} align="right" />
                    <th className="w-12" />
                  </tr>
                </thead>
                <tbody>
                  {sortedChallans.map((dc, index) => (
                    <tr key={dc.id} onClick={() => navigate(`/delivery-challans/${dc.id}`)} className={`border-b border-gray-100 cursor-pointer transition-colors duration-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'} hover:bg-blue-50/50`}>
                      <td className="px-4 py-3 text-sm font-medium text-[#0071DC]">{dc.challan_number}</td>
                      <td className="px-4 py-3 text-sm text-[var(--zoho-text)]">{dc.customer?.company_name || dc.customer?.display_name || dc.customer_name || '--'}</td>
                      <td className="px-4 py-3"><DateCell date={dc.challan_date} /></td>
                      <td className="px-4 py-3 text-sm text-[var(--zoho-text)]">{dc.challan_type || '--'}</td>
                      <td className="px-4 py-3"><StatusBadge status={dc.status} size="sm" /></td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-[var(--zoho-text)] tabular-nums">{formatINR(dc.total_amount)}</td>
                      <td className="px-2 py-3 text-center">
                        <button
                          onClick={(e) => handleDeleteClick(e, dc)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors duration-150 cursor-pointer"
                          title="Delete challan"
                        >
                          <HiOutlineTrash className="w-4 h-4" />
                        </button>
                      </td>
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

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <HiOutlineTrash className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Delete Delivery Challan</h3>
                <p className="text-sm text-gray-500 mt-0.5">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-sm text-gray-700 mb-6">
              Are you sure you want to delete challan <span className="font-semibold text-gray-900">{deleteConfirm.challan_number}</span>?
            </p>
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50 transition-colors cursor-pointer"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
