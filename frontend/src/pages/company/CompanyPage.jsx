import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  HiOutlineBuildingOffice2,
  HiOutlineDocumentText,
  HiOutlineMapPin,
  HiOutlineBuildingStorefront,
  HiOutlineCog6Tooth,
  HiOutlineArrowPath,
  HiOutlineCheckCircle,
  HiOutlineInformationCircle,
  HiOutlineUserGroup,
  HiOutlineBanknotes,
  HiOutlineGlobeAlt,
  HiOutlineDocumentArrowDown,
  HiOutlineChevronDown,
  HiOutlineChevronUp,
  HiOutlinePlusCircle,
  HiOutlinePencilSquare,
  HiOutlineTrash,
  HiOutlinePhoto,
  HiOutlineXMark,
  HiOutlineSparkles,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import apiClient from '../../api/client';
import { useCompany } from '../../context/CompanyContext';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges';
import LoadingSpinner from '../../components/feedback/LoadingSpinner';

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
];

const MONTHS = [
  { value: 1, label: 'January' }, { value: 2, label: 'February' },
  { value: 3, label: 'March' }, { value: 4, label: 'April' },
  { value: 5, label: 'May' }, { value: 6, label: 'June' },
  { value: 7, label: 'July' }, { value: 8, label: 'August' },
  { value: 9, label: 'September' }, { value: 10, label: 'October' },
  { value: 11, label: 'November' }, { value: 12, label: 'December' },
];

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'JPY', 'CAD', 'AUD'];

const INITIAL_FORM = {
  company_name: '',
  legal_name: '',
  logo_path: '',
  phone: '',
  email: '',
  website: '',
  gstin: '',
  pan: '',
  tan: '',
  cin: '',
  lut_number: '',
  iec_code: '',
  msme_number: '',
  address_line1: '',
  address_line2: '',
  city: '',
  state: '',
  pincode: '',
  country: 'India',
  factory_address: '',
  factory_city: '',
  factory_state: '',
  factory_pincode: '',
  financial_year_start: 4,
  base_currency: 'INR',
  // About section
  established_year: '',
  tagline: '',
  about_us: '',
  mission: '',
  vision: '',
  goals: '',
  // Directors
  director1_name: '',
  director1_photo: '',
  director1_designation: '',
  director1_bio: '',
  director2_name: '',
  director2_photo: '',
  director2_designation: '',
  director2_bio: '',
  // Bank details
  bank_name: '',
  bank_account_number: '',
  bank_ifsc_code: '',
  bank_branch: '',
  // Departments (stored as JSON string)
  departments: '[]',
};

