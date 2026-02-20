/**
 * Statement Parser Service
 * Ported from: NavoditaERP/BankingViews/StatementParser.swift + BankingManager.swift
 *
 * Parses CSV, Excel, HTML, and SWIFT MT940/MT950 bank statement files from Indian banks.
 * Supports: ICICI, HDFC, SBI, Kotak, Axis, MT940, and generic auto-detect.
 * Returns normalized transaction arrays.
 */

const Papa = require('papaparse');
const XLSX = require('xlsx');

// pdfjs-dist is an ES Module, so we need to import it dynamically
let pdfjsLib = null;

// ============================================================================
// Bank Format Definitions
// ============================================================================

const BANK_FORMATS = {
  ICICI: {
    label: 'ICICI Bank',
    dateColumns: ['Date', 'Transaction Date', 'Txn Date', 'Txn Posted Date', 'Value Date'],
    descriptionColumns: ['Description', 'Transaction Remarks', 'Remarks'],
    withdrawalColumns: ['Withdrawal Amt.', 'Withdrawal Amt (INR)', 'Withdrawal Amount (INR)', 'Withdrawal Amount (INR )', 'Withdrawals', 'Debits', 'Debit'],
    depositColumns: ['Deposit Amt.', 'Deposit Amt (INR)', 'Deposit Amount (INR)', 'Deposit Amount (INR )', 'Deposits', 'Credits', 'Credit'],
    balanceColumns: ['Balance', 'Balance (INR)', 'Balance (INR )', 'Available Balance', 'Available Balance(INR)', 'Closing Balance'],
    referenceColumns: ['Chq / Ref No.', 'Chq/Ref No', 'Cheque No.', 'ChequeNo.', 'Cheque no / Ref No', 'Reference No', 'Ref No./Cheque No.'],
    valueDateColumns: ['Value Date', 'Value Dt'],
    amountColumns: ['Transaction Amount(INR)', 'Transaction Amount'],
    drCrColumns: ['Cr/Dr', 'Dr/Cr', 'CR/DR'],
  },
  HDFC: {
    label: 'HDFC Bank',
    dateColumns: ['Date', 'Transaction Date'],
    descriptionColumns: ['Narration', 'Description', 'Particulars'],
    withdrawalColumns: ['Withdrawal Amt.', 'Withdrawal Amount', 'Debit'],
    depositColumns: ['Deposit Amt.', 'Deposit Amount', 'Credit'],
    balanceColumns: ['Closing Balance', 'Balance'],
    referenceColumns: ['Chq./Ref.No.', 'Chq/Ref No.', 'Ref No'],
    valueDateColumns: ['Value Dt', 'Value Date'],
  },
  SBI: {
    label: 'State Bank of India',
    dateColumns: ['Txn Date', 'Transaction Date', 'Date'],
    descriptionColumns: ['Description', 'Particulars', 'Narration'],
    withdrawalColumns: ['Debit', 'Withdrawal', 'Dr'],
    depositColumns: ['Credit', 'Deposit', 'Cr'],
    balanceColumns: ['Balance', 'Running Balance'],
    referenceColumns: ['Ref No./Cheque No.', 'Ref No', 'Reference'],
    valueDateColumns: ['Value Date'],
  },
  KOTAK: {
    label: 'Kotak Mahindra Bank',
    dateColumns: ['Transaction Date', 'Date'],
    descriptionColumns: ['Description', 'Narration'],
    // Kotak uses Amount + Dr/Cr columns instead of separate debit/credit
    amountColumns: ['Amount'],
    drCrColumns: ['Dr / Cr', 'Dr/Cr', 'Cr/Dr'],
    withdrawalColumns: ['Debit', 'Withdrawal'],
    depositColumns: ['Credit', 'Deposit'],
    balanceColumns: ['Balance'],
    referenceColumns: ['Chq / Ref No.', 'Chq/Ref No.', 'Chq/Ref No'],
  },
  AXIS: {
    label: 'Axis Bank',
    dateColumns: ['Tran Date', 'Transaction Date', 'Date'],
    descriptionColumns: ['PARTICULARS', 'Description', 'Narration'],
    withdrawalColumns: ['DR', 'Debit', 'Withdrawal'],
    depositColumns: ['CR', 'Credit', 'Deposit'],
    balanceColumns: ['BAL', 'Balance', 'Running Balance'],
    referenceColumns: ['CHQNO', 'Chq No', 'Reference'],
  },
  MT940: {
    label: 'SWIFT MT940/MT950',
  },
};

// ============================================================================
// Date Parsing (Indian formats)
// ============================================================================

/**
 * Parse an Indian-style date string into a JS Date object.
 * Supports: DD/MM/YYYY, DD-MM-YYYY, DD MMM YYYY, DD-MMM-YYYY, YYYY-MM-DD, DD.MM.YYYY, etc.
 *
 * @param {string} dateStr - raw date string
 * @returns {Date|null}
 */
function parseIndianDate(dateStr) {
  if (!dateStr) return null;

  let trimmed = dateStr.trim();

  // Strip time component if present (e.g., "02/01/2026 16:38:07 PM")
  const spaceIdx = trimmed.indexOf(' ');
  if (spaceIdx > 0) {
    const afterSpace = trimmed.substring(spaceIdx + 1);
    if (/\d{1,2}:\d{2}/.test(afterSpace)) {
      trimmed = trimmed.substring(0, spaceIdx);
    }
  }

  const monthNames = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
    january: 0, february: 1, march: 2, april: 3, june: 5,
    july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
  };

  // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  let m = trimmed.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (m) {
    const day = parseInt(m[1], 10);
    const month = parseInt(m[2], 10) - 1;
    const year = parseInt(m[3], 10);
    if (day >= 1 && day <= 31 && month >= 0 && month <= 11) {
      return new Date(year, month, day);
    }
  }

  // DD/MM/YY or DD-MM-YY
  m = trimmed.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2})$/);
  if (m) {
    const day = parseInt(m[1], 10);
    const month = parseInt(m[2], 10) - 1;
    let year = parseInt(m[3], 10);
    year += year < 50 ? 2000 : 1900;
    if (day >= 1 && day <= 31 && month >= 0 && month <= 11) {
      return new Date(year, month, day);
    }
  }

  // YYYY-MM-DD or YYYY/MM/DD
  m = trimmed.match(/^(\d{4})[/\-](\d{1,2})[/\-](\d{1,2})$/);
  if (m) {
    return new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
  }

  // DD MMM YYYY or DD-MMM-YYYY or DD/MMM/YYYY
  m = trimmed.match(/^(\d{1,2})[\s/\-]([A-Za-z]+)[\s/\-](\d{2,4})$/);
  if (m) {
    const day = parseInt(m[1], 10);
    const monthKey = m[2].toLowerCase();
    let year = parseInt(m[3], 10);
    if (year < 100) year += year < 50 ? 2000 : 1900;
    if (monthNames[monthKey] !== undefined) {
      return new Date(year, monthNames[monthKey], day);
    }
  }

  // MMM DD, YYYY (US style)
  m = trimmed.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
  if (m) {
    const monthKey = m[1].toLowerCase();
    const day = parseInt(m[2], 10);
    const year = parseInt(m[3], 10);
    if (monthNames[monthKey] !== undefined) {
      return new Date(year, monthNames[monthKey], day);
    }
  }

  return null;
}

