const db = require('../config/database');

// ── Helpers ──────────────────────────────────────────────────────

function calcOrderFields(data) {
  const orderQty = parseInt(data.order_qty) || 0;
  const tailorRate = parseFloat(data.tailor_rate) || 0;
  const fob = parseFloat(data.fob) || 0;
  const costIncure = parseFloat(data.cost_incure) || 0;

  const totalTailorCost = tailorRate * orderQty;
  const fobTotal = fob * orderQty;
  const costIncureValue = costIncure * orderQty;
  const profit = fob - tailorRate - costIncure;
  const profitValue = profit * orderQty;
  const profitPercentage = fob > 0 ? profit / fob : 0;

  return {
    total_tailor_cost: parseFloat(totalTailorCost.toFixed(2)),
    fob_total: parseFloat(fobTotal.toFixed(2)),
    cost_incure_value: parseFloat(costIncureValue.toFixed(2)),
    profit: parseFloat(profit.toFixed(2)),
    profit_value: parseFloat(profitValue.toFixed(2)),
    profit_percentage: parseFloat(profitPercentage.toFixed(6)),
  };
}

// ── List orders (filter by month_year) ───────────────────────────

const list = async (req, res, next) => {
  try {
    const { month_year, page = 1, limit = 200 } = req.query;
    const offset = (page - 1) * limit;

    let query = db('investor_orders').where('is_active', true);

    if (month_year) {
      query = query.where('month_year', month_year);
    }

    const countQuery = query.clone().count('id');
    const [{ count }] = await countQuery;

    const data = await query
      .orderBy('s_no', 'asc')
      .limit(limit)
      .offset(offset);

    res.json({ data, total: parseInt(count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    next(err);
  }
};

// ── Get single order ────────────────────────────────────────────

const getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const order = await db('investor_orders').where({ id }).first();
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json({ data: order });
  } catch (err) {
    next(err);
  }
};

// ── Create order ────────────────────────────────────────────────

const create = async (req, res, next) => {
  try {
    const orderData = { ...req.body };

    if (!orderData.month_year || !orderData.buyer) {
      return res.status(400).json({ error: 'Month/year and buyer are required' });
    }

    // Sanitize date fields — empty strings break PostgreSQL date columns
    if (orderData.order_receipt_date === '' || orderData.order_receipt_date === null) {
      orderData.order_receipt_date = null;
    }

    // Auto-calculate fields
    const calculated = calcOrderFields(orderData);
    Object.assign(orderData, calculated);

    // Auto s_no: max s_no in month + 1
    if (!orderData.s_no) {
      const [maxRow] = await db('investor_orders')
        .where({ month_year: orderData.month_year, is_active: true })
        .max('s_no as max_sno');
      orderData.s_no = (maxRow.max_sno || 0) + 1;
    }

    const [order] = await db('investor_orders').insert(orderData).returning('*');

    res.status(201).json({ data: order });
  } catch (err) {
    next(err);
  }
};

// ── Update order ────────────────────────────────────────────────

const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const orderData = { ...req.body };

    const existing = await db('investor_orders').where({ id }).first();
    if (!existing) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Sanitize date fields
    if (orderData.order_receipt_date === '') orderData.order_receipt_date = null;

    // Re-calculate
    const merged = { ...existing, ...orderData };
    const calculated = calcOrderFields(merged);
    Object.assign(orderData, calculated);
    orderData.updated_at = new Date();

    const [updated] = await db('investor_orders')
      .where({ id })
      .update(orderData)
      .returning('*');

    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
};

// ── Delete order ────────────────────────────────────────────────

const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const order = await db('investor_orders').where({ id }).first();
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const monthYear = order.month_year;

    await db('investor_orders').where({ id }).del();

    // Renumber serial numbers for remaining active orders in the same month
    const remaining = await db('investor_orders')
      .where({ month_year: monthYear, is_active: true })
      .orderBy('s_no', 'asc');

    for (let i = 0; i < remaining.length; i++) {
      const newSno = i + 1;
      if (remaining[i].s_no !== newSno) {
        await db('investor_orders')
          .where({ id: remaining[i].id })
          .update({ s_no: newSno });
      }
    }

    res.json({ message: 'Order deleted successfully' });
  } catch (err) {
    next(err);
  }
};

// ── Get all monthly summaries (Master Book) ─────────────────────

