const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

router.use(authenticate);

// ---------------------------------------------------------------------------
// Multer setup — store CSV uploads in uploads/zoho-imports/
// ---------------------------------------------------------------------------
const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'zoho-imports');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (req, file, cb) => {
    const isCSV = file.mimetype === 'text/csv' || file.originalname.toLowerCase().endsWith('.csv');
    const isPDF = file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf');
    if (isCSV || isPDF) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV and PDF files are allowed'));
    }
  },
});

// ---------------------------------------------------------------------------
// CSV parser — handles quoted fields
// ---------------------------------------------------------------------------
function parseCSV(content) {
  const lines = content.split('\n').filter(l => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };

  function parseLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') {
        inQuotes = !inQuotes;
      } else if (line[i] === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += line[i];
      }
    }
    result.push(current.trim());
    return result;
  }

  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map(parseLine);
  return { headers, rows };
}

// ---------------------------------------------------------------------------
// Date parser — handles DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD
// ---------------------------------------------------------------------------
function parseDate(dateStr) {
  if (!dateStr) return null;
  // YYYY-MM-DD (ISO)
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return new Date(dateStr);
  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (dmy) {
    return new Date(`${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`);
  }
  return new Date(dateStr);
}

// ---------------------------------------------------------------------------
// PDF text extractor — handles zlib-compressed CID font PDFs (e.g. Zoho Books)
// Uses raw zlib decompression + CMap parsing for proper character decoding
// ---------------------------------------------------------------------------
const zlib = require('zlib');

/**
 * Parse CMap data to build a character mapping table.
 * CMap maps CID codes to Unicode code points.
 */
function parseCMap(cmapText) {
  const mapping = {};
  // Parse beginbfrange entries: <srcLo><srcHi><dstLo>
  const rangeRegex = /<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g;
  let m;
  while ((m = rangeRegex.exec(cmapText)) !== null) {
    const lo = parseInt(m[1], 16);
    const hi = parseInt(m[2], 16);
    const dst = parseInt(m[3], 16);
    for (let i = lo; i <= hi; i++) {
      mapping[i] = dst + (i - lo);
    }
  }
  return mapping;
}

/**
 * Find and decompress all zlib streams in a PDF buffer.
 * Returns array of { index, decompressed } objects.
 */
function decompressPDFStreams(pdfBuffer) {
  const streams = [];
  const bufStr = pdfBuffer.toString('latin1');
  let idx = 0;

  while (idx < pdfBuffer.length - 6) {
    const sIdx = pdfBuffer.indexOf(Buffer.from('stream'), idx);
    if (sIdx < 0) break;

    let dataStart = sIdx + 6;
    if (pdfBuffer[dataStart] === 0x0D && pdfBuffer[dataStart + 1] === 0x0A) dataStart += 2;
    else if (pdfBuffer[dataStart] === 0x0A) dataStart += 1;

    const eIdx = pdfBuffer.indexOf(Buffer.from('endstream'), dataStart);
    if (eIdx < 0) { idx = sIdx + 6; continue; }

    const streamData = pdfBuffer.slice(dataStart, eIdx);
    try {
      const decompressed = zlib.inflateSync(streamData);
      streams.push({ index: streams.length, decompressed, text: decompressed.toString('latin1') });
    } catch (e) {
      // Not a valid zlib stream, skip
    }

    idx = eIdx + 9;
  }
  return streams;
}

/**
 * Extract text from a PDF buffer by:
 * 1. Decompressing all zlib streams
 * 2. Finding CMap streams to build character mappings
 * 3. Finding content streams with text operators (Tj/TJ)
 * 4. Decoding the text using the CMap or offset heuristic
 */
function extractTextFromPDF(buffer) {
  const streams = decompressPDFStreams(buffer);
  if (streams.length === 0) return '';

  // Step 1: Find CMap streams and build combined mapping
  let combinedMapping = {};
  let hasMapping = false;
  for (const s of streams) {
    if (s.text.includes('begincmap') && s.text.includes('beginbfrange')) {
      const mapping = parseCMap(s.text);
      Object.assign(combinedMapping, mapping);
      hasMapping = true;
    }
  }

  // If no CMap found, try to detect offset heuristically
  if (!hasMapping) {
    // Zoho Books PDFs typically use offset 0x1D (29)
    for (let off = 0x1D; off <= 0x20; off++) {
      combinedMapping = {};
      for (let i = 0; i < 256; i++) {
        combinedMapping[i] = i + off;
      }
    }
  }

  // Detect if CMap uses 2-byte codes (check if keys are > 0xFF)
  const maxCMapKey = hasMapping ? Math.max(...Object.keys(combinedMapping).map(Number)) : 0;
  // Also check if the CMap has entries with values >= 0x100 for multi-byte source keys
  const has2ByteKeys = maxCMapKey > 0xFF;

  /**
   * First unescape PDF string escape sequences from a raw Tj string.
   * PDF uses backslash escapes: \n, \r, \t, \\, \(, \), \NNN (octal).
   * Returns a buffer of raw byte values.
   */
  function unescapePDFString(raw) {
    const bytes = [];
    for (let i = 0; i < raw.length; i++) {
      if (raw[i] === '\\' && i + 1 < raw.length) {
        i++;
        if (raw[i] === 'n') bytes.push(0x0A);
        else if (raw[i] === 'r') bytes.push(0x0D);
        else if (raw[i] === 't') bytes.push(0x09);
        else if (raw[i] === 'b') bytes.push(0x08);
        else if (raw[i] === 'f') bytes.push(0x0C);
        else if (raw[i] === '(' || raw[i] === ')' || raw[i] === '\\') bytes.push(raw.charCodeAt(i));
        else if (raw[i] >= '0' && raw[i] <= '7') {
          // Octal escape: 1-3 digits
          let oct = raw[i];
          if (i + 1 < raw.length && raw[i + 1] >= '0' && raw[i + 1] <= '7') { oct += raw[++i]; }
          if (i + 1 < raw.length && raw[i + 1] >= '0' && raw[i + 1] <= '7') { oct += raw[++i]; }
          bytes.push(parseInt(oct, 8));
        } else {
          bytes.push(raw.charCodeAt(i));
        }
      } else {
        bytes.push(raw.charCodeAt(i));
      }
    }
    return bytes;
  }

  /**
   * Decode a raw text string from a Tj/TJ operator using the CMap.
   * Handles both single-byte and 2-byte CID encodings.
   */
  function decodeRawText(raw) {
    // First unescape PDF string escapes to get raw bytes
    const bytes = unescapePDFString(raw);
    let decoded = '';

    // Detect 2-byte encoding: if null bytes appear at even positions
    const hasNullBytes = bytes.some((b, i) => b === 0x00 && i % 2 === 0 && i + 1 < bytes.length && bytes[i + 1] !== 0x00);
    const is2Byte = hasNullBytes && bytes.length >= 2;

    if (is2Byte) {
      // 2-byte CID encoding: each character is 2 bytes (high byte + low byte)
      for (let i = 0; i + 1 < bytes.length; i += 2) {
        const highByte = bytes[i];
        const lowByte = bytes[i + 1];
        const code = (highByte << 8) | lowByte;
        if (code === 0) continue; // skip null pairs
        if (hasMapping && combinedMapping[code] !== undefined) {
          decoded += String.fromCodePoint(combinedMapping[code]);
        } else if (code >= 0x20 && code <= 0x7E) {
          decoded += String.fromCharCode(code);
        } else {
          // Try offset on the low byte
          const mapped = lowByte + 0x1D;
          if (mapped >= 0x20 && mapped <= 0x7E) {
            decoded += String.fromCharCode(mapped);
          }
        }
      }
    } else {
      // Single-byte encoding
      for (let i = 0; i < bytes.length; i++) {
        const code = bytes[i];
        if (hasMapping && combinedMapping[code] !== undefined) {
          decoded += String.fromCodePoint(combinedMapping[code]);
        } else if (hasMapping) {
          if (code >= 0x20 && code <= 0x7E) decoded += String.fromCharCode(code);
        } else {
          const mapped = code + 0x1D;
          if (mapped >= 0x20 && mapped <= 0x7E) {
            decoded += String.fromCharCode(mapped);
          } else if (code >= 0x20 && code <= 0x7E) {
            decoded += String.fromCharCode(code);
          }
        }
      }
    }
    return decoded;
  }

  // Step 2: Extract text from content streams
  const textLines = [];
  for (const s of streams) {
    if (!s.text.includes('Tj') && !s.text.includes('TJ')) continue;

    // Extract text from (...)Tj operators
    const tjRegex = /\(([^)]*)\)\s*Tj/g;
    let match;
    while ((match = tjRegex.exec(s.text)) !== null) {
      const decoded = decodeRawText(match[1]);
      const trimmed = decoded.replace(/\s+/g, ' ').trim();
      if (trimmed) textLines.push(trimmed);
    }

    // Extract text from [...]TJ arrays
    const tjArrayRegex = /\[([^\]]*)\]\s*TJ/g;
    while ((match = tjArrayRegex.exec(s.text)) !== null) {
      const arr = match[1];
      const parts = arr.match(/\(([^)]*)\)/g) || [];
      let combined = '';
      for (const part of parts) {
        combined += decodeRawText(part.slice(1, -1));
      }
      const trimmed = combined.replace(/\s+/g, ' ').trim();
      if (trimmed) textLines.push(trimmed);
    }
  }

  return textLines.join('\n');
}

