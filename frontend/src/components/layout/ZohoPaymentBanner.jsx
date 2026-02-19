import React from 'react';

/**
 * ZohoPaymentBanner - Summary banner with colored top-border cards in a horizontal row.
 *
 * Props:
 *   items - Array of { label: string, value: string|number, color: string (hex or Tailwind) }
 *
 * Example:
 *   <ZohoPaymentBanner items={[
 *     { label: 'Total', value: '₹5,00,000', color: '#0071DC' },
 *     { label: 'Paid', value: '₹3,00,000', color: '#16A34A' },
 *     { label: 'Overdue', value: '₹1,50,000', color: '#DC2626' },
 *     { label: 'Draft', value: '₹50,000', color: '#6B7280' },
 *   ]} />
 */
export default function ZohoPaymentBanner({ items = [] }) {
  if (!items.length) return null;

  return (
    <div className="flex gap-0 bg-white border border-[var(--zoho-border)] rounded-lg overflow-hidden mb-5">
      {items.map((item, index) => (
        <div
          key={index}
          className="flex-1 px-5 py-4 relative"
          style={{ borderTop: `3px solid ${item.color || '#0071DC'}` }}
        >
          {/* Divider between items */}
          {index > 0 && (
            <div className="absolute left-0 top-3 bottom-3 w-px bg-[var(--zoho-border)]" />
          )}
          <p className="text-xs font-medium text-[var(--zoho-text-secondary)] uppercase tracking-wide">
            {item.label}
          </p>
          <p
            className="text-lg font-semibold mt-1"
            style={{ color: item.color || 'var(--zoho-text)' }}
          >
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}
