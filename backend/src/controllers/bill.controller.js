const db = require('../config/database');
const { splitGST } = require('../services/gst.service');

/**
 * Generate next bill number
 */
async function generateBillNumber() {
  const settings = await db('invoice_number_settings')
    .where({ document_type: 'Bill' })
    .first();

  if (settings) {
    const nextNumber = settings.next_number || 1;
    const padded = String(nextNumber).padStart(settings.padding_digits || 4, '0');
    const sep = settings.separator || '-';
    const formatted = `${settings.prefix || 'BILL'}${sep}${padded}`;

    await db('invoice_number_settings')
      .where({ id: settings.id })
      .update({ next_number: nextNumber + 1, updated_at: new Date() });

    return formatted;
  }

  const [{ count }] = await db('bills').count();
  return `BILL-${String(parseInt(count) + 1).padStart(4, '0')}`;
}

/**
 * Calculate line item amounts and GST for bills
 */
function calculateBillLineItem(item, companyState, vendorState, companyGstin, vendorGstin) {
  const quantity = parseFloat(item.quantity) || 0;
  const rate = parseFloat(item.rate) || 0;
  const discountPercent = parseFloat(item.discount_percent) || 0;
  const gstRate = parseFloat(item.gst_rate) || 0;

  const lineTotal = quantity * rate;
  const discountAmount = (lineTotal * discountPercent) / 100;
  const taxableAmount = lineTotal - discountAmount;
  const totalGST = (taxableAmount * gstRate) / 100;

  const gstSplit = splitGST(totalGST, companyState, vendorState, companyGstin, vendorGstin);

  return {
    ...item,
    quantity,
    rate,
    discount_percent: discountPercent,
    discount_amount: parseFloat(discountAmount.toFixed(2)),
    gst_rate: gstRate,
    igst_amount: parseFloat(gstSplit.igst.toFixed(2)),
    cgst_amount: parseFloat(gstSplit.cgst.toFixed(2)),
    sgst_amount: parseFloat(gstSplit.sgst.toFixed(2)),
    amount: parseFloat(taxableAmount.toFixed(2)),
  };
}

/**
 * GET / - List bills with vendor name, status filter, date range, pagination
 */
