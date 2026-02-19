import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  HiOutlineArrowLeft,
  HiOutlinePencilSquare,
  HiOutlineTrash,
  HiOutlineEnvelope,
  HiOutlinePhone,
  HiOutlineGlobeAlt,
  HiOutlineMapPin,
  HiOutlineDocumentText,
  HiOutlineBanknotes,
  HiOutlineCurrencyRupee,
  HiOutlineBuildingLibrary,
  HiOutlineExclamationTriangle,
  HiOutlinePrinter,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { vendorApi } from '../../api/vendor.api';
import apiClient from '../../api/client';
import { openPdf, printPdf } from '../../utils/pdf';
import LedgerStatementView from '../../components/data-display/LedgerStatementView';

/**
 * Format a number in Indian numbering system (lakhs/crores).
 */
function formatIndianCurrency(value, currencyCode = 'INR') {
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

  const symbols = { INR: '\u20B9', USD: '$', EUR: '\u20AC', GBP: '\u00A3' };
  const symbol = symbols[currencyCode] || currencyCode + ' ';

  return `${isNegative ? '-' : ''}${symbol}${result}.${decPart}`;
}

function InfoRow({ label, value, icon: Icon }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      {Icon && <Icon className="w-4 h-4 text-[#6B7280] mt-0.5 flex-shrink-0" />}
      <div className="min-w-0">
        <p className="text-xs text-[#6B7280] font-medium uppercase tracking-wide">{label}</p>
        <p className="text-sm text-[#333] mt-0.5 break-words">{value || '--'}</p>
      </div>
    </div>
  );
}

function AddressCard({ title, address }) {
  if (!address) return null;

  const parts = [
    address.attention && `Attn: ${address.attention}`,
    address.address_line1,
    address.address_line2,
    [address.city, address.state, address.pincode].filter(Boolean).join(', '),
    address.country,
  ].filter(Boolean);

  if (parts.length === 0 && !address.phone) return null;

  return (
    <div>
      <h4 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-2">{title}</h4>
      <div className="text-sm text-[#333] space-y-0.5">
        {parts.map((line, i) => (
          <p key={i}>{line}</p>
        ))}
        {address.phone && (
          <p className="text-[#6B7280] mt-1">Phone: {address.phone}</p>
        )}
      </div>
    </div>
  );
}

