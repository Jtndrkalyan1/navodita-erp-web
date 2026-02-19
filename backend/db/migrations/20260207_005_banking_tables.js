/**
 * Migration 005: Banking Tables
 * Tables: bank_accounts, bank_transactions
 * Also adds bank_transaction_id FK to payments_received, payments_made, expenses
 */

exports.up = function (knex) {
  return knex.schema

    // ── bank_accounts ────────────────────────────────────────────────
    .createTable('bank_accounts', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('account_name').notNullable();
      table.string('account_number');
      table.string('bank_name');
      table.string('branch_name');
      table.string('ifsc_code');
      table.string('swift_code');
      table.string('account_type').defaultTo('Current'); // Current, Savings, Cash, Credit Card, etc.
      table.uuid('chart_account_id').references('id').inTable('chart_of_accounts').onDelete('SET NULL');
      table.string('currency_code', 3).defaultTo('INR');
      table.decimal('opening_balance', 18, 2).defaultTo(0);
      table.decimal('current_balance', 18, 2).defaultTo(0);
      table.date('opening_balance_date');
      table.boolean('is_primary').defaultTo(false);
      table.boolean('is_active').defaultTo(true);
      // Bank sync fields
      table.string('sync_provider'); // ICICI, etc.
      table.text('sync_credentials'); // encrypted JSON
      table.timestamp('last_sync_at');
      table.string('last_sync_status');
      table.text('notes');
      table.timestamps(true, true);
    })

    // ── bank_transactions ────────────────────────────────────────────
    .createTable('bank_transactions', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('bank_account_id').notNullable().references('id').inTable('bank_accounts').onDelete('CASCADE');
      table.date('transaction_date').notNullable();
      table.date('value_date');
      table.text('description');
      table.string('reference_number');
      table.decimal('deposit_amount', 18, 2).defaultTo(0);
      table.decimal('withdrawal_amount', 18, 2).defaultTo(0);
      table.decimal('balance', 18, 2);
      table.string('category');
      table.string('category_type'); // Income, Expense, Transfer, etc.
      table.string('suggested_category');
      table.uuid('chart_account_id').references('id').inTable('chart_of_accounts').onDelete('SET NULL');
      // Reconciliation
      table.boolean('is_reconciled').defaultTo(false);
      table.date('reconciled_date');
      table.uuid('reconciled_by').references('id').inTable('app_users').onDelete('SET NULL');
      // Import tracking
      table.string('import_batch_id');
      table.boolean('is_duplicate').defaultTo(false);
      // Linked entities
      table.uuid('linked_expense_id').references('id').inTable('expenses').onDelete('SET NULL');
      table.uuid('linked_payment_made_id').references('id').inTable('payments_made').onDelete('SET NULL');
      table.uuid('linked_payment_received_id').references('id').inTable('payments_received').onDelete('SET NULL');
      table.text('notes');
      table.timestamps(true, true);

      // Index for common queries
      table.index(['bank_account_id', 'transaction_date']);
    })

    // ── Add bank_transaction_id to payments_received ─────────────────
    .alterTable('payments_received', (table) => {
      table.uuid('bank_transaction_id').references('id').inTable('bank_transactions').onDelete('SET NULL');
    })

    // ── Add bank_transaction_id to payments_made ─────────────────────
    .alterTable('payments_made', (table) => {
      table.uuid('bank_transaction_id').references('id').inTable('bank_transactions').onDelete('SET NULL');
    })

    // ── Add bank_transaction_id to expenses ──────────────────────────
    .alterTable('expenses', (table) => {
      table.uuid('bank_transaction_id').references('id').inTable('bank_transactions').onDelete('SET NULL');
    });
};

exports.down = function (knex) {
  return knex.schema
    .alterTable('expenses', (table) => {
      table.dropColumn('bank_transaction_id');
    })
    .alterTable('payments_made', (table) => {
      table.dropColumn('bank_transaction_id');
    })
    .alterTable('payments_received', (table) => {
      table.dropColumn('bank_transaction_id');
    })
    .dropTableIfExists('bank_transactions')
    .dropTableIfExists('bank_accounts');
};
