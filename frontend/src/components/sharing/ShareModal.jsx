import React, { useState, useEffect, useRef } from 'react';
import { HiOutlineXMark, HiOutlineEnvelope, HiOutlinePaperAirplane } from 'react-icons/hi2';
import { FaWhatsapp } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { shareApi } from '../../api/share.api';
import apiClient from '../../api/client';

/**
 * Format a number with Indian comma formatting.
 */
function formatINRSimple(value) {
  if (value == null || isNaN(value)) return '0.00';
  const num = Number(value);
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
  return `${num < 0 ? '-' : ''}\u20B9${result}.${decPart}`;
}

/**
 * Format a date string to DD/MM/YYYY.
 */
function formatDateDMY(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  } catch {
    return '';
  }
}

/**
 * ShareModal - Modal for sharing documents via Email or WhatsApp.
 *
 * Props:
 *   isOpen          - boolean
 *   onClose         - function
 *   documentType    - string (e.g., "Invoice", "Quotation", "Bill")
 *   documentNumber  - string (e.g., "INV-0001")
 *   documentId      - UUID
 *   recipientName   - string (customer/vendor name)
 *   recipientEmail  - string (pre-filled email)
 *   recipientPhone  - string (pre-filled phone)
 *   amount          - number (optional, for the document amount)
 *   date            - string (optional, document date)
 *   pdfUrl          - string (optional, URL to PDF)
 *   defaultTab      - 'email' | 'whatsapp' (default: 'email')
 */
