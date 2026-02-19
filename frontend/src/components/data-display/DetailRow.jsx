import React from 'react';

/**
 * DetailRow - Label-value row for detail/view pages.
 *
 * Props:
 *   label     - Field label (left column)
 *   value     - Field value (right column, rendered as text)
 *   children  - Alternative to value prop, allows rich content
 *   className - Additional CSS classes for the row
 */
export default function DetailRow({ label, value, children, className = '' }) {
  return (
    <div className={`flex items-start py-2.5 border-b border-gray-100 last:border-b-0 ${className}`}>
      <dt className="w-40 shrink-0 text-sm font-medium text-[var(--zoho-text-secondary)]">
        {label}
      </dt>
      <dd className="flex-1 text-sm text-[var(--zoho-text)]">
        {children ?? value ?? (
          <span className="text-[var(--zoho-text-secondary)]">--</span>
        )}
      </dd>
    </div>
  );
}
