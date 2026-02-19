import React from 'react';
import { HiOutlinePlus } from 'react-icons/hi2';

/**
 * ZohoListHeader - Standard list page header with title, record count, and new button.
 *
 * Props:
 *   title       - Page title (e.g. "Invoices")
 *   subtitle    - Optional subtitle text
 *   count       - Number of records to display
 *   onNew       - Click handler for the "New" button (if omitted, button is hidden)
 *   newButtonLabel - Label for the new button (defaults to "+ New {title}")
 *   children    - Optional extra content rendered on the right side
 */
export default function ZohoListHeader({
  title,
  subtitle,
  count,
  onNew,
  newButtonLabel,
  children,
}) {
  return (
    <div className="bg-white border-b border-[var(--zoho-border)] px-6 py-4 -mx-6 -mt-6 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-[var(--zoho-text)]">
            {title}
          </h1>
          {typeof count === 'number' && (
            <span className="text-xs font-medium text-[var(--zoho-text-secondary)] bg-gray-100 rounded-full px-2.5 py-0.5">
              {count}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {children}
          {onNew && (
            <button
              onClick={onNew}
              className="inline-flex items-center gap-1.5 bg-[#0071DC] hover:bg-[#005BB5] text-white text-sm font-medium px-4 py-2 rounded-md transition-colors duration-150 cursor-pointer"
            >
              <HiOutlinePlus className="w-4 h-4" />
              {newButtonLabel || `New ${title ? title.replace(/s$/, '') : ''}`}
            </button>
          )}
        </div>
      </div>

      {subtitle && (
        <p className="text-sm text-[var(--zoho-text-secondary)] mt-1">
          {subtitle}
        </p>
      )}
    </div>
  );
}
