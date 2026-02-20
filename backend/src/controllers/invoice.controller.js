const db = require('../config/database');
const { splitGST } = require('../services/gst.service');

/**
 * Generate next document number from invoice_number_settings
 */
async function generateDocNumber(docType, prefix = 'INV') {
  const settings = await db('invoice_number_settings')
    .where({ document_type: docType })
    .first();

  let nextNumber;
  let formatted;

  if (settings) {
    nextNumber = settings.next_number || 1;
    const padded = String(nextNumber).padStart(settings.padding_digits || 4, '0');
    const sep = settings.separator || '-';
    formatted = `${settings.prefix || prefix}${sep}${padded}`;

    await db('invoice_number_settings')
      .where({ id: settings.id })
      .update({ next_number: nextNumber + 1, updated_at: new Date() });
  } else {
    // No settings row - count existing records + 1
    const [{ count }] = await db('invoices').count();
    nextNumber = parseInt(count) + 1;
    formatted = `${prefix}-${String(nextNumber).padStart(4, '0')}`;
  }

  return formatted;
}

/**
 * Calculate line item amounts and GST
 */
function calculateLineItem(item, companyState, customerState, companyGstin, customerGstin) {
  const quantity = parseFloat(item.quantity) || 0;
  const rate = parseFloat(item.rate) || 0;
  const discountPercent = parseFloat(item.discount_percent) || 0;
  const gstRate = parseFloat(item.gst_rate) || 0;

  const lineTotal = quantity * rate;
  const discountAmount = (lineTotal * discountPercent) / 100;
  const taxableAmount = lineTotal - discountAmount;
  const totalGST = (taxableAmount * gstRate) / 100;

  const gstSplit = splitGST(totalGST, companyState, customerState, companyGstin, customerGstin);

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
 * GET / - List invoices with customer name, status filter, date range, pagination
 */
const list = async (req, res, next) => {
  try {
    const {
      page = 1, limit = 50, search, sort_by, sort_order = 'desc',
      status, customer_id, start_date, end_date,
    } = req.query;
    const offset = (page - 1) * limit;

    let query = db('invoices')
      .leftJoin('customers', 'invoices.customer_id', 'customers.id')
      .select(
        'invoices.*',
        'customers.display_name as customer_name',
        'customers.email as customer_email'
      )
      .whereNull('invoices.deleted_at');

    if (status) {
      query = query.where('invoices.status', status);
    }

    if (customer_id) {
      query = query.where('invoices.customer_id', customer_id);
    }

    if (start_date) {
      query = query.where('invoices.invoice_date', '>=', start_date);
    }

    if (end_date) {
      query = query.where('invoices.invoice_date', '<=', end_date);
    }

    if (search) {
      query = query.where(function () {
        this.where('invoices.invoice_number', 'ilike', `%${search}%`)
          .orWhere('customers.display_name', 'ilike', `%${search}%`)
          .orWhere('invoices.reference_number', 'ilike', `%${search}%`);
      });
    }

    const countQuery = query.clone().clearSelect().count('invoices.id');
    const [{ count }] = await countQuery;

    // Map sort_by to correct table-qualified column
    let orderCol;
    if (sort_by === 'customer_name') {
      orderCol = 'customers.display_name';
    } else if (sort_by) {
      orderCol = `invoices.${sort_by}`;
    } else {
      orderCol = 'invoices.invoice_date';
    }

    const data = await query
      .orderBy(orderCol, sort_order)
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
 * GET /stats - Summary stats across ALL invoices matching filters (ignores pagination)
 */
const getStats = async (req, res, next) => {
  try {
    const { status, customer_id, start_date, end_date, search } = req.query;
    const todayStr = new Date().toISOString().split('T')[0];

    let query = db('invoices')
      .leftJoin('customers', 'invoices.customer_id', 'customers.id')
      .whereNot('invoices.status', 'Cancelled')
      .whereNull('invoices.deleted_at');

    if (status) query = query.where('invoices.status', status);
    if (customer_id) query = query.where('invoices.customer_id', customer_id);
    if (start_date) query = query.where('invoices.invoice_date', '>=', start_date);
    if (end_date) query = query.where('invoices.invoice_date', '<=', end_date);
    if (search) {
      query = query.where(function () {
        this.where('invoices.invoice_number', 'ilike', `%${search}%`)
          .orWhere('customers.display_name', 'ilike', `%${search}%`)
          .orWhere('invoices.reference_number', 'ilike', `%${search}%`);
      });
    }

    const [row] = await query.select(
      db.raw('COALESCE(SUM(invoices.total_amount), 0) as total_invoiced'),
      db.raw('COALESCE(SUM(invoices.amount_paid), 0) as total_paid'),
      db.raw('COALESCE(SUM(invoices.balance_due), 0) as total_balance'),
      db.raw(`COALESCE(SUM(CASE WHEN (invoices.status IN ('Overdue','Sent','Final','Partial') AND invoices.due_date < '${todayStr}') THEN invoices.balance_due ELSE 0 END), 0) as total_overdue`)
    );

    res.json({
      totalInvoiced: parseFloat(row.total_invoiced) || 0,
      totalPaid: parseFloat(row.total_paid) || 0,
      totalBalance: parseFloat(row.total_balance) || 0,
      totalOverdue: parseFloat(row.total_overdue) || 0,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /:id - Get invoice with line items and customer details
 */
const getById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const invoice = await db('invoices')
      .leftJoin('customers', 'invoices.customer_id', 'customers.id')
      .select(
        'invoices.*',
        'customers.display_name as customer_name',
        'customers.email as customer_email',
        'customers.gstin as customer_gstin',
        'customers.phone as customer_phone'
      )
      .where('invoices.id', id)
      .whereNull('invoices.deleted_at')
      .first();

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const items = await db('invoice_items')
      .where({ invoice_id: id })
      .orderBy('sort_order', 'asc');

    // Get payment allocations
    const payments = await db('payment_received_allocations')
      .leftJoin('payments_received', 'payment_received_allocations.payment_received_id', 'payments_received.id')
      .select(
        'payments_received.payment_number',
        'payments_received.payment_date',
        'payments_received.payment_mode',
        'payment_received_allocations.allocated_amount'
      )
      .where('payment_received_allocations.invoice_id', id);

    res.json({
      data: {
        ...invoice,
        items,
        payments,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST / - Create invoice with line items, calculate GST, auto-number
 */
const create = async (req, res, next) => {
  try {
    const { items, ...invoiceData } = req.body;

    if (!invoiceData.customer_id || !invoiceData.invoice_date) {
      return res.status(400).json({ error: 'Customer and invoice date are required' });
    }

    // Auto-generate invoice number
    if (!invoiceData.invoice_number) {
      invoiceData.invoice_number = await generateDocNumber('Invoice', 'INV');
    }

    // Get company profile for GST state
    const company = await db('company_profile').first();
    const companyState = company ? company.state : null;
    const companyGstin = company ? company.gstin : null;

    // Get customer state
    const customer = await db('customers')
      .where({ id: invoiceData.customer_id })
      .first();
    const customerState = invoiceData.place_of_supply || (customer ? customer.place_of_supply : null);
    const customerGstin = customer ? customer.gstin : null;

    // Calculate line items
    let subTotal = 0;
    let totalIgst = 0;
    let totalCgst = 0;
    let totalSgst = 0;

    const calculatedItems = (items || []).map((item, idx) => {
      const calc = calculateLineItem(item, companyState, customerState, companyGstin, customerGstin);
      subTotal += calc.amount;
      totalIgst += calc.igst_amount;
      totalCgst += calc.cgst_amount;
      totalSgst += calc.sgst_amount;
      return { ...calc, sort_order: idx };
    });

    const totalTax = totalIgst + totalCgst + totalSgst;
    const discountAmount = parseFloat(invoiceData.discount_amount) || 0;
    const shippingCharge = parseFloat(invoiceData.shipping_charge) || 0;
    const roundOff = parseFloat(invoiceData.round_off) || 0;
    const totalAmount = subTotal - discountAmount + totalTax + shippingCharge + roundOff;
    const amountPaid = parseFloat(invoiceData.amount_paid) || 0;

    invoiceData.sub_total = parseFloat(subTotal.toFixed(2));
    invoiceData.igst_amount = parseFloat(totalIgst.toFixed(2));
    invoiceData.cgst_amount = parseFloat(totalCgst.toFixed(2));
    invoiceData.sgst_amount = parseFloat(totalSgst.toFixed(2));
    invoiceData.total_tax = parseFloat(totalTax.toFixed(2));
    invoiceData.total_amount = parseFloat(totalAmount.toFixed(2));
    invoiceData.amount_paid = amountPaid;
    invoiceData.balance_due = parseFloat((totalAmount - amountPaid).toFixed(2));

    // Insert invoice + items in a transaction
    const result = await db.transaction(async (trx) => {
      const [invoice] = await trx('invoices')
        .insert(invoiceData)
        .returning('*');

      if (calculatedItems.length > 0) {
        const itemRows = calculatedItems.map((item) => ({
          invoice_id: invoice.id,
          item_id: item.item_id || null,
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
        await trx('invoice_items').insert(itemRows);
      }

      const savedItems = await trx('invoice_items')
        .where({ invoice_id: invoice.id })
        .orderBy('sort_order');

      return { invoice, savedItems };
    });

    res.status(201).json({
      data: { ...result.invoice, items: result.savedItems },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /:id - Update invoice + items (delete old items, insert new)
 */
const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { items, ...invoiceData } = req.body;

    const existing = await db('invoices').where({ id }).first();
    if (!existing) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    if (existing.status === 'Paid') {
      return res.status(400).json({ error: 'Cannot update a paid invoice' });
    }

    // Get company profile for GST state
    const company = await db('company_profile').first();
    const companyState = company ? company.state : null;
    const companyGstin = company ? company.gstin : null;

    const customerId = invoiceData.customer_id || existing.customer_id;
    const customer = await db('customers').where({ id: customerId }).first();
    const customerState = invoiceData.place_of_supply || existing.place_of_supply || (customer ? customer.place_of_supply : null);
    const customerGstin = customer ? customer.gstin : null;

    // Recalculate if items are provided
    if (items) {
      let subTotal = 0;
      let totalIgst = 0;
      let totalCgst = 0;
      let totalSgst = 0;

      const calculatedItems = items.map((item, idx) => {
        const calc = calculateLineItem(item, companyState, customerState, companyGstin, customerGstin);
        subTotal += calc.amount;
        totalIgst += calc.igst_amount;
        totalCgst += calc.cgst_amount;
        totalSgst += calc.sgst_amount;
        return { ...calc, sort_order: idx };
      });

      const totalTax = totalIgst + totalCgst + totalSgst;
      const discountAmount = parseFloat(invoiceData.discount_amount ?? existing.discount_amount) || 0;
      const shippingCharge = parseFloat(invoiceData.shipping_charge ?? existing.shipping_charge) || 0;
      const roundOff = parseFloat(invoiceData.round_off ?? existing.round_off) || 0;
      const totalAmount = subTotal - discountAmount + totalTax + shippingCharge + roundOff;
      const amountPaid = parseFloat(invoiceData.amount_paid ?? existing.amount_paid) || 0;

      invoiceData.sub_total = parseFloat(subTotal.toFixed(2));
      invoiceData.igst_amount = parseFloat(totalIgst.toFixed(2));
      invoiceData.cgst_amount = parseFloat(totalCgst.toFixed(2));
      invoiceData.sgst_amount = parseFloat(totalSgst.toFixed(2));
      invoiceData.total_tax = parseFloat(totalTax.toFixed(2));
      invoiceData.total_amount = parseFloat(totalAmount.toFixed(2));
      invoiceData.amount_paid = amountPaid;
      invoiceData.balance_due = parseFloat((totalAmount - amountPaid).toFixed(2));

      // Delete old items and insert new (inside transaction below)
    }

    invoiceData.updated_at = new Date();

    // Wrap item replace + invoice update in a transaction
    const result = await db.transaction(async (trx) => {
      if (items) {
        await trx('invoice_items').where({ invoice_id: id }).del();

        const calculatedItemsFinal = items.map((item, idx) => {
          const calc = calculateLineItem(item, companyState, customerState, companyGstin, customerGstin);
          return { ...calc, sort_order: idx };
        });

        if (calculatedItemsFinal.length > 0) {
          const itemRows = calculatedItemsFinal.map((item) => ({
            invoice_id: id,
            item_id: item.item_id || null,
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
          await trx('invoice_items').insert(itemRows);
        }
      }

      const [updated] = await trx('invoices')
        .where({ id })
        .update(invoiceData)
        .returning('*');

      const savedItems = await trx('invoice_items')
        .where({ invoice_id: id })
        .orderBy('sort_order');

      return { updated, savedItems };
    });

    res.json({
      data: { ...result.updated, items: result.savedItems },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /:id - Only if status is Draft
 */
const remove = async (req, res, next) => {
  try {
    const { id } = req.params;

    const invoice = await db('invoices').where({ id }).first();
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    if (invoice.status !== 'Draft') {
      return res.status(400).json({
        error: `Cannot delete invoice with status "${invoice.status}". Only Draft invoices can be deleted.`,
      });
    }

    // Soft delete invoice (line items remain linked)
    await db('invoices')
      .where({ id })
      .update({ deleted_at: new Date() });

    res.json({ message: 'Invoice deleted successfully' });
  } catch (err) {
    next(err);
  }
};

module.exports = { list, getStats, getById, create, update, remove, generateDocNumber, calculateLineItem };
