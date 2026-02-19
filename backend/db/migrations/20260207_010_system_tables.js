/**
 * Migration 010: System Tables
 * Tables: documents
 */

exports.up = function (knex) {
  return knex.schema

    // ── documents ────────────────────────────────────────────────────
    .createTable('documents', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('file_name').notNullable();
      table.text('file_path').notNullable();
      table.string('file_type'); // pdf, jpg, png, xlsx, csv, etc.
      table.integer('file_size'); // in bytes
      table.string('category'); // Vendor, Customer, Invoice, Bill, HR, Banking
      table.string('entity_type'); // Customer, Vendor, Invoice, Bill, Employee, BankAccount, etc.
      table.uuid('entity_id');
      table.text('ocr_text'); // extracted text from OCR processing
      table.uuid('customer_id').references('id').inTable('customers').onDelete('SET NULL');
      table.uuid('vendor_id').references('id').inTable('vendors').onDelete('SET NULL');
      table.uuid('uploaded_by').references('id').inTable('app_users').onDelete('SET NULL');
      table.text('description');
      table.text('tags'); // comma-separated or JSON array of tags
      table.boolean('is_active').defaultTo(true);
      table.timestamps(true, true);

      table.index(['entity_type', 'entity_id']);
      table.index('category');
    });
};

exports.down = function (knex) {
  return knex.schema
    .dropTableIfExists('documents');
};
