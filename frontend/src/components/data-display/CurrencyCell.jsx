import React from 'react';

/**
 * CurrencyCell - Formatted currency display cell.
 *
 * Props:
 *   amount       - Numeric amount to display
 *   currencyCode - ISO currency code (default: 'INR')
 *   showSign     - If true, show + for positive values
 *   className    - Additional CSS classes
 *
 * For INR, uses the Indian numbering system (lakhs/crores):
 *   1,00,000   = 1 lakh
 *   1,00,00,000 = 1 crore
 */

function formatIndianNumber(num) {
  const absNum = Math.abs(num);
  const str = absNum.toFixed(2);
  const [intPart, decPart] = str.split('.');

  if (intPart.length <= 3) {
    return intPart + '.' + decPart;
  }

  // Last 3 digits
  let result = intPart.slice(-3);
  let remaining = intPart.slice(0, -3);

  // Group by 2 from here on
  while (remaining.length > 0) {
    const chunk = remaining.slice(-2);
    result = chunk + ',' + result;
    remaining = remaining.slice(0, -2);
  }

  return result + '.' + decPart;
}

function formatCurrency(amount, currencyCode) {
  if (amount == null || isNaN(amount)) return '--';

  const num = Number(amount);

  if (currencyCode === 'INR') {
    return formatIndianNumber(num);
  }

  // For non-INR, use standard Intl formatting
  try {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.abs(num));
  } catch {
    return Math.abs(num).toFixed(2);
  }
}

const CURRENCY_SYMBOLS = {
  INR: '\u20B9',
  USD: '$',
  EUR: '\u20AC',
  GBP: '\u00A3',
  JPY: '\u00A5',
  AED: 'AED',
};

export default function CurrencyCell({
  amount,
  currencyCode = 'INR',
  showSign = false,
  className = '',
}) {
  if (amount == null || isNaN(Number(amount))) {
    return (
      <span className={`text-right text-[var(--zoho-text-secondary)] ${className}`}>
        --
      </span>
    );
  }

  const num = Number(amount);
  const isNegative = num < 0;
  const symbol = CURRENCY_SYMBOLS[currencyCode] || currencyCode + ' ';
  const formatted = formatCurrency(num, currencyCode);
  const sign = isNegative ? '-' : showSign && num > 0 ? '+' : '';

  return (
    <span
      className={`text-right tabular-nums font-medium ${
        isNegative ? 'text-red-600' : 'text-[var(--zoho-text)]'
      } ${className}`}
    >
      {sign}
      {symbol}
      {formatted}
    </span>
  );
}

// Also export the formatter for standalone use
export { formatIndianNumber, formatCurrency };
