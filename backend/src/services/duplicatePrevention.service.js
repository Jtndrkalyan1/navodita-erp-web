/**
 * Duplicate Prevention Service
 * Ported from: NavoditaERP/Managers/DuplicatePreventionManager.swift
 *
 * Proactive duplicate checks for Customers, Vendors, Items, and document numbers.
 * Reactive duplicate scanning with N^2 comparison and weighted scoring.
 * Includes Levenshtein distance and string similarity.
 */

// ============================================================================
// Scoring Weights (matching Swift source exactly)
// ============================================================================

// Customer scoring weights: GST (0.5), Email (0.3), Phone (0.3), Name (0.2)
// Customer threshold: 0.3
const CUSTOMER_WEIGHTS = {
  gst: 0.5,
  email: 0.3,
  phone: 0.3,
  nameSimilarityThreshold: 0.8,
  nameWeight: 0.2,
  scoreThreshold: 0.3,
};

// Vendor scoring weights: same as customer
const VENDOR_WEIGHTS = {
  gst: 0.5,
  email: 0.3,
  phone: 0.3,
  nameSimilarityThreshold: 0.8,
  nameWeight: 0.2,
  scoreThreshold: 0.3,
};

// Item scoring: Name similarity > 0.85 (0.6), HSN match (0.3), Color match (0.1)
// Item threshold: 0.5
const ITEM_WEIGHTS = {
  nameSimilarityThreshold: 0.85,
  nameWeight: 0.6,
  hsnWeight: 0.3,
  colorWeight: 0.1,
  scoreThreshold: 0.5,
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Normalize a phone number: remove all non-digit characters and take last 10 digits.
 * @param {string} phone
 * @returns {string}
 */
function normalizePhone(phone) {
  const digits = (phone || '').replace(/\D/g, '');
  if (digits.length >= 10) {
    return digits.slice(-10);
  }
  return digits;
}

/**
 * Calculate Levenshtein (edit) distance between two strings.
 * @param {string} s1
 * @param {string} s2
 * @returns {number}
 */
function levenshteinDistance(s1, s2) {
  const m = s1.length;
  const n = s2.length;

  if (m === 0) return n;
  if (n === 0) return m;

  // Create matrix
  const matrix = [];
  for (let i = 0; i <= m; i++) {
    matrix[i] = new Array(n + 1).fill(0);
    matrix[i][0] = i;
  }
  for (let j = 0; j <= n; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,       // deletion
        matrix[i][j - 1] + 1,       // insertion
        matrix[i - 1][j - 1] + cost, // substitution
      );
    }
  }

  return matrix[m][n];
}

/**
 * Calculate string similarity (0.0 to 1.0) based on Levenshtein distance.
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
function stringSimilarity(a, b) {
  const str1 = (a || '').toLowerCase();
  const str2 = (b || '').toLowerCase();

  if (str1 === str2) return 1.0;
  if (str1.length === 0 || str2.length === 0) return 0.0;

  const distance = levenshteinDistance(str1, str2);
  const maxLen = Math.max(str1.length, str2.length);
  return 1.0 - (distance / maxLen);
}

// ============================================================================
// Duplicate Check Result
// ============================================================================

/**
 * @typedef {Object} DuplicateCheckResult
 * @property {string} field
 * @property {string} value
 * @property {boolean} isDuplicate
 * @property {string|null} existingRecordId
 * @property {string|null} existingRecordName
 * @property {string} message
 */

function createDuplicateResult(field, value, isDuplicate, existingRecordId = null, existingRecordName = null) {
  return {
    field,
    value,
    isDuplicate,
    existingRecordId,
    existingRecordName,
    get message() {
      if (this.isDuplicate) {
        return `${this.field} '${this.value}' already exists for '${this.existingRecordName || 'Unknown'}'`;
      }
      return '';
    },
  };
}

// ============================================================================
// Potential Duplicate
// ============================================================================

/**
 * @typedef {Object} PotentialDuplicate
 * @property {string} record1Id
 * @property {string} record1Name
 * @property {string} record2Id
 * @property {string} record2Name
 * @property {string[]} matchingFields
 * @property {number} matchScore - 0.0 to 1.0
 * @property {string} entityType
 * @property {boolean} isExactMatch - score >= 0.95
 * @property {string} matchDescription
 */

// ============================================================================
// Proactive Duplicate Checks
// ============================================================================

/**
 * Check if a customer with the given unique field values already exists.
 * @param {object} db - Database query interface
 * @param {object} fields
 * @param {string|null} fields.gstNumber
 * @param {string|null} fields.email
 * @param {string|null} fields.phone
 * @param {string|null} [excludeId] - ID to exclude (for updates)
 * @returns {Promise<DuplicateCheckResult[]>}
 */
