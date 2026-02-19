import React from 'react';
import { HiChevronUp, HiChevronDown } from 'react-icons/hi2';

/**
 * ZohoColumnHeader - Sortable table column header with sort arrows.
 *
 * Props:
 *   label        - Column display label
 *   field        - Field key used for sorting
 *   currentSort  - Currently active sort field
 *   currentOrder - 'asc' | 'desc'
 *   onSort       - Callback: (field, order) => void
 *   align        - Text alignment: 'left' | 'center' | 'right' (default: 'left')
 *   className    - Additional CSS classes
 */
export default function ZohoColumnHeader({
  label,
  field,
  currentSort,
  currentOrder,
  onSort,
  align = 'left',
  className = '',
}) {
  const isActive = currentSort === field;
  const isSortable = !!field && !!onSort;

  const handleClick = () => {
    if (!isSortable) return;
    const nextOrder = isActive && currentOrder === 'asc' ? 'desc' : 'asc';
    onSort(field, nextOrder);
  };

  const alignClass =
    align === 'right'
      ? 'justify-end'
      : align === 'center'
        ? 'justify-center'
        : 'justify-start';

  return (
    <th
      className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--zoho-text-secondary)] bg-gray-50 border-b border-[var(--zoho-border)] ${isSortable ? 'cursor-pointer select-none hover:bg-gray-100' : ''} ${className}`}
      onClick={handleClick}
    >
      <div className={`flex items-center gap-1 ${alignClass}`}>
        <span>{label}</span>
        {isSortable && (
          <div className="flex flex-col -space-y-1">
            <HiChevronUp
              className={`w-3 h-3 ${isActive && currentOrder === 'asc' ? 'text-[#0071DC]' : 'text-gray-300'}`}
            />
            <HiChevronDown
              className={`w-3 h-3 ${isActive && currentOrder === 'desc' ? 'text-[#0071DC]' : 'text-gray-300'}`}
            />
          </div>
        )}
      </div>
    </th>
  );
}