/**
 * Format a Date object to YYYY-MM-DD string for database storage.
 * @param {Date} date
 * @returns {string}
 */
function formatDateForDB(date) {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ============================================================================
// Amount Parsing
// ============================================================================

/**
 * Parse an amount string, handling Indian number formats (1,23,456.78), currency symbols, etc.
 * @param {string|number} value
 * @returns {number}
 */
function parseAmount(value) {
  if (value == null) return 0;
  if (typeof value === 'number') return isNaN(value) ? 0 : value;

  const cleaned = String(value)
    .replace(/[₹$€£¥]/g, '')
    .replace(/,/g, '')
    .replace(/\s/g, '')
    .trim();

  if (!cleaned || cleaned === '-' || cleaned === '--') return 0;

  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : Math.abs(parsed);
}

/**
 * Parse a balance amount string, preserving negative sign (for overdraft balances).
 * @param {string|number} value
 * @returns {number}
 */
function parseBalanceAmount(value) {
  if (value == null) return 0;
  if (typeof value === 'number') return isNaN(value) ? 0 : value;

  const cleaned = String(value)
    .replace(/[₹$€£¥]/g, '')
    .replace(/,/g, '')
    .replace(/\s/g, '')
    .trim();

  if (!cleaned || cleaned === '-' || cleaned === '--') return 0;

  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed; // preserve sign for negative balances
}

// ============================================================================
// CSV Parsing
// ============================================================================

/**
 * Parse CSV content using PapaParse with auto-detect delimiters.
 * Handles bank CSVs with metadata rows before the actual header.
 *
 * @param {string} content - raw CSV text
 * @returns {{ headers: string[], rows: object[] }}
 */
function parseCSVContent(content) {
  // First pass: parse all rows to find the header row
  const allRows = Papa.parse(content, {
    skipEmptyLines: 'greedy',
    encoding: 'utf-8',
  });

  if (!allRows.data || allRows.data.length === 0) {
    return { headers: [], rows: [] };
  }

  // Find the header row - many Indian bank CSVs have metadata lines before the actual headers
  const headerKeywords = [
    'date', 'transaction date', 'txn date', 'value date', 'posted date', 'tran date',
    'description', 'narration', 'particulars', 'remark',
    'amount', 'transaction amount', 'balance', 'available balance',
    'debit', 'credit', 'withdrawal', 'deposit',
    'sl.', 'sr.', 'sl no',
    'cr/dr', 'dr/cr',
    'cheque', 'chq', 'ref no', 'reference',
  ];

  let headerRowIndex = 0;
  let maxMatchCount = 0;

  for (let i = 0; i < Math.min(allRows.data.length, 20); i++) {
    const row = allRows.data[i];
    if (!Array.isArray(row)) continue;

    const lineLower = row.map((cell) => String(cell || '').toLowerCase().trim());
    const matchCount = headerKeywords.filter((kw) =>
      lineLower.some((cell) => cell.includes(kw))
    ).length;

    if (matchCount > maxMatchCount) {
      maxMatchCount = matchCount;
      headerRowIndex = i;
    }
  }

  // Need at least 2 header keyword matches
  if (maxMatchCount < 2) {
    headerRowIndex = 0;
  }

  // Extract headers
  const headers = allRows.data[headerRowIndex].map((h) => {
    let clean = String(h || '').trim();
    // Strip BOM
    if (clean.charCodeAt(0) === 0xfeff) clean = clean.substring(1);
    return clean;
  });

  // Deduplicate headers (Kotak has duplicate "Dr / Cr" columns)
  const headerCounts = {};
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i];
    const count = headerCounts[h] || 0;
    if (count > 0) {
      headers[i] = `${h}_${count + 1}`;
    }
    headerCounts[h] = count + 1;
  }

  // Parse data rows (after header)
  const rows = [];
  for (let i = headerRowIndex + 1; i < allRows.data.length; i++) {
    const dataRow = allRows.data[i];
    if (!Array.isArray(dataRow)) continue;

    // Skip empty rows
    const nonEmpty = dataRow.filter((cell) => String(cell || '').trim() !== '');
    if (nonEmpty.length === 0) continue;

    const rowObj = {};
    for (let j = 0; j < headers.length; j++) {
      rowObj[headers[j]] = j < dataRow.length ? String(dataRow[j] || '').trim() : '';
    }
    rows.push(rowObj);
  }

  return { headers, rows };
}

// ============================================================================
// Excel Parsing
// ============================================================================

/**
 * Parse Excel (.xlsx / .xls) file buffer.
 * @param {Buffer} buffer
 * @returns {{ headers: string[], rows: object[] }}
 */
