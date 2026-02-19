import React, { useState, useRef, useEffect } from 'react';
import { HiOutlineEnvelope } from 'react-icons/hi2';
import { FaWhatsapp } from 'react-icons/fa';
import ShareModal from './ShareModal';

/**
 * ShareButton - A dropdown button for sharing documents via Email or WhatsApp.
 *
 * Props:
 *   documentType    - string (e.g., "Invoice")
 *   documentNumber  - string (e.g., "INV-0001")
 *   documentId      - UUID
 *   recipientName   - string
 *   recipientEmail  - string
 *   recipientPhone  - string
 *   amount          - number (optional)
 *   date            - string (optional)
 *   pdfUrl          - string (optional)
 */
export default function ShareButton({
  documentType = 'Document',
  documentNumber = '',
  documentId = '',
  recipientName = '',
  recipientEmail = '',
  recipientPhone = '',
  amount,
  date,
  pdfUrl,
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState('email');
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [dropdownOpen]);

  function openEmailModal() {
    setModalTab('email');
    setModalOpen(true);
    setDropdownOpen(false);
  }

  function openWhatsAppModal() {
    setModalTab('whatsapp');
    setModalOpen(true);
    setDropdownOpen(false);
  }

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--zoho-text-secondary)] bg-white border border-[var(--zoho-border)] px-3 py-2 rounded-md hover:bg-gray-50 transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0-12.814a2.25 2.25 0 1 0 3.935-2.186 2.25 2.25 0 0 0-3.935 2.186Zm0 12.814a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Z" />
          </svg>
          Share
          <svg className="w-3 h-3 ml-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </button>

        {/* Dropdown Menu */}
        {dropdownOpen && (
          <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-[var(--zoho-border)] rounded-lg shadow-lg z-50 py-1 animate-[fadeIn_0.1s_ease-out]">
            <button
              onClick={openEmailModal}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--zoho-text)] hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <HiOutlineEnvelope className="w-4 h-4 text-[#0071DC]" />
              Share via Email
            </button>
            <button
              onClick={openWhatsAppModal}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--zoho-text)] hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <FaWhatsapp className="w-4 h-4 text-[#25D366]" />
              Share via WhatsApp
            </button>
          </div>
        )}
      </div>

      {/* Share Modal */}
      <ShareModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        documentType={documentType}
        documentNumber={documentNumber}
        documentId={documentId}
        recipientName={recipientName}
        recipientEmail={recipientEmail}
        recipientPhone={recipientPhone}
        amount={amount}
        date={date}
        pdfUrl={pdfUrl}
        defaultTab={modalTab}
      />
    </>
  );
}
