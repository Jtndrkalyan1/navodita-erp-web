import React from 'react';
import { HiChevronDown } from 'react-icons/hi2';
import FormField from './FormField';
import { inputClassName } from './FormField';

/**
 * SelectField - Styled select dropdown matching Zoho theme.
 *
 * Props:
 *   options     - Array of { value, label } or plain strings
 *   value       - Selected value
 *   onChange     - Callback: (value: string) => void
 *   label       - Field label
 *   required    - Show asterisk
 *   placeholder - Placeholder option text (default: "Select...")
 *   error       - Error message
 *   helpText    - Help text
 *   disabled    - Disable the select
 *   id          - Element id
 *   className   - Additional wrapper classes
 */
export default function SelectField({
  options = [],
  value,
  onChange,
  label,
  required = false,
  placeholder = 'Select...',
  error,
  helpText,
  disabled = false,
  id,
  className = '',
}) {
  const selectId = id || `select-${label?.toLowerCase().replace(/\s+/g, '-') || 'field'}`;

  const normalizedOptions = options.map((opt) =>
    typeof opt === 'string' ? { value: opt, label: opt } : opt
  );

  return (
    <FormField
      label={label}
      required={required}
      error={error}
      helpText={helpText}
      htmlFor={selectId}
      className={className}
    >
      <div className="relative">
        <select
          id={selectId}
          value={value ?? ''}
          onChange={(e) => onChange?.(e.target.value)}
          required={required}
          disabled={disabled}
          className={`${inputClassName(error)} appearance-none pr-9 ${disabled ? 'bg-gray-50 cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {normalizedOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <HiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      </div>
    </FormField>
  );
}
