/**
 * Migration 019: Zoho Books-style Bank Transaction Categorization
 * Adds customer_id, vendor_id, transfer_account_id, linked_invoice_ids, linked_bill_ids
 * to bank_transactions table for the enhanced Zoho-style categorization workflow.
 */

exports.up = function (knex) {
  return knex.schema.alterTable('bank_transactions', (table) => {
    // Customer link (for Customer Payment, Retainer Payment categories)
    table.uuid('customer_id').references('id').inTable('customers').onDelete('SET NULL');

    // Vendor link (for Vendor Payment, Vendor Credit Refund categories)
    table.uuid('vendor_id').references('id').inTable('vendors').onDelete('SET NULL');

    // Transfer account link (for Transfer From/To Another Account categories)
    table.uuid('transfer_account_id').references('id').inTable('bank_accounts').onDelete('SET NULL');

    // Linked invoices (JSON array of invoice IDs for payment matching)
    table.jsonb('linked_invoice_ids').defaultTo('[]');

    // Linked bills (JSON array of bill IDs for payment matching)
    table.jsonb('linked_bill_ids').defaultTo('[]');

    // Indexes for common queries
    table.index(['customer_id']);
    table.index(['vendor_id']);
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable('bank_transactions', (table) => {
    table.dropIndex(['vendor_id']);
    table.dropIndex(['customer_id']);
    table.dropColumn('linked_bill_ids');
    table.dropColumn('linked_invoice_ids');
    table.dropColumn('transfer_account_id');
    table.dropColumn('vendor_id');
    table.dropColumn('customer_id');
  });
};
