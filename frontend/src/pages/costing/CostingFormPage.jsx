import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  HiOutlineArrowLeft,
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlineChartBar,
  HiOutlineMagnifyingGlass,
  HiOutlinePhoto,
  HiOutlineXMark,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import apiClient from '../../api/client';
import { costingApi } from '../../api/costing.api';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges';

// ── Helpers ─────────────────────────────────────────────────────

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

// ── Empty item templates ────────────────────────────────────────

const EMPTY_FABRIC = {
  fabric_name: '',
  width: '',
  gsm: '',
  consumption: '',
  rate: '',
  wastage_percent: '',
  amount: '',
};

const EMPTY_TRIM = {
  trim_name: '',
  consumption: '',
  rate: '',
  amount: '',
};

const EMPTY_PACKING = {
  item_name: '',
  quantity: '',
  rate: '',
  amount: '',
};

const EMPTY_OVERHEAD = {
  description: '',
  amount: '',
};

// ── Searchable Customer Dropdown ────────────────────────────────

function CustomerDropdown({ value, customers, onChange }) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  const selected = customers.find((c) => String(c.id) === String(value));

  const filtered = useMemo(() => {
    if (!search.trim()) return customers;
    const q = search.toLowerCase();
    return customers.filter(
      (c) =>
        (c.display_name || '').toLowerCase().includes(q) ||
        (c.company_name || '').toLowerCase().includes(q)
    );
  }, [customers, search]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-left bg-white focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC] truncate"
      >
        {selected
          ? selected.display_name || selected.company_name
          : '-- Select Customer (optional) --'}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 mt-1 w-full bg-white border border-[#E5E7EB] rounded-lg shadow-lg max-h-60 overflow-hidden">
            <div className="p-2 border-b border-[#E5E7EB]">
              <div className="relative">
                <HiOutlineMagnifyingGlass className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-7 pr-2 py-1.5 border border-[#E5E7EB] rounded text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-1 focus:ring-[#0071DC]/30"
                  placeholder="Search customers..."
                  autoFocus
                />
              </div>
            </div>
            <div className="overflow-y-auto max-h-48">
              <button
                type="button"
                onClick={() => {
                  onChange('');
                  setOpen(false);
                  setSearch('');
                }}
                className="w-full text-left px-3 py-2 text-sm text-[#9CA3AF] hover:bg-[#F3F4F6]"
              >
                -- None --
              </button>
              {filtered.length === 0 ? (
                <div className="px-3 py-4 text-sm text-[#9CA3AF] text-center">
                  No customers found
                </div>
              ) : (
                filtered.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      onChange(c.id);
                      setOpen(false);
                      setSearch('');
                    }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-[#F3F4F6] transition-colors ${
                      String(c.id) === String(value)
                        ? 'bg-blue-50 text-[#0071DC] font-medium'
                        : 'text-[#333]'
                    }`}
                  >
                    {c.display_name || c.company_name}
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────

export default function CostingFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const { setIsDirty } = useUnsavedChanges();

  // Form state
  const [formData, setFormData] = useState({
    sheet_number: '',
    style_name: '',
    customer_id: '',
    status: 'Draft',
    selling_price: '',
    remarks: '',
    image_url: '',
  });
  const [imagePreview, setImagePreview] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageInputRef = useRef(null);

  const [fabricItems, setFabricItems] = useState([{ ...EMPTY_FABRIC }]);
  const [trimItems, setTrimItems] = useState([{ ...EMPTY_TRIM }]);
  const [packingItems, setPackingItems] = useState([{ ...EMPTY_PACKING }]);
  const [overheadItems, setOverheadItems] = useState([{ ...EMPTY_OVERHEAD }]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  // ── Fetch customers ───────────────────────────────────────────

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const response = await apiClient.get('/customers', {
          params: { limit: 500 },
        });
        setCustomers(response.data?.data || []);
      } catch {
        setCustomers([]);
      }
    };
    fetchCustomers();
  }, []);

  // ── Fetch existing sheet for edit mode ────────────────────────

  useEffect(() => {
    if (!isEdit) return;
    const fetchSheet = async () => {
      setLoading(true);
      try {
        const response = await apiClient.get(`/costing-sheets/${id}`);
        const d = response.data?.data;
        if (!d) {
          toast.error('Costing sheet not found');
          navigate('/costing');
          return;
        }
        setFormData({
          sheet_number: d.sheet_number || '',
          style_name: d.style_name || '',
          customer_id: d.customer_id || '',
          status: d.status || 'Draft',
          selling_price: d.selling_price != null ? String(d.selling_price) : '',
          remarks: d.remarks || d.notes || '',
          image_url: d.image_url || '',
        });
        if (d.image_url) {
          setImagePreview(d.image_url);
        }

        // Fabric items
        if (d.fabric_items?.length) {
          setFabricItems(
            d.fabric_items.map((f) => ({
              fabric_name: f.fabric_name || f.name || '',
              width: f.width != null ? String(f.width) : '',
              gsm: f.gsm != null ? String(f.gsm) : '',
              consumption: f.consumption != null ? String(f.consumption) : '',
              rate: f.rate != null ? String(f.rate) : '',
              wastage_percent:
                f.wastage_percent != null ? String(f.wastage_percent) : '',
              amount: f.amount != null ? String(f.amount) : '',
            }))
          );
        }
        // Trim items
        if (d.trim_items?.length) {
          setTrimItems(
            d.trim_items.map((t) => ({
              trim_name: t.trim_name || t.name || '',
              consumption: t.consumption != null ? String(t.consumption) : '',
              rate: t.rate != null ? String(t.rate) : '',
              amount: t.amount != null ? String(t.amount) : '',
            }))
          );
        }
        // Packing items
        if (d.packing_items?.length) {
          setPackingItems(
            d.packing_items.map((p) => ({
              item_name: p.item_name || p.name || '',
              quantity: p.quantity != null ? String(p.quantity) : '',
              rate: p.rate != null ? String(p.rate) : '',
              amount: p.amount != null ? String(p.amount) : '',
            }))
          );
        }
        // Overhead items
        if (d.overhead_items?.length) {
          setOverheadItems(
            d.overhead_items.map((o) => ({
              description: o.description || '',
              amount: o.amount != null ? String(o.amount) : '',
            }))
          );
        }
      } catch (err) {
        if (err.response?.status === 404) {
          toast.error('Costing sheet not found');
          navigate('/costing');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchSheet();
  }, [id, isEdit, navigate]);

  // ── Form field handlers ───────────────────────────────────────

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setIsDirty(true);
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  // ── Fabric item change (auto-calc amount with wastage) ────────

  const handleFabricChange = (index, field, value) => {
    setIsDirty(true);
    setFabricItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };

      // Auto-calculate amount: consumption * rate * (1 + wastage/100)
      const consumption = parseFloat(
        field === 'consumption' ? value : updated[index].consumption
      ) || 0;
      const rate = parseFloat(
        field === 'rate' ? value : updated[index].rate
      ) || 0;
      const wastage = parseFloat(
        field === 'wastage_percent' ? value : updated[index].wastage_percent
      ) || 0;
      const amount = consumption * rate * (1 + wastage / 100);
      updated[index].amount = amount > 0 ? amount.toFixed(2) : '';

      return updated;
    });
  };

  // ── Trim item change (auto-calc) ──────────────────────────────

  const handleTrimChange = (index, field, value) => {
    setIsDirty(true);
    setTrimItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };

      const consumption = parseFloat(
        field === 'consumption' ? value : updated[index].consumption
      ) || 0;
      const rate = parseFloat(
        field === 'rate' ? value : updated[index].rate
      ) || 0;
      const amount = consumption * rate;
      updated[index].amount = amount > 0 ? amount.toFixed(2) : '';

      return updated;
    });
  };

  // ── Packing item change (auto-calc) ───────────────────────────

  const handlePackingChange = (index, field, value) => {
    setIsDirty(true);
    setPackingItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };

      const quantity = parseFloat(
        field === 'quantity' ? value : updated[index].quantity
      ) || 0;
      const rate = parseFloat(
        field === 'rate' ? value : updated[index].rate
      ) || 0;
      const amount = quantity * rate;
      updated[index].amount = amount > 0 ? amount.toFixed(2) : '';

      return updated;
    });
  };

  // ── Overhead item change ──────────────────────────────────────

  const handleOverheadChange = (index, field, value) => {
    setIsDirty(true);
    setOverheadItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // ── Image upload handler ─────────────────────────────────────

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload a valid image file (JPEG, PNG, GIF, WebP, or SVG)');
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image size must be less than 10MB');
      return;
    }

    // Show local preview
    const localPreview = URL.createObjectURL(file);
    setImagePreview(localPreview);
    setUploadingImage(true);

    try {
      const response = await costingApi.uploadImage(file);
      const imageUrl = response.data?.data?.image_url;
      if (imageUrl) {
        setFormData((prev) => ({ ...prev, image_url: imageUrl }));
        setImagePreview(imageUrl);
        toast.success('Image uploaded successfully');
      }
    } catch (err) {
      toast.error('Failed to upload image');
      setImagePreview(formData.image_url || '');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = () => {
    setFormData((prev) => ({ ...prev, image_url: '' }));
    setImagePreview('');
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  // ── Add / Remove helpers ──────────────────────────────────────

  const addFabric = () => setFabricItems((p) => [...p, { ...EMPTY_FABRIC }]);
  const removeFabric = (i) =>
    setFabricItems((p) => (p.length <= 1 ? p : p.filter((_, idx) => idx !== i)));

  const addTrim = () => setTrimItems((p) => [...p, { ...EMPTY_TRIM }]);
  const removeTrim = (i) =>
    setTrimItems((p) => (p.length <= 1 ? p : p.filter((_, idx) => idx !== i)));

  const addPacking = () => setPackingItems((p) => [...p, { ...EMPTY_PACKING }]);
  const removePacking = (i) =>
    setPackingItems((p) => (p.length <= 1 ? p : p.filter((_, idx) => idx !== i)));

  const addOverhead = () =>
    setOverheadItems((p) => [...p, { ...EMPTY_OVERHEAD }]);
  const removeOverhead = (i) =>
    setOverheadItems((p) =>
      p.length <= 1 ? p : p.filter((_, idx) => idx !== i)
    );

  // ── Totals ────────────────────────────────────────────────────

  const fabricTotal = fabricItems.reduce(
    (s, i) => s + (parseFloat(i.amount) || 0),
    0
  );
  const trimTotal = trimItems.reduce(
    (s, i) => s + (parseFloat(i.amount) || 0),
    0
  );
  const packingTotal = packingItems.reduce(
    (s, i) => s + (parseFloat(i.amount) || 0),
    0
  );
  const overheadTotal = overheadItems.reduce(
    (s, i) => s + (parseFloat(i.amount) || 0),
    0
  );
  const grandTotal = fabricTotal + trimTotal + packingTotal + overheadTotal;
  const sellingPrice = parseFloat(formData.selling_price) || 0;
  const marginPercent =
    sellingPrice > 0
      ? ((sellingPrice - grandTotal) / sellingPrice) * 100
      : 0;

  // ── Validation ────────────────────────────────────────────────

  const validate = () => {
    const newErrors = {};
    if (!formData.style_name.trim()) {
      newErrors.style_name = 'Style name is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ── Submit ────────────────────────────────────────────────────

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      toast.error('Please fix the validation errors');
      return;
    }

    setSaving(true);
    try {
      const cleanFabric = fabricItems
        .filter((i) => i.fabric_name.trim())
        .map((i) => ({
          fabric_name: i.fabric_name,
          width: parseFloat(i.width) || 0,
          gsm: parseFloat(i.gsm) || 0,
          consumption: parseFloat(i.consumption) || 0,
          rate: parseFloat(i.rate) || 0,
          wastage_percent: parseFloat(i.wastage_percent) || 0,
          amount: parseFloat(i.amount) || 0,
        }));

      const cleanTrims = trimItems
        .filter((i) => i.trim_name.trim())
        .map((i) => ({
          trim_name: i.trim_name,
          consumption: parseFloat(i.consumption) || 0,
          rate: parseFloat(i.rate) || 0,
          amount: parseFloat(i.amount) || 0,
        }));

      const cleanPacking = packingItems
        .filter((i) => i.item_name.trim())
        .map((i) => ({
          item_name: i.item_name,
          quantity: parseFloat(i.quantity) || 0,
          rate: parseFloat(i.rate) || 0,
          amount: parseFloat(i.amount) || 0,
        }));

      const cleanOverheads = overheadItems
        .filter((i) => i.description.trim() || parseFloat(i.amount) > 0)
        .map((i) => ({
          description: i.description,
          amount: parseFloat(i.amount) || 0,
        }));

      const payload = {
        sheet_number: formData.sheet_number || undefined,
        style_name: formData.style_name,
        customer_id: formData.customer_id || undefined,
        status: formData.status,
        selling_price: sellingPrice,
        remarks: formData.remarks || '',
        total_cost: grandTotal,
        margin_percent: marginPercent,
        image_url: formData.image_url || null,
        fabric_items: cleanFabric,
        trim_items: cleanTrims,
        packing_items: cleanPacking,
        overhead_items: cleanOverheads,
      };

      if (isEdit) {
        await apiClient.put(`/costing-sheets/${id}`, payload);
        toast.success('Costing sheet updated successfully');
        setIsDirty(false);
        navigate(`/costing/${id}`);
      } else {
        const response = await apiClient.post('/costing-sheets', payload);
        const newId = response.data?.data?.id;
        toast.success('Costing sheet created successfully');
        setIsDirty(false);
        navigate(newId ? `/costing/${newId}` : '/costing');
      }
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Failed to save costing sheet';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // ── Loading ───────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#0071DC] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-[#6B7280]">Loading costing sheet...</span>
        </div>
      </div>
    );
  }

  // ── Input class helpers ───────────────────────────────────────

  const inputClass =
    'w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]';
  const cellInputClass =
    'w-full px-2 py-1.5 border border-[#E5E7EB] rounded text-sm text-[#333] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]';
  const cellNumClass = `${cellInputClass} text-right`;
  const readonlyClass =
    'w-full px-2 py-1.5 border border-[#E5E7EB] rounded text-sm text-[#333] text-right bg-[#F9FAFB] focus:outline-none';

  // ── Render ────────────────────────────────────────────────────

  return (
    <div className="max-w-6xl pb-8">
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
            {isEdit ? 'Edit Costing Sheet' : 'New Costing Sheet'}
          </h1>
          <p className="text-sm text-[#6B7280] mt-0.5">
            {isEdit
              ? 'Update style costing details'
              : 'Create a new style costing sheet'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* ── Sheet Info Section ─────────────────────────────────── */}
        <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6 mb-6">
          <h2 className="text-base font-semibold text-[#333] mb-4">
            Sheet Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#333] mb-1">
                Sheet Number
              </label>
              <input
                type="text"
                name="sheet_number"
                value={formData.sheet_number}
                onChange={handleChange}
                className={inputClass}
                placeholder="Auto-generated if empty"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#333] mb-1">
                Style Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="style_name"
                value={formData.style_name}
                onChange={handleChange}
                className={`${inputClass} ${
                  errors.style_name ? 'border-red-400 bg-red-50' : ''
                }`}
                placeholder="e.g. Summer Cotton Dress"
              />
              {errors.style_name && (
                <p className="text-xs text-red-500 mt-1">{errors.style_name}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-[#333] mb-1">
                Customer
              </label>
              <CustomerDropdown
                value={formData.customer_id}
                customers={customers}
                onChange={(val) =>
                  setFormData((p) => ({ ...p, customer_id: val }))
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#333] mb-1">
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className={`${inputClass} bg-white`}
              >
                <option value="Draft">Draft</option>
                <option value="Approved">Approved</option>
                <option value="Revised">Revised</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#333] mb-1">
                Selling Price
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                name="selling_price"
                value={formData.selling_price}
                onChange={handleChange}
                className={`${inputClass} text-right`}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#333] mb-1">
                Remarks
              </label>
              <input
                type="text"
                name="remarks"
                value={formData.remarks}
                onChange={handleChange}
                className={inputClass}
                placeholder="Any remarks..."
              />
            </div>
          </div>

          {/* ── Style Image Upload ──────────────────────────────── */}
          <div className="mt-5 pt-5 border-t border-[#E5E7EB]">
            <label className="block text-sm font-medium text-[#333] mb-2">
              Style Image
            </label>
            <div className="flex items-start gap-4">
              {/* Image preview */}
              {imagePreview ? (
                <div className="relative group">
                  <img
                    src={imagePreview}
                    alt="Style preview"
                    className="w-32 h-32 object-cover rounded-lg border border-[#E5E7EB] shadow-sm"
                  />
                  {uploadingImage && (
                    <div className="absolute inset-0 bg-white/70 rounded-lg flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-[#0071DC] border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                    title="Remove image"
                  >
                    <HiOutlineXMark className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => imageInputRef.current?.click()}
                  className="w-32 h-32 border-2 border-dashed border-[#D1D5DB] rounded-lg flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:border-[#0071DC] hover:bg-blue-50/30 transition-colors"
                >
                  <HiOutlinePhoto className="w-8 h-8 text-[#9CA3AF]" />
                  <span className="text-xs text-[#9CA3AF]">Upload Image</span>
                </div>
              )}
              <div className="flex-1">
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[#0071DC] border border-[#0071DC] rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50"
                >
                  <HiOutlinePhoto className="w-4 h-4" />
                  {uploadingImage ? 'Uploading...' : imagePreview ? 'Change Image' : 'Choose Image'}
                </button>
                <p className="text-xs text-[#9CA3AF] mt-1.5">
                  Upload an image of the style/garment. Max 10MB. Supported: JPEG, PNG, GIF, WebP, SVG.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Fabric Items Section ──────────────────────────────── */}
        <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-[#333]">
              Fabric Items
            </h2>
            <button
              type="button"
              onClick={addFabric}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[#0071DC] border border-[#0071DC] rounded-lg hover:bg-blue-50 transition-colors"
            >
              <HiOutlinePlus className="w-4 h-4" />
              Add Fabric
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                  <th className="px-2 py-2.5 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                    Fabric Name
                  </th>
                  <th className="px-2 py-2.5 text-right text-xs font-semibold text-[#6B7280] uppercase tracking-wider w-20">
                    Width
                  </th>
                  <th className="px-2 py-2.5 text-right text-xs font-semibold text-[#6B7280] uppercase tracking-wider w-20">
                    GSM
                  </th>
                  <th className="px-2 py-2.5 text-right text-xs font-semibold text-[#6B7280] uppercase tracking-wider w-24">
                    Consumption
                  </th>
                  <th className="px-2 py-2.5 text-right text-xs font-semibold text-[#6B7280] uppercase tracking-wider w-24">
                    Rate
                  </th>
                  <th className="px-2 py-2.5 text-right text-xs font-semibold text-[#6B7280] uppercase tracking-wider w-20">
                    Wastage %
                  </th>
                  <th className="px-2 py-2.5 text-right text-xs font-semibold text-[#6B7280] uppercase tracking-wider w-28">
                    Amount
                  </th>
                  <th className="px-2 py-2.5 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {fabricItems.map((item, index) => (
                  <tr key={index} className="hover:bg-[#FAFBFC]">
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        value={item.fabric_name}
                        onChange={(e) =>
                          handleFabricChange(index, 'fabric_name', e.target.value)
                        }
                        className={cellInputClass}
                        placeholder="Fabric name"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        step="0.01"
                        value={item.width}
                        onChange={(e) =>
                          handleFabricChange(index, 'width', e.target.value)
                        }
                        className={cellNumClass}
                        placeholder="0"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        step="0.01"
                        value={item.gsm}
                        onChange={(e) =>
                          handleFabricChange(index, 'gsm', e.target.value)
                        }
                        className={cellNumClass}
                        placeholder="0"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        step="0.001"
                        value={item.consumption}
                        onChange={(e) =>
                          handleFabricChange(index, 'consumption', e.target.value)
                        }
                        className={cellNumClass}
                        placeholder="0.000"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        step="0.01"
                        value={item.rate}
                        onChange={(e) =>
                          handleFabricChange(index, 'rate', e.target.value)
                        }
                        className={cellNumClass}
                        placeholder="0.00"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        step="0.1"
                        value={item.wastage_percent}
                        onChange={(e) =>
                          handleFabricChange(
                            index,
                            'wastage_percent',
                            e.target.value
                          )
                        }
                        className={cellNumClass}
                        placeholder="0"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        value={item.amount}
                        readOnly
                        className={readonlyClass}
                      />
                    </td>
                    <td className="px-2 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => removeFabric(index)}
                        className="p-1 rounded hover:bg-red-50 text-[#9CA3AF] hover:text-red-600 transition-colors"
                      >
                        <HiOutlineTrash className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-[#E5E7EB] bg-[#F9FAFB]">
                  <td
                    colSpan={6}
                    className="px-2 py-2.5 text-right text-sm font-semibold text-[#333]"
                  >
                    Fabric Subtotal
                  </td>
                  <td className="px-2 py-2.5 text-right text-sm font-bold text-[#333] tabular-nums">
                    {formatIndianCurrency(fabricTotal)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* ── Trim Items Section ────────────────────────────────── */}
        <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-[#333]">Trim Items</h2>
            <button
              type="button"
              onClick={addTrim}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[#0071DC] border border-[#0071DC] rounded-lg hover:bg-blue-50 transition-colors"
            >
              <HiOutlinePlus className="w-4 h-4" />
              Add Trim
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider w-[35%]">
                    Trim Name
                  </th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold text-[#6B7280] uppercase tracking-wider w-[20%]">
                    Consumption
                  </th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold text-[#6B7280] uppercase tracking-wider w-[20%]">
                    Rate
                  </th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold text-[#6B7280] uppercase tracking-wider w-[20%]">
                    Amount
                  </th>
                  <th className="px-3 py-2.5 w-[5%]" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {trimItems.map((item, index) => (
                  <tr key={index} className="hover:bg-[#FAFBFC]">
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={item.trim_name}
                        onChange={(e) =>
                          handleTrimChange(index, 'trim_name', e.target.value)
                        }
                        className={cellInputClass}
                        placeholder="Trim name"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        step="0.001"
                        value={item.consumption}
                        onChange={(e) =>
                          handleTrimChange(index, 'consumption', e.target.value)
                        }
                        className={cellNumClass}
                        placeholder="0.000"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        step="0.01"
                        value={item.rate}
                        onChange={(e) =>
                          handleTrimChange(index, 'rate', e.target.value)
                        }
                        className={cellNumClass}
                        placeholder="0.00"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={item.amount}
                        readOnly
                        className={readonlyClass}
                      />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => removeTrim(index)}
                        className="p-1 rounded hover:bg-red-50 text-[#9CA3AF] hover:text-red-600 transition-colors"
                      >
                        <HiOutlineTrash className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-[#E5E7EB] bg-[#F9FAFB]">
                  <td
                    colSpan={3}
                    className="px-3 py-2.5 text-right text-sm font-semibold text-[#333]"
                  >
                    Trim Subtotal
                  </td>
                  <td className="px-3 py-2.5 text-right text-sm font-bold text-[#333] tabular-nums">
                    {formatIndianCurrency(trimTotal)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* ── Packing Items Section ─────────────────────────────── */}
        <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-[#333]">
              Packing Items
            </h2>
            <button
              type="button"
              onClick={addPacking}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[#0071DC] border border-[#0071DC] rounded-lg hover:bg-blue-50 transition-colors"
            >
              <HiOutlinePlus className="w-4 h-4" />
              Add Packing Item
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider w-[35%]">
                    Item Name
                  </th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold text-[#6B7280] uppercase tracking-wider w-[20%]">
                    Quantity
                  </th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold text-[#6B7280] uppercase tracking-wider w-[20%]">
                    Rate
                  </th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold text-[#6B7280] uppercase tracking-wider w-[20%]">
                    Amount
                  </th>
                  <th className="px-3 py-2.5 w-[5%]" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {packingItems.map((item, index) => (
                  <tr key={index} className="hover:bg-[#FAFBFC]">
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={item.item_name}
                        onChange={(e) =>
                          handlePackingChange(index, 'item_name', e.target.value)
                        }
                        className={cellInputClass}
                        placeholder="Item name"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        step="0.01"
                        value={item.quantity}
                        onChange={(e) =>
                          handlePackingChange(index, 'quantity', e.target.value)
                        }
                        className={cellNumClass}
                        placeholder="0"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        step="0.01"
                        value={item.rate}
                        onChange={(e) =>
                          handlePackingChange(index, 'rate', e.target.value)
                        }
                        className={cellNumClass}
                        placeholder="0.00"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={item.amount}
                        readOnly
                        className={readonlyClass}
                      />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => removePacking(index)}
                        className="p-1 rounded hover:bg-red-50 text-[#9CA3AF] hover:text-red-600 transition-colors"
                      >
                        <HiOutlineTrash className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-[#E5E7EB] bg-[#F9FAFB]">
                  <td
                    colSpan={3}
                    className="px-3 py-2.5 text-right text-sm font-semibold text-[#333]"
                  >
                    Packing Subtotal
                  </td>
                  <td className="px-3 py-2.5 text-right text-sm font-bold text-[#333] tabular-nums">
                    {formatIndianCurrency(packingTotal)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* ── Overheads Section ──────────────────────────────────── */}
        <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-[#333]">Overheads</h2>
            <button
              type="button"
              onClick={addOverhead}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[#0071DC] border border-[#0071DC] rounded-lg hover:bg-blue-50 transition-colors"
            >
              <HiOutlinePlus className="w-4 h-4" />
              Add Overhead
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider w-[70%]">
                    Description
                  </th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold text-[#6B7280] uppercase tracking-wider w-[25%]">
                    Amount
                  </th>
                  <th className="px-3 py-2.5 w-[5%]" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {overheadItems.map((item, index) => (
                  <tr key={index} className="hover:bg-[#FAFBFC]">
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) =>
                          handleOverheadChange(
                            index,
                            'description',
                            e.target.value
                          )
                        }
                        className={cellInputClass}
                        placeholder="e.g. CM Charges, Washing, Finishing"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        step="0.01"
                        value={item.amount}
                        onChange={(e) =>
                          handleOverheadChange(index, 'amount', e.target.value)
                        }
                        className={cellNumClass}
                        placeholder="0.00"
                      />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => removeOverhead(index)}
                        className="p-1 rounded hover:bg-red-50 text-[#9CA3AF] hover:text-red-600 transition-colors"
                      >
                        <HiOutlineTrash className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-[#E5E7EB] bg-[#F9FAFB]">
                  <td className="px-3 py-2.5 text-right text-sm font-semibold text-[#333]">
                    Overhead Subtotal
                  </td>
                  <td className="px-3 py-2.5 text-right text-sm font-bold text-[#333] tabular-nums">
                    {formatIndianCurrency(overheadTotal)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* ── Grand Total + Margin Card ─────────────────────────── */}
        <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <HiOutlineChartBar className="w-5 h-5 text-[#0071DC]" />
            <h2 className="text-base font-semibold text-[#333]">
              Cost Summary & Margin
            </h2>
          </div>

          {/* Section breakdown */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-[#F9FAFB] rounded-lg p-3">
              <p className="text-xs text-[#6B7280] font-medium uppercase tracking-wide">
                Fabric
              </p>
              <p className="text-sm font-semibold text-[#333] mt-1 tabular-nums">
                {formatIndianCurrency(fabricTotal)}
              </p>
            </div>
            <div className="bg-[#F9FAFB] rounded-lg p-3">
              <p className="text-xs text-[#6B7280] font-medium uppercase tracking-wide">
                Trims
              </p>
              <p className="text-sm font-semibold text-[#333] mt-1 tabular-nums">
                {formatIndianCurrency(trimTotal)}
              </p>
            </div>
            <div className="bg-[#F9FAFB] rounded-lg p-3">
              <p className="text-xs text-[#6B7280] font-medium uppercase tracking-wide">
                Packing
              </p>
              <p className="text-sm font-semibold text-[#333] mt-1 tabular-nums">
                {formatIndianCurrency(packingTotal)}
              </p>
            </div>
            <div className="bg-[#F9FAFB] rounded-lg p-3">
              <p className="text-xs text-[#6B7280] font-medium uppercase tracking-wide">
                Overheads
              </p>
              <p className="text-sm font-semibold text-[#333] mt-1 tabular-nums">
                {formatIndianCurrency(overheadTotal)}
              </p>
            </div>
          </div>

          {/* Grand total and margin */}
          <div className="border-t border-[#E5E7EB] pt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Grand total */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                <p className="text-xs text-[#0071DC] font-semibold uppercase tracking-wide">
                  Grand Total (Cost)
                </p>
                <p className="text-2xl font-bold text-[#333] mt-1 tabular-nums">
                  {formatIndianCurrency(grandTotal)}
                </p>
              </div>

              {/* Selling price */}
              <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                <p className="text-xs text-green-700 font-semibold uppercase tracking-wide">
                  Selling Price
                </p>
                <p className="text-2xl font-bold text-[#333] mt-1 tabular-nums">
                  {sellingPrice > 0
                    ? formatIndianCurrency(sellingPrice)
                    : '--'}
                </p>
              </div>

              {/* Margin */}
              <div
                className={`rounded-lg p-4 border ${
                  marginPercent >= 20
                    ? 'bg-green-50 border-green-100'
                    : marginPercent >= 10
                    ? 'bg-amber-50 border-amber-100'
                    : marginPercent > 0
                    ? 'bg-orange-50 border-orange-100'
                    : sellingPrice > 0
                    ? 'bg-red-50 border-red-100'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                  Margin
                </p>
                <p
                  className={`text-3xl font-bold mt-1 tabular-nums ${
                    marginPercent >= 20
                      ? 'text-green-600'
                      : marginPercent >= 10
                      ? 'text-amber-600'
                      : marginPercent > 0
                      ? 'text-orange-600'
                      : sellingPrice > 0
                      ? 'text-red-600'
                      : 'text-[#9CA3AF]'
                  }`}
                >
                  {sellingPrice > 0 ? `${marginPercent.toFixed(1)}%` : '--%'}
                </p>
                {sellingPrice > 0 && grandTotal > 0 && (
                  <p className="text-xs text-[#6B7280] mt-1 tabular-nums">
                    Profit: {formatIndianCurrency(sellingPrice - grandTotal)} per
                    unit
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Remarks ───────────────────────────────────────────── */}
        <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6 mb-6">
          <h2 className="text-base font-semibold text-[#333] mb-4">
            Additional Remarks
          </h2>
          <textarea
            name="remarks"
            value={formData.remarks}
            onChange={handleChange}
            rows={3}
            className={`${inputClass} resize-vertical`}
            placeholder="Any additional notes or remarks about this costing sheet..."
          />
        </div>

        {/* ── Form Actions ──────────────────────────────────────── */}
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
                : 'Creating...'
              : isEdit
              ? 'Update Costing Sheet'
              : 'Create Costing Sheet'}
          </button>
        </div>
      </form>
    </div>
  );
}
