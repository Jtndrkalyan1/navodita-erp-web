/**
 * Centralized Country, State, and Currency Data
 * Used across customer, vendor, invoice, bill, and other forms.
 */

export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu & Kashmir', 'Ladakh', 'Chandigarh',
  'Dadra & Nagar Haveli and Daman & Diu', 'Lakshadweep',
  'Puducherry', 'Andaman & Nicobar Islands',
];

export const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California',
  'Colorado', 'Connecticut', 'Delaware', 'Florida', 'Georgia',
  'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
  'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland',
  'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri',
  'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey',
  'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio',
  'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina',
  'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
  'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming',
  'District of Columbia',
];

export const UK_REGIONS = [
  'England', 'Scotland', 'Wales', 'Northern Ireland',
  'London', 'South East', 'South West', 'East of England',
  'West Midlands', 'East Midlands', 'Yorkshire and the Humber',
  'North West', 'North East',
];

export const CANADA_PROVINCES = [
  'Alberta', 'British Columbia', 'Manitoba', 'New Brunswick',
  'Newfoundland and Labrador', 'Nova Scotia', 'Ontario',
  'Prince Edward Island', 'Quebec', 'Saskatchewan',
  'Northwest Territories', 'Nunavut', 'Yukon',
];

export const AUSTRALIA_STATES = [
  'New South Wales', 'Victoria', 'Queensland', 'South Australia',
  'Western Australia', 'Tasmania',
  'Australian Capital Territory', 'Northern Territory',
];

export const GERMANY_STATES = [
  'Baden-Württemberg', 'Bavaria', 'Berlin', 'Brandenburg', 'Bremen',
  'Hamburg', 'Hesse', 'Lower Saxony', 'Mecklenburg-Vorpommern',
  'North Rhine-Westphalia', 'Rhineland-Palatinate', 'Saarland',
  'Saxony', 'Saxony-Anhalt', 'Schleswig-Holstein', 'Thuringia',
];

export const CHINA_PROVINCES = [
  'Anhui', 'Beijing', 'Chongqing', 'Fujian', 'Gansu', 'Guangdong',
  'Guangxi', 'Guizhou', 'Hainan', 'Hebei', 'Heilongjiang', 'Henan',
  'Hubei', 'Hunan', 'Inner Mongolia', 'Jiangsu', 'Jiangxi', 'Jilin',
  'Liaoning', 'Ningxia', 'Qinghai', 'Shaanxi', 'Shandong', 'Shanghai',
  'Shanxi', 'Sichuan', 'Tianjin', 'Tibet', 'Xinjiang', 'Yunnan', 'Zhejiang',
];

export const JAPAN_PREFECTURES = [
  'Hokkaido', 'Aomori', 'Iwate', 'Miyagi', 'Akita', 'Yamagata', 'Fukushima',
  'Ibaraki', 'Tochigi', 'Gunma', 'Saitama', 'Chiba', 'Tokyo', 'Kanagawa',
  'Niigata', 'Toyama', 'Ishikawa', 'Fukui', 'Yamanashi', 'Nagano',
  'Gifu', 'Shizuoka', 'Aichi', 'Mie', 'Shiga', 'Kyoto', 'Osaka',
  'Hyogo', 'Nara', 'Wakayama', 'Tottori', 'Shimane', 'Okayama',
  'Hiroshima', 'Yamaguchi', 'Tokushima', 'Kagawa', 'Ehime', 'Kochi',
  'Fukuoka', 'Saga', 'Nagasaki', 'Kumamoto', 'Oita', 'Miyazaki',
  'Kagoshima', 'Okinawa',
];

export const UAE_EMIRATES = [
  'Abu Dhabi', 'Dubai', 'Sharjah', 'Ajman', 'Umm Al Quwain',
  'Ras Al Khaimah', 'Fujairah',
];

export const FRANCE_REGIONS = [
  'Auvergne-Rhône-Alpes', 'Bourgogne-Franche-Comté', 'Brittany',
  'Centre-Val de Loire', 'Corsica', 'Grand Est',
  'Hauts-de-France', 'Île-de-France', 'Normandy',
  'Nouvelle-Aquitaine', 'Occitanie', 'Pays de la Loire',
  'Provence-Alpes-Côte d\'Azur',
];

export const SINGAPORE_REGIONS = ['Central', 'East', 'North', 'North-East', 'West'];

export const BANGLADESH_DIVISIONS = [
  'Barishal', 'Chattogram', 'Dhaka', 'Khulna',
  'Mymensingh', 'Rajshahi', 'Rangpur', 'Sylhet',
];

export const SRI_LANKA_PROVINCES = [
  'Central', 'Eastern', 'North Central', 'Northern',
  'North Western', 'Sabaragamuwa', 'Southern', 'Uva', 'Western',
];

