/**
 * Migration 006: Payroll Tables
 * Tables: employees, salary_records, advances, advance_recoveries
 * Also adds head_of_department_id FK to departments
 */

exports.up = function (knex) {
  return knex.schema

    // ── employees ────────────────────────────────────────────────────
    .createTable('employees', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

      // ── Personal details ──
      table.string('employee_id').notNullable().unique(); // e.g. EMP-001
      table.string('salutation');
      table.string('first_name').notNullable();
      table.string('middle_name');
      table.string('last_name').notNullable();
      table.string('display_name');
      table.date('date_of_birth');
      table.string('gender'); // Male, Female, Other
      table.string('blood_group');
      table.string('marital_status'); // Single, Married, Divorced, Widowed
      table.string('nationality').defaultTo('Indian');
      table.string('religion');
      table.string('caste_category'); // General, OBC, SC, ST

      // ── Contact details ──
      table.string('personal_email');
      table.string('work_email');
      table.string('mobile_number');
      table.string('alternate_number');
      table.string('emergency_contact_name');
      table.string('emergency_contact_number');
      table.string('emergency_contact_relation');
      // Current address
      table.string('current_address_line1');
      table.string('current_address_line2');
      table.string('current_city');
      table.string('current_state');
      table.string('current_pincode');
      table.string('current_country').defaultTo('India');
      // Permanent address
      table.string('permanent_address_line1');
      table.string('permanent_address_line2');
      table.string('permanent_city');
      table.string('permanent_state');
      table.string('permanent_pincode');
      table.string('permanent_country').defaultTo('India');

      // ── Employment details ──
      table.uuid('department_id').references('id').inTable('departments').onDelete('SET NULL');
      table.string('designation');
      table.integer('grade').checkBetween([1, 5]);
      table.uuid('reporting_manager_id').references('id').inTable('employees').onDelete('SET NULL');
      table.date('date_of_joining');
      table.date('date_of_confirmation');
      table.date('date_of_resignation');
      table.date('date_of_leaving');
      table.string('employment_type').defaultTo('Full-time'); // Full-time, Part-time, Contract, Intern, Probation
      table.string('employment_status').defaultTo('Active'); // Active, On Notice, Relieved, Terminated, Absconding
      table.string('notice_period_days');
      table.text('exit_reason');
      table.string('work_location');
      table.string('shift');

      // ── Document details ──
      table.string('pan_number');
      table.string('aadhar_number');
      table.string('passport_number');
      table.date('passport_expiry');
      table.string('driving_license');
      table.string('voter_id');

      // ── Bank details ──
      table.string('bank_name');
      table.string('bank_account_number');
      table.string('bank_ifsc_code');
      table.string('bank_branch');

      // ── Salary details ──
      table.decimal('basic_salary', 18, 2).defaultTo(0);
      table.decimal('hra', 18, 2).defaultTo(0);
      table.decimal('dearness_allowance', 18, 2).defaultTo(0);
      table.decimal('conveyance_allowance', 18, 2).defaultTo(0);
      table.decimal('medical_allowance', 18, 2).defaultTo(0);
      table.decimal('special_allowance', 18, 2).defaultTo(0);
      table.decimal('other_allowance', 18, 2).defaultTo(0);
      table.decimal('gross_salary', 18, 2).defaultTo(0);
      table.decimal('ctc', 18, 2).defaultTo(0);
      table.string('payment_mode').defaultTo('Bank Transfer'); // Cash, Bank Transfer, Cheque

      // ── Statutory details ──
      table.string('pf_number'); // EPF Universal Account Number
      table.boolean('is_pf_applicable').defaultTo(true);
      table.string('esi_number');
      table.boolean('is_esi_applicable').defaultTo(false);
      table.string('uan_number');
      table.string('tax_regime').defaultTo('New'); // Old, New
      table.decimal('declared_investment_80c', 18, 2).defaultTo(0);
      table.decimal('declared_investment_80d', 18, 2).defaultTo(0);
      table.decimal('declared_hra_exemption', 18, 2).defaultTo(0);
      table.decimal('other_deductions', 18, 2).defaultTo(0);

      // ── Other ──
      table.text('photo_path');
      table.text('notes');
      table.boolean('is_active').defaultTo(true);
      table.timestamps(true, true);
    })

    // ── salary_records ───────────────────────────────────────────────
    .createTable('salary_records', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('employee_id').notNullable().references('id').inTable('employees').onDelete('CASCADE');
      table.integer('month').notNullable(); // 1-12
      table.integer('year').notNullable();
      table.string('status').defaultTo('Draft'); // Draft, Processed, Approved, Paid, Cancelled

      // ── Attendance ──
      table.integer('total_working_days').defaultTo(0);
      table.integer('days_present').defaultTo(0);
      table.integer('days_absent').defaultTo(0);
      table.integer('half_days').defaultTo(0);
      table.integer('leave_days').defaultTo(0);
      table.integer('overtime_hours').defaultTo(0);
      table.decimal('loss_of_pay_days', 5, 1).defaultTo(0);

      // ── Earnings ──
      table.decimal('basic_salary', 18, 2).defaultTo(0);
      table.decimal('hra', 18, 2).defaultTo(0);
      table.decimal('dearness_allowance', 18, 2).defaultTo(0);
      table.decimal('conveyance_allowance', 18, 2).defaultTo(0);
      table.decimal('medical_allowance', 18, 2).defaultTo(0);
      table.decimal('special_allowance', 18, 2).defaultTo(0);
      table.decimal('other_allowance', 18, 2).defaultTo(0);
      table.decimal('overtime_pay', 18, 2).defaultTo(0);
      table.decimal('bonus', 18, 2).defaultTo(0);
      table.decimal('incentive', 18, 2).defaultTo(0);
      table.decimal('arrears', 18, 2).defaultTo(0);
      table.decimal('reimbursements', 18, 2).defaultTo(0);
      table.decimal('gross_earnings', 18, 2).defaultTo(0);

      // ── Deductions ──
      table.decimal('pf_employee', 18, 2).defaultTo(0); // Employee PF (12% of basic)
      table.decimal('pf_employer', 18, 2).defaultTo(0); // Employer PF contribution
      table.decimal('esi_employee', 18, 2).defaultTo(0); // Employee ESI
      table.decimal('esi_employer', 18, 2).defaultTo(0); // Employer ESI
      table.decimal('professional_tax', 18, 2).defaultTo(0);
      table.decimal('income_tax', 18, 2).defaultTo(0); // TDS
      table.decimal('advance_deduction', 18, 2).defaultTo(0);
      table.decimal('loan_deduction', 18, 2).defaultTo(0);
      table.decimal('other_deductions', 18, 2).defaultTo(0);
      table.decimal('total_deductions', 18, 2).defaultTo(0);

      // ── Result ──
      table.decimal('net_salary', 18, 2).defaultTo(0);
      table.date('payment_date');
      table.string('payment_mode');
      table.string('payment_reference');
      table.uuid('bank_transaction_id').references('id').inTable('bank_transactions').onDelete('SET NULL');

      table.text('notes');
      table.timestamps(true, true);

      table.unique(['employee_id', 'month', 'year']);
    })

    // ── advances ─────────────────────────────────────────────────────
    .createTable('advances', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('employee_id').notNullable().references('id').inTable('employees').onDelete('CASCADE');
      table.date('advance_date').notNullable();
      table.decimal('amount', 18, 2).notNullable();
      table.decimal('balance_amount', 18, 2).notNullable();
      table.string('reason');
      table.string('status').defaultTo('Active'); // Active, Recovered, Cancelled
      table.integer('recovery_months').defaultTo(1); // number of EMIs
      table.decimal('monthly_deduction', 18, 2).defaultTo(0);
      table.string('payment_mode');
      table.string('reference_number');
      table.uuid('approved_by').references('id').inTable('app_users').onDelete('SET NULL');
      table.text('notes');
      table.timestamps(true, true);
    })

    // ── advance_recoveries ───────────────────────────────────────────
    .createTable('advance_recoveries', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('advance_id').notNullable().references('id').inTable('advances').onDelete('CASCADE');
      table.uuid('salary_record_id').references('id').inTable('salary_records').onDelete('SET NULL');
      table.date('recovery_date').notNullable();
      table.decimal('amount', 18, 2).notNullable();
      table.text('notes');
      table.timestamps(true, true);
    })

    // ── Add head_of_department_id FK to departments ──────────────────
    .alterTable('departments', (table) => {
      table.uuid('head_of_department_id').references('id').inTable('employees').onDelete('SET NULL');
    });
};

exports.down = function (knex) {
  return knex.schema
    .alterTable('departments', (table) => {
      table.dropColumn('head_of_department_id');
    })
    .dropTableIfExists('advance_recoveries')
    .dropTableIfExists('advances')
    .dropTableIfExists('salary_records')
    .dropTableIfExists('employees');
};
