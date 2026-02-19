const db = require('../config/database');

/**
 * GET / - List all items with pagination, search, sort
 */
const list = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, search, sort_by, sort_order = 'desc', is_active, item_type } = req.query;
    const offset = (page - 1) * limit;

    let query = db('items');

    if (is_active !== undefined) {
      query = query.where('is_active', is_active === 'true');
    }

    if (item_type) {
      query = query.where('item_type', item_type);
    }

    if (search) {
      query = query.where(function () {
        this.where('name', 'ilike', `%${search}%`)
          .orWhere('sku', 'ilike', `%${search}%`)
          .orWhere('hsn_code', 'ilike', `%${search}%`)
          .orWhere('description', 'ilike', `%${search}%`);
      });
    }

    const [{ count }] = await query.clone().count();
    const data = await query
      .orderBy(sort_by || 'created_at', sort_order)
      .limit(limit)
      .offset(offset);

    res.json({
      data,
      total: parseInt(count),
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /:id - Get item by ID
 */
const getById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const item = await db('items').where({ id }).first();
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Get inventory info if available
    const inventoryItem = await db('inventory_items')
      .where({ item_id: id })
      .first();

    res.json({
      data: {
        ...item,
        inventory: inventoryItem || null,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST / - Create item
 */
const create = async (req, res, next) => {
  try {
    const itemData = req.body;

    if (!itemData.name) {
      return res.status(400).json({ error: 'Item name is required' });
    }

    // Auto-generate SKU if not provided
    if (!itemData.sku) {
      const [{ count }] = await db('items').count();
      const nextNum = parseInt(count) + 1;
      itemData.sku = `ITEM-${String(nextNum).padStart(4, '0')}`;
    }

    const [item] = await db('items')
      .insert(itemData)
      .returning('*');

    res.status(201).json({ data: item });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /:id - Update item
 */
const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const itemData = req.body;

    const existing = await db('items').where({ id }).first();
    if (!existing) {
      return res.status(404).json({ error: 'Item not found' });
    }

    itemData.updated_at = new Date();

    const [updated] = await db('items')
      .where({ id })
      .update(itemData)
      .returning('*');

    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /:id - Soft delete item
 */
const remove = async (req, res, next) => {
  try {
    const { id } = req.params;

    const item = await db('items').where({ id }).first();
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Check if item is used in any active invoices or bills
    const [invoiceUsage] = await db('invoice_items').where({ item_id: id }).count();
    const [billUsage] = await db('bill_items').where({ item_id: id }).count();

    if (parseInt(invoiceUsage.count) > 0 || parseInt(billUsage.count) > 0) {
      // Soft delete only
      await db('items')
        .where({ id })
        .update({ is_active: false, updated_at: new Date() });
      return res.json({ message: 'Item deactivated (has linked transactions)' });
    }

    await db('items')
      .where({ id })
      .update({ is_active: false, updated_at: new Date() });

    res.json({ message: 'Item deleted successfully' });
  } catch (err) {
    next(err);
  }
};

module.exports = { list, getById, create, update, remove };
