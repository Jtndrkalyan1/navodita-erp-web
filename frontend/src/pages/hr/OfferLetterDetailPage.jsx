import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { HiOutlineArrowLeft, HiOutlinePencilSquare, HiOutlineTrash, HiOutlinePrinter, HiOutlineExclamationTriangle } from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { offerLetterApi } from '../../api/offerLetter.api';
import apiClient from '../../api/client';
import CompanyLetterhead from '../../components/print/CompanyLetterhead';

function formatIndianCurrency(value) {
  if (value == null || isNaN(value)) return '\u20B90.00';
  const num = Number(value);
  const abs = Math.abs(num);
  const [intPart, decPart] = abs.toFixed(2).split('.');
  let result = '';
  if (intPart.length <= 3) { result = intPart; }
  else { result = intPart.slice(-3); let remaining = intPart.slice(0, -3); while (remaining.length > 2) { result = remaining.slice(-2)+','+result; remaining = remaining.slice(0, -2); } if (remaining.length > 0) result = remaining+','+result; }
  return `${num<0?'-':''}\u20B9${result}.${decPart}`;
}

function formatDate(dateStr) {
  if (!dateStr) return '--';
  try { return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }); }
  catch { return '--'; }
}

function StatusBadge({ status }) {
  const styles = { Draft: 'bg-gray-100 text-gray-700 border-gray-200', Sent: 'bg-blue-50 text-blue-700 border-blue-200', Accepted: 'bg-green-50 text-green-700 border-green-200', Declined: 'bg-red-50 text-red-700 border-red-200', Expired: 'bg-yellow-50 text-yellow-700 border-yellow-200' };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${styles[status] || styles.Draft}`}>{status || 'Draft'}</span>;
}

export default function OfferLetterDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const [companyProfile, setCompanyProfile] = useState({});

  useEffect(() => {
    apiClient.get('/company')
      .then(res => setCompanyProfile(res.data?.data || res.data || {}))
      .catch(() => setCompanyProfile({}));
  }, []);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const r = await offerLetterApi.getById(id);
        if (!r.data?.data) { toast.error('Not found'); navigate('/offer-letters'); return; }
        setData(r.data.data);
      } catch { toast.error('Failed to load'); navigate('/offer-letters'); }
      finally { setLoading(false); }
    };
    fetch();
  }, [id, navigate]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await offerLetterApi.remove(id);
      toast.success('Offer letter deleted');
      navigate('/offer-letters');
    } catch (err) { toast.error(err.response?.data?.error || 'Delete failed'); }
    finally { setDeleting(false); setShowDelete(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-3 border-[#0071DC] border-t-transparent rounded-full animate-spin" /></div>;
  if (!data) return null;

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/offer-letters')} className="p-2 rounded-lg hover:bg-[#F3F4F6]"><HiOutlineArrowLeft className="w-5 h-5 text-[#6B7280]" /></button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-[#333]">{data.offer_number}</h1>
              <StatusBadge status={data.status} />
            </div>
            <p className="text-sm text-[#6B7280] mt-0.5">{data.candidate_name} - {data.position}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowPrint(true)} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-[#0071DC] bg-white border border-[#0071DC]/30 rounded-lg hover:bg-[#0071DC]/5">
            <HiOutlinePrinter className="w-4 h-4" /> Print
          </button>
          <Link to={`/offer-letters/${id}/edit`} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-[#333] bg-white border border-[#E5E7EB] rounded-lg hover:bg-[#F9FAFB]">
            <HiOutlinePencilSquare className="w-4 h-4" /> Edit
          </Link>
          <button onClick={() => setShowDelete(true)} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50">
            <HiOutlineTrash className="w-4 h-4" /> Delete
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-4">
          <p className="text-xs text-[#6B7280] font-medium uppercase">CTC Amount</p>
          <p className="text-xl font-semibold text-[#0071DC] mt-1">{formatIndianCurrency(data.ctc_amount)}</p>
        </div>
        <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-4">
          <p className="text-xs text-[#6B7280] font-medium uppercase">Basic Salary</p>
          <p className="text-xl font-semibold text-[#333] mt-1">{formatIndianCurrency(data.basic_salary)}</p>
        </div>
        <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-4">
          <p className="text-xs text-[#6B7280] font-medium uppercase">Offer Date</p>
          <p className="text-xl font-semibold text-[#333] mt-1">{formatDate(data.offer_date)}</p>
        </div>
        <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-4">
          <p className="text-xs text-[#6B7280] font-medium uppercase">Joining Date</p>
          <p className="text-xl font-semibold text-[#333] mt-1">{formatDate(data.date_of_joining)}</p>
        </div>
      </div>

      {/* Details */}
      <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6 mb-6">
        <h2 className="text-base font-semibold text-[#333] mb-4">Candidate Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-3">
          <InfoRow label="Name" value={data.candidate_name} />
          <InfoRow label="Email" value={data.candidate_email} />
          <InfoRow label="Phone" value={data.candidate_phone} />
          <InfoRow label="Position" value={data.position} />
          <InfoRow label="Department" value={data.department} />
          <InfoRow label="Work Location" value={data.work_location} />
          <InfoRow label="Reporting Manager" value={data.reporting_manager} />
          <InfoRow label="Probation Period" value={data.probation_period} />
          <InfoRow label="Notice Period" value={data.notice_period} />
          <InfoRow label="Address" value={data.candidate_address} />
        </div>
      </div>

      <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6 mb-6">
        <h2 className="text-base font-semibold text-[#333] mb-4">Salary Breakup (Monthly)</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SalaryRow label="Basic Salary" value={data.basic_salary} />
          <SalaryRow label="HRA" value={data.hra} />
          <SalaryRow label="Conveyance" value={data.conveyance_allowance} />
          <SalaryRow label="Special Allowance" value={data.special_allowance} />
          <SalaryRow label="Medical Allowance" value={data.medical_allowance} />
          <SalaryRow label="Employer PF" value={data.employer_pf} />
          <SalaryRow label="Employer ESI" value={data.employer_esi} />
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
            <p className="text-xs text-blue-600 font-medium uppercase">Total CTC</p>
            <p className="text-lg font-bold text-blue-700 mt-0.5">{formatIndianCurrency(data.ctc_amount)}</p>
          </div>
        </div>
      </div>

      {(data.terms_and_conditions || data.special_conditions) && (
        <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6 mb-6">
          <h2 className="text-base font-semibold text-[#333] mb-4">Terms & Conditions</h2>
          {data.terms_and_conditions && <div className="text-sm text-[#333] whitespace-pre-wrap mb-4">{data.terms_and_conditions}</div>}
          {data.special_conditions && <><h3 className="text-sm font-semibold text-[#6B7280] mb-2">Special Conditions</h3><div className="text-sm text-[#333] whitespace-pre-wrap">{data.special_conditions}</div></>}
        </div>
      )}

      {/* Print Modal */}
      {showPrint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 print:hidden" onClick={() => setShowPrint(false)} />
          <div className="relative bg-white rounded-xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto print:shadow-none print:max-w-none print:mx-0 print:max-h-none">
            <div className="flex items-center justify-between p-4 border-b border-[#E5E7EB] no-print">
              <h3 className="text-lg font-semibold text-[#333]">Offer Letter Preview</h3>
              <div className="flex items-center gap-2">
                <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[#0071DC] bg-[#0071DC]/5 border border-[#0071DC]/20 rounded-lg hover:bg-[#0071DC]/10">
                  <HiOutlinePrinter className="w-4 h-4" /> Print
                </button>
                <button onClick={() => setShowPrint(false)} className="p-1.5 rounded-lg hover:bg-[#F3F4F6]">X</button>
              </div>
            </div>
            <CompanyLetterhead>
              <div style={{ fontSize: '13px', lineHeight: '1.8' }}>
                <p style={{ textAlign: 'right', marginBottom: '16px' }}>Date: {formatDate(data.offer_date)}</p>
                <p style={{ marginBottom: '4px' }}><strong>{data.candidate_name}</strong></p>
                {data.candidate_address && <p style={{ marginBottom: '16px', color: '#6B7280' }}>{data.candidate_address}</p>}
                <p style={{ marginBottom: '16px' }}>Ref: {data.offer_number}</p>
                <h3 style={{ fontSize: '16px', fontWeight: '600', textAlign: 'center', marginBottom: '20px', textDecoration: 'underline' }}>OFFER OF EMPLOYMENT</h3>
                <p>Dear {data.candidate_name},</p>
                <p style={{ marginTop: '12px' }}>We are pleased to offer you the position of <strong>{data.position}</strong>{data.department ? ` in the ${data.department} department` : ''} at {companyProfile.company_name || ''}{data.work_location ? `, ${data.work_location}` : (companyProfile.city ? `, ${companyProfile.city}` : '')}.</p>
                {data.date_of_joining && <p style={{ marginTop: '12px' }}>Your proposed date of joining is <strong>{formatDate(data.date_of_joining)}</strong>.</p>}
                <p style={{ marginTop: '12px' }}>The details of your compensation package are as follows:</p>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '12px', marginBottom: '12px' }}>
                  <thead><tr style={{ backgroundColor: '#F9FAFB' }}>
                    <th style={{ border: '1px solid #E5E7EB', padding: '8px 12px', textAlign: 'left', fontSize: '12px' }}>Component</th>
                    <th style={{ border: '1px solid #E5E7EB', padding: '8px 12px', textAlign: 'right', fontSize: '12px' }}>Monthly Amount</th>
                    <th style={{ border: '1px solid #E5E7EB', padding: '8px 12px', textAlign: 'right', fontSize: '12px' }}>Annual Amount</th>
                  </tr></thead>
                  <tbody>
                    {[['Basic Salary', data.basic_salary], ['HRA', data.hra], ['Conveyance Allowance', data.conveyance_allowance], ['Special Allowance', data.special_allowance], ['Medical Allowance', data.medical_allowance], ['Employer PF', data.employer_pf], ['Employer ESI', data.employer_esi]].map(([label, val]) => (
                      <tr key={label}><td style={{ border: '1px solid #E5E7EB', padding: '6px 12px', fontSize: '12px' }}>{label}</td><td style={{ border: '1px solid #E5E7EB', padding: '6px 12px', textAlign: 'right', fontSize: '12px' }}>{formatIndianCurrency(val)}</td><td style={{ border: '1px solid #E5E7EB', padding: '6px 12px', textAlign: 'right', fontSize: '12px' }}>{formatIndianCurrency((parseFloat(val)||0)*12)}</td></tr>
                    ))}
                    <tr style={{ backgroundColor: '#EFF6FF', fontWeight: '600' }}><td style={{ border: '1px solid #E5E7EB', padding: '8px 12px', fontSize: '12px' }}>Total CTC</td><td style={{ border: '1px solid #E5E7EB', padding: '8px 12px', textAlign: 'right', fontSize: '12px' }}>{formatIndianCurrency(data.ctc_amount)}</td><td style={{ border: '1px solid #E5E7EB', padding: '8px 12px', textAlign: 'right', fontSize: '12px' }}>{formatIndianCurrency((parseFloat(data.ctc_amount)||0)*12)}</td></tr>
                  </tbody>
                </table>
                {data.probation_period && <p>You will be on probation for a period of <strong>{data.probation_period}</strong>.</p>}
                {data.notice_period && <p>The notice period for termination of employment from either side will be <strong>{data.notice_period}</strong>.</p>}
                {data.reporting_manager && <p>You will report to <strong>{data.reporting_manager}</strong>.</p>}
                {data.terms_and_conditions && <div style={{ marginTop: '16px' }}><h4 style={{ fontWeight: '600', marginBottom: '8px' }}>Terms and Conditions:</h4><div style={{ whiteSpace: 'pre-wrap' }}>{data.terms_and_conditions}</div></div>}
                {data.special_conditions && <div style={{ marginTop: '16px' }}><h4 style={{ fontWeight: '600', marginBottom: '8px' }}>Special Conditions:</h4><div style={{ whiteSpace: 'pre-wrap' }}>{data.special_conditions}</div></div>}
                {data.expiry_date && <p style={{ marginTop: '16px' }}>This offer is valid until <strong>{formatDate(data.expiry_date)}</strong>.</p>}
                <p style={{ marginTop: '20px' }}>We look forward to welcoming you to the {companyProfile.company_name || ''} family.</p>
                <div style={{ marginTop: '40px' }}>
                  <p>Yours sincerely,</p>
                  <div style={{ marginTop: '40px' }}><p><strong>Authorized Signatory</strong></p><p>{companyProfile.company_name || ''}</p></div>
                </div>
                <div style={{ marginTop: '60px', borderTop: '1px solid #E5E7EB', paddingTop: '16px' }}>
                  <p><strong>Acceptance</strong></p>
                  <p style={{ marginTop: '8px' }}>I, {data.candidate_name}, accept the above offer of employment.</p>
                  <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'space-between' }}>
                    <div><p>Signature: ________________________</p></div>
                    <div><p>Date: ________________________</p></div>
                  </div>
                </div>
              </div>
            </CompanyLetterhead>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => !deleting && setShowDelete(false)} />
          <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center"><HiOutlineExclamationTriangle className="w-5 h-5 text-red-600" /></div>
              <div><h3 className="text-lg font-semibold text-[#333]">Delete Offer Letter</h3><p className="text-sm text-[#6B7280] mt-1">Are you sure you want to delete {data.offer_number}?</p></div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button onClick={() => setShowDelete(false)} disabled={deleting} className="px-4 py-2 text-sm font-medium text-[#333] bg-white border border-[#E5E7EB] rounded-lg hover:bg-[#F9FAFB]">Cancel</button>
              <button onClick={handleDelete} disabled={deleting} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50">
                {deleting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="py-1.5">
      <p className="text-xs text-[#6B7280] font-medium uppercase tracking-wide">{label}</p>
      <p className="text-sm text-[#333] mt-0.5">{value || '--'}</p>
    </div>
  );
}

function SalaryRow({ label, value }) {
  return (
    <div className="bg-[#F9FAFB] rounded-lg p-3 border border-[#E5E7EB]">
      <p className="text-xs text-[#6B7280] font-medium uppercase">{label}</p>
      <p className="text-base font-semibold text-[#333] mt-0.5">{formatIndianCurrency(value)}</p>
    </div>
  );
}
