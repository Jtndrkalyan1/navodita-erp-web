const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const db = require('../config/database');

// Apply authentication to all AI routes
router.use(authenticate);

// ============================================================
// AI Provider Configuration
// ============================================================

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

// ============================================================
// Helper: Get API keys from DB first, then fall back to .env
// ============================================================

async function getApiKeys() {
  let geminiKey = null;
  let groqKey = null;

  try {
    const rows = await db('app_settings')
      .whereIn('setting_key', ['gemini_api_key', 'groq_api_key'])
      .select('setting_key', 'setting_value');

    for (const row of rows) {
      if (row.setting_key === 'gemini_api_key' && row.setting_value) {
        geminiKey = row.setting_value;
      }
      if (row.setting_key === 'groq_api_key' && row.setting_value) {
        groqKey = row.setting_value;
      }
    }
  } catch (err) {
    console.error('Failed to read AI keys from DB:', err.message);
  }

  // Fall back to environment variables
  if (!geminiKey) geminiKey = process.env.GEMINI_API_KEY || null;
  if (!groqKey) groqKey = process.env.GROQ_API_KEY || null;

  return { geminiKey, groqKey };
}

/**
 * Mask an API key for safe display: show first 4 and last 4 chars
 */
function maskApiKey(key) {
  if (!key) return null;
  if (key.length <= 8) return '****';
  return key.slice(0, 4) + '...' + key.slice(-4);
}

const SYSTEM_PROMPT = `You are NavoditaERP AI Assistant, helping with Indian business ERP tasks including GST, TDS, payroll (PF/ESI), invoicing, and garment manufacturing.

You are knowledgeable about:
- Indian GST (Goods and Services Tax) rules, rates (5%, 12%, 18%, 28%), HSN codes (always use full 6-digit or 8-digit codes like 6109.10, 6205.20), filing (GSTR-1, GSTR-3B, GSTR-9)
- TDS (Tax Deducted at Source) sections, rates, Form 16/16A, quarterly returns (24Q, 26Q)
- Indian payroll: PF (12% employer + 12% employee), ESI (3.25% employer + 0.75% employee), Professional Tax
- Indian accounting standards and Chart of Accounts
- Garment/textile manufacturing: costing, BOM, style sheets, fabric calculations
- Indian business compliance: ROC filing, MSME registration, Import/Export codes
- Invoice formats as per Indian regulations

Always provide accurate, practical advice. Use Indian Rupee (INR/₹) for currency. Format numbers in Indian numbering system (lakhs, crores). Be concise but thorough.`;

const MODE_PROMPTS = {
  general: '',
  search: '\n\nThe user is searching for information. Provide comprehensive, well-structured answers with relevant details. If you reference specific rules or sections, cite them.',
  email: '\n\nThe user wants help drafting a professional business email. Generate a well-formatted email with appropriate subject line, salutation, body, and sign-off. Use formal Indian business English. Output the email in a clear format with Subject:, To:, Body: sections.',
  translate: '\n\nThe user wants translation help. Translate between Hindi and English (or other Indian languages). Provide the translation clearly. If the input is in Hindi/Devanagari, translate to English. If in English, translate to Hindi. Include transliteration if helpful.',
  summarize: '\n\nThe user wants a summary. Provide a clear, concise summary with key points highlighted. Use bullet points for clarity.',
  analyze: '\n\nThe user wants data analysis help. Analyze the provided data or ERP metrics and provide insights, trends, and actionable recommendations. Use specific numbers and percentages where possible.',
  hsn: '\n\nThe user is looking up HSN (Harmonized System of Nomenclature) or SAC (Services Accounting Code) codes for Indian GST compliance. IMPORTANT: Always provide the FULL 6-DIGIT or 8-DIGIT HSN codes (e.g., 6109.10 not just 6109, 6205.20 not just 6205, 5208.11 not just 5208). Indian GST and E-Way Bill require minimum 6-digit HSN codes. For example: mens cotton shirts = 6205.20, cotton knitted T-shirts = 6109.10, cotton fabric = 5208.11, polyester fabric = 5407.10. Always include the full sub-heading digits. Also mention the applicable GST rate with thresholds (e.g., readymade garments below Rs 1000 attract 5% GST, above Rs 1000 attract 12% GST).',
};

