const express = require('express');
const router = express.Router();
const XLSX = require('xlsx');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// ---------------------------------------------------------------------------
// Helper: convert an array of objects to an Excel or CSV buffer
// ---------------------------------------------------------------------------
function generateExcel(data, sheetName, format = 'xlsx') {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  return XLSX.write(wb, {
    type: 'buffer',
    bookType: format === 'csv' ? 'csv' : 'xlsx',
  });
}

// ---------------------------------------------------------------------------
// Helper: send the generated file as a download
// ---------------------------------------------------------------------------
function sendFile(res, buffer, filename, format) {
  if (format === 'csv') {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
  } else {
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
  }
  res.send(buffer);
}

// ---------------------------------------------------------------------------
// Helper: default date range (current month)
// ---------------------------------------------------------------------------
function defaultDateRange(start_date, end_date) {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  return {
    sd: start_date || firstDay.toISOString().split('T')[0],
    ed: end_date || today.toISOString().split('T')[0],
  };
}

// ---------------------------------------------------------------------------
// Helper: rename object keys from snake_case to human-readable headers
// ---------------------------------------------------------------------------
function humanize(rows, keyMap) {
  return rows.map((row) => {
    const out = {};
    for (const [dbKey, label] of Object.entries(keyMap)) {
      if (row[dbKey] !== undefined) {
        out[label] = row[dbKey];
      }
    }
    return out;
  });
}

// ---------------------------------------------------------------------------
// Data-fetching functions (mirrors report.routes.js logic)
// ---------------------------------------------------------------------------

async function fetchProfitAndLoss(start_date, end_date) {
  const { sd, ed } = defaultDateRange(start_date, end_date);

  const [income] = await db('invoices')
    .where('invoice_date', '>=', sd)
    .where('invoice_date', '<=', ed)
    .whereNot('status', 'Cancelled')
    .select(db.raw('COALESCE(SUM(total_amount), 0) as total'));

  const [expenses] = await db('expenses')
    .where('expense_date', '>=', sd)
    .where('expense_date', '<=', ed)
    .select(db.raw('COALESCE(SUM(amount), 0) as total'));

  const [billExpenses] = await db('bills')
    .where('bill_date', '>=', sd)
    .where('bill_date', '<=', ed)
    .whereNot('status', 'Cancelled')
    .select(db.raw('COALESCE(SUM(total_amount), 0) as total'));

  const totalIncome = parseFloat(income.total) || 0;
  const totalExpenses = (parseFloat(expenses.total) || 0) + (parseFloat(billExpenses.total) || 0);

  return {
    rows: [
      {
        'Category': 'Income',
        'Amount': totalIncome,
      },
      {
        'Category': 'Expenses',
        'Amount': totalExpenses,
      },
      {
        'Category': 'Net Profit',
        'Amount': totalIncome - totalExpenses,
      },
    ],
    sheetName: 'Profit & Loss',
  };
}

async function fetchBalanceSheet() {
  const assets = await db('chart_of_accounts')
    .where('account_type', 'Asset')
    .select('account_name', 'account_code', 'current_balance as balance');

  const liabilities = await db('chart_of_accounts')
    .where('account_type', 'Liability')
    .select('account_name', 'account_code', 'current_balance as balance');

  const equity = await db('chart_of_accounts')
    .where('account_type', 'Equity')
    .select('account_name', 'account_code', 'current_balance as balance');

  const rows = [];

  assets.forEach((a) => {
    rows.push({
      'Section': 'Assets',
      'Account Code': a.account_code,
      'Account Name': a.account_name,
      'Balance': parseFloat(a.balance) || 0,
    });
  });

  liabilities.forEach((a) => {
    rows.push({
      'Section': 'Liabilities',
      'Account Code': a.account_code,
      'Account Name': a.account_name,
      'Balance': parseFloat(a.balance) || 0,
    });
  });

  equity.forEach((a) => {
    rows.push({
      'Section': 'Equity',
      'Account Code': a.account_code,
      'Account Name': a.account_name,
      'Balance': parseFloat(a.balance) || 0,
    });
  });

  return { rows, sheetName: 'Balance Sheet' };
}

