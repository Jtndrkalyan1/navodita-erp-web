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
import { quotationApi } from '../../api/quotation.api';
import { customerApi } from '../../api/customer.api';
import { formatINR, amountInWords } from '../../utils/currency';
import { formatIndianNumber } from '../../components/data-display/CurrencyCell';
import FormField, { inputClassName } from '../../components/forms/FormField';
import DatePicker from '../../components/forms/DatePicker';
import SelectField from '../../components/forms/SelectField';
import LoadingSpinner from '../../components/feedback/LoadingSpinner';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges';

// ── Constants ──────────────────────────────────────────────────────

const COMPANY_STATE = 'Haryana'; // Company registered state for GST

const EMPTY_ITEM = {
  item_name: '',
  description: '',
  hsn_code: '',
  quantity: 1,
  rate: 0,
  gst_rate: 18,
};

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
];

const GST_RATES = [0, 0.25, 3, 5, 12, 18, 28];

// ── Helpers ────────────────────────────────────────────────────────

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

function thirtyDaysLater() {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().split('T')[0];
}

function computeItemAmount(item) {
  const qty = Number(item.quantity) || 0;
  const rate = Number(item.rate) || 0;
  return qty * rate;
}

function computeItemGst(item) {
  const amount = computeItemAmount(item);
  const gstRate = Number(item.gst_rate) || 0;
  return (amount * gstRate) / 100;
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

export default function QuotationFormPage() {
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
    quotation_date: todayISO(),
    expiry_date: thirtyDaysLater(),
    customer_id: '',
    status: 'Draft',
    reference_number: '',
    place_of_supply: '',
    // Bill to
    bill_to_attention: '',
    bill_to_address_line1: '',
    bill_to_address_line2: '',
    bill_to_city: '',
    bill_to_state: '',
    bill_to_pincode: '',
    bill_to_country: 'India',
    // Ship to
    ship_to_attention: '',
    ship_to_address_line1: '',
    ship_to_address_line2: '',
    ship_to_city: '',
    ship_to_state: '',
    ship_to_pincode: '',
    ship_to_country: 'India',
    // Other
    remarks: '',
    terms_and_conditions: '',
    shipping_charge: 0,
  });

  const [items, setItems] = useState([{ ...EMPTY_ITEM }]);
  const [errors, setErrors] = useState({});
  const [quotationNumber, setQuotationNumber] = useState('');

  // ── Load customers ───────────────────────────────────────────────

  useEffect(() => {
    async function loadCustomers() {
      try {
        const res = await customerApi.list({ limit: 200 });
        setCustomers(res.data.data || res.data || []);
      } catch {
        setCustomers([]);
      } finally {
        setCustomersLoading(false);
      }
    }
    loadCustomers();
  }, []);

  // ── Load quotation for editing ─────────────────────────────────

  useEffect(() => {
    if (!isEdit) return;
    async function loadQuotation() {
      try {
        const res = await quotationApi.getById(id);
        const q = res.data.data || res.data;
        if (!q) {
          toast.error('Quotation not found');
          navigate('/quotations', { replace: true });
          return;
        }

        setQuotationNumber(q.quotation_number || '');

        setForm({
          quotation_date: q.quotation_date || todayISO(),
          expiry_date: q.expiry_date || thirtyDaysLater(),
          customer_id: q.customer_id || '',
          status: q.status || 'Draft',
          reference_number: q.reference_number || '',
          place_of_supply: q.place_of_supply || '',
          bill_to_attention: q.bill_to_attention || '',
          bill_to_address_line1: q.bill_to_address_line1 || '',
          bill_to_address_line2: q.bill_to_address_line2 || '',
          bill_to_city: q.bill_to_city || '',
          bill_to_state: q.bill_to_state || '',
          bill_to_pincode: q.bill_to_pincode || '',
          bill_to_country: q.bill_to_country || 'India',
          ship_to_attention: q.ship_to_attention || '',
          ship_to_address_line1: q.ship_to_address_line1 || '',
          ship_to_address_line2: q.ship_to_address_line2 || '',
          ship_to_city: q.ship_to_city || '',
          ship_to_state: q.ship_to_state || '',
          ship_to_pincode: q.ship_to_pincode || '',
          ship_to_country: q.ship_to_country || 'India',
          remarks: q.remarks || q.customer_notes || '',
          terms_and_conditions: q.terms_and_conditions || '',
          shipping_charge: q.shipping_charge || 0,
        });

        // Load line items
        const lineItems = (q.items || q.quotation_items || []).map((item) => ({
          id: item.id,
          item_id: item.item_id || '',
          item_name: item.item_name || '',
          description: item.description || '',
          hsn_code: item.hsn_code || '',
          quantity: item.quantity ?? 1,
          rate: item.rate ?? 0,
          gst_rate: item.gst_rate ?? 18,
          unit: item.unit || '',
          sort_order: item.sort_order ?? 0,
        }));

        setItems(lineItems.length > 0 ? lineItems : [{ ...EMPTY_ITEM }]);
      } catch (err) {
        if (err.response?.status === 404) {
          toast.error('Quotation not found');
          navigate('/quotations', { replace: true });
        }
      } finally {
        setPageLoading(false);
      }
    }
    loadQuotation();
  }, [id, isEdit, navigate]);

  // ── Form update helper ───────────────────────────────────────────

  function updateForm(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
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

    // Auto-fill address from customer data
    const addr = customer.billing_address || customer.address || {};
    setForm((prev) => ({
      ...prev,
      customer_id: customer.id,
      bill_to_attention: customer.display_name || customer.company_name || '',
      bill_to_address_line1: addr.address_line1 || customer.address_line1 || '',
      bill_to_address_line2: addr.address_line2 || customer.address_line2 || '',
      bill_to_city: addr.city || customer.city || '',
      bill_to_state: addr.state || customer.state || '',
      bill_to_pincode: addr.pincode || customer.pincode || '',
      bill_to_country: addr.country || customer.country || 'India',
      place_of_supply: addr.state || customer.state || customer.place_of_supply || prev.place_of_supply,
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

  // ── GST calculation ──────────────────────────────────────────────

  const isInterState = useMemo(() => {
    const placeOfSupply = form.place_of_supply || form.bill_to_state || '';
    if (!placeOfSupply) return false;
    return placeOfSupply.toLowerCase() !== COMPANY_STATE.toLowerCase();
  }, [form.place_of_supply, form.bill_to_state]);

  const totals = useMemo(() => {
    let subtotal = 0;
    let totalGst = 0;

    items.forEach((item) => {
      const amount = computeItemAmount(item);
      const gst = computeItemGst(item);
      subtotal += amount;
      totalGst += gst;
    });

    const shipping = Number(form.shipping_charge) || 0;

    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    if (isInterState) {
      igst = totalGst;
    } else {
      cgst = totalGst / 2;
      sgst = totalGst / 2;
    }

    const grandTotal = subtotal + totalGst + shipping;

    return { subtotal, totalGst, cgst, sgst, igst, shipping, grandTotal };
  }, [items, form.shipping_charge, isInterState]);

  // ── Validation ────────────────────────────────────────────────────

  function validate() {
    const errs = {};

    if (!form.customer_id) {
      errs.customer_id = 'Customer is required';
    }
    if (!form.quotation_date) {
      errs.quotation_date = 'Quotation date is required';
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

  // ── Submit ────────────────────────────────────────────────────────

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
        const amount = computeItemAmount(item);
        const gstAmount = computeItemGst(item);
        return {
          ...(item.id ? { id: item.id } : {}),
          item_id: item.item_id || null,
          item_name: item.item_name,
          description: item.description,
          hsn_code: item.hsn_code,
          quantity: Number(item.quantity) || 0,
          unit: item.unit || '',
          rate: Number(item.rate) || 0,
          gst_rate: Number(item.gst_rate) || 0,
          igst_amount: isInterState ? gstAmount : 0,
          cgst_amount: isInterState ? 0 : gstAmount / 2,
          sgst_amount: isInterState ? 0 : gstAmount / 2,
          amount,
          sort_order: idx,
        };
      });

    const payload = {
      ...form,
      sub_total: totals.subtotal,
      igst_amount: totals.igst,
      cgst_amount: totals.cgst,
      sgst_amount: totals.sgst,
      total_tax: totals.totalGst,
      shipping_charge: totals.shipping,
      total_amount: totals.grandTotal,
      items: lineItems,
    };

    try {
      if (isEdit) {
        await quotationApi.update(id, payload);
        toast.success('Quotation updated successfully');
      } else {
        const res = await quotationApi.create(payload);
        const newId = res.data?.data?.id || res.data?.id;
        toast.success('Quotation created successfully');
        setIsDirty(false);
        navigate(newId ? `/quotations/${newId}` : '/quotations', { replace: true });
        return;
      }
      setIsDirty(false);
      navigate(`/quotations/${id}`, { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Failed to save quotation';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  // ── Cancel ────────────────────────────────────────────────────────

  function handleCancel() {
    if (confirmLeave()) {
      navigate(isEdit ? `/quotations/${id}` : '/quotations');
    }
  }

  // ── Input classes ─────────────────────────────────────────────────

  const lineInputClass =
    'w-full px-2 py-1.5 text-sm border border-transparent rounded bg-transparent text-[var(--zoho-text)] hover:border-[var(--zoho-border)] focus:border-[#0071DC] focus:ring-1 focus:ring-[#0071DC]/20 focus:outline-none transition-colors';

  // ── Render ────────────────────────────────────────────────────────

  if (pageLoading) {
    return (
      <div className="py-20">
        <LoadingSpinner size="lg" label="Loading quotation..." />
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
            {isEdit ? `Edit Quotation${quotationNumber ? ` #${quotationNumber}` : ''}` : 'New Quotation'}
          </h1>
        </div>
      </div>

      {/* Form Body */}
      <div className="space-y-6">
        {/* ── Primary Fields ──────────────────────────────────────── */}
        <div className="bg-white rounded-lg border border-[var(--zoho-border)] p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1">
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
              options={[
                { value: 'Draft', label: 'Draft' },
                { value: 'Sent', label: 'Sent' },
                { value: 'Accepted', label: 'Accepted' },
                { value: 'Declined', label: 'Declined' },
              ]}
              placeholder=""
            />

            {/* Quotation Date */}
            <DatePicker
              label="Quotation Date"
              value={form.quotation_date}
              onChange={(v) => updateForm('quotation_date', v)}
              required
              error={errors.quotation_date}
            />

            {/* Expiry Date */}
            <DatePicker
              label="Expiry Date"
              value={form.expiry_date}
              onChange={(v) => updateForm('expiry_date', v)}
            />

            {/* Reference */}
            <FormField label="Reference Number">
              <input
                type="text"
                value={form.reference_number}
                onChange={(e) => updateForm('reference_number', e.target.value)}
                placeholder="PO # or reference"
                className={inputClassName()}
              />
            </FormField>

            {/* Place of Supply */}
            <SelectField
              label="Place of Supply"
              value={form.place_of_supply}
              onChange={(v) => updateForm('place_of_supply', v)}
              options={INDIAN_STATES.map((s) => ({ value: s, label: s }))}
              placeholder="Select state..."
              helpText={
                form.place_of_supply
                  ? isInterState
                    ? 'Inter-state supply (IGST applicable)'
                    : 'Intra-state supply (CGST + SGST applicable)'
                  : undefined
              }
            />
          </div>
        </div>

        {/* ── Address Section ─────────────────────────────────────── */}
        <div className="bg-white rounded-lg border border-[var(--zoho-border)] p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Bill To */}
            <div>
              <h3 className="text-sm font-semibold text-[var(--zoho-text)] mb-4 uppercase tracking-wide">
                Bill To
              </h3>
              <div className="space-y-1">
                <FormField label="Attention">
                  <input
                    type="text"
                    value={form.bill_to_attention}
                    onChange={(e) => updateForm('bill_to_attention', e.target.value)}
                    className={inputClassName()}
                  />
                </FormField>
                <FormField label="Address Line 1">
                  <input
                    type="text"
                    value={form.bill_to_address_line1}
                    onChange={(e) => updateForm('bill_to_address_line1', e.target.value)}
                    className={inputClassName()}
                  />
                </FormField>
                <FormField label="Address Line 2">
                  <input
                    type="text"
                    value={form.bill_to_address_line2}
                    onChange={(e) => updateForm('bill_to_address_line2', e.target.value)}
                    className={inputClassName()}
                  />
                </FormField>
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="City">
                    <input
                      type="text"
                      value={form.bill_to_city}
                      onChange={(e) => updateForm('bill_to_city', e.target.value)}
                      className={inputClassName()}
                    />
                  </FormField>
                  <SelectField
                    label="State"
                    value={form.bill_to_state}
                    onChange={(v) => updateForm('bill_to_state', v)}
                    options={INDIAN_STATES.map((s) => ({ value: s, label: s }))}
                    placeholder="Select..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="PIN Code">
                    <input
                      type="text"
                      value={form.bill_to_pincode}
                      onChange={(e) => updateForm('bill_to_pincode', e.target.value)}
                      maxLength={6}
                      className={inputClassName()}
                    />
                  </FormField>
                  <FormField label="Country">
                    <input
                      type="text"
                      value={form.bill_to_country}
                      onChange={(e) => updateForm('bill_to_country', e.target.value)}
                      className={inputClassName()}
                    />
                  </FormField>
                </div>
              </div>
            </div>

            {/* Ship To */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-[var(--zoho-text)] uppercase tracking-wide">
                  Ship To
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setForm((prev) => ({
                      ...prev,
                      ship_to_attention: prev.bill_to_attention,
                      ship_to_address_line1: prev.bill_to_address_line1,
                      ship_to_address_line2: prev.bill_to_address_line2,
                      ship_to_city: prev.bill_to_city,
                      ship_to_state: prev.bill_to_state,
                      ship_to_pincode: prev.bill_to_pincode,
                      ship_to_country: prev.bill_to_country,
                    }));
                    setIsDirty(true);
                  }}
                  className="text-xs text-[#0071DC] hover:text-[#005BB5] font-medium cursor-pointer"
                >
                  Copy from Bill To
                </button>
              </div>
              <div className="space-y-1">
                <FormField label="Attention">
                  <input
                    type="text"
                    value={form.ship_to_attention}
                    onChange={(e) => updateForm('ship_to_attention', e.target.value)}
                    className={inputClassName()}
                  />
                </FormField>
                <FormField label="Address Line 1">
                  <input
                    type="text"
                    value={form.ship_to_address_line1}
                    onChange={(e) => updateForm('ship_to_address_line1', e.target.value)}
                    className={inputClassName()}
                  />
                </FormField>
                <FormField label="Address Line 2">
                  <input
                    type="text"
                    value={form.ship_to_address_line2}
                    onChange={(e) => updateForm('ship_to_address_line2', e.target.value)}
                    className={inputClassName()}
                  />
                </FormField>
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="City">
                    <input
                      type="text"
                      value={form.ship_to_city}
                      onChange={(e) => updateForm('ship_to_city', e.target.value)}
                      className={inputClassName()}
                    />
                  </FormField>
                  <SelectField
                    label="State"
                    value={form.ship_to_state}
                    onChange={(v) => updateForm('ship_to_state', v)}
                    options={INDIAN_STATES.map((s) => ({ value: s, label: s }))}
                    placeholder="Select..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="PIN Code">
                    <input
                      type="text"
                      value={form.ship_to_pincode}
                      onChange={(e) => updateForm('ship_to_pincode', e.target.value)}
                      maxLength={6}
                      className={inputClassName()}
                    />
                  </FormField>
                  <FormField label="Country">
                    <input
                      type="text"
                      value={form.ship_to_country}
                      onChange={(e) => updateForm('ship_to_country', e.target.value)}
                      className={inputClassName()}
                    />
                  </FormField>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Line Items ──────────────────────────────────────────── */}
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
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--zoho-text-secondary)] min-w-[200px]">
                    Item Name
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--zoho-text-secondary)] min-w-[160px]">
                    Description
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--zoho-text-secondary)] w-28">
                    HSN Code
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--zoho-text-secondary)] w-24">
                    Qty
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--zoho-text-secondary)] w-32">
                    Rate ({'\u20B9'})
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--zoho-text-secondary)] w-24">
                    GST %
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--zoho-text-secondary)] w-36">
                    Amount ({'\u20B9'})
                  </th>
                  <th className="px-3 py-3 w-10" />
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => {
                  const amount = computeItemAmount(item);
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
                          type="number"
                          value={item.rate ?? ''}
                          onChange={(e) => updateItem(index, 'rate', e.target.value)}
                          min="0"
                          step="0.01"
                          className={`${lineInputClass} text-right`}
                        />
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
                      <td className="px-4 py-2 text-right text-sm font-medium text-[var(--zoho-text)] tabular-nums align-top pt-3">
                        {'\u20B9'}{formatIndianNumber(amount)}
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
                    <td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-400">
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
                  {/* Subtotal */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--zoho-text-secondary)]">Subtotal</span>
                    <span className="font-medium text-[var(--zoho-text)] tabular-nums">
                      {'\u20B9'}{formatIndianNumber(totals.subtotal)}
                    </span>
                  </div>

                  {/* GST breakdown */}
                  {isInterState ? (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[var(--zoho-text-secondary)]">IGST</span>
                      <span className="text-[var(--zoho-text)] tabular-nums">
                        {'\u20B9'}{formatIndianNumber(totals.igst)}
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[var(--zoho-text-secondary)]">CGST</span>
                        <span className="text-[var(--zoho-text)] tabular-nums">
                          {'\u20B9'}{formatIndianNumber(totals.cgst)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[var(--zoho-text-secondary)]">SGST</span>
                        <span className="text-[var(--zoho-text)] tabular-nums">
                          {'\u20B9'}{formatIndianNumber(totals.sgst)}
                        </span>
                      </div>
                    </>
                  )}

                  {/* Freight / Shipping */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--zoho-text-secondary)]">Freight / Shipping</span>
                    <div className="w-32">
                      <input
                        type="number"
                        value={form.shipping_charge ?? ''}
                        onChange={(e) => updateForm('shipping_charge', e.target.value)}
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        className="w-full px-2 py-1 text-sm text-right border border-[var(--zoho-border)] rounded bg-white text-[var(--zoho-text)] focus:outline-none focus:ring-1 focus:ring-[#0071DC]/20 focus:border-[#0071DC] transition-colors"
                      />
                    </div>
                  </div>

                  {/* Grand Total */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-300">
                    <span className="text-base font-bold text-[var(--zoho-text)]">Total</span>
                    <span className="text-lg font-bold text-[var(--zoho-text)] tabular-nums">
                      {formatINR(totals.grandTotal)}
                    </span>
                  </div>

                  {/* Amount in words */}
                  {totals.grandTotal > 0 && (
                    <div className="pt-2">
                      <p className="text-xs text-[var(--zoho-text-secondary)] italic leading-relaxed">
                        {amountInWords(totals.grandTotal)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Notes Section ───────────────────────────────────────── */}
        <div className="bg-white rounded-lg border border-[var(--zoho-border)] p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <FormField label="Remarks">
              <textarea
                value={form.remarks}
                onChange={(e) => updateForm('remarks', e.target.value)}
                rows={3}
                placeholder="Notes visible to the customer on the quotation"
                className={`${inputClassName()} resize-none`}
              />
            </FormField>
            <FormField label="Terms & Conditions">
              <textarea
                value={form.terms_and_conditions}
                onChange={(e) => updateForm('terms_and_conditions', e.target.value)}
                rows={3}
                placeholder="Payment terms, conditions, etc."
                className={`${inputClassName()} resize-none`}
              />
            </FormField>
          </div>
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
            {saving ? 'Saving...' : isEdit ? 'Update Quotation' : 'Save Quotation'}
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
