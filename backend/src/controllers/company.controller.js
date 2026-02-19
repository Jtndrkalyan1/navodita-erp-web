const db = require('../config/database');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { invalidateCompanyProfileCache } = require('../utils/getCompanyProfile');

const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads', 'company');

// Ensure uploads/company directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

/**
 * Convert a base64 data URL to a file on disk and return the file path.
 * Returns null if the input is not a base64 data URL.
 */
function saveBase64ToFile(dataUrl, fieldName) {
  if (!dataUrl || !dataUrl.startsWith('data:')) return null;
  try {
    const matches = dataUrl.match(/^data:image\/(\w+);base64,(.+)$/s);
    if (!matches) return null;
    const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
    const buffer = Buffer.from(matches[2], 'base64');
    const hash = crypto.createHash('md5').update(buffer).digest('hex').slice(0, 8);
    const filename = `${fieldName}-${hash}.${ext}`;
    const filePath = path.join(UPLOADS_DIR, filename);
    fs.writeFileSync(filePath, buffer);
    return `/uploads/company/${filename}`;
  } catch (err) {
    console.error(`Failed to save base64 for ${fieldName}:`, err.message);
    return null;
  }
}

/**
 * Image fields that may contain base64 data URLs.
 */
const IMAGE_FIELDS = ['logo_path', 'director1_photo', 'director2_photo'];

/**
 * GET / - Get company profile
 */
const get = async (req, res, next) => {
  try {
    const profile = await db('company_profile').first();

    if (!profile) {
      return res.json({
        data: {
          company_name: null,
          legal_name: null,
          gstin: null,
          pan: null,
          tan: null,
          cin: null,
          lut_number: null,
          iec_code: null,
          address_line1: null,
          address_line2: null,
          city: null,
          state: null,
          pincode: null,
          country: 'India',
          factory_address: null,
          factory_city: null,
          factory_state: null,
          factory_pincode: null,
          phone: null,
          email: null,
          website: null,
          logo_path: null,
          financial_year_start: null,
          base_currency: 'INR',
          established_year: null,
          tagline: null,
          about_us: null,
          mission: null,
          vision: null,
          goals: null,
          director1_name: null,
          director1_photo: null,
          director1_designation: null,
          director1_bio: null,
          director2_name: null,
          director2_photo: null,
          director2_designation: null,
          director2_bio: null,
          departments: '[]',
          bank_name: null,
          bank_account_number: null,
          bank_ifsc_code: null,
          bank_branch: null,
        },
      });
    }

    // Ensure cin is populated from cin_number for backward compatibility
    if (profile.cin_number && !profile.cin) {
      profile.cin = profile.cin_number;
    }

    // Auto-convert any remaining base64 images to files on read
    let needsUpdate = false;
    const updates = {};
    for (const field of IMAGE_FIELDS) {
      if (profile[field] && profile[field].startsWith('data:')) {
        const filePath = saveBase64ToFile(profile[field], field);
        if (filePath) {
          profile[field] = filePath;
          updates[field] = filePath;
          needsUpdate = true;
        }
      }
    }

    // Also check department photos in the departments JSON
    if (profile.departments) {
      try {
        const depts = JSON.parse(profile.departments);
        let deptsChanged = false;
        for (const dept of depts) {
          if (dept.photo && dept.photo.startsWith('data:')) {
            const safeName = (dept.id || dept.name || 'dept').toString().replace(/[^a-zA-Z0-9-_]/g, '_');
            const filePath = saveBase64ToFile(dept.photo, `dept-${safeName}`);
            if (filePath) {
              dept.photo = filePath;
              deptsChanged = true;
            }
          }
        }
        if (deptsChanged) {
          profile.departments = JSON.stringify(depts);
          updates.departments = profile.departments;
          needsUpdate = true;
        }
      } catch { /* ignore parse errors */ }
    }

    // Persist the file path conversions to the database
    if (needsUpdate) {
      updates.updated_at = new Date();
      await db('company_profile').where({ id: profile.id }).update(updates);
      invalidateCompanyProfileCache();
      console.log(`[Company] Converted ${Object.keys(updates).length - 1} base64 images to files`);
    }

    res.json({ data: profile });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT / - Update company profile (upsert - create if not exists)
 */
const update = async (req, res, next) => {
  try {
    const profileData = req.body;

    // Convert any base64 image data to files before saving
    for (const field of IMAGE_FIELDS) {
      if (profileData[field] && profileData[field].startsWith('data:')) {
        const filePath = saveBase64ToFile(profileData[field], field);
        if (filePath) {
          profileData[field] = filePath;
        }
      }
    }

    // Also handle department photos
    if (profileData.departments) {
      try {
        const depts = typeof profileData.departments === 'string'
          ? JSON.parse(profileData.departments)
          : profileData.departments;
        for (const dept of depts) {
          if (dept.photo && dept.photo.startsWith('data:')) {
            const safeName = (dept.id || dept.name || 'dept').toString().replace(/[^a-zA-Z0-9-_]/g, '_');
            const filePath = saveBase64ToFile(dept.photo, `dept-${safeName}`);
            if (filePath) dept.photo = filePath;
          }
        }
        profileData.departments = JSON.stringify(depts);
      } catch { /* ignore parse errors */ }
    }

    const existing = await db('company_profile').first();

    let result;
    if (existing) {
      profileData.updated_at = new Date();
      [result] = await db('company_profile')
        .where({ id: existing.id })
        .update(profileData)
        .returning('*');
    } else {
      [result] = await db('company_profile')
        .insert(profileData)
        .returning('*');
    }

    // Invalidate the cached company profile so all modules pick up the new data
    invalidateCompanyProfileCache();

    res.json({ data: result });
  } catch (err) {
    next(err);
  }
};

module.exports = { get, update };
