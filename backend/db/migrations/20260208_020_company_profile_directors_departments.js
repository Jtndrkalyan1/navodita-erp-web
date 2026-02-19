/**
 * Migration 020: Company Profile – Directors bio/designation + Departments
 * Add missing columns that the frontend CompanyPage form expects.
 */

exports.up = function (knex) {
  return knex.schema.alterTable('company_profile', (table) => {
    // Director 1 extra fields
    table.string('director1_designation');
    table.text('director1_bio');

    // Director 2 extra fields
    table.string('director2_designation');
    table.text('director2_bio');

    // Departments (stored as JSON string)
    table.text('departments');

    // CIN alias – the original migration used cin_number;
    // the frontend sends cin. Add cin column so both work.
    table.string('cin');
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable('company_profile', (table) => {
    table.dropColumn('director1_designation');
    table.dropColumn('director1_bio');
    table.dropColumn('director2_designation');
    table.dropColumn('director2_bio');
    table.dropColumn('departments');
    table.dropColumn('cin');
  });
};
