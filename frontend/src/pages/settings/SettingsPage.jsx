import React, { useState, useEffect, useCallback } from 'react';
import {
  HiOutlineCog6Tooth,
  HiOutlineDocumentText,
  HiOutlineClipboardDocumentList,
  HiOutlineReceiptPercent,
  HiOutlineEnvelope,
  HiOutlineBellAlert,
  HiOutlineCheckCircle,
  HiOutlineArrowPath,
  HiOutlineCurrencyRupee,
  HiOutlineDocumentDuplicate,
  HiOutlineLockClosed,
  HiOutlineEye,
  HiOutlineEyeSlash,
  HiOutlineSparkles,
  HiOutlineExclamationTriangle,
  HiOutlineArrowTopRightOnSquare,
  HiOutlineUsers,
  HiOutlineUserPlus,
  HiOutlinePencilSquare,
  HiOutlineTrash,
  HiOutlineXMark,
  HiOutlineMagnifyingGlass,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import apiClient from '../../api/client';
import LoadingSpinner from '../../components/feedback/LoadingSpinner';
import { BiometricSetup } from '../../components/BiometricAuth';

// ── Constants ─────────────────────────────────────────────────────

const TABS = [
  { id: 'general', label: 'General', icon: HiOutlineCog6Tooth },
  { id: 'invoice', label: 'Invoice', icon: HiOutlineDocumentText },
  { id: 'quotation', label: 'Quotation', icon: HiOutlineClipboardDocumentList },
  { id: 'bill', label: 'Bill', icon: HiOutlineDocumentDuplicate },
  { id: 'tax', label: 'Tax', icon: HiOutlineReceiptPercent },
  { id: 'email', label: 'Email', icon: HiOutlineEnvelope },
  { id: 'notifications', label: 'Notifications', icon: HiOutlineBellAlert },
  { id: 'ai', label: 'AI Configuration', icon: HiOutlineSparkles },
  { id: 'security', label: 'Security', icon: HiOutlineLockClosed },
  { id: 'users', label: 'Users', icon: HiOutlineUsers },
];

// ── Role constants (shared across Users tab) ────────────────────
const USER_ROLES = ['Admin', 'Accounts', 'CA', 'Accountant', 'HR', 'Sales', 'Purchase', 'Master', 'Viewer'];

const USER_ROLE_COLORS = {
  Admin:      { bg: 'bg-red-50',     text: 'text-red-700' },
  Accounts:   { bg: 'bg-blue-50',    text: 'text-blue-700' },
  CA:         { bg: 'bg-indigo-50',  text: 'text-indigo-700' },
  Accountant: { bg: 'bg-cyan-50',    text: 'text-cyan-700' },
  HR:         { bg: 'bg-purple-50',  text: 'text-purple-700' },
  Sales:      { bg: 'bg-green-50',   text: 'text-green-700' },
  Purchase:   { bg: 'bg-orange-50',  text: 'text-orange-700' },
  Master:     { bg: 'bg-amber-50',   text: 'text-amber-700' },
  Viewer:     { bg: 'bg-gray-100',   text: 'text-gray-600' },
};

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'JPY', 'CAD', 'AUD'];
const DATE_FORMATS = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD', 'DD-MMM-YYYY'];
const NUMBER_FORMATS = [
  'Indian (1,23,456.00)',
  'Indian No Decimal (1,23,456)',
  'International (123,456.00)',
  'International No Decimal (123,456)',
  'Swiss (123\'456.00)',
  'European (123.456,00)',
  'Plain (123456.00)',
  'Plain No Decimal (123456)',
  'Indian 3-Decimal (1,23,456.000)',
  'International 3-Decimal (123,456.000)',
  'Accounting (1,23,456.00 CR/DR)',
  'South Asian (1,23,45,678.00)',
];
const GST_RATES = ['0', '5', '12', '18', '28'];

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Chandigarh', 'Puducherry',
];

const INITIAL_SETTINGS = {
  // General
  base_currency: 'INR',
  date_format: 'DD/MM/YYYY',
  number_format: 'Indian (1,23,456.00)',
  // Invoice
  invoice_prefix: 'INV-',
  invoice_next_number: 1,
  invoice_padding: 4,
  invoice_default_terms: 'Payment due within 30 days from the date of invoice.',
  // Quotation
  quotation_prefix: 'QT-',
  quotation_next_number: 1,
  quotation_validity_days: 30,
  // Bill
  bill_prefix: 'BILL-',
  bill_next_number: 1,
  // Tax
  default_gst_rate: '18',
  company_state: 'Haryana',
  lut_number: '',
  // Email
  smtp_host: '',
  smtp_port: '587',
  smtp_username: '',
  smtp_from_email: '',
  smtp_from_name: '',
  // Notifications
  notify_invoice_created: true,
  notify_payment_received: true,
  notify_bill_due: true,
  notify_low_stock: false,
};

