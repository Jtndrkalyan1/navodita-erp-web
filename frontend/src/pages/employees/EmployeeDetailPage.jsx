import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  HiOutlineArrowLeft,
  HiOutlinePencilSquare,
  HiOutlineTrash,
  HiOutlineEnvelope,
  HiOutlinePhone,
  HiOutlineMapPin,
  HiOutlineDocumentText,
  HiOutlineBanknotes,
  HiOutlineCurrencyRupee,
  HiOutlineExclamationTriangle,
  HiOutlineBriefcase,
  HiOutlineIdentification,
  HiOutlineBuildingLibrary,
  HiOutlineShieldCheck,
  HiOutlineUserCircle,
  HiOutlineCalendarDays,
  HiOutlineClipboardDocumentList,
  HiOutlineCamera,
  HiOutlinePrinter,
  HiOutlineXMark,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import apiClient from '../../api/client';
import { openPdf, printPdf } from '../../utils/pdf';

/* ─── Helpers ──────────────────────────────────────────────────────────── */

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

function getInitials(name) {
  if (!name || name === '--') return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/* ─── Reusable Sub-components ──────────────────────────────────────────── */

function InfoRow({ label, value, icon: Icon }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      {Icon && <Icon className="w-4 h-4 text-[#6B7280] mt-0.5 flex-shrink-0" />}
      <div className="min-w-0">
        <p className="text-xs text-[#6B7280] font-medium uppercase tracking-wide">{label}</p>
        <p className="text-sm text-[#333] mt-0.5 break-words">{value || '--'}</p>
      </div>
    </div>
  );
}

function StatusBadge({ isActive }) {
  if (isActive === false || isActive === 0) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
        Inactive
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
      Active
    </span>
  );
}

