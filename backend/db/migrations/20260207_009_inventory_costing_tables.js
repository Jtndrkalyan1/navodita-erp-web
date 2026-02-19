/**
 * Migration 009: Inventory & Costing Tables
 * Tables: inventory_categories, inventory_items, inventory_transactions,
 *         costing_sheets, costing_versions, costing_fabric_items,
 *         costing_trim_items, costing_packing_items, style_costings
 */

exports.up = function (knex) {
  return knex.schema

    // ── inventory_categories ─────────────────────────────────────────
    .createTable('inventory_categories', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('name').notNullable().unique();
      table.text('description');
      table.uuid('parent_category_id').references('id').inTable('inventory_categories').onDelete('SET NULL');
      table.boolean('is_active').defaultTo(true);
      table.integer('sort_order').defaultTo(0);
      table.timestamps(true, true);
    })

    // ── inventory_items ──────────────────────────────────────────────
    .createTable('inventory_items', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('item_id').references('id').inTable('items').onDelete('CASCADE');
      table.uuid('category_id').references('id').inTable('inventory_categories').onDelete('SET NULL');
      table.string('name');
      table.string('sku');
      table.decimal('quantity_on_hand', 18, 3).defaultTo(0);
      table.decimal('reorder_level', 18, 3).defaultTo(0);
      table.decimal('reorder_quantity', 18, 3).defaultTo(0);
      table.string('unit'); // pcs, kg, m, etc.
      table.decimal('average_cost', 18, 2).defaultTo(0);
      table.decimal('last_purchase_price', 18, 2).defaultTo(0);
      table.string('warehouse_location');
      table.string('bin_number');
      table.boolean('is_active').defaultTo(true);
      table.timestamps(true, true);

      table.index('item_id');
    })

    // ── inventory_transactions ───────────────────────────────────────
    .createTable('inventory_transactions', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('inventory_item_id').notNullable().references('id').inTable('inventory_items').onDelete('CASCADE');
      table.string('transaction_type').notNullable(); // Purchase, Sale, Adjustment, Transfer, Return, Opening
      table.date('transaction_date').notNullable();
      table.decimal('quantity', 18, 3).notNullable(); // positive for in, negative for out
      table.decimal('unit_cost', 18, 2).defaultTo(0);
      table.decimal('total_cost', 18, 2).defaultTo(0);
      table.decimal('balance_quantity', 18, 3).defaultTo(0); // running balance after this txn
      table.string('reference_type'); // Invoice, Bill, PurchaseOrder, Manual
      table.uuid('reference_id');
      table.string('reference_number');
      table.text('notes');
      table.uuid('created_by').references('id').inTable('app_users').onDelete('SET NULL');
      table.timestamps(true, true);

      table.index(['inventory_item_id', 'transaction_date']);
    })

    // ── costing_sheets ───────────────────────────────────────────────
    .createTable('costing_sheets', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('style_number').notNullable();
      table.string('style_name');
      table.uuid('customer_id').references('id').inTable('customers').onDelete('SET NULL');
      table.uuid('vendor_id').references('id').inTable('vendors').onDelete('SET NULL');
      table.text('description');
      table.string('season');
      table.string('category'); // Tops, Bottoms, Dresses, Outerwear, etc.
      table.string('fabric_type');
      table.integer('order_quantity');
      table.decimal('total_cost', 18, 2).defaultTo(0);
      table.decimal('cost_per_piece', 18, 2).defaultTo(0);
      table.string('currency_code', 3).defaultTo('INR');
      table.decimal('exchange_rate', 18, 6).defaultTo(1.0);
      table.string('status').defaultTo('Draft'); // Draft, Approved, Revised, Final
      table.text('notes');
      table.timestamps(true, true);
    })

    // ── costing_versions ─────────────────────────────────────────────
    .createTable('costing_versions', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('costing_sheet_id').notNullable().references('id').inTable('costing_sheets').onDelete('CASCADE');
      table.integer('version_number').notNullable().defaultTo(1);
      table.string('status').defaultTo('Draft'); // Draft, Approved, Rejected
      // Cost breakdowns
      table.decimal('total_fabric_cost', 18, 2).defaultTo(0);
      table.decimal('total_trim_cost', 18, 2).defaultTo(0);
      table.decimal('total_packing_cost', 18, 2).defaultTo(0);
      table.decimal('cmt_cost', 18, 2).defaultTo(0); // Cut-Make-Trim
      table.decimal('overhead_cost', 18, 2).defaultTo(0);
      table.decimal('washing_cost', 18, 2).defaultTo(0);
      table.decimal('printing_cost', 18, 2).defaultTo(0);
      table.decimal('embroidery_cost', 18, 2).defaultTo(0);
      table.decimal('testing_cost', 18, 2).defaultTo(0);
      table.decimal('freight_cost', 18, 2).defaultTo(0);
      table.decimal('commission', 18, 2).defaultTo(0);
      table.decimal('profit_margin', 5, 2).defaultTo(0); // percentage
      table.decimal('total_cost', 18, 2).defaultTo(0);
      table.decimal('final_cost_per_piece', 18, 2).defaultTo(0);
      table.text('notes');
      table.timestamps(true, true);

      table.unique(['costing_sheet_id', 'version_number']);
    })

    // ── costing_fabric_items ─────────────────────────────────────────
    .createTable('costing_fabric_items', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('costing_version_id').notNullable().references('id').inTable('costing_versions').onDelete('CASCADE');
      table.string('fabric_name');
      table.string('fabric_type'); // Woven, Knit, Denim, etc.
      table.string('composition'); // e.g. "100% Cotton", "60/40 Cotton-Poly"
      table.decimal('width', 18, 2); // in cm or inches
      table.decimal('gsm', 18, 2); // grams per square meter
      table.decimal('rate', 18, 2).defaultTo(0); // per meter/yard
      table.decimal('consumption', 18, 3).defaultTo(0); // per piece
      table.decimal('wastage_percent', 5, 2).defaultTo(0);
      table.decimal('cost', 18, 2).defaultTo(0); // calculated
      table.string('unit').defaultTo('m'); // m, yard, kg
      table.string('supplier');
      table.integer('sort_order').defaultTo(0);
      table.timestamps(true, true);
    })

    // ── costing_trim_items ───────────────────────────────────────────
    .createTable('costing_trim_items', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('costing_version_id').notNullable().references('id').inTable('costing_versions').onDelete('CASCADE');
      table.string('trim_name');
      table.string('trim_type'); // Button, Zipper, Label, Thread, Interlining, etc.
      table.string('category'); // sewing, marketing, packing
      table.decimal('rate', 18, 2).defaultTo(0);
      table.decimal('consumption', 18, 3).defaultTo(0);
      table.decimal('wastage_percent', 5, 2).defaultTo(0);
      table.decimal('cost', 18, 2).defaultTo(0);
      table.string('unit');
      table.string('supplier');
      table.integer('sort_order').defaultTo(0);
      table.timestamps(true, true);
    })

    // ── costing_packing_items ────────────────────────────────────────
    .createTable('costing_packing_items', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('costing_version_id').notNullable().references('id').inTable('costing_versions').onDelete('CASCADE');
      table.string('item_name');
      table.decimal('rate', 18, 2).defaultTo(0);
      table.decimal('consumption', 18, 3).defaultTo(0);
      table.decimal('wastage_percent', 5, 2).defaultTo(0);
      table.decimal('cost', 18, 2).defaultTo(0);
      table.string('unit'); // pcs, set, m, etc.
      table.string('supplier');
      table.integer('sort_order').defaultTo(0);
      table.timestamps(true, true);
    })

    // ── style_costings ───────────────────────────────────────────────
    .createTable('style_costings', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('style_name');
      table.string('style_number').notNullable();
      table.uuid('item_id').references('id').inTable('items').onDelete('SET NULL');
      table.uuid('costing_sheet_id').references('id').inTable('costing_sheets').onDelete('SET NULL');
      table.decimal('total_cost', 18, 2).defaultTo(0);
      table.decimal('cost_per_piece', 18, 2).defaultTo(0);
      table.string('currency_code', 3).defaultTo('INR');
      table.string('status').defaultTo('Active'); // Active, Archived
      table.text('notes');
      table.timestamps(true, true);
    });
};

exports.down = function (knex) {
  return knex.schema
    .dropTableIfExists('style_costings')
    .dropTableIfExists('costing_packing_items')
    .dropTableIfExists('costing_trim_items')
    .dropTableIfExists('costing_fabric_items')
    .dropTableIfExists('costing_versions')
    .dropTableIfExists('costing_sheets')
    .dropTableIfExists('inventory_transactions')
    .dropTableIfExists('inventory_items')
    .dropTableIfExists('inventory_categories');
};