function parseExcelContent(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });

  // Use the first sheet
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return { headers: [], rows: [] };

  const sheet = workbook.Sheets[sheetName];
  const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });

  if (!rawData || rawData.length === 0) return { headers: [], rows: [] };

  // Find header row using same logic as CSV
  const headerKeywords = [
    'date', 'transaction date', 'txn date', 'value date',
    'description', 'narration', 'particulars',
    'amount', 'balance', 'debit', 'credit', 'withdrawal', 'deposit',
    'dr/cr', 'cr/dr', 'cheque', 'chq', 'ref',
  ];

  let headerRowIndex = 0;
  let maxMatchCount = 0;

  for (let i = 0; i < Math.min(rawData.length, 20); i++) {
    const row = rawData[i];
    if (!Array.isArray(row)) continue;

    const lineLower = row.map((cell) => String(cell || '').toLowerCase().trim());
    const matchCount = headerKeywords.filter((kw) =>
      lineLower.some((cell) => cell.includes(kw))
    ).length;

    if (matchCount > maxMatchCount) {
      maxMatchCount = matchCount;
      headerRowIndex = i;
    }
  }

  if (maxMatchCount < 2) headerRowIndex = 0;

  const headers = rawData[headerRowIndex].map((h) => String(h || '').trim());

  // Deduplicate
  const headerCounts = {};
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i];
    const count = headerCounts[h] || 0;
    if (count > 0) headers[i] = `${h}_${count + 1}`;
    headerCounts[h] = count + 1;
  }

  const rows = [];
  for (let i = headerRowIndex + 1; i < rawData.length; i++) {
    const dataRow = rawData[i];
    if (!Array.isArray(dataRow)) continue;

    const nonEmpty = dataRow.filter((cell) => String(cell || '').trim() !== '');
    if (nonEmpty.length === 0) continue;

    const rowObj = {};
    for (let j = 0; j < headers.length; j++) {
      let cellValue = j < dataRow.length ? dataRow[j] : '';
      // Handle Date objects from Excel
      if (cellValue instanceof Date) {
        cellValue = formatDateForDB(cellValue) || '';
      }
      rowObj[headers[j]] = String(cellValue || '').trim();
    }
    rows.push(rowObj);
  }

  return { headers, rows };
}

// ============================================================================
// HTML Parsing (ICICI Detailed Statement)
// ============================================================================

/**
 * Parse HTML bank statement content (e.g., ICICI "Detailed Statement" export).
 * Extracts tabular data from HTML using regex to find <td> cells in <tr> rows.
 * Identifies the header row by matching bank-statement keywords, then extracts
 * subsequent data rows.
 *
 * @param {string} content - raw HTML text
 * @returns {{ headers: string[], rows: object[] }}
 */
function parseHTMLContent(content) {
  // Extract all <tr> elements
  const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
  const tagRegex = /<[^>]+>/g;

  const allTableRows = [];
  let trMatch;
  while ((trMatch = trRegex.exec(content)) !== null) {
    const trContent = trMatch[1];
    const cells = [];
    let tdMatch;
    // Reset lastIndex for tdRegex reuse
    tdRegex.lastIndex = 0;
    while ((tdMatch = tdRegex.exec(trContent)) !== null) {
      // Strip HTML tags, decode entities, and clean whitespace
      let cellText = tdMatch[1]
        .replace(/<br\s*\/?>/gi, ' ')
        .replace(tagRegex, '')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
        .replace(/\s+/g, ' ')
        .trim();
      cells.push(cellText);
    }
    if (cells.length > 0) {
      allTableRows.push(cells);
    }
  }

  if (allTableRows.length === 0) {
    return { headers: [], rows: [] };
  }

  // Find the header row using bank-statement keywords
  const headerKeywords = [
    'date', 'transaction date', 'txn date', 'value date', 'posted date', 'tran date',
    'description', 'narration', 'particulars', 'remark', 'transaction remarks',
    'amount', 'transaction amount', 'balance', 'withdrawal', 'deposit',
    'debit', 'credit', 's no', 'tran id', 'cheque', 'ref no',
  ];

  let headerRowIndex = -1;
  let maxMatchCount = 0;

  for (let i = 0; i < allTableRows.length; i++) {
    const row = allTableRows[i];
    // Only consider rows with enough cells to be a header (at least 5 columns)
    if (row.length < 5) continue;

    const lineLower = row.map((cell) => cell.toLowerCase().trim());
    const matchCount = headerKeywords.filter((kw) =>
      lineLower.some((cell) => cell.includes(kw))
    ).length;

    if (matchCount > maxMatchCount) {
      maxMatchCount = matchCount;
      headerRowIndex = i;
    }
  }

  if (headerRowIndex < 0 || maxMatchCount < 2) {
    return { headers: [], rows: [] };
  }

  // Extract headers, cleaning up multi-line content like "Withdrawal \nAmount (INR )"
  const headers = allTableRows[headerRowIndex].map((h) => h.replace(/\s+/g, ' ').trim());

  // Deduplicate headers
  const headerCounts = {};
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i];
    const count = headerCounts[h] || 0;
    if (count > 0) headers[i] = `${h}_${count + 1}`;
    headerCounts[h] = count + 1;
  }

  // Extract data rows (rows after the header with same column count)
  const rows = [];
  for (let i = headerRowIndex + 1; i < allTableRows.length; i++) {
    const dataRow = allTableRows[i];
    // Data rows should have the same number of cells as the header
    if (dataRow.length !== headers.length) continue;

    // Skip empty rows
    const nonEmpty = dataRow.filter((cell) => cell.trim() !== '');
    if (nonEmpty.length === 0) continue;

    // Skip rows that look like totals/summaries (contain "Total", "Opening Bal", etc.)
    const rowText = dataRow.join(' ').toLowerCase();
    if (rowText.includes('page total') || rowText.includes('opening bal') ||
        rowText.includes('closing bal') || rowText.includes('grand total')) {
      continue;
    }

    const rowObj = {};
    for (let j = 0; j < headers.length; j++) {
      rowObj[headers[j]] = j < dataRow.length ? dataRow[j].trim() : '';
    }
    rows.push(rowObj);
  }

  return { headers, rows };
}

// ============================================================================
// PDF Parsing (Kotak Mahindra Bank)
// ============================================================================

/**
 * Parse PDF bank statement content using pdfjs-dist.
 * Extracts text from each page and parses transaction rows using regex patterns.
 * Designed for Kotak Mahindra Bank PDF statements.
 *
 * @param {Buffer} fileBuffer - PDF file buffer
 * @returns {Promise<{ headers: string[], rows: object[] }>}
 */
