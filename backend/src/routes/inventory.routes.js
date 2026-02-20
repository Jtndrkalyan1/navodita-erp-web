const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

// ── Constants ────────────────────────────────────────────────────────

const INBOUND_TYPES = ['Purchase', 'Return', 'Returned', 'Opening Stock', 'Adjustment In', 'Adjustment'];
const OUTBOUND_TYPES = ['Sale', 'Sold', 'Shipped', 'Damaged', 'Adjustment Out'];

// ── GET /summary - Inventory summary stats ──────────────────────────

router.get('/summary', async (req, res, next) => {
  try {
    const items = await db('items').where('item_type', 'Inventory').where(function () {
      this.where('is_active', true).orWhereNull('is_active');
    });

    const totalItems = items.length;
    let totalValue = 0;
    let totalQuantity = 0;
    let lowStockCount = 0;

    for (const item of items) {
      const stock = parseFloat(item.current_stock) || 0;
      const price = parseFloat(item.purchase_price) || 0;
      totalValue += stock * price;
      totalQuantity += stock;

      const reorder = parseFloat(item.reorder_level) || 0;
      if (reorder > 0 && stock <= reorder) {
        lowStockCount++;
      }
    }

    res.json({
      data: {
        total_items: totalItems,
        total_value: totalValue,
        low_stock_count: lowStockCount,
        total_quantity: totalQuantity,
      },
    });
  } catch (err) { next(err); }
});

// ── GET /categories - List all distinct categories ──────────────────

router.get('/categories', async (req, res, next) => {
  try {
    const rows = await db('items')
      .where('item_type', 'Inventory')
      .whereNotNull('category')
      .where('category', '!=', '')
      .distinct('category')
      .orderBy('category', 'asc');

    const categories = rows.map((r) => r.category);
    res.json({ data: categories });
  } catch (err) { next(err); }
});

// ── POST /categories - Create a new category ────────────────────────

router.post('/categories', async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const trimmed = name.trim();

    // Check if category already exists (case-insensitive)
    const existing = await db('items')
      .where('item_type', 'Inventory')
      .whereRaw('LOWER(category) = ?', [trimmed.toLowerCase()])
      .first();

    if (existing) {
      return res.status(409).json({ error: 'Category already exists' });
    }

    // Categories are stored as column values on items, so we just return success
    // The category will be applied when items use it
    res.status(201).json({ data: { name: trimmed } });
  } catch (err) { next(err); }
});

// ── GET / - List inventory items with pagination, search, filters ───

