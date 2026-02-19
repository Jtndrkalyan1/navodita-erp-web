import React from 'react';

/**
 * StatusBadge - Rounded pill status indicator.
 *
 * Props:
 *   status - Status string (case-insensitive). Known: Draft, Final, Partial, Paid, Overdue,
 *            Cancelled, Pending, Approved, Active, Inactive, Open, Closed, Sent, Accepted, Rejected,
 *            Declined, Expired
 *   size   - 'sm' | 'md' (default: 'md')
 *   className - Additional CSS classes
 */

const STATUS_STYLES = {
  draft:     { bg: 'bg-gray-100',   text: 'text-gray-600',   dot: 'bg-gray-400' },
  final:     { bg: 'bg-blue-50',    text: 'text-blue-700',   dot: 'bg-blue-500' },
  partial:   { bg: 'bg-orange-50',  text: 'text-orange-700', dot: 'bg-orange-400' },
  paid:      { bg: 'bg-green-50',   text: 'text-green-700',  dot: 'bg-green-500' },
  overdue:   { bg: 'bg-red-50',     text: 'text-red-700',    dot: 'bg-red-500' },
  cancelled: { bg: 'bg-gray-100',   text: 'text-gray-500',   dot: 'bg-gray-400' },
  pending:   { bg: 'bg-yellow-50',  text: 'text-yellow-700', dot: 'bg-yellow-500' },
  approved:  { bg: 'bg-green-50',   text: 'text-green-700',  dot: 'bg-green-500' },
  active:    { bg: 'bg-green-50',   text: 'text-green-700',  dot: 'bg-green-500' },
  inactive:  { bg: 'bg-gray-100',   text: 'text-gray-500',   dot: 'bg-gray-400' },
  open:      { bg: 'bg-blue-50',    text: 'text-blue-700',   dot: 'bg-blue-500' },
  closed:    { bg: 'bg-gray-100',   text: 'text-gray-600',   dot: 'bg-gray-400' },
  sent:      { bg: 'bg-blue-50',    text: 'text-blue-700',   dot: 'bg-blue-500' },
  accepted:  { bg: 'bg-green-50',   text: 'text-green-700',  dot: 'bg-green-500' },
  rejected:  { bg: 'bg-red-50',     text: 'text-red-700',    dot: 'bg-red-500' },
  declined:  { bg: 'bg-red-50',     text: 'text-red-700',    dot: 'bg-red-500' },
  expired:   { bg: 'bg-orange-50',  text: 'text-orange-700', dot: 'bg-orange-400' },
};

const DEFAULT_STYLE = { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' };

export default function StatusBadge({ status, size = 'md', className = '' }) {
  if (!status) return null;

  const key = String(status).toLowerCase().trim();
  const style = STATUS_STYLES[key] || DEFAULT_STYLE;

  const sizeClasses =
    size === 'sm'
      ? 'text-[10px] px-2 py-0.5'
      : 'text-xs px-2.5 py-1';

  const dotSize = size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium leading-none ${style.bg} ${style.text} ${sizeClasses} ${className}`}
    >
      <span className={`${dotSize} rounded-full ${style.dot} shrink-0`} />
      {status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()}
    </span>
  );
}
