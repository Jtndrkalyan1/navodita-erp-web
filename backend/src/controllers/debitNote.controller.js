const db = require('../config/database');
const { splitGST } = require('../services/gst.service');

async function generateDebitNoteNumber() {
  const settings = await db('invoice_number_settings').where({ document_type: 'DebitNote' }).first();
  if (settings) {
    const nextNumber = settings.next_number || 1;
    const padded = String(nextNumber).padStart(settings.padding_digits || 4, '0');
    const formatted = `${settings.prefix || 'DN'}${settings.separator || '-'}${padded}`;
    await db('invoice_number_settings').where({ id: settings.id }).update({ next_number: nextNumber + 1, updated_at: new Date() });
    return formatted;
  }
  const [{ count }] = await db('debit_notes').count();
  return `DN-${String(parseInt(count) + 1).padStart(4, '0')}`;
}

function calculateLineItem(item, companyState, vendorState, companyGstin, vendorGstin) {
  const quantity = parseFloat(item.quantity) || 0;
  const rate = parseFloat(item.rate) || 0;
  const gstRate = parseFloat(item.gst_rate) || 0;
  const taxableAmount = quantity * rate;
  const totalGST = (taxableAmount * gstRate) / 100;
  const gstSplit = splitGST(totalGST, companyState, vendorState, companyGstin, vendorGstin);
  return {
    ...item, quantity, rate, gst_rate: gstRate,
    igst_amount: parseFloat(gstSplit.igst.toFixed(2)),
    cgst_amount: parseFloat(gstSplit.cgst.toFixed(2)),
    sgst_amount: parseFloat(gstSplit.sgst.toFixed(2)),
    amount: parseFloat(taxableAmount.toFixed(2)),
  };
}

