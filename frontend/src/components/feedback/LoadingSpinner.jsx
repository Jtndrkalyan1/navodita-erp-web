import React from 'react';

/**
 * LoadingSpinner - Animated loading indicator.
 *
 * Props:
 *   size     - 'sm' | 'md' | 'lg' (default: 'md')
 *   overlay  - If true, render full-page semi-transparent overlay
 *   label    - Optional accessible label (default: 'Loading...')
 *   className - Additional CSS classes
 */
export default function LoadingSpinner({
  size = 'md',
  overlay = false,
  label = 'Loading...',
  className = '',
}) {
  const sizeMap = {
    sm: 'w-5 h-5 border-2',
    md: 'w-8 h-8 border-[3px]',
    lg: 'w-12 h-12 border-4',
  };

  const spinner = (
    <div
      role="status"
      aria-label={label}
      className={`flex flex-col items-center justify-center gap-3 ${className}`}
    >
      <div
        className={`${sizeMap[size] || sizeMap.md} rounded-full border-gray-200 border-t-[#0071DC] animate-spin`}
      />
      {size === 'lg' && (
        <span className="text-sm text-[var(--zoho-text-secondary)]">{label}</span>
      )}
      <span className="sr-only">{label}</span>
    </div>
  );

  if (overlay) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/70 backdrop-blur-sm">
        {spinner}
      </div>
    );
  }

  return spinner;
}