// ── Shared Form Components ────────────────────────────────────────

function FormInput({ label, name, value, onChange, type = 'text', placeholder, disabled, hint }) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-[#333] mb-1.5">{label}</label>
      <input
        id={name}
        name={name}
        type={type}
        value={value ?? ''}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC] disabled:bg-gray-50 disabled:text-[#6B7280] transition-colors"
      />
      {hint && <p className="text-xs text-[#9CA3AF] mt-1">{hint}</p>}
    </div>
  );
}

function FormSelect({ label, name, value, onChange, options, hint }) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-[#333] mb-1.5">{label}</label>
      <select
        id={name}
        name={name}
        value={value ?? ''}
        onChange={onChange}
        className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC] bg-white transition-colors"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
      {hint && <p className="text-xs text-[#9CA3AF] mt-1">{hint}</p>}
    </div>
  );
}

function FormTextarea({ label, name, value, onChange, placeholder, rows = 3 }) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-[#333] mb-1.5">{label}</label>
      <textarea
        id={name}
        name={name}
        value={value ?? ''}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC] resize-none transition-colors"
      />
    </div>
  );
}

function FormToggle({ label, name, checked, onChange, description }) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm font-medium text-[#333]">{label}</p>
        {description && <p className="text-xs text-[#6B7280] mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange({ target: { name, value: !checked } })}
        className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${
          checked ? 'bg-[#0071DC]' : 'bg-gray-300'
        }`}
      >
        <span
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  );
}

function SectionSaveButton({ onSave, saving, label = 'Save Settings' }) {
  return (
    <div className="pt-4 mt-4 border-t border-[#E5E7EB] flex justify-end">
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-[#0071DC] rounded-lg hover:bg-[#005BB5] transition-colors disabled:opacity-50 cursor-pointer"
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
            {label}
          </>
        )}
      </button>
    </div>
  );
}

// ── Tab Content Sections ──────────────────────────────────────────

function GeneralSection({ settings, onChange, onSave, saving }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-[#6B7280] mb-4">Configure general application preferences</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormSelect
          label="Base Currency"
          name="base_currency"
          value={settings.base_currency}
          onChange={onChange}
          options={CURRENCIES}
        />
        <FormSelect
          label="Date Format"
          name="date_format"
          value={settings.date_format}
          onChange={onChange}
          options={DATE_FORMATS}
        />
        <FormSelect
          label="Number Format"
          name="number_format"
          value={settings.number_format}
          onChange={onChange}
          options={NUMBER_FORMATS}
          hint="Controls how numbers and amounts are formatted"
        />
      </div>
      <SectionSaveButton onSave={onSave} saving={saving} />
    </div>
  );
}

function InvoiceSection({ settings, onChange, onSave, saving }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-[#6B7280] mb-4">Configure invoice numbering and default terms</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FormInput
          label="Invoice Prefix"
          name="invoice_prefix"
          value={settings.invoice_prefix}
          onChange={onChange}
          placeholder="INV-"
          hint="e.g. INV-, NVD/INV/"
        />
        <FormInput
          label="Next Invoice Number"
          name="invoice_next_number"
          value={settings.invoice_next_number}
          onChange={onChange}
          type="number"
          hint="Auto-incremented for each invoice"
        />
        <FormInput
          label="Number Padding"
          name="invoice_padding"
          value={settings.invoice_padding}
          onChange={onChange}
          type="number"
          hint="e.g. 4 gives INV-0001"
        />
      </div>
      <div className="mt-2 bg-gray-50 rounded-lg px-4 py-3">
        <p className="text-xs text-[#6B7280]">
          Preview: <span className="font-mono font-medium text-[#333]">
            {settings.invoice_prefix}{String(settings.invoice_next_number || 1).padStart(settings.invoice_padding || 4, '0')}
          </span>
        </p>
      </div>
      <FormTextarea
        label="Default Invoice Terms"
        name="invoice_default_terms"
        value={settings.invoice_default_terms}
        onChange={onChange}
        placeholder="Enter default terms and conditions for invoices"
      />
      <SectionSaveButton onSave={onSave} saving={saving} />
    </div>
  );
}

function QuotationSection({ settings, onChange, onSave, saving }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-[#6B7280] mb-4">Configure quotation numbering and validity</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FormInput
          label="Quotation Prefix"
          name="quotation_prefix"
          value={settings.quotation_prefix}
          onChange={onChange}
          placeholder="QT-"
        />
        <FormInput
          label="Next Quotation Number"
          name="quotation_next_number"
          value={settings.quotation_next_number}
          onChange={onChange}
          type="number"
        />
        <FormInput
          label="Validity (Days)"
          name="quotation_validity_days"
          value={settings.quotation_validity_days}
          onChange={onChange}
          type="number"
          hint="Default validity period for new quotations"
        />
      </div>
      <div className="mt-2 bg-gray-50 rounded-lg px-4 py-3">
        <p className="text-xs text-[#6B7280]">
          Preview: <span className="font-mono font-medium text-[#333]">
            {settings.quotation_prefix}{String(settings.quotation_next_number || 1).padStart(4, '0')}
          </span>
        </p>
      </div>
      <SectionSaveButton onSave={onSave} saving={saving} />
    </div>
  );
}

function BillSection({ settings, onChange, onSave, saving }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-[#6B7280] mb-4">Configure bill numbering</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormInput
          label="Bill Prefix"
          name="bill_prefix"
          value={settings.bill_prefix}
          onChange={onChange}
          placeholder="BILL-"
        />
        <FormInput
          label="Next Bill Number"
          name="bill_next_number"
          value={settings.bill_next_number}
          onChange={onChange}
          type="number"
        />
      </div>
      <div className="mt-2 bg-gray-50 rounded-lg px-4 py-3">
        <p className="text-xs text-[#6B7280]">
          Preview: <span className="font-mono font-medium text-[#333]">
            {settings.bill_prefix}{String(settings.bill_next_number || 1).padStart(4, '0')}
          </span>
        </p>
      </div>
      <SectionSaveButton onSave={onSave} saving={saving} />
    </div>
  );
}

function TaxSection({ settings, onChange, onSave, saving }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-[#6B7280] mb-4">Configure GST rates and company state for tax split</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormSelect
          label="Default GST Rate (%)"
          name="default_gst_rate"
          value={settings.default_gst_rate}
          onChange={onChange}
          options={GST_RATES}
          hint="Applied by default on new line items"
        />
        <FormSelect
          label="Company State"
          name="company_state"
          value={settings.company_state}
          onChange={onChange}
          options={INDIAN_STATES}
          hint="Used to determine IGST vs CGST+SGST split"
        />
        <FormInput
          label="LUT Number (for exports)"
          name="lut_number"
          value={settings.lut_number}
          onChange={onChange}
          placeholder="Enter LUT number"
          hint="Letter of Undertaking for zero-rated exports"
        />
      </div>
      <div className="mt-2 bg-blue-50 border border-blue-100 rounded-lg px-4 py-3">
        <div className="flex items-start gap-2">
          <HiOutlineCurrencyRupee className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
          <div className="text-xs text-blue-700">
            <p className="font-medium">Tax Split Logic</p>
            <p className="mt-0.5">
              When the customer&apos;s state matches &ldquo;{settings.company_state}&rdquo;, tax is split into CGST + SGST.
              For inter-state transactions, IGST is applied instead.
            </p>
          </div>
        </div>
      </div>
      <SectionSaveButton onSave={onSave} saving={saving} />
    </div>
  );
}

function EmailSection({ settings, onChange, onSave, saving }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-[#6B7280] mb-4">Configure SMTP settings for sending emails (invoices, reminders)</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormInput
          label="SMTP Host"
          name="smtp_host"
          value={settings.smtp_host}
          onChange={onChange}
          placeholder="smtp.gmail.com"
        />
        <FormInput
          label="SMTP Port"
          name="smtp_port"
          value={settings.smtp_port}
          onChange={onChange}
          placeholder="587"
        />
        <FormInput
          label="SMTP Username"
          name="smtp_username"
          value={settings.smtp_username}
          onChange={onChange}
          placeholder="your-email@company.com"
        />
        <FormInput
          label="From Email"
          name="smtp_from_email"
          value={settings.smtp_from_email}
          onChange={onChange}
          placeholder="noreply@company.com"
        />
        <FormInput
          label="From Name"
          name="smtp_from_name"
          value={settings.smtp_from_name}
          onChange={onChange}
          placeholder="Navodita ERP"
        />
      </div>
      <div className="mt-2 bg-amber-50 border border-amber-100 rounded-lg px-4 py-3">
        <div className="flex items-start gap-2">
          <HiOutlineEnvelope className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-700">
            Email sending is currently in development. These settings will be used once the email module is activated.
          </p>
        </div>
      </div>
      <SectionSaveButton onSave={onSave} saving={saving} />
    </div>
  );
}

function NotificationsSection({ settings, onChange, onSave, saving }) {
  return (
    <div className="space-y-1">
      <p className="text-sm text-[#6B7280] mb-4">Control which notifications you receive</p>
      <div className="divide-y divide-gray-100">
        <FormToggle
          label="Invoice Created"
          name="notify_invoice_created"
          checked={settings.notify_invoice_created}
          onChange={onChange}
          description="Get notified when a new invoice is created"
        />
        <FormToggle
          label="Payment Received"
          name="notify_payment_received"
          checked={settings.notify_payment_received}
          onChange={onChange}
          description="Get notified when a payment is recorded"
        />
        <FormToggle
          label="Bill Due Reminder"
          name="notify_bill_due"
          checked={settings.notify_bill_due}
          onChange={onChange}
          description="Reminder when bills are approaching due date"
        />
        <FormToggle
          label="Low Stock Alert"
          name="notify_low_stock"
          checked={settings.notify_low_stock}
          onChange={onChange}
          description="Alert when inventory items go below reorder level"
        />
      </div>
      <div className="mt-2 bg-amber-50 border border-amber-100 rounded-lg px-4 py-3">
        <div className="flex items-start gap-2">
          <HiOutlineBellAlert className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-700">
            Notification delivery is currently in development. These preferences will be applied once the notification system is activated.
          </p>
        </div>
      </div>
      <SectionSaveButton onSave={onSave} saving={saving} />
    </div>
  );
}



// ── Users Section ──────────────────────────────────────────────────

function UserFormModal({ isOpen, onClose, onSave, editUser }) {
  const isEdit = !!editUser;
  const [form, setForm] = useState({ username: '', full_name: '', email: '', role: 'Viewer', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editUser) {
      setForm({ username: editUser.username || '', full_name: editUser.full_name || '', email: editUser.email || '', role: editUser.role || 'Viewer', password: '' });
    } else {
      setForm({ username: '', full_name: '', email: '', role: 'Viewer', password: '' });
    }
    setShowPw(false);
  }, [editUser, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username.trim() || !form.full_name.trim()) { toast.error('Username and full name are required'); return; }
    if (!isEdit && form.password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    if (isEdit && form.password && form.password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.password) delete payload.password;
      if (isEdit) {
        await apiClient.put(`/users/${editUser.id}`, payload);
        toast.success('User updated');
      } else {
        await apiClient.post('/users', payload);
        toast.success('User created');
      }
      onSave();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save user');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E7EB]">
          <h3 className="text-base font-semibold text-[#333]">{isEdit ? 'Edit User' : 'Add New User'}</h3>
          <button onClick={onClose} className="text-[#9CA3AF] hover:text-[#333] cursor-pointer"><HiOutlineXMark className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#6B7280] mb-1">Username *</label>
              <input
                type="text"
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                disabled={isEdit}
                placeholder="e.g. john.doe"
                className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC] disabled:bg-gray-50 disabled:text-gray-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6B7280] mb-1">Full Name *</label>
              <input
                type="text"
                value={form.full_name}
                onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                placeholder="Display name"
                className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#6B7280] mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="user@company.com"
              className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#6B7280] mb-1">Role</label>
            <select
              value={form.role}
              onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
              className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
            >
              {USER_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#6B7280] mb-1">
              {isEdit ? 'New Password (leave blank to keep current)' : 'Password *'}
            </label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder={isEdit ? 'Leave blank to keep current' : 'Min 6 characters'}
                autoComplete="new-password"
                className="w-full px-3 py-2 pr-10 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
              />
              <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPw ? <HiOutlineEyeSlash className="w-4 h-4" /> : <HiOutlineEye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-[#E5E7EB]">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-[#6B7280] border border-[#E5E7EB] rounded-lg hover:bg-gray-50 cursor-pointer">Cancel</button>
            <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-[#0071DC] rounded-lg hover:bg-[#005BB5] disabled:opacity-50 cursor-pointer">
              {saving ? <><svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Saving...</> : isEdit ? 'Update User' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function UsersSection() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: 100 });
      if (search) params.set('search', search);
      if (roleFilter) params.set('role', roleFilter);
      const res = await apiClient.get(`/users?${params}`);
      setUsers(res.data?.data || []);
    } catch (err) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleDelete = async (user) => {
    setDeleting(true);
    try {
      await apiClient.delete(`/users/${user.id}`);
      toast.success(`User ${user.username} deactivated`);
      setDeleteConfirm(null);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to deactivate user');
    } finally {
      setDeleting(false);
    }
  };

  const openAdd = () => { setEditUser(null); setModalOpen(true); };
  const openEdit = (u) => { setEditUser(u); setModalOpen(true); };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-[#6B7280]">Manage team members and their access roles</p>
        <button onClick={openAdd} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#0071DC] rounded-lg hover:bg-[#005BB5] transition-colors cursor-pointer">
          <HiOutlineUserPlus className="w-4 h-4" />
          Add User
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name, username, email..."
            className="w-full pl-9 pr-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
          />
        </div>
        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          className="px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC] min-w-32"
        >
          <option value="">All Roles</option>
          {USER_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      {/* Users Table */}
      {loading ? (
        <LoadingSpinner size="sm" label="Loading users..." />
      ) : users.length === 0 ? (
        <div className="text-center py-10 text-sm text-[#9CA3AF]">No users found</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[#E5E7EB]">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">User</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Role</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Last Login</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {users.map(user => {
                const roleStyle = USER_ROLE_COLORS[user.role] || USER_ROLE_COLORS.Viewer;
                return (
                  <tr key={user.id} className="hover:bg-[#F9FAFB] transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-[#333]">{user.full_name || user.display_name}</div>
                      <div className="text-xs text-[#9CA3AF]">@{user.username}{user.email ? ` · ${user.email}` : ''}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${roleStyle.bg} ${roleStyle.text}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {user.is_active ? (
                        <span className="inline-flex items-center gap-1 text-xs text-green-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-400 inline-block" />Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#6B7280]">
                      {user.last_login_at
                        ? new Date(user.last_login_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                        : 'Never'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEdit(user)} title="Edit user" className="p-1.5 text-[#6B7280] hover:text-[#0071DC] hover:bg-blue-50 rounded cursor-pointer transition-colors">
                          <HiOutlinePencilSquare className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleteConfirm(user)} title="Deactivate user" className="p-1.5 text-[#6B7280] hover:text-red-600 hover:bg-red-50 rounded cursor-pointer transition-colors">
                          <HiOutlineTrash className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Role Legend */}
      <div className="pt-3 border-t border-[#E5E7EB]">
        <p className="text-xs font-medium text-[#6B7280] mb-2">Role Reference</p>
        <div className="flex flex-wrap gap-2">
          {USER_ROLES.map(r => {
            const s = USER_ROLE_COLORS[r] || USER_ROLE_COLORS.Viewer;
            return (
              <span key={r} className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>{r}</span>
            );
          })}
        </div>
      </div>

      {/* Add/Edit Modal */}
      <UserFormModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditUser(null); }}
        onSave={fetchUsers}
        editUser={editUser}
      />

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                <HiOutlineExclamationTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#333]">Deactivate User</h3>
                <p className="text-xs text-[#6B7280]">This will disable login for this user</p>
              </div>
            </div>
            <p className="text-sm text-[#333] mb-4">
              Are you sure you want to deactivate <strong>{deleteConfirm.full_name || deleteConfirm.username}</strong>?
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm text-[#6B7280] border border-[#E5E7EB] rounded-lg hover:bg-gray-50 cursor-pointer">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} disabled={deleting} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 cursor-pointer">
                {deleting ? 'Deactivating...' : 'Deactivate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SecuritySection() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChangePassword = async () => {
    if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      toast.error('Please fill in all password fields.');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match.');
      return;
    }

    if (currentPassword === newPassword) {
      toast.error('New password must be different from current password.');
      return;
    }

    setChangingPassword(true);
    try {
      await apiClient.post('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      toast.success('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      const message =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Failed to change password. Please try again.';
      toast.error(message);
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-[#6B7280] mb-4">Manage your account security and password</p>

      {/* Change Password */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-[#333]">Change Password</h3>

        <div className="grid grid-cols-1 gap-4 max-w-md">
          {/* Current Password */}
          <div>
            <label htmlFor="settings-current-password" className="block text-sm font-medium text-[#333] mb-1.5">
              Current Password
            </label>
            <div className="relative">
              <input
                id="settings-current-password"
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter your current password"
                autoComplete="current-password"
                className="w-full px-3 py-2 pr-10 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
              >
                {showCurrentPassword ? (
                  <HiOutlineEyeSlash className="w-4 h-4" />
                ) : (
                  <HiOutlineEye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label htmlFor="settings-new-password" className="block text-sm font-medium text-[#333] mb-1.5">
              New Password
            </label>
            <div className="relative">
              <input
                id="settings-new-password"
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                autoComplete="new-password"
                className="w-full px-3 py-2 pr-10 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
              >
                {showNewPassword ? (
                  <HiOutlineEyeSlash className="w-4 h-4" />
                ) : (
                  <HiOutlineEye className="w-4 h-4" />
                )}
              </button>
            </div>
            {newPassword.length > 0 && newPassword.length < 6 && (
              <p className="text-xs text-red-500 mt-1">Password must be at least 6 characters</p>
            )}
          </div>

          {/* Confirm New Password */}
          <div>
            <label htmlFor="settings-confirm-password" className="block text-sm font-medium text-[#333] mb-1.5">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                id="settings-confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your new password"
                autoComplete="new-password"
                className="w-full px-3 py-2 pr-10 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
              >
                {showConfirmPassword ? (
                  <HiOutlineEyeSlash className="w-4 h-4" />
                ) : (
                  <HiOutlineEye className="w-4 h-4" />
                )}
              </button>
            </div>
            {confirmPassword.length > 0 && newPassword !== confirmPassword && (
              <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
            )}
          </div>
        </div>

        <div className="pt-4 mt-4 border-t border-[#E5E7EB] flex justify-end">
          <button
            type="button"
            onClick={handleChangePassword}
            disabled={changingPassword}
            className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-[#0071DC] rounded-lg hover:bg-[#005BB5] transition-colors disabled:opacity-50 cursor-pointer"
          >
            {changingPassword ? (
              <>
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Changing...
              </>
            ) : (
              <>
                <HiOutlineLockClosed className="w-4 h-4" />
                Change Password
              </>
            )}
          </button>
        </div>
      </div>

      {/* Account Security Info */}
      <div className="mt-6 bg-blue-50 border border-blue-100 rounded-lg px-4 py-3">
        <div className="flex items-start gap-2">
          <HiOutlineLockClosed className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
          <div className="text-xs text-blue-700">
            <p className="font-medium">Password Requirements</p>
            <ul className="mt-1 space-y-0.5 list-disc list-inside">
              <li>Minimum 6 characters</li>
              <li>Account locks after 5 failed login attempts for 30 minutes</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Biometric / Fingerprint Setup */}
      <div className="mt-6 pt-6 border-t border-[#E5E7EB]">
        <BiometricSetup />
      </div>
    </div>
  );
}

// ── AI Configuration Section ──────────────────────────────────────

function AIConfigurationSection() {
  const [geminiKey, setGeminiKey] = useState('');
  const [groqKey, setGroqKey] = useState('');
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showGroqKey, setShowGroqKey] = useState(false);
  const [savingKeys, setSavingKeys] = useState(false);
  const [keyStatus, setKeyStatus] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  // Fetch current key status on mount
  useEffect(() => {
    const fetchKeyStatus = async () => {
      try {
        const res = await apiClient.get('/ai/keys');
        setKeyStatus(res.data.data || res.data);
      } catch {
        setKeyStatus(null);
      } finally {
        setLoadingStatus(false);
      }
    };
    fetchKeyStatus();
  }, []);

  const handleSaveKeys = async () => {
    if (!geminiKey.trim() && !groqKey.trim()) {
      toast.error('Please enter at least one API key.');
      return;
    }

    setSavingKeys(true);
    try {
      const payload = {};
      if (geminiKey.trim()) payload.gemini_api_key = geminiKey.trim();
      if (groqKey.trim()) payload.groq_api_key = groqKey.trim();

      const res = await apiClient.put('/ai/keys', payload);
      setKeyStatus(res.data.data || res.data);
      setGeminiKey('');
      setGroqKey('');
      toast.success('AI API keys saved successfully');
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Failed to save API keys';
      toast.error(msg);
    } finally {
      setSavingKeys(false);
    }
  };

  const StatusIndicator = ({ configured, source }) => {
    if (configured) {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-2.5 py-0.5">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
          Configured {source ? `(${source})` : ''}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 bg-gray-50 border border-gray-200 rounded-full px-2.5 py-0.5">
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
        Not configured
      </span>
    );
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-[#6B7280] mb-4">
        Configure AI API keys for the AI Assistant. Keys stored here take priority over environment variables.
      </p>

      {/* Current Status */}
      {loadingStatus ? (
        <div className="flex items-center gap-2 text-sm text-[#6B7280]">
          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Checking AI configuration...
        </div>
      ) : (
        <div className="bg-gray-50 rounded-lg border border-[#E5E7EB] p-4">
          <h3 className="text-sm font-semibold text-[#333] mb-3">Current Status</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-[#333] font-medium">Google Gemini</span>
                {keyStatus?.gemini?.masked && (
                  <span className="text-xs font-mono text-[#6B7280] bg-white border border-[#E5E7EB] rounded px-2 py-0.5">
                    {keyStatus.gemini.masked}
                  </span>
                )}
              </div>
              <StatusIndicator
                configured={keyStatus?.gemini?.configured}
                source={keyStatus?.gemini?.source}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-[#333] font-medium">Groq</span>
                {keyStatus?.groq?.masked && (
                  <span className="text-xs font-mono text-[#6B7280] bg-white border border-[#E5E7EB] rounded px-2 py-0.5">
                    {keyStatus.groq.masked}
                  </span>
                )}
              </div>
              <StatusIndicator
                configured={keyStatus?.groq?.configured}
                source={keyStatus?.groq?.source}
              />
            </div>
          </div>
        </div>
      )}

      {/* API Key Inputs */}
      <div className="space-y-4 mt-4">
        <h3 className="text-sm font-semibold text-[#333]">Update API Keys</h3>
        <p className="text-xs text-[#6B7280]">
          Enter new keys below to save them to the database. Leave a field empty to keep the current key unchanged.
        </p>

        {/* Gemini API Key */}
        <div>
          <label htmlFor="ai-gemini-key" className="block text-sm font-medium text-[#333] mb-1.5">
            Gemini API Key
          </label>
          <div className="relative">
            <input
              id="ai-gemini-key"
              type={showGeminiKey ? 'text' : 'password'}
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              placeholder={keyStatus?.gemini?.configured ? 'Enter new key to replace existing' : 'Enter your Gemini API key'}
              className="w-full px-3 py-2 pr-10 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC] transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowGeminiKey(!showGeminiKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              tabIndex={-1}
            >
              {showGeminiKey ? (
                <HiOutlineEyeSlash className="w-4 h-4" />
              ) : (
                <HiOutlineEye className="w-4 h-4" />
              )}
            </button>
          </div>
          <p className="text-xs text-[#9CA3AF] mt-1">
            Get your API key from{' '}
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#0071DC] hover:underline inline-flex items-center gap-0.5"
            >
              Google AI Studio
              <HiOutlineArrowTopRightOnSquare className="w-3 h-3" />
            </a>
          </p>
        </div>

        {/* Groq API Key */}
        <div>
          <label htmlFor="ai-groq-key" className="block text-sm font-medium text-[#333] mb-1.5">
            Groq API Key
          </label>
          <div className="relative">
            <input
              id="ai-groq-key"
              type={showGroqKey ? 'text' : 'password'}
              value={groqKey}
              onChange={(e) => setGroqKey(e.target.value)}
              placeholder={keyStatus?.groq?.configured ? 'Enter new key to replace existing' : 'Enter your Groq API key'}
              className="w-full px-3 py-2 pr-10 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC] transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowGroqKey(!showGroqKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              tabIndex={-1}
            >
              {showGroqKey ? (
                <HiOutlineEyeSlash className="w-4 h-4" />
              ) : (
                <HiOutlineEye className="w-4 h-4" />
              )}
            </button>
          </div>
          <p className="text-xs text-[#9CA3AF] mt-1">
            Get your API key from{' '}
            <a
              href="https://console.groq.com/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#0071DC] hover:underline inline-flex items-center gap-0.5"
            >
              Groq Console
              <HiOutlineArrowTopRightOnSquare className="w-3 h-3" />
            </a>
          </p>
        </div>
      </div>

      {/* Info Box */}
      <div className="mt-4 bg-blue-50 border border-blue-100 rounded-lg px-4 py-3">
        <div className="flex items-start gap-2">
          <HiOutlineSparkles className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
          <div className="text-xs text-blue-700">
            <p className="font-medium">How AI Keys Work</p>
            <ul className="mt-1 space-y-0.5 list-disc list-inside">
              <li>Keys saved here are stored in the database and take priority over .env variables</li>
              <li>Gemini (Google) is used as the primary AI provider</li>
              <li>Groq is used as a fallback if Gemini is unavailable</li>
              <li>If no keys are configured, the AI Assistant runs in offline mode with limited responses</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Warning about security */}
      <div className="bg-amber-50 border border-amber-100 rounded-lg px-4 py-3">
        <div className="flex items-start gap-2">
          <HiOutlineExclamationTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-700">
            API keys are stored securely in your database. Never share your API keys publicly.
            You can also set keys via environment variables (GEMINI_API_KEY, GROQ_API_KEY) in your .env file as an alternative.
          </p>
        </div>
      </div>

      {/* Save Button */}
      <div className="pt-4 mt-4 border-t border-[#E5E7EB] flex justify-end">
        <button
          type="button"
          onClick={handleSaveKeys}
          disabled={savingKeys || (!geminiKey.trim() && !groqKey.trim())}
          className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-[#0071DC] rounded-lg hover:bg-[#005BB5] transition-colors disabled:opacity-50 cursor-pointer"
        >
          {savingKeys ? (
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
              Save API Keys
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ── Main Settings Page ────────────────────────────────────────────

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState(INITIAL_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ── Fetch Settings ──────────────────────────────────────────────

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      // Try /settings first, fallback to company data
      let data = null;
      try {
        const res = await apiClient.get('/settings');
        data = res.data.data || res.data;
      } catch {
        // Settings endpoint may not exist yet, try company
        try {
          const res = await apiClient.get('/company');
          data = res.data.data || res.data;
        } catch {
          // Use defaults
        }
      }

      // Also fetch invoice number settings
      try {
        const numRes = await apiClient.get('/invoice-number-settings');
        const numData = numRes.data.data || numRes.data;
        if (numData) {
          data = { ...data, ...numData };
        }
      } catch {
        // Optional endpoint
      }

      if (data) {
        setSettings((prev) => ({
          ...prev,
          ...Object.fromEntries(
            Object.entries(data).filter(([key]) => key in INITIAL_SETTINGS)
          ),
        }));
      }
    } catch {
      // Use defaults
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // ── Handlers ────────────────────────────────────────────────────

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSettings((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiClient.put('/settings', settings);
      toast.success('Settings saved successfully');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to save settings';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // ── Loading ─────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="py-20">
        <LoadingSpinner size="lg" label="Loading settings..." />
      </div>
    );
  }

  // ── Render active tab content ───────────────────────────────────

  function renderTabContent() {
    switch (activeTab) {
      case 'general':
        return <GeneralSection settings={settings} onChange={handleChange} onSave={handleSave} saving={saving} />;
      case 'invoice':
        return <InvoiceSection settings={settings} onChange={handleChange} onSave={handleSave} saving={saving} />;
      case 'quotation':
        return <QuotationSection settings={settings} onChange={handleChange} onSave={handleSave} saving={saving} />;
      case 'bill':
        return <BillSection settings={settings} onChange={handleChange} onSave={handleSave} saving={saving} />;
      case 'tax':
        return <TaxSection settings={settings} onChange={handleChange} onSave={handleSave} saving={saving} />;
      case 'email':
        return <EmailSection settings={settings} onChange={handleChange} onSave={handleSave} saving={saving} />;
      case 'notifications':
        return <NotificationsSection settings={settings} onChange={handleChange} onSave={handleSave} saving={saving} />;
      case 'ai':
        return <AIConfigurationSection />;
      case 'security':
        return <SecuritySection />;
      case 'users':
        return <UsersSection />;
      default:
        return null;
    }
  }

  return (
    <div className="pb-8">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#333]">Settings</h1>
          <p className="text-sm text-[#6B7280] mt-1">
            Configure application preferences and document numbering
          </p>
        </div>
        <button
          onClick={fetchSettings}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-[#6B7280] border border-[#E5E7EB] rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
          title="Reload settings"
        >
          <HiOutlineArrowPath className="w-4 h-4" />
          Reload
        </button>
      </div>

      {/* Settings Layout: Sidebar Tabs + Content */}
      <div className="flex flex-col md:flex-row gap-6">
        {/* Tab Navigation */}
        <div className="w-full md:w-56 shrink-0">
          <nav className="bg-white rounded-lg border border-[#E5E7EB] overflow-hidden">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors cursor-pointer border-b border-[#E5E7EB] last:border-b-0 ${
                    isActive
                      ? 'bg-[#0071DC]/5 text-[#0071DC] border-l-2 border-l-[#0071DC]'
                      : 'text-[#6B7280] hover:text-[#333] hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-lg border border-[#E5E7EB] p-6">
            <div className="flex items-center gap-3 mb-5 pb-3 border-b border-[#E5E7EB]">
              {(() => {
                const activeTabData = TABS.find((t) => t.id === activeTab);
                const Icon = activeTabData?.icon || HiOutlineCog6Tooth;
                return (
                  <>
                    <div className="w-9 h-9 rounded-lg bg-[#0071DC]/10 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-[#0071DC]" />
                    </div>
                    <h2 className="text-base font-semibold text-[#333]">
                      {activeTabData?.label || 'Settings'} Settings
                    </h2>
                  </>
                );
              })()}
            </div>
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