async function parsePDFContent(fileBuffer) {
  try {
    // Dynamically import pdfjs-dist (ES Module)
    if (!pdfjsLib) {
      pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
    }

    // Convert Buffer to Uint8Array for pdfjs-dist
    const uint8Array = new Uint8Array(fileBuffer);

    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
    const pdfDocument = await loadingTask.promise;

    const allLines = [];

    // Extract text from all pages
    for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum);
      const textContent = await page.getTextContent();

      // Group text items by y-coordinate (row) to form lines
      const lineMap = new Map();

      for (const item of textContent.items) {
        if (!item.str || item.str.trim() === '') continue;

        const y = Math.round(item.transform[5]); // y-coordinate
        if (!lineMap.has(y)) {
          lineMap.set(y, []);
        }
        lineMap.get(y).push({
          x: item.transform[4],
          text: item.str,
        });
      }

      // Sort items within each line by x-coordinate and join into text
      const sortedYCoords = Array.from(lineMap.keys()).sort((a, b) => b - a); // top to bottom
      for (const y of sortedYCoords) {
        const items = lineMap.get(y).sort((a, b) => a.x - b.x);
        const lineText = items.map(i => i.text).join(' ').trim();
        if (lineText) {
          allLines.push(lineText);
        }
      }
    }

    // Now parse the lines to extract transactions
    const headers = ['Date', 'Description', 'Chq/Ref. No.', 'Withdrawal (Dr.)', 'Deposit (Cr.)', 'Balance'];
    const rows = [];

    // Transaction line pattern (matches Kotak format):
    // Starts with: number   DD MMM YYYY   description...   amounts...
    // Date format: 01 Aug 2025, 05 Aug 2025, etc.
    const transactionPattern = /^(\d+)\s+(\d{1,2}\s+[A-Za-z]{3}\s+\d{4})\s+(.+)$/;

    for (let i = 0; i < allLines.length; i++) {
      const line = allLines[i];

      // Skip headers, page numbers, account statements, etc.
      if (
        line.includes('Account Statement') ||
        line.includes('NAVODITA APPAREL') ||
        line.includes('Opening Balance') ||
        line.includes('Closing Balance') ||
        line.includes('Total Debits') ||
        line.includes('Total Credits') ||
        line.includes('Chq/Ref. No.') ||
        line.includes('Withdrawal (Dr.)') ||
        line.match(/^Page\s+\d+/) ||
        line.match(/^\d+\s*$/) || // standalone page numbers
        line.trim() === '#' ||
        line.trim() === 'Date' ||
        line.trim() === 'Description' ||
        line.trim() === 'Balance' ||
        line.trim() === '-'
      ) {
        continue;
      }

      const match = line.match(transactionPattern);
      if (!match) continue;

      const serialNum = match[1];
      const dateStr = match[2];
      const restOfLine = match[3];

      // Now parse the rest: description, reference, withdrawal, deposit, balance
      // Kotak format: Description | Ref | Withdrawal (Dr.) | Deposit (Cr.) | Balance
      // Amounts are in Indian format: 1,42,748.19

      // Split the line into tokens
      const tokens = restOfLine.split(/\s+/).filter(t => t.trim() !== '');

      // Find all tokens that look like amounts (format: 1,234.56 or -1,234.56 or 1234.56)
      const amountTokens = [];
      const amountPattern = /^-?[\d,]+\.\d{2}$/;

      tokens.forEach((token, idx) => {
        if (amountPattern.test(token)) {
          amountTokens.push({ token, idx });
        }
      });

      if (amountTokens.length === 0) continue; // No amounts found, skip

      // The last amount is always the balance
      const balanceToken = amountTokens[amountTokens.length - 1];
      const balance = balanceToken.token;

      let withdrawal = null;
      let deposit = null;

      // Determine withdrawal and deposit based on number of amounts
      // Kotak format: Withdrawal (Dr.) column comes BEFORE Deposit (Cr.) column
      // So if there's only one amount before balance, it's in the withdrawal column position
      // BUT we need to check the actual description to determine the type

      if (amountTokens.length === 1) {
        // Only balance, skip this row (likely opening/closing balance summary)
        continue;
      } else if (amountTokens.length === 2) {
        // One transaction amount + balance
        // The amount is either withdrawal OR deposit (not both)
        const txnAmountToken = amountTokens[0];

        // Check description keywords to determine type
        const descLower = restOfLine.toLowerCase();

        // Withdrawal indicators: sent, payment made, debit, withdrawal, transfer to, upi to
        // Deposit indicators: received, recd, credited, imps, neft received
        if (
          descLower.includes('sent') ||
          descLower.includes('debit') ||
          descLower.includes('withdrawal') ||
          descLower.includes('payment to') ||
          descLower.includes('transfer to') ||
          (descLower.includes('upi/') && !descLower.includes('recd'))
        ) {
          withdrawal = txnAmountToken.token;
        } else if (
          descLower.includes('recd') ||
          descLower.includes('received') ||
          descLower.includes('credited') ||
          descLower.includes('credit') ||
          descLower.includes('deposit')
        ) {
          deposit = txnAmountToken.token;
        } else {
          // Default: check if description suggests incoming or outgoing
          // UPI payments are usually outgoing unless specified
          // NEFT/RTGS/IMPS without "recd" are usually outgoing
          // For ambiguous cases, use withdrawal as default for sent/payment keywords
          if (descLower.includes('upi/') || descLower.includes('payment')) {
            withdrawal = txnAmountToken.token;
          } else {
            deposit = txnAmountToken.token;
          }
        }
      } else if (amountTokens.length === 3) {
        // Two transaction amounts + balance: withdrawal and deposit
        withdrawal = amountTokens[0].token;
        deposit = amountTokens[1].token;
      } else if (amountTokens.length >= 4) {
        // More than 3 amounts - unusual, but handle it
        // Last is balance, second-to-last is deposit, third-to-last is withdrawal
        withdrawal = amountTokens[amountTokens.length - 3].token;
        deposit = amountTokens[amountTokens.length - 2].token;
      }

      // Extract description and reference
      // Description is everything between date and the first amount
      // Reference is usually numeric or alphanumeric token before the amounts

      // Find the position of the first amount in the line
      const firstAmountToken = amountTokens[0];
      const firstAmountIdx = tokens.indexOf(firstAmountToken.token);

      if (firstAmountIdx < 0) continue; // Safety check

      // Everything before the first amount is description + reference
      const beforeAmount = tokens.slice(0, firstAmountIdx);
      let description = '';
      let reference = '';

      if (beforeAmount.length > 0) {
        // Last token before amount might be reference if it's numeric or short alphanumeric
        const lastToken = beforeAmount[beforeAmount.length - 1];
        if (lastToken && (lastToken.length <= 20 && /^[A-Z0-9\-\/]+$/i.test(lastToken))) {
          reference = lastToken;
          description = beforeAmount.slice(0, -1).join(' ');
        } else {
          description = beforeAmount.join(' ');
        }
      }

      // Build row object
      rows.push({
        'Date': dateStr,
        'Description': description || '',
        'Chq/Ref. No.': reference || '',
        'Withdrawal (Dr.)': withdrawal || '',
        'Deposit (Cr.)': deposit || '',
        'Balance': balance,
      });
    }

    return { headers, rows };
  } catch (err) {
    throw new Error(`PDF parsing error: ${err.message}`);
  }
}

