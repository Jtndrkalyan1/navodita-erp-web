import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  HiOutlineArrowLeft,
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlineChevronDown,
  HiOutlineMagnifyingGlass,
  HiOutlineXMark,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import apiClient from '../../api/client';
import { formatINR } from '../../utils/currency';
import { formatIndianNumber } from '../../components/data-display/CurrencyCell';
import FormField, { inputClassName } from '../../components/forms/FormField';
import DatePicker from '../../components/forms/DatePicker';
import SelectField from '../../components/forms/SelectField';
import LoadingSpinner from '../../components/feedback/LoadingSpinner';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges';

// ── Constants ──────────────────────────────────────────────────────

const SUPPLY_TYPES = [
  { value: 'Outward', label: 'Outward' },
  { value: 'Inward', label: 'Inward' },
];

const DOCUMENT_TYPES = [
  { value: 'Tax Invoice', label: 'Tax Invoice' },
  { value: 'Bill of Supply', label: 'Bill of Supply' },
  { value: 'Bill of Entry', label: 'Bill of Entry' },
  { value: 'Delivery Challan', label: 'Delivery Challan' },
  { value: 'Credit Note', label: 'Credit Note' },
  { value: 'Others', label: 'Others' },
];

const TRANSPORT_MODES = [
  { value: 'Road', label: 'Road' },
  { value: 'Rail', label: 'Rail' },
  { value: 'Ship', label: 'Ship' },
  { value: 'Air', label: 'Air' },
];

const STATUS_OPTIONS = [
  { value: 'Active', label: 'Active' },
  { value: 'Cancelled', label: 'Cancelled' },
];

const GST_RATES = [0, 0.25, 3, 5, 12, 18, 28];

const EMPTY_ITEM = {
  item_name: '',
  description: '',
  hsn_code: '',
  quantity: 1,
  unit: '',
  rate: 0,
  gst_rate: 18,
};

// ── Helpers ────────────────────────────────────────────────────────

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

function oneDayLater() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

function computeItemTaxable(item) {
  const qty = Number(item.quantity) || 0;
  const rate = Number(item.rate) || 0;
  return qty * rate;
}

function computeItemGst(item) {
  const taxable = computeItemTaxable(item);
  const gstRate = Number(item.gst_rate) || 0;
  return (taxable * gstRate) / 100;
}

// ── Customer Search Dropdown ───────────────────────────────────────