function SalaryStatusBadge({ status }) {
  const styles = {
    Draft: 'bg-gray-100 text-gray-700 border-gray-200',
    Approved: 'bg-blue-50 text-blue-700 border-blue-200',
    Paid: 'bg-green-50 text-green-700 border-green-200',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${styles[status] || styles.Draft}`}>
      {status || 'Draft'}
    </span>
  );
}

const MONTH_NAMES = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/* ─── Main Component ───────────────────────────────────────────────────── */

export default function EmployeeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState('personal');
  const [photoUrl, setPhotoUrl] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showIdCardModal, setShowIdCardModal] = useState(false);
  const [companyProfile, setCompanyProfile] = useState({});
  const photoInputRef = useRef(null);

  // Fetch company profile for ID card rendering (single source of truth)
  useEffect(() => {
    apiClient.get('/company')
      .then(res => setCompanyProfile(res.data?.data || res.data || {}))
      .catch(() => setCompanyProfile({}));
  }, []);

  useEffect(() => {
    const fetchEmployee = async () => {
      setLoading(true);
      try {
        const response = await apiClient.get(`/employees/${id}`);
        const data = response.data?.data;
        if (!data) {
          toast.error('Employee not found');
          navigate('/employees');
          return;
        }
        setEmployee(data);
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
  }, [id, navigate]);

  // Fetch employee photo
  useEffect(() => {
    if (!id) return;
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
        // No photo available, keep placeholder
      }
    };
    fetchPhoto();
  }, [id]);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file (JPG, PNG, etc.)');
      return;
    }
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Photo must be smaller than 5MB');
      return;
    }

    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('entity_type', 'employee');
      formData.append('entity_id', id);
      formData.append('category', 'photo');

      const response = await apiClient.post('/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const doc = response.data?.data || response.data;
      const url = doc?.file_url || doc?.url || doc?.file_path;
      if (url) {
        setPhotoUrl(url);
      } else {
        // Use local preview as fallback
        setPhotoUrl(URL.createObjectURL(file));
      }
      toast.success('Photo uploaded successfully');
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Failed to upload photo';
      toast.error(msg);
    } finally {
      setUploadingPhoto(false);
      // Reset input so same file can be re-uploaded
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await apiClient.delete(`/employees/${id}`);
      toast.success('Employee deleted successfully');
      navigate('/employees');
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Failed to delete employee';
      toast.error(msg);
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  /* ── Loading state ─────────────────────────────────────────────────── */

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#0071DC] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-[#6B7280]">Loading employee details...</span>
        </div>
      </div>
    );
  }

  if (!employee) return null;

  const displayName = employee.display_name || [employee.first_name, employee.last_name].filter(Boolean).join(' ') || '--';

  return (
    <div>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/employees')}
            className="p-2 rounded-lg hover:bg-[#F3F4F6] transition-colors"
            title="Back to employees"
          >
            <HiOutlineArrowLeft className="w-5 h-5 text-[#6B7280]" />
          </button>
          <div className="flex items-center gap-4">
            {/* Uploadable Photo */}
            <div
              className="relative group cursor-pointer"
              onClick={() => !uploadingPhoto && photoInputRef.current?.click()}
              title="Click to upload photo"
            >
              <div className="w-20 h-20 rounded-full bg-[#E5E7EB] flex items-center justify-center overflow-hidden border-2 border-white shadow-md">
                {photoUrl ? (
                  <img src={photoUrl} alt={displayName} className="w-20 h-20 rounded-full object-cover" />
                ) : (
                  <span className="text-2xl font-bold text-[#6B7280]">
                    {getInitials(displayName)}
                  </span>
                )}
              </div>
              <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                {uploadingPhoto ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <HiOutlineCamera className="w-5 h-5 text-white" />
                )}
              </div>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
              />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold text-[#333]">{displayName}</h1>
                <StatusBadge isActive={employee.is_active} />
              </div>
              {employee.designation && (
                <p className="text-sm text-[#6B7280] mt-0.5">
                  {employee.designation}
                  {employee.department_name ? ` - ${employee.department_name}` : ''}
                </p>
              )}
              {employee.employee_id && (
                <p className="text-xs text-[#9CA3AF] font-mono mt-0.5">{employee.employee_id}</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => printPdf(`/api/pdf/employee/${id}`)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--zoho-text-secondary)] bg-white border border-[var(--zoho-border)] px-3 py-2 rounded-md hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <HiOutlinePrinter className="w-4 h-4" />
            Print
          </button>
          <button
            onClick={() => openPdf(`/api/pdf/employee/${id}`)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--zoho-text-secondary)] bg-white border border-[var(--zoho-border)] px-3 py-2 rounded-md hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <HiOutlineDocumentText className="w-4 h-4" />
            PDF
          </button>
          <button
            onClick={() => openPdf(`/api/pdf/employee-card/${id}`)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-[#0071DC] bg-white border border-[#0071DC]/30 rounded-lg hover:bg-[#0071DC]/5 transition-colors cursor-pointer"
          >
            <HiOutlineIdentification className="w-4 h-4" />
            ID Card
          </button>
          <button
            onClick={() => printPdf(`/api/pdf/employee-card/${id}`)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-[#0071DC] bg-white border border-[#0071DC]/30 rounded-lg hover:bg-[#0071DC]/5 transition-colors cursor-pointer"
          >
            <HiOutlinePrinter className="w-4 h-4" />
            Print Card
          </button>
          <button
            onClick={() => setShowIdCardModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-[#0071DC] bg-white border border-[#0071DC]/30 rounded-lg hover:bg-[#0071DC]/5 transition-colors"
          >
            <HiOutlineIdentification className="w-4 h-4" />
            View ID Card
          </button>
          <Link
            to={`/employees/${id}/edit`}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-[#333] bg-white border border-[#E5E7EB] rounded-lg hover:bg-[#F9FAFB] transition-colors"
          >
            <HiOutlinePencilSquare className="w-4 h-4" />
            Edit
          </Link>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
          >
            <HiOutlineTrash className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>

      {/* ── Salary Summary Cards ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-4">
          <p className="text-xs text-[#6B7280] font-medium uppercase tracking-wide">Basic Salary</p>
          <p className="text-xl font-semibold text-[#333] mt-1">{formatIndianCurrency(employee.basic_salary)}</p>
        </div>
        <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-4">
          <p className="text-xs text-[#6B7280] font-medium uppercase tracking-wide">HRA</p>
          <p className="text-xl font-semibold text-[#333] mt-1">{formatIndianCurrency(employee.hra)}</p>
        </div>
        <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-4">
          <p className="text-xs text-[#6B7280] font-medium uppercase tracking-wide">Special Allowance</p>
          <p className="text-xl font-semibold text-[#333] mt-1">{formatIndianCurrency(employee.special_allowance)}</p>
        </div>
        <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-4">
          <p className="text-xs text-[#6B7280] font-medium uppercase tracking-wide">CTC</p>
          <p className="text-xl font-semibold text-[#0071DC] mt-1">{formatIndianCurrency(employee.ctc)}</p>
        </div>
      </div>

      {/* ── Tab Navigation ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm">
        <div className="border-b border-[#E5E7EB]">
          <nav className="flex -mb-px overflow-x-auto">
            {[
              { key: 'personal', label: 'Personal Info' },
              { key: 'employment', label: 'Employment' },
              { key: 'salary', label: 'Salary & Statutory' },
              { key: 'bank', label: 'Bank Details' },
              { key: 'documents', label: 'ID Documents' },
              { key: 'salary_history', label: 'Salary History' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-6 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  activeTab === tab.key
                    ? 'border-[#0071DC] text-[#0071DC]'
                    : 'border-transparent text-[#6B7280] hover:text-[#333] hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="p-6">
          {activeTab === 'personal' && <PersonalInfoTab employee={employee} />}
          {activeTab === 'employment' && <EmploymentTab employee={employee} />}
          {activeTab === 'salary' && <SalaryStatutoryTab employee={employee} />}
          {activeTab === 'bank' && <BankDetailsTab employee={employee} />}
          {activeTab === 'documents' && <IDDocumentsTab employee={employee} />}
          {activeTab === 'salary_history' && <SalaryHistoryTab employeeId={id} />}
        </div>
      </div>

      {/* ── Activity / Timestamps ──────────────────────────────────────── */}
      <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6 mt-6">
        <h2 className="text-base font-semibold text-[#333] mb-3">Activity</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-[#6B7280]">Created</span>
            <span className="text-[#333]">{formatDate(employee.created_at)}</span>
          </div>
        </div>
      </div>

      {/* ── Delete Confirmation Modal ──────────────────────────────────── */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => !deleting && setShowDeleteModal(false)}
          />
          <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <HiOutlineExclamationTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#333]">Delete Employee</h3>
                <p className="text-sm text-[#6B7280] mt-1">
                  Are you sure you want to delete <strong>{displayName}</strong>? This
                  action cannot be undone. Employees with linked salary records cannot
                  be deleted.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-[#333] bg-white border border-[#E5E7EB] rounded-lg hover:bg-[#F9FAFB] transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {deleting && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                {deleting ? 'Deleting...' : 'Delete Employee'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Employee ID Card Modal ─────────────────────────────────────── */}
      {showIdCardModal && (
        <EmployeeIdCardModal
          employee={employee}
          photoUrl={photoUrl}
          displayName={displayName}
          onClose={() => setShowIdCardModal(false)}
        />
      )}
    </div>
  );
}

/* ─── Employee ID Card Modal ───────────────────────────────────────────── */

function EmployeeIdCardModal({ employee, photoUrl, displayName, onClose }) {
  const handlePrint = () => {
    window.print();
  };

  const joiningDate = employee.joining_date
    ? new Date(employee.joining_date).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '--';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 print:hidden" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 print:shadow-none print:rounded-none print:max-w-none print:mx-0">
        {/* Modal header - hidden on print */}
        <div className="flex items-center justify-between p-4 border-b border-[#E5E7EB] print:hidden">
          <h3 className="text-lg font-semibold text-[#333]">Employee ID Card</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[#0071DC] bg-[#0071DC]/5 border border-[#0071DC]/20 rounded-lg hover:bg-[#0071DC]/10 transition-colors"
            >
              <HiOutlinePrinter className="w-4 h-4" />
              Print Card
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-[#F3F4F6] transition-colors"
            >
              <HiOutlineXMark className="w-5 h-5 text-[#6B7280]" />
            </button>
          </div>
        </div>

        {/* ID Card */}
        <div className="p-6 flex justify-center print:p-0">
          <div
            className="w-[360px] bg-white rounded-xl overflow-hidden print:rounded-none"
            style={{
              border: '2px solid #0071DC',
              boxShadow: '0 4px 24px rgba(0,113,220,0.10)',
            }}
          >
            {/* Card Header */}
            <div
              className="px-5 py-4 text-center"
              style={{
                background: 'linear-gradient(135deg, #0071DC 0%, #005BB5 100%)',
              }}
            >
              <h2 className="text-white font-bold text-base tracking-wide">
                {companyProfile.company_name || ''}
              </h2>
              <p className="text-blue-100 text-[10px] mt-0.5 uppercase tracking-widest">
                Employee Identity Card
              </p>
            </div>

            {/* Card Body */}
            <div className="px-5 py-5">
              {/* Photo + Name */}
              <div className="flex flex-col items-center mb-4">
                <div
                  className="w-24 h-24 rounded-full flex items-center justify-center overflow-hidden mb-3"
                  style={{
                    border: '3px solid #0071DC',
                    backgroundColor: '#E5E7EB',
                  }}
                >
                  {photoUrl ? (
                    <img
                      src={photoUrl}
                      alt={displayName}
                      className="w-24 h-24 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-3xl font-bold text-[#6B7280]">
                      {getInitials(displayName)}
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-bold text-[#333] text-center">{displayName}</h3>
                {employee.designation && (
                  <p className="text-sm text-[#0071DC] font-medium">{employee.designation}</p>
                )}
              </div>

              {/* Details Grid */}
              <div className="space-y-2.5 border-t border-[#E5E7EB] pt-4">
                <IdCardRow label="Employee ID" value={employee.employee_id || employee.employee_code || '--'} />
                <IdCardRow label="Department" value={employee.department_name || employee.department || '--'} />
                <IdCardRow label="Date of Joining" value={joiningDate} />
                {employee.blood_group && (
                  <IdCardRow label="Blood Group" value={employee.blood_group} highlight />
                )}
                {(employee.mobile_number || employee.phone) && (
                  <IdCardRow label="Contact" value={employee.mobile_number || employee.phone} />
                )}
              </div>
            </div>

            {/* Card Footer */}
            <div
              className="px-5 py-2.5 text-center"
              style={{
                background: 'linear-gradient(135deg, #0071DC 0%, #005BB5 100%)',
              }}
            >
              <p className="text-blue-100 text-[10px]">
                {companyProfile.company_name ? `This card is the property of ${companyProfile.company_name}.` : 'Employee Identity Card'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Print-only styles */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .fixed.inset-0.z-50 * { visibility: visible !important; }
          .fixed.inset-0.z-50 {
            position: absolute !important;
            inset: 0 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            background: white !important;
          }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}

function IdCardRow({ label, value, highlight }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-[#6B7280] font-medium">{label}</span>
      <span className={`font-semibold ${highlight ? 'text-red-600 bg-red-50 px-2 py-0.5 rounded text-xs' : 'text-[#333]'}`}>
        {value}
      </span>
    </div>
  );
}

/* ─── Tab 1: Personal Info ─────────────────────────────────────────────── */

function PersonalInfoTab({ employee }) {
  const fullName = [employee.first_name, employee.last_name].filter(Boolean).join(' ');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Personal Details */}
      <div>
        <h3 className="text-sm font-semibold text-[#6B7280] uppercase tracking-wide mb-3 flex items-center gap-2">
          <HiOutlineUserCircle className="w-4 h-4" />
          Personal Details
        </h3>
        <div className="space-y-0">
          <InfoRow label="Full Name" value={fullName || employee.display_name} />
          <InfoRow label="Date of Birth" value={formatDate(employee.date_of_birth)} icon={HiOutlineCalendarDays} />
          <InfoRow label="Gender" value={employee.gender} />
          <InfoRow label="Marital Status" value={employee.marital_status} />
          <InfoRow label="Blood Group" value={employee.blood_group} />
          <InfoRow label="Nationality" value={employee.nationality} />
        </div>
      </div>

      {/* Contact Details */}
      <div>
        <h3 className="text-sm font-semibold text-[#6B7280] uppercase tracking-wide mb-3 flex items-center gap-2">
          <HiOutlinePhone className="w-4 h-4" />
          Contact Details
        </h3>
        <div className="space-y-0">
          <InfoRow label="Mobile" value={employee.mobile_number} icon={HiOutlinePhone} />
          <InfoRow label="Alternate Phone" value={employee.alternate_phone} icon={HiOutlinePhone} />
          <InfoRow label="Email" value={employee.email} icon={HiOutlineEnvelope} />
          <InfoRow label="Personal Email" value={employee.personal_email} icon={HiOutlineEnvelope} />
        </div>
      </div>

      {/* Addresses */}
      <div>
        <h3 className="text-sm font-semibold text-[#6B7280] uppercase tracking-wide mb-3 flex items-center gap-2">
          <HiOutlineMapPin className="w-4 h-4" />
          Current Address
        </h3>
        <div className="space-y-0">
          <InfoRow label="Address" value={employee.current_address} icon={HiOutlineMapPin} />
          <InfoRow
            label="City / State / PIN"
            value={[employee.current_city, employee.current_state, employee.current_pincode].filter(Boolean).join(', ') || null}
          />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-[#6B7280] uppercase tracking-wide mb-3 flex items-center gap-2">
          <HiOutlineMapPin className="w-4 h-4" />
          Permanent Address
        </h3>
        <div className="space-y-0">
          <InfoRow label="Address" value={employee.permanent_address} icon={HiOutlineMapPin} />
        </div>
      </div>

      {/* Emergency Contact */}
      <div className="lg:col-span-2">
        {(employee.emergency_contact_name || employee.emergency_contact_phone) && (
          <div className="pt-4 border-t border-[#E5E7EB]">
            <h3 className="text-sm font-semibold text-[#6B7280] uppercase tracking-wide mb-3 flex items-center gap-2">
              <HiOutlineExclamationTriangle className="w-4 h-4" />
              Emergency Contact
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-0">
              <InfoRow label="Name" value={employee.emergency_contact_name} />
              <InfoRow label="Phone" value={employee.emergency_contact_phone} icon={HiOutlinePhone} />
              <InfoRow label="Relation" value={employee.emergency_contact_relation} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Tab 2: Employment ────────────────────────────────────────────────── */

function EmploymentTab({ employee }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-[#6B7280] uppercase tracking-wide mb-3 flex items-center gap-2">
        <HiOutlineBriefcase className="w-4 h-4" />
        Employment Details
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-0">
        <InfoRow label="Department" value={employee.department_name} icon={HiOutlineBriefcase} />
        <InfoRow label="Designation" value={employee.designation} />
        <InfoRow label="Joining Date" value={formatDate(employee.joining_date)} icon={HiOutlineCalendarDays} />
        <InfoRow label="Employment Type" value={employee.employment_type} />
        <InfoRow label="Grade" value={employee.grade} />
        <InfoRow label="Confirmation Date" value={formatDate(employee.confirmation_date)} icon={HiOutlineCalendarDays} />
        {employee.exit_date && (
          <InfoRow label="Exit Date" value={formatDate(employee.exit_date)} icon={HiOutlineCalendarDays} />
        )}
      </div>
    </div>
  );
}

/* ─── Tab 3: Salary & Statutory ────────────────────────────────────────── */

function SalaryStatutoryTab({ employee }) {
  const boolLabel = (val) => (val === true || val === 'true' || val === 1) ? 'Yes' : 'No';

  return (
    <div className="space-y-6">
      {/* Salary Structure */}
      <div>
        <h3 className="text-sm font-semibold text-[#6B7280] uppercase tracking-wide mb-3 flex items-center gap-2">
          <HiOutlineCurrencyRupee className="w-4 h-4" />
          Salary Structure
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-0">
          <InfoRow label="Basic Salary" value={formatIndianCurrency(employee.basic_salary)} icon={HiOutlineCurrencyRupee} />
          <InfoRow label="HRA" value={formatIndianCurrency(employee.hra)} icon={HiOutlineCurrencyRupee} />
          <InfoRow label="Special Allowance" value={formatIndianCurrency(employee.special_allowance)} icon={HiOutlineCurrencyRupee} />
          <InfoRow label="Other Allowance" value={formatIndianCurrency(employee.other_allowance)} icon={HiOutlineCurrencyRupee} />
          <InfoRow label="CTC" value={formatIndianCurrency(employee.ctc)} icon={HiOutlineCurrencyRupee} />
        </div>
      </div>

      {/* PF */}
      <div className="p-4 rounded-lg bg-[#F9FAFB] border border-[#E5E7EB]">
        <div className="flex items-center gap-3 mb-2">
          <h4 className="text-sm font-semibold text-[#333]">Provident Fund (PF)</h4>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
            boolLabel(employee.is_pf_applicable) === 'Yes' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-600 border border-gray-200'
          }`}>
            {boolLabel(employee.is_pf_applicable) === 'Yes' ? 'Applicable' : 'Not Applicable'}
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
          <InfoRow label="PF Number" value={employee.pf_number} />
          <InfoRow label="UAN" value={employee.uan_number} />
        </div>
      </div>

      {/* ESI */}
      <div className="p-4 rounded-lg bg-[#F9FAFB] border border-[#E5E7EB]">
        <div className="flex items-center gap-3 mb-2">
          <h4 className="text-sm font-semibold text-[#333]">Employee State Insurance (ESI)</h4>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
            boolLabel(employee.is_esi_applicable) === 'Yes' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-600 border border-gray-200'
          }`}>
            {boolLabel(employee.is_esi_applicable) === 'Yes' ? 'Applicable' : 'Not Applicable'}
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
          <InfoRow label="ESI Number" value={employee.esi_number} />
        </div>
      </div>

      {/* TDS */}
      <div className="p-4 rounded-lg bg-[#F9FAFB] border border-[#E5E7EB]">
        <h4 className="text-sm font-semibold text-[#333] mb-2">Tax Deduction at Source (TDS)</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
          <InfoRow label="TDS %" value={employee.tds_percent != null ? `${employee.tds_percent}%` : null} icon={HiOutlineCurrencyRupee} />
        </div>
      </div>
    </div>
  );
}

/* ─── Tab 4: Bank Details ──────────────────────────────────────────────── */

function BankDetailsTab({ employee }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-[#6B7280] uppercase tracking-wide mb-3 flex items-center gap-2">
        <HiOutlineBuildingLibrary className="w-4 h-4" />
        Bank Account Details
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-0">
        <InfoRow label="Bank Name" value={employee.bank_name} icon={HiOutlineBuildingLibrary} />
        <InfoRow label="Account Number" value={employee.bank_account_number} icon={HiOutlineBanknotes} />
        <InfoRow label="IFSC Code" value={employee.bank_ifsc_code} />
        <InfoRow label="Branch" value={employee.bank_branch} />
      </div>
    </div>
  );
}

/* ─── Tab 5: ID Documents ──────────────────────────────────────────────── */

function IDDocumentsTab({ employee }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-[#6B7280] uppercase tracking-wide mb-3 flex items-center gap-2">
        <HiOutlineIdentification className="w-4 h-4" />
        Identity Documents
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-0">
        <InfoRow label="Aadhaar Number" value={employee.aadhaar_number} icon={HiOutlineDocumentText} />
        <InfoRow label="PAN Number" value={employee.pan_number} icon={HiOutlineDocumentText} />
        <InfoRow label="Passport Number" value={employee.passport_number} icon={HiOutlineDocumentText} />
        <InfoRow label="Voter ID" value={employee.voter_id} icon={HiOutlineDocumentText} />
      </div>
    </div>
  );
}

/* ─── Tab 6: Salary History ────────────────────────────────────────────── */

function SalaryHistoryTab({ employeeId }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSalaryRecords = async () => {
      setLoading(true);
      try {
        const response = await apiClient.get('/salaries', {
          params: {
            employee_id: employeeId,
            limit: 50,
            sort_by: 'year',
            sort_order: 'desc',
          },
        });
        setRecords(response.data?.data || []);
      } catch {
        // Fallback: try alternate endpoint
        try {
          const fallback = await apiClient.get('/salary-records', {
            params: {
              employee_id: employeeId,
              limit: 50,
              sort_by: 'year',
              sort_order: 'desc',
            },
          });
          setRecords(fallback.data?.data || []);
        } catch {
          setRecords([]);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchSalaryRecords();
  }, [employeeId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-[#0071DC] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="text-center py-12">
        <HiOutlineCurrencyRupee className="w-10 h-10 text-[#D1D5DB] mx-auto mb-3" />
        <p className="text-sm text-[#6B7280]">No salary records found for this employee.</p>
        <Link
          to="/payroll"
          className="inline-flex items-center gap-1.5 mt-3 text-sm text-[#0071DC] hover:text-[#005BB5] font-medium"
        >
          Go to Payroll
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Period</th>
            <th className="px-4 py-2.5 text-right text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Gross Earnings</th>
            <th className="px-4 py-2.5 text-right text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Total Deductions</th>
            <th className="px-4 py-2.5 text-right text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Net Salary</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E5E7EB]">
          {records.map((rec) => (
            <tr key={rec.id} className="hover:bg-[#F9FAFB] transition-colors">
              <td className="px-4 py-2.5 text-[#333] font-medium">
                {MONTH_NAMES[rec.month] || rec.month} {rec.year}
              </td>
              <td className="px-4 py-2.5 text-right text-[#333]">{formatIndianCurrency(rec.gross_earnings || rec.gross_salary)}</td>
              <td className="px-4 py-2.5 text-right text-red-600">{formatIndianCurrency(rec.total_deductions)}</td>
              <td className="px-4 py-2.5 text-right text-[#333] font-semibold">{formatIndianCurrency(rec.net_salary || rec.net_pay)}</td>
              <td className="px-4 py-2.5"><SalaryStatusBadge status={rec.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
