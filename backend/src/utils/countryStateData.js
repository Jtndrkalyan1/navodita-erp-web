/**
 * Country, State, and Currency Data
 * Ported from: NavoditaERP/Utilities/CountryStateData.swift
 *
 * All India states (36), USA states (51 inc DC), Canada provinces (13).
 * Includes GST state codes for GSTIN validation.
 */

// ============================================================================
// Countries
// ============================================================================
const countries = ['India', 'USA', 'Canada'];

// ============================================================================
// India States and Union Territories (36 entries)
// ============================================================================
const indiaStates = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  // Union Territories
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
];

// ============================================================================
// USA States (51 inc DC)
// ============================================================================
const usaStates = [
  'Alabama',
  'Alaska',
  'Arizona',
  'Arkansas',
  'California',
  'Colorado',
  'Connecticut',
  'Delaware',
  'Florida',
  'Georgia',
  'Hawaii',
  'Idaho',
  'Illinois',
  'Indiana',
  'Iowa',
  'Kansas',
  'Kentucky',
  'Louisiana',
  'Maine',
  'Maryland',
  'Massachusetts',
  'Michigan',
  'Minnesota',
  'Mississippi',
  'Missouri',
  'Montana',
  'Nebraska',
  'Nevada',
  'New Hampshire',
  'New Jersey',
  'New Mexico',
  'New York',
  'North Carolina',
  'North Dakota',
  'Ohio',
  'Oklahoma',
  'Oregon',
  'Pennsylvania',
  'Rhode Island',
  'South Carolina',
  'South Dakota',
  'Tennessee',
  'Texas',
  'Utah',
  'Vermont',
  'Virginia',
  'Washington',
  'West Virginia',
  'Wisconsin',
  'Wyoming',
  'District of Columbia',
];

// ============================================================================
// Canada Provinces and Territories (13 entries)
// ============================================================================
const canadaProvinces = [
  'Alberta',
  'British Columbia',
  'Manitoba',
  'New Brunswick',
  'Newfoundland and Labrador',
  'Northwest Territories',
  'Nova Scotia',
  'Nunavut',
  'Ontario',
  'Prince Edward Island',
  'Quebec',
  'Saskatchewan',
  'Yukon',
];

// ============================================================================
// GST State Codes for India (used for GSTIN validation and place of supply)
// ============================================================================
const indiaGSTStateCodes = {
  '01': 'Jammu and Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '11': 'Sikkim',
  '12': 'Arunachal Pradesh',
  '13': 'Nagaland',
  '14': 'Manipur',
  '15': 'Mizoram',
  '16': 'Tripura',
  '17': 'Meghalaya',
  '18': 'Assam',
  '19': 'West Bengal',
  '20': 'Jharkhand',
  '21': 'Odisha',
  '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh',
  '24': 'Gujarat',
  '26': 'Dadra and Nagar Haveli and Daman and Diu',
  '27': 'Maharashtra',
  '28': 'Andhra Pradesh',
  '29': 'Karnataka',
  '30': 'Goa',
  '31': 'Lakshadweep',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '34': 'Puducherry',
  '35': 'Andaman and Nicobar Islands',
  '36': 'Telangana',
  '37': 'Andhra Pradesh (New)',
  '38': 'Ladakh',
  '97': 'Other Territory',
};

// ============================================================================
// Available currencies for selection
// ============================================================================
const currencies = [
  { code: 'INR', name: 'Indian Rupee', symbol: '\u20B9' },
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'EUR', name: 'Euro', symbol: '\u20AC' },
  { code: 'GBP', name: 'British Pound', symbol: '\u00A3' },
  { code: 'AED', name: 'UAE Dirham', symbol: '\u062F.\u0625' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '\u00A5' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Returns states/provinces for the given country.
 * @param {string} country
 * @returns {string[]}
 */
function statesFor(country) {
  switch (country) {
    case 'India':
      return indiaStates;
    case 'USA':
      return usaStates;
    case 'Canada':
      return canadaProvinces;
    default:
      return [];
  }
}

/**
 * Returns default currency code for the given country.
 * @param {string} country
 * @returns {string}
 */
function defaultCurrency(country) {
  switch (country) {
    case 'India':
      return 'INR';
    case 'USA':
      return 'USD';
    case 'Canada':
      return 'CAD';
    default:
      return 'INR';
  }
}

/**
 * Returns currency symbol for the given currency code.
 * @param {string} code
 * @returns {string}
 */
function currencySymbol(code) {
  switch (code) {
    case 'INR': return '\u20B9';
    case 'USD': return '$';
    case 'CAD': return 'C$';
    case 'EUR': return '\u20AC';
    case 'GBP': return '\u00A3';
    case 'AED': return '\u062F.\u0625';
    default: return code;
  }
}

/**
 * Returns GST state code for the given state name.
 * @param {string} state
 * @returns {string|null}
 */
function gstStateCode(state) {
  const entry = Object.entries(indiaGSTStateCodes).find(([, name]) => name === state);
  return entry ? entry[0] : null;
}

/**
 * Returns state name for the given GST state code.
 * @param {string} gstCode
 * @returns {string|null}
 */
function stateName(gstCode) {
  return indiaGSTStateCodes[gstCode] || null;
}

module.exports = {
  countries,
  indiaStates,
  usaStates,
  canadaProvinces,
  indiaGSTStateCodes,
  currencies,
  statesFor,
  defaultCurrency,
  currencySymbol,
  gstStateCode,
  stateName,
};
