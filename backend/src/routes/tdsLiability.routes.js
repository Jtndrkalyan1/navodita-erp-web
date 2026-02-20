const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 50, search, sort_by, sort_order = 'desc', section, status, deductee_name, start_date, end_date } = req.query;
    const offset = (page - 1) * limit;
    let query = db('tds_liabilities');
    if (section) query = query.where('section', section);
    if (status) query = query.where('status', status);
    if (deductee_name) query = query.where('deductee_name', 'ilike', `%${deductee_name}%`);
    if (start_date) query = query.where('deduction_date', '>=', start_date);
    if (end_date) query = query.where('deduction_date', '<=', end_date);
    if (search) {
      query = query.where(function () {
        this.where('deductee_name', 'ilike', `%${search}%`)
          .orWhere('deductee_pan', 'ilike', `%${search}%`);
      });
    }
    const [{ count }] = await query.clone().count();
    const data = await query.orderBy(sort_by || 'created_at', sort_order).limit(limit).offset(offset);
    res.json({ data, total: parseInt(count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const liability = await db('tds_liabilities').where({ id: req.params.id }).first();
    if (!liability) return res.status(404).json({ error: 'TDS liability not found' });
    res.json({ data: liability });
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const [liability] = await db('tds_liabilities').insert(req.body).returning('*');
    res.status(201).json({ data: liability });
  } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const existing = await db('tds_liabilities').where({ id: req.params.id }).first();
    if (!existing) return res.status(404).json({ error: 'TDS liability not found' });
    if (existing.status === 'Deposited') {
      return res.status(400).json({ error: 'Cannot update a deposited TDS liability' });
    }
    req.body.updated_at = new Date();
    const [updated] = await db('tds_liabilities').where({ id: req.params.id }).update(req.body).returning('*');
    res.json({ data: updated });
  } catch (err) { next(err); }
});

router.delete('/:id', authorize('Admin'), async (req, res, next) => {
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

module.exports = router;
