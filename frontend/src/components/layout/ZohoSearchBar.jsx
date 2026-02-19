import React, { useState, useEffect, useRef, useCallback } from 'react';
import { HiOutlineMagnifyingGlass, HiOutlineXMark } from 'react-icons/hi2';

/**
 * ZohoSearchBar - Search input with magnifying glass icon and debounced onChange.
 *
 * Props:
 *   value       - Controlled search value
 *   onChange     - Callback receiving the debounced search string
 *   placeholder  - Input placeholder text (default: "Search...")
 *   debounceMs   - Debounce delay in ms (default: 300)
 *   className    - Additional CSS classes for the wrapper
 */
export default function ZohoSearchBar({
  value = '',
  onChange,
  placeholder = 'Search...',
  debounceMs = 300,
  className = '',
}) {
  const [localValue, setLocalValue] = useState(value);
  const timerRef = useRef(null);
  const inputRef = useRef(null);

  // Sync external value changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const debouncedOnChange = useCallback(
    (val) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        onChange?.(val);
      }, debounceMs);
    },
    [onChange, debounceMs]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleChange = (e) => {
    const val = e.target.value;
    setLocalValue(val);
    debouncedOnChange(val);
  };

  const handleClear = () => {
    setLocalValue('');
    onChange?.('');
    inputRef.current?.focus();
  };

  return (
    <div
      className={`relative flex items-center ${className}`}
    >
      <HiOutlineMagnifyingGlass className="absolute left-3 w-4 h-4 text-gray-400 pointer-events-none" />
      <input
        ref={inputRef}
        type="text"
        value={localValue}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full pl-9 pr-8 py-2 text-sm border border-[var(--zoho-border)] rounded-md bg-white text-[var(--zoho-text)] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC] transition-colors duration-150"
      />
      {localValue && (
        <button
          onClick={handleClear}
          className="absolute right-2 p-0.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors duration-150 cursor-pointer"
          aria-label="Clear search"
        >
          <HiOutlineXMark className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
