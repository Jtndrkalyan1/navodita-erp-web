const db = require('../config/database');

/**
 * Generate next vendor code like VEND-0001
 */
async function generateVendorCode() {
  const [{ count }] = await db('vendors').count();
  const nextNum = parseInt(count) + 1;
  return `VEND-${String(nextNum).padStart(4, '0')}`;
}

/**
 * GET / - List all vendors with pagination, search, sort
 */
const list = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, search, sort_by, sort_order = 'desc', is_active } = req.query;
    const offset = (page - 1) * limit;

    let query = db('vendors');

    if (is_active !== undefined) {
      query = query.where('is_active', is_active === 'true');
    }

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
 * GET /:id - Get single vendor with addresses and bill summary
 */
const getById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const vendor = await db('vendors').where({ id }).first();
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    const addresses = await db('vendor_addresses')
      .where({ vendor_id: id })
      .orderBy('is_default', 'desc');

    const billSummary = await db('bills')
      .where({ vendor_id: id })
      .select(
        db.raw('COUNT(*) as total_bills'),
        db.raw("SUM(CASE WHEN status != 'Paid' THEN balance_due ELSE 0 END) as outstanding_amount"),
        db.raw('SUM(total_amount) as total_billed'),
        db.raw('SUM(amount_paid) as total_paid')
      )
      .first();

    res.json({
      data: {
        ...vendor,
        addresses,
        bill_summary: {
          total_bills: parseInt(billSummary.total_bills) || 0,
          outstanding_amount: parseFloat(billSummary.outstanding_amount) || 0,
          total_billed: parseFloat(billSummary.total_billed) || 0,
          total_paid: parseFloat(billSummary.total_paid) || 0,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST / - Create vendor
 */
const create = async (req, res, next) => {
  try {
    const { addresses, ...vendorData } = req.body;

    if (!vendorData.display_name) {
      return res.status(400).json({ error: 'Display name is required' });
    }

    if (!vendorData.vendor_code) {
      vendorData.vendor_code = await generateVendorCode();
    }

    const [vendor] = await db('vendors')
      .insert(vendorData)
      .returning('*');

    if (addresses && addresses.length > 0) {
      const addressRows = addresses.map((addr) => ({
        ...addr,
        vendor_id: vendor.id,
      }));
      await db('vendor_addresses').insert(addressRows);
    }

    const savedAddresses = await db('vendor_addresses')
      .where({ vendor_id: vendor.id });

    res.status(201).json({
      data: { ...vendor, addresses: savedAddresses },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /:id - Update vendor
 */
const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { addresses, ...vendorData } = req.body;

    const existing = await db('vendors').where({ id }).first();
    if (!existing) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    vendorData.updated_at = new Date();

    const [updated] = await db('vendors')
      .where({ id })
      .update(vendorData)
      .returning('*');

    if (addresses !== undefined) {
      await db('vendor_addresses').where({ vendor_id: id }).del();
      if (addresses.length > 0) {
        const addressRows = addresses.map((addr) => ({
          ...addr,
          vendor_id: id,
          id: undefined,
        }));
        await db('vendor_addresses').insert(addressRows);
      }
    }

    const savedAddresses = await db('vendor_addresses')
      .where({ vendor_id: id });

    res.json({
      data: { ...updated, addresses: savedAddresses },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /:id - Soft delete (check no linked bills)
 */
const remove = async (req, res, next) => {
  try {
    const { id } = req.params;

    const vendor = await db('vendors').where({ id }).first();
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    const [{ count }] = await db('bills')
      .where({ vendor_id: id })
      .whereNot('status', 'Paid')
      .count();

    if (parseInt(count) > 0) {
      return res.status(409).json({
        error: `Cannot delete vendor with ${count} unpaid bill(s). Pay or cancel bills first.`,
      });
    }

    await db('vendors')
      .where({ id })
      .update({ is_active: false, updated_at: new Date() });

    res.json({ message: 'Vendor deleted successfully' });
  } catch (err) {
    next(err);
  }
};

module.exports = { list, getById, create, update, remove };