// ============================================================
// Helper: Search HSN codes in local database
// ============================================================

async function searchHSNCodes(query, limit = 10) {
  const searchTerm = (query || '').trim();
  if (!searchTerm) return [];

  const isCodeSearch = /^\d+$/.test(searchTerm);

  let dbQuery = db('hsn_codes');

  if (isCodeSearch) {
    dbQuery = dbQuery.where(function () {
      this.where('hsn_code', searchTerm)
        .orWhere('hsn_code', 'like', `${searchTerm}%`);
    });
  } else {
    dbQuery = dbQuery.where(function () {
      this.where('description', 'ilike', `%${searchTerm}%`)
        .orWhere('hsn_code', 'ilike', `%${searchTerm}%`)
        .orWhere('notes', 'ilike', `%${searchTerm}%`);
    });
  }

  if (isCodeSearch) {
    return dbQuery
      .orderByRaw(`
        CASE
          WHEN hsn_code = ? THEN 0
          WHEN hsn_code LIKE ? THEN 1
          ELSE 2
        END, hsn_code ASC
      `, [searchTerm, `${searchTerm}%`])
      .limit(limit);
  }

  return dbQuery.orderBy('hsn_code', 'asc').limit(limit);
}

function isHSNRelatedQuery(message) {
  const lowerMsg = message.toLowerCase();
  const hsnKeywords = [
    'hsn', 'sac code', 'sac ', 'harmonized', 'nomenclature',
    'gst rate for', 'gst on', 'what is the gst',
    'tax rate for', 'tax on', 'which hsn', 'hsn code',
    'service code', 'service accounting code',
  ];
  return hsnKeywords.some((kw) => lowerMsg.includes(kw));
}

function formatHSNResults(results) {
  if (!results || results.length === 0) return '';

  let text = '\n\n**HSN/SAC Database Results:**\n\n';
  text += '| Code | Description | GST Rate | Chapter | Section |\n';
  text += '|------|-------------|----------|---------|----------|\n';

  for (const r of results) {
    const desc = r.description.length > 60
      ? r.description.substring(0, 57) + '...'
      : r.description;
    text += `| ${r.hsn_code} | ${desc} | ${r.gst_rate}% | ${r.chapter} | ${r.section} |\n`;
  }

  if (results.length > 0 && results[0].notes) {
    text += `\n**Note:** ${results[0].notes}`;
  }

  return text;
}

// ============================================================
// Helper: Fetch ERP summary stats for context
// ============================================================

async function getERPContext() {
  try {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthStartStr = firstDayOfMonth.toISOString().split('T')[0];

    const [receivables] = await db('invoices')
      .whereNotIn('status', ['Paid', 'Cancelled'])
      .select(db.raw('COALESCE(SUM(balance_due), 0) as total'));

    const [payables] = await db('bills')
      .whereNot('status', 'Paid')
      .select(db.raw('COALESCE(SUM(balance_due), 0) as total'));

    const [bankBalance] = await db('bank_accounts')
      .where('is_active', true)
      .select(db.raw('COALESCE(SUM(current_balance), 0) as total'));

    const [invoiceCount] = await db('invoices')
      .where('invoice_date', '>=', monthStartStr)
      .select(db.raw('COUNT(*) as count'));

    const [billCount] = await db('bills')
      .where('bill_date', '>=', monthStartStr)
      .select(db.raw('COUNT(*) as count'));

    const [employeeCount] = await db('employees')
      .where('is_active', true)
      .select(db.raw('COUNT(*) as count'));

    const [company] = await db('company_profile').select('*').limit(1);

    return `
Current ERP Data Summary:
- Company: ${company?.company_name || 'NavoditaERP User'}
- Total Receivables: ₹${parseFloat(receivables.total || 0).toLocaleString('en-IN')}
- Total Payables: ₹${parseFloat(payables.total || 0).toLocaleString('en-IN')}
- Bank Balance: ₹${parseFloat(bankBalance.total || 0).toLocaleString('en-IN')}
- Invoices This Month: ${parseInt(invoiceCount.count) || 0}
- Bills This Month: ${parseInt(billCount.count) || 0}
- Active Employees: ${parseInt(employeeCount.count) || 0}
`;
  } catch (err) {
    console.error('Failed to fetch ERP context:', err.message);
    return '\n(ERP data unavailable)';
  }
}

