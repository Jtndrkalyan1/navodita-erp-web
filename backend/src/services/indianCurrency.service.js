/**
 * Indian Currency Formatter Service
 * Ported from: NavoditaERP/Components/IndianCurrencyFormatter.swift
 *
 * Formats numbers in Indian Numbering System (Lakhs, Crores)
 * Example: 1,23,456.78 instead of 123,456.78
 * Includes compact notation (K, L, Cr), parse, and amountInWords.
 */

// Currency symbols map
const CURRENCY_SYMBOLS = {
  INR: '\u20B9',   // Indian Rupee symbol
  USD: '$',
  EUR: '\u20AC',   // Euro
  GBP: '\u00A3',   // Pound
  AED: 'AED ',
  CAD: 'C$',
  JPY: '\u00A5',   // Yen
  SAR: 'SAR ',
  SGD: 'S$',
};

/**
 * Get currency symbol for a code.
 * @param {string} code - Currency code
 * @returns {string}
 */
function currencySymbol(code) {
  const upper = (code || '').toUpperCase();
  return CURRENCY_SYMBOLS[upper] || (upper + ' ');
}

// ============================================================================
// Indian Integer Formatting (1,23,456 style)
// ============================================================================

/**
 * Format an integer in Indian grouping (last 3, then groups of 2).
 * @param {number} value - Non-negative integer
 * @returns {string}
 */
function formatIndianInteger(value) {
  if (value === 0) return '0';

  let number = value;
  // First group: last 3 digits (thousands)
  const lastThree = number % 1000;
  number = Math.floor(number / 1000);

  if (number > 0) {
    // Remaining groups: 2 digits each (lakhs, crores, etc.)
    const groups = [];

    while (number > 0) {
      const group = number % 100;
      groups.push(number > 99 ? String(group).padStart(2, '0') : String(group));
      number = Math.floor(number / 100);
    }

    return groups.reverse().join(',') + ',' + String(lastThree).padStart(3, '0');
  } else {
    return String(lastThree);
  }
}

/**
 * Format amount in Indian numbering system.
 * @param {number} amount
 * @param {string} symbol
 * @param {boolean} showDecimals
 * @returns {string}
 */
function formatIndian(amount, symbol, showDecimals) {
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);

  const integerPart = Math.floor(absAmount);
  const decimalPart = absAmount - integerPart;

  const formattedInteger = formatIndianInteger(integerPart);

  let result = `${symbol}${formattedInteger}`;

  if (showDecimals) {
    const decimalDigits = Math.round(decimalPart * 100).toString().padStart(2, '0');
    if (decimalDigits !== '00') {
      result += `.${decimalDigits}`;
    }
  }

  return isNegative ? `-${result}` : result;
}

/**
 * Format amount in compact notation for INR (K, L, Cr).
 * @param {number} amount
 * @param {string} symbol
 * @returns {string}
 */
function formatCompact(amount, symbol) {
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);

  let result;

  if (absAmount >= 10000000) {
    // 1 Crore = 10 Million
    const crores = absAmount / 10000000;
    result = crores.toFixed(2).replace(/\.00$/, '') + 'Cr';
  } else if (absAmount >= 100000) {
    // 1 Lakh = 100 Thousand
    const lakhs = absAmount / 100000;
    result = lakhs.toFixed(2).replace(/\.00$/, '') + 'L';
  } else if (absAmount >= 1000) {
    const thousands = absAmount / 1000;
    result = thousands.toFixed(1).replace(/\.0$/, '') + 'K';
  } else {
    result = Math.round(absAmount).toString();
  }

  result = `${symbol}${result}`;
  return isNegative ? `-${result}` : result;
}

/**
 * Format amount in standard (Western) grouping.
 * @param {number} amount
 * @param {string} symbol
 * @param {boolean} showDecimals
 * @returns {string}
 */
function formatStandard(amount, symbol, showDecimals) {
  const options = {
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  };

  const formatted = Math.abs(amount).toLocaleString('en-US', options);
  const prefix = amount < 0 ? '-' : '';
  return `${prefix}${symbol}${formatted}`;
}

// ============================================================================
// Main format function
// ============================================================================

/**
 * Format a currency amount.
 * - For INR: uses Indian grouping (1,23,456.78)
 * - For others: uses standard grouping (123,456.78)
 * - Compact mode: K, L, Cr for INR
 *
 * @param {number} amount
 * @param {string} [currencyCode='INR']
 * @param {boolean} [showDecimals=true]
 * @param {boolean} [compact=false]
 * @returns {string}
 */
