import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { HiOutlineArrowLeft, HiOutlineCamera, HiOutlineUserCircle } from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { investorOrderApi } from '../../api/investorOrder.api';
import apiClient from '../../api/client';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges';
import LoadingSpinner from '../../components/feedback/LoadingSpinner';

const PARTNER_TYPES = ['Investment', 'Time'];

const INITIAL_FORM_DATA = {
  partner_name: '',
  partner_type: 'Investment',
  investment_amount: '',
  ratio: '',
  phone: '',
  email: '',
  address: '',
  pan: '',
  aadhar: '',
  bank_name: '',
  bank_account_number: '',
  bank_ifsc: '',
  notes: '',
};

export default function InvestorPartnerFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const { setIsDirty } = useUnsavedChanges();

  // Photo upload state
  const [photoUrl, setPhotoUrl] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef(null);

  // Load existing partner data for edit mode
  useEffect(() => {
    if (!isEdit) return;

    const fetchPartner = async () => {
      setLoading(true);
      try {
        const response = await investorOrderApi.getPartnerById(id);
        const partner = response.data?.data;
        if (!partner) {
          toast.error('Partner not found');
          navigate('/investor-orders/partners');
          return;
        }

        setFormData({
          partner_name: partner.partner_name || '',
          partner_type: partner.partner_type || 'Investment',
          investment_amount: partner.investment_amount != null ? String(partner.investment_amount) : '',
          ratio: partner.ratio != null ? String(partner.ratio) : '',
          phone: partner.phone || '',
          email: partner.email || '',
          address: partner.address || '',
          pan: partner.pan || '',
          aadhar: partner.aadhar || '',
          bank_name: partner.bank_name || '',
          bank_account_number: partner.bank_account_number || '',
          bank_ifsc: partner.bank_ifsc || '',
          notes: partner.notes || '',
        });
      } catch (err) {
        if (err.response?.status === 404) {
          toast.error('Partner not found');
          navigate('/investor-orders/partners');
        } else {
          toast.error('Failed to load partner');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchPartner();
  }, [id, isEdit, navigate]);

  // Fetch existing photo for edit mode
  useEffect(() => {
    if (!isEdit || !id) return;
    const fetchPhoto = async () => {
      try {
        const response = await apiClient.get('/documents', {
          params: { entity_type: 'investor_partner', entity_id: id, category: 'photo' },
        });
        const docs = response.data?.data || response.data || [];
        if (Array.isArray(docs) && docs.length > 0) {
          const latestDoc = docs[docs.length - 1];
          const url = latestDoc.file_url || latestDoc.url || latestDoc.file_path;
          if (url) setPhotoUrl(url);
        }
      } catch {
        // No photo yet, keep placeholder
      }
    };
    fetchPhoto();
  }, [isEdit, id]);

  // Handle photo file selection
  function handlePhotoSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file (JPG, PNG, etc.)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Photo must be smaller than 5MB');
      return;
    }
    setPhotoFile(file);
    setPhotoUrl(URL.createObjectURL(file));
    setIsDirty(true);
  }

  // Upload photo to documents API and update partner's photo_url
  async function uploadPhoto(partnerId) {
    if (!photoFile) return;
    try {
      setUploadingPhoto(true);
      const formDataUpload = new FormData();
      formDataUpload.append('file', photoFile);
      formDataUpload.append('entity_type', 'investor_partner');
      formDataUpload.append('entity_id', partnerId);
      formDataUpload.append('category', 'photo');

      const uploadRes = await apiClient.post('/documents', formDataUpload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // Update partner's photo_url with the uploaded file URL
      const fileUrl = uploadRes.data?.data?.file_url;
      if (fileUrl) {
        await investorOrderApi.updatePartner(partnerId, { photo_url: fileUrl });
      }
    } catch (err) {
      console.error('Photo upload failed:', err);
      toast.error('Partner saved but photo upload failed. You can upload it later.');
    } finally {
      setUploadingPhoto(false);
    }
  }

  function getInitials(name) {
    if (!name) return '';
    return name
      .split(' ')
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setIsDirty(true);
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  }

  function validate() {
    const newErrors = {};
    if (!formData.partner_name.trim()) {
      newErrors.partner_name = 'Partner name is required';
    }
    if (formData.ratio !== '') {
      const ratioVal = parseFloat(formData.ratio);
      if (isNaN(ratioVal) || ratioVal < 0 || ratioVal > 1) {
        newErrors.ratio = 'Ratio must be between 0 and 1';
      }
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email address';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      const payload = {
        ...formData,
        investment_amount: formData.investment_amount ? parseFloat(formData.investment_amount) : 0,
        ratio: formData.ratio ? parseFloat(formData.ratio) : 0,
      };

      if (isEdit) {
        await investorOrderApi.updatePartner(id, payload);
        if (photoFile) await uploadPhoto(id);
        toast.success('Partner updated successfully');
        setIsDirty(false);
        navigate(`/investor-orders/partners/${id}`);
      } else {
        const res = await investorOrderApi.createPartner(payload);
        const newId = res.data?.data?.id;
        if (photoFile && newId) await uploadPhoto(newId);
        toast.success('Partner created successfully');
        setIsDirty(false);
        navigate(newId ? `/investor-orders/partners/${newId}` : '/investor-orders/partners');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || `Failed to ${isEdit ? 'update' : 'create'} partner`);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="py-20">
        <LoadingSpinner size="lg" label="Loading partner..." />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="bg-white border-b border-[var(--zoho-border)] px-6 py-4 -mx-6 -mt-6 mb-6">
        <div className="flex items-center gap-3">
          <Link
            to={isEdit ? `/investor-orders/partners/${id}` : '/investor-orders/partners'}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors flex items-center gap-1"
          >
            <HiOutlineArrowLeft className="w-4 h-4" />
            Back
          </Link>
          <span className="text-gray-300">|</span>
          <h1 className="text-xl font-semibold text-[var(--zoho-text)]">
            {isEdit ? 'Edit Partner' : 'New Partner'}
          </h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-3xl">
        {/* Photo Upload */}
        <div className="bg-white rounded-lg border border-[var(--zoho-border)] p-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-5">
            Partner Photo
          </h2>
          <div className="flex items-center gap-6">
            {/* Circular avatar with camera overlay */}
            <div
              className="relative group cursor-pointer"
              onClick={() => photoInputRef.current?.click()}
              title="Click to upload photo"
            >
              <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border-2 border-gray-200 shadow-sm">
                {photoUrl ? (
                  <img src={photoUrl} alt="Partner" className="w-24 h-24 rounded-full object-cover" />
                ) : (
                  <span className="text-3xl font-bold text-gray-400">
                    {formData.partner_name ? (
                      getInitials(formData.partner_name)
                    ) : (
                      <HiOutlineUserCircle className="w-12 h-12 text-gray-400" />
                    )}
                  </span>
                )}
              </div>
              <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <HiOutlineCamera className="w-6 h-6 text-white" />
              </div>
            </div>

            {/* Upload button & info */}
            <div>
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <HiOutlineCamera className="w-4 h-4" />
                {photoUrl ? 'Change Photo' : 'Upload Photo'}
              </button>
              <p className="text-xs text-gray-400 mt-1.5">
                JPG, PNG up to 5MB. Photo will be saved after submitting the form.
              </p>
              {photoFile && (
                <p className="text-xs text-green-600 mt-1">
                  New photo selected: {photoFile.name}
                </p>
              )}
            </div>

            {/* Hidden file input */}
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoSelect}
            />
          </div>
        </div>

        {/* Basic Information */}
        <div className="bg-white rounded-lg border border-[var(--zoho-border)] p-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-5">
            Basic Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Partner Name */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Partner Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="partner_name"
                value={formData.partner_name}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none ${
                  errors.partner_name ? 'border-red-400' : 'border-gray-300'
                }`}
                placeholder="Enter partner name"
              />
              {errors.partner_name && (
                <p className="mt-1 text-xs text-red-500">{errors.partner_name}</p>
              )}
            </div>

            {/* Partner Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Partner Type</label>
              <select
                name="partner_type"
                value={formData.partner_type}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
              >
                {PARTNER_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* Investment Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Investment Amount
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                  {'\u20B9'}
                </span>
                <input
                  type="number"
                  name="investment_amount"
                  value={formData.investment_amount}
                  onChange={handleChange}
                  className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none tabular-nums"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                />
              </div>
            </div>

            {/* Ratio */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ratio
                <span className="text-xs text-gray-400 ml-1">
                  (0 to 1, e.g. 0.25 = 25%)
                </span>
              </label>
              <input
                type="number"
                name="ratio"
                value={formData.ratio}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none tabular-nums ${
                  errors.ratio ? 'border-red-400' : 'border-gray-300'
                }`}
                placeholder="0.25"
                step="0.01"
                min="0"
                max="1"
              />
              {formData.ratio && !errors.ratio && (
                <p className="mt-1 text-xs text-gray-500">
                  = {((parseFloat(formData.ratio) || 0) * 100).toFixed(1)}%
                </p>
              )}
              {errors.ratio && (
                <p className="mt-1 text-xs text-red-500">{errors.ratio}</p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="Phone number"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none ${
                  errors.email ? 'border-red-400' : 'border-gray-300'
                }`}
                placeholder="Email address"
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-500">{errors.email}</p>
              )}
            </div>

            {/* Address */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                placeholder="Full address"
              />
            </div>
          </div>
        </div>

        {/* Identity & Compliance */}
        <div className="bg-white rounded-lg border border-[var(--zoho-border)] p-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-5">
            Identity & Compliance
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* PAN */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">PAN</label>
              <input
                type="text"
                name="pan"
                value={formData.pan}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none uppercase"
                placeholder="ABCDE1234F"
                maxLength={10}
              />
            </div>

            {/* Aadhar */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Aadhar</label>
              <input
                type="text"
                name="aadhar"
                value={formData.aadhar}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="1234 5678 9012"
                maxLength={14}
              />
            </div>
          </div>
        </div>

        {/* Bank Details */}
        <div className="bg-white rounded-lg border border-[var(--zoho-border)] p-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-5">
            Bank Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Bank Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
              <input
                type="text"
                name="bank_name"
                value={formData.bank_name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="Bank name"
              />
            </div>

            {/* Bank IFSC */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bank IFSC</label>
              <input
                type="text"
                name="bank_ifsc"
                value={formData.bank_ifsc}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none uppercase"
                placeholder="SBIN0001234"
                maxLength={11}
              />
            </div>

            {/* Bank Account Number */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bank Account Number
              </label>
              <input
                type="text"
                name="bank_account_number"
                value={formData.bank_account_number}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="Account number"
              />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-lg border border-[var(--zoho-border)] p-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-5">
            Additional Notes
          </h2>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
            placeholder="Any additional notes about this partner..."
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pb-8">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-1.5 bg-[#0071DC] hover:bg-[#005BB5] text-white text-sm font-medium px-6 py-2.5 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : isEdit ? 'Update Partner' : 'Save Partner'}
          </button>
          <Link
            to={isEdit ? `/investor-orders/partners/${id}` : '/investor-orders/partners'}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-300 px-6 py-2.5 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
