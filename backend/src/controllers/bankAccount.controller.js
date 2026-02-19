const db = require('../config/database');

/**
 * GET / - List all bank accounts with transaction count and balance summary
 */
const list = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, is_active, bank_name, sort_by, sort_order = 'desc' } = req.query;
    const offset = (page - 1) * limit;

    let query = db('bank_accounts');

    if (is_active !== undefined) {
      query = query.where('is_active', is_active === 'true');
    }

    if (bank_name) {
      query = query.where('bank_name', 'ilike', `%${bank_name}%`);
    }

    const [{ count }] = await query.clone().count();

    const accounts = await query
      .orderBy(sort_by || 'created_at', sort_order)
      .limit(limit)
      .offset(offset);

    // Enrich with transaction counts
    const data = await Promise.all(accounts.map(async (account) => {
      const [txnStats] = await db('bank_transactions')
        .where({ bank_account_id: account.id })
        .select(
          db.raw('COUNT(*) as transaction_count'),
          db.raw('SUM(deposit_amount) as total_deposits'),
          db.raw('SUM(withdrawal_amount) as total_withdrawals'),
          db.raw("COUNT(CASE WHEN is_reconciled = false THEN 1 END) as unreconciled_count")
        );

      return {
        ...account,
        transaction_count: parseInt(txnStats.transaction_count) || 0,
        total_deposits: parseFloat(txnStats.total_deposits) || 0,
        total_withdrawals: parseFloat(txnStats.total_withdrawals) || 0,
        unreconciled_count: parseInt(txnStats.unreconciled_count) || 0,
      };
    }));

    res.json({ data, total: parseInt(count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /:id - Get bank account by ID with recent transactions
 */
const getById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const account = await db('bank_accounts').where({ id }).first();
    if (!account) {
      return res.status(404).json({ error: 'Bank account not found' });
    }

    // Get recent transactions
    const recentTransactions = await db('bank_transactions')
      .where({ bank_account_id: id })
      .orderBy('transaction_date', 'desc')
      .limit(20);

    // Get summary stats
    const [stats] = await db('bank_transactions')
      .where({ bank_account_id: id })
      .select(
        db.raw('COUNT(*) as total_transactions'),
        db.raw('SUM(deposit_amount) as total_deposits'),
        db.raw('SUM(withdrawal_amount) as total_withdrawals'),
        db.raw("COUNT(CASE WHEN is_reconciled = false THEN 1 END) as unreconciled_count")
      );

    res.json({
      data: {
        ...account,
        recent_transactions: recentTransactions,
        summary: {
          total_transactions: parseInt(stats.total_transactions) || 0,
          total_deposits: parseFloat(stats.total_deposits) || 0,
          total_withdrawals: parseFloat(stats.total_withdrawals) || 0,
          unreconciled_count: parseInt(stats.unreconciled_count) || 0,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST / - Create bank account
 */
const create = async (req, res, next) => {
  try {
    const accountData = req.body;

    if (!accountData.account_name) {
      return res.status(400).json({ error: 'Account name is required' });
    }

    // Set current_balance = opening_balance on creation
    if (accountData.opening_balance && !accountData.current_balance) {
      accountData.current_balance = accountData.opening_balance;
    }

    const [account] = await db('bank_accounts')
      .insert(accountData)
      .returning('*');

    res.status(201).json({ data: account });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /:id - Update bank account
 */
const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const accountData = req.body;

    const existing = await db('bank_accounts').where({ id }).first();
    if (!existing) {
      return res.status(404).json({ error: 'Bank account not found' });
    }

    accountData.updated_at = new Date();

    const [updated] = await db('bank_accounts')
      .where({ id })
      .update(accountData)
      .returning('*');

    // If opening_balance changed, auto-recalculate current_balance from all transactions
    if (accountData.opening_balance !== undefined && accountData.opening_balance !== existing.opening_balance) {
      const result = await db('bank_transactions')
        .where({ bank_account_id: id })
        .select(
          db.raw('COALESCE(SUM(deposit_amount), 0) as total_deposits'),
          db.raw('COALESCE(SUM(withdrawal_amount), 0) as total_withdrawals')
        )
        .first();
      const newBalance = parseFloat(accountData.opening_balance) +
        parseFloat(result.total_deposits) - parseFloat(result.total_withdrawals);
      await db('bank_accounts').where({ id }).update({ current_balance: newBalance, updated_at: new Date() });
      updated.current_balance = newBalance;
    }

    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /:id - Soft delete, check for linked transactions
 */
const remove = async (req, res, next) => {
  try {
    const { id } = req.params;

    const account = await db('bank_accounts').where({ id }).first();
    if (!account) {
      return res.status(404).json({ error: 'Bank account not found' });
    }

    // Check for linked transactions
    const [{ count }] = await db('bank_transactions')
      .where({ bank_account_id: id })
      .count();

    if (parseInt(count) > 0) {
      // Soft delete
      await db('bank_accounts')
        .where({ id })
        .update({ is_active: false, updated_at: new Date() });
      return res.json({ message: 'Bank account deactivated (has linked transactions)' });
    }

    await db('bank_accounts').where({ id }).del();
    res.json({ message: 'Bank account deleted successfully' });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /summary - Banking summary for the balance bar
 * Returns:
 *   - amount_in_books: sum of all bank_accounts.current_balance
 *   - amount_in_bank: sum of the last transaction balance for each account
 *   - last_feed_date: most recent transaction date across all accounts
 *   - accounts: each bank account with its book balance and statement balance
 */
const getSummary = async (req, res, next) => {
  try {
    const accounts = await db('bank_accounts').where('is_active', true);

    let amountInBooks = 0;
    let amountInBank = 0;
    let lastFeedDate = null;
    const accountSummaries = [];

    for (const account of accounts) {
      const bookBalance = parseFloat(account.current_balance) || 0;
      amountInBooks += bookBalance;

      // Get the most recent transaction for this account (by transaction_date, then created_at)
      const lastTxn = await db('bank_transactions')
        .where({ bank_account_id: account.id })
        .orderBy('transaction_date', 'desc')
        .orderBy('created_at', 'desc')
        .first();

      let statementBalance = bookBalance; // fallback to book balance if no transactions
      let accountLastFeedDate = null;

      if (lastTxn) {
        const parsedBalance = parseFloat(lastTxn.balance);
        statementBalance = isNaN(parsedBalance) ? bookBalance : parsedBalance;
        accountLastFeedDate = lastTxn.transaction_date;

        // Track the global last feed date
        if (!lastFeedDate || new Date(lastTxn.transaction_date) > new Date(lastFeedDate)) {
          lastFeedDate = lastTxn.transaction_date;
        }
      }

      amountInBank += statementBalance;

      accountSummaries.push({
        id: account.id,
        account_name: account.account_name,
        bank_name: account.bank_name,
        book_balance: bookBalance,
        statement_balance: statementBalance,
        last_feed_date: accountLastFeedDate,
      });
    }

    res.json({
      data: {
        amount_in_books: amountInBooks,
        amount_in_bank: amountInBank,
        last_feed_date: lastFeedDate,
        accounts: accountSummaries,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { list, getById, create, update, remove, getSummary };
