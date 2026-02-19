/**
 * Migration 017: Multi-Currency Payments
 * Adds original_amount column to payments_received and payments_made tables
 * to support storing the foreign currency amount separately from the INR amount.
 *
 * Existing columns already present:
 *   - currency_code (varchar, default 'INR')
 *   - exchange_rate (decimal, default 1.0)
 *   - amount (decimal) -- this will store the INR equivalent
 *
 * New column:
 *   - original_amount (decimal) -- stores the amount in the original/foreign currency
 */

exports.up = function (knex) {
  return knex.schema
    .alterTable('payments_received', (table) => {
      table.decimal('original_amount', 18, 2).nullable().after('amount');
    })
    .alterTable('payments_made', (table) => {
      table.decimal('original_amount', 18, 2).nullable().after('amount');
    });
};

exports.down = function (knex) {
  return knex.schema
    .alterTable('payments_received', (table) => {
      table.dropColumn('original_amount');
    })
    .alterTable('payments_made', (table) => {
      table.dropColumn('original_amount');
    });
};
