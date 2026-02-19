import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { HiOutlineArrowLeft } from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { investorOrderApi } from '../../api/investorOrder.api';
import { formatINR } from '../../utils/currency';
import LoadingSpinner from '../../components/feedback/LoadingSpinner';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges';

const MONTH_ORDER = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getCurrentMonthYear() {
  const now = new Date();
  const m = MONTH_ORDER[now.getMonth()];
  const y = String(now.getFullYear()).slice(-2);
  return `${m}'${y}`;
}

function parseMonthYear(my) {
  // e.g. "Feb'26" => { month: 'Feb', year: 2026 }
  if (!my) return { month: '', year: 2026 };
  const parts = my.split("'");
  return { month: parts[0] || '', year: parseInt('20' + (parts[1] || '26')) };
}

const EMPTY_FORM = {
  buyer: '',
  style: '',
  description: '',
  color: '',
  order_qty: 0,
  tailor_rate: 0,
  fob: 0,
  cost_incure: 0,
  order_receipt_date: '',
};

export default function InvestorOrderFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isEdit = Boolean(id);

  const monthParam = searchParams.get('month') || getCurrentMonthYear();

  const { setIsDirty } = useUnsavedChanges();
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [monthYear, setMonthYear] = useState(monthParam);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Fetch existing order for edit
  useEffect(() => {
    if (isEdit) {
      setLoading(true);
      investorOrderApi.getById(id)
        .then((res) => {
          const data = res.data.data;
          setForm({
            buyer: data.buyer || '',
            style: data.style || '',
            description: data.description || '',
            color: data.color || '',
            order_qty: data.order_qty || 0,
            tailor_rate: data.tailor_rate || 0,
            fob: data.fob || 0,
            cost_incure: data.cost_incure || 0,
            order_receipt_date: data.order_receipt_date ? data.order_receipt_date.split('T')[0] : '',
          });
          setMonthYear(data.month_year || monthParam);
        })
        .catch(() => toast.error('Failed to load order'))
        .finally(() => setLoading(false));
    }
  }, [id, isEdit, monthParam]);

  // Auto calculations
  const calculated = useMemo(() => {
    const qty = parseInt(form.order_qty) || 0;
    const tailorRate = parseFloat(form.tailor_rate) || 0;
    const fob = parseFloat(form.fob) || 0;
    const costIncure = parseFloat(form.cost_incure) || 0;

    const totalTailorCost = tailorRate * qty;
    const fobTotal = fob * qty;
    const costIncureValue = costIncure * qty;
    const profit = fob - tailorRate - costIncure;
    const profitValue = profit * qty;
    const profitPct = fob > 0 ? (profit / fob) * 100 : 0;

    return { totalTailorCost, fobTotal, costIncureValue, profit, profitValue, profitPct };
  }, [form.order_qty, form.tailor_rate, form.fob, form.cost_incure]);

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.buyer) {
      toast.error('Buyer is required');
      return;
    }
    if (!monthYear) {
      toast.error('Month/Year is required');
      return;
    }

    setSaving(true);
    try {
      const parsed = parseMonthYear(monthYear);
      const payload = {
        ...form,
        month_year: monthYear,
        month: parsed.month,
        year: parsed.year,
      };

      if (isEdit) {
        await investorOrderApi.update(id, payload);
        toast.success('Order updated');
      } else {
        await investorOrderApi.create(payload);
        toast.success('Order created');
      }
      setIsDirty(false);
      navigate(`/investor-orders?month=${encodeURIComponent(monthYear)}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save order');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="py-20">
        <LoadingSpinner size="lg" label="Loading order..." />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="bg-white border-b border-[var(--zoho-border)] px-6 py-4 -mx-6 -mt-6 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/investor-orders?month=${encodeURIComponent(monthYear)}`)}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors cursor-pointer"
          >
            <HiOutlineArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-semibold text-[var(--zoho-text)]">
            {isEdit ? 'Edit Order' : 'New Order'}
          </h1>
          <span className="text-sm text-gray-500">({monthYear})</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl">
        {/* Month/Year selector */}
        <div className="bg-white rounded-lg border border-[var(--zoho-border)] p-5 mb-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Period</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Month/Year</label>
              <input
                type="text"
                value={monthYear}
                onChange={(e) => setMonthYear(e.target.value)}
                placeholder="e.g. Feb'26"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                disabled={isEdit}
              />
              <p className="text-[11px] text-gray-400 mt-1">Format: Mon'YY (e.g. Feb'26, Jan'25)</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Order Receipt Date</label>
              <input
                type="date"
                value={form.order_receipt_date}
                onChange={(e) => handleChange('order_receipt_date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Order Details */}
        <div className="bg-white rounded-lg border border-[var(--zoho-border)] p-5 mb-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Order Details</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Buyer <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={form.buyer}
                onChange={(e) => handleChange('buyer', e.target.value)}
                placeholder="e.g. Maruti, Spy By"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Style</label>
              <input
                type="text"
                value={form.style}
                onChange={(e) => handleChange('style', e.target.value)}
                placeholder="e.g. Mapple Collor Shirt"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="e.g. Shirt, Shorts, Winguard Skirt"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
              <input
                type="text"
                value={form.color}
                onChange={(e) => handleChange('color', e.target.value)}
                placeholder="e.g. Black, 3 Color way"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Rates & Quantities */}
        <div className="bg-white rounded-lg border border-[var(--zoho-border)] p-5 mb-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Rates & Quantities</h3>
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Order Qty</label>
              <input
                type="number"
                value={form.order_qty}
                onChange={(e) => handleChange('order_qty', e.target.value)}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none tabular-nums text-right"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tailor Rate (per unit)</label>
              <input
                type="number"
                step="0.01"
                value={form.tailor_rate}
                onChange={(e) => handleChange('tailor_rate', e.target.value)}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none tabular-nums text-right"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">FOB (per unit)</label>
              <input
                type="number"
                step="0.01"
                value={form.fob}
                onChange={(e) => handleChange('fob', e.target.value)}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none tabular-nums text-right"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cost Incure (per unit)</label>
              <input
                type="number"
                step="0.001"
                value={form.cost_incure}
                onChange={(e) => handleChange('cost_incure', e.target.value)}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none tabular-nums text-right"
              />
            </div>
          </div>

          {/* Auto-calculated preview */}
          <div className="bg-blue-50 rounded-lg p-4 mt-4">
            <h4 className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-3">Auto-Calculated</h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Total Tailor Cost</p>
                <p className="text-sm font-semibold text-gray-900 tabular-nums">{formatINR(calculated.totalTailorCost)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">FOB Total (Revenue)</p>
                <p className="text-sm font-semibold text-gray-900 tabular-nums">{formatINR(calculated.fobTotal)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Cost Incure Value</p>
                <p className="text-sm font-semibold text-gray-900 tabular-nums">{formatINR(calculated.costIncureValue)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Profit per Unit</p>
                <p className={`text-sm font-semibold tabular-nums ${calculated.profit >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                  {formatINR(calculated.profit)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Total Profit Value</p>
                <p className={`text-sm font-semibold tabular-nums ${calculated.profitValue >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                  {formatINR(calculated.profitValue)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Profit %</p>
                <p className="text-sm font-semibold text-gray-900 tabular-nums">{calculated.profitPct.toFixed(1)}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 bg-[#0071DC] hover:bg-[#005BB5] text-white text-sm font-medium px-6 py-2.5 rounded-md transition-colors disabled:opacity-50 cursor-pointer"
          >
            {saving ? 'Saving...' : isEdit ? 'Update Order' : 'Save Order'}
          </button>
          <button
            type="button"
            onClick={() => navigate(`/investor-orders?month=${encodeURIComponent(monthYear)}`)}
            className="text-sm font-medium text-gray-600 hover:text-gray-900 px-4 py-2.5 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
