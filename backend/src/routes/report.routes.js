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
      .select(db.raw('COALESCE(SUM(amount), 0) as total'));

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

// GET /balance-sheet - Balance Sheet (placeholder with real account data)
router.get('/balance-sheet', async (req, res, next) => {
  try {
    const assets = await db('chart_of_accounts')
      .where('account_type', 'Asset')
      .select('id', 'account_name', 'account_code', 'current_balance as balance');

    const liabilities = await db('chart_of_accounts')
      .where('account_type', 'Liability')
      .select('id', 'account_name', 'account_code', 'current_balance as balance');

    const equity = await db('chart_of_accounts')
      .where('account_type', 'Equity')
      .select('id', 'account_name', 'account_code', 'current_balance as balance');

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

// GET /cash-flow - Cash Flow Statement (placeholder)
router.get('/cash-flow', async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;
    res.json({
      data: {
        operating: 0,
        investing: 0,
        financing: 0,
        netCashFlow: 0,
        period: { start_date, end_date },
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
      .select(
        `${group_by} as group_key`,
        db.raw('COUNT(*) as count'),
        db.raw('COALESCE(SUM(amount), 0) as total_amount')
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

module.exports = router;
