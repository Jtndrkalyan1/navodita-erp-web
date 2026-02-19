/**
 * Migration 021: Bank Transaction Payment Link
 * Adds bank_transaction_id column to payments_made and payments_received tables
 * to link payment records created during bank transaction categorization.
 * This allows:
 *   - Preventing duplicate payment records during re-categorization
 *   - Cleaning up payment records when a transaction is re-categorized
 *   - Tracing which bank transaction generated a payment record
 */

exports.up = async function (knex) {
  const hasColReceived = await knex.schema.hasColumn('payments_received', 'bank_transaction_id');
  if (!hasColReceived) {
    await knex.schema.alterTable('payments_received', (table) => {
      table
        .uuid('bank_transaction_id')
        .nullable()
        .references('id')
        .inTable('bank_transactions')
        .onDelete('SET NULL');
    });
  }

  const hasColMade = await knex.schema.hasColumn('payments_made', 'bank_transaction_id');
  if (!hasColMade) {
    await knex.schema.alterTable('payments_made', (table) => {
      table
        .uuid('bank_transaction_id')
        .nullable()
        .references('id')
        .inTable('bank_transactions')
        .onDelete('SET NULL');
    });
  }
};

exports.down = function (knex) {
  return knex.schema
    .alterTable('payments_received', (table) => {
      table.dropColumn('bank_transaction_id');
    })
    .alterTable('payments_made', (table) => {
      table.dropColumn('bank_transaction_id');
    });
};
