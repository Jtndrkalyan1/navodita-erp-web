/**
 * Migration: Add Soft Deletes
 * Adds deleted_at column to key tables for soft delete functionality
 */
exports.up = async function (knex) {
  const tables = [
    'invoices',
    'bills',
    'customers',
    'vendors',
    'items',
    'employees',
    'expenses',
    'quotations',
    'purchase_orders',
    'credit_notes',
    'debit_notes',
    'payments_received',
    'payments_made',
    'bank_accounts',
    'bank_transactions',
    'journal_entries',
    'chart_of_accounts',
  ];

  for (const table of tables) {
    await knex.schema.table(table, (t) => {
      t.timestamp('deleted_at').nullable().defaultTo(null);
    });
  }

  // Add indexes on deleted_at for performance
  for (const table of tables) {
    await knex.schema.raw(`CREATE INDEX IF NOT EXISTS idx_${table}_deleted_at ON ${table}(deleted_at)`);
  }
};

exports.down = async function (knex) {
  const tables = [
    'invoices',
    'bills',
    'customers',
    'vendors',
    'items',
    'employees',
    'expenses',
    'quotations',
    'purchase_orders',
    'credit_notes',
    'debit_notes',
    'payments_received',
    'payments_made',
    'bank_accounts',
    'bank_transactions',
    'journal_entries',
    'chart_of_accounts',
  ];

  // Drop indexes
  for (const table of tables) {
    await knex.schema.raw(`DROP INDEX IF EXISTS idx_${table}_deleted_at`);
  }

  // Drop columns
  for (const table of tables) {
    await knex.schema.table(table, (t) => {
      t.dropColumn('deleted_at');
    });
  }
};