// ---------------------------------------------------------------------------
// Auto-detect document type from extracted PDF text
// ---------------------------------------------------------------------------
const DOC_TYPE_PATTERNS = [
  { type: 'invoices',  keywords: ['TAX INVOICE', 'INVOICE', 'Invoice Date', 'Invoice#', 'Invoice Number'] },
  { type: 'bills',     keywords: ['BILL', 'Bill#', 'Bill Date', 'Bill Number'] },
  { type: 'quotations', keywords: ['QUOTATION', 'QUOTE', 'Quotation#', 'Quotation Date', 'Estimate'] },
  { type: 'expenses',  keywords: ['EXPENSE', 'Expense Report', 'Expense Date'] },
  { type: 'credit_notes', keywords: ['CREDIT NOTE', 'Credit Note#', 'Credit Note Date'] },
  { type: 'debit_notes',  keywords: ['DEBIT NOTE', 'Debit Note#', 'Debit Note Date'] },
  { type: 'purchase_orders', keywords: ['PURCHASE ORDER', 'PO Number', 'PO#', 'PO Date'] },
  { type: 'delivery_challans', keywords: ['DELIVERY CHALLAN', 'Challan#', 'Challan Date'] },
  { type: 'payments_received', keywords: ['PAYMENT RECEIPT', 'Payment Received', 'Receipt#'] },
  { type: 'payments_made', keywords: ['PAYMENT VOUCHER', 'Payment Made', 'Payment#'] },
];

