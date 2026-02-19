exports.up = function(knex) {
  return knex.schema
    .table('vendors', table => {
      table.string('trade_name');
      table.string('legal_name');
      table.string('taxpayer_type');
      table.string('gst_status');
      table.string('gst_registration_date');
    })
    .table('customers', table => {
      table.string('trade_name');
      table.string('legal_name');
      table.string('taxpayer_type');
      table.string('gst_status');
      table.string('gst_registration_date');
    });
};

exports.down = function(knex) {
  return knex.schema
    .table('vendors', table => {
      table.dropColumn('trade_name');
      table.dropColumn('legal_name');
      table.dropColumn('taxpayer_type');
      table.dropColumn('gst_status');
      table.dropColumn('gst_registration_date');
    })
    .table('customers', table => {
      table.dropColumn('trade_name');
      table.dropColumn('legal_name');
      table.dropColumn('taxpayer_type');
      table.dropColumn('gst_status');
      table.dropColumn('gst_registration_date');
    });
};