// ============================================================================
// SWIFT MT940/MT950 Parsing
// ============================================================================

/**
 * Detect whether text content is in SWIFT MT940/MT950 format.
 * Checks for characteristic markers like {1:F01 or :20: tag.
 *
 * @param {string} content - raw text content
 * @returns {boolean}
 */
function isMT940Format(content) {
  // Check for SWIFT message envelope or MT940/MT950 tags
  return /\{1:F01/.test(content) || /^:20:/m.test(content) || /\n:20:/m.test(content);
}

/**
 * Parse SWIFT MT940 or MT950 bank statement content.
 *
 * MT940 format key tags:
 *   :20: - Statement reference
 *   :25: - Account number
 *   :28C: - Statement number
 *   :60F: - Opening balance (C/D, date YYMMDD, currency, amount with comma decimal)
 *   :61: - Transaction line (date YYMMDDMMDD, C/D, amount, type, reference)
 *   :86: - Transaction description (only in MT940, absent in MT950)
 *   :62F: - Closing balance
 *
 * :61 line format: YYMMDDDMMDD[C|D|RC|RD]amount,decNMSCreference
 *   - First 6 digits: entry date YYMMDD
 *   - Next 4 digits: value date MMDD
 *   - C = credit, D = debit, RC = reversal credit, RD = reversal debit
 *   - Amount uses comma as decimal separator
 *   - NMSC = transaction type code
 *   - Followed by reference string
 *
 * @param {string} content - raw MT940/MT950 text
 * @returns {{ transactions: object[], detectedFormat: string, accountNumber: string|null, errors: string[] }}
 */
function parseMT940Content(content) {
  const errors = [];
  const transactions = [];
  let accountNumber = null;

  // Determine if this is MT940 or MT950 from the message type header
  const isMT950 = /\{2:I950/.test(content) || /\{2:O950/.test(content);
  const detectedFormat = 'MT940';

  // Extract account number from :25: tag
  const acctMatch = content.match(/:25:([^\r\n]+)/);
  if (acctMatch) {
    accountNumber = acctMatch[1].trim();
  }

  // Extract opening balance from :60F: for year context
  // Format: C/D + YYMMDD + CURRENCY + amount,dec
  let openingYear = 2026; // fallback
  const openBalMatch = content.match(/:60F:([CD])(\d{6})([A-Z]{3})([\d,]+)/);
  if (openBalMatch) {
    const yyOpen = parseInt(openBalMatch[2].substring(0, 2), 10);
    openingYear = yyOpen < 50 ? 2000 + yyOpen : 1900 + yyOpen;
  }

  // Split content into lines for processing
  const lines = content.split(/\r?\n/);

  let currentTransaction = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Parse :61: transaction lines
    if (line.startsWith(':61:')) {
      // Save any pending transaction before starting new one
      if (currentTransaction) {
        transactions.push(currentTransaction);
      }

      const txnData = line.substring(4); // Remove ':61:' prefix

      // Parse the :61: line format
      // YYMMDDDMMDD[C|D|RC|RD]amount,decNMSCreference
      // Entry date: first 6 chars (YYMMDD)
      // Value date: next 4 chars (MMDD) - uses year from entry date
      // Direction: C, D, RC, or RD
      // Amount: digits and comma until NMSC or other type code

      const txnMatch = txnData.match(
        /^(\d{6})(\d{4})(R?[CD])([\d,]+)([A-Z]{4})(.*)?$/
      );

      if (!txnMatch) {
        errors.push(`Invalid :61: line format: ${line}`);
        currentTransaction = null;
        continue;
      }

      const entryDateStr = txnMatch[1]; // YYMMDD
      const valueDateStr = txnMatch[2]; // MMDD
      const direction = txnMatch[3];    // C, D, RC, RD
      const amountStr = txnMatch[4];    // digits with comma decimal
      // const typeCode = txnMatch[5];  // e.g., NMSC
      const reference = (txnMatch[6] || '').trim();

      // Parse entry date
      const yy = parseInt(entryDateStr.substring(0, 2), 10);
      const mm = parseInt(entryDateStr.substring(2, 4), 10);
      const dd = parseInt(entryDateStr.substring(4, 6), 10);
      const year = yy < 50 ? 2000 + yy : 1900 + yy;

      const entryDate = new Date(year, mm - 1, dd);
      const transactionDate = formatDateForDB(entryDate);

      // Parse value date (MMDD) - use same year as entry date
      const valMM = parseInt(valueDateStr.substring(0, 2), 10);
      const valDD = parseInt(valueDateStr.substring(2, 4), 10);
      // Handle year rollover: if value month is December but entry is January
      let valYear = year;
      if (valMM === 12 && mm === 1) {
        valYear = year - 1;
      }
      const valueDate = formatDateForDB(new Date(valYear, valMM - 1, valDD));

      // Parse amount (comma as decimal separator)
      const amount = parseFloat(amountStr.replace(',', '.'));
      if (isNaN(amount) || amount === 0) {
        currentTransaction = null;
        continue;
      }

      // Determine deposit/withdrawal
      // C = credit (deposit), D = debit (withdrawal)
      // RC = reversal of credit (treat as withdrawal), RD = reversal of debit (treat as deposit)
      let deposit = 0;
      let withdrawal = 0;

      if (direction === 'C' || direction === 'RD') {
        deposit = amount;
      } else {
        withdrawal = amount;
      }

      // Clean up reference (remove NOREF or empty)
      let cleanRef = reference;
      if (cleanRef === 'NOREF' || cleanRef === '') {
        cleanRef = null;
      }

      currentTransaction = {
        transaction_date: transactionDate,
        value_date: valueDate || transactionDate,
        description: '', // Will be populated from :86: line if present (MT940)
        reference_number: cleanRef,
        deposit_amount: parseFloat(deposit.toFixed(2)),
        withdrawal_amount: parseFloat(withdrawal.toFixed(2)),
        balance: null, // MT940 doesn't have per-transaction balance
        category: null, // Will be set after description is known
      };

      continue;
    }

    // Parse :86: description lines (only in MT940, not MT950)
    if (line.startsWith(':86:') && currentTransaction) {
      const desc = line.substring(4).trim();
      currentTransaction.description = desc;
      currentTransaction.category = categorizeTransaction(
        desc, currentTransaction.deposit_amount, currentTransaction.withdrawal_amount
      );
      continue;
    }
  }

  // Don't forget the last transaction
  if (currentTransaction) {
    // If no :86: was found (MT950), try to categorize from reference
    if (!currentTransaction.category && currentTransaction.reference_number) {
      currentTransaction.category = categorizeTransaction(
        currentTransaction.reference_number,
        currentTransaction.deposit_amount,
        currentTransaction.withdrawal_amount
      );
    }
    transactions.push(currentTransaction);
  }

  return {
    transactions,
    detectedFormat,
    accountNumber,
    errors,
  };
}

// ============================================================================
// Column Mapping & Normalization
// ============================================================================

/**
 * Normalize a header key for comparison (strip spaces, special chars, lowercase).
 * @param {string} key
 * @returns {string}
 */
function normalizeKey(key) {
  return (key || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Find matching column from headers given a list of candidate column names.
 * @param {string[]} headers - actual file headers
 * @param {string[]} candidates - possible names for this column
 * @returns {string|null} - the matching header name, or null
 */
function findColumn(headers, candidates) {
  if (!candidates || !headers) return null;

  // First, try exact match (case-insensitive, trimmed)
  for (const candidate of candidates) {
    const found = headers.find(
      (h) => h.toLowerCase().trim() === candidate.toLowerCase().trim()
    );
    if (found) return found;
  }

  // Then try normalized match
  for (const candidate of candidates) {
    const normCandidate = normalizeKey(candidate);
    const found = headers.find((h) => normalizeKey(h) === normCandidate);
    if (found) return found;
  }

  // Then try "contains" match
  for (const candidate of candidates) {
    const normCandidate = normalizeKey(candidate);
    const found = headers.find((h) => normalizeKey(h).includes(normCandidate));
    if (found) return found;
  }

  return null;
}

/**
 * Auto-detect bank format from headers.
 * @param {string[]} headers
 * @returns {string} - one of the BANK_FORMATS keys or 'AUTO'
 */
function detectBankFormat(headers) {
  const normalized = headers.map((h) => normalizeKey(h));

  // ICICI: has "Withdrawals" or "Transaction Remarks" or "Transaction Amount(INR)" or "Txn Posted Date"
  if (
    normalized.some((h) => h.includes('withdrawals') || h.includes('transactionremarks') ||
      h.includes('transactionamountinr') || h.includes('txnposteddate'))
  ) {
    return 'ICICI';
  }

  // Kotak: has "Dr / Cr" and "Amount" or "Narration" with "Sl. No."
  if (
    normalized.some((h) => h.includes('drcr') || h.includes('drCr')) &&
    (normalized.some((h) => h.includes('narration')) ||
      normalized.some((h) => h.includes('slno')))
  ) {
    return 'KOTAK';
  }

  // HDFC: has "Narration" + "Chq./Ref.No."
  if (
    normalized.some((h) => h.includes('narration')) &&
    normalized.some((h) => h.includes('chq') || h.includes('refno'))
  ) {
    return 'HDFC';
  }

  // SBI: "Txn Date" + "Value Date"
  if (
    normalized.some((h) => h.includes('txndate')) &&
    normalized.some((h) => h.includes('valuedate'))
  ) {
    return 'SBI';
  }

  // Axis: "PARTICULARS" + "CHQNO"
  if (
    normalized.some((h) => h.includes('particulars')) &&
    normalized.some((h) => h.includes('chqno'))
  ) {
    return 'AXIS';
  }

  return 'AUTO';
}

/**
 * Build column mapping for the given bank format and headers.
 * @param {string[]} headers - actual file headers
 * @param {string} bankFormat - bank format key
 * @returns {object} mapping
 */
function buildColumnMapping(headers, bankFormat) {
  const format = BANK_FORMATS[bankFormat];

  if (format) {
    return {
      dateColumn: findColumn(headers, format.dateColumns),
      descriptionColumn: findColumn(headers, format.descriptionColumns),
      withdrawalColumn: findColumn(headers, format.withdrawalColumns),
      depositColumn: findColumn(headers, format.depositColumns),
      balanceColumn: findColumn(headers, format.balanceColumns),
      referenceColumn: findColumn(headers, format.referenceColumns),
      valueDateColumn: format.valueDateColumns ? findColumn(headers, format.valueDateColumns) : null,
      amountColumn: format.amountColumns ? findColumn(headers, format.amountColumns) : null,
      drCrColumn: format.drCrColumns ? findColumn(headers, format.drCrColumns) : null,
    };
  }

  // Generic / Auto-detect mapping
  const allDateCandidates = ['Date', 'Transaction Date', 'Txn Date', 'Tran Date', 'Posted Date', 'Posting Date'];
  const allDescCandidates = ['Description', 'Narration', 'Particulars', 'Remarks', 'Details', 'Transaction Remarks'];
  const allWithdrawalCandidates = ['Withdrawal', 'Withdrawal Amt.', 'Debit', 'Dr', 'Withdrawal Amount', 'Withdrawals', 'Debits'];
  const allDepositCandidates = ['Deposit', 'Deposit Amt.', 'Credit', 'Cr', 'Deposit Amount', 'Deposits', 'Credits'];
  const allBalanceCandidates = ['Balance', 'Closing Balance', 'Available Balance', 'Running Balance', 'BAL'];
  const allRefCandidates = ['Reference', 'Ref No', 'Ref No.', 'Reference Number', 'Chq / Ref No.', 'Chq./Ref.No.', 'CHQNO', 'UTR', 'Cheque No'];
  const allAmountCandidates = ['Amount', 'Transaction Amount', 'Txn Amount', 'Transaction Amount(INR)'];
  const allDrCrCandidates = ['Dr / Cr', 'Dr/Cr', 'Cr/Dr', 'CR/DR', 'Type', 'Txn Type'];

  return {
    dateColumn: findColumn(headers, allDateCandidates),
    descriptionColumn: findColumn(headers, allDescCandidates),
    withdrawalColumn: findColumn(headers, allWithdrawalCandidates),
    depositColumn: findColumn(headers, allDepositCandidates),
    balanceColumn: findColumn(headers, allBalanceCandidates),
    referenceColumn: findColumn(headers, allRefCandidates),
    valueDateColumn: findColumn(headers, ['Value Date', 'Value Dt']),
    amountColumn: findColumn(headers, allAmountCandidates),
    drCrColumn: findColumn(headers, allDrCrCandidates),
  };
}

/**
 * Normalize a single row into a standard transaction object using the column mapping.
 *
 * @param {object} row - key/value row from parsed file
 * @param {object} mapping - column mapping object
 * @returns {object|null} - normalized transaction or null if invalid
 */
function normalizeRow(row, mapping) {
  // Extract date
  const rawDate = mapping.dateColumn ? row[mapping.dateColumn] : null;
  const parsedDate = parseIndianDate(rawDate);
  const transactionDate = formatDateForDB(parsedDate);
  if (!transactionDate) return null;

  // Value date (optional)
  const rawValueDate = mapping.valueDateColumn ? row[mapping.valueDateColumn] : null;
  const valueDate = rawValueDate ? formatDateForDB(parseIndianDate(rawValueDate)) : null;

  // Description
  const description = mapping.descriptionColumn
    ? (row[mapping.descriptionColumn] || '').trim()
    : '';

  // Reference
  let reference = mapping.referenceColumn
    ? (row[mapping.referenceColumn] || '').trim()
    : '';
  if (reference === '-' || reference === '--' || reference === 'NA' || reference === 'N/A') {
    reference = '';
  }

  // Amounts
  let deposit = 0;
  let withdrawal = 0;

  // Check if this bank uses Amount + Dr/Cr columns (Kotak style)
  if (mapping.amountColumn && mapping.drCrColumn) {
    const amount = parseAmount(row[mapping.amountColumn]);
    const drCr = (row[mapping.drCrColumn] || '').toUpperCase().trim();

    if (drCr.includes('CR') || drCr === 'C' || drCr === 'CREDIT') {
      deposit = amount;
    } else if (drCr.includes('DR') || drCr === 'D' || drCr === 'DEBIT') {
      withdrawal = amount;
    } else if (amount > 0) {
      // Fallback: if no Dr/Cr indicator, try checking deposit/withdrawal columns
      deposit = mapping.depositColumn ? parseAmount(row[mapping.depositColumn]) : 0;
      withdrawal = mapping.withdrawalColumn ? parseAmount(row[mapping.withdrawalColumn]) : 0;
      if (deposit === 0 && withdrawal === 0) {
        // Last resort: assume credit
        deposit = amount;
      }
    }
  } else {
    // Standard separate deposit/withdrawal columns
    deposit = mapping.depositColumn ? parseAmount(row[mapping.depositColumn]) : 0;
    withdrawal = mapping.withdrawalColumn ? parseAmount(row[mapping.withdrawalColumn]) : 0;
  }

  // Skip rows with zero amounts
  if (deposit === 0 && withdrawal === 0) return null;

  // Balance (preserve negative sign for overdraft balances)
  const balance = mapping.balanceColumn ? parseBalanceAmount(row[mapping.balanceColumn]) : null;

  return {
    transaction_date: transactionDate,
    value_date: valueDate || transactionDate,
    description,
    reference_number: reference || null,
    deposit_amount: parseFloat(deposit.toFixed(2)),
    withdrawal_amount: parseFloat(withdrawal.toFixed(2)),
    balance: balance != null ? parseFloat(balance.toFixed(2)) : null,
    category: categorizeTransaction(description, deposit, withdrawal),
  };
}

// ============================================================================
// Transaction Categorization (ported from Swift TransactionCategorizer)
// ============================================================================

/**
 * Auto-categorize a transaction based on description keywords.
 * @param {string} description
 * @param {number} deposit
 * @param {number} withdrawal
 * @returns {string|null}
 */
function categorizeTransaction(description, deposit, withdrawal) {
  const n = (description || '').toUpperCase();

  // Bank Charges
  if (n.includes('SMS CHARGE') || n.includes('ATM CHG') || n.includes('MIN BAL') ||
    n.includes('SERVICE CHARGE') || n.includes('DEBIT CARD FEE') ||
    n.includes('CHEQUE RETURN') || n.includes('BANK FEE') || n.includes('BANK CHARGES')) {
    return 'Bank Charges';
  }

  // Interest
  if (n.includes('INT PD') || n.includes('INTEREST PAID') || n.includes('INT CREDIT') || n.includes('INT CR')) {
    return 'Interest Income';
  }

  // GST/Tax
  if (n.includes('GST PAYMENT') || n.includes('GST CHALLAN') || n.includes('GST-')) {
    return 'Tax Payment';
  }
  if (n.includes('TDS') || n.includes('TAX DEDUCTED')) {
    return 'Tax Payment';
  }

  // Salary
  if (n.includes('SALARY') || n.includes('PAYROLL') || n.includes('SAL CR') || n.includes('SAL/')) {
    return 'Salary';
  }

  // Refund
  if (n.includes('REFUND') || n.includes('REVERSAL') || n.includes('CASHBACK')) {
    return 'Refund';
  }

  // Transfer
  if (n.includes('NEFT') || n.includes('RTGS') || n.includes('IMPS') ||
    n.includes('UPI/') || n.includes('UPI-') || n.includes('FUND TRANSFER')) {
    return 'Transfer';
  }

  return null; // Leave uncategorized for manual review
}

// ============================================================================
// Main Parse Function
// ============================================================================

/**
 * Parse a bank statement file (CSV, Excel, HTML, PDF, or SWIFT MT940/MT950)
 * and return normalized transactions.
 *
 * @param {Buffer} fileBuffer - file content as buffer
 * @param {string} originalName - original filename (for extension detection)
 * @param {string} [bankFormat='AUTO'] - bank format key or 'AUTO' for auto-detect
 * @returns {Promise<{ transactions: object[], headers: string[], mapping: object, detectedFormat: string, totalRows: number, errors: string[] }>}
 */
async function parseStatement(fileBuffer, originalName, bankFormat = 'AUTO') {
  const errors = [];
  const ext = (originalName || '').split('.').pop().toLowerCase();

  // --- PDF handling ---
  if (ext === 'pdf') {
    let parsed;
    try {
      parsed = await parsePDFContent(fileBuffer);
    } catch (err) {
      errors.push(`PDF parse error: ${err.message}`);
      return { transactions: [], headers: [], mapping: {}, detectedFormat: 'PDF', totalRows: 0, errors };
    }

    const { headers, rows } = parsed;
    if (!headers.length || !rows.length) {
      errors.push('No transaction data found in the PDF file. Please check the file format.');
      return { transactions: [], headers, mapping: {}, detectedFormat: 'PDF', totalRows: 0, errors };
    }

    // Auto-detect bank format from PDF headers (or default to KOTAK)
    let detectedFormat = bankFormat;
    if (bankFormat === 'AUTO') {
      detectedFormat = detectBankFormat(headers);
      // If auto-detect fails, assume KOTAK for PDF
      if (detectedFormat === 'AUTO') {
        detectedFormat = 'KOTAK';
      }
    }

    const mapping = buildColumnMapping(headers, detectedFormat);

    if (!mapping.dateColumn) {
      errors.push('Could not identify a date column in the PDF file.');
      return { transactions: [], headers, mapping, detectedFormat, totalRows: rows.length, errors };
    }

    const transactions = [];
    let rowErrors = 0;
    for (let i = 0; i < rows.length; i++) {
      try {
        const normalized = normalizeRow(rows[i], mapping);
        if (normalized) {
          transactions.push(normalized);
        }
      } catch (err) {
        rowErrors++;
        if (rowErrors <= 5) {
          errors.push(`Row ${i + 1}: ${err.message}`);
        }
      }
    }
    if (rowErrors > 5) {
      errors.push(`...and ${rowErrors - 5} more row errors`);
    }

    return { transactions, headers, mapping, detectedFormat, totalRows: rows.length, errors };
  }

  // --- SWIFT MT940/MT950 handling ---
  // For .txt files, auto-detect MT940 format by content markers
  if (ext === 'txt' || bankFormat === 'MT940') {
    let content = fileBuffer.toString('utf-8');
    if (content.charCodeAt(0) === 0xfeff) {
      content = content.substring(1);
    }

    if (bankFormat === 'MT940' || isMT940Format(content)) {
      try {
        const mt940Result = parseMT940Content(content);
        return {
          transactions: mt940Result.transactions,
          headers: [],
          mapping: {},
          detectedFormat: mt940Result.detectedFormat,
          totalRows: mt940Result.transactions.length,
          errors: mt940Result.errors,
        };
      } catch (err) {
        errors.push(`MT940 parse error: ${err.message}`);
        return { transactions: [], headers: [], mapping: {}, detectedFormat: 'MT940', totalRows: 0, errors };
      }
    }
    // If not MT940, fall through to CSV parsing for .txt files
  }

  // --- HTML bank statement handling ---
  if (ext === 'html' || ext === 'htm') {
    let content = fileBuffer.toString('utf-8');
    if (content.includes('\0')) {
      content = fileBuffer.toString('utf16le');
    }
    if (content.charCodeAt(0) === 0xfeff) {
      content = content.substring(1);
    }

    let parsed;
    try {
      parsed = parseHTMLContent(content);
    } catch (err) {
      errors.push(`HTML parse error: ${err.message}`);
      return { transactions: [], headers: [], mapping: {}, detectedFormat: bankFormat, totalRows: 0, errors };
    }

    const { headers, rows } = parsed;
    if (!headers.length || !rows.length) {
      errors.push('No tabular data found in the HTML file. Please check the file format.');
      return { transactions: [], headers, mapping: {}, detectedFormat: bankFormat, totalRows: 0, errors };
    }

    // Auto-detect bank format from HTML headers
    let detectedFormat = bankFormat;
    if (bankFormat === 'AUTO') {
      detectedFormat = detectBankFormat(headers);
    }

    const mapping = buildColumnMapping(headers, detectedFormat);

    if (!mapping.dateColumn) {
      errors.push('Could not identify a date column in the HTML file.');
      return { transactions: [], headers, mapping, detectedFormat, totalRows: rows.length, errors };
    }

    const transactions = [];
    let rowErrors = 0;
    for (let i = 0; i < rows.length; i++) {
      try {
        const normalized = normalizeRow(rows[i], mapping);
        if (normalized) {
          transactions.push(normalized);
        }
      } catch (err) {
        rowErrors++;
        if (rowErrors <= 5) {
          errors.push(`Row ${i + 1}: ${err.message}`);
        }
      }
    }
    if (rowErrors > 5) {
      errors.push(`...and ${rowErrors - 5} more row errors`);
    }

    return { transactions, headers, mapping, detectedFormat, totalRows: rows.length, errors };
  }

  // --- Excel handling ---
  let parsed;

  if (ext === 'xlsx' || ext === 'xls') {
    try {
      parsed = parseExcelContent(fileBuffer);
    } catch (err) {
      errors.push(`Excel parse error: ${err.message}`);
      return { transactions: [], headers: [], mapping: {}, detectedFormat: bankFormat, totalRows: 0, errors };
    }
  } else {
    // Default to CSV
    // Try UTF-8 first, then Windows-1252
    let content = fileBuffer.toString('utf-8');
    // Check for null bytes (might be UTF-16)
    if (content.includes('\0')) {
      content = fileBuffer.toString('utf16le');
    }
    // Strip BOM
    if (content.charCodeAt(0) === 0xfeff) {
      content = content.substring(1);
    }

    try {
      parsed = parseCSVContent(content);
    } catch (err) {
      errors.push(`CSV parse error: ${err.message}`);
      return { transactions: [], headers: [], mapping: {}, detectedFormat: bankFormat, totalRows: 0, errors };
    }
  }

  const { headers, rows } = parsed;
  if (!headers.length || !rows.length) {
    errors.push('No data found in the file. Please check the file format.');
    return { transactions: [], headers, mapping: {}, detectedFormat: bankFormat, totalRows: 0, errors };
  }

  // Auto-detect bank format if needed
  let detectedFormat = bankFormat;
  if (bankFormat === 'AUTO') {
    detectedFormat = detectBankFormat(headers);
  }

  // Build column mapping
  const mapping = buildColumnMapping(headers, detectedFormat);

  if (!mapping.dateColumn) {
    errors.push('Could not identify a date column. Please check the file format or select the correct bank format.');
    return { transactions: [], headers, mapping, detectedFormat, totalRows: rows.length, errors };
  }

  // Normalize rows
  const transactions = [];
  let rowErrors = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      const normalized = normalizeRow(row, mapping);
      if (normalized) {
        transactions.push(normalized);
      }
    } catch (err) {
      rowErrors++;
      if (rowErrors <= 5) {
        errors.push(`Row ${i + 1}: ${err.message}`);
      }
    }
  }

  if (rowErrors > 5) {
    errors.push(`...and ${rowErrors - 5} more row errors`);
  }

  return {
    transactions,
    headers,
    mapping,
    detectedFormat,
    totalRows: rows.length,
    errors,
  };
}

// ============================================================================
// Exports
// ============================================================================

module.exports = {
  parseStatement,
  parseIndianDate,
  parseAmount,
  formatDateForDB,
  detectBankFormat,
  buildColumnMapping,
  normalizeRow,
  categorizeTransaction,
  parseHTMLContent,
  parsePDFContent,
  parseMT940Content,
  isMT940Format,
  BANK_FORMATS,
};
