/**
 * Migration 012: Column Alignment
 * Add missing columns and aliases to align controllers/frontend with DB schema
 */

exports.up = function (knex) {
  return knex.schema

    // bank_accounts: add 'branch' alias and 'ifsc' alias
    .alterTable('bank_accounts', (table) => {
      table.string('branch');
      table.string('ifsc');
    })

    // quotations: add place_of_supply, remarks, shipping_charge
    .alterTable('quotations', (table) => {
      table.string('place_of_supply');
      table.text('remarks');
      table.decimal('shipping_charge', 18, 2).defaultTo(0);
    })

    // purchase_orders: add place_of_supply, expected_date, remarks
    .alterTable('purchase_orders', (table) => {
      table.string('place_of_supply');
      table.date('expected_date');
      table.text('remarks');
    })

    // credit_notes: add place_of_supply
    .alterTable('credit_notes', (table) => {
      table.string('place_of_supply');
    })

    // debit_notes: add place_of_supply
    .alterTable('debit_notes', (table) => {
      table.string('place_of_supply');
    })

    // payments_received: add bank_charge
    .alterTable('payments_received', (table) => {
      table.decimal('bank_charge', 18, 2).defaultTo(0);
    })

    // payments_made: add bank_charge
    .alterTable('payments_made', (table) => {
      table.decimal('bank_charge', 18, 2).defaultTo(0);
    });
};

exports.down = function (knex) {
  return knex.schema
    .alterTable('payments_made', (table) => {
      table.dropColumn('bank_charge');
    })
    .alterTable('payments_received', (table) => {
      table.dropColumn('bank_charge');
    })
    .alterTable('debit_notes', (table) => {
      table.dropColumn('place_of_supply');
    })
    .alterTable('credit_notes', (table) => {
      table.dropColumn('place_of_supply');
    })
    .alterTable('purchase_orders', (table) => {
      table.dropColumn('place_of_supply');
      table.dropColumn('expected_date');
      table.dropColumn('remarks');
    })
    .alterTable('quotations', (table) => {
      table.dropColumn('place_of_supply');
      table.dropColumn('remarks');
      table.dropColumn('shipping_charge');
    })
    .alterTable('bank_accounts', (table) => {
      table.dropColumn('branch');
      table.dropColumn('ifsc');
    });
};
