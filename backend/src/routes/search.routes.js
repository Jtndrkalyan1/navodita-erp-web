const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const db = require('../config/database');

// Apply auth to all routes
router.use(authenticate);

/**
 * GET / - Global search across all entities
 * Query params:
 *   q     - search term (required, min 1 char)
 *   limit - max results per entity type (default 5, max 20)
 */
router.get('/', async (req, res) => {
  try {
    const { q, limit: limitParam } = req.query;

    if (!q || !q.trim()) {
      return res.status(400).json({ error: 'Search query "q" is required' });
    }

    const searchTerm = q.trim();
    const limit = Math.min(Math.max(parseInt(limitParam, 10) || 5, 1), 20);
    const pattern = `%${searchTerm}%`;

    // Run all searches in parallel
    const [
      customers,
      vendors,
      items,
      invoices,
      bills,
      quotations,
      purchaseOrders,
      employees,
      deliveryChallans,
      packingLists,
      creditNotes,
      debitNotes,
      expenses,
      paymentsReceived,
      paymentsMade,
    ] = await Promise.all([
      // --- Customers ---
      db('customers')
        .select('id', 'display_name', 'company_name', 'email', 'phone', 'gstin', 'opening_balance', 'created_at')
        .where((builder) => {
          builder
            .whereRaw('display_name ilike ?', [pattern])
            .orWhereRaw('company_name ilike ?', [pattern])
            .orWhereRaw('email ilike ?', [pattern])
            .orWhereRaw('phone ilike ?', [pattern])
            .orWhereRaw('gstin ilike ?', [pattern])
            .orWhereRaw('pan ilike ?', [pattern]);
        })
        .orderBy('display_name')
        .limit(limit),

      // --- Vendors ---
      db('vendors')
        .select('id', 'display_name', 'company_name', 'email', 'phone', 'gstin', 'opening_balance', 'created_at')
        .where((builder) => {
          builder
            .whereRaw('display_name ilike ?', [pattern])
            .orWhereRaw('company_name ilike ?', [pattern])
            .orWhereRaw('email ilike ?', [pattern])
            .orWhereRaw('phone ilike ?', [pattern])
            .orWhereRaw('gstin ilike ?', [pattern])
            .orWhereRaw('pan ilike ?', [pattern]);
        })
        .orderBy('display_name')
        .limit(limit),

      // --- Items ---
      db('items')
        .select('id', 'name', 'sku', 'hsn_code', 'selling_price', 'cost_price', 'item_type', 'created_at')
        .where((builder) => {
          builder
            .whereRaw('name ilike ?', [pattern])
            .orWhereRaw('sku ilike ?', [pattern])
            .orWhereRaw('hsn_code ilike ?', [pattern])
            .orWhereRaw('description ilike ?', [pattern]);
        })
        .orderBy('name')
        .limit(limit),

      // --- Invoices ---
      db('invoices')
        .select(
          'invoices.id',
          'invoices.invoice_number',
          'invoices.total_amount',
          'invoices.status',
          'invoices.invoice_date',
          'customers.display_name as customer_name'
        )
        .leftJoin('customers', 'invoices.customer_id', 'customers.id')
        .where((builder) => {
          builder
            .whereRaw('invoices.invoice_number ilike ?', [pattern])
            .orWhereRaw('invoices.reference_number ilike ?', [pattern])
            .orWhereRaw('customers.display_name ilike ?', [pattern]);
        })
        .orderBy('invoices.invoice_date', 'desc')
        .limit(limit),

      // --- Bills ---
      db('bills')
        .select(
          'bills.id',
          'bills.bill_number',
          'bills.total_amount',
          'bills.status',
          'bills.bill_date',
          'vendors.display_name as vendor_name'
        )
        .leftJoin('vendors', 'bills.vendor_id', 'vendors.id')
        .where((builder) => {
          builder
            .whereRaw('bills.bill_number ilike ?', [pattern])
            .orWhereRaw('bills.vendor_invoice_number ilike ?', [pattern])
            .orWhereRaw('bills.reference_number ilike ?', [pattern])
            .orWhereRaw('vendors.display_name ilike ?', [pattern]);
        })
        .orderBy('bills.bill_date', 'desc')
        .limit(limit),

      // --- Quotations ---
      db('quotations')
        .select(
          'quotations.id',
          'quotations.quotation_number',
          'quotations.total_amount',
          'quotations.status',
          'quotations.quotation_date',
          'customers.display_name as customer_name'
        )
        .leftJoin('customers', 'quotations.customer_id', 'customers.id')
        .where((builder) => {
          builder
            .whereRaw('quotations.quotation_number ilike ?', [pattern])
            .orWhereRaw('quotations.reference_number ilike ?', [pattern])
            .orWhereRaw('customers.display_name ilike ?', [pattern]);
        })
        .orderBy('quotations.quotation_date', 'desc')
        .limit(limit),

      // --- Purchase Orders ---
      db('purchase_orders')
        .select(
          'purchase_orders.id',
          'purchase_orders.po_number',
          'purchase_orders.total_amount',
          'purchase_orders.status',
          'purchase_orders.po_date',
          'vendors.display_name as vendor_name'
        )
        .leftJoin('vendors', 'purchase_orders.vendor_id', 'vendors.id')
        .where((builder) => {
          builder
            .whereRaw('purchase_orders.po_number ilike ?', [pattern])
            .orWhereRaw('purchase_orders.reference_number ilike ?', [pattern])
            .orWhereRaw('vendors.display_name ilike ?', [pattern]);
        })
        .orderBy('purchase_orders.po_date', 'desc')
        .limit(limit),

      // --- Employees ---
      db('employees')
        .select('id', 'employee_id', 'first_name', 'last_name', 'display_name', 'designation', 'work_email', 'mobile_number', 'created_at')
        .where((builder) => {
          builder
            .whereRaw('employee_id ilike ?', [pattern])
            .orWhereRaw('first_name ilike ?', [pattern])
            .orWhereRaw('last_name ilike ?', [pattern])
            .orWhereRaw('display_name ilike ?', [pattern])
            .orWhereRaw('work_email ilike ?', [pattern])
            .orWhereRaw('personal_email ilike ?', [pattern])
            .orWhereRaw('mobile_number ilike ?', [pattern])
            .orWhereRaw('designation ilike ?', [pattern]);
        })
        .orderByRaw("COALESCE(display_name, first_name || ' ' || last_name)")
        .limit(limit),

      // --- Delivery Challans ---
      db('delivery_challans')
        .select(
          'delivery_challans.id',
          'delivery_challans.challan_number',
          'delivery_challans.total_amount',
          'delivery_challans.status',
          'delivery_challans.challan_date',
          'customers.display_name as customer_name'
        )
        .leftJoin('customers', 'delivery_challans.customer_id', 'customers.id')
        .where((builder) => {
          builder
            .whereRaw('delivery_challans.challan_number ilike ?', [pattern])
            .orWhereRaw('customers.display_name ilike ?', [pattern]);
        })
        .orderBy('delivery_challans.challan_date', 'desc')
        .limit(limit),

      // --- Packing Lists ---
      db('packing_lists')
        .select(
          'packing_lists.id',
          'packing_lists.packing_list_number',
          'packing_lists.status',
          'packing_lists.packing_date',
          'customers.display_name as customer_name'
        )
        .leftJoin('customers', 'packing_lists.customer_id', 'customers.id')
        .where((builder) => {
          builder
            .whereRaw('packing_lists.packing_list_number ilike ?', [pattern])
            .orWhereRaw('packing_lists.tracking_number ilike ?', [pattern])
            .orWhereRaw('customers.display_name ilike ?', [pattern]);
        })
        .orderBy('packing_lists.packing_date', 'desc')
        .limit(limit),

      // --- Credit Notes ---
      db('credit_notes')
        .select(
          'credit_notes.id',
          'credit_notes.credit_note_number',
          'credit_notes.total_amount',
          'credit_notes.status',
          'credit_notes.credit_note_date',
          'customers.display_name as customer_name'
        )
        .leftJoin('customers', 'credit_notes.customer_id', 'customers.id')
        .where((builder) => {
          builder
            .whereRaw('credit_notes.credit_note_number ilike ?', [pattern])
            .orWhereRaw('customers.display_name ilike ?', [pattern]);
        })
        .orderBy('credit_notes.credit_note_date', 'desc')
        .limit(limit),

      // --- Debit Notes ---
      db('debit_notes')
        .select(
          'debit_notes.id',
          'debit_notes.debit_note_number',
          'debit_notes.total_amount',
          'debit_notes.status',
          'debit_notes.debit_note_date',
          'vendors.display_name as vendor_name'
        )
        .leftJoin('vendors', 'debit_notes.vendor_id', 'vendors.id')
        .where((builder) => {
          builder
            .whereRaw('debit_notes.debit_note_number ilike ?', [pattern])
            .orWhereRaw('vendors.display_name ilike ?', [pattern]);
        })
        .orderBy('debit_notes.debit_note_date', 'desc')
        .limit(limit),

      // --- Expenses ---
      db('expenses')
        .select(
          'expenses.id',
          'expenses.expense_number',
          'expenses.category',
          'expenses.description',
          'expenses.total_amount',
          'expenses.status',
          'expenses.expense_date',
          'vendors.display_name as vendor_name'
        )
        .leftJoin('vendors', 'expenses.vendor_id', 'vendors.id')
        .where((builder) => {
          builder
            .whereRaw('expenses.expense_number ilike ?', [pattern])
            .orWhereRaw('expenses.category ilike ?', [pattern])
            .orWhereRaw('expenses.description ilike ?', [pattern])
            .orWhereRaw('expenses.reference_number ilike ?', [pattern])
            .orWhereRaw('vendors.display_name ilike ?', [pattern]);
        })
        .orderBy('expenses.expense_date', 'desc')
        .limit(limit),

      // --- Payments Received ---
      db('payments_received')
        .select(
          'payments_received.id',
          'payments_received.payment_number',
          'payments_received.amount',
          'payments_received.payment_mode',
          'payments_received.status',
          'payments_received.payment_date',
          'customers.display_name as customer_name'
        )
        .leftJoin('customers', 'payments_received.customer_id', 'customers.id')
        .where((builder) => {
          builder
            .whereRaw('payments_received.payment_number ilike ?', [pattern])
            .orWhereRaw('payments_received.reference_number ilike ?', [pattern])
            .orWhereRaw('customers.display_name ilike ?', [pattern]);
        })
        .orderBy('payments_received.payment_date', 'desc')
        .limit(limit),

      // --- Payments Made ---
      db('payments_made')
        .select(
          'payments_made.id',
          'payments_made.payment_number',
          'payments_made.amount',
          'payments_made.payment_mode',
          'payments_made.status',
          'payments_made.payment_date',
          'vendors.display_name as vendor_name'
        )
        .leftJoin('vendors', 'payments_made.vendor_id', 'vendors.id')
        .where((builder) => {
          builder
            .whereRaw('payments_made.payment_number ilike ?', [pattern])
            .orWhereRaw('payments_made.reference_number ilike ?', [pattern])
            .orWhereRaw('vendors.display_name ilike ?', [pattern]);
        })
        .orderBy('payments_made.payment_date', 'desc')
        .limit(limit),
    ]);

    // Transform results into a uniform shape
    const results = {};

    if (customers.length) {
      results.customers = customers.map((c) => ({
        type: 'customer',
        id: c.id,
        title: c.display_name,
        subtitle: [c.company_name, c.email, c.phone].filter(Boolean).join(' | '),
        amount: null,
        date: c.created_at,
      }));
    }

    if (vendors.length) {
      results.vendors = vendors.map((v) => ({
        type: 'vendor',
        id: v.id,
        title: v.display_name,
        subtitle: [v.company_name, v.email, v.phone].filter(Boolean).join(' | '),
        amount: null,
        date: v.created_at,
      }));
    }

    if (items.length) {
      results.items = items.map((i) => ({
        type: 'item',
        id: i.id,
        title: i.name,
        subtitle: [i.sku, i.hsn_code, i.item_type].filter(Boolean).join(' | '),
        amount: parseFloat(i.selling_price) || null,
        date: i.created_at,
      }));
    }

    if (invoices.length) {
      results.invoices = invoices.map((inv) => ({
        type: 'invoice',
        id: inv.id,
        title: inv.invoice_number,
        subtitle: [inv.customer_name, inv.status].filter(Boolean).join(' | '),
        amount: parseFloat(inv.total_amount) || null,
        date: inv.invoice_date,
      }));
    }

    if (bills.length) {
      results.bills = bills.map((b) => ({
        type: 'bill',
        id: b.id,
        title: b.bill_number,
        subtitle: [b.vendor_name, b.status].filter(Boolean).join(' | '),
        amount: parseFloat(b.total_amount) || null,
        date: b.bill_date,
      }));
    }

    if (quotations.length) {
      results.quotations = quotations.map((qt) => ({
        type: 'quotation',
        id: qt.id,
        title: qt.quotation_number,
        subtitle: [qt.customer_name, qt.status].filter(Boolean).join(' | '),
        amount: parseFloat(qt.total_amount) || null,
        date: qt.quotation_date,
      }));
    }

    if (purchaseOrders.length) {
      results.purchase_orders = purchaseOrders.map((po) => ({
        type: 'purchase_order',
        id: po.id,
        title: po.po_number,
        subtitle: [po.vendor_name, po.status].filter(Boolean).join(' | '),
        amount: parseFloat(po.total_amount) || null,
        date: po.po_date,
      }));
    }

    if (employees.length) {
      results.employees = employees.map((emp) => ({
        type: 'employee',
        id: emp.id,
        title: emp.display_name || `${emp.first_name} ${emp.last_name}`,
        subtitle: [emp.employee_id, emp.designation, emp.work_email].filter(Boolean).join(' | '),
        amount: null,
        date: emp.created_at,
      }));
    }

    if (deliveryChallans.length) {
      results.delivery_challans = deliveryChallans.map((dc) => ({
        type: 'delivery_challan',
        id: dc.id,
        title: dc.challan_number,
        subtitle: [dc.customer_name, dc.status].filter(Boolean).join(' | '),
        amount: parseFloat(dc.total_amount) || null,
        date: dc.challan_date,
      }));
    }

    if (packingLists.length) {
      results.packing_lists = packingLists.map((pl) => ({
        type: 'packing_list',
        id: pl.id,
        title: pl.packing_list_number,
        subtitle: [pl.customer_name, pl.status].filter(Boolean).join(' | '),
        amount: null,
        date: pl.packing_date,
      }));
    }

    if (creditNotes.length) {
      results.credit_notes = creditNotes.map((cn) => ({
        type: 'credit_note',
        id: cn.id,
        title: cn.credit_note_number,
        subtitle: [cn.customer_name, cn.status].filter(Boolean).join(' | '),
        amount: parseFloat(cn.total_amount) || null,
        date: cn.credit_note_date,
      }));
    }

    if (debitNotes.length) {
      results.debit_notes = debitNotes.map((dn) => ({
        type: 'debit_note',
        id: dn.id,
        title: dn.debit_note_number,
        subtitle: [dn.vendor_name, dn.status].filter(Boolean).join(' | '),
        amount: parseFloat(dn.total_amount) || null,
        date: dn.debit_note_date,
      }));
    }

    if (expenses.length) {
      results.expenses = expenses.map((exp) => ({
        type: 'expense',
        id: exp.id,
        title: exp.expense_number || exp.category || 'Expense',
        subtitle: [exp.vendor_name, exp.category, exp.status].filter(Boolean).join(' | '),
        amount: parseFloat(exp.total_amount) || null,
        date: exp.expense_date,
      }));
    }

    if (paymentsReceived.length) {
      results.payments_received = paymentsReceived.map((pr) => ({
        type: 'payment_received',
        id: pr.id,
        title: pr.payment_number,
        subtitle: [pr.customer_name, pr.payment_mode, pr.status].filter(Boolean).join(' | '),
        amount: parseFloat(pr.amount) || null,
        date: pr.payment_date,
      }));
    }

    if (paymentsMade.length) {
      results.payments_made = paymentsMade.map((pm) => ({
        type: 'payment_made',
        id: pm.id,
        title: pm.payment_number,
        subtitle: [pm.vendor_name, pm.payment_mode, pm.status].filter(Boolean).join(' | '),
        amount: parseFloat(pm.amount) || null,
        date: pm.payment_date,
      }));
    }

    // Count total results
    const totalResults = Object.values(results).reduce((sum, arr) => sum + arr.length, 0);

    res.json({
      query: searchTerm,
      total: totalResults,
      results,
    });
  } catch (error) {
    console.error('Global search error:', error);
    res.status(500).json({ error: 'Search failed. Please try again.' });
  }
});

module.exports = router;