const listSummaries = async (req, res, next) => {
  try {
    const data = await db('investor_monthly_summary')
      .orderByRaw("year ASC, CASE month WHEN 'Jan' THEN 1 WHEN 'Feb' THEN 2 WHEN 'Mar' THEN 3 WHEN 'Apr' THEN 4 WHEN 'May' THEN 5 WHEN 'Jun' THEN 6 WHEN 'Jul' THEN 7 WHEN 'Aug' THEN 8 WHEN 'Sep' THEN 9 WHEN 'Oct' THEN 10 WHEN 'Nov' THEN 11 WHEN 'Dec' THEN 12 END ASC");

    res.json({ data });
  } catch (err) {
    next(err);
  }
};

// ── Get specific monthly summary ────────────────────────────────

const getSummary = async (req, res, next) => {
  try {
    const { monthYear } = req.params;
    const summary = await db('investor_monthly_summary')
      .where({ month_year: monthYear })
      .first();

    if (!summary) {
      return res.status(404).json({ error: 'Summary not found for this month' });
    }

    res.json({ data: summary });
  } catch (err) {
    next(err);
  }
};

// ── Create / Update monthly summary ────────────────────────────

const upsertSummary = async (req, res, next) => {
  try {
    const summaryData = { ...req.body };

    if (!summaryData.month_year) {
      return res.status(400).json({ error: 'month_year is required' });
    }

    // Calculate total fix cost
    const fixCostFields = [
      'building_rent', 'mechanic', 'worker_salary', 'supervisor',
      'merchant', 'house_keeping', 'water_sewage', 'office_expenses',
      'petrol', 'electricity',
    ];
    let totalFixCost = 0;
    fixCostFields.forEach((field) => {
      if (summaryData[field] !== undefined) {
        totalFixCost += parseFloat(summaryData[field]) || 0;
      }
    });
    if (totalFixCost > 0) {
      summaryData.total_fix_cost = parseFloat(totalFixCost.toFixed(2));
    }

    // Calculate net profit
    const grossProfit = parseFloat(summaryData.gross_profit) || 0;
    const fixCost = parseFloat(summaryData.total_fix_cost) || totalFixCost;
    summaryData.net_profit = parseFloat((grossProfit - fixCost).toFixed(2));

    // Calculate percentages
    const revenue = parseFloat(summaryData.revenue) || 0;
    if (revenue > 0) {
      summaryData.gross_profit_percentage = parseFloat((grossProfit / revenue).toFixed(6));
      summaryData.net_profit_percentage = parseFloat((summaryData.net_profit / revenue).toFixed(6));
    }

    // Calculate partner shares from net profit
    const partners = await db('investor_partners').where({ is_active: true });
    const netProfit = summaryData.net_profit;
    partners.forEach((p) => {
      const share = parseFloat((netProfit * parseFloat(p.ratio)).toFixed(2));
      const key = p.partner_name.toLowerCase().replace(/\s+/g, '_') + '_share';
      // Map partner names to column names
      if (p.partner_name === 'Jitender') summaryData.jitender_share = share;
      if (p.partner_name === 'Pawan') summaryData.pawan_share = share;
      if (p.partner_name === 'Sunil Ji') summaryData.sunil_share = share;
      if (p.partner_name === 'Vijay') summaryData.vijay_share = share;
    });

    summaryData.updated_at = new Date();

    // Upsert
    const existing = await db('investor_monthly_summary')
      .where({ month_year: summaryData.month_year })
      .first();

    let result;
    if (existing) {
      [result] = await db('investor_monthly_summary')
        .where({ month_year: summaryData.month_year })
        .update(summaryData)
        .returning('*');
    } else {
      [result] = await db('investor_monthly_summary')
        .insert(summaryData)
        .returning('*');
    }

    res.json({ data: result });
  } catch (err) {
    next(err);
  }
};

// ── Get partner configuration ───────────────────────────────────

const getPartners = async (req, res, next) => {
  try {
    const data = await db('investor_partners')
      .where({ is_active: true })
      .orderBy('created_at', 'asc');

    res.json({ data });
  } catch (err) {
    next(err);
  }
};

// ── Update partner configuration ────────────────────────────────

