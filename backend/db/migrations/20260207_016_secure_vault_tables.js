/**
 * Migration 016: Secure Document Vault
 * Password-protected document vault for government certificates and important documents
 * Uses hasTable checks since these tables may have been created directly via psql.
 */

exports.up = async function (knex) {
  const hasVaultSettings = await knex.schema.hasTable('secure_vault_settings');
  if (!hasVaultSettings) {
    await knex.schema.createTable('secure_vault_settings', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('user_id').notNullable().references('id').inTable('app_users').onDelete('CASCADE');
      table.text('vault_password_hash').notNullable();
      table.string('security_question');
      table.text('security_answer_hash');
      table.integer('failed_attempts').notNullable().defaultTo(0);
      table.timestamp('locked_until');
      table.timestamps(true, true);

      table.unique('user_id');
    });
  }

  const hasSecureDocs = await knex.schema.hasTable('secure_documents');
  if (!hasSecureDocs) {
    await knex.schema.createTable('secure_documents', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('user_id').notNullable().references('id').inTable('app_users').onDelete('CASCADE');
      table.string('folder_name').notNullable().defaultTo('Other');
      table.string('document_name').notNullable();
      table.string('document_type').notNullable();
      table.text('file_path').notNullable();
      table.bigInteger('file_size').notNullable().defaultTo(0);
      table.string('mime_type');
      table.text('notes');
      table.boolean('is_locked').notNullable().defaultTo(true);
      table.timestamps(true, true);

      table.index('user_id');
      table.index('folder_name');
      table.index('document_type');
    });
  }
};

exports.down = function (knex) {
  return knex.schema
    .dropTableIfExists('secure_documents')
    .then(() => knex.schema.dropTableIfExists('secure_vault_settings'));
};
