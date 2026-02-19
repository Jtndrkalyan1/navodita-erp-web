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
  HiOutlineExclamationTriangle,
  HiOutlinePrinter,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { customerApi } from '../../api/customer.api';
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

export default function CustomerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState('invoices');

  useEffect(() => {
    const fetchCustomer = async () => {
      setLoading(true);
      try {
        const response = await customerApi.getById(id);
        const data = response.data?.data;
        if (!data) {
          toast.error('Customer not found');
          navigate('/customers');
          return;
        }
        setCustomer(data);
      } catch (err) {
        if (err.response?.status === 404) {
          toast.error('Customer not found');
          navigate('/customers');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchCustomer();
  }, [id, navigate]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await customerApi.remove(id);
      toast.success('Customer deleted successfully');
      navigate('/customers');
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
          <span className="text-sm text-[#6B7280]">Loading customer details...</span>
        </div>
      </div>
    );
  }

  if (!customer) return null;

  const billingAddress = customer.addresses?.find((a) => a.address_type === 'billing');
  const shippingAddress = customer.addresses?.find((a) => a.address_type === 'shipping');
  const invoiceSummary = customer.invoice_summary;

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/customers')}
            className="p-2 rounded-lg hover:bg-[#F3F4F6] transition-colors"
            title="Back to customers"
          >
            <HiOutlineArrowLeft className="w-5 h-5 text-[#6B7280]" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              {/* trade_name is shown as primary name if available */}
              <h1 className="text-2xl font-semibold text-[#333]">
                {customer.trade_name || customer.display_name}
              </h1>
              {customer.is_active !== false ? (
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
            {customer.trade_name && customer.trade_name !== customer.display_name && (
              <p className="text-sm text-[#6B7280] mt-0.5">{customer.display_name}</p>
            )}
            {customer.company_name && customer.company_name !== customer.display_name && customer.company_name !== customer.trade_name && (
              <p className="text-sm text-[#6B7280] mt-0.5">{customer.company_name}</p>
            )}
            {customer.legal_name && (
              <p className="text-xs text-[#9CA3AF] mt-0.5">
                <span className="font-medium">Legal:</span> {customer.legal_name}
              </p>
            )}
            {customer.customer_code && (
              <p className="text-xs text-[#9CA3AF] font-mono mt-0.5">{customer.customer_code}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => printPdf(`/api/pdf/customer/${id}`)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--zoho-text-secondary)] bg-white border border-[var(--zoho-border)] px-3 py-2 rounded-md hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <HiOutlinePrinter className="w-4 h-4" />
            Print
          </button>
          <button
            onClick={() => openPdf(`/api/pdf/customer/${id}`)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--zoho-text-secondary)] bg-white border border-[var(--zoho-border)] px-3 py-2 rounded-md hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <HiOutlineDocumentText className="w-4 h-4" />
            PDF
          </button>
          <Link
            to={`/customers/${id}/edit`}
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

      {/* Invoice Summary Banner */}
      {invoiceSummary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-4">
            <p className="text-xs text-[#6B7280] font-medium uppercase tracking-wide">Total Invoices</p>
            <p className="text-xl font-semibold text-[#333] mt-1">
              {invoiceSummary.total_invoices || 0}
            </p>
          </div>
          <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-4">
            <p className="text-xs text-[#6B7280] font-medium uppercase tracking-wide">Total Billed</p>
            <p className="text-xl font-semibold text-[#333] mt-1">
              {formatIndianCurrency(invoiceSummary.total_billed, customer.currency_code)}
            </p>
          </div>
          <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-4">
            <p className="text-xs text-[#6B7280] font-medium uppercase tracking-wide">Total Paid</p>
            <p className="text-xl font-semibold text-green-600 mt-1">
              {formatIndianCurrency(invoiceSummary.total_paid, customer.currency_code)}
            </p>
          </div>
          <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-4">
            <p className="text-xs text-[#6B7280] font-medium uppercase tracking-wide">Outstanding</p>
            <p className="text-xl font-semibold text-orange-600 mt-1">
              {formatIndianCurrency(invoiceSummary.outstanding_amount, customer.currency_code)}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Overview + Tax */}
        <div className="lg:col-span-2 space-y-6">
          {/* Overview Section */}
          <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6">
            <h2 className="text-base font-semibold text-[#333] mb-4">Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
              <InfoRow label="Customer Type" value={customer.customer_type} />
              <InfoRow
                label="Contact Person"
                value={
                  [customer.salutation, customer.first_name, customer.last_name]
                    .filter(Boolean)
                    .join(' ') || null
                }
              />
              <InfoRow label="Email" value={customer.email} icon={HiOutlineEnvelope} />
              <InfoRow label="Phone" value={customer.phone} icon={HiOutlinePhone} />
              <InfoRow label="Mobile" value={customer.mobile} icon={HiOutlinePhone} />
              <InfoRow label="Website" value={customer.website} icon={HiOutlineGlobeAlt} />
            </div>
          </div>

          {/* Tax Information */}
          <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6">
            <h2 className="text-base font-semibold text-[#333] mb-4">Tax Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
              <InfoRow label="GSTIN" value={customer.gstin} icon={HiOutlineDocumentText} />
              <InfoRow label="PAN" value={customer.pan} icon={HiOutlineDocumentText} />
              <InfoRow label="Place of Supply" value={customer.place_of_supply} icon={HiOutlineMapPin} />
              <InfoRow label="GST Treatment" value={customer.gst_treatment} />
              <InfoRow label="Tax Preference" value={customer.tax_preference} />
              <InfoRow label="Trade Name" value={customer.trade_name} />
              <InfoRow label="Legal Name" value={customer.legal_name} />
              <InfoRow label="Taxpayer Type" value={customer.taxpayer_type} />
              {customer.gst_status && (
                <div className="flex items-start gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-xs text-[#6B7280] font-medium uppercase tracking-wide">GST Status</p>
                    <span className={`inline-block mt-0.5 px-1.5 py-0.5 rounded text-xs font-medium ${customer.gst_status.toLowerCase() === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{customer.gst_status}</span>
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

        {/* Right Column: Financial + Notes */}
        <div className="space-y-6">
          {/* Financial Details */}
          <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6">
            <h2 className="text-base font-semibold text-[#333] mb-4">Financial Details</h2>
            <div className="space-y-1">
              <InfoRow label="Currency" value={customer.currency_code} icon={HiOutlineCurrencyRupee} />
              <InfoRow label="Payment Terms" value={customer.payment_terms} icon={HiOutlineBanknotes} />
              <InfoRow
                label="Opening Balance"
                value={formatIndianCurrency(customer.opening_balance, customer.currency_code)}
              />
              <InfoRow
                label="Credit Limit"
                value={
                  customer.credit_limit != null
                    ? formatIndianCurrency(customer.credit_limit, customer.currency_code)
                    : 'No limit'
                }
              />
            </div>
          </div>

          {/* Notes */}
          {customer.notes && (
            <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6">
              <h2 className="text-base font-semibold text-[#333] mb-3">Notes</h2>
              <p className="text-sm text-[#6B7280] whitespace-pre-wrap">{customer.notes}</p>
            </div>
          )}

          {/* Timestamps */}
          <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6">
            <h2 className="text-base font-semibold text-[#333] mb-3">Activity</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Created</span>
                <span className="text-[#333]">
                  {customer.created_at
                    ? new Date(customer.created_at).toLocaleDateString('en-IN', {
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
                  {customer.updated_at
                    ? new Date(customer.updated_at).toLocaleDateString('en-IN', {
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

      {/* Tabs: Invoices / Payments */}
      <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm mt-6">
        <div className="border-b border-[#E5E7EB]">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('invoices')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'invoices'
                  ? 'border-[#0071DC] text-[#0071DC]'
                  : 'border-transparent text-[#6B7280] hover:text-[#333] hover:border-gray-300'
              }`}
            >
              Invoices
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'payments'
                  ? 'border-[#0071DC] text-[#0071DC]'
                  : 'border-transparent text-[#6B7280] hover:text-[#333] hover:border-gray-300'
              }`}
            >
              Payments Received
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
          {activeTab === 'invoices' && <InvoicesTab customerId={id} navigate={navigate} currencyCode={customer.currency_code} />}
          {activeTab === 'payments' && <PaymentsTab customerId={id} navigate={navigate} currencyCode={customer.currency_code} />}
          {activeTab === 'statement' && (
            <LedgerStatementView
              entityId={id}
              entityType="customer"
              entityName={customer.display_name}
              currencyCode={customer.currency_code || 'INR'}
              fetchStatement={customerApi.getStatement}
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
                <h3 className="text-lg font-semibold text-[#333]">Delete Customer</h3>
                <p className="text-sm text-[#6B7280] mt-1">
                  Are you sure you want to delete <strong>{customer.display_name}</strong>? This
                  action will deactivate the customer record. Customers with linked invoices cannot
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
                {deleting ? 'Deleting...' : 'Delete Customer'}
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
 * Invoice status badge
 */
function InvoiceStatusBadge({ status }) {
  const styles = {
    Draft: 'bg-gray-100 text-gray-700 border-gray-200',
    Sent: 'bg-blue-50 text-blue-700 border-blue-200',
    Viewed: 'bg-blue-50 text-blue-700 border-blue-200',
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
 * Invoices tab - fetches invoices for this customer
 */
function InvoicesTab({ customerId, navigate, currencyCode }) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInvoices = async () => {
      setLoading(true);
      try {
        const response = await apiClient.get('/invoices', {
          params: { customer_id: customerId, limit: 50 },
        });
        setInvoices(response.data?.data || []);
      } catch {
        // If the invoices API is not yet available, just show empty
        setInvoices([]);
      } finally {
        setLoading(false);
      }
    };
    fetchInvoices();
  }, [customerId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-[#0071DC] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="text-center py-12">
        <HiOutlineDocumentText className="w-10 h-10 text-[#D1D5DB] mx-auto mb-3" />
        <p className="text-sm text-[#6B7280]">No invoices found for this customer.</p>
        <Link
          to="/invoices/new"
          className="inline-flex items-center gap-1.5 mt-3 text-sm text-[#0071DC] hover:text-[#005BB5] font-medium"
        >
          Create Invoice
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Invoice #</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Date</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Status</th>
            <th className="px-4 py-2.5 text-right text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Amount</th>
            <th className="px-4 py-2.5 text-right text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Balance Due</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E5E7EB]">
          {invoices.map((inv) => (
            <tr
              key={inv.id}
              onClick={() => navigate(`/invoices/${inv.id}`)}
              className="hover:bg-[#F9FAFB] cursor-pointer transition-colors"
            >
              <td className="px-4 py-2.5 font-medium text-[#0071DC]">{inv.invoice_number || '--'}</td>
              <td className="px-4 py-2.5 text-[#6B7280]">{formatDate(inv.invoice_date)}</td>
              <td className="px-4 py-2.5"><InvoiceStatusBadge status={inv.status} /></td>
              <td className="px-4 py-2.5 text-right text-[#333] font-medium">{formatIndianCurrency(inv.total_amount, currencyCode)}</td>
              <td className="px-4 py-2.5 text-right text-[#333]">{formatIndianCurrency(inv.balance_due, currencyCode)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Payments tab - fetches payments received for this customer
 */
function PaymentsTab({ customerId, navigate, currencyCode }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPayments = async () => {
      setLoading(true);
      try {
        const response = await apiClient.get('/payments-received', {
          params: { customer_id: customerId, limit: 50 },
        });
        setPayments(response.data?.data || []);
      } catch {
        setPayments([]);
      } finally {
        setLoading(false);
      }
    };
    fetchPayments();
  }, [customerId]);

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
        <p className="text-sm text-[#6B7280]">No payments received from this customer yet.</p>
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
              onClick={() => navigate(`/payments-received/${pmt.id}`)}
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