function detectDocumentType(text) {
  const upper = text.toUpperCase();
  let bestMatch = null;
  let bestScore = 0;

  for (const pattern of DOC_TYPE_PATTERNS) {
    let score = 0;
    for (const kw of pattern.keywords) {
      if (upper.includes(kw.toUpperCase())) {
        // Longer keywords get higher scores for specificity
        score += kw.length;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = pattern.type;
    }
  }

  return bestMatch || 'unknown';
}

/**
 * Extract structured data from a Zoho-style PDF document.
 * Parses the decoded text to find document number, dates, amounts,
 * vendor/customer info, and line items.
 */
function extractDocumentData(text, docType) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);
  const data = { docType, rawLines: lines };

  // Extract document number
  // Zoho PDFs often have "#" on one line and ": NUMBER" on the next line
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Pattern 1: "Bill# 2025-26/4151" or "Invoice# INV-001" (with # required)
    const hashNumMatch = line.match(/(?:Invoice|Bill|Quotation|Credit Note|Debit Note|PO|Challan|Payment|Receipt)\s*#\s*:?\s*([A-Z0-9][\w\-\/]+)/i);
    if (hashNumMatch && hashNumMatch[1] && hashNumMatch[1].length > 2) {
      data.documentNumber = hashNumMatch[1].trim();
      break;
    }

    // Pattern 2: "#" alone on one line, then ": NAPL-EX-0130" on the next (Zoho format)
    if (line.trim() === '#' && i + 1 < lines.length) {
      const nextLine = lines[i + 1].trim();
      const nextMatch = nextLine.match(/^:?\s*([A-Z0-9][\w\-\/]+)/i);
      if (nextMatch && nextMatch[1] && nextMatch[1].length > 2) {
        data.documentNumber = nextMatch[1].trim();
        break;
      }
    }

    // Pattern 3: Standalone "Bill# XXXX" with the # symbol
    const hashOnlyMatch = line.match(/#\s*:?\s*([A-Z0-9][\w\-\/]+)/i);
    if (hashOnlyMatch && hashOnlyMatch[1] && hashOnlyMatch[1].length > 2) {
      data.documentNumber = hashOnlyMatch[1].trim();
      break;
    }
  }

  // If doc number not found, try the original filename (Zoho names files with doc numbers)
  if (!data.documentNumber) {
    // Will be set from the filename in the caller if needed
  }

  // Extract dates
  const datePattern = /(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4})/gi;
  const allDates = [];
  for (const line of lines) {
    const matches = line.match(datePattern);
    if (matches) allDates.push(...matches);
  }
  if (allDates.length > 0) data.date = allDates[0];
  if (allDates.length > 1) data.dueDate = allDates[1];

  // Extract amounts - look for Total, Sub Total, Balance Due
  // Also look at "label" then amount on next line, or "label: amount" on same line
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextLine = (i + 1 < lines.length) ? lines[i + 1] : '';

    // Same-line amounts: "Total $2,498.00" or "Sub Total 1,51,992.00"
    const totalSame = line.match(/^Total\s*[₹$]?\s*([\d,]+\.?\d*)/i);
    if (totalSame && totalSame[1]) { if (!data.total) data.total = totalSame[1].replace(/,/g, ''); }

    const subTotalSame = line.match(/Sub\s*Total\s*[₹$]?\s*([\d,]+\.?\d*)/i);
    if (subTotalSame && subTotalSame[1]) { if (!data.subTotal) data.subTotal = subTotalSame[1].replace(/,/g, ''); }

    const balanceSame = line.match(/Balance\s*Due\s*[₹$]?\s*([\d,]+\.?\d*)/i);
    if (balanceSame && balanceSame[1]) { if (!data.balanceDue) data.balanceDue = balanceSame[1].replace(/,/g, ''); }

    // Next-line amounts: "Total" then "$2,498.00" or "₹1,59,592.00" on next line
    const amountOnNext = nextLine.match(/^[₹$€£]?\s*([\d,]+\.?\d+)\s*$/);
    if (amountOnNext) {
      const amount = amountOnNext[1].replace(/,/g, '');
      const lower = line.toLowerCase().trim();
      if (lower === 'total' && !data.total) data.total = amount;
      else if ((lower === 'sub total' || lower === 'subtotal') && !data.subTotal) data.subTotal = amount;
      else if (lower.includes('balance due') && !data.balanceDue) data.balanceDue = amount;
    }

    // Handle amounts with currency prefix on next line: "₹1,59,592.00" (Indian format)
    const amountWithCurrency = nextLine.match(/^[₹$€£]\s*([\d,]+\.?\d+)\s*$/);
    if (amountWithCurrency) {
      const amount = amountWithCurrency[1].replace(/,/g, '');
      const lower = line.toLowerCase().trim();
      if (lower === 'total' && !data.total) data.total = amount;
      else if (lower.includes('balance due') && !data.balanceDue) data.balanceDue = amount;
    }

    // Look for GSTIN
    const gstinMatch = line.match(/GSTIN\s*:?\s*(\d{2}[A-Z]{5}\d{4}[A-Z]\d[A-Z\d]{2})/i);
    if (gstinMatch) {
      if (!data.companyGSTIN) data.companyGSTIN = gstinMatch[1];
      else if (!data.partyGSTIN) data.partyGSTIN = gstinMatch[1];
    }

    // Terms - same line or next line
    // Handles: "Terms" then "Net 45", "Terms :" then "Net 45", "Terms: Net 45"
    if (line.match(/^Terms\s*:?\s*$/i) && nextLine.match(/^:?\s*(Net\s+\d+)/i)) {
      data.terms = nextLine.match(/^:?\s*(Net\s+\d+)/i)[1];
    }
    const termsSame = line.match(/Terms\s*:?\s*(Net\s+\d+)/i);
    if (termsSame) data.terms = termsSame[1];

    // Due Date - "Due Date" or "Due Date :" then date on next line or ": date" on next line
    if (line.match(/^Due\s*Date\s*:?\s*$/i)) {
      const dateNextMatch = nextLine.match(/^:?\s*(\d{1,2}\s+\w+\s+\d{4})/i);
      if (dateNextMatch) data.dueDate = dateNextMatch[1];
    }
    // Due Date with date on same line: "Due Date : 19 Mar 2026"
    const dueDateSame = line.match(/Due\s*Date\s*:?\s*(\d{1,2}\s+\w+\s+\d{4})/i);
    if (dueDateSame) data.dueDate = dueDateSame[1];

    // Invoice/Bill Date - "Invoice Date" or "Bill Date" then date on next line
    if (line.match(/^(?:Invoice|Bill)\s*Date\s*:?\s*$/i)) {
      // Next line might be the date, or it could be "Due Date :" in which case look further
      const dateNextMatch = nextLine.match(/^:?\s*(\d{1,2}\s+\w+\s+\d{4})/i);
      if (dateNextMatch) {
        data.date = dateNextMatch[1];
      } else {
        // Zoho format: "Bill Date :" / "Due Date :" / "19 Mar 2026" — date is 2 lines ahead
        const lineAfterNext = (i + 2 < lines.length) ? lines[i + 2] : '';
        const dateSkipMatch = lineAfterNext.match(/^:?\s*(\d{1,2}\s+\w+\s+\d{4})/i);
        if (dateSkipMatch) data.date = dateSkipMatch[1];
      }
    }
    // Invoice/Bill Date with date on same line
    const docDateSame = line.match(/(?:Invoice|Bill)\s*Date\s*:?\s*(\d{1,2}\s+\w+\s+\d{4})/i);
    if (docDateSame) data.date = docDateSame[1];
  }

  // Extract customer/vendor name
  // Strategy differs for invoices vs bills:
  //
  // INVOICE (Zoho format): Company info first, then "TAX INVOICE", then "#", then dates, then customer name/address
  //   The customer name appears after the dates/terms block (after "Due Date" line + value)
  //
  // BILL (Zoho format): Company info first, then UDYAM number, then vendor address block
  //   The vendor info appears AFTER the company block (after GSTIN/email/website/UDYAM lines)
  //   In Zoho Bills, the vendor name may not be explicitly shown — use the address block or
  //   look for it in a "Bill To" section

  // Method 1: For invoices — find customer after Due Date / Terms section
  if (docType === 'invoices') {
    let dueDateIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].match(/^Due\s*Date/i)) { dueDateIdx = i; }
    }
    if (dueDateIdx >= 0) {
      // Skip the date value line + terms lines, look for a name-like line
      for (let i = dueDateIdx + 1; i < Math.min(dueDateIdx + 8, lines.length); i++) {
        const l = lines[i].trim();
        if (l.length < 3) continue;
        // Skip date values, label lines, and known patterns
        if (l.match(/^\d{1,2}\s+\w+\s+\d{4}/)) continue;   // date value
        if (l.match(/^:?\s*\d{1,2}\s+\w+\s+\d{4}/)) continue; // ": date"
        if (l.match(/^:?\s*Net\s+\d+/i)) continue;           // terms value
        if (l.match(/^Terms\s*:?\s*$/i)) continue;           // "Terms" or "Terms :"
        if (l.match(/^(#|Item|Description|HSN|Qty|Rate|Amount|IGST|CGST|SGST|BILL|INVOICE|TAX)/i)) break;
        if (l.match(/^\d+$/) || l.match(/^U\.S\.A|^India$/i) || l.match(/^GSTIN/i)) continue;
        // This is likely the customer name
        data.partyName = l;
        break;
      }
    }
  }

  // Method 2: For bills — look for vendor address block after company GSTIN/UDYAM section
  // In Zoho Bills, the company info block is followed by the vendor address block
  if (docType === 'bills') {
    // Find the company GSTIN line, then skip company details to find vendor block
    let companyBlockEnd = -1;
    for (let i = 0; i < lines.length; i++) {
      // UDYAM number marks end of company block in Zoho PDFs
      if (lines[i].match(/^UDYAM-/i)) { companyBlockEnd = i; break; }
    }
    if (companyBlockEnd < 0) {
      // Fallback: find GSTIN line
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].match(/^GSTIN/i)) { companyBlockEnd = i; break; }
      }
    }
    if (companyBlockEnd >= 0) {
      // The vendor address block starts right after company block
      // Look for the first non-empty line that's not a known pattern
      for (let i = companyBlockEnd + 1; i < Math.min(companyBlockEnd + 8, lines.length); i++) {
        const l = lines[i].trim();
        if (l.length < 3) continue;
        if (l.match(/^(#|Item|Description|HSN|Qty|Rate|Amount)/i)) break;
        if (l.match(/^\d+$/) || l.match(/^India$/i)) continue;
        if (l.match(/^GSTIN/i) || l.match(/^UDYAM/i)) continue;
        if (l.match(/^www\./i) || l.match(/@/) || l.match(/^\d{10}$/)) continue; // email, phone, website
        // First meaningful line in vendor block — use as vendor name/address
        // If it looks like a street address, use it as-is (vendor name not available)
        data.partyName = l;
        break;
      }
    }
  }

  // Generic fallback: try "Bill To" or "Ship To" sections
  if (!data.partyName) {
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].match(/^(?:Bill\s*To|Ship\s*To|Sold\s*To|Customer|Vendor)\s*:?\s*$/i)) {
        if (i + 1 < lines.length && lines[i + 1].trim().length > 2) {
          data.partyName = lines[i + 1].trim();
          break;
        }
      }
    }
  }

  return data;
}