function CustomerSearchDropdown({ customers, value, onChange, error }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  const selectedCustomer = customers.find((c) => c.id === value);

  const filtered = useMemo(() => {
    if (!search.trim()) return customers;
    const q = search.toLowerCase();
    return customers.filter(
      (c) =>
        (c.display_name || '').toLowerCase().includes(q) ||
        (c.company_name || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q)
    );
  }, [customers, search]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSelect(customer) {
    onChange(customer);
    setIsOpen(false);
    setSearch('');
  }

  function handleClear(e) {
    e.stopPropagation();
    onChange(null);
    setSearch('');
  }

  return (
    <FormField label="Customer" required error={error}>
      <div ref={wrapperRef} className="relative">
        {/* Display / Trigger */}
        <div
          onClick={() => {
            setIsOpen(!isOpen);
            setTimeout(() => inputRef.current?.focus(), 50);
          }}
          className={`${inputClassName(error)} flex items-center justify-between cursor-pointer min-h-[38px]`}
        >
          <span className={selectedCustomer ? 'text-[var(--zoho-text)]' : 'text-gray-400'}>
            {selectedCustomer
              ? selectedCustomer.display_name || selectedCustomer.company_name
              : 'Select a customer...'}
          </span>
          <div className="flex items-center gap-1">
            {selectedCustomer && (
              <button
                onClick={handleClear}
                className="p-0.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                type="button"
              >
                <HiOutlineXMark className="w-3.5 h-3.5" />
              </button>
            )}
            <HiOutlineChevronDown
              className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            />
          </div>
        </div>

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute z-50 mt-1 w-full bg-white border border-[var(--zoho-border)] rounded-lg shadow-lg max-h-72 overflow-hidden">
            {/* Search input */}
            <div className="px-3 py-2 border-b border-gray-100">
              <div className="relative">
                <HiOutlineMagnifyingGlass className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  ref={inputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search customers..."
                  className="w-full pl-8 pr-3 py-1.5 text-sm border border-[var(--zoho-border)] rounded-md bg-white text-[var(--zoho-text)] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
                />
              </div>
            </div>

            {/* Options */}
            <div className="max-h-52 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-gray-400">
                  No customers found
                </div>
              ) : (
                filtered.map((customer) => (
                  <button
                    key={customer.id}
                    onClick={() => handleSelect(customer)}
                    type="button"
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors cursor-pointer hover:bg-blue-50 ${
                      customer.id === value ? 'bg-blue-50 text-[#0071DC]' : 'text-[var(--zoho-text)]'
                    }`}
                  >
                    <div className="font-medium">
                      {customer.display_name || customer.company_name}
                    </div>
                    {customer.company_name && customer.display_name !== customer.company_name && (
                      <div className="text-xs text-[var(--zoho-text-secondary)] mt-0.5">
                        {customer.company_name}
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </FormField>
  );
}

// ── Main Component ─────────────────────────────────────────────────

export default function EWayBillFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const { isDirty, setIsDirty, confirmLeave } = useUnsavedChanges();

  // Loading states
  const [pageLoading, setPageLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [customersLoading, setCustomersLoading] = useState(true);

  // Form state
  const [form, setForm] = useState({
    eway_bill_number: '',
    bill_date: todayISO(),
    valid_until: oneDayLater(),
    customer_id: '',
    invoice_id: '',
    supply_type: 'Outward',
    document_type: 'Tax Invoice',
    transporter_name: '',
    transporter_id: '',
    transport_mode: 'Road',
    vehicle_number: '',
    dispatch_from_gstin: '',
    dispatch_from_address: '',
    ship_to_gstin: '',
    ship_to_address: '',
    distance_km: '',
    total_amount: 0,
    total_gst: 0,
    remarks: '',
    status: 'Active',
  });

  const [items, setItems] = useState([{ ...EMPTY_ITEM }]);
  const [errors, setErrors] = useState({});
  const [ewayBillNumber, setEwayBillNumber] = useState('');

  // ── Load customers ───────────────────────────────────────────────

  useEffect(() => {
    async function loadCustomers() {
      try {
        const res = await apiClient.get('/customers', { params: { limit: 500 } });
        setCustomers(res.data.data || res.data || []);
      } catch {
        setCustomers([]);
      } finally {
        setCustomersLoading(false);
      }
    }
    loadCustomers();
  }, []);

  // ── Load e-way bill for editing ────────────────────────────────────

  useEffect(() => {
    if (!isEdit) return;
    async function loadEwayBill() {
      try {
        const res = await apiClient.get(`/eway-bills/${id}`);
        const bill = res.data.data || res.data;
        if (!bill) {
          toast.error('E-Way Bill not found');
          navigate('/eway-bills', { replace: true });
          return;
        }

        setEwayBillNumber(bill.eway_bill_number || '');

        setForm({
          eway_bill_number: bill.eway_bill_number || '',
          bill_date: bill.bill_date || todayISO(),
          valid_until: bill.valid_until || oneDayLater(),
          customer_id: bill.customer_id || '',
          invoice_id: bill.invoice_id || '',
          supply_type: bill.supply_type || 'Outward',
          document_type: bill.document_type || 'Tax Invoice',
          transporter_name: bill.transporter_name || '',
          transporter_id: bill.transporter_id || '',
          transport_mode: bill.transport_mode || 'Road',
          vehicle_number: bill.vehicle_number || '',
          dispatch_from_gstin: bill.dispatch_from_gstin || '',
          dispatch_from_address: bill.dispatch_from_address || '',
          ship_to_gstin: bill.ship_to_gstin || '',
          ship_to_address: bill.ship_to_address || '',
          distance_km: bill.distance_km ?? '',
          total_amount: bill.total_amount || 0,
          total_gst: bill.total_gst || 0,
          remarks: bill.remarks || '',
          status: bill.status || 'Active',
        });

        // Load line items
        const lineItems = (bill.items || []).map((item) => ({
          id: item.id,
          item_name: item.item_name || '',
          description: item.description || '',
          hsn_code: item.hsn_code || '',
          quantity: item.quantity ?? 1,
          unit: item.unit || '',
          rate: item.rate ?? 0,
          gst_rate: item.gst_rate ?? 18,
        }));

        setItems(lineItems.length > 0 ? lineItems : [{ ...EMPTY_ITEM }]);
      } catch (err) {
        if (err.response?.status === 404) {
          toast.error('E-Way Bill not found');
          navigate('/eway-bills', { replace: true });
        }
      } finally {
        setPageLoading(false);
      }
    }
    loadEwayBill();
  }, [id, isEdit, navigate]);

  // ── Form update helper ───────────────────────────────────────────

  function updateForm(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
    // Clear field error
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  // ── Customer selection handler ───────────────────────────────────

  function handleCustomerSelect(customer) {
    if (!customer) {
      updateForm('customer_id', '');
      return;
    }
    updateForm('customer_id', customer.id);

    // Auto-fill ship-to info from customer
    const addr = customer.shipping_address || customer.billing_address || customer.address || {};
    const addressParts = [
      addr.address_line1 || customer.address_line1,
      addr.address_line2 || customer.address_line2,
      [addr.city || customer.city, addr.state || customer.state, addr.pincode || customer.pincode]
        .filter(Boolean)
        .join(', '),
      addr.country || customer.country,
    ].filter(Boolean);

    setForm((prev) => ({
      ...prev,
      customer_id: customer.id,
      ship_to_gstin: customer.gstin || customer.gst_number || prev.ship_to_gstin,
      ship_to_address: addressParts.join(', ') || prev.ship_to_address,
    }));
    setIsDirty(true);
  }

  // ── Line items handlers ──────────────────────────────────────────

  function updateItem(index, field, value) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
    setIsDirty(true);
    if (errors.items) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.items;
        return next;
      });
    }
  }

  function addItem() {
    setItems((prev) => [...prev, { ...EMPTY_ITEM }]);
    setIsDirty(true);
  }

  function removeItem(index) {
    setItems((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
    setIsDirty(true);
  }

  // ── Totals ────────────────────────────────────────────────────────

  const totals = useMemo(() => {
    let subtotal = 0;
    let totalGst = 0;

    items.forEach((item) => {
      const taxable = computeItemTaxable(item);
      const gst = computeItemGst(item);
      subtotal += taxable;
      totalGst += gst;
    });

    const grandTotal = subtotal + totalGst;

    return { subtotal, totalGst, grandTotal };
  }, [items]);

  // ── Validation ──────────────────────────────────────────────────

  function validate() {
    const errs = {};

    if (!form.eway_bill_number?.trim()) {
      errs.eway_bill_number = 'E-Way Bill number is required';
    }
    if (!form.bill_date) {
      errs.bill_date = 'Bill date is required';
    }
    if (!form.valid_until) {
      errs.valid_until = 'Valid until date is required';
    }
    if (!form.customer_id) {
      errs.customer_id = 'Customer is required';
    }
    if (!form.supply_type) {
      errs.supply_type = 'Supply type is required';
    }
    if (!form.transport_mode) {
      errs.transport_mode = 'Transport mode is required';
    }

    // Validate line items
    const validItems = items.filter(
      (item) => item.item_name?.trim() || Number(item.quantity) > 0 || Number(item.rate) > 0
    );
    if (validItems.length === 0) {
      errs.items = 'At least one line item is required';
    } else {
      validItems.forEach((item, i) => {
        if (!item.item_name?.trim()) {
          errs[`item_${i}_name`] = 'Item name is required';
        }
        if (Number(item.quantity) <= 0) {
          errs[`item_${i}_qty`] = 'Quantity must be greater than 0';
        }
      });
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // ── Submit ──────────────────────────────────────────────────────

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) {
      toast.error('Please fix the errors before saving.');
      return;
    }

    setSaving(true);

    // Build payload
    const lineItems = items
      .filter((item) => item.item_name?.trim())
      .map((item, idx) => {
        const taxableAmount = computeItemTaxable(item);
        const gstAmount = computeItemGst(item);
        return {
          ...(item.id ? { id: item.id } : {}),
          item_name: item.item_name,
          description: item.description,
          hsn_code: item.hsn_code,
          quantity: Number(item.quantity) || 0,
          unit: item.unit || '',
          rate: Number(item.rate) || 0,
          taxable_amount: taxableAmount,
          gst_rate: Number(item.gst_rate) || 0,
          gst_amount: gstAmount,
          sort_order: idx,
        };
      });

    const payload = {
      ...form,
      distance_km: form.distance_km !== '' ? Number(form.distance_km) : null,
      total_amount: totals.grandTotal,
      total_gst: totals.totalGst,
      items: lineItems,
    };

    try {
      if (isEdit) {
        await apiClient.put(`/eway-bills/${id}`, payload);
        toast.success('E-Way Bill updated successfully');
      } else {
        const res = await apiClient.post('/eway-bills', payload);
        const newId = res.data?.data?.id || res.data?.id;
        toast.success('E-Way Bill created successfully');
        setIsDirty(false);
        navigate(newId ? `/eway-bills/${newId}` : '/eway-bills', { replace: true });
        return;
      }
      setIsDirty(false);
      navigate(`/eway-bills/${id}`, { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.detail || 'Failed to save e-way bill';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  // ── Cancel ──────────────────────────────────────────────────────

  function handleCancel() {
    if (confirmLeave()) {
      navigate(isEdit ? `/eway-bills/${id}` : '/eway-bills');
    }
  }

  // ── Input classes ───────────────────────────────────────────────

  const lineInputClass =
    'w-full px-2 py-1.5 text-sm border border-transparent rounded bg-transparent text-[var(--zoho-text)] hover:border-[var(--zoho-border)] focus:border-[#0071DC] focus:ring-1 focus:ring-[#0071DC]/20 focus:outline-none transition-colors';

  // ── Render ──────────────────────────────────────────────────────

  if (pageLoading) {
    return (
      <div className="py-20">
        <LoadingSpinner size="lg" label="Loading e-way bill..." />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="pb-8">
      {/* Header */}
      <div className="bg-white border-b border-[var(--zoho-border)] px-6 py-4 -mx-6 -mt-6 mb-6">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleCancel}
            className="p-1.5 rounded-md text-[var(--zoho-text-secondary)] hover:text-[var(--zoho-text)] hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <HiOutlineArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-semibold text-[var(--zoho-text)]">
            {isEdit ? `Edit E-Way Bill${ewayBillNumber ? ` #${ewayBillNumber}` : ''}` : 'New E-Way Bill'}
          </h1>
        </div>
      </div>

      {/* Form Body */}
      <div className="space-y-6">
        {/* ── Section: Basic Info ───────────────────────────────────── */}
        <div className="bg-white rounded-lg border border-[var(--zoho-border)] p-6">
          <h3 className="text-sm font-semibold text-[var(--zoho-text)] mb-4 uppercase tracking-wide">
            Basic Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1">
            {/* E-Way Bill Number */}
            <FormField label="E-Way Bill Number" required error={errors.eway_bill_number}>
              <input
                type="text"
                value={form.eway_bill_number}
                onChange={(e) => updateForm('eway_bill_number', e.target.value)}
                placeholder="Enter e-way bill number"
                className={inputClassName(errors.eway_bill_number)}
              />
            </FormField>

            {/* Bill Date */}
            <DatePicker
              label="Bill Date"
              value={form.bill_date}
              onChange={(v) => updateForm('bill_date', v)}
              required
              error={errors.bill_date}
            />

            {/* Valid Until */}
            <DatePicker
              label="Valid Until"
              value={form.valid_until}
              onChange={(v) => updateForm('valid_until', v)}
              required
              error={errors.valid_until}
            />

            {/* Customer */}
            <div className="lg:col-span-2">
              <CustomerSearchDropdown
                customers={customers}
                value={form.customer_id}
                onChange={handleCustomerSelect}
                error={errors.customer_id}
              />
            </div>

            {/* Status */}
            <SelectField
              label="Status"
              value={form.status}
              onChange={(v) => updateForm('status', v)}
              options={STATUS_OPTIONS}
              placeholder=""
            />

            {/* Supply Type */}
            <SelectField
              label="Supply Type"
              value={form.supply_type}
              onChange={(v) => updateForm('supply_type', v)}
              options={SUPPLY_TYPES}
              required
              error={errors.supply_type}
              placeholder=""
            />

            {/* Document Type */}
            <SelectField
              label="Document Type"
              value={form.document_type}
              onChange={(v) => updateForm('document_type', v)}
              options={DOCUMENT_TYPES}
              placeholder=""
            />

            {/* Invoice ID (optional) */}
            <FormField label="Invoice Reference (Optional)">
              <input
                type="text"
                value={form.invoice_id}
                onChange={(e) => updateForm('invoice_id', e.target.value)}
                placeholder="Related invoice number"
                className={inputClassName()}
              />
            </FormField>
          </div>
        </div>

        {/* ── Section: Transport Details ────────────────────────────── */}
        <div className="bg-white rounded-lg border border-[var(--zoho-border)] p-6">
          <h3 className="text-sm font-semibold text-[var(--zoho-text)] mb-4 uppercase tracking-wide">
            Transport Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1">
            {/* Transporter Name */}
            <FormField label="Transporter Name">
              <input
                type="text"
                value={form.transporter_name}
                onChange={(e) => updateForm('transporter_name', e.target.value)}
                placeholder="Name of the transporter"
                className={inputClassName()}
              />
            </FormField>

            {/* Transporter ID */}
            <FormField label="Transporter ID (GSTIN)">
              <input
                type="text"
                value={form.transporter_id}
                onChange={(e) => updateForm('transporter_id', e.target.value.toUpperCase())}
                placeholder="e.g. 29ABCDE1234F1Z5"
                maxLength={15}
                className={inputClassName()}
              />
            </FormField>

            {/* Transport Mode */}
            <SelectField
              label="Transport Mode"
              value={form.transport_mode}
              onChange={(v) => updateForm('transport_mode', v)}
              options={TRANSPORT_MODES}
              required
              error={errors.transport_mode}
              placeholder=""
            />

            {/* Vehicle Number */}
            <FormField label="Vehicle Number">
              <input
                type="text"
                value={form.vehicle_number}
                onChange={(e) => updateForm('vehicle_number', e.target.value.toUpperCase())}
                placeholder="e.g. KA01AB1234"
                className={inputClassName()}
              />
            </FormField>

            {/* Distance */}
            <FormField label="Distance (km)">
              <input
                type="number"
                value={form.distance_km}
                onChange={(e) => updateForm('distance_km', e.target.value)}
                placeholder="Approximate distance in km"
                min="0"
                step="1"
                className={inputClassName()}
              />
            </FormField>
          </div>
        </div>

        {/* ── Section: Dispatch & Ship To ───────────────────────────── */}
        <div className="bg-white rounded-lg border border-[var(--zoho-border)] p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Dispatch From */}
            <div>
              <h3 className="text-sm font-semibold text-[var(--zoho-text)] mb-4 uppercase tracking-wide">
                Dispatch From
              </h3>
              <div className="space-y-1">
                <FormField label="GSTIN">
                  <input
                    type="text"
                    value={form.dispatch_from_gstin}
                    onChange={(e) => updateForm('dispatch_from_gstin', e.target.value.toUpperCase())}
                    placeholder="Dispatch GSTIN"
                    maxLength={15}
                    className={inputClassName()}
                  />
                </FormField>
                <FormField label="Address">
                  <textarea
                    value={form.dispatch_from_address}
                    onChange={(e) => updateForm('dispatch_from_address', e.target.value)}
                    rows={3}
                    placeholder="Full dispatch address including PIN code"
                    className={`${inputClassName()} resize-none`}
                  />
                </FormField>
              </div>
            </div>

            {/* Ship To */}
            <div>
              <h3 className="text-sm font-semibold text-[var(--zoho-text)] mb-4 uppercase tracking-wide">
                Ship To
              </h3>
              <div className="space-y-1">
                <FormField label="GSTIN">
                  <input
                    type="text"
                    value={form.ship_to_gstin}
                    onChange={(e) => updateForm('ship_to_gstin', e.target.value.toUpperCase())}
                    placeholder="Ship-to GSTIN"
                    maxLength={15}
                    className={inputClassName()}
                  />
                </FormField>
                <FormField label="Address">
                  <textarea
                    value={form.ship_to_address}
                    onChange={(e) => updateForm('ship_to_address', e.target.value)}
                    rows={3}
                    placeholder="Full shipping address including PIN code"
                    className={`${inputClassName()} resize-none`}
                  />
                </FormField>
              </div>
            </div>
          </div>
        </div>

        {/* ── Section: Line Items ───────────────────────────────────── */}
        <div className="bg-white rounded-lg border border-[var(--zoho-border)] overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--zoho-border)]">
            <h3 className="text-sm font-semibold text-[var(--zoho-text)] uppercase tracking-wide">
              Line Items
            </h3>
            {errors.items && (
              <p className="text-xs text-red-600 mt-1">{errors.items}</p>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-[var(--zoho-border)]">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--zoho-text-secondary)] w-10">
                    #
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--zoho-text-secondary)] min-w-[180px]">
                    Item Name
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--zoho-text-secondary)] min-w-[140px]">
                    Description
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--zoho-text-secondary)] w-28">
                    HSN Code
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--zoho-text-secondary)] w-20">
                    Qty
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--zoho-text-secondary)] w-20">
                    Unit
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--zoho-text-secondary)] w-28">
                    Rate ({'\u20B9'})
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--zoho-text-secondary)] w-28">
                    Taxable Amt
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--zoho-text-secondary)] w-24">
                    GST %
                  </th>
                  <th className="px-3 py-3 w-10" />
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => {
                  const taxableAmount = computeItemTaxable(item);
                  const hasNameError = !!errors[`item_${index}_name`];
                  const hasQtyError = !!errors[`item_${index}_qty`];
                  return (
                    <tr
                      key={index}
                      className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="px-4 py-2 text-xs text-[var(--zoho-text-secondary)] align-top pt-3">
                        {index + 1}
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="text"
                          value={item.item_name || ''}
                          onChange={(e) => updateItem(index, 'item_name', e.target.value)}
                          placeholder="Enter item name"
                          className={`${lineInputClass} ${hasNameError ? 'border-red-300 bg-red-50/50' : ''}`}
                        />
                        {hasNameError && (
                          <p className="text-[10px] text-red-500 px-2 mt-0.5">{errors[`item_${index}_name`]}</p>
                        )}
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="text"
                          value={item.description || ''}
                          onChange={(e) => updateItem(index, 'description', e.target.value)}
                          placeholder="Description"
                          className={lineInputClass}
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="text"
                          value={item.hsn_code || ''}
                          onChange={(e) => updateItem(index, 'hsn_code', e.target.value)}
                          placeholder="HSN"
                          className={lineInputClass}
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="number"
                          value={item.quantity ?? ''}
                          onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                          min="0"
                          step="1"
                          className={`${lineInputClass} text-right ${hasQtyError ? 'border-red-300 bg-red-50/50' : ''}`}
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="text"
                          value={item.unit || ''}
                          onChange={(e) => updateItem(index, 'unit', e.target.value)}
                          placeholder="e.g. Pcs"
                          className={lineInputClass}
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="number"
                          value={item.rate ?? ''}
                          onChange={(e) => updateItem(index, 'rate', e.target.value)}
                          min="0"
                          step="0.01"
                          className={`${lineInputClass} text-right`}
                        />
                      </td>
                      <td className="px-4 py-2 text-right text-sm font-medium text-[var(--zoho-text)] tabular-nums align-top pt-3">
                        {'\u20B9'}{formatIndianNumber(taxableAmount)}
                      </td>
                      <td className="px-2 py-1">
                        <select
                          value={item.gst_rate ?? 18}
                          onChange={(e) => updateItem(index, 'gst_rate', e.target.value)}
                          className={`${lineInputClass} text-right appearance-none cursor-pointer pr-1`}
                        >
                          {GST_RATES.map((r) => (
                            <option key={r} value={r}>
                              {r}%
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-2 align-top pt-2.5">
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          disabled={items.length <= 1}
                          className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                          aria-label={`Remove item ${index + 1}`}
                        >
                          <HiOutlineTrash className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {items.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-sm text-gray-400">
                      No line items added yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Add button */}
          <div className="px-6 py-3 border-t border-gray-100">
            <button
              type="button"
              onClick={addItem}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[#0071DC] hover:text-[#005BB5] transition-colors cursor-pointer"
            >
              <HiOutlinePlus className="w-4 h-4" />
              Add Line Item
            </button>
          </div>

          {/* ── Totals Section ─────────────────────────────────────── */}
          {items.some((item) => item.item_name?.trim() || Number(item.rate) > 0) && (
            <div className="border-t border-[var(--zoho-border)] bg-gray-50">
              <div className="flex justify-end px-6 py-5">
                <div className="w-full max-w-md space-y-2">
                  {/* Subtotal (Taxable) */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--zoho-text-secondary)]">Taxable Amount</span>
                    <span className="font-medium text-[var(--zoho-text)] tabular-nums">
                      {'\u20B9'}{formatIndianNumber(totals.subtotal)}
                    </span>
                  </div>

                  {/* Total GST */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--zoho-text-secondary)]">Total GST</span>
                    <span className="text-[var(--zoho-text)] tabular-nums">
                      {'\u20B9'}{formatIndianNumber(totals.totalGst)}
                    </span>
                  </div>

                  {/* Grand Total */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-300">
                    <span className="text-base font-bold text-[var(--zoho-text)]">Total Amount</span>
                    <span className="text-lg font-bold text-[var(--zoho-text)] tabular-nums">
                      {formatINR(totals.grandTotal)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Section: Remarks ──────────────────────────────────────── */}
        <div className="bg-white rounded-lg border border-[var(--zoho-border)] p-6">
          <h3 className="text-sm font-semibold text-[var(--zoho-text)] mb-4 uppercase tracking-wide">
            Remarks
          </h3>
          <FormField label="Remarks / Notes">
            <textarea
              value={form.remarks}
              onChange={(e) => updateForm('remarks', e.target.value)}
              rows={3}
              placeholder="Any additional remarks or notes for this e-way bill"
              className={`${inputClassName()} resize-none`}
            />
          </FormField>
        </div>

        {/* ── Action Buttons ──────────────────────────────────────── */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 bg-[#0071DC] hover:bg-[#005BB5] text-white text-sm font-medium px-6 py-2.5 rounded-md transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            {saving && (
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle
                  className="opacity-25"
                  cx="12" cy="12" r="10"
                  stroke="currentColor" strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            )}
            {saving ? 'Saving...' : isEdit ? 'Update E-Way Bill' : 'Save E-Way Bill'}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={saving}
            className="px-6 py-2.5 text-sm font-medium text-[var(--zoho-text)] bg-white border border-[var(--zoho-border)] rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </form>
  );
}
