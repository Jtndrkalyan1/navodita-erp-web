const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Determine if we're using MySQL or PostgreSQL
const isMySQL = process.env.DB_CLIENT === 'mysql' || process.env.DB_CLIENT === 'mysql2';
const dbClient = isMySQL ? 'mysql2' : 'pg';

module.exports = {
  development: {
    client: dbClient,
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || (isMySQL ? 3306 : 5432),
      database: process.env.DB_NAME || 'navodita_erp',
      user: process.env.DB_USER || 'kaliraman',
      password: process.env.DB_PASSWORD || '',
    },
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
    connection: process.env.DATABASE_URL || {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || (isMySQL ? 3306 : 5432),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    },
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
