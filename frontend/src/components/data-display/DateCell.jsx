import React from 'react';
import dayjs from 'dayjs';

/**
 * DateCell - Formatted date display cell.
 *
 * Props:
 *   date      - Date value (string, Date, or dayjs object)
 *   format    - dayjs format string (default: 'DD MMM YYYY')
 *   className - Additional CSS classes
 *   fallback  - Text shown when date is null/invalid (default: '--')
 */
export default function DateCell({
  date,
  format = 'DD MMM YYYY',
  className = '',
  fallback = '--',
}) {
  if (!date) {
    return (
      <span className={`text-[var(--zoho-text-secondary)] ${className}`}>
        {fallback}
      </span>
    );
  }

  const parsed = dayjs(date);

  if (!parsed.isValid()) {
    return (
      <span className={`text-[var(--zoho-text-secondary)] ${className}`}>
        {fallback}
      </span>
    );
  }

  return (
    <span className={`text-sm text-[var(--zoho-text)] whitespace-nowrap ${className}`}>
      {parsed.format(format)}
    </span>
  );
}
