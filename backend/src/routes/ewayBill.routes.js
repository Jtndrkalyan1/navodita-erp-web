const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

// GET / - List e-way bills with pagination, search, filters
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 50, search, sort_by, sort_order = 'desc', status, customer_id, start_date, end_date } = req.query;
    const offset = (page - 1) * limit;

    let query = db('eway_bills')
      .leftJoin('customers', 'eway_bills.customer_id', 'customers.id')
      .select('eway_bills.*', 'customers.display_name as customer_name');

    if (status) query = query.where('eway_bills.status', status);
    if (customer_id) query = query.where('eway_bills.customer_id', customer_id);
    if (start_date) query = query.where('eway_bills.generation_date', '>=', start_date);
    if (end_date) query = query.where('eway_bills.generation_date', '<=', end_date);

    if (search) {
      query = query.where(function () {
        this.where('eway_bills.eway_bill_number', 'ilike', `%${search}%`)
          .orWhere('customers.display_name', 'ilike', `%${search}%`);
      });
    }

    const [{ count }] = await query.clone().clearSelect().count('eway_bills.id');
    const data = await query
      .orderBy(sort_by ? `eway_bills.${sort_by}` : 'eway_bills.created_at', sort_order)
      .limit(limit)
      .offset(offset);

    res.json({ data, total: parseInt(count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { next(err); }
});

// GET /:id - Get e-way bill with items
router.get('/:id', async (req, res, next) => {
  try {
    const eb = await db('eway_bills')
      .leftJoin('customers', 'eway_bills.customer_id', 'customers.id')
      .select('eway_bills.*', 'customers.display_name as customer_name')
      .where('eway_bills.id', req.params.id)
      .first();

    if (!eb) return res.status(404).json({ error: 'E-Way bill not found' });

    const items = await db('eway_bill_items')
      .where({ eway_bill_id: req.params.id })
      .orderBy('sort_order', 'asc');

    res.json({ data: { ...eb, items } });
  } catch (err) { next(err); }
});

// POST / - Create e-way bill with auto-numbering
router.post('/', async (req, res, next) => {
  try {
    const { items, ...ebData } = req.body;

    if (!ebData.eway_bill_number) {
      const settings = await db('invoice_number_settings').where({ document_type: 'EWayBill' }).first();
      if (settings) {
        const nextNum = settings.next_number || 1;
        const padded = String(nextNum).padStart(settings.padding_digits || 4, '0');
        ebData.eway_bill_number = `${settings.prefix || 'EWB'}${settings.separator || '-'}${padded}`;
        await db('invoice_number_settings').where({ id: settings.id }).update({ next_number: nextNum + 1, updated_at: new Date() });
      } else {
        const [{ count }] = await db('eway_bills').count();
        ebData.eway_bill_number = `EWB-${String(parseInt(count) + 1).padStart(4, '0')}`;
      }
    }

    const [eb] = await db('eway_bills').insert(ebData).returning('*');

    if (items && items.length > 0) {
      const itemRows = items.map((item, idx) => ({
        eway_bill_id: eb.id,
        item_name: item.item_name,
        description: item.description,
        hsn_code: item.hsn_code,
        quantity: parseFloat(item.quantity) || 0,
        unit: item.unit,
        taxable_value: parseFloat(item.taxable_value) || 0,
        gst_rate: parseFloat(item.gst_rate) || 0,
        sort_order: idx,
      }));
      await db('eway_bill_items').insert(itemRows);
    }

    const savedItems = await db('eway_bill_items')
      .where({ eway_bill_id: eb.id })
      .orderBy('sort_order');

    res.status(201).json({ data: { ...eb, items: savedItems } });
  } catch (err) { next(err); }
});

// PUT /:id - Update e-way bill
router.put('/:id', async (req, res, next) => {
  try {
    const { items, ...ebData } = req.body;

    const existing = await db('eway_bills').where({ id: req.params.id }).first();
    if (!existing) return res.status(404).json({ error: 'E-Way bill not found' });

    if (items) {
      await db('eway_bill_items').where({ eway_bill_id: req.params.id }).del();
      if (items.length > 0) {
        const itemRows = items.map((item, idx) => ({
          eway_bill_id: req.params.id,
          item_name: item.item_name,
          description: item.description,
          hsn_code: item.hsn_code,
          quantity: parseFloat(item.quantity) || 0,
          unit: item.unit,
          taxable_value: parseFloat(item.taxable_value) || 0,
          gst_rate: parseFloat(item.gst_rate) || 0,
          sort_order: idx,
        }));
        await db('eway_bill_items').insert(itemRows);
      }
    }

    ebData.updated_at = new Date();
    const [updated] = await db('eway_bills')
      .where({ id: req.params.id })
      .update(ebData)
      .returning('*');

    const savedItems = await db('eway_bill_items')
      .where({ eway_bill_id: req.params.id })
      .orderBy('sort_order');

    res.json({ data: { ...updated, items: savedItems } });
  } catch (err) { next(err); }
});

// DELETE /:id - Delete e-way bill
router.delete('/:id', authorize('Admin'), async (req, res, next) => {
  try {
    const eb = await db('eway_bills').where({ id: req.params.id }).first();
    if (!eb) return res.status(404).json({ error: 'E-Way bill not found' });

    await db('eway_bill_items').where({ eway_bill_id: req.params.id }).del();
    await db('eway_bills').where({ id: req.params.id }).del();
    res.json({ message: 'E-Way bill deleted successfully' });
  } catch (err) { next(err); }
});

module.exports = router;
