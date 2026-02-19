import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { HiOutlineArrowLeft } from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { offerLetterApi } from '../../api/offerLetter.api';
import { employeeApi } from '../../api/employee.api';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges';

function InputField({ label, name, value, onChange, type = 'text', placeholder, required, error, disabled, className = '' }) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-[#333] mb-1">{label} {required && <span className="text-red-500">*</span>}</label>
      <input type={type} name={name} value={value || ''} onChange={onChange} disabled={disabled}
        className={`w-full px-3 py-2 border rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC] disabled:bg-gray-50 ${error ? 'border-red-400' : 'border-[#E5E7EB]'}`}
        placeholder={placeholder} />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

function SelectField({ label, name, value, onChange, options, placeholder, className = '' }) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-[#333] mb-1">{label}</label>
      <select name={name} value={value || ''} onChange={onChange}
        className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] bg-white focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]">
        <option value="">{placeholder || '-- Select --'}</option>
        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    </div>
  );
}

function TextAreaField({ label, name, value, onChange, placeholder, rows = 3, className = '' }) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-[#333] mb-1">{label}</label>
      <textarea name={name} value={value || ''} onChange={onChange} rows={rows}
        className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC] resize-vertical"
        placeholder={placeholder} />
    </div>
  );
}

function CurrencyField({ label, name, value, onChange, disabled }) {
  return (
    <div>
      <label className="block text-sm font-medium text-[#333] mb-1">{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#6B7280]">{'\u20B9'}</span>
        <input type="text" name={name} value={value || ''} onChange={onChange} disabled={disabled}
          className={`w-full pl-8 pr-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC] ${disabled ? 'bg-gray-50 cursor-not-allowed' : ''}`}
          placeholder="0.00" />
      </div>
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

const DEPARTMENTS = ['Production', 'Quality', 'HR', 'Finance', 'Marketing', 'IT', 'Admin', 'Design', 'Merchandising', 'Warehouse', 'Cutting', 'Stitching', 'Finishing', 'Packing'];
const STATUS_OPTIONS = ['Draft', 'Sent', 'Accepted', 'Declined', 'Expired'];

const INITIAL = {
  candidate_name: '', candidate_email: '', candidate_phone: '', candidate_address: '',
  position: '', department: '', date_of_joining: '', offer_date: new Date().toISOString().split('T')[0],
  expiry_date: '', basic_salary: '', hra: '', conveyance_allowance: '', special_allowance: '',
  medical_allowance: '', employer_pf: '', employer_esi: '', ctc_amount: '',
  reporting_manager: '', work_location: 'Gurgaon', probation_period: '6 months',
  notice_period: '30 days', terms_and_conditions: '', special_conditions: '', status: 'Draft',
  employee_id: '',
};

export default function OfferLetterFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const { setIsDirty } = useUnsavedChanges();
  const [formData, setFormData] = useState(INITIAL);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    employeeApi.list({ limit: 500 }).then(r => setEmployees(r.data?.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    const fetch = async () => {
      setLoading(true);
      try {
        const r = await offerLetterApi.getById(id);
        const d = r.data?.data;
        if (!d) { toast.error('Offer letter not found'); navigate('/offer-letters'); return; }
        const mapped = {};
        Object.keys(INITIAL).forEach(k => {
          if (k.includes('date') && d[k]) mapped[k] = d[k].split('T')[0];
          else mapped[k] = d[k] != null ? String(d[k]) : '';
        });
        setFormData(mapped);
      } catch { toast.error('Failed to load offer letter'); navigate('/offer-letters'); }
      finally { setLoading(false); }
    };
    fetch();
  }, [id, isEdit, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      if (['basic_salary','hra','conveyance_allowance','special_allowance','medical_allowance','employer_pf','employer_esi'].includes(name)) {
        const b = parseFloat(name==='basic_salary'?value:prev.basic_salary)||0;
        const h = parseFloat(name==='hra'?value:prev.hra)||0;
        const c = parseFloat(name==='conveyance_allowance'?value:prev.conveyance_allowance)||0;
        const s = parseFloat(name==='special_allowance'?value:prev.special_allowance)||0;
        const m = parseFloat(name==='medical_allowance'?value:prev.medical_allowance)||0;
        const pf = parseFloat(name==='employer_pf'?value:prev.employer_pf)||0;
        const esi = parseFloat(name==='employer_esi'?value:prev.employer_esi)||0;
        updated.ctc_amount = (b+h+c+s+m+pf+esi).toFixed(2);
      }
      return updated;
    });
    setIsDirty(true);
    if (errors[name]) setErrors(prev => { const n = {...prev}; delete n[name]; return n; });
  };

  const handleEmployeeSelect = (e) => {
    const empId = e.target.value;
    setFormData(prev => ({ ...prev, employee_id: empId }));
    if (empId) {
      const emp = employees.find(e => e.id === empId);
      if (emp) {
        setFormData(prev => ({
          ...prev, employee_id: empId,
          candidate_name: emp.display_name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim(),
          candidate_email: emp.email || emp.work_email || '',
          candidate_phone: emp.mobile_number || emp.phone || '',
          position: emp.designation || '',
          department: emp.department_name || emp.department || '',
        }));
      }
    }
  };

  const validate = () => {
    const e = {};
    if (!formData.candidate_name.trim()) e.candidate_name = 'Required';
    if (!formData.position.trim()) e.position = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) { toast.error('Please fix validation errors'); return; }
    setSaving(true);
    try {
      const payload = { ...formData };
      ['basic_salary','hra','conveyance_allowance','special_allowance','medical_allowance','employer_pf','employer_esi','ctc_amount'].forEach(k => {
        payload[k] = payload[k] ? Number(payload[k]) : 0;
      });
      if (!payload.employee_id) delete payload.employee_id;
      if (isEdit) {
        await offerLetterApi.update(id, payload);
        toast.success('Offer letter updated');
        setIsDirty(false);
        navigate(`/offer-letters/${id}`);
      } else {
        const r = await offerLetterApi.create(payload);
        toast.success('Offer letter created');
        setIsDirty(false);
        navigate(`/offer-letters/${r.data?.data?.id || ''}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save');
    } finally { setSaving(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-3 border-[#0071DC] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-[#F3F4F6]"><HiOutlineArrowLeft className="w-5 h-5 text-[#6B7280]" /></button>
        <div>
          <h1 className="text-2xl font-semibold text-[#333]">{isEdit ? 'Edit Offer Letter' : 'New Offer Letter'}</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">{isEdit ? 'Update offer letter details' : 'Create a new offer letter for a candidate'}</p>
        </div>
      </div>
      <form onSubmit={handleSubmit}>
        <SectionCard title="Candidate Details">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SelectField label="Link to Employee (Optional)" name="employee_id" value={formData.employee_id} onChange={handleEmployeeSelect}
              options={employees.map(e => e.id)} placeholder="-- Select Employee --" />
            <InputField label="Candidate Name" name="candidate_name" value={formData.candidate_name} onChange={handleChange} required error={errors.candidate_name} placeholder="Full name" />
            <InputField label="Email" name="candidate_email" value={formData.candidate_email} onChange={handleChange} type="email" placeholder="Email address" />
            <InputField label="Phone" name="candidate_phone" value={formData.candidate_phone} onChange={handleChange} placeholder="Phone number" />
            <TextAreaField label="Address" name="candidate_address" value={formData.candidate_address} onChange={handleChange} placeholder="Full address" rows={2} className="md:col-span-2" />
          </div>
        </SectionCard>
        <SectionCard title="Position Details">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <InputField label="Position" name="position" value={formData.position} onChange={handleChange} required error={errors.position} placeholder="e.g. Production Manager" />
            <SelectField label="Department" name="department" value={formData.department} onChange={handleChange} options={DEPARTMENTS} />
            <InputField label="Date of Joining" name="date_of_joining" value={formData.date_of_joining} onChange={handleChange} type="date" />
            <InputField label="Offer Date" name="offer_date" value={formData.offer_date} onChange={handleChange} type="date" />
            <InputField label="Expiry Date" name="expiry_date" value={formData.expiry_date} onChange={handleChange} type="date" />
            <InputField label="Reporting Manager" name="reporting_manager" value={formData.reporting_manager} onChange={handleChange} placeholder="Manager name" />
            <InputField label="Work Location" name="work_location" value={formData.work_location} onChange={handleChange} placeholder="Gurgaon" />
            <InputField label="Probation Period" name="probation_period" value={formData.probation_period} onChange={handleChange} placeholder="6 months" />
            <InputField label="Notice Period" name="notice_period" value={formData.notice_period} onChange={handleChange} placeholder="30 days" />
            <SelectField label="Status" name="status" value={formData.status} onChange={handleChange} options={STATUS_OPTIONS} />
          </div>
        </SectionCard>
        <SectionCard title="Salary Breakup (Monthly)">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <CurrencyField label="Basic Salary" name="basic_salary" value={formData.basic_salary} onChange={handleChange} />
            <CurrencyField label="HRA" name="hra" value={formData.hra} onChange={handleChange} />
            <CurrencyField label="Conveyance Allowance" name="conveyance_allowance" value={formData.conveyance_allowance} onChange={handleChange} />
            <CurrencyField label="Special Allowance" name="special_allowance" value={formData.special_allowance} onChange={handleChange} />
            <CurrencyField label="Medical Allowance" name="medical_allowance" value={formData.medical_allowance} onChange={handleChange} />
            <CurrencyField label="Employer PF" name="employer_pf" value={formData.employer_pf} onChange={handleChange} />
            <CurrencyField label="Employer ESI" name="employer_esi" value={formData.employer_esi} onChange={handleChange} />
            <CurrencyField label="Total CTC (auto)" name="ctc_amount" value={formData.ctc_amount} onChange={handleChange} disabled />
          </div>
        </SectionCard>
        <SectionCard title="Terms & Conditions">
          <div className="space-y-4">
            <TextAreaField label="Terms and Conditions" name="terms_and_conditions" value={formData.terms_and_conditions} onChange={handleChange} rows={5}
              placeholder="Standard terms and conditions for employment..." />
            <TextAreaField label="Special Conditions" name="special_conditions" value={formData.special_conditions} onChange={handleChange} rows={3}
              placeholder="Any special conditions for this offer..." />
          </div>
        </SectionCard>
        <div className="flex items-center justify-end gap-3 pb-8">
          <button type="button" onClick={() => navigate(-1)} className="px-5 py-2 text-sm font-medium text-[#333] bg-white border border-[#E5E7EB] rounded-lg hover:bg-[#F9FAFB]">Cancel</button>
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-[#0071DC] rounded-lg hover:bg-[#005BB5] disabled:opacity-50">
            {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {saving ? (isEdit ? 'Updating...' : 'Creating...') : (isEdit ? 'Update Offer Letter' : 'Create Offer Letter')}
          </button>
        </div>
      </form>
    </div>
  );
}
