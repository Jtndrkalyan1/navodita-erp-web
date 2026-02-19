import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  HiOutlinePlus,
  HiOutlineArrowLeft,
  HiOutlinePhone,
  HiOutlineEnvelope,
  HiOutlineBanknotes,
  HiOutlineExclamationTriangle,
  HiOutlineUserGroup,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { investorOrderApi } from '../../api/investorOrder.api';
import apiClient from '../../api/client';
import { formatINR } from '../../utils/currency';
import LoadingSpinner from '../../components/feedback/LoadingSpinner';

function PartnerTypeBadge({ type }) {
  const isInvestment = type === 'Investment';
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
        isInvestment
          ? 'bg-blue-50 text-blue-700 border border-blue-200'
          : 'bg-purple-50 text-purple-700 border border-purple-200'
      }`}
    >
      {type || 'Investment'}
    </span>
  );
}

export default function InvestorPartnersPage() {
  const navigate = useNavigate();
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [photoMap, setPhotoMap] = useState({});

  const fetchPartners = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await investorOrderApi.getPartners();
      const partnersList = res.data.data || [];
      setPartners(partnersList);

      // Fetch photos for all partners
      for (const p of partnersList) {
        try {
          const photoRes = await apiClient.get('/documents', {
            params: { entity_type: 'investor_partner', entity_id: p.id, category: 'photo' },
          });
          const docs = photoRes.data?.data || photoRes.data || [];
          if (Array.isArray(docs) && docs.length > 0) {
            const latestDoc = docs[docs.length - 1];
            const url = latestDoc.file_url || latestDoc.url || latestDoc.file_path;
            if (url) setPhotoMap((prev) => ({ ...prev, [p.id]: url }));
          }
        } catch {
          // No photo for this partner
        }
      }
    } catch (err) {
      if (err.response?.status !== 401) {
        setError('Failed to load partners. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPartners();
  }, [fetchPartners]);

  // Compute summary stats
  const totalInvestment = partners.reduce(
    (sum, p) => sum + (parseFloat(p.investment_amount) || 0),
    0
  );
  const investmentPartners = partners.filter((p) => p.partner_type === 'Investment').length;
  const timePartners = partners.filter((p) => p.partner_type === 'Time').length;

  return (
    <div>
      {/* Header */}
      <div className="bg-white border-b border-[var(--zoho-border)] px-6 py-4 -mx-6 -mt-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/investor-orders"
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors flex items-center gap-1"
            >
              <HiOutlineArrowLeft className="w-4 h-4" />
              Investor Report
            </Link>
            <span className="text-gray-300">|</span>
            <h1 className="text-xl font-semibold text-[var(--zoho-text)]">
              Partners
            </h1>
            <span className="text-xs font-medium text-gray-500 bg-gray-100 rounded-full px-2.5 py-0.5">
              {partners.length}
            </span>
          </div>
          <div className="flex items-center gap-2 print-hide">
            <Link
              to="/investor-orders/partners/new"
              className="inline-flex items-center gap-1.5 bg-[#0071DC] hover:bg-[#005BB5] text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
            >
              <HiOutlinePlus className="w-4 h-4" />
              Add Partner
            </Link>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {!loading && !error && partners.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-[var(--zoho-border)] p-4 flex items-center gap-4">
            <div className="w-11 h-11 rounded-lg flex items-center justify-center bg-blue-500">
              <HiOutlineUserGroup className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Partners</p>
              <p className="text-lg font-semibold text-gray-900 mt-0.5">{partners.length}</p>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-[var(--zoho-border)] p-4 flex items-center gap-4">
            <div className="w-11 h-11 rounded-lg flex items-center justify-center bg-green-500">
              <HiOutlineBanknotes className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Investment</p>
              <p className="text-lg font-semibold text-gray-900 mt-0.5 tabular-nums">{formatINR(totalInvestment)}</p>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-[var(--zoho-border)] p-4 flex items-center gap-4">
            <div className="w-11 h-11 rounded-lg flex items-center justify-center bg-purple-500">
              <HiOutlineUserGroup className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">By Type</p>
              <p className="text-sm font-medium text-gray-900 mt-0.5">
                {investmentPartners} Investment, {timePartners} Time
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Partners List */}
      <div className="bg-white rounded-lg border border-[var(--zoho-border)] overflow-hidden">
        {loading ? (
          <div className="py-20">
            <LoadingSpinner size="lg" label="Loading partners..." />
          </div>
        ) : error ? (
          <div className="py-20 text-center">
            <HiOutlineExclamationTriangle className="w-12 h-12 text-red-300 mx-auto mb-3" />
            <p className="text-sm text-red-600 mb-3">{error}</p>
            <button
              onClick={fetchPartners}
              className="text-sm text-[#0071DC] hover:underline cursor-pointer"
            >
              Try again
            </button>
          </div>
        ) : partners.length === 0 ? (
          <div className="py-20 text-center">
            <HiOutlineUserGroup className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500 mb-3">No partners yet</p>
            <Link
              to="/investor-orders/partners/new"
              className="text-sm text-[#0071DC] hover:underline"
            >
              Add your first partner
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {partners.map((partner) => (
              <div
                key={partner.id}
                onClick={() => navigate(`/investor-orders/partners/${partner.id}`)}
                className="flex items-center justify-between px-6 py-4 hover:bg-blue-50/30 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-4 min-w-0">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-[#0071DC] flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {photoMap[partner.id] ? (
                      <img src={photoMap[partner.id]} alt={partner.partner_name} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <span className="text-white text-sm font-semibold">
                        {(partner.partner_name || 'P').charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  {/* Info */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900 truncate">
                        {partner.partner_name}
                      </span>
                      <PartnerTypeBadge type={partner.partner_type} />
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      {partner.phone && (
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <HiOutlinePhone className="w-3 h-3" />
                          {partner.phone}
                        </span>
                      )}
                      {partner.email && (
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <HiOutlineEnvelope className="w-3 h-3" />
                          {partner.email}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-4">
                  <div className="text-sm font-semibold text-gray-900 tabular-nums">
                    {formatINR(partner.investment_amount)}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5 tabular-nums">
                    Ratio: {((parseFloat(partner.ratio) || 0) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
