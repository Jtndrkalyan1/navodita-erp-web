import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { HiOutlineArrowLeft } from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { tdsLiabilityApi } from '../../api/tdsLiability.api';
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

const TDS_SECTIONS = [
  { value: '194C', label: '194C - Contractors' },
  { value: '194H', label: '194H - Commission/Brokerage' },
  { value: '194I', label: '194I - Rent' },
  { value: '194J', label: '194J - Professional/Technical Fees' },
  { value: '194A', label: '194A - Interest (other than securities)' },
  { value: '194B', label: '194B - Lottery Winnings' },
  { value: '194D', label: '194D - Insurance Commission' },
  { value: '194E', label: '194E - Payments to NR Sportsmen' },
  { value: '194G', label: '194G - Lottery Tickets' },
  { value: '194K', label: '194K - Mutual Fund Income' },
  { value: '194N', label: '194N - Cash Withdrawals' },
  { value: '194O', label: '194O - E-Commerce Operator' },
  { value: '194Q', label: '194Q - Purchase of Goods' },
  { value: '194R', label: '194R - Business Perquisites' },
  { value: '194S', label: '194S - Crypto/VDA' },
  { value: '195', label: '195 - Payments to NRI' },
];

const DEDUCTEE_TYPES = ['Individual', 'Company', 'Firm', 'HUF', 'Trust', 'AOP/BOI', 'Government', 'Other'];
const STATUSES = ['Pending', 'Deposited', 'Filed'];