async function fetchTrialBalance() {
  const accounts = await db('chart_of_accounts')
    .select('account_name', 'account_code', 'account_type', 'current_balance as balance')
    .orderBy('account_code');

  const rows = accounts.map((a) => {
    const bal = parseFloat(a.balance) || 0;
    const isDebit = ['Asset', 'Expense'].includes(a.account_type);
    return {
      'Account Code': a.account_code,
      'Account Name': a.account_name,
      'Account Type': a.account_type,
      'Debit': isDebit ? bal : 0,
      'Credit': isDebit ? 0 : bal,
    };
  });

  return { rows, sheetName: 'Trial Balance' };
}

async function fetchSalesSummary(start_date, end_date) {
  const { sd, ed } = defaultDateRange(start_date, end_date);

  const [summary] = await db('invoices')
    .where('invoice_date', '>=', sd)
    .where('invoice_date', '<=', ed)
    .whereNot('status', 'Cancelled')
    .select(
      db.raw('COUNT(*) as total_invoices'),
      db.raw('COALESCE(SUM(total_amount), 0) as total_amount'),
      db.raw('COALESCE(SUM(amount_paid), 0) as total_paid')
    );

  return {
    rows: [
      {
        'Total Invoices': parseInt(summary.total_invoices) || 0,
        'Total Amount': parseFloat(summary.total_amount) || 0,
        'Total Paid': parseFloat(summary.total_paid) || 0,
        'Balance Due': (parseFloat(summary.total_amount) || 0) - (parseFloat(summary.total_paid) || 0),
      },
    ],
    sheetName: 'Sales Summary',
  };
}

async function fetchPurchaseSummary(start_date, end_date) {
  const { sd, ed } = defaultDateRange(start_date, end_date);

  const [summary] = await db('bills')
    .where('bill_date', '>=', sd)
    .where('bill_date', '<=', ed)
    .select(
      db.raw('COUNT(*) as total_bills'),
      db.raw('COALESCE(SUM(total_amount), 0) as total_amount'),
      db.raw('COALESCE(SUM(amount_paid), 0) as total_paid')
    );

  return {
    rows: [
      {
        'Total Bills': parseInt(summary.total_bills) || 0,
        'Total Amount': parseFloat(summary.total_amount) || 0,
        'Total Paid': parseFloat(summary.total_paid) || 0,
        'Balance Due': (parseFloat(summary.total_amount) || 0) - (parseFloat(summary.total_paid) || 0),
      },
    ],
    sheetName: 'Purchase Summary',
  };
}

async function fetchSalesByCustomer(start_date, end_date) {
  let query = db('invoices')
    .leftJoin('customers', 'invoices.customer_id', 'customers.id')
    .select(
      'customers.display_name as customer_name',
      db.raw('COUNT(*) as invoice_count'),
      db.raw('COALESCE(SUM(invoices.total_amount), 0) as total_amount')
    )
    .whereNot('invoices.status', 'Cancelled')
    .groupBy('customers.display_name');

  if (start_date) query = query.where('invoices.invoice_date', '>=', start_date);
  if (end_date) query = query.where('invoices.invoice_date', '<=', end_date);

  const data = await query.orderBy('total_amount', 'desc');

  return {
    rows: humanize(data, {
      customer_name: 'Customer Name',
      invoice_count: 'Invoice Count',
      total_amount: 'Total Amount',
    }),
    sheetName: 'Sales by Customer',
  };
}

async function fetchSalesByItem(start_date, end_date) {
  let query = db('invoice_items')
    .leftJoin('invoices', 'invoice_items.invoice_id', 'invoices.id')
    .select(
      'invoice_items.item_name',
      db.raw('SUM(invoice_items.quantity) as total_quantity'),
      db.raw('COALESCE(SUM(invoice_items.amount), 0) as total_amount')
    )
    .whereNot('invoices.status', 'Cancelled')
    .groupBy('invoice_items.item_name');

  if (start_date) query = query.where('invoices.invoice_date', '>=', start_date);
  if (end_date) query = query.where('invoices.invoice_date', '<=', end_date);

  const data = await query.orderBy('total_amount', 'desc');

  return {
    rows: humanize(data, {
      item_name: 'Item Name',
      total_quantity: 'Total Quantity',
      total_amount: 'Total Amount',
    }),
    sheetName: 'Sales by Item',
  };
}

