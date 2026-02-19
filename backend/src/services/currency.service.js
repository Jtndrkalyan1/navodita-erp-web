/**
 * Currency Service
 * Ported from: NavoditaERP/CurrencyViews/CurrencyManager.swift
 *
 * Default currencies (20), exchange rates vs INR, conversion, and formatting.
 */

// ============================================================================
// Default Currencies (20 currencies matching Swift CurrencyInfo.all)
// ============================================================================
const DEFAULT_CURRENCIES = [
  { code: 'INR', name: 'Indian Rupee', symbol: '\u20B9', decimalPlaces: 2 },
  { code: 'USD', name: 'US Dollar', symbol: '$', decimalPlaces: 2 },
  { code: 'EUR', name: 'Euro', symbol: '\u20AC', decimalPlaces: 2 },
  { code: 'GBP', name: 'British Pound', symbol: '\u00A3', decimalPlaces: 2 },
  { code: 'AED', name: 'UAE Dirham', symbol: '\u062F.\u0625', decimalPlaces: 2 },
  { code: 'SAR', name: 'Saudi Riyal', symbol: '\uFDFC', decimalPlaces: 2 },
  { code: 'JPY', name: 'Japanese Yen', symbol: '\u00A5', decimalPlaces: 0 },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '\u00A5', decimalPlaces: 2 },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', decimalPlaces: 2 },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', decimalPlaces: 2 },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', decimalPlaces: 2 },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', decimalPlaces: 2 },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', decimalPlaces: 2 },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', decimalPlaces: 2 },
  { code: 'THB', name: 'Thai Baht', symbol: '\u0E3F', decimalPlaces: 2 },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', decimalPlaces: 2 },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', decimalPlaces: 0 },
  { code: 'BDT', name: 'Bangladeshi Taka', symbol: '\u09F3', decimalPlaces: 2 },
  { code: 'PKR', name: 'Pakistani Rupee', symbol: 'Rs', decimalPlaces: 2 },
  { code: 'LKR', name: 'Sri Lankan Rupee', symbol: 'Rs', decimalPlaces: 2 },
];

// ============================================================================
// Default Exchange Rates vs INR (approximate, matching Swift getDefaultRate)
// ============================================================================
const DEFAULT_EXCHANGE_RATES = {
  INR: 1.0,
  USD: 83.5,
  EUR: 91.0,
  GBP: 106.0,
  AED: 22.7,
  SAR: 22.3,
  JPY: 0.56,
  CNY: 11.5,
  AUD: 55.0,
  CAD: 62.0,
  SGD: 62.5,
  CHF: 1.0,    // Not specified in Swift, defaults to 1.0
  HKD: 1.0,
  NZD: 1.0,
  THB: 1.0,
  MYR: 1.0,
  IDR: 1.0,
  BDT: 1.0,
  PKR: 1.0,
  LKR: 1.0,
};

/**
 * Find currency info by code.
 * @param {string} code
 * @returns {object|null}
 */
function findCurrency(code) {
  return DEFAULT_CURRENCIES.find((c) => c.code === code) || null;
}

/**
 * Get default exchange rate for a currency (rate vs INR).
 * @param {string} code
 * @returns {number}
 */
function getDefaultRate(code) {
  return DEFAULT_EXCHANGE_RATES[code] || 1.0;
}

// ============================================================================
// Currency Conversion
// ============================================================================

/**
 * Convert an amount between two currencies using their INR exchange rates.
 * Formula: (amount * fromRate) / toRate
 *
 * @param {number} amount - Amount to convert
 * @param {number} fromRate - Exchange rate of source currency (units of INR per 1 source)
 * @param {number} toRate - Exchange rate of target currency (units of INR per 1 target)
 * @returns {number} Converted amount
 */
function convert(amount, fromRate, toRate) {
  if (fromRate === toRate) return amount;
  if (toRate === 0) return 0;

  const inBase = amount * fromRate;
  return inBase / toRate;
}

// ============================================================================
// Currency Formatting
// ============================================================================

/**
 * Format an amount with the appropriate currency symbol and decimal places.
 *
 * @param {number} value
 * @param {string} currencyCode
 * @param {number} [decimalPlaces] - Override decimal places (auto-detected from currency if omitted)
 * @returns {string}
 */
function formatAmount(value, currencyCode, decimalPlaces) {
  const info = findCurrency(currencyCode);
  const symbol = info ? info.symbol : currencyCode;
  const dp = decimalPlaces !== undefined ? decimalPlaces : (info ? info.decimalPlaces : 2);

  const formatted = Math.abs(value).toLocaleString('en-IN', {
    minimumFractionDigits: dp,
    maximumFractionDigits: dp,
  });

  const prefix = value < 0 ? '-' : '';
  return `${prefix}${symbol}${formatted}`;
}

module.exports = {
  DEFAULT_CURRENCIES,
  DEFAULT_EXCHANGE_RATES,
  findCurrency,
  getDefaultRate,
  convert,
  formatAmount,
};
