const db = require('../config/database');

/**
 * Helper: Get the financial year start for Indian companies (April 1)
 * Given a date, returns the start of the financial year it belongs to.
 */
function getFinancialYearStart(date) {
  const d = new Date(date);
  const year = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
  return new Date(year, 3, 1); // April 1
}

/**
 * Helper: Parse date range from query params
 * Supports:
 *   - as_on_date mode: from entity creation date to today
 *   - month/year (Indian FY month: April=1 ... March=12)
 *   - custom start_date/end_date
 */
function parseDateRange(query, entityCreatedAt) {
  const { start_date, end_date, month, year, mode } = query;

  // "As on date" mode: from entity creation date to today
  if (mode === 'as_on_date') {
    const fromDate = entityCreatedAt ? new Date(entityCreatedAt) : new Date(2020, 0, 1);
    const toDate = new Date();
    return {
      startDate: fromDate,
      endDate: toDate,
    };
  }

  if (start_date && end_date) {
    return {
      startDate: new Date(start_date),
      endDate: new Date(end_date),
    };
  }

  if (month && year) {
    const m = parseInt(month);
    const y = parseInt(year);
    // month is 1-12 where 1=Jan, 2=Feb, ... 12=Dec (calendar month)
    const startDate = new Date(y, m - 1, 1);
    const endDate = new Date(y, m, 0); // last day of the month
    return { startDate, endDate };
  }

  // Default: "as on date" — from entity creation to today
  const fromDate = entityCreatedAt ? new Date(entityCreatedAt) : new Date(2020, 0, 1);
  const toDate = new Date();
  return { startDate: fromDate, endDate: toDate };
}

/**
 * Format date as YYYY-MM-DD for SQL queries
 */
function formatDateSQL(date) {
  return date.toISOString().split('T')[0];
}

/**
 * GET /api/customers/:id/statement
 *
 * Query params:
 *   - start_date, end_date (YYYY-MM-DD) for custom range
 *   - month (1-12), year (e.g. 2025) for month-wise
 *
 * Returns:
 *   - customer: basic info
 *   - period: { start_date, end_date }
 *   - opening_balance: amount outstanding before the period
 *   - transactions: [ { date, type, document_number, description, debit, credit, running_balance } ]
 *   - closing_balance: running total at end
 */
