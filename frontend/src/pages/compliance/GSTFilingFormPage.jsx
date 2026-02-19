import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { HiOutlineArrowLeft } from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { gstFilingApi } from '../../api/gstFiling.api';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges';

// ── Helpers ────────────────────────────────────────────────────────

function formatIndianCurrency(value) {
  if (value == null || isNaN(value)) return '\u20B90.00';
  const num = Number(value);
  const isNegative = num < 0;
  const abs = Math.abs(num);
  const [intPart, decPart] = abs.toFixed(2).split('.');
  let result = '';
  if (intPart.length <= 3) {
    result = intPart;
  } else {
    result = intPart.slice(-3);
    let remaining = intPart.slice(0, -3);
    while (remaining.length > 2) {
      result = remaining.slice(-2) + ',' + result;
      remaining = remaining.slice(0, -2);
    }
    if (remaining.length > 0) result = remaining + ',' + result;
  }
  return `${isNegative ? '-' : ''}\u20B9${result}.${decPart}`;
}

// ── Constants ──────────────────────────────────────────────────────

const FILING_TYPES = ['GSTR-1', 'GSTR-3B', 'GSTR-9', 'GSTR-2A', 'GSTR-2B', 'GSTR-4'];
const STATUSES = ['Pending', 'Filed', 'Late', 'Verified'];

function getFinancialYearOptions() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const startYear = currentMonth >= 3 ? currentYear : currentYear - 1;
  const options = [];
  // 2 future years + current + 5 past years
  for (let i = -2; i <= 5; i++) {
    const fy = startYear - i;
    options.push(`${fy}-${String(fy + 1).slice(-2)}`);
  }
  return options;
}

const INITIAL_FORM = {
  return_type: 'GSTR-3B',
  filing_period: '',
  financial_year: '',
  due_date: '',
  filing_date: '',
  status: 'Pending',
  arn_number: '',
  total_tax_liability: '',
  total_igst: '',
  total_cgst: '',
  total_sgst: '',
  total_cess: '',
  total_itc: '',
  net_tax_payable: '',
  late_fee: '',
  interest: '',
  remarks: '',
};

// ── Shared Input Styles ────────────────────────────────────────────

const inputClass =
  'w-full px-3 py-2 border rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]';
const inputErrorClass =
  'w-full px-3 py-2 border rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 border-red-400 bg-red-50';
const selectClass =
  'w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] bg-white focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]';
const currencyInputClass =
  'w-full pl-8 pr-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]';
const readOnlyClass =
  'w-full pl-8 pr-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] bg-[#F9FAFB] focus:outline-none cursor-not-allowed';

// ── Form Field Components ──────────────────────────────────────────