const updatePartners = async (req, res, next) => {
  try {
    const { partners } = req.body;

    if (!Array.isArray(partners)) {
      return res.status(400).json({ error: 'partners must be an array' });
    }

    // Validate total ratio = 1
    const totalRatio = partners.reduce((sum, p) => sum + (parseFloat(p.ratio) || 0), 0);
    if (Math.abs(totalRatio - 1) > 0.001) {
      return res.status(400).json({ error: 'Partner ratios must sum to 100%' });
    }

    // Delete existing and re-insert
    await db('investor_partners').del();
    const rows = partners.map((p) => ({
      partner_name: p.partner_name,
      investment_amount: parseFloat(p.investment_amount) || 0,
      ratio: parseFloat(p.ratio) || 0,
      partner_type: p.partner_type || 'Investment',
      is_active: true,
    }));

    const data = await db('investor_partners').insert(rows).returning('*');

    res.json({ data });
  } catch (err) {
    next(err);
  }
};

// ── Recalculate a month's summary from orders ──────────────────

const recalculate = async (req, res, next) => {
  try {
    const { monthYear } = req.params;

    // Get all orders for this month
    const orders = await db('investor_orders')
      .where({ month_year: monthYear, is_active: true });

    if (orders.length === 0) {
      return res.status(404).json({ error: 'No orders found for this month' });
    }

    // Calculate totals
    let totalQty = 0;
    let totalTailorCost = 0;
    let totalFob = 0;
    let totalCostIncure = 0;
    let totalProfitValue = 0;

    orders.forEach((o) => {
      totalQty += parseInt(o.order_qty) || 0;
      totalTailorCost += parseFloat(o.total_tailor_cost) || 0;
      totalFob += parseFloat(o.fob_total) || 0;
      totalCostIncure += parseFloat(o.cost_incure_value) || 0;
      totalProfitValue += parseFloat(o.profit_value) || 0;
    });

    // Get or create summary
    const existing = await db('investor_monthly_summary')
      .where({ month_year: monthYear })
      .first();

    const summaryData = {
      month_year: monthYear,
      month: orders[0].month,
      year: orders[0].year,
      total_qty: totalQty,
      total_tailor_cost: parseFloat(totalTailorCost.toFixed(2)),
      revenue: parseFloat(totalFob.toFixed(2)),
      gross_profit: parseFloat(totalProfitValue.toFixed(2)),
      profit: parseFloat(totalProfitValue.toFixed(2)),
    };

    // Preserve fix costs from existing or use defaults
    const fixCostFields = [
      'building_rent', 'mechanic', 'worker_salary', 'supervisor',
      'merchant', 'house_keeping', 'water_sewage', 'office_expenses',
      'petrol', 'electricity',
    ];

    let totalFixCost = 0;
    fixCostFields.forEach((field) => {
      const val = existing ? (parseFloat(existing[field]) || 0) : getDefaultFixCost(field);
      summaryData[field] = val;
      totalFixCost += val;
    });

    summaryData.total_fix_cost = parseFloat(totalFixCost.toFixed(2));
    summaryData.net_profit = parseFloat((totalProfitValue - totalFixCost).toFixed(2));

    if (totalFob > 0) {
      summaryData.gross_profit_percentage = parseFloat((totalProfitValue / totalFob).toFixed(6));
      summaryData.net_profit_percentage = parseFloat((summaryData.net_profit / totalFob).toFixed(6));
    }
    summaryData.profit_percentage = summaryData.gross_profit_percentage || 0;

    // Calculate partner shares
    const partners = await db('investor_partners').where({ is_active: true });
    const netProfit = summaryData.net_profit;
    partners.forEach((p) => {
      const share = parseFloat((netProfit * parseFloat(p.ratio)).toFixed(2));
      if (p.partner_name === 'Jitender') summaryData.jitender_share = share;
      if (p.partner_name === 'Pawan') summaryData.pawan_share = share;
      if (p.partner_name === 'Sunil Ji') summaryData.sunil_share = share;
      if (p.partner_name === 'Vijay') summaryData.vijay_share = share;
    });

    summaryData.updated_at = new Date();

    let result;
    if (existing) {
      [result] = await db('investor_monthly_summary')
        .where({ month_year: monthYear })
        .update(summaryData)
        .returning('*');
    } else {
      [result] = await db('investor_monthly_summary')
        .insert(summaryData)
        .returning('*');
    }

    res.json({ data: result });
  } catch (err) {
    next(err);
  }
};

