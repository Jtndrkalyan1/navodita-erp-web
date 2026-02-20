const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Determine if we're using MySQL or PostgreSQL
const isMySQL = process.env.DB_CLIENT === 'mysql' || process.env.DB_CLIENT === 'mysql2';
const dbClient = isMySQL ? 'mysql2' : 'pg';

// Build connection object — handle Unix socket path for shared hosting (e.g. Hostinger)
function buildConnection(defaults = {}) {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  const host = process.env.DB_HOST || defaults.host || 'localhost';
  const isSocket = host.startsWith('/');

  const conn = {
    database: process.env.DB_NAME || defaults.database || 'navodita_erp',
    user: process.env.DB_USER || defaults.user || 'kaliraman',
    password: process.env.DB_PASSWORD || defaults.password || '',
  };

  if (isSocket && isMySQL) {
    conn.socketPath = host;
  } else {
    conn.host = host;
    conn.port = parseInt(process.env.DB_PORT) || (isMySQL ? 3306 : 5432);
  }

  return conn;
}

module.exports = {
  development: {
    client: dbClient,
    connection: buildConnection({ host: 'localhost', database: 'navodita_erp', user: 'kaliraman' }),
    pool: { min: 2, max: 10 },
    migrations: {
      directory: './db/migrations',
      tableName: 'knex_migrations',
    },
    seeds: {
      directory: './db/seeds',
    },
  },

  production: {
    client: dbClient,
    connection: buildConnection(),
    pool: { min: 2, max: 10 },
    migrations: {
      directory: './db/migrations',
      tableName: 'knex_migrations',
    },
    seeds: {
      directory: './db/seeds',
    },
  },
};
