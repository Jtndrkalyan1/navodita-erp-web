import React, { useMemo } from 'react';
import { HiChevronLeft, HiChevronRight } from 'react-icons/hi2';

/**
 * Pagination - Page navigation controls with record count display.
 *
 * Props:
 *   currentPage  - Active page number (1-indexed)
 *   totalPages   - Total number of pages
 *   totalRecords - Total record count
 *   onPageChange - Callback: (pageNumber) => void
 *   limit        - Records per page (for display calculation)
 *   className    - Additional CSS classes
 */
export default function Pagination({
  currentPage = 1,
  totalPages = 1,
  totalRecords = 0,
  onPageChange,
  limit = 20,
  className = '',
}) {
  const rangeStart = Math.min((currentPage - 1) * limit + 1, totalRecords);
  const rangeEnd = Math.min(currentPage * limit, totalRecords);

  // Compute which page numbers to show
  const pageNumbers = useMemo(() => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      // Show all pages
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      // Always show first page
      pages.push(1);

      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);

      // Adjust window if near edges
      if (currentPage <= 3) {
        end = Math.min(maxVisible, totalPages - 1);
      } else if (currentPage >= totalPages - 2) {
        start = Math.max(2, totalPages - maxVisible + 1);
      }

      if (start > 2) pages.push('...');

      for (let i = start; i <= end; i++) pages.push(i);

      if (end < totalPages - 1) pages.push('...');

      // Always show last page
      pages.push(totalPages);
    }

    return pages;
  }, [currentPage, totalPages]);

  if (totalPages <= 1 && totalRecords <= limit) return null;

  const buttonBase =
    'inline-flex items-center justify-center min-w-[32px] h-8 px-2 text-sm rounded-md transition-colors duration-150 cursor-pointer';

  return (
    <div
      className={`flex items-center justify-between py-3 ${className}`}
    >
      {/* Record count */}
      <p className="text-sm text-[var(--zoho-text-secondary)]">
        Showing{' '}
        <span className="font-medium text-[var(--zoho-text)]">{rangeStart}</span>
        {' - '}
        <span className="font-medium text-[var(--zoho-text)]">{rangeEnd}</span>
        {' of '}
        <span className="font-medium text-[var(--zoho-text)]">{totalRecords}</span>
      </p>

      {/* Page controls */}
      <div className="flex items-center gap-1">
        {/* Previous */}
        <button
          onClick={() => onPageChange?.(currentPage - 1)}
          disabled={currentPage <= 1}
          className={`${buttonBase} text-[var(--zoho-text-secondary)] hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed`}
          aria-label="Previous page"
        >
          <HiChevronLeft className="w-4 h-4" />
        </button>

        {/* Page numbers */}
        {pageNumbers.map((page, index) => {
          if (page === '...') {
            return (
              <span
                key={`ellipsis-${index}`}
                className="inline-flex items-center justify-center min-w-[32px] h-8 text-sm text-[var(--zoho-text-secondary)]"
              >
                ...
              </span>
            );
          }

          const isActive = page === currentPage;
          return (
            <button
              key={page}
              onClick={() => !isActive && onPageChange?.(page)}
              className={`${buttonBase} ${
                isActive
                  ? 'bg-[#0071DC] text-white font-medium'
                  : 'text-[var(--zoho-text)] hover:bg-gray-100'
              }`}
              aria-label={`Page ${page}`}
              aria-current={isActive ? 'page' : undefined}
            >
              {page}
            </button>
          );
        })}

        {/* Next */}
        <button
          onClick={() => onPageChange?.(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className={`${buttonBase} text-[var(--zoho-text-secondary)] hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed`}
          aria-label="Next page"
        >
          <HiChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
