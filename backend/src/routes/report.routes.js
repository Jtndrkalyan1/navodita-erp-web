const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// GET /profit-and-loss - Profit & Loss statement
router.get('/profit-and-loss', async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const sd = start_date || firstDay.toISOString().split('T')[0];
    const ed = end_date || today.toISOString().split('T')[0];

    const [income] = await db('invoices')
      .where('invoice_date', '>=', sd)
      .where('invoice_date', '<=', ed)
      .whereNot('status', 'Cancelled')
      .select(db.raw('COALESCE(SUM(total_amount), 0) as total'));

    const [expenses] = await db('expenses')
      .where('expense_date', '>=', sd)
      .where('expense_date', '<=', ed)
      .whereNot('status', 'Rejected')
      .select(db.raw('COALESCE(SUM(total_amount), 0) as total'));

    const [billExpenses] = await db('bills')
      .where('bill_date', '>=', sd)
      .where('bill_date', '<=', ed)
      .whereNot('status', 'Cancelled')
      .select(db.raw('COALESCE(SUM(total_amount), 0) as total'));

    const totalIncome = parseFloat(income.total) || 0;
    const totalExpenses = (parseFloat(expenses.total) || 0) + (parseFloat(billExpenses.total) || 0);

    res.json({
      data: {
        income: totalIncome,
        expenses: totalExpenses,
        netProfit: totalIncome - totalExpenses,
        period: { start_date: sd, end_date: ed },
      },
    });
  } catch (err) { next(err); }
});

// GET /balance-sheet - Balance Sheet
router.get('/balance-sheet', async (req, res, next) => {
  try {
    const ASSET_TYPES = ['Other Current Asset', 'Fixed Asset', 'Bank', 'Cash', 'Stock', 'Accounts Receivable', 'Other Asset'];
    const LIABILITY_TYPES = ['Other Current Liability', 'Accounts Payable', 'Long Term Liability', 'Other Liability', 'Payment Clearing'];
    const EQUITY_TYPES = ['Equity'];

    const assets = await db('chart_of_accounts')
      .whereIn('account_type', ASSET_TYPES)
      .select('id', 'account_name', 'account_code', 'account_type', 'current_balance as balance')
      .orderBy('account_type').orderBy('account_code');

    const liabilities = await db('chart_of_accounts')
      .whereIn('account_type', LIABILITY_TYPES)
      .select('id', 'account_name', 'account_code', 'account_type', 'current_balance as balance')
      .orderBy('account_type').orderBy('account_code');

    const equity = await db('chart_of_accounts')
      .whereIn('account_type', EQUITY_TYPES)
      .select('id', 'account_name', 'account_code', 'account_type', 'current_balance as balance')
      .orderBy('account_code');

    res.json({ data: { assets, liabilities, equity } });
  } catch (err) { next(err); }
});

// GET /trial-balance - Trial Balance (placeholder)
router.get('/trial-balance', async (req, res, next) => {
  try {
    const accounts = await db('chart_of_accounts')
      .select('id', 'account_name', 'account_code', 'account_type', 'current_balance as balance')
      .orderBy('account_code');

    let totalDebit = 0;
    let totalCredit = 0;
    accounts.forEach((a) => {
      const bal = parseFloat(a.balance) || 0;
      if (['Asset', 'Expense'].includes(a.account_type)) {
        totalDebit += bal;
      } else {
        totalCredit += bal;
      }
    });

    res.json({ data: { accounts, totalDebit, totalCredit } });
  } catch (err) { next(err); }
});

