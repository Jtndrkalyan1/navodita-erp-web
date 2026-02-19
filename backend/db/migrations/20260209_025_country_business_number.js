/**
 * Add country and business_number fields to customers and vendors.
 * - country: for auto-detecting domestic vs overseas
 * - business_number: equivalent of GST Number for overseas customers/vendors (US EIN, Canada BN, etc.)
 */
exports.up = function (knex) {
  return Promise.all([
    knex.schema.alterTable('customers', (table) => {
      table.string('country').defaultTo('India');
      table.string('business_number'); // For overseas: US EIN, Canada BN, China USCC, etc.
    }),
    knex.schema.alterTable('vendors', (table) => {
      table.string('country').defaultTo('India');
      table.string('business_number');
    }),
  ]);
};

exports.down = function (knex) {
  return Promise.all([
    knex.schema.alterTable('customers', (table) => {
      table.dropColumn('country');
      table.dropColumn('business_number');
    }),
    knex.schema.alterTable('vendors', (table) => {
      table.dropColumn('country');
      table.dropColumn('business_number');
    }),
  ]);
};