const getCustomerStatement = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verify customer exists
    const customer = await db('customers')
      .where({ id })
      .select('id', 'display_name', 'company_name', 'customer_code', 'email', 'phone', 'gstin', 'opening_balance', 'currency_code', 'created_at')
      .first();

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const { startDate, endDate } = parseDateRange(req.query, customer.created_at);
    const startDateSQL = formatDateSQL(startDate);
    const endDateSQL = formatDateSQL(endDate);

    // Calculate opening balance:
    // Opening balance = customer.opening_balance
    //   + sum of all invoices (total_amount) before start_date (excluding Cancelled)
    //   - sum of all credit notes (total_amount) before start_date (excluding Cancelled)
    //   - sum of all payments received (amount) before start_date

    const openingBalanceResult = await db.raw(`
      SELECT
        COALESCE((SELECT SUM(total_amount) FROM invoices WHERE customer_id = ? AND invoice_date < ? AND status != 'Cancelled'), 0) as total_invoiced,
        COALESCE((SELECT SUM(total_amount) FROM credit_notes WHERE customer_id = ? AND credit_note_date < ? AND status = 'Cancelled'), 0) as cancelled_credit_notes,
        COALESCE((SELECT SUM(total_amount) FROM credit_notes WHERE customer_id = ? AND credit_note_date < ? AND status != 'Cancelled'), 0) as total_credit_notes,
        COALESCE((SELECT SUM(amount) FROM payments_received WHERE customer_id = ? AND payment_date < ?), 0) as total_payments
    `, [id, startDateSQL, id, startDateSQL, id, startDateSQL, id, startDateSQL]);

    const obRow = openingBalanceResult.rows[0];
    const customerOpeningBalance = parseFloat(customer.opening_balance) || 0;
    const openingBalance = customerOpeningBalance
      + parseFloat(obRow.total_invoiced)
      - parseFloat(obRow.total_credit_notes)
      - parseFloat(obRow.total_payments);

    // Fetch transactions within the period

    // 1. Invoices in the period (excluding Cancelled) - these are DEBITS (customer owes us)
    const invoices = await db('invoices')
      .where({ customer_id: id })
      .whereNot('status', 'Cancelled')
      .whereBetween('invoice_date', [startDateSQL, endDateSQL])
      .select(
        'invoice_date as date',
        db.raw("'invoice' as type"),
        'invoice_number as document_number',
        db.raw("'Invoice' as description"),
        'total_amount as debit',
        db.raw('0 as credit')
      )
      .orderBy('invoice_date', 'asc');

    // 2. Credit Notes in the period (excluding Cancelled) - these are CREDITS (reduces customer balance)
    const creditNotes = await db('credit_notes')
      .where({ customer_id: id })
      .whereNot('status', 'Cancelled')
      .whereBetween('credit_note_date', [startDateSQL, endDateSQL])
      .select(
        'credit_note_date as date',
        db.raw("'credit-note' as type"),
        'credit_note_number as document_number',
        db.raw("COALESCE(reason, 'Credit Note') as description"),
        db.raw('0 as debit'),
        'total_amount as credit'
      )
      .orderBy('credit_note_date', 'asc');

    // 3. Payments Received in the period - these are CREDITS (customer paid us)
    const payments = await db('payments_received')
      .where({ customer_id: id })
      .whereBetween('payment_date', [startDateSQL, endDateSQL])
      .select(
        'payment_date as date',
        db.raw("'payment' as type"),
        'payment_number as document_number',
        db.raw("COALESCE(payment_mode, 'Payment Received') as description"),
        db.raw('0 as debit'),
        'amount as credit'
      )
      .orderBy('payment_date', 'asc');

    // Combine and sort by date
    const allTransactions = [...invoices, ...creditNotes, ...payments]
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    // Calculate running balance
    let runningBalance = openingBalance;
    const transactions = allTransactions.map((txn) => {
      const debit = parseFloat(txn.debit) || 0;
      const credit = parseFloat(txn.credit) || 0;
      runningBalance = runningBalance + debit - credit;
      return {
        date: txn.date,
        type: txn.type,
        document_number: txn.document_number,
        description: txn.description,
        debit: debit,
        credit: credit,
        running_balance: parseFloat(runningBalance.toFixed(2)),
      };
    });

    const closingBalance = parseFloat(runningBalance.toFixed(2));

    // Calculate totals
    const totalDebit = transactions.reduce((sum, t) => sum + t.debit, 0);
    const totalCredit = transactions.reduce((sum, t) => sum + t.credit, 0);

    res.json({
      data: {
        customer: {
          id: customer.id,
          display_name: customer.display_name,
          company_name: customer.company_name,
          customer_code: customer.customer_code,
          email: customer.email,
          phone: customer.phone,
          gstin: customer.gstin,
          currency_code: customer.currency_code,
        },
        period: {
          start_date: startDateSQL,
          end_date: endDateSQL,
        },
        opening_balance: parseFloat(openingBalance.toFixed(2)),
        transactions,
        closing_balance: closingBalance,
        summary: {
          total_debit: parseFloat(totalDebit.toFixed(2)),
          total_credit: parseFloat(totalCredit.toFixed(2)),
          transaction_count: transactions.length,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/vendors/:id/statement
 *
 * Query params:
 *   - start_date, end_date (YYYY-MM-DD) for custom range
 *   - month (1-12), year (e.g. 2025) for month-wise
 *
 * Returns:
 *   - vendor: basic info
 *   - period: { start_date, end_date }
 *   - opening_balance: amount we owe before the period
 *   - transactions: [ { date, type, document_number, description, debit, credit, running_balance } ]
 *   - closing_balance: running total at end
 */
const getVendorStatement = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verify vendor exists
    const vendor = await db('vendors')
      .where({ id })
      .select('id', 'display_name', 'company_name', 'vendor_code', 'email', 'phone', 'gstin', 'opening_balance', 'currency_code', 'created_at')
      .first();

    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    const { startDate, endDate } = parseDateRange(req.query, vendor.created_at);
    const startDateSQL = formatDateSQL(startDate);
    const endDateSQL = formatDateSQL(endDate);

    // Calculate opening balance:
    // Opening balance = vendor.opening_balance
    //   + sum of all bills (total_amount) before start_date (excluding Cancelled)
    //   - sum of all debit notes (total_amount) before start_date (excluding Cancelled)
    //   - sum of all payments made (amount) before start_date

    const openingBalanceResult = await db.raw(`
      SELECT
        COALESCE((SELECT SUM(total_amount) FROM bills WHERE vendor_id = ? AND bill_date < ? AND status != 'Cancelled'), 0) as total_billed,
        COALESCE((SELECT SUM(total_amount) FROM debit_notes WHERE vendor_id = ? AND debit_note_date < ? AND status != 'Cancelled'), 0) as total_debit_notes,
        COALESCE((SELECT SUM(amount) FROM payments_made WHERE vendor_id = ? AND payment_date < ?), 0) as total_payments
    `, [id, startDateSQL, id, startDateSQL, id, startDateSQL]);

    const obRow = openingBalanceResult.rows[0];
    const vendorOpeningBalance = parseFloat(vendor.opening_balance) || 0;
    const openingBalance = vendorOpeningBalance
      + parseFloat(obRow.total_billed)
      - parseFloat(obRow.total_debit_notes)
      - parseFloat(obRow.total_payments);

    // Fetch transactions within the period

    // 1. Bills in the period (excluding Cancelled) - these are CREDITS (we owe the vendor more)
    const bills = await db('bills')
      .where({ vendor_id: id })
      .whereNot('status', 'Cancelled')
      .whereBetween('bill_date', [startDateSQL, endDateSQL])
      .select(
        'bill_date as date',
        db.raw("'bill' as type"),
        'bill_number as document_number',
        db.raw("COALESCE(notes, 'Bill') as description"),
        db.raw('0 as debit'),
        'total_amount as credit'
      )
      .orderBy('bill_date', 'asc');

    // 2. Debit Notes in the period (excluding Cancelled) - these are DEBITS (reduces what we owe)
    const debitNotes = await db('debit_notes')
      .where({ vendor_id: id })
      .whereNot('status', 'Cancelled')
      .whereBetween('debit_note_date', [startDateSQL, endDateSQL])
      .select(
        'debit_note_date as date',
        db.raw("'debit-note' as type"),
        'debit_note_number as document_number',
        db.raw("COALESCE(reason, 'Debit Note') as description"),
        'total_amount as debit',
        db.raw('0 as credit')
      )
      .orderBy('debit_note_date', 'asc');

    // 3. Payments Made in the period - these are DEBITS (we paid the vendor)
    const payments = await db('payments_made')
      .where({ vendor_id: id })
      .whereBetween('payment_date', [startDateSQL, endDateSQL])
      .select(
        'payment_date as date',
        db.raw("'payment' as type"),
        'payment_number as document_number',
        db.raw("COALESCE(payment_mode, 'Payment Made') as description"),
        'amount as debit',
        db.raw('0 as credit')
      )
      .orderBy('payment_date', 'asc');

    // Combine and sort by date
    const allTransactions = [...bills, ...debitNotes, ...payments]
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    // Calculate running balance (positive = we owe the vendor)
    let runningBalance = openingBalance;
    const transactions = allTransactions.map((txn) => {
      const debit = parseFloat(txn.debit) || 0;
      const credit = parseFloat(txn.credit) || 0;
      // For vendor: credit (bills) increases what we owe, debit (payments/debit notes) decreases
      runningBalance = runningBalance + credit - debit;
      return {
        date: txn.date,
        type: txn.type,
        document_number: txn.document_number,
        description: txn.description,
        debit: debit,
        credit: credit,
        running_balance: parseFloat(runningBalance.toFixed(2)),
      };
    });

    const closingBalance = parseFloat(runningBalance.toFixed(2));

    // Calculate totals
    const totalDebit = transactions.reduce((sum, t) => sum + t.debit, 0);
    const totalCredit = transactions.reduce((sum, t) => sum + t.credit, 0);

    res.json({
      data: {
        vendor: {
          id: vendor.id,
          display_name: vendor.display_name,
          company_name: vendor.company_name,
          vendor_code: vendor.vendor_code,
          email: vendor.email,
          phone: vendor.phone,
          gstin: vendor.gstin,
          currency_code: vendor.currency_code,
        },
        period: {
          start_date: startDateSQL,
          end_date: endDateSQL,
        },
        opening_balance: parseFloat(openingBalance.toFixed(2)),
        transactions,
        closing_balance: closingBalance,
        summary: {
          total_debit: parseFloat(totalDebit.toFixed(2)),
          total_credit: parseFloat(totalCredit.toFixed(2)),
          transaction_count: transactions.length,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getCustomerStatement, getVendorStatement };