// GET /cash-flow - Cash Flow Statement
router.get('/cash-flow', async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;
    const today = new Date();
    const fyStart = today.getMonth() >= 3
      ? new Date(today.getFullYear(), 3, 1)
      : new Date(today.getFullYear() - 1, 3, 1);
    const sd = start_date || fyStart.toISOString().split('T')[0];
    const ed = end_date || today.toISOString().split('T')[0];

    // Operating: payments received - payments made
    const [inflow] = await db('payments_received')
      .where('payment_date', '>=', sd).where('payment_date', '<=', ed)
      .where('status', 'Received')
      .select(db.raw('COALESCE(SUM(amount), 0) as total'));

    const [outflow] = await db('payments_made')
      .where('payment_date', '>=', sd).where('payment_date', '<=', ed)
      .where('status', 'Paid')
      .select(db.raw('COALESCE(SUM(amount), 0) as total'));

    const [expOutflow] = await db('expenses')
      .where('expense_date', '>=', sd).where('expense_date', '<=', ed)
      .whereNot('status', 'Rejected')
      .select(db.raw('COALESCE(SUM(total_amount), 0) as total'));

    const operating = (parseFloat(inflow.total) || 0) - (parseFloat(outflow.total) || 0) - (parseFloat(expOutflow.total) || 0);

    // Financing: salary payments
    const [salaryOut] = await db('salary_records')
      .where('payment_date', '>=', sd).where('payment_date', '<=', ed)
      .where('status', 'Paid')
      .select(db.raw('COALESCE(SUM(net_salary), 0) as total'));

    const financing = -(parseFloat(salaryOut.total) || 0);
    const netCashFlow = operating + financing;

    res.json({
      data: {
        operating: parseFloat(operating.toFixed(2)),
        investing: 0,
        financing: parseFloat(financing.toFixed(2)),
        netCashFlow: parseFloat(netCashFlow.toFixed(2)),
        details: {
          receiptsFromCustomers: parseFloat(inflow.total) || 0,
          paymentsToVendors: parseFloat(outflow.total) || 0,
          directExpenses: parseFloat(expOutflow.total) || 0,
          salaryPayments: parseFloat(salaryOut.total) || 0,
        },
        period: { start_date: sd, end_date: ed },
      },
    });
  } catch (err) { next(err); }
});

// GET /receivables-aging - Accounts Receivable Aging
router.get('/receivables-aging', async (req, res, next) => {
  try {
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

    res.json({ data });
  } catch (err) { next(err); }
});

// GET /payables-aging - Accounts Payable Aging
router.get('/payables-aging', async (req, res, next) => {
  try {
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

    res.json({ data });
  } catch (err) { next(err); }
});

// GET /sales-by-customer - Sales by Customer
router.get('/sales-by-customer', async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;
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
    res.json({ data });
  } catch (err) { next(err); }
});

// GET /sales-by-item - Sales by Item
router.get('/sales-by-item', async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;
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
    res.json({ data });
  } catch (err) { next(err); }
});

// GET /purchases-by-vendor - Purchases by Vendor
router.get('/purchases-by-vendor', async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;
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
    res.json({ data });
  } catch (err) { next(err); }
});

// GET /gst-summary - GST Summary Report
router.get('/gst-summary', async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const sd = start_date || firstDay.toISOString().split('T')[0];
    const ed = end_date || today.toISOString().split('T')[0];

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

    res.json({
      data: {
        outputTax,
        inputTax,
        netLiability: (parseFloat(outputTax.total) || 0) - (parseFloat(inputTax.total) || 0),
        period: { start_date: sd, end_date: ed },
      },
    });
  } catch (err) { next(err); }
});

// GET /tds-summary - TDS Summary Report (placeholder)
router.get('/tds-summary', async (req, res, next) => {
  try {
    const data = await db('tds_liabilities')
      .select(
        'section',
        db.raw('COUNT(*) as count'),
        db.raw('COALESCE(SUM(tds_amount), 0) as total_tds'),
        db.raw('COALESCE(SUM(gross_amount), 0) as total_gross')
      )
      .groupBy('section')
      .orderBy('section');

    res.json({ data });
  } catch (err) { next(err); }
});

// GET /expense-report - Expense Report
router.get('/expense-report', async (req, res, next) => {
  try {
    const { start_date, end_date, group_by = 'category' } = req.query;
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const sd = start_date || firstDay.toISOString().split('T')[0];
    const ed = end_date || today.toISOString().split('T')[0];

    const data = await db('expenses')
      .where('expense_date', '>=', sd)
      .where('expense_date', '<=', ed)
      .whereNot('status', 'Rejected')
      .select(
        `${group_by} as group_key`,
        db.raw('COUNT(*) as count'),
        db.raw('COALESCE(SUM(total_amount), 0) as total_amount')
      )
      .groupBy(group_by)
      .orderBy('total_amount', 'desc');

    res.json({ data });
  } catch (err) { next(err); }
});

// GET /sales-summary - Sales Summary (legacy endpoint)
router.get('/sales-summary', async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const sd = start_date || firstDay.toISOString().split('T')[0];
    const ed = end_date || today.toISOString().split('T')[0];

    const [summary] = await db('invoices')
      .where('invoice_date', '>=', sd)
      .where('invoice_date', '<=', ed)
      .whereNot('status', 'Cancelled')
      .select(
        db.raw('COUNT(*) as total_invoices'),
        db.raw('COALESCE(SUM(total_amount), 0) as total_amount'),
        db.raw('COALESCE(SUM(amount_paid), 0) as total_paid')
      );

    res.json({ data: summary });
  } catch (err) { next(err); }
});

