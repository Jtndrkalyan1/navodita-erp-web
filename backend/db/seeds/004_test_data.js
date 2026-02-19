/**
 * Seed 004: Test Data
 * Comprehensive sample data for development and testing
 */

const { v4: uuidv4 } = require('uuid');

// Fixed UUIDs for cross-referencing
const IDS = {
  // Departments
  deptProduction: '10000000-0000-0000-0000-000000000001',
  deptSales: '10000000-0000-0000-0000-000000000002',
  deptAccounts: '10000000-0000-0000-0000-000000000003',
  deptHR: '10000000-0000-0000-0000-000000000004',
  deptAdmin: '10000000-0000-0000-0000-000000000005',
  // Customers
  cust1: '20000000-0000-0000-0000-000000000001',
  cust2: '20000000-0000-0000-0000-000000000002',
  cust3: '20000000-0000-0000-0000-000000000003',
  cust4: '20000000-0000-0000-0000-000000000004',
  cust5: '20000000-0000-0000-0000-000000000005',
  cust6: '20000000-0000-0000-0000-000000000006',
  cust7: '20000000-0000-0000-0000-000000000007',
  cust8: '20000000-0000-0000-0000-000000000008',
  // Vendors
  vend1: '30000000-0000-0000-0000-000000000001',
  vend2: '30000000-0000-0000-0000-000000000002',
  vend3: '30000000-0000-0000-0000-000000000003',
  vend4: '30000000-0000-0000-0000-000000000004',
  vend5: '30000000-0000-0000-0000-000000000005',
  vend6: '30000000-0000-0000-0000-000000000006',
  // Items
  item1: '40000000-0000-0000-0000-000000000001',
  item2: '40000000-0000-0000-0000-000000000002',
  item3: '40000000-0000-0000-0000-000000000003',
  item4: '40000000-0000-0000-0000-000000000004',
  item5: '40000000-0000-0000-0000-000000000005',
  item6: '40000000-0000-0000-0000-000000000006',
  item7: '40000000-0000-0000-0000-000000000007',
  item8: '40000000-0000-0000-0000-000000000008',
  item9: '40000000-0000-0000-0000-000000000009',
  item10: '40000000-0000-0000-0000-000000000010',
  // Invoices
  inv1: '50000000-0000-0000-0000-000000000001',
  inv2: '50000000-0000-0000-0000-000000000002',
  inv3: '50000000-0000-0000-0000-000000000003',
  inv4: '50000000-0000-0000-0000-000000000004',
  inv5: '50000000-0000-0000-0000-000000000005',
  inv6: '50000000-0000-0000-0000-000000000006',
  // Quotations
  quot1: '51000000-0000-0000-0000-000000000001',
  quot2: '51000000-0000-0000-0000-000000000002',
  quot3: '51000000-0000-0000-0000-000000000003',
  // Bills
  bill1: '52000000-0000-0000-0000-000000000001',
  bill2: '52000000-0000-0000-0000-000000000002',
  bill3: '52000000-0000-0000-0000-000000000003',
  bill4: '52000000-0000-0000-0000-000000000004',
  // POs
  po1: '53000000-0000-0000-0000-000000000001',
  po2: '53000000-0000-0000-0000-000000000002',
  // Payments
  pr1: '54000000-0000-0000-0000-000000000001',
  pr2: '54000000-0000-0000-0000-000000000002',
  pr3: '54000000-0000-0000-0000-000000000003',
  pm1: '55000000-0000-0000-0000-000000000001',
  pm2: '55000000-0000-0000-0000-000000000002',
  // Expenses
  exp1: '56000000-0000-0000-0000-000000000001',
  exp2: '56000000-0000-0000-0000-000000000002',
  exp3: '56000000-0000-0000-0000-000000000003',
  exp4: '56000000-0000-0000-0000-000000000004',
  // Employees
  emp1: '60000000-0000-0000-0000-000000000001',
  emp2: '60000000-0000-0000-0000-000000000002',
  emp3: '60000000-0000-0000-0000-000000000003',
  emp4: '60000000-0000-0000-0000-000000000004',
  emp5: '60000000-0000-0000-0000-000000000005',
  emp6: '60000000-0000-0000-0000-000000000006',
  emp7: '60000000-0000-0000-0000-000000000007',
  emp8: '60000000-0000-0000-0000-000000000008',
  // Bank Accounts
  bank1: '70000000-0000-0000-0000-000000000001',
  bank2: '70000000-0000-0000-0000-000000000002',
  bank3: '70000000-0000-0000-0000-000000000003',
  // Salary Records
  sal1: '80000000-0000-0000-0000-000000000001',
  sal2: '80000000-0000-0000-0000-000000000002',
  sal3: '80000000-0000-0000-0000-000000000003',
  sal4: '80000000-0000-0000-0000-000000000004',
  sal5: '80000000-0000-0000-0000-000000000005',
  sal6: '80000000-0000-0000-0000-000000000006',
  sal7: '80000000-0000-0000-0000-000000000007',
  sal8: '80000000-0000-0000-0000-000000000008',
  // Credit/Debit Notes
  cn1: '57000000-0000-0000-0000-000000000001',
  dn1: '58000000-0000-0000-0000-000000000001',
};

