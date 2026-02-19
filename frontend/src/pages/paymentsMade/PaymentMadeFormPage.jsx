import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { HiOutlineArrowLeft } from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { paymentMadeApi } from '../../api/paymentMade.api';
import { vendorApi } from '../../api/vendor.api';
import apiClient from '../../api/client';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges';

const PAYMENT_MODES = ['Bank Transfer', 'Cash', 'Cheque', 'UPI', 'Credit Card'];

const CURRENCIES = [
  { code: 'INR', label: 'INR - Indian Rupee', symbol: '\u20B9' },
  { code: 'USD', label: 'USD - US Dollar', symbol: '$' },
  { code: 'EUR', label: 'EUR - Euro', symbol: '\u20AC' },
  { code: 'GBP', label: 'GBP - British Pound', symbol: '\u00A3' },
  { code: 'AED', label: 'AED - UAE Dirham', symbol: 'AED' },
  { code: 'SAR', label: 'SAR - Saudi Riyal', symbol: 'SAR' },
  { code: 'JPY', label: 'JPY - Japanese Yen', symbol: '\u00A5' },
  { code: 'CNY', label: 'CNY - Chinese Yuan', symbol: '\u00A5' },
  { code: 'AUD', label: 'AUD - Australian Dollar', symbol: 'A$' },
  { code: 'CAD', label: 'CAD - Canadian Dollar', symbol: 'C$' },
  { code: 'SGD', label: 'SGD - Singapore Dollar', symbol: 'S$' },
  { code: 'CHF', label: 'CHF - Swiss Franc', symbol: 'CHF' },
];

// Default exchange rates (1 foreign currency = X INR) for pre-filling
const DEFAULT_EXCHANGE_RATES = {
  USD: 83.5, EUR: 91.0, GBP: 106.0, AED: 22.7, SAR: 22.3,
  JPY: 0.56, CNY: 11.5, AUD: 55.0, CAD: 62.0, SGD: 62.5, CHF: 94.0,
};

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

const INITIAL_FORM_DATA = {
  payment_number: '',
  payment_date: new Date().toISOString().split('T')[0],
  vendor_id: '',
  amount: '',
  currency_code: 'INR',
  original_amount: '',
  exchange_rate: '',
  payment_mode: 'Bank Transfer',
  reference_number: '',
  bank_charge: '',
  notes: '',
};

