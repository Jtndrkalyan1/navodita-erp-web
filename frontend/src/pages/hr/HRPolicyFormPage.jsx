import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { HiOutlineArrowLeft } from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { hrPolicyApi } from '../../api/hrPolicy.api';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges';

function InputField({ label, name, value, onChange, type = 'text', placeholder, required, error }) {
  return (
    <div>
      <label className="block text-sm font-medium text-[#333] mb-1">{label} {required && <span className="text-red-500">*</span>}</label>
      <input type={type} name={name} value={value||''} onChange={onChange} placeholder={placeholder}
        className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 ${error ? 'border-red-400' : 'border-[#E5E7EB]'}`} />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
function SelectField({ label, name, value, onChange, options, placeholder }) {
  return (
    <div>
      <label className="block text-sm font-medium text-[#333] mb-1">{label}</label>
      <select name={name} value={value||''} onChange={onChange} className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm bg-white focus:outline-none">
        <option value="">{placeholder || '-- Select --'}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}
function TextAreaField({ label, name, value, onChange, placeholder, rows = 3 }) {
  return (
    <div>
      <label className="block text-sm font-medium text-[#333] mb-1">{label}</label>
      <textarea name={name} value={value||''} onChange={onChange} rows={rows} placeholder={placeholder}
        className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 resize-vertical" />
    </div>
  );
}
function SectionCard({ title, children }) {
  return <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6 mb-6"><h2 className="text-base font-semibold text-[#333] mb-4">{title}</h2>{children}</div>;
}

const CATEGORIES = ['POSH','ESI','PF','Minimum Wages','Leave','Working Hours','Safety','General'];
const STATUS_OPTIONS = ['Active','Draft','Archived'];
const APPLICABLE_OPTIONS = ['All Employees','Management','Factory Workers','Office Staff','Contract Workers'];

const INITIAL = {
  policy_name:'', policy_number:'', category:'', description:'', policy_content:'',
  effective_date:'', review_date:'', applicable_to:'All Employees', status:'Active',
  version:'1.0', approved_by:'', is_mandatory: false, legal_reference:'',
};

export default function HRPolicyFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const { setIsDirty } = useUnsavedChanges();
  const [formData, setFormData] = useState(INITIAL);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!isEdit) return;
    const fetch = async () => {
      setLoading(true);
      try {
        const r = await hrPolicyApi.getById(id);
        const d = r.data?.data;
        if (!d) { toast.error('Not found'); navigate('/hr-policies'); return; }
        const mapped = {};
        Object.keys(INITIAL).forEach(k => {
          if (typeof INITIAL[k] === 'boolean') mapped[k] = d[k] === true;
          else if (k.includes('date') && d[k]) mapped[k] = d[k].split('T')[0];
          else mapped[k] = d[k] != null ? String(d[k]) : '';
        });
        setFormData(mapped);
      } catch { toast.error('Failed'); navigate('/hr-policies'); }
      finally { setLoading(false); }
    };
    fetch();
  }, [id, isEdit, navigate]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? e.target.checked : value }));
    setIsDirty(true);
    if (errors[name]) setErrors(prev => { const n={...prev}; delete n[name]; return n; });
  };

  const validate = () => {
    const e = {};
    if (!formData.policy_name.trim()) e.policy_name = 'Required';
    if (!formData.category) e.category = 'Required';
    if (!formData.policy_content.trim()) e.policy_content = 'Required';
    setErrors(e); return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) { toast.error('Please fix errors'); return; }
    setSaving(true);
    try {
      const payload = { ...formData };
      if (isEdit) { await hrPolicyApi.update(id, payload); toast.success('Updated'); setIsDirty(false); navigate(`/hr-policies/${id}`); }
      else { const r = await hrPolicyApi.create(payload); toast.success('Created'); setIsDirty(false); navigate(`/hr-policies/${r.data?.data?.id || ''}`); }
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-3 border-[#0071DC] border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-[#F3F4F6]"><HiOutlineArrowLeft className="w-5 h-5 text-[#6B7280]" /></button>
        <div><h1 className="text-2xl font-semibold text-[#333]">{isEdit ? 'Edit Policy' : 'New HR Policy'}</h1></div>
      </div>
      <form onSubmit={handleSubmit}>
        <SectionCard title="Policy Information">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <InputField label="Policy Name" name="policy_name" value={formData.policy_name} onChange={handleChange} required error={errors.policy_name} />
            <InputField label="Policy Number" name="policy_number" value={formData.policy_number} onChange={handleChange} placeholder="e.g. HR-POL-001" />
            <SelectField label="Category" name="category" value={formData.category} onChange={handleChange} options={CATEGORIES} />
            <InputField label="Version" name="version" value={formData.version} onChange={handleChange} placeholder="1.0" />
            <SelectField label="Status" name="status" value={formData.status} onChange={handleChange} options={STATUS_OPTIONS} />
            <SelectField label="Applicable To" name="applicable_to" value={formData.applicable_to} onChange={handleChange} options={APPLICABLE_OPTIONS} />
            <InputField label="Effective Date" name="effective_date" value={formData.effective_date} onChange={handleChange} type="date" />
            <InputField label="Review Date" name="review_date" value={formData.review_date} onChange={handleChange} type="date" />
            <InputField label="Approved By" name="approved_by" value={formData.approved_by} onChange={handleChange} />
          </div>
          <div className="mt-4 flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" name="is_mandatory" checked={formData.is_mandatory} onChange={handleChange} className="w-4 h-4 rounded border-[#E5E7EB] text-[#0071DC] focus:ring-[#0071DC]/20" />
              <span className="text-sm font-medium text-[#333]">Mandatory Policy</span>
            </label>
          </div>
        </SectionCard>
        <SectionCard title="Policy Content">
          <TextAreaField label="Description" name="description" value={formData.description} onChange={handleChange} placeholder="Brief description of the policy..." rows={2} />
          <div className="mt-4">
            <label className="block text-sm font-medium text-[#333] mb-1">Policy Content *</label>
            <textarea name="policy_content" value={formData.policy_content||''} onChange={handleChange} rows={15} placeholder="Full policy content..."
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 resize-vertical ${errors.policy_content ? 'border-red-400' : 'border-[#E5E7EB]'}`} />
            {errors.policy_content && <p className="text-xs text-red-500 mt-1">{errors.policy_content}</p>}
          </div>
          <div className="mt-4">
            <TextAreaField label="Legal Reference" name="legal_reference" value={formData.legal_reference} onChange={handleChange} placeholder="Relevant laws and acts..." rows={2} />
          </div>
        </SectionCard>
        <div className="flex items-center justify-end gap-3 pb-8">
          <button type="button" onClick={() => navigate(-1)} className="px-5 py-2 text-sm font-medium text-[#333] bg-white border border-[#E5E7EB] rounded-lg">Cancel</button>
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-[#0071DC] rounded-lg disabled:opacity-50">
            {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {saving ? (isEdit ? 'Updating...' : 'Creating...') : (isEdit ? 'Update Policy' : 'Create Policy')}
          </button>
        </div>
      </form>
    </div>
  );
}