const INITIAL_FORM = {
  deductee_name: '',
  deductee_pan: '',
  deductee_type: 'Individual',
  section: '194C',
  tds_rate: '',
  base_amount: '',
  tds_amount: '',
  surcharge: '',
  cess: '',
  total_tds: '',
  deduction_date: new Date().toISOString().split('T')[0],
  payment_date: '',
  challan_number: '',
  status: 'Pending',
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

export default function TDSLiabilityFormPage() {
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
        const res = await tdsLiabilityApi.getById(id);
        const d = res.data?.data || res.data;
        if (!d) {
          toast.error('TDS Liability not found');
          navigate('/tds-liabilities');
          return;
        }
        setFormData({
          deductee_name: d.deductee_name || d.vendor_name || '',
          deductee_pan: d.deductee_pan || '',
          deductee_type: d.deductee_type || 'Individual',
          section: d.section || '194C',
          tds_rate: d.tds_rate != null ? String(d.tds_rate) : '',
          base_amount: d.base_amount != null ? String(d.base_amount) : d.payment_amount != null ? String(d.payment_amount) : '',
          tds_amount: d.tds_amount != null ? String(d.tds_amount) : '',
          surcharge: d.surcharge != null ? String(d.surcharge) : '',
          cess: d.cess != null ? String(d.cess) : '',
          total_tds: d.total_tds != null ? String(d.total_tds) : '',
          deduction_date: d.deduction_date ? d.deduction_date.split('T')[0] : d.payment_date ? d.payment_date.split('T')[0] : '',
          payment_date: d.payment_date ? d.payment_date.split('T')[0] : '',
          challan_number: d.challan_number || '',
          status: d.status || 'Pending',
          remarks: d.remarks || d.notes || '',
        });
      } catch (err) {
        if (err.response?.status === 404) {
          toast.error('TDS Liability not found');
          navigate('/tds-liabilities');
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

      // Auto-calculate TDS amount: base_amount * tds_rate / 100
      if (name === 'base_amount' || name === 'tds_rate') {
        const base = parseFloat(name === 'base_amount' ? value : next.base_amount) || 0;
        const rate = parseFloat(name === 'tds_rate' ? value : next.tds_rate) || 0;
        next.tds_amount = (base * rate / 100).toFixed(2);
      }

      // Auto-calculate total_tds: tds_amount + surcharge + cess
      if (['base_amount', 'tds_rate', 'tds_amount', 'surcharge', 'cess'].includes(name)) {
        const tdsAmt = parseFloat(next.tds_amount) || 0;
        const surcharge = parseFloat(name === 'surcharge' ? value : next.surcharge) || 0;
        const cess = parseFloat(name === 'cess' ? value : next.cess) || 0;
        next.total_tds = (tdsAmt + surcharge + cess).toFixed(2);
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
    if (!formData.deductee_name.trim()) errs.deductee_name = 'Deductee name is required';
    if (!formData.section) errs.section = 'Section is required';
    if (!formData.base_amount || parseFloat(formData.base_amount) <= 0) errs.base_amount = 'Base amount must be greater than 0';
    if (!formData.deduction_date) errs.deduction_date = 'Deduction date is required';
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
        // backward compat fields
        vendor_name: formData.deductee_name,
        payment_amount: parseFloat(formData.base_amount) || 0,
        base_amount: parseFloat(formData.base_amount) || 0,
        tds_rate: parseFloat(formData.tds_rate) || 0,
        tds_amount: parseFloat(formData.tds_amount) || 0,
        surcharge: parseFloat(formData.surcharge) || 0,
        cess: parseFloat(formData.cess) || 0,
        total_tds: parseFloat(formData.total_tds) || 0,
      };

      if (isEdit) {
        await tdsLiabilityApi.update(id, payload);
        toast.success('TDS Liability updated successfully');
        setIsDirty(false);
        navigate(`/tds-liabilities/${id}`);
      } else {
        const res = await tdsLiabilityApi.create(payload);
        const newId = res.data?.data?.id || res.data?.id;
        toast.success('TDS Liability created successfully');
        setIsDirty(false);
        navigate(newId ? `/tds-liabilities/${newId}` : '/tds-liabilities');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.response?.data?.detail || 'Failed to save TDS liability';
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
          <span className="text-sm text-[#6B7280]">Loading liability...</span>
        </div>
      </div>
    );
  }

  // Computed
  const tdsAmount = parseFloat(formData.tds_amount) || 0;
  const surcharge = parseFloat(formData.surcharge) || 0;
  const cess = parseFloat(formData.cess) || 0;
  const totalTds = parseFloat(formData.total_tds) || 0;

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate(isEdit ? `/tds-liabilities/${id}` : '/tds-liabilities')}
          className="p-2 rounded-lg hover:bg-[#F3F4F6] transition-colors"
        >
          <HiOutlineArrowLeft className="w-5 h-5 text-[#6B7280]" />
        </button>
        <div>
          <h1 className="text-2xl font-semibold text-[#333]">
            {isEdit ? 'Edit TDS Liability' : 'New TDS Liability'}
          </h1>
          <p className="text-sm text-[#6B7280] mt-0.5">
            {isEdit ? 'Update TDS deduction details' : 'Record a new TDS deduction'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Section 1: Deductee Information */}
        <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6 mb-6">
          <h2 className="text-base font-semibold text-[#333] mb-4">Deductee Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <FormLabel required>Deductee Name</FormLabel>
              <input
                type="text"
                name="deductee_name"
                value={formData.deductee_name}
                onChange={handleChange}
                placeholder="Name of the deductee"
                className={errors.deductee_name ? inputErrorClass : `${inputClass} border-[#E5E7EB]`}
              />
              {errors.deductee_name && <p className="text-xs text-red-500 mt-1">{errors.deductee_name}</p>}
            </div>
            <div>
              <FormLabel>Deductee PAN</FormLabel>
              <input
                type="text"
                name="deductee_pan"
                value={formData.deductee_pan}
                onChange={handleChange}
                placeholder="e.g. ABCPD1234E"
                maxLength={10}
                className={`${inputClass} border-[#E5E7EB] uppercase font-mono`}
              />
            </div>
            <div>
              <FormLabel>Deductee Type</FormLabel>
              <select name="deductee_type" value={formData.deductee_type} onChange={handleChange} className={selectClass}>
                {DEDUCTEE_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <FormLabel required>TDS Section</FormLabel>
              <select
                name="section"
                value={formData.section}
                onChange={handleChange}
                className={errors.section ? inputErrorClass : selectClass}
              >
                {TDS_SECTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
              {errors.section && <p className="text-xs text-red-500 mt-1">{errors.section}</p>}
            </div>
            <div>
              <FormLabel required>Deduction Date</FormLabel>
              <input
                type="date"
                name="deduction_date"
                value={formData.deduction_date}
                onChange={handleChange}
                className={errors.deduction_date ? inputErrorClass : `${inputClass} border-[#E5E7EB]`}
              />
              {errors.deduction_date && <p className="text-xs text-red-500 mt-1">{errors.deduction_date}</p>}
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

        {/* Section 2: TDS Calculation */}
        <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6 mb-6">
          <h2 className="text-base font-semibold text-[#333] mb-4">TDS Calculation</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <CurrencyField
              label="Base Amount"
              name="base_amount"
              value={formData.base_amount}
              onChange={handleChange}
              required
            />
            <div>
              <FormLabel>TDS Rate (%)</FormLabel>
              <input
                type="number"
                step="0.01"
                name="tds_rate"
                value={formData.tds_rate}
                onChange={handleChange}
                placeholder="e.g. 2.0"
                className={`${inputClass} border-[#E5E7EB]`}
              />
            </div>
            <CurrencyField
              label="TDS Amount"
              name="tds_amount"
              value={formData.tds_amount}
              onChange={handleChange}
              readOnly
            />
            <CurrencyField
              label="Surcharge"
              name="surcharge"
              value={formData.surcharge}
              onChange={handleChange}
            />
            <CurrencyField
              label="Education Cess"
              name="cess"
              value={formData.cess}
              onChange={handleChange}
            />
            <CurrencyField
              label="Total TDS"
              name="total_tds"
              value={formData.total_tds}
              onChange={handleChange}
              readOnly
            />
          </div>

          {/* Calculation Summary */}
          <div className="mt-4 pt-4 border-t border-[#E5E7EB]">
            <div className="flex flex-wrap gap-6 text-sm">
              <div>
                <span className="text-[#6B7280]">TDS Amount:</span>{' '}
                <span className="font-semibold text-[#333]">{formatIndianCurrency(tdsAmount)}</span>
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
                <span className="text-[#6B7280]">Total TDS:</span>{' '}
                <span className="font-bold text-[#333]">{formatIndianCurrency(totalTds)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Payment Information */}
        <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6 mb-6">
          <h2 className="text-base font-semibold text-[#333] mb-4">Payment Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <FormLabel>Payment Date</FormLabel>
              <input
                type="date"
                name="payment_date"
                value={formData.payment_date}
                onChange={handleChange}
                className={`${inputClass} border-[#E5E7EB]`}
              />
            </div>
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
              placeholder="Add any remarks about this TDS deduction..."
              className={`${inputClass} border-[#E5E7EB] resize-vertical`}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pb-8">
          <button
            type="button"
            onClick={() => navigate(isEdit ? `/tds-liabilities/${id}` : '/tds-liabilities')}
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
            {saving ? (isEdit ? 'Updating...' : 'Creating...') : (isEdit ? 'Update Liability' : 'Create Liability')}
          </button>
        </div>
      </form>
    </div>
  );
}
