import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { HiOutlineArrowLeft, HiOutlinePencilSquare, HiOutlineTrash, HiOutlinePrinter, HiOutlineExclamationTriangle } from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { hrPolicyApi } from '../../api/hrPolicy.api';
import CompanyLetterhead from '../../components/print/CompanyLetterhead';

function formatDate(d) { if (!d) return '--'; try { return new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}); } catch { return '--'; } }

export default function HRPolicyDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showPrint, setShowPrint] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try { const r = await hrPolicyApi.getById(id); if (!r.data?.data) { toast.error('Not found'); navigate('/hr-policies'); return; } setData(r.data.data); }
      catch { toast.error('Failed'); navigate('/hr-policies'); }
      finally { setLoading(false); }
    };
    fetch();
  }, [id, navigate]);

  const handleDelete = async () => {
    setDeleting(true);
    try { await hrPolicyApi.remove(id); toast.success('Deleted'); navigate('/hr-policies'); }
    catch (e) { toast.error(e.response?.data?.error || 'Failed'); }
    finally { setDeleting(false); setShowDelete(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-3 border-[#0071DC] border-t-transparent rounded-full animate-spin" /></div>;
  if (!data) return null;

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/hr-policies')} className="p-2 rounded-lg hover:bg-[#F3F4F6]"><HiOutlineArrowLeft className="w-5 h-5 text-[#6B7280]" /></button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-[#333]">{data.policy_name}</h1>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${data.status === 'Active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>{data.status}</span>
              {data.is_mandatory && <span className="px-1.5 py-0.5 bg-red-50 text-red-600 text-[10px] font-medium rounded border border-red-200">MANDATORY</span>}
            </div>
            <p className="text-sm text-[#6B7280] mt-0.5">{data.policy_number} - {data.category}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowPrint(true)} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-[#0071DC] bg-white border border-[#0071DC]/30 rounded-lg hover:bg-[#0071DC]/5"><HiOutlinePrinter className="w-4 h-4" /> Print</button>
          <Link to={`/hr-policies/${id}/edit`} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-[#333] bg-white border border-[#E5E7EB] rounded-lg hover:bg-[#F9FAFB]"><HiOutlinePencilSquare className="w-4 h-4" /> Edit</Link>
          <button onClick={() => setShowDelete(true)} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50"><HiOutlineTrash className="w-4 h-4" /> Delete</button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6 mb-6">
        <h2 className="text-base font-semibold text-[#333] mb-4">Policy Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-3">
          <InfoRow label="Policy Number" value={data.policy_number} />
          <InfoRow label="Category" value={data.category} />
          <InfoRow label="Version" value={data.version} />
          <InfoRow label="Effective Date" value={formatDate(data.effective_date)} />
          <InfoRow label="Review Date" value={formatDate(data.review_date)} />
          <InfoRow label="Applicable To" value={data.applicable_to} />
          <InfoRow label="Approved By" value={data.approved_by} />
          <InfoRow label="Mandatory" value={data.is_mandatory ? 'Yes' : 'No'} />
        </div>
        {data.description && <div className="mt-4 pt-4 border-t border-[#E5E7EB]"><p className="text-xs text-[#6B7280] font-medium uppercase mb-1">Description</p><p className="text-sm text-[#333]">{data.description}</p></div>}
        {data.legal_reference && <div className="mt-4 pt-4 border-t border-[#E5E7EB]"><p className="text-xs text-[#6B7280] font-medium uppercase mb-1">Legal Reference</p><p className="text-sm text-[#333]">{data.legal_reference}</p></div>}
      </div>

      <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6 mb-6">
        <h2 className="text-base font-semibold text-[#333] mb-4">Policy Content</h2>
        <div className="text-sm text-[#333] whitespace-pre-wrap leading-relaxed">{data.policy_content}</div>
      </div>

      {showPrint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 print:hidden" onClick={() => setShowPrint(false)} />
          <div className="relative bg-white rounded-xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto print:shadow-none print:max-w-none">
            <div className="flex items-center justify-between p-4 border-b border-[#E5E7EB] no-print">
              <h3 className="text-lg font-semibold">Policy Print Preview</h3>
              <div className="flex gap-2">
                <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[#0071DC] bg-[#0071DC]/5 border border-[#0071DC]/20 rounded-lg"><HiOutlinePrinter className="w-4 h-4" /> Print</button>
                <button onClick={() => setShowPrint(false)} className="p-1.5 rounded-lg hover:bg-[#F3F4F6]">X</button>
              </div>
            </div>
            <CompanyLetterhead>
              <div style={{ fontSize: '13px', lineHeight: '1.8' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '700', textAlign: 'center', marginBottom: '4px' }}>{data.policy_name}</h3>
                <p style={{ textAlign: 'center', color: '#6B7280', marginBottom: '20px' }}>{data.policy_number} | Version {data.version} | {data.category}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#6B7280', marginBottom: '16px', borderTop: '1px solid #E5E7EB', borderBottom: '1px solid #E5E7EB', padding: '8px 0' }}>
                  <span>Effective: {formatDate(data.effective_date)}</span>
                  <span>Applicable To: {data.applicable_to}</span>
                  <span>{data.is_mandatory ? 'MANDATORY' : 'Optional'}</span>
                </div>
                {data.description && <p style={{ marginBottom: '16px', fontStyle: 'italic', color: '#6B7280' }}>{data.description}</p>}
                <div style={{ whiteSpace: 'pre-wrap' }}>{data.policy_content}</div>
                {data.legal_reference && <div style={{ marginTop: '20px', padding: '12px', backgroundColor: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB' }}><p style={{ fontSize: '11px', fontWeight: '600', color: '#6B7280', marginBottom: '4px' }}>LEGAL REFERENCE</p><p style={{ fontSize: '12px' }}>{data.legal_reference}</p></div>}
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
              <div><h3 className="text-lg font-semibold">Delete Policy</h3><p className="text-sm text-[#6B7280] mt-1">Delete {data.policy_name}?</p></div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowDelete(false)} disabled={deleting} className="px-4 py-2 text-sm text-[#333] bg-white border border-[#E5E7EB] rounded-lg">Cancel</button>
              <button onClick={handleDelete} disabled={deleting} className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg disabled:opacity-50">{deleting ? 'Deleting...' : 'Delete'}</button>
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
