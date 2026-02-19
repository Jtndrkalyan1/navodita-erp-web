const db = require('../config/database');

async function generatePaymentMadeNumber() {
  const settings = await db('invoice_number_settings').where({ document_type: 'PaymentMade' }).first();
  if (settings) {
    const nextNumber = settings.next_number || 1;
    const padded = String(nextNumber).padStart(settings.padding_digits || 4, '0');
    const formatted = `${settings.prefix || 'PMT-M'}${settings.separator || '-'}${padded}`;
    await db('invoice_number_settings').where({ id: settings.id }).update({ next_number: nextNumber + 1, updated_at: new Date() });
    return formatted;
  }
  const [{ count }] = await db('payments_made').count();
  return `PMT-M-${String(parseInt(count) + 1).padStart(4, '0')}`;
}

const list = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, search, sort_by, sort_order = 'desc', vendor_id, payment_mode, start_date, end_date } = req.query;
    const offset = (page - 1) * limit;

    let query = db('payments_made')
      .leftJoin('vendors', 'payments_made.vendor_id', 'vendors.id')
      .select('payments_made.*', 'vendors.display_name as vendor_name');

    if (vendor_id) query = query.where('payments_made.vendor_id', vendor_id);
    if (payment_mode) query = query.where('payments_made.payment_mode', payment_mode);
    if (start_date) query = query.where('payments_made.payment_date', '>=', start_date);
    if (end_date) query = query.where('payments_made.payment_date', '<=', end_date);
    if (search) {
      query = query.where(function () {
        this.where('payments_made.payment_number', 'ilike', `%${search}%`)
          .orWhere('vendors.display_name', 'ilike', `%${search}%`)
          .orWhere('payments_made.reference_number', 'ilike', `%${search}%`);
      });
    }

    const [{ count }] = await query.clone().clearSelect().count('payments_made.id');
    const data = await query.orderBy(sort_by ? `payments_made.${sort_by}` : 'payments_made.created_at', sort_order).limit(limit).offset(offset);
    res.json({ data, total: parseInt(count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { next(err); }
};

const getStats = async (req, res, next) => {
  try {
    const { vendor_id, payment_mode, start_date, end_date, search } = req.query;
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const todayStr = today.toISOString().split('T')[0];

    let query = db('payments_made')
      .leftJoin('vendors', 'payments_made.vendor_id', 'vendors.id');

    if (vendor_id) query = query.where('payments_made.vendor_id', vendor_id);
    if (payment_mode) query = query.where('payments_made.payment_mode', payment_mode);
    if (start_date) query = query.where('payments_made.payment_date', '>=', start_date);
    if (end_date) query = query.where('payments_made.payment_date', '<=', end_date);
    if (search) {
      query = query.where(function () {
        this.where('payments_made.payment_number', 'ilike', `%${search}%`)
          .orWhere('vendors.display_name', 'ilike', `%${search}%`)
          .orWhere('payments_made.reference_number', 'ilike', `%${search}%`);
      });
    }

    const [row] = await query.select(
      db.raw('COUNT(payments_made.id) as total_count'),
      db.raw('COALESCE(SUM(payments_made.amount), 0) as total_amount'),
      db.raw(`COUNT(CASE WHEN payments_made.payment_date >= '${monthStart}' AND payments_made.payment_date <= '${todayStr}' THEN 1 END) as this_month_count`)
    );

    res.json({
      totalPayments: parseInt(row.total_count) || 0,
      totalAmount: parseFloat(row.total_amount) || 0,
      thisMonth: parseInt(row.this_month_count) || 0,
    });
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const payment = await db('payments_made')
      .leftJoin('vendors', 'payments_made.vendor_id', 'vendors.id')
      .select('payments_made.*', 'vendors.display_name as vendor_name')
      .where('payments_made.id', id).first();
    if (!payment) return res.status(404).json({ error: 'Payment not found' });

    const allocations = await db('payment_made_allocations')
      .leftJoin('bills', 'payment_made_allocations.bill_id', 'bills.id')
      .select(
        'payment_made_allocations.*',
        'bills.bill_number',
        'bills.total_amount as bill_total',
        'bills.balance_due as bill_balance'
      )
      .where('payment_made_allocations.payment_made_id', id);

    res.json({ data: { ...payment, allocations } });
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const { allocations, ...data } = req.body;
    if (!data.vendor_id || !data.payment_date || !data.amount) {
      return res.status(400).json({ error: 'Vendor, date, and amount are required' });
    }
    if (!data.payment_number) data.payment_number = await generatePaymentMadeNumber();

    // Multi-currency: if currency is not INR, store original_amount and compute INR amount
    const currencyCode = data.currency_code || 'INR';
    const exchangeRate = parseFloat(data.exchange_rate) || 1;
    if (currencyCode !== 'INR' && data.original_amount != null) {
      const originalAmount = parseFloat(data.original_amount);
      data.original_amount = originalAmount;
      data.exchange_rate = exchangeRate;
      data.amount = parseFloat((originalAmount * exchangeRate).toFixed(2));
    } else {
      // INR payment: original_amount mirrors the amount, rate is 1
      data.original_amount = parseFloat(data.amount);
      data.exchange_rate = 1;
      data.currency_code = 'INR';
    }

    const [payment] = await db('payments_made').insert(data).returning('*');

    let totalAllocated = 0;
    if (allocations && allocations.length > 0) {
      for (const alloc of allocations) {
        const allocatedAmount = parseFloat(alloc.allocated_amount || alloc.apply_amount) || 0;
        if (allocatedAmount <= 0) continue;

        await db('payment_made_allocations').insert({
          payment_made_id: payment.id,
          bill_id: alloc.bill_id,
          allocated_amount: allocatedAmount,
        });

        // Update bill paid amount and balance
        const bill = await db('bills').where({ id: alloc.bill_id }).first();
        if (bill) {
          const newPaid = parseFloat(bill.amount_paid) + allocatedAmount;
          const newBalance = parseFloat(bill.total_amount) - newPaid;
          let newStatus = bill.status;

          if (newBalance <= 0) {
            newStatus = 'Paid';
          } else if (newPaid > 0) {
            newStatus = 'Partial';
          }

          await db('bills').where({ id: alloc.bill_id }).update({
            amount_paid: parseFloat(newPaid.toFixed(2)),
            balance_due: parseFloat(Math.max(newBalance, 0).toFixed(2)),
            status: newStatus,
            updated_at: new Date(),
          });
        }

        totalAllocated += allocatedAmount;
      }
    }

    // Calculate excess amount
    const excessAmount = parseFloat(data.amount) - totalAllocated;
    if (excessAmount > 0) {
      await db('payments_made').where({ id: payment.id }).update({
        excess_amount: parseFloat(excessAmount.toFixed(2)),
      });
    }

    const savedAllocations = await db('payment_made_allocations')
      .where({ payment_made_id: payment.id });

    res.status(201).json({ data: { ...payment, allocations: savedAllocations } });
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { allocations, ...data } = req.body;
    const existing = await db('payments_made').where({ id }).first();
    if (!existing) return res.status(404).json({ error: 'Payment not found' });

    // Multi-currency: recalculate INR amount if foreign currency
    const currencyCode = data.currency_code || existing.currency_code || 'INR';
    const exchangeRate = parseFloat(data.exchange_rate) || 1;
    if (currencyCode !== 'INR' && data.original_amount != null) {
      const originalAmount = parseFloat(data.original_amount);
      data.original_amount = originalAmount;
      data.exchange_rate = exchangeRate;
      data.amount = parseFloat((originalAmount * exchangeRate).toFixed(2));
    } else if (currencyCode === 'INR' && data.amount != null) {
      data.original_amount = parseFloat(data.amount);
      data.exchange_rate = 1;
      data.currency_code = 'INR';
    }

    data.updated_at = new Date();
    const [updated] = await db('payments_made').where({ id }).update(data).returning('*');
    res.json({ data: updated });
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const payment = await db('payments_made').where({ id }).first();
    if (!payment) return res.status(404).json({ error: 'Payment not found' });

    // Reverse bill allocations
    const allocations = await db('payment_made_allocations')
      .where({ payment_made_id: id });

    for (const alloc of allocations) {
      const bill = await db('bills').where({ id: alloc.bill_id }).first();
      if (bill) {
        const newPaid = Math.max(parseFloat(bill.amount_paid) - parseFloat(alloc.allocated_amount), 0);
        const newBalance = parseFloat(bill.total_amount) - newPaid;
        let newStatus = 'Pending';
        if (newPaid >= parseFloat(bill.total_amount)) newStatus = 'Paid';
        else if (newPaid > 0) newStatus = 'Partial';

        await db('bills').where({ id: alloc.bill_id }).update({
          amount_paid: parseFloat(newPaid.toFixed(2)),
          balance_due: parseFloat(newBalance.toFixed(2)),
          status: newStatus,
          updated_at: new Date(),
        });
      }
    }

    await db('payment_made_allocations').where({ payment_made_id: id }).del();
    await db('payments_made').where({ id }).del();

    res.json({ message: 'Payment deleted and bill balances reversed' });
  } catch (err) { next(err); }
};

module.exports = { list, getStats, getById, create, update, remove };