/**
 * Convert extracted PDF document data into a tabular format
 * suitable for the import pipeline (headers + rows).
 */
function pdfDataToTabular(data) {
  const docType = data.docType;

  if (docType === 'invoices') {
    const headers = ['Invoice Number', 'Invoice Date', 'Due Date', 'Customer Name', 'Total', 'Balance Due', 'Terms', 'Status'];
    const row = [
      data.documentNumber || '',
      data.date || '',
      data.dueDate || '',
      data.partyName || '',
      data.total || '',
      data.balanceDue || data.total || '',
      data.terms || '',
      'draft',
    ];
    return { headers, rows: [row] };
  }

  if (docType === 'bills') {
    const headers = ['Bill Number', 'Bill Date', 'Due Date', 'Vendor Name', 'Total', 'Balance Due', 'Terms', 'Status'];
    const row = [
      data.documentNumber || '',
      data.date || '',
      data.dueDate || '',
      data.partyName || '',
      data.total || '',
      data.balanceDue || data.total || '',
      data.terms || '',
      'draft',
    ];
    return { headers, rows: [row] };
  }

  // Fallback: return raw lines as single-column
  return {
    headers: ['Extracted Text'],
    rows: data.rawLines.map(l => [l]),
  };
}

function parsePDFToTabular(pdfBuffer) {
  const rawText = extractTextFromPDF(pdfBuffer);

  if (!rawText || rawText.trim().length < 10) {
    return { headers: [], rows: [], rawText: '', detectedType: 'unknown' };
  }

  const detectedType = detectDocumentType(rawText);
  const docData = extractDocumentData(rawText, detectedType);
  const { headers, rows } = pdfDataToTabular(docData);

  return { headers, rows, rawText, detectedType, docData };
}

