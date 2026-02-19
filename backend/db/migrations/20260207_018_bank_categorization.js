/**
 * Migration 018: Bank Transaction Categorization Enhancement
 * Adds sub_account_id (FK to chart_of_accounts) and categorization_status columns
 * to bank_transactions table for the enhanced categorization workflow.
 */

exports.up = function (knex) {
  return knex.schema.alterTable('bank_transactions', (table) => {
    table.uuid('sub_account_id').references('id').inTable('chart_of_accounts').onDelete('SET NULL');
    table
      .string('categorization_status')
      .defaultTo('uncategorized')
      .notNullable();

    // Index for filtering by categorization status
    table.index(['categorization_status']);
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable('bank_transactions', (table) => {
    table.dropIndex(['categorization_status']);
    table.dropColumn('categorization_status');
    table.dropColumn('sub_account_id');
  });
};