export default function VendorDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState('bills');

  useEffect(() => {
    const fetchVendor = async () => {
      setLoading(true);
      try {
        const response = await vendorApi.getById(id);
        const data = response.data?.data;
        if (!data) {
          toast.error('Vendor not found');
          navigate('/vendors');
          return;
        }
        setVendor(data);
      } catch (err) {
        if (err.response?.status === 404) {
          toast.error('Vendor not found');
          navigate('/vendors');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchVendor();
  }, [id, navigate]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await vendorApi.remove(id);
      toast.success('Vendor deleted successfully');
      navigate('/vendors');
    } catch (err) {
      if (err.response?.data?.error) {
        toast.error(err.response.data.error);
      }
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#0071DC] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-[#6B7280]">Loading vendor details...</span>
        </div>
      </div>
    );
  }

  if (!vendor) return null;

  const billingAddress = vendor.addresses?.find((a) => a.address_type === 'billing');
  const shippingAddress = vendor.addresses?.find((a) => a.address_type === 'shipping');
  const billSummary = vendor.bill_summary;
  const hasBankDetails = vendor.bank_name || vendor.bank_account_number || vendor.bank_ifsc;

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/vendors')}
            className="p-2 rounded-lg hover:bg-[#F3F4F6] transition-colors"
            title="Back to vendors"
          >
            <HiOutlineArrowLeft className="w-5 h-5 text-[#6B7280]" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              {/* trade_name is shown as primary name if available */}
              <h1 className="text-2xl font-semibold text-[#333]">
                {vendor.trade_name || vendor.display_name}
              </h1>
              {vendor.is_active !== false ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                  Active
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                  Inactive
                </span>
              )}
            </div>
            {/* If trade_name is shown as primary, show display_name as subtitle */}
            {vendor.trade_name && vendor.trade_name !== vendor.display_name && (
              <p className="text-sm text-[#6B7280] mt-0.5">{vendor.display_name}</p>
            )}
            {vendor.company_name && vendor.company_name !== vendor.display_name && vendor.company_name !== vendor.trade_name && (
              <p className="text-sm text-[#6B7280] mt-0.5">{vendor.company_name}</p>
            )}
            {vendor.legal_name && (
              <p className="text-xs text-[#9CA3AF] mt-0.5">
                <span className="font-medium">Legal:</span> {vendor.legal_name}
              </p>
            )}
            {vendor.vendor_code && (
              <p className="text-xs text-[#9CA3AF] font-mono mt-0.5">{vendor.vendor_code}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => printPdf(`/api/pdf/vendor/${id}`)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--zoho-text-secondary)] bg-white border border-[var(--zoho-border)] px-3 py-2 rounded-md hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <HiOutlinePrinter className="w-4 h-4" />
            Print
          </button>
          <button
            onClick={() => openPdf(`/api/pdf/vendor/${id}`)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--zoho-text-secondary)] bg-white border border-[var(--zoho-border)] px-3 py-2 rounded-md hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <HiOutlineDocumentText className="w-4 h-4" />
            PDF
          </button>
          <Link
            to={`/vendors/${id}/edit`}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-[#333] bg-white border border-[#E5E7EB] rounded-lg hover:bg-[#F9FAFB] transition-colors"
          >
            <HiOutlinePencilSquare className="w-4 h-4" />
            Edit
          </Link>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
          >
            <HiOutlineTrash className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>

      {/* Bill Summary Banner */}
      {billSummary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-4">
            <p className="text-xs text-[#6B7280] font-medium uppercase tracking-wide">Total Bills</p>
            <p className="text-xl font-semibold text-[#333] mt-1">
              {billSummary.total_bills || 0}
            </p>
          </div>
          <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-4">
            <p className="text-xs text-[#6B7280] font-medium uppercase tracking-wide">Total Billed</p>
            <p className="text-xl font-semibold text-[#333] mt-1">
              {formatIndianCurrency(billSummary.total_billed, vendor.currency_code)}
            </p>
          </div>
          <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-4">
            <p className="text-xs text-[#6B7280] font-medium uppercase tracking-wide">Total Paid</p>
            <p className="text-xl font-semibold text-green-600 mt-1">
              {formatIndianCurrency(billSummary.total_paid, vendor.currency_code)}
            </p>
          </div>
          <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-4">
            <p className="text-xs text-[#6B7280] font-medium uppercase tracking-wide">Outstanding</p>
            <p className="text-xl font-semibold text-orange-600 mt-1">
              {formatIndianCurrency(billSummary.outstanding_amount, vendor.currency_code)}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Overview + Tax + Addresses */}
        <div className="lg:col-span-2 space-y-6">
          {/* Overview Section */}
          <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6">
            <h2 className="text-base font-semibold text-[#333] mb-4">Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
              <InfoRow label="Vendor Type" value={vendor.vendor_type} />
              <InfoRow
                label="Contact Person"
                value={
                  [vendor.salutation, vendor.first_name, vendor.last_name]
                    .filter(Boolean)
                    .join(' ') || null
                }
              />
              <InfoRow label="Email" value={vendor.email} icon={HiOutlineEnvelope} />
              <InfoRow label="Phone" value={vendor.phone} icon={HiOutlinePhone} />
              <InfoRow label="Mobile" value={vendor.mobile} icon={HiOutlinePhone} />
              <InfoRow label="Website" value={vendor.website} icon={HiOutlineGlobeAlt} />
            </div>
          </div>

          {/* Tax Information */}
          <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6">
            <h2 className="text-base font-semibold text-[#333] mb-4">Tax Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
              <InfoRow label="GSTIN" value={vendor.gstin} icon={HiOutlineDocumentText} />
              <InfoRow label="PAN" value={vendor.pan} icon={HiOutlineDocumentText} />
              <InfoRow label="MSME / Udyam No." value={vendor.msme_number} icon={HiOutlineDocumentText} />
              <InfoRow label="Place of Supply" value={vendor.place_of_supply} icon={HiOutlineMapPin} />
              <InfoRow label="GST Treatment" value={vendor.gst_treatment} />
              <InfoRow label="Tax Preference" value={vendor.tax_preference} />
              <InfoRow label="Trade Name" value={vendor.trade_name} />
              <InfoRow label="Legal Name" value={vendor.legal_name} />
              <InfoRow label="Taxpayer Type" value={vendor.taxpayer_type} />
              {vendor.gst_status && (
                <div className="flex items-start gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-xs text-[#6B7280] font-medium uppercase tracking-wide">GST Status</p>
                    <span className={`inline-block mt-0.5 px-1.5 py-0.5 rounded text-xs font-medium ${vendor.gst_status.toLowerCase() === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{vendor.gst_status}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Addresses */}
          <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6">
            <h2 className="text-base font-semibold text-[#333] mb-4">Addresses</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <AddressCard title="Billing Address" address={billingAddress} />
              <AddressCard title="Shipping Address" address={shippingAddress} />
              {!billingAddress && !shippingAddress && (
                <p className="text-sm text-[#9CA3AF] italic col-span-2">No addresses on file</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Financial + Bank Details + Notes + Activity */}
        <div className="space-y-6">
          {/* Financial Details */}
          <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6">
            <h2 className="text-base font-semibold text-[#333] mb-4">Financial Details</h2>
            <div className="space-y-1">
              <InfoRow label="Currency" value={vendor.currency_code} icon={HiOutlineCurrencyRupee} />
              <InfoRow label="Payment Terms" value={vendor.payment_terms} icon={HiOutlineBanknotes} />
              <InfoRow
                label="Opening Balance"
                value={formatIndianCurrency(vendor.opening_balance, vendor.currency_code)}
              />
              <InfoRow
                label="Credit Limit"
                value={
                  vendor.credit_limit != null
                    ? formatIndianCurrency(vendor.credit_limit, vendor.currency_code)
                    : 'No limit'
                }
              />
            </div>
          </div>

          {/* Bank Details */}
          <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6">
            <h2 className="text-base font-semibold text-[#333] mb-4">Bank Details</h2>
            {hasBankDetails ? (
              <div className="space-y-1">
                <InfoRow label="Bank Name" value={vendor.bank_name} icon={HiOutlineBuildingLibrary} />
                <InfoRow label="Account Number" value={vendor.bank_account_number} />
                <InfoRow label="IFSC Code" value={vendor.bank_ifsc} />
                <InfoRow label="Account Holder" value={vendor.bank_account_name} />
                <InfoRow label="Account Type" value={vendor.bank_account_type} />
              </div>
            ) : (
              <p className="text-sm text-[#9CA3AF] italic">No bank details on file</p>
            )}
          </div>

          {/* Notes */}
          {vendor.notes && (
            <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6">
              <h2 className="text-base font-semibold text-[#333] mb-3">Notes</h2>
              <p className="text-sm text-[#6B7280] whitespace-pre-wrap">{vendor.notes}</p>
            </div>
          )}

          {/* Timestamps */}
          <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6">
            <h2 className="text-base font-semibold text-[#333] mb-3">Activity</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Created</span>
                <span className="text-[#333]">
                  {vendor.created_at
                    ? new Date(vendor.created_at).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })
                    : '--'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Last Updated</span>
                <span className="text-[#333]">
                  {vendor.updated_at
                    ? new Date(vendor.updated_at).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })
                    : '--'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs: Bills / Payments Made */}
      <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm mt-6">
        <div className="border-b border-[#E5E7EB]">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('bills')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'bills'
                  ? 'border-[#0071DC] text-[#0071DC]'
                  : 'border-transparent text-[#6B7280] hover:text-[#333] hover:border-gray-300'
              }`}
            >
              Bills
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'payments'
                  ? 'border-[#0071DC] text-[#0071DC]'
                  : 'border-transparent text-[#6B7280] hover:text-[#333] hover:border-gray-300'
              }`}
            >
              Payments Made
            </button>
            <button
              onClick={() => setActiveTab('statement')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'statement'
                  ? 'border-[#0071DC] text-[#0071DC]'
                  : 'border-transparent text-[#6B7280] hover:text-[#333] hover:border-gray-300'
              }`}
            >
              Statement
            </button>
          </nav>
        </div>
        <div className="p-6">
          {activeTab === 'bills' && <BillsTab vendorId={id} navigate={navigate} currencyCode={vendor.currency_code} />}
          {activeTab === 'payments' && <PaymentsMadeTab vendorId={id} navigate={navigate} currencyCode={vendor.currency_code} />}
          {activeTab === 'statement' && (
            <LedgerStatementView
              entityId={id}
              entityType="vendor"
              entityName={vendor.display_name}
              currencyCode={vendor.currency_code || 'INR'}
              fetchStatement={vendorApi.getStatement}
            />
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => !deleting && setShowDeleteModal(false)}
          />

          {/* Modal */}
          <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <HiOutlineExclamationTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#333]">Delete Vendor</h3>
                <p className="text-sm text-[#6B7280] mt-1">
                  Are you sure you want to delete <strong>{vendor.display_name}</strong>? This
                  action will deactivate the vendor record. Vendors with linked bills cannot
                  be deleted.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-[#333] bg-white border border-[#E5E7EB] rounded-lg hover:bg-[#F9FAFB] transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {deleting && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                {deleting ? 'Deleting...' : 'Delete Vendor'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Helper: format date for table display
 */
function formatDate(dateStr) {
  if (!dateStr) return '--';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '--';
  }
}

/**
 * Bill status badge
 */
function BillStatusBadge({ status }) {
  const styles = {
    Draft: 'bg-gray-100 text-gray-700 border-gray-200',
    Open: 'bg-blue-50 text-blue-700 border-blue-200',
    'Partially Paid': 'bg-yellow-50 text-yellow-700 border-yellow-200',
    Paid: 'bg-green-50 text-green-700 border-green-200',
    Overdue: 'bg-red-50 text-red-700 border-red-200',
    Cancelled: 'bg-gray-100 text-gray-500 border-gray-200',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
        styles[status] || styles.Draft
      }`}
    >
      {status || 'Draft'}
    </span>
  );
}

/**
 * Bills tab - fetches bills for this vendor
 */
function BillsTab({ vendorId, navigate, currencyCode }) {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBills = async () => {
      setLoading(true);
      try {
        const response = await apiClient.get('/bills', {
          params: { vendor_id: vendorId, limit: 50 },
        });
        setBills(response.data?.data || []);
      } catch {
        // If the bills API is not yet available, just show empty
        setBills([]);
      } finally {
        setLoading(false);
      }
    };
    fetchBills();
  }, [vendorId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-[#0071DC] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (bills.length === 0) {
    return (
      <div className="text-center py-12">
        <HiOutlineDocumentText className="w-10 h-10 text-[#D1D5DB] mx-auto mb-3" />
        <p className="text-sm text-[#6B7280]">No bills found for this vendor.</p>
        <Link
          to="/bills/new"
          className="inline-flex items-center gap-1.5 mt-3 text-sm text-[#0071DC] hover:text-[#005BB5] font-medium"
        >
          Create Bill
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Bill #</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Date</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Due Date</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Status</th>
            <th className="px-4 py-2.5 text-right text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Amount</th>
            <th className="px-4 py-2.5 text-right text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Balance Due</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E5E7EB]">
          {bills.map((bill) => (
            <tr
              key={bill.id}
              onClick={() => navigate(`/bills/${bill.id}`)}
              className="hover:bg-[#F9FAFB] cursor-pointer transition-colors"
            >
              <td className="px-4 py-2.5 font-medium text-[#0071DC]">{bill.bill_number || '--'}</td>
              <td className="px-4 py-2.5 text-[#6B7280]">{formatDate(bill.bill_date)}</td>
              <td className="px-4 py-2.5 text-[#6B7280]">{formatDate(bill.due_date)}</td>
              <td className="px-4 py-2.5"><BillStatusBadge status={bill.status} /></td>
              <td className="px-4 py-2.5 text-right text-[#333] font-medium">{formatIndianCurrency(bill.total_amount, currencyCode)}</td>
              <td className="px-4 py-2.5 text-right text-[#333]">{formatIndianCurrency(bill.balance_due, currencyCode)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Payments Made tab - fetches payments made to this vendor
 */
function PaymentsMadeTab({ vendorId, navigate, currencyCode }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPayments = async () => {
      setLoading(true);
      try {
        const response = await apiClient.get('/payments-made', {
          params: { vendor_id: vendorId, limit: 50 },
        });
        setPayments(response.data?.data || []);
      } catch {
        setPayments([]);
      } finally {
        setLoading(false);
      }
    };
    fetchPayments();
  }, [vendorId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-[#0071DC] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (payments.length === 0) {
    return (
      <div className="text-center py-12">
        <HiOutlineBanknotes className="w-10 h-10 text-[#D1D5DB] mx-auto mb-3" />
        <p className="text-sm text-[#6B7280]">No payments made to this vendor yet.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Payment #</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Date</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Mode</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Reference</th>
            <th className="px-4 py-2.5 text-right text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E5E7EB]">
          {payments.map((pmt) => (
            <tr
              key={pmt.id}
              onClick={() => navigate(`/payments-made/${pmt.id}`)}
              className="hover:bg-[#F9FAFB] cursor-pointer transition-colors"
            >
              <td className="px-4 py-2.5 font-medium text-[#0071DC]">{pmt.payment_number || '--'}</td>
              <td className="px-4 py-2.5 text-[#6B7280]">{formatDate(pmt.payment_date)}</td>
              <td className="px-4 py-2.5 text-[#6B7280]">{pmt.payment_mode || '--'}</td>
              <td className="px-4 py-2.5 text-[#6B7280] font-mono text-xs">{pmt.reference_number || '--'}</td>
              <td className="px-4 py-2.5 text-right text-[#333] font-medium">{formatIndianCurrency(pmt.amount, currencyCode)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
