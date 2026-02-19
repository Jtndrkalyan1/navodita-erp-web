import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { HiOutlineArrowLeft, HiOutlinePencilSquare, HiOutlineTrash, HiOutlinePrinter, HiOutlineExclamationTriangle } from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { joiningLetterApi } from '../../api/joiningLetter.api';
import apiClient from '../../api/client';
import CompanyLetterhead from '../../components/print/CompanyLetterhead';

function formatDate(d) { if (!d) return '--'; try { return new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'}); } catch { return '--'; } }

function StatusBadge({ status }) {
  const s = { Draft:'bg-gray-100 text-gray-700 border-gray-200', Sent:'bg-blue-50 text-blue-700 border-blue-200', Acknowledged:'bg-green-50 text-green-700 border-green-200' };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${s[status]||s.Draft}`}>{status||'Draft'}</span>;
}

export default function JoiningLetterDetailPage() {
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
      try { const r = await joiningLetterApi.getById(id); if (!r.data?.data) { toast.error('Not found'); navigate('/joining-letters'); return; } setData(r.data.data); }
      catch { toast.error('Failed'); navigate('/joining-letters'); }
      finally { setLoading(false); }
    };
    fetch();
  }, [id, navigate]);

  const handleDelete = async () => {
    setDeleting(true);
    try { await joiningLetterApi.remove(id); toast.success('Deleted'); navigate('/joining-letters'); }
    catch (e) { toast.error(e.response?.data?.error||'Failed'); }
    finally { setDeleting(false); setShowDelete(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-3 border-[#0071DC] border-t-transparent rounded-full animate-spin" /></div>;
  if (!data) return null;

  const defaultDocs = data.documents_required || '1. Original and photocopies of educational certificates\n2. Experience/Relieving letter from previous employer\n3. 4 passport size photographs\n4. Aadhaar Card (original and copy)\n5. PAN Card (original and copy)\n6. Bank account details (cancelled cheque)\n7. Address proof';

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/joining-letters')} className="p-2 rounded-lg hover:bg-[#F3F4F6]"><HiOutlineArrowLeft className="w-5 h-5 text-[#6B7280]" /></button>
          <div>
            <div className="flex items-center gap-3"><h1 className="text-2xl font-semibold text-[#333]">{data.joining_number}</h1><StatusBadge status={data.status} /></div>
            <p className="text-sm text-[#6B7280] mt-0.5">{data.employee_name} - {data.position}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowPrint(true)} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-[#0071DC] bg-white border border-[#0071DC]/30 rounded-lg hover:bg-[#0071DC]/5"><HiOutlinePrinter className="w-4 h-4" /> Print</button>
          <Link to={`/joining-letters/${id}/edit`} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-[#333] bg-white border border-[#E5E7EB] rounded-lg hover:bg-[#F9FAFB]"><HiOutlinePencilSquare className="w-4 h-4" /> Edit</Link>
          <button onClick={() => setShowDelete(true)} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50"><HiOutlineTrash className="w-4 h-4" /> Delete</button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6 mb-6">
        <h2 className="text-base font-semibold text-[#333] mb-4">Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-3">
          <InfoRow label="Employee" value={data.employee_name} />
          <InfoRow label="Email" value={data.employee_email} />
          <InfoRow label="Phone" value={data.employee_phone} />
          <InfoRow label="Position" value={data.position} />
          <InfoRow label="Department" value={data.department} />
          <InfoRow label="Date of Joining" value={formatDate(data.date_of_joining)} />
          <InfoRow label="Reporting To" value={data.reporting_to} />
          <InfoRow label="Work Location" value={data.work_location} />
          <InfoRow label="Reporting Time" value={data.reporting_time} />
          <InfoRow label="Dress Code" value={data.dress_code} />
          <InfoRow label="Address" value={data.employee_address} />
        </div>
      </div>

      {showPrint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 print:hidden" onClick={() => setShowPrint(false)} />
          <div className="relative bg-white rounded-xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto print:shadow-none print:max-w-none">
            <div className="flex items-center justify-between p-4 border-b border-[#E5E7EB] no-print">
              <h3 className="text-lg font-semibold">Joining Letter Preview</h3>
              <div className="flex gap-2">
                <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[#0071DC] bg-[#0071DC]/5 border border-[#0071DC]/20 rounded-lg"><HiOutlinePrinter className="w-4 h-4" /> Print</button>
                <button onClick={() => setShowPrint(false)} className="p-1.5 rounded-lg hover:bg-[#F3F4F6]">X</button>
              </div>
            </div>
            <CompanyLetterhead>
              <div style={{ fontSize: '13px', lineHeight: '1.8' }}>
                <p style={{ textAlign: 'right', marginBottom: '16px' }}>Date: {formatDate(data.joining_date)}</p>
                <p><strong>{data.employee_name}</strong></p>
                {data.employee_address && <p style={{ color: '#6B7280', marginBottom: '16px' }}>{data.employee_address}</p>}
                <p style={{ marginBottom: '16px' }}>Ref: {data.joining_number}</p>
                <h3 style={{ fontSize: '16px', fontWeight: '600', textAlign: 'center', marginBottom: '20px', textDecoration: 'underline' }}>JOINING LETTER</h3>
                <p>Dear {data.employee_name},</p>
                <p style={{ marginTop: '12px' }}>Further to our offer of employment, we are pleased to confirm your appointment as <strong>{data.position}</strong>{data.department ? ` in the ${data.department} department` : ''} at {companyProfile.company_name || ''}.</p>
                <p style={{ marginTop: '12px' }}>Please report at our office at the following address on <strong>{formatDate(data.date_of_joining)}</strong> at <strong>{data.reporting_time || '10:00 AM'}</strong>:</p>
                <p style={{ marginTop: '8px', paddingLeft: '20px', color: '#6B7280' }}>{companyProfile.company_name || ''}{companyProfile.address_line1 ? <><br/>{companyProfile.address_line1}</> : ''}{companyProfile.address_line2 ? <><br/>{companyProfile.address_line2}</> : ''}{companyProfile.city ? <><br/>{companyProfile.city}{companyProfile.state ? ` (${companyProfile.state})` : ''} {companyProfile.pincode || ''}</> : ''}</p>
                {data.reporting_to && <p style={{ marginTop: '12px' }}>You will report to <strong>{data.reporting_to}</strong>.</p>}
                <p style={{ marginTop: '12px' }}>Dress Code: <strong>{data.dress_code || 'Business Casual'}</strong></p>
                <div style={{ marginTop: '16px' }}>
                  <h4 style={{ fontWeight: '600', marginBottom: '8px' }}>Documents to be submitted on the date of joining:</h4>
                  <div style={{ whiteSpace: 'pre-wrap', paddingLeft: '8px' }}>{defaultDocs}</div>
                </div>
                {data.special_instructions && <div style={{ marginTop: '16px' }}><h4 style={{ fontWeight: '600', marginBottom: '8px' }}>Special Instructions:</h4><div style={{ whiteSpace: 'pre-wrap' }}>{data.special_instructions}</div></div>}
                <p style={{ marginTop: '20px' }}>We look forward to your joining and wish you a successful career at {companyProfile.company_name || ''}.</p>
                <div style={{ marginTop: '40px' }}><p>Yours sincerely,</p><div style={{ marginTop: '40px' }}><p><strong>Authorized Signatory</strong></p><p>{companyProfile.company_name || ''}</p></div></div>
              </div>
            </CompanyLetterhead>
          </div>
        </div>
      )}

      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => !deleting && setShowDelete(false)} />
          <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center"><HiOutlineExclamationTriangle className="w-5 h-5 text-red-600" /></div>
              <div><h3 className="text-lg font-semibold text-[#333]">Delete Joining Letter</h3><p className="text-sm text-[#6B7280] mt-1">Delete {data.joining_number}?</p></div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button onClick={() => setShowDelete(false)} disabled={deleting} className="px-4 py-2 text-sm font-medium text-[#333] bg-white border border-[#E5E7EB] rounded-lg">Cancel</button>
              <button onClick={handleDelete} disabled={deleting} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg disabled:opacity-50">
                {deleting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />} {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }) {
  return <div className="py-1.5"><p className="text-xs text-[#6B7280] font-medium uppercase tracking-wide">{label}</p><p className="text-sm text-[#333] mt-0.5">{value || '--'}</p></div>;
}