async function fetchPurchasesByVendor(start_date, end_date) {
  let query = db('bills')
    .leftJoin('vendors', 'bills.vendor_id', 'vendors.id')
    .select(
      'vendors.display_name as vendor_name',
      db.raw('COUNT(*) as bill_count'),
      db.raw('COALESCE(SUM(bills.total_amount), 0) as total_amount')
    )
    .whereNot('bills.status', 'Cancelled')
    .groupBy('vendors.display_name');

  if (start_date) query = query.where('bills.bill_date', '>=', start_date);
  if (end_date) query = query.where('bills.bill_date', '<=', end_date);

  const data = await query.orderBy('total_amount', 'desc');

  return {
    rows: humanize(data, {
      vendor_name: 'Vendor Name',
      bill_count: 'Bill Count',
      total_amount: 'Total Amount',
    }),
    sheetName: 'Purchases by Vendor',
  };
}

async function fetchGSTSummary(start_date, end_date) {
  const { sd, ed } = defaultDateRange(start_date, end_date);

  const [outputTax] = await db('invoices')
    .where('invoice_date', '>=', sd)
    .where('invoice_date', '<=', ed)
    .whereNot('status', 'Cancelled')
    .select(
      db.raw('COALESCE(SUM(igst_amount), 0) as igst'),
      db.raw('COALESCE(SUM(cgst_amount), 0) as cgst'),
      db.raw('COALESCE(SUM(sgst_amount), 0) as sgst'),
      db.raw('COALESCE(SUM(total_tax), 0) as total')
    );

  const [inputTax] = await db('bills')
    .where('bill_date', '>=', sd)
    .where('bill_date', '<=', ed)
    .whereNot('status', 'Cancelled')
    .select(
      db.raw('COALESCE(SUM(igst_amount), 0) as igst'),
      db.raw('COALESCE(SUM(cgst_amount), 0) as cgst'),
      db.raw('COALESCE(SUM(sgst_amount), 0) as sgst'),
      db.raw('COALESCE(SUM(total_tax), 0) as total')
    );

  const outputIGST = parseFloat(outputTax.igst) || 0;
  const outputCGST = parseFloat(outputTax.cgst) || 0;
  const outputSGST = parseFloat(outputTax.sgst) || 0;
  const outputTotal = parseFloat(outputTax.total) || 0;
  const inputIGST = parseFloat(inputTax.igst) || 0;
  const inputCGST = parseFloat(inputTax.cgst) || 0;
  const inputSGST = parseFloat(inputTax.sgst) || 0;
  const inputTotal = parseFloat(inputTax.total) || 0;

  return {
    rows: [
      {
        'Tax Type': 'Output Tax (Sales)',
        'IGST': outputIGST,
        'CGST': outputCGST,
        'SGST': outputSGST,
        'Total': outputTotal,
      },
      {
        'Tax Type': 'Input Tax (Purchases)',
        'IGST': inputIGST,
        'CGST': inputCGST,
        'SGST': inputSGST,
        'Total': inputTotal,
      },
      {
        'Tax Type': 'Net GST Liability',
        'IGST': outputIGST - inputIGST,
        'CGST': outputCGST - inputCGST,
        'SGST': outputSGST - inputSGST,
        'Total': outputTotal - inputTotal,
      },
    ],
    sheetName: 'GST Summary',
  };
}

async function fetchTDSSummary() {
  const data = await db('tds_liabilities')
    .select(
      'section',
      db.raw('COUNT(*) as count'),
      db.raw('COALESCE(SUM(tds_amount), 0) as total_tds'),
      db.raw('COALESCE(SUM(gross_amount), 0) as total_gross')
    )
    .groupBy('section')
    .orderBy('section');

  return {
    rows: humanize(data, {
      section: 'Section',
      count: 'Transaction Count',
      total_tds: 'Total TDS',
      total_gross: 'Total Gross Amount',
    }),
    sheetName: 'TDS Summary',
  };
}

async function fetchExpenseReport(start_date, end_date, group_by = 'category') {
  const { sd, ed } = defaultDateRange(start_date, end_date);

  const data = await db('expenses')
    .where('expense_date', '>=', sd)
    .where('expense_date', '<=', ed)
    .select(
      `${group_by} as group_key`,
      db.raw('COUNT(*) as count'),
      db.raw('COALESCE(SUM(amount), 0) as total_amount')
    )
    .groupBy(group_by)
    .orderBy('total_amount', 'desc');

  const groupLabel = group_by.charAt(0).toUpperCase() + group_by.slice(1);

  return {
    rows: humanize(data, {
      group_key: groupLabel,
      count: 'Transaction Count',
      total_amount: 'Total Amount',
    }),
    sheetName: 'Expense Report',
  };
}

