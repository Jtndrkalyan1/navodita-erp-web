const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// GET / - List packing lists with pagination, search, filters
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 50, search, sort_by, sort_order = 'desc', status, customer_id, start_date, end_date } = req.query;
    const offset = (page - 1) * limit;

    let query = db('packing_lists')
      .leftJoin('customers', 'packing_lists.customer_id', 'customers.id')
      .select('packing_lists.*', 'customers.display_name as customer_name');

    if (status) query = query.where('packing_lists.status', status);
    if (customer_id) query = query.where('packing_lists.customer_id', customer_id);
    if (start_date) query = query.where('packing_lists.packing_date', '>=', start_date);
    if (end_date) query = query.where('packing_lists.packing_date', '<=', end_date);

    if (search) {
      query = query.where(function () {
        this.where('packing_lists.packing_list_number', 'ilike', `%${search}%`)
          .orWhere('customers.display_name', 'ilike', `%${search}%`);
      });
    }

    const [{ count }] = await query.clone().clearSelect().count('packing_lists.id');
    const data = await query
      .orderBy(sort_by ? `packing_lists.${sort_by}` : 'packing_lists.created_at', sort_order)
      .limit(limit)
      .offset(offset);

    res.json({ data, total: parseInt(count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { next(err); }
});

// GET /:id - Get packing list with items and sub-items
router.get('/:id', async (req, res, next) => {
  try {
    const pl = await db('packing_lists')
      .leftJoin('customers', 'packing_lists.customer_id', 'customers.id')
      .select('packing_lists.*', 'customers.display_name as customer_name')
      .where('packing_lists.id', req.params.id)
      .first();

    if (!pl) return res.status(404).json({ error: 'Packing list not found' });

    const items = await db('packing_list_items')
      .where({ packing_list_id: req.params.id })
      .orderBy('sort_order', 'asc');

    // Fetch sub-items for each item
    for (const item of items) {
      item.sub_items = await db('packing_list_sub_items')
        .where({ packing_list_item_id: item.id })
        .orderBy('sort_order', 'asc');
    }

    res.json({ data: { ...pl, items } });
  } catch (err) { next(err); }
});

// POST / - Create packing list with auto-numbering
router.post('/', async (req, res, next) => {
  try {
    const { items, ...plData } = req.body;

    if (!plData.packing_list_number) {
      const settings = await db('invoice_number_settings').where({ document_type: 'PackingList' }).first();
      if (settings) {
        const nextNum = settings.next_number || 1;
        const padded = String(nextNum).padStart(settings.padding_digits || 4, '0');
        plData.packing_list_number = `${settings.prefix || 'PL'}${settings.separator || '-'}${padded}`;
        await db('invoice_number_settings').where({ id: settings.id }).update({ next_number: nextNum + 1, updated_at: new Date() });
      } else {
        const [{ count }] = await db('packing_lists').count();
        plData.packing_list_number = `PL-${String(parseInt(count) + 1).padStart(4, '0')}`;
      }
    }

    const [pl] = await db('packing_lists').insert(plData).returning('*');

    if (items && items.length > 0) {
      for (let idx = 0; idx < items.length; idx++) {
        const { sub_items, ...itemData } = items[idx];
        const [savedItem] = await db('packing_list_items')
          .insert({ ...itemData, packing_list_id: pl.id, sort_order: idx })
          .returning('*');

        if (sub_items && sub_items.length > 0) {
          const subRows = sub_items.map((sub, subIdx) => ({
            ...sub,
            packing_list_item_id: savedItem.id,
            sort_order: subIdx,
          }));
          await db('packing_list_sub_items').insert(subRows);
        }
      }
    }

    const savedItems = await db('packing_list_items')
      .where({ packing_list_id: pl.id })
      .orderBy('sort_order');

    for (const item of savedItems) {
      item.sub_items = await db('packing_list_sub_items')
        .where({ packing_list_item_id: item.id })
        .orderBy('sort_order');
    }

    res.status(201).json({ data: { ...pl, items: savedItems } });
  } catch (err) { next(err); }
});

// PUT /:id - Update packing list
router.put('/:id', async (req, res, next) => {
  try {
    const { items, ...plData } = req.body;

    const existing = await db('packing_lists').where({ id: req.params.id }).first();
    if (!existing) return res.status(404).json({ error: 'Packing list not found' });

    if (items) {
      // Delete existing sub-items and items
      const existingItems = await db('packing_list_items').where({ packing_list_id: req.params.id });
      for (const ei of existingItems) {
        await db('packing_list_sub_items').where({ packing_list_item_id: ei.id }).del();
      }
      await db('packing_list_items').where({ packing_list_id: req.params.id }).del();

      // Insert new items with sub-items
      for (let idx = 0; idx < items.length; idx++) {
        const { sub_items, ...itemData } = items[idx];
        const [savedItem] = await db('packing_list_items')
          .insert({ ...itemData, packing_list_id: req.params.id, sort_order: idx })
          .returning('*');

        if (sub_items && sub_items.length > 0) {
          const subRows = sub_items.map((sub, subIdx) => ({
            ...sub,
            packing_list_item_id: savedItem.id,
            sort_order: subIdx,
          }));
          await db('packing_list_sub_items').insert(subRows);
        }
      }
    }

    plData.updated_at = new Date();
    const [updated] = await db('packing_lists')
      .where({ id: req.params.id })
      .update(plData)
      .returning('*');

    const savedItems = await db('packing_list_items')
      .where({ packing_list_id: req.params.id })
      .orderBy('sort_order');

    for (const item of savedItems) {
      item.sub_items = await db('packing_list_sub_items')
        .where({ packing_list_item_id: item.id })
        .orderBy('sort_order');
    }

    res.json({ data: { ...updated, items: savedItems } });
  } catch (err) { next(err); }
});

// DELETE /:id - Delete packing list
router.delete('/:id', async (req, res, next) => {
  try {
    const pl = await db('packing_lists').where({ id: req.params.id }).first();
    if (!pl) return res.status(404).json({ error: 'Packing list not found' });

    const existingItems = await db('packing_list_items').where({ packing_list_id: req.params.id });
    for (const item of existingItems) {
      await db('packing_list_sub_items').where({ packing_list_item_id: item.id }).del();
    }
    await db('packing_list_items').where({ packing_list_id: req.params.id }).del();
    await db('packing_lists').where({ id: req.params.id }).del();

    res.json({ message: 'Packing list deleted successfully' });
  } catch (err) { next(err); }
});

module.exports = router;
