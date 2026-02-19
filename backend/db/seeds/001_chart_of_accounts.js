/**
 * Seed 001: Chart of Accounts
 * All 127 accounts extracted from ChartOfAccountsDataPreloader.swift
 * Grouped by account type: Income, Expense, Cost Of Goods Sold, Cash, Bank,
 * Payment Clearing, Accounts Receivable, Fixed Asset, Stock, Other Current Asset,
 * Other Current Liability, Other Liability, Equity, Long Term Liability,
 * Other Expense, Other Income
 */

exports.seed = async function (knex) {
  // Truncate chart_of_accounts (cascade will handle journal_lines FK)
  await knex('chart_of_accounts').del();

  // ---------------------------------------------------------------------------
  // Helper: We need parent references for some accounts. Since we use
  // gen_random_uuid() and cannot predict IDs ahead of time, we insert accounts
  // in two passes:
  //   1. Insert all accounts WITHOUT parent_account_id
  //   2. Update the ones that have a parent (keyed by legacy_account_id)
  // ---------------------------------------------------------------------------

  // Each entry: { legacy_id, account_code, account_name, description, account_type, currency_code, parent_legacy_id, is_active }
  const allAccounts = [
    // ── INCOME (8) ──────────────────────────────────────────────────────
    { legacy_id: '5971777000000010001', account_code: 'INC-001', account_name: 'Other Charges', description: 'Miscellaneous charges like adjustments made to the invoice can be recorded in this account.', account_type: 'Income', is_active: true },
    { legacy_id: '5971777000000000388', account_code: 'INC-002', account_name: 'Sales', description: 'The income from the sales in your business is recorded under the sales account.', account_type: 'Income', is_active: true },
    { legacy_id: '5971777000000000391', account_code: 'INC-003', account_name: 'General Income', description: 'A general category of account where you can record any income which cannot be recorded into any other category.', account_type: 'Income', is_active: true },
    { legacy_id: '5971777000000000394', account_code: 'INC-004', account_name: 'Interest Income', description: 'A percentage of your balances and deposits are given as interest to you by your banks and financial institutions.', account_type: 'Income', is_active: true },
    { legacy_id: '5971777000000000397', account_code: 'INC-005', account_name: 'Late Fee Income', description: 'Any late fee income is recorded into the late fee income account.', account_type: 'Income', is_active: true },
    { legacy_id: '5971777000000000406', account_code: 'INC-006', account_name: 'Discount', description: 'Any reduction on your selling price as a discount can be recorded into the discount account.', account_type: 'Income', is_active: true },
    { legacy_id: '5971777000000014001', account_code: 'INC-007', account_name: 'Shipping Charge', description: 'Shipping charges made to the invoice will be recorded in this account.', account_type: 'Income', is_active: true },
    { legacy_id: '5971777000001278269', account_code: 'INC-008', account_name: 'Amazon E-Commerce', description: '', account_type: 'Income', is_active: true },

    // ── EXPENSE (60) ────────────────────────────────────────────────────
    { legacy_id: '5971777000000032023', account_code: 'EXP-001', account_name: 'Lodging', description: 'Any expense related to putting up at motels etc while on business travel can be entered here.', account_type: 'Expense', is_active: true },
    { legacy_id: '5971777000000000400', account_code: 'EXP-002', account_name: 'Office Supplies', description: 'All expenses on purchasing office supplies like stationery are recorded into the office supplies account.', account_type: 'Expense', is_active: true },
    { legacy_id: '5971777000000000403', account_code: 'EXP-003', account_name: 'Advertising And Marketing', description: 'Your expenses on promotional, marketing and advertising activities.', account_type: 'Expense', is_active: true },
    { legacy_id: '5971777000000000409', account_code: 'EXP-004', account_name: 'Bank Fees and Charges', description: 'Any bank fees levied is recorded into the bank fees and charges account.', account_type: 'Expense', is_active: true },
    { legacy_id: '5971777000000000412', account_code: 'EXP-005', account_name: 'Credit Card Charges', description: 'Service fees for transactions, balance transfer fees, annual credit fees.', account_type: 'Expense', is_active: true },
    { legacy_id: '5971777000000000418', account_code: 'EXP-006', account_name: 'Travel Expense', description: 'Expenses on business travels like hotel bookings, flight charges, etc.', account_type: 'Expense', is_active: true },
    { legacy_id: '5971777000000000421', account_code: 'EXP-007', account_name: 'Telephone Expense', description: 'The expenses on your telephone, mobile and fax usage.', account_type: 'Expense', is_active: true },
    { legacy_id: '5971777000000000424', account_code: 'EXP-008', account_name: 'Automobile Expense', description: 'Transportation related expenses like fuel charges and maintenance charges.', account_type: 'Expense', is_active: true },
    { legacy_id: '5971777000000000427', account_code: 'EXP-009', account_name: 'IT and Internet Expenses', description: 'Money spent on your IT infrastructure and usage.', account_type: 'Expense', is_active: true },
    { legacy_id: '5971777000000000430', account_code: 'EXP-010', account_name: 'Factory Rent', description: 'Rent of factory premises', account_type: 'Expense', is_active: true },
    { legacy_id: '5971777000000000433', account_code: 'EXP-011', account_name: 'Janitorial Expense', description: 'All your janitorial and cleaning expenses.', account_type: 'Expense', is_active: true },
    { legacy_id: '5971777000000000436', account_code: 'EXP-012', account_name: 'Postage', description: 'Your expenses on ground mails, shipping and air mails.', account_type: 'Expense', is_active: true },
    { legacy_id: '5971777000000000439', account_code: 'EXP-013', account_name: 'Bad Debt', description: 'Any amount which is lost and is unrecoverable.', account_type: 'Expense', is_active: true },
    { legacy_id: '5971777000000000442', account_code: 'EXP-014', account_name: 'Office Stationery & Printing', description: 'Paper, registers, pens, and invoice books', account_type: 'Expense', is_active: true },
    { legacy_id: '5971777000000000445', account_code: 'EXP-015', account_name: 'Salaries and Employee Wages', description: 'Salaries for your employees and the wages paid to workers.', account_type: 'Expense', is_active: true },
    { legacy_id: '5971777000000000448', account_code: 'EXP-016', account_name: 'Meals and Entertainment', description: 'Expenses on food and entertainment.', account_type: 'Expense', is_active: true },
    { legacy_id: '5971777000000000451', account_code: 'EXP-017', account_name: 'Depreciation Expense', description: 'Any depreciation in value of your assets.', account_type: 'Expense', is_active: true },
    { legacy_id: '5971777000000000454', account_code: 'EXP-018', account_name: 'Professional Fees', description: 'CA, audit, legal, and consultancy fees', account_type: 'Expense', is_active: true },
    { legacy_id: '5971777000000000457', account_code: 'EXP-019', account_name: 'Repairs and Maintenance', description: 'The costs involved in maintenance and repair of assets.', account_type: 'Expense', is_active: true },
    { legacy_id: '5971777000000000460', account_code: 'EXP-020', account_name: 'Other Expenses', description: 'Any minor expense on activities unrelated to primary business operations.', account_type: 'Expense', is_active: true },
    { legacy_id: '5971777000000035005', account_code: 'EXP-021', account_name: 'Uncategorized', description: 'This account can be used to temporarily track expenses that are yet to be identified.', account_type: 'Expense', is_active: true },
    { legacy_id: '5971777000000072001', account_code: 'EXP-022', account_name: 'Purchase Discounts', description: 'Tracks any reduction that your vendor offers on your purchases.', account_type: 'Expense', is_active: true },
    { legacy_id: '5971777000000091117', account_code: 'EXP-023', account_name: 'Raw Materials And Consumables', description: 'An expense account to track the amount spent on purchasing raw materials.', account_type: 'Expense', is_active: true },
    { legacy_id: '5971777000000091119', account_code: 'EXP-024', account_name: 'Merchandise', description: 'An expense account to track the amount spent on purchasing merchandise.', account_type: 'Expense', is_active: true },
    { legacy_id: '5971777000000091121', account_code: 'EXP-025', account_name: 'Transportation Expense', description: 'An expense account to track the amount spent on transporting goods.', account_type: 'Expense', is_active: true },
    { legacy_id: '5971777000000091123', account_code: 'EXP-026', account_name: 'Depreciation And Amortisation', description: 'An expense account for depreciation of tangible and intangible assets.', account_type: 'Expense', is_active: true },
    { legacy_id: '5971777000000091125', account_code: 'EXP-027', account_name: 'Contract Assets', description: 'An asset account to track amounts received while yet to complete services.', account_type: 'Expense', is_active: true },
    { legacy_id: '5971777000000104925', account_code: 'EXP-028', account_name: 'Fuel', description: '', account_type: 'Expense', is_active: true },
    { legacy_id: '5971777000000104999', account_code: 'EXP-029', account_name: 'Machine rental', description: '', account_type: 'Expense', is_active: true },
    { legacy_id: '5971777000000107845', account_code: 'EXP-030', account_name: 'Donation', description: '', account_type: 'Expense', is_active: true },
    { legacy_id: '5971777000000108705', account_code: 'EXP-031', account_name: 'Electricity Works', description: '', account_type: 'Expense', is_active: false },
    { legacy_id: '5971777000000404675', account_code: 'EXP-032', account_name: 'Software Subscription', description: 'Zoho, Adobe, or other online subscriptions', account_type: 'Expense', is_active: true },
    { legacy_id: '5971777000000415727', account_code: 'EXP-033', account_name: 'Food', description: '', account_type: 'Expense', is_active: true },
    { legacy_id: '5971777000000420285', account_code: 'EXP-034', account_name: 'Mechenic Salary', description: '', account_type: 'Expense', is_active: true },
    { legacy_id: '5971777000000448279', account_code: 'EXP-035', account_name: 'Cash Withdrawals', description: '', account_type: 'Expense', is_active: true },
    { legacy_id: '5971777000000529512', account_code: 'EXP-036', account_name: 'Employee Loan', description: '', account_type: 'Expense', is_active: true },
    { legacy_id: '5971777000000655304', account_code: 'EXP-037', account_name: 'Courier Charges', description: '', account_type: 'Expense', is_active: true },
    { legacy_id: '5971777000000705005', account_code: 'EXP-038', account_name: 'Custom Duty', description: '', account_type: 'Expense', is_active: true },
    { legacy_id: '5971777000000737146', account_code: 'EXP-039', account_name: 'Custom Clearance', description: '', account_type: 'Expense', is_active: true },
    { legacy_id: '5971777000001174945', account_code: 'EXP-040', account_name: 'Cutting', description: '', account_type: 'Expense', is_active: true },
    { legacy_id: '5971777000001215701', account_code: 'EXP-041', account_name: 'Helper Wages', description: 'Factory helpers not directly involved in stitching', account_type: 'Expense', is_active: true },
    { legacy_id: '5971777000001215709', account_code: 'EXP-042', account_name: 'Sweeper Salaries', description: 'Cleaning and housekeeping staff wages', account_type: 'Expense', is_active: true },
    { legacy_id: '5971777000001215717', account_code: 'EXP-043', account_name: 'Mechanic & Electrician Salaries', description: 'Maintenance and electrical repair staff salaries', account_type: 'Expense', is_active: true },
    { legacy_id: '5971777000001215725', account_code: 'EXP-044', account_name: 'Supervisor / Line Incharge Salaries', description: 'Supervisors and production line managers', account_type: 'Expense', is_active: true },
    { legacy_id: '5971777000001215733', account_code: 'EXP-045', account_name: 'Admin & Office Staff Salaries', description: 'Salaries of accounts, admin, Merchant and HR team', account_type: 'Expense', is_active: true },
    { legacy_id: '5971777000001215781', account_code: 'EXP-046', account_name: 'Factory Maintenance', description: 'General upkeep, painting, cleaning, and maintenance', account_type: 'Expense', is_active: true },
    { legacy_id: '5971777000001215789', account_code: 'EXP-047', account_name: 'Machine Oil & Grease', description: 'Lubricants for sewing and finishing machines', account_type: 'Expense', is_active: true },
    { legacy_id: '5971777000001215954', account_code: 'EXP-048', account_name: 'Telephone & Internet', description: 'Office telephone and data connection', account_type: 'Expense', is_active: true },
    { legacy_id: '5971777000001215970', account_code: 'EXP-049', account_name: 'Postage & Courier', description: 'Courier and postal service charges', account_type: 'Expense', is_active: true },
    { legacy_id: '5971777000001215994', account_code: 'EXP-050', account_name: 'Office Rent', description: 'Rent for non-factory space (admin office)', account_type: 'Expense', is_active: true },
    { legacy_id: '5971777000001216002', account_code: 'EXP-051', account_name: 'Freight Outward', description: 'Shipment of finished goods to customers', account_type: 'Expense', is_active: true },
    { legacy_id: '5971777000001216010', account_code: 'EXP-052', account_name: 'Commission to Agents', description: 'Sales agent or marketing commission', account_type: 'Expense', is_active: true },
    { legacy_id: '5971777000001216018', account_code: 'EXP-053', account_name: 'Miscellaneous Factory Expense', description: 'Minor unclassified factory expenses', account_type: 'Expense', is_active: true },
    { legacy_id: '5971777000001216026', account_code: 'EXP-054', account_name: 'Interest on Loan', description: 'Interest paid on business loans', account_type: 'Expense', is_active: true },
    { legacy_id: '5971777000001216082', account_code: 'EXP-055', account_name: 'Cleaning & Sweeping Supplies', description: 'Cleaning materials used in factory', account_type: 'Expense', is_active: true },
    { legacy_id: '5971777000001216336', account_code: 'EXP-056', account_name: 'Electric & Small Equipment', description: 'Small electrical items like switches, cords, irons, etc.', account_type: 'Expense', is_active: true },
    { legacy_id: '5971777000001217368', account_code: 'EXP-057', account_name: 'Chemical & Stain Remover', description: 'Chemical & satin remover from garment & fabrics', account_type: 'Expense', is_active: true },
    { legacy_id: '5971777000000104873', account_code: 'EXP-058', account_name: 'machine part cost/ repair cost', description: '', account_type: 'Expense', is_active: true, parent_legacy_id: '5971777000000000460' },
    { legacy_id: '5971777000001215491', account_code: 'EXP-059', account_name: 'Factory Maintenance or Manufacturing Overhead', description: '', account_type: 'Expense', is_active: true },

    // ── COST OF GOODS SOLD (14) ─────────────────────────────────────────
    { legacy_id: '5971777000000034003', account_code: 'COGS-001', account_name: 'Cost of Goods Sold', description: 'An expense account which tracks the value of the goods sold.', account_type: 'Cost Of Goods Sold', is_active: true },
    { legacy_id: '5971777000000091105', account_code: 'COGS-002', account_name: 'Labor', description: 'An expense account that tracks the amount that you pay as labor.', account_type: 'Cost Of Goods Sold', is_active: true },
    { legacy_id: '5971777000000091107', account_code: 'COGS-003', account_name: 'Materials', description: 'An expense account that tracks the amount you use in purchasing materials.', account_type: 'Cost Of Goods Sold', is_active: true },
    { legacy_id: '5971777000000091109', account_code: 'COGS-004', account_name: 'Subcontractor', description: 'An expense account to track the amount that you pay subcontractors.', account_type: 'Cost Of Goods Sold', is_active: true },
    { legacy_id: '5971777000000091111', account_code: 'COGS-005', account_name: 'Job Costing', description: 'An expense account to track the costs that you incur in performing a job.', account_type: 'Cost Of Goods Sold', is_active: true },
    { legacy_id: '5971777000001211621', account_code: 'COGS-006', account_name: 'Needles, small tools, machine Parts & Repairs', description: 'Needles, scissors, bobbins, spare parts and small maintenance expenses', account_type: 'Cost Of Goods Sold', is_active: true },
    { legacy_id: '5971777000001215637', account_code: 'COGS-007', account_name: 'Fabric Purchase', description: 'Fabric used in garment production', account_type: 'Cost Of Goods Sold', is_active: true },
    { legacy_id: '5971777000001215645', account_code: 'COGS-008', account_name: 'Trims & accessories', description: 'Labels, Buttons, Zipper, Elastic, etc.', account_type: 'Cost Of Goods Sold', is_active: true },
    { legacy_id: '5971777000001215653', account_code: 'COGS-009', account_name: 'Threads', description: 'All types of stitching thread used in garment', account_type: 'Cost Of Goods Sold', is_active: true },
    { legacy_id: '5971777000001215661', account_code: 'COGS-010', account_name: 'Packing material', description: 'Polybag, Carton, hang tags, barcode, etc.', account_type: 'Cost Of Goods Sold', is_active: true },
    { legacy_id: '5971777000001215669', account_code: 'COGS-011', account_name: 'Fabric Processing / Dyeing Charges', description: 'Charges for dyeing, bleaching, or printing fabric externally', account_type: 'Cost Of Goods Sold', is_active: true },
    { legacy_id: '5971777000001215677', account_code: 'COGS-012', account_name: 'Printing & Embroidery Charges', description: 'Job work for embroidery, printing, or washing', account_type: 'Cost Of Goods Sold', is_active: true },
    { legacy_id: '5971777000001215685', account_code: 'COGS-013', account_name: 'Operator Salaries', description: 'Wages to tailors or operators working on production', account_type: 'Cost Of Goods Sold', is_active: true },
    { legacy_id: '5971777000001215693', account_code: 'COGS-014', account_name: 'Tailor / Stitching Wages', description: 'Piece-rate wages to tailors', account_type: 'Cost Of Goods Sold', is_active: true },

    // ── CASH (2) ────────────────────────────────────────────────────────
    { legacy_id: '5971777000000000358', account_code: 'CASH-001', account_name: 'Undeposited Funds', description: 'Record funds received by your company yet to be deposited in a bank.', account_type: 'Cash', is_active: true },
    { legacy_id: '5971777000000000361', account_code: 'CASH-002', account_name: 'Petty Cash', description: 'A small amount of cash that is used to pay your minor or casual expenses.', account_type: 'Cash', is_active: true },

    // ── BANK (5) ────────────────────────────────────────────────────────
    { legacy_id: '5971777000000398017', account_code: 'BANK-001', account_name: 'NAVODITA APPAREL PRIVATE LIMITED KOTAK', description: '', account_type: 'Bank', is_active: true },
    { legacy_id: '5971777000000432450', account_code: 'BANK-002', account_name: 'NAVODITA APPAREL PRIVATE LIMITED SHGB OVER DRAFT', description: '', account_type: 'Bank', is_active: true },
    { legacy_id: '5971777000001292922', account_code: 'BANK-003', account_name: 'NAVODITA APPAREL PRIVATE LIMITED SHGB CURRENT ACCOUNT', description: '', account_type: 'Bank', is_active: true },
    { legacy_id: '5971777000001572219', account_code: 'BANK-004', account_name: 'NAVODITA APPAREL PRIVATE LIMITED ICICI', description: '', account_type: 'Bank', is_active: true },
    { legacy_id: '5971777000000099269', account_code: 'BANK-005', account_name: 'Zoho Payroll - Bank Account', description: '', account_type: 'Bank', is_active: true },

    // ── PAYMENT CLEARING (1) ────────────────────────────────────────────
    { legacy_id: '5971777000000399470', account_code: 'PCLR-001', account_name: 'Razorpay Clearing', description: '', account_type: 'Payment Clearing', is_active: true },

    // ── ACCOUNTS RECEIVABLE (1) ─────────────────────────────────────────
    { legacy_id: '5971777000000000364', account_code: 'AR-001', account_name: 'Accounts Receivable', description: 'The money that customers owe you.', account_type: 'Accounts Receivable', is_active: true },

    // ── FIXED ASSET (8) ─────────────────────────────────────────────────
    { legacy_id: '5971777000000000367', account_code: 'FA-001', account_name: 'Furniture and Equipment', description: 'Purchases of furniture and equipment for your office.', account_type: 'Fixed Asset', is_active: true },
    { legacy_id: '5971777000000109781', account_code: 'FA-002', account_name: 'mortgage Return', description: '', account_type: 'Fixed Asset', is_active: true },
    { legacy_id: '5971777000001216034', account_code: 'FA-003', account_name: 'Sewing Machines', description: 'Long-term sewing machines and production equipment', account_type: 'Fixed Asset', is_active: true },
    { legacy_id: '5971777000001216042', account_code: 'FA-004', account_name: 'Boiler / Compressor', description: 'Industrial machines used in manufacturing', account_type: 'Fixed Asset', is_active: true },
    { legacy_id: '5971777000001216050', account_code: 'FA-005', account_name: 'Electrical Equipment', description: 'Heavy-duty equipment and wiring installed in factory', account_type: 'Fixed Asset', is_active: true },
    { legacy_id: '5971777000001216058', account_code: 'FA-006', account_name: 'Furniture & Fixtures', description: 'Office and factory furniture, tables, racks, etc.', account_type: 'Fixed Asset', is_active: true },
    { legacy_id: '5971777000001216066', account_code: 'FA-007', account_name: 'Computer & Printer', description: 'IT assets for administration and accounts', account_type: 'Fixed Asset', is_active: true },
    { legacy_id: '5971777000001216074', account_code: 'FA-008', account_name: 'Vehicle', description: 'Company-owned vehicles for delivery or purchase', account_type: 'Fixed Asset', is_active: true },
    { legacy_id: '5971777000001221770', account_code: 'FA-009', account_name: 'Medical Equipment', description: '', account_type: 'Fixed Asset', is_active: true },

    // ── STOCK (1) ───────────────────────────────────────────────────────
    { legacy_id: '5971777000000034001', account_code: 'STK-001', account_name: 'Inventory Asset', description: 'An account which tracks the value of goods in your inventory.', account_type: 'Stock', is_active: true },

    // ── OTHER CURRENT ASSET (22) ────────────────────────────────────────
    { legacy_id: '5971777000000000370', account_code: 'OCA-001', account_name: 'Advance Tax', description: 'Any tax which is paid in advance.', account_type: 'Other Current Asset', is_active: true },
    { legacy_id: '5971777000000035001', account_code: 'OCA-002', account_name: 'Employee Advance', description: 'Money paid out to an employee in advance.', account_type: 'Other Current Asset', is_active: true },
    { legacy_id: '5971777000000091011', account_code: 'OCA-003', account_name: 'Prepaid Expenses', description: 'An asset account that reports amounts paid in advance.', account_type: 'Other Current Asset', is_active: true },
    { legacy_id: '5971777000000091017', account_code: 'OCA-004', account_name: 'TDS Receivable', description: '', account_type: 'Other Current Asset', is_active: true },
    { legacy_id: '5971777000000091274', account_code: 'OCA-005', account_name: 'Reverse Charge Tax Input but not due', description: 'The amount of tax payable for your reverse charge purchases.', account_type: 'Other Current Asset', is_active: true },
    { legacy_id: '5971777000000091294', account_code: 'OCA-006', account_name: 'Input Tax Credits', description: '', account_type: 'Other Current Asset', is_active: true },
    { legacy_id: '5971777000000091298', account_code: 'OCA-007', account_name: 'Input IGST', description: '', account_type: 'Other Current Asset', is_active: true, parent_legacy_id: '5971777000000091294' },
    { legacy_id: '5971777000000091306', account_code: 'OCA-008', account_name: 'Input CGST', description: '', account_type: 'Other Current Asset', is_active: true, parent_legacy_id: '5971777000000091294' },
    { legacy_id: '5971777000000091314', account_code: 'OCA-009', account_name: 'Input SGST', description: '', account_type: 'Other Current Asset', is_active: true, parent_legacy_id: '5971777000000091294' },
    { legacy_id: '5971777000000110026', account_code: 'OCA-010', account_name: 'Sales to Customers (Cash)', description: '', account_type: 'Other Current Asset', is_active: true },
    { legacy_id: '5971777000000415144', account_code: 'OCA-011', account_name: 'Sweep Transactions', description: '', account_type: 'Other Current Asset', is_active: true },
    { legacy_id: '5971777000000614036', account_code: 'OCA-012', account_name: 'CGST TDS Receivable', description: '', account_type: 'Other Current Asset', is_active: true },
    { legacy_id: '5971777000000614052', account_code: 'OCA-013', account_name: 'SGST TDS Receivable', description: '', account_type: 'Other Current Asset', is_active: true },
    { legacy_id: '5971777000000614068', account_code: 'OCA-014', account_name: 'IGST TDS Receivable', description: '', account_type: 'Other Current Asset', is_active: true },
    { legacy_id: '5971777000001215201', account_code: 'OCA-015', account_name: 'Vendor Advance', description: '', account_type: 'Other Current Asset', is_active: true },
    { legacy_id: '5971777000001415463', account_code: 'OCA-016', account_name: 'Income Tax Paid / ITR Refund Receivable', description: '', account_type: 'Other Current Asset', is_active: true },
    // Cash Ledger accounts
    { legacy_id: '5971777000000772327', account_code: 'OCA-017', account_name: 'Cash Ledger : Tax', description: 'Track total tax amount in GSTN portal.', account_type: 'Other Current Asset', is_active: true },
    { legacy_id: '5971777000000772351', account_code: 'OCA-018', account_name: 'Cash Ledger : IGST Tax', description: 'Track IGST amount in GSTN portal.', account_type: 'Other Current Asset', is_active: true, parent_legacy_id: '5971777000000772327' },
    { legacy_id: '5971777000000772354', account_code: 'OCA-019', account_name: 'Cash Ledger : CGST Tax', description: 'Track CGST amount in GSTN portal.', account_type: 'Other Current Asset', is_active: true, parent_legacy_id: '5971777000000772327' },
    { legacy_id: '5971777000000772357', account_code: 'OCA-020', account_name: 'Cash Ledger : SGST Tax', description: 'Track SGST amount in GSTN portal.', account_type: 'Other Current Asset', is_active: true, parent_legacy_id: '5971777000000772327' },
    { legacy_id: '5971777000000772360', account_code: 'OCA-021', account_name: 'Cash Ledger : CESS Tax', description: 'Track CESS amount in GSTN portal.', account_type: 'Other Current Asset', is_active: true, parent_legacy_id: '5971777000000772327' },
    { legacy_id: '5971777000000772330', account_code: 'OCA-022', account_name: 'Cash Ledger : Interest', description: 'Track Interest in GSTN portal.', account_type: 'Other Current Asset', is_active: true },
    { legacy_id: '5971777000000772363', account_code: 'OCA-023', account_name: 'Cash Ledger : IGST Interest', description: '', account_type: 'Other Current Asset', is_active: true, parent_legacy_id: '5971777000000772330' },
    { legacy_id: '5971777000000772366', account_code: 'OCA-024', account_name: 'Cash Ledger : CGST Interest', description: '', account_type: 'Other Current Asset', is_active: true, parent_legacy_id: '5971777000000772330' },
    { legacy_id: '5971777000000772369', account_code: 'OCA-025', account_name: 'Cash Ledger : SGST Interest', description: '', account_type: 'Other Current Asset', is_active: true, parent_legacy_id: '5971777000000772330' },
    { legacy_id: '5971777000000772372', account_code: 'OCA-026', account_name: 'Cash Ledger : CESS Interest', description: '', account_type: 'Other Current Asset', is_active: true, parent_legacy_id: '5971777000000772330' },
    { legacy_id: '5971777000000772333', account_code: 'OCA-027', account_name: 'Cash Ledger : Latefee', description: 'Track Late Fee in GSTN portal.', account_type: 'Other Current Asset', is_active: true },
    { legacy_id: '5971777000000772375', account_code: 'OCA-028', account_name: 'Cash Ledger : IGST Latefee', description: '', account_type: 'Other Current Asset', is_active: true, parent_legacy_id: '5971777000000772333' },
    { legacy_id: '5971777000000772378', account_code: 'OCA-029', account_name: 'Cash Ledger : CGST Latefee', description: '', account_type: 'Other Current Asset', is_active: true, parent_legacy_id: '5971777000000772333' },
    { legacy_id: '5971777000000772381', account_code: 'OCA-030', account_name: 'Cash Ledger : SGST Latefee', description: '', account_type: 'Other Current Asset', is_active: true, parent_legacy_id: '5971777000000772333' },
    { legacy_id: '5971777000000772384', account_code: 'OCA-031', account_name: 'Cash Ledger : CESS Latefee', description: '', account_type: 'Other Current Asset', is_active: true, parent_legacy_id: '5971777000000772333' },

    // ── ACCOUNTS PAYABLE (1) ────────────────────────────────────────────
    { legacy_id: '5971777000000000373', account_code: 'AP-001', account_name: 'Accounts Payable', description: 'The money which you owe to others like a pending bill payment.', account_type: 'Accounts Payable', is_active: true },

    // ── OTHER CURRENT LIABILITY (22) ────────────────────────────────────
    { legacy_id: '5971777000000000376', account_code: 'OCL-001', account_name: 'Tax Payable', description: 'The amount of money which you owe to your tax authority.', account_type: 'Other Current Liability', is_active: true },
    { legacy_id: '5971777000000005001', account_code: 'OCL-002', account_name: 'Unearned Revenue', description: 'A liability account that reports amounts received in advance.', account_type: 'Other Current Liability', is_active: true },
    { legacy_id: '5971777000000003001', account_code: 'OCL-003', account_name: 'Opening Balance Adjustments', description: 'This account will hold the difference in debits and credits during opening balance.', account_type: 'Other Current Liability', is_active: true },
    { legacy_id: '5971777000000035003', account_code: 'OCL-004', account_name: 'Employee Reimbursements', description: 'Track reimbursements due to employees.', account_type: 'Other Current Liability', is_active: true },
    { legacy_id: '5971777000000091021', account_code: 'OCL-005', account_name: 'TDS Payable', description: '', account_type: 'Other Current Liability', is_active: true },
    { legacy_id: '5971777000000091286', account_code: 'OCL-006', account_name: 'GST Payable', description: '', account_type: 'Other Current Liability', is_active: true },
    { legacy_id: '5971777000000091290', account_code: 'OCL-007', account_name: 'Output IGST', description: '', account_type: 'Other Current Liability', is_active: true, parent_legacy_id: '5971777000000091286' },
    { legacy_id: '5971777000000091302', account_code: 'OCL-008', account_name: 'Output CGST', description: '', account_type: 'Other Current Liability', is_active: true, parent_legacy_id: '5971777000000091286' },
    { legacy_id: '5971777000000091310', account_code: 'OCL-009', account_name: 'Output SGST', description: '', account_type: 'Other Current Liability', is_active: true, parent_legacy_id: '5971777000000091286' },
    { legacy_id: '5971777000000099213', account_code: 'OCL-010', account_name: 'Reimbursements Payable', description: '', account_type: 'Other Current Liability', is_active: true },
    { legacy_id: '5971777000000099215', account_code: 'OCL-011', account_name: 'Payroll Tax Payable', description: '', account_type: 'Other Current Liability', is_active: true },
    { legacy_id: '5971777000000099217', account_code: 'OCL-012', account_name: 'Statutory Deductions Payable', description: '', account_type: 'Other Current Liability', is_active: true },
    { legacy_id: '5971777000000099219', account_code: 'OCL-013', account_name: 'Deductions Payable', description: '', account_type: 'Other Current Liability', is_active: true },
    { legacy_id: '5971777000000099221', account_code: 'OCL-014', account_name: 'Net Salary Payable', description: '', account_type: 'Other Current Liability', is_active: true },
    { legacy_id: '5971777000000099223', account_code: 'OCL-015', account_name: 'Hold Salary Payable', description: '', account_type: 'Other Current Liability', is_active: true },
    { legacy_id: '5971777000000614028', account_code: 'OCL-016', account_name: 'CGST TDS Payable', description: '', account_type: 'Other Current Liability', is_active: true },
    { legacy_id: '5971777000000614044', account_code: 'OCL-017', account_name: 'SGST TDS Payable', description: '', account_type: 'Other Current Liability', is_active: true },
    { legacy_id: '5971777000000614060', account_code: 'OCL-018', account_name: 'IGST TDS Payable', description: '', account_type: 'Other Current Liability', is_active: true },
    { legacy_id: '5971777000000705013', account_code: 'OCL-019', account_name: 'Overseas Tax Payable', description: 'Tracks Tax collected from Overseas consumers.', account_type: 'Other Current Liability', is_active: true },
    { legacy_id: '5971777000001158634', account_code: 'OCL-020', account_name: 'Loan From Dinesh', description: '', account_type: 'Other Current Liability', is_active: true },
    { legacy_id: '5971777000001162853', account_code: 'OCL-021', account_name: 'Intermediate TDS Payable', description: '', account_type: 'Other Current Liability', is_active: true },
    { legacy_id: '5971777000001211390', account_code: 'OCL-022', account_name: 'Loan from Sunil', description: '', account_type: 'Other Current Liability', is_active: true },
    { legacy_id: '5971777000001215157', account_code: 'OCL-023', account_name: 'Customer Advance', description: 'Track advance payments received from customers.', account_type: 'Other Current Liability', is_active: true },
    { legacy_id: '5971777000001215191', account_code: 'OCL-024', account_name: 'Sales / Revenue from Operations', description: '', account_type: 'Other Current Liability', is_active: true },
    { legacy_id: '5971777000001215211', account_code: 'OCL-025', account_name: 'Customer Payment', description: '', account_type: 'Other Current Liability', is_active: true },

    // ── OTHER LIABILITY (1) ─────────────────────────────────────────────
    { legacy_id: '5971777000000045001', account_code: 'OL-001', account_name: 'Dimension Adjustments', description: 'Tracks transfers between different dimensions.', account_type: 'Other Liability', is_active: true },

    // ── EQUITY (8) ──────────────────────────────────────────────────────
    { legacy_id: '5971777000000000379', account_code: 'EQ-001', account_name: 'Retained Earnings', description: 'The earnings of your company not distributed among shareholders.', account_type: 'Equity', is_active: true },
    { legacy_id: '5971777000000000382', account_code: 'EQ-002', account_name: "Owner's Equity", description: 'The owners rights to the assets of a company.', account_type: 'Equity', is_active: true },
    { legacy_id: '5971777000000000385', account_code: 'EQ-003', account_name: 'Opening Balance Offset', description: 'A buffer account for your funds.', account_type: 'Equity', is_active: true },
    { legacy_id: '5971777000000012001', account_code: 'EQ-004', account_name: 'Drawings', description: 'The money withdrawn from a business by its owner.', account_type: 'Equity', is_active: true },
    { legacy_id: '5971777000000091101', account_code: 'EQ-005', account_name: 'Capital Loan', description: 'An equity account to track the amount that you invest.', account_type: 'Equity', is_active: true },
    { legacy_id: '5971777000000091103', account_code: 'EQ-006', account_name: 'Distributions', description: 'Tracks payment of stock, cash or physical products to shareholders.', account_type: 'Equity', is_active: true },
    { legacy_id: '5971777000000091113', account_code: 'EQ-007', account_name: 'Capital Stock', description: 'Tracks capital introduced when operated through a company.', account_type: 'Equity', is_active: true },
    { legacy_id: '5971777000000091115', account_code: 'EQ-008', account_name: 'Dividends Paid', description: 'Tracks dividends paid on common stock.', account_type: 'Equity', is_active: true },

    // ── LONG TERM LIABILITY (2) ─────────────────────────────────────────
    { legacy_id: '5971777000000091097', account_code: 'LTL-001', account_name: 'Mortgages', description: 'Tracks amounts you pay for the mortgage loan.', account_type: 'Long Term Liability', is_active: true },
    { legacy_id: '5971777000000091099', account_code: 'LTL-002', account_name: 'Construction Loans', description: 'Tracks amount you repay for construction loans.', account_type: 'Long Term Liability', is_active: true },

    // ── OTHER EXPENSE (6) ───────────────────────────────────────────────
    { legacy_id: '5971777000000000415', account_code: 'OEX-001', account_name: 'Exchange Gain or Loss', description: 'Changing the conversion rate can result in a gain or a loss.', account_type: 'Other Expense', is_active: true },
    { legacy_id: '5971777000001209213', account_code: 'OEX-002', account_name: 'Water Bill', description: 'Water used for Drinking, steam irons, cleaning, and other processes', account_type: 'Other Expense', is_active: true },
    { legacy_id: '5971777000001209221', account_code: 'OEX-003', account_name: 'Electricity Bill', description: 'Factory electricity expenses for machines and lighting', account_type: 'Other Expense', is_active: true },
    { legacy_id: '5971777000001209229', account_code: 'OEX-004', account_name: 'Diwali Gifts', description: 'Festival expenses and staff welfare gifts', account_type: 'Other Expense', is_active: true },
    { legacy_id: '5971777000001211362', account_code: 'OEX-005', account_name: 'Tea & snacks', description: '', account_type: 'Other Expense', is_active: true },
    { legacy_id: '5971777000001215329', account_code: 'OEX-006', account_name: 'Sampling', description: '', account_type: 'Other Expense', is_active: true },

    // ── OTHER INCOME (1) ────────────────────────────────────────────────
    { legacy_id: '5971777000001209953', account_code: 'OI-001', account_name: 'Duty Drawback Income', description: '', account_type: 'Other Income', is_active: true },
  ];

  // ── Pass 1: Insert all accounts without parent relationships ──────────
  const insertRows = allAccounts.map((acct, idx) => ({
    account_code: acct.account_code,
    account_name: acct.account_name,
    account_type: acct.account_type,
    description: acct.description || null,
    currency_code: 'INR',
    is_active: acct.is_active,
    is_system_account: true,
    opening_balance: 0,
    current_balance: 0,
    sort_order: idx + 1,
  }));

  // Insert in batches (knex has a limit on bind params)
  const BATCH_SIZE = 50;
  for (let i = 0; i < insertRows.length; i += BATCH_SIZE) {
    await knex('chart_of_accounts').insert(insertRows.slice(i, i + BATCH_SIZE));
  }

  // ── Pass 2: Set up parent account relationships ───────────────────────
  // Build a map from legacy_id to account_code for parent lookups
  const legacyToCode = {};
  for (const acct of allAccounts) {
    legacyToCode[acct.legacy_id] = acct.account_code;
  }

  // Get all inserted accounts keyed by account_code
  const inserted = await knex('chart_of_accounts').select('id', 'account_code');
  const codeToId = {};
  for (const row of inserted) {
    codeToId[row.account_code] = row.id;
  }

  // Update parent relationships
  for (const acct of allAccounts) {
    if (acct.parent_legacy_id) {
      const parentCode = legacyToCode[acct.parent_legacy_id];
      if (parentCode && codeToId[parentCode] && codeToId[acct.account_code]) {
        await knex('chart_of_accounts')
          .where('id', codeToId[acct.account_code])
          .update({ parent_account_id: codeToId[parentCode] });
      }
    }
  }

  console.log(`Seeded ${allAccounts.length} chart of accounts entries.`);
};
