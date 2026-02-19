const db = require('../config/database');
const { splitGST } = require('../services/gst.service');

/**
 * Generate next expense number like EXP-0001
 */
async function generateExpenseNumber() {
  const settings = await db('invoice_number_settings')
    .where({ document_type: 'Expense' })
    .first();

  if (settings) {
    const nextNumber = settings.next_number || 1;
    const padded = String(nextNumber).padStart(settings.padding_digits || 4, '0');
    const sep = settings.separator || '-';
    const formatted = `${settings.prefix || 'EXP'}${sep}${padded}`;

    await db('invoice_number_settings')
      .where({ id: settings.id })
      .update({ next_number: nextNumber + 1, updated_at: new Date() });

    return formatted;
  }

  const [{ count }] = await db('expenses').count();
  return `EXP-${String(parseInt(count) + 1).padStart(4, '0')}`;
}

/**
 * GET / - List all expenses with pagination, search, filters
 */
const list = async (req, res, next) => {
  try {
    const {
      page = 1, limit = 50, search, sort_by, sort_order = 'desc',
      status, category, vendor_id, start_date, end_date, payment_mode,
    } = req.query;
    const offset = (page - 1) * limit;

    let query = db('expenses')
      .leftJoin('vendors', 'expenses.vendor_id', 'vendors.id')
      .select(
        'expenses.*',
        'vendors.display_name as vendor_name'
      );

    if (status) query = query.where('expenses.status', status);
    if (category) query = query.where('expenses.category', category);
    if (vendor_id) query = query.where('expenses.vendor_id', vendor_id);
    if (payment_mode) query = query.where('expenses.payment_mode', payment_mode);
    if (start_date) query = query.where('expenses.expense_date', '>=', start_date);
    if (end_date) query = query.where('expenses.expense_date', '<=', end_date);

    if (search) {
      query = query.where(function () {
        this.where('expenses.expense_number', 'ilike', `%${search}%`)
          .orWhere('expenses.description', 'ilike', `%${search}%`)
          .orWhere('expenses.category', 'ilike', `%${search}%`)
          .orWhere('vendors.display_name', 'ilike', `%${search}%`);
      });
    }

    const [{ count }] = await query.clone().clearSelect().count('expenses.id');
    const data = await query
      .orderBy(sort_by ? `expenses.${sort_by}` : 'expenses.created_at', sort_order)
      .limit(limit)
      .offset(offset);

    res.json({ data, total: parseInt(count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /:id - Get expense by ID
 */
const getById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const expense = await db('expenses')
      .leftJoin('vendors', 'expenses.vendor_id', 'vendors.id')
      .select('expenses.*', 'vendors.display_name as vendor_name')
      .where('expenses.id', id)
      .first();

    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    res.json({ data: expense });
  } catch (err) {
    next(err);
  }
};

/**
 * POST / - Create expense
 */
const create = async (req, res, next) => {
  try {
    const expenseData = req.body;

    if (!expenseData.expense_date || !expenseData.amount) {
      return res.status(400).json({ error: 'Expense date and amount are required' });
    }

    if (!expenseData.expense_number) {
      expenseData.expense_number = await generateExpenseNumber();
    }

    // Calculate GST amounts if gst_rate is provided
    const amount = parseFloat(expenseData.amount) || 0;
    const gstRate = parseFloat(expenseData.gst_rate) || 0;
    const gstAmount = (amount * gstRate) / 100;

    if (gstAmount > 0) {
      // Determine GST split based on company and vendor state
      const company = await db('company_profile').first();
      const companyState = company ? company.state : null;
      const companyGstin = company ? company.gstin : null;

      let vendorState = null;
      let vendorGstin = null;
      if (expenseData.vendor_id) {
        const vendor = await db('vendors').where({ id: expenseData.vendor_id }).first();
        if (vendor) {
          vendorState = vendor.place_of_supply;
          vendorGstin = vendor.gstin;
        }
      }

      const gstSplit = splitGST(gstAmount, companyState, vendorState, companyGstin, vendorGstin);
      expenseData.igst_amount = parseFloat(gstSplit.igst.toFixed(2));
      expenseData.cgst_amount = parseFloat(gstSplit.cgst.toFixed(2));
      expenseData.sgst_amount = parseFloat(gstSplit.sgst.toFixed(2));
    }

    expenseData.total_amount = parseFloat((amount + gstAmount).toFixed(2));

    const [expense] = await db('expenses').insert(expenseData).returning('*');

    res.status(201).json({ data: expense });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /:id - Update expense
 */
const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const expenseData = req.body;

    const existing = await db('expenses').where({ id }).first();
    if (!existing) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    // Recalculate totals if amount or gst_rate changed
    const amount = parseFloat(expenseData.amount ?? existing.amount) || 0;
    const gstRate = parseFloat(expenseData.gst_rate ?? existing.gst_rate) || 0;
    const gstAmount = (amount * gstRate) / 100;

    if (expenseData.amount !== undefined || expenseData.gst_rate !== undefined) {
      if (gstAmount > 0) {
        const company = await db('company_profile').first();
        const companyState = company ? company.state : null;
        const companyGstin = company ? company.gstin : null;

        const vendorId = expenseData.vendor_id || existing.vendor_id;
        let vendorState = null;
        let vendorGstin = null;
        if (vendorId) {
          const vendor = await db('vendors').where({ id: vendorId }).first();
          if (vendor) {
            vendorState = vendor.place_of_supply;
            vendorGstin = vendor.gstin;
          }
        }

        const gstSplit = splitGST(gstAmount, companyState, vendorState, companyGstin, vendorGstin);
        expenseData.igst_amount = parseFloat(gstSplit.igst.toFixed(2));
        expenseData.cgst_amount = parseFloat(gstSplit.cgst.toFixed(2));
        expenseData.sgst_amount = parseFloat(gstSplit.sgst.toFixed(2));
      } else {
        expenseData.igst_amount = 0;
        expenseData.cgst_amount = 0;
        expenseData.sgst_amount = 0;
      }

      expenseData.total_amount = parseFloat((amount + gstAmount).toFixed(2));
    }

    expenseData.updated_at = new Date();

    const [updated] = await db('expenses')
      .where({ id })
      .update(expenseData)
      .returning('*');

    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /:id - Delete expense
 */
const remove = async (req, res, next) => {
  try {
    const { id } = req.params;

    const expense = await db('expenses').where({ id }).first();
    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    if (expense.status === 'Paid') {
      return res.status(400).json({ error: 'Cannot delete a paid expense' });
    }

    await db('expenses').where({ id }).del();

    res.json({ message: 'Expense deleted successfully' });
  } catch (err) {
    next(err);
  }
};

module.exports = { list, getById, create, update, remove };
