/**
 * Migration 013: Company Profile Enhancements
 * Add about, directors, bank details, and export compliance fields
 */

exports.up = function (knex) {
  return knex.schema.alterTable('company_profile', (table) => {
    // About section
    table.string('established_year');
    table.string('tagline');
    table.text('about_us');
    table.text('mission');
    table.text('vision');
    table.text('goals');

    // Factory address fields
    table.string('factory_address');
    table.string('factory_city');
    table.string('factory_state');
    table.string('factory_pincode');

    // Directors
    table.string('director1_name');
    table.text('director1_photo');
    table.string('director2_name');
    table.text('director2_photo');

    // Bank details (individual fields)
    table.string('bank_name');
    table.string('bank_account_number');
    table.string('bank_ifsc_code');
    table.string('bank_branch');
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable('company_profile', (table) => {
    table.dropColumn('established_year');
    table.dropColumn('tagline');
    table.dropColumn('about_us');
    table.dropColumn('mission');
    table.dropColumn('vision');
    table.dropColumn('goals');
    table.dropColumn('factory_address');
    table.dropColumn('factory_city');
    table.dropColumn('factory_state');
    table.dropColumn('factory_pincode');
    table.dropColumn('director1_name');
    table.dropColumn('director1_photo');
    table.dropColumn('director2_name');
    table.dropColumn('director2_photo');
    table.dropColumn('bank_name');
    table.dropColumn('bank_account_number');
    table.dropColumn('bank_ifsc_code');
    table.dropColumn('bank_branch');
  });
};