export const NEPAL_PROVINCES = [
  'Koshi', 'Madhesh', 'Bagmati', 'Gandaki',
  'Lumbini', 'Karnali', 'Sudurpashchim',
];

// Map country to its states/provinces/regions
export const COUNTRY_STATES_MAP = {
  'India': INDIAN_STATES,
  'United States': US_STATES,
  'United Kingdom': UK_REGIONS,
  'Canada': CANADA_PROVINCES,
  'Australia': AUSTRALIA_STATES,
  'Germany': GERMANY_STATES,
  'France': FRANCE_REGIONS,
  'Japan': JAPAN_PREFECTURES,
  'China': CHINA_PROVINCES,
  'Singapore': SINGAPORE_REGIONS,
  'United Arab Emirates': UAE_EMIRATES,
  'Bangladesh': BANGLADESH_DIVISIONS,
  'Sri Lanka': SRI_LANKA_PROVINCES,
  'Nepal': NEPAL_PROVINCES,
};

// Map country to its state label (what to call states in that country)
export const COUNTRY_STATE_LABEL = {
  'India': 'State',
  'United States': 'State',
  'United Kingdom': 'Region',
  'Canada': 'Province',
  'Australia': 'State',
  'Germany': 'State',
  'France': 'Region',
  'Japan': 'Prefecture',
  'China': 'Province',
  'Singapore': 'Region',
  'United Arab Emirates': 'Emirate',
  'Bangladesh': 'Division',
  'Sri Lanka': 'Province',
  'Nepal': 'Province',
};

// Map country to its postal code label
export const COUNTRY_POSTAL_LABEL = {
  'India': 'PIN Code',
  'United States': 'ZIP Code',
  'United Kingdom': 'Postcode',
  'Canada': 'Postal Code',
  'Australia': 'Postcode',
  'Germany': 'Postleitzahl (PLZ)',
  'France': 'Code Postal',
  'Japan': 'Postal Code',
  'China': 'Postal Code',
  'Singapore': 'Postal Code',
  'United Arab Emirates': 'P.O. Box',
  'Bangladesh': 'Postal Code',
  'Sri Lanka': 'Postal Code',
  'Nepal': 'Postal Code',
};

export const COUNTRIES = [
  'India', 'United States', 'United Kingdom', 'Canada', 'Australia',
  'Germany', 'France', 'Japan', 'China', 'Singapore',
  'United Arab Emirates', 'Bangladesh', 'Sri Lanka', 'Nepal',
];

export const CURRENCIES = [
  { code: 'INR', label: 'INR - Indian Rupee', symbol: '₹' },
  { code: 'USD', label: 'USD - US Dollar', symbol: '$' },
  { code: 'EUR', label: 'EUR - Euro', symbol: '€' },
  { code: 'GBP', label: 'GBP - British Pound', symbol: '£' },
  { code: 'CAD', label: 'CAD - Canadian Dollar', symbol: 'C$' },
  { code: 'AUD', label: 'AUD - Australian Dollar', symbol: 'A$' },
  { code: 'JPY', label: 'JPY - Japanese Yen', symbol: '¥' },
  { code: 'CNY', label: 'CNY - Chinese Yuan', symbol: '¥' },
  { code: 'SGD', label: 'SGD - Singapore Dollar', symbol: 'S$' },
  { code: 'AED', label: 'AED - UAE Dirham', symbol: 'AED' },
  { code: 'BDT', label: 'BDT - Bangladeshi Taka', symbol: '৳' },
  { code: 'LKR', label: 'LKR - Sri Lankan Rupee', symbol: 'Rs' },
  { code: 'NPR', label: 'NPR - Nepalese Rupee', symbol: 'Rs' },
];

export const COUNTRY_CURRENCY_MAP = {
  'India': 'INR',
  'United States': 'USD',
  'United Kingdom': 'GBP',
  'Canada': 'CAD',
  'Australia': 'AUD',
  'Germany': 'EUR',
  'France': 'EUR',
  'Japan': 'JPY',
  'China': 'CNY',
  'Singapore': 'SGD',
  'United Arab Emirates': 'AED',
  'Bangladesh': 'BDT',
  'Sri Lanka': 'LKR',
  'Nepal': 'NPR',
};

/**
 * Get states/provinces/regions for a given country.
 * Returns empty array if no data available (user will type manually).
 */
export function getStatesForCountry(country) {
  return COUNTRY_STATES_MAP[country] || [];
}

/**
 * Get the label for "State" in a given country (e.g. "Province" for Canada).
 */
export function getStateLabel(country) {
  return COUNTRY_STATE_LABEL[country] || 'State / Region';
}

/**
 * Get the label for "PIN Code" in a given country (e.g. "ZIP Code" for US).
 */
export function getPostalLabel(country) {
  return COUNTRY_POSTAL_LABEL[country] || 'Postal Code';
}
