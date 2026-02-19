/**
 * Migration 004: Purchase Tables
 * Tables: purchase_orders, purchase_order_items, bills, bill_items,
 *         debit_notes, debit_note_items, payments_made, payment_made_allocations,
 *         expenses
 */

exports.up = function (knex) {
  return knex.schema

    // ── purchase_orders ──────────────────────────────────────────────
    .createTable('purchase_orders', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('po_number').notNullable().unique();
      table.uuid('vendor_id').notNullable().references('id').inTable('vendors').onDelete('RESTRICT');
      table.date('po_date').notNullable();
      table.date('expected_delivery_date');
      table.string('reference_number');
      table.string('status').defaultTo('Draft'); // Draft, Issued, Partial, Received, Cancelled
      // Delivery address
      table.string('delivery_address_line1');
      table.string('delivery_address_line2');
      table.string('delivery_city');
      table.string('delivery_state');
      table.string('delivery_pincode');
      table.string('delivery_country').defaultTo('India');
      // Amounts
      table.decimal('sub_total', 18, 2).defaultTo(0);
      table.decimal('discount_amount', 18, 2).defaultTo(0);
      table.string('discount_type').defaultTo('flat');
      table.decimal('igst_amount', 18, 2).defaultTo(0);
      table.decimal('cgst_amount', 18, 2).defaultTo(0);
      table.decimal('sgst_amount', 18, 2).defaultTo(0);
      table.decimal('total_tax', 18, 2).defaultTo(0);
      table.decimal('shipping_charge', 18, 2).defaultTo(0);
      table.decimal('total_amount', 18, 2).defaultTo(0);
      // Currency
      table.string('currency_code', 3).defaultTo('INR');
      table.decimal('exchange_rate', 18, 6).defaultTo(1.0);
      // Other
      table.text('vendor_notes');
      table.text('terms_and_conditions');
      table.text('internal_notes');
      table.timestamps(true, true);
    })

    // ── purchase_order_items ─────────────────────────────────────────
    .createTable('purchase_order_items', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('purchase_order_id').notNullable().references('id').inTable('purchase_orders').onDelete('CASCADE');
      table.uuid('item_id').references('id').inTable('items').onDelete('SET NULL');
      table.string('item_name');
      table.text('description');
      table.string('hsn_code');
      table.decimal('ordered_quantity', 18, 3).defaultTo(0);
      table.decimal('received_quantity', 18, 3).defaultTo(0);
      table.string('unit');
      table.decimal('rate', 18, 2).defaultTo(0);
      table.decimal('discount_percent', 5, 2).defaultTo(0);
      table.decimal('discount_amount', 18, 2).defaultTo(0);
      table.decimal('gst_rate', 5, 2).defaultTo(0);
      table.decimal('igst_amount', 18, 2).defaultTo(0);
      table.decimal('cgst_amount', 18, 2).defaultTo(0);
      table.decimal('sgst_amount', 18, 2).defaultTo(0);
      table.decimal('amount', 18, 2).defaultTo(0);
      table.integer('sort_order').defaultTo(0);
      table.timestamps(true, true);
    })

    // ── bills ────────────────────────────────────────────────────────
    .createTable('bills', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('bill_number').notNullable().unique();
      table.uuid('vendor_id').notNullable().references('id').inTable('vendors').onDelete('RESTRICT');
      table.uuid('purchase_order_id').references('id').inTable('purchase_orders').onDelete('SET NULL');
      table.uuid('overhead_account_id').references('id').inTable('chart_of_accounts').onDelete('SET NULL');
      table.date('bill_date').notNullable();
      table.date('due_date');
      table.string('vendor_invoice_number');
      table.date('vendor_invoice_date');
      table.string('reference_number');
      table.string('status').defaultTo('Pending')
        .checkIn(['Pending', 'Partial', 'Paid']);
      table.string('place_of_supply');
      // Amounts
      table.decimal('sub_total', 18, 2).defaultTo(0);
      table.decimal('discount_amount', 18, 2).defaultTo(0);
      table.string('discount_type').defaultTo('flat');
      table.decimal('igst_amount', 18, 2).defaultTo(0);
      table.decimal('cgst_amount', 18, 2).defaultTo(0);
      table.decimal('sgst_amount', 18, 2).defaultTo(0);
      table.decimal('total_tax', 18, 2).defaultTo(0);
      table.decimal('tds_amount', 18, 2).defaultTo(0);
      table.string('tds_section');
      table.decimal('total_amount', 18, 2).defaultTo(0);
      table.decimal('amount_paid', 18, 2).defaultTo(0);
      table.decimal('balance_due', 18, 2).defaultTo(0);
      // Currency
      table.string('currency_code', 3).defaultTo('INR');
      table.decimal('exchange_rate', 18, 6).defaultTo(1.0);
      // Other
      table.boolean('is_reverse_charge').defaultTo(false);
      table.text('notes');
      table.text('internal_notes');
      table.timestamps(true, true);
    })

    // ── bill_items ───────────────────────────────────────────────────
    .createTable('bill_items', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('bill_id').notNullable().references('id').inTable('bills').onDelete('CASCADE');
      table.uuid('item_id').references('id').inTable('items').onDelete('SET NULL');
      table.uuid('account_id').references('id').inTable('chart_of_accounts').onDelete('SET NULL');
      table.string('item_name');
      table.text('description');
      table.string('hsn_code');
      table.decimal('quantity', 18, 3).defaultTo(1);
      table.string('unit');
      table.decimal('rate', 18, 2).defaultTo(0);
      table.decimal('discount_percent', 5, 2).defaultTo(0);
      table.decimal('discount_amount', 18, 2).defaultTo(0);
      table.decimal('gst_rate', 5, 2).defaultTo(0);
      table.decimal('igst_amount', 18, 2).defaultTo(0);
      table.decimal('cgst_amount', 18, 2).defaultTo(0);
      table.decimal('sgst_amount', 18, 2).defaultTo(0);
      table.decimal('amount', 18, 2).defaultTo(0);
      table.integer('sort_order').defaultTo(0);
      table.timestamps(true, true);
    })

    // ── debit_notes ──────────────────────────────────────────────────
    .createTable('debit_notes', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('debit_note_number').notNullable().unique();
      table.uuid('vendor_id').notNullable().references('id').inTable('vendors').onDelete('RESTRICT');
      table.uuid('bill_id').references('id').inTable('bills').onDelete('SET NULL');
      table.date('debit_note_date').notNullable();
      table.string('status').defaultTo('Draft'); // Draft, Open, Closed, Void
      table.string('reason');
      // Amounts
      table.decimal('sub_total', 18, 2).defaultTo(0);
      table.decimal('igst_amount', 18, 2).defaultTo(0);
      table.decimal('cgst_amount', 18, 2).defaultTo(0);
      table.decimal('sgst_amount', 18, 2).defaultTo(0);
      table.decimal('total_tax', 18, 2).defaultTo(0);
      table.decimal('total_amount', 18, 2).defaultTo(0);
      table.decimal('balance_amount', 18, 2).defaultTo(0);
      // Currency
      table.string('currency_code', 3).defaultTo('INR');
      table.decimal('exchange_rate', 18, 6).defaultTo(1.0);
      table.text('notes');
      table.timestamps(true, true);
    })

    // ── debit_note_items ─────────────────────────────────────────────
    .createTable('debit_note_items', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('debit_note_id').notNullable().references('id').inTable('debit_notes').onDelete('CASCADE');
      table.uuid('item_id').references('id').inTable('items').onDelete('SET NULL');
      table.string('item_name');
      table.text('description');
      table.string('hsn_code');
      table.decimal('quantity', 18, 3).defaultTo(1);
      table.string('unit');
      table.decimal('rate', 18, 2).defaultTo(0);
      table.decimal('gst_rate', 5, 2).defaultTo(0);
      table.decimal('igst_amount', 18, 2).defaultTo(0);
      table.decimal('cgst_amount', 18, 2).defaultTo(0);
      table.decimal('sgst_amount', 18, 2).defaultTo(0);
      table.decimal('amount', 18, 2).defaultTo(0);
      table.integer('sort_order').defaultTo(0);
      table.timestamps(true, true);
    })

    // ── payments_made ────────────────────────────────────────────────
    .createTable('payments_made', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('payment_number').notNullable().unique();
      table.uuid('vendor_id').notNullable().references('id').inTable('vendors').onDelete('RESTRICT');
      table.date('payment_date').notNullable();
      table.decimal('amount', 18, 2).notNullable();
      table.string('payment_mode'); // Cash, Bank Transfer, Cheque, UPI, etc.
      table.string('reference_number');
      table.string('status').defaultTo('Paid'); // Paid, Void
      // Paid from
      table.uuid('paid_from_account_id').references('id').inTable('chart_of_accounts').onDelete('SET NULL');
      // Currency
      table.string('currency_code', 3).defaultTo('INR');
      table.decimal('exchange_rate', 18, 6).defaultTo(1.0);
      // TDS
      table.decimal('tds_amount', 18, 2).defaultTo(0);
      table.string('tds_section');
      table.decimal('excess_amount', 18, 2).defaultTo(0);
      table.text('notes');
      table.timestamps(true, true);
    })

    // ── payment_made_allocations ─────────────────────────────────────
    .createTable('payment_made_allocations', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('payment_made_id').notNullable().references('id').inTable('payments_made').onDelete('CASCADE');
      table.uuid('bill_id').notNullable().references('id').inTable('bills').onDelete('RESTRICT');
      table.decimal('allocated_amount', 18, 2).notNullable();
      table.timestamps(true, true);
    })

    // ── expenses ─────────────────────────────────────────────────────
    .createTable('expenses', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('expense_number').unique();
      table.date('expense_date').notNullable();
      table.uuid('vendor_id').references('id').inTable('vendors').onDelete('SET NULL');
      table.uuid('customer_id').references('id').inTable('customers').onDelete('SET NULL');
      table.uuid('expense_account_id').references('id').inTable('chart_of_accounts').onDelete('SET NULL');
      table.uuid('paid_from_account_id').references('id').inTable('chart_of_accounts').onDelete('SET NULL');
      table.string('category');
      table.text('description');
      table.string('reference_number');
      table.string('payment_mode');
      table.string('status').defaultTo('Pending')
        .checkIn(['Pending', 'Approved', 'Paid', 'Rejected']);
      // Amounts
      table.decimal('amount', 18, 2).notNullable();
      table.decimal('gst_rate', 5, 2).defaultTo(0);
      table.decimal('igst_amount', 18, 2).defaultTo(0);
      table.decimal('cgst_amount', 18, 2).defaultTo(0);
      table.decimal('sgst_amount', 18, 2).defaultTo(0);
      table.decimal('total_amount', 18, 2).defaultTo(0);
      // TDS
      table.decimal('tds_amount', 18, 2).defaultTo(0);
      table.string('tds_section');
      // Currency
      table.string('currency_code', 3).defaultTo('INR');
      table.decimal('exchange_rate', 18, 6).defaultTo(1.0);
      // Billable
      table.boolean('is_billable').defaultTo(false);
      table.boolean('is_billed').defaultTo(false);
      table.text('notes');
      table.text('receipt_path');
      table.timestamps(true, true);
    });
};

exports.down = function (knex) {
  return knex.schema
    .dropTableIfExists('expenses')
    .dropTableIfExists('payment_made_allocations')
    .dropTableIfExists('payments_made')
    .dropTableIfExists('debit_note_items')
    .dropTableIfExists('debit_notes')
    .dropTableIfExists('bill_items')
    .dropTableIfExists('bills')
    .dropTableIfExists('purchase_order_items')
    .dropTableIfExists('purchase_orders');
};