// GET /purchase-summary - Purchase Summary (legacy endpoint)
router.get('/purchase-summary', async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const sd = start_date || firstDay.toISOString().split('T')[0];
    const ed = end_date || today.toISOString().split('T')[0];

    const [summary] = await db('bills')
      .where('bill_date', '>=', sd)
      .where('bill_date', '<=', ed)
      .select(
        db.raw('COUNT(*) as total_bills'),
        db.raw('COALESCE(SUM(total_amount), 0) as total_amount'),
        db.raw('COALESCE(SUM(amount_paid), 0) as total_paid')
      );

    res.json({ data: summary });
  } catch (err) { next(err); }
});

// ─── Invoice Register ──────────────────────────────────────────────
router.get('/invoice-register', async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;
    const today = new Date();
    const fyStart = today.getMonth() >= 3
      ? new Date(today.getFullYear(), 3, 1)
      : new Date(today.getFullYear() - 1, 3, 1);
    const sd = start_date || fyStart.toISOString().split('T')[0];
    const ed = end_date || today.toISOString().split('T')[0];

    const invoices = await db('invoices')
      .leftJoin('customers', 'invoices.customer_id', 'customers.id')
      .where('invoices.invoice_date', '>=', sd)
      .where('invoices.invoice_date', '<=', ed)
      .select(
        'invoices.id',
        'invoices.invoice_number',
        'invoices.invoice_date',
        'invoices.due_date',
        'customers.display_name as customer_name',
        'invoices.status',
        'invoices.sub_total',
        'invoices.total_tax',
        'invoices.total_amount',
        'invoices.amount_paid',
        'invoices.balance_due',
        'invoices.currency_code',
        'invoices.place_of_supply',
        'invoices.igst_amount',
        'invoices.cgst_amount',
        'invoices.sgst_amount'
      )
      .orderBy('invoices.invoice_date', 'desc');

    // Summary totals
    const summary = invoices.reduce((acc, inv) => ({
      total_invoices: acc.total_invoices + 1,
      total_amount: acc.total_amount + parseFloat(inv.total_amount || 0),
      total_paid: acc.total_paid + parseFloat(inv.amount_paid || 0),
      total_due: acc.total_due + parseFloat(inv.balance_due || 0),
      total_tax: acc.total_tax + parseFloat(inv.total_tax || 0),
    }), { total_invoices: 0, total_amount: 0, total_paid: 0, total_due: 0, total_tax: 0 });

    res.json({
      data: {
        items: invoices,
        summary,
        period: { start_date: sd, end_date: ed },
      }
    });
  } catch (err) { next(err); }
});

// ─── Bill Register ────────────────────────────────────────────────
router.get('/bill-register', async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;
    const today = new Date();
    const fyStart = today.getMonth() >= 3
      ? new Date(today.getFullYear(), 3, 1)
      : new Date(today.getFullYear() - 1, 3, 1);
    const sd = start_date || fyStart.toISOString().split('T')[0];
    const ed = end_date || today.toISOString().split('T')[0];

    const bills = await db('bills')
      .leftJoin('vendors', 'bills.vendor_id', 'vendors.id')
      .where('bills.bill_date', '>=', sd)
      .where('bills.bill_date', '<=', ed)
      .select(
        'bills.id',
        'bills.bill_number',
        'bills.bill_date',
        'bills.due_date',
        'vendors.display_name as vendor_name',
        'bills.status',
        'bills.sub_total',
        'bills.total_tax',
        'bills.total_amount',
        'bills.amount_paid',
        'bills.balance_due',
        'bills.currency_code',
        'bills.igst_amount',
        'bills.cgst_amount',
        'bills.sgst_amount'
      )
      .orderBy('bills.bill_date', 'desc');

    const summary = bills.reduce((acc, b) => ({
      total_bills: acc.total_bills + 1,
      total_amount: acc.total_amount + parseFloat(b.total_amount || 0),
      total_paid: acc.total_paid + parseFloat(b.amount_paid || 0),
      total_due: acc.total_due + parseFloat(b.balance_due || 0),
      total_tax: acc.total_tax + parseFloat(b.total_tax || 0),
    }), { total_bills: 0, total_amount: 0, total_paid: 0, total_due: 0, total_tax: 0 });

    res.json({
      data: {
        items: bills,
        summary,
        period: { start_date: sd, end_date: ed },
      }
    });
  } catch (err) { next(err); }
});

