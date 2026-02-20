const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.get('/', async (req, res, next) => {
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
    const data = await query.orderBy(sort_by || 'created_at', sort_order).limit(limit).offset(offset);
    res.json({ data, total: parseInt(count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const challan = await db('tds_challans').where({ id: req.params.id }).first();
    if (!challan) return res.status(404).json({ error: 'TDS challan not found' });
    const liabilities = await db('tds_liabilities').where({ challan_id: req.params.id });
    res.json({ data: { ...challan, liabilities } });
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const { liability_ids, ...challanData } = req.body;
    const [challan] = await db('tds_challans').insert(challanData).returning('*');
    if (liability_ids && liability_ids.length > 0) {
      await db('tds_liabilities')
        .whereIn('id', liability_ids)
        .update({ challan_id: challan.id, status: 'Deposited', updated_at: new Date() });
    }
    const liabilities = await db('tds_liabilities').where({ challan_id: challan.id });
    res.status(201).json({ data: { ...challan, liabilities } });
  } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const existing = await db('tds_challans').where({ id: req.params.id }).first();
    if (!existing) return res.status(404).json({ error: 'TDS challan not found' });
    req.body.updated_at = new Date();
    const [updated] = await db('tds_challans').where({ id: req.params.id }).update(req.body).returning('*');
    res.json({ data: updated });
  } catch (err) { next(err); }
});

router.delete('/:id', authorize('Admin'), async (req, res, next) => {
  try {
    const challan = await db('tds_challans').where({ id: req.params.id }).first();
    if (!challan) return res.status(404).json({ error: 'TDS challan not found' });
    await db('tds_liabilities')
      .where({ challan_id: req.params.id })
      .update({ challan_id: null, status: 'Pending', updated_at: new Date() });
    await db('tds_challans').where({ id: req.params.id }).del();
    res.json({ message: 'TDS challan deleted successfully' });
  } catch (err) { next(err); }
});

module.exports = router;
