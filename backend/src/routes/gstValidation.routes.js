const express = require('express');
const router = express.Router();
const https = require('https');
const http = require('http');

// RapidAPI GST Insights API key
const RAPIDAPI_GST_KEY = process.env.RAPIDAPI_GST_KEY || '2d87a5c5ddmsh8202fa29e233588p1bc96fjsn2d167feb6bc4';

/**
 * GST Validation via public API
 * POST /api/gst/validate
 * Body: { gstin: "29ABCDE1234F1Z5" }
 *
 * Returns: { valid: true/false, data: { ... } }
 */
router.post('/validate', async (req, res) => {
  try {
    const { gstin } = req.body;

    if (!gstin || gstin.length !== 15) {
      return res.status(400).json({ error: 'GSTIN must be exactly 15 characters' });
    }

    // Validate format
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (!gstRegex.test(gstin.toUpperCase())) {
      return res.status(400).json({ error: 'Invalid GSTIN format', valid: false });
    }

    const gstinUpper = gstin.toUpperCase();
    let gstData = null;

    // Method 1: RapidAPI GST Insights API (primary - most reliable)
    try {
      const response = await fetchWithHeaders(
        `https://gst-insights-api.p.rapidapi.com/getGSTDetailsUsingGST/${gstinUpper}`,
        {
          'x-rapidapi-host': 'gst-insights-api.p.rapidapi.com',
          'x-rapidapi-key': RAPIDAPI_GST_KEY,
          'Accept': 'application/json',
        },
        25000
      );
      // API returns: { success: true/false, data: {...} OR [{...}], generatedTimeStamps }
      // data can be an object OR an array - handle both shapes
      if (response && response.success === true && response.data) {
        const d = Array.isArray(response.data) ? response.data[0] : response.data;
        if (d && (d.legalName || d.gstNumber)) {
          // Build address from principalAddress.address object
          const addr = d.principalAddress?.address || {};
          const addrParts = [
            addr.buildingNumber, addr.buildingName, addr.floorNumber,
            addr.street, addr.locality, addr.location,
            addr.district, addr.streetcd || addr.stateCode, addr.pincode
          ].filter(Boolean);
          const formattedAddr = addrParts.join(', ');

          gstData = {
            valid: true,
            verified_online: true,
            gstin: d.gstNumber || gstinUpper,
            legal_name: d.legalName || '',
            trade_name: d.tradeName || d.legalName || '',
            status: d.status || 'Active',
            registration_date: d.registrationDate || '',
            state: getStateFromGSTCode(gstinUpper.substring(0, 2)),
            address: formattedAddr,
            business_type: d.constitutionOfBusiness || '',
            last_updated: d.lastUpdateDate || '',
            e_invoice_status: d.eInvoiceStatus || '',
            nature_of_business: Array.isArray(d.natureOfBusinessActivity) ? d.natureOfBusinessActivity.join(', ') : '',
            center_jurisdiction: d.centerJurisdiction || '',
            state_jurisdiction: d.stateJurisdiction || '',
            tax_type: d.taxType || '',
          };
        }
      } else if (response && response.success === false) {
        // API returned but found no data
        console.log('RapidAPI GST: Not found -', response.message);
        // Fall through to next method
      }
    } catch (err) {
      console.log('RapidAPI GST method failed:', err.message);
      // Try next method
    }

    // Method 2: Try taxpayer search API (official GST portal public endpoint)
    if (!gstData) {
      try {
        const response = await fetchWithHeaders(
          `https://taxpayersearch.gst.gov.in/commonpublicapi/v1.1/search?action=TP&gstin=${gstinUpper}`,
          {
            'User-Agent': 'Mozilla/5.0 (compatible; NavoditaERP/1.0)',
            'Accept': 'application/json',
          },
          8000
        );
        if (response && (response.sts !== undefined || response.lgnm)) {
          gstData = {
            valid: true,
            verified_online: true,
            gstin: gstinUpper,
            legal_name: response.lgnm || '',
            trade_name: response.tradeNam || response.lgnm || '',
            status: response.sts || 'Active',
            registration_date: response.rgdt || '',
            state: getStateFromGSTCode(gstinUpper.substring(0, 2)),
            address: formatAddress(response.pradr?.addr),
            business_type: response.ctb || '',
            last_updated: response.lstupdt || '',
          };
        }
      } catch (err) {
        // Try next method
      }
    }

    // Method 3: Try gstincheck.co.in (free tier)
    if (!gstData) {
      try {
        const response = await fetchWithHeaders(
          `https://sheet.gstincheck.co.in/check/${gstinUpper}`,
          {
            'User-Agent': 'Mozilla/5.0 (compatible; NavoditaERP/1.0)',
            'Accept': 'application/json',
          },
          6000
        );
        if (response && response.flag === true) {
          gstData = {
            valid: true,
            verified_online: true,
            gstin: gstinUpper,
            legal_name: response.data?.lgnm || '',
            trade_name: response.data?.tradeNam || '',
            status: response.data?.sts || '',
            registration_date: response.data?.rgdt || '',
            state: getStateFromGSTCode(gstinUpper.substring(0, 2)),
            address: formatAddress(response.data?.pradr?.addr),
            business_type: response.data?.ctb || '',
            last_updated: response.data?.lstupdt || '',
          };
        }
      } catch (err) {
        // Try next method
      }
    }

    // Method 4: Offline checksum validation as fallback
    if (!gstData) {
      const isValidChecksum = validateGSTChecksum(gstinUpper);
      gstData = {
        valid: isValidChecksum,
        verified_online: false,
        gstin: gstinUpper,
        legal_name: '',
        trade_name: '',
        status: isValidChecksum ? 'Format Valid (Online verification unavailable)' : 'Invalid Checksum',
        address: '',
        state: getStateFromGSTCode(gstinUpper.substring(0, 2)),
        note: 'Online GST portal was not reachable. Format and checksum validation done offline.',
      };
    }

    return res.json({ data: gstData });
  } catch (err) {
    console.error('GST validation error:', err);
    return res.status(500).json({ error: 'Failed to validate GST number', valid: false });
  }
});

