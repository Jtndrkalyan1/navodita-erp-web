import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { HiOutlineArrowLeft } from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { joiningLetterApi } from '../../api/joiningLetter.api';
import { employeeApi } from '../../api/employee.api';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges';

function InputField({ label, name, value, onChange, type = 'text', placeholder, required, error, disabled }) {
  return (
    <div>
      <label className="block text-sm font-medium text-[#333] mb-1">{label} {required && <span className="text-red-500">*</span>}</label>
      <input type={type} name={name} value={value||''} onChange={onChange} disabled={disabled} placeholder={placeholder}
        className={`w-full px-3 py-2 border rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC] disabled:bg-gray-50 ${error ? 'border-red-400' : 'border-[#E5E7EB]'}`} />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

function SelectField({ label, name, value, onChange, options, placeholder }) {
  return (
    <div>
      <label className="block text-sm font-medium text-[#333] mb-1">{label}</label>
      <select name={name} value={value||''} onChange={onChange} className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20">
        <option value="">{placeholder || '-- Select --'}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function TextAreaField({ label, name, value, onChange, placeholder, rows = 3, className = '' }) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-[#333] mb-1">{label}</label>
      <textarea name={name} value={value||''} onChange={onChange} rows={rows} placeholder={placeholder}
        className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 resize-vertical" />
    </div>
  );
}

function SectionCard({ title, children }) {
  return <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6 mb-6"><h2 className="text-base font-semibold text-[#333] mb-4">{title}</h2>{children}</div>;
}

const DEPTS = ['Production','Quality','HR','Finance','Marketing','IT','Admin','Design','Merchandising','Warehouse','Cutting','Stitching','Finishing','Packing'];
const STATUS_OPTIONS = ['Draft', 'Sent', 'Acknowledged'];
const INITIAL = {
  employee_name:'', employee_email:'', employee_phone:'', employee_address:'',
  position:'', department:'', date_of_joining:'', joining_date: new Date().toISOString().split('T')[0],
  reporting_to:'', work_location:'Gurgaon', documents_required:'', reporting_time:'10:00 AM',
  dress_code:'Business Casual', special_instructions:'', status:'Draft', employee_id:'',
};

export default function JoiningLetterFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const { setIsDirty } = useUnsavedChanges();
  const [formData, setFormData] = useState(INITIAL);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [employees, setEmployees] = useState([]);

  useEffect(() => { employeeApi.list({ limit: 500 }).then(r => setEmployees(r.data?.data || [])).catch(() => {}); }, []);

  useEffect(() => {
    if (!isEdit) return;
    const fetch = async () => {
      setLoading(true);
      try {
        const r = await joiningLetterApi.getById(id);
        const d = r.data?.data;
        if (!d) { toast.error('Not found'); navigate('/joining-letters'); return; }
        const mapped = {};
        Object.keys(INITIAL).forEach(k => { mapped[k] = d[k] != null ? (k.includes('date') && d[k] ? d[k].split('T')[0] : String(d[k])) : ''; });
        setFormData(mapped);
      } catch { toast.error('Failed to load'); navigate('/joining-letters'); }
      finally { setLoading(false); }
    };
    fetch();
  }, [id, isEdit, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setIsDirty(true);
    if (errors[name]) setErrors(prev => { const n = {...prev}; delete n[name]; return n; });
  };

  const handleEmployeeSelect = (e) => {
    const empId = e.target.value;
    if (empId) {
      const emp = employees.find(e => e.id === empId);
      if (emp) setFormData(prev => ({
        ...prev, employee_id: empId,
        employee_name: emp.display_name || `${emp.first_name||''} ${emp.last_name||''}`.trim(),
        employee_email: emp.email || '', employee_phone: emp.mobile_number || emp.phone || '',
        position: emp.designation || '', department: emp.department_name || emp.department || '',
      }));
    } else setFormData(prev => ({ ...prev, employee_id: '' }));
  };

  const validate = () => {
    const e = {};
    if (!formData.employee_name.trim()) e.employee_name = 'Required';
    if (!formData.position.trim()) e.position = 'Required';
    if (!formData.date_of_joining) e.date_of_joining = 'Required';
    setErrors(e); return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) { toast.error('Please fix errors'); return; }
    setSaving(true);
    try {
      const payload = { ...formData };
      if (!payload.employee_id) delete payload.employee_id;
      if (isEdit) { await joiningLetterApi.update(id, payload); toast.success('Updated'); setIsDirty(false); navigate(`/joining-letters/${id}`); }
      else { const r = await joiningLetterApi.create(payload); toast.success('Created'); setIsDirty(false); navigate(`/joining-letters/${r.data?.data?.id || ''}`); }
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-3 border-[#0071DC] border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-[#F3F4F6]"><HiOutlineArrowLeft className="w-5 h-5 text-[#6B7280]" /></button>
        <div><h1 className="text-2xl font-semibold text-[#333]">{isEdit ? 'Edit Joining Letter' : 'New Joining Letter'}</h1></div>
      </div>
      <form onSubmit={handleSubmit}>
        <SectionCard title="Employee Details">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SelectField label="Link to Employee" name="employee_id" value={formData.employee_id} onChange={handleEmployeeSelect} options={employees.map(e=>e.id)} placeholder="-- Select --" />
            <InputField label="Employee Name" name="employee_name" value={formData.employee_name} onChange={handleChange} required error={errors.employee_name} />
            <InputField label="Email" name="employee_email" value={formData.employee_email} onChange={handleChange} type="email" />
            <InputField label="Phone" name="employee_phone" value={formData.employee_phone} onChange={handleChange} />
            <TextAreaField label="Address" name="employee_address" value={formData.employee_address} onChange={handleChange} rows={2} className="md:col-span-2" />
          </div>
        </SectionCard>
        <SectionCard title="Joining Details">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <InputField label="Position" name="position" value={formData.position} onChange={handleChange} required error={errors.position} />
            <SelectField label="Department" name="department" value={formData.department} onChange={handleChange} options={DEPTS} />
            <InputField label="Date of Joining" name="date_of_joining" value={formData.date_of_joining} onChange={handleChange} type="date" required error={errors.date_of_joining} />
            <InputField label="Letter Date" name="joining_date" value={formData.joining_date} onChange={handleChange} type="date" />
            <InputField label="Reporting To" name="reporting_to" value={formData.reporting_to} onChange={handleChange} />
            <InputField label="Work Location" name="work_location" value={formData.work_location} onChange={handleChange} />
            <InputField label="Reporting Time" name="reporting_time" value={formData.reporting_time} onChange={handleChange} />
            <InputField label="Dress Code" name="dress_code" value={formData.dress_code} onChange={handleChange} />
            <SelectField label="Status" name="status" value={formData.status} onChange={handleChange} options={STATUS_OPTIONS} />
          </div>
        </SectionCard>
        <SectionCard title="Additional Information">
          <div className="space-y-4">
            <TextAreaField label="Documents Required" name="documents_required" value={formData.documents_required} onChange={handleChange} rows={4} placeholder="List of documents to bring on joining day..." />
            <TextAreaField label="Special Instructions" name="special_instructions" value={formData.special_instructions} onChange={handleChange} rows={3} placeholder="Any special instructions..." />
          </div>
        </SectionCard>
        <div className="flex items-center justify-end gap-3 pb-8">
          <button type="button" onClick={() => navigate(-1)} className="px-5 py-2 text-sm font-medium text-[#333] bg-white border border-[#E5E7EB] rounded-lg hover:bg-[#F9FAFB]">Cancel</button>
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-[#0071DC] rounded-lg hover:bg-[#005BB5] disabled:opacity-50">
            {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {saving ? (isEdit ? 'Updating...' : 'Creating...') : (isEdit ? 'Update' : 'Create Joining Letter')}
          </button>
        </div>
      </form>
    </div>
  );
}
