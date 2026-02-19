import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { HiOutlineArrowLeft, HiOutlineCamera, HiOutlineUserCircle } from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { employeeApi } from '../../api/employee.api';
import apiClient from '../../api/client';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges';

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi',
  'Jammu & Kashmir', 'Ladakh', 'Chandigarh',
  'Dadra & Nagar Haveli and Daman & Diu', 'Lakshadweep',
  'Puducherry', 'Andaman & Nicobar Islands',
];

const GENDER_OPTIONS = ['Male', 'Female', 'Other'];
const MARITAL_STATUS_OPTIONS = ['Single', 'Married', 'Divorced', 'Widowed'];
const BLOOD_GROUP_OPTIONS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
const EMPLOYMENT_TYPE_OPTIONS = ['Permanent', 'Contract', 'Probation', 'Trainee'];
const BANK_ACCOUNT_TYPE_OPTIONS = ['Savings', 'Current'];
const GRADE_OPTIONS = ['1', '2', '3', '4', '5'];

const INITIAL_FORM_DATA = {
  // Personal Info
  employee_code: '',
  first_name: '',
  last_name: '',
  father_name: '',
  date_of_birth: '',
  gender: '',
  marital_status: '',
  blood_group: '',
  nationality: 'Indian',
  religion: '',
  category: '',
  // Contact
  mobile_number: '',
  alternate_phone: '',
  email: '',
  personal_email: '',
  current_address: '',
  permanent_address: '',
  city: '',
  state: '',
  pincode: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
  emergency_contact_relation: '',
  // Employment
  department: '',
  designation: '',
  joining_date: '',
  employment_type: 'Permanent',
  probation_end_date: '',
  confirmation_date: '',
  work_location: '',
  shift_timing: '',
  grade: '',
  // ID Documents
  aadhaar_number: '',
  pan_number: '',
  passport_number: '',
  passport_expiry: '',
  driving_license: '',
  dl_expiry: '',
  voter_id: '',
  // Bank Details
  bank_name: '',
  bank_account_number: '',
  ifsc: '',
  bank_branch: '',
  bank_account_type: 'Savings',
  upi_id: '',
  // Salary
  basic_salary: '',
  hra: '',
  fixed_allowance: '',
  monthly_ctc: '',
  // Statutory
  is_pf_applicable: false,
  pf_number: '',
  pf_uan: '',
  is_esi_applicable: false,
  esi_number: '',
  is_lwf_applicable: false,
  tds_percent: '',
  // Meta
  status: 'Active',
  notes: '',
};

function InputField({ label, name, value, onChange, type = 'text', placeholder, required, error, maxLength, disabled, className = '' }) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-[#333] mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        maxLength={maxLength}
        disabled={disabled}
        className={`w-full px-3 py-2 border rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC] disabled:bg-gray-50 disabled:text-gray-500 ${
          error ? 'border-red-400 bg-red-50' : 'border-[#E5E7EB]'
        }`}
        placeholder={placeholder}
      />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

function SelectField({ label, name, value, onChange, options, placeholder, required, className = '' }) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-[#333] mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <select
        name={name}
        value={value}
        onChange={onChange}
        className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] bg-white focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
      >
        <option value="">{placeholder || '-- Select --'}</option>
        {options.map((opt) => {
          const val = typeof opt === 'object' ? opt.value : opt;
          const lbl = typeof opt === 'object' ? opt.label : opt;
          return <option key={val} value={val}>{lbl}</option>;
        })}
      </select>
    </div>
  );
}

function ToggleField({ label, name, checked, onChange, description }) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="text-sm font-medium text-[#333]">{label}</p>
        {description && <p className="text-xs text-[#6B7280] mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange({ target: { name, value: !checked, type: 'toggle' } })}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? 'bg-[#0071DC]' : 'bg-gray-300'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

function TextAreaField({ label, name, value, onChange, placeholder, rows = 3, className = '' }) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-[#333] mb-1">{label}</label>
      <textarea
        name={name}
        value={value}
        onChange={onChange}
        rows={rows}
        className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC] resize-vertical"
        placeholder={placeholder}
      />
    </div>
  );
}

function SectionCard({ title, children }) {
  return (
    <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6 mb-6">
      <h2 className="text-base font-semibold text-[#333] mb-4">{title}</h2>
      {children}
    </div>
  );
}