async function checkCustomerDuplicate(db, { gstNumber, email, phone }, excludeId = null) {
  const results = [];

  // Check GST Number
  if (gstNumber && gstNumber.trim().length > 0) {
    let query = db('customers').whereRaw('LOWER(gst_number) = ?', [gstNumber.toLowerCase()]);
    if (excludeId) query = query.whereNot('id', excludeId);
    const existing = await query.first();
    if (existing) {
      results.push(createDuplicateResult('GST Number', gstNumber, true, existing.id, existing.name));
    }
  }

  // Check Email
  if (email && email.trim().length > 0) {
    let query = db('customers').whereRaw('LOWER(email) = ?', [email.toLowerCase()]);
    if (excludeId) query = query.whereNot('id', excludeId);
    const existing = await query.first();
    if (existing) {
      results.push(createDuplicateResult('Email', email, true, existing.id, existing.name));
    }
  }

  // Check Phone
  if (phone && phone.trim().length > 0) {
    const normalizedPhone = normalizePhone(phone);
    let query = db('customers').where('phone', 'like', `%${normalizedPhone}%`);
    if (excludeId) query = query.whereNot('id', excludeId);
    const existing = await query.first();
    if (existing) {
      results.push(createDuplicateResult('Phone', phone, true, existing.id, existing.name));
    }
  }

  return results;
}

/**
 * Check if a vendor with the given unique field values already exists.
 * @param {object} db
 * @param {object} fields
 * @param {string|null} fields.gstNumber
 * @param {string|null} fields.email
 * @param {string|null} fields.phone
 * @param {string|null} [excludeId]
 * @returns {Promise<DuplicateCheckResult[]>}
 */
async function checkVendorDuplicate(db, { gstNumber, email, phone }, excludeId = null) {
  const results = [];

  // Check GST Number
  if (gstNumber && gstNumber.trim().length > 0) {
    let query = db('vendors').whereRaw('LOWER(gst_number) = ?', [gstNumber.toLowerCase()]);
    if (excludeId) query = query.whereNot('id', excludeId);
    const existing = await query.first();
    if (existing) {
      results.push(createDuplicateResult('GST Number', gstNumber, true, existing.id, existing.name));
    }
  }

  // Check Email
  if (email && email.trim().length > 0) {
    let query = db('vendors').whereRaw('LOWER(email) = ?', [email.toLowerCase()]);
    if (excludeId) query = query.whereNot('id', excludeId);
    const existing = await query.first();
    if (existing) {
      results.push(createDuplicateResult('Email', email, true, existing.id, existing.name));
    }
  }

  // Check Phone
  if (phone && phone.trim().length > 0) {
    const normalizedPhone = normalizePhone(phone);
    let query = db('vendors').where('phone', 'like', `%${normalizedPhone}%`);
    if (excludeId) query = query.whereNot('id', excludeId);
    const existing = await query.first();
    if (existing) {
      results.push(createDuplicateResult('Phone', phone, true, existing.id, existing.name));
    }
  }

  return results;
}

/**
 * Check if an item with the given name/HSN already exists.
 * @param {object} db
 * @param {object} fields
 * @param {string} fields.name
 * @param {string|null} fields.hsnCode
 * @param {string|null} [excludeId]
 * @returns {Promise<DuplicateCheckResult[]>}
 */
async function checkItemDuplicate(db, { name, hsnCode }, excludeId = null) {
  const results = [];

  // Check if item with same name exists
  if (name && name.trim().length > 0) {
    let query = db('items').whereRaw('LOWER(name) = ?', [name.toLowerCase()]);
    if (excludeId) query = query.whereNot('id', excludeId);
    const existing = await query.first();
    if (existing) {
      results.push(createDuplicateResult('Item Name', name, true, existing.id, existing.name));
    }
  }

  // Check if item with same name + HSN combination exists (more specific match)
  if (name && name.trim().length > 0 && hsnCode && hsnCode.trim().length > 0) {
    let query = db('items')
      .whereRaw('LOWER(name) = ?', [name.toLowerCase()])
      .whereRaw('LOWER(hsn) = ?', [hsnCode.toLowerCase()]);
    if (excludeId) query = query.whereNot('id', excludeId);
    const existing = await query.first();
    if (existing && results.length === 0) {
      // Only add if not already found by name
      results.push(createDuplicateResult('Item Name + HSN', `${name} (${hsnCode})`, true, existing.id, existing.name));
    }
  }

  return results;
}