// ============================================================
// Helper: Call Gemini API
// ============================================================

async function callGemini(systemPrompt, userMessage, conversationHistory = [], useGrounding = false, apiKey = null) {
  if (!apiKey) return null;

  try {
    // Build contents array from conversation history
    const contents = [];

    // Add conversation history
    for (const msg of conversationHistory) {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      });
    }

    // Add the current user message
    contents.push({
      role: 'user',
      parts: [{ text: userMessage }],
    });

    const requestBody = {
      system_instruction: {
        parts: [{ text: systemPrompt }],
      },
      contents,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 4096,
        topP: 0.95,
      },
    };

    // Add Google Search grounding for search mode
    if (useGrounding) {
      requestBody.tools = [
        {
          google_search: {},
        },
      ];
    }

    const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Gemini API error:', response.status, errText);
      return null;
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return text || null;
  } catch (err) {
    console.error('Gemini API call failed:', err.message);
    return null;
  }
}

// ============================================================
// Helper: Call Groq API (fallback)
// ============================================================

async function callGroq(systemPrompt, userMessage, conversationHistory = [], apiKey = null) {
  if (!apiKey) return null;

  try {
    const messages = [
      { role: 'system', content: systemPrompt },
    ];

    // Add conversation history
    for (const msg of conversationHistory) {
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    }

    // Add current user message
    messages.push({ role: 'user', content: userMessage });

    const response = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages,
        temperature: 0.7,
        max_tokens: 4096,
        top_p: 0.95,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Groq API error:', response.status, errText);
      return null;
    }

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content;
    return text || null;
  } catch (err) {
    console.error('Groq API call failed:', err.message);
    return null;
  }
}

// ============================================================
// Helper: Generate offline response
// ============================================================