// ─── Customer Ledger ──────────────────────────────────────────────
router.get('/customer-ledger', async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;
    const today = new Date();
    const fyStart = today.getMonth() >= 3
      ? new Date(today.getFullYear(), 3, 1)
      : new Date(today.getFullYear() - 1, 3, 1);
    const sd = start_date || fyStart.toISOString().split('T')[0];
    const ed = end_date || today.toISOString().split('T')[0];

    const customers = await db('customers')
      .where('is_active', true)
      .select('id', 'display_name', 'company_name', 'customer_code', 'gstin', 'opening_balance', 'currency_code');

    const ledger = [];
    for (const cust of customers) {
      const [invoiceSum] = await db('invoices')
        .where('customer_id', cust.id)
        .whereNot('status', 'Cancelled')
        .where('invoice_date', '>=', sd)
        .where('invoice_date', '<=', ed)
        .select(db.raw('COALESCE(SUM(total_amount), 0) as total'));

      const [paymentSum] = await db('payments_received')
        .where('customer_id', cust.id)
        .where('payment_date', '>=', sd)
        .where('payment_date', '<=', ed)
        .select(db.raw('COALESCE(SUM(amount), 0) as total'));

      const invoiced = parseFloat(invoiceSum.total);
      const paid = parseFloat(paymentSum.total);
      const balance = invoiced - paid + (parseFloat(cust.opening_balance) || 0);

      if (invoiced > 0 || paid > 0 || (parseFloat(cust.opening_balance) || 0) !== 0) {
        ledger.push({
          id: cust.id,
          customer_name: cust.display_name,
          company_name: cust.company_name,
          customer_code: cust.customer_code,
          gstin: cust.gstin,
          opening_balance: parseFloat(cust.opening_balance) || 0,
          invoiced,
          paid,
          balance,
          currency_code: cust.currency_code || 'INR',
        });
      }
    }

    const summary = ledger.reduce((acc, l) => ({
      total_invoiced: acc.total_invoiced + l.invoiced,
      total_paid: acc.total_paid + l.paid,
      total_balance: acc.total_balance + l.balance,
    }), { total_invoiced: 0, total_paid: 0, total_balance: 0 });

    res.json({
      data: {
        items: ledger,
        summary,
        period: { start_date: sd, end_date: ed },
      }
    });
  } catch (err) { next(err); }
});

// ─── Vendor Ledger ────────────────────────────────────────────────
router.get('/vendor-ledger', async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;
    const today = new Date();
    const fyStart = today.getMonth() >= 3
      ? new Date(today.getFullYear(), 3, 1)
      : new Date(today.getFullYear() - 1, 3, 1);
    const sd = start_date || fyStart.toISOString().split('T')[0];
    const ed = end_date || today.toISOString().split('T')[0];

    const vendors = await db('vendors')
      .where('is_active', true)
      .select('id', 'display_name', 'company_name', 'vendor_code', 'gstin', 'opening_balance', 'currency_code');

    const ledger = [];
    for (const vend of vendors) {
      const [billSum] = await db('bills')
        .where('vendor_id', vend.id)
        .whereNot('status', 'Cancelled')
        .where('bill_date', '>=', sd)
        .where('bill_date', '<=', ed)
        .select(db.raw('COALESCE(SUM(total_amount), 0) as total'));

      const [paymentSum] = await db('payments_made')
        .where('vendor_id', vend.id)
        .where('payment_date', '>=', sd)
        .where('payment_date', '<=', ed)
        .select(db.raw('COALESCE(SUM(amount), 0) as total'));

      const billed = parseFloat(billSum.total);
      const paid = parseFloat(paymentSum.total);
      const balance = billed - paid + (parseFloat(vend.opening_balance) || 0);

      if (billed > 0 || paid > 0 || (parseFloat(vend.opening_balance) || 0) !== 0) {
        ledger.push({
          id: vend.id,
          vendor_name: vend.display_name,
          company_name: vend.company_name,
          vendor_code: vend.vendor_code,
          gstin: vend.gstin,
          opening_balance: parseFloat(vend.opening_balance) || 0,
          billed,
          paid,
          balance,
          currency_code: vend.currency_code || 'INR',
        });
      }
    }

    const summary = ledger.reduce((acc, l) => ({
      total_billed: acc.total_billed + l.billed,
      total_paid: acc.total_paid + l.paid,
      total_balance: acc.total_balance + l.balance,
    }), { total_billed: 0, total_paid: 0, total_balance: 0 });

    res.json({
      data: {
        items: ledger,
        summary,
        period: { start_date: sd, end_date: ed },
      }
    });
  } catch (err) { next(err); }
});

