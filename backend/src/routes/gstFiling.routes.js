const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

// GET / - List GST filings with pagination, search, filters
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 50, search, sort_by, sort_order = 'desc', return_type, filing_type, status, financial_year, filing_year, period } = req.query;
    const offset = (page - 1) * limit;

    let query = db('gst_filings');

    if (return_type || filing_type) query = query.where('filing_type', return_type || filing_type);
    if (status) query = query.where('status', status);
    if (financial_year || filing_year) query = query.where('filing_year', financial_year || filing_year);
    if (period) query = query.where('period', period);

    if (search) {
      query = query.where(function () {
        this.where('filing_type', 'ilike', `%${search}%`)
          .orWhere('acknowledgement_number', 'ilike', `%${search}%`);
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

// GET /:id - Get GST filing by ID
router.get('/:id', async (req, res, next) => {
  try {
    const filing = await db('gst_filings').where({ id: req.params.id }).first();
    if (!filing) return res.status(404).json({ error: 'GST filing not found' });
    res.json({ data: filing });
  } catch (err) { next(err); }
});

// POST / - Create GST filing
router.post('/', async (req, res, next) => {
  try {
    const [filing] = await db('gst_filings').insert(req.body).returning('*');
    res.status(201).json({ data: filing });
  } catch (err) { next(err); }
});

// PUT /:id - Update GST filing (only if not Filed)
router.put('/:id', async (req, res, next) => {
  try {
    const existing = await db('gst_filings').where({ id: req.params.id }).first();
    if (!existing) return res.status(404).json({ error: 'GST filing not found' });

    if (existing.status === 'Filed') {
      return res.status(400).json({ error: 'Cannot update a filed GST return' });
    }

    req.body.updated_at = new Date();
    const [updated] = await db('gst_filings')
      .where({ id: req.params.id })
      .update(req.body)
      .returning('*');

    res.json({ data: updated });
  } catch (err) { next(err); }
});

// DELETE /:id - Delete GST filing (only if Draft)
router.delete('/:id', authorize('Admin'), async (req, res, next) => {
  try {
    const filing = await db('gst_filings').where({ id: req.params.id }).first();
    if (!filing) return res.status(404).json({ error: 'GST filing not found' });

    if (filing.status === 'Filed') {
      return res.status(400).json({ error: 'Cannot delete a filed GST return' });
    }

    await db('gst_filings').where({ id: req.params.id }).del();
    res.json({ message: 'GST filing deleted successfully' });
  } catch (err) { next(err); }
});

module.exports = router;