function getDefaultFixCost(field) {
  const defaults = {
    building_rent: 50000,
    mechanic: 6000,
    worker_salary: 12000,
    supervisor: 25000,
    merchant: 13000,
    house_keeping: 8000,
    water_sewage: 2000,
    office_expenses: 25000,
    petrol: 10000,
    electricity: 20000,
  };
  return defaults[field] || 0;
}

// ── Get available months ────────────────────────────────────────

const getMonths = async (req, res, next) => {
  try {
    const months = await db('investor_monthly_summary')
      .select('month_year', 'month', 'year')
      .orderByRaw("year DESC, CASE month WHEN 'Jan' THEN 1 WHEN 'Feb' THEN 2 WHEN 'Mar' THEN 3 WHEN 'Apr' THEN 4 WHEN 'May' THEN 5 WHEN 'Jun' THEN 6 WHEN 'Jul' THEN 7 WHEN 'Aug' THEN 8 WHEN 'Sep' THEN 9 WHEN 'Oct' THEN 10 WHEN 'Nov' THEN 11 WHEN 'Dec' THEN 12 END DESC");

    res.json({ data: months });
  } catch (err) {
    next(err);
  }
};


// ── Create next month entry ─────────────────────────────────────

const createNextMonth = async (req, res, next) => {
  try {
    const { monthYear } = req.params;

    if (!monthYear) {
      return res.status(400).json({ error: 'monthYear parameter is required' });
    }

    // Parse month_year format like "Feb'26"
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const match = monthYear.match(/^([A-Za-z]{3})'(\d{2})$/);

    if (!match) {
      return res.status(400).json({ error: 'Invalid month_year format. Expected format: "Feb\'26"' });
    }

    const currentMonth = match[1];
    const currentYear = parseInt(match[2]);
    const monthIndex = monthNames.indexOf(currentMonth);

    if (monthIndex === -1) {
      return res.status(400).json({ error: 'Invalid month name' });
    }

    // Calculate next month
    let nextMonthIndex = monthIndex + 1;
    let nextYear = currentYear;
    if (nextMonthIndex > 11) {
      nextMonthIndex = 0;
      nextYear = currentYear + 1;
    }

    const nextMonth = monthNames[nextMonthIndex];
    const nextMonthYear = `${nextMonth}'${String(nextYear).padStart(2, '0')}`;

    // Check if next month already exists
    const existing = await db('investor_monthly_summary')
      .where({ month_year: nextMonthYear })
      .first();

    if (existing) {
      return res.status(409).json({ error: `Month ${nextMonthYear} already exists` });
    }

    // Build summary with default fix costs and zero revenue/profit/qty
    const fixCostFields = [
      'building_rent', 'mechanic', 'worker_salary', 'supervisor',
      'merchant', 'house_keeping', 'water_sewage', 'office_expenses',
      'petrol', 'electricity',
    ];

    const summaryData = {
      month_year: nextMonthYear,
      month: nextMonth,
      year: nextYear,
      total_qty: 0,
      total_tailor_cost: 0,
      revenue: 0,
      gross_profit: 0,
      gross_profit_percentage: 0,
      profit: 0,
      profit_percentage: 0,
      net_profit: 0,
      net_profit_percentage: 0,
      jitender_share: 0,
      pawan_share: 0,
      sunil_share: 0,
      vijay_share: 0,
    };

    let totalFixCost = 0;
    fixCostFields.forEach((field) => {
      const val = getDefaultFixCost(field);
      summaryData[field] = val;
      totalFixCost += val;
    });

    summaryData.total_fix_cost = parseFloat(totalFixCost.toFixed(2));

    const [result] = await db('investor_monthly_summary')
      .insert(summaryData)
      .returning('*');

    res.status(201).json({ data: result });
  } catch (err) {
    next(err);
  }
};


// ── Get single partner by ID ────────────────────────────────────

const getPartnerById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const partner = await db('investor_partners').where({ id }).first();
    if (!partner) {
      return res.status(404).json({ error: 'Partner not found' });
    }
    res.json({ data: partner });
  } catch (err) {
    next(err);
  }
};

// ── Create a new partner ────────────────────────────────────────

