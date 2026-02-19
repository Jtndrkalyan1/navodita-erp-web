/**
 * Add MSME/Udyam registration number to company_profile table.
 * (Vendors table already has msme_number from the initial migration.)
 */
exports.up = function (knex) {
  return knex.schema.alterTable('company_profile', (table) => {
    table.string('msme_number').after('iec_code');
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable('company_profile', (table) => {
    table.dropColumn('msme_number');
  });
};