function FormLabel({ children, required }) {
  return (
    <label className="block text-sm font-medium text-[#333] mb-1">
      {children}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}

function CurrencyField({ label, name, value, onChange, readOnly, placeholder = '0.00' }) {
  return (
    <div>
      <FormLabel>{label}</FormLabel>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#6B7280]">
          {'\u20B9'}
        </span>
        <input
          type="number"
          step="0.01"
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          readOnly={readOnly}
          className={readOnly ? readOnlyClass : currencyInputClass}
        />
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────

export default function GSTFilingFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const { setIsDirty } = useUnsavedChanges();
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  // ── Load existing filing for edit ────────────────────────────────

  useEffect(() => {
    if (!isEdit) return;
    const loadFiling = async () => {
      setLoading(true);
      try {
        const res = await gstFilingApi.getById(id);
        const d = res.data?.data || res.data;
        if (!d) {
          toast.error('Filing not found');
          navigate('/gst-filings');
          return;
        }
        setFormData({
          return_type: d.return_type || d.filing_type || 'GSTR-3B',
          filing_period: d.filing_period || d.period || '',
          financial_year: d.financial_year || '',
          due_date: d.due_date ? d.due_date.split('T')[0] : '',
          filing_date: d.filing_date ? d.filing_date.split('T')[0] : '',
          status: d.status || 'Pending',
          arn_number: d.arn_number || '',
          total_tax_liability: d.total_tax_liability != null ? String(d.total_tax_liability) : '',
          total_igst: d.total_igst != null ? String(d.total_igst) : '',
          total_cgst: d.total_cgst != null ? String(d.total_cgst) : '',
          total_sgst: d.total_sgst != null ? String(d.total_sgst) : '',
          total_cess: d.total_cess != null ? String(d.total_cess) : '',
          total_itc: d.total_itc != null ? String(d.total_itc) : d.total_itc_claimed != null ? String(d.total_itc_claimed) : '',
          net_tax_payable: d.net_tax_payable != null ? String(d.net_tax_payable) : '',
          late_fee: d.late_fee != null ? String(d.late_fee) : '',
          interest: d.interest != null ? String(d.interest) : '',
          remarks: d.remarks || d.notes || '',
        });
      } catch (err) {
        if (err.response?.status === 404) {
          toast.error('Filing not found');
          navigate('/gst-filings');
        }
      } finally {
        setLoading(false);
      }
    };
    loadFiling();
  }, [id, isEdit, navigate]);

  // ── Handle form changes ──────────────────────────────────────────

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const next = { ...prev, [name]: value };

      // Auto-calculate total tax liability from IGST + CGST + SGST + Cess
      if (['total_igst', 'total_cgst', 'total_sgst', 'total_cess'].includes(name)) {
        const igst = parseFloat(name === 'total_igst' ? value : next.total_igst) || 0;
        const cgst = parseFloat(name === 'total_cgst' ? value : next.total_cgst) || 0;
        const sgst = parseFloat(name === 'total_sgst' ? value : next.total_sgst) || 0;
        const cess = parseFloat(name === 'total_cess' ? value : next.total_cess) || 0;
        next.total_tax_liability = String(igst + cgst + sgst + cess);
      }

      // Auto-calculate net tax payable = tax liability - ITC
      if (['total_tax_liability', 'total_itc', 'total_igst', 'total_cgst', 'total_sgst', 'total_cess'].includes(name)) {
        const taxLiability = parseFloat(next.total_tax_liability) || 0;
        const itc = parseFloat(next.total_itc) || 0;
        next.net_tax_payable = String(Math.max(0, taxLiability - itc));
      }

      return next;
    });

    setIsDirty(true);

    // Clear field error
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  // ── Validation ───────────────────────────────────────────────────

  const validate = () => {
    const errs = {};
    if (!formData.return_type) errs.return_type = 'Return type is required';
    if (!formData.filing_period) errs.filing_period = 'Filing period is required';
    if (!formData.financial_year) errs.financial_year = 'Financial year is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Submit ───────────────────────────────────────────────────────

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      toast.error('Please fix the validation errors');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...formData,
        // Also send as filing_type/period for backward compatibility
        filing_type: formData.return_type,
        period: formData.filing_period,
        total_tax_liability: parseFloat(formData.total_tax_liability) || 0,
        total_igst: parseFloat(formData.total_igst) || 0,
        total_cgst: parseFloat(formData.total_cgst) || 0,
        total_sgst: parseFloat(formData.total_sgst) || 0,
        total_cess: parseFloat(formData.total_cess) || 0,
        total_itc: parseFloat(formData.total_itc) || 0,
        total_itc_claimed: parseFloat(formData.total_itc) || 0,
        net_tax_payable: parseFloat(formData.net_tax_payable) || 0,
        late_fee: parseFloat(formData.late_fee) || 0,
        interest: parseFloat(formData.interest) || 0,
      };

      if (isEdit) {
        await gstFilingApi.update(id, payload);
        toast.success('GST Filing updated successfully');
        setIsDirty(false);
        navigate(`/gst-filings/${id}`);
      } else {
        const res = await gstFilingApi.create(payload);
        const newId = res.data?.data?.id || res.data?.id;
        toast.success('GST Filing created successfully');
        setIsDirty(false);
        navigate(newId ? `/gst-filings/${newId}` : '/gst-filings');
      }
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.response?.data?.detail ||
        'Failed to save GST filing';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // ── Loading State ────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#0071DC] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-[#6B7280]">Loading filing...</span>
        </div>
      </div>
    );
  }

  // ── Computed display values ──────────────────────────────────────

  const totalTaxLiability = parseFloat(formData.total_tax_liability) || 0;
  const totalItc = parseFloat(formData.total_itc) || 0;
  const netPayable = parseFloat(formData.net_tax_payable) || 0;
  const lateFee = parseFloat(formData.late_fee) || 0;
  const interest = parseFloat(formData.interest) || 0;
  const totalPayable = netPayable + lateFee + interest;

  // ── Render ───────────────────────────────────────────────────────

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate(isEdit ? `/gst-filings/${id}` : '/gst-filings')}
          className="p-2 rounded-lg hover:bg-[#F3F4F6] transition-colors"
        >
          <HiOutlineArrowLeft className="w-5 h-5 text-[#6B7280]" />
        </button>
        <div>
          <h1 className="text-2xl font-semibold text-[#333]">
            {isEdit ? 'Edit GST Filing' : 'New GST Filing'}
          </h1>
          <p className="text-sm text-[#6B7280] mt-0.5">
            {isEdit ? 'Update GST filing details' : 'Record a new GST return filing'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Section 1: Filing Information */}
        <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6 mb-6">
          <h2 className="text-base font-semibold text-[#333] mb-4">Filing Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Return Type */}
            <div>
              <FormLabel required>Return Type</FormLabel>
              <select
                name="return_type"
                value={formData.return_type}
                onChange={handleChange}
                className={errors.return_type ? inputErrorClass : selectClass}
              >
                {FILING_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              {errors.return_type && (
                <p className="text-xs text-red-500 mt-1">{errors.return_type}</p>
              )}
            </div>

            {/* Filing Period */}
            <div>
              <FormLabel required>Filing Period</FormLabel>
              <input
                type="text"
                name="filing_period"
                value={formData.filing_period}
                onChange={handleChange}
                placeholder="e.g. January 2026"
                className={errors.filing_period ? inputErrorClass : `${inputClass} border-[#E5E7EB]`}
              />
              {errors.filing_period && (
                <p className="text-xs text-red-500 mt-1">{errors.filing_period}</p>
              )}
            </div>

            {/* Financial Year */}
            <div>
              <FormLabel required>Financial Year</FormLabel>
              <select
                name="financial_year"
                value={formData.financial_year}
                onChange={handleChange}
                className={errors.financial_year ? inputErrorClass : selectClass}
              >
                <option value="">Select FY</option>
                {getFinancialYearOptions().map((fy) => (
                  <option key={fy} value={fy}>
                    FY {fy}
                  </option>
                ))}
              </select>
              {errors.financial_year && (
                <p className="text-xs text-red-500 mt-1">{errors.financial_year}</p>
              )}
            </div>

            {/* Due Date */}
            <div>
              <FormLabel>Due Date</FormLabel>
              <input
                type="date"
                name="due_date"
                value={formData.due_date}
                onChange={handleChange}
                className={`${inputClass} border-[#E5E7EB]`}
              />
            </div>

            {/* Filing Date */}
            <div>
              <FormLabel>Filing Date</FormLabel>
              <input
                type="date"
                name="filing_date"
                value={formData.filing_date}
                onChange={handleChange}
                className={`${inputClass} border-[#E5E7EB]`}
              />
            </div>

            {/* Status */}
            <div>
              <FormLabel>Status</FormLabel>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className={selectClass}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* ARN Number */}
            <div className="md:col-span-2 lg:col-span-3">
              <FormLabel>ARN Number</FormLabel>
              <input
                type="text"
                name="arn_number"
                value={formData.arn_number}
                onChange={handleChange}
                placeholder="Acknowledgement Reference Number"
                className={`${inputClass} border-[#E5E7EB]`}
              />
            </div>
          </div>
        </div>

        {/* Section 2: Tax Liability */}
        <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6 mb-6">
          <h2 className="text-base font-semibold text-[#333] mb-4">Tax Liability</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <CurrencyField
              label="IGST"
              name="total_igst"
              value={formData.total_igst}
              onChange={handleChange}
            />
            <CurrencyField
              label="CGST"
              name="total_cgst"
              value={formData.total_cgst}
              onChange={handleChange}
            />
            <CurrencyField
              label="SGST"
              name="total_sgst"
              value={formData.total_sgst}
              onChange={handleChange}
            />
            <CurrencyField
              label="Cess"
              name="total_cess"
              value={formData.total_cess}
              onChange={handleChange}
            />
          </div>

          <div className="mt-4 pt-4 border-t border-[#E5E7EB]">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <CurrencyField
                label="Total Tax Liability"
                name="total_tax_liability"
                value={formData.total_tax_liability}
                onChange={handleChange}
                readOnly
              />
            </div>
          </div>
        </div>

        {/* Section 3: Input Tax Credit */}
        <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6 mb-6">
          <h2 className="text-base font-semibold text-[#333] mb-4">Input Tax Credit</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <CurrencyField
              label="Total ITC Claimed"
              name="total_itc"
              value={formData.total_itc}
              onChange={handleChange}
            />
            <CurrencyField
              label="Net Tax Payable"
              name="net_tax_payable"
              value={formData.net_tax_payable}
              onChange={handleChange}
              readOnly
            />
          </div>
        </div>

        {/* Section 4: Payment Details */}
        <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6 mb-6">
          <h2 className="text-base font-semibold text-[#333] mb-4">Payment Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <CurrencyField
              label="Late Fee"
              name="late_fee"
              value={formData.late_fee}
              onChange={handleChange}
            />
            <CurrencyField
              label="Interest"
              name="interest"
              value={formData.interest}
              onChange={handleChange}
            />
            <div>
              <FormLabel>Total Payable</FormLabel>
              <div className="px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm font-semibold text-[#333] bg-[#F9FAFB]">
                {formatIndianCurrency(totalPayable)}
              </div>
            </div>
          </div>

          {/* Summary bar */}
          <div className="mt-4 pt-4 border-t border-[#E5E7EB]">
            <div className="flex flex-wrap gap-6 text-sm">
              <div>
                <span className="text-[#6B7280]">Tax Liability:</span>{' '}
                <span className="font-semibold text-[#333]">
                  {formatIndianCurrency(totalTaxLiability)}
                </span>
              </div>
              <div>
                <span className="text-[#6B7280]">ITC:</span>{' '}
                <span className="font-semibold text-green-600">
                  {formatIndianCurrency(totalItc)}
                </span>
              </div>
              <div>
                <span className="text-[#6B7280]">Net Payable:</span>{' '}
                <span className="font-bold text-[#333]">
                  {formatIndianCurrency(netPayable)}
                </span>
              </div>
              {(lateFee > 0 || interest > 0) && (
                <div>
                  <span className="text-[#6B7280]">+ Late Fee & Interest:</span>{' '}
                  <span className="font-semibold text-red-600">
                    {formatIndianCurrency(lateFee + interest)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section 5: Notes */}
        <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6 mb-6">
          <h2 className="text-base font-semibold text-[#333] mb-4">Notes</h2>
          <div>
            <FormLabel>Remarks</FormLabel>
            <textarea
              name="remarks"
              value={formData.remarks}
              onChange={handleChange}
              rows={4}
              placeholder="Add any remarks or notes about this filing..."
              className={`${inputClass} border-[#E5E7EB] resize-vertical`}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pb-8">
          <button
            type="button"
            onClick={() => navigate(isEdit ? `/gst-filings/${id}` : '/gst-filings')}
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
                : 'Creating...'
              : isEdit
              ? 'Update Filing'
              : 'Create Filing'}
          </button>
        </div>
      </form>
    </div>
  );
}