const list = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, search, sort_by, sort_order = 'desc', status, vendor_id, start_date, end_date } = req.query;
    const offset = (page - 1) * limit;
    let query = db('debit_notes')
      .leftJoin('vendors', 'debit_notes.vendor_id', 'vendors.id')
      .select('debit_notes.*', 'vendors.display_name as vendor_name');

    if (status) query = query.where('debit_notes.status', status);
    if (vendor_id) query = query.where('debit_notes.vendor_id', vendor_id);
    if (start_date) query = query.where('debit_notes.debit_note_date', '>=', start_date);
    if (end_date) query = query.where('debit_notes.debit_note_date', '<=', end_date);
    if (search) {
      query = query.where(function () {
        this.where('debit_notes.debit_note_number', 'ilike', `%${search}%`)
          .orWhere('vendors.display_name', 'ilike', `%${search}%`);
      });
    }

    const [{ count }] = await query.clone().clearSelect().count('debit_notes.id');
    const data = await query.orderBy(sort_by ? `debit_notes.${sort_by}` : 'debit_notes.created_at', sort_order).limit(limit).offset(offset);
    res.json({ data, total: parseInt(count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const dn = await db('debit_notes')
      .leftJoin('vendors', 'debit_notes.vendor_id', 'vendors.id')
      .select('debit_notes.*', 'vendors.display_name as vendor_name')
      .where('debit_notes.id', id).first();
    if (!dn) return res.status(404).json({ error: 'Debit note not found' });

    const items = await db('debit_note_items').where({ debit_note_id: id }).orderBy('sort_order');

    let bill = null;
    if (dn.bill_id) {
      bill = await db('bills').select('id', 'bill_number', 'total_amount', 'status').where({ id: dn.bill_id }).first();
    }

    res.json({ data: { ...dn, items, linked_bill: bill } });
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const { items, ...data } = req.body;
    if (!data.vendor_id || !data.debit_note_date) return res.status(400).json({ error: 'Vendor and date are required' });
    if (!data.debit_note_number) data.debit_note_number = await generateDebitNoteNumber();

    const company = await db('company_profile').first();
    const vendor = await db('vendors').where({ id: data.vendor_id }).first();

    let subTotal = 0, totalIgst = 0, totalCgst = 0, totalSgst = 0;
    const calcItems = (items || []).map((item, idx) => {
      const calc = calculateLineItem(item, company?.state, vendor?.place_of_supply, company?.gstin, vendor?.gstin);
      subTotal += calc.amount; totalIgst += calc.igst_amount; totalCgst += calc.cgst_amount; totalSgst += calc.sgst_amount;
      return { ...calc, sort_order: idx };
    });

    const totalTax = totalIgst + totalCgst + totalSgst;
    data.sub_total = parseFloat(subTotal.toFixed(2));
    data.igst_amount = parseFloat(totalIgst.toFixed(2));
    data.cgst_amount = parseFloat(totalCgst.toFixed(2));
    data.sgst_amount = parseFloat(totalSgst.toFixed(2));
    data.total_tax = parseFloat(totalTax.toFixed(2));
    data.total_amount = parseFloat((subTotal + totalTax).toFixed(2));
    data.balance_amount = data.total_amount;

    const [dn] = await db('debit_notes').insert(data).returning('*');
    if (calcItems.length > 0) {
      await db('debit_note_items').insert(calcItems.map((item) => ({
        debit_note_id: dn.id, item_id: item.item_id || null, item_name: item.item_name,
        description: item.description, hsn_code: item.hsn_code, quantity: item.quantity, unit: item.unit,
        rate: item.rate, gst_rate: item.gst_rate, igst_amount: item.igst_amount, cgst_amount: item.cgst_amount,
        sgst_amount: item.sgst_amount, amount: item.amount, sort_order: item.sort_order,
      })));
    }
    const savedItems = await db('debit_note_items').where({ debit_note_id: dn.id }).orderBy('sort_order');
    res.status(201).json({ data: { ...dn, items: savedItems } });
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { items, ...data } = req.body;
    const existing = await db('debit_notes').where({ id }).first();
    if (!existing) return res.status(404).json({ error: 'Debit note not found' });

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
      data.sub_total = parseFloat(subTotal.toFixed(2));
      data.igst_amount = parseFloat(totalIgst.toFixed(2));
      data.cgst_amount = parseFloat(totalCgst.toFixed(2));
      data.sgst_amount = parseFloat(totalSgst.toFixed(2));
      data.total_tax = parseFloat(totalTax.toFixed(2));
      data.total_amount = parseFloat((subTotal + totalTax).toFixed(2));
      data.balance_amount = data.total_amount;

      await db('debit_note_items').where({ debit_note_id: id }).del();
      if (calcItems.length > 0) {
        await db('debit_note_items').insert(calcItems.map((item) => ({
          debit_note_id: id, item_id: item.item_id || null, item_name: item.item_name,
          description: item.description, hsn_code: item.hsn_code, quantity: item.quantity, unit: item.unit,
          rate: item.rate, gst_rate: item.gst_rate, igst_amount: item.igst_amount, cgst_amount: item.cgst_amount,
          sgst_amount: item.sgst_amount, amount: item.amount, sort_order: item.sort_order,
        })));
      }
    }

    data.updated_at = new Date();
    const [updated] = await db('debit_notes').where({ id }).update(data).returning('*');
    const savedItems = await db('debit_note_items').where({ debit_note_id: id }).orderBy('sort_order');
    res.json({ data: { ...updated, items: savedItems } });
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const dn = await db('debit_notes').where({ id }).first();
    if (!dn) return res.status(404).json({ error: 'Debit note not found' });
    if (dn.status !== 'Draft') return res.status(400).json({ error: 'Can only delete Draft debit notes' });

    await db('debit_note_items').where({ debit_note_id: id }).del();
    await db('debit_notes').where({ id }).del();
    res.json({ message: 'Debit note deleted successfully' });
  } catch (err) { next(err); }
};

module.exports = { list, getById, create, update, remove };
