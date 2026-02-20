/**
 * Migration Helper - Database-agnostic UUID and timestamp handling
 * Supports both PostgreSQL and MySQL
 */

/**
 * Add UUID primary key column
 * - PostgreSQL: Uses gen_random_uuid()
 * - MySQL: Uses CHAR(36) with trigger or application-level UUID
 */
function addUuidPrimaryKey(table, knex, columnName = 'id') {
  const isMySQL = knex.client.config.client === 'mysql' || knex.client.config.client === 'mysql2';

  if (isMySQL) {
    // MySQL: Use CHAR(36) for UUID storage
    table.string(columnName, 36).primary();
  } else {
    // PostgreSQL: Use native UUID with gen_random_uuid()
    table.uuid(columnName).primary().defaultTo(knex.raw('gen_random_uuid()'));
  }
}

/**
 * Add UUID foreign key column
 */
function addUuidColumn(table, knex, columnName) {
  const isMySQL = knex.client.config.client === 'mysql' || knex.client.config.client === 'mysql2';

  if (isMySQL) {
    table.string(columnName, 36);
  } else {
    table.uuid(columnName);
  }
}

/**
 * Add UUID foreign key reference
 */
function addUuidReference(table, knex, columnName, referencedTable, referencedColumn = 'id', onDelete = 'CASCADE') {
  const isMySQL = knex.client.config.client === 'mysql' || knex.client.config.client === 'mysql2';

  if (isMySQL) {
    table.string(columnName, 36).references(referencedColumn).inTable(referencedTable).onDelete(onDelete);
  } else {
    table.uuid(columnName).references(referencedColumn).inTable(referencedTable).onDelete(onDelete);
  }
}

/**
 * Check if database is MySQL
 */
function isMySQL(knex) {
  return knex.client.config.client === 'mysql' || knex.client.config.client === 'mysql2';
}

module.exports = {
  addUuidPrimaryKey,
  addUuidColumn,
  addUuidReference,
  isMySQL,
};