// ─── Purchases by Item ────────────────────────────────────────────
router.get('/purchases-by-item', async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;
    let query = db('bill_items')
      .leftJoin('bills', 'bill_items.bill_id', 'bills.id')
      .select(
        'bill_items.item_name',
        db.raw('SUM(bill_items.quantity) as total_quantity'),
        db.raw('COALESCE(SUM(bill_items.amount), 0) as total_amount')
      )
      .whereNot('bills.status', 'Cancelled')
      .groupBy('bill_items.item_name');
    if (start_date) query = query.where('bills.bill_date', '>=', start_date);
    if (end_date) query = query.where('bills.bill_date', '<=', end_date);
    const data = await query.orderBy('total_amount', 'desc');
    res.json({ data });
  } catch (err) { next(err); }
});

// ─── Payroll Summary ──────────────────────────────────────────────
router.get('/payroll-summary', async (req, res, next) => {
  try {
    const { start_date, end_date, year, month } = req.query;
    const today = new Date();
    const fyStart = today.getMonth() >= 3
      ? new Date(today.getFullYear(), 3, 1)
      : new Date(today.getFullYear() - 1, 3, 1);

    let query = db('salary_records')
      .leftJoin('employees', 'salary_records.employee_id', 'employees.id')
      .select(
        'employees.display_name as employee_name',
        'employees.employee_id as employee_code',
        'salary_records.month',
        'salary_records.year',
        'salary_records.gross_earnings',
        'salary_records.total_deductions',
        'salary_records.net_salary',
        'salary_records.pf_employee',
        'salary_records.esi_employee',
        'salary_records.status',
        'salary_records.payment_date'
      )
      .orderBy('salary_records.year', 'desc')
      .orderBy('salary_records.month', 'desc');

    if (year) query = query.where('salary_records.year', parseInt(year));
    if (month) query = query.where('salary_records.month', parseInt(month));

    const data = await query;
    const summary = data.reduce((acc, r) => ({
      total_gross: acc.total_gross + (parseFloat(r.gross_earnings) || 0),
      total_deductions: acc.total_deductions + (parseFloat(r.total_deductions) || 0),
      total_net: acc.total_net + (parseFloat(r.net_salary) || 0),
      total_pf: acc.total_pf + (parseFloat(r.pf_employee) || 0),
      total_esi: acc.total_esi + (parseFloat(r.esi_employee) || 0),
      count: acc.count + 1,
    }), { total_gross: 0, total_deductions: 0, total_net: 0, total_pf: 0, total_esi: 0, count: 0 });

    res.json({ data: { items: data, summary } });
  } catch (err) { next(err); }
});

// ─── PF Register ──────────────────────────────────────────────────
router.get('/pf-register', async (req, res, next) => {
  try {
    const { year, month } = req.query;
    let query = db('salary_records')
      .leftJoin('employees', 'salary_records.employee_id', 'employees.id')
      .select(
        'employees.display_name as employee_name',
        'employees.employee_id as employee_code',
        'salary_records.month',
        'salary_records.year',
        'salary_records.basic_salary',
        'salary_records.pf_employee',
        'salary_records.pf_employer',
        db.raw('salary_records.pf_employee + salary_records.pf_employer as total_pf')
      )
      .where(db.raw('salary_records.pf_employee + salary_records.pf_employer > 0'))
      .orderBy('salary_records.year', 'desc').orderBy('salary_records.month', 'desc');

    if (year) query = query.where('salary_records.year', parseInt(year));
    if (month) query = query.where('salary_records.month', parseInt(month));

    const data = await query;
    const summary = data.reduce((acc, r) => ({
      total_basic: acc.total_basic + (parseFloat(r.basic_salary) || 0),
      total_pf_employee: acc.total_pf_employee + (parseFloat(r.pf_employee) || 0),
      total_pf_employer: acc.total_pf_employer + (parseFloat(r.pf_employer) || 0),
      total_pf: acc.total_pf + (parseFloat(r.total_pf) || 0),
    }), { total_basic: 0, total_pf_employee: 0, total_pf_employer: 0, total_pf: 0 });

    res.json({ data: { items: data, summary } });
  } catch (err) { next(err); }
});