export default function EmployeeFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [photoUrl, setPhotoUrl] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef(null);
  const { setIsDirty } = useUnsavedChanges();

  useEffect(() => {
    if (!isEdit) return;

    const fetchEmployee = async () => {
      setLoading(true);
      try {
        const response = await employeeApi.getById(id);
        const emp = response.data?.data;
        if (!emp) {
          toast.error('Employee not found');
          navigate('/employees');
          return;
        }

        const mapped = {};
        Object.keys(INITIAL_FORM_DATA).forEach((key) => {
          if (typeof INITIAL_FORM_DATA[key] === 'boolean') {
            mapped[key] = emp[key] === true || emp[key] === 'true' || emp[key] === 1;
          } else if (INITIAL_FORM_DATA[key] === '') {
            mapped[key] = emp[key] != null ? String(emp[key]) : '';
          } else {
            mapped[key] = emp[key] != null ? emp[key] : INITIAL_FORM_DATA[key];
          }
        });

        setFormData(mapped);
      } catch (err) {
        if (err.response?.status === 404) {
          toast.error('Employee not found');
          navigate('/employees');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchEmployee();
  }, [id, isEdit, navigate]);

  // Fetch existing photo when editing
  useEffect(() => {
    if (!isEdit || !id) return;
    const fetchPhoto = async () => {
      try {
        const response = await apiClient.get('/documents', {
          params: { entity_type: 'employee', entity_id: id, category: 'photo' },
        });
        const docs = response.data?.data || response.data || [];
        if (Array.isArray(docs) && docs.length > 0) {
          const latestDoc = docs[docs.length - 1];
          const url = latestDoc.file_url || latestDoc.url || latestDoc.file_path;
          if (url) setPhotoUrl(url);
        }
      } catch {
        // No photo, keep placeholder
      }
    };
    fetchPhoto();
  }, [isEdit, id]);

  const handlePhotoSelect = (e) => {
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
  };

  const uploadPhoto = async (employeeId) => {
    if (!photoFile) return;
    try {
      setUploadingPhoto(true);
      const formDataUpload = new FormData();
      formDataUpload.append('file', photoFile);
      formDataUpload.append('entity_type', 'employee');
      formDataUpload.append('entity_id', employeeId);
      formDataUpload.append('category', 'photo');

      await apiClient.post('/documents', formDataUpload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    } catch (err) {
      console.error('Photo upload failed:', err);
      toast.error('Employee saved but photo upload failed. You can upload it later.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const getInitials = (firstName, lastName) => {
    if (!firstName && !lastName) return '?';
    if (firstName && lastName) return (firstName[0] + lastName[0]).toUpperCase();
    const name = firstName || lastName || '';
    return name[0]?.toUpperCase() || '?';
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    const newValue = type === 'toggle' ? value : value;
    setIsDirty(true);

    setFormData((prev) => {
      const updated = { ...prev, [name]: newValue };

      // Auto-calculate monthly CTC
      if (['basic_salary', 'hra', 'fixed_allowance'].includes(name)) {
        const basic = parseFloat(name === 'basic_salary' ? newValue : prev.basic_salary) || 0;
        const hraVal = parseFloat(name === 'hra' ? newValue : prev.hra) || 0;
        const allowance = parseFloat(name === 'fixed_allowance' ? newValue : prev.fixed_allowance) || 0;
        updated.monthly_ctc = (basic + hraVal + allowance).toFixed(2);
      }

      return updated;
    });

    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.first_name.trim()) {
      newErrors.first_name = 'First name is required';
    }
    if (!formData.last_name.trim()) {
      newErrors.last_name = 'Last name is required';
    }
    if (!formData.employee_code.trim()) {
      newErrors.employee_code = 'Employee code is required';
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (formData.personal_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.personal_email)) {
      newErrors.personal_email = 'Please enter a valid email address';
    }
    if (formData.aadhaar_number && !/^\d{12}$/.test(formData.aadhaar_number.replace(/\s/g, ''))) {
      newErrors.aadhaar_number = 'Aadhaar must be 12 digits';
    }
    if (formData.pan_number && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.pan_number.toUpperCase())) {
      newErrors.pan_number = 'Please enter a valid 10-character PAN';
    }
    if (formData.pincode && !/^\d{6}$/.test(formData.pincode)) {
      newErrors.pincode = 'PIN code must be 6 digits';
    }
    if (formData.ifsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.ifsc.toUpperCase())) {
      newErrors.ifsc = 'Please enter a valid 11-character IFSC code';
    }
    if (formData.basic_salary && isNaN(Number(formData.basic_salary))) {
      newErrors.basic_salary = 'Must be a valid number';
    }
    if (formData.hra && isNaN(Number(formData.hra))) {
      newErrors.hra = 'Must be a valid number';
    }
    if (formData.fixed_allowance && isNaN(Number(formData.fixed_allowance))) {
      newErrors.fixed_allowance = 'Must be a valid number';
    }
    if (formData.tds_percent && (isNaN(Number(formData.tds_percent)) || Number(formData.tds_percent) < 0 || Number(formData.tds_percent) > 100)) {
      newErrors.tds_percent = 'TDS % must be between 0 and 100';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      toast.error('Please fix the validation errors before saving.');
      return;
    }

    setSaving(true);
    try {
      const payload = { ...formData };
      // Set display_name from first_name + last_name
      payload.display_name = `${payload.first_name} ${payload.last_name}`.trim();
      // Convert numeric fields
      payload.basic_salary = payload.basic_salary ? Number(payload.basic_salary) : 0;
      payload.hra = payload.hra ? Number(payload.hra) : 0;
      payload.fixed_allowance = payload.fixed_allowance ? Number(payload.fixed_allowance) : 0;
      payload.monthly_ctc = payload.monthly_ctc ? Number(payload.monthly_ctc) : 0;
      payload.tds_percent = payload.tds_percent ? Number(payload.tds_percent) : 0;
      payload.grade = payload.grade ? Number(payload.grade) : null;
      // Uppercase document fields
      payload.pan_number = payload.pan_number ? payload.pan_number.toUpperCase() : '';
      payload.ifsc = payload.ifsc ? payload.ifsc.toUpperCase() : '';

      if (isEdit) {
        await employeeApi.update(id, payload);
        // Upload photo if a new one was selected
        if (photoFile) await uploadPhoto(id);
        toast.success('Employee updated successfully');
        setIsDirty(false);
        navigate(`/employees/${id}`);
      } else {
        const response = await employeeApi.create(payload);
        const newId = response.data?.data?.id;
        // Upload photo for newly created employee
        if (photoFile && newId) await uploadPhoto(newId);
        toast.success('Employee created successfully');
        setIsDirty(false);
        navigate(newId ? `/employees/${newId}` : '/employees');
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
          <span className="text-sm text-[#6B7280]">Loading employee...</span>
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
            {isEdit ? 'Edit Employee' : 'New Employee'}
          </h1>
          <p className="text-sm text-[#6B7280] mt-0.5">
            {isEdit ? 'Update employee information' : 'Add a new employee to your organization'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Photo Upload Section */}
        <SectionCard title="Employee Photo">
          <div className="flex items-center gap-6">
            <div
              className="relative group cursor-pointer"
              onClick={() => photoInputRef.current?.click()}
              title="Click to upload photo"
            >
              <div className="w-24 h-24 rounded-full bg-[#E5E7EB] flex items-center justify-center overflow-hidden border-2 border-[#E5E7EB] shadow-sm">
                {photoUrl ? (
                  <img src={photoUrl} alt="Employee" className="w-24 h-24 rounded-full object-cover" />
                ) : (
                  <span className="text-3xl font-bold text-[#9CA3AF]">
                    {(formData.first_name || formData.last_name) ? getInitials(formData.first_name, formData.last_name) : <HiOutlineUserCircle className="w-12 h-12 text-[#9CA3AF]" />}
                  </span>
                )}
              </div>
              <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <HiOutlineCamera className="w-6 h-6 text-white" />
              </div>
            </div>
            <div>
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-[#333] bg-white border border-[#E5E7EB] rounded-lg hover:bg-[#F9FAFB] transition-colors"
              >
                <HiOutlineCamera className="w-4 h-4" />
                {photoUrl ? 'Change Photo' : 'Upload Photo'}
              </button>
              <p className="text-xs text-[#9CA3AF] mt-1.5">JPG, PNG up to 5MB. Photo will be saved after submitting the form.</p>
              {photoFile && (
                <p className="text-xs text-green-600 mt-1">New photo selected: {photoFile.name}</p>
              )}
            </div>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoSelect}
            />
          </div>
        </SectionCard>

        {/* Section 1: Personal Info */}
        <SectionCard title="Personal Information">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <InputField
              label="Employee Code"
              name="employee_code"
              value={formData.employee_code}
              onChange={handleChange}
              placeholder="e.g. EMP001"
              required
              error={errors.employee_code}
            />
            <InputField
              label="First Name"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              placeholder="First name"
              required
              error={errors.first_name}
            />
            <InputField
              label="Last Name"
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              placeholder="Last name"
              required
              error={errors.last_name}
            />
            <InputField
              label="Father's Name"
              name="father_name"
              value={formData.father_name}
              onChange={handleChange}
              placeholder="Father's name"
            />
            <InputField
              label="Date of Birth"
              name="date_of_birth"
              value={formData.date_of_birth}
              onChange={handleChange}
              type="date"
            />
            <SelectField
              label="Gender"
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              options={GENDER_OPTIONS}
            />
            <SelectField
              label="Marital Status"
              name="marital_status"
              value={formData.marital_status}
              onChange={handleChange}
              options={MARITAL_STATUS_OPTIONS}
            />
            <SelectField
              label="Blood Group"
              name="blood_group"
              value={formData.blood_group}
              onChange={handleChange}
              options={BLOOD_GROUP_OPTIONS}
            />
            <InputField
              label="Nationality"
              name="nationality"
              value={formData.nationality}
              onChange={handleChange}
              placeholder="Nationality"
            />
            <InputField
              label="Religion"
              name="religion"
              value={formData.religion}
              onChange={handleChange}
              placeholder="Religion"
            />
            <InputField
              label="Category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              placeholder="e.g. General, OBC, SC, ST"
            />
          </div>
        </SectionCard>

        {/* Section 2: Contact */}
        <SectionCard title="Contact Details">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <InputField
              label="Mobile Number"
              name="mobile_number"
              value={formData.mobile_number}
              onChange={handleChange}
              placeholder="10-digit mobile number"
            />
            <InputField
              label="Alternate Phone"
              name="alternate_phone"
              value={formData.alternate_phone}
              onChange={handleChange}
              placeholder="Alternate phone"
            />
            <InputField
              label="Official Email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              type="email"
              placeholder="Official email"
              error={errors.email}
            />
            <InputField
              label="Personal Email"
              name="personal_email"
              value={formData.personal_email}
              onChange={handleChange}
              type="email"
              placeholder="Personal email"
              error={errors.personal_email}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <TextAreaField
              label="Current Address"
              name="current_address"
              value={formData.current_address}
              onChange={handleChange}
              placeholder="Current residential address"
              rows={2}
            />
            <TextAreaField
              label="Permanent Address"
              name="permanent_address"
              value={formData.permanent_address}
              onChange={handleChange}
              placeholder="Permanent address"
              rows={2}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <InputField
              label="City"
              name="city"
              value={formData.city}
              onChange={handleChange}
              placeholder="City"
            />
            <SelectField
              label="State"
              name="state"
              value={formData.state}
              onChange={handleChange}
              options={INDIAN_STATES}
              placeholder="-- Select State --"
            />
            <InputField
              label="PIN Code"
              name="pincode"
              value={formData.pincode}
              onChange={handleChange}
              placeholder="6-digit PIN code"
              maxLength={6}
              error={errors.pincode}
            />
          </div>
          <div className="border-t border-[#E5E7EB] mt-5 pt-4">
            <h3 className="text-sm font-semibold text-[#6B7280] uppercase tracking-wide mb-3">Emergency Contact</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <InputField
                label="Contact Name"
                name="emergency_contact_name"
                value={formData.emergency_contact_name}
                onChange={handleChange}
                placeholder="Emergency contact name"
              />
              <InputField
                label="Contact Phone"
                name="emergency_contact_phone"
                value={formData.emergency_contact_phone}
                onChange={handleChange}
                placeholder="Emergency phone number"
              />
              <InputField
                label="Relation"
                name="emergency_contact_relation"
                value={formData.emergency_contact_relation}
                onChange={handleChange}
                placeholder="e.g. Spouse, Parent"
              />
            </div>
          </div>
        </SectionCard>

        {/* Section 3: Employment */}
        <SectionCard title="Employment Details">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <InputField
              label="Department"
              name="department"
              value={formData.department}
              onChange={handleChange}
              placeholder="e.g. Production, HR, Finance"
            />
            <InputField
              label="Designation"
              name="designation"
              value={formData.designation}
              onChange={handleChange}
              placeholder="e.g. Manager, Executive"
            />
            <InputField
              label="Joining Date"
              name="joining_date"
              value={formData.joining_date}
              onChange={handleChange}
              type="date"
            />
            <SelectField
              label="Employment Type"
              name="employment_type"
              value={formData.employment_type}
              onChange={handleChange}
              options={EMPLOYMENT_TYPE_OPTIONS}
            />
            <InputField
              label="Probation End Date"
              name="probation_end_date"
              value={formData.probation_end_date}
              onChange={handleChange}
              type="date"
            />
            <InputField
              label="Confirmation Date"
              name="confirmation_date"
              value={formData.confirmation_date}
              onChange={handleChange}
              type="date"
            />
            <InputField
              label="Work Location"
              name="work_location"
              value={formData.work_location}
              onChange={handleChange}
              placeholder="e.g. Head Office, Factory"
            />
            <InputField
              label="Shift Timing"
              name="shift_timing"
              value={formData.shift_timing}
              onChange={handleChange}
              placeholder="e.g. 9:00 AM - 6:00 PM"
            />
            <SelectField
              label="Grade"
              name="grade"
              value={formData.grade}
              onChange={handleChange}
              options={GRADE_OPTIONS}
              placeholder="-- Select Grade --"
            />
          </div>
        </SectionCard>

        {/* Section 4: ID Documents */}
        <SectionCard title="ID Documents">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <InputField
              label="Aadhaar Number"
              name="aadhaar_number"
              value={formData.aadhaar_number}
              onChange={handleChange}
              placeholder="12-digit Aadhaar number"
              maxLength={12}
              error={errors.aadhaar_number}
            />
            <InputField
              label="PAN Number"
              name="pan_number"
              value={formData.pan_number}
              onChange={handleChange}
              placeholder="e.g. ABCDE1234F"
              maxLength={10}
              error={errors.pan_number}
              className="uppercase"
            />
            <InputField
              label="Passport Number"
              name="passport_number"
              value={formData.passport_number}
              onChange={handleChange}
              placeholder="Passport number"
            />
            <InputField
              label="Passport Expiry"
              name="passport_expiry"
              value={formData.passport_expiry}
              onChange={handleChange}
              type="date"
            />
            <InputField
              label="Driving License"
              name="driving_license"
              value={formData.driving_license}
              onChange={handleChange}
              placeholder="DL number"
            />
            <InputField
              label="DL Expiry"
              name="dl_expiry"
              value={formData.dl_expiry}
              onChange={handleChange}
              type="date"
            />
            <InputField
              label="Voter ID"
              name="voter_id"
              value={formData.voter_id}
              onChange={handleChange}
              placeholder="Voter ID number"
            />
          </div>
        </SectionCard>

        {/* Section 5: Bank Details */}
        <SectionCard title="Bank Details">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <InputField
              label="Bank Name"
              name="bank_name"
              value={formData.bank_name}
              onChange={handleChange}
              placeholder="e.g. State Bank of India"
            />
            <InputField
              label="Account Number"
              name="bank_account_number"
              value={formData.bank_account_number}
              onChange={handleChange}
              placeholder="Bank account number"
            />
            <InputField
              label="IFSC Code"
              name="ifsc"
              value={formData.ifsc}
              onChange={handleChange}
              placeholder="e.g. SBIN0001234"
              maxLength={11}
              error={errors.ifsc}
            />
            <InputField
              label="Branch"
              name="bank_branch"
              value={formData.bank_branch}
              onChange={handleChange}
              placeholder="Branch name"
            />
            <SelectField
              label="Account Type"
              name="bank_account_type"
              value={formData.bank_account_type}
              onChange={handleChange}
              options={BANK_ACCOUNT_TYPE_OPTIONS}
            />
            <InputField
              label="UPI ID"
              name="upi_id"
              value={formData.upi_id}
              onChange={handleChange}
              placeholder="e.g. name@upi"
            />
          </div>
        </SectionCard>

        {/* Section 6: Salary */}
        <SectionCard title="Salary Details">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#333] mb-1">Basic Salary</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#6B7280]">{'\u20B9'}</span>
                <input
                  type="text"
                  name="basic_salary"
                  value={formData.basic_salary}
                  onChange={handleChange}
                  className={`w-full pl-8 pr-3 py-2 border rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC] ${
                    errors.basic_salary ? 'border-red-400 bg-red-50' : 'border-[#E5E7EB]'
                  }`}
                  placeholder="0.00"
                />
              </div>
              {errors.basic_salary && <p className="text-xs text-red-500 mt-1">{errors.basic_salary}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-[#333] mb-1">HRA</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#6B7280]">{'\u20B9'}</span>
                <input
                  type="text"
                  name="hra"
                  value={formData.hra}
                  onChange={handleChange}
                  className={`w-full pl-8 pr-3 py-2 border rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC] ${
                    errors.hra ? 'border-red-400 bg-red-50' : 'border-[#E5E7EB]'
                  }`}
                  placeholder="0.00"
                />
              </div>
              {errors.hra && <p className="text-xs text-red-500 mt-1">{errors.hra}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-[#333] mb-1">Fixed Allowance</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#6B7280]">{'\u20B9'}</span>
                <input
                  type="text"
                  name="fixed_allowance"
                  value={formData.fixed_allowance}
                  onChange={handleChange}
                  className={`w-full pl-8 pr-3 py-2 border rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC] ${
                    errors.fixed_allowance ? 'border-red-400 bg-red-50' : 'border-[#E5E7EB]'
                  }`}
                  placeholder="0.00"
                />
              </div>
              {errors.fixed_allowance && <p className="text-xs text-red-500 mt-1">{errors.fixed_allowance}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-[#333] mb-1">Monthly CTC <span className="text-xs text-[#9CA3AF]">(auto)</span></label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#6B7280]">{'\u20B9'}</span>
                <input
                  type="text"
                  name="monthly_ctc"
                  value={formData.monthly_ctc}
                  disabled
                  className="w-full pl-8 pr-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] bg-gray-50 cursor-not-allowed"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Section 7: Statutory */}
        <SectionCard title="Statutory Details">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <ToggleField
                label="PF Applicable"
                name="is_pf_applicable"
                checked={formData.is_pf_applicable}
                onChange={handleChange}
                description="Employee Provident Fund"
              />
              <InputField
                label="PF Number"
                name="pf_number"
                value={formData.pf_number}
                onChange={handleChange}
                placeholder="PF account number"
                disabled={!formData.is_pf_applicable}
              />
              <InputField
                label="UAN (Universal Account Number)"
                name="pf_uan"
                value={formData.pf_uan}
                onChange={handleChange}
                placeholder="12-digit UAN"
                disabled={!formData.is_pf_applicable}
              />
            </div>
            <div className="border-t border-[#E5E7EB] pt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <ToggleField
                  label="ESI Applicable"
                  name="is_esi_applicable"
                  checked={formData.is_esi_applicable}
                  onChange={handleChange}
                  description="Employee State Insurance"
                />
                <InputField
                  label="ESI Number"
                  name="esi_number"
                  value={formData.esi_number}
                  onChange={handleChange}
                  placeholder="ESI number"
                  disabled={!formData.is_esi_applicable}
                />
                <div />
              </div>
            </div>
            <div className="border-t border-[#E5E7EB] pt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <ToggleField
                  label="LWF Applicable"
                  name="is_lwf_applicable"
                  checked={formData.is_lwf_applicable}
                  onChange={handleChange}
                  description="Labour Welfare Fund"
                />
                <InputField
                  label="TDS %"
                  name="tds_percent"
                  value={formData.tds_percent}
                  onChange={handleChange}
                  placeholder="e.g. 10"
                  error={errors.tds_percent}
                />
                <div />
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Notes */}
        <SectionCard title="Additional Notes">
          <TextAreaField
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            placeholder="Internal notes about this employee..."
            rows={3}
          />
        </SectionCard>

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
              : isEdit ? 'Update Employee' : 'Create Employee'}
          </button>
        </div>
      </form>
    </div>
  );
}
