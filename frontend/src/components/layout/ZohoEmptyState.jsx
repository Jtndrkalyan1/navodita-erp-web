import React from 'react';
import { HiOutlineInboxStack } from 'react-icons/hi2';

/**
 * ZohoEmptyState - Empty state placeholder for lists with no data.
 *
 * Props:
 *   icon         - React icon component (default: HiOutlineInboxStack)
 *   title        - Heading text (default: "No records found")
 *   description  - Subtext description
 *   actionLabel  - Button label for the optional CTA
 *   onAction     - Click handler for the CTA button
 */
export default function ZohoEmptyState({
  icon: Icon = HiOutlineInboxStack,
  title = 'No records found',
  description,
  actionLabel,
  onAction,
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6">
      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-base font-medium text-[var(--zoho-text)] mb-1">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-[var(--zoho-text-secondary)] text-center max-w-sm mb-4">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center gap-1.5 bg-[#0071DC] hover:bg-[#005BB5] text-white text-sm font-medium px-4 py-2 rounded-md transition-colors duration-150 cursor-pointer"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