// ─── ESI Register ─────────────────────────────────────────────────
router.get('/esi-register', async (req, res, next) => {
  try {
    const { year, month } = req.query;
    let query = db('salary_records')
      .leftJoin('employees', 'salary_records.employee_id', 'employees.id')
      .select(
        'employees.display_name as employee_name',
        'employees.employee_id as employee_code',
        'salary_records.month',
        'salary_records.year',
        'salary_records.gross_earnings',
        'salary_records.esi_employee',
        'salary_records.esi_employer',
        db.raw('salary_records.esi_employee + salary_records.esi_employer as total_esi')
      )
      .where(db.raw('salary_records.esi_employee + salary_records.esi_employer > 0'))
      .orderBy('salary_records.year', 'desc').orderBy('salary_records.month', 'desc');

    if (year) query = query.where('salary_records.year', parseInt(year));
    if (month) query = query.where('salary_records.month', parseInt(month));

    const data = await query;
    const summary = data.reduce((acc, r) => ({
      total_gross: acc.total_gross + (parseFloat(r.gross_earnings) || 0),
      total_esi_employee: acc.total_esi_employee + (parseFloat(r.esi_employee) || 0),
      total_esi_employer: acc.total_esi_employer + (parseFloat(r.esi_employer) || 0),
      total_esi: acc.total_esi + (parseFloat(r.total_esi) || 0),
    }), { total_gross: 0, total_esi_employee: 0, total_esi_employer: 0, total_esi: 0 });

    res.json({ data: { items: data, summary } });
  } catch (err) { next(err); }
});

// ─── Department-wise Salary ───────────────────────────────────────
router.get('/department-salary', async (req, res, next) => {
  try {
    const { year, month } = req.query;
    let query = db('salary_records')
      .leftJoin('employees', 'salary_records.employee_id', 'employees.id')
      .leftJoin('departments', 'employees.department_id', 'departments.id')
      .select(
        db.raw('COALESCE(departments.name, \'No Department\') as department'),
        db.raw('COUNT(*) as employee_count'),
        db.raw('COALESCE(SUM(salary_records.gross_earnings), 0) as total_gross'),
        db.raw('COALESCE(SUM(salary_records.total_deductions), 0) as total_deductions'),
        db.raw('COALESCE(SUM(salary_records.net_salary), 0) as total_net')
      )
      .groupBy('departments.name')
      .orderBy('total_net', 'desc');

    if (year) query = query.where('salary_records.year', parseInt(year));
    if (month) query = query.where('salary_records.month', parseInt(month));

    const data = await query;
    res.json({ data: { items: data } });
  } catch (err) { next(err); }
});

// ─── Bank Book ────────────────────────────────────────────────────
router.get('/bank-book', async (req, res, next) => {
  try {
    const { start_date, end_date, bank_account_id } = req.query;
    const today = new Date();
    const fyStart = today.getMonth() >= 3
      ? new Date(today.getFullYear(), 3, 1)
      : new Date(today.getFullYear() - 1, 3, 1);
    const sd = start_date || fyStart.toISOString().split('T')[0];
    const ed = end_date || today.toISOString().split('T')[0];

    let query = db('bank_transactions')
      .leftJoin('bank_accounts', 'bank_transactions.bank_account_id', 'bank_accounts.id')
      .where('bank_transactions.transaction_date', '>=', sd)
      .where('bank_transactions.transaction_date', '<=', ed)
      .select(
        'bank_transactions.id',
        'bank_transactions.transaction_date',
        'bank_transactions.description',
        'bank_transactions.reference_number',
        'bank_accounts.account_name',
        'bank_transactions.deposit_amount',
        'bank_transactions.withdrawal_amount',
        'bank_transactions.balance',
        'bank_transactions.category',
        'bank_transactions.is_reconciled'
      )
      .orderBy('bank_transactions.transaction_date', 'desc');

    if (bank_account_id) query = query.where('bank_transactions.bank_account_id', bank_account_id);

    const data = await query;
    const summary = data.reduce((acc, t) => ({
      total_deposits: acc.total_deposits + (parseFloat(t.deposit_amount) || 0),
      total_withdrawals: acc.total_withdrawals + (parseFloat(t.withdrawal_amount) || 0),
      transaction_count: acc.transaction_count + 1,
    }), { total_deposits: 0, total_withdrawals: 0, transaction_count: 0 });

    res.json({ data: { items: data, summary, period: { start_date: sd, end_date: ed } } });
  } catch (err) { next(err); }
});

