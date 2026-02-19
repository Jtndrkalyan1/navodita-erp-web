import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { HiOutlineArrowLeft, HiOutlineCheckCircle, HiOutlineXCircle } from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { vendorApi } from '../../api/vendor.api';
import apiClient from '../../api/client';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges';
import { INDIAN_STATES, COUNTRIES, CURRENCIES, COUNTRY_CURRENCY_MAP, getStatesForCountry, getStateLabel, getPostalLabel } from '../../utils/countryStateData';

const VENDOR_TYPES = ['Business', 'Individual'];

const GST_TREATMENTS = [
  'Registered Business - Regular',
  'Registered Business - Composition',
  'Unregistered Business',
  'Consumer',
  'Overseas',
  'Special Economic Zone',
  'Deemed Export',
];

const PAYMENT_TERMS = [
  'Due on Receipt',
  'Net 15',
  'Net 30',
  'Net 45',
  'Net 60',
  'Net 90',
];

const BANK_ACCOUNT_TYPES = [
  'Savings',
  'Current',
  'Overdraft',
  'Cash Credit',
];

const INITIAL_FORM_DATA = {
  vendor_type: 'Business',
  salutation: '',
  first_name: '',
  last_name: '',
  display_name: '',
  company_name: '',
  trade_name: '',
  legal_name: '',
  taxpayer_type: '',
  gst_status: '',
  gst_registration_date: '',
  email: '',
  phone: '',
  mobile: '',
  website: '',
  gstin: '',
  pan: '',
  msme_number: '',
  business_number: '',
  country: 'India',
  place_of_supply: '',
  gst_treatment: '',
  tax_preference: 'Taxable',
  currency_code: 'INR',
  opening_balance: '',
  payment_terms: 'Net 30',
  credit_limit: '',
  bank_name: '',
  bank_account_number: '',
  bank_ifsc: '',
  bank_account_name: '',
  bank_account_type: '',
  notes: '',
};

const INITIAL_ADDRESS = {
  address_type: 'billing',
  attention: '',
  address_line1: '',
  address_line2: '',
  city: '',
  state: '',
  pincode: '',
  country: 'India',
  phone: '',
  is_default: true,
};

