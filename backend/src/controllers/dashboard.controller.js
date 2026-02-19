const db = require('../config/database');

/**
 * GET /summary - Dashboard summary
 */
const getSummary = async (req, res, next) => {
  try {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Accept date range from query params, fallback to current month
    const { start_date, end_date } = req.query;
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const periodStart = start_date || firstDayOfMonth.toISOString().split('T')[0];
    const periodEnd = end_date || todayStr;

    // Total receivables (invoices not paid/cancelled/draft)
    const [receivables] = await db('invoices')
      .whereNotIn('status', ['Paid', 'Cancelled', 'Draft'])
      .select(db.raw('COALESCE(SUM(balance_due), 0) as total'));

    // Total payables (bills not paid)
    const [payables] = await db('bills')
      .whereNot('status', 'Paid')
      .select(db.raw('COALESCE(SUM(balance_due), 0) as total'));

    // Cash in hand (sum of active bank accounts)
    const [bankBalance] = await db('bank_accounts')
      .where('is_active', true)
      .select(db.raw('COALESCE(SUM(current_balance), 0) as total'));

    // Overdue invoices (count + amount) - status Overdue OR past due_date for unpaid invoices
    const [overdueInvoices] = await db('invoices')
      .where(function () {
        this.where('status', 'Overdue')
          .orWhere(function () {
            this.where('due_date', '<', todayStr)
              .whereIn('status', ['Draft', 'Final', 'Sent', 'Partial']);
          });
      })
      .select(db.raw('COUNT(*) as count, COALESCE(SUM(balance_due), 0) as amount'));

    // Current invoices (not overdue, not paid/cancelled/draft) - due date in future or no due date
    const [currentInvoices] = await db('invoices')
      .whereNotIn('status', ['Paid', 'Cancelled', 'Overdue', 'Draft'])
      .where(function () {
        this.whereNull('due_date').orWhere('due_date', '>=', todayStr);
      })
      .select(db.raw('COALESCE(SUM(balance_due), 0) as amount'));

    // Overdue bills (count + amount)
    const [overdueBills] = await db('bills')
      .where(function () {
        this.where('due_date', '<', todayStr)
          .whereIn('status', ['Pending', 'Partial']);
      })
      .select(db.raw('COUNT(*) as count, COALESCE(SUM(balance_due), 0) as amount'));

    // Current bills (not overdue, not paid)
    const [currentBills] = await db('bills')
      .whereNot('status', 'Paid')
      .where(function () {
        this.whereNull('due_date').orWhere('due_date', '>=', todayStr);
      })
      .select(db.raw('COALESCE(SUM(balance_due), 0) as amount'));

    // Total income in selected period (payments received — actual cash in)
    const [monthlyIncome] = await db('payments_received')
      .where('payment_date', '>=', periodStart)
      .where('payment_date', '<=', periodEnd)
      .where('status', 'Received')
      .select(db.raw('COALESCE(SUM(amount), 0) as total'));

    // Total expenses in selected period (bills + direct expenses)
    const [monthlyBillExpenses] = await db('bills')
      .where('bill_date', '>=', periodStart)
      .where('bill_date', '<=', periodEnd)
      .whereNot('status', 'Cancelled')
      .select(db.raw('COALESCE(SUM(total_amount), 0) as total'));

    const [monthlyDirectExpenses] = await db('expenses')
      .where('expense_date', '>=', periodStart)
      .where('expense_date', '<=', periodEnd)
      .whereNot('status', 'Rejected')
      .select(db.raw('COALESCE(SUM(total_amount), 0) as total'));

    const monthlyExpensesTotal = parseFloat(monthlyBillExpenses.total || 0) + parseFloat(monthlyDirectExpenses.total || 0);

    res.json({
      data: {
        totalReceivables: parseFloat(receivables.total) || 0,
        totalPayables: parseFloat(payables.total) || 0,
        bankBalance: parseFloat(bankBalance.total) || 0,
        overdueInvoices: parseInt(overdueInvoices.count) || 0,
        overdueReceivables: parseFloat(overdueInvoices.amount) || 0,
        currentReceivables: parseFloat(currentInvoices.amount) || 0,
        overdueBills: parseInt(overdueBills.count) || 0,
        overduePayables: parseFloat(overdueBills.amount) || 0,
        currentPayables: parseFloat(currentBills.amount) || 0,
        totalIncome: parseFloat(monthlyIncome.total) || 0,
        totalExpenses: monthlyExpensesTotal,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /charts/cash-flow - Cash flow chart data
 */
const getCashFlow = async (req, res, next) => {
  try {
    const { start_date, end_date, period = 'monthly' } = req.query;

    const today = new Date();
    const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 5, 1);
    const startDate = start_date || sixMonthsAgo.toISOString().split('T')[0];
    const endDate = end_date || today.toISOString().split('T')[0];

    let dateTrunc = 'month';
    if (period === 'weekly') dateTrunc = 'week';
    if (period === 'daily') dateTrunc = 'day';

    // Inflow: payments received
    const inflow = await db('payments_received')
      .where('payment_date', '>=', startDate)
      .where('payment_date', '<=', endDate)
      .where('status', 'Received')
      .select(
        db.raw(`DATE_TRUNC('${dateTrunc}', payment_date) as period`),
        db.raw('COALESCE(SUM(amount), 0) as total')
      )
      .groupByRaw(`DATE_TRUNC('${dateTrunc}', payment_date)`)
      .orderBy('period');

    // Outflow: payments made + expenses paid
    const outflowPayments = await db('payments_made')
      .where('payment_date', '>=', startDate)
      .where('payment_date', '<=', endDate)
      .where('status', 'Paid')
      .select(
        db.raw(`DATE_TRUNC('${dateTrunc}', payment_date) as period`),
        db.raw('COALESCE(SUM(amount), 0) as total')
      )
      .groupByRaw(`DATE_TRUNC('${dateTrunc}', payment_date)`)
      .orderBy('period');

    const outflowExpenses = await db('expenses')
      .where('expense_date', '>=', startDate)
      .where('expense_date', '<=', endDate)
      .where('status', 'Paid')
      .select(
        db.raw(`DATE_TRUNC('${dateTrunc}', expense_date) as period`),
        db.raw('COALESCE(SUM(total_amount), 0) as total')
      )
      .groupByRaw(`DATE_TRUNC('${dateTrunc}', expense_date)`)
      .orderBy('period');

    // Merge outflow data
    const outflowMap = {};
    outflowPayments.forEach((row) => {
      const key = row.period.toISOString();
      outflowMap[key] = (outflowMap[key] || 0) + parseFloat(row.total);
    });
    outflowExpenses.forEach((row) => {
      const key = row.period.toISOString();
      outflowMap[key] = (outflowMap[key] || 0) + parseFloat(row.total);
    });

    // Build labels and data arrays
    const allPeriods = new Set();
    inflow.forEach((row) => allPeriods.add(row.period.toISOString()));
    Object.keys(outflowMap).forEach((key) => allPeriods.add(key));

    const sortedPeriods = [...allPeriods].sort();
    const labels = sortedPeriods.map((p) => {
      const d = new Date(p);
      return d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
    });

    const inflowMap = {};
    inflow.forEach((row) => {
      inflowMap[row.period.toISOString()] = parseFloat(row.total);
    });

    const inflowData = sortedPeriods.map((p) => inflowMap[p] || 0);
    const outflowData = sortedPeriods.map((p) => outflowMap[p] || 0);

    res.json({
      data: { labels, inflow: inflowData, outflow: outflowData },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /charts/receivables - Receivables aging chart data
 */
const getReceivablesChart = async (req, res, next) => {
  try {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const invoices = await db('invoices')
      .whereNotIn('status', ['Paid', 'Cancelled'])
      .where('balance_due', '>', 0)
      .select('due_date', 'balance_due');

    let current = 0;
    let overdue1to30 = 0;
    let overdue31to60 = 0;
    let overdue61to90 = 0;
    let overdueAbove90 = 0;

    invoices.forEach((inv) => {
      const balanceDue = parseFloat(inv.balance_due) || 0;
      if (!inv.due_date) {
        current += balanceDue;
        return;
      }

      const dueDate = new Date(inv.due_date);
      dueDate.setHours(0, 0, 0, 0);
      const diffDays = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));

      if (diffDays <= 0) {
        current += balanceDue;
      } else if (diffDays <= 30) {
        overdue1to30 += balanceDue;
      } else if (diffDays <= 60) {
        overdue31to60 += balanceDue;
      } else if (diffDays <= 90) {
        overdue61to90 += balanceDue;
      } else {
        overdueAbove90 += balanceDue;
      }
    });

    res.json({
      data: {
        current: parseFloat(current.toFixed(2)),
        overdue1to30: parseFloat(overdue1to30.toFixed(2)),
        overdue31to60: parseFloat(overdue31to60.toFixed(2)),
        overdue61to90: parseFloat(overdue61to90.toFixed(2)),
        overdueAbove90: parseFloat(overdueAbove90.toFixed(2)),
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /charts/expenses - Expense breakdown by category
 */
const getExpenseBreakdown = async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;

    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startDate = start_date || firstDayOfMonth.toISOString().split('T')[0];
    const endDate = end_date || today.toISOString().split('T')[0];

    const breakdown = await db('expenses')
      .where('expense_date', '>=', startDate)
      .where('expense_date', '<=', endDate)
      .whereNot('status', 'Rejected')
      .select(
        db.raw("COALESCE(category, 'Uncategorized') as category"),
        db.raw('SUM(total_amount) as total')
      )
      .groupBy('category')
      .orderBy('total', 'desc');

    const categories = breakdown.map((row) => row.category);
    const amounts = breakdown.map((row) => parseFloat(row.total));

    res.json({ data: { categories, amounts } });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /charts/income-expense - Income vs Expense bar chart
 */
const getIncomeExpenseChart = async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;

    const today = new Date();
    const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 5, 1);
    const startDate = start_date || sixMonthsAgo.toISOString().split('T')[0];
    const endDate = end_date || today.toISOString().split('T')[0];

    // Income: payments received by month (actual cash in)
    const income = await db('payments_received')
      .where('payment_date', '>=', startDate)
      .where('payment_date', '<=', endDate)
      .where('status', 'Received')
      .select(
        db.raw("DATE_TRUNC('month', payment_date) as period"),
        db.raw('COALESCE(SUM(amount), 0) as total')
      )
      .groupByRaw("DATE_TRUNC('month', payment_date)")
      .orderBy('period');

    // Expenses by month (bills + expenses)
    const billExpenses = await db('bills')
      .where('bill_date', '>=', startDate)
      .where('bill_date', '<=', endDate)
      .select(
        db.raw("DATE_TRUNC('month', bill_date) as period"),
        db.raw('COALESCE(SUM(total_amount), 0) as total')
      )
      .groupByRaw("DATE_TRUNC('month', bill_date)")
      .orderBy('period');

    const directExpenses = await db('expenses')
      .where('expense_date', '>=', startDate)
      .where('expense_date', '<=', endDate)
      .whereNot('status', 'Rejected')
      .select(
        db.raw("DATE_TRUNC('month', expense_date) as period"),
        db.raw('COALESCE(SUM(total_amount), 0) as total')
      )
      .groupByRaw("DATE_TRUNC('month', expense_date)")
      .orderBy('period');

    // Merge all periods
    const allPeriods = new Set();
    const incomeMap = {};
    const expenseMap = {};

    income.forEach((row) => {
      const key = row.period.toISOString();
      allPeriods.add(key);
      incomeMap[key] = parseFloat(row.total);
    });

    billExpenses.forEach((row) => {
      const key = row.period.toISOString();
      allPeriods.add(key);
      expenseMap[key] = (expenseMap[key] || 0) + parseFloat(row.total);
    });

    directExpenses.forEach((row) => {
      const key = row.period.toISOString();
      allPeriods.add(key);
      expenseMap[key] = (expenseMap[key] || 0) + parseFloat(row.total);
    });

    const sortedPeriods = [...allPeriods].sort();
    const labels = sortedPeriods.map((p) => {
      const d = new Date(p);
      return d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
    });

    const incomeData = sortedPeriods.map((p) => incomeMap[p] || 0);
    const expenseData = sortedPeriods.map((p) => expenseMap[p] || 0);

    res.json({ data: { labels, income: incomeData, expenses: expenseData } });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /recent-activity - Recent transactions/activity feed
 */
const getRecentActivity = async (req, res, next) => {
  try {
    const { limit = 20 } = req.query;

    // Get recent invoices
    const recentInvoices = await db('invoices')
      .leftJoin('customers', 'invoices.customer_id', 'customers.id')
      .select(
        db.raw("'invoice' as type"),
        'invoices.id',
        'invoices.invoice_number as number',
        'customers.display_name as party_name',
        'invoices.total_amount as amount',
        'invoices.status',
        'invoices.created_at'
      )
      .orderBy('invoices.created_at', 'desc')
      .limit(parseInt(limit));

    // Get recent bills
    const recentBills = await db('bills')
      .leftJoin('vendors', 'bills.vendor_id', 'vendors.id')
      .select(
        db.raw("'bill' as type"),
        'bills.id',
        'bills.bill_number as number',
        'vendors.display_name as party_name',
        'bills.total_amount as amount',
        'bills.status',
        'bills.created_at'
      )
      .orderBy('bills.created_at', 'desc')
      .limit(parseInt(limit));

    // Get recent expenses
    const recentExpenses = await db('expenses')
      .select(
        db.raw("'expense' as type"),
        'id',
        'expense_number as number',
        'category as party_name',
        'total_amount as amount',
        'status',
        'created_at'
      )
      .orderBy('created_at', 'desc')
      .limit(parseInt(limit));

    // Get recent payments received
    const recentPaymentsReceived = await db('payments_received')
      .leftJoin('customers', 'payments_received.customer_id', 'customers.id')
      .select(
        db.raw("'payment_received' as type"),
        'payments_received.id',
        'payments_received.payment_number as number',
        'customers.display_name as party_name',
        'payments_received.amount',
        'payments_received.status',
        'payments_received.created_at'
      )
      .orderBy('payments_received.created_at', 'desc')
      .limit(parseInt(limit));

    // Combine and sort by created_at
    const allActivity = [
      ...recentInvoices,
      ...recentBills,
      ...recentExpenses,
      ...recentPaymentsReceived,
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, parseInt(limit));

    res.json({ data: allActivity });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getSummary,
  getCashFlow,
  getReceivablesChart,
  getExpenseBreakdown,
  getIncomeExpenseChart,
  getRecentActivity,
};
