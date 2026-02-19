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
import { formatINR, amountInWords } from '../../utils/currency';
import { formatIndianNumber } from '../../components/data-display/CurrencyCell';
import FormField, { inputClassName } from '../../components/forms/FormField';
import DatePicker from '../../components/forms/DatePicker';
import SelectField from '../../components/forms/SelectField';
import LoadingSpinner from '../../components/feedback/LoadingSpinner';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges';

const COMPANY_STATE = 'Haryana';

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

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

function thirtyDaysLater() {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().split('T')[0];
}

function computeItemAmount(item) {
  return (Number(item.quantity) || 0) * (Number(item.rate) || 0);
}

function computeItemGst(item) {
  return (computeItemAmount(item) * (Number(item.gst_rate) || 0)) / 100;
}

// ── Vendor Search Dropdown ───────────────────────────────────────

function VendorSearchDropdown({ vendors, value, onChange, error }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  const selectedVendor = vendors.find((v) => v.id === value);

  const filtered = useMemo(() => {
    if (!search.trim()) return vendors;
    const q = search.toLowerCase();
    return vendors.filter(
      (v) =>
        (v.display_name || '').toLowerCase().includes(q) ||
        (v.company_name || '').toLowerCase().includes(q) ||
        (v.email || '').toLowerCase().includes(q)
    );
  }, [vendors, search]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSelect(vendor) {
    onChange(vendor);
    setIsOpen(false);
    setSearch('');
  }

  function handleClear(e) {
    e.stopPropagation();
    onChange(null);
    setSearch('');
  }

  return (
    <FormField label="Vendor" required error={error}>
      <div ref={wrapperRef} className="relative">
        <div
          onClick={() => {
            setIsOpen(!isOpen);
            setTimeout(() => inputRef.current?.focus(), 50);
          }}
          className={`${inputClassName(error)} flex items-center justify-between cursor-pointer min-h-[38px]`}
        >
          <span className={selectedVendor ? 'text-[var(--zoho-text)]' : 'text-gray-400'}>
            {selectedVendor
              ? selectedVendor.display_name || selectedVendor.company_name
              : 'Select a vendor...'}
          </span>
          <div className="flex items-center gap-1">
            {selectedVendor && (
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

        {isOpen && (
          <div className="absolute z-50 mt-1 w-full bg-white border border-[var(--zoho-border)] rounded-lg shadow-lg max-h-72 overflow-hidden">
            <div className="px-3 py-2 border-b border-gray-100">
              <div className="relative">
                <HiOutlineMagnifyingGlass className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  ref={inputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search vendors..."
                  className="w-full pl-8 pr-3 py-1.5 text-sm border border-[var(--zoho-border)] rounded-md bg-white text-[var(--zoho-text)] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
                />
              </div>
            </div>
            <div className="max-h-52 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-gray-400">
                  No vendors found
                </div>
              ) : (
                filtered.map((vendor) => (
                  <button
                    key={vendor.id}
                    onClick={() => handleSelect(vendor)}
                    type="button"
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors cursor-pointer hover:bg-blue-50 ${
                      vendor.id === value ? 'bg-blue-50 text-[#0071DC]' : 'text-[var(--zoho-text)]'
                    }`}
                  >
                    <div className="font-medium">
                      {vendor.display_name || vendor.company_name}
                    </div>
                    {vendor.company_name && vendor.display_name !== vendor.company_name && (
                      <div className="text-xs text-[var(--zoho-text-secondary)] mt-0.5">
                        {vendor.company_name}
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

export default function PurchaseOrderFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const { isDirty, setIsDirty, confirmLeave } = useUnsavedChanges();

  const [pageLoading, setPageLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [vendors, setVendors] = useState([]);
  const [vendorsLoading, setVendorsLoading] = useState(true);

  const [form, setForm] = useState({
    po_date: todayISO(),
    expected_date: thirtyDaysLater(),
    vendor_id: '',
    status: 'Draft',
    place_of_supply: '',
    remarks: '',
    shipping_charge: 0,
  });

  const [items, setItems] = useState([{ ...EMPTY_ITEM }]);
  const [errors, setErrors] = useState({});
  const [poNumber, setPoNumber] = useState('');

  // ── Load vendors ────────────────────────────────────────────────

  useEffect(() => {
    async function loadVendors() {
      try {
        const res = await apiClient.get('/vendors', { params: { limit: 500 } });
        setVendors(res.data.data || res.data || []);
      } catch {
        setVendors([]);
      } finally {
        setVendorsLoading(false);
      }
    }
    loadVendors();
  }, []);

  // ── Load PO for editing ────────────────────────────────────────

  useEffect(() => {
    if (!isEdit) return;
    async function loadPO() {
      try {
        const res = await apiClient.get(`/purchase-orders/${id}`);
        const po = res.data.data || res.data;
        if (!po) {
          toast.error('Purchase order not found');
          navigate('/purchase-orders', { replace: true });
          return;
        }

        setPoNumber(po.po_number || '');

        setForm({
          po_date: po.po_date || todayISO(),
          expected_date: po.expected_date || thirtyDaysLater(),
          vendor_id: po.vendor_id || '',
          status: po.status || 'Draft',
          place_of_supply: po.place_of_supply || '',
          remarks: po.remarks || '',
          shipping_charge: po.shipping_charge || 0,
        });

        const lineItems = (po.items || po.purchase_order_items || []).map((item) => ({
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
          toast.error('Purchase order not found');
          navigate('/purchase-orders', { replace: true });
        }
      } finally {
        setPageLoading(false);
      }
    }
    loadPO();
  }, [id, isEdit, navigate]);

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

  function handleVendorSelect(vendor) {
    if (!vendor) {
      updateForm('vendor_id', '');
      return;
    }
    updateForm('vendor_id', vendor.id);
    const addr = vendor.billing_address || vendor.address || {};
    setForm((prev) => ({
      ...prev,
      vendor_id: vendor.id,
      place_of_supply: addr.state || vendor.state || prev.place_of_supply,
    }));
    setIsDirty(true);
  }

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

  const isInterState = useMemo(() => {
    const placeOfSupply = form.place_of_supply || '';
    if (!placeOfSupply) return false;
    return placeOfSupply.toLowerCase() !== COMPANY_STATE.toLowerCase();
  }, [form.place_of_supply]);

  const totals = useMemo(() => {
    let subtotal = 0;
    let totalGst = 0;

    items.forEach((item) => {
      subtotal += computeItemAmount(item);
      totalGst += computeItemGst(item);
    });

    const shipping = Number(form.shipping_charge) || 0;
    let cgst = 0, sgst = 0, igst = 0;
    if (isInterState) {
      igst = totalGst;
    } else {
      cgst = totalGst / 2;
      sgst = totalGst / 2;
    }

    return { subtotal, totalGst, cgst, sgst, igst, shipping, grandTotal: subtotal + totalGst + shipping };
  }, [items, form.shipping_charge, isInterState]);

  function validate() {
    const errs = {};
    if (!form.vendor_id) errs.vendor_id = 'Vendor is required';
    if (!form.po_date) errs.po_date = 'PO date is required';

    const validItems = items.filter(
      (item) => item.item_name?.trim() || Number(item.quantity) > 0 || Number(item.rate) > 0
    );
    if (validItems.length === 0) {
      errs.items = 'At least one line item is required';
    } else {
      validItems.forEach((item, i) => {
        if (!item.item_name?.trim()) errs[`item_${i}_name`] = 'Item name is required';
        if (Number(item.quantity) <= 0) errs[`item_${i}_qty`] = 'Quantity must be greater than 0';
      });
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) {
      toast.error('Please fix the errors before saving.');
      return;
    }

    setSaving(true);

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
        await apiClient.put(`/purchase-orders/${id}`, payload);
        toast.success('Purchase order updated successfully');
      } else {
        const res = await apiClient.post('/purchase-orders', payload);
        const newId = res.data?.data?.id || res.data?.id;
        toast.success('Purchase order created successfully');
        setIsDirty(false);
        navigate(newId ? `/purchase-orders/${newId}` : '/purchase-orders', { replace: true });
        return;
      }
      setIsDirty(false);
      navigate(`/purchase-orders/${id}`, { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.detail || 'Failed to save purchase order';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    if (confirmLeave()) {
      navigate(isEdit ? `/purchase-orders/${id}` : '/purchase-orders');
    }
  }

  const lineInputClass =
    'w-full px-2 py-1.5 text-sm border border-transparent rounded bg-transparent text-[var(--zoho-text)] hover:border-[var(--zoho-border)] focus:border-[#0071DC] focus:ring-1 focus:ring-[#0071DC]/20 focus:outline-none transition-colors';

  if (pageLoading) {
    return (
      <div className="py-20">
        <LoadingSpinner size="lg" label="Loading purchase order..." />
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
            {isEdit ? `Edit Purchase Order${poNumber ? ` #${poNumber}` : ''}` : 'New Purchase Order'}
          </h1>
        </div>
      </div>

      <div className="space-y-6">
        {/* Primary Fields */}
        <div className="bg-white rounded-lg border border-[var(--zoho-border)] p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1">
            <div className="lg:col-span-2">
              <VendorSearchDropdown
                vendors={vendors}
                value={form.vendor_id}
                onChange={handleVendorSelect}
                error={errors.vendor_id}
              />
            </div>

            <SelectField
              label="Status"
              value={form.status}
              onChange={(v) => updateForm('status', v)}
              options={[
                { value: 'Draft', label: 'Draft' },
                { value: 'Sent', label: 'Sent' },
              ]}
              placeholder=""
            />

            <DatePicker
              label="PO Date"
              value={form.po_date}
              onChange={(v) => updateForm('po_date', v)}
              required
              error={errors.po_date}
            />

            <DatePicker
              label="Expected Delivery Date"
              value={form.expected_date}
              onChange={(v) => updateForm('expected_date', v)}
            />

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

        {/* Line Items */}
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
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--zoho-text-secondary)] w-10">#</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--zoho-text-secondary)] min-w-[200px]">Item Name</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--zoho-text-secondary)] min-w-[160px]">Description</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--zoho-text-secondary)] w-28">HSN Code</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--zoho-text-secondary)] w-24">Qty</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--zoho-text-secondary)] w-32">Rate ({'\u20B9'})</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--zoho-text-secondary)] w-24">GST %</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--zoho-text-secondary)] w-36">Amount ({'\u20B9'})</th>
                  <th className="px-3 py-3 w-10" />
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => {
                  const amount = computeItemAmount(item);
                  const hasNameError = !!errors[`item_${index}_name`];
                  const hasQtyError = !!errors[`item_${index}_qty`];
                  return (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-2 text-xs text-[var(--zoho-text-secondary)] align-top pt-3">{index + 1}</td>
                      <td className="px-2 py-1">
                        <input
                          type="text"
                          value={item.item_name || ''}
                          onChange={(e) => updateItem(index, 'item_name', e.target.value)}
                          placeholder="Enter item name"
                          className={`${lineInputClass} ${hasNameError ? 'border-red-300 bg-red-50/50' : ''}`}
                        />
                        {hasNameError && <p className="text-[10px] text-red-500 px-2 mt-0.5">{errors[`item_${index}_name`]}</p>}
                      </td>
                      <td className="px-2 py-1">
                        <input type="text" value={item.description || ''} onChange={(e) => updateItem(index, 'description', e.target.value)} placeholder="Description" className={lineInputClass} />
                      </td>
                      <td className="px-2 py-1">
                        <input type="text" value={item.hsn_code || ''} onChange={(e) => updateItem(index, 'hsn_code', e.target.value)} placeholder="HSN" className={lineInputClass} />
                      </td>
                      <td className="px-2 py-1">
                        <input type="number" value={item.quantity ?? ''} onChange={(e) => updateItem(index, 'quantity', e.target.value)} min="0" step="1" className={`${lineInputClass} text-right ${hasQtyError ? 'border-red-300 bg-red-50/50' : ''}`} />
                      </td>
                      <td className="px-2 py-1">
                        <input type="number" value={item.rate ?? ''} onChange={(e) => updateItem(index, 'rate', e.target.value)} min="0" step="0.01" className={`${lineInputClass} text-right`} />
                      </td>
                      <td className="px-2 py-1">
                        <select value={item.gst_rate ?? 18} onChange={(e) => updateItem(index, 'gst_rate', e.target.value)} className={`${lineInputClass} text-right appearance-none cursor-pointer pr-1`}>
                          {GST_RATES.map((r) => (<option key={r} value={r}>{r}%</option>))}
                        </select>
                      </td>
                      <td className="px-4 py-2 text-right text-sm font-medium text-[var(--zoho-text)] tabular-nums align-top pt-3">
                        {'\u20B9'}{formatIndianNumber(amount)}
                      </td>
                      <td className="px-2 py-2 align-top pt-2.5">
                        <button type="button" onClick={() => removeItem(index)} disabled={items.length <= 1} className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed" aria-label={`Remove item ${index + 1}`}>
                          <HiOutlineTrash className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="px-6 py-3 border-t border-gray-100">
            <button type="button" onClick={addItem} className="inline-flex items-center gap-1.5 text-sm font-medium text-[#0071DC] hover:text-[#005BB5] transition-colors cursor-pointer">
              <HiOutlinePlus className="w-4 h-4" />
              Add Line Item
            </button>
          </div>

          {/* Totals */}
          {items.some((item) => item.item_name?.trim() || Number(item.rate) > 0) && (
            <div className="border-t border-[var(--zoho-border)] bg-gray-50">
              <div className="flex justify-end px-6 py-5">
                <div className="w-full max-w-md space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--zoho-text-secondary)]">Subtotal</span>
                    <span className="font-medium text-[var(--zoho-text)] tabular-nums">{'\u20B9'}{formatIndianNumber(totals.subtotal)}</span>
                  </div>

                  {isInterState ? (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[var(--zoho-text-secondary)]">IGST</span>
                      <span className="text-[var(--zoho-text)] tabular-nums">{'\u20B9'}{formatIndianNumber(totals.igst)}</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[var(--zoho-text-secondary)]">CGST</span>
                        <span className="text-[var(--zoho-text)] tabular-nums">{'\u20B9'}{formatIndianNumber(totals.cgst)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[var(--zoho-text-secondary)]">SGST</span>
                        <span className="text-[var(--zoho-text)] tabular-nums">{'\u20B9'}{formatIndianNumber(totals.sgst)}</span>
                      </div>
                    </>
                  )}

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--zoho-text-secondary)]">Freight / Shipping</span>
                    <div className="w-32">
                      <input type="number" value={form.shipping_charge ?? ''} onChange={(e) => updateForm('shipping_charge', e.target.value)} min="0" step="0.01" placeholder="0.00" className="w-full px-2 py-1 text-sm text-right border border-[var(--zoho-border)] rounded bg-white text-[var(--zoho-text)] focus:outline-none focus:ring-1 focus:ring-[#0071DC]/20 focus:border-[#0071DC] transition-colors" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-300">
                    <span className="text-base font-bold text-[var(--zoho-text)]">Total</span>
                    <span className="text-lg font-bold text-[var(--zoho-text)] tabular-nums">{formatINR(totals.grandTotal)}</span>
                  </div>

                  {totals.grandTotal > 0 && (
                    <div className="pt-2">
                      <p className="text-xs text-[var(--zoho-text-secondary)] italic leading-relaxed">{amountInWords(totals.grandTotal)}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Remarks */}
        <div className="bg-white rounded-lg border border-[var(--zoho-border)] p-6">
          <FormField label="Remarks / Notes">
            <textarea
              value={form.remarks}
              onChange={(e) => updateForm('remarks', e.target.value)}
              rows={3}
              placeholder="Internal notes or remarks for this purchase order"
              className={`${inputClassName()} resize-none`}
            />
          </FormField>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 bg-[#0071DC] hover:bg-[#005BB5] text-white text-sm font-medium px-6 py-2.5 rounded-md transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            {saving && (
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {saving ? 'Saving...' : isEdit ? 'Update Purchase Order' : 'Save Purchase Order'}
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