function getOfflineResponse(message, mode) {
  const lowerMsg = message.toLowerCase();

  // GST-related
  if (lowerMsg.includes('gst') || lowerMsg.includes('goods and service')) {
    return `**GST Quick Reference:**

- **GSTR-1**: Monthly/quarterly return for outward supplies. Due by 11th of next month.
- **GSTR-3B**: Monthly summary return. Due by 20th of next month.
- **GSTR-9**: Annual return. Due by 31st December.

**GST Rates**: 0%, 5%, 12%, 18%, 28%
**Composition Scheme**: For turnover up to ₹1.5 Cr (₹75L for services). Flat rate: 1% (manufacturers), 5% (restaurants), 6% (services).

*Note: Configure your AI API keys (Gemini or Groq) in Settings for detailed AI-powered answers.*`;
  }

  // TDS-related
  if (lowerMsg.includes('tds') || lowerMsg.includes('tax deduct')) {
    return `**TDS Quick Reference:**

- **Section 194C**: Contractor payments - 1% (individual/HUF), 2% (others)
- **Section 194J**: Professional/technical fees - 10%
- **Section 194H**: Commission/brokerage - 5%
- **Section 194I**: Rent - 10% (land/building), 2% (machinery)
- **Section 192**: Salary - as per slab rates

**Quarterly Returns**: 24Q (salary), 26Q (non-salary) - Due by 31st of month following quarter.
**Form 16**: Annual certificate for salary TDS. Issue by 15th June.

*Note: Configure your AI API keys for detailed AI-powered answers.*`;
  }

  // Payroll-related
  if (lowerMsg.includes('payroll') || lowerMsg.includes('salary') || lowerMsg.includes('pf') || lowerMsg.includes('esi')) {
    return `**Indian Payroll Quick Reference:**

**Provident Fund (PF):**
- Employee contribution: 12% of basic salary
- Employer contribution: 12% of basic salary (3.67% EPF + 8.33% EPS)
- Applicable if establishment has 20+ employees

**ESI (Employee State Insurance):**
- Employer: 3.25% of gross salary
- Employee: 0.75% of gross salary
- Applicable for salary up to ₹21,000/month

**Professional Tax**: Varies by state (max ₹2,500/year)

*Note: Configure your AI API keys for detailed AI-powered answers.*`;
  }

  // Invoice-related
  if (lowerMsg.includes('invoice') || lowerMsg.includes('billing')) {
    return `**Invoice Requirements (India):**

A GST-compliant invoice must include:
1. Supplier's name, address, GSTIN
2. Invoice number (unique, sequential, max 16 chars)
3. Date of issue
4. Recipient's name, address, GSTIN (if registered)
5. HSN/SAC code
6. Description, quantity, unit, total value
7. Tax rate and amount (CGST + SGST or IGST)
8. Place of supply
9. Signature/digital signature

*Note: Configure your AI API keys for detailed AI-powered answers.*`;
  }

  // HSN-related
  if (lowerMsg.includes('hsn') || lowerMsg.includes('sac code') || mode === 'hsn') {
    return `**HSN/SAC Code Reference:**

HSN (Harmonized System of Nomenclature) codes classify goods for GST purposes. SAC (Services Accounting Code) codes classify services.

**Key GST Rates:**
- **0%**: Essential items (fresh food, books, healthcare)
- **5%**: Economy items, readymade garments below ₹1000, basic food items
- **12%**: Readymade garments above ₹1000, processed foods, some services
- **18%**: Standard rate for most goods and services
- **28%**: Luxury items, tobacco, aerated drinks, cars

**Common Textile HSN Codes:**
- 6101-6117: Knitted garments
- 6201-6217: Woven garments
- 5208-5212: Cotton fabrics
- 5407-5408: Synthetic fabrics

Use the HSN Search mode or try searching for a specific product to find its HSN code.

*Configure your AI API keys for detailed HSN lookup assistance.*`;
  }

  // Default
  if (mode === 'email') {
    return `To generate email drafts, please configure your AI API keys (Gemini or Groq) in the environment variables.

**Quick Tips for Business Emails:**
- Use a clear, specific subject line
- Begin with a professional greeting
- State the purpose in the first paragraph
- Keep paragraphs short and focused
- End with a clear call to action
- Use formal closing (Regards, Best regards, Sincerely)

*Configure GEMINI_API_KEY or GROQ_API_KEY in your .env file to enable AI-powered email drafting.*`;
  }

  if (mode === 'translate') {
    return `AI-powered translation requires an API key to be configured.

**Supported Languages**: Hindi, English, and other Indian languages.

*Configure GEMINI_API_KEY or GROQ_API_KEY in your .env file to enable AI-powered translations.*`;
  }

  return `I'm NavoditaERP AI Assistant. I can help with:

- **GST**: Rates, HSN codes, filing deadlines, input tax credit
- **TDS**: Sections, rates, returns, Form 16
- **Payroll**: PF/ESI calculations, salary structure, statutory compliance
- **Invoicing**: GST-compliant formats, credit/debit notes
- **Accounting**: Journal entries, Chart of Accounts, reconciliation
- **Garment Manufacturing**: Costing, BOM, fabric calculations

*To get AI-powered detailed responses, configure GEMINI_API_KEY or GROQ_API_KEY in your environment variables.*

Try asking about a specific topic like "What are the GST filing deadlines?" or "How to calculate PF contribution?"`;
}

// ============================================================
// Transaction categorization keywords
// ============================================================

