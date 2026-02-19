// App constants - ported from Swift codebase

module.exports = {
  // User roles (from AuthenticationManager.swift)
  ROLES: {
    ADMIN: 'Admin',
    ACCOUNTS: 'Accounts',
    HR: 'HR',
    VIEWER: 'Viewer',
  },

  // Invoice statuses (from Invoice+Helpers.swift)
  INVOICE_STATUS: {
    DRAFT: 'Draft',
    FINAL: 'Final',
    PARTIAL: 'Partial',
    PAID: 'Paid',
    OVERDUE: 'Overdue',
    CANCELLED: 'Cancelled',
  },

  // Bill statuses (from Bill+Helpers.swift)
  BILL_STATUS: {
    PENDING: 'Pending',
    PARTIAL: 'Partial',
    PAID: 'Paid',
  },

  // Payment terms (from PaymentTerm.swift)
  PAYMENT_TERMS: [
    { days: 15, label: '15 Days' },
    { days: 30, label: '30 Days' },
    { days: 45, label: '45 Days' },
    { days: 60, label: '60 Days' },
    { days: 90, label: '90 Days' },
  ],

  // Bank transaction categories (from BankingManager.swift)
  TRANSACTION_CATEGORIES: [
    'Expense', 'Payment Made', 'Payment Received', 'Salary',
    'Bank Charges', 'Interest', 'GST', 'TDS', 'Transfer',
    'Refund', 'Other',
  ],

  // Bank account types
  BANK_ACCOUNT_TYPES: ['Current', 'Savings', 'Overdraft', 'Fixed Deposit', 'Cash'],

  // Employee grades (from SalaryCalculator.swift)
  EMPLOYEE_GRADES: [1, 2, 3, 4, 5],

  // Salary statuses
  SALARY_STATUS: {
    DRAFT: 'Draft',
    PROCESSED: 'Processed',
    PAID: 'Paid',
  },

  // Chart of account types (from ChartOfAccountsDataPreloader.swift)
  ACCOUNT_TYPES: [
    'Income', 'Expense', 'Asset', 'Liability', 'Equity',
    'Bank', 'Stock', 'Cost Of Goods Sold', 'Cash',
    'Other Current Asset', 'Other Current Liability',
    'Fixed Asset', 'Other Expense', 'Other Income',
    'Long Term Liability', 'Payment Clearing',
    'Accounts Receivable', 'Accounts Payable', 'Other Liability',
  ],

  // Window config (from CLAUDE.md)
  WINDOW: {
    DEFAULT_WIDTH: 1200,
    DEFAULT_HEIGHT: 800,
    MIN_WIDTH: 1100,
    MIN_HEIGHT: 700,
  },

  // Pagination defaults
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 50,
    MAX_LIMIT: 200,
  },
};
