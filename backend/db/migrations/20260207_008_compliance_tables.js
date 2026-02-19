/**
 * Migration 008: Compliance Tables
 * Tables: gst_filings, tds_challans, tds_liabilities
 */

exports.up = function (knex) {
  return knex.schema

    // ── gst_filings ──────────────────────────────────────────────────
    .createTable('gst_filings', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('filing_type').notNullable(); // GSTR-1, GSTR-3B, GSTR-9, CMP-08, etc.
      table.string('period'); // e.g. "January 2026", "Q1 2025-26"
      table.integer('filing_year').notNullable();
      table.integer('filing_month'); // 1-12, null for annual/quarterly
      table.string('status').defaultTo('Pending'); // Pending, Prepared, Filed, Error
      // Tax amounts
      table.decimal('total_taxable_value', 18, 2).defaultTo(0);
      table.decimal('total_igst', 18, 2).defaultTo(0);
      table.decimal('total_cgst', 18, 2).defaultTo(0);
      table.decimal('total_sgst', 18, 2).defaultTo(0);
      table.decimal('total_cess', 18, 2).defaultTo(0);
      table.decimal('total_tax', 18, 2).defaultTo(0);
      // Filing details
      table.date('filing_date');
      table.date('due_date');
      table.string('acknowledgement_number');
      table.text('json_data'); // Full filing data as JSON
      table.text('notes');
      table.timestamps(true, true);

      table.index(['filing_type', 'filing_year', 'filing_month']);
    })

    // ── tds_challans ─────────────────────────────────────────────────
    .createTable('tds_challans', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('challan_number');
      table.string('challan_type').defaultTo('281'); // 280 (Income Tax), 281 (TDS/TCS)
      table.string('bsr_code');
      table.date('deposit_date');
      table.string('quarter_period'); // Q1, Q2, Q3, Q4
      table.string('assessment_year'); // e.g. "2026-27"
      // Amounts
      table.decimal('total_tds_deposited', 18, 2).defaultTo(0);
      table.decimal('surcharge', 18, 2).defaultTo(0);
      table.decimal('education_cess', 18, 2).defaultTo(0);
      table.decimal('interest', 18, 2).defaultTo(0);
      table.decimal('late_fee', 18, 2).defaultTo(0);
      table.decimal('total_amount', 18, 2).defaultTo(0);
      // Bank details
      table.string('bank_name');
      table.string('bank_branch');
      // Status
      table.string('status').defaultTo('Pending'); // Pending, Deposited, Verified
      table.text('notes');
      table.timestamps(true, true);
    })

    // ── tds_liabilities ──────────────────────────────────────────────
    .createTable('tds_liabilities', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('section').notNullable(); // 194C, 194J, 194H, 194I, etc.
      table.string('deductee_type'); // Individual, Company, HUF, Firm, etc.
      table.string('deductee_name').notNullable();
      table.string('deductee_pan');
      table.string('deductee_gstin');
      table.decimal('tds_rate', 5, 2).notNullable();
      table.decimal('gross_amount', 18, 2).notNullable();
      table.decimal('tds_amount', 18, 2).notNullable();
      table.decimal('surcharge', 18, 2).defaultTo(0);
      table.decimal('cess_tds', 18, 2).defaultTo(0);
      table.decimal('total_tds', 18, 2).notNullable();
      table.date('deduction_date');
      table.string('status').defaultTo('Pending'); // Pending, Deposited, Filed
      // Links
      table.uuid('linked_bill_id').references('id').inTable('bills').onDelete('SET NULL');
      table.uuid('linked_expense_id').references('id').inTable('expenses').onDelete('SET NULL');
      table.uuid('linked_salary_record_id').references('id').inTable('salary_records').onDelete('SET NULL');
      table.uuid('challan_id').references('id').inTable('tds_challans').onDelete('SET NULL');
      // Quarter / Assessment year
      table.string('quarter_period');
      table.string('assessment_year');
      table.text('notes');
      table.timestamps(true, true);

      table.index(['section', 'status']);
    });
};

exports.down = function (knex) {
  return knex.schema
    .dropTableIfExists('tds_liabilities')
    .dropTableIfExists('tds_challans')
    .dropTableIfExists('gst_filings');
};