/**
 * Check if a document number already exists for a given table/field.
 * Works for Invoice, Bill, Quotation, CreditNote, DebitNote, etc.
 *
 * @param {object} db
 * @param {string} tableName - e.g. 'invoices', 'bills'
 * @param {string} fieldName - e.g. 'invoice_number', 'bill_number'
 * @param {string} value - The document number to check
 * @param {string|null} [excludeId]
 * @returns {Promise<DuplicateCheckResult>}
 */
async function checkDocumentNumberDuplicate(db, tableName, fieldName, value, excludeId = null) {
  if (!value || value.trim().length === 0) {
    return createDuplicateResult(fieldName, value, false);
  }

  let query = db(tableName).whereRaw(`LOWER(${fieldName}) = ?`, [value.toLowerCase()]);
  if (excludeId) query = query.whereNot('id', excludeId);

  const count = await query.count('* as cnt').first();
  const exists = (count?.cnt || 0) > 0;

  return createDuplicateResult(fieldName, value, exists);
}

// ============================================================================
// Reactive Duplicate Scanning (N^2 comparison with weighted scoring)
// ============================================================================

/**
 * Find potential duplicate customers using N^2 comparison.
 * Scoring: GST match (0.5), Email match (0.3), Phone match (0.3), Name similarity > 0.8 (0.2)
 * Threshold: 0.3
 *
 * @param {object} db
 * @returns {Promise<PotentialDuplicate[]>} Sorted by match score descending
 */
async function findPotentialCustomerDuplicates(db) {
  const customers = await db('customers').orderBy('name', 'asc');

  const duplicates = [];

  for (let i = 0; i < customers.length; i++) {
    for (let j = i + 1; j < customers.length; j++) {
      const c1 = customers[i];
      const c2 = customers[j];

      const matchingFields = [];
      let score = 0;

      // Compare GST
      if (c1.gst_number && c2.gst_number &&
          c1.gst_number.length > 0 && c2.gst_number.length > 0 &&
          c1.gst_number.toLowerCase() === c2.gst_number.toLowerCase()) {
        matchingFields.push('GST Number');
        score += CUSTOMER_WEIGHTS.gst;
      }

      // Compare Email
      if (c1.email && c2.email &&
          c1.email.length > 0 && c2.email.length > 0 &&
          c1.email.toLowerCase() === c2.email.toLowerCase()) {
        matchingFields.push('Email');
        score += CUSTOMER_WEIGHTS.email;
      }

      // Compare Phone
      if (c1.phone && c2.phone &&
          c1.phone.length > 0 && c2.phone.length > 0 &&
          normalizePhone(c1.phone) === normalizePhone(c2.phone)) {
        matchingFields.push('Phone');
        score += CUSTOMER_WEIGHTS.phone;
      }

      // Compare Name (fuzzy)
      if (c1.name && c2.name &&
          c1.name.length > 0 && c2.name.length > 0) {
        const similarity = stringSimilarity(c1.name, c2.name);
        if (similarity > CUSTOMER_WEIGHTS.nameSimilarityThreshold) {
          matchingFields.push('Name (Similar)');
          score += similarity * CUSTOMER_WEIGHTS.nameWeight;
        }
      }

      if (matchingFields.length > 0 && score >= CUSTOMER_WEIGHTS.scoreThreshold) {
        duplicates.push({
          record1Id: c1.id,
          record1Name: c1.name || 'Unknown',
          record2Id: c2.id,
          record2Name: c2.name || 'Unknown',
          matchingFields,
          matchScore: Math.min(score, 1.0),
          entityType: 'Customer',
          get isExactMatch() { return this.matchScore >= 0.95; },
          get matchDescription() { return this.matchingFields.join(', '); },
        });
      }
    }
  }

  return duplicates.sort((a, b) => b.matchScore - a.matchScore);
}

/**
 * Find potential duplicate vendors using N^2 comparison.
 * Same scoring as customers.
 *
 * @param {object} db
 * @returns {Promise<PotentialDuplicate[]>}
 */
