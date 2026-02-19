/**
 * Indian Currency Formatting Utilities
 *
 * formatINR(amount)                    - Format number in Indian numbering system with Rupee symbol
 * formatCurrency(amount, currencyCode) - Format number with the correct symbol for the currency
 * amountInWords(amount)                - Convert number to Indian English words for cheques/invoices
 */

/**
 * Get the symbol for a given ISO currency code.
 * @param {string} currencyCode - e.g. 'INR', 'USD', 'CAD', 'EUR'
 * @returns {string}
 */
export function getCurrencySymbol(currencyCode) {
  const symbols = {
    INR: '\u20B9',  // ₹
    USD: '$',
    CAD: 'CA$',
    EUR: '€',
    GBP: '£',
    AED: 'AED ',
    SGD: 'S$',
    AUD: 'A$',
  };
  return symbols[(currencyCode || 'INR').toUpperCase()] || (currencyCode + ' ');
}

/**
 * Format a number with the correct currency symbol.
 * For INR: uses Indian grouping (1,23,456.78)
 * For others: uses standard grouping (1,234.56)
 *
 * @param {number|string|null} amount
 * @param {string} currencyCode - e.g. 'INR', 'USD', 'CAD'
 * @returns {string}
 */
export function formatCurrency(amount, currencyCode) {
  const code = (currencyCode || 'INR').toUpperCase();
  if (code === 'INR') return formatINR(amount);

  if (amount == null) return getCurrencySymbol(code) + '0.00';
  const num = Number(amount);
  if (isNaN(num)) return getCurrencySymbol(code) + '0.00';

  const sign = num < 0 ? '-' : '';
  const abs = Math.abs(num);
  const [intPart, decPart] = abs.toFixed(2).split('.');

  // Standard western grouping: groups of 3
  const formatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return sign + getCurrencySymbol(code) + formatted + '.' + decPart;
}

/**
 * Format a number using the Indian numbering system.
 * Examples:
 *   1234.56       -> "₹1,234.56"
 *   123456.78     -> "₹1,23,456.78"
 *   10000000      -> "₹1,00,00,000.00"
 *
 * @param {number|string|null} amount
 * @returns {string}
 */
export function formatINR(amount) {
  if (amount == null) return '\u20B90.00';
  const num = Number(amount);
  if (isNaN(num)) return '\u20B90.00';

  const sign = num < 0 ? '-' : '';
  const abs = Math.abs(num);
  const [intPart, decPart] = abs.toFixed(2).split('.');

  // Indian grouping: last 3 digits, then groups of 2
  let result = intPart.slice(-3);
  let remaining = intPart.slice(0, -3);
  while (remaining.length > 0) {
    result = remaining.slice(-2) + ',' + result;
    remaining = remaining.slice(0, -2);
  }

  return sign + '\u20B9' + result + '.' + decPart;
}

// ── Amount in Words ────────────────────────────────────────────────

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen',
];

const TENS = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety',
];

/**
 * Convert a number below 1000 to words.
 * @param {number} n - Integer between 0 and 999
 * @returns {string}
 */
function belowThousand(n) {
  if (n === 0) return '';

  const parts = [];
  if (n >= 100) {
    parts.push(ONES[Math.floor(n / 100)] + ' Hundred');
    n %= 100;
  }
  if (n >= 20) {
    parts.push(TENS[Math.floor(n / 10)]);
    n %= 10;
  }
  if (n > 0) {
    parts.push(ONES[n]);
  }
  return parts.join(' ');
}

/**
 * Convert a number to Indian English words.
 * Uses Indian place values: Thousand, Lakh, Crore.
 *
 * "Rupees One Lakh Twenty Three Thousand Four Hundred Fifty Six and Paise Seventy Eight Only"
 *
 * @param {number|string|null} amount
 * @returns {string}
 */
export function amountInWords(amount) {
  if (amount == null) return '';
  const num = Number(amount);
  if (isNaN(num)) return '';
  if (num === 0) return 'Rupees Zero Only';

  const isNegative = num < 0;
  const abs = Math.abs(num);

  // Split into rupees and paise
  const rupees = Math.floor(abs);
  const paise = Math.round((abs - rupees) * 100);

  const parts = [];

  // Indian number breakdown: Crore, Lakh, Thousand, Hundred
  let remaining = rupees;

  // Crores (1,00,00,000 and above)
  if (remaining >= 10000000) {
    const crores = Math.floor(remaining / 10000000);
    parts.push(belowThousand(crores) + ' Crore');
    remaining %= 10000000;
  }

  // Lakhs (1,00,000 to 99,99,999)
  if (remaining >= 100000) {
    const lakhs = Math.floor(remaining / 100000);
    parts.push(belowThousand(lakhs) + ' Lakh');
    remaining %= 100000;
  }

  // Thousands (1,000 to 99,999)
  if (remaining >= 1000) {
    const thousands = Math.floor(remaining / 1000);
    parts.push(belowThousand(thousands) + ' Thousand');
    remaining %= 1000;
  }

  // Hundreds and below
  if (remaining > 0) {
    parts.push(belowThousand(remaining));
  }

  let result = 'Rupees ' + (isNegative ? 'Minus ' : '');

  if (parts.length === 0) {
    result += 'Zero';
  } else {
    result += parts.join(' ');
  }

  if (paise > 0) {
    result += ' and Paise ' + belowThousand(paise);
  }

  result += ' Only';

  return result;
}
