import React, { useCallback } from 'react';
import ZohoColumnHeader from '../layout/ZohoColumnHeader';
import ZohoEmptyState from '../layout/ZohoEmptyState';

/**
 * DataTable - Main data table component used throughout the application.
 *
 * Props:
 *   columns      - Array of column definitions:
 *                   { key, label, render, sortable, width, align }
 *                   - key: string - field accessor key
 *                   - label: string - column header text
 *                   - render: (value, row, index) => ReactNode - custom renderer
 *                   - sortable: boolean - enable sorting for this column
 *                   - width: string - CSS width (e.g. '120px', '20%')
 *                   - align: 'left' | 'center' | 'right'
 *   data         - Array of row objects
 *   loading      - Show skeleton loading state
 *   onRowClick   - Callback: (row, index) => void
 *   selectedIds  - Set or array of selected row IDs
 *   onSelect     - Callback: (selectedIds: Set) => void  (enables checkbox column)
 *   idField      - Field name for row identity (default: 'id')
 *   sortField    - Currently active sort column key
 *   sortOrder    - 'asc' | 'desc'
 *   onSort       - Callback: (field, order) => void
 *   emptyMessage - Custom empty state message
 *   emptyIcon    - Custom empty state icon component
 *   className    - Additional CSS classes
 *   skeletonRows - Number of skeleton rows to show (default: 6)
 */
export default function DataTable({
  columns = [],
  data = [],
  loading = false,
  onRowClick,
  selectedIds,
  onSelect,
  idField = 'id',
  sortField,
  sortOrder,
  onSort,
  emptyMessage = 'No records found',
  emptyIcon,
  className = '',
  skeletonRows = 6,
}) {
  const selectable = !!onSelect;
  const selectedSet =
    selectedIds instanceof Set
      ? selectedIds
      : new Set(selectedIds || []);

  const allSelected =
    data.length > 0 && data.every((row) => selectedSet.has(row[idField]));
  const someSelected =
    data.length > 0 && data.some((row) => selectedSet.has(row[idField])) && !allSelected;

  const handleSelectAll = useCallback(() => {
    if (!onSelect) return;
    if (allSelected) {
      // Deselect all visible
      const newSet = new Set(selectedSet);
      data.forEach((row) => newSet.delete(row[idField]));
      onSelect(newSet);
    } else {
      // Select all visible
      const newSet = new Set(selectedSet);
      data.forEach((row) => newSet.add(row[idField]));
      onSelect(newSet);
    }
  }, [allSelected, data, idField, onSelect, selectedSet]);

  const handleSelectRow = useCallback(
    (rowId, e) => {
      e.stopPropagation();
      if (!onSelect) return;
      const newSet = new Set(selectedSet);
      if (newSet.has(rowId)) {
        newSet.delete(rowId);
      } else {
        newSet.add(rowId);
      }
      onSelect(newSet);
    },
    [onSelect, selectedSet]
  );

  const totalCols = columns.length + (selectable ? 1 : 0);

  // Skeleton rows for loading state
  if (loading) {
    return (
      <div className={`bg-white border border-[var(--zoho-border)] rounded-lg overflow-hidden ${className}`}>
        <table className="w-full">
          <thead>
            <tr>
              {selectable && (
                <th className="px-4 py-3 w-10 bg-gray-50 border-b border-[var(--zoho-border)]" />
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--zoho-text-secondary)] bg-gray-50 border-b border-[var(--zoho-border)] text-left"
                  style={col.width ? { width: col.width } : undefined}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: skeletonRows }).map((_, i) => (
              <tr key={i} className="border-b border-gray-100">
                {selectable && (
                  <td className="px-4 py-3.5">
                    <div className="w-4 h-4 rounded bg-gray-200 animate-pulse" />
                  </td>
                )}
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3.5">
                    <div
                      className="h-4 rounded bg-gray-200 animate-pulse"
                      style={{ width: `${55 + Math.random() * 35}%` }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Empty state
  if (data.length === 0) {
    return (
      <div className={`bg-white border border-[var(--zoho-border)] rounded-lg overflow-hidden ${className}`}>
        <table className="w-full">
          <thead>
            <tr>
              {selectable && (
                <th className="px-4 py-3 w-10 bg-gray-50 border-b border-[var(--zoho-border)]" />
              )}
              {columns.map((col) => (
                <ZohoColumnHeader
                  key={col.key}
                  label={col.label}
                  field={col.sortable ? col.key : undefined}
                  currentSort={sortField}
                  currentOrder={sortOrder}
                  onSort={col.sortable ? onSort : undefined}
                  align={col.align}
                />
              ))}
            </tr>
          </thead>
        </table>
        <ZohoEmptyState
          title={emptyMessage}
          icon={emptyIcon}
          description="Try adjusting your filters or creating a new record."
        />
      </div>
    );
  }

  return (
    <div className={`bg-white border border-[var(--zoho-border)] rounded-lg overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              {selectable && (
                <th className="px-4 py-3 w-10 bg-gray-50 border-b border-[var(--zoho-border)]">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected;
                    }}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-[#0071DC] focus:ring-[#0071DC] cursor-pointer"
                  />
                </th>
              )}
              {columns.map((col) => (
                <ZohoColumnHeader
                  key={col.key}
                  label={col.label}
                  field={col.sortable ? col.key : undefined}
                  currentSort={sortField}
                  currentOrder={sortOrder}
                  onSort={col.sortable ? onSort : undefined}
                  align={col.align}
                  className={col.width ? '' : ''}
                />
              ))}
            </tr>
          </thead>

          <tbody>
            {data.map((row, rowIndex) => {
              const rowId = row[idField];
              const isSelected = selectedSet.has(rowId);
              const isEvenRow = rowIndex % 2 === 0;

              return (
                <tr
                  key={rowId ?? rowIndex}
                  onClick={() => onRowClick?.(row, rowIndex)}
                  className={`border-b border-gray-100 transition-colors duration-100 ${
                    onRowClick ? 'cursor-pointer' : ''
                  } ${
                    isSelected
                      ? 'bg-blue-50/60'
                      : isEvenRow
                        ? 'bg-white'
                        : 'bg-gray-50/30'
                  } hover:bg-blue-50/40`}
                >
                  {selectable && (
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => handleSelectRow(rowId, e)}
                        className="w-4 h-4 rounded border-gray-300 text-[#0071DC] focus:ring-[#0071DC] cursor-pointer"
                      />
                    </td>
                  )}
                  {columns.map((col) => {
                    const value = row[col.key];
                    const alignClass =
                      col.align === 'right'
                        ? 'text-right'
                        : col.align === 'center'
                          ? 'text-center'
                          : 'text-left';

                    return (
                      <td
                        key={col.key}
                        className={`px-4 py-3 text-sm text-[var(--zoho-text)] ${alignClass}`}
                        style={col.width ? { width: col.width } : undefined}
                      >
                        {col.render
                          ? col.render(value, row, rowIndex)
                          : value ?? '--'}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