const createPartner = async (req, res, next) => {
  try {
    const data = { ...req.body };

    if (!data.partner_name) {
      return res.status(400).json({ error: 'partner_name is required' });
    }

    const partnerData = {
      partner_name: data.partner_name,
      phone: data.phone || null,
      email: data.email || null,
      address: data.address || null,
      pan: data.pan || null,
      aadhar: data.aadhar || null,
      bank_name: data.bank_name || null,
      bank_account_number: data.bank_account_number || null,
      bank_ifsc: data.bank_ifsc || null,
      ratio: parseFloat(data.ratio) || 0,
      investment_amount: parseFloat(data.investment_amount) || 0,
      partner_type: data.partner_type || 'Investment',
      notes: data.notes || null,
      is_active: true,
    };

    const [partner] = await db('investor_partners').insert(partnerData).returning('*');
    res.status(201).json({ data: partner });
  } catch (err) {
    next(err);
  }
};

// ── Update a partner by ID ──────────────────────────────────────

const updatePartner = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = { ...req.body };

    const existing = await db('investor_partners').where({ id }).first();
    if (!existing) {
      return res.status(404).json({ error: 'Partner not found' });
    }

    const updateData = {};
    const allowedFields = [
      'partner_name', 'phone', 'email', 'address', 'pan', 'aadhar',
      'bank_name', 'bank_account_number', 'bank_ifsc',
      'ratio', 'investment_amount', 'partner_type', 'notes', 'photo_url',
    ];

    allowedFields.forEach((field) => {
      if (data[field] !== undefined) {
        updateData[field] = data[field];
      }
    });

    if (updateData.ratio !== undefined) {
      updateData.ratio = parseFloat(updateData.ratio) || 0;
    }
    if (updateData.investment_amount !== undefined) {
      updateData.investment_amount = parseFloat(updateData.investment_amount) || 0;
    }

    updateData.updated_at = new Date();

    const [updated] = await db('investor_partners')
      .where({ id })
      .update(updateData)
      .returning('*');

    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
};

// ── Delete (soft) a partner ─────────────────────────────────────

const deletePartner = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await db('investor_partners').where({ id }).first();
    if (!existing) {
      return res.status(404).json({ error: 'Partner not found' });
    }

    await db('investor_partners')
      .where({ id })
      .update({ is_active: false, updated_at: new Date() });

    res.json({ message: 'Partner deleted successfully' });
  } catch (err) {
    next(err);
  }
};

// ── Get transactions for a partner ──────────────────────────────

const getPartnerTransactions = async (req, res, next) => {
  try {
    const { id } = req.params;

    const partner = await db('investor_partners').where({ id }).first();
    if (!partner) {
      return res.status(404).json({ error: 'Partner not found' });
    }

    const data = await db('investor_transactions')
      .where({ partner_id: id })
      .orderBy('transaction_date', 'desc');

    res.json({ data });
  } catch (err) {
    next(err);
  }
};

// ── Create a transaction for a partner ──────────────────────────

const createPartnerTransaction = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = { ...req.body };

    const partner = await db('investor_partners').where({ id }).first();
    if (!partner) {
      return res.status(404).json({ error: 'Partner not found' });
    }

    if (!data.transaction_date || !data.type || !data.amount) {
      return res.status(400).json({ error: 'transaction_date, type, and amount are required' });
    }

    const validTypes = ['received', 'returned', 'investment', 'withdrawal'];
    if (!validTypes.includes(data.type)) {
      return res.status(400).json({ error: `type must be one of: ${validTypes.join(', ')}` });
    }

    const txnData = {
      partner_id: parseInt(id),
      transaction_date: data.transaction_date,
      type: data.type,
      amount: parseFloat(data.amount),
      description: data.description || null,
      reference: data.reference || null,
      bank_transaction_id: data.bank_transaction_id || null,
    };

    const [txn] = await db('investor_transactions').insert(txnData).returning('*');
    res.status(201).json({ data: txn });
  } catch (err) {
    next(err);
  }
};

// ── Delete a transaction by ID ──────────────────────────────────

const deletePartnerTransaction = async (req, res, next) => {
  try {
    const { txnId } = req.params;

    const txn = await db('investor_transactions').where({ id: txnId }).first();
    if (!txn) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    await db('investor_transactions').where({ id: txnId }).del();

    res.json({ message: 'Transaction deleted successfully' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  list,
  getById,
  create,
  update,
  remove,
  listSummaries,
  getSummary,
  upsertSummary,
  getPartners,
  updatePartners,
  recalculate,
  getMonths,
  createNextMonth,
  getPartnerById,
  createPartner,
  updatePartner,
  deletePartner,
  getPartnerTransactions,
  createPartnerTransaction,
  deletePartnerTransaction,
};