const CATEGORY_KEYWORDS = {
  'Salary & Wages': ['salary', 'wage', 'payroll', 'stipend', 'bonus', 'incentive', 'overtime', 'reimbursement'],
  'Rent': ['rent', 'lease', 'office space', 'godown', 'warehouse', 'property'],
  'Utilities': ['electricity', 'electric', 'power', 'water', 'gas', 'utility', 'internet', 'broadband', 'telephone', 'phone', 'mobile'],
  'Office Supplies': ['stationery', 'office supply', 'paper', 'ink', 'toner', 'printer', 'pen', 'furniture'],
  'Travel & Conveyance': ['travel', 'cab', 'taxi', 'uber', 'ola', 'flight', 'train', 'bus', 'fuel', 'petrol', 'diesel', 'toll', 'parking'],
  'Professional Fees': ['professional', 'consultant', 'legal', 'advocate', 'ca ', 'chartered accountant', 'audit', 'advisory'],
  'Raw Materials': ['fabric', 'thread', 'yarn', 'dye', 'chemical', 'raw material', 'cotton', 'polyester', 'silk', 'trim', 'accessory', 'button', 'zipper', 'label'],
  'Manufacturing': ['manufacturing', 'production', 'stitching', 'cutting', 'embroidery', 'printing', 'washing', 'finishing', 'packing'],
  'Freight & Shipping': ['freight', 'shipping', 'courier', 'transport', 'logistics', 'delivery', 'dhl', 'fedex', 'bluedart', 'delhivery'],
  'Bank Charges': ['bank charge', 'bank fee', 'processing fee', 'transaction fee', 'interest', 'emi', 'loan', 'atm'],
  'Insurance': ['insurance', 'premium', 'policy', 'lic', 'health insurance', 'general insurance'],
  'Taxes & Duties': ['tax', 'gst', 'tds', 'customs', 'duty', 'cess', 'income tax', 'advance tax', 'professional tax'],
  'Marketing & Advertising': ['marketing', 'advertising', 'ad ', 'google ads', 'facebook', 'promotion', 'campaign', 'branding'],
  'Maintenance & Repairs': ['maintenance', 'repair', 'amc', 'service', 'cleaning', 'pest control'],
  'Food & Entertainment': ['food', 'meal', 'lunch', 'dinner', 'tea', 'coffee', 'catering', 'entertainment', 'hotel', 'restaurant', 'swiggy', 'zomato'],
  'Sales Revenue': ['sales', 'revenue', 'payment received', 'collection', 'receivable'],
  'Refund': ['refund', 'return', 'reversal', 'cashback'],
  'Miscellaneous': [],
};

function categorizeTransaction(description, amount, type) {
  const lowerDesc = (description || '').toLowerCase();

  let bestCategory = 'Miscellaneous';
  let bestConfidence = 0.3; // default confidence for misc

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerDesc.includes(keyword)) {
        // Calculate confidence based on keyword specificity
        const specificity = keyword.length / Math.max(lowerDesc.length, 1);
        const confidence = Math.min(0.6 + specificity * 2, 0.95);

        if (confidence > bestConfidence) {
          bestConfidence = confidence;
          bestCategory = category;
        }
      }
    }
  }

  // Adjust category based on transaction type (deposit vs withdrawal)
  if (type === 'deposit' || amount > 0) {
    if (!['Sales Revenue', 'Refund', 'Bank Charges'].includes(bestCategory)) {
      // If it's a deposit and categorized as expense, check if it might be revenue
      if (bestConfidence < 0.6) {
        bestCategory = 'Sales Revenue';
        bestConfidence = 0.4;
      }
    }
  }

  // Map to Chart of Accounts
  const accountMapping = {
    'Salary & Wages': 'Salaries and Wages',
    'Rent': 'Rent Expense',
    'Utilities': 'Utilities',
    'Office Supplies': 'Office Supplies',
    'Travel & Conveyance': 'Travel and Conveyance',
    'Professional Fees': 'Professional Fees',
    'Raw Materials': 'Raw Materials Consumed',
    'Manufacturing': 'Manufacturing Expenses',
    'Freight & Shipping': 'Freight and Shipping',
    'Bank Charges': 'Bank Charges',
    'Insurance': 'Insurance',
    'Taxes & Duties': 'Taxes and Duties',
    'Marketing & Advertising': 'Marketing and Advertising',
    'Maintenance & Repairs': 'Repairs and Maintenance',
    'Food & Entertainment': 'Food and Entertainment',
    'Sales Revenue': 'Sales',
    'Refund': 'Sales Returns',
    'Miscellaneous': 'Miscellaneous Expenses',
  };

  return {
    category: bestCategory,
    confidence: parseFloat(bestConfidence.toFixed(2)),
    account: accountMapping[bestCategory] || 'Miscellaneous Expenses',
  };
}

// ============================================================
// POST /ai/chat - Send a message to AI assistant
// ============================================================