export default function ShareModal({
  isOpen,
  onClose,
  documentType = 'Document',
  documentNumber = '',
  documentId = '',
  recipientName = '',
  recipientEmail = '',
  recipientPhone = '',
  amount,
  date,
  pdfUrl,
  defaultTab = 'email',
}) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [sending, setSending] = useState(false);
  const modalRef = useRef(null);

  // Email form state
  const [emailTo, setEmailTo] = useState(recipientEmail);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');

  // WhatsApp form state
  const [waPhone, setWaPhone] = useState(recipientPhone);
  const [waMessage, setWaMessage] = useState('');

  // Company profile state (single source of truth)
  const [companyProfile, setCompanyProfile] = useState(null);

  // Fetch company profile once when modal first opens
  useEffect(() => {
    if (isOpen && !companyProfile) {
      apiClient.get('/company')
        .then(res => setCompanyProfile(res.data?.data || res.data || {}))
        .catch(() => setCompanyProfile({}));
    }
  }, [isOpen, companyProfile]);

  // Reset form when modal opens or props change
  useEffect(() => {
    if (isOpen && companyProfile) {
      const cName = companyProfile.company_name || '';
      const cAddress = [
        companyProfile.address_line1 || '',
        companyProfile.address_line2 || '',
        [companyProfile.city || '', companyProfile.state || ''].filter(Boolean).join(', '),
        companyProfile.pincode || '',
      ].filter(Boolean).join(', ');
      const cEmail = companyProfile.email || '';

      setActiveTab(defaultTab);
      setEmailTo(recipientEmail);
      setEmailSubject(`${documentType} ${documentNumber}${cName ? ' from ' + cName : ''}`);

      const amountLine = amount != null ? `\nAmount: ${formatINRSimple(amount)}` : '';
      const dateLine = date ? `\nDate: ${formatDateDMY(date)}` : '';

      const emailSignature = [cName, cAddress, cEmail ? 'Email: ' + cEmail : ''].filter(Boolean).join('\n');

      setEmailBody(
        `Dear ${recipientName || 'Sir/Madam'},\n\nPlease find attached ${documentType} ${documentNumber}${cName ? ' from ' + cName : ''}.${amountLine}${dateLine}\n\nIf you have any questions, please don't hesitate to contact us.\n\nBest regards,\n${emailSignature}`
      );

      setWaPhone(recipientPhone);
      setWaMessage(
        `Dear ${recipientName || 'Sir/Madam'},\n\nHere is your ${documentType} ${documentNumber}${cName ? ' from ' + cName : ''}.${amountLine}${dateLine}\n\nPlease review and let us know if you have any questions.\n\nRegards,\n${cName}`
      );
    }
  }, [isOpen, defaultTab, recipientEmail, recipientPhone, recipientName, documentType, documentNumber, amount, date, companyProfile]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // ── Email send handler ────────────────────────────────────────
  async function handleSendEmail() {
    if (!emailTo) {
      toast.error('Please enter a recipient email address');
      return;
    }
    setSending(true);
    try {
      const res = await shareApi.sendEmail({
        to: emailTo,
        subject: emailSubject,
        body: emailBody,
        document_type: documentType,
        document_id: documentId,
      });
      const data = res.data;
      if (data.method === 'mailto') {
        // Open mailto: link as fallback
        window.open(data.mailtoUrl, '_blank');
        toast.success('Opening your email client...');
      } else {
        toast.success(data.message || 'Email sent successfully!');
      }
      onClose?.();
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to send email';
      toast.error(msg);
    } finally {
      setSending(false);
    }
  }

  // ── WhatsApp handler ──────────────────────────────────────────
  function handleOpenWhatsApp() {
    if (!waPhone) {
      toast.error('Please enter a phone number');
      return;
    }

    // Build WhatsApp URL client-side (immediate, no API call needed)
    let cleaned = waPhone.replace(/[^0-9]/g, '');
    if (cleaned.startsWith('0')) cleaned = '91' + cleaned.slice(1);
    if (cleaned.length === 10) cleaned = '91' + cleaned;

    const url = `https://wa.me/${cleaned}?text=${encodeURIComponent(waMessage)}`;
    window.open(url, '_blank');
    toast.success('Opening WhatsApp...');
    onClose?.();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div
        ref={modalRef}
        className="relative bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 animate-[scaleIn_0.15s_ease-out]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--zoho-border)]">
          <h3 className="text-lg font-semibold text-[var(--zoho-text)]">
            Share {documentType}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-[var(--zoho-text-secondary)] hover:text-[var(--zoho-text)] hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <HiOutlineXMark className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[var(--zoho-border)]">
          <button
            onClick={() => setActiveTab('email')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors cursor-pointer ${
              activeTab === 'email'
                ? 'text-[#0071DC] border-b-2 border-[#0071DC] bg-blue-50/50'
                : 'text-[var(--zoho-text-secondary)] hover:text-[var(--zoho-text)] hover:bg-gray-50'
            }`}
          >
            <HiOutlineEnvelope className="w-4 h-4" />
            Email
          </button>
          <button
            onClick={() => setActiveTab('whatsapp')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors cursor-pointer ${
              activeTab === 'whatsapp'
                ? 'text-[#25D366] border-b-2 border-[#25D366] bg-green-50/50'
                : 'text-[var(--zoho-text-secondary)] hover:text-[var(--zoho-text)] hover:bg-gray-50'
            }`}
          >
            <FaWhatsapp className="w-4 h-4" />
            WhatsApp
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'email' ? (
            <div className="space-y-4">
              {/* To */}
              <div>
                <label className="block text-xs font-medium text-[var(--zoho-text-secondary)] uppercase tracking-wide mb-1.5">
                  To
                </label>
                <input
                  type="email"
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  placeholder="recipient@example.com"
                  className="w-full px-3 py-2 text-sm border border-[var(--zoho-border)] rounded-md focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC] transition-colors"
                />
              </div>

              {/* Subject */}
              <div>
                <label className="block text-xs font-medium text-[var(--zoho-text-secondary)] uppercase tracking-wide mb-1.5">
                  Subject
                </label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[var(--zoho-border)] rounded-md focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC] transition-colors"
                />
              </div>

              {/* Body */}
              <div>
                <label className="block text-xs font-medium text-[var(--zoho-text-secondary)] uppercase tracking-wide mb-1.5">
                  Message
                </label>
                <textarea
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  rows={8}
                  className="w-full px-3 py-2 text-sm border border-[var(--zoho-border)] rounded-md focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC] transition-colors resize-none"
                />
              </div>

              {/* Send Button */}
              <div className="flex justify-end pt-2">
                <button
                  onClick={handleSendEmail}
                  disabled={sending}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-[#0071DC] rounded-md hover:bg-[#005BB5] transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {sending ? (
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <HiOutlinePaperAirplane className="w-4 h-4" />
                  )}
                  {sending ? 'Sending...' : 'Send Email'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Phone */}
              <div>
                <label className="block text-xs font-medium text-[var(--zoho-text-secondary)] uppercase tracking-wide mb-1.5">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={waPhone}
                  onChange={(e) => setWaPhone(e.target.value)}
                  placeholder="+91 9876543210"
                  className="w-full px-3 py-2 text-sm border border-[var(--zoho-border)] rounded-md focus:outline-none focus:ring-2 focus:ring-[#25D366]/20 focus:border-[#25D366] transition-colors"
                />
                <p className="text-xs text-[var(--zoho-text-secondary)] mt-1">
                  Enter with country code (e.g., +91 for India)
                </p>
              </div>

              {/* Message */}
              <div>
                <label className="block text-xs font-medium text-[var(--zoho-text-secondary)] uppercase tracking-wide mb-1.5">
                  Message
                </label>
                <textarea
                  value={waMessage}
                  onChange={(e) => setWaMessage(e.target.value)}
                  rows={8}
                  className="w-full px-3 py-2 text-sm border border-[var(--zoho-border)] rounded-md focus:outline-none focus:ring-2 focus:ring-[#25D366]/20 focus:border-[#25D366] transition-colors resize-none"
                />
              </div>

              {/* Open WhatsApp Button */}
              <div className="flex justify-end pt-2">
                <button
                  onClick={handleOpenWhatsApp}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-[#25D366] rounded-md hover:bg-[#1DA851] transition-colors cursor-pointer"
                >
                  <FaWhatsapp className="w-4 h-4" />
                  Open WhatsApp
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
