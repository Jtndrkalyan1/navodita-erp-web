import React, { useState, useEffect } from 'react';
import apiClient from '../../api/client';

/**
 * CompanyLetterhead
 *
 * Renders a printable letterhead using company details from the company_profile API.
 * All company information is fetched dynamically -- no hardcoded values.
 */
export default function CompanyLetterhead({ children, showFooter = true }) {
  const [company, setCompany] = useState(null);

  useEffect(() => {
    apiClient.get('/company')
      .then(res => setCompany(res.data?.data || res.data || {}))
      .catch(() => setCompany({}));
  }, []);

  // While loading, render nothing (avoids flash of hardcoded content)
  if (!company) return null;

  const companyName = company.company_name || '';
  const tagline = company.tagline || '';
  const addressLine1 = company.address_line1 || '';
  const addressLine2 = company.address_line2 || '';
  const city = company.city || '';
  const state = company.state || '';
  const pincode = company.pincode || '';
  const email = company.email || '';
  const phone = company.phone || '';
  const logoPath = company.logo_path || '';
  const initial = companyName ? companyName.charAt(0).toUpperCase() : '';

  const addressParts = [addressLine1, addressLine2].filter(Boolean);
  const cityStatePincode = [city, state].filter(Boolean).join(', ') + (pincode ? ` ${pincode}` : '');

  const footerLine = [companyName, addressLine1, city].filter(Boolean).join(' | ');

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .letterhead-print-area, .letterhead-print-area * { visibility: visible !important; }
          .letterhead-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .no-print { display: none !important; }
          @page {
            margin: 15mm 15mm 20mm 15mm;
            size: A4;
          }
        }
        .letterhead-header {
          border-bottom: 3px solid #0071DC;
          padding-bottom: 16px;
          margin-bottom: 24px;
        }
        .letterhead-logo-area {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .letterhead-company-name {
          font-size: 28px;
          font-weight: 700;
          color: #0071DC;
          letter-spacing: 1px;
          line-height: 1.2;
        }
        .letterhead-tagline {
          font-size: 13px;
          color: #6B7280;
          font-style: italic;
          margin-top: 2px;
        }
        .letterhead-contact {
          text-align: right;
          font-size: 11px;
          color: #6B7280;
          line-height: 1.6;
        }
        .letterhead-footer {
          border-top: 2px solid #E5E7EB;
          padding-top: 12px;
          margin-top: 40px;
          text-align: center;
          font-size: 10px;
          color: #9CA3AF;
        }
        .letterhead-body {
          font-size: 13px;
          color: #333;
          line-height: 1.7;
        }
      `}</style>
      <div className="letterhead-print-area bg-white max-w-[800px] mx-auto p-8">
        {/* Header */}
        <div className="letterhead-header">
          <div className="letterhead-logo-area">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {logoPath ? (
                  <img src={logoPath} alt={companyName} style={{ width: 48, height: 48, objectFit: 'contain', borderRadius: 8 }} />
                ) : (
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                    <rect width="48" height="48" rx="8" fill="#0071DC" />
                    <text x="24" y="32" textAnchor="middle" fill="white" fontSize="22" fontWeight="bold" fontFamily="Arial">{initial}</text>
                  </svg>
                )}
                <div>
                  <div className="letterhead-company-name">{companyName}</div>
                  {tagline && <div className="letterhead-tagline">{tagline}</div>}
                </div>
              </div>
            </div>
            <div className="letterhead-contact">
              {addressParts.map((line, i) => <div key={i}>{line}</div>)}
              {cityStatePincode && <div>{cityStatePincode}</div>}
              {(phone || email) && (
                <div style={{ marginTop: '4px' }}>
                  {phone && <span>{phone}</span>}
                  {phone && email && <span> | </span>}
                  {email && <span>{email}</span>}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="letterhead-body">
          {children}
        </div>

        {/* Footer */}
        {showFooter && (
          <div className="letterhead-footer">
            {footerLine && <div>{footerLine}</div>}
            {email && <div>Email: {email}</div>}
          </div>
        )}
      </div>
    </>
  );
}