const list = async (req, res, next) => {
  try {
    const {
      page = 1, limit = 50, search, sort_by, sort_order = 'desc',
      status, vendor_id, start_date, end_date,
    } = req.query;
    const offset = (page - 1) * limit;

    let query = db('bills')
      .leftJoin('vendors', 'bills.vendor_id', 'vendors.id')
      .select(
        'bills.*',
        'vendors.display_name as vendor_name',
        'vendors.email as vendor_email'
      )
      .whereNull('bills.deleted_at');

    if (status) query = query.where('bills.status', status);
    if (vendor_id) query = query.where('bills.vendor_id', vendor_id);
    if (start_date) query = query.where('bills.bill_date', '>=', start_date);
    if (end_date) query = query.where('bills.bill_date', '<=', end_date);

    if (search) {
      query = query.where(function () {
        this.where('bills.bill_number', 'ilike', `%${search}%`)
          .orWhere('vendors.display_name', 'ilike', `%${search}%`)
          .orWhere('bills.vendor_invoice_number', 'ilike', `%${search}%`);
      });
    }

    const [{ count }] = await query.clone().clearSelect().count('bills.id');
    const data = await query
      .orderBy(sort_by ? `bills.${sort_by}` : 'bills.created_at', sort_order)
      .limit(limit)
      .offset(offset);

    res.json({ data, total: parseInt(count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /stats - Summary stats across ALL bills matching filters (ignores pagination)
 */
const getStats = async (req, res, next) => {
  try {
    const { status, vendor_id, start_date, end_date, search } = req.query;
    const todayStr = new Date().toISOString().split('T')[0];

    let query = db('bills')
      .leftJoin('vendors', 'bills.vendor_id', 'vendors.id')
      .whereNot('bills.status', 'Cancelled')
      .whereNull('bills.deleted_at');

    if (status) query = query.where('bills.status', status);
    if (vendor_id) query = query.where('bills.vendor_id', vendor_id);
    if (start_date) query = query.where('bills.bill_date', '>=', start_date);
    if (end_date) query = query.where('bills.bill_date', '<=', end_date);
    if (search) {
      query = query.where(function () {
        this.where('bills.bill_number', 'ilike', `%${search}%`)
          .orWhere('vendors.display_name', 'ilike', `%${search}%`)
          .orWhere('bills.vendor_invoice_number', 'ilike', `%${search}%`);
      });
    }

    const [row] = await query.select(
      db.raw('COALESCE(SUM(bills.total_amount), 0) as total_bills'),
      db.raw('COALESCE(SUM(CASE WHEN bills.status = \'Pending\' THEN bills.total_amount ELSE 0 END), 0) as total_pending'),
      db.raw('COALESCE(SUM(CASE WHEN bills.status = \'Partial\' THEN bills.total_amount ELSE 0 END), 0) as total_partial'),
      db.raw('COALESCE(SUM(CASE WHEN bills.status = \'Paid\' THEN bills.total_amount ELSE 0 END), 0) as total_paid'),
      db.raw('COALESCE(SUM(bills.balance_due), 0) as total_payable'),
      db.raw(`COALESCE(SUM(CASE WHEN bills.due_date < '${todayStr}' AND bills.status IN ('Pending','Partial') THEN bills.balance_due ELSE 0 END), 0) as total_overdue`)
    );

    res.json({
      totalBills: parseFloat(row.total_bills) || 0,
      totalPending: parseFloat(row.total_pending) || 0,
      totalPartial: parseFloat(row.total_partial) || 0,
      totalPaid: parseFloat(row.total_paid) || 0,
      totalPayable: parseFloat(row.total_payable) || 0,
      totalOverdue: parseFloat(row.total_overdue) || 0,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /:id - Get bill with line items and vendor details
 */
const getById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const bill = await db('bills')
      .leftJoin('vendors', 'bills.vendor_id', 'vendors.id')
      .select(
        'bills.*',
        'vendors.display_name as vendor_name',
        'vendors.email as vendor_email',
        'vendors.gstin as vendor_gstin'
      )
      .where('bills.id', id)
      .whereNull('bills.deleted_at')
      .first();

    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    const items = await db('bill_items')
      .where({ bill_id: id })
      .orderBy('sort_order', 'asc');

    const payments = await db('payment_made_allocations')
      .leftJoin('payments_made', 'payment_made_allocations.payment_made_id', 'payments_made.id')
      .select(
        'payments_made.payment_number',
        'payments_made.payment_date',
        'payments_made.payment_mode',
        'payment_made_allocations.allocated_amount'
      )
      .where('payment_made_allocations.bill_id', id);

    res.json({ data: { ...bill, items, payments } });
  } catch (err) {
    next(err);
  }
};

/**
 * POST / - Create bill with line items
 */
const create = async (req, res, next) => {
  try {
    const { items, ...billData } = req.body;

    if (!billData.vendor_id || !billData.bill_date) {
      return res.status(400).json({ error: 'Vendor and bill date are required' });
    }

    if (!billData.bill_number) {
      billData.bill_number = await generateBillNumber();
    }

    const company = await db('company_profile').first();
    const companyState = company ? company.state : null;
    const companyGstin = company ? company.gstin : null;

    const vendor = await db('vendors').where({ id: billData.vendor_id }).first();
    const vendorState = billData.place_of_supply || (vendor ? vendor.place_of_supply : null);
    const vendorGstin = vendor ? vendor.gstin : null;

    let subTotal = 0;
    let totalIgst = 0;
    let totalCgst = 0;
    let totalSgst = 0;

    const calculatedItems = (items || []).map((item, idx) => {
      const calc = calculateBillLineItem(item, companyState, vendorState, companyGstin, vendorGstin);
      subTotal += calc.amount;
      totalIgst += calc.igst_amount;
      totalCgst += calc.cgst_amount;
      totalSgst += calc.sgst_amount;
      return { ...calc, sort_order: idx };
    });

    const totalTax = totalIgst + totalCgst + totalSgst;
    const discountAmount = parseFloat(billData.discount_amount) || 0;
    const tdsAmount = parseFloat(billData.tds_amount) || 0;
    const totalAmount = subTotal - discountAmount + totalTax;
    const amountPaid = parseFloat(billData.amount_paid) || 0;

    billData.sub_total = parseFloat(subTotal.toFixed(2));
    billData.igst_amount = parseFloat(totalIgst.toFixed(2));
    billData.cgst_amount = parseFloat(totalCgst.toFixed(2));
    billData.sgst_amount = parseFloat(totalSgst.toFixed(2));
    billData.total_tax = parseFloat(totalTax.toFixed(2));
    billData.tds_amount = tdsAmount;
    billData.total_amount = parseFloat(totalAmount.toFixed(2));
    billData.amount_paid = amountPaid;
    billData.balance_due = parseFloat((totalAmount - amountPaid).toFixed(2));

    // Insert bill + items in a transaction
    const result = await db.transaction(async (trx) => {
      const [bill] = await trx('bills').insert(billData).returning('*');

      if (calculatedItems.length > 0) {
        const itemRows = calculatedItems.map((item) => ({
          bill_id: bill.id,
          item_id: item.item_id || null,
          account_id: item.account_id || null,
          item_name: item.item_name,
          description: item.description,
          hsn_code: item.hsn_code,
          quantity: item.quantity,
          unit: item.unit,
          rate: item.rate,
          discount_percent: item.discount_percent,
          discount_amount: item.discount_amount,
          gst_rate: item.gst_rate,
          igst_amount: item.igst_amount,
          cgst_amount: item.cgst_amount,
          sgst_amount: item.sgst_amount,
          amount: item.amount,
          sort_order: item.sort_order,
        }));
        await trx('bill_items').insert(itemRows);
      }

      const savedItems = await trx('bill_items').where({ bill_id: bill.id }).orderBy('sort_order');

      return { bill, savedItems };
    });

    res.status(201).json({ data: { ...result.bill, items: result.savedItems } });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /:id - Update bill + items
 */
const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { items, ...billData } = req.body;

    const existing = await db('bills').where({ id }).first();
    if (!existing) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    if (existing.status === 'Paid') {
      return res.status(400).json({ error: 'Cannot update a fully paid bill' });
    }

    const company = await db('company_profile').first();
    const companyState = company ? company.state : null;
    const companyGstin = company ? company.gstin : null;

    const vendorId = billData.vendor_id || existing.vendor_id;
    const vendor = await db('vendors').where({ id: vendorId }).first();
    const vendorState = billData.place_of_supply || existing.place_of_supply || (vendor ? vendor.place_of_supply : null);
    const vendorGstin = vendor ? vendor.gstin : null;

    if (items) {
      let subTotal = 0;
      let totalIgst = 0;
      let totalCgst = 0;
      let totalSgst = 0;

      const calculatedItems = items.map((item, idx) => {
        const calc = calculateBillLineItem(item, companyState, vendorState, companyGstin, vendorGstin);
        subTotal += calc.amount;
        totalIgst += calc.igst_amount;
        totalCgst += calc.cgst_amount;
        totalSgst += calc.sgst_amount;
        return { ...calc, sort_order: idx };
      });

      const totalTax = totalIgst + totalCgst + totalSgst;
      const discountAmount = parseFloat(billData.discount_amount ?? existing.discount_amount) || 0;
      const totalAmount = subTotal - discountAmount + totalTax;
      const amountPaid = parseFloat(billData.amount_paid ?? existing.amount_paid) || 0;

      billData.sub_total = parseFloat(subTotal.toFixed(2));
      billData.igst_amount = parseFloat(totalIgst.toFixed(2));
      billData.cgst_amount = parseFloat(totalCgst.toFixed(2));
      billData.sgst_amount = parseFloat(totalSgst.toFixed(2));
      billData.total_tax = parseFloat(totalTax.toFixed(2));
      billData.total_amount = parseFloat(totalAmount.toFixed(2));
      billData.amount_paid = amountPaid;
      billData.balance_due = parseFloat((totalAmount - amountPaid).toFixed(2));
    }

    billData.updated_at = new Date();

    // Wrap item replace + bill update in a transaction
    const result = await db.transaction(async (trx) => {
      if (items) {
        await trx('bill_items').where({ bill_id: id }).del();

        const calculatedItemsFinal = items.map((item, idx) => {
          const calc = calculateBillLineItem(item, companyState, vendorState, companyGstin, vendorGstin);
          return { ...calc, sort_order: idx };
        });

        if (calculatedItemsFinal.length > 0) {
          const itemRows = calculatedItemsFinal.map((item) => ({
            bill_id: id,
            item_id: item.item_id || null,
            account_id: item.account_id || null,
            item_name: item.item_name,
            description: item.description,
            hsn_code: item.hsn_code,
            quantity: item.quantity,
            unit: item.unit,
            rate: item.rate,
            discount_percent: item.discount_percent,
            discount_amount: item.discount_amount,
            gst_rate: item.gst_rate,
            igst_amount: item.igst_amount,
            cgst_amount: item.cgst_amount,
            sgst_amount: item.sgst_amount,
            amount: item.amount,
            sort_order: item.sort_order,
          }));
          await trx('bill_items').insert(itemRows);
        }
      }

      const [updated] = await trx('bills').where({ id }).update(billData).returning('*');
      const savedItems = await trx('bill_items').where({ bill_id: id }).orderBy('sort_order');

      return { updated, savedItems };
    });

    res.json({ data: { ...result.updated, items: result.savedItems } });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /:id - Only if status is Pending (no payments)
 */
const remove = async (req, res, next) => {
  try {
    const { id } = req.params;

    const bill = await db('bills').where({ id }).first();
    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    if (bill.status === 'Paid' || bill.status === 'Partial') {
      return res.status(400).json({
        error: `Cannot delete bill with status "${bill.status}". Only Pending bills can be deleted.`,
      });
    }

    // Soft delete bill (line items remain linked)
    await db('bills')
      .where({ id })
      .update({ deleted_at: new Date() });

    res.json({ message: 'Bill deleted successfully' });
  } catch (err) {
    next(err);
  }
};

module.exports = { list, getStats, getById, create, update, remove };
