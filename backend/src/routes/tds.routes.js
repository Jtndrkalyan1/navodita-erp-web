const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

// ===== TDS Liabilities =====

// GET /liabilities - List TDS liabilities with pagination, search, filters
router.get('/liabilities', async (req, res, next) => {
  try {
    const { page = 1, limit = 50, search, sort_by, sort_order = 'desc', section, status, vendor_id, start_date, end_date } = req.query;
    const offset = (page - 1) * limit;

    let query = db('tds_liabilities');

    if (section) query = query.where('section', section);
    if (status) query = query.where('status', status);
    if (vendor_id) query = query.where('vendor_id', vendor_id);
    if (start_date) query = query.where('deduction_date', '>=', start_date);
    if (end_date) query = query.where('deduction_date', '<=', end_date);

    if (search) {
      query = query.where(function () {
        this.where('deductee_name', 'ilike', `%${search}%`)
          .orWhere('deductee_pan', 'ilike', `%${search}%`);
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

// GET /liabilities/:id - Get TDS liability by ID
router.get('/liabilities/:id', async (req, res, next) => {
  try {
    const liability = await db('tds_liabilities').where({ id: req.params.id }).first();
    if (!liability) return res.status(404).json({ error: 'TDS liability not found' });
    res.json({ data: liability });
  } catch (err) { next(err); }
});

// POST /liabilities - Create TDS liability
router.post('/liabilities', async (req, res, next) => {
  try {
    const [liability] = await db('tds_liabilities').insert(req.body).returning('*');
    res.status(201).json({ data: liability });
  } catch (err) { next(err); }
});

// PUT /liabilities/:id - Update TDS liability
router.put('/liabilities/:id', async (req, res, next) => {
  try {
    const existing = await db('tds_liabilities').where({ id: req.params.id }).first();
    if (!existing) return res.status(404).json({ error: 'TDS liability not found' });

    if (existing.status === 'Deposited') {
      return res.status(400).json({ error: 'Cannot update a deposited TDS liability' });
    }

    req.body.updated_at = new Date();
    const [updated] = await db('tds_liabilities')
      .where({ id: req.params.id })
      .update(req.body)
      .returning('*');

    res.json({ data: updated });
  } catch (err) { next(err); }
});

// DELETE /liabilities/:id - Delete TDS liability (only if not deposited)
router.delete('/liabilities/:id', authorize('Admin'), async (req, res, next) => {
  try {
    const liability = await db('tds_liabilities').where({ id: req.params.id }).first();
    if (!liability) return res.status(404).json({ error: 'TDS liability not found' });

    if (liability.status === 'Deposited') {
      return res.status(400).json({ error: 'Cannot delete a deposited TDS liability' });
    }

    await db('tds_liabilities').where({ id: req.params.id }).del();
    res.json({ message: 'TDS liability deleted successfully' });
  } catch (err) { next(err); }
});

// ===== TDS Challans =====

// GET /challans - List TDS challans with pagination, search, filters
router.get('/challans', async (req, res, next) => {
  try {
    const { page = 1, limit = 50, search, sort_by, sort_order = 'desc', status, start_date, end_date } = req.query;
    const offset = (page - 1) * limit;

    let query = db('tds_challans');

    if (status) query = query.where('status', status);
    if (start_date) query = query.where('deposit_date', '>=', start_date);
    if (end_date) query = query.where('deposit_date', '<=', end_date);

    if (search) {
      query = query.where(function () {
        this.where('challan_number', 'ilike', `%${search}%`)
          .orWhere('bsr_code', 'ilike', `%${search}%`);
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

// GET /challans/:id - Get TDS challan by ID with linked liabilities
router.get('/challans/:id', async (req, res, next) => {
  try {
    const challan = await db('tds_challans').where({ id: req.params.id }).first();
    if (!challan) return res.status(404).json({ error: 'TDS challan not found' });

    // Get linked liabilities
    const liabilities = await db('tds_liabilities')
      .where({ challan_id: req.params.id });

    res.json({ data: { ...challan, liabilities } });
  } catch (err) { next(err); }
});

// POST /challans - Create TDS challan
router.post('/challans', async (req, res, next) => {
  try {
    const { liability_ids, ...challanData } = req.body;

    const [challan] = await db('tds_challans').insert(challanData).returning('*');

    // Link liabilities to this challan
    if (liability_ids && liability_ids.length > 0) {
      await db('tds_liabilities')
        .whereIn('id', liability_ids)
        .update({ challan_id: challan.id, status: 'Deposited', updated_at: new Date() });
    }

    const liabilities = await db('tds_liabilities').where({ challan_id: challan.id });
    res.status(201).json({ data: { ...challan, liabilities } });
  } catch (err) { next(err); }
});

// PUT /challans/:id - Update TDS challan
router.put('/challans/:id', async (req, res, next) => {
  try {
    const existing = await db('tds_challans').where({ id: req.params.id }).first();
    if (!existing) return res.status(404).json({ error: 'TDS challan not found' });

    req.body.updated_at = new Date();
    const [updated] = await db('tds_challans')
      .where({ id: req.params.id })
      .update(req.body)
      .returning('*');

    res.json({ data: updated });
  } catch (err) { next(err); }
});

// DELETE /challans/:id - Delete TDS challan
router.delete('/challans/:id', authorize('Admin'), async (req, res, next) => {
  try {
    const challan = await db('tds_challans').where({ id: req.params.id }).first();
    if (!challan) return res.status(404).json({ error: 'TDS challan not found' });

    // Unlink liabilities
    await db('tds_liabilities')
      .where({ challan_id: req.params.id })
      .update({ challan_id: null, status: 'Pending', updated_at: new Date() });

    await db('tds_challans').where({ id: req.params.id }).del();
    res.json({ message: 'TDS challan deleted successfully' });
  } catch (err) { next(err); }
});

module.exports = router;
