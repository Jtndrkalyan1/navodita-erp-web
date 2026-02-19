/**
 * Migration 001: Core Tables
 * Tables: company_profile, app_users, app_settings, audit_logs,
 *         currencies, chart_of_accounts, departments, invoice_number_settings
 */

exports.up = function (knex) {
  return knex.schema

    // ── company_profile ──────────────────────────────────────────────
    .createTable('company_profile', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('company_name').notNullable();
      table.string('legal_name');
      table.string('industry');
      table.string('company_type'); // Pvt Ltd, LLP, Proprietorship, etc.
      table.string('cin_number');
      table.string('gstin');
      table.string('pan');
      table.string('tan');
      table.string('lut_number');
      table.date('lut_expiry_date');
      table.string('iec_code');
      table.string('address_line1');
      table.string('address_line2');
      table.string('city');
      table.string('state');
      table.string('pincode');
      table.string('country').defaultTo('India');
      table.string('phone');
      table.string('email');
      table.string('website');
      table.text('logo_path');
      table.string('financial_year_start'); // e.g. "04" for April
      table.string('base_currency').defaultTo('INR');
      table.text('bank_details');
      table.text('terms_and_conditions');
      table.text('notes');
      table.timestamps(true, true);
    })

    // ── app_users ────────────────────────────────────────────────────
    .createTable('app_users', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('username').notNullable().unique();
      table.string('password_hash').notNullable();
      table.string('display_name');
      table.string('email').unique();
      table.string('role').notNullable().defaultTo('viewer'); // admin, manager, accountant, viewer
      table.boolean('is_active').defaultTo(true);
      table.timestamp('last_login_at');
      table.string('security_question');
      table.string('security_answer_hash');
      table.integer('failed_login_attempts').defaultTo(0);
      table.timestamp('locked_until');
      table.timestamps(true, true);
    })

    // ── app_settings ─────────────────────────────────────────────────
    .createTable('app_settings', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('setting_key').notNullable().unique();
      table.text('setting_value');
      table.string('setting_type').defaultTo('string'); // string, boolean, number, json
      table.string('category'); // general, security, display, etc.
      table.text('description');
      table.timestamps(true, true);
    })

    // ── audit_logs ───────────────────────────────────────────────────
    .createTable('audit_logs', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('user_id').references('id').inTable('app_users').onDelete('SET NULL');
      table.string('action').notNullable(); // CREATE, UPDATE, DELETE, LOGIN, etc.
      table.string('entity_type').notNullable();
      table.uuid('entity_id');
      table.text('old_values'); // JSON
      table.text('new_values'); // JSON
      table.string('ip_address');
      table.string('user_agent');
      table.timestamp('performed_at').defaultTo(knex.fn.now());
      table.timestamps(true, true);
    })

    // ── currencies ───────────────────────────────────────────────────
    .createTable('currencies', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('code', 3).notNullable().unique(); // INR, USD, EUR, etc.
      table.string('name').notNullable();
      table.string('symbol');
      table.decimal('exchange_rate', 18, 6).defaultTo(1.0);
      table.boolean('is_base_currency').defaultTo(false);
      table.boolean('is_active').defaultTo(true);
      table.timestamps(true, true);
    })

    // ── chart_of_accounts (self-referential) ─────────────────────────
    .createTable('chart_of_accounts', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('account_code').notNullable().unique();
      table.string('account_name').notNullable();
      table.string('account_type').notNullable(); // Asset, Liability, Equity, Income, Expense
      table.string('account_sub_type'); // Current Asset, Fixed Asset, etc.
      table.uuid('parent_account_id').references('id').inTable('chart_of_accounts').onDelete('SET NULL');
      table.text('description');
      table.decimal('opening_balance', 18, 2).defaultTo(0);
      table.decimal('current_balance', 18, 2).defaultTo(0);
      table.string('currency_code', 3).defaultTo('INR');
      table.boolean('is_system_account').defaultTo(false);
      table.boolean('is_active').defaultTo(true);
      table.integer('sort_order').defaultTo(0);
      table.timestamps(true, true);
    })

    // ── departments ──────────────────────────────────────────────────
    .createTable('departments', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('name').notNullable().unique();
      table.text('description');
      table.boolean('is_active').defaultTo(true);
      // head_of_department_id will be added via ALTER TABLE in payroll migration
      table.timestamps(true, true);
    })

    // ── invoice_number_settings ──────────────────────────────────────
    .createTable('invoice_number_settings', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('document_type').notNullable(); // Invoice, Quotation, Bill, CreditNote, etc.
      table.string('prefix').defaultTo('');
      table.string('suffix').defaultTo('');
      table.integer('next_number').defaultTo(1);
      table.integer('padding_digits').defaultTo(4);
      table.string('separator').defaultTo('-');
      table.boolean('include_financial_year').defaultTo(true);
      table.string('financial_year_format').defaultTo('YY-YY'); // 24-25 or 2024-25
      table.string('reset_frequency').defaultTo('yearly'); // yearly, monthly, never
      table.timestamps(true, true);

      table.unique(['document_type']);
    });
};

exports.down = function (knex) {
  return knex.schema
    .dropTableIfExists('invoice_number_settings')
    .dropTableIfExists('departments')
    .dropTableIfExists('chart_of_accounts')
    .dropTableIfExists('currencies')
    .dropTableIfExists('audit_logs')
    .dropTableIfExists('app_settings')
    .dropTableIfExists('app_users')
    .dropTableIfExists('company_profile');
};