// ── Director Card Component ─────────────────────────────────────
function DirectorCard({ name, photo, designation, bio }) {
  if (!name) return null;
  return (
    <div className="bg-white rounded-lg border border-[#E5E7EB] p-5 flex flex-col items-center text-center">
      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center mb-3 overflow-hidden border-3 border-white shadow-lg">
        {photo ? (
          <img src={photo} alt={name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-3xl font-bold text-blue-600">{name.charAt(0).toUpperCase()}</span>
        )}
      </div>
      <h3 className="text-sm font-semibold text-[#333]">{name}</h3>
      {designation && <p className="text-xs text-[#0071DC] font-medium mt-0.5">{designation}</p>}
      {bio && <p className="text-xs text-[#6B7280] mt-2 leading-relaxed">{bio}</p>}
    </div>
  );
}

// ── Department Card Component ───────────────────────────────────
function DepartmentCard({ dept, onRemove, onEdit }) {
  return (
    <div className="bg-white rounded-lg border border-[#E5E7EB] overflow-hidden group relative">
      <div className="h-32 bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center overflow-hidden">
        {dept.photo ? (
          <img src={dept.photo} alt={dept.name} className="w-full h-full object-cover" />
        ) : (
          <HiOutlineUserGroup className="w-12 h-12 text-blue-300" />
        )}
      </div>
      <div className="p-3">
        <h4 className="text-sm font-semibold text-[#333]">{dept.name || 'Untitled Department'}</h4>
        {dept.description && (
          <p className="text-xs text-[#6B7280] mt-1 line-clamp-2">{dept.description}</p>
        )}
      </div>
      {/* Hover actions */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={onEdit}
          className="p-1 bg-white rounded shadow-sm text-[#6B7280] hover:text-[#0071DC] cursor-pointer"
        >
          <HiOutlinePencilSquare className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="p-1 bg-white rounded shadow-sm text-[#6B7280] hover:text-red-500 cursor-pointer"
        >
          <HiOutlineTrash className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ── Departments Section (Multiple department photos) ─────────────
function DepartmentsSection({ departments = [], onChange }) {
  const [editIdx, setEditIdx] = useState(null);
  const [deptForm, setDeptForm] = useState({ name: '', description: '', photo: '' });
  const deptPhotoRef = useRef(null);

  const handleDeptPhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      return;
    }
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('entity_type', 'company');
      formData.append('entity_id', 'department');
      formData.append('category', 'department_photo');

      const res = await apiClient.post('/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const fileUrl = res.data?.data?.file_url;
      if (fileUrl) {
        setDeptForm((p) => ({ ...p, photo: fileUrl }));
      }
    } catch {
      // Fallback to base64
      const reader = new FileReader();
      reader.onload = (ev) => {
        setDeptForm((p) => ({ ...p, photo: ev.target.result }));
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleAdd = () => {
    setEditIdx(-1); // -1 means new
    setDeptForm({ name: '', description: '', photo: '' });
  };

  const handleEdit = (idx) => {
    setEditIdx(idx);
    setDeptForm({ ...departments[idx] });
  };

  const handleSave = () => {
    if (!deptForm.name.trim()) {
      return;
    }
    const updated = [...departments];
    if (editIdx === -1) {
      updated.push({ ...deptForm, id: Date.now().toString() });
    } else {
      updated[editIdx] = { ...updated[editIdx], ...deptForm };
    }
    onChange(updated);
    setEditIdx(null);
    setDeptForm({ name: '', description: '', photo: '' });
  };

  const handleRemove = (idx) => {
    const updated = departments.filter((_, i) => i !== idx);
    onChange(updated);
  };

  const handleCancel = () => {
    setEditIdx(null);
    setDeptForm({ name: '', description: '', photo: '' });
  };

  return (
    <CollapsibleSection
      icon={HiOutlinePhoto}
      title="Department Photos"
      description="Upload photos for each department with name and description"
    >
      {/* Department cards grid */}
      {departments.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-4">
          {departments.map((dept, idx) => (
            <DepartmentCard
              key={dept.id || idx}
              dept={dept}
              onEdit={() => handleEdit(idx)}
              onRemove={() => handleRemove(idx)}
            />
          ))}
        </div>
      )}

      {/* Add / Edit Form */}
      {editIdx !== null ? (
        <div className="bg-gray-50 rounded-lg p-4 border border-[#E5E7EB]">
          <h4 className="text-sm font-semibold text-[#333] mb-3">
            {editIdx === -1 ? 'Add Department' : 'Edit Department'}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#333] mb-1.5">
                Department Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={deptForm.name}
                onChange={(e) => setDeptForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Production, Quality Control, Packaging"
                className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#333] mb-1.5">Photo</label>
              <div className="flex items-center gap-3">
                <div
                  className="w-16 h-16 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center overflow-hidden border-2 border-dashed border-[#E5E7EB] hover:border-[#0071DC] cursor-pointer transition-colors relative group"
                  onClick={() => deptPhotoRef.current?.click()}
                  title="Click to upload department photo"
                >
                  {deptForm.photo ? (
                    <>
                      <img src={deptForm.photo} alt="Dept" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <HiOutlinePhoto className="w-4 h-4 text-white" />
                      </div>
                    </>
                  ) : (
                    <HiOutlinePhoto className="w-5 h-5 text-[#9CA3AF]" />
                  )}
                </div>
                <div className="flex-1">
                  <button
                    type="button"
                    onClick={() => deptPhotoRef.current?.click()}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-[#333] bg-white border border-[#E5E7EB] rounded hover:bg-[#F9FAFB] transition-colors cursor-pointer"
                  >
                    <HiOutlinePhoto className="w-3 h-3" />
                    {deptForm.photo ? 'Change' : 'Upload'}
                  </button>
                  <input
                    type="text"
                    value={deptForm.photo}
                    onChange={(e) => setDeptForm((p) => ({ ...p, photo: e.target.value }))}
                    placeholder="Or paste URL..."
                    className="mt-1 w-full px-2 py-1 border border-[#E5E7EB] rounded text-xs text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-1 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
                  />
                </div>
              </div>
              <input
                ref={deptPhotoRef}
                type="file"
                accept="image/png,image/jpeg,image/gif,image/svg+xml,image/webp"
                className="hidden"
                onChange={handleDeptPhotoSelect}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-[#333] mb-1.5">Description</label>
              <textarea
                value={deptForm.description}
                onChange={(e) => setDeptForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Brief description of this department..."
                rows={2}
                className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC] resize-vertical"
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 mt-3">
            <button
              type="button"
              onClick={handleCancel}
              className="px-3 py-1.5 text-sm text-[#6B7280] bg-white border border-[#E5E7EB] rounded-lg hover:bg-gray-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!deptForm.name.trim()}
              className="px-3 py-1.5 text-sm text-white bg-[#0071DC] rounded-lg hover:bg-[#005BB5] disabled:opacity-50 cursor-pointer"
            >
              {editIdx === -1 ? 'Add Department' : 'Save Changes'}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-[#0071DC] bg-[#0071DC]/5 border border-dashed border-[#0071DC]/30 rounded-lg hover:bg-[#0071DC]/10 transition-colors cursor-pointer w-full justify-center"
        >
          <HiOutlinePlusCircle className="w-4 h-4" />
          Add Department Photo
        </button>
      )}
    </CollapsibleSection>
  );
}

// ── Print Profile Modal (Select sections to print) ──────────────
const PRINT_SECTIONS = [
  { id: 'company_info', label: 'Company Information', description: 'Name, contact, legal details' },
  { id: 'tax_registration', label: 'Tax Registration', description: 'GSTIN, PAN, TAN, CIN, MSME' },
  { id: 'head_office', label: 'Head Office Address', description: 'Primary business address' },
  { id: 'factory_address', label: 'Factory Address', description: 'Manufacturing location' },
  { id: 'financial_settings', label: 'Financial Settings', description: 'Fiscal year, currency' },
  { id: 'about_company', label: 'About Company', description: 'Mission, vision, goals' },
  { id: 'directors', label: 'Directors', description: 'Director profiles with photos' },
  { id: 'departments', label: 'Department Photos', description: 'Department-wise pictures' },
  { id: 'bank_details', label: 'Bank Details', description: 'Bank account information' },
];

function PrintProfileModal({ isOpen, onClose, form }) {
  const [selected, setSelected] = useState(
    PRINT_SECTIONS.reduce((acc, s) => ({ ...acc, [s.id]: true }), {})
  );

  if (!isOpen) return null;

  const toggleSection = (id) => {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleAll = (checked) => {
    setSelected(PRINT_SECTIONS.reduce((acc, s) => ({ ...acc, [s.id]: checked }), {}));
  };

  const allSelected = PRINT_SECTIONS.every((s) => selected[s.id]);

  const handlePrint = () => {
    // Build a printable HTML page with selected sections
    const sections = [];

    if (selected.company_info) {
      sections.push(`
        <div class="section">
          <h2>Company Information</h2>
          <table><tbody>
            <tr><td class="label">Company Name</td><td>${form.company_name || '-'}</td></tr>
            <tr><td class="label">Legal Name</td><td>${form.legal_name || '-'}</td></tr>
            <tr><td class="label">Phone</td><td>${form.phone || '-'}</td></tr>
            <tr><td class="label">Email</td><td>${form.email || '-'}</td></tr>
            <tr><td class="label">Website</td><td>${form.website || '-'}</td></tr>
          </tbody></table>
        </div>
      `);
    }

    if (selected.tax_registration) {
      sections.push(`
        <div class="section">
          <h2>Tax Registration</h2>
          <table><tbody>
            <tr><td class="label">GSTIN</td><td>${form.gstin || '-'}</td></tr>
            <tr><td class="label">PAN</td><td>${form.pan || '-'}</td></tr>
            <tr><td class="label">TAN</td><td>${form.tan || '-'}</td></tr>
            <tr><td class="label">CIN</td><td>${form.cin || '-'}</td></tr>
            <tr><td class="label">LUT Number</td><td>${form.lut_number || '-'}</td></tr>
            <tr><td class="label">IEC Code</td><td>${form.iec_code || '-'}</td></tr>
            <tr><td class="label">MSME / Udyam No.</td><td>${form.msme_number || '-'}</td></tr>
          </tbody></table>
        </div>
      `);
    }

    if (selected.head_office) {
      sections.push(`
        <div class="section">
          <h2>Head Office Address</h2>
          <p>${[form.address_line1, form.address_line2, form.city, form.state, form.pincode, form.country].filter(Boolean).join(', ') || '-'}</p>
        </div>
      `);
    }

    if (selected.factory_address && (form.factory_address || form.factory_city)) {
      sections.push(`
        <div class="section">
          <h2>Factory Address</h2>
          <p>${[form.factory_address, form.factory_city, form.factory_state, form.factory_pincode].filter(Boolean).join(', ') || '-'}</p>
        </div>
      `);
    }

    if (selected.financial_settings) {
      const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      sections.push(`
        <div class="section">
          <h2>Financial Settings</h2>
          <table><tbody>
            <tr><td class="label">Financial Year Starts</td><td>${monthNames[form.financial_year_start] || '-'}</td></tr>
            <tr><td class="label">Base Currency</td><td>${form.base_currency || 'INR'}</td></tr>
          </tbody></table>
        </div>
      `);
    }

    if (selected.about_company && (form.about_us || form.mission || form.vision)) {
      sections.push(`
        <div class="section">
          <h2>About Company</h2>
          ${form.established_year ? `<p><strong>Established:</strong> ${form.established_year}</p>` : ''}
          ${form.tagline ? `<p class="tagline">${form.tagline}</p>` : ''}
          ${form.about_us ? `<div class="subsection"><h3>About Us</h3><p>${form.about_us}</p></div>` : ''}
          ${form.mission ? `<div class="subsection"><h3>Mission</h3><p>${form.mission}</p></div>` : ''}
          ${form.vision ? `<div class="subsection"><h3>Vision</h3><p>${form.vision}</p></div>` : ''}
          ${form.goals ? `<div class="subsection"><h3>Goals</h3><p>${form.goals}</p></div>` : ''}
        </div>
      `);
    }

    if (selected.directors && (form.director1_name || form.director2_name)) {
      const dirCards = [
        form.director1_name ? `
          <div class="director-card">
            <div class="director-avatar">${form.director1_photo ? `<img src="${form.director1_photo}" alt="${form.director1_name}" />` : form.director1_name.charAt(0)}</div>
            <h3>${form.director1_name}</h3>
            ${form.director1_designation ? `<p class="designation">${form.director1_designation}</p>` : ''}
            ${form.director1_bio ? `<p class="bio">${form.director1_bio}</p>` : ''}
          </div>` : '',
        form.director2_name ? `
          <div class="director-card">
            <div class="director-avatar">${form.director2_photo ? `<img src="${form.director2_photo}" alt="${form.director2_name}" />` : form.director2_name.charAt(0)}</div>
            <h3>${form.director2_name}</h3>
            ${form.director2_designation ? `<p class="designation">${form.director2_designation}</p>` : ''}
            ${form.director2_bio ? `<p class="bio">${form.director2_bio}</p>` : ''}
          </div>` : '',
      ].filter(Boolean).join('');

      sections.push(`
        <div class="section">
          <h2>Directors</h2>
          <div class="directors-grid">${dirCards}</div>
        </div>
      `);
    }

    if (selected.departments) {
      try {
        const depts = JSON.parse(form.departments || '[]');
        if (depts.length > 0) {
          const deptCards = depts.map((d) => `
            <div class="dept-card">
              ${d.photo ? `<img src="${d.photo}" alt="${d.name}" class="dept-photo" />` : '<div class="dept-photo-placeholder"></div>'}
              <h4>${d.name}</h4>
              ${d.description ? `<p>${d.description}</p>` : ''}
            </div>
          `).join('');
          sections.push(`
            <div class="section">
              <h2>Departments</h2>
              <div class="dept-grid">${deptCards}</div>
            </div>
          `);
        }
      } catch { /* ignore */ }
    }

    if (selected.bank_details && form.bank_name) {
      sections.push(`
        <div class="section">
          <h2>Bank Details</h2>
          <table><tbody>
            <tr><td class="label">Bank Name</td><td>${form.bank_name || '-'}</td></tr>
            <tr><td class="label">Account Number</td><td>${form.bank_account_number || '-'}</td></tr>
            <tr><td class="label">IFSC Code</td><td>${form.bank_ifsc_code || '-'}</td></tr>
            <tr><td class="label">Branch</td><td>${form.bank_branch || '-'}</td></tr>
          </tbody></table>
        </div>
      `);
    }

    const printHTML = `<!DOCTYPE html>
<html><head><meta charset="utf-8" /><title>${form.company_name || 'Company'} - Profile</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px 30px; color: #333; }
  .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #0071DC; padding-bottom: 20px; }
  .header h1 { font-size: 24px; margin: 0 0 4px 0; color: #0071DC; }
  .header .tagline { color: #666; font-size: 14px; margin: 0; }
  .section { margin-bottom: 24px; }
  .section h2 { font-size: 16px; color: #0071DC; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; margin: 0 0 12px 0; }
  .section h3 { font-size: 13px; color: #333; margin: 12px 0 4px 0; }
  .subsection { margin-bottom: 10px; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 6px 12px; font-size: 13px; border-bottom: 1px solid #f3f4f6; }
  td.label { font-weight: 600; width: 180px; color: #6b7280; }
  .tagline { font-style: italic; color: #6b7280; font-size: 13px; margin-bottom: 10px; }
  p { font-size: 13px; line-height: 1.6; margin: 4px 0; }
  .directors-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
  .director-card { text-align: center; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; }
  .director-card h3 { margin: 8px 0 2px; font-size: 14px; }
  .director-card .designation { color: #0071DC; font-size: 12px; font-weight: 500; }
  .director-card .bio { color: #6b7280; font-size: 12px; margin-top: 6px; }
  .director-avatar { width: 70px; height: 70px; border-radius: 50%; background: linear-gradient(135deg, #dbeafe, #e0e7ff); display: flex; align-items: center; justify-content: center; margin: 0 auto 8px; font-size: 28px; font-weight: bold; color: #2563eb; overflow: hidden; }
  .director-avatar img { width: 100%; height: 100%; object-fit: cover; }
  .dept-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
  .dept-card { border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
  .dept-card h4 { padding: 8px 10px 2px; font-size: 13px; margin: 0; }
  .dept-card p { padding: 0 10px 8px; font-size: 11px; color: #6b7280; margin: 0; }
  .dept-photo { width: 100%; height: 80px; object-fit: cover; }
  .dept-photo-placeholder { width: 100%; height: 80px; background: linear-gradient(135deg, #eff6ff, #e0e7ff); }
  @media print { body { padding: 10px; } }
</style></head><body>
<div class="header">
  <h1>${form.company_name || 'Company Profile'}</h1>
  ${form.tagline ? `<p class="tagline">${form.tagline}</p>` : ''}
</div>
${sections.join('')}
<div style="text-align:center;margin-top:30px;padding-top:15px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;">
  Generated on ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
</div>
</body></html>`;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(printHTML);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
    onClose();
  };

  const selectedCount = PRINT_SECTIONS.filter((s) => selected[s.id]).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 animate-[scaleIn_0.15s_ease-out]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#0071DC]/10 flex items-center justify-center">
              <HiOutlineDocumentArrowDown className="w-5 h-5 text-[#0071DC]" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[#333]">Print Company Profile</h3>
              <p className="text-xs text-[#6B7280]">Select sections to include</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded text-[#6B7280] hover:text-[#333] hover:bg-gray-100 cursor-pointer">
            <HiOutlineXMark className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          {/* Select all */}
          <label className="flex items-center gap-3 px-3 py-2 mb-2 rounded-lg hover:bg-gray-50 cursor-pointer border-b border-[#E5E7EB]">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={(e) => toggleAll(e.target.checked)}
              className="w-4 h-4 rounded border-[#E5E7EB] text-[#0071DC] focus:ring-[#0071DC]/20"
            />
            <span className="text-sm font-semibold text-[#333]">Select All</span>
          </label>

          <div className="space-y-0.5 max-h-[320px] overflow-y-auto">
            {PRINT_SECTIONS.map((section) => (
              <label
                key={section.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selected[section.id]}
                  onChange={() => toggleSection(section.id)}
                  className="w-4 h-4 rounded border-[#E5E7EB] text-[#0071DC] focus:ring-[#0071DC]/20"
                />
                <div>
                  <p className="text-sm font-medium text-[#333]">{section.label}</p>
                  <p className="text-xs text-[#9CA3AF]">{section.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-[#E5E7EB] bg-gray-50 rounded-b-lg">
          <span className="text-xs text-[#6B7280]">{selectedCount} of {PRINT_SECTIONS.length} sections selected</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-[#333] bg-white border border-[#E5E7EB] rounded-lg hover:bg-gray-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handlePrint}
              disabled={selectedCount === 0}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#0071DC] rounded-lg hover:bg-[#005BB5] disabled:opacity-50 cursor-pointer"
            >
              <HiOutlineDocumentArrowDown className="w-4 h-4" />
              Print / PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ icon: Icon, title, description }) {
  return (
    <div className="flex items-center gap-3 mb-5 pb-3 border-b border-[#E5E7EB]">
      <div className="w-9 h-9 rounded-lg bg-[#0071DC]/10 flex items-center justify-center">
        <Icon className="w-5 h-5 text-[#0071DC]" />
      </div>
      <div>
        <h2 className="text-base font-semibold text-[#333]">{title}</h2>
        {description && <p className="text-xs text-[#6B7280] mt-0.5">{description}</p>}
      </div>
    </div>
  );
}

function FormInput({ label, name, value, onChange, type = 'text', placeholder, required, maxLength, disabled, className = '' }) {
  return (
    <div className={className}>
      <label htmlFor={name} className="block text-sm font-medium text-[#333] mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        value={value || ''}
        onChange={onChange}
        placeholder={placeholder}
        maxLength={maxLength}
        disabled={disabled}
        className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC] disabled:bg-gray-50 disabled:text-[#6B7280] transition-colors"
      />
    </div>
  );
}

function FormSelect({ label, name, value, onChange, options, required, className = '' }) {
  return (
    <div className={className}>
      <label htmlFor={name} className="block text-sm font-medium text-[#333] mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <select
        id={name}
        name={name}
        value={value || ''}
        onChange={onChange}
        className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC] bg-white transition-colors"
      >
        <option value="">Select...</option>
        {options.map((opt) =>
          typeof opt === 'object' ? (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ) : (
            <option key={opt} value={opt}>{opt}</option>
          )
        )}
      </select>
    </div>
  );
}

function FormTextarea({ label, name, value, onChange, placeholder, rows = 3, className = '' }) {
  return (
    <div className={className}>
      <label htmlFor={name} className="block text-sm font-medium text-[#333] mb-1.5">
        {label}
      </label>
      <textarea
        id={name}
        name={name}
        value={value || ''}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC] transition-colors resize-vertical"
      />
    </div>
  );
}

function CollapsibleSection({ icon: Icon, title, description, children, defaultOpen = false }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-lg border border-[#E5E7EB]">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-6 cursor-pointer hover:bg-gray-50/50 transition-colors rounded-lg"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#0071DC]/10 flex items-center justify-center">
            <Icon className="w-5 h-5 text-[#0071DC]" />
          </div>
          <div className="text-left">
            <h2 className="text-base font-semibold text-[#333]">{title}</h2>
            {description && <p className="text-xs text-[#6B7280] mt-0.5">{description}</p>}
          </div>
        </div>
        {isOpen ? (
          <HiOutlineChevronUp className="w-5 h-5 text-[#6B7280]" />
        ) : (
          <HiOutlineChevronDown className="w-5 h-5 text-[#6B7280]" />
        )}
      </button>
      {isOpen && (
        <div className="px-6 pb-6 pt-0">
          <div className="border-t border-[#E5E7EB] pt-5">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Image Upload Area Component ────────────────────────────────
// ── Background Removal Utility ────────────────────────────────
function removeBackground(imageUrl, tolerance = 30) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Sample corners to detect background color
      const corners = [
        0, // top-left
        (canvas.width - 1) * 4, // top-right
        (canvas.height - 1) * canvas.width * 4, // bottom-left
        ((canvas.height - 1) * canvas.width + (canvas.width - 1)) * 4, // bottom-right
      ];

      let bgR = 0, bgG = 0, bgB = 0, count = 0;
      corners.forEach(i => {
        if (i < data.length - 3) {
          bgR += data[i];
          bgG += data[i + 1];
          bgB += data[i + 2];
          count++;
        }
      });
      if (count > 0) {
        bgR = Math.round(bgR / count);
        bgG = Math.round(bgG / count);
        bgB = Math.round(bgB / count);
      }

      // Make matching pixels transparent
      for (let i = 0; i < data.length; i += 4) {
        const dr = Math.abs(data[i] - bgR);
        const dg = Math.abs(data[i + 1] - bgG);
        const db = Math.abs(data[i + 2] - bgB);
        const distance = Math.sqrt(dr * dr + dg * dg + db * db);
        if (distance < tolerance) {
          data[i + 3] = 0; // Set alpha to 0 (transparent)
        } else if (distance < tolerance * 1.5) {
          // Soft edge: partial transparency
          const alpha = Math.round(((distance - tolerance) / (tolerance * 0.5)) * 255);
          data[i + 3] = Math.min(data[i + 3], alpha);
        }
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageUrl;
  });
}

function ImageUploadArea({ currentUrl, onFileSelect, onUrlChange, onClear, inputRef, label, shape = 'square', size = 'md', objectFit = 'cover', showRemoveBg = false, onBgRemoved }) {
  const [removingBg, setRemovingBg] = useState(false);
  const sizeClasses = size === 'lg' ? 'w-32 h-32' : size === 'md' ? 'w-24 h-24' : 'w-20 h-20';
  const shapeClass = shape === 'circle' ? 'rounded-full' : 'rounded-lg';
  const isDataUrl = currentUrl && currentUrl.startsWith('data:');
  const isUploadedFile = currentUrl && currentUrl.startsWith('/uploads/');

  const handleRemoveBg = async () => {
    if (!currentUrl) return;
    setRemovingBg(true);
    try {
      const result = await removeBackground(currentUrl);
      if (onBgRemoved) {
        onBgRemoved(result);
      }
      toast.success('Background removed! Save to apply.');
    } catch (err) {
      toast.error('Failed to remove background. Try a different image.');
    } finally {
      setRemovingBg(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <div
        className={`${sizeClasses} ${shapeClass} flex items-center justify-center overflow-hidden border-2 border-dashed border-[#E5E7EB] hover:border-[#0071DC] cursor-pointer transition-colors relative group`}
        style={{ background: currentUrl ? 'repeating-conic-gradient(#e5e7eb 0% 25%, transparent 0% 50%) 50% / 16px 16px' : undefined }}
        onClick={() => inputRef.current?.click()}
        title={`Click to upload ${label}`}
      >
        {!currentUrl && (
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50" />
        )}
        {currentUrl ? (
          <>
            <img src={currentUrl} alt={label} className={`w-full h-full ${objectFit === 'contain' ? 'object-contain p-1' : 'object-cover'}`} onError={(e) => { e.target.style.display = 'none'; }} />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <HiOutlinePhoto className="w-6 h-6 text-white" />
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-1 text-[#9CA3AF] relative z-10">
            <HiOutlinePhoto className="w-6 h-6" />
            <span className="text-[10px] font-medium">Upload</span>
          </div>
        )}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#333] bg-white border border-[#E5E7EB] rounded-lg hover:bg-[#F9FAFB] transition-colors cursor-pointer"
          >
            <HiOutlinePhoto className="w-3.5 h-3.5" />
            {currentUrl ? 'Change Image' : 'Upload Image'}
          </button>
          {showRemoveBg && currentUrl && (
            <button
              type="button"
              onClick={handleRemoveBg}
              disabled={removingBg}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors cursor-pointer disabled:opacity-50"
              title="Remove background from image"
            >
              {removingBg ? (
                <>
                  <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  <HiOutlineSparkles className="w-3.5 h-3.5" />
                  Remove BG
                </>
              )}
            </button>
          )}
          {currentUrl && onClear && (
            <button
              type="button"
              onClick={onClear}
              className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
            >
              <HiOutlineXMark className="w-3.5 h-3.5" />
              Remove
            </button>
          )}
        </div>
        <p className="text-[10px] text-[#9CA3AF] mt-1">JPG, PNG, GIF, SVG up to 5MB</p>
        {currentUrl && (isDataUrl || isUploadedFile) ? (
          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-green-600">
            <HiOutlineCheckCircle className="w-3.5 h-3.5" />
            <span>{isUploadedFile ? 'Image uploaded to server' : 'Image loaded (save to apply)'}</span>
          </div>
        ) : onUrlChange ? (
          <input
            type="text"
            value={currentUrl || ''}
            onChange={onUrlChange}
            placeholder="Or paste image URL..."
            className="mt-1.5 w-full px-2 py-1 border border-[#E5E7EB] rounded text-xs text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-1 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
          />
        ) : null}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/svg+xml,image/webp"
        className="hidden"
        onChange={onFileSelect}
      />
    </div>
  );
}

export default function CompanyPage() {
  const { refreshCompanyProfile } = useCompany();
  const { setIsDirty } = useUnsavedChanges();
  const [form, setForm] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // File input refs for image uploads
  const logoInputRef = useRef(null);
  const director1PhotoRef = useRef(null);
  const director2PhotoRef = useRef(null);

  // ── Fetch company profile ──────────────────────────────────────

  const fetchCompany = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/company');
      const data = res.data.data || res.data;
      if (data) {
        // Strip large base64 data URLs to prevent white screen / memory issues
        ['logo_path', 'director1_photo', 'director2_photo'].forEach((field) => {
          if (data[field] && data[field].startsWith('data:') && data[field].length > 10000) {
            data[field] = '';
          }
        });
        setForm((prev) => ({
          ...prev,
          ...Object.fromEntries(
            Object.entries(data)
              .filter(([key]) => key in INITIAL_FORM)
              .filter(([, value]) => value !== null && value !== undefined)
          ),
        }));
      }
    } catch (err) {
      if (err.response?.status === 404) {
        // No profile yet, use defaults
      } else if (err.response?.status !== 401) {
        setError('Failed to load company profile');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCompany();
  }, [fetchCompany]);

  // ── Handlers ───────────────────────────────────────────────────

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setIsDirty(true);
  };

  // ── Image upload handler ──────────────────────────────────────
  const handleImageUpload = async (file, fieldName) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file (JPG, PNG, GIF, SVG)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be smaller than 5MB');
      return;
    }
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('entity_type', 'company');
      formData.append('entity_id', 'profile');
      formData.append('category', fieldName);

      const res = await apiClient.post('/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const fileUrl = res.data?.data?.file_url;
      if (fileUrl) {
        setForm((prev) => ({ ...prev, [fieldName]: fileUrl }));
        setIsDirty(true);
        toast.success('Image uploaded successfully');
      }
    } catch (err) {
      // Fallback: use base64 data URL if upload fails
      const reader = new FileReader();
      reader.onload = (e) => {
        setForm((prev) => ({ ...prev, [fieldName]: e.target.result }));
        toast.success('Image loaded (local preview)');
      };
      reader.readAsDataURL(file);
    }
  };

  const createFileHandler = (fieldName) => (e) => {
    const file = e.target.files?.[0];
    if (file) handleImageUpload(file, fieldName);
    // Reset the input so the same file can be re-selected
    e.target.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.company_name.trim()) {
      toast.error('Company name is required');
      return;
    }
    setSaving(true);
    try {
      await apiClient.put('/company', form);
      toast.success('Company profile updated successfully');
      setIsDirty(false);
      // Refresh company context so TopNav and other components get updated logo/name
      refreshCompanyProfile();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update company profile';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // ── Loading / Error ────────────────────────────────────────────

  if (loading) {
    return (
      <div className="py-20">
        <LoadingSpinner size="lg" label="Loading company profile..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-20 text-center">
        <HiOutlineBuildingOffice2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-lg font-medium text-[#333] mb-2">{error}</h2>
        <button
          onClick={fetchCompany}
          className="text-sm text-[#0071DC] hover:underline inline-flex items-center gap-1"
        >
          <HiOutlineArrowPath className="w-4 h-4" />
          Try again
        </button>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────

  return (
    <div className="pb-8">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#333]">Company Profile</h1>
        <p className="text-sm text-[#6B7280] mt-1">
          Manage your company details, tax registration, addresses, and more
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
        {/* ── Section 1: Company Information ─────────────────────── */}
        <div className="bg-white rounded-lg border border-[#E5E7EB] p-6">
          <SectionHeader
            icon={HiOutlineBuildingOffice2}
            title="Company Information"
            description="Basic details about your company"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label="Company Name"
              name="company_name"
              value={form.company_name}
              onChange={handleChange}
              placeholder="Enter company name"
              required
            />
            <FormInput
              label="Legal Name"
              name="legal_name"
              value={form.legal_name}
              onChange={handleChange}
              placeholder="Legal / registered name"
            />
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-[#333] mb-1.5">Company Logo</label>
              <ImageUploadArea
                currentUrl={form.logo_path}
                onFileSelect={createFileHandler('logo_path')}
                onUrlChange={(e) => setForm((prev) => ({ ...prev, logo_path: e.target.value }))}
                onClear={() => setForm((prev) => ({ ...prev, logo_path: '' }))}
                inputRef={logoInputRef}
                label="company logo"
                shape="square"
                size="lg"
                objectFit="contain"
                showRemoveBg={true}
                onBgRemoved={(dataUrl) => {
                  setForm((prev) => ({ ...prev, logo_path: dataUrl }));
                  setIsDirty(true);
                }}
              />
              {form.logo_path && (
                <span className="text-xs text-[#6B7280] mt-1 block">Logo is used in the top navigation bar, PDFs, letterheads, and ID cards</span>
              )}
            </div>
            <FormInput
              label="Phone"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              type="tel"
              placeholder="+91 XXXXXXXXXX"
            />
            <FormInput
              label="Email"
              name="email"
              value={form.email}
              onChange={handleChange}
              type="email"
              placeholder="info@company.com"
            />
            <FormInput
              label="Website"
              name="website"
              value={form.website}
              onChange={handleChange}
              placeholder="https://www.company.com"
              className="md:col-span-2"
            />
          </div>
        </div>

        {/* ── Section 2: Tax Registration ────────────────────────── */}
        <div className="bg-white rounded-lg border border-[#E5E7EB] p-6">
          <SectionHeader
            icon={HiOutlineDocumentText}
            title="Tax Registration"
            description="GST, PAN, TAN, and CIN details"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label="GSTIN"
              name="gstin"
              value={form.gstin}
              onChange={handleChange}
              placeholder="22AAAAA0000A1Z5"
              maxLength={15}
            />
            <FormInput
              label="PAN"
              name="pan"
              value={form.pan}
              onChange={handleChange}
              placeholder="AAAAA0000A"
              maxLength={10}
            />
            <FormInput
              label="TAN"
              name="tan"
              value={form.tan}
              onChange={handleChange}
              placeholder="AAAA00000A"
              maxLength={10}
            />
            <FormInput
              label="CIN"
              name="cin"
              value={form.cin}
              onChange={handleChange}
              placeholder="U00000XX0000PLC000000"
              maxLength={21}
            />
            <FormInput
              label="LUT Number"
              name="lut_number"
              value={form.lut_number}
              onChange={handleChange}
              placeholder="AD090XXXXXXXX"
            />
            <FormInput
              label="IEC Code"
              name="iec_code"
              value={form.iec_code}
              onChange={handleChange}
              placeholder="0300000000"
              maxLength={10}
            />
            <FormInput
              label="MSME / Udyam Number"
              name="msme_number"
              value={form.msme_number}
              onChange={handleChange}
              placeholder="UDYAM-XX-00-0000000"
              maxLength={25}
            />
          </div>
        </div>

        {/* ── Section 3: Head Office Address ──────────────────────── */}
        <div className="bg-white rounded-lg border border-[#E5E7EB] p-6">
          <SectionHeader
            icon={HiOutlineMapPin}
            title="Head Office Address"
            description="Primary business address"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label="Address Line 1"
              name="address_line1"
              value={form.address_line1}
              onChange={handleChange}
              placeholder="Street address, building name"
              className="md:col-span-2"
            />
            <FormInput
              label="Address Line 2"
              name="address_line2"
              value={form.address_line2}
              onChange={handleChange}
              placeholder="Area, landmark"
              className="md:col-span-2"
            />
            <FormInput
              label="City"
              name="city"
              value={form.city}
              onChange={handleChange}
              placeholder="City"
            />
            <FormSelect
              label="State"
              name="state"
              value={form.state}
              onChange={handleChange}
              options={INDIAN_STATES}
            />
            <FormInput
              label="Pincode"
              name="pincode"
              value={form.pincode}
              onChange={handleChange}
              placeholder="110001"
              maxLength={6}
            />
            <FormInput
              label="Country"
              name="country"
              value={form.country}
              onChange={handleChange}
              placeholder="India"
            />
          </div>
        </div>

        {/* ── Section 4: Factory Address ──────────────────────────── */}
        <div className="bg-white rounded-lg border border-[#E5E7EB] p-6">
          <SectionHeader
            icon={HiOutlineBuildingStorefront}
            title="Factory Address"
            description="Manufacturing / factory location"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label="Factory Address"
              name="factory_address"
              value={form.factory_address}
              onChange={handleChange}
              placeholder="Factory address"
              className="md:col-span-2"
            />
            <FormInput
              label="City"
              name="factory_city"
              value={form.factory_city}
              onChange={handleChange}
              placeholder="City"
            />
            <FormSelect
              label="State"
              name="factory_state"
              value={form.factory_state}
              onChange={handleChange}
              options={INDIAN_STATES}
            />
            <FormInput
              label="Pincode"
              name="factory_pincode"
              value={form.factory_pincode}
              onChange={handleChange}
              placeholder="110001"
              maxLength={6}
            />
          </div>
        </div>

        {/* ── Section 5: Financial Settings ───────────────────────── */}
        <div className="bg-white rounded-lg border border-[#E5E7EB] p-6">
          <SectionHeader
            icon={HiOutlineCog6Tooth}
            title="Financial Settings"
            description="Fiscal year and currency configuration"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormSelect
              label="Financial Year Start Month"
              name="financial_year_start"
              value={form.financial_year_start}
              onChange={handleChange}
              options={MONTHS}
            />
            <FormSelect
              label="Base Currency"
              name="base_currency"
              value={form.base_currency}
              onChange={handleChange}
              options={CURRENCIES}
            />
          </div>
        </div>

        {/* ── Section 6: About Company ──────────────────────────── */}
        <CollapsibleSection
          icon={HiOutlineInformationCircle}
          title="About Company"
          description="Company background, mission, vision, and goals"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label="Established Year"
              name="established_year"
              value={form.established_year}
              onChange={handleChange}
              placeholder="e.g. 2010"
              maxLength={4}
            />
            <FormInput
              label="Tagline"
              name="tagline"
              value={form.tagline}
              onChange={handleChange}
              placeholder="Your company tagline"
            />
            <FormTextarea
              label="About Us"
              name="about_us"
              value={form.about_us}
              onChange={handleChange}
              placeholder="Brief description of your company..."
              rows={3}
              className="md:col-span-2"
            />
            <FormTextarea
              label="Mission"
              name="mission"
              value={form.mission}
              onChange={handleChange}
              placeholder="Company mission statement..."
              rows={3}
              className="md:col-span-2"
            />
            <FormTextarea
              label="Vision"
              name="vision"
              value={form.vision}
              onChange={handleChange}
              placeholder="Company vision statement..."
              rows={3}
              className="md:col-span-2"
            />
            <FormTextarea
              label="Goals"
              name="goals"
              value={form.goals}
              onChange={handleChange}
              placeholder="Key business goals..."
              rows={3}
              className="md:col-span-2"
            />
          </div>
        </CollapsibleSection>

        {/* ── Section 7: Directors ──────────────────────────────── */}
        <CollapsibleSection
          icon={HiOutlineUserGroup}
          title="Directors"
          description="Company directors - photo, name, designation, and vision"
          defaultOpen
        >
          {/* Director Cards Preview */}
          {(form.director1_name || form.director2_name) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <DirectorCard
                name={form.director1_name}
                photo={form.director1_photo}
                designation={form.director1_designation}
                bio={form.director1_bio}
              />
              <DirectorCard
                name={form.director2_name}
                photo={form.director2_photo}
                designation={form.director2_designation}
                bio={form.director2_bio}
              />
            </div>
          )}

          <div className="space-y-6">
            {/* Director 1 */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-[#333] mb-3">Director 1</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormInput
                  label="Name"
                  name="director1_name"
                  value={form.director1_name}
                  onChange={handleChange}
                  placeholder="Director full name"
                />
                <FormInput
                  label="Designation"
                  name="director1_designation"
                  value={form.director1_designation}
                  onChange={handleChange}
                  placeholder="e.g. Managing Director"
                />
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-[#333] mb-1.5">Photo</label>
                  <ImageUploadArea
                    currentUrl={form.director1_photo}
                    onFileSelect={createFileHandler('director1_photo')}
                    onUrlChange={(e) => setForm((prev) => ({ ...prev, director1_photo: e.target.value }))}
                    inputRef={director1PhotoRef}
                    label="director photo"
                    shape="circle"
                    size="md"
                  />
                </div>
                <FormTextarea
                  label="Vision / Bio"
                  name="director1_bio"
                  value={form.director1_bio}
                  onChange={handleChange}
                  placeholder="Director's vision or brief bio..."
                  rows={2}
                  className="md:col-span-2"
                />
              </div>
            </div>
            {/* Director 2 */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-[#333] mb-3">Director 2</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormInput
                  label="Name"
                  name="director2_name"
                  value={form.director2_name}
                  onChange={handleChange}
                  placeholder="Director full name"
                />
                <FormInput
                  label="Designation"
                  name="director2_designation"
                  value={form.director2_designation}
                  onChange={handleChange}
                  placeholder="e.g. Director"
                />
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-[#333] mb-1.5">Photo</label>
                  <ImageUploadArea
                    currentUrl={form.director2_photo}
                    onFileSelect={createFileHandler('director2_photo')}
                    onUrlChange={(e) => setForm((prev) => ({ ...prev, director2_photo: e.target.value }))}
                    inputRef={director2PhotoRef}
                    label="director photo"
                    shape="circle"
                    size="md"
                  />
                </div>
                <FormTextarea
                  label="Vision / Bio"
                  name="director2_bio"
                  value={form.director2_bio}
                  onChange={handleChange}
                  placeholder="Director's vision or brief bio..."
                  rows={2}
                  className="md:col-span-2"
                />
              </div>
            </div>
          </div>
        </CollapsibleSection>

        {/* ── Section 7b: Department Photos ───────────────────────── */}
        <DepartmentsSection
          departments={(() => { try { return JSON.parse(form.departments || '[]'); } catch { return []; } })()}
          onChange={(depts) => setForm((prev) => ({ ...prev, departments: JSON.stringify(depts) }))}
        />

        {/* ── Section 8: Bank Details ──────────────────────────── */}
        <CollapsibleSection
          icon={HiOutlineBanknotes}
          title="Bank Details"
          description="Primary company bank account information"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label="Bank Name"
              name="bank_name"
              value={form.bank_name}
              onChange={handleChange}
              placeholder="e.g. State Bank of India"
            />
            <FormInput
              label="Account Number"
              name="bank_account_number"
              value={form.bank_account_number}
              onChange={handleChange}
              placeholder="Bank account number"
            />
            <FormInput
              label="IFSC Code"
              name="bank_ifsc_code"
              value={form.bank_ifsc_code}
              onChange={handleChange}
              placeholder="e.g. SBIN0001234"
              maxLength={11}
            />
            <FormInput
              label="Branch"
              name="bank_branch"
              value={form.bank_branch}
              onChange={handleChange}
              placeholder="Branch name"
            />
          </div>
        </CollapsibleSection>

                {/* ── Save Button ─────────────────────────────────────────── */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => setShowPrintModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-[#333] bg-white border border-[#E5E7EB] rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <HiOutlineDocumentArrowDown className="w-4 h-4" />
            Print / Export PDF
          </button>
          <button
            type="button"
            onClick={fetchCompany}
            disabled={saving}
            className="px-5 py-2.5 text-sm font-medium text-[#333] bg-white border border-[#E5E7EB] rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 cursor-pointer"
          >
            Reset
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-[#0071DC] rounded-lg hover:bg-[#005BB5] transition-colors disabled:opacity-50 cursor-pointer"
          >
            {saving ? (
              <>
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Saving...
              </>
            ) : (
              <>
                <HiOutlineCheckCircle className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>

      {/* Print Profile Modal */}
      <PrintProfileModal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        form={form}
      />
    </div>
  );
}
