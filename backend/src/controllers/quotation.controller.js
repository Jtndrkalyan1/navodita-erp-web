const db = require('../config/database');
const { splitGST } = require('../services/gst.service');

/**
 * Generate next quotation number
 */
async function generateQuotationNumber() {
  const settings = await db('invoice_number_settings')
    .where({ document_type: 'Quotation' })
    .first();

  if (settings) {
    const nextNumber = settings.next_number || 1;
    const padded = String(nextNumber).padStart(settings.padding_digits || 4, '0');
    const sep = settings.separator || '-';
    const formatted = `${settings.prefix || 'QTN'}${sep}${padded}`;

    await db('invoice_number_settings')
      .where({ id: settings.id })
      .update({ next_number: nextNumber + 1, updated_at: new Date() });

    return formatted;
  }

  const [{ count }] = await db('quotations').count();
  return `QTN-${String(parseInt(count) + 1).padStart(4, '0')}`;
}

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
    quantity, rate, discount_percent: discountPercent,
    discount_amount: parseFloat(discountAmount.toFixed(2)),
    gst_rate: gstRate,
    igst_amount: parseFloat(gstSplit.igst.toFixed(2)),
    cgst_amount: parseFloat(gstSplit.cgst.toFixed(2)),
    sgst_amount: parseFloat(gstSplit.sgst.toFixed(2)),
    amount: parseFloat(taxableAmount.toFixed(2)),
  };
}

