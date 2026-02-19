/**
 * Migration 011: Schema Fixes
 * Add missing columns that controllers depend on
 */

exports.up = function (knex) {
  return knex.schema
    // Add customer_code to customers
    .alterTable('customers', (table) => {
      table.string('customer_code').unique();
    })
    // Add vendor_code to vendors
    .alterTable('vendors', (table) => {
      table.string('vendor_code').unique();
    });
};

exports.down = function (knex) {
  return knex.schema
    .alterTable('vendors', (table) => {
      table.dropColumn('vendor_code');
    })
    .alterTable('customers', (table) => {
      table.dropColumn('customer_code');
    });
};
