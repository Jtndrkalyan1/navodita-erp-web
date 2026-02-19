const db = require('../config/database');

/**
 * GET / - List all accounts, optionally hierarchical grouped by type
 */
const list = async (req, res, next) => {
  try {
    const { account_type, parent_account_id, is_active, flat } = req.query;

    let query = db('chart_of_accounts')
      .leftJoin('chart_of_accounts as parent', 'chart_of_accounts.parent_account_id', 'parent.id')
      .select('chart_of_accounts.*', 'parent.account_name as parent_account_name');

    if (account_type) {
      query = query.where('chart_of_accounts.account_type', account_type);
    }

    if (parent_account_id) {
      query = query.where('chart_of_accounts.parent_account_id', parent_account_id);
    }

    if (is_active !== undefined) {
      query = query.where('chart_of_accounts.is_active', is_active === 'true');
    }

    const accounts = await query.orderBy('chart_of_accounts.sort_order', 'asc').orderBy('chart_of_accounts.account_code', 'asc');

    // Return flat list if requested
    if (flat === 'true') {
      return res.json({ data: accounts, total: accounts.length });
    }

    // Build hierarchical structure grouped by parent category
    const parentCategories = ['Asset', 'Liability', 'Equity', 'Income', 'Expense'];
    const typeCategoryMap = {
      Asset: 'Asset', Cash: 'Asset', Bank: 'Asset', 'Fixed Asset': 'Asset', Stock: 'Asset',
      'Other Current Asset': 'Asset', 'Accounts Receivable': 'Asset', 'Payment Clearing': 'Asset',
      Liability: 'Liability', 'Accounts Payable': 'Liability', 'Other Current Liability': 'Liability',
      'Other Liability': 'Liability', 'Long Term Liability': 'Liability',
      Equity: 'Equity',
      Income: 'Income', 'Other Income': 'Income',
      Expense: 'Expense', 'Other Expense': 'Expense', 'Cost Of Goods Sold': 'Expense',
    };
    const grouped = {};

    parentCategories.forEach((type) => {
      grouped[type] = [];
    });

    // Build parent-child map
    const accountMap = {};
    accounts.forEach((acc) => {
      accountMap[acc.id] = { ...acc, children: [] };
    });

    const rootAccounts = [];
    accounts.forEach((acc) => {
      if (acc.parent_account_id && accountMap[acc.parent_account_id]) {
        accountMap[acc.parent_account_id].children.push(accountMap[acc.id]);
      } else {
        rootAccounts.push(accountMap[acc.id]);
      }
    });

    // Group root accounts by parent category
    rootAccounts.forEach((acc) => {
      const category = typeCategoryMap[acc.account_type] || acc.account_type;
      if (grouped[category]) {
        grouped[category].push(acc);
      } else {
        grouped[category] = [acc];
      }
    });

    res.json({ data: grouped, total: accounts.length });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /:id - Get account by ID with sub-accounts
 */
const getById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const account = await db('chart_of_accounts').where({ id }).first();
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Get child accounts
    const children = await db('chart_of_accounts')
      .where({ parent_account_id: id })
      .orderBy('sort_order', 'asc');

    // Get parent account info
    let parent = null;
    if (account.parent_account_id) {
      parent = await db('chart_of_accounts')
        .select('id', 'account_code', 'account_name', 'account_type')
        .where({ id: account.parent_account_id })
        .first();
    }

    // Get recent journal lines for this account
    const recentJournalLines = await db('journal_lines')
      .leftJoin('journal_entries', 'journal_lines.journal_entry_id', 'journal_entries.id')
      .select(
        'journal_lines.*',
        'journal_entries.journal_number',
        'journal_entries.journal_date',
        'journal_entries.status'
      )
      .where('journal_lines.account_id', id)
      .where('journal_entries.status', 'Posted')
      .orderBy('journal_entries.journal_date', 'desc')
      .limit(10);

    res.json({
      data: {
        ...account,
        parent,
        children,
        recent_transactions: recentJournalLines,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST / - Create account
 */
const create = async (req, res, next) => {
  try {
    const accountData = req.body;

    if (!accountData.account_code || !accountData.account_name || !accountData.account_type) {
      return res.status(400).json({ error: 'Account code, name, and type are required' });
    }

    // Validate account type (all 16 granular types are valid)
    const validTypes = [
      'Asset', 'Cash', 'Bank', 'Fixed Asset', 'Stock', 'Other Current Asset', 'Accounts Receivable', 'Payment Clearing',
      'Liability', 'Accounts Payable', 'Other Current Liability', 'Other Liability', 'Long Term Liability',
      'Equity',
      'Income', 'Other Income',
      'Expense', 'Other Expense', 'Cost Of Goods Sold',
    ];
    if (!validTypes.includes(accountData.account_type)) {
      return res.status(400).json({ error: `Invalid account type. Must be one of: ${validTypes.join(', ')}` });
    }

    // Check unique account code
    const existing = await db('chart_of_accounts')
      .where({ account_code: accountData.account_code })
      .first();

    if (existing) {
      return res.status(409).json({ error: 'Account code already exists' });
    }

    // Validate parent account exists and belongs to the same parent category
    if (accountData.parent_account_id) {
      const parent = await db('chart_of_accounts')
        .where({ id: accountData.parent_account_id })
        .first();

      if (!parent) {
        return res.status(400).json({ error: 'Parent account not found' });
      }

      // Map granular types to parent categories for comparison
      const typeCategoryMap = {
        Asset: 'Asset', Cash: 'Asset', Bank: 'Asset', 'Fixed Asset': 'Asset', Stock: 'Asset',
        'Other Current Asset': 'Asset', 'Accounts Receivable': 'Asset', 'Payment Clearing': 'Asset',
        Liability: 'Liability', 'Accounts Payable': 'Liability', 'Other Current Liability': 'Liability',
        'Other Liability': 'Liability', 'Long Term Liability': 'Liability',
        Equity: 'Equity',
        Income: 'Income', 'Other Income': 'Income',
        Expense: 'Expense', 'Other Expense': 'Expense', 'Cost Of Goods Sold': 'Expense',
      };

      const parentCategory = typeCategoryMap[parent.account_type] || parent.account_type;
      const childCategory = typeCategoryMap[accountData.account_type] || accountData.account_type;

      if (parentCategory !== childCategory) {
        return res.status(400).json({ error: 'Parent account must belong to the same category' });
      }
    }

    const [account] = await db('chart_of_accounts')
      .insert(accountData)
      .returning('*');

    res.status(201).json({ data: account });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /:id - Update account (restrict changes if system account)
 */
const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const accountData = req.body;

    const existing = await db('chart_of_accounts').where({ id }).first();
    if (!existing) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Restrict type change for system accounts
    if (existing.is_system_account && accountData.account_type && accountData.account_type !== existing.account_type) {
      return res.status(400).json({ error: 'Cannot change type of a system account' });
    }

    // Check for journal entries if changing type
    if (accountData.account_type && accountData.account_type !== existing.account_type) {
      const [{ count }] = await db('journal_lines')
        .where({ account_id: id })
        .count();

      if (parseInt(count) > 0) {
        return res.status(400).json({ error: 'Cannot change account type when transactions exist' });
      }
    }

    accountData.updated_at = new Date();

    const [updated] = await db('chart_of_accounts')
      .where({ id })
      .update(accountData)
      .returning('*');

    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /:id - Delete account (no delete for system accounts or accounts with transactions)
 */
const remove = async (req, res, next) => {
  try {
    const { id } = req.params;

    const account = await db('chart_of_accounts').where({ id }).first();
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    if (account.is_system_account) {
      return res.status(400).json({ error: 'Cannot delete a system account' });
    }

    // Check for journal lines
    const [{ count: journalCount }] = await db('journal_lines')
      .where({ account_id: id })
      .count();

    if (parseInt(journalCount) > 0) {
      return res.status(409).json({ error: 'Cannot delete account with linked journal entries' });
    }

    // Check for child accounts
    const [{ count: childCount }] = await db('chart_of_accounts')
      .where({ parent_account_id: id })
      .count();

    if (parseInt(childCount) > 0) {
      return res.status(409).json({ error: 'Cannot delete account with child accounts' });
    }

    await db('chart_of_accounts').where({ id }).del();

    res.json({ message: 'Account deleted successfully' });
  } catch (err) {
    next(err);
  }
};

module.exports = { list, getById, create, update, remove };