// ─── Bank Reconciliation ──────────────────────────────────────────
router.get('/bank-reconciliation', async (req, res, next) => {
  try {
    const accounts = await db('bank_accounts').where('is_active', true)
      .select('id', 'account_name', 'bank_name', 'account_number', 'current_balance');

    const reconciliationData = [];
    for (const acc of accounts) {
      const [totals] = await db('bank_transactions')
        .where('bank_account_id', acc.id)
        .select(
          db.raw('COUNT(*) as total_transactions'),
          db.raw('SUM(CASE WHEN is_reconciled THEN 1 ELSE 0 END) as reconciled_count'),
          db.raw('SUM(CASE WHEN NOT is_reconciled THEN 1 ELSE 0 END) as unreconciled_count'),
          db.raw('COALESCE(SUM(CASE WHEN NOT is_reconciled THEN deposit_amount - withdrawal_amount ELSE 0 END), 0) as unreconciled_amount')
        );

      reconciliationData.push({
        account_id: acc.id,
        account_name: acc.account_name,
        bank_name: acc.bank_name,
        account_number: acc.account_number,
        book_balance: parseFloat(acc.current_balance) || 0,
        total_transactions: parseInt(totals.total_transactions) || 0,
        reconciled_count: parseInt(totals.reconciled_count) || 0,
        unreconciled_count: parseInt(totals.unreconciled_count) || 0,
        unreconciled_amount: parseFloat(totals.unreconciled_amount) || 0,
      });
    }

    res.json({ data: { items: reconciliationData } });
  } catch (err) { next(err); }
});

// ─── Transaction Register ─────────────────────────────────────────
router.get('/transaction-register', async (req, res, next) => {
  try {
    const { start_date, end_date, bank_account_id } = req.query;
    const today = new Date();
    const fyStart = today.getMonth() >= 3
      ? new Date(today.getFullYear(), 3, 1)
      : new Date(today.getFullYear() - 1, 3, 1);
    const sd = start_date || fyStart.toISOString().split('T')[0];
    const ed = end_date || today.toISOString().split('T')[0];

    let query = db('bank_transactions')
      .leftJoin('bank_accounts', 'bank_transactions.bank_account_id', 'bank_accounts.id')
      .where('bank_transactions.transaction_date', '>=', sd)
      .where('bank_transactions.transaction_date', '<=', ed)
      .select(
        'bank_transactions.id',
        'bank_transactions.transaction_date',
        'bank_transactions.reference_number',
        'bank_transactions.description',
        'bank_accounts.account_name as bank_account',
        'bank_transactions.deposit_amount',
        'bank_transactions.withdrawal_amount',
        'bank_transactions.category',
        'bank_transactions.categorization_status',
        'bank_transactions.is_reconciled'
      )
      .orderBy('bank_transactions.transaction_date', 'desc');

    if (bank_account_id) query = query.where('bank_transactions.bank_account_id', bank_account_id);

    const data = await query;
    const summary = data.reduce((acc, t) => ({
      total_credits: acc.total_credits + (parseFloat(t.deposit_amount) || 0),
      total_debits: acc.total_debits + (parseFloat(t.withdrawal_amount) || 0),
      count: acc.count + 1,
    }), { total_credits: 0, total_debits: 0, count: 0 });

    res.json({ data: { items: data, summary, period: { start_date: sd, end_date: ed } } });
  } catch (err) { next(err); }
});

