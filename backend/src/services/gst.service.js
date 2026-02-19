/**
 * GST Helper Service
 * Ported from: NavoditaERP/NavoditaERP/GSTHelper.swift
 *
 * GST state code map (37 states, codes 01-37)
 * Inter-state vs intra-state determination
 * GST splitting (IGST vs CGST+SGST)
 */

// GST State Code Map - 37 entries matching Swift source exactly
const GST_STATE_CODE_MAP = {
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
  '25': 'Daman and Diu',
  '26': 'Dadra and Nagar Haveli',
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
  '37': 'Andhra Pradesh',
};

/**
 * Normalize state for comparison.
 * Tries state name first (trimmed), then falls back to GSTIN first 2 digits.
 * @param {string|null} state - State name
 * @param {string|null} gstin - GSTIN number
 * @returns {string|null} Lowercase normalized state name, or null
 */
function normalizedState(state, gstin) {
  if (state) {
    const trimmed = state.trim();
    if (trimmed.length > 0) {
      return trimmed.toLowerCase();
    }
  }
  if (gstin && gstin.length >= 2) {
    const code = gstin.substring(0, 2);
    const stateName = GST_STATE_CODE_MAP[code];
    if (stateName) {
      return stateName.toLowerCase();
    }
  }
  return null;
}

/**
 * Determines if a transaction is inter-state (IGST) or intra-state (CGST+SGST).
 * @param {string|null} fromState - Company/seller state
 * @param {string|null} toState - Party/buyer state
 * @param {string|null} fromGSTIN - Company GSTIN
 * @param {string|null} toGSTIN - Party GSTIN
 * @returns {boolean} true if inter-state, false if intra-state
 */
function isInterState(fromState, toState, fromGSTIN, toGSTIN) {
  const company = normalizedState(fromState, fromGSTIN);
  const party = normalizedState(toState, toGSTIN);

  if (company === null || party === null) {
    return false;
  }

  return company !== party;
}

/**
 * Split total GST into IGST or CGST+SGST based on inter-state flag.
 * @param {number} totalGST - Total GST amount
 * @param {string|null} fromState - Company state
 * @param {string|null} toState - Party state
 * @param {string|null} fromGSTIN - Company GSTIN
 * @param {string|null} toGSTIN - Party GSTIN
 * @returns {{ igst: number, cgst: number, sgst: number }}
 */
function splitGST(totalGST, fromState, toState, fromGSTIN, toGSTIN) {
  const interState = isInterState(fromState, toState, fromGSTIN, toGSTIN);

  if (interState) {
    return { igst: totalGST, cgst: 0, sgst: 0 };
  } else {
    const half = totalGST / 2;
    return { igst: 0, cgst: half, sgst: half };
  }
}

/**
 * Resolve state name from address state or GSTIN first 2 digits.
 * @param {string|null} state - State from address
 * @param {string|null} gstin - GSTIN number
 * @returns {string} Resolved state name, or empty string
 */
function resolveStateName(state, gstin) {
  if (state) {
    const trimmed = state.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }
  if (gstin && gstin.length >= 2) {
    const code = gstin.substring(0, 2);
    return GST_STATE_CODE_MAP[code] || '';
  }
  return '';
}

module.exports = {
  GST_STATE_CODE_MAP,
  isInterState,
  splitGST,
  resolveStateName,
  normalizedState,
};