// Helper: fetch with custom headers and timeout (supports both http and https)
function fetchWithHeaders(url, headers, timeoutMs) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const timer = setTimeout(() => {
      reject(new Error('Request timeout'));
    }, timeoutMs);

    const req = lib.get(url, { headers }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        clearTimeout(timer);
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch {
          reject(new Error('Invalid JSON response'));
        }
      });
    });
    req.on('error', (err) => { clearTimeout(timer); reject(err); });
  });
}

// Helper: format address from GST API response
function formatAddress(addr) {
  if (!addr) return '';
  const parts = [
    addr.bno, addr.flno, addr.bnm,
    addr.st, addr.loc, addr.dst,
    addr.stcd, addr.pncd
  ].filter(Boolean);
  return parts.join(', ');
}

// Helper: GST checksum validation
function validateGSTChecksum(gstin) {
  if (!gstin || gstin.length !== 15) return false;
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const idx = chars.indexOf(gstin[i]);
    if (idx === -1) return false;
    let product = idx * ((i % 2 === 0) ? 1 : 2);
    sum += Math.floor(product / 36) + (product % 36);
  }
  const checkDigit = (36 - (sum % 36)) % 36;
  return chars[checkDigit] === gstin[14];
}

// Helper: state code to state name
function getStateFromGSTCode(code) {
  const stateMap = {
    '01': 'Jammu & Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab', '04': 'Chandigarh',
    '05': 'Uttarakhand', '06': 'Haryana', '07': 'Delhi', '08': 'Rajasthan',
    '09': 'Uttar Pradesh', '10': 'Bihar', '11': 'Sikkim', '12': 'Arunachal Pradesh',
    '13': 'Nagaland', '14': 'Manipur', '15': 'Mizoram', '16': 'Tripura',
    '17': 'Meghalaya', '18': 'Assam', '19': 'West Bengal', '20': 'Jharkhand',
    '21': 'Odisha', '22': 'Chhattisgarh', '23': 'Madhya Pradesh', '24': 'Gujarat',
    '26': 'Dadra & Nagar Haveli and Daman & Diu', '27': 'Maharashtra', '29': 'Karnataka',
    '30': 'Goa', '31': 'Lakshadweep', '32': 'Kerala', '33': 'Tamil Nadu',
    '34': 'Puducherry', '35': 'Andaman & Nicobar Islands', '36': 'Telangana',
    '37': 'Andhra Pradesh', '38': 'Ladakh',
  };
  return stateMap[code] || '';
}

module.exports = router;
