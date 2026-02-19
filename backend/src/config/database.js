const knex = require('knex');
const knexConfig = require('../../knexfile');

const environment = process.env.NODE_ENV || 'development';
const db = knex(knexConfig[environment]);

// Test connection on startup
db.raw('SELECT 1')
  .then(() => console.log('PostgreSQL connected successfully'))
  .catch((err) => {
    console.error('PostgreSQL connection failed:', err.message);
    process.exit(1);
  });

module.exports = db;
