import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { HiOutlineArrowLeft } from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { tdsChallanApi } from '../../api/tdsChallan.api';
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

const STATUSES = ['Draft', 'Deposited', 'Verified'];
const PAYMENT_MODES = ['Online', 'NEFT', 'RTGS', 'Cheque', 'Cash', 'Other'];
const TDS_SECTIONS = ['194C', '194H', '194I', '194J', '194A', '194Q', '194N', '194O', '195'];

function getAssessmentYearOptions() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const startYear = currentMonth >= 3 ? currentYear + 1 : currentYear;
  const options = [];
  for (let i = 0; i < 6; i++) {
    const ay = startYear - i;
    options.push(`${ay}-${String(ay + 1).slice(-2)}`);
  }
  return options;
}

const INITIAL_FORM = {
  challan_number: '',
  bsr_code: '',
  deposit_date: new Date().toISOString().split('T')[0],
  assessment_year: '',
  section: '',
  total_tds_amount: '',
  total_surcharge: '',
  total_cess: '',
  total_amount: '',
  payment_mode: 'Online',
  bank_name: '',
  status: 'Draft',
  remarks: '',
};

// ── Shared Styles ──────────────────────────────────────────────────

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

// ── Components ─────────────────────────────────────────────────────

function FormLabel({ children, required }) {
  return (
    <label className="block text-sm font-medium text-[#333] mb-1">
      {children}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}

function CurrencyField({ label, name, value, onChange, readOnly, required, placeholder = '0.00' }) {
  return (
    <div>
      <FormLabel required={required}>{label}</FormLabel>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#6B7280]">{'\u20B9'}</span>
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

export default function TDSChallanFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const { setIsDirty } = useUnsavedChanges();
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  // ── Load existing ────────────────────────────────────────────────

  useEffect(() => {
    if (!isEdit) return;
    const loadData = async () => {
      setLoading(true);
      try {
        const res = await tdsChallanApi.getById(id);
        const d = res.data?.data || res.data;
        if (!d) {
          toast.error('TDS Challan not found');
          navigate('/tds-challans');
          return;
        }
        setFormData({
          challan_number: d.challan_number || '',
          bsr_code: d.bsr_code || '',
          deposit_date: d.deposit_date ? d.deposit_date.split('T')[0] : d.challan_date ? d.challan_date.split('T')[0] : '',
          assessment_year: d.assessment_year || '',
          section: d.section || '',
          total_tds_amount: d.total_tds_amount != null ? String(d.total_tds_amount) : '',
          total_surcharge: d.total_surcharge != null ? String(d.total_surcharge) : '',
          total_cess: d.total_cess != null ? String(d.total_cess) : '',
          total_amount: d.total_amount != null ? String(d.total_amount) : d.amount != null ? String(d.amount) : '',
          payment_mode: d.payment_mode || 'Online',
          bank_name: d.bank_name || '',
          status: d.status || 'Draft',
          remarks: d.remarks || d.notes || '',
        });
      } catch (err) {
        if (err.response?.status === 404) {
          toast.error('TDS Challan not found');
          navigate('/tds-challans');
        }
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id, isEdit, navigate]);

  // ── Handle changes ───────────────────────────────────────────────

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const next = { ...prev, [name]: value };

      // Auto-calculate total_amount = tds_amount + surcharge + cess
      if (['total_tds_amount', 'total_surcharge', 'total_cess'].includes(name)) {
        const tds = parseFloat(name === 'total_tds_amount' ? value : next.total_tds_amount) || 0;
        const surcharge = parseFloat(name === 'total_surcharge' ? value : next.total_surcharge) || 0;
        const cess = parseFloat(name === 'total_cess' ? value : next.total_cess) || 0;
        next.total_amount = (tds + surcharge + cess).toFixed(2);
      }

      return next;
    });

    setIsDirty(true);

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
    if (!formData.deposit_date) errs.deposit_date = 'Deposit date is required';
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
        // backward compat
        challan_date: formData.deposit_date,
        amount: parseFloat(formData.total_amount) || 0,
        period: formData.assessment_year,
        total_tds_amount: parseFloat(formData.total_tds_amount) || 0,
        total_surcharge: parseFloat(formData.total_surcharge) || 0,
        total_cess: parseFloat(formData.total_cess) || 0,
        total_amount: parseFloat(formData.total_amount) || 0,
      };

      if (isEdit) {
        await tdsChallanApi.update(id, payload);
        toast.success('TDS Challan updated successfully');
        setIsDirty(false);
        navigate(`/tds-challans/${id}`);
      } else {
        const res = await tdsChallanApi.create(payload);
        const newId = res.data?.data?.id || res.data?.id;
        toast.success('TDS Challan created successfully');
        setIsDirty(false);
        navigate(newId ? `/tds-challans/${newId}` : '/tds-challans');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.response?.data?.detail || 'Failed to save TDS challan';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // ── Loading ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#0071DC] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-[#6B7280]">Loading challan...</span>
        </div>
      </div>
    );
  }

  // Computed
  const tdsAmt = parseFloat(formData.total_tds_amount) || 0;
  const surcharge = parseFloat(formData.total_surcharge) || 0;
  const cess = parseFloat(formData.total_cess) || 0;
  const totalAmount = parseFloat(formData.total_amount) || 0;

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate(isEdit ? `/tds-challans/${id}` : '/tds-challans')}
          className="p-2 rounded-lg hover:bg-[#F3F4F6] transition-colors"
        >
          <HiOutlineArrowLeft className="w-5 h-5 text-[#6B7280]" />
        </button>
        <div>
          <h1 className="text-2xl font-semibold text-[#333]">
            {isEdit ? 'Edit TDS Challan' : 'New TDS Challan'}
          </h1>
          <p className="text-sm text-[#6B7280] mt-0.5">
            {isEdit ? 'Update challan details' : 'Record a new TDS challan deposit'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Section 1: Challan Information */}
        <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6 mb-6">
          <h2 className="text-base font-semibold text-[#333] mb-4">Challan Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <FormLabel>Challan Number</FormLabel>
              <input
                type="text"
                name="challan_number"
                value={formData.challan_number}
                onChange={handleChange}
                placeholder="Challan serial number"
                className={`${inputClass} border-[#E5E7EB]`}
              />
            </div>
            <div>
              <FormLabel>BSR Code</FormLabel>
              <input
                type="text"
                name="bsr_code"
                value={formData.bsr_code}
                onChange={handleChange}
                placeholder="7-digit BSR code"
                className={`${inputClass} border-[#E5E7EB] font-mono`}
              />
            </div>
            <div>
              <FormLabel required>Deposit Date</FormLabel>
              <input
                type="date"
                name="deposit_date"
                value={formData.deposit_date}
                onChange={handleChange}
                className={errors.deposit_date ? inputErrorClass : `${inputClass} border-[#E5E7EB]`}
              />
              {errors.deposit_date && <p className="text-xs text-red-500 mt-1">{errors.deposit_date}</p>}
            </div>
            <div>
              <FormLabel>Assessment Year</FormLabel>
              <select
                name="assessment_year"
                value={formData.assessment_year}
                onChange={handleChange}
                className={selectClass}
              >
                <option value="">Select AY</option>
                {getAssessmentYearOptions().map((ay) => (
                  <option key={ay} value={ay}>AY {ay}</option>
                ))}
              </select>
            </div>
            <div>
              <FormLabel>Section</FormLabel>
              <select
                name="section"
                value={formData.section}
                onChange={handleChange}
                className={selectClass}
              >
                <option value="">Select Section</option>
                {TDS_SECTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <FormLabel>Status</FormLabel>
              <select name="status" value={formData.status} onChange={handleChange} className={selectClass}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Amount Details */}
        <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6 mb-6">
          <h2 className="text-base font-semibold text-[#333] mb-4">Amount Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <CurrencyField
              label="TDS Amount"
              name="total_tds_amount"
              value={formData.total_tds_amount}
              onChange={handleChange}
            />
            <CurrencyField
              label="Surcharge"
              name="total_surcharge"
              value={formData.total_surcharge}
              onChange={handleChange}
            />
            <CurrencyField
              label="Education Cess"
              name="total_cess"
              value={formData.total_cess}
              onChange={handleChange}
            />
            <CurrencyField
              label="Total Amount"
              name="total_amount"
              value={formData.total_amount}
              onChange={handleChange}
              readOnly
            />
          </div>

          {/* Summary */}
          <div className="mt-4 pt-4 border-t border-[#E5E7EB]">
            <div className="flex flex-wrap gap-6 text-sm">
              <div>
                <span className="text-[#6B7280]">TDS:</span>{' '}
                <span className="font-semibold text-[#333]">{formatIndianCurrency(tdsAmt)}</span>
              </div>
              {surcharge > 0 && (
                <div>
                  <span className="text-[#6B7280]">+ Surcharge:</span>{' '}
                  <span className="font-semibold text-[#333]">{formatIndianCurrency(surcharge)}</span>
                </div>
              )}
              {cess > 0 && (
                <div>
                  <span className="text-[#6B7280]">+ Cess:</span>{' '}
                  <span className="font-semibold text-[#333]">{formatIndianCurrency(cess)}</span>
                </div>
              )}
              <div>
                <span className="text-[#6B7280]">Total:</span>{' '}
                <span className="font-bold text-[#333]">{formatIndianCurrency(totalAmount)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Payment Details */}
        <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6 mb-6">
          <h2 className="text-base font-semibold text-[#333] mb-4">Payment Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <FormLabel>Payment Mode</FormLabel>
              <select name="payment_mode" value={formData.payment_mode} onChange={handleChange} className={selectClass}>
                {PAYMENT_MODES.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <FormLabel>Bank Name</FormLabel>
              <input
                type="text"
                name="bank_name"
                value={formData.bank_name}
                onChange={handleChange}
                placeholder="Name of the bank"
                className={`${inputClass} border-[#E5E7EB]`}
              />
            </div>
          </div>
        </div>

        {/* Section 4: Notes */}
        <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6 mb-6">
          <h2 className="text-base font-semibold text-[#333] mb-4">Notes</h2>
          <div>
            <FormLabel>Remarks</FormLabel>
            <textarea
              name="remarks"
              value={formData.remarks}
              onChange={handleChange}
              rows={4}
              placeholder="Add any remarks about this challan..."
              className={`${inputClass} border-[#E5E7EB] resize-vertical`}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pb-8">
          <button
            type="button"
            onClick={() => navigate(isEdit ? `/tds-challans/${id}` : '/tds-challans')}
            className="px-5 py-2 text-sm font-medium text-[#333] bg-white border border-[#E5E7EB] rounded-lg hover:bg-[#F9FAFB] transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-[#0071DC] rounded-lg hover:bg-[#005BB5] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {saving ? (isEdit ? 'Updating...' : 'Creating...') : (isEdit ? 'Update Challan' : 'Create Challan')}
          </button>
        </div>
      </form>
    </div>
  );
}
