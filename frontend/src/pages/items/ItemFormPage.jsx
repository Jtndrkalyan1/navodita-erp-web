import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { HiOutlineArrowLeft } from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { itemApi } from '../../api/item.api';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges';

const ITEM_TYPES = ['Goods', 'Service'];

const UNITS = [
  { value: 'nos', label: 'nos - Numbers' },
  { value: 'kg', label: 'kg - Kilograms' },
  { value: 'g', label: 'g - Grams' },
  { value: 'm', label: 'm - Meters' },
  { value: 'cm', label: 'cm - Centimeters' },
  { value: 'ft', label: 'ft - Feet' },
  { value: 'in', label: 'in - Inches' },
  { value: 'l', label: 'l - Litres' },
  { value: 'ml', label: 'ml - Millilitres' },
  { value: 'sqft', label: 'sqft - Square Feet' },
  { value: 'sqm', label: 'sqm - Square Meters' },
  { value: 'box', label: 'box - Boxes' },
  { value: 'pcs', label: 'pcs - Pieces' },
  { value: 'pair', label: 'pair - Pairs' },
  { value: 'dz', label: 'dz - Dozens' },
  { value: 'set', label: 'set - Sets' },
  { value: 'roll', label: 'roll - Rolls' },
  { value: 'bag', label: 'bag - Bags' },
  { value: 'bundle', label: 'bundle - Bundles' },
  { value: 'yard', label: 'yard - Yards' },
];

const GST_RATES = [
  { value: '0', label: '0% - Exempt' },
  { value: '5', label: '5%' },
  { value: '12', label: '12%' },
  { value: '18', label: '18%' },
  { value: '28', label: '28%' },
];

const INITIAL_FORM_DATA = {
  name: '',
  sku: '',
  item_type: 'Goods',
  unit: 'nos',
  hsn_code: '',
  description: '',
  selling_price: '',
  purchase_price: '',
  gst_rate: '18',
  cess_rate: '',
  opening_stock: '',
  reorder_level: '',
  preferred_vendor: '',
  notes: '',
};

