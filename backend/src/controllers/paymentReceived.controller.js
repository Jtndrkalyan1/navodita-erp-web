const db = require('../config/database');

async function generatePaymentReceivedNumber() {
  const settings = await db('invoice_number_settings').where({ document_type: 'PaymentReceived' }).first();
  if (settings) {
    const nextNumber = settings.next_number || 1;
    const padded = String(nextNumber).padStart(settings.padding_digits || 4, '0');
    const formatted = `${settings.prefix || 'PMT-R'}${settings.separator || '-'}${padded}`;
    await db('invoice_number_settings').where({ id: settings.id }).update({ next_number: nextNumber + 1, updated_at: new Date() });
    return formatted;
  }
  const [{ count }] = await db('payments_received').count();
  return `PMT-R-${String(parseInt(count) + 1).padStart(4, '0')}`;
}

const list = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, search, sort_by, sort_order = 'desc', customer_id, payment_mode, start_date, end_date } = req.query;
    const offset = (page - 1) * limit;

    let query = db('payments_received')
      .leftJoin('customers', 'payments_received.customer_id', 'customers.id')
      .select('payments_received.*', 'customers.display_name as customer_name');

    if (customer_id) query = query.where('payments_received.customer_id', customer_id);
    if (payment_mode) query = query.where('payments_received.payment_mode', payment_mode);
    if (start_date) query = query.where('payments_received.payment_date', '>=', start_date);
    if (end_date) query = query.where('payments_received.payment_date', '<=', end_date);
    if (search) {
      query = query.where(function () {
        this.where('payments_received.payment_number', 'ilike', `%${search}%`)
          .orWhere('customers.display_name', 'ilike', `%${search}%`)
          .orWhere('payments_received.reference_number', 'ilike', `%${search}%`);
      });
    }

    const [{ count }] = await query.clone().clearSelect().count('payments_received.id');
    const data = await query.orderBy(sort_by ? `payments_received.${sort_by}` : 'payments_received.created_at', sort_order).limit(limit).offset(offset);
    res.json({ data, total: parseInt(count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { next(err); }
};

const getStats = async (req, res, next) => {
  try {
    const { customer_id, payment_mode, start_date, end_date, search } = req.query;
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const todayStr = today.toISOString().split('T')[0];

    let query = db('payments_received')
      .leftJoin('customers', 'payments_received.customer_id', 'customers.id');

    if (customer_id) query = query.where('payments_received.customer_id', customer_id);
    if (payment_mode) query = query.where('payments_received.payment_mode', payment_mode);
    if (start_date) query = query.where('payments_received.payment_date', '>=', start_date);
    if (end_date) query = query.where('payments_received.payment_date', '<=', end_date);
    if (search) {
      query = query.where(function () {
        this.where('payments_received.payment_number', 'ilike', `%${search}%`)
          .orWhere('customers.display_name', 'ilike', `%${search}%`)
          .orWhere('payments_received.reference_number', 'ilike', `%${search}%`);
      });
    }

    const [row] = await query.select(
      db.raw('COUNT(payments_received.id) as total_count'),
      db.raw('COALESCE(SUM(payments_received.amount), 0) as total_amount'),
      db.raw(`COUNT(CASE WHEN payments_received.payment_date >= '${monthStart}' AND payments_received.payment_date <= '${todayStr}' THEN 1 END) as this_month_count`)
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
    const payment = await db('payments_received')
      .leftJoin('customers', 'payments_received.customer_id', 'customers.id')
      .select('payments_received.*', 'customers.display_name as customer_name')
      .where('payments_received.id', id).first();
    if (!payment) return res.status(404).json({ error: 'Payment not found' });

    // Get invoice allocations
    const allocations = await db('payment_received_allocations')
      .leftJoin('invoices', 'payment_received_allocations.invoice_id', 'invoices.id')
      .select(
        'payment_received_allocations.*',
        'invoices.invoice_number',
        'invoices.total_amount as invoice_total',
        'invoices.balance_due as invoice_balance'
      )
      .where('payment_received_allocations.payment_received_id', id);

    res.json({ data: { ...payment, allocations } });
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const { allocations, ...data } = req.body;
    if (!data.customer_id || !data.payment_date || !data.amount) {
      return res.status(400).json({ error: 'Customer, date, and amount are required' });
    }
    if (!data.payment_number) data.payment_number = await generatePaymentReceivedNumber();

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

    const [payment] = await db('payments_received').insert(data).returning('*');

    // Process invoice allocations
    let totalAllocated = 0;
    if (allocations && allocations.length > 0) {
      for (const alloc of allocations) {
        const allocatedAmount = parseFloat(alloc.allocated_amount || alloc.apply_amount) || 0;
        if (allocatedAmount <= 0) continue;

        await db('payment_received_allocations').insert({
          payment_received_id: payment.id,
          invoice_id: alloc.invoice_id,
          allocated_amount: allocatedAmount,
        });

        // Update invoice paid amount and balance
        const invoice = await db('invoices').where({ id: alloc.invoice_id }).first();
        if (invoice) {
          const newPaid = parseFloat(invoice.amount_paid) + allocatedAmount;
          const newBalance = parseFloat(invoice.total_amount) - newPaid;
          let newStatus = invoice.status;

          if (newBalance <= 0) {
            newStatus = 'Paid';
          } else if (newPaid > 0) {
            newStatus = 'Partial';
          }

          await db('invoices').where({ id: alloc.invoice_id }).update({
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
      await db('payments_received').where({ id: payment.id }).update({
        excess_amount: parseFloat(excessAmount.toFixed(2)),
      });
    }

    const savedAllocations = await db('payment_received_allocations')
      .where({ payment_received_id: payment.id });

    res.status(201).json({ data: { ...payment, allocations: savedAllocations } });
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { allocations, ...data } = req.body;
    const existing = await db('payments_received').where({ id }).first();
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
    const [updated] = await db('payments_received').where({ id }).update(data).returning('*');

    res.json({ data: updated });
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const payment = await db('payments_received').where({ id }).first();
    if (!payment) return res.status(404).json({ error: 'Payment not found' });

    // Reverse invoice allocations
    const allocations = await db('payment_received_allocations')
      .where({ payment_received_id: id });

    for (const alloc of allocations) {
      const invoice = await db('invoices').where({ id: alloc.invoice_id }).first();
      if (invoice) {
        const newPaid = Math.max(parseFloat(invoice.amount_paid) - parseFloat(alloc.allocated_amount), 0);
        const newBalance = parseFloat(invoice.total_amount) - newPaid;
        let newStatus = 'Final';
        if (newPaid >= parseFloat(invoice.total_amount)) newStatus = 'Paid';
        else if (newPaid > 0) newStatus = 'Partial';

        await db('invoices').where({ id: alloc.invoice_id }).update({
          amount_paid: parseFloat(newPaid.toFixed(2)),
          balance_due: parseFloat(newBalance.toFixed(2)),
          status: newStatus,
          updated_at: new Date(),
        });
      }
    }

    await db('payment_received_allocations').where({ payment_received_id: id }).del();
    await db('payments_received').where({ id }).del();

    res.json({ message: 'Payment deleted and invoice balances reversed' });
  } catch (err) { next(err); }
};

module.exports = { list, getStats, getById, create, update, remove };