export default function PaymentMadeFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [vendors, setVendors] = useState([]);
  const [bills, setBills] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [loadingBills, setLoadingBills] = useState(false);
  const { setIsDirty } = useUnsavedChanges();

  // Load vendors dropdown
  useEffect(() => {
    const fetchVendors = async () => {
      try {
        const response = await vendorApi.list({ limit: 500, sort_by: 'display_name', sort_order: 'asc' });
        setVendors(response.data?.data || []);
      } catch {
        setVendors([]);
      }
    };
    fetchVendors();
  }, []);

  // Load payment data for edit mode
  useEffect(() => {
    if (!isEdit) return;

    const fetchPayment = async () => {
      setLoading(true);
      try {
        const response = await paymentMadeApi.getById(id);
        const payment = response.data?.data;
        if (!payment) {
          toast.error('Payment not found');
          navigate('/payments-made');
          return;
        }

        const currCode = payment.currency_code || 'INR';
        setFormData({
          payment_number: payment.payment_number || '',
          payment_date: payment.payment_date ? payment.payment_date.split('T')[0] : '',
          vendor_id: payment.vendor_id || '',
          amount: payment.amount != null ? String(payment.amount) : '',
          currency_code: currCode,
          original_amount: payment.original_amount != null ? String(payment.original_amount) : '',
          exchange_rate: payment.exchange_rate != null && currCode !== 'INR' ? String(payment.exchange_rate) : '',
          payment_mode: payment.payment_mode || 'Bank Transfer',
          reference_number: payment.reference_number || '',
          bank_charge: payment.bank_charge != null ? String(payment.bank_charge) : '',
          notes: payment.notes || '',
        });

        if (payment.allocations && payment.allocations.length > 0) {
          setAllocations(
            payment.allocations.map((a) => ({
              bill_id: a.bill_id,
              bill_number: a.bill_number || '',
              bill_date: a.bill_date || '',
              total_amount: parseFloat(a.total_amount) || 0,
              balance_due: parseFloat(a.balance_due) || 0,
              apply_amount: parseFloat(a.apply_amount) || 0,
            }))
          );
        }
      } catch (err) {
        if (err.response?.status === 404) {
          toast.error('Payment not found');
          navigate('/payments-made');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchPayment();
  }, [id, isEdit, navigate]);

  // Fetch unpaid bills when vendor changes
  const fetchUnpaidBills = useCallback(async (vendorId) => {
    if (!vendorId) {
      setBills([]);
      setAllocations([]);
      return;
    }

    setLoadingBills(true);
    try {
      const response = await apiClient.get('/bills', {
        params: {
          vendor_id: vendorId,
          status_ne: 'Paid',
          limit: 200,
          sort_by: 'bill_date',
          sort_order: 'asc',
        },
      });
      const billData = response.data?.data || [];
      setBills(billData);

      if (!isEdit) {
        setAllocations(
          billData.map((bill) => ({
            bill_id: bill.id,
            bill_number: bill.bill_number || '',
            bill_date: bill.bill_date || '',
            total_amount: parseFloat(bill.total_amount) || 0,
            balance_due: parseFloat(bill.balance_due) || 0,
            apply_amount: 0,
          }))
        );
      }
    } catch {
      setBills([]);
    } finally {
      setLoadingBills(false);
    }
  }, [isEdit]);

  useEffect(() => {
    if (formData.vendor_id) {
      fetchUnpaidBills(formData.vendor_id);
    }
  }, [formData.vendor_id, fetchUnpaidBills]);

  // Determine if we are in foreign currency mode
  const isForeignCurrency = formData.currency_code && formData.currency_code !== 'INR';
  const selectedCurrency = CURRENCIES.find((c) => c.code === formData.currency_code) || CURRENCIES[0];

  // Auto-calculate INR amount when original_amount or exchange_rate changes
  const computedInrAmount = isForeignCurrency
    ? (() => {
        const orig = parseFloat(formData.original_amount) || 0;
        const rate = parseFloat(formData.exchange_rate) || 0;
        return orig * rate;
      })()
    : null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setIsDirty(true);

    if (name === 'currency_code') {
      if (value === 'INR') {
        // Switching back to INR: clear foreign currency fields
        setFormData((prev) => ({
          ...prev,
          currency_code: 'INR',
          original_amount: '',
          exchange_rate: '',
        }));
      } else {
        // Switching to foreign currency: pre-fill exchange rate
        const defaultRate = DEFAULT_EXCHANGE_RATES[value] || '';
        setFormData((prev) => ({
          ...prev,
          currency_code: value,
          exchange_rate: prev.exchange_rate || String(defaultRate),
          amount: '',
        }));
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }

    // Auto-select vendor's currency when vendor changes
    if (name === 'vendor_id' && value) {
      const selectedVendor = vendors.find(v => String(v.id) === String(value));
      if (selectedVendor && selectedVendor.currency_code && selectedVendor.currency_code !== 'INR') {
        const vendCurrency = selectedVendor.currency_code;
        const defaultRate = DEFAULT_EXCHANGE_RATES[vendCurrency] || '';
        setFormData((prev) => ({
          ...prev,
          vendor_id: value,
          currency_code: vendCurrency,
          exchange_rate: String(defaultRate),
          original_amount: '',
          amount: '',
        }));
        return;
      } else if (selectedVendor) {
        // Reset to INR for domestic vendor
        setFormData((prev) => ({
          ...prev,
          vendor_id: value,
          currency_code: 'INR',
          exchange_rate: '',
          original_amount: '',
        }));
        return;
      }
    }

    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleAllocationChange = (index, value) => {
    setIsDirty(true);
    const numValue = value === '' ? 0 : parseFloat(value) || 0;
    setAllocations((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        apply_amount: Math.min(numValue, updated[index].balance_due),
      };
      return updated;
    });
  };

  const autoDistribute = () => {
    let remaining = parseFloat(formData.amount) || 0;
    setAllocations((prev) =>
      prev.map((alloc) => {
        if (remaining <= 0) return { ...alloc, apply_amount: 0 };
        const applyAmount = Math.min(remaining, alloc.balance_due);
        remaining -= applyAmount;
        return { ...alloc, apply_amount: applyAmount };
      })
    );
  };

  const clearAllocations = () => {
    setAllocations((prev) => prev.map((a) => ({ ...a, apply_amount: 0 })));
  };

  // Calculate total allocated (allocations are always in INR)
  const totalAllocated = allocations.reduce((sum, a) => sum + (a.apply_amount || 0), 0);
  const paymentAmount = isForeignCurrency
    ? (computedInrAmount || 0)
    : (parseFloat(formData.amount) || 0);
  const unallocated = paymentAmount - totalAllocated;

  const validate = () => {
    const newErrors = {};

    if (!formData.vendor_id) {
      newErrors.vendor_id = 'Vendor is required';
    }

    if (isForeignCurrency) {
      if (!formData.original_amount || isNaN(Number(formData.original_amount)) || Number(formData.original_amount) <= 0) {
        newErrors.original_amount = `A valid amount in ${formData.currency_code} is required`;
      }
      if (!formData.exchange_rate || isNaN(Number(formData.exchange_rate)) || Number(formData.exchange_rate) <= 0) {
        newErrors.exchange_rate = 'A valid exchange rate is required';
      }
    } else {
      if (!formData.amount || isNaN(Number(formData.amount)) || Number(formData.amount) <= 0) {
        newErrors.amount = 'A valid payment amount is required';
      }
    }

    if (!formData.payment_date) {
      newErrors.payment_date = 'Payment date is required';
    }

    if (formData.bank_charge && isNaN(Number(formData.bank_charge))) {
      newErrors.bank_charge = 'Must be a valid number';
    }

    if (totalAllocated > paymentAmount) {
      newErrors.allocations = 'Total allocated amount exceeds payment amount';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      toast.error('Please fix the validation errors before saving.');
      return;
    }

    setSaving(true);

    try {
      let payload;
      if (isForeignCurrency) {
        const inrAmount = parseFloat((Number(formData.original_amount) * Number(formData.exchange_rate)).toFixed(2));
        payload = {
          ...formData,
          amount: inrAmount,
          original_amount: Number(formData.original_amount),
          exchange_rate: Number(formData.exchange_rate),
          bank_charge: formData.bank_charge ? Number(formData.bank_charge) : 0,
          allocations: allocations
            .filter((a) => a.apply_amount > 0)
            .map((a) => ({
              bill_id: a.bill_id,
              apply_amount: a.apply_amount,
            })),
        };
      } else {
        payload = {
          ...formData,
          amount: Number(formData.amount),
          original_amount: Number(formData.amount),
          exchange_rate: 1,
          currency_code: 'INR',
          bank_charge: formData.bank_charge ? Number(formData.bank_charge) : 0,
          allocations: allocations
            .filter((a) => a.apply_amount > 0)
            .map((a) => ({
              bill_id: a.bill_id,
              apply_amount: a.apply_amount,
            })),
        };
      }

      if (isEdit) {
        await paymentMadeApi.update(id, payload);
        toast.success('Payment updated successfully');
        setIsDirty(false);
        navigate(`/payments-made/${id}`);
      } else {
        const response = await paymentMadeApi.create(payload);
        const newId = response.data?.data?.id;
        toast.success('Payment recorded successfully');
        setIsDirty(false);
        navigate(newId ? `/payments-made/${newId}` : '/payments-made');
      }
    } catch (err) {
      if (err.response?.data?.error) {
        toast.error(err.response.data.error);
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#0071DC] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-[#6B7280]">Loading payment...</span>
        </div>
      </div>
    );
  }

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
            {isEdit ? 'Edit Payment Made' : 'New Payment Made'}
          </h1>
          <p className="text-sm text-[#6B7280] mt-0.5">
            {isEdit ? 'Update payment details' : 'Record a payment made to a vendor'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Payment Details Section */}
        <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6 mb-6">
          <h2 className="text-base font-semibold text-[#333] mb-4">Payment Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Payment Number */}
            <div>
              <label className="block text-sm font-medium text-[#333] mb-1">Payment Number</label>
              <input
                type="text"
                name="payment_number"
                value={formData.payment_number}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC] bg-[#F9FAFB]"
                placeholder="Auto-generated"
              />
              <p className="text-xs text-[#9CA3AF] mt-1">Leave blank for auto-generation</p>
            </div>

            {/* Payment Date */}
            <div>
              <label className="block text-sm font-medium text-[#333] mb-1">
                Payment Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="payment_date"
                value={formData.payment_date}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg text-sm text-[#333] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC] ${
                  errors.payment_date ? 'border-red-400 bg-red-50' : 'border-[#E5E7EB]'
                }`}
              />
              {errors.payment_date && (
                <p className="text-xs text-red-500 mt-1">{errors.payment_date}</p>
              )}
            </div>

            {/* Vendor Dropdown */}
            <div>
              <label className="block text-sm font-medium text-[#333] mb-1">
                Vendor <span className="text-red-500">*</span>
              </label>
              <select
                name="vendor_id"
                value={formData.vendor_id}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg text-sm text-[#333] bg-white focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC] ${
                  errors.vendor_id ? 'border-red-400 bg-red-50' : 'border-[#E5E7EB]'
                }`}
              >
                <option value="">-- Select Vendor --</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.display_name}
                    {v.company_name && v.company_name !== v.display_name ? ` (${v.company_name})` : ''}
                  </option>
                ))}
              </select>
              {errors.vendor_id && (
                <p className="text-xs text-red-500 mt-1">{errors.vendor_id}</p>
              )}
            </div>

            {/* Currency */}
            <div>
              <label className="block text-sm font-medium text-[#333] mb-1">Currency</label>
              <select
                name="currency_code"
                value={formData.currency_code}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] bg-white focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.label}</option>
                ))}
              </select>
            </div>

            {/* Amount - INR mode */}
            {!isForeignCurrency && (
              <div>
                <label className="block text-sm font-medium text-[#333] mb-1">
                  Amount <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#6B7280]">{'\u20B9'}</span>
                  <input
                    type="text"
                    name="amount"
                    value={formData.amount}
                    onChange={handleChange}
                    className={`w-full pl-8 pr-3 py-2 border rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC] ${
                      errors.amount ? 'border-red-400 bg-red-50' : 'border-[#E5E7EB]'
                    }`}
                    placeholder="0.00"
                  />
                </div>
                {errors.amount && (
                  <p className="text-xs text-red-500 mt-1">{errors.amount}</p>
                )}
              </div>
            )}

            {/* Foreign Currency Amount */}
            {isForeignCurrency && (
              <div>
                <label className="block text-sm font-medium text-[#333] mb-1">
                  Amount in {formData.currency_code} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#6B7280]">{selectedCurrency.symbol}</span>
                  <input
                    type="text"
                    name="original_amount"
                    value={formData.original_amount}
                    onChange={handleChange}
                    className={`w-full pl-8 pr-3 py-2 border rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC] ${
                      errors.original_amount ? 'border-red-400 bg-red-50' : 'border-[#E5E7EB]'
                    }`}
                    placeholder="0.00"
                  />
                </div>
                {errors.original_amount && (
                  <p className="text-xs text-red-500 mt-1">{errors.original_amount}</p>
                )}
              </div>
            )}

            {/* Exchange Rate (visible only for foreign currencies) */}
            {isForeignCurrency && (
              <div>
                <label className="block text-sm font-medium text-[#333] mb-1">
                  Exchange Rate <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="exchange_rate"
                  value={formData.exchange_rate}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC] ${
                    errors.exchange_rate ? 'border-red-400 bg-red-50' : 'border-[#E5E7EB]'
                  }`}
                  placeholder="e.g. 83.50"
                />
                <p className="text-xs text-[#9CA3AF] mt-1">
                  1 {formData.currency_code} = {'\u20B9'}{formData.exchange_rate || '?'} INR
                </p>
                {errors.exchange_rate && (
                  <p className="text-xs text-red-500 mt-1">{errors.exchange_rate}</p>
                )}
              </div>
            )}

            {/* Computed INR Amount (read-only, for foreign currencies) */}
            {isForeignCurrency && (
              <div>
                <label className="block text-sm font-medium text-[#333] mb-1">Amount in INR</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#6B7280]">{'\u20B9'}</span>
                  <input
                    type="text"
                    readOnly
                    value={computedInrAmount ? computedInrAmount.toFixed(2) : '0.00'}
                    className="w-full pl-8 pr-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] bg-[#F9FAFB] cursor-not-allowed"
                  />
                </div>
                <p className="text-xs text-[#9CA3AF] mt-1">Auto-calculated: {selectedCurrency.symbol}{formData.original_amount || '0'} x {'\u20B9'}{formData.exchange_rate || '0'}</p>
              </div>
            )}

            {/* Payment Mode */}
            <div>
              <label className="block text-sm font-medium text-[#333] mb-1">Payment Mode</label>
              <select
                name="payment_mode"
                value={formData.payment_mode}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] bg-white focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
              >
                {PAYMENT_MODES.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* Reference Number */}
            <div>
              <label className="block text-sm font-medium text-[#333] mb-1">Reference Number</label>
              <input
                type="text"
                name="reference_number"
                value={formData.reference_number}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
                placeholder="Transaction/Cheque reference"
              />
            </div>

            {/* Bank Charge */}
            <div>
              <label className="block text-sm font-medium text-[#333] mb-1">Bank Charge</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#6B7280]">{'\u20B9'}</span>
                <input
                  type="text"
                  name="bank_charge"
                  value={formData.bank_charge}
                  onChange={handleChange}
                  className={`w-full pl-8 pr-3 py-2 border rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC] ${
                    errors.bank_charge ? 'border-red-400 bg-red-50' : 'border-[#E5E7EB]'
                  }`}
                  placeholder="0.00"
                />
              </div>
              {errors.bank_charge && (
                <p className="text-xs text-red-500 mt-1">{errors.bank_charge}</p>
              )}
            </div>
          </div>
        </div>

        {/* Bill Allocation Section */}
        {formData.vendor_id && (
          <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-[#333]">Bill Allocation</h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={autoDistribute}
                  disabled={!formData.amount || allocations.length === 0}
                  className="px-3 py-1.5 text-xs font-medium text-[#0071DC] bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Auto Distribute
                </button>
                <button
                  type="button"
                  onClick={clearAllocations}
                  disabled={allocations.length === 0}
                  className="px-3 py-1.5 text-xs font-medium text-[#6B7280] bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>

            {loadingBills ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-[#0071DC] border-t-transparent rounded-full animate-spin" />
                <span className="ml-2 text-sm text-[#6B7280]">Loading bills...</span>
              </div>
            ) : allocations.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-[#9CA3AF]">No unpaid bills found for this vendor.</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Bill #</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Date</th>
                        <th className="px-4 py-2.5 text-right text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Bill Amount</th>
                        <th className="px-4 py-2.5 text-right text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Balance Due</th>
                        <th className="px-4 py-2.5 text-right text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Apply Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E7EB]">
                      {allocations.map((alloc, index) => (
                        <tr key={alloc.bill_id} className="hover:bg-[#F9FAFB]">
                          <td className="px-4 py-2.5 font-medium text-[#0071DC]">
                            {alloc.bill_number || '--'}
                          </td>
                          <td className="px-4 py-2.5 text-[#6B7280]">
                            {formatDate(alloc.bill_date)}
                          </td>
                          <td className="px-4 py-2.5 text-right text-[#333]">
                            {formatIndianCurrency(alloc.total_amount)}
                          </td>
                          <td className="px-4 py-2.5 text-right text-[#333] font-medium">
                            {formatIndianCurrency(alloc.balance_due)}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              max={alloc.balance_due}
                              value={alloc.apply_amount || ''}
                              onChange={(e) => handleAllocationChange(index, e.target.value)}
                              className="w-32 ml-auto px-3 py-1.5 border border-[#E5E7EB] rounded-lg text-sm text-right text-[#333] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
                              placeholder="0.00"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Allocation Summary */}
                <div className="mt-4 pt-4 border-t border-[#E5E7EB]">
                  <div className="flex justify-end">
                    <div className="w-72 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-[#6B7280]">Payment Amount</span>
                        <span className="font-medium text-[#333]">{formatIndianCurrency(paymentAmount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#6B7280]">Total Allocated</span>
                        <span className="font-medium text-[#333]">{formatIndianCurrency(totalAllocated)}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-[#E5E7EB]">
                        <span className="text-[#6B7280] font-medium">Unallocated</span>
                        <span className={`font-semibold ${unallocated < 0 ? 'text-red-600' : unallocated > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                          {formatIndianCurrency(unallocated)}
                        </span>
                      </div>
                    </div>
                  </div>
                  {errors.allocations && (
                    <p className="text-xs text-red-500 mt-2 text-right">{errors.allocations}</p>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Notes Section */}
        <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6 mb-6">
          <h2 className="text-base font-semibold text-[#333] mb-4">Notes</h2>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC] resize-vertical"
            placeholder="Internal notes about this payment..."
          />
        </div>

        {/* Form Actions */}
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
              ? isEdit ? 'Updating...' : 'Recording...'
              : isEdit ? 'Update Payment' : 'Record Payment'}
          </button>
        </div>
      </form>
    </div>
  );
}