export default function VendorFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [billingAddress, setBillingAddress] = useState({ ...INITIAL_ADDRESS, address_type: 'billing' });
  const [shippingAddress, setShippingAddress] = useState({ ...INITIAL_ADDRESS, address_type: 'shipping', is_default: false });
  const [sameAsBilling, setSameAsBilling] = useState(true);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const { setIsDirty } = useUnsavedChanges();
  const [gstValidation, setGstValidation] = useState({ status: null, data: null, loading: false });

  // GST validation handler
  const handleValidateGST = async () => {
    const gstin = formData.gstin?.toUpperCase();
    if (!gstin || gstin.length !== 15) { toast.error('Please enter a valid 15-character GSTIN'); return; }
    setGstValidation({ status: null, data: null, loading: true });
    try {
      const res = await apiClient.post('/gst/validate', { gstin });
      const result = res.data?.data;
      if (result && result.valid) {
        setGstValidation({ status: 'valid', data: result, loading: false });
        toast.success('GST Number is Valid');
        if (result.legal_name && !formData.display_name) setFormData((prev) => ({ ...prev, display_name: result.legal_name }));
        if (result.legal_name && !formData.company_name) setFormData((prev) => ({ ...prev, company_name: result.legal_name }));
        if (result.state && !billingAddress.state) setBillingAddress((prev) => ({ ...prev, state: result.state }));
        if (result.address && !billingAddress.address_line1) setBillingAddress((prev) => ({ ...prev, address_line1: result.address }));
      } else {
        setGstValidation({ status: 'invalid', data: result, loading: false });
        toast.error('GST Number is Invalid');
      }
    } catch { setGstValidation({ status: 'invalid', data: null, loading: false }); toast.error('Failed to validate GST number'); }
  };

  // Update form with GST portal data
  const handleUpdateFormFromGST = () => {
    const d = gstValidation.data;
    if (!d) return;
    const updates = {};
    if (d.legal_name) { updates.legal_name = d.legal_name; if (!formData.company_name) updates.company_name = d.legal_name; if (!formData.display_name) updates.display_name = d.legal_name; }
    if (d.trade_name) { updates.trade_name = d.trade_name; }
    if (d.tax_type) updates.taxpayer_type = d.tax_type;
    if (d.status) updates.gst_status = d.status;
    if (d.registration_date) updates.gst_registration_date = d.registration_date;
    // Map GST treatment from taxpayer type
    if (d.tax_type) {
      if (d.tax_type.toLowerCase().includes('composition')) updates.gst_treatment = 'Registered Business - Composition';
      else if (d.tax_type.toLowerCase().includes('regular')) updates.gst_treatment = 'Registered Business - Regular';
      else if (d.tax_type.toLowerCase().includes('sez')) updates.gst_treatment = 'Special Economic Zone';
    }
    setFormData(prev => ({ ...prev, ...updates }));
    // Update billing address if available
    if (d.address) setBillingAddress(prev => ({ ...prev, address_line1: d.address }));
    if (d.state) { setBillingAddress(prev => ({ ...prev, state: d.state })); setFormData(prev => ({ ...prev, place_of_supply: d.state, ...updates })); }
    toast.success('Form updated from GST portal data!');
  };

  // Load existing vendor data for edit mode
  useEffect(() => {
    if (!isEdit) return;

    const fetchVendor = async () => {
      setLoading(true);
      try {
        const response = await vendorApi.getById(id);
        const vendor = response.data?.data;
        if (!vendor) {
          toast.error('Vendor not found');
          navigate('/vendors');
          return;
        }

        // Map vendor data to form fields
        setFormData({
          vendor_type: vendor.vendor_type || 'Business',
          salutation: vendor.salutation || '',
          first_name: vendor.first_name || '',
          last_name: vendor.last_name || '',
          display_name: vendor.display_name || '',
          company_name: vendor.company_name || '',
          trade_name: vendor.trade_name || '',
          legal_name: vendor.legal_name || '',
          taxpayer_type: vendor.taxpayer_type || '',
          gst_status: vendor.gst_status || '',
          gst_registration_date: vendor.gst_registration_date || '',
          email: vendor.email || '',
          phone: vendor.phone || '',
          mobile: vendor.mobile || '',
          website: vendor.website || '',
          gstin: vendor.gstin || '',
          pan: vendor.pan || '',
          msme_number: vendor.msme_number || '',
          business_number: vendor.business_number || '',
          place_of_supply: vendor.place_of_supply || '',
          gst_treatment: vendor.gst_treatment || '',
          tax_preference: vendor.tax_preference || 'Taxable',
          currency_code: vendor.currency_code || 'INR',
          opening_balance: vendor.opening_balance != null ? String(vendor.opening_balance) : '',
          payment_terms: vendor.payment_terms || 'Net 30',
          credit_limit: vendor.credit_limit != null ? String(vendor.credit_limit) : '',
          bank_name: vendor.bank_name || '',
          bank_account_number: vendor.bank_account_number || '',
          bank_ifsc: vendor.bank_ifsc || '',
          bank_account_name: vendor.bank_account_name || '',
          bank_account_type: vendor.bank_account_type || '',
          notes: vendor.notes || '',
        });

        // Load addresses
        const addresses = vendor.addresses || [];
        const billing = addresses.find((a) => a.address_type === 'billing') || { ...INITIAL_ADDRESS, address_type: 'billing' };
        const shipping = addresses.find((a) => a.address_type === 'shipping');

        setBillingAddress({
          address_type: 'billing',
          attention: billing.attention || '',
          address_line1: billing.address_line1 || '',
          address_line2: billing.address_line2 || '',
          city: billing.city || '',
          state: billing.state || '',
          pincode: billing.pincode || '',
          country: billing.country || 'India',
          phone: billing.phone || '',
          is_default: true,
        });

        if (shipping) {
          setSameAsBilling(false);
          setShippingAddress({
            address_type: 'shipping',
            attention: shipping.attention || '',
            address_line1: shipping.address_line1 || '',
            address_line2: shipping.address_line2 || '',
            city: shipping.city || '',
            state: shipping.state || '',
            pincode: shipping.pincode || '',
            country: shipping.country || 'India',
            phone: shipping.phone || '',
            is_default: false,
          });
        } else {
          setSameAsBilling(true);
        }
      } catch (err) {
        if (err.response?.status === 404) {
          toast.error('Vendor not found');
          navigate('/vendors');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchVendor();
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

    // Auto-switch currency when country changes
    if (name === 'country') {
      const mappedCurrency = COUNTRY_CURRENCY_MAP[value];
      if (mappedCurrency) {
        setFormData((prev) => ({ ...prev, currency_code: mappedCurrency }));
      }
    }

    // Auto-fill display name from first + last name if display_name is empty or matches old combo
    if (name === 'first_name' || name === 'last_name') {
      const first = name === 'first_name' ? value : formData.first_name;
      const last = name === 'last_name' ? value : formData.last_name;
      const combined = [first, last].filter(Boolean).join(' ');
      const oldCombined = [formData.first_name, formData.last_name].filter(Boolean).join(' ');

      if (!formData.display_name || formData.display_name === oldCombined) {
        setFormData((prev) => ({ ...prev, display_name: combined }));
      }
    }
  };

  const handleAddressChange = (type, e) => {
    const { name, value } = e.target;
    setIsDirty(true);
    if (type === 'billing') {
      setBillingAddress((prev) => {
        const updated = { ...prev, [name]: value };
        if (name === 'country') updated.state = '';
        return updated;
      });
    } else {
      setShippingAddress((prev) => {
        const updated = { ...prev, [name]: value };
        if (name === 'country') updated.state = '';
        return updated;
      });
    }
  };

  // Validation
  const validate = () => {
    const newErrors = {};

    if (!formData.display_name.trim()) {
      newErrors.display_name = 'Display name is required';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (formData.gstin && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(formData.gstin.toUpperCase())) {
      newErrors.gstin = 'Please enter a valid 15-character GSTIN';
    }

    if (formData.pan && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.pan.toUpperCase())) {
      newErrors.pan = 'Please enter a valid 10-character PAN';
    }

    if (formData.opening_balance && isNaN(Number(formData.opening_balance))) {
      newErrors.opening_balance = 'Must be a valid number';
    }

    if (formData.credit_limit && isNaN(Number(formData.credit_limit))) {
      newErrors.credit_limit = 'Must be a valid number';
    }

    if (formData.bank_ifsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.bank_ifsc.toUpperCase())) {
      newErrors.bank_ifsc = 'Please enter a valid 11-character IFSC code';
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
      // Build payload
      const payload = {
        ...formData,
        opening_balance: formData.opening_balance ? Number(formData.opening_balance) : 0,
        credit_limit: formData.credit_limit ? Number(formData.credit_limit) : null,
        gstin: formData.gstin ? formData.gstin.toUpperCase() : '',
        pan: formData.pan ? formData.pan.toUpperCase() : '',
        bank_ifsc: formData.bank_ifsc ? formData.bank_ifsc.toUpperCase() : '',
      };

      // Build addresses array
      const addresses = [billingAddress];
      if (!sameAsBilling) {
        addresses.push(shippingAddress);
      } else {
        // Copy billing address as shipping
        addresses.push({
          ...billingAddress,
          address_type: 'shipping',
          is_default: false,
        });
      }

      payload.addresses = addresses;

      if (isEdit) {
        await vendorApi.update(id, payload);
        toast.success('Vendor updated successfully');
        setIsDirty(false);
        navigate(`/vendors/${id}`);
      } else {
        const response = await vendorApi.create(payload);
        const newId = response.data?.data?.id;
        toast.success('Vendor created successfully');
        setIsDirty(false);
        navigate(newId ? `/vendors/${newId}` : '/vendors');
      }
    } catch (err) {
      // Error handled by apiClient interceptor for most cases
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
          <span className="text-sm text-[#6B7280]">Loading vendor...</span>
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
            {isEdit ? 'Edit Vendor' : 'New Vendor'}
          </h1>
          <p className="text-sm text-[#6B7280] mt-0.5">
            {isEdit ? 'Update vendor information' : 'Add a new vendor to your database'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Basic Info Section */}
        <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6 mb-6">
          <h2 className="text-base font-semibold text-[#333] mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Vendor Type */}
            <div>
              <label className="block text-sm font-medium text-[#333] mb-1">Vendor Type</label>
              <select
                name="vendor_type"
                value={formData.vendor_type}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] bg-white focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
              >
                {VENDOR_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Salutation */}
            <div>
              <label className="block text-sm font-medium text-[#333] mb-1">Salutation</label>
              <select
                name="salutation"
                value={formData.salutation}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] bg-white focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
              >
                <option value="">-- Select --</option>
                <option value="Mr.">Mr.</option>
                <option value="Mrs.">Mrs.</option>
                <option value="Ms.">Ms.</option>
                <option value="Dr.">Dr.</option>
              </select>
            </div>

            {/* First Name */}
            <div>
              <label className="block text-sm font-medium text-[#333] mb-1">First Name</label>
              <input
                type="text"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
                placeholder="First name"
              />
            </div>

            {/* Last Name */}
            <div>
              <label className="block text-sm font-medium text-[#333] mb-1">Last Name</label>
              <input
                type="text"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
                placeholder="Last name"
              />
            </div>

            {/* Display Name (required) */}
            <div>
              <label className="block text-sm font-medium text-[#333] mb-1">
                Display Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="display_name"
                value={formData.display_name}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC] ${
                  errors.display_name ? 'border-red-400 bg-red-50' : 'border-[#E5E7EB]'
                }`}
                placeholder="Display name (shown on bills)"
              />
              {errors.display_name && (
                <p className="text-xs text-red-500 mt-1">{errors.display_name}</p>
              )}
            </div>

            {/* Company Name */}
            <div>
              <label className="block text-sm font-medium text-[#333] mb-1">Company Name</label>
              <input
                type="text"
                name="company_name"
                value={formData.company_name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
                placeholder="Company name"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-[#333] mb-1">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC] ${
                  errors.email ? 'border-red-400 bg-red-50' : 'border-[#E5E7EB]'
                }`}
                placeholder="Email address"
              />
              {errors.email && (
                <p className="text-xs text-red-500 mt-1">{errors.email}</p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-[#333] mb-1">Phone</label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
                placeholder="Phone number"
              />
            </div>

            {/* Mobile */}
            <div>
              <label className="block text-sm font-medium text-[#333] mb-1">Mobile</label>
              <input
                type="text"
                name="mobile"
                value={formData.mobile}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
                placeholder="Mobile number"
              />
            </div>

            {/* Website */}
            <div>
              <label className="block text-sm font-medium text-[#333] mb-1">Website</label>
              <input
                type="text"
                name="website"
                value={formData.website}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
                placeholder="https://example.com"
              />
            </div>
          </div>
        </div>

        {/* Tax & GST Section */}
        <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6 mb-6">
          <h2 className="text-base font-semibold text-[#333] mb-4">Tax Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Country */}
            <div>
              <label className="block text-sm font-medium text-[#333] mb-1">Country</label>
              <select
                name="country"
                value={formData.country}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] bg-white focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
              >
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* GST Number for India / Business Number for overseas */}
            {formData.country === 'India' ? (
              <div>
                <label className="block text-sm font-medium text-[#333] mb-1">GST Number (GSTIN)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    name="gstin"
                    value={formData.gstin}
                    onChange={(e) => { handleChange(e); setGstValidation({ status: null, data: null, loading: false }); }}
                    maxLength={15}
                    className={`flex-1 px-3 py-2 border rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] uppercase focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC] ${
                      errors.gstin ? 'border-red-400 bg-red-50' : gstValidation.status === 'valid' ? 'border-green-400 bg-green-50' : gstValidation.status === 'invalid' ? 'border-red-400 bg-red-50' : 'border-[#E5E7EB]'
                    }`}
                    placeholder="e.g. 29ABCDE1234F1Z5"
                  />
                  <button
                    type="button"
                    onClick={handleValidateGST}
                    disabled={gstValidation.loading || !formData.gstin || formData.gstin.length < 15}
                    className="px-3 py-2 text-xs font-medium bg-[#0071DC] text-white rounded-lg hover:bg-[#005BB5] disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap cursor-pointer"
                  >
                    {gstValidation.loading ? 'Validating...' : 'Validate'}
                  </button>
                </div>
                {gstValidation.status === 'valid' && (
                  <div className="mt-1.5 bg-green-50 border border-green-200 rounded-md px-3 py-2">
                    <div className="flex items-center gap-1.5 mb-1">
                      <HiOutlineCheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                      <span className="text-xs text-green-700 font-semibold">
                        {gstValidation.data?.verified_online ? 'Verified Online ✓' : 'Format Valid (Offline)'}
                      </span>
                      {gstValidation.data?.status && gstValidation.data.status !== 'Format Valid (Online verification unavailable)' && (
                        <span className="text-xs text-green-600 bg-green-100 px-1.5 py-0.5 rounded">
                          {gstValidation.data.status}
                        </span>
                      )}
                    </div>
                    {(gstValidation.data?.legal_name || gstValidation.data?.trade_name) && (
                      <div className="text-xs text-gray-700 space-y-0.5">
                        {gstValidation.data.legal_name && (
                          <div><span className="font-medium text-gray-500">Legal Name:</span> {gstValidation.data.legal_name}</div>
                        )}
                        {gstValidation.data.trade_name && gstValidation.data.trade_name !== gstValidation.data.legal_name && (
                          <div><span className="font-medium text-gray-500">Trade Name:</span> {gstValidation.data.trade_name}</div>
                        )}
                        {gstValidation.data.address && (
                          <div><span className="font-medium text-gray-500">Address:</span> {gstValidation.data.address}</div>
                        )}
                        {gstValidation.data.state && (
                          <div><span className="font-medium text-gray-500">State:</span> {gstValidation.data.state}</div>
                        )}
                        {gstValidation.data.registration_date && (
                          <div><span className="font-medium text-gray-500">Registered:</span> {gstValidation.data.registration_date}</div>
                        )}
                        {gstValidation.data.business_type && (
                          <div><span className="font-medium text-gray-500">Type:</span> {gstValidation.data.business_type}</div>
                        )}
                        {gstValidation.data.nature_of_business && (
                          <div><span className="font-medium text-gray-500">Business Activity:</span> {gstValidation.data.nature_of_business}</div>
                        )}
                        {gstValidation.data.tax_type && (
                          <div><span className="font-medium text-gray-500">Tax Type:</span> {gstValidation.data.tax_type}</div>
                        )}
                      </div>
                    )}
                    {gstValidation.data?.verified_online && (gstValidation.data?.legal_name || gstValidation.data?.trade_name) && (
                      <button
                        type="button"
                        onClick={handleUpdateFormFromGST}
                        className="mt-2 w-full px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors cursor-pointer"
                      >
                        ↓ Update Form with GST Portal Data
                      </button>
                    )}
                    {!gstValidation.data?.legal_name && !gstValidation.data?.verified_online && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {gstValidation.data?.note || 'Online GST portal unavailable. Checksum validation passed.'}
                      </p>
                    )}
                  </div>
                )}
                {gstValidation.status === 'invalid' && (
                  <div className="flex items-center gap-1 mt-1">
                    <HiOutlineXCircle className="w-4 h-4 text-red-600" />
                    <span className="text-xs text-red-600 font-medium">Invalid GST Number</span>
                  </div>
                )}
                {errors.gstin && (
                  <p className="text-xs text-red-500 mt-1">{errors.gstin}</p>
                )}
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-[#333] mb-1">Business Number</label>
                <input
                  type="text"
                  name="business_number"
                  value={formData.business_number}
                  onChange={handleChange}
                  maxLength={30}
                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] uppercase focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
                  placeholder={formData.country === 'United States' ? 'EIN e.g. 12-3456789' : formData.country === 'Canada' ? 'BN e.g. 123456789' : 'Business Registration Number'}
                />
              </div>
            )}

            {/* PAN (only for India) */}
            {formData.country === 'India' && (
              <div>
                <label className="block text-sm font-medium text-[#333] mb-1">PAN</label>
                <input
                  type="text"
                  name="pan"
                  value={formData.pan}
                  onChange={handleChange}
                  maxLength={10}
                  className={`w-full px-3 py-2 border rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] uppercase focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC] ${
                    errors.pan ? 'border-red-400 bg-red-50' : 'border-[#E5E7EB]'
                  }`}
                  placeholder="e.g. ABCDE1234F"
                />
                {errors.pan && (
                  <p className="text-xs text-red-500 mt-1">{errors.pan}</p>
                )}
              </div>
            )}

            {/* Legal Name & Trade Name (from GST portal) */}
            {formData.country === 'India' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[#333] mb-1">Legal Name <span className="text-xs text-gray-400">(from GST)</span></label>
                  <input
                    type="text"
                    name="legal_name"
                    value={formData.legal_name}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
                    placeholder="As per GST portal"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#333] mb-1">Trade Name <span className="text-xs text-gray-400">(from GST)</span></label>
                  <input
                    type="text"
                    name="trade_name"
                    value={formData.trade_name}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
                    placeholder="Trade name if different"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#333] mb-1">Taxpayer Type</label>
                  <input
                    type="text"
                    name="taxpayer_type"
                    value={formData.taxpayer_type}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
                    placeholder="e.g. Regular, Composition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#333] mb-1">GST Status</label>
                  <input
                    type="text"
                    name="gst_status"
                    value={formData.gst_status}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
                    placeholder="e.g. Active"
                  />
                </div>
              </div>
            )}

            {/* MSME / Udyam Number */}
            <div>
              <label className="block text-sm font-medium text-[#333] mb-1">MSME / Udyam Number</label>
              <input
                type="text"
                name="msme_number"
                value={formData.msme_number}
                onChange={handleChange}
                maxLength={25}
                className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] uppercase focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
                placeholder="e.g. UDYAM-XX-00-0000000"
              />
            </div>

            {/* Place of Supply (India-specific GST concept) */}
            {formData.country === 'India' && (
              <div>
                <label className="block text-sm font-medium text-[#333] mb-1">Place of Supply (State)</label>
                <select
                  name="place_of_supply"
                  value={formData.place_of_supply}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] bg-white focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
                >
                  <option value="">-- Select State --</option>
                  {INDIAN_STATES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            )}

            {/* GST Treatment (India-specific) */}
            {formData.country === 'India' && (
              <div>
                <label className="block text-sm font-medium text-[#333] mb-1">GST Treatment</label>
                <select
                  name="gst_treatment"
                  value={formData.gst_treatment}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] bg-white focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
                >
                  <option value="">-- Select --</option>
                  {GST_TREATMENTS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Tax Preference */}
            <div>
              <label className="block text-sm font-medium text-[#333] mb-1">Tax Preference</label>
              <select
                name="tax_preference"
                value={formData.tax_preference}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] bg-white focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
              >
                <option value="Taxable">Taxable</option>
                <option value="Tax Exempt">Tax Exempt</option>
              </select>
            </div>
          </div>
        </div>

        {/* Billing Address Section */}
        <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6 mb-6">
          <h2 className="text-base font-semibold text-[#333] mb-4">Billing Address</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#333] mb-1">Attention</label>
              <input
                type="text"
                name="attention"
                value={billingAddress.attention}
                onChange={(e) => handleAddressChange('billing', e)}
                className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
                placeholder="Attention / Care of"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#333] mb-1">Phone</label>
              <input
                type="text"
                name="phone"
                value={billingAddress.phone}
                onChange={(e) => handleAddressChange('billing', e)}
                className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
                placeholder="Address phone"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-[#333] mb-1">Address Line 1</label>
              <input
                type="text"
                name="address_line1"
                value={billingAddress.address_line1}
                onChange={(e) => handleAddressChange('billing', e)}
                className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
                placeholder="Street address"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-[#333] mb-1">Address Line 2</label>
              <input
                type="text"
                name="address_line2"
                value={billingAddress.address_line2}
                onChange={(e) => handleAddressChange('billing', e)}
                className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
                placeholder="Apartment, suite, etc."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#333] mb-1">City</label>
              <input
                type="text"
                name="city"
                value={billingAddress.city}
                onChange={(e) => handleAddressChange('billing', e)}
                className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
                placeholder="City"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#333] mb-1">{getStateLabel(billingAddress.country)}</label>
              {getStatesForCountry(billingAddress.country).length > 0 ? (
                <select
                  name="state"
                  value={billingAddress.state}
                  onChange={(e) => handleAddressChange('billing', e)}
                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] bg-white focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
                >
                  <option value="">{`-- Select ${getStateLabel(billingAddress.country)} --`}</option>
                  {getStatesForCountry(billingAddress.country).map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  name="state"
                  value={billingAddress.state}
                  onChange={(e) => handleAddressChange('billing', e)}
                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
                  placeholder={getStateLabel(billingAddress.country)}
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-[#333] mb-1">{getPostalLabel(billingAddress.country)}</label>
              <input
                type="text"
                name="pincode"
                value={billingAddress.pincode}
                onChange={(e) => handleAddressChange('billing', e)}
                maxLength={billingAddress.country === 'India' ? 6 : 10}
                className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
                placeholder={getPostalLabel(billingAddress.country)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#333] mb-1">Country</label>
              <select
                name="country"
                value={billingAddress.country}
                onChange={(e) => handleAddressChange('billing', e)}
                className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] bg-white focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
              >
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Shipping Address Section */}
        <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-[#333]">Shipping Address</h2>
            <label className="flex items-center gap-2 text-sm text-[#6B7280] cursor-pointer">
              <input
                type="checkbox"
                checked={sameAsBilling}
                onChange={(e) => setSameAsBilling(e.target.checked)}
                className="w-4 h-4 rounded border-[#E5E7EB] text-[#0071DC] focus:ring-[#0071DC]/20"
              />
              Same as billing address
            </label>
          </div>

          {!sameAsBilling && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#333] mb-1">Attention</label>
                <input
                  type="text"
                  name="attention"
                  value={shippingAddress.attention}
                  onChange={(e) => handleAddressChange('shipping', e)}
                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
                  placeholder="Attention / Care of"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#333] mb-1">Phone</label>
                <input
                  type="text"
                  name="phone"
                  value={shippingAddress.phone}
                  onChange={(e) => handleAddressChange('shipping', e)}
                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
                  placeholder="Address phone"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-[#333] mb-1">Address Line 1</label>
                <input
                  type="text"
                  name="address_line1"
                  value={shippingAddress.address_line1}
                  onChange={(e) => handleAddressChange('shipping', e)}
                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
                  placeholder="Street address"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-[#333] mb-1">Address Line 2</label>
                <input
                  type="text"
                  name="address_line2"
                  value={shippingAddress.address_line2}
                  onChange={(e) => handleAddressChange('shipping', e)}
                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
                  placeholder="Apartment, suite, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#333] mb-1">City</label>
                <input
                  type="text"
                  name="city"
                  value={shippingAddress.city}
                  onChange={(e) => handleAddressChange('shipping', e)}
                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
                  placeholder="City"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#333] mb-1">{getStateLabel(shippingAddress.country)}</label>
                {getStatesForCountry(shippingAddress.country).length > 0 ? (
                  <select
                    name="state"
                    value={shippingAddress.state}
                    onChange={(e) => handleAddressChange('shipping', e)}
                    className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] bg-white focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
                  >
                    <option value="">{`-- Select ${getStateLabel(shippingAddress.country)} --`}</option>
                    {getStatesForCountry(shippingAddress.country).map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    name="state"
                    value={shippingAddress.state}
                    onChange={(e) => handleAddressChange('shipping', e)}
                    className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
                    placeholder={getStateLabel(shippingAddress.country)}
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[#333] mb-1">{getPostalLabel(shippingAddress.country)}</label>
                <input
                  type="text"
                  name="pincode"
                  value={shippingAddress.pincode}
                  onChange={(e) => handleAddressChange('shipping', e)}
                  maxLength={shippingAddress.country === 'India' ? 6 : 10}
                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
                  placeholder={getPostalLabel(shippingAddress.country)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#333] mb-1">Country</label>
                <select
                  name="country"
                  value={shippingAddress.country}
                  onChange={(e) => handleAddressChange('shipping', e)}
                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] bg-white focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
                >
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {sameAsBilling && (
            <p className="text-sm text-[#9CA3AF] italic">
              Shipping address will be the same as the billing address.
            </p>
          )}
        </div>

        {/* Financial Section */}
        <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6 mb-6">
          <h2 className="text-base font-semibold text-[#333] mb-4">Financial Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Currency Code */}
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

            {/* Payment Terms */}
            <div>
              <label className="block text-sm font-medium text-[#333] mb-1">Payment Terms</label>
              <select
                name="payment_terms"
                value={formData.payment_terms}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] bg-white focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
              >
                {PAYMENT_TERMS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Opening Balance */}
            <div>
              <label className="block text-sm font-medium text-[#333] mb-1">Opening Balance</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#6B7280]">
                  {formData.currency_code === 'INR' ? '\u20B9' : formData.currency_code === 'USD' ? '$' : formData.currency_code === 'EUR' ? '\u20AC' : '\u00A3'}
                </span>
                <input
                  type="text"
                  name="opening_balance"
                  value={formData.opening_balance}
                  onChange={handleChange}
                  className={`w-full pl-8 pr-3 py-2 border rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC] ${
                    errors.opening_balance ? 'border-red-400 bg-red-50' : 'border-[#E5E7EB]'
                  }`}
                  placeholder="0.00"
                />
              </div>
              {errors.opening_balance && (
                <p className="text-xs text-red-500 mt-1">{errors.opening_balance}</p>
              )}
            </div>

            {/* Credit Limit */}
            <div>
              <label className="block text-sm font-medium text-[#333] mb-1">Credit Limit</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#6B7280]">
                  {formData.currency_code === 'INR' ? '\u20B9' : formData.currency_code === 'USD' ? '$' : formData.currency_code === 'EUR' ? '\u20AC' : '\u00A3'}
                </span>
                <input
                  type="text"
                  name="credit_limit"
                  value={formData.credit_limit}
                  onChange={handleChange}
                  className={`w-full pl-8 pr-3 py-2 border rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC] ${
                    errors.credit_limit ? 'border-red-400 bg-red-50' : 'border-[#E5E7EB]'
                  }`}
                  placeholder="No limit"
                />
              </div>
              {errors.credit_limit && (
                <p className="text-xs text-red-500 mt-1">{errors.credit_limit}</p>
              )}
            </div>
          </div>
        </div>

        {/* Bank Details Section */}
        <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6 mb-6">
          <h2 className="text-base font-semibold text-[#333] mb-4">Bank Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Bank Name */}
            <div>
              <label className="block text-sm font-medium text-[#333] mb-1">Bank Name</label>
              <input
                type="text"
                name="bank_name"
                value={formData.bank_name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
                placeholder="e.g. State Bank of India"
              />
            </div>

            {/* Account Type */}
            <div>
              <label className="block text-sm font-medium text-[#333] mb-1">Account Type</label>
              <select
                name="bank_account_type"
                value={formData.bank_account_type}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] bg-white focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
              >
                <option value="">-- Select --</option>
                {BANK_ACCOUNT_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Account Number */}
            <div>
              <label className="block text-sm font-medium text-[#333] mb-1">Account Number</label>
              <input
                type="text"
                name="bank_account_number"
                value={formData.bank_account_number}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
                placeholder="Bank account number"
              />
            </div>

            {/* IFSC Code */}
            <div>
              <label className="block text-sm font-medium text-[#333] mb-1">IFSC Code</label>
              <input
                type="text"
                name="bank_ifsc"
                value={formData.bank_ifsc}
                onChange={handleChange}
                maxLength={11}
                className={`w-full px-3 py-2 border rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] uppercase focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC] ${
                  errors.bank_ifsc ? 'border-red-400 bg-red-50' : 'border-[#E5E7EB]'
                }`}
                placeholder="e.g. SBIN0001234"
              />
              {errors.bank_ifsc && (
                <p className="text-xs text-red-500 mt-1">{errors.bank_ifsc}</p>
              )}
            </div>

            {/* Account Holder Name */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-[#333] mb-1">Account Holder Name</label>
              <input
                type="text"
                name="bank_account_name"
                value={formData.bank_account_name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
                placeholder="Name as per bank records"
              />
            </div>
          </div>
        </div>

        {/* Notes Section */}
        <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6 mb-6">
          <h2 className="text-base font-semibold text-[#333] mb-4">Notes</h2>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC] resize-vertical"
            placeholder="Internal notes about this vendor..."
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
              : isEdit ? 'Update Vendor' : 'Create Vendor'}
          </button>
        </div>
      </form>
    </div>
  );
}
