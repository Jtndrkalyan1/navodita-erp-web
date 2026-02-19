/**
 * Migration 007: Accounting Tables
 * Tables: journal_entries, journal_lines, currency_adjustments
 */

exports.up = function (knex) {
  return knex.schema

    // ── journal_entries ──────────────────────────────────────────────
    .createTable('journal_entries', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('journal_number').notNullable().unique();
      table.date('journal_date').notNullable();
      table.string('reference_number');
      table.string('status').defaultTo('Draft'); // Draft, Posted, Void
      table.string('journal_type').defaultTo('Manual'); // Manual, Auto, Adjustment, Opening
      table.decimal('total_debit', 18, 2).defaultTo(0);
      table.decimal('total_credit', 18, 2).defaultTo(0);
      table.string('currency_code', 3).defaultTo('INR');
      table.decimal('exchange_rate', 18, 6).defaultTo(1.0);
      table.text('notes');
      // Source tracking for auto-generated journals
      table.string('source_type'); // Invoice, Bill, Payment, Expense, etc.
      table.uuid('source_id');
      table.uuid('created_by').references('id').inTable('app_users').onDelete('SET NULL');
      table.uuid('posted_by').references('id').inTable('app_users').onDelete('SET NULL');
      table.timestamp('posted_at');
      table.timestamps(true, true);
    })

    // ── journal_lines ────────────────────────────────────────────────
    .createTable('journal_lines', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('journal_entry_id').notNullable().references('id').inTable('journal_entries').onDelete('CASCADE');
      table.uuid('account_id').references('id').inTable('chart_of_accounts').onDelete('RESTRICT');
      table.string('account_name');
      table.string('account_code');
      table.decimal('debit_amount', 18, 2).defaultTo(0);
      table.decimal('credit_amount', 18, 2).defaultTo(0);
      table.text('description');
      table.string('contact_name'); // customer or vendor name for reference
      table.string('contact_type'); // Customer, Vendor
      table.uuid('contact_id'); // customer_id or vendor_id
      table.integer('sort_order').defaultTo(0);
      table.timestamps(true, true);
    })

    // ── currency_adjustments ─────────────────────────────────────────
    .createTable('currency_adjustments', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.date('adjustment_date').notNullable();
      table.string('from_currency', 3).notNullable();
      table.string('to_currency', 3).notNullable().defaultTo('INR');
      table.decimal('original_rate', 18, 6).notNullable();
      table.decimal('current_rate', 18, 6).notNullable();
      table.decimal('gain_loss_amount', 18, 2).notNullable();
      table.string('adjustment_type').defaultTo('Unrealized'); // Realized, Unrealized
      table.string('linked_entity_type'); // Invoice, Bill, Payment
      table.uuid('linked_entity_id');
      table.uuid('journal_entry_id').references('id').inTable('journal_entries').onDelete('SET NULL');
      table.string('status').defaultTo('Draft'); // Draft, Posted
      table.text('notes');
      table.timestamps(true, true);
    });
};

exports.down = function (knex) {
  return knex.schema
    .dropTableIfExists('currency_adjustments')
    .dropTableIfExists('journal_lines')
    .dropTableIfExists('journal_entries');
};
