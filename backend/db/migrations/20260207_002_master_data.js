/**
 * Migration 002: Master Data
 * Tables: customers, customer_addresses, vendors, vendor_addresses, items
 */

exports.up = function (knex) {
  return knex.schema

    // ── customers ────────────────────────────────────────────────────
    .createTable('customers', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('customer_type').defaultTo('Business'); // Business, Individual
      table.string('salutation');
      table.string('first_name');
      table.string('last_name');
      table.string('display_name').notNullable();
      table.string('company_name');
      table.string('email');
      table.string('phone');
      table.string('mobile');
      table.string('website');
      table.string('gstin');
      table.string('pan');
      table.string('place_of_supply');
      table.string('gst_treatment'); // Registered, Unregistered, Consumer, SEZ, Deemed Export, etc.
      table.string('tax_preference').defaultTo('Taxable'); // Taxable, Tax Exempt
      table.string('currency_code', 3).defaultTo('INR');
      table.decimal('opening_balance', 18, 2).defaultTo(0);
      table.string('payment_terms'); // Net 30, Net 60, Due on Receipt, etc.
      table.decimal('credit_limit', 18, 2);
      table.text('notes');
      table.text('terms_and_conditions');
      table.boolean('is_active').defaultTo(true);
      table.timestamps(true, true);
    })

    // ── customer_addresses ───────────────────────────────────────────
    .createTable('customer_addresses', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('customer_id').notNullable().references('id').inTable('customers').onDelete('CASCADE');
      table.string('address_type').defaultTo('billing'); // billing, shipping
      table.string('attention');
      table.string('address_line1');
      table.string('address_line2');
      table.string('city');
      table.string('state');
      table.string('pincode');
      table.string('country').defaultTo('India');
      table.string('phone');
      table.boolean('is_default').defaultTo(false);
      table.timestamps(true, true);
    })

    // ── vendors ──────────────────────────────────────────────────────
    .createTable('vendors', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('vendor_type').defaultTo('Business'); // Business, Individual
      table.string('salutation');
      table.string('first_name');
      table.string('last_name');
      table.string('display_name').notNullable();
      table.string('company_name');
      table.string('email');
      table.string('phone');
      table.string('mobile');
      table.string('website');
      table.string('gstin');
      table.string('pan');
      table.string('msme_number');
      table.string('place_of_supply');
      table.string('gst_treatment');
      table.string('tax_preference').defaultTo('Taxable');
      table.string('tds_section'); // 194C, 194J, etc.
      table.decimal('tds_rate', 5, 2);
      table.string('currency_code', 3).defaultTo('INR');
      table.decimal('opening_balance', 18, 2).defaultTo(0);
      table.string('payment_terms');
      table.text('notes');
      table.boolean('is_active').defaultTo(true);
      table.timestamps(true, true);
    })

    // ── vendor_addresses ─────────────────────────────────────────────
    .createTable('vendor_addresses', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('vendor_id').notNullable().references('id').inTable('vendors').onDelete('CASCADE');
      table.string('address_type').defaultTo('billing'); // billing, shipping
      table.string('attention');
      table.string('address_line1');
      table.string('address_line2');
      table.string('city');
      table.string('state');
      table.string('pincode');
      table.string('country').defaultTo('India');
      table.string('phone');
      table.boolean('is_default').defaultTo(false);
      table.timestamps(true, true);
    })

    // ── items ────────────────────────────────────────────────────────
    .createTable('items', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('item_type').defaultTo('Goods'); // Goods, Service
      table.string('name').notNullable();
      table.string('sku');
      table.string('unit'); // pcs, kg, m, etc.
      table.string('hsn_code');
      table.decimal('gst_rate', 5, 2).defaultTo(0);
      table.boolean('is_taxable').defaultTo(true);
      table.string('lut_number');
      table.decimal('selling_price', 18, 2).defaultTo(0);
      table.decimal('cost_price', 18, 2).defaultTo(0);
      table.string('currency_code', 3).defaultTo('INR');
      table.string('content'); // fabric content, material description
      table.string('color');
      table.uuid('sales_account_id').references('id').inTable('chart_of_accounts').onDelete('SET NULL');
      table.uuid('purchase_account_id').references('id').inTable('chart_of_accounts').onDelete('SET NULL');
      table.uuid('overhead_account_id').references('id').inTable('chart_of_accounts').onDelete('SET NULL');
      table.text('description');
      table.boolean('is_active').defaultTo(true);
      table.timestamps(true, true);
    });
};

exports.down = function (knex) {
  return knex.schema
    .dropTableIfExists('items')
    .dropTableIfExists('vendor_addresses')
    .dropTableIfExists('vendors')
    .dropTableIfExists('customer_addresses')
    .dropTableIfExists('customers');
};
