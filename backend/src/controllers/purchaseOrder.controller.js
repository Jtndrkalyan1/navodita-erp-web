const db = require('../config/database');
const { splitGST } = require('../services/gst.service');

async function generatePONumber() {
  const settings = await db('invoice_number_settings').where({ document_type: 'PurchaseOrder' }).first();
  if (settings) {
    const nextNumber = settings.next_number || 1;
    const padded = String(nextNumber).padStart(settings.padding_digits || 4, '0');
    const formatted = `${settings.prefix || 'PO'}${settings.separator || '-'}${padded}`;
    await db('invoice_number_settings').where({ id: settings.id }).update({ next_number: nextNumber + 1, updated_at: new Date() });
    return formatted;
  }
  const [{ count }] = await db('purchase_orders').count();
  return `PO-${String(parseInt(count) + 1).padStart(4, '0')}`;
}

function calculateLineItem(item, companyState, vendorState, companyGstin, vendorGstin) {
  const quantity = parseFloat(item.ordered_quantity || item.quantity) || 0;
  const rate = parseFloat(item.rate) || 0;
  const discountPercent = parseFloat(item.discount_percent) || 0;
  const gstRate = parseFloat(item.gst_rate) || 0;
  const lineTotal = quantity * rate;
  const discountAmount = (lineTotal * discountPercent) / 100;
  const taxableAmount = lineTotal - discountAmount;
  const totalGST = (taxableAmount * gstRate) / 100;
  const gstSplit = splitGST(totalGST, companyState, vendorState, companyGstin, vendorGstin);
  return {
    ...item, ordered_quantity: quantity, rate, discount_percent: discountPercent,
    discount_amount: parseFloat(discountAmount.toFixed(2)), gst_rate: gstRate,
    igst_amount: parseFloat(gstSplit.igst.toFixed(2)), cgst_amount: parseFloat(gstSplit.cgst.toFixed(2)),
    sgst_amount: parseFloat(gstSplit.sgst.toFixed(2)), amount: parseFloat(taxableAmount.toFixed(2)),
  };
}

