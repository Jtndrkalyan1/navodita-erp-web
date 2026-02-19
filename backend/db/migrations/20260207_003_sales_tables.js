/**
 * Migration 003: Sales Tables
 * Tables: quotations, quotation_items, invoices, invoice_items,
 *         delivery_challans, delivery_challan_items,
 *         packing_lists, packing_list_items, packing_list_sub_items,
 *         eway_bills, eway_bill_items,
 *         credit_notes, credit_note_items,
 *         payments_received, payment_received_allocations
 */

exports.up = function (knex) {
  return knex.schema

    // ── quotations ───────────────────────────────────────────────────
    .createTable('quotations', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('quotation_number').notNullable().unique();
      table.uuid('customer_id').notNullable().references('id').inTable('customers').onDelete('RESTRICT');
      table.date('quotation_date').notNullable();
      table.date('expiry_date');
      table.string('reference_number');
      table.string('status').defaultTo('Draft');
      // Bill-to address
      table.string('bill_to_attention');
      table.string('bill_to_address_line1');
      table.string('bill_to_address_line2');
      table.string('bill_to_city');
      table.string('bill_to_state');
      table.string('bill_to_pincode');
      table.string('bill_to_country').defaultTo('India');
      // Ship-to address
      table.string('ship_to_attention');
      table.string('ship_to_address_line1');
      table.string('ship_to_address_line2');
      table.string('ship_to_city');
      table.string('ship_to_state');
      table.string('ship_to_pincode');
      table.string('ship_to_country').defaultTo('India');
      // Amounts
      table.decimal('sub_total', 18, 2).defaultTo(0);
      table.decimal('discount_amount', 18, 2).defaultTo(0);
      table.string('discount_type').defaultTo('flat'); // flat, percentage
      table.decimal('igst_amount', 18, 2).defaultTo(0);
      table.decimal('cgst_amount', 18, 2).defaultTo(0);
      table.decimal('sgst_amount', 18, 2).defaultTo(0);
      table.decimal('total_tax', 18, 2).defaultTo(0);
      table.decimal('total_amount', 18, 2).defaultTo(0);
      // Currency
      table.string('currency_code', 3).defaultTo('INR');
      table.decimal('exchange_rate', 18, 6).defaultTo(1.0);
      // Other
      table.text('customer_notes');
      table.text('terms_and_conditions');
      table.text('internal_notes');
      table.timestamps(true, true);
    })

    // ── quotation_items ──────────────────────────────────────────────
    .createTable('quotation_items', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('quotation_id').notNullable().references('id').inTable('quotations').onDelete('CASCADE');
      table.uuid('item_id').references('id').inTable('items').onDelete('SET NULL');
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

    // ── invoices ─────────────────────────────────────────────────────
    .createTable('invoices', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('invoice_number').notNullable().unique();
      table.uuid('customer_id').notNullable().references('id').inTable('customers').onDelete('RESTRICT');
      table.uuid('source_quotation_id').references('id').inTable('quotations').onDelete('SET NULL');
      table.date('invoice_date').notNullable();
      table.date('due_date');
      table.string('reference_number');
      table.string('status').defaultTo('Draft')
        .checkIn(['Draft', 'Final', 'Partial', 'Paid', 'Overdue', 'Cancelled']);
      table.string('place_of_supply');
      // Bill-to address
      table.string('bill_to_attention');
      table.string('bill_to_address_line1');
      table.string('bill_to_address_line2');
      table.string('bill_to_city');
      table.string('bill_to_state');
      table.string('bill_to_pincode');
      table.string('bill_to_country').defaultTo('India');
      // Ship-to address
      table.string('ship_to_attention');
      table.string('ship_to_address_line1');
      table.string('ship_to_address_line2');
      table.string('ship_to_city');
      table.string('ship_to_state');
      table.string('ship_to_pincode');
      table.string('ship_to_country').defaultTo('India');
      // Amounts
      table.decimal('sub_total', 18, 2).defaultTo(0);
      table.decimal('discount_amount', 18, 2).defaultTo(0);
      table.string('discount_type').defaultTo('flat');
      table.decimal('igst_amount', 18, 2).defaultTo(0);
      table.decimal('cgst_amount', 18, 2).defaultTo(0);
      table.decimal('sgst_amount', 18, 2).defaultTo(0);
      table.decimal('total_tax', 18, 2).defaultTo(0);
      table.decimal('shipping_charge', 18, 2).defaultTo(0);
      table.decimal('round_off', 18, 2).defaultTo(0);
      table.decimal('total_amount', 18, 2).defaultTo(0);
      table.decimal('amount_paid', 18, 2).defaultTo(0);
      table.decimal('balance_due', 18, 2).defaultTo(0);
      // Currency
      table.string('currency_code', 3).defaultTo('INR');
      table.decimal('exchange_rate', 18, 6).defaultTo(1.0);
      // Export fields
      table.boolean('is_export').defaultTo(false);
      table.string('export_type'); // With Payment, Without Payment
      table.string('shipping_bill_number');
      table.date('shipping_bill_date');
      table.string('port_code');
      // Other
      table.text('customer_notes');
      table.text('terms_and_conditions');
      table.text('internal_notes');
      table.boolean('is_lut_applicable').defaultTo(false);
      table.boolean('is_reverse_charge').defaultTo(false);
      table.timestamps(true, true);
    })

    // ── invoice_items ────────────────────────────────────────────────
    .createTable('invoice_items', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('invoice_id').notNullable().references('id').inTable('invoices').onDelete('CASCADE');
      table.uuid('item_id').references('id').inTable('items').onDelete('SET NULL');
      table.uuid('overhead_account_id').references('id').inTable('chart_of_accounts').onDelete('SET NULL');
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

    // ── delivery_challans ────────────────────────────────────────────
    .createTable('delivery_challans', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('challan_number').notNullable().unique();
      table.uuid('invoice_id').references('id').inTable('invoices').onDelete('SET NULL');
      table.uuid('customer_id').notNullable().references('id').inTable('customers').onDelete('RESTRICT');
      table.date('challan_date').notNullable();
      table.string('status').defaultTo('Draft');
      table.string('challan_type').defaultTo('Supply'); // Supply, Job Work, Delivery, Exhibition
      // Ship-to
      table.string('ship_to_attention');
      table.string('ship_to_address_line1');
      table.string('ship_to_address_line2');
      table.string('ship_to_city');
      table.string('ship_to_state');
      table.string('ship_to_pincode');
      table.string('ship_to_country').defaultTo('India');
      // Transport
      table.string('transporter_name');
      table.string('vehicle_number');
      table.string('lr_number');
      table.date('lr_date');
      // Totals
      table.decimal('total_quantity', 18, 3).defaultTo(0);
      table.decimal('total_amount', 18, 2).defaultTo(0);
      table.text('notes');
      table.timestamps(true, true);
    })

    // ── delivery_challan_items ───────────────────────────────────────
    .createTable('delivery_challan_items', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('delivery_challan_id').notNullable().references('id').inTable('delivery_challans').onDelete('CASCADE');
      table.uuid('item_id').references('id').inTable('items').onDelete('SET NULL');
      table.string('item_name');
      table.text('description');
      table.string('hsn_code');
      table.decimal('quantity', 18, 3).defaultTo(1);
      table.string('unit');
      table.decimal('rate', 18, 2).defaultTo(0);
      table.decimal('amount', 18, 2).defaultTo(0);
      table.integer('sort_order').defaultTo(0);
      table.timestamps(true, true);
    })

    // ── packing_lists ────────────────────────────────────────────────
    .createTable('packing_lists', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('packing_list_number').notNullable().unique();
      table.uuid('invoice_id').references('id').inTable('invoices').onDelete('SET NULL');
      table.uuid('customer_id').notNullable().references('id').inTable('customers').onDelete('RESTRICT');
      table.date('packing_date').notNullable();
      table.string('status').defaultTo('Draft');
      // Shipping info
      table.string('shipping_method');
      table.string('tracking_number');
      table.integer('total_cartons').defaultTo(0);
      table.decimal('total_gross_weight', 18, 3).defaultTo(0);
      table.decimal('total_net_weight', 18, 3).defaultTo(0);
      table.string('weight_unit').defaultTo('kg');
      table.decimal('total_cbm', 18, 3).defaultTo(0); // cubic meters
      table.text('notes');
      table.timestamps(true, true);
    })

    // ── packing_list_items ───────────────────────────────────────────
    .createTable('packing_list_items', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('packing_list_id').notNullable().references('id').inTable('packing_lists').onDelete('CASCADE');
      table.uuid('item_id').references('id').inTable('items').onDelete('SET NULL');
      table.string('item_name');
      table.text('description');
      table.string('hsn_code');
      table.decimal('quantity', 18, 3).defaultTo(0);
      table.string('unit');
      table.integer('carton_number');
      table.decimal('gross_weight', 18, 3).defaultTo(0);
      table.decimal('net_weight', 18, 3).defaultTo(0);
      table.string('dimensions'); // LxWxH
      table.integer('sort_order').defaultTo(0);
      table.timestamps(true, true);
    })

    // ── packing_list_sub_items ───────────────────────────────────────
    .createTable('packing_list_sub_items', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('packing_list_item_id').notNullable().references('id').inTable('packing_list_items').onDelete('CASCADE');
      table.string('size');
      table.string('color');
      table.decimal('quantity', 18, 3).defaultTo(0);
      table.integer('sort_order').defaultTo(0);
      table.timestamps(true, true);
    })

    // ── eway_bills ───────────────────────────────────────────────────
    .createTable('eway_bills', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('eway_bill_number').unique();
      table.uuid('invoice_id').references('id').inTable('invoices').onDelete('SET NULL');
      table.uuid('customer_id').notNullable().references('id').inTable('customers').onDelete('RESTRICT');
      table.date('generation_date').notNullable();
      table.date('valid_until');
      table.string('status').defaultTo('Draft'); // Draft, Generated, Cancelled, Expired
      table.string('supply_type').defaultTo('Outward'); // Outward, Inward
      table.string('sub_type').defaultTo('Supply'); // Supply, Export, Job Work, etc.
      table.string('document_type').defaultTo('Tax Invoice');
      table.string('document_number');
      table.date('document_date');
      // From address
      table.string('from_name');
      table.string('from_gstin');
      table.string('from_address');
      table.string('from_city');
      table.string('from_state');
      table.string('from_pincode');
      // To address
      table.string('to_name');
      table.string('to_gstin');
      table.string('to_address');
      table.string('to_city');
      table.string('to_state');
      table.string('to_pincode');
      // Transport
      table.string('transporter_name');
      table.string('transporter_id');
      table.string('transport_mode'); // Road, Rail, Air, Ship
      table.string('vehicle_number');
      table.string('vehicle_type'); // Regular, ODC
      table.integer('distance_km');
      // Totals
      table.decimal('total_value', 18, 2).defaultTo(0);
      table.decimal('igst_amount', 18, 2).defaultTo(0);
      table.decimal('cgst_amount', 18, 2).defaultTo(0);
      table.decimal('sgst_amount', 18, 2).defaultTo(0);
      table.decimal('cess_amount', 18, 2).defaultTo(0);
      table.text('notes');
      table.timestamps(true, true);
    })

    // ── eway_bill_items ──────────────────────────────────────────────
    .createTable('eway_bill_items', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('eway_bill_id').notNullable().references('id').inTable('eway_bills').onDelete('CASCADE');
      table.uuid('item_id').references('id').inTable('items').onDelete('SET NULL');
      table.string('item_name');
      table.text('description');
      table.string('hsn_code');
      table.decimal('quantity', 18, 3).defaultTo(0);
      table.string('unit');
      table.decimal('taxable_value', 18, 2).defaultTo(0);
      table.decimal('gst_rate', 5, 2).defaultTo(0);
      table.decimal('igst_amount', 18, 2).defaultTo(0);
      table.decimal('cgst_amount', 18, 2).defaultTo(0);
      table.decimal('sgst_amount', 18, 2).defaultTo(0);
      table.integer('sort_order').defaultTo(0);
      table.timestamps(true, true);
    })

    // ── credit_notes ─────────────────────────────────────────────────
    .createTable('credit_notes', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('credit_note_number').notNullable().unique();
      table.uuid('customer_id').notNullable().references('id').inTable('customers').onDelete('RESTRICT');
      table.uuid('invoice_id').references('id').inTable('invoices').onDelete('SET NULL');
      table.date('credit_note_date').notNullable();
      table.string('status').defaultTo('Draft'); // Draft, Open, Closed, Void
      table.string('reason'); // Sales Return, Post-delivery Discount, Deficiency in Service, etc.
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

    // ── credit_note_items ────────────────────────────────────────────
    .createTable('credit_note_items', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('credit_note_id').notNullable().references('id').inTable('credit_notes').onDelete('CASCADE');
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

    // ── payments_received ────────────────────────────────────────────
    .createTable('payments_received', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('payment_number').notNullable().unique();
      table.uuid('customer_id').notNullable().references('id').inTable('customers').onDelete('RESTRICT');
      table.date('payment_date').notNullable();
      table.decimal('amount', 18, 2).notNullable();
      table.string('payment_mode'); // Cash, Bank Transfer, Cheque, UPI, Credit Card, etc.
      table.string('reference_number');
      table.string('status').defaultTo('Received'); // Received, Void
      // Deposit to
      table.uuid('deposit_account_id').references('id').inTable('chart_of_accounts').onDelete('SET NULL');
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

    // ── payment_received_allocations ─────────────────────────────────
    .createTable('payment_received_allocations', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('payment_received_id').notNullable().references('id').inTable('payments_received').onDelete('CASCADE');
      table.uuid('invoice_id').notNullable().references('id').inTable('invoices').onDelete('RESTRICT');
      table.decimal('allocated_amount', 18, 2).notNullable();
      table.timestamps(true, true);
    });
};

exports.down = function (knex) {
  return knex.schema
    .dropTableIfExists('payment_received_allocations')
    .dropTableIfExists('payments_received')
    .dropTableIfExists('credit_note_items')
    .dropTableIfExists('credit_notes')
    .dropTableIfExists('eway_bill_items')
    .dropTableIfExists('eway_bills')
    .dropTableIfExists('packing_list_sub_items')
    .dropTableIfExists('packing_list_items')
    .dropTableIfExists('packing_lists')
    .dropTableIfExists('delivery_challan_items')
    .dropTableIfExists('delivery_challans')
    .dropTableIfExists('invoice_items')
    .dropTableIfExists('invoices')
    .dropTableIfExists('quotation_items')
    .dropTableIfExists('quotations');
};
