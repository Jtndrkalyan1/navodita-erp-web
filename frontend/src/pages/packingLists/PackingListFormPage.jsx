import React, { useState, useEffect, useMemo, useRef } from 'react';
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
import FormField, { inputClassName } from '../../components/forms/FormField';
import DatePicker from '../../components/forms/DatePicker';
import SelectField from '../../components/forms/SelectField';
import LoadingSpinner from '../../components/feedback/LoadingSpinner';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges';

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
];

const EMPTY_ITEM = {
  item_name: '',
  carton_number: '',
  quantity: 1,
  length_cm: 0,
  width_cm: 0,
  height_cm: 0,
  net_weight: 0,
  gross_weight: 0,
};

function todayISO() { return new Date().toISOString().split('T')[0]; }

function computeCBM(item) {
  const l = Number(item.length_cm) || 0;
  const w = Number(item.width_cm) || 0;
  const h = Number(item.height_cm) || 0;
  return (l * w * h) / 1000000;
}

function CustomerSearchDropdown({ customers, value, onChange, error }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  const selected = customers.find((c) => c.id === value);

  const filtered = useMemo(() => {
    if (!search.trim()) return customers;
    const q = search.toLowerCase();
    return customers.filter((c) => (c.display_name || '').toLowerCase().includes(q) || (c.company_name || '').toLowerCase().includes(q));
  }, [customers, search]);

  useEffect(() => {
    function handleClickOutside(e) { if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setIsOpen(false); }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <FormField label="Customer" required error={error}>
      <div ref={wrapperRef} className="relative">
        <div onClick={() => { setIsOpen(!isOpen); setTimeout(() => inputRef.current?.focus(), 50); }} className={`${inputClassName(error)} flex items-center justify-between cursor-pointer min-h-[38px]`}>
          <span className={selected ? 'text-[var(--zoho-text)]' : 'text-gray-400'}>{selected ? selected.display_name || selected.company_name : 'Select a customer...'}</span>
          <div className="flex items-center gap-1">
            {selected && <button onClick={(e) => { e.stopPropagation(); onChange(null); setSearch(''); }} className="p-0.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer" type="button"><HiOutlineXMark className="w-3.5 h-3.5" /></button>}
            <HiOutlineChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </div>
        {isOpen && (
          <div className="absolute z-50 mt-1 w-full bg-white border border-[var(--zoho-border)] rounded-lg shadow-lg max-h-72 overflow-hidden">
            <div className="px-3 py-2 border-b border-gray-100"><div className="relative"><HiOutlineMagnifyingGlass className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input ref={inputRef} type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search customers..." className="w-full pl-8 pr-3 py-1.5 text-sm border border-[var(--zoho-border)] rounded-md bg-white text-[var(--zoho-text)] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]" /></div></div>
            <div className="max-h-52 overflow-y-auto">
              {filtered.length === 0 ? <div className="px-4 py-6 text-center text-sm text-gray-400">No customers found</div> : filtered.map((c) => (
                <button key={c.id} onClick={() => { onChange(c); setIsOpen(false); setSearch(''); }} type="button" className={`w-full text-left px-4 py-2.5 text-sm transition-colors cursor-pointer hover:bg-blue-50 ${c.id === value ? 'bg-blue-50 text-[#0071DC]' : 'text-[var(--zoho-text)]'}`}>
                  <div className="font-medium">{c.display_name || c.company_name}</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </FormField>
  );
}

export default function PackingListFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const { setIsDirty, confirmLeave } = useUnsavedChanges();

  const [pageLoading, setPageLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [invoices, setInvoices] = useState([]);

  const [form, setForm] = useState({
    packing_date: todayISO(),
    customer_id: '',
    invoice_id: '',
    status: 'Draft',
    ship_to_address: '',
    ship_to_city: '',
    ship_to_state: '',
    ship_to_pincode: '',
    notify_party: '',
    remarks: '',
  });

  const [items, setItems] = useState([{ ...EMPTY_ITEM }]);
  const [errors, setErrors] = useState({});
  const [packingNumber, setPackingNumber] = useState('');

  useEffect(() => {
    async function load() {
      try { const res = await apiClient.get('/customers', { params: { limit: 500 } }); setCustomers(res.data.data || res.data || []); } catch { setCustomers([]); }
      try { const res = await apiClient.get('/invoices', { params: { limit: 500 } }); setInvoices(res.data.data || res.data || []); } catch { setInvoices([]); }
    }
    load();
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    async function loadPL() {
      try {
        const res = await apiClient.get(`/packing-lists/${id}`);
        const pl = res.data.data || res.data;
        if (!pl) { toast.error('Packing list not found'); navigate('/packing-lists', { replace: true }); return; }
        setPackingNumber(pl.packing_number || '');
        setForm({
          packing_date: pl.packing_date || todayISO(), customer_id: pl.customer_id || '', invoice_id: pl.invoice_id || '',
          status: pl.status || 'Draft', ship_to_address: pl.ship_to_address || '', ship_to_city: pl.ship_to_city || '',
          ship_to_state: pl.ship_to_state || '', ship_to_pincode: pl.ship_to_pincode || '',
          notify_party: pl.notify_party || '', remarks: pl.remarks || '',
        });
        const lineItems = (pl.items || pl.packing_list_items || []).map((item) => ({
          id: item.id, item_name: item.item_name || '', carton_number: item.carton_number || '',
          quantity: item.quantity ?? 1, length_cm: item.length_cm ?? 0, width_cm: item.width_cm ?? 0,
          height_cm: item.height_cm ?? 0, net_weight: item.net_weight ?? 0, gross_weight: item.gross_weight ?? 0,
        }));
        setItems(lineItems.length > 0 ? lineItems : [{ ...EMPTY_ITEM }]);
      } catch (err) { if (err.response?.status === 404) { toast.error('Not found'); navigate('/packing-lists', { replace: true }); } }
      finally { setPageLoading(false); }
    }
    loadPL();
  }, [id, isEdit, navigate]);

  function updateForm(field, value) {
    setForm((prev) => ({ ...prev, [field]: value })); setIsDirty(true);
    if (errors[field]) setErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
  }

  function handleCustomerSelect(customer) {
    if (!customer) { updateForm('customer_id', ''); return; }
    const addr = customer.shipping_address || customer.address || {};
    setForm((prev) => ({ ...prev, customer_id: customer.id, ship_to_address: addr.address_line1 || '', ship_to_city: addr.city || '', ship_to_state: addr.state || '', ship_to_pincode: addr.pincode || '' }));
    setIsDirty(true);
  }

  function updateItem(index, field, value) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))); setIsDirty(true);
    if (errors.items) setErrors((prev) => { const n = { ...prev }; delete n.items; return n; });
  }
  function addItem() { setItems((prev) => [...prev, { ...EMPTY_ITEM }]); setIsDirty(true); }
  function removeItem(index) { setItems((prev) => prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)); setIsDirty(true); }

  const totals = useMemo(() => {
    let totalCartons = 0, totalNet = 0, totalGross = 0, totalCbm = 0, totalQty = 0;
    items.forEach((item) => {
      totalCartons++; totalNet += Number(item.net_weight) || 0;
      totalGross += Number(item.gross_weight) || 0; totalCbm += computeCBM(item);
      totalQty += Number(item.quantity) || 0;
    });
    return { totalCartons, totalNet, totalGross, totalCbm, totalQty };
  }, [items]);

  function validate() {
    const errs = {};
    if (!form.customer_id) errs.customer_id = 'Customer is required';
    if (!form.packing_date) errs.packing_date = 'Date is required';
    const validItems = items.filter((item) => item.item_name?.trim());
    if (validItems.length === 0) errs.items = 'At least one line item is required';
    else validItems.forEach((item, i) => { if (!item.item_name?.trim()) errs[`item_${i}_name`] = 'Item name is required'; });
    setErrors(errs); return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) { toast.error('Please fix the errors before saving.'); return; }
    setSaving(true);
    const lineItems = items.filter((item) => item.item_name?.trim()).map((item, idx) => ({
      ...(item.id ? { id: item.id } : {}), item_name: item.item_name, carton_number: item.carton_number,
      quantity: Number(item.quantity) || 0, length_cm: Number(item.length_cm) || 0,
      width_cm: Number(item.width_cm) || 0, height_cm: Number(item.height_cm) || 0,
      net_weight: Number(item.net_weight) || 0, gross_weight: Number(item.gross_weight) || 0,
      cbm: computeCBM(item), sort_order: idx,
    }));
    const payload = {
      ...form, total_cartons: lineItems.length, total_net_weight: totals.totalNet,
      total_gross_weight: totals.totalGross, total_cbm: totals.totalCbm, items: lineItems,
    };
    try {
      if (isEdit) { await apiClient.put(`/packing-lists/${id}`, payload); toast.success('Packing list updated successfully'); }
      else { const res = await apiClient.post('/packing-lists', payload); const newId = res.data?.data?.id || res.data?.id; toast.success('Packing list created successfully'); setIsDirty(false); navigate(newId ? `/packing-lists/${newId}` : '/packing-lists', { replace: true }); return; }
      setIsDirty(false); navigate(`/packing-lists/${id}`, { replace: true });
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to save packing list'); }
    finally { setSaving(false); }
  }

  function handleCancel() { if (confirmLeave()) navigate(isEdit ? `/packing-lists/${id}` : '/packing-lists'); }
  const lineInputClass = 'w-full px-2 py-1.5 text-sm border border-transparent rounded bg-transparent text-[var(--zoho-text)] hover:border-[var(--zoho-border)] focus:border-[#0071DC] focus:ring-1 focus:ring-[#0071DC]/20 focus:outline-none transition-colors';

  if (pageLoading) return <div className="py-20"><LoadingSpinner size="lg" label="Loading packing list..." /></div>;

  return (
    <form onSubmit={handleSubmit} className="pb-8">
      <div className="bg-white border-b border-[var(--zoho-border)] px-6 py-4 -mx-6 -mt-6 mb-6">
        <div className="flex items-center gap-4">
          <button type="button" onClick={handleCancel} className="p-1.5 rounded-md text-[var(--zoho-text-secondary)] hover:text-[var(--zoho-text)] hover:bg-gray-100 transition-colors cursor-pointer"><HiOutlineArrowLeft className="w-5 h-5" /></button>
          <h1 className="text-xl font-semibold text-[var(--zoho-text)]">{isEdit ? `Edit Packing List${packingNumber ? ` #${packingNumber}` : ''}` : 'New Packing List'}</h1>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-white rounded-lg border border-[var(--zoho-border)] p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1">
            <div className="lg:col-span-2"><CustomerSearchDropdown customers={customers} value={form.customer_id} onChange={handleCustomerSelect} error={errors.customer_id} /></div>
            <SelectField label="Invoice" value={form.invoice_id} onChange={(v) => updateForm('invoice_id', v)} options={invoices.map((inv) => ({ value: inv.id, label: inv.invoice_number || `INV-${inv.id}` }))} placeholder="Select invoice (optional)..." />
            <DatePicker label="Packing Date" value={form.packing_date} onChange={(v) => updateForm('packing_date', v)} required error={errors.packing_date} />
            <FormField label="Notify Party"><input type="text" value={form.notify_party} onChange={(e) => updateForm('notify_party', e.target.value)} placeholder="Party to notify" className={inputClassName()} /></FormField>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-[var(--zoho-border)] p-6">
          <h3 className="text-sm font-semibold text-[var(--zoho-text)] mb-4 uppercase tracking-wide">Ship To Address</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
            <FormField label="Address"><input type="text" value={form.ship_to_address} onChange={(e) => updateForm('ship_to_address', e.target.value)} className={inputClassName()} /></FormField>
            <FormField label="City"><input type="text" value={form.ship_to_city} onChange={(e) => updateForm('ship_to_city', e.target.value)} className={inputClassName()} /></FormField>
            <SelectField label="State" value={form.ship_to_state} onChange={(v) => updateForm('ship_to_state', v)} options={INDIAN_STATES.map((s) => ({ value: s, label: s }))} placeholder="Select..." />
            <FormField label="PIN Code"><input type="text" value={form.ship_to_pincode} onChange={(e) => updateForm('ship_to_pincode', e.target.value)} maxLength={6} className={inputClassName()} /></FormField>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-[var(--zoho-border)] overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--zoho-border)]"><h3 className="text-sm font-semibold text-[var(--zoho-text)] uppercase tracking-wide">Carton / Item Details</h3>{errors.items && <p className="text-xs text-red-600 mt-1">{errors.items}</p>}</div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="bg-gray-50 border-b border-[var(--zoho-border)]">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--zoho-text-secondary)] w-10">#</th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--zoho-text-secondary)] min-w-[160px]">Item Name</th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--zoho-text-secondary)] w-28">Carton #</th>
                <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--zoho-text-secondary)] w-20">Qty</th>
                <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--zoho-text-secondary)] w-20">L(cm)</th>
                <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--zoho-text-secondary)] w-20">W(cm)</th>
                <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--zoho-text-secondary)] w-20">H(cm)</th>
                <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--zoho-text-secondary)] w-24">Net Wt(kg)</th>
                <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--zoho-text-secondary)] w-24">Gross Wt(kg)</th>
                <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--zoho-text-secondary)] w-24">CBM</th>
                <th className="px-3 py-3 w-10" />
              </tr></thead>
              <tbody>
                {items.map((item, index) => {
                  const cbm = computeCBM(item);
                  const hasNameError = !!errors[`item_${index}_name`];
                  return (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-2 text-xs text-[var(--zoho-text-secondary)] align-top pt-3">{index + 1}</td>
                      <td className="px-2 py-1"><input type="text" value={item.item_name || ''} onChange={(e) => updateItem(index, 'item_name', e.target.value)} placeholder="Item name" className={`${lineInputClass} ${hasNameError ? 'border-red-300 bg-red-50/50' : ''}`} />{hasNameError && <p className="text-[10px] text-red-500 px-2 mt-0.5">{errors[`item_${index}_name`]}</p>}</td>
                      <td className="px-2 py-1"><input type="text" value={item.carton_number || ''} onChange={(e) => updateItem(index, 'carton_number', e.target.value)} placeholder="CTN-1" className={lineInputClass} /></td>
                      <td className="px-2 py-1"><input type="number" value={item.quantity ?? ''} onChange={(e) => updateItem(index, 'quantity', e.target.value)} min="0" className={`${lineInputClass} text-right`} /></td>
                      <td className="px-2 py-1"><input type="number" value={item.length_cm ?? ''} onChange={(e) => updateItem(index, 'length_cm', e.target.value)} min="0" step="0.1" className={`${lineInputClass} text-right`} /></td>
                      <td className="px-2 py-1"><input type="number" value={item.width_cm ?? ''} onChange={(e) => updateItem(index, 'width_cm', e.target.value)} min="0" step="0.1" className={`${lineInputClass} text-right`} /></td>
                      <td className="px-2 py-1"><input type="number" value={item.height_cm ?? ''} onChange={(e) => updateItem(index, 'height_cm', e.target.value)} min="0" step="0.1" className={`${lineInputClass} text-right`} /></td>
                      <td className="px-2 py-1"><input type="number" value={item.net_weight ?? ''} onChange={(e) => updateItem(index, 'net_weight', e.target.value)} min="0" step="0.01" className={`${lineInputClass} text-right`} /></td>
                      <td className="px-2 py-1"><input type="number" value={item.gross_weight ?? ''} onChange={(e) => updateItem(index, 'gross_weight', e.target.value)} min="0" step="0.01" className={`${lineInputClass} text-right`} /></td>
                      <td className="px-4 py-2 text-right text-sm text-[var(--zoho-text)] tabular-nums align-top pt-3">{cbm.toFixed(4)}</td>
                      <td className="px-2 py-2 align-top pt-2.5"><button type="button" onClick={() => removeItem(index)} disabled={items.length <= 1} className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"><HiOutlineTrash className="w-4 h-4" /></button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-3 border-t border-gray-100"><button type="button" onClick={addItem} className="inline-flex items-center gap-1.5 text-sm font-medium text-[#0071DC] hover:text-[#005BB5] transition-colors cursor-pointer"><HiOutlinePlus className="w-4 h-4" /> Add Carton / Item</button></div>

          {items.some((item) => item.item_name?.trim()) && (
            <div className="border-t border-[var(--zoho-border)] bg-gray-50">
              <div className="flex justify-end px-6 py-5">
                <div className="w-full max-w-md space-y-2">
                  <div className="flex items-center justify-between text-sm"><span className="text-[var(--zoho-text-secondary)]">Total Cartons</span><span className="font-medium text-[var(--zoho-text)] tabular-nums">{totals.totalCartons}</span></div>
                  <div className="flex items-center justify-between text-sm"><span className="text-[var(--zoho-text-secondary)]">Total Quantity</span><span className="font-medium text-[var(--zoho-text)] tabular-nums">{totals.totalQty}</span></div>
                  <div className="flex items-center justify-between text-sm"><span className="text-[var(--zoho-text-secondary)]">Total Net Weight</span><span className="font-medium text-[var(--zoho-text)] tabular-nums">{totals.totalNet.toFixed(2)} kg</span></div>
                  <div className="flex items-center justify-between text-sm"><span className="text-[var(--zoho-text-secondary)]">Total Gross Weight</span><span className="font-medium text-[var(--zoho-text)] tabular-nums">{totals.totalGross.toFixed(2)} kg</span></div>
                  <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-300"><span className="font-bold text-[var(--zoho-text)]">Total CBM</span><span className="font-bold text-[var(--zoho-text)] tabular-nums">{totals.totalCbm.toFixed(4)} m{'\u00B3'}</span></div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg border border-[var(--zoho-border)] p-6">
          <FormField label="Remarks / Notes"><textarea value={form.remarks} onChange={(e) => updateForm('remarks', e.target.value)} rows={3} placeholder="Internal notes or remarks" className={`${inputClassName()} resize-none`} /></FormField>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 bg-[#0071DC] hover:bg-[#005BB5] text-white text-sm font-medium px-6 py-2.5 rounded-md transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer">
            {saving && <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>}
            {saving ? 'Saving...' : isEdit ? 'Update Packing List' : 'Save Packing List'}
          </button>
          <button type="button" onClick={handleCancel} disabled={saving} className="px-6 py-2.5 text-sm font-medium text-[var(--zoho-text)] bg-white border border-[var(--zoho-border)] rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 cursor-pointer">Cancel</button>
        </div>
      </div>
    </form>
  );
}
