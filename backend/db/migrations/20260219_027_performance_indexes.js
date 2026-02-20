/**
 * Migration: Performance Indexes
 * Adds indexes on frequently queried columns to improve query performance
 */
exports.up = async function (knex) {
  // invoices
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id)');
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_invoices_invoice_date ON invoices(invoice_date)');
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status)');
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date)');
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at)');

  // invoice_items
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id)');

  // bills
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_bills_vendor_id ON bills(vendor_id)');
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_bills_bill_date ON bills(bill_date)');
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(status)');
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_bills_due_date ON bills(due_date)');

  // bill_items
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_bill_items_bill_id ON bill_items(bill_id)');

  // customers
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_customers_display_name ON customers(display_name)');
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_customers_is_active ON customers(is_active)');
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_customers_gstin ON customers(gstin)');

  // vendors
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_vendors_display_name ON vendors(display_name)');
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_vendors_is_active ON vendors(is_active)');

  // items
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_items_is_active ON items(is_active)');
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_items_category ON items(category)');
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_items_sku ON items(sku)');

  // expenses
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON expenses(expense_date)');
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status)');
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_expenses_vendor_id ON expenses(vendor_id)');

  // payments_received
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_payments_received_customer_id ON payments_received(customer_id)');
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_payments_received_payment_date ON payments_received(payment_date)');
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_payments_received_status ON payments_received(status)');

  // payments_made
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_payments_made_vendor_id ON payments_made(vendor_id)');
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_payments_made_payment_date ON payments_made(payment_date)');

  // bank_transactions
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_bank_transactions_bank_account_id ON bank_transactions(bank_account_id)');
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_bank_transactions_transaction_date ON bank_transactions(transaction_date)');
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_bank_transactions_is_reconciled ON bank_transactions(is_reconciled)');

  // salary_records
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_salary_records_employee_id ON salary_records(employee_id)');
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_salary_records_year_month ON salary_records(year, month)');

  // employees
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_employees_department_id ON employees(department_id)');
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_employees_is_active ON employees(is_active)');

  // quotations
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_quotations_customer_id ON quotations(customer_id)');
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status)');

  // journal_entries / journal_lines
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_journal_lines_account_id ON journal_lines(account_id)');
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_journal_lines_journal_entry_id ON journal_lines(journal_entry_id)');
};

exports.down = async function (knex) {
  const indexes = [
    'idx_invoices_customer_id','idx_invoices_invoice_date','idx_invoices_status','idx_invoices_due_date','idx_invoices_created_at',
    'idx_invoice_items_invoice_id',
    'idx_bills_vendor_id','idx_bills_bill_date','idx_bills_status','idx_bills_due_date',
    'idx_bill_items_bill_id',
    'idx_customers_display_name','idx_customers_is_active','idx_customers_gstin',
    'idx_vendors_display_name','idx_vendors_is_active',
    'idx_items_is_active','idx_items_category','idx_items_sku',
    'idx_expenses_expense_date','idx_expenses_status','idx_expenses_vendor_id',
    'idx_payments_received_customer_id','idx_payments_received_payment_date','idx_payments_received_status',
    'idx_payments_made_vendor_id','idx_payments_made_payment_date',
    'idx_bank_transactions_bank_account_id','idx_bank_transactions_transaction_date','idx_bank_transactions_is_reconciled',
    'idx_salary_records_employee_id','idx_salary_records_year_month',
    'idx_employees_department_id','idx_employees_is_active',
    'idx_quotations_customer_id','idx_quotations_status',
    'idx_journal_lines_account_id','idx_journal_lines_journal_entry_id',
  ];
  for (const idx of indexes) {
    await knex.schema.raw(`DROP INDEX IF EXISTS ${idx}`);
  }
};
