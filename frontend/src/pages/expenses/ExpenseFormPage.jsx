import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  HiOutlineArrowLeft,
  HiOutlineMagnifyingGlass,
  HiOutlineXMark,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { expenseApi } from '../../api/expense.api';
import { vendorApi } from '../../api/vendor.api';
import { customerApi } from '../../api/customer.api';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const PAYMENT_MODES = [
  'Cash',
  'Bank Transfer',
  'Cheque',
  'UPI',
  'NEFT',
  'RTGS',
  'Credit Card',
];

const GST_RATES = [0, 5, 12, 18, 28];

const CATEGORY_SUGGESTIONS = [
  'Rent',
  'Utilities',
  'Travel',
  'Office Supplies',
  'Marketing',
  'Insurance',
  'Repairs',
  'Miscellaneous',
];

const STATUS_OPTIONS = ['Pending', 'Approved', 'Paid', 'Rejected'];

const INITIAL_FORM_DATA = {
  expense_number: '',
  expense_date: new Date().toISOString().split('T')[0],
  category: '',
  vendor_id: '',
  customer_id: '',
  description: '',
  amount: '',
  gst_rate: '0',
  payment_mode: 'Cash',
  reference_number: '',
  is_billable: false,
  status: 'Pending',
  notes: '',
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  Searchable Dropdown Component                                      */
/* ------------------------------------------------------------------ */

function SearchableDropdown({
  label,
  placeholder,
  items,
  value,
  onChange,
  displayKey = 'display_name',
  error,
  optional = false,
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  const selectedItem = items.find((i) => String(i.id) === String(value));

  const filtered = query
    ? items.filter(
        (i) =>
          (i[displayKey] || '').toLowerCase().includes(query.toLowerCase()) ||
          (i.company_name || '').toLowerCase().includes(query.toLowerCase())
      )
    : items;

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (item) => {
    onChange(String(item.id));
    setQuery('');
    setOpen(false);
  };

  const handleClear = () => {
    onChange('');
    setQuery('');
  };

  return (
    <div ref={wrapperRef} className="relative">
      <label className="block text-sm font-medium text-[#333] mb-1">
        {label}
        {!optional && <span className="text-red-500"> *</span>}
        {optional && (
          <span className="text-[#9CA3AF] text-xs ml-1">(optional)</span>
        )}
      </label>

      {selectedItem ? (
        <div
          className={`flex items-center justify-between w-full px-3 py-2 border rounded-lg text-sm ${
            error ? 'border-red-400 bg-red-50' : 'border-[#E5E7EB]'
          }`}
        >
          <span className="text-[#333] truncate">
            {selectedItem[displayKey]}
            {selectedItem.company_name &&
            selectedItem.company_name !== selectedItem[displayKey]
              ? ` (${selectedItem.company_name})`
              : ''}
          </span>
          <button
            type="button"
            onClick={handleClear}
            className="p-0.5 rounded hover:bg-[#F3F4F6] transition-colors flex-shrink-0 ml-2"
          >
            <HiOutlineXMark className="w-4 h-4 text-[#6B7280]" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            className={`w-full pl-10 pr-3 py-2 border rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC] ${
              error ? 'border-red-400 bg-red-50' : 'border-[#E5E7EB]'
            }`}
          />
        </div>
      )}

      {open && !selectedItem && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-[#E5E7EB] rounded-lg shadow-lg max-h-52 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-4 py-3 text-sm text-[#9CA3AF] text-center">
              {query ? 'No results found' : 'No items available'}
            </div>
          ) : (
            filtered.slice(0, 50).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item)}
                className="w-full text-left px-4 py-2.5 text-sm text-[#333] hover:bg-[#F9FAFB] transition-colors border-b border-[#F3F4F6] last:border-b-0"
              >
                <span className="font-medium">{item[displayKey]}</span>
                {item.company_name &&
                  item.company_name !== item[displayKey] && (
                    <span className="text-[#6B7280] ml-1">
                      ({item.company_name})
                    </span>
                  )}
              </button>
            ))
          )}
        </div>
      )}

      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function ExpenseFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  /* ---- state ---- */
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [vendors, setVendors] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [showCategorySuggestions, setShowCategorySuggestions] = useState(false);
  const categoryRef = useRef(null);
  const { setIsDirty } = useUnsavedChanges();

  /* ---- computed tax amounts ---- */
  const amount = parseFloat(formData.amount) || 0;
  const gstRate = parseFloat(formData.gst_rate) || 0;
  const gstAmount = amount * gstRate / 100;
  const totalAmount = amount + gstAmount;

  /* ---- load vendors + customers ---- */
  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const [vendorsRes, customersRes] = await Promise.all([
          vendorApi.list({
            limit: 500,
            sort_by: 'display_name',
            sort_order: 'asc',
          }),
          customerApi.list({
            limit: 500,
            sort_by: 'display_name',
            sort_order: 'asc',
          }),
        ]);
        setVendors(vendorsRes.data?.data || []);
        setCustomers(customersRes.data?.data || []);
      } catch {
        setVendors([]);
        setCustomers([]);
      }
    };
    fetchDropdowns();
  }, []);

  /* ---- load expense data for edit mode ---- */
  useEffect(() => {
    if (!isEdit) return;

    const fetchExpense = async () => {
      setLoading(true);
      try {
        const response = await expenseApi.getById(id);
        const expense = response.data?.data;
        if (!expense) {
          toast.error('Expense not found');
          navigate('/expenses');
          return;
        }

        setFormData({
          expense_number: expense.expense_number || '',
          expense_date: expense.expense_date
            ? expense.expense_date.split('T')[0]
            : '',
          category: expense.category || '',
          vendor_id: expense.vendor_id ? String(expense.vendor_id) : '',
          customer_id: expense.customer_id ? String(expense.customer_id) : '',
          description: expense.description || '',
          amount: expense.amount != null ? String(expense.amount) : '',
          gst_rate:
            expense.gst_rate != null ? String(expense.gst_rate) : '0',
          payment_mode: expense.payment_mode || 'Cash',
          reference_number: expense.reference_number || '',
          is_billable: Boolean(expense.is_billable),
          status: expense.status || 'Pending',
          notes: expense.notes || '',
        });
      } catch (err) {
        if (err.response?.status === 404) {
          toast.error('Expense not found');
          navigate('/expenses');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchExpense();
  }, [id, isEdit, navigate]);

  /* ---- close category suggestions on outside click ---- */
  useEffect(() => {
    function handleClickOutside(e) {
      if (categoryRef.current && !categoryRef.current.contains(e.target)) {
        setShowCategorySuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /* ---- handlers ---- */
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    setIsDirty(true);

    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleCategorySelect = (cat) => {
    setFormData((prev) => ({ ...prev, category: cat }));
    setShowCategorySuggestions(false);
    setIsDirty(true);
    if (errors.category) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.category;
        return next;
      });
    }
  };

  const filteredCategorySuggestions = formData.category
    ? CATEGORY_SUGGESTIONS.filter((c) =>
        c.toLowerCase().includes(formData.category.toLowerCase())
      )
    : CATEGORY_SUGGESTIONS;

  /* ---- validation ---- */
  const validate = () => {
    const newErrors = {};

    if (!formData.expense_date) {
      newErrors.expense_date = 'Expense date is required';
    }

    if (!formData.category || formData.category.trim() === '') {
      newErrors.category = 'Category is required';
    }

    if (
      !formData.amount ||
      isNaN(Number(formData.amount)) ||
      Number(formData.amount) <= 0
    ) {
      newErrors.amount = 'A valid amount is required';
    }

    if (formData.gst_rate && isNaN(Number(formData.gst_rate))) {
      newErrors.gst_rate = 'GST rate must be a valid number';
    }

    if (Number(formData.gst_rate) < 0 || Number(formData.gst_rate) > 100) {
      newErrors.gst_rate = 'GST rate must be between 0 and 100';
    }

    if (formData.is_billable && !formData.customer_id) {
      newErrors.customer_id = 'Customer is required for billable expenses';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /* ---- submit ---- */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      toast.error('Please fix the validation errors before saving.');
      return;
    }

    setSaving(true);

    try {
      const payload = {
        ...formData,
        amount: Number(formData.amount),
        gst_rate: Number(formData.gst_rate) || 0,
        gst_amount: parseFloat(gstAmount.toFixed(2)),
        total_amount: parseFloat(totalAmount.toFixed(2)),
        vendor_id: formData.vendor_id || null,
        customer_id: formData.customer_id || null,
      };

      if (isEdit) {
        await expenseApi.update(id, payload);
        toast.success('Expense updated successfully');
        setIsDirty(false);
        navigate(`/expenses/${id}`);
      } else {
        const response = await expenseApi.create(payload);
        const newId = response.data?.data?.id;
        toast.success('Expense created successfully');
        setIsDirty(false);
        navigate(newId ? `/expenses/${newId}` : '/expenses');
      }
    } catch (err) {
      if (err.response?.data?.error) {
        toast.error(err.response.data.error);
      }
    } finally {
      setSaving(false);
    }
  };

  /* ---- loading screen ---- */
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#0071DC] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-[#6B7280]">Loading expense...</span>
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------------ */
  /*  Render                                                             */
  /* ------------------------------------------------------------------ */

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg hover:bg-[#F3F4F6] transition-colors"
          title="Go back"
        >
          <HiOutlineArrowLeft className="w-5 h-5 text-[#6B7280]" />
        </button>
        <div>
          <h1 className="text-2xl font-semibold text-[#333]">
            {isEdit ? 'Edit Expense' : 'New Expense'}
          </h1>
          <p className="text-sm text-[#6B7280] mt-0.5">
            {isEdit ? 'Update expense details' : 'Record a new business expense'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* ============================================================ */}
        {/*  Section 1: Expense Details                                   */}
        {/* ============================================================ */}
        <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6 mb-6">
          <h2 className="text-base font-semibold text-[#333] mb-4">
            Expense Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Expense Number */}
            <div>
              <label className="block text-sm font-medium text-[#333] mb-1">
                Expense Number
              </label>
              <input
                type="text"
                name="expense_number"
                value={formData.expense_number}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC] bg-[#F9FAFB]"
                placeholder="Auto-generated"
              />
              <p className="text-xs text-[#9CA3AF] mt-1">
                Leave blank for auto-generation
              </p>
            </div>

            {/* Expense Date */}
            <div>
              <label className="block text-sm font-medium text-[#333] mb-1">
                Expense Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="expense_date"
                value={formData.expense_date}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg text-sm text-[#333] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC] ${
                  errors.expense_date
                    ? 'border-red-400 bg-red-50'
                    : 'border-[#E5E7EB]'
                }`}
              />
              {errors.expense_date && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.expense_date}
                </p>
              )}
            </div>

            {/* Category with suggestions */}
            <div ref={categoryRef} className="relative">
              <label className="block text-sm font-medium text-[#333] mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="category"
                value={formData.category}
                onChange={(e) => {
                  handleChange(e);
                  setShowCategorySuggestions(true);
                }}
                onFocus={() => setShowCategorySuggestions(true)}
                className={`w-full px-3 py-2 border rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC] ${
                  errors.category
                    ? 'border-red-400 bg-red-50'
                    : 'border-[#E5E7EB]'
                }`}
                placeholder="e.g. Rent, Travel, Office Supplies"
                autoComplete="off"
              />
              {showCategorySuggestions &&
                filteredCategorySuggestions.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full bg-white border border-[#E5E7EB] rounded-lg shadow-lg max-h-44 overflow-y-auto">
                    {filteredCategorySuggestions.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => handleCategorySelect(cat)}
                        className="w-full text-left px-4 py-2 text-sm text-[#333] hover:bg-[#F9FAFB] transition-colors border-b border-[#F3F4F6] last:border-b-0"
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                )}
              {errors.category && (
                <p className="text-xs text-red-500 mt-1">{errors.category}</p>
              )}
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-[#333] mb-1">
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] bg-white focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Vendor (searchable, optional) */}
            <SearchableDropdown
              label="Vendor"
              placeholder="Search vendors..."
              items={vendors}
              value={formData.vendor_id}
              onChange={(val) => {
                setFormData((prev) => ({ ...prev, vendor_id: val }));
                if (errors.vendor_id) {
                  setErrors((prev) => {
                    const n = { ...prev };
                    delete n.vendor_id;
                    return n;
                  });
                }
              }}
              displayKey="display_name"
              optional
            />

            {/* Description - full width */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-[#333] mb-1">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={2}
                className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC] resize-vertical"
                placeholder="Brief description of the expense..."
              />
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/*  Section 2: Tax Info                                          */}
        {/* ============================================================ */}
        <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6 mb-6">
          <h2 className="text-base font-semibold text-[#333] mb-4">
            Tax Info
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-[#333] mb-1">
                Amount <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#6B7280]">
                  {'\u20B9'}
                </span>
                <input
                  type="text"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  className={`w-full pl-8 pr-3 py-2 border rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC] ${
                    errors.amount
                      ? 'border-red-400 bg-red-50'
                      : 'border-[#E5E7EB]'
                  }`}
                  placeholder="0.00"
                />
              </div>
              {errors.amount && (
                <p className="text-xs text-red-500 mt-1">{errors.amount}</p>
              )}
            </div>

            {/* GST Rate */}
            <div>
              <label className="block text-sm font-medium text-[#333] mb-1">
                GST Rate (%)
              </label>
              <select
                name="gst_rate"
                value={formData.gst_rate}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg text-sm text-[#333] bg-white focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC] ${
                  errors.gst_rate
                    ? 'border-red-400 bg-red-50'
                    : 'border-[#E5E7EB]'
                }`}
              >
                {GST_RATES.map((rate) => (
                  <option key={rate} value={rate}>
                    {rate}%
                  </option>
                ))}
              </select>
              {errors.gst_rate && (
                <p className="text-xs text-red-500 mt-1">{errors.gst_rate}</p>
              )}
            </div>

            {/* GST Amount (auto-calculated, read-only) */}
            <div>
              <label className="block text-sm font-medium text-[#333] mb-1">
                GST Amount
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#6B7280]">
                  {'\u20B9'}
                </span>
                <input
                  type="text"
                  value={gstAmount.toFixed(2)}
                  readOnly
                  className="w-full pl-8 pr-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] bg-[#F9FAFB] cursor-not-allowed"
                />
              </div>
              <p className="text-xs text-[#9CA3AF] mt-1">Auto-calculated</p>
            </div>
          </div>

          {/* Total Amount Banner */}
          <div className="mt-4 pt-4 border-t border-[#E5E7EB]">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-6 text-sm">
                  <span className="text-[#6B7280]">
                    Base Amount:{' '}
                    <span className="font-medium text-[#333]">
                      {formatIndianCurrency(amount)}
                    </span>
                  </span>
                  <span className="text-[#6B7280]">
                    GST ({gstRate}%):{' '}
                    <span className="font-medium text-[#333]">
                      {formatIndianCurrency(gstAmount)}
                    </span>
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-[#6B7280] font-medium uppercase tracking-wide">
                  Total Amount
                </p>
                <p className="text-2xl font-bold text-[#333]">
                  {formatIndianCurrency(totalAmount)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/*  Section 3: Payment Details                                   */}
        {/* ============================================================ */}
        <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6 mb-6">
          <h2 className="text-base font-semibold text-[#333] mb-4">
            Payment Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Payment Mode */}
            <div>
              <label className="block text-sm font-medium text-[#333] mb-1">
                Payment Mode
              </label>
              <select
                name="payment_mode"
                value={formData.payment_mode}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] bg-white focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
              >
                {PAYMENT_MODES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            {/* Reference Number */}
            <div>
              <label className="block text-sm font-medium text-[#333] mb-1">
                Reference Number
              </label>
              <input
                type="text"
                name="reference_number"
                value={formData.reference_number}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
                placeholder="Transaction/Cheque reference"
              />
            </div>

            {/* Billable checkbox */}
            <div className="md:col-span-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="is_billable"
                  checked={formData.is_billable}
                  onChange={handleChange}
                  className="w-4 h-4 text-[#0071DC] border-[#E5E7EB] rounded focus:ring-[#0071DC]/20 cursor-pointer"
                />
                <span className="text-sm font-medium text-[#333]">
                  This is a billable expense
                </span>
              </label>
              <p className="text-xs text-[#9CA3AF] mt-1 ml-7">
                Mark this if the expense should be invoiced to a customer
              </p>
            </div>

            {/* Customer (shown only when is_billable is checked) */}
            {formData.is_billable && (
              <div className="md:col-span-2">
                <SearchableDropdown
                  label="Customer"
                  placeholder="Search customers..."
                  items={customers}
                  value={formData.customer_id}
                  onChange={(val) => {
                    setFormData((prev) => ({ ...prev, customer_id: val }));
                    if (errors.customer_id) {
                      setErrors((prev) => {
                        const n = { ...prev };
                        delete n.customer_id;
                        return n;
                      });
                    }
                  }}
                  displayKey="display_name"
                  error={errors.customer_id}
                />
              </div>
            )}
          </div>
        </div>

        {/* ============================================================ */}
        {/*  Section 4: Notes                                             */}
        {/* ============================================================ */}
        <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6 mb-6">
          <h2 className="text-base font-semibold text-[#333] mb-4">Notes</h2>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC] resize-vertical"
            placeholder="Internal notes about this expense..."
          />
        </div>

        {/* ============================================================ */}
        {/*  Form Actions                                                 */}
        {/* ============================================================ */}
        <div className="flex items-center justify-end gap-3 pb-8">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-5 py-2 text-sm font-medium text-[#333] bg-white border border-[#E5E7EB] rounded-lg hover:bg-[#F9FAFB] transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-[#0071DC] rounded-lg hover:bg-[#005BB5] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            {saving
              ? isEdit
                ? 'Updating...'
                : 'Saving...'
              : isEdit
                ? 'Update Expense'
                : 'Save Expense'}
          </button>
        </div>
      </form>
    </div>
  );
}
