/**
 * Migration 022: Investor Profile Enhancements
 * - Adds profile/contact columns to investor_partners (phone, email, address, PAN, Aadhar, bank details, notes)
 * - Creates investor_transactions table for tracking statement entries (received, returned, investment, withdrawal)
 */

exports.up = async function (knex) {
  // ── Add columns to investor_partners ────────────────────────────
  const columnsToAdd = [
    { name: 'phone', type: (t) => t.string('phone', 20) },
    { name: 'email', type: (t) => t.string('email', 255) },
    { name: 'address', type: (t) => t.text('address') },
    { name: 'pan', type: (t) => t.string('pan', 20) },
    { name: 'aadhar', type: (t) => t.string('aadhar', 20) },
    { name: 'bank_name', type: (t) => t.string('bank_name', 255) },
    { name: 'bank_account_number', type: (t) => t.string('bank_account_number', 50) },
    { name: 'bank_ifsc', type: (t) => t.string('bank_ifsc', 20) },
    { name: 'notes', type: (t) => t.text('notes') },
  ];

  for (const col of columnsToAdd) {
    const hasCol = await knex.schema.hasColumn('investor_partners', col.name);
    if (!hasCol) {
      await knex.schema.alterTable('investor_partners', (table) => {
        col.type(table);
      });
    }
  }

  // ── Create investor_transactions table ──────────────────────────
  const hasTable = await knex.schema.hasTable('investor_transactions');
  if (!hasTable) {
    await knex.schema.createTable('investor_transactions', (table) => {
      table.increments('id').primary();
      table
        .uuid('partner_id')
        .notNullable()
        .references('id')
        .inTable('investor_partners')
        .onDelete('CASCADE');
      table.date('transaction_date').notNullable();
      table.string('type', 20).notNullable(); // 'received', 'returned', 'investment', 'withdrawal'
      table.decimal('amount', 15, 2).notNullable();
      table.text('description');
      table.string('reference', 255);
      table
        .uuid('bank_transaction_id')
        .nullable()
        .references('id')
        .inTable('bank_transactions')
        .onDelete('SET NULL');
      table.timestamps(true, true); // created_at, updated_at with defaults
    });
  }
};

exports.down = async function (knex) {
  // Drop investor_transactions table
  await knex.schema.dropTableIfExists('investor_transactions');

  // Remove added columns from investor_partners
  const columnsToDrop = [
    'phone', 'email', 'address', 'pan', 'aadhar',
    'bank_name', 'bank_account_number', 'bank_ifsc', 'notes',
  ];

  for (const col of columnsToDrop) {
    const hasCol = await knex.schema.hasColumn('investor_partners', col);
    if (hasCol) {
      await knex.schema.alterTable('investor_partners', (table) => {
        table.dropColumn(col);
      });
    }
  }
};