const list = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, search, sort_by, sort_order = 'desc', status, customer_id, start_date, end_date } = req.query;
    const offset = (page - 1) * limit;

    let query = db('quotations')
      .leftJoin('customers', 'quotations.customer_id', 'customers.id')
      .select('quotations.*', 'customers.display_name as customer_name');

    if (status) query = query.where('quotations.status', status);
    if (customer_id) query = query.where('quotations.customer_id', customer_id);
    if (start_date) query = query.where('quotations.quotation_date', '>=', start_date);
    if (end_date) query = query.where('quotations.quotation_date', '<=', end_date);

    if (search) {
      query = query.where(function () {
        this.where('quotations.quotation_number', 'ilike', `%${search}%`)
          .orWhere('customers.display_name', 'ilike', `%${search}%`);
      });
    }

    const [{ count }] = await query.clone().clearSelect().count('quotations.id');
    const data = await query.orderBy(sort_by ? `quotations.${sort_by}` : 'quotations.created_at', sort_order).limit(limit).offset(offset);

    res.json({ data, total: parseInt(count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const quotation = await db('quotations')
      .leftJoin('customers', 'quotations.customer_id', 'customers.id')
      .select('quotations.*', 'customers.display_name as customer_name', 'customers.email as customer_email')
      .where('quotations.id', id).first();

    if (!quotation) return res.status(404).json({ error: 'Quotation not found' });

    const items = await db('quotation_items').where({ quotation_id: id }).orderBy('sort_order');
    res.json({ data: { ...quotation, items } });
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const { items, ...data } = req.body;
    if (!data.customer_id || !data.quotation_date) return res.status(400).json({ error: 'Customer and date are required' });

    if (!data.quotation_number) data.quotation_number = await generateQuotationNumber();

    const company = await db('company_profile').first();
    const customer = await db('customers').where({ id: data.customer_id }).first();

    let subTotal = 0, totalIgst = 0, totalCgst = 0, totalSgst = 0;
    const calcItems = (items || []).map((item, idx) => {
      const calc = calculateLineItem(item, company?.state, customer?.place_of_supply, company?.gstin, customer?.gstin);
      subTotal += calc.amount; totalIgst += calc.igst_amount; totalCgst += calc.cgst_amount; totalSgst += calc.sgst_amount;
      return { ...calc, sort_order: idx };
    });

    const totalTax = totalIgst + totalCgst + totalSgst;
    const discountAmount = parseFloat(data.discount_amount) || 0;
    data.sub_total = parseFloat(subTotal.toFixed(2));
    data.igst_amount = parseFloat(totalIgst.toFixed(2));
    data.cgst_amount = parseFloat(totalCgst.toFixed(2));
    data.sgst_amount = parseFloat(totalSgst.toFixed(2));
    data.total_tax = parseFloat(totalTax.toFixed(2));
    data.total_amount = parseFloat((subTotal - discountAmount + totalTax).toFixed(2));

    const [quotation] = await db('quotations').insert(data).returning('*');

    if (calcItems.length > 0) {
      await db('quotation_items').insert(calcItems.map((item) => ({
        quotation_id: quotation.id, item_id: item.item_id || null, item_name: item.item_name,
        description: item.description, hsn_code: item.hsn_code, quantity: item.quantity, unit: item.unit,
        rate: item.rate, discount_percent: item.discount_percent, discount_amount: item.discount_amount,
        gst_rate: item.gst_rate, igst_amount: item.igst_amount, cgst_amount: item.cgst_amount,
        sgst_amount: item.sgst_amount, amount: item.amount, sort_order: item.sort_order,
      })));
    }

    const savedItems = await db('quotation_items').where({ quotation_id: quotation.id }).orderBy('sort_order');
    res.status(201).json({ data: { ...quotation, items: savedItems } });
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { items, ...data } = req.body;

    const existing = await db('quotations').where({ id }).first();
    if (!existing) return res.status(404).json({ error: 'Quotation not found' });

    if (items) {
      const company = await db('company_profile').first();
      const customerId = data.customer_id || existing.customer_id;
      const customer = await db('customers').where({ id: customerId }).first();

      let subTotal = 0, totalIgst = 0, totalCgst = 0, totalSgst = 0;
      const calcItems = items.map((item, idx) => {
        const calc = calculateLineItem(item, company?.state, customer?.place_of_supply, company?.gstin, customer?.gstin);
        subTotal += calc.amount; totalIgst += calc.igst_amount; totalCgst += calc.cgst_amount; totalSgst += calc.sgst_amount;
        return { ...calc, sort_order: idx };
      });

      const totalTax = totalIgst + totalCgst + totalSgst;
      const discountAmount = parseFloat(data.discount_amount ?? existing.discount_amount) || 0;
      data.sub_total = parseFloat(subTotal.toFixed(2));
      data.igst_amount = parseFloat(totalIgst.toFixed(2));
      data.cgst_amount = parseFloat(totalCgst.toFixed(2));
      data.sgst_amount = parseFloat(totalSgst.toFixed(2));
      data.total_tax = parseFloat(totalTax.toFixed(2));
      data.total_amount = parseFloat((subTotal - discountAmount + totalTax).toFixed(2));

      await db('quotation_items').where({ quotation_id: id }).del();
      if (calcItems.length > 0) {
        await db('quotation_items').insert(calcItems.map((item) => ({
          quotation_id: id, item_id: item.item_id || null, item_name: item.item_name,
          description: item.description, hsn_code: item.hsn_code, quantity: item.quantity, unit: item.unit,
          rate: item.rate, discount_percent: item.discount_percent, discount_amount: item.discount_amount,
          gst_rate: item.gst_rate, igst_amount: item.igst_amount, cgst_amount: item.cgst_amount,
          sgst_amount: item.sgst_amount, amount: item.amount, sort_order: item.sort_order,
        })));
      }
    }

    data.updated_at = new Date();
    const [updated] = await db('quotations').where({ id }).update(data).returning('*');
    const savedItems = await db('quotation_items').where({ quotation_id: id }).orderBy('sort_order');
    res.json({ data: { ...updated, items: savedItems } });
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const quotation = await db('quotations').where({ id }).first();
    if (!quotation) return res.status(404).json({ error: 'Quotation not found' });

    await db('quotation_items').where({ quotation_id: id }).del();
    await db('quotations').where({ id }).del();
    res.json({ message: 'Quotation deleted successfully' });
  } catch (err) { next(err); }
};

module.exports = { list, getById, create, update, remove };