async function findPotentialVendorDuplicates(db) {
  const vendors = await db('vendors').orderBy('name', 'asc');

  const duplicates = [];

  for (let i = 0; i < vendors.length; i++) {
    for (let j = i + 1; j < vendors.length; j++) {
      const v1 = vendors[i];
      const v2 = vendors[j];

      const matchingFields = [];
      let score = 0;

      // Compare GST
      if (v1.gst_number && v2.gst_number &&
          v1.gst_number.length > 0 && v2.gst_number.length > 0 &&
          v1.gst_number.toLowerCase() === v2.gst_number.toLowerCase()) {
        matchingFields.push('GST Number');
        score += VENDOR_WEIGHTS.gst;
      }

      // Compare Email
      if (v1.email && v2.email &&
          v1.email.length > 0 && v2.email.length > 0 &&
          v1.email.toLowerCase() === v2.email.toLowerCase()) {
        matchingFields.push('Email');
        score += VENDOR_WEIGHTS.email;
      }

      // Compare Phone
      if (v1.phone && v2.phone &&
          v1.phone.length > 0 && v2.phone.length > 0 &&
          normalizePhone(v1.phone) === normalizePhone(v2.phone)) {
        matchingFields.push('Phone');
        score += VENDOR_WEIGHTS.phone;
      }

      // Compare Name (fuzzy)
      if (v1.name && v2.name &&
          v1.name.length > 0 && v2.name.length > 0) {
        const similarity = stringSimilarity(v1.name, v2.name);
        if (similarity > VENDOR_WEIGHTS.nameSimilarityThreshold) {
          matchingFields.push('Name (Similar)');
          score += similarity * VENDOR_WEIGHTS.nameWeight;
        }
      }

      if (matchingFields.length > 0 && score >= VENDOR_WEIGHTS.scoreThreshold) {
        duplicates.push({
          record1Id: v1.id,
          record1Name: v1.name || 'Unknown',
          record2Id: v2.id,
          record2Name: v2.name || 'Unknown',
          matchingFields,
          matchScore: Math.min(score, 1.0),
          entityType: 'Vendor',
          get isExactMatch() { return this.matchScore >= 0.95; },
          get matchDescription() { return this.matchingFields.join(', '); },
        });
      }
    }
  }

  return duplicates.sort((a, b) => b.matchScore - a.matchScore);
}

/**
 * Find potential duplicate items using N^2 comparison.
 * Scoring: Name similarity > 0.85 (0.6), HSN match (0.3), Color match (0.1)
 * Threshold: 0.5
 *
 * @param {object} db
 * @returns {Promise<PotentialDuplicate[]>}
 */
async function findPotentialItemDuplicates(db) {
  const items = await db('items').orderBy('name', 'asc');

  const duplicates = [];

  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const item1 = items[i];
      const item2 = items[j];

      const matchingFields = [];
      let score = 0;

      // Compare Name (fuzzy)
      if (item1.name && item2.name &&
          item1.name.length > 0 && item2.name.length > 0) {
        const similarity = stringSimilarity(item1.name, item2.name);
        if (similarity > ITEM_WEIGHTS.nameSimilarityThreshold) {
          matchingFields.push('Name');
          score += similarity * ITEM_WEIGHTS.nameWeight;
        }
      }

      // Compare HSN
      if (item1.hsn && item2.hsn &&
          item1.hsn.length > 0 && item2.hsn.length > 0 &&
          item1.hsn === item2.hsn) {
        matchingFields.push('HSN');
        score += ITEM_WEIGHTS.hsnWeight;
      }

      // Compare Color
      if (item1.color && item2.color &&
          item1.color.length > 0 && item2.color.length > 0 &&
          item1.color.toLowerCase() === item2.color.toLowerCase()) {
        matchingFields.push('Color');
        score += ITEM_WEIGHTS.colorWeight;
      }

      if (matchingFields.length > 0 && score >= ITEM_WEIGHTS.scoreThreshold) {
        duplicates.push({
          record1Id: item1.id,
          record1Name: item1.name || 'Unknown',
          record2Id: item2.id,
          record2Name: item2.name || 'Unknown',
          matchingFields,
          matchScore: Math.min(score, 1.0),
          entityType: 'Item',
          get isExactMatch() { return this.matchScore >= 0.95; },
          get matchDescription() { return this.matchingFields.join(', '); },
        });
      }
    }
  }

  return duplicates.sort((a, b) => b.matchScore - a.matchScore);
}

module.exports = {
  // Weights & thresholds
  CUSTOMER_WEIGHTS,
  VENDOR_WEIGHTS,
  ITEM_WEIGHTS,

  // Utility functions
  normalizePhone,
  levenshteinDistance,
  stringSimilarity,

  // Proactive checks
  checkCustomerDuplicate,
  checkVendorDuplicate,
  checkItemDuplicate,
  checkDocumentNumberDuplicate,

  // Reactive scanning
  findPotentialCustomerDuplicates,
  findPotentialVendorDuplicates,
  findPotentialItemDuplicates,
};