// ---------------------------------------------------------------------------
// POST /parse-pdf — Upload a PDF and extract tabular data with auto-detection
// ---------------------------------------------------------------------------
router.post('/parse-pdf', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const isPDF =
      req.file.mimetype === 'application/pdf' ||
      req.file.originalname.toLowerCase().endsWith('.pdf');

    if (!isPDF) {
      return res.status(400).json({ success: false, error: 'File must be a PDF' });
    }

    const pdfBuffer = fs.readFileSync(req.file.path);
    const { headers, rows, rawText, detectedType, docData } = parsePDFToTabular(pdfBuffer);

    // Use auto-detected type if caller sent 'unknown' or 'auto'
    const requestedCategory = (req.body.category || '').toLowerCase();
    const category = (requestedCategory === 'unknown' || requestedCategory === 'auto' || !requestedCategory)
      ? detectedType
      : requestedCategory;

    const sampleRows = rows.slice(0, 5);
    const suggestedMapping = buildSuggestedMapping(headers, category);

    // If the extraction found tabular data, convert to a CSV for import compatibility
    let csvFilename = null;
    if (headers.length > 0 && rows.length > 0) {
      const csvLines = [headers.join(',')];
      rows.forEach((row) => {
        csvLines.push(
          row
            .map((cell) => {
              if (cell && cell.includes(',')) return `"${cell}"`;
              return cell || '';
            })
            .join(',')
        );
      });
      csvFilename = `${Date.now()}-pdf-converted.csv`;
      fs.writeFileSync(path.join(uploadDir, csvFilename), csvLines.join('\n'), 'utf-8');
    }

    res.json({
      success: true,
      isPDFExtraction: true,
      detectedType,
      detectedData: docData ? {
        documentNumber: docData.documentNumber,
        date: docData.date,
        dueDate: docData.dueDate,
        total: docData.total,
        balanceDue: docData.balanceDue,
        terms: docData.terms,
      } : null,
      preview: {
        category,
        filename: csvFilename || req.file.filename,
        originalName: req.file.originalname,
        headers,
        sampleRows,
        suggestedMapping,
        totalRows: rows.length,
        rawTextPreview: rawText ? rawText.substring(0, 3000) : '',
        extractionNote:
          headers.length > 0 && rows.length > 0
            ? `Detected as "${detectedType}". Extracted ${rows.length} record(s) with ${headers.length} fields from PDF "${req.file.originalname}".`
            : 'Could not extract structured data from this PDF. The raw text is provided for review. Try converting to CSV for better results.',
      },
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /detect-pdf — Detect document type from a PDF without importing
// ---------------------------------------------------------------------------
router.post('/detect-pdf', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const pdfBuffer = fs.readFileSync(req.file.path);
    const rawText = extractTextFromPDF(pdfBuffer);
    const detectedType = detectDocumentType(rawText);
    const docData = extractDocumentData(rawText, detectedType);

    // Clean up the uploaded file
    try { fs.unlinkSync(req.file.path); } catch (e) { /* ignore */ }

    res.json({
      success: true,
      detectedType,
      documentNumber: docData.documentNumber,
      date: docData.date,
      total: docData.total,
      rawTextPreview: rawText ? rawText.substring(0, 1000) : '',
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// Field mapping suggestions per category
// ---------------------------------------------------------------------------
const FIELD_MAPPINGS = {
  customers: {
    'Customer Name': 'display_name',
    'Display Name': 'display_name',
    'Company Name': 'company_name',
    'Email': 'email',
    'Phone': 'phone',
    'Mobile': 'mobile',
    'Billing Address': 'billing_address_line1',
    'Billing Street': 'billing_address_line1',
    'Billing Address Line 2': 'billing_address_line2',
    'Billing City': 'billing_city',
    'Billing State': 'billing_state',
    'Billing Country': 'billing_country',
    'Billing Zip': 'billing_pincode',
    'Billing Code': 'billing_pincode',
    'Shipping Address': 'shipping_address_line1',
    'Shipping Street': 'shipping_address_line1',
    'Shipping City': 'shipping_city',
    'Shipping State': 'shipping_state',
    'Shipping Country': 'shipping_country',
    'Shipping Zip': 'shipping_pincode',
    'Shipping Code': 'shipping_pincode',
    'GSTIN': 'gstin',
    'GST Number': 'gstin',
    'PAN': 'pan_number',
    'PAN Number': 'pan_number',
    'Payment Terms': 'payment_terms',
    'Notes': 'notes',
  },
  vendors: {
    'Vendor Name': 'display_name',
    'Display Name': 'display_name',
    'Company Name': 'company_name',
    'Email': 'email',
    'Phone': 'phone',
    'Mobile': 'mobile',
    'Billing Address': 'billing_address_line1',
    'Billing Street': 'billing_address_line1',
    'Billing Address Line 2': 'billing_address_line2',
    'Billing City': 'billing_city',
    'Billing State': 'billing_state',
    'Billing Country': 'billing_country',
    'Billing Zip': 'billing_pincode',
    'Billing Code': 'billing_pincode',
    'GSTIN': 'gstin',
    'GST Number': 'gstin',
    'PAN': 'pan_number',
    'PAN Number': 'pan_number',
    'Payment Terms': 'payment_terms',
    'Notes': 'notes',
  },
  items: {
    'Item Name': 'name',
    'Name': 'name',
    'SKU': 'sku',
    'Rate': 'selling_price',
    'Selling Price': 'selling_price',
    'Purchase Rate': 'cost_price',
    'Cost Price': 'cost_price',
    'Unit': 'unit',
    'HSN/SAC': 'hsn_sac_code',
    'HSN Code': 'hsn_sac_code',
    'SAC Code': 'hsn_sac_code',
    'Tax': 'tax_rate',
    'Tax Rate': 'tax_rate',
    'Tax Percentage': 'tax_rate',
    'Description': 'description',
    'Type': 'type',
    'Item Type': 'type',
  },
  invoices: {
    'Invoice Number': 'invoice_number',
    'Invoice#': 'invoice_number',
    'Invoice Date': 'invoice_date',
    'Due Date': 'due_date',
    'Customer Name': 'customer_name',
    'Total': 'total',
    'Sub Total': 'sub_total',
    'Tax Amount': 'tax_amount',
    'Balance': 'balance_due',
    'Balance Due': 'balance_due',
    'Status': 'status',
    'Notes': 'notes',
    'Terms': 'terms',
    'Discount': 'discount',
    'Item Name': 'item_name',
    'Item Description': 'item_description',
    'Quantity': 'quantity',
    'Rate': 'rate',
    'Amount': 'amount',
  },
  bills: {
    'Bill Number': 'bill_number',
    'Bill#': 'bill_number',
    'Bill Date': 'bill_date',
    'Due Date': 'due_date',
    'Vendor Name': 'vendor_name',
    'Total': 'total',
    'Sub Total': 'sub_total',
    'Tax Amount': 'tax_amount',
    'Balance': 'balance_due',
    'Balance Due': 'balance_due',
    'Status': 'status',
    'Notes': 'notes',
    'Reference': 'reference_number',
    'Reference Number': 'reference_number',
    'Item Name': 'item_name',
    'Item Description': 'item_description',
    'Quantity': 'quantity',
    'Rate': 'rate',
    'Amount': 'amount',
  },
  expenses: {
    'Date': 'expense_date',
    'Expense Date': 'expense_date',
    'Category': 'category',
    'Expense Category': 'category',
    'Amount': 'amount',
    'Total': 'amount',
    'Vendor Name': 'vendor_name',
    'Paid Through': 'paid_through',
    'Description': 'description',
    'Notes': 'description',
    'Reference': 'reference_number',
    'Reference Number': 'reference_number',
    'Reference#': 'reference_number',
    'Tax': 'tax_amount',
    'Tax Amount': 'tax_amount',
  },
};

// Build a suggested mapping for a given category by matching CSV headers
function buildSuggestedMapping(headers, category) {
  const mapping = {};
  const categoryMappings = FIELD_MAPPINGS[category] || {};

  for (const header of headers) {
    const trimmed = header.trim();
    // Exact match first
    if (categoryMappings[trimmed]) {
      mapping[trimmed] = categoryMappings[trimmed];
      continue;
    }
    // Case-insensitive match
    const lower = trimmed.toLowerCase();
    for (const [key, value] of Object.entries(categoryMappings)) {
      if (key.toLowerCase() === lower) {
        mapping[trimmed] = value;
        break;
      }
    }
  }
  return mapping;
}

// ---------------------------------------------------------------------------
// POST /upload — Upload CSV files and return preview + suggested mappings
// ---------------------------------------------------------------------------
router.post('/upload', upload.array('files', 20), async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, error: 'No files uploaded' });
    }

    let categories = [];
    if (req.body.categories) {
      try {
        categories = JSON.parse(req.body.categories);
      } catch {
        categories = [];
      }
    }

    const previews = [];

    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      const category = (categories[i] || 'unknown').toLowerCase();
      const isPDF =
        file.mimetype === 'application/pdf' ||
        file.originalname.toLowerCase().endsWith('.pdf');

      let headers, rows, filename, extractionNote;

      if (isPDF) {
        // Extract tabular data from PDF with auto-detection
        const pdfBuffer = fs.readFileSync(file.path);
        const pdfResult = parsePDFToTabular(pdfBuffer);
        headers = pdfResult.headers;
        rows = pdfResult.rows;

        // Auto-detect category if not specified or unknown
        const detectedType = pdfResult.detectedType || 'unknown';
        if (category === 'unknown' || category === 'auto') {
          categories[i] = detectedType;
        }

        // If extraction worked, save as CSV for import compatibility
        if (headers.length > 0 && rows.length > 0) {
          const csvLines = [headers.join(',')];
          rows.forEach((row) => {
            csvLines.push(
              row
                .map((cell) => (cell && cell.includes(',') ? `"${cell}"` : cell || ''))
                .join(',')
            );
          });
          filename = `${Date.now()}-pdf-converted.csv`;
          fs.writeFileSync(path.join(uploadDir, filename), csvLines.join('\n'), 'utf-8');
          extractionNote = `Detected as "${detectedType}". Extracted ${rows.length} record(s) from PDF "${file.originalname}"`;
        } else {
          filename = file.filename;
          extractionNote = 'Could not extract structured data from PDF. Try converting to CSV first.';
        }
      } else {
        // Regular CSV
        const content = fs.readFileSync(file.path, 'utf-8');
        const parsed = parseCSV(content);
        headers = parsed.headers;
        rows = parsed.rows;
        filename = file.filename;
        extractionNote = null;
      }

      const sampleRows = rows.slice(0, 5);
      const suggestedMapping = buildSuggestedMapping(headers, category);

      previews.push({
        category,
        filename: filename,
        originalName: file.originalname,
        headers,
        sampleRows,
        suggestedMapping,
        totalRows: rows.length,
        isPDF,
        extractionNote,
      });
    }

    res.json({ success: true, previews });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /import — Import data from uploaded CSV files
// ---------------------------------------------------------------------------
router.post('/import', async (req, res, next) => {
  try {
    const { imports } = req.body;
    if (!imports || !Array.isArray(imports) || imports.length === 0) {
      return res.status(400).json({ success: false, error: 'No import configuration provided' });
    }

    const results = [];

    for (const importConfig of imports) {
      const { category, filename, fieldMapping } = importConfig;
      if (!category || !filename || !fieldMapping) {
        results.push({
          category: category || 'unknown',
          imported: 0,
          skipped: 0,
          errors: 1,
          errorDetails: ['Missing category, filename, or fieldMapping'],
        });
        continue;
      }

      const filePath = path.join(uploadDir, filename);
      if (!fs.existsSync(filePath)) {
        results.push({
          category,
          imported: 0,
          skipped: 0,
          errors: 1,
          errorDetails: [`File not found: ${filename}`],
        });
        continue;
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      const { headers, rows } = parseCSV(content);

      const result = await importCategory(category, headers, rows, fieldMapping);
      results.push({ category, ...result });
    }

    res.json({ success: true, results });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// Import logic per category
// ---------------------------------------------------------------------------
async function importCategory(category, headers, rows, fieldMapping) {
  let imported = 0;
  let skipped = 0;
  const errorDetails = [];

  // Map a CSV row to an object using the fieldMapping
  function mapRow(row) {
    const obj = {};
    for (const [csvHeader, dbField] of Object.entries(fieldMapping)) {
      const idx = headers.indexOf(csvHeader);
      if (idx !== -1 && idx < row.length) {
        obj[dbField] = row[idx] || null;
      }
    }
    return obj;
  }

  try {
    switch (category.toLowerCase()) {
      case 'customers':
        ({ imported, skipped } = await importCustomers(rows, mapRow, errorDetails));
        break;
      case 'vendors':
        ({ imported, skipped } = await importVendors(rows, mapRow, errorDetails));
        break;
      case 'items':
        ({ imported, skipped } = await importItems(rows, mapRow, errorDetails));
        break;
      case 'invoices':
        ({ imported, skipped } = await importInvoices(rows, mapRow, errorDetails));
        break;
      case 'bills':
        ({ imported, skipped } = await importBills(rows, mapRow, errorDetails));
        break;
      case 'expenses':
        ({ imported, skipped } = await importExpenses(rows, mapRow, errorDetails));
        break;
      default:
        errorDetails.push(`Unknown category: ${category}`);
    }
  } catch (err) {
    errorDetails.push(`Transaction error: ${err.message}`);
  }

  return { imported, skipped, errors: errorDetails.length, errorDetails };
}

// ---------------------------------------------------------------------------
// Customer import
// ---------------------------------------------------------------------------
async function importCustomers(rows, mapRow, errorDetails) {
  let imported = 0;
  let skipped = 0;

  await db.transaction(async (trx) => {
    for (let i = 0; i < rows.length; i++) {
      try {
        const data = mapRow(rows[i]);
        if (!data.display_name) {
          errorDetails.push(`Row ${i + 2}: Missing display name, skipped`);
          skipped++;
          continue;
        }

        // Duplicate check by email or display_name
        const existing = await trx('customers')
          .where(function () {
            this.where('display_name', data.display_name);
            if (data.email) this.orWhere('email', data.email);
          })
          .first();

        if (existing) {
          skipped++;
          continue;
        }

        // Separate address fields from customer fields
        const addressFields = {};
        const customerFields = {};
        const addressKeys = [
          'billing_address_line1', 'billing_address_line2', 'billing_city',
          'billing_state', 'billing_country', 'billing_pincode',
          'shipping_address_line1', 'shipping_address_line2', 'shipping_city',
          'shipping_state', 'shipping_country', 'shipping_pincode',
        ];

        for (const [key, value] of Object.entries(data)) {
          if (value === null || value === '') continue;
          if (addressKeys.includes(key)) {
            addressFields[key] = value;
          } else {
            customerFields[key] = value;
          }
        }

        const [customer] = await trx('customers').insert(customerFields).returning('*');

        // Insert billing address if any billing fields present
        const hasBilling = Object.keys(addressFields).some(k => k.startsWith('billing_') && addressFields[k]);
        if (hasBilling) {
          await trx('customer_addresses').insert({
            customer_id: customer.id,
            address_type: 'billing',
            address_line1: addressFields.billing_address_line1 || '',
            address_line2: addressFields.billing_address_line2 || '',
            city: addressFields.billing_city || '',
            state: addressFields.billing_state || '',
            country: addressFields.billing_country || 'India',
            pincode: addressFields.billing_pincode || '',
          });
        }

        // Insert shipping address if any shipping fields present
        const hasShipping = Object.keys(addressFields).some(k => k.startsWith('shipping_') && addressFields[k]);
        if (hasShipping) {
          await trx('customer_addresses').insert({
            customer_id: customer.id,
            address_type: 'shipping',
            address_line1: addressFields.shipping_address_line1 || '',
            address_line2: addressFields.shipping_address_line2 || '',
            city: addressFields.shipping_city || '',
            state: addressFields.shipping_state || '',
            country: addressFields.shipping_country || 'India',
            pincode: addressFields.shipping_pincode || '',
          });
        }

        imported++;
      } catch (err) {
        errorDetails.push(`Row ${i + 2}: ${err.message}`);
      }
    }
  });

  return { imported, skipped };
}

// ---------------------------------------------------------------------------
// Vendor import
// ---------------------------------------------------------------------------
async function importVendors(rows, mapRow, errorDetails) {
  let imported = 0;
  let skipped = 0;

  await db.transaction(async (trx) => {
    for (let i = 0; i < rows.length; i++) {
      try {
        const data = mapRow(rows[i]);
        if (!data.display_name) {
          errorDetails.push(`Row ${i + 2}: Missing display name, skipped`);
          skipped++;
          continue;
        }

        const existing = await trx('vendors')
          .where(function () {
            this.where('display_name', data.display_name);
            if (data.email) this.orWhere('email', data.email);
          })
          .first();

        if (existing) {
          skipped++;
          continue;
        }

        const addressFields = {};
        const vendorFields = {};
        const addressKeys = [
          'billing_address_line1', 'billing_address_line2', 'billing_city',
          'billing_state', 'billing_country', 'billing_pincode',
        ];

        for (const [key, value] of Object.entries(data)) {
          if (value === null || value === '') continue;
          if (addressKeys.includes(key)) {
            addressFields[key] = value;
          } else {
            vendorFields[key] = value;
          }
        }

        const [vendor] = await trx('vendors').insert(vendorFields).returning('*');

        const hasBilling = Object.keys(addressFields).some(k => addressFields[k]);
        if (hasBilling) {
          await trx('vendor_addresses').insert({
            vendor_id: vendor.id,
            address_type: 'billing',
            address_line1: addressFields.billing_address_line1 || '',
            address_line2: addressFields.billing_address_line2 || '',
            city: addressFields.billing_city || '',
            state: addressFields.billing_state || '',
            country: addressFields.billing_country || 'India',
            pincode: addressFields.billing_pincode || '',
          });
        }

        imported++;
      } catch (err) {
        errorDetails.push(`Row ${i + 2}: ${err.message}`);
      }
    }
  });

  return { imported, skipped };
}

// ---------------------------------------------------------------------------
// Item import
// ---------------------------------------------------------------------------
async function importItems(rows, mapRow, errorDetails) {
  let imported = 0;
  let skipped = 0;

  await db.transaction(async (trx) => {
    for (let i = 0; i < rows.length; i++) {
      try {
        const data = mapRow(rows[i]);
        if (!data.name) {
          errorDetails.push(`Row ${i + 2}: Missing item name, skipped`);
          skipped++;
          continue;
        }

        const existing = await trx('items')
          .where(function () {
            this.where('name', data.name);
            if (data.sku) this.orWhere('sku', data.sku);
          })
          .first();

        if (existing) {
          skipped++;
          continue;
        }

        // Convert numeric fields
        if (data.selling_price) data.selling_price = parseFloat(data.selling_price) || 0;
        if (data.cost_price) data.cost_price = parseFloat(data.cost_price) || 0;
        if (data.tax_rate) data.tax_rate = parseFloat(data.tax_rate) || 0;

        await trx('items').insert(data);
        imported++;
      } catch (err) {
        errorDetails.push(`Row ${i + 2}: ${err.message}`);
      }
    }
  });

  return { imported, skipped };
}

// ---------------------------------------------------------------------------
// Invoice import
// ---------------------------------------------------------------------------
async function importInvoices(rows, mapRow, errorDetails) {
  let imported = 0;
  let skipped = 0;

  // Group rows by invoice_number to collect line items
  const invoiceGroups = {};
  for (let i = 0; i < rows.length; i++) {
    const data = mapRow(rows[i]);
    const invNum = data.invoice_number;
    if (!invNum) {
      errorDetails.push(`Row ${i + 2}: Missing invoice number, skipped`);
      skipped++;
      continue;
    }
    if (!invoiceGroups[invNum]) {
      invoiceGroups[invNum] = { parentData: data, lineItems: [], rowIndex: i };
    }
    // Collect line item fields if present
    if (data.item_name || data.quantity || data.rate) {
      invoiceGroups[invNum].lineItems.push({
        item_name: data.item_name || '',
        description: data.item_description || '',
        quantity: parseFloat(data.quantity) || 1,
        rate: parseFloat(data.rate) || 0,
        amount: parseFloat(data.amount) || 0,
      });
    }
  }

  await db.transaction(async (trx) => {
    for (const [invNum, group] of Object.entries(invoiceGroups)) {
      try {
        const existing = await trx('invoices').where('invoice_number', invNum).first();
        if (existing) {
          skipped++;
          continue;
        }

        const data = group.parentData;

        // Resolve customer_id from customer_name
        let customerId = null;
        if (data.customer_name) {
          const customer = await trx('customers').where('display_name', data.customer_name).first();
          if (customer) customerId = customer.id;
        }

        const invoiceData = {
          invoice_number: data.invoice_number,
          invoice_date: parseDate(data.invoice_date),
          due_date: parseDate(data.due_date),
          customer_id: customerId,
          sub_total: parseFloat(data.sub_total) || 0,
          tax_amount: parseFloat(data.tax_amount) || 0,
          discount: parseFloat(data.discount) || 0,
          total: parseFloat(data.total) || 0,
          balance_due: parseFloat(data.balance_due) || parseFloat(data.total) || 0,
          status: data.status || 'draft',
          notes: data.notes || '',
          terms: data.terms || '',
        };

        const [invoice] = await trx('invoices').insert(invoiceData).returning('*');

        // Insert line items
        if (group.lineItems.length > 0) {
          const items = group.lineItems.map((li) => ({
            invoice_id: invoice.id,
            item_name: li.item_name,
            description: li.description,
            quantity: li.quantity,
            rate: li.rate,
            amount: li.amount || li.quantity * li.rate,
          }));
          await trx('invoice_items').insert(items);
        }

        imported++;
      } catch (err) {
        errorDetails.push(`Invoice ${invNum}: ${err.message}`);
      }
    }
  });

  return { imported, skipped };
}

// ---------------------------------------------------------------------------
// Bill import
// ---------------------------------------------------------------------------
async function importBills(rows, mapRow, errorDetails) {
  let imported = 0;
  let skipped = 0;

  // Group rows by bill_number to collect line items
  const billGroups = {};
  for (let i = 0; i < rows.length; i++) {
    const data = mapRow(rows[i]);
    const billNum = data.bill_number;
    if (!billNum) {
      errorDetails.push(`Row ${i + 2}: Missing bill number, skipped`);
      skipped++;
      continue;
    }
    if (!billGroups[billNum]) {
      billGroups[billNum] = { parentData: data, lineItems: [], rowIndex: i };
    }
    if (data.item_name || data.quantity || data.rate) {
      billGroups[billNum].lineItems.push({
        item_name: data.item_name || '',
        description: data.item_description || '',
        quantity: parseFloat(data.quantity) || 1,
        rate: parseFloat(data.rate) || 0,
        amount: parseFloat(data.amount) || 0,
      });
    }
  }

  await db.transaction(async (trx) => {
    for (const [billNum, group] of Object.entries(billGroups)) {
      try {
        const existing = await trx('bills').where('bill_number', billNum).first();
        if (existing) {
          skipped++;
          continue;
        }

        const data = group.parentData;

        // Resolve vendor_id from vendor_name
        let vendorId = null;
        if (data.vendor_name) {
          const vendor = await trx('vendors').where('display_name', data.vendor_name).first();
          if (vendor) vendorId = vendor.id;
        }

        const billData = {
          bill_number: data.bill_number,
          bill_date: parseDate(data.bill_date),
          due_date: parseDate(data.due_date),
          vendor_id: vendorId,
          sub_total: parseFloat(data.sub_total) || 0,
          tax_amount: parseFloat(data.tax_amount) || 0,
          total: parseFloat(data.total) || 0,
          balance_due: parseFloat(data.balance_due) || parseFloat(data.total) || 0,
          status: data.status || 'draft',
          notes: data.notes || '',
          reference_number: data.reference_number || '',
        };

        const [bill] = await trx('bills').insert(billData).returning('*');

        if (group.lineItems.length > 0) {
          const items = group.lineItems.map((li) => ({
            bill_id: bill.id,
            item_name: li.item_name,
            description: li.description,
            quantity: li.quantity,
            rate: li.rate,
            amount: li.amount || li.quantity * li.rate,
          }));
          await trx('bill_items').insert(items);
        }

        imported++;
      } catch (err) {
        errorDetails.push(`Bill ${billNum}: ${err.message}`);
      }
    }
  });

  return { imported, skipped };
}

// ---------------------------------------------------------------------------
// Expense import
// ---------------------------------------------------------------------------
async function importExpenses(rows, mapRow, errorDetails) {
  let imported = 0;
  let skipped = 0;

  await db.transaction(async (trx) => {
    for (let i = 0; i < rows.length; i++) {
      try {
        const data = mapRow(rows[i]);
        if (!data.amount) {
          errorDetails.push(`Row ${i + 2}: Missing amount, skipped`);
          skipped++;
          continue;
        }

        // Resolve vendor_id from vendor_name if present
        let vendorId = null;
        if (data.vendor_name) {
          const vendor = await trx('vendors').where('display_name', data.vendor_name).first();
          if (vendor) vendorId = vendor.id;
        }

        const expenseData = {
          expense_date: parseDate(data.expense_date) || new Date(),
          category: data.category || 'Uncategorized',
          amount: parseFloat(data.amount) || 0,
          tax_amount: parseFloat(data.tax_amount) || 0,
          vendor_id: vendorId,
          description: data.description || '',
          reference_number: data.reference_number || '',
          paid_through: data.paid_through || '',
        };

        await trx('expenses').insert(expenseData);
        imported++;
      } catch (err) {
        errorDetails.push(`Row ${i + 2}: ${err.message}`);
      }
    }
  });

  return { imported, skipped };
}

// ---------------------------------------------------------------------------
// GET /templates — Template CSV headers for each category
// ---------------------------------------------------------------------------
const TEMPLATES = {
  customers: [
    'Customer Name', 'Company Name', 'Email', 'Phone', 'Mobile',
    'Billing Address', 'Billing Address Line 2', 'Billing City',
    'Billing State', 'Billing Country', 'Billing Zip',
    'Shipping Address', 'Shipping City', 'Shipping State',
    'Shipping Country', 'Shipping Zip',
    'GSTIN', 'PAN', 'Payment Terms', 'Notes',
  ],
  vendors: [
    'Vendor Name', 'Company Name', 'Email', 'Phone', 'Mobile',
    'Billing Address', 'Billing Address Line 2', 'Billing City',
    'Billing State', 'Billing Country', 'Billing Zip',
    'GSTIN', 'PAN', 'Payment Terms', 'Notes',
  ],
  items: [
    'Item Name', 'SKU', 'Description', 'Rate', 'Purchase Rate',
    'Unit', 'HSN/SAC', 'Tax', 'Type',
  ],
  invoices: [
    'Invoice Number', 'Invoice Date', 'Due Date', 'Customer Name',
    'Item Name', 'Item Description', 'Quantity', 'Rate', 'Amount',
    'Sub Total', 'Tax Amount', 'Discount', 'Total', 'Balance Due',
    'Status', 'Notes', 'Terms',
  ],
  bills: [
    'Bill Number', 'Bill Date', 'Due Date', 'Vendor Name',
    'Item Name', 'Item Description', 'Quantity', 'Rate', 'Amount',
    'Sub Total', 'Tax Amount', 'Total', 'Balance Due',
    'Status', 'Reference Number', 'Notes',
  ],
  expenses: [
    'Date', 'Category', 'Amount', 'Tax Amount', 'Vendor Name',
    'Paid Through', 'Description', 'Reference',
  ],
};

router.get('/templates', (req, res) => {
  const { category, download } = req.query;

  // If a specific category is requested with download=true, send CSV file
  if (category && download === 'true') {
    const key = category.toLowerCase();
    const headers = TEMPLATES[key];
    if (!headers) {
      return res.status(400).json({ success: false, error: `Unknown category: ${category}` });
    }
    const csvContent = headers.join(',') + '\n';
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${key}_template.csv"`);
    return res.send(csvContent);
  }

  // Otherwise return all template definitions
  const templates = Object.entries(TEMPLATES).map(([key, headers]) => ({
    category: key,
    headers,
    downloadUrl: `/api/zoho-migration/templates?category=${key}&download=true`,
  }));

  res.json({ success: true, templates });
});

module.exports = router;
