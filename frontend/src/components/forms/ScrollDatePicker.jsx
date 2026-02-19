import React, { useState, useRef, useEffect, useCallback } from 'react';

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const MONTH_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const ITEM_HEIGHT = 40;
const VISIBLE_ITEMS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

/**
 * Get number of days in a given month/year
 */
function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Generate year range (100 years back, 20 years forward)
 */
function generateYears() {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let y = currentYear - 100; y <= currentYear + 20; y++) {
    years.push(y);
  }
  return years;
}

const ALL_YEARS = generateYears();

/**
 * Format a date as "DD MMM YYYY"
 */
function formatDisplayDate(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const [y, m, d] = parts;
  const monthIdx = parseInt(m, 10) - 1;
  if (monthIdx < 0 || monthIdx > 11) return dateStr;
  return `${parseInt(d, 10)} ${MONTHS[monthIdx]} ${y}`;
}

/**
 * Parse YYYY-MM-DD into { year, month (0-indexed), day }
 */
function parseDateStr(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.split('-');
  if (parts.length !== 3) return null;
  return {
    year: parseInt(parts[0], 10),
    month: parseInt(parts[1], 10) - 1,
    day: parseInt(parts[2], 10),
  };
}

/**
 * Build YYYY-MM-DD from components
 */
function buildDateStr(year, month, day) {
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

// ─── Scroll Column ────────────────────────────────────────────

function ScrollColumn({ items, selectedIndex, onSelect, label, renderItem }) {
  const containerRef = useRef(null);
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef(null);
  const suppressScrollRef = useRef(false);

  // Scroll to selected index on mount and when selectedIndex changes externally
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    suppressScrollRef.current = true;
    const targetTop = selectedIndex * ITEM_HEIGHT;
    el.scrollTop = targetTop;
    // Allow scroll events again after a brief delay
    const timer = setTimeout(() => {
      suppressScrollRef.current = false;
    }, 100);
    return () => clearTimeout(timer);
  }, [selectedIndex, items.length]);

  const handleScroll = useCallback(() => {
    if (suppressScrollRef.current) return;
    isScrollingRef.current = true;
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = setTimeout(() => {
      isScrollingRef.current = false;
      const el = containerRef.current;
      if (!el) return;
      const idx = Math.round(el.scrollTop / ITEM_HEIGHT);
      const clampedIdx = Math.max(0, Math.min(idx, items.length - 1));
      if (clampedIdx !== selectedIndex) {
        onSelect(clampedIdx);
      }
      // Snap to exact position
      suppressScrollRef.current = true;
      el.scrollTop = clampedIdx * ITEM_HEIGHT;
      setTimeout(() => { suppressScrollRef.current = false; }, 50);
    }, 80);
  }, [items.length, selectedIndex, onSelect]);

  const handleItemClick = useCallback((idx) => {
    onSelect(idx);
  }, [onSelect]);

  // Padding items at top/bottom so the first/last item can be centered
  const paddingCount = Math.floor(VISIBLE_ITEMS / 2);

  return (
    <div className="sdp-column">
      <div className="sdp-column-label">{label}</div>
      <div className="sdp-scroll-outer">
        <div className="sdp-highlight-bar" />
        <div
          ref={containerRef}
          className="sdp-scroll-container"
          onScroll={handleScroll}
        >
          {/* Top padding */}
          {Array.from({ length: paddingCount }).map((_, i) => (
            <div key={`pad-top-${i}`} className="sdp-item sdp-item-padding" />
          ))}
          {items.map((item, idx) => (
            <div
              key={`${item}-${idx}`}
              className={`sdp-item ${idx === selectedIndex ? 'sdp-item-selected' : ''}`}
              onClick={() => handleItemClick(idx)}
            >
              {renderItem ? renderItem(item, idx) : item}
            </div>
          ))}
          {/* Bottom padding */}
          {Array.from({ length: paddingCount }).map((_, i) => (
            <div key={`pad-bot-${i}`} className="sdp-item sdp-item-padding" />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main ScrollDatePicker ────────────────────────────────────

/**
 * ScrollDatePicker - Modern iOS-style scroll-to-select date picker.
 *
 * Props:
 *   value      - Date string in YYYY-MM-DD format
 *   onChange    - Callback: (dateStr: string) => void
 *   label      - Field label
 *   required   - Show asterisk
 *   error      - Error message
 *   helpText   - Help text
 *   disabled   - Disable the picker
 *   min        - Minimum date (YYYY-MM-DD) - reserved for future use
 *   max        - Maximum date (YYYY-MM-DD) - reserved for future use
 *   id         - Input element id
 *   className  - Additional wrapper classes
 *   placeholder - Placeholder text
 *   inline     - If true, render without label/error wrapper (for inline usage)
 *   compact    - If true, use compact trigger styling (for date range pickers)
 *   inputClassName - Override trigger input class
 *   name       - Input name attribute (for form compatibility)
 */
export default function ScrollDatePicker({
  value,
  onChange,
  label,
  required = false,
  error,
  helpText,
  disabled = false,
  min,
  max,
  id,
  className = '',
  placeholder = 'Select date',
  inline = false,
  compact = false,
  inputClassName: inputClassOverride,
  name,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);
  const triggerRef = useRef(null);
  const [dropdownPosition, setDropdownPosition] = useState('below');

  // Internal state for picker wheels
  const today = new Date();
  const parsed = parseDateStr(value);
  const [selYear, setSelYear] = useState(parsed ? parsed.year : today.getFullYear());
  const [selMonth, setSelMonth] = useState(parsed ? parsed.month : today.getMonth());
  const [selDay, setSelDay] = useState(parsed ? parsed.day : today.getDate());

  // Sync internal state when value prop changes
  useEffect(() => {
    const p = parseDateStr(value);
    if (p) {
      setSelYear(p.year);
      setSelMonth(p.month);
      setSelDay(p.day);
    }
  }, [value]);

  // Days array based on current year/month
  const maxDay = daysInMonth(selYear, selMonth);
  const days = Array.from({ length: maxDay }, (_, i) => i + 1);

  // Clamp day if month/year changed
  const clampedDay = Math.min(selDay, maxDay);
  useEffect(() => {
    if (selDay > maxDay) {
      setSelDay(maxDay);
    }
  }, [maxDay, selDay]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Calculate dropdown position
  useEffect(() => {
    if (!isOpen || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const pickerHeight = 320;
    setDropdownPosition(spaceBelow < pickerHeight ? 'above' : 'below');
  }, [isOpen]);

  // Year index
  const yearIndex = ALL_YEARS.indexOf(selYear);
  const safeYearIndex = yearIndex >= 0 ? yearIndex : ALL_YEARS.indexOf(today.getFullYear());

  const handleOpen = () => {
    if (disabled) return;
    // If no value set, initialize to today
    if (!value) {
      setSelYear(today.getFullYear());
      setSelMonth(today.getMonth());
      setSelDay(today.getDate());
    }
    setIsOpen(true);
  };

  const handleDone = () => {
    const finalDay = Math.min(clampedDay, maxDay);
    const dateStr = buildDateStr(selYear, selMonth, finalDay);
    onChange?.(dateStr);
    setIsOpen(false);
  };

  const handleToday = () => {
    const t = new Date();
    setSelYear(t.getFullYear());
    setSelMonth(t.getMonth());
    setSelDay(t.getDate());
  };

  const handleClear = () => {
    onChange?.('');
    setIsOpen(false);
  };

  const displayValue = formatDisplayDate(value);

  // Trigger input class
  const baseInputClass = compact
    ? 'px-2 py-1.5 text-sm bg-white border border-[#E5E7EB] rounded-lg text-[#333] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC] cursor-pointer select-none'
    : 'w-full px-3 py-2 text-sm border rounded-md bg-white text-[var(--zoho-text)] placeholder-gray-400 transition-colors duration-150 focus:outline-none focus:ring-2 cursor-pointer select-none';

  const normalBorder = 'border-[var(--zoho-border)] focus:ring-[#0071DC]/20 focus:border-[#0071DC]';
  const errorBorder = 'border-red-300 focus:ring-red-500/20 focus:border-red-500';
  const disabledClass = disabled ? 'bg-gray-50 cursor-not-allowed opacity-60' : '';

  const triggerClass = inputClassOverride
    ? inputClassOverride
    : `${baseInputClass} ${error ? errorBorder : normalBorder} ${disabledClass}`;

  const triggerInput = (
    <div ref={wrapperRef} className={`sdp-wrapper ${inline ? '' : 'relative'}`} style={{ position: 'relative' }}>
      <div
        ref={triggerRef}
        className={triggerClass}
        onClick={handleOpen}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleOpen(); } }}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center justify-between">
          <span className={displayValue ? 'text-[var(--zoho-text,#333)]' : 'text-gray-400'}>
            {displayValue || placeholder}
          </span>
          <svg className="w-4 h-4 text-gray-400 shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      </div>

      {/* Hidden native input for form compatibility */}
      {name && (
        <input type="hidden" name={name} value={value || ''} />
      )}

      {isOpen && (
        <div
          className={`sdp-dropdown ${dropdownPosition === 'above' ? 'sdp-dropdown-above' : 'sdp-dropdown-below'}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Picker header */}
          <div className="sdp-header">
            <span className="sdp-header-date">
              {clampedDay} {MONTH_FULL[selMonth]} {selYear}
            </span>
            <button type="button" className="sdp-today-btn" onClick={handleToday}>
              Today
            </button>
          </div>

          {/* Wheel columns */}
          <div className="sdp-wheels">
            <ScrollColumn
              items={days}
              selectedIndex={clampedDay - 1}
              onSelect={(idx) => setSelDay(idx + 1)}
              label="Day"
              renderItem={(d) => String(d).padStart(2, '0')}
            />
            <ScrollColumn
              items={MONTHS}
              selectedIndex={selMonth}
              onSelect={(idx) => setSelMonth(idx)}
              label="Month"
            />
            <ScrollColumn
              items={ALL_YEARS}
              selectedIndex={safeYearIndex}
              onSelect={(idx) => setSelYear(ALL_YEARS[idx])}
              label="Year"
            />
          </div>

          {/* Footer */}
          <div className="sdp-footer">
            <button type="button" className="sdp-clear-btn" onClick={handleClear}>
              Clear
            </button>
            <button type="button" className="sdp-done-btn" onClick={handleDone}>
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // If inline mode, just return the trigger+dropdown
  if (inline) {
    return triggerInput;
  }

  // Full mode with label, error, helpText (matches FormField wrapper)
  const inputId = id || `sdp-${label?.toLowerCase().replace(/\s+/g, '-') || 'field'}`;

  return (
    <div className={`mb-4 ${className}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-[var(--zoho-text)] mb-1.5"
        >
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}

      {triggerInput}

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
