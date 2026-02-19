/**
 * Utility: getCompanyProfile
 *
 * Single source of truth for company profile data.
 * All modules (PDFs, emails, reports, etc.) should use this helper
 * instead of querying the database directly or using hardcoded values.
 */
const db = require('../config/database');

// In-memory cache with TTL (5 minutes)
let cachedProfile = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch the company profile from the database.
 * Returns a normalized object with all fields guaranteed to exist (as empty string or null).
 * Uses a short in-memory cache so that multiple PDF generations in quick succession
 * don't each hit the database.
 *
 * @param {Object} [options]
 * @param {boolean} [options.skipCache=false] - Force a fresh DB read
 * @returns {Promise<Object>} Company profile object
 */
async function getCompanyProfile(options = {}) {
  const now = Date.now();

  if (!options.skipCache && cachedProfile && (now - cacheTimestamp < CACHE_TTL_MS)) {
    return { ...cachedProfile };
  }

  const profile = await db('company_profile').first();

  const result = {
    // Basic info
    company_name: profile?.company_name || '',
    legal_name: profile?.legal_name || '',
    industry: profile?.industry || '',
    company_type: profile?.company_type || '',
    tagline: profile?.tagline || '',

    // Registration numbers
    gstin: profile?.gstin || '',
    pan: profile?.pan || '',
    tan: profile?.tan || '',
    cin_number: profile?.cin_number || '',
    lut_number: profile?.lut_number || '',
    lut_expiry_date: profile?.lut_expiry_date || null,
    iec_code: profile?.iec_code || '',

    // Registered address
    address_line1: profile?.address_line1 || '',
    address_line2: profile?.address_line2 || '',
    city: profile?.city || '',
    state: profile?.state || '',
    pincode: profile?.pincode || '',
    country: profile?.country || 'India',

    // Factory address
    factory_address: profile?.factory_address || '',
    factory_city: profile?.factory_city || '',
    factory_state: profile?.factory_state || '',
    factory_pincode: profile?.factory_pincode || '',

    // Contact
    phone: profile?.phone || '',
    email: profile?.email || '',
    website: profile?.website || '',

    // Branding (never cache base64 data URLs - only file paths)
    logo_path: (profile?.logo_path && !profile.logo_path.startsWith('data:'))
      ? profile.logo_path : '',

    // Financial
    financial_year_start: profile?.financial_year_start || '',
    base_currency: profile?.base_currency || 'INR',

    // Bank details
    bank_name: profile?.bank_name || '',
    bank_account_number: profile?.bank_account_number || '',
    bank_ifsc_code: profile?.bank_ifsc_code || '',
    bank_branch: profile?.bank_branch || '',
    bank_details: profile?.bank_details || '',

    // Terms
    terms_and_conditions: profile?.terms_and_conditions || '',
    notes: profile?.notes || '',

    // About
    established_year: profile?.established_year || '',
    about_us: profile?.about_us || '',
    mission: profile?.mission || '',
    vision: profile?.vision || '',
    goals: profile?.goals || '',

    // Directors (never cache base64 data URLs - only file paths)
    director1_name: profile?.director1_name || '',
    director1_photo: (profile?.director1_photo && !profile.director1_photo.startsWith('data:'))
      ? profile.director1_photo : '',
    director2_name: profile?.director2_name || '',
    director2_photo: (profile?.director2_photo && !profile.director2_photo.startsWith('data:'))
      ? profile.director2_photo : '',
  };

  // Update cache
  cachedProfile = result;
  cacheTimestamp = now;

  return { ...result };
}

/**
 * Invalidate the cached profile. Call this after updates to the company_profile table.
 */
function invalidateCompanyProfileCache() {
  cachedProfile = null;
  cacheTimestamp = 0;
}

module.exports = { getCompanyProfile, invalidateCompanyProfileCache };
