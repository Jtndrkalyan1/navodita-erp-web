/**
 * Seed 003_test_data: Comprehensive Test Data
 * Seeds realistic Indian business data for NavoditaERP web.
 *
 * Company is in HARYANA (state code 06).
 *   - Same-state (Haryana) → CGST + SGST (half each)
 *   - Different state       → IGST (full)
 *   - Export (0% GST)       → no tax columns
 *
 * Uses EXACT DB column names verified from information_schema.
 */

exports.seed = async function (knex) {
  // ────────────────────────────────────────────────────────────────────────
  // 0. DELETE existing data in reverse FK order (preserve reference tables)
  // ────────────────────────────────────────────────────────────────────────
  const deleteTables = [
    'advance_recoveries', 'advances',
    'costing_packing_items', 'costing_trim_items', 'costing_fabric_items',
    'costing_versions', 'style_costings', 'costing_sheets',
    'inventory_transactions', 'inventory_items', 'inventory_categories',
    'tds_liabilities', 'tds_challans', 'gst_filings',
    'currency_adjustments', 'journal_lines', 'journal_entries',
    'bank_transactions',
    'salary_records',
    'payment_received_allocations', 'payments_received',
    'payment_made_allocations', 'payments_made',
    'expenses',
    'eway_bill_items', 'eway_bills',
    'packing_list_sub_items', 'packing_list_items', 'packing_lists',
    'delivery_challan_items', 'delivery_challans',
    'credit_note_items', 'credit_notes',
    'debit_note_items', 'debit_notes',
    'invoice_items', 'invoices',
    'quotation_items', 'quotations',
    'purchase_order_items', 'purchase_orders',
    'bill_items', 'bills',
    'bank_accounts',
    'employees',
    'departments',
    'items',
    'vendor_addresses', 'vendors',
    'customer_addresses', 'customers',
  ];

  for (const t of deleteTables) {
    const exists = await knex.schema.hasTable(t);
    if (exists) await knex(t).del();
  }

  console.log('Cleared existing test data.');

  // ────────────────────────────────────────────────────────────────────────
  // Helper: compute GST for a line item
  // Company state = Haryana. If customer/vendor place_of_supply is Haryana → intra-state.
  // ────────────────────────────────────────────────────────────────────────
  const COMPANY_STATE = 'Haryana';

  function computeGST(baseAmount, gstRate, placeOfSupply, isExport = false) {
    if (isExport || gstRate === 0) {
      return { igst_amount: 0, cgst_amount: 0, sgst_amount: 0, total_tax: 0 };
    }
    const tax = +(baseAmount * gstRate / 100).toFixed(2);
    if (placeOfSupply === COMPANY_STATE) {
      const half = +(tax / 2).toFixed(2);
      return { igst_amount: 0, cgst_amount: half, sgst_amount: half, total_tax: +(half * 2).toFixed(2) };
    }
    return { igst_amount: tax, cgst_amount: 0, sgst_amount: 0, total_tax: tax };
  }

  function computeLineGST(qty, rate, gstRate, placeOfSupply, isExport = false) {
    const amount = +(qty * rate).toFixed(2);
    const gst = computeGST(amount, gstRate, placeOfSupply, isExport);
    return { amount, ...gst };
  }

  // ────────────────────────────────────────────────────────────────────────
  // 1. CUSTOMERS (5 domestic + 5 export)
  // ────────────────────────────────────────────────────────────────────────
  const domesticCustomers = [
    { display_name: 'Reliance Industries Ltd', company_name: 'Reliance Industries Ltd', customer_type: 'Business', customer_code: 'CUST-001', email: 'accounts@relianceindustries.com', phone: '022-35551234', gstin: '27AABCR1234A1Z5', pan: 'AABCR1234A', place_of_supply: 'Maharashtra', gst_treatment: 'Registered', currency_code: 'INR', payment_terms: 'Net 30', credit_limit: 5000000 },
    { display_name: 'Tata Consultancy Services', company_name: 'Tata Consultancy Services', customer_type: 'Business', customer_code: 'CUST-002', email: 'procurement@tcs.com', phone: '022-67781234', gstin: '27AABCT1234B2Z6', pan: 'AABCT1234B', place_of_supply: 'Maharashtra', gst_treatment: 'Registered', currency_code: 'INR', payment_terms: 'Net 30', credit_limit: 3000000 },
    { display_name: 'Infosys Ltd', company_name: 'Infosys Ltd', customer_type: 'Business', customer_code: 'CUST-003', email: 'vendor.mgmt@infosys.com', phone: '080-22291234', gstin: '29AABCI1234C3Z7', pan: 'AABCI1234C', place_of_supply: 'Karnataka', gst_treatment: 'Registered', currency_code: 'INR', payment_terms: 'Net 45', credit_limit: 2500000 },
    { display_name: 'Wipro Ltd', company_name: 'Wipro Ltd', customer_type: 'Business', customer_code: 'CUST-004', email: 'sourcing@wipro.com', phone: '080-28441234', gstin: '29AABCW1234D4Z8', pan: 'AABCW1234D', place_of_supply: 'Karnataka', gst_treatment: 'Registered', currency_code: 'INR', payment_terms: 'Net 30', credit_limit: 2000000 },
    { display_name: 'HCL Technologies', company_name: 'HCL Technologies', customer_type: 'Business', customer_code: 'CUST-005', email: 'purchase@hcltech.com', phone: '0120-4321234', gstin: '09AABCH1234E5Z9', pan: 'AABCH1234E', place_of_supply: 'Uttar Pradesh', gst_treatment: 'Registered', currency_code: 'INR', payment_terms: 'Net 60', credit_limit: 1500000 },
  ];

  const exportCustomers = [
    { display_name: 'Walmart Inc', company_name: 'Walmart Inc', customer_type: 'Business', customer_code: 'CUST-006', email: 'sourcing@walmart.com', phone: '+1-479-2731234', place_of_supply: 'Other Territory', gst_treatment: 'Overseas', currency_code: 'USD', payment_terms: 'Net 60', credit_limit: 10000000 },
    { display_name: 'H&M Group', company_name: 'H&M Hennes & Mauritz AB', customer_type: 'Business', customer_code: 'CUST-007', email: 'procurement@hm.com', phone: '+46-8-7961234', place_of_supply: 'Other Territory', gst_treatment: 'Overseas', currency_code: 'USD', payment_terms: 'Net 45', credit_limit: 8000000 },
    { display_name: 'Zara Inditex', company_name: 'Industria de Diseno Textil SA', customer_type: 'Business', customer_code: 'CUST-008', email: 'buying@inditex.com', phone: '+34-981-185234', place_of_supply: 'Other Territory', gst_treatment: 'Overseas', currency_code: 'USD', payment_terms: 'Net 45', credit_limit: 7500000 },
    { display_name: 'Primark Ltd', company_name: 'Primark Stores Ltd', customer_type: 'Business', customer_code: 'CUST-009', email: 'sourcing@primark.com', phone: '+44-20-73991234', place_of_supply: 'Other Territory', gst_treatment: 'Overseas', currency_code: 'USD', payment_terms: 'Net 60', credit_limit: 6000000 },
    { display_name: 'Uniqlo Co Ltd', company_name: 'Fast Retailing Co Ltd', customer_type: 'Business', customer_code: 'CUST-010', email: 'procurement@uniqlo.com', phone: '+81-3-62741234', place_of_supply: 'Other Territory', gst_treatment: 'Overseas', currency_code: 'USD', payment_terms: 'Net 30', credit_limit: 5000000 },
  ];

  const allCustomerData = [...domesticCustomers, ...exportCustomers];
  const customerIds = [];
  for (const c of allCustomerData) {
    const [row] = await knex('customers').insert(c).returning('id');
    customerIds.push(typeof row === 'object' ? row.id : row);
  }
  console.log(`Seeded ${customerIds.length} customers.`);

  // Customer addresses
  const custAddresses = [
    { customer_id: customerIds[0], address_type: 'billing', address_line1: 'Maker Chambers IV', city: 'Mumbai', state: 'Maharashtra', pincode: '400021', country: 'India', is_default: true },
    { customer_id: customerIds[1], address_type: 'billing', address_line1: 'TCS House, Raveline Street', city: 'Mumbai', state: 'Maharashtra', pincode: '400001', country: 'India', is_default: true },
    { customer_id: customerIds[2], address_type: 'billing', address_line1: 'Electronics City, Hosur Road', city: 'Bengaluru', state: 'Karnataka', pincode: '560100', country: 'India', is_default: true },
    { customer_id: customerIds[3], address_type: 'billing', address_line1: 'Doddakannelli, Sarjapur Road', city: 'Bengaluru', state: 'Karnataka', pincode: '560035', country: 'India', is_default: true },
    { customer_id: customerIds[4], address_type: 'billing', address_line1: 'Sector 126, Noida', city: 'Noida', state: 'Uttar Pradesh', pincode: '201304', country: 'India', is_default: true },
    { customer_id: customerIds[5], address_type: 'billing', address_line1: '702 SW 8th Street', city: 'Bentonville', state: 'Arkansas', pincode: '72716', country: 'United States', is_default: true },
    { customer_id: customerIds[6], address_type: 'billing', address_line1: 'Mäster Samuelsgatan 46A', city: 'Stockholm', state: '', pincode: '106 38', country: 'Sweden', is_default: true },
    { customer_id: customerIds[7], address_type: 'billing', address_line1: 'Avenida de la Diputacion', city: 'Arteixo', state: 'A Coruna', pincode: '15142', country: 'Spain', is_default: true },
    { customer_id: customerIds[8], address_type: 'billing', address_line1: '22 Weston Street', city: 'London', state: '', pincode: 'SE1 3ER', country: 'United Kingdom', is_default: true },
    { customer_id: customerIds[9], address_type: 'billing', address_line1: 'Midtown Tower, 9-7-1 Akasaka', city: 'Tokyo', state: '', pincode: '107-6231', country: 'Japan', is_default: true },
  ];
  await knex('customer_addresses').insert(custAddresses);

  // ────────────────────────────────────────────────────────────────────────
  // 2. VENDORS (5 domestic + 5 import)
  // ────────────────────────────────────────────────────────────────────────
  const domesticVendors = [
    { display_name: 'Arvind Mills Ltd', company_name: 'Arvind Mills Ltd', vendor_type: 'Business', vendor_code: 'VEN-001', email: 'sales@arvindmills.com', phone: '079-66561234', gstin: '24AABCA1234F1Z5', pan: 'AABCA1234F', place_of_supply: 'Gujarat', gst_treatment: 'Registered', currency_code: 'INR', payment_terms: 'Net 30', tds_section: '194C', tds_rate: 2.0 },
    { display_name: 'Raymond Ltd', company_name: 'Raymond Ltd', vendor_type: 'Business', vendor_code: 'VEN-002', email: 'corporate@raymond.in', phone: '022-27641234', gstin: '27AABCR5678G2Z6', pan: 'AABCR5678G', place_of_supply: 'Maharashtra', gst_treatment: 'Registered', currency_code: 'INR', payment_terms: 'Net 30', tds_section: '194C', tds_rate: 2.0 },
    { display_name: 'Welspun India', company_name: 'Welspun India Ltd', vendor_type: 'Business', vendor_code: 'VEN-003', email: 'sales@welspun.com', phone: '022-66131234', gstin: '24AABCW9012H3Z7', pan: 'AABCW9012H', place_of_supply: 'Gujarat', gst_treatment: 'Registered', currency_code: 'INR', payment_terms: 'Net 45', tds_section: '194C', tds_rate: 2.0 },
    { display_name: 'Bombay Dyeing', company_name: 'Bombay Dyeing & Mfg Co Ltd', vendor_type: 'Business', vendor_code: 'VEN-004', email: 'sales@bombaydyeing.com', phone: '022-24931234', gstin: '27AABCB3456I4Z8', pan: 'AABCB3456I', place_of_supply: 'Maharashtra', gst_treatment: 'Registered', currency_code: 'INR', payment_terms: 'Net 30', tds_section: '194C', tds_rate: 2.0 },
    { display_name: 'Page Industries', company_name: 'Page Industries Ltd', vendor_type: 'Business', vendor_code: 'VEN-005', email: 'supply@pageindustries.com', phone: '080-30251234', gstin: '29AABCP7890J5Z9', pan: 'AABCP7890J', place_of_supply: 'Karnataka', gst_treatment: 'Registered', currency_code: 'INR', payment_terms: 'Net 30', tds_section: '194C', tds_rate: 2.0 },
  ];

  const importVendors = [
    { display_name: 'YKK Corporation', company_name: 'YKK Corporation', vendor_type: 'Business', vendor_code: 'VEN-006', email: 'export@ykk.co.jp', phone: '+81-3-38641234', place_of_supply: 'Other Territory', gst_treatment: 'Overseas', currency_code: 'USD', payment_terms: 'Net 60' },
    { display_name: 'Coats Group PLC', company_name: 'Coats Group PLC', vendor_type: 'Business', vendor_code: 'VEN-007', email: 'sales@coats.com', phone: '+44-20-82101234', place_of_supply: 'Other Territory', gst_treatment: 'Overseas', currency_code: 'USD', payment_terms: 'Net 45' },
    { display_name: 'Lenzing AG', company_name: 'Lenzing AG', vendor_type: 'Business', vendor_code: 'VEN-008', email: 'fibers@lenzing.com', phone: '+43-7672-7011234', place_of_supply: 'Other Territory', gst_treatment: 'Overseas', currency_code: 'USD', payment_terms: 'Net 45' },
    { display_name: 'Invista Koch', company_name: 'Invista Textiles UK Ltd', vendor_type: 'Business', vendor_code: 'VEN-009', email: 'sales@invista.com', phone: '+1-316-8281234', place_of_supply: 'Other Territory', gst_treatment: 'Overseas', currency_code: 'USD', payment_terms: 'Net 30' },
    { display_name: 'Toray Industries', company_name: 'Toray Industries Inc', vendor_type: 'Business', vendor_code: 'VEN-010', email: 'textile@toray.co.jp', phone: '+81-3-32451234', place_of_supply: 'Other Territory', gst_treatment: 'Overseas', currency_code: 'USD', payment_terms: 'Net 60' },
  ];

  const allVendorData = [...domesticVendors, ...importVendors];
  const vendorIds = [];
  for (const v of allVendorData) {
    const [row] = await knex('vendors').insert(v).returning('id');
    vendorIds.push(typeof row === 'object' ? row.id : row);
  }
  console.log(`Seeded ${vendorIds.length} vendors.`);

  // Vendor addresses
  const venAddresses = [
    { vendor_id: vendorIds[0], address_type: 'billing', address_line1: 'Naroda Road', city: 'Ahmedabad', state: 'Gujarat', pincode: '380025', country: 'India', is_default: true },
    { vendor_id: vendorIds[1], address_type: 'billing', address_line1: 'Mahim Junction', city: 'Mumbai', state: 'Maharashtra', pincode: '400016', country: 'India', is_default: true },
    { vendor_id: vendorIds[2], address_type: 'billing', address_line1: 'Althan, Surat', city: 'Surat', state: 'Gujarat', pincode: '395017', country: 'India', is_default: true },
    { vendor_id: vendorIds[3], address_type: 'billing', address_line1: 'Neville House, Ballard Estate', city: 'Mumbai', state: 'Maharashtra', pincode: '400001', country: 'India', is_default: true },
    { vendor_id: vendorIds[4], address_type: 'billing', address_line1: 'Cesna Business Park, Marathahalli', city: 'Bengaluru', state: 'Karnataka', pincode: '560037', country: 'India', is_default: true },
    { vendor_id: vendorIds[5], address_type: 'billing', address_line1: '1 Kanda Izumi-cho, Chiyoda-ku', city: 'Tokyo', state: '', pincode: '101-8642', country: 'Japan', is_default: true },
    { vendor_id: vendorIds[6], address_type: 'billing', address_line1: '1 The Square, Stockley Park', city: 'Uxbridge', state: '', pincode: 'UB11 1TD', country: 'United Kingdom', is_default: true },
    { vendor_id: vendorIds[7], address_type: 'billing', address_line1: 'Werkstrasse 2', city: 'Lenzing', state: '', pincode: '4860', country: 'Austria', is_default: true },
    { vendor_id: vendorIds[8], address_type: 'billing', address_line1: '4123 East 37th Street North', city: 'Wichita', state: 'Kansas', pincode: '67220', country: 'United States', is_default: true },
    { vendor_id: vendorIds[9], address_type: 'billing', address_line1: 'Nihonbashi-Muromachi 2-1-1', city: 'Tokyo', state: '', pincode: '103-8666', country: 'Japan', is_default: true },
  ];
  await knex('vendor_addresses').insert(venAddresses);

  // ────────────────────────────────────────────────────────────────────────
  // 3. ITEMS
  // ────────────────────────────────────────────────────────────────────────
  const itemsData = [
    { name: 'Cotton Fabric 40s', item_type: 'Goods', sku: 'FAB-COT-40S', unit: 'm', hsn_code: '5208', gst_rate: 5, selling_price: 250, cost_price: 180, content: '100% Cotton', description: 'Cotton Fabric 40s count, 58 inch width' },
    { name: 'Polyester Yarn 150D', item_type: 'Goods', sku: 'YRN-POLY-150D', unit: 'kg', hsn_code: '5402', gst_rate: 12, selling_price: 180, cost_price: 130, content: '100% Polyester', description: 'Polyester Yarn 150 Denier, FDY' },
    { name: 'Silk Thread', item_type: 'Goods', sku: 'THR-SILK-001', unit: 'kg', hsn_code: '5004', gst_rate: 5, selling_price: 450, cost_price: 350, content: '100% Silk', description: 'Pure Silk Thread for embroidery and weaving' },
    { name: 'Denim Fabric', item_type: 'Goods', sku: 'FAB-DEN-001', unit: 'm', hsn_code: '5209', gst_rate: 12, selling_price: 320, cost_price: 240, content: 'Cotton/Spandex 98/2', description: 'Denim Fabric 12oz, 60 inch width, indigo' },
    { name: 'Zippers YKK', item_type: 'Goods', sku: 'TRM-ZIP-YKK', unit: 'pcs', hsn_code: '9607', gst_rate: 18, selling_price: 15, cost_price: 8, content: 'Nylon', description: 'YKK Nylon Zippers, 7 inch, assorted colors' },
  ];

  const itemIds = [];
  for (const it of itemsData) {
    const [row] = await knex('items').insert(it).returning('id');
    itemIds.push(typeof row === 'object' ? row.id : row);
  }
  console.log(`Seeded ${itemIds.length} items.`);

  // ────────────────────────────────────────────────────────────────────────
  // 4. DEPARTMENTS & EMPLOYEES
  // ────────────────────────────────────────────────────────────────────────
  const deptData = [
    { name: 'Production' },
    { name: 'Accounts' },
    { name: 'Sales' },
    { name: 'HR' },
    { name: 'Warehouse' },
  ];
  const deptIds = [];
  for (const d of deptData) {
    const [row] = await knex('departments').insert(d).returning('id');
    deptIds.push(typeof row === 'object' ? row.id : row);
  }

  const employeesData = [
    { employee_id: 'EMP-001', first_name: 'Rajesh', last_name: 'Kumar', display_name: 'Rajesh Kumar', designation: 'Factory Manager', department_id: deptIds[0], date_of_joining: '2020-04-15', gender: 'Male', date_of_birth: '1985-03-12', mobile_number: '9876543201', work_email: 'rajesh@navodita.com', pan_number: 'AKLPK1234A', bank_name: 'HDFC Bank', bank_account_number: '50100012345678', bank_ifsc_code: 'HDFC0001234', basic_salary: 65000, hra: 26000, dearness_allowance: 6500, conveyance_allowance: 1600, medical_allowance: 1250, special_allowance: 19650, gross_salary: 120000, ctc: 156000, is_pf_applicable: true, tax_regime: 'New', employment_type: 'Full-time', employment_status: 'Active' },
    { employee_id: 'EMP-002', first_name: 'Priya', last_name: 'Sharma', display_name: 'Priya Sharma', designation: 'Senior Accountant', department_id: deptIds[1], date_of_joining: '2021-01-10', gender: 'Female', date_of_birth: '1990-07-22', mobile_number: '9876543202', work_email: 'priya@navodita.com', pan_number: 'BKLPS5678B', bank_name: 'SBI', bank_account_number: '30200012345678', bank_ifsc_code: 'SBIN0001234', basic_salary: 55000, hra: 22000, dearness_allowance: 5500, conveyance_allowance: 1600, medical_allowance: 1250, special_allowance: 14650, gross_salary: 100000, ctc: 130000, is_pf_applicable: true, tax_regime: 'New', employment_type: 'Full-time', employment_status: 'Active' },
    { employee_id: 'EMP-003', first_name: 'Amit', last_name: 'Patel', display_name: 'Amit Patel', designation: 'Sales Executive', department_id: deptIds[2], date_of_joining: '2022-06-01', gender: 'Male', date_of_birth: '1993-11-05', mobile_number: '9876543203', work_email: 'amit@navodita.com', pan_number: 'CKLPA9012C', bank_name: 'ICICI Bank', bank_account_number: '10200012345678', bank_ifsc_code: 'ICIC0001234', basic_salary: 40000, hra: 16000, dearness_allowance: 4000, conveyance_allowance: 1600, medical_allowance: 1250, special_allowance: 12150, gross_salary: 75000, ctc: 97500, is_pf_applicable: true, tax_regime: 'New', employment_type: 'Full-time', employment_status: 'Active' },
    { employee_id: 'EMP-004', first_name: 'Sneha', last_name: 'Gupta', display_name: 'Sneha Gupta', designation: 'HR Manager', department_id: deptIds[3], date_of_joining: '2019-09-20', gender: 'Female', date_of_birth: '1988-01-15', mobile_number: '9876543204', work_email: 'sneha@navodita.com', pan_number: 'DKLPG3456D', bank_name: 'Kotak Mahindra Bank', bank_account_number: '40300012345678', bank_ifsc_code: 'KKBK0001234', basic_salary: 60000, hra: 24000, dearness_allowance: 6000, conveyance_allowance: 1600, medical_allowance: 1250, special_allowance: 17150, gross_salary: 110000, ctc: 143000, is_pf_applicable: true, tax_regime: 'Old', employment_type: 'Full-time', employment_status: 'Active' },
    { employee_id: 'EMP-005', first_name: 'Vikram', last_name: 'Singh', display_name: 'Vikram Singh', designation: 'Store Keeper', department_id: deptIds[4], date_of_joining: '2023-02-01', gender: 'Male', date_of_birth: '1995-08-30', mobile_number: '9876543205', work_email: 'vikram@navodita.com', pan_number: 'EKLPS7890E', bank_name: 'PNB', bank_account_number: '20100012345678', bank_ifsc_code: 'PUNB0001234', basic_salary: 30000, hra: 12000, dearness_allowance: 3000, conveyance_allowance: 1600, medical_allowance: 1250, special_allowance: 7150, gross_salary: 55000, ctc: 71500, is_pf_applicable: true, tax_regime: 'New', employment_type: 'Full-time', employment_status: 'Active' },
  ];

  const employeeIds = [];
  for (const e of employeesData) {
    const [row] = await knex('employees').insert(e).returning('id');
    employeeIds.push(typeof row === 'object' ? row.id : row);
  }
  console.log(`Seeded ${employeeIds.length} employees.`);

  // ────────────────────────────────────────────────────────────────────────
  // 5. BANK ACCOUNTS
  // ────────────────────────────────────────────────────────────────────────
  const bankAccountsData = [
    { account_name: 'Navodita Current A/C', account_number: '4011123456789', bank_name: 'Kotak Mahindra Bank', branch_name: 'Gurugram Main', ifsc_code: 'KKBK0000123', account_type: 'Current', currency_code: 'INR', opening_balance: 1250000, current_balance: 1250000, is_primary: true },
    { account_name: 'Navodita Savings A/C', account_number: '50100098765432', bank_name: 'HDFC Bank', branch_name: 'Sector 44, Gurugram', ifsc_code: 'HDFC0001234', account_type: 'Savings', currency_code: 'INR', opening_balance: 875000, current_balance: 875000, is_primary: false },
    { account_name: 'Navodita ICICI A/C', account_number: '102010012345678', bank_name: 'ICICI Bank', branch_name: 'Cyber City, Gurugram', ifsc_code: 'ICIC0000567', account_type: 'Current', currency_code: 'INR', opening_balance: 543000, current_balance: 543000, is_primary: false },
    { account_name: 'Petty Cash', account_number: null, bank_name: null, branch_name: null, ifsc_code: null, account_type: 'Cash', currency_code: 'INR', opening_balance: 25000, current_balance: 25000, is_primary: false },
    { account_name: 'Export Receipts A/C', account_number: '38901234567890', bank_name: 'State Bank of India', branch_name: 'Gurugram Industrial', ifsc_code: 'SBIN0005678', swift_code: 'SBININBB', account_type: 'Current', currency_code: 'INR', opening_balance: 2100000, current_balance: 2100000, is_primary: false },
  ];

  const bankAccountIds = [];
  for (const b of bankAccountsData) {
    const [row] = await knex('bank_accounts').insert(b).returning('id');
    bankAccountIds.push(typeof row === 'object' ? row.id : row);
  }
  console.log(`Seeded ${bankAccountIds.length} bank accounts.`);

  // ────────────────────────────────────────────────────────────────────────
  // 6. DOMESTIC INVOICES (5) with 2 line items each
  // ────────────────────────────────────────────────────────────────────────
  // Item references: 0=Cotton(5%), 1=Polyester(12%), 2=Silk(5%), 3=Denim(12%), 4=Zippers(18%)
  const domesticInvoiceDefs = [
    { num: 'INV-25-26/0001', custIdx: 0, status: 'Draft', dateOffset: -75, dueOffset: -45, items: [{idx:0, qty:500, rate:250}, {idx:1, qty:200, rate:180}] },
    { num: 'INV-25-26/0002', custIdx: 1, status: 'Final', dateOffset: -60, dueOffset: -30, items: [{idx:1, qty:300, rate:180}, {idx:2, qty:100, rate:450}] },
    { num: 'INV-25-26/0003', custIdx: 2, status: 'Paid', dateOffset: -50, dueOffset: -20, items: [{idx:0, qty:400, rate:250}, {idx:3, qty:250, rate:320}] },
    { num: 'INV-25-26/0004', custIdx: 3, status: 'Overdue', dateOffset: -90, dueOffset: -60, items: [{idx:2, qty:150, rate:450}, {idx:4, qty:2000, rate:15}] },
    { num: 'INV-25-26/0005', custIdx: 4, status: 'Partial', dateOffset: -40, dueOffset: -10, items: [{idx:3, qty:350, rate:320}, {idx:4, qty:5000, rate:15}] },
  ];

  const invoiceIds = [];
  const invoiceTotals = []; // store total_amount for payment allocations

  for (const def of domesticInvoiceDefs) {
    const custState = domesticCustomers[def.custIdx].place_of_supply;
    const invoiceDate = new Date();
    invoiceDate.setDate(invoiceDate.getDate() + def.dateOffset);
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + def.dueOffset);

    let sub_total = 0;
    let total_igst = 0, total_cgst = 0, total_sgst = 0;
    const lineItems = [];

    for (const li of def.items) {
      const gstRate = itemsData[li.idx].gst_rate;
      const calc = computeLineGST(li.qty, li.rate, gstRate, custState);
      sub_total += calc.amount;
      total_igst += calc.igst_amount;
      total_cgst += calc.cgst_amount;
      total_sgst += calc.sgst_amount;
      lineItems.push({
        item_id: itemIds[li.idx],
        item_name: itemsData[li.idx].name,
        hsn_code: itemsData[li.idx].hsn_code,
        quantity: li.qty,
        unit: itemsData[li.idx].unit,
        rate: li.rate,
        gst_rate: gstRate,
        igst_amount: calc.igst_amount,
        cgst_amount: calc.cgst_amount,
        sgst_amount: calc.sgst_amount,
        amount: calc.amount,
        sort_order: lineItems.length,
      });
    }

    const total_tax = +(total_igst + total_cgst + total_sgst).toFixed(2);
    const total_amount = +(sub_total + total_tax).toFixed(2);
    let amount_paid = 0;
    if (def.status === 'Paid') amount_paid = total_amount;
    else if (def.status === 'Partial') amount_paid = +(total_amount * 0.5).toFixed(2);
    const balance_due = +(total_amount - amount_paid).toFixed(2);

    const [invRow] = await knex('invoices').insert({
      invoice_number: def.num,
      customer_id: customerIds[def.custIdx],
      invoice_date: invoiceDate.toISOString().slice(0, 10),
      due_date: dueDate.toISOString().slice(0, 10),
      status: def.status,
      place_of_supply: custState,
      sub_total, discount_amount: 0, discount_type: 'flat',
      igst_amount: total_igst, cgst_amount: total_cgst, sgst_amount: total_sgst,
      total_tax, shipping_charge: 0, round_off: 0,
      total_amount, amount_paid, balance_due,
      currency_code: 'INR', exchange_rate: 1.0,
      is_export: false,
    }).returning('id');
    const invId = typeof invRow === 'object' ? invRow.id : invRow;
    invoiceIds.push(invId);
    invoiceTotals.push({ total_amount, amount_paid, status: def.status });

    for (const li of lineItems) {
      li.invoice_id = invId;
    }
    await knex('invoice_items').insert(lineItems);
  }
  console.log(`Seeded ${invoiceIds.length} domestic invoices.`);

  // ────────────────────────────────────────────────────────────────────────
  // 7. EXPORT INVOICES (5) - USD, 0% GST, exchange_rate 83.25
  // ────────────────────────────────────────────────────────────────────────
  const exportInvoiceDefs = [
    { num: 'INV-25-26/0006', custIdx: 5, status: 'Final', dateOffset: -65, dueOffset: -5, items: [{idx:0, qty:1000, rate:3.00}, {idx:3, qty:500, rate:3.85}] },
    { num: 'INV-25-26/0007', custIdx: 6, status: 'Paid', dateOffset: -55, dueOffset: 5, items: [{idx:0, qty:800, rate:3.00}, {idx:2, qty:200, rate:5.40}] },
    { num: 'INV-25-26/0008', custIdx: 7, status: 'Final', dateOffset: -45, dueOffset: 15, items: [{idx:1, qty:600, rate:2.16}, {idx:4, qty:10000, rate:0.18}] },
    { num: 'INV-25-26/0009', custIdx: 8, status: 'Partial', dateOffset: -35, dueOffset: 25, items: [{idx:3, qty:700, rate:3.85}, {idx:0, qty:500, rate:3.00}] },
    { num: 'INV-25-26/0010', custIdx: 9, status: 'Draft', dateOffset: -20, dueOffset: 40, items: [{idx:2, qty:300, rate:5.40}, {idx:4, qty:8000, rate:0.18}] },
  ];

  const exportInvoiceIds = [];
  const exportInvoiceTotals = [];

  for (const def of exportInvoiceDefs) {
    const invoiceDate = new Date();
    invoiceDate.setDate(invoiceDate.getDate() + def.dateOffset);
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + def.dueOffset);

    let sub_total = 0;
    const lineItems = [];

    for (const li of def.items) {
      const amount = +(li.qty * li.rate).toFixed(2);
      sub_total += amount;
      lineItems.push({
        item_id: itemIds[li.idx],
        item_name: itemsData[li.idx].name,
        hsn_code: itemsData[li.idx].hsn_code,
        quantity: li.qty,
        unit: itemsData[li.idx].unit,
        rate: li.rate,
        gst_rate: 0,
        igst_amount: 0, cgst_amount: 0, sgst_amount: 0,
        amount,
        sort_order: lineItems.length,
      });
    }

    const total_amount = +sub_total.toFixed(2);
    let amount_paid = 0;
    if (def.status === 'Paid') amount_paid = total_amount;
    else if (def.status === 'Partial') amount_paid = +(total_amount * 0.5).toFixed(2);
    const balance_due = +(total_amount - amount_paid).toFixed(2);

    const [invRow] = await knex('invoices').insert({
      invoice_number: def.num,
      customer_id: customerIds[def.custIdx],
      invoice_date: invoiceDate.toISOString().slice(0, 10),
      due_date: dueDate.toISOString().slice(0, 10),
      status: def.status,
      place_of_supply: 'Other Territory',
      sub_total, discount_amount: 0, discount_type: 'flat',
      igst_amount: 0, cgst_amount: 0, sgst_amount: 0,
      total_tax: 0, shipping_charge: 0, round_off: 0,
      total_amount, amount_paid, balance_due,
      currency_code: 'USD', exchange_rate: 83.25,
      is_export: true, export_type: 'With Payment',
      is_lut_applicable: true,
    }).returning('id');
    const invId = typeof invRow === 'object' ? invRow.id : invRow;
    exportInvoiceIds.push(invId);
    exportInvoiceTotals.push({ total_amount, amount_paid, status: def.status });

    for (const li of lineItems) {
      li.invoice_id = invId;
    }
    await knex('invoice_items').insert(lineItems);
  }
  console.log(`Seeded ${exportInvoiceIds.length} export invoices.`);

  // ────────────────────────────────────────────────────────────────────────
  // 8. BILLS (5 domestic) with 2 line items each
  // ────────────────────────────────────────────────────────────────────────
  const billDefs = [
    { num: 'BILL-25-26/0001', venIdx: 0, status: 'Pending', dateOffset: -70, dueOffset: -40, items: [{idx:0, qty:600, rate:180}, {idx:1, qty:300, rate:130}] },
    { num: 'BILL-25-26/0002', venIdx: 1, status: 'Paid', dateOffset: -55, dueOffset: -25, items: [{idx:3, qty:400, rate:240}, {idx:2, qty:80, rate:350}] },
    { num: 'BILL-25-26/0003', venIdx: 2, status: 'Pending', dateOffset: -45, dueOffset: -15, items: [{idx:0, qty:500, rate:180}, {idx:4, qty:3000, rate:8}] },
    { num: 'BILL-25-26/0004', venIdx: 3, status: 'Partial', dateOffset: -35, dueOffset: -5, items: [{idx:1, qty:250, rate:130}, {idx:3, qty:300, rate:240}] },
    { num: 'BILL-25-26/0005', venIdx: 4, status: 'Pending', dateOffset: -25, dueOffset: 5, items: [{idx:2, qty:120, rate:350}, {idx:4, qty:5000, rate:8}] },
  ];

  const billIds = [];
  const billTotals = [];

  for (const def of billDefs) {
    const venState = domesticVendors[def.venIdx].place_of_supply;
    const billDate = new Date();
    billDate.setDate(billDate.getDate() + def.dateOffset);
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + def.dueOffset);

    let sub_total = 0;
    let total_igst = 0, total_cgst = 0, total_sgst = 0;
    const lineItems = [];

    for (const li of def.items) {
      const gstRate = itemsData[li.idx].gst_rate;
      const calc = computeLineGST(li.qty, li.rate, gstRate, venState);
      sub_total += calc.amount;
      total_igst += calc.igst_amount;
      total_cgst += calc.cgst_amount;
      total_sgst += calc.sgst_amount;
      lineItems.push({
        item_id: itemIds[li.idx],
        item_name: itemsData[li.idx].name,
        hsn_code: itemsData[li.idx].hsn_code,
        quantity: li.qty,
        unit: itemsData[li.idx].unit,
        rate: li.rate,
        gst_rate: gstRate,
        igst_amount: calc.igst_amount,
        cgst_amount: calc.cgst_amount,
        sgst_amount: calc.sgst_amount,
        amount: calc.amount,
        sort_order: lineItems.length,
      });
    }

    const total_tax = +(total_igst + total_cgst + total_sgst).toFixed(2);
    const total_amount = +(sub_total + total_tax).toFixed(2);
    let amount_paid = 0;
    if (def.status === 'Paid') amount_paid = total_amount;
    else if (def.status === 'Partial') amount_paid = +(total_amount * 0.5).toFixed(2);
    const balance_due = +(total_amount - amount_paid).toFixed(2);

    const [billRow] = await knex('bills').insert({
      bill_number: def.num,
      vendor_id: vendorIds[def.venIdx],
      bill_date: billDate.toISOString().slice(0, 10),
      due_date: dueDate.toISOString().slice(0, 10),
      status: def.status,
      place_of_supply: venState,
      sub_total, discount_amount: 0, discount_type: 'flat',
      igst_amount: total_igst, cgst_amount: total_cgst, sgst_amount: total_sgst,
      total_tax, tds_amount: 0,
      total_amount, amount_paid, balance_due,
      currency_code: 'INR', exchange_rate: 1.0,
    }).returning('id');
    const billId = typeof billRow === 'object' ? billRow.id : billRow;
    billIds.push(billId);
    billTotals.push({ total_amount, amount_paid, status: def.status });

    for (const li of lineItems) {
      li.bill_id = billId;
    }
    await knex('bill_items').insert(lineItems);
  }
  console.log(`Seeded ${billIds.length} bills.`);

  // ────────────────────────────────────────────────────────────────────────
  // 9. QUOTATIONS (5)
  // ────────────────────────────────────────────────────────────────────────
  const quotationDefs = [
    { num: 'QTN-25-26/0001', custIdx: 0, status: 'Draft', dateOffset: -80, expiryOffset: -50, items: [{idx:0, qty:1000, rate:250}, {idx:1, qty:500, rate:180}] },
    { num: 'QTN-25-26/0002', custIdx: 2, status: 'Sent', dateOffset: -70, expiryOffset: -40, items: [{idx:2, qty:200, rate:450}, {idx:3, qty:300, rate:320}] },
    { num: 'QTN-25-26/0003', custIdx: 5, status: 'Accepted', dateOffset: -60, expiryOffset: -30, items: [{idx:0, qty:2000, rate:3.00}, {idx:4, qty:10000, rate:0.18}] },
    { num: 'QTN-25-26/0004', custIdx: 3, status: 'Draft', dateOffset: -30, expiryOffset: 0, items: [{idx:3, qty:400, rate:320}, {idx:4, qty:3000, rate:15}] },
    { num: 'QTN-25-26/0005', custIdx: 7, status: 'Sent', dateOffset: -15, expiryOffset: 15, items: [{idx:1, qty:800, rate:2.16}, {idx:2, qty:150, rate:5.40}] },
  ];

  const quotationIds = [];
  for (const def of quotationDefs) {
    const isExport = def.custIdx >= 5;
    const custState = isExport ? 'Other Territory' : domesticCustomers[def.custIdx].place_of_supply;
    const qDate = new Date(); qDate.setDate(qDate.getDate() + def.dateOffset);
    const expDate = new Date(); expDate.setDate(expDate.getDate() + def.expiryOffset);

    let sub_total = 0;
    let total_igst = 0, total_cgst = 0, total_sgst = 0;
    const lineItems = [];

    for (const li of def.items) {
      const gstRate = isExport ? 0 : itemsData[li.idx].gst_rate;
      const calc = computeLineGST(li.qty, li.rate, gstRate, custState, isExport);
      sub_total += calc.amount;
      total_igst += calc.igst_amount;
      total_cgst += calc.cgst_amount;
      total_sgst += calc.sgst_amount;
      lineItems.push({
        item_id: itemIds[li.idx],
        item_name: itemsData[li.idx].name,
        hsn_code: itemsData[li.idx].hsn_code,
        quantity: li.qty,
        unit: itemsData[li.idx].unit,
        rate: li.rate,
        gst_rate: gstRate,
        igst_amount: calc.igst_amount,
        cgst_amount: calc.cgst_amount,
        sgst_amount: calc.sgst_amount,
        amount: calc.amount,
        sort_order: lineItems.length,
      });
    }

    const total_tax = +(total_igst + total_cgst + total_sgst).toFixed(2);
    const total_amount = +(sub_total + total_tax).toFixed(2);

    const [qRow] = await knex('quotations').insert({
      quotation_number: def.num,
      customer_id: customerIds[def.custIdx],
      quotation_date: qDate.toISOString().slice(0, 10),
      expiry_date: expDate.toISOString().slice(0, 10),
      status: def.status,
      place_of_supply: custState,
      sub_total, discount_amount: 0, discount_type: 'flat',
      igst_amount: total_igst, cgst_amount: total_cgst, sgst_amount: total_sgst,
      total_tax, total_amount,
      currency_code: isExport ? 'USD' : 'INR',
      exchange_rate: isExport ? 83.25 : 1.0,
    }).returning('id');
    const qId = typeof qRow === 'object' ? qRow.id : qRow;
    quotationIds.push(qId);

    for (const li of lineItems) {
      li.quotation_id = qId;
    }
    await knex('quotation_items').insert(lineItems);
  }
  console.log(`Seeded ${quotationIds.length} quotations.`);

  // ────────────────────────────────────────────────────────────────────────
  // 10. PURCHASE ORDERS (5)
  // ────────────────────────────────────────────────────────────────────────
  const poDefs = [
    { num: 'PO-25-26/0001', venIdx: 0, status: 'Issued', dateOffset: -85, expOffset: -55, items: [{idx:0, qty:1000, rate:180}, {idx:1, qty:400, rate:130}] },
    { num: 'PO-25-26/0002', venIdx: 1, status: 'Received', dateOffset: -70, expOffset: -40, items: [{idx:3, qty:500, rate:240}, {idx:2, qty:100, rate:350}] },
    { num: 'PO-25-26/0003', venIdx: 2, status: 'Draft', dateOffset: -40, expOffset: -10, items: [{idx:0, qty:800, rate:180}, {idx:4, qty:5000, rate:8}] },
    { num: 'PO-25-26/0004', venIdx: 3, status: 'Issued', dateOffset: -30, expOffset: 0, items: [{idx:1, qty:300, rate:130}, {idx:3, qty:350, rate:240}] },
    { num: 'PO-25-26/0005', venIdx: 4, status: 'Partial', dateOffset: -20, expOffset: 10, items: [{idx:2, qty:150, rate:350}, {idx:4, qty:8000, rate:8}] },
  ];

  const poIds = [];
  for (const def of poDefs) {
    const venState = domesticVendors[def.venIdx].place_of_supply;
    const poDate = new Date(); poDate.setDate(poDate.getDate() + def.dateOffset);
    const expDate = new Date(); expDate.setDate(expDate.getDate() + def.expOffset);

    let sub_total = 0;
    let total_igst = 0, total_cgst = 0, total_sgst = 0;
    const lineItems = [];

    for (const li of def.items) {
      const gstRate = itemsData[li.idx].gst_rate;
      const calc = computeLineGST(li.qty, li.rate, gstRate, venState);
      sub_total += calc.amount;
      total_igst += calc.igst_amount;
      total_cgst += calc.cgst_amount;
      total_sgst += calc.sgst_amount;
      lineItems.push({
        item_id: itemIds[li.idx],
        item_name: itemsData[li.idx].name,
        hsn_code: itemsData[li.idx].hsn_code,
        ordered_quantity: li.qty,
        received_quantity: def.status === 'Received' ? li.qty : (def.status === 'Partial' ? Math.floor(li.qty / 2) : 0),
        unit: itemsData[li.idx].unit,
        rate: li.rate,
        gst_rate: gstRate,
        igst_amount: calc.igst_amount,
        cgst_amount: calc.cgst_amount,
        sgst_amount: calc.sgst_amount,
        amount: calc.amount,
        sort_order: lineItems.length,
      });
    }

    const total_tax = +(total_igst + total_cgst + total_sgst).toFixed(2);
    const total_amount = +(sub_total + total_tax).toFixed(2);

    const [poRow] = await knex('purchase_orders').insert({
      po_number: def.num,
      vendor_id: vendorIds[def.venIdx],
      po_date: poDate.toISOString().slice(0, 10),
      expected_delivery_date: expDate.toISOString().slice(0, 10),
      status: def.status,
      place_of_supply: venState,
      sub_total, discount_amount: 0, discount_type: 'flat',
      igst_amount: total_igst, cgst_amount: total_cgst, sgst_amount: total_sgst,
      total_tax, shipping_charge: 0,
      total_amount,
      currency_code: 'INR', exchange_rate: 1.0,
    }).returning('id');
    const poId = typeof poRow === 'object' ? poRow.id : poRow;
    poIds.push(poId);

    for (const li of lineItems) {
      li.purchase_order_id = poId;
    }
    await knex('purchase_order_items').insert(lineItems);
  }
  console.log(`Seeded ${poIds.length} purchase orders.`);

  // ────────────────────────────────────────────────────────────────────────
  // 11. DELIVERY CHALLANS (5)
  // ────────────────────────────────────────────────────────────────────────
  const dcDefs = [
    { num: 'DC-25-26/0001', custIdx: 0, invIdx: 0, dateOffset: -73, type: 'Supply', items: [{idx:0, qty:500, rate:250}, {idx:1, qty:200, rate:180}] },
    { num: 'DC-25-26/0002', custIdx: 1, invIdx: 1, dateOffset: -58, type: 'Supply', items: [{idx:1, qty:300, rate:180}, {idx:2, qty:100, rate:450}] },
    { num: 'DC-25-26/0003', custIdx: 2, invIdx: 2, dateOffset: -48, type: 'Job Work', items: [{idx:0, qty:400, rate:250}, {idx:3, qty:250, rate:320}] },
    { num: 'DC-25-26/0004', custIdx: 3, invIdx: 3, dateOffset: -88, type: 'Supply', items: [{idx:2, qty:150, rate:450}, {idx:4, qty:2000, rate:15}] },
    { num: 'DC-25-26/0005', custIdx: 4, invIdx: 4, dateOffset: -38, type: 'Delivery', items: [{idx:3, qty:350, rate:320}, {idx:4, qty:5000, rate:15}] },
  ];

  for (const def of dcDefs) {
    const dcDate = new Date(); dcDate.setDate(dcDate.getDate() + def.dateOffset);
    let totalQty = 0, totalAmt = 0;
    const lineItems = [];
    for (const li of def.items) {
      const amt = +(li.qty * li.rate).toFixed(2);
      totalQty += li.qty;
      totalAmt += amt;
      lineItems.push({
        item_id: itemIds[li.idx], item_name: itemsData[li.idx].name, hsn_code: itemsData[li.idx].hsn_code,
        quantity: li.qty, unit: itemsData[li.idx].unit, rate: li.rate, amount: amt, sort_order: lineItems.length,
      });
    }
    const [dcRow] = await knex('delivery_challans').insert({
      challan_number: def.num, invoice_id: invoiceIds[def.invIdx], customer_id: customerIds[def.custIdx],
      challan_date: dcDate.toISOString().slice(0, 10), status: 'Draft', challan_type: def.type,
      transporter_name: 'Gati Express', vehicle_number: 'HR-06-AB-' + (1234 + dcDefs.indexOf(def)),
      total_quantity: totalQty, total_amount: +totalAmt.toFixed(2),
    }).returning('id');
    const dcId = typeof dcRow === 'object' ? dcRow.id : dcRow;
    for (const li of lineItems) li.delivery_challan_id = dcId;
    await knex('delivery_challan_items').insert(lineItems);
  }
  console.log('Seeded 5 delivery challans.');

  // ────────────────────────────────────────────────────────────────────────
  // 12. PACKING LISTS (5)
  // ────────────────────────────────────────────────────────────────────────
  const plDefs = [
    { num: 'PL-25-26/0001', custIdx: 5, invIdx: 0, dateOffset: -63, items: [{idx:0, qty:1000, gw:250, nw:240}, {idx:3, qty:500, gw:180, nw:170}] },
    { num: 'PL-25-26/0002', custIdx: 6, invIdx: 1, dateOffset: -53, items: [{idx:0, qty:800, gw:200, nw:190}, {idx:2, qty:200, gw:50, nw:45}] },
    { num: 'PL-25-26/0003', custIdx: 7, invIdx: 2, dateOffset: -43, items: [{idx:1, qty:600, gw:150, nw:140}, {idx:4, qty:10000, gw:80, nw:75}] },
    { num: 'PL-25-26/0004', custIdx: 8, invIdx: 3, dateOffset: -33, items: [{idx:3, qty:700, gw:280, nw:265}, {idx:0, qty:500, gw:125, nw:120}] },
    { num: 'PL-25-26/0005', custIdx: 9, invIdx: 4, dateOffset: -18, items: [{idx:2, qty:300, gw:75, nw:70}, {idx:4, qty:8000, gw:65, nw:60}] },
  ];

  for (const def of plDefs) {
    const plDate = new Date(); plDate.setDate(plDate.getDate() + def.dateOffset);
    let totalGW = 0, totalNW = 0;
    const lineItems = [];
    for (let i = 0; i < def.items.length; i++) {
      const li = def.items[i];
      totalGW += li.gw; totalNW += li.nw;
      lineItems.push({
        item_id: itemIds[li.idx], item_name: itemsData[li.idx].name, hsn_code: itemsData[li.idx].hsn_code,
        quantity: li.qty, unit: itemsData[li.idx].unit, carton_number: i + 1,
        gross_weight: li.gw, net_weight: li.nw, dimensions: '60x40x30', sort_order: i,
      });
    }
    const [plRow] = await knex('packing_lists').insert({
      packing_list_number: def.num, invoice_id: exportInvoiceIds[plDefs.indexOf(def)], customer_id: customerIds[def.custIdx],
      packing_date: plDate.toISOString().slice(0, 10), status: 'Draft',
      shipping_method: 'Sea Freight', total_cartons: def.items.length,
      total_gross_weight: totalGW, total_net_weight: totalNW, weight_unit: 'kg', total_cbm: +(totalGW * 0.006).toFixed(3),
    }).returning('id');
    const plId = typeof plRow === 'object' ? plRow.id : plRow;
    for (const li of lineItems) li.packing_list_id = plId;
    await knex('packing_list_items').insert(lineItems);
  }
  console.log('Seeded 5 packing lists.');

  // ────────────────────────────────────────────────────────────────────────
  // 13. E-WAY BILLS (5)
  // ────────────────────────────────────────────────────────────────────────
  const ewbDefs = [
    { num: 'EWB2526000001', custIdx: 0, invIdx: 0, dateOffset: -73, items: [{idx:0, qty:500, taxVal:125000, gstRate:5}, {idx:1, qty:200, taxVal:36000, gstRate:12}] },
    { num: 'EWB2526000002', custIdx: 1, invIdx: 1, dateOffset: -58, items: [{idx:1, qty:300, taxVal:54000, gstRate:12}, {idx:2, qty:100, taxVal:45000, gstRate:5}] },
    { num: 'EWB2526000003', custIdx: 2, invIdx: 2, dateOffset: -48, items: [{idx:0, qty:400, taxVal:100000, gstRate:5}, {idx:3, qty:250, taxVal:80000, gstRate:12}] },
    { num: 'EWB2526000004', custIdx: 3, invIdx: 3, dateOffset: -88, items: [{idx:2, qty:150, taxVal:67500, gstRate:5}, {idx:4, qty:2000, taxVal:30000, gstRate:18}] },
    { num: 'EWB2526000005', custIdx: 4, invIdx: 4, dateOffset: -38, items: [{idx:3, qty:350, taxVal:112000, gstRate:12}, {idx:4, qty:5000, taxVal:75000, gstRate:18}] },
  ];

  for (const def of ewbDefs) {
    const custState = domesticCustomers[def.custIdx].place_of_supply;
    const genDate = new Date(); genDate.setDate(genDate.getDate() + def.dateOffset);
    const validDate = new Date(genDate); validDate.setDate(validDate.getDate() + 1);

    let totalVal = 0, tIGST = 0, tCGST = 0, tSGST = 0;
    const lineItems = [];
    for (const li of def.items) {
      const gst = computeGST(li.taxVal, li.gstRate, custState);
      totalVal += li.taxVal;
      tIGST += gst.igst_amount; tCGST += gst.cgst_amount; tSGST += gst.sgst_amount;
      lineItems.push({
        item_id: itemIds[li.idx], item_name: itemsData[li.idx].name, hsn_code: itemsData[li.idx].hsn_code,
        quantity: li.qty, unit: itemsData[li.idx].unit, taxable_value: li.taxVal, gst_rate: li.gstRate,
        igst_amount: gst.igst_amount, cgst_amount: gst.cgst_amount, sgst_amount: gst.sgst_amount,
        sort_order: lineItems.length,
      });
    }

    const [ewbRow] = await knex('eway_bills').insert({
      eway_bill_number: def.num, invoice_id: invoiceIds[def.invIdx], customer_id: customerIds[def.custIdx],
      generation_date: genDate.toISOString().slice(0, 10), valid_until: validDate.toISOString().slice(0, 10),
      status: 'Generated', supply_type: 'Outward', sub_type: 'Supply', document_type: 'Tax Invoice',
      document_number: domesticInvoiceDefs[def.invIdx].num,
      document_date: genDate.toISOString().slice(0, 10),
      from_name: 'Navodita Apparel Pvt Ltd', from_gstin: '06AABCN1234A1ZX',
      from_address: 'Plot No 12, Sector 37', from_city: 'Gurugram', from_state: 'Haryana', from_pincode: '122001',
      to_name: domesticCustomers[def.custIdx].display_name, to_gstin: domesticCustomers[def.custIdx].gstin,
      to_state: custState,
      transport_mode: 'Road', vehicle_number: 'HR-06-CD-' + (5678 + ewbDefs.indexOf(def)), vehicle_type: 'Regular',
      distance_km: 500 + ewbDefs.indexOf(def) * 200,
      total_value: totalVal, igst_amount: tIGST, cgst_amount: tCGST, sgst_amount: tSGST, cess_amount: 0,
    }).returning('id');
    const ewbId = typeof ewbRow === 'object' ? ewbRow.id : ewbRow;
    for (const li of lineItems) li.eway_bill_id = ewbId;
    await knex('eway_bill_items').insert(lineItems);
  }
  console.log('Seeded 5 e-way bills.');

  // ────────────────────────────────────────────────────────────────────────
  // 14. CREDIT NOTES (5)
  // ────────────────────────────────────────────────────────────────────────
  const cnDefs = [
    { num: 'CN-25-26/0001', custIdx: 0, invIdx: 0, dateOffset: -68, reason: 'Sales Return', items: [{idx:0, qty:50, rate:250}] },
    { num: 'CN-25-26/0002', custIdx: 1, invIdx: 1, dateOffset: -52, reason: 'Post-delivery Discount', items: [{idx:1, qty:30, rate:180}] },
    { num: 'CN-25-26/0003', custIdx: 2, invIdx: 2, dateOffset: -42, reason: 'Deficiency in Service', items: [{idx:0, qty:20, rate:250}] },
    { num: 'CN-25-26/0004', custIdx: 3, invIdx: 3, dateOffset: -82, reason: 'Sales Return', items: [{idx:2, qty:10, rate:450}] },
    { num: 'CN-25-26/0005', custIdx: 4, invIdx: 4, dateOffset: -32, reason: 'Quality Issue', items: [{idx:3, qty:25, rate:320}] },
  ];

  for (const def of cnDefs) {
    const custState = domesticCustomers[def.custIdx].place_of_supply;
    const cnDate = new Date(); cnDate.setDate(cnDate.getDate() + def.dateOffset);
    let sub_total = 0, tIGST = 0, tCGST = 0, tSGST = 0;
    const lineItems = [];

    for (const li of def.items) {
      const gstRate = itemsData[li.idx].gst_rate;
      const calc = computeLineGST(li.qty, li.rate, gstRate, custState);
      sub_total += calc.amount; tIGST += calc.igst_amount; tCGST += calc.cgst_amount; tSGST += calc.sgst_amount;
      lineItems.push({
        item_id: itemIds[li.idx], item_name: itemsData[li.idx].name, hsn_code: itemsData[li.idx].hsn_code,
        quantity: li.qty, unit: itemsData[li.idx].unit, rate: li.rate, gst_rate: gstRate,
        igst_amount: calc.igst_amount, cgst_amount: calc.cgst_amount, sgst_amount: calc.sgst_amount,
        amount: calc.amount, sort_order: lineItems.length,
      });
    }

    const total_tax = +(tIGST + tCGST + tSGST).toFixed(2);
    const total_amount = +(sub_total + total_tax).toFixed(2);

    const [cnRow] = await knex('credit_notes').insert({
      credit_note_number: def.num, customer_id: customerIds[def.custIdx], invoice_id: invoiceIds[def.invIdx],
      credit_note_date: cnDate.toISOString().slice(0, 10), status: 'Open', reason: def.reason,
      place_of_supply: custState,
      sub_total, igst_amount: tIGST, cgst_amount: tCGST, sgst_amount: tSGST,
      total_tax, total_amount, balance_amount: total_amount,
      currency_code: 'INR', exchange_rate: 1.0,
    }).returning('id');
    const cnId = typeof cnRow === 'object' ? cnRow.id : cnRow;
    for (const li of lineItems) li.credit_note_id = cnId;
    await knex('credit_note_items').insert(lineItems);
  }
  console.log('Seeded 5 credit notes.');

  // ────────────────────────────────────────────────────────────────────────
  // 15. DEBIT NOTES (5)
  // ────────────────────────────────────────────────────────────────────────
  const dnDefs = [
    { num: 'DN-25-26/0001', venIdx: 0, billIdx: 0, dateOffset: -65, reason: 'Purchase Return', items: [{idx:0, qty:50, rate:180}] },
    { num: 'DN-25-26/0002', venIdx: 1, billIdx: 1, dateOffset: -50, reason: 'Quality Defect', items: [{idx:3, qty:30, rate:240}] },
    { num: 'DN-25-26/0003', venIdx: 2, billIdx: 2, dateOffset: -40, reason: 'Purchase Return', items: [{idx:0, qty:40, rate:180}] },
    { num: 'DN-25-26/0004', venIdx: 3, billIdx: 3, dateOffset: -30, reason: 'Short Supply', items: [{idx:1, qty:25, rate:130}] },
    { num: 'DN-25-26/0005', venIdx: 4, billIdx: 4, dateOffset: -20, reason: 'Defective Goods', items: [{idx:2, qty:15, rate:350}] },
  ];

  for (const def of dnDefs) {
    const venState = domesticVendors[def.venIdx].place_of_supply;
    const dnDate = new Date(); dnDate.setDate(dnDate.getDate() + def.dateOffset);
    let sub_total = 0, tIGST = 0, tCGST = 0, tSGST = 0;
    const lineItems = [];

    for (const li of def.items) {
      const gstRate = itemsData[li.idx].gst_rate;
      const calc = computeLineGST(li.qty, li.rate, gstRate, venState);
      sub_total += calc.amount; tIGST += calc.igst_amount; tCGST += calc.cgst_amount; tSGST += calc.sgst_amount;
      lineItems.push({
        item_id: itemIds[li.idx], item_name: itemsData[li.idx].name, hsn_code: itemsData[li.idx].hsn_code,
        quantity: li.qty, unit: itemsData[li.idx].unit, rate: li.rate, gst_rate: gstRate,
        igst_amount: calc.igst_amount, cgst_amount: calc.cgst_amount, sgst_amount: calc.sgst_amount,
        amount: calc.amount, sort_order: lineItems.length,
      });
    }

    const total_tax = +(tIGST + tCGST + tSGST).toFixed(2);
    const total_amount = +(sub_total + total_tax).toFixed(2);

    const [dnRow] = await knex('debit_notes').insert({
      debit_note_number: def.num, vendor_id: vendorIds[def.venIdx], bill_id: billIds[def.billIdx],
      debit_note_date: dnDate.toISOString().slice(0, 10), status: 'Open', reason: def.reason,
      place_of_supply: venState,
      sub_total, igst_amount: tIGST, cgst_amount: tCGST, sgst_amount: tSGST,
      total_tax, total_amount, balance_amount: total_amount,
      currency_code: 'INR', exchange_rate: 1.0,
    }).returning('id');
    const dnId = typeof dnRow === 'object' ? dnRow.id : dnRow;
    for (const li of lineItems) li.debit_note_id = dnId;
    await knex('debit_note_items').insert(lineItems);
  }
  console.log('Seeded 5 debit notes.');

  // ────────────────────────────────────────────────────────────────────────
  // 16. PAYMENTS RECEIVED (5 domestic + 5 export)
  // ────────────────────────────────────────────────────────────────────────
  // Domestic payments — allocated to domestic invoices that have amount_paid > 0
  const domPayDefs = [
    { num: 'PR-25-26/0001', custIdx: 2, invIdx: 2, dateOffset: -45, mode: 'Bank Transfer' }, // Paid
    { num: 'PR-25-26/0002', custIdx: 4, invIdx: 4, dateOffset: -35, mode: 'UPI' },           // Partial
    { num: 'PR-25-26/0003', custIdx: 0, invIdx: 0, dateOffset: -30, mode: 'Cheque' },        // small advance
    { num: 'PR-25-26/0004', custIdx: 1, invIdx: 1, dateOffset: -25, mode: 'Bank Transfer' }, // partial on Final
    { num: 'PR-25-26/0005', custIdx: 3, invIdx: 3, dateOffset: -20, mode: 'Cash' },          // partial on Overdue
  ];

  for (const def of domPayDefs) {
    const payDate = new Date(); payDate.setDate(payDate.getDate() + def.dateOffset);
    const invTotal = invoiceTotals[def.invIdx];
    const payAmount = invTotal.amount_paid > 0 ? invTotal.amount_paid : +(invTotal.total_amount * 0.25).toFixed(2);

    const [prRow] = await knex('payments_received').insert({
      payment_number: def.num, customer_id: customerIds[def.custIdx],
      payment_date: payDate.toISOString().slice(0, 10), amount: payAmount,
      payment_mode: def.mode, status: 'Received', currency_code: 'INR', exchange_rate: 1.0,
    }).returning('id');
    const prId = typeof prRow === 'object' ? prRow.id : prRow;

    await knex('payment_received_allocations').insert({
      payment_received_id: prId, invoice_id: invoiceIds[def.invIdx], allocated_amount: payAmount,
    });
  }

  // Export payments
  const expPayDefs = [
    { num: 'PR-25-26/0006', custIdx: 6, invIdx: 1, dateOffset: -48, mode: 'Wire Transfer' }, // Paid
    { num: 'PR-25-26/0007', custIdx: 8, invIdx: 3, dateOffset: -28, mode: 'Wire Transfer' }, // Partial
    { num: 'PR-25-26/0008', custIdx: 5, invIdx: 0, dateOffset: -22, mode: 'Wire Transfer' }, // advance
    { num: 'PR-25-26/0009', custIdx: 7, invIdx: 2, dateOffset: -15, mode: 'Wire Transfer' }, // advance
    { num: 'PR-25-26/0010', custIdx: 9, invIdx: 4, dateOffset: -10, mode: 'Wire Transfer' }, // advance
  ];

  for (const def of expPayDefs) {
    const payDate = new Date(); payDate.setDate(payDate.getDate() + def.dateOffset);
    const invTotal = exportInvoiceTotals[def.invIdx];
    const payAmount = invTotal.amount_paid > 0 ? invTotal.amount_paid : +(invTotal.total_amount * 0.25).toFixed(2);

    const [prRow] = await knex('payments_received').insert({
      payment_number: def.num, customer_id: customerIds[def.custIdx],
      payment_date: payDate.toISOString().slice(0, 10), amount: payAmount,
      payment_mode: def.mode, status: 'Received', currency_code: 'USD', exchange_rate: 83.25,
    }).returning('id');
    const prId = typeof prRow === 'object' ? prRow.id : prRow;

    await knex('payment_received_allocations').insert({
      payment_received_id: prId, invoice_id: exportInvoiceIds[def.invIdx], allocated_amount: payAmount,
    });
  }
  console.log('Seeded 10 payments received.');

  // ────────────────────────────────────────────────────────────────────────
  // 17. PAYMENTS MADE (5 domestic + 5 import)
  // ────────────────────────────────────────────────────────────────────────
  const domPmDefs = [
    { num: 'PM-25-26/0001', venIdx: 1, billIdx: 1, dateOffset: -50, mode: 'Bank Transfer' }, // Paid bill
    { num: 'PM-25-26/0002', venIdx: 3, billIdx: 3, dateOffset: -30, mode: 'Cheque' },        // Partial bill
    { num: 'PM-25-26/0003', venIdx: 0, billIdx: 0, dateOffset: -25, mode: 'UPI' },
    { num: 'PM-25-26/0004', venIdx: 2, billIdx: 2, dateOffset: -20, mode: 'Bank Transfer' },
    { num: 'PM-25-26/0005', venIdx: 4, billIdx: 4, dateOffset: -15, mode: 'Bank Transfer' },
  ];

  for (const def of domPmDefs) {
    const payDate = new Date(); payDate.setDate(payDate.getDate() + def.dateOffset);
    const bt = billTotals[def.billIdx];
    const payAmount = bt.amount_paid > 0 ? bt.amount_paid : +(bt.total_amount * 0.25).toFixed(2);

    const [pmRow] = await knex('payments_made').insert({
      payment_number: def.num, vendor_id: vendorIds[def.venIdx],
      payment_date: payDate.toISOString().slice(0, 10), amount: payAmount,
      payment_mode: def.mode, status: 'Paid', currency_code: 'INR', exchange_rate: 1.0,
    }).returning('id');
    const pmId = typeof pmRow === 'object' ? pmRow.id : pmRow;

    await knex('payment_made_allocations').insert({
      payment_made_id: pmId, bill_id: billIds[def.billIdx], allocated_amount: payAmount,
    });
  }

  // Import vendor payments
  const impPmDefs = [
    { num: 'PM-25-26/0006', venIdx: 5, dateOffset: -45, mode: 'Wire Transfer', amount: 5000 },
    { num: 'PM-25-26/0007', venIdx: 6, dateOffset: -35, mode: 'Wire Transfer', amount: 3500 },
    { num: 'PM-25-26/0008', venIdx: 7, dateOffset: -28, mode: 'Wire Transfer', amount: 8000 },
    { num: 'PM-25-26/0009', venIdx: 8, dateOffset: -20, mode: 'Wire Transfer', amount: 4200 },
    { num: 'PM-25-26/0010', venIdx: 9, dateOffset: -12, mode: 'Wire Transfer', amount: 6500 },
  ];

  // Import payments need bills - create simple import bills first
  const importBillIds = [];
  for (let i = 0; i < 5; i++) {
    const bDate = new Date(); bDate.setDate(bDate.getDate() - 50 + i * 10);
    const dDate = new Date(bDate); dDate.setDate(dDate.getDate() + 30);
    const amt = impPmDefs[i].amount;
    const [bRow] = await knex('bills').insert({
      bill_number: `BILL-25-26/000${6 + i}`,
      vendor_id: vendorIds[5 + i],
      bill_date: bDate.toISOString().slice(0, 10),
      due_date: dDate.toISOString().slice(0, 10),
      status: 'Paid',
      sub_total: amt, total_tax: 0, total_amount: amt, amount_paid: amt, balance_due: 0,
      currency_code: 'USD', exchange_rate: 83.25,
    }).returning('id');
    importBillIds.push(typeof bRow === 'object' ? bRow.id : bRow);
  }

  for (let i = 0; i < impPmDefs.length; i++) {
    const def = impPmDefs[i];
    const payDate = new Date(); payDate.setDate(payDate.getDate() + def.dateOffset);
    const [pmRow] = await knex('payments_made').insert({
      payment_number: def.num, vendor_id: vendorIds[def.venIdx],
      payment_date: payDate.toISOString().slice(0, 10), amount: def.amount,
      payment_mode: def.mode, status: 'Paid', currency_code: 'USD', exchange_rate: 83.25,
    }).returning('id');
    const pmId = typeof pmRow === 'object' ? pmRow.id : pmRow;

    await knex('payment_made_allocations').insert({
      payment_made_id: pmId, bill_id: importBillIds[i], allocated_amount: def.amount,
    });
  }
  console.log('Seeded 10 payments made.');

  // ────────────────────────────────────────────────────────────────────────
  // 18. EXPENSES (5)
  // ────────────────────────────────────────────────────────────────────────
  const expenseDefs = [
    { num: 'EXP-25-26/0001', category: 'Office Supplies', amount: 5500, gst_rate: 18, dateOffset: -60, mode: 'Cash' },
    { num: 'EXP-25-26/0002', category: 'Utilities', amount: 12000, gst_rate: 18, dateOffset: -50, mode: 'Bank Transfer' },
    { num: 'EXP-25-26/0003', category: 'Rent', amount: 85000, gst_rate: 18, dateOffset: -40, mode: 'Bank Transfer' },
    { num: 'EXP-25-26/0004', category: 'Travel', amount: 8500, gst_rate: 5, dateOffset: -30, mode: 'UPI' },
    { num: 'EXP-25-26/0005', category: 'Repairs', amount: 15000, gst_rate: 18, dateOffset: -20, mode: 'Cash' },
  ];

  for (const def of expenseDefs) {
    const expDate = new Date(); expDate.setDate(expDate.getDate() + def.dateOffset);
    // Expenses: company is in Haryana, assume vendor also Haryana for local expenses → CGST+SGST
    const gst = computeGST(def.amount, def.gst_rate, COMPANY_STATE);
    const total = +(def.amount + gst.total_tax).toFixed(2);

    await knex('expenses').insert({
      expense_number: def.num,
      expense_date: expDate.toISOString().slice(0, 10),
      category: def.category,
      description: def.category + ' expense',
      payment_mode: def.mode,
      status: 'Approved',
      amount: def.amount,
      gst_rate: def.gst_rate,
      igst_amount: gst.igst_amount,
      cgst_amount: gst.cgst_amount,
      sgst_amount: gst.sgst_amount,
      total_amount: total,
      currency_code: 'INR', exchange_rate: 1.0,
    });
  }
  console.log('Seeded 5 expenses.');

  // ────────────────────────────────────────────────────────────────────────
  // 19. JOURNAL ENTRIES (5)
  // ────────────────────────────────────────────────────────────────────────
  // Using known chart_of_accounts IDs from the DB
  const COA = {
    sales:      '3b7d723e-0f3b-4eea-9e7a-5ca8b6f3e12f',  // INC-002 Sales
    ar:         'cd647cc8-2eb8-413a-9e6a-27881baef710',  // AR-001 Accounts Receivable
    ap:         'aa18d113-0a0a-44ae-b9a3-9e2ac9be42d8',  // AP-001 Accounts Payable
    cogs:       '38141fe1-d45e-47d3-ae7e-d6f85daf5f5a',  // COGS-001 Cost of Goods Sold
    salaries:   '93eaf03d-b850-4a99-ac50-41cbdc3c44e5',  // EXP-015 Salaries
    bankKotak:  '4bab9aa7-abb6-44a8-84ee-c55ef16ec421',  // BANK-001
    officeSupp: '32fcf9ae-c1ab-4172-8822-52de638eeeb5',  // EXP-002
    travel:     'e4b98b49-27aa-450a-9e9f-f1fe2c7f1039',  // EXP-006
    rent:       'b7204b62-058c-458e-976f-b82b3e3e8d22',  // EXP-010 Factory Rent
    pettyCash:  '5ac3f3fa-6c6e-49c9-b1ae-fe1a1bdc9a9e',  // CASH-002
  };

  const jeDefs = [
    { num: 'JE-25-26/0001', dateOffset: -70, type: 'Manual', notes: 'Opening stock adjustment',
      lines: [
        { account_id: COA.cogs, account_name: 'Cost of Goods Sold', debit: 150000, credit: 0, desc: 'Opening stock value' },
        { account_id: COA.bankKotak, account_name: 'NAVODITA APPAREL PRIVATE LIMITED KOTAK', debit: 0, credit: 150000, desc: 'Opening stock offset' },
      ]},
    { num: 'JE-25-26/0002', dateOffset: -55, type: 'Manual', notes: 'Salary accrual for December',
      lines: [
        { account_id: COA.salaries, account_name: 'Salaries and Employee Wages', debit: 460000, credit: 0, desc: 'Dec salary accrual' },
        { account_id: COA.bankKotak, account_name: 'NAVODITA APPAREL PRIVATE LIMITED KOTAK', debit: 0, credit: 460000, desc: 'Salary bank payment' },
      ]},
    { num: 'JE-25-26/0003', dateOffset: -40, type: 'Manual', notes: 'Office rent payment',
      lines: [
        { account_id: COA.rent, account_name: 'Factory Rent', debit: 85000, credit: 0, desc: 'Jan rent' },
        { account_id: COA.bankKotak, account_name: 'NAVODITA APPAREL PRIVATE LIMITED KOTAK', debit: 0, credit: 85000, desc: 'Rent bank transfer' },
      ]},
    { num: 'JE-25-26/0004', dateOffset: -25, type: 'Manual', notes: 'Petty cash replenishment',
      lines: [
        { account_id: COA.pettyCash, account_name: 'Petty Cash', debit: 25000, credit: 0, desc: 'Petty cash top-up' },
        { account_id: COA.bankKotak, account_name: 'NAVODITA APPAREL PRIVATE LIMITED KOTAK', debit: 0, credit: 25000, desc: 'Cash withdrawal' },
      ]},
    { num: 'JE-25-26/0005', dateOffset: -10, type: 'Manual', notes: 'Travel advance to employee',
      lines: [
        { account_id: COA.travel, account_name: 'Travel Expense', debit: 15000, credit: 0, desc: 'Travel advance' },
        { account_id: COA.pettyCash, account_name: 'Petty Cash', debit: 0, credit: 15000, desc: 'Cash disbursement' },
      ]},
  ];

  for (const def of jeDefs) {
    const jeDate = new Date(); jeDate.setDate(jeDate.getDate() + def.dateOffset);
    const totalDebit = def.lines.reduce((s, l) => s + l.debit, 0);
    const totalCredit = def.lines.reduce((s, l) => s + l.credit, 0);

    const [jeRow] = await knex('journal_entries').insert({
      journal_number: def.num,
      journal_date: jeDate.toISOString().slice(0, 10),
      status: 'Posted', journal_type: def.type,
      total_debit: totalDebit, total_credit: totalCredit,
      currency_code: 'INR', exchange_rate: 1.0,
      notes: def.notes,
    }).returning('id');
    const jeId = typeof jeRow === 'object' ? jeRow.id : jeRow;

    const lines = def.lines.map((l, i) => ({
      journal_entry_id: jeId,
      account_id: l.account_id,
      account_name: l.account_name,
      debit_amount: l.debit,
      credit_amount: l.credit,
      description: l.desc,
      sort_order: i,
    }));
    await knex('journal_lines').insert(lines);
  }
  console.log('Seeded 5 journal entries.');

  // ────────────────────────────────────────────────────────────────────────
  // 20. GST FILINGS (5)
  // ────────────────────────────────────────────────────────────────────────
  const gstDefs = [
    { type: 'GSTR-1', period: 'October 2025', year: 2025, month: 10, status: 'Filed', taxable: 850000, igst: 42500, cgst: 21250, sgst: 21250, filing_date: '2025-11-11' },
    { type: 'GSTR-3B', period: 'October 2025', year: 2025, month: 10, status: 'Filed', taxable: 850000, igst: 42500, cgst: 21250, sgst: 21250, filing_date: '2025-11-20' },
    { type: 'GSTR-1', period: 'November 2025', year: 2025, month: 11, status: 'Filed', taxable: 920000, igst: 46000, cgst: 23000, sgst: 23000, filing_date: '2025-12-11' },
    { type: 'GSTR-3B', period: 'November 2025', year: 2025, month: 11, status: 'Filed', taxable: 920000, igst: 46000, cgst: 23000, sgst: 23000, filing_date: '2025-12-20' },
    { type: 'GSTR-1', period: 'December 2025', year: 2025, month: 12, status: 'Pending', taxable: 1050000, igst: 52500, cgst: 26250, sgst: 26250, filing_date: null },
  ];

  for (const def of gstDefs) {
    const dueDay = def.type === 'GSTR-1' ? 11 : 20;
    const dueMonth = def.month === 12 ? 1 : def.month + 1;
    const dueYear = def.month === 12 ? def.year + 1 : def.year;
    const totalTax = +(def.igst + def.cgst + def.sgst).toFixed(2);

    await knex('gst_filings').insert({
      filing_type: def.type, period: def.period, filing_year: def.year, filing_month: def.month,
      status: def.status,
      total_taxable_value: def.taxable, total_igst: def.igst, total_cgst: def.cgst, total_sgst: def.sgst,
      total_cess: 0, total_tax: totalTax,
      filing_date: def.filing_date,
      due_date: `${dueYear}-${String(dueMonth).padStart(2, '0')}-${String(dueDay).padStart(2, '0')}`,
      acknowledgement_number: def.status === 'Filed' ? 'ACK' + Math.floor(Math.random() * 900000000 + 100000000) : null,
    });
  }
  console.log('Seeded 5 GST filings.');

  // ────────────────────────────────────────────────────────────────────────
  // 21. TDS CHALLANS (5)
  // ────────────────────────────────────────────────────────────────────────
  const challanDefs = [
    { challan_number: 'CHL-001', deposit_date: '2025-11-07', quarter: 'Q3', ay: '2026-27', tds: 12000, status: 'Deposited' },
    { challan_number: 'CHL-002', deposit_date: '2025-12-07', quarter: 'Q3', ay: '2026-27', tds: 15000, status: 'Deposited' },
    { challan_number: 'CHL-003', deposit_date: '2026-01-07', quarter: 'Q3', ay: '2026-27', tds: 18000, status: 'Deposited' },
    { challan_number: 'CHL-004', deposit_date: '2026-01-15', quarter: 'Q4', ay: '2026-27', tds: 14000, status: 'Verified' },
    { challan_number: 'CHL-005', deposit_date: null, quarter: 'Q4', ay: '2026-27', tds: 16000, status: 'Pending' },
  ];

  const challanIds = [];
  for (const def of challanDefs) {
    const totalAmt = +(def.tds + def.tds * 0.04).toFixed(2); // 4% cess
    const [cRow] = await knex('tds_challans').insert({
      challan_number: def.challan_number, challan_type: '281', deposit_date: def.deposit_date,
      quarter_period: def.quarter, assessment_year: def.ay,
      total_tds_deposited: def.tds, surcharge: 0, education_cess: +(def.tds * 0.04).toFixed(2),
      interest: 0, late_fee: 0, total_amount: totalAmt,
      bank_name: 'Kotak Mahindra Bank', bank_branch: 'Gurugram Main',
      status: def.status,
    }).returning('id');
    challanIds.push(typeof cRow === 'object' ? cRow.id : cRow);
  }
  console.log('Seeded 5 TDS challans.');

  // ────────────────────────────────────────────────────────────────────────
  // 22. TDS LIABILITIES (5)
  // ────────────────────────────────────────────────────────────────────────
  const tdsLiabDefs = [
    { section: '194C', name: 'Arvind Mills Ltd', pan: 'AABCA1234F', rate: 2.0, gross: 150000, challanIdx: 0 },
    { section: '194C', name: 'Raymond Ltd', pan: 'AABCR5678G', rate: 2.0, gross: 124000, challanIdx: 1 },
    { section: '194C', name: 'Welspun India', pan: 'AABCW9012H', rate: 2.0, gross: 114000, challanIdx: 2 },
    { section: '194J', name: 'Tax Consultant Services', pan: 'AAACF9876Z', rate: 10.0, gross: 50000, challanIdx: 3 },
    { section: '192', name: 'Rajesh Kumar', pan: 'AKLPK1234A', rate: 10.0, gross: 120000, challanIdx: 4 },
  ];

  for (const def of tdsLiabDefs) {
    const tdsAmt = +(def.gross * def.rate / 100).toFixed(2);
    const cess = +(tdsAmt * 0.04).toFixed(2);
    const totalTds = +(tdsAmt + cess).toFixed(2);
    const dedDate = new Date(); dedDate.setDate(dedDate.getDate() - 30 - tdsLiabDefs.indexOf(def) * 15);

    await knex('tds_liabilities').insert({
      section: def.section, deductee_type: 'Company', deductee_name: def.name, deductee_pan: def.pan,
      tds_rate: def.rate, gross_amount: def.gross, tds_amount: tdsAmt,
      surcharge: 0, cess_tds: cess, total_tds: totalTds,
      deduction_date: dedDate.toISOString().slice(0, 10),
      status: tdsLiabDefs.indexOf(def) < 3 ? 'Deposited' : 'Pending',
      challan_id: challanIds[def.challanIdx],
      quarter_period: tdsLiabDefs.indexOf(def) < 3 ? 'Q3' : 'Q4',
      assessment_year: '2026-27',
    });
  }
  console.log('Seeded 5 TDS liabilities.');

  // ────────────────────────────────────────────────────────────────────────
  // 23. COSTING SHEETS (5) with versions, fabric, trim, packing items
  // ────────────────────────────────────────────────────────────────────────
  const costingDefs = [
    { style: 'NAV-SS26-001', name: 'Cotton Kurta', custIdx: 5, season: 'SS26', cat: 'Tops', fabric: 'Woven', qty: 5000, fabricItems: [{name:'Main Body Fabric', type:'Woven', comp:'100% Cotton', rate:250, cons:1.8, wastage:5}], trimItems: [{name:'Buttons', type:'Button', rate:3, cons:6, wastage:2}, {name:'Labels', type:'Label', rate:5, cons:2, wastage:1}], packItems: [{name:'Poly bag', rate:2, cons:1, wastage:3}, {name:'Carton box', rate:15, cons:0.05, wastage:2}] },
    { style: 'NAV-SS26-002', name: 'Denim Jeans', custIdx: 6, season: 'SS26', cat: 'Bottoms', fabric: 'Denim', qty: 3000, fabricItems: [{name:'Denim Fabric', type:'Denim', comp:'Cotton/Spandex 98/2', rate:320, cons:1.5, wastage:8}], trimItems: [{name:'YKK Zipper', type:'Zipper', rate:15, cons:1, wastage:2}, {name:'Rivets', type:'Button', rate:2, cons:8, wastage:3}], packItems: [{name:'Hangtag', rate:3, cons:1, wastage:2}, {name:'Carton', rate:18, cons:0.05, wastage:2}] },
    { style: 'NAV-AW26-001', name: 'Silk Blouse', custIdx: 7, season: 'AW26', cat: 'Tops', fabric: 'Woven', qty: 2000, fabricItems: [{name:'Silk Fabric', type:'Woven', comp:'100% Silk', rate:450, cons:1.4, wastage:6}], trimItems: [{name:'Pearl Buttons', type:'Button', rate:8, cons:5, wastage:2}, {name:'Care Labels', type:'Label', rate:4, cons:2, wastage:1}], packItems: [{name:'Tissue paper', rate:3, cons:1, wastage:5}, {name:'Gift box', rate:25, cons:1, wastage:2}] },
    { style: 'NAV-AW26-002', name: 'Poly Jacket', custIdx: 8, season: 'AW26', cat: 'Outerwear', fabric: 'Knit', qty: 4000, fabricItems: [{name:'Poly Shell', type:'Knit', comp:'100% Polyester', rate:180, cons:2.2, wastage:7}, {name:'Lining', type:'Woven', comp:'Polyester Taffeta', rate:90, cons:1.8, wastage:5}], trimItems: [{name:'YKK Zipper 24in', type:'Zipper', rate:25, cons:1, wastage:2}], packItems: [{name:'Poly bag', rate:3, cons:1, wastage:3}] },
    { style: 'NAV-SS26-003', name: 'Cotton Shorts', custIdx: 9, season: 'SS26', cat: 'Bottoms', fabric: 'Woven', qty: 6000, fabricItems: [{name:'Cotton Twill', type:'Woven', comp:'100% Cotton', rate:220, cons:1.1, wastage:6}], trimItems: [{name:'Drawstring', type:'Label', rate:5, cons:1, wastage:2}, {name:'Eyelets', type:'Button', rate:1, cons:4, wastage:3}], packItems: [{name:'Poly bag', rate:2, cons:1, wastage:3}, {name:'Shipping carton', rate:20, cons:0.04, wastage:2}] },
  ];

  for (const def of costingDefs) {
    // Calculate totals
    let totalFabric = 0, totalTrim = 0, totalPack = 0;
    for (const f of def.fabricItems) {
      const cost = +(f.rate * f.cons * (1 + f.wastage / 100)).toFixed(2);
      f.cost = cost;
      totalFabric += cost;
    }
    for (const t of def.trimItems) {
      const cost = +(t.rate * t.cons * (1 + t.wastage / 100)).toFixed(2);
      t.cost = cost;
      totalTrim += cost;
    }
    for (const p of def.packItems) {
      const cost = +(p.rate * p.cons * (1 + p.wastage / 100)).toFixed(2);
      p.cost = cost;
      totalPack += cost;
    }
    const cmtCost = 45; // flat CMT per piece
    const overheadCost = 15;
    const totalCostPerPiece = +(totalFabric + totalTrim + totalPack + cmtCost + overheadCost).toFixed(2);
    const totalCost = +(totalCostPerPiece * def.qty).toFixed(2);

    const [csRow] = await knex('costing_sheets').insert({
      style_number: def.style, style_name: def.name, customer_id: customerIds[def.custIdx],
      season: def.season, category: def.cat, fabric_type: def.fabric,
      order_quantity: def.qty, total_cost: totalCost, cost_per_piece: totalCostPerPiece,
      currency_code: 'USD', exchange_rate: 83.25, status: 'Approved',
    }).returning('id');
    const csId = typeof csRow === 'object' ? csRow.id : csRow;

    const [cvRow] = await knex('costing_versions').insert({
      costing_sheet_id: csId, version_number: 1, status: 'Approved',
      total_fabric_cost: +totalFabric.toFixed(2), total_trim_cost: +totalTrim.toFixed(2),
      total_packing_cost: +totalPack.toFixed(2),
      cmt_cost: cmtCost, overhead_cost: overheadCost,
      total_cost: totalCostPerPiece, final_cost_per_piece: totalCostPerPiece,
    }).returning('id');
    const cvId = typeof cvRow === 'object' ? cvRow.id : cvRow;

    for (let i = 0; i < def.fabricItems.length; i++) {
      const f = def.fabricItems[i];
      await knex('costing_fabric_items').insert({
        costing_version_id: cvId, fabric_name: f.name, fabric_type: f.type, composition: f.comp,
        rate: f.rate, consumption: f.cons, wastage_percent: f.wastage, cost: f.cost,
        unit: 'm', sort_order: i,
      });
    }
    for (let i = 0; i < def.trimItems.length; i++) {
      const t = def.trimItems[i];
      await knex('costing_trim_items').insert({
        costing_version_id: cvId, trim_name: t.name, trim_type: t.type,
        rate: t.rate, consumption: t.cons, wastage_percent: t.wastage, cost: t.cost,
        unit: 'pcs', sort_order: i,
      });
    }
    for (let i = 0; i < def.packItems.length; i++) {
      const p = def.packItems[i];
      await knex('costing_packing_items').insert({
        costing_version_id: cvId, item_name: p.name,
        rate: p.rate, consumption: p.cons, wastage_percent: p.wastage, cost: p.cost,
        unit: 'pcs', sort_order: i,
      });
    }
  }
  console.log('Seeded 5 costing sheets with versions and items.');

  // ────────────────────────────────────────────────────────────────────────
  // 24. BANK TRANSACTIONS (5) on Kotak account
  // ────────────────────────────────────────────────────────────────────────
  const bankTxnDefs = [
    { dateOffset: -65, desc: 'Payment from Reliance Industries', deposit: 250000, withdrawal: 0, cat: 'Sales Receipt', catType: 'Income' },
    { dateOffset: -50, desc: 'Arvind Mills fabric payment', deposit: 0, withdrawal: 180000, cat: 'Vendor Payment', catType: 'Expense' },
    { dateOffset: -35, desc: 'RTGS from TCS', deposit: 175000, withdrawal: 0, cat: 'Sales Receipt', catType: 'Income' },
    { dateOffset: -20, desc: 'Salary disbursement Jan 2026', deposit: 0, withdrawal: 460000, cat: 'Payroll', catType: 'Expense' },
    { dateOffset: -5, desc: 'Office rent payment Feb 2026', deposit: 0, withdrawal: 85000, cat: 'Rent', catType: 'Expense' },
  ];

  let runningBalance = 1250000; // opening balance of Kotak
  for (const def of bankTxnDefs) {
    runningBalance = runningBalance + def.deposit - def.withdrawal;
    const txDate = new Date(); txDate.setDate(txDate.getDate() + def.dateOffset);
    await knex('bank_transactions').insert({
      bank_account_id: bankAccountIds[0],
      transaction_date: txDate.toISOString().slice(0, 10),
      description: def.desc,
      deposit_amount: def.deposit, withdrawal_amount: def.withdrawal,
      balance: runningBalance,
      category: def.cat, category_type: def.catType,
      is_reconciled: true, reconciled_date: txDate.toISOString().slice(0, 10),
    });
  }
  // Update Kotak current balance
  await knex('bank_accounts').where({ id: bankAccountIds[0] }).update({ current_balance: runningBalance });
  console.log('Seeded 5 bank transactions.');

  // ────────────────────────────────────────────────────────────────────────
  // 25. SALARY RECORDS (5 for Jan 2026)
  // ────────────────────────────────────────────────────────────────────────
  const salaryDefs = [
    { empIdx: 0, basic: 65000, hra: 26000, da: 6500, conv: 1600, med: 1250, spec: 19650, gross: 120000 },
    { empIdx: 1, basic: 55000, hra: 22000, da: 5500, conv: 1600, med: 1250, spec: 14650, gross: 100000 },
    { empIdx: 2, basic: 40000, hra: 16000, da: 4000, conv: 1600, med: 1250, spec: 12150, gross: 75000 },
    { empIdx: 3, basic: 60000, hra: 24000, da: 6000, conv: 1600, med: 1250, spec: 17150, gross: 110000 },
    { empIdx: 4, basic: 30000, hra: 12000, da: 3000, conv: 1600, med: 1250, spec: 7150, gross: 55000 },
  ];

  for (const def of salaryDefs) {
    const pfEmp = +(Math.min(def.basic, 15000) * 0.12).toFixed(2);
    const pfEmpr = pfEmp;
    const pt = def.gross > 100000 ? 200 : (def.gross > 75000 ? 175 : 150);
    const incomeTax = def.gross >= 100000 ? +(def.gross * 0.10).toFixed(2) : (def.gross >= 75000 ? +(def.gross * 0.05).toFixed(2) : 0);
    const totalDed = +(pfEmp + pt + incomeTax).toFixed(2);
    const netSal = +(def.gross - totalDed).toFixed(2);

    await knex('salary_records').insert({
      employee_id: employeeIds[def.empIdx],
      month: 1, year: 2026, status: 'Paid',
      total_working_days: 26, days_present: 25, days_absent: 1, leave_days: 1,
      basic_salary: def.basic, hra: def.hra, dearness_allowance: def.da,
      conveyance_allowance: def.conv, medical_allowance: def.med, special_allowance: def.spec,
      gross_earnings: def.gross,
      pf_employee: pfEmp, pf_employer: pfEmpr,
      professional_tax: pt, income_tax: incomeTax,
      total_deductions: totalDed, net_salary: netSal,
      payment_date: '2026-01-31', payment_mode: 'Bank Transfer',
    });
  }
  console.log('Seeded 5 salary records.');

  // ────────────────────────────────────────────────────────────────────────
  // 26. UPDATE INVOICE NUMBER SETTINGS
  // ────────────────────────────────────────────────────────────────────────
  const numberUpdates = [
    { document_type: 'Invoice', next_number: 11 },
    { document_type: 'Bill', next_number: 11 },
    { document_type: 'Quotation', next_number: 6 },
    { document_type: 'PurchaseOrder', next_number: 6 },
    { document_type: 'CreditNote', next_number: 6 },
    { document_type: 'DebitNote', next_number: 6 },
    { document_type: 'PaymentReceived', next_number: 11 },
    { document_type: 'PaymentMade', next_number: 11 },
    { document_type: 'DeliveryChallan', next_number: 6 },
    { document_type: 'PackingList', next_number: 6 },
    { document_type: 'EWayBill', next_number: 6 },
    { document_type: 'Expense', next_number: 6 },
    { document_type: 'JournalEntry', next_number: 6 },
    { document_type: 'Salary', next_number: 6 },
  ];

  for (const u of numberUpdates) {
    await knex('invoice_number_settings').where({ document_type: u.document_type }).update({ next_number: u.next_number });
  }
  console.log('Updated invoice number settings.');

  console.log('\n=== Test data seeding complete! ===');
  console.log('  10 customers, 10 vendors, 5 items, 5 employees');
  console.log('  10 invoices, 10 bills, 5 quotations, 5 purchase orders');
  console.log('  5 delivery challans, 5 packing lists, 5 e-way bills');
  console.log('  5 credit notes, 5 debit notes');
  console.log('  10 payments received, 10 payments made');
  console.log('  5 expenses, 5 journal entries, 5 bank accounts, 5 bank transactions');
  console.log('  5 GST filings, 5 TDS challans, 5 TDS liabilities');
  console.log('  5 costing sheets, 5 salary records');
};
