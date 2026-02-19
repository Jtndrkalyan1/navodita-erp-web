import React from 'react';
import FormField from './FormField';
import { inputClassName } from './FormField';

/**
 * DatePicker - Date input styled to match the Zoho theme.
 *
 * Props:
 *   value     - Date value (string in YYYY-MM-DD format)
 *   onChange   - Callback: (value: string) => void
 *   label     - Field label
 *   required  - Show asterisk and required attribute
 *   error     - Error message
 *   helpText  - Help text
 *   min       - Minimum date (YYYY-MM-DD)
 *   max       - Maximum date (YYYY-MM-DD)
 *   disabled  - Disable the input
 *   id        - Input element id
 *   className - Additional CSS classes for the wrapper
 */
export default function DatePicker({
  value,
  onChange,
  label,
  required = false,
  error,
  helpText,
  min,
  max,
  disabled = false,
  id,
  className = '',
}) {
  const inputId = id || `datepicker-${label?.toLowerCase().replace(/\s+/g, '-') || 'field'}`;

  return (
    <FormField
      label={label}
      required={required}
      error={error}
      helpText={helpText}
      htmlFor={inputId}
      className={className}
    >
      <input
        id={inputId}
        type="date"
        value={value || ''}
        onChange={(e) => onChange?.(e.target.value)}
        required={required}
        min={min}
        max={max}
        disabled={disabled}
        className={`${inputClassName(error)} ${disabled ? 'bg-gray-50 cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
      />
    </FormField>
  );
}