const list = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, search, sort_by, sort_order = 'desc', status, vendor_id, start_date, end_date } = req.query;
    const offset = (page - 1) * limit;

    let query = db('purchase_orders')
      .leftJoin('vendors', 'purchase_orders.vendor_id', 'vendors.id')
      .select('purchase_orders.*', 'vendors.display_name as vendor_name');

    if (status) query = query.where('purchase_orders.status', status);
    if (vendor_id) query = query.where('purchase_orders.vendor_id', vendor_id);
    if (start_date) query = query.where('purchase_orders.po_date', '>=', start_date);
    if (end_date) query = query.where('purchase_orders.po_date', '<=', end_date);

    if (search) {
      query = query.where(function () {
        this.where('purchase_orders.po_number', 'ilike', `%${search}%`)
          .orWhere('vendors.display_name', 'ilike', `%${search}%`);
      });
    }

    const [{ count }] = await query.clone().clearSelect().count('purchase_orders.id');
    const data = await query.orderBy(sort_by ? `purchase_orders.${sort_by}` : 'purchase_orders.created_at', sort_order).limit(limit).offset(offset);
    res.json({ data, total: parseInt(count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const po = await db('purchase_orders')
      .leftJoin('vendors', 'purchase_orders.vendor_id', 'vendors.id')
      .select('purchase_orders.*', 'vendors.display_name as vendor_name', 'vendors.email as vendor_email')
      .where('purchase_orders.id', id).first();
    if (!po) return res.status(404).json({ error: 'Purchase order not found' });

    const items = await db('purchase_order_items').where({ purchase_order_id: id }).orderBy('sort_order');
    res.json({ data: { ...po, items } });
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const { items, ...data } = req.body;
    if (!data.vendor_id || !data.po_date) return res.status(400).json({ error: 'Vendor and PO date are required' });
    if (!data.po_number) data.po_number = await generatePONumber();

    const company = await db('company_profile').first();
    const vendor = await db('vendors').where({ id: data.vendor_id }).first();

    let subTotal = 0, totalIgst = 0, totalCgst = 0, totalSgst = 0;
    const calcItems = (items || []).map((item, idx) => {
      const calc = calculateLineItem(item, company?.state, vendor?.place_of_supply, company?.gstin, vendor?.gstin);
      subTotal += calc.amount; totalIgst += calc.igst_amount; totalCgst += calc.cgst_amount; totalSgst += calc.sgst_amount;
      return { ...calc, sort_order: idx };
    });

    const totalTax = totalIgst + totalCgst + totalSgst;
    const discountAmount = parseFloat(data.discount_amount) || 0;
    const shippingCharge = parseFloat(data.shipping_charge) || 0;
    data.sub_total = parseFloat(subTotal.toFixed(2));
    data.igst_amount = parseFloat(totalIgst.toFixed(2));
    data.cgst_amount = parseFloat(totalCgst.toFixed(2));
    data.sgst_amount = parseFloat(totalSgst.toFixed(2));
    data.total_tax = parseFloat(totalTax.toFixed(2));
    data.total_amount = parseFloat((subTotal - discountAmount + totalTax + shippingCharge).toFixed(2));

    const [po] = await db('purchase_orders').insert(data).returning('*');
    if (calcItems.length > 0) {
      await db('purchase_order_items').insert(calcItems.map((item) => ({
        purchase_order_id: po.id, item_id: item.item_id || null, item_name: item.item_name,
        description: item.description, hsn_code: item.hsn_code, ordered_quantity: item.ordered_quantity,
        received_quantity: item.received_quantity || 0, unit: item.unit, rate: item.rate,
        discount_percent: item.discount_percent, discount_amount: item.discount_amount,
        gst_rate: item.gst_rate, igst_amount: item.igst_amount, cgst_amount: item.cgst_amount,
        sgst_amount: item.sgst_amount, amount: item.amount, sort_order: item.sort_order,
      })));
    }
    const savedItems = await db('purchase_order_items').where({ purchase_order_id: po.id }).orderBy('sort_order');
    res.status(201).json({ data: { ...po, items: savedItems } });
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { items, ...data } = req.body;
    const existing = await db('purchase_orders').where({ id }).first();
    if (!existing) return res.status(404).json({ error: 'Purchase order not found' });

    if (items) {
      const company = await db('company_profile').first();
      const vendorId = data.vendor_id || existing.vendor_id;
      const vendor = await db('vendors').where({ id: vendorId }).first();

      let subTotal = 0, totalIgst = 0, totalCgst = 0, totalSgst = 0;
      const calcItems = items.map((item, idx) => {
        const calc = calculateLineItem(item, company?.state, vendor?.place_of_supply, company?.gstin, vendor?.gstin);
        subTotal += calc.amount; totalIgst += calc.igst_amount; totalCgst += calc.cgst_amount; totalSgst += calc.sgst_amount;
        return { ...calc, sort_order: idx };
      });

      const totalTax = totalIgst + totalCgst + totalSgst;
      const discountAmount = parseFloat(data.discount_amount ?? existing.discount_amount) || 0;
      const shippingCharge = parseFloat(data.shipping_charge ?? existing.shipping_charge) || 0;
      data.sub_total = parseFloat(subTotal.toFixed(2));
      data.igst_amount = parseFloat(totalIgst.toFixed(2));
      data.cgst_amount = parseFloat(totalCgst.toFixed(2));
      data.sgst_amount = parseFloat(totalSgst.toFixed(2));
      data.total_tax = parseFloat(totalTax.toFixed(2));
      data.total_amount = parseFloat((subTotal - discountAmount + totalTax + shippingCharge).toFixed(2));

      await db('purchase_order_items').where({ purchase_order_id: id }).del();
      if (calcItems.length > 0) {
        await db('purchase_order_items').insert(calcItems.map((item) => ({
          purchase_order_id: id, item_id: item.item_id || null, item_name: item.item_name,
          description: item.description, hsn_code: item.hsn_code, ordered_quantity: item.ordered_quantity,
          received_quantity: item.received_quantity || 0, unit: item.unit, rate: item.rate,
          discount_percent: item.discount_percent, discount_amount: item.discount_amount,
          gst_rate: item.gst_rate, igst_amount: item.igst_amount, cgst_amount: item.cgst_amount,
          sgst_amount: item.sgst_amount, amount: item.amount, sort_order: item.sort_order,
        })));
      }
    }

    data.updated_at = new Date();
    const [updated] = await db('purchase_orders').where({ id }).update(data).returning('*');
    const savedItems = await db('purchase_order_items').where({ purchase_order_id: id }).orderBy('sort_order');
    res.json({ data: { ...updated, items: savedItems } });
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const po = await db('purchase_orders').where({ id }).first();
    if (!po) return res.status(404).json({ error: 'Purchase order not found' });
    if (po.status !== 'Draft') return res.status(400).json({ error: 'Can only delete Draft purchase orders' });

    await db('purchase_order_items').where({ purchase_order_id: id }).del();
    await db('purchase_orders').where({ id }).del();
    res.json({ message: 'Purchase order deleted successfully' });
  } catch (err) { next(err); }
};

module.exports = { list, getById, create, update, remove };