// ─── Stock Summary ────────────────────────────────────────────────
router.get('/stock-summary', async (req, res, next) => {
  try {
    const data = await db('items')
      .where('is_active', true)
      .whereIn('item_type', ['product', 'inventory', 'goods', 'Product', 'Inventory', 'Goods'])
      .orWhere(function () {
        this.where('is_active', true).where(db.raw('COALESCE(current_stock, 0) > 0'));
      })
      .select(
        'id', 'name', 'sku', 'category', 'unit',
        'current_stock', 'reorder_level', 'cost_price', 'selling_price',
        db.raw('COALESCE(current_stock, 0) * COALESCE(cost_price, 0) as stock_value')
      )
      .orderBy('name');

    const summary = data.reduce((acc, item) => ({
      total_items: acc.total_items + 1,
      total_stock_value: acc.total_stock_value + (parseFloat(item.stock_value) || 0),
      low_stock_count: acc.low_stock_count + (
        (parseFloat(item.current_stock) || 0) <= (parseFloat(item.reorder_level) || 0) &&
        (parseFloat(item.reorder_level) || 0) > 0 ? 1 : 0
      ),
    }), { total_items: 0, total_stock_value: 0, low_stock_count: 0 });

    res.json({ data: { items: data, summary } });
  } catch (err) { next(err); }
});

// ─── Stock Valuation ──────────────────────────────────────────────
router.get('/stock-valuation', async (req, res, next) => {
  try {
    const data = await db('items')
      .where('is_active', true)
      .select(
        'id', 'name', 'sku', 'category', 'unit',
        'current_stock', 'cost_price', 'selling_price',
        db.raw('COALESCE(current_stock, 0) * COALESCE(cost_price, 0) as cost_value'),
        db.raw('COALESCE(current_stock, 0) * COALESCE(selling_price, 0) as market_value')
      )
      .where(db.raw('COALESCE(current_stock, 0) > 0'))
      .orderBy('cost_value', 'desc');

    const summary = data.reduce((acc, item) => ({
      total_items: acc.total_items + 1,
      total_cost_value: acc.total_cost_value + (parseFloat(item.cost_value) || 0),
      total_market_value: acc.total_market_value + (parseFloat(item.market_value) || 0),
    }), { total_items: 0, total_cost_value: 0, total_market_value: 0 });

    res.json({ data: { items: data, summary } });
  } catch (err) { next(err); }
});

// ─── Stock Movement ───────────────────────────────────────────────
router.get('/stock-movement', async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;
    const today = new Date();
    const fyStart = today.getMonth() >= 3
      ? new Date(today.getFullYear(), 3, 1)
      : new Date(today.getFullYear() - 1, 3, 1);
    const sd = start_date || fyStart.toISOString().split('T')[0];
    const ed = end_date || today.toISOString().split('T')[0];

    // Inward movements from bill items (purchases)
    const inward = await db('bill_items')
      .leftJoin('bills', 'bill_items.bill_id', 'bills.id')
      .where('bills.bill_date', '>=', sd).where('bills.bill_date', '<=', ed)
      .whereNot('bills.status', 'Cancelled')
      .select(
        'bill_items.item_name as name',
        db.raw('SUM(bill_items.quantity) as inward_qty'),
        db.raw('COALESCE(SUM(bill_items.amount), 0) as inward_value')
      )
      .groupBy('bill_items.item_name');

    // Outward movements from invoice items (sales)
    const outward = await db('invoice_items')
      .leftJoin('invoices', 'invoice_items.invoice_id', 'invoices.id')
      .where('invoices.invoice_date', '>=', sd).where('invoices.invoice_date', '<=', ed)
      .whereNot('invoices.status', 'Cancelled')
      .select(
        'invoice_items.item_name as name',
        db.raw('SUM(invoice_items.quantity) as outward_qty'),
        db.raw('COALESCE(SUM(invoice_items.amount), 0) as outward_value')
      )
      .groupBy('invoice_items.item_name');

    // Merge inward and outward
    const movementMap = {};
    inward.forEach(r => {
      movementMap[r.name] = movementMap[r.name] || { item_name: r.name, inward_qty: 0, inward_value: 0, outward_qty: 0, outward_value: 0 };
      movementMap[r.name].inward_qty += parseFloat(r.inward_qty) || 0;
      movementMap[r.name].inward_value += parseFloat(r.inward_value) || 0;
    });
    outward.forEach(r => {
      movementMap[r.name] = movementMap[r.name] || { item_name: r.name, inward_qty: 0, inward_value: 0, outward_qty: 0, outward_value: 0 };
      movementMap[r.name].outward_qty += parseFloat(r.outward_qty) || 0;
      movementMap[r.name].outward_value += parseFloat(r.outward_value) || 0;
    });

    const data = Object.values(movementMap).sort((a, b) => b.outward_value - a.outward_value);
    res.json({ data: { items: data, period: { start_date: sd, end_date: ed } } });
  } catch (err) { next(err); }
});

module.exports = router;
