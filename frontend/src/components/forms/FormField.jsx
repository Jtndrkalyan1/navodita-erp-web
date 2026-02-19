import React from 'react';

/**
 * FormField - Standard form field wrapper with label, error, and help text.
 *
 * Props:
 *   label     - Field label
 *   required  - Show asterisk indicator
 *   error     - Error message string (if present, field shows red border hint)
 *   helpText  - Help text shown below the field
 *   htmlFor   - Associated input id for the label
 *   children  - The form input element(s)
 *   className - Additional CSS classes for the wrapper
 */
export default function FormField({
  label,
  required = false,
  error,
  helpText,
  htmlFor,
  children,
  className = '',
}) {
  return (
    <div className={`mb-4 ${className}`}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="block text-sm font-medium text-[var(--zoho-text)] mb-1.5"
        >
          {label}
          {required && (
            <span className="text-red-500 ml-0.5">*</span>
          )}
        </label>
      )}

      {children}

      {error && (
        <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
          <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          {error}
        </p>
      )}

      {helpText && !error && (
        <p className="mt-1 text-xs text-[var(--zoho-text-secondary)]">
          {helpText}
        </p>
      )}
    </div>
  );
}

/**
 * Shared input className generator for consistent styling.
 * Usage: <input className={inputClassName(error)} />
 */
export function inputClassName(hasError) {
  const base =
    'w-full px-3 py-2 text-sm border rounded-md bg-white text-[var(--zoho-text)] placeholder-gray-400 transition-colors duration-150 focus:outline-none focus:ring-2';
  const normal =
    'border-[var(--zoho-border)] focus:ring-[#0071DC]/20 focus:border-[#0071DC]';
  const errorStyle =
    'border-red-300 focus:ring-red-500/20 focus:border-red-500';

  return `${base} ${hasError ? errorStyle : normal}`;
}