async function fetchReceivablesAging() {
  const data = await db('invoices')
    .leftJoin('customers', 'invoices.customer_id', 'customers.id')
    .select(
      'customers.display_name as customer_name',
      'invoices.invoice_number',
      'invoices.invoice_date',
      'invoices.due_date',
      'invoices.balance_due'
    )
    .where('invoices.balance_due', '>', 0)
    .whereNot('invoices.status', 'Cancelled')
    .orderBy('invoices.due_date', 'asc');

  return {
    rows: humanize(data, {
      customer_name: 'Customer Name',
      invoice_number: 'Invoice Number',
      invoice_date: 'Invoice Date',
      due_date: 'Due Date',
      balance_due: 'Balance Due',
    }),
    sheetName: 'Receivables Aging',
  };
}

async function fetchPayablesAging() {
  const data = await db('bills')
    .leftJoin('vendors', 'bills.vendor_id', 'vendors.id')
    .select(
      'vendors.display_name as vendor_name',
      'bills.bill_number',
      'bills.bill_date',
      'bills.due_date',
      'bills.balance_due'
    )
    .where('bills.balance_due', '>', 0)
    .whereNot('bills.status', 'Cancelled')
    .orderBy('bills.due_date', 'asc');

  return {
    rows: humanize(data, {
      vendor_name: 'Vendor Name',
      bill_number: 'Bill Number',
      bill_date: 'Bill Date',
      due_date: 'Due Date',
      balance_due: 'Balance Due',
    }),
    sheetName: 'Payables Aging',
  };
}

// ---------------------------------------------------------------------------
// Main export route
// GET /export/:reportType?start_date=&end_date=&format=xlsx
// ---------------------------------------------------------------------------
router.get('/:reportType', async (req, res, next) => {
  try {
    const { reportType } = req.params;
    const { start_date, end_date, format = 'xlsx', group_by } = req.query;

    let result;

    switch (reportType) {
      case 'profit-and-loss':
        result = await fetchProfitAndLoss(start_date, end_date);
        break;
      case 'balance-sheet':
        result = await fetchBalanceSheet();
        break;
      case 'trial-balance':
        result = await fetchTrialBalance();
        break;
      case 'sales-summary':
        result = await fetchSalesSummary(start_date, end_date);
        break;
      case 'purchase-summary':
        result = await fetchPurchaseSummary(start_date, end_date);
        break;
      case 'sales-by-customer':
        result = await fetchSalesByCustomer(start_date, end_date);
        break;
      case 'sales-by-item':
        result = await fetchSalesByItem(start_date, end_date);
        break;
      case 'purchases-by-vendor':
        result = await fetchPurchasesByVendor(start_date, end_date);
        break;
      case 'gst-summary':
        result = await fetchGSTSummary(start_date, end_date);
        break;
      case 'tds-summary':
        result = await fetchTDSSummary();
        break;
      case 'expense-report':
        result = await fetchExpenseReport(start_date, end_date, group_by);
        break;
      case 'receivables-aging':
        result = await fetchReceivablesAging();
        break;
      case 'payables-aging':
        result = await fetchPayablesAging();
        break;
      default:
        return res.status(400).json({
          error: `Unknown report type: ${reportType}`,
          supportedTypes: [
            'profit-and-loss',
            'balance-sheet',
            'trial-balance',
            'sales-summary',
            'purchase-summary',
            'sales-by-customer',
            'sales-by-item',
            'purchases-by-vendor',
            'gst-summary',
            'tds-summary',
            'expense-report',
            'receivables-aging',
            'payables-aging',
          ],
        });
    }

    const { rows, sheetName } = result;

    if (!rows || rows.length === 0) {
      // Return an empty workbook with headers only
      const emptyRow = {};
      const buffer = generateExcel([emptyRow], sheetName, format);
      const filename = `${reportType}-${new Date().toISOString().split('T')[0]}`;
      return sendFile(res, buffer, filename, format);
    }

    const buffer = generateExcel(rows, sheetName, format);
    const filename = `${reportType}-${new Date().toISOString().split('T')[0]}`;
    sendFile(res, buffer, filename, format);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