router.post('/chat', async (req, res, next) => {
  try {
    const { message, mode = 'general', conversationHistory = [] } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const validModes = ['general', 'search', 'email', 'translate', 'summarize', 'analyze', 'hsn'];
    if (!validModes.includes(mode)) {
      return res.status(400).json({ error: `Invalid mode. Must be one of: ${validModes.join(', ')}` });
    }

    // Build system prompt with mode-specific additions
    let fullSystemPrompt = SYSTEM_PROMPT + (MODE_PROMPTS[mode] || '');

    // For analyze mode, inject ERP data context
    if (mode === 'analyze') {
      const erpContext = await getERPContext();
      fullSystemPrompt += '\n\n' + erpContext;
    }

    // For HSN mode or HSN-related queries in general mode, search local DB first
    let hsnResults = [];
    let hsnContext = '';
    if (mode === 'hsn' || (mode === 'general' && isHSNRelatedQuery(message))) {
      // Extract the search term - if in HSN mode, use the message directly
      // In general mode, try to extract the product/service name
      let hsnSearchTerm = message;
      if (mode === 'general') {
        // Try to extract what they're asking about
        const patterns = [
          /hsn\s+(?:code\s+)?(?:for\s+)?(.+?)(?:\?|$)/i,
          /sac\s+(?:code\s+)?(?:for\s+)?(.+?)(?:\?|$)/i,
          /gst\s+(?:rate\s+)?(?:for|on)\s+(.+?)(?:\?|$)/i,
          /tax\s+(?:rate\s+)?(?:for|on)\s+(.+?)(?:\?|$)/i,
          /what\s+is\s+(?:the\s+)?(?:hsn|sac|gst)\s+(?:code\s+)?(?:for\s+)?(.+?)(?:\?|$)/i,
        ];
        for (const pattern of patterns) {
          const match = message.match(pattern);
          if (match && match[1]) {
            hsnSearchTerm = match[1].trim();
            break;
          }
        }
      }

      hsnResults = await searchHSNCodes(hsnSearchTerm, 10);
      if (hsnResults.length > 0) {
        hsnContext = formatHSNResults(hsnResults);
        fullSystemPrompt += `\n\nThe following HSN/SAC codes were found in the local database for the user's query. Use this data to provide an accurate answer. If the data matches their query, present it clearly. Add any relevant context about GST rates, exemptions, or conditions:\n${hsnContext}`;
      }
    }

    // Sanitize conversation history
    const sanitizedHistory = (conversationHistory || [])
      .filter((msg) => msg && msg.role && msg.content)
      .map((msg) => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: String(msg.content).slice(0, 10000),
      }))
      .slice(-20); // Keep last 20 messages max

    let responseText = null;
    let provider = null;

    // Fetch API keys (DB first, then .env fallback)
    const { geminiKey, groqKey } = await getApiKeys();

    // Try Gemini first
    const useGrounding = mode === 'search';
    responseText = await callGemini(fullSystemPrompt, message, sanitizedHistory, useGrounding, geminiKey);
    if (responseText) {
      provider = 'gemini';
    }

    // Fallback to Groq
    if (!responseText) {
      responseText = await callGroq(fullSystemPrompt, message, sanitizedHistory, groqKey);
      if (responseText) {
        provider = 'groq';
      }
    }

    // Fallback to offline response
    if (!responseText) {
      // For HSN mode, if we have DB results, build an offline response from them
      if ((mode === 'hsn' || isHSNRelatedQuery(message)) && hsnResults.length > 0) {
        responseText = `Here are the HSN/SAC codes I found:${hsnContext}\n\n*Results from local database. Configure AI API keys for more detailed explanations.*`;
        provider = 'database';
      } else {
        responseText = getOfflineResponse(message, mode);
        provider = 'offline';
      }
    }

    res.json({
      data: {
        response: responseText,
        provider,
        mode,
        hsnResults: hsnResults.length > 0 ? hsnResults : undefined,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// POST /ai/categorize - AI categorize bank transactions
// ============================================================

router.post('/categorize', async (req, res, next) => {
  try {
    const { transactions } = req.body;

    if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
      return res.status(400).json({ error: 'Transactions array is required and must not be empty' });
    }

    if (transactions.length > 500) {
      return res.status(400).json({ error: 'Maximum 500 transactions per request' });
    }

    const results = transactions.map((txn) => {
      const { description, amount, type } = txn;
      const categorization = categorizeTransaction(description, amount, type);
      return {
        description: description || '',
        amount: amount || 0,
        type: type || 'unknown',
        ...categorization,
      };
    });

    res.json({ data: results });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// GET /ai/config - Get AI configuration status
// ============================================================

router.get('/config', async (req, res) => {
  try {
    const { geminiKey, groqKey } = await getApiKeys();
    const providers = [];
    if (geminiKey) providers.push('Gemini');
    if (groqKey) providers.push('Groq');
    res.json({
      available: providers.length > 0,
      providers,
      geminiConfigured: !!geminiKey,
      groqConfigured: !!groqKey,
      hasAnyProvider: providers.length > 0,
    });
  } catch (err) {
    const gemini = !!process.env.GEMINI_API_KEY;
    const groq = !!process.env.GROQ_API_KEY;
    const providers = [];
    if (gemini) providers.push('Gemini');
    if (groq) providers.push('Groq');
    res.json({
      available: providers.length > 0,
      providers,
      geminiConfigured: gemini,
      groqConfigured: groq,
      hasAnyProvider: providers.length > 0,
    });
  }
});

// ============================================================
// GET /ai/keys - Get AI API key status (masked values)
// ============================================================

router.get('/keys', async (req, res, next) => {
  try {
    const { geminiKey, groqKey } = await getApiKeys();

    // Determine the source (db or env) for each key
    let geminiSource = null;
    let groqSource = null;

    try {
      const dbRows = await db('app_settings')
        .whereIn('setting_key', ['gemini_api_key', 'groq_api_key'])
        .select('setting_key', 'setting_value');

      const dbGemini = dbRows.find((r) => r.setting_key === 'gemini_api_key');
      const dbGroq = dbRows.find((r) => r.setting_key === 'groq_api_key');

      if (dbGemini?.setting_value) geminiSource = 'database';
      else if (process.env.GEMINI_API_KEY) geminiSource = 'environment';

      if (dbGroq?.setting_value) groqSource = 'database';
      else if (process.env.GROQ_API_KEY) groqSource = 'environment';
    } catch {
      if (process.env.GEMINI_API_KEY) geminiSource = 'environment';
      if (process.env.GROQ_API_KEY) groqSource = 'environment';
    }

    res.json({
      data: {
        gemini: {
          configured: !!geminiKey,
          masked: maskApiKey(geminiKey),
          source: geminiSource,
        },
        groq: {
          configured: !!groqKey,
          masked: maskApiKey(groqKey),
          source: groqSource,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// PUT /ai/keys - Save AI API keys to app_settings
// ============================================================

router.put('/keys', async (req, res, next) => {
  try {
    const { gemini_api_key, groq_api_key } = req.body;

    const keysToSave = [];

    if (gemini_api_key !== undefined) {
      keysToSave.push({
        setting_key: 'gemini_api_key',
        setting_value: gemini_api_key || '',
        setting_type: 'string',
        category: 'ai',
        description: 'Google Gemini API key for AI assistant',
      });
    }

    if (groq_api_key !== undefined) {
      keysToSave.push({
        setting_key: 'groq_api_key',
        setting_value: groq_api_key || '',
        setting_type: 'string',
        category: 'ai',
        description: 'Groq API key for AI assistant (fallback)',
      });
    }

    if (keysToSave.length === 0) {
      return res.status(400).json({ error: 'At least one API key must be provided' });
    }

    for (const keyData of keysToSave) {
      const existing = await db('app_settings')
        .where('setting_key', keyData.setting_key)
        .first();

      if (existing) {
        await db('app_settings')
          .where('setting_key', keyData.setting_key)
          .update({
            setting_value: keyData.setting_value,
            updated_at: db.fn.now(),
          });
      } else {
        await db('app_settings').insert(keyData);
      }
    }

    // Return updated status
    const { geminiKey, groqKey } = await getApiKeys();

    res.json({
      message: 'AI API keys saved successfully',
      data: {
        gemini: {
          configured: !!geminiKey,
          masked: maskApiKey(geminiKey),
          source: 'database',
        },
        groq: {
          configured: !!groqKey,
          masked: maskApiKey(groqKey),
          source: groqKey ? 'database' : null,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