router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 50, search, sort_by, sort_order = 'desc', category, low_stock } = req.query;
    const offset = (page - 1) * limit;

    let query = db('items').where('item_type', 'Inventory');

    if (category) query = query.where('category', category);

    if (low_stock === 'true') {
      query = query.whereRaw('COALESCE(current_stock, 0) <= COALESCE(reorder_level, 0)');
    }

    if (search) {
      query = query.where(function () {
        this.where('name', 'ilike', `%${search}%`)
          .orWhere('sku', 'ilike', `%${search}%`)
          .orWhere('hsn_code', 'ilike', `%${search}%`);
      });
    }

    const [{ count }] = await query.clone().count();
    // Map item_name to actual column name
    const validSortBy = sort_by === 'item_name' ? 'name' : (sort_by || 'created_at');
    const data = await query
      .orderBy(validSortBy, sort_order)
      .limit(limit)
      .offset(offset);

    res.json({ data, total: parseInt(count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { next(err); }
});

// ── GET /:id - Get inventory item with transaction history ──────────

router.get('/:id', async (req, res, next) => {
  try {
    const item = await db('items').where({ id: req.params.id }).first();
    if (!item) return res.status(404).json({ error: 'Inventory item not found' });

    const transactions = await db('inventory_transactions')
      .where({ item_id: req.params.id })
      .orderBy('transaction_date', 'desc')
      .limit(50);

    res.json({ data: { ...item, transactions } });
  } catch (err) { next(err); }
});

// ── POST / - Create inventory item ──────────────────────────────────

router.post('/', async (req, res, next) => {
  try {
    const {
      name, item_name, sku, category, description, hsn_code, gst_rate,
      unit, purchase_price, selling_price, opening_stock, reorder_level,
      location, serial_number, ...rest
    } = req.body;

    const itemData = {
      name: name || item_name,
      sku,
      category,
      description,
      hsn_code,
      gst_rate,
      unit,
      purchase_price,
      selling_price,
      opening_stock,
      reorder_level,
      location,
      serial_number,
      current_stock: parseFloat(opening_stock) || 0,
      item_type: 'Inventory',
      is_active: true,
      ...rest,
    };

    const [item] = await db('items').insert(itemData).returning('*');

    // If opening stock is provided, create an initial transaction
    if (itemData.opening_stock && parseFloat(itemData.opening_stock) > 0) {
      await db('inventory_transactions').insert({
        item_id: item.id,
        transaction_type: 'Opening Stock',
        quantity: parseFloat(itemData.opening_stock),
        transaction_date: new Date(),
        notes: 'Opening stock entry',
      });
    }

    res.status(201).json({ data: item });
  } catch (err) { next(err); }
});

// ── PUT /:id - Update inventory item ────────────────────────────────

router.put('/:id', async (req, res, next) => {
  try {
    const existing = await db('items').where({ id: req.params.id }).first();
    if (!existing) return res.status(404).json({ error: 'Inventory item not found' });

    // Allow updating location and serial_number along with existing fields
    const updateData = { ...req.body };
    updateData.updated_at = new Date();

    // Don't allow changing item_type or current_stock directly through update
    delete updateData.item_type;
    delete updateData.current_stock;

    const [updated] = await db('items')
      .where({ id: req.params.id })
      .update(updateData)
      .returning('*');

    res.json({ data: updated });
  } catch (err) { next(err); }
});

// ── DELETE /:id - Delete inventory item (check for pending transactions) ──

router.delete('/:id', authorize('Admin'), async (req, res, next) => {
  try {
    const item = await db('items').where({ id: req.params.id }).first();
    if (!item) return res.status(404).json({ error: 'Inventory item not found' });

    // Check if item has any related transactions
    const [{ count }] = await db('inventory_transactions')
      .where({ item_id: req.params.id })
      .count();

    if (parseInt(count) > 0) {
      // Soft delete - mark as inactive
      await db('items')
        .where({ id: req.params.id })
        .update({ is_active: false, updated_at: new Date() });
      return res.json({ message: 'Inventory item deactivated (has transaction history)' });
    }

    await db('items').where({ id: req.params.id }).del();
    res.json({ message: 'Inventory item deleted successfully' });
  } catch (err) { next(err); }
});

// ── GET /:id/transactions - List transactions for an item ───────────

router.get('/:id/transactions', async (req, res, next) => {
  try {
    const { page = 1, limit = 50, sort_order = 'desc', start_date, end_date } = req.query;
    const offset = (page - 1) * limit;

    let query = db('inventory_transactions').where({ item_id: req.params.id });

    if (start_date) query = query.where('transaction_date', '>=', start_date);
    if (end_date) query = query.where('transaction_date', '<=', end_date);

    const [{ count }] = await query.clone().count();
    const data = await query
      .orderBy('transaction_date', sort_order)
      .limit(limit)
      .offset(offset);

    res.json({ data, total: parseInt(count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { next(err); }
});

// ── POST /:id/transactions - Record an inventory transaction (stock adjustment) ──

router.post('/:id/transactions', async (req, res, next) => {
  try {
    const item = await db('items').where({ id: req.params.id }).first();
    if (!item) return res.status(404).json({ error: 'Inventory item not found' });

    const txnData = {
      ...req.body,
      item_id: req.params.id,
    };

    const quantity = parseFloat(txnData.quantity) || 0;
    if (quantity <= 0) {
      return res.status(400).json({ error: 'Quantity must be greater than zero' });
    }

    const isInbound = INBOUND_TYPES.includes(txnData.transaction_type);
    const isOutbound = OUTBOUND_TYPES.includes(txnData.transaction_type);

    // Stock validation: prevent stock going negative for outbound transactions
    if (isOutbound) {
      const currentStock = parseFloat(item.current_stock) || 0;
      if (quantity > currentStock) {
        return res.status(400).json({
          error: `Insufficient stock. Current stock is ${currentStock}, but tried to deduct ${quantity}.`,
        });
      }
    }

    const [txn] = await db('inventory_transactions').insert(txnData).returning('*');

    // Update current stock on the item
    if (isInbound) {
      await db('items').where({ id: req.params.id }).increment('current_stock', quantity);
    } else if (isOutbound) {
      await db('items').where({ id: req.params.id }).decrement('current_stock', quantity);
    }

    res.status(201).json({ data: txn });
  } catch (err) { next(err); }
});

module.exports = router;