function format(amount, currencyCode = 'INR', showDecimals = true, compact = false) {
  const symbol = currencySymbol(currencyCode);

  // For non-INR currencies, use standard formatting
  if (currencyCode.toUpperCase() !== 'INR') {
    return formatStandard(amount, symbol, showDecimals);
  }

  // For compact notation
  if (compact) {
    return formatCompact(amount, symbol);
  }

  // Indian numbering format
  return formatIndian(amount, symbol, showDecimals);
}

// ============================================================================
// Parse
// ============================================================================

/**
 * Parse an Indian formatted currency string back to a number.
 * Handles symbols, commas, and compact notation (Cr, L, K).
 *
 * @param {string} formattedString
 * @returns {number|null}
 */
function parse(formattedString) {
  let cleanString = formattedString;

  // Remove currency symbols
  const symbols = [
    '\u20B9', '$', '\u20AC', '\u00A3', 'AED', 'C$', '\u00A5', 'SAR', 'S$',
    'INR', 'USD', 'EUR', 'GBP', 'CAD', 'JPY',
  ];
  for (const sym of symbols) {
    cleanString = cleanString.replace(new RegExp(sym.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '');
  }

  // Remove commas and whitespace
  cleanString = cleanString.replace(/,/g, '').trim();

  // Handle compact notation
  if (cleanString.endsWith('Cr')) {
    cleanString = cleanString.replace(/Cr$/, '');
    const value = parseFloat(cleanString);
    if (!isNaN(value)) return value * 10000000;
    return null;
  } else if (cleanString.endsWith('L')) {
    cleanString = cleanString.replace(/L$/, '');
    const value = parseFloat(cleanString);
    if (!isNaN(value)) return value * 100000;
    return null;
  } else if (cleanString.endsWith('K')) {
    cleanString = cleanString.replace(/K$/, '');
    const value = parseFloat(cleanString);
    if (!isNaN(value)) return value * 1000;
    return null;
  }

  const result = parseFloat(cleanString);
  return isNaN(result) ? null : result;
}

// ============================================================================
// Amount in Words (Indian System)
// ============================================================================

const ONES = [
  '', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
  'seventeen', 'eighteen', 'nineteen',
];
const TENS = [
  '', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety',
];

/**
 * Convert a non-negative integer to Indian words.
 * @param {number} number
 * @returns {string}
 */
function integerToWords(number) {
  if (number === 0) return 'zero';

  let num = number;
  let words = '';

  // Crores (10 million)
  if (num >= 10000000) {
    words += integerToWords(Math.floor(num / 10000000)) + ' crore ';
    num %= 10000000;
  }

  // Lakhs (100 thousand)
  if (num >= 100000) {
    words += integerToWords(Math.floor(num / 100000)) + ' lakh ';
    num %= 100000;
  }

  // Thousands
  if (num >= 1000) {
    words += integerToWords(Math.floor(num / 1000)) + ' thousand ';
    num %= 1000;
  }

  // Hundreds
  if (num >= 100) {
    words += ONES[Math.floor(num / 100)] + ' hundred ';
    num %= 100;
  }

  // Tens and ones
  if (num > 0) {
    if (num < 20) {
      words += ONES[num];
    } else {
      words += TENS[Math.floor(num / 10)];
      if (num % 10 > 0) {
        words += ' ' + ONES[num % 10];
      }
    }
  }

  return words.trim();
}

/**
 * Convert amount to words in Indian system.
 * "Rupees One Lakh Twenty-Three Thousand Four Hundred Fifty-Six And Seventy-Eight Paise Only"
 *
 * @param {number} amount
 * @returns {string}
 */
function amountInWords(amount) {
  const absAmount = Math.abs(amount);
  const integerPart = Math.floor(absAmount);
  const decimalPart = Math.round((absAmount - integerPart) * 100);

  let words = 'Rupees ';
  words += integerToWords(integerPart);

  if (decimalPart > 0) {
    words += ' and ' + integerToWords(decimalPart) + ' Paise';
  }

  words += ' Only';

  if (amount < 0) {
    words = 'Minus ' + words;
  }

  // Capitalize each word (Title Case)
  words = words.replace(/\b\w/g, (c) => c.toUpperCase());

  return words;
}

module.exports = {
  CURRENCY_SYMBOLS,
  currencySymbol,
  format,
  parse,
  amountInWords,
};
