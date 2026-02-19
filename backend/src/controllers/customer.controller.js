const db = require('../config/database');

/**
 * Generate next customer code like CUST-0001
 */
async function generateCustomerCode() {
  const last = await db('customers')
    .whereRaw("display_name IS NOT NULL")
    .orderBy('created_at', 'desc')
    .first();

  // Count existing customers for next number
  const [{ count }] = await db('customers').count();
  const nextNum = parseInt(count) + 1;
  return `CUST-${String(nextNum).padStart(4, '0')}`;
}

/**
 * GET / - List all customers with pagination, search, sort
 */
const list = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, search, sort_by, sort_order = 'desc', is_active } = req.query;
    const offset = (page - 1) * limit;

    let query = db('customers');

    // Filter by active status
    if (is_active !== undefined) {
      query = query.where('is_active', is_active === 'true');
    }

    // Search by name, email, company, gstin
    if (search) {
      query = query.where(function () {
        this.where('display_name', 'ilike', `%${search}%`)
          .orWhere('company_name', 'ilike', `%${search}%`)
          .orWhere('email', 'ilike', `%${search}%`)
          .orWhere('gstin', 'ilike', `%${search}%`)
          .orWhere('phone', 'ilike', `%${search}%`);
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
 * GET /:id - Get single customer with addresses and invoice summary
 */
const getById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const customer = await db('customers').where({ id }).first();
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Get addresses
    const addresses = await db('customer_addresses')
      .where({ customer_id: id })
      .orderBy('is_default', 'desc');

    // Get invoice summary
    const invoiceSummary = await db('invoices')
      .where({ customer_id: id })
      .select(
        db.raw('COUNT(*) as total_invoices'),
        db.raw("SUM(CASE WHEN status != 'Paid' AND status != 'Cancelled' THEN balance_due ELSE 0 END) as outstanding_amount"),
        db.raw('SUM(total_amount) as total_billed'),
        db.raw('SUM(amount_paid) as total_paid')
      )
      .first();

    res.json({
      data: {
        ...customer,
        addresses,
        invoice_summary: {
          total_invoices: parseInt(invoiceSummary.total_invoices) || 0,
          outstanding_amount: parseFloat(invoiceSummary.outstanding_amount) || 0,
          total_billed: parseFloat(invoiceSummary.total_billed) || 0,
          total_paid: parseFloat(invoiceSummary.total_paid) || 0,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST / - Create customer with auto-generated code
 */
const create = async (req, res, next) => {
  try {
    const { addresses, ...customerData } = req.body;

    if (!customerData.display_name) {
      return res.status(400).json({ error: 'Display name is required' });
    }

    // Auto-generate customer code if not provided
    if (!customerData.customer_code) {
      customerData.customer_code = await generateCustomerCode();
    }

    const [customer] = await db('customers')
      .insert(customerData)
      .returning('*');

    // Insert addresses if provided
    if (addresses && addresses.length > 0) {
      const addressRows = addresses.map((addr) => ({
        ...addr,
        customer_id: customer.id,
      }));
      await db('customer_addresses').insert(addressRows);
    }

    const savedAddresses = await db('customer_addresses')
      .where({ customer_id: customer.id });

    res.status(201).json({
      data: { ...customer, addresses: savedAddresses },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /:id - Update customer
 */
const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { addresses, ...customerData } = req.body;

    const existing = await db('customers').where({ id }).first();
    if (!existing) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    customerData.updated_at = new Date();

    const [updated] = await db('customers')
      .where({ id })
      .update(customerData)
      .returning('*');

    // Update addresses if provided
    if (addresses !== undefined) {
      // Delete existing addresses and re-insert
      await db('customer_addresses').where({ customer_id: id }).del();
      if (addresses.length > 0) {
        const addressRows = addresses.map((addr) => ({
          ...addr,
          customer_id: id,
          id: undefined, // let DB generate new IDs
        }));
        await db('customer_addresses').insert(addressRows);
      }
    }

    const savedAddresses = await db('customer_addresses')
      .where({ customer_id: id });

    res.json({
      data: { ...updated, addresses: savedAddresses },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /:id - Soft delete (check no linked invoices)
 */
const remove = async (req, res, next) => {
  try {
    const { id } = req.params;

    const customer = await db('customers').where({ id }).first();
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Check for linked invoices
    const [{ count }] = await db('invoices')
      .where({ customer_id: id })
      .whereNot('status', 'Cancelled')
      .count();

    if (parseInt(count) > 0) {
      return res.status(409).json({
        error: `Cannot delete customer with ${count} linked invoice(s). Cancel or reassign invoices first.`,
      });
    }

    // Soft delete
    await db('customers')
      .where({ id })
      .update({ is_active: false, updated_at: new Date() });

    res.json({ message: 'Customer deleted successfully' });
  } catch (err) {
    next(err);
  }
};

module.exports = { list, getById, create, update, remove };
