/**
 * Migration 014: WebAuthn Credentials
 * Store WebAuthn/FIDO2 credential data for biometric authentication
 */

exports.up = function (knex) {
  return knex.schema.createTable('webauthn_credentials', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('app_users').onDelete('CASCADE');
    table.text('credential_id').notNullable().unique();
    table.text('public_key').notNullable();
    table.bigInteger('counter').notNullable().defaultTo(0);
    table.text('transports'); // JSON array of transports e.g. ["internal","usb"]
    table.string('device_name'); // optional friendly name for the device
    table.timestamps(true, true);

    table.index('user_id');
    table.index('credential_id');
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('webauthn_credentials');
};
