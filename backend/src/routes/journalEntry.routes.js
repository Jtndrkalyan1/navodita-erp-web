const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

// GET / - List journal entries with pagination, search, filters
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 50, search, sort_by, sort_order = 'desc', status, start_date, end_date } = req.query;
    const offset = (page - 1) * limit;

    let query = db('journal_entries');

    if (status) query = query.where('status', status);
    if (start_date) query = query.where('journal_date', '>=', start_date);
    if (end_date) query = query.where('journal_date', '<=', end_date);

    if (search) {
      query = query.where(function () {
        this.where('journal_number', 'ilike', `%${search}%`)
          .orWhere('reference', 'ilike', `%${search}%`)
          .orWhere('description', 'ilike', `%${search}%`);
      });
    }

    const [{ count }] = await query.clone().count();
    const data = await query
      .orderBy(sort_by || 'created_at', sort_order)
      .limit(limit)
      .offset(offset);

    res.json({ data, total: parseInt(count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { next(err); }
});

// GET /:id - Get journal entry with lines and account details
router.get('/:id', async (req, res, next) => {
  try {
    const entry = await db('journal_entries').where({ id: req.params.id }).first();
    if (!entry) return res.status(404).json({ error: 'Journal entry not found' });

    const lines = await db('journal_lines')
      .leftJoin('chart_of_accounts', 'journal_lines.account_id', 'chart_of_accounts.id')
      .select(
        'journal_lines.*',
        'chart_of_accounts.account_name',
        'chart_of_accounts.account_code'
      )
      .where('journal_lines.journal_entry_id', req.params.id)
      .orderBy('journal_lines.id');

    res.json({ data: { ...entry, lines } });
  } catch (err) { next(err); }
});

// POST / - Create journal entry with lines, validate debits = credits
router.post('/', async (req, res, next) => {
  try {
    const { lines, ...entryData } = req.body;

    if (!entryData.journal_number) {
      const settings = await db('invoice_number_settings').where({ document_type: 'JournalEntry' }).first();
      if (settings) {
        const nextNum = settings.next_number || 1;
        const padded = String(nextNum).padStart(settings.padding_digits || 4, '0');
        entryData.journal_number = `${settings.prefix || 'JE'}${settings.separator || '-'}${padded}`;
        await db('invoice_number_settings').where({ id: settings.id }).update({ next_number: nextNum + 1, updated_at: new Date() });
      } else {
        const [{ count }] = await db('journal_entries').count();
        entryData.journal_number = `JE-${String(parseInt(count) + 1).padStart(4, '0')}`;
      }
    }

    // Calculate totals and validate
    let totalDebit = 0;
    let totalCredit = 0;
    (lines || []).forEach((l) => {
      totalDebit += parseFloat(l.debit_amount) || 0;
      totalCredit += parseFloat(l.credit_amount) || 0;
    });

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return res.status(400).json({ error: `Debits (${totalDebit.toFixed(2)}) must equal credits (${totalCredit.toFixed(2)})` });
    }

    entryData.total_debit = parseFloat(totalDebit.toFixed(2));
    entryData.total_credit = parseFloat(totalCredit.toFixed(2));

    const [entry] = await db('journal_entries').insert(entryData).returning('*');

    if (lines && lines.length > 0) {
      const lineRows = lines.map((l) => ({
        journal_entry_id: entry.id,
        account_id: l.account_id,
        debit_amount: parseFloat(l.debit_amount) || 0,
        credit_amount: parseFloat(l.credit_amount) || 0,
        description: l.description,
      }));
      await db('journal_lines').insert(lineRows);
    }

    const savedLines = await db('journal_lines')
      .leftJoin('chart_of_accounts', 'journal_lines.account_id', 'chart_of_accounts.id')
      .select('journal_lines.*', 'chart_of_accounts.account_name', 'chart_of_accounts.account_code')
      .where({ journal_entry_id: entry.id });

    res.status(201).json({ data: { ...entry, lines: savedLines } });
  } catch (err) { next(err); }
});

// PUT /:id - Update journal entry (only if not Posted)
router.put('/:id', async (req, res, next) => {
  try {
    const { lines, ...entryData } = req.body;

    const existing = await db('journal_entries').where({ id: req.params.id }).first();
    if (!existing) return res.status(404).json({ error: 'Journal entry not found' });

    if (existing.status === 'Posted') {
      return res.status(400).json({ error: 'Cannot edit a posted journal entry' });
    }

    if (lines) {
      let totalDebit = 0;
      let totalCredit = 0;
      lines.forEach((l) => {
        totalDebit += parseFloat(l.debit_amount) || 0;
        totalCredit += parseFloat(l.credit_amount) || 0;
      });

      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        return res.status(400).json({ error: `Debits (${totalDebit.toFixed(2)}) must equal credits (${totalCredit.toFixed(2)})` });
      }

      entryData.total_debit = parseFloat(totalDebit.toFixed(2));
      entryData.total_credit = parseFloat(totalCredit.toFixed(2));

      await db('journal_lines').where({ journal_entry_id: req.params.id }).del();

      if (lines.length > 0) {
        const lineRows = lines.map((l) => ({
          journal_entry_id: req.params.id,
          account_id: l.account_id,
          debit_amount: parseFloat(l.debit_amount) || 0,
          credit_amount: parseFloat(l.credit_amount) || 0,
          description: l.description,
        }));
        await db('journal_lines').insert(lineRows);
      }
    }

    entryData.updated_at = new Date();
    const [updated] = await db('journal_entries')
      .where({ id: req.params.id })
      .update(entryData)
      .returning('*');

    const savedLines = await db('journal_lines')
      .leftJoin('chart_of_accounts', 'journal_lines.account_id', 'chart_of_accounts.id')
      .select('journal_lines.*', 'chart_of_accounts.account_name', 'chart_of_accounts.account_code')
      .where('journal_lines.journal_entry_id', req.params.id);

    res.json({ data: { ...updated, lines: savedLines } });
  } catch (err) { next(err); }
});

// DELETE /:id - Delete journal entry (only if not Posted)
router.delete('/:id', authorize('Admin'), async (req, res, next) => {
  try {
    const entry = await db('journal_entries').where({ id: req.params.id }).first();
    if (!entry) return res.status(404).json({ error: 'Journal entry not found' });

    if (entry.status === 'Posted') {
      return res.status(400).json({ error: 'Cannot delete a posted journal entry' });
    }

    await db('journal_lines').where({ journal_entry_id: req.params.id }).del();
    await db('journal_entries').where({ id: req.params.id }).del();
    res.json({ message: 'Journal entry deleted successfully' });
  } catch (err) { next(err); }
});

module.exports = router;