export default function ItemFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const { setIsDirty } = useUnsavedChanges();

  // Load existing item data for edit mode
  useEffect(() => {
    if (!isEdit) return;

    const fetchItem = async () => {
      setLoading(true);
      try {
        const response = await itemApi.getById(id);
        const item = response.data?.data;
        if (!item) {
          toast.error('Item not found');
          navigate('/items');
          return;
        }

        setFormData({
          name: item.name || '',
          sku: item.sku || '',
          item_type: item.item_type || 'Goods',
          unit: item.unit || 'nos',
          hsn_code: item.hsn_code || '',
          description: item.description || '',
          selling_price: item.selling_price != null ? String(item.selling_price) : '',
          purchase_price: item.purchase_price != null ? String(item.purchase_price) : '',
          gst_rate: item.gst_rate != null ? String(item.gst_rate) : '18',
          cess_rate: item.cess_rate != null ? String(item.cess_rate) : '',
          opening_stock: item.opening_stock != null ? String(item.opening_stock) : '',
          reorder_level: item.reorder_level != null ? String(item.reorder_level) : '',
          preferred_vendor: item.preferred_vendor || '',
          notes: item.notes || '',
        });
      } catch (err) {
        if (err.response?.status === 404) {
          toast.error('Item not found');
          navigate('/items');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchItem();
  }, [id, isEdit, navigate]);

  // Form field change handler
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setIsDirty(true);

    // Clear validation error on change
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  // Validation
  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Item name is required';
    }

    if (formData.selling_price && isNaN(Number(formData.selling_price))) {
      newErrors.selling_price = 'Must be a valid number';
    }

    if (formData.purchase_price && isNaN(Number(formData.purchase_price))) {
      newErrors.purchase_price = 'Must be a valid number';
    }

    if (formData.cess_rate && isNaN(Number(formData.cess_rate))) {
      newErrors.cess_rate = 'Must be a valid number';
    }

    if (formData.opening_stock && isNaN(Number(formData.opening_stock))) {
      newErrors.opening_stock = 'Must be a valid number';
    }

    if (formData.reorder_level && isNaN(Number(formData.reorder_level))) {
      newErrors.reorder_level = 'Must be a valid number';
    }

    if (formData.hsn_code && !/^[0-9]{2,8}$/.test(formData.hsn_code.trim())) {
      newErrors.hsn_code = 'HSN code must be 2-8 digits';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit handler
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      toast.error('Please fix the validation errors before saving.');
      return;
    }

    setSaving(true);

    try {
      const payload = {
        name: formData.name.trim(),
        sku: formData.sku.trim() || undefined,
        item_type: formData.item_type,
        unit: formData.unit,
        hsn_code: formData.hsn_code.trim() || '',
        description: formData.description.trim() || '',
        selling_price: formData.selling_price ? Number(formData.selling_price) : 0,
        purchase_price: formData.purchase_price ? Number(formData.purchase_price) : 0,
        gst_rate: formData.gst_rate ? Number(formData.gst_rate) : 0,
        cess_rate: formData.cess_rate ? Number(formData.cess_rate) : 0,
        notes: formData.notes.trim() || '',
      };

      // Only include inventory fields for Goods
      if (formData.item_type === 'Goods') {
        payload.opening_stock = formData.opening_stock ? Number(formData.opening_stock) : 0;
        payload.reorder_level = formData.reorder_level ? Number(formData.reorder_level) : 0;
        payload.preferred_vendor = formData.preferred_vendor.trim() || '';
      }

      if (isEdit) {
        await itemApi.update(id, payload);
        toast.success('Item updated successfully');
        setIsDirty(false);
        navigate(`/items/${id}`);
      } else {
        const response = await itemApi.create(payload);
        const newId = response.data?.data?.id;
        toast.success('Item created successfully');
        setIsDirty(false);
        navigate(newId ? `/items/${newId}` : '/items');
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
          <span className="text-sm text-[#6B7280]">Loading item...</span>
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
            {isEdit ? 'Edit Item' : 'New Item'}
          </h1>
          <p className="text-sm text-[#6B7280] mt-0.5">
            {isEdit ? 'Update item information' : 'Add a new product or service'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Basic Information Section */}
        <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6 mb-6">
          <h2 className="text-base font-semibold text-[#333] mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Item Name (required) */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-[#333] mb-1">
                Item Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC] ${
                  errors.name ? 'border-red-400 bg-red-50' : 'border-[#E5E7EB]'
                }`}
                placeholder="Enter item name"
              />
              {errors.name && (
                <p className="text-xs text-red-500 mt-1">{errors.name}</p>
              )}
            </div>

            {/* SKU */}
            <div>
              <label className="block text-sm font-medium text-[#333] mb-1">SKU</label>
              <input
                type="text"
                name="sku"
                value={formData.sku}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
                placeholder="Auto-generated if empty"
              />
            </div>

            {/* Item Type */}
            <div>
              <label className="block text-sm font-medium text-[#333] mb-1">Item Type</label>
              <select
                name="item_type"
                value={formData.item_type}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] bg-white focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
              >
                {ITEM_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Unit */}
            <div>
              <label className="block text-sm font-medium text-[#333] mb-1">Unit</label>
              <select
                name="unit"
                value={formData.unit}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] bg-white focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
              >
                {UNITS.map((u) => (
                  <option key={u.value} value={u.value}>{u.label}</option>
                ))}
              </select>
            </div>

            {/* HSN Code */}
            <div>
              <label className="block text-sm font-medium text-[#333] mb-1">HSN / SAC Code</label>
              <input
                type="text"
                name="hsn_code"
                value={formData.hsn_code}
                onChange={handleChange}
                maxLength={8}
                className={`w-full px-3 py-2 border rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC] ${
                  errors.hsn_code ? 'border-red-400 bg-red-50' : 'border-[#E5E7EB]'
                }`}
                placeholder="e.g. 61091000"
              />
              {errors.hsn_code && (
                <p className="text-xs text-red-500 mt-1">{errors.hsn_code}</p>
              )}
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-[#333] mb-1">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC] resize-vertical"
                placeholder="Item description (shown on invoices)"
              />
            </div>
          </div>
        </div>

        {/* Pricing Section */}
        <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6 mb-6">
          <h2 className="text-base font-semibold text-[#333] mb-4">Pricing</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Selling Price */}
            <div>
              <label className="block text-sm font-medium text-[#333] mb-1">Selling Price</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#6B7280]">
                  {'\u20B9'}
                </span>
                <input
                  type="text"
                  name="selling_price"
                  value={formData.selling_price}
                  onChange={handleChange}
                  className={`w-full pl-8 pr-3 py-2 border rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC] ${
                    errors.selling_price ? 'border-red-400 bg-red-50' : 'border-[#E5E7EB]'
                  }`}
                  placeholder="0.00"
                />
              </div>
              {errors.selling_price && (
                <p className="text-xs text-red-500 mt-1">{errors.selling_price}</p>
              )}
            </div>

            {/* Purchase Price */}
            <div>
              <label className="block text-sm font-medium text-[#333] mb-1">Purchase Price</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#6B7280]">
                  {'\u20B9'}
                </span>
                <input
                  type="text"
                  name="purchase_price"
                  value={formData.purchase_price}
                  onChange={handleChange}
                  className={`w-full pl-8 pr-3 py-2 border rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC] ${
                    errors.purchase_price ? 'border-red-400 bg-red-50' : 'border-[#E5E7EB]'
                  }`}
                  placeholder="0.00"
                />
              </div>
              {errors.purchase_price && (
                <p className="text-xs text-red-500 mt-1">{errors.purchase_price}</p>
              )}
            </div>

            {/* GST Rate */}
            <div>
              <label className="block text-sm font-medium text-[#333] mb-1">GST Rate</label>
              <select
                name="gst_rate"
                value={formData.gst_rate}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] bg-white focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
              >
                {GST_RATES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            {/* Cess Rate */}
            <div>
              <label className="block text-sm font-medium text-[#333] mb-1">Cess Rate (%)</label>
              <input
                type="text"
                name="cess_rate"
                value={formData.cess_rate}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC] ${
                  errors.cess_rate ? 'border-red-400 bg-red-50' : 'border-[#E5E7EB]'
                }`}
                placeholder="0"
              />
              {errors.cess_rate && (
                <p className="text-xs text-red-500 mt-1">{errors.cess_rate}</p>
              )}
            </div>
          </div>
        </div>

        {/* Inventory Section (only for Goods) */}
        {formData.item_type === 'Goods' && (
          <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6 mb-6">
            <h2 className="text-base font-semibold text-[#333] mb-4">Inventory</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Opening Stock */}
              <div>
                <label className="block text-sm font-medium text-[#333] mb-1">Opening Stock</label>
                <input
                  type="text"
                  name="opening_stock"
                  value={formData.opening_stock}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC] ${
                    errors.opening_stock ? 'border-red-400 bg-red-50' : 'border-[#E5E7EB]'
                  }`}
                  placeholder="0"
                />
                {errors.opening_stock && (
                  <p className="text-xs text-red-500 mt-1">{errors.opening_stock}</p>
                )}
              </div>

              {/* Reorder Level */}
              <div>
                <label className="block text-sm font-medium text-[#333] mb-1">Reorder Level</label>
                <input
                  type="text"
                  name="reorder_level"
                  value={formData.reorder_level}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC] ${
                    errors.reorder_level ? 'border-red-400 bg-red-50' : 'border-[#E5E7EB]'
                  }`}
                  placeholder="Minimum stock level for alert"
                />
                {errors.reorder_level && (
                  <p className="text-xs text-red-500 mt-1">{errors.reorder_level}</p>
                )}
              </div>

              {/* Preferred Vendor */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-[#333] mb-1">Preferred Vendor</label>
                <input
                  type="text"
                  name="preferred_vendor"
                  value={formData.preferred_vendor}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
                  placeholder="Vendor name for this item"
                />
              </div>
            </div>
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
            placeholder="Internal notes about this item..."
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
              ? isEdit ? 'Updating...' : 'Creating...'
              : isEdit ? 'Update Item' : 'Create Item'}
          </button>
        </div>
      </form>
    </div>
  );
}
