/**
 * Seed 002: Default Settings
 * Seeds: company_profile, app_settings, invoice_number_settings, currencies
 */

exports.seed = async function (knex) {
  // ── Truncate tables (respect FK order) ────────────────────────────────
  await knex('invoice_number_settings').del();
  await knex('app_settings').del();
  await knex('currencies').del();
  await knex('company_profile').del();

  // ── Company Profile ───────────────────────────────────────────────────
  await knex('company_profile').insert({
    company_name: 'Navodita Apparel Pvt. Ltd.',
    legal_name: 'NAVODITA APPAREL PRIVATE LIMITED',
    industry: 'Garment Manufacturing',
    company_type: 'Pvt Ltd',
    gstin: '06XXXXXXXXXXXZX',
    pan: 'XXXXX0000X',
    tan: 'DELX00000X',
    address_line1: 'Plot No. 1, Industrial Area',
    address_line2: 'Sector 25, Part-II',
    city: 'Gurugram',
    state: 'Haryana',
    pincode: '122015',
    country: 'India',
    phone: '+91-124-XXXXXXX',
    email: 'info@navodita.com',
    website: 'https://www.navodita.com',
    financial_year_start: '04',
    base_currency: 'INR',
    terms_and_conditions: 'Goods once sold will not be taken back. Payment is due within 30 days of invoice date.',
  });

  // ── App Settings ──────────────────────────────────────────────────────
  await knex('app_settings').insert([
    {
      setting_key: 'auto_lock_minutes',
      setting_value: '15',
      setting_type: 'number',
      category: 'security',
      description: 'Auto-lock the application after N minutes of inactivity',
    },
    {
      setting_key: 'employee_limit',
      setting_value: '500',
      setting_type: 'number',
      category: 'general',
      description: 'Maximum number of employees allowed',
    },
    {
      setting_key: 'base_currency',
      setting_value: 'INR',
      setting_type: 'string',
      category: 'general',
      description: 'Base currency for all transactions',
    },
    {
      setting_key: 'date_format',
      setting_value: 'DD/MM/YYYY',
      setting_type: 'string',
      category: 'display',
      description: 'Default date display format',
    },
    {
      setting_key: 'financial_year_start_month',
      setting_value: '04',
      setting_type: 'string',
      category: 'general',
      description: 'Financial year start month (April for India)',
    },
    {
      setting_key: 'gst_enabled',
      setting_value: 'true',
      setting_type: 'boolean',
      category: 'compliance',
      description: 'Enable GST compliance features',
    },
    {
      setting_key: 'tds_enabled',
      setting_value: 'true',
      setting_type: 'boolean',
      category: 'compliance',
      description: 'Enable TDS compliance features',
    },
    {
      setting_key: 'multi_currency_enabled',
      setting_value: 'true',
      setting_type: 'boolean',
      category: 'general',
      description: 'Enable multi-currency support',
    },
  ]);

  // ── Invoice Number Settings ───────────────────────────────────────────
  const documentTypes = [
    { document_type: 'Invoice', prefix: 'INV' },
    { document_type: 'Quotation', prefix: 'QTN' },
    { document_type: 'Bill', prefix: 'BILL' },
    { document_type: 'PurchaseOrder', prefix: 'PO' },
    { document_type: 'DeliveryChallan', prefix: 'DC' },
    { document_type: 'PackingList', prefix: 'PL' },
    { document_type: 'EWayBill', prefix: 'EWB' },
    { document_type: 'CreditNote', prefix: 'CN' },
    { document_type: 'DebitNote', prefix: 'DN' },
    { document_type: 'PaymentReceived', prefix: 'PR' },
    { document_type: 'PaymentMade', prefix: 'PM' },
    { document_type: 'Expense', prefix: 'EXP' },
    { document_type: 'Salary', prefix: 'SAL' },
    { document_type: 'JournalEntry', prefix: 'JE' },
  ];

  await knex('invoice_number_settings').insert(
    documentTypes.map((dt) => ({
      document_type: dt.document_type,
      prefix: dt.prefix,
      suffix: '',
      next_number: 1,
      padding_digits: 4,
      separator: '-',
      include_financial_year: true,
      financial_year_format: 'YY-YY',
      reset_frequency: 'yearly',
    }))
  );

  // ── Currencies ────────────────────────────────────────────────────────
  await knex('currencies').insert([
    { code: 'INR', name: 'Indian Rupee', symbol: '\u20B9', exchange_rate: 1.0, is_base_currency: true, is_active: true },
    { code: 'USD', name: 'US Dollar', symbol: '$', exchange_rate: 83.50, is_base_currency: false, is_active: true },
    { code: 'EUR', name: 'Euro', symbol: '\u20AC', exchange_rate: 91.00, is_base_currency: false, is_active: true },
    { code: 'GBP', name: 'British Pound', symbol: '\u00A3', exchange_rate: 106.00, is_base_currency: false, is_active: true },
    { code: 'AED', name: 'UAE Dirham', symbol: 'AED', exchange_rate: 22.73, is_base_currency: false, is_active: true },
    { code: 'SAR', name: 'Saudi Riyal', symbol: 'SAR', exchange_rate: 22.27, is_base_currency: false, is_active: true },
    { code: 'JPY', name: 'Japanese Yen', symbol: '\u00A5', exchange_rate: 0.56, is_base_currency: false, is_active: true },
    { code: 'CNY', name: 'Chinese Yuan', symbol: '\u00A5', exchange_rate: 11.48, is_base_currency: false, is_active: true },
  ]);

  console.log('Seeded company profile, app settings, invoice number settings, and currencies.');
};