exports.seed = async function (knex) {
  // Clear test data tables (reverse FK order, skip system tables)
  await knex('advance_recoveries').del();
  await knex('advances').del();
  await knex('salary_records').del();
  await knex('bank_transactions').del();
  await knex('payment_received_allocations').del();
  await knex('payment_made_allocations').del();
  await knex('payments_received').del();
  await knex('payments_made').del();
  await knex('credit_note_items').del();
  await knex('credit_notes').del();
  await knex('debit_note_items').del();
  await knex('debit_notes').del();
  await knex('delivery_challan_items').del();
  await knex('delivery_challans').del();
  await knex('eway_bill_items').del();
  await knex('eway_bills').del();
  await knex('invoice_items').del();
  await knex('invoices').del();
  await knex('quotation_items').del();
  await knex('quotations').del();
  await knex('bill_items').del();
  await knex('bills').del();
  await knex('purchase_order_items').del();
  await knex('purchase_orders').del();
  await knex('expenses').del();
  await knex('employees').del();
  await knex('departments').del();
  await knex('items').del();
  await knex('bank_accounts').del();
  await knex('customers').del();
  await knex('vendors').del();

  // ── Departments ─────────────────────────────────────────────────
  await knex('departments').insert([
    { id: IDS.deptProduction, name: 'Production', description: 'Garment manufacturing and quality' },
    { id: IDS.deptSales, name: 'Sales', description: 'Sales and client management' },
    { id: IDS.deptAccounts, name: 'Accounts', description: 'Finance and accounting' },
    { id: IDS.deptHR, name: 'Human Resources', description: 'HR and payroll' },
    { id: IDS.deptAdmin, name: 'Administration', description: 'Office administration' },
  ]);

  // ── Customers ───────────────────────────────────────────────────
  await knex('customers').insert([
    { id: IDS.cust1, customer_code: 'CUST-0001', display_name: 'Reliance Retail Ltd', email: 'buyer@relianceretail.com', phone: '+91-22-35553456', billing_address: 'Maker Chambers IV, Nariman Point', billing_city: 'Mumbai', billing_state: 'Maharashtra', billing_country: 'India', billing_pincode: '400021', gst_number: '27AAACR5055K1ZZ', currency_code: 'INR' },
    { id: IDS.cust2, customer_code: 'CUST-0002', display_name: 'Arvind Fashions Ltd', email: 'purchase@arvind.com', phone: '+91-79-66565656', billing_address: 'Lalbhai Centre, Kasturbhai Lalbhai Rd', billing_city: 'Ahmedabad', billing_state: 'Gujarat', billing_country: 'India', billing_pincode: '380009', gst_number: '24AAACA6523F1ZM', currency_code: 'INR' },
    { id: IDS.cust3, customer_code: 'CUST-0003', display_name: 'H&M Hennes India Pvt Ltd', email: 'sourcing@hm.com', phone: '+91-124-4578900', billing_address: 'DLF Cyber City, Phase-III', billing_city: 'Gurugram', billing_state: 'Haryana', billing_country: 'India', billing_pincode: '122002', gst_number: '06AAECH1234K1ZP', currency_code: 'INR' },
    { id: IDS.cust4, customer_code: 'CUST-0004', display_name: 'Shoppers Stop Ltd', email: 'merch@shoppersstop.com', phone: '+91-22-42921234', billing_address: 'Umang Tower, Mindspace', billing_city: 'Mumbai', billing_state: 'Maharashtra', billing_country: 'India', billing_pincode: '400064', gst_number: '27AAACS2345F1ZQ', currency_code: 'INR' },
    { id: IDS.cust5, customer_code: 'CUST-0005', display_name: 'Lifestyle International Pvt Ltd', email: 'buyer@lifestylestores.com', phone: '+91-80-41234567', billing_address: 'Brigade Gateway, Rajajinagar', billing_city: 'Bangalore', billing_state: 'Karnataka', billing_country: 'India', billing_pincode: '560010', gst_number: '29AAACL6789G1ZR', currency_code: 'INR' },
    { id: IDS.cust6, customer_code: 'CUST-0006', display_name: 'Marks & Spencer India', email: 'sourcing.india@marksandspencer.com', phone: '+91-22-66789000', billing_address: 'Express Towers, Nariman Point', billing_city: 'Mumbai', billing_state: 'Maharashtra', billing_country: 'India', billing_pincode: '400021', gst_number: '27AAACM3456H1ZS', currency_code: 'INR' },
    { id: IDS.cust7, customer_code: 'CUST-0007', display_name: 'Al Futtaim Trading LLC', email: 'procurement@alfuttaim.ae', phone: '+971-4-2345678', billing_address: 'Dubai Festival City', billing_city: 'Dubai', billing_state: 'Dubai', billing_country: 'UAE', billing_pincode: '00000', currency_code: 'USD' },
    { id: IDS.cust8, customer_code: 'CUST-0008', display_name: 'Primark UK Ltd', email: 'sourcing@primark.co.uk', phone: '+44-20-73238900', billing_address: '22-24 Oxford Street', billing_city: 'London', billing_state: 'England', billing_country: 'United Kingdom', billing_pincode: 'W1D 1AU', currency_code: 'USD' },
  ]);

  // ── Vendors ─────────────────────────────────────────────────────
  await knex('vendors').insert([
    { id: IDS.vend1, vendor_code: 'VEND-0001', display_name: 'Vardhman Textiles Ltd', email: 'sales@vardhman.com', phone: '+91-161-2690900', billing_address: 'Chandigarh Road', billing_city: 'Ludhiana', billing_state: 'Punjab', billing_country: 'India', gst_number: '03AAACV5678K1ZT', currency_code: 'INR' },
    { id: IDS.vend2, vendor_code: 'VEND-0002', display_name: 'Raymond Fabrics Div', email: 'fabric@raymond.in', phone: '+91-22-28282828', billing_address: 'Jamnalal Bajaj Marg', billing_city: 'Mumbai', billing_state: 'Maharashtra', billing_country: 'India', gst_number: '27AAACR8901L1ZU', currency_code: 'INR' },
    { id: IDS.vend3, vendor_code: 'VEND-0003', display_name: 'YKK India Pvt Ltd', email: 'orders@ykk.co.in', phone: '+91-124-4201234', billing_address: 'Plot 82, Sector 32', billing_city: 'Gurugram', billing_state: 'Haryana', billing_country: 'India', gst_number: '06AAACY2345M1ZV', currency_code: 'INR' },
    { id: IDS.vend4, vendor_code: 'VEND-0004', display_name: 'Archroma India Pvt Ltd', email: 'dyes@archroma.com', phone: '+91-22-39889988', billing_address: 'Thane-Belapur Rd', billing_city: 'Thane', billing_state: 'Maharashtra', billing_country: 'India', gst_number: '27AAACA1234N1ZW', currency_code: 'INR' },
    { id: IDS.vend5, vendor_code: 'VEND-0005', display_name: 'Supreme Industries Ltd', email: 'packaging@supreme.co.in', phone: '+91-22-25861876', billing_address: 'Lal Bahadur Shastri Marg', billing_city: 'Mumbai', billing_state: 'Maharashtra', billing_country: 'India', gst_number: '27AAACS5678P1ZX', currency_code: 'INR' },
    { id: IDS.vend6, vendor_code: 'VEND-0006', display_name: 'Sagar Enterprises', email: 'sagar.trims@gmail.com', phone: '+91-11-23456789', billing_address: 'Karol Bagh, Shop No. 45', billing_city: 'New Delhi', billing_state: 'Delhi', billing_country: 'India', gst_number: '07AADCS9012Q1ZY', currency_code: 'INR' },
  ]);

  // ── Items ────────────────────────────────────────────────────────
  await knex('items').insert([
    { id: IDS.item1, item_name: 'Cotton Fabric 60s', hsn_code: '5208', unit: 'm', selling_price: 180, purchase_price: 140, gst_rate: 5, item_type: 'Goods', sku: 'FAB-COT-60' },
    { id: IDS.item2, item_name: 'Polyester Fabric PV', hsn_code: '5407', unit: 'm', selling_price: 120, purchase_price: 85, gst_rate: 5, item_type: 'Goods', sku: 'FAB-POLY-PV' },
    { id: IDS.item3, item_name: 'Denim Fabric 10oz', hsn_code: '5209', unit: 'm', selling_price: 280, purchase_price: 210, gst_rate: 5, item_type: 'Goods', sku: 'FAB-DEN-10' },
    { id: IDS.item4, item_name: 'YKK Zipper 7 inch', hsn_code: '9607', unit: 'pcs', selling_price: 18, purchase_price: 12, gst_rate: 12, item_type: 'Goods', sku: 'TRM-ZIP-7' },
    { id: IDS.item5, item_name: 'Buttons 4-hole 15mm', hsn_code: '9606', unit: 'pcs', selling_price: 3, purchase_price: 1.5, gst_rate: 12, item_type: 'Goods', sku: 'TRM-BTN-15' },
    { id: IDS.item6, item_name: 'Mens Formal Shirt', hsn_code: '6205', unit: 'pcs', selling_price: 650, purchase_price: 0, gst_rate: 12, item_type: 'Goods', sku: 'FG-SHIRT-MF' },
    { id: IDS.item7, item_name: 'Mens Casual Trouser', hsn_code: '6203', unit: 'pcs', selling_price: 850, purchase_price: 0, gst_rate: 12, item_type: 'Goods', sku: 'FG-TROUS-MC' },
    { id: IDS.item8, item_name: 'Ladies Kurta Cotton', hsn_code: '6204', unit: 'pcs', selling_price: 550, purchase_price: 0, gst_rate: 12, item_type: 'Goods', sku: 'FG-KURTA-LC' },
    { id: IDS.item9, item_name: 'Poly Bag 12x16', hsn_code: '3923', unit: 'pcs', selling_price: 5, purchase_price: 3, gst_rate: 18, item_type: 'Goods', sku: 'PKG-PBAG-12' },
    { id: IDS.item10, item_name: 'Export Carton 5-ply', hsn_code: '4819', unit: 'pcs', selling_price: 85, purchase_price: 55, gst_rate: 18, item_type: 'Goods', sku: 'PKG-CART-5P' },
  ]);

  // ── Bank Accounts ───────────────────────────────────────────────
  await knex('bank_accounts').insert([
    { id: IDS.bank1, account_name: 'ICICI Current Account', bank_name: 'ICICI Bank', account_number: '012345678901', account_type: 'Current', ifsc: 'ICIC0001234', branch: 'Sector 14, Gurugram', opening_balance: 1500000, current_balance: 2875000, is_active: true },
    { id: IDS.bank2, account_name: 'HDFC Savings Account', bank_name: 'HDFC Bank', account_number: '50100123456789', account_type: 'Savings', ifsc: 'HDFC0005678', branch: 'MG Road, Gurugram', opening_balance: 500000, current_balance: 680000, is_active: true },
    { id: IDS.bank3, account_name: 'SBI Current Account', bank_name: 'State Bank of India', account_number: '30987654321', account_type: 'Current', ifsc: 'SBIN0009012', branch: 'Industrial Area, Gurugram', opening_balance: 800000, current_balance: 950000, is_active: true },
  ]);

  // ── Invoices ────────────────────────────────────────────────────
  await knex('invoices').insert([
    { id: IDS.inv1, invoice_number: 'INV-0001', invoice_date: '2025-11-15', due_date: '2025-12-15', customer_id: IDS.cust1, status: 'Paid', subtotal: 325000, igst_amount: 39000, cgst_amount: 0, sgst_amount: 0, gst_amount: 39000, total_amount: 364000, paid_amount: 364000, place_of_supply: 'Maharashtra', currency_code: 'INR' },
    { id: IDS.inv2, invoice_number: 'INV-0002', invoice_date: '2025-12-01', due_date: '2025-12-31', customer_id: IDS.cust3, status: 'Paid', subtotal: 195000, igst_amount: 0, cgst_amount: 11700, sgst_amount: 11700, gst_amount: 23400, total_amount: 218400, paid_amount: 218400, place_of_supply: 'Haryana', currency_code: 'INR' },
    { id: IDS.inv3, invoice_number: 'INV-0003', invoice_date: '2025-12-20', due_date: '2026-01-20', customer_id: IDS.cust2, status: 'Partial', subtotal: 450000, igst_amount: 54000, cgst_amount: 0, sgst_amount: 0, gst_amount: 54000, total_amount: 504000, paid_amount: 250000, place_of_supply: 'Gujarat', currency_code: 'INR' },
    { id: IDS.inv4, invoice_number: 'INV-0004', invoice_date: '2026-01-05', due_date: '2026-02-05', customer_id: IDS.cust5, status: 'Final', subtotal: 275000, igst_amount: 33000, cgst_amount: 0, sgst_amount: 0, gst_amount: 33000, total_amount: 308000, paid_amount: 0, place_of_supply: 'Karnataka', currency_code: 'INR' },
    { id: IDS.inv5, invoice_number: 'INV-0005', invoice_date: '2026-01-15', due_date: '2026-02-15', customer_id: IDS.cust4, status: 'Overdue', subtotal: 180000, igst_amount: 21600, cgst_amount: 0, sgst_amount: 0, gst_amount: 21600, total_amount: 201600, paid_amount: 0, place_of_supply: 'Maharashtra', currency_code: 'INR' },
    { id: IDS.inv6, invoice_number: 'INV-0006', invoice_date: '2026-01-25', due_date: '2026-02-25', customer_id: IDS.cust3, status: 'Draft', subtotal: 120000, igst_amount: 0, cgst_amount: 7200, sgst_amount: 7200, gst_amount: 14400, total_amount: 134400, paid_amount: 0, place_of_supply: 'Haryana', currency_code: 'INR' },
  ]);

  // Invoice Items
  await knex('invoice_items').insert([
    { invoice_id: IDS.inv1, item_name: 'Mens Formal Shirt', hsn_code: '6205', quantity: 500, rate: 650, amount: 325000, gst_rate: 12, gst_amount: 39000, sort_order: 1 },
    { invoice_id: IDS.inv2, item_name: 'Ladies Kurta Cotton', hsn_code: '6204', quantity: 200, rate: 550, amount: 110000, gst_rate: 12, gst_amount: 13200, sort_order: 1 },
    { invoice_id: IDS.inv2, item_name: 'Mens Casual Trouser', hsn_code: '6203', quantity: 100, rate: 850, amount: 85000, gst_rate: 12, gst_amount: 10200, sort_order: 2 },
    { invoice_id: IDS.inv3, item_name: 'Mens Formal Shirt', hsn_code: '6205', quantity: 400, rate: 650, amount: 260000, gst_rate: 12, gst_amount: 31200, sort_order: 1 },
    { invoice_id: IDS.inv3, item_name: 'Mens Casual Trouser', hsn_code: '6203', quantity: 200, rate: 850, amount: 170000, gst_rate: 12, gst_amount: 20400, sort_order: 2 },
    { invoice_id: IDS.inv3, item_name: 'Poly Bag 12x16', hsn_code: '3923', quantity: 600, rate: 5, amount: 3000, gst_rate: 18, gst_amount: 540, sort_order: 3 },
    { invoice_id: IDS.inv4, item_name: 'Ladies Kurta Cotton', hsn_code: '6204', quantity: 500, rate: 550, amount: 275000, gst_rate: 12, gst_amount: 33000, sort_order: 1 },
    { invoice_id: IDS.inv5, item_name: 'Mens Formal Shirt', hsn_code: '6205', quantity: 200, rate: 650, amount: 130000, gst_rate: 12, gst_amount: 15600, sort_order: 1 },
    { invoice_id: IDS.inv5, item_name: 'Export Carton 5-ply', hsn_code: '4819', quantity: 50, rate: 85, amount: 4250, gst_rate: 18, gst_amount: 765, sort_order: 2 },
    { invoice_id: IDS.inv6, item_name: 'Mens Casual Trouser', hsn_code: '6203', quantity: 100, rate: 850, amount: 85000, gst_rate: 12, gst_amount: 10200, sort_order: 1 },
    { invoice_id: IDS.inv6, item_name: 'Ladies Kurta Cotton', hsn_code: '6204', quantity: 50, rate: 550, amount: 27500, gst_rate: 12, gst_amount: 3300, sort_order: 2 },
  ]);

  // ── Quotations ──────────────────────────────────────────────────
  await knex('quotations').insert([
    { id: IDS.quot1, quotation_number: 'QTN-0001', quotation_date: '2025-10-15', expiry_date: '2025-11-15', customer_id: IDS.cust1, status: 'Accepted', subtotal: 325000, gst_amount: 39000, total_amount: 364000, currency_code: 'INR' },
    { id: IDS.quot2, quotation_number: 'QTN-0002', quotation_date: '2026-01-10', expiry_date: '2026-02-10', customer_id: IDS.cust6, status: 'Sent', subtotal: 550000, gst_amount: 66000, total_amount: 616000, currency_code: 'INR' },
    { id: IDS.quot3, quotation_number: 'QTN-0003', quotation_date: '2026-01-28', expiry_date: '2026-02-28', customer_id: IDS.cust7, status: 'Draft', subtotal: 780000, gst_amount: 0, total_amount: 780000, currency_code: 'USD' },
  ]);

  await knex('quotation_items').insert([
    { quotation_id: IDS.quot1, item_name: 'Mens Formal Shirt', hsn_code: '6205', quantity: 500, rate: 650, amount: 325000, gst_rate: 12, gst_amount: 39000, sort_order: 1 },
    { quotation_id: IDS.quot2, item_name: 'Mens Formal Shirt', hsn_code: '6205', quantity: 500, rate: 650, amount: 325000, gst_rate: 12, gst_amount: 39000, sort_order: 1 },
    { quotation_id: IDS.quot2, item_name: 'Ladies Kurta Cotton', hsn_code: '6204', quantity: 300, rate: 550, amount: 165000, gst_rate: 12, gst_amount: 19800, sort_order: 2 },
    { quotation_id: IDS.quot3, item_name: 'Mens Casual Trouser', hsn_code: '6203', quantity: 800, rate: 850, amount: 680000, gst_rate: 0, gst_amount: 0, sort_order: 1 },
  ]);

  // ── Bills ───────────────────────────────────────────────────────
  await knex('bills').insert([
    { id: IDS.bill1, bill_number: 'BILL-0001', bill_date: '2025-11-01', due_date: '2025-12-01', vendor_id: IDS.vend1, status: 'Paid', subtotal: 280000, igst_amount: 14000, gst_amount: 14000, total_amount: 294000, paid_amount: 294000, currency_code: 'INR' },
    { id: IDS.bill2, bill_number: 'BILL-0002', bill_date: '2025-12-10', due_date: '2026-01-10', vendor_id: IDS.vend2, status: 'Paid', subtotal: 170000, igst_amount: 8500, gst_amount: 8500, total_amount: 178500, paid_amount: 178500, currency_code: 'INR' },
    { id: IDS.bill3, bill_number: 'BILL-0003', bill_date: '2026-01-05', due_date: '2026-02-05', vendor_id: IDS.vend3, status: 'Pending', subtotal: 36000, igst_amount: 0, cgst_amount: 2160, sgst_amount: 2160, gst_amount: 4320, total_amount: 40320, paid_amount: 0, currency_code: 'INR' },
    { id: IDS.bill4, bill_number: 'BILL-0004', bill_date: '2026-01-20', due_date: '2026-02-20', vendor_id: IDS.vend5, status: 'Pending', subtotal: 55000, igst_amount: 9900, gst_amount: 9900, total_amount: 64900, paid_amount: 0, currency_code: 'INR' },
  ]);

  await knex('bill_items').insert([
    { bill_id: IDS.bill1, item_name: 'Cotton Fabric 60s', hsn_code: '5208', quantity: 2000, rate: 140, amount: 280000, gst_rate: 5, gst_amount: 14000, sort_order: 1 },
    { bill_id: IDS.bill2, item_name: 'Polyester Fabric PV', hsn_code: '5407', quantity: 2000, rate: 85, amount: 170000, gst_rate: 5, gst_amount: 8500, sort_order: 1 },
    { bill_id: IDS.bill3, item_name: 'YKK Zipper 7 inch', hsn_code: '9607', quantity: 3000, rate: 12, amount: 36000, gst_rate: 12, gst_amount: 4320, sort_order: 1 },
    { bill_id: IDS.bill4, item_name: 'Export Carton 5-ply', hsn_code: '4819', quantity: 1000, rate: 55, amount: 55000, gst_rate: 18, gst_amount: 9900, sort_order: 1 },
  ]);

  // ── Purchase Orders ─────────────────────────────────────────────
  await knex('purchase_orders').insert([
    { id: IDS.po1, po_number: 'PO-0001', po_date: '2025-10-20', expected_date: '2025-11-10', vendor_id: IDS.vend1, status: 'Received', subtotal: 280000, gst_amount: 14000, total_amount: 294000, currency_code: 'INR' },
    { id: IDS.po2, po_number: 'PO-0002', po_date: '2026-01-15', expected_date: '2026-02-15', vendor_id: IDS.vend6, status: 'Sent', subtotal: 45000, gst_amount: 5400, total_amount: 50400, currency_code: 'INR' },
  ]);

  await knex('purchase_order_items').insert([
    { purchase_order_id: IDS.po1, item_name: 'Cotton Fabric 60s', hsn_code: '5208', ordered_quantity: 2000, received_quantity: 2000, rate: 140, amount: 280000, gst_rate: 5, sort_order: 1 },
    { purchase_order_id: IDS.po2, item_name: 'Buttons 4-hole 15mm', hsn_code: '9606', ordered_quantity: 10000, received_quantity: 0, rate: 1.5, amount: 15000, gst_rate: 12, sort_order: 1 },
    { purchase_order_id: IDS.po2, item_name: 'YKK Zipper 7 inch', hsn_code: '9607', ordered_quantity: 2500, received_quantity: 0, rate: 12, amount: 30000, gst_rate: 12, sort_order: 2 },
  ]);

  // ── Payments Received ───────────────────────────────────────────
  await knex('payments_received').insert([
    { id: IDS.pr1, payment_number: 'PR-0001', payment_date: '2025-12-10', customer_id: IDS.cust1, amount: 364000, currency_code: 'INR', payment_mode: 'Bank Transfer', reference_number: 'NEFT/12345' },
    { id: IDS.pr2, payment_number: 'PR-0002', payment_date: '2025-12-28', customer_id: IDS.cust3, amount: 218400, currency_code: 'INR', payment_mode: 'RTGS', reference_number: 'RTGS/67890' },
    { id: IDS.pr3, payment_number: 'PR-0003', payment_date: '2026-01-15', customer_id: IDS.cust2, amount: 250000, currency_code: 'INR', payment_mode: 'Bank Transfer', reference_number: 'NEFT/11223' },
  ]);

  await knex('payment_received_allocations').insert([
    { payment_received_id: IDS.pr1, invoice_id: IDS.inv1, amount: 364000 },
    { payment_received_id: IDS.pr2, invoice_id: IDS.inv2, amount: 218400 },
    { payment_received_id: IDS.pr3, invoice_id: IDS.inv3, amount: 250000 },
  ]);

  // ── Payments Made ───────────────────────────────────────────────
  await knex('payments_made').insert([
    { id: IDS.pm1, payment_number: 'PM-0001', payment_date: '2025-11-25', vendor_id: IDS.vend1, amount: 294000, currency_code: 'INR', payment_mode: 'NEFT', reference_number: 'NEFT/V001' },
    { id: IDS.pm2, payment_number: 'PM-0002', payment_date: '2026-01-08', vendor_id: IDS.vend2, amount: 178500, currency_code: 'INR', payment_mode: 'RTGS', reference_number: 'RTGS/V002' },
  ]);

  await knex('payment_made_allocations').insert([
    { payment_made_id: IDS.pm1, bill_id: IDS.bill1, amount: 294000 },
    { payment_made_id: IDS.pm2, bill_id: IDS.bill2, amount: 178500 },
  ]);

  // ── Expenses ────────────────────────────────────────────────────
  await knex('expenses').insert([
    { id: IDS.exp1, expense_number: 'EXP-0001', expense_date: '2026-01-05', category: 'Rent', description: 'Factory rent for January 2026', amount: 150000, total_amount: 150000, payment_mode: 'Bank Transfer', status: 'Paid' },
    { id: IDS.exp2, expense_number: 'EXP-0002', expense_date: '2026-01-10', category: 'Utilities', description: 'Electricity bill - factory', amount: 45000, total_amount: 45000, payment_mode: 'Bank Transfer', status: 'Paid' },
    { id: IDS.exp3, expense_number: 'EXP-0003', expense_date: '2026-01-15', category: 'Travel', description: 'Delhi fabric exhibition travel', amount: 12500, total_amount: 12500, payment_mode: 'Cash', status: 'Approved' },
    { id: IDS.exp4, expense_number: 'EXP-0004', expense_date: '2026-01-28', category: 'Maintenance', description: 'Sewing machine servicing', amount: 8500, total_amount: 8500, payment_mode: 'Cash', status: 'Pending' },
  ]);

  // ── Credit Note ─────────────────────────────────────────────────
  await knex('credit_notes').insert([
    { id: IDS.cn1, credit_note_number: 'CN-0001', credit_note_date: '2025-12-05', customer_id: IDS.cust1, invoice_id: IDS.inv1, status: 'Approved', reason: 'Defective shirts returned', subtotal: 13000, igst_amount: 1560, gst_amount: 1560, total_amount: 14560 },
  ]);

  await knex('credit_note_items').insert([
    { credit_note_id: IDS.cn1, item_name: 'Mens Formal Shirt', hsn_code: '6205', quantity: 20, rate: 650, amount: 13000, gst_rate: 12, sort_order: 1 },
  ]);

  // ── Debit Note ──────────────────────────────────────────────────
  await knex('debit_notes').insert([
    { id: IDS.dn1, debit_note_number: 'DN-0001', debit_note_date: '2025-11-20', vendor_id: IDS.vend1, bill_id: IDS.bill1, status: 'Approved', reason: 'Fabric quality below spec', subtotal: 14000, igst_amount: 700, gst_amount: 700, total_amount: 14700 },
  ]);

  await knex('debit_note_items').insert([
    { debit_note_id: IDS.dn1, item_name: 'Cotton Fabric 60s', hsn_code: '5208', quantity: 100, rate: 140, amount: 14000, gst_rate: 5, sort_order: 1 },
  ]);

  // ── Employees ───────────────────────────────────────────────────
  await knex('employees').insert([
    { id: IDS.emp1, employee_id: 'EMP-0001', first_name: 'Rajesh', last_name: 'Sharma', display_name: 'Rajesh Sharma', date_of_birth: '1985-03-15', gender: 'Male', mobile_number: '9876543210', work_email: 'rajesh@navodita.com', department_id: IDS.deptProduction, designation: 'Production Manager', joining_date: '2018-04-01', basic_salary: 35000, hra: 14000, fixed_allowance: 6000, monthly_ctc: 55000, is_pf_applicable: true, is_esi_applicable: false, pf_employee_percent: 12, pf_employer_percent: 12, is_active: true, billing_state: 'Haryana' },
    { id: IDS.emp2, employee_id: 'EMP-0002', first_name: 'Priya', last_name: 'Gupta', display_name: 'Priya Gupta', date_of_birth: '1990-07-22', gender: 'Female', mobile_number: '9876543211', work_email: 'priya@navodita.com', department_id: IDS.deptSales, designation: 'Sales Head', joining_date: '2019-06-15', basic_salary: 30000, hra: 12000, fixed_allowance: 5000, monthly_ctc: 47000, is_pf_applicable: true, is_esi_applicable: false, pf_employee_percent: 12, pf_employer_percent: 12, is_active: true, billing_state: 'Haryana' },
    { id: IDS.emp3, employee_id: 'EMP-0003', first_name: 'Amit', last_name: 'Verma', display_name: 'Amit Verma', date_of_birth: '1988-11-10', gender: 'Male', mobile_number: '9876543212', work_email: 'amit@navodita.com', department_id: IDS.deptAccounts, designation: 'Chief Accountant', joining_date: '2017-01-10', basic_salary: 40000, hra: 16000, fixed_allowance: 7000, monthly_ctc: 63000, is_pf_applicable: true, is_esi_applicable: false, pf_employee_percent: 12, pf_employer_percent: 12, is_active: true, billing_state: 'Haryana' },
    { id: IDS.emp4, employee_id: 'EMP-0004', first_name: 'Sunita', last_name: 'Yadav', display_name: 'Sunita Yadav', date_of_birth: '1992-05-28', gender: 'Female', mobile_number: '9876543213', work_email: 'sunita@navodita.com', department_id: IDS.deptHR, designation: 'HR Manager', joining_date: '2020-03-01', basic_salary: 28000, hra: 11200, fixed_allowance: 4800, monthly_ctc: 44000, is_pf_applicable: true, is_esi_applicable: false, pf_employee_percent: 12, pf_employer_percent: 12, is_active: true, billing_state: 'Haryana' },
    { id: IDS.emp5, employee_id: 'EMP-0005', first_name: 'Mohammad', last_name: 'Khan', display_name: 'Mohammad Khan', date_of_birth: '1993-09-05', gender: 'Male', mobile_number: '9876543214', work_email: 'mohammad@navodita.com', department_id: IDS.deptProduction, designation: 'Floor Supervisor', joining_date: '2021-08-01', basic_salary: 22000, hra: 8800, fixed_allowance: 3200, monthly_ctc: 34000, is_pf_applicable: true, is_esi_applicable: true, pf_employee_percent: 12, pf_employer_percent: 12, esi_employee_percent: 0.75, esi_employer_percent: 3.25, is_active: true, billing_state: 'Haryana' },
    { id: IDS.emp6, employee_id: 'EMP-0006', first_name: 'Neha', last_name: 'Singh', display_name: 'Neha Singh', date_of_birth: '1995-01-18', gender: 'Female', mobile_number: '9876543215', work_email: 'neha@navodita.com', department_id: IDS.deptSales, designation: 'Sales Executive', joining_date: '2022-02-14', basic_salary: 18000, hra: 7200, fixed_allowance: 2800, monthly_ctc: 28000, is_pf_applicable: true, is_esi_applicable: true, pf_employee_percent: 12, pf_employer_percent: 12, esi_employee_percent: 0.75, esi_employer_percent: 3.25, is_active: true, billing_state: 'Haryana' },
    { id: IDS.emp7, employee_id: 'EMP-0007', first_name: 'Vikram', last_name: 'Chauhan', display_name: 'Vikram Chauhan', date_of_birth: '1987-06-30', gender: 'Male', mobile_number: '9876543216', work_email: 'vikram@navodita.com', department_id: IDS.deptAdmin, designation: 'Admin Officer', joining_date: '2019-11-01', basic_salary: 20000, hra: 8000, fixed_allowance: 3000, monthly_ctc: 31000, is_pf_applicable: true, is_esi_applicable: true, pf_employee_percent: 12, pf_employer_percent: 12, esi_employee_percent: 0.75, esi_employer_percent: 3.25, is_active: true, billing_state: 'Haryana' },
    { id: IDS.emp8, employee_id: 'EMP-0008', first_name: 'Pooja', last_name: 'Rani', display_name: 'Pooja Rani', date_of_birth: '1996-12-03', gender: 'Female', mobile_number: '9876543217', work_email: 'pooja@navodita.com', department_id: IDS.deptProduction, designation: 'Quality Inspector', joining_date: '2023-05-15', basic_salary: 16000, hra: 6400, fixed_allowance: 2600, monthly_ctc: 25000, is_pf_applicable: true, is_esi_applicable: true, pf_employee_percent: 12, pf_employer_percent: 12, esi_employee_percent: 0.75, esi_employer_percent: 3.25, is_active: true, billing_state: 'Haryana' },
  ]);

  // ── Salary Records (Jan 2026) ───────────────────────────────────
  await knex('salary_records').insert([
    { id: IDS.sal1, employee_id: IDS.emp1, month: 1, year: 2026, total_days: 31, days_present: 28, days_absent: 3, basic_salary: 35000, hra: 14000, fixed_allowance: 6000, gross_salary: 55000, pf_employee: 4200, pf_employer: 4200, professional_tax: 200, tds: 2500, total_deductions: 6900, net_pay: 48100, status: 'Finalized' },
    { id: IDS.sal2, employee_id: IDS.emp2, month: 1, year: 2026, total_days: 31, days_present: 30, days_absent: 1, basic_salary: 30000, hra: 12000, fixed_allowance: 5000, gross_salary: 47000, pf_employee: 3600, pf_employer: 3600, professional_tax: 200, tds: 1500, total_deductions: 5300, net_pay: 41700, status: 'Finalized' },
    { id: IDS.sal3, employee_id: IDS.emp3, month: 1, year: 2026, total_days: 31, days_present: 31, days_absent: 0, basic_salary: 40000, hra: 16000, fixed_allowance: 7000, gross_salary: 63000, pf_employee: 4800, pf_employer: 4800, professional_tax: 200, tds: 3500, total_deductions: 8500, net_pay: 54500, status: 'Finalized' },
    { id: IDS.sal4, employee_id: IDS.emp4, month: 1, year: 2026, total_days: 31, days_present: 29, days_absent: 2, basic_salary: 28000, hra: 11200, fixed_allowance: 4800, gross_salary: 44000, pf_employee: 3360, pf_employer: 3360, professional_tax: 200, tds: 1000, total_deductions: 4560, net_pay: 39440, status: 'Finalized' },
    { id: IDS.sal5, employee_id: IDS.emp5, month: 1, year: 2026, total_days: 31, days_present: 27, days_absent: 4, basic_salary: 22000, hra: 8800, fixed_allowance: 3200, gross_salary: 34000, pf_employee: 2640, pf_employer: 2640, esi_employee: 255, esi_employer: 1105, professional_tax: 200, total_deductions: 3095, net_pay: 30905, status: 'Finalized' },
    { id: IDS.sal6, employee_id: IDS.emp6, month: 1, year: 2026, total_days: 31, days_present: 30, days_absent: 1, basic_salary: 18000, hra: 7200, fixed_allowance: 2800, gross_salary: 28000, pf_employee: 2160, pf_employer: 2160, esi_employee: 210, esi_employer: 910, professional_tax: 200, total_deductions: 2570, net_pay: 25430, status: 'Finalized' },
    { id: IDS.sal7, employee_id: IDS.emp7, month: 1, year: 2026, total_days: 31, days_present: 31, days_absent: 0, basic_salary: 20000, hra: 8000, fixed_allowance: 3000, gross_salary: 31000, pf_employee: 2400, pf_employer: 2400, esi_employee: 232, esi_employer: 1008, professional_tax: 200, total_deductions: 2832, net_pay: 28168, status: 'Finalized' },
    { id: IDS.sal8, employee_id: IDS.emp8, month: 1, year: 2026, total_days: 31, days_present: 26, days_absent: 5, basic_salary: 16000, hra: 6400, fixed_allowance: 2600, gross_salary: 25000, pf_employee: 1920, pf_employer: 1920, esi_employee: 188, esi_employer: 813, professional_tax: 200, total_deductions: 2308, net_pay: 22692, status: 'Draft' },
  ]);

  // ── Bank Transactions ───────────────────────────────────────────
  await knex('bank_transactions').insert([
    { bank_account_id: IDS.bank1, transaction_date: '2025-11-15', description: 'NEFT-Reliance Retail-INV0001', deposit_amount: 364000, withdrawal_amount: 0, balance: 1864000, category: 'Sales Receipt', is_reconciled: true },
    { bank_account_id: IDS.bank1, transaction_date: '2025-11-25', description: 'NEFT-Vardhman Textiles-BILL0001', deposit_amount: 0, withdrawal_amount: 294000, balance: 1570000, category: 'Vendor Payment', is_reconciled: true },
    { bank_account_id: IDS.bank1, transaction_date: '2025-12-01', description: 'NEFT-Factory Rent Dec', deposit_amount: 0, withdrawal_amount: 150000, balance: 1420000, category: 'Rent', is_reconciled: true },
    { bank_account_id: IDS.bank1, transaction_date: '2025-12-10', description: 'RTGS-H&M India-INV0002', deposit_amount: 218400, withdrawal_amount: 0, balance: 1638400, category: 'Sales Receipt', is_reconciled: true },
    { bank_account_id: IDS.bank1, transaction_date: '2026-01-05', description: 'NEFT-Factory Rent Jan', deposit_amount: 0, withdrawal_amount: 150000, balance: 1488400, category: 'Rent', is_reconciled: false },
    { bank_account_id: IDS.bank1, transaction_date: '2026-01-08', description: 'RTGS-Raymond Fabrics-BILL0002', deposit_amount: 0, withdrawal_amount: 178500, balance: 1309900, category: 'Vendor Payment', is_reconciled: false },
    { bank_account_id: IDS.bank1, transaction_date: '2026-01-10', description: 'NEFT-Electricity Bill Jan', deposit_amount: 0, withdrawal_amount: 45000, balance: 1264900, category: 'Utilities', is_reconciled: false },
    { bank_account_id: IDS.bank1, transaction_date: '2026-01-15', description: 'NEFT-Arvind Fashions-INV0003 Part', deposit_amount: 250000, withdrawal_amount: 0, balance: 1514900, category: 'Sales Receipt', is_reconciled: false },
    { bank_account_id: IDS.bank1, transaction_date: '2026-01-31', description: 'Salary Payout Jan 2026', deposit_amount: 0, withdrawal_amount: 290935, balance: 1223965, category: 'Salary', is_reconciled: false },
    { bank_account_id: IDS.bank2, transaction_date: '2025-12-15', description: 'Interest Credit Q3', deposit_amount: 8500, withdrawal_amount: 0, balance: 508500, category: 'Interest', is_reconciled: true },
    { bank_account_id: IDS.bank2, transaction_date: '2026-01-15', description: 'Interest Credit Q4', deposit_amount: 9200, withdrawal_amount: 0, balance: 517700, category: 'Interest', is_reconciled: false },
    { bank_account_id: IDS.bank3, transaction_date: '2025-12-20', description: 'NEFT-Client Advance', deposit_amount: 100000, withdrawal_amount: 0, balance: 900000, category: 'Advance', is_reconciled: true },
    { bank_account_id: IDS.bank3, transaction_date: '2026-01-20', description: 'UPI-Courier Charges', deposit_amount: 0, withdrawal_amount: 3500, balance: 896500, category: 'Courier', is_reconciled: false },
  ]);

  // ── Update Invoice Number Settings ──────────────────────────────
  await knex('invoice_number_settings').where({ document_type: 'Invoice' }).update({ next_number: 7 });
  await knex('invoice_number_settings').where({ document_type: 'Quotation' }).update({ next_number: 4 });
  await knex('invoice_number_settings').where({ document_type: 'Bill' }).update({ next_number: 5 });
  await knex('invoice_number_settings').where({ document_type: 'PurchaseOrder' }).update({ next_number: 3 });
  await knex('invoice_number_settings').where({ document_type: 'PaymentReceived' }).update({ next_number: 4 });
  await knex('invoice_number_settings').where({ document_type: 'PaymentMade' }).update({ next_number: 3 });
  await knex('invoice_number_settings').where({ document_type: 'Expense' }).update({ next_number: 5 });
  await knex('invoice_number_settings').where({ document_type: 'CreditNote' }).update({ next_number: 2 });
  await knex('invoice_number_settings').where({ document_type: 'DebitNote' }).update({ next_number: 2 });
  await knex('invoice_number_settings').where({ document_type: 'Salary' }).update({ next_number: 9 });

  console.log('Test data seeded: 8 customers, 6 vendors, 10 items, 6 invoices, 3 quotations, 4 bills, 2 POs, 3 payments received, 2 payments made, 4 expenses, 1 credit note, 1 debit note, 8 employees, 8 salary records, 3 bank accounts, 13 bank transactions');
};
