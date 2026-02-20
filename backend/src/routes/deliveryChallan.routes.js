const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

// GET / - List delivery challans with pagination, search, filters
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 50, search, sort_by, sort_order = 'desc', status, customer_id, start_date, end_date } = req.query;
    const offset = (page - 1) * limit;

    let query = db('delivery_challans')
      .leftJoin('customers', 'delivery_challans.customer_id', 'customers.id')
      .select('delivery_challans.*', 'customers.display_name as customer_name');

    if (status) query = query.where('delivery_challans.status', status);
    if (customer_id) query = query.where('delivery_challans.customer_id', customer_id);
    if (start_date) query = query.where('delivery_challans.challan_date', '>=', start_date);
    if (end_date) query = query.where('delivery_challans.challan_date', '<=', end_date);

    if (search) {
      query = query.where(function () {
        this.where('delivery_challans.challan_number', 'ilike', `%${search}%`)
          .orWhere('customers.display_name', 'ilike', `%${search}%`);
      });
    }

    const [{ count }] = await query.clone().clearSelect().count('delivery_challans.id');
    const data = await query
      .orderBy(sort_by ? `delivery_challans.${sort_by}` : 'delivery_challans.created_at', sort_order)
      .limit(limit)
      .offset(offset);

    res.json({ data, total: parseInt(count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { next(err); }
});

// GET /:id - Get delivery challan with items
router.get('/:id', async (req, res, next) => {
  try {
    const challan = await db('delivery_challans')
      .leftJoin('customers', 'delivery_challans.customer_id', 'customers.id')
      .select('delivery_challans.*', 'customers.display_name as customer_name')
      .where('delivery_challans.id', req.params.id)
      .first();

    if (!challan) return res.status(404).json({ error: 'Delivery challan not found' });

    const items = await db('delivery_challan_items')
      .where({ delivery_challan_id: req.params.id })
      .orderBy('sort_order', 'asc');

    res.json({ data: { ...challan, items } });
  } catch (err) { next(err); }
});

// POST / - Create delivery challan with auto-numbering
router.post('/', async (req, res, next) => {
  try {
    const { items, ...challanData } = req.body;

    if (!challanData.challan_number) {
      const settings = await db('invoice_number_settings').where({ document_type: 'DeliveryChallan' }).first();
      if (settings) {
        const nextNum = settings.next_number || 1;
        const padded = String(nextNum).padStart(settings.padding_digits || 4, '0');
        challanData.challan_number = `${settings.prefix || 'DC'}${settings.separator || '-'}${padded}`;
        await db('invoice_number_settings').where({ id: settings.id }).update({ next_number: nextNum + 1, updated_at: new Date() });
      } else {
        const [{ count }] = await db('delivery_challans').count();
        challanData.challan_number = `DC-${String(parseInt(count) + 1).padStart(4, '0')}`;
      }
    }

    const [challan] = await db('delivery_challans').insert(challanData).returning('*');

    if (items && items.length > 0) {
      const itemRows = items.map((item, idx) => ({
        delivery_challan_id: challan.id,
        item_id: item.item_id || null,
        item_name: item.item_name,
        description: item.description,
        hsn_code: item.hsn_code,
        quantity: parseFloat(item.quantity) || 0,
        unit: item.unit,
        rate: parseFloat(item.rate) || 0,
        amount: parseFloat(item.amount) || 0,
        sort_order: idx,
      }));
      await db('delivery_challan_items').insert(itemRows);
    }

    const savedItems = await db('delivery_challan_items')
      .where({ delivery_challan_id: challan.id })
      .orderBy('sort_order');

    res.status(201).json({ data: { ...challan, items: savedItems } });
  } catch (err) { next(err); }
});

// PUT /:id - Update delivery challan
router.put('/:id', async (req, res, next) => {
  try {
    const { items, ...challanData } = req.body;

    const existing = await db('delivery_challans').where({ id: req.params.id }).first();
    if (!existing) return res.status(404).json({ error: 'Delivery challan not found' });

    if (items) {
      await db('delivery_challan_items').where({ delivery_challan_id: req.params.id }).del();
      if (items.length > 0) {
        const itemRows = items.map((item, idx) => ({
          delivery_challan_id: req.params.id,
          item_id: item.item_id || null,
          item_name: item.item_name,
          description: item.description,
          hsn_code: item.hsn_code,
          quantity: parseFloat(item.quantity) || 0,
          unit: item.unit,
          rate: parseFloat(item.rate) || 0,
          amount: parseFloat(item.amount) || 0,
          sort_order: idx,
        }));
        await db('delivery_challan_items').insert(itemRows);
      }
    }

    challanData.updated_at = new Date();
    const [updated] = await db('delivery_challans')
      .where({ id: req.params.id })
      .update(challanData)
      .returning('*');

    const savedItems = await db('delivery_challan_items')
      .where({ delivery_challan_id: req.params.id })
      .orderBy('sort_order');

    res.json({ data: { ...updated, items: savedItems } });
  } catch (err) { next(err); }
});

// DELETE /:id - Delete delivery challan
router.delete('/:id', authorize('Admin'), async (req, res, next) => {
  try {
    const challan = await db('delivery_challans').where({ id: req.params.id }).first();
    if (!challan) return res.status(404).json({ error: 'Delivery challan not found' });

    await db('delivery_challan_items').where({ delivery_challan_id: req.params.id }).del();
    await db('delivery_challans').where({ id: req.params.id }).del();
    res.json({ message: 'Delivery challan deleted successfully' });
  } catch (err) { next(err); }
});

module.exports = router;
