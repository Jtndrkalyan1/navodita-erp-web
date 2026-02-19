/**
 * Seed 003: Default Admin User
 * Creates a default admin user with bcrypt-hashed password.
 * Credentials: admin / admin123
 */

const bcrypt = require('bcryptjs');

exports.seed = async function (knex) {
  // Truncate app_users (audit_logs FK is SET NULL so safe to delete)
  await knex('app_users').del();

  // Hash the default password
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('admin123', salt);

  await knex('app_users').insert({
    username: 'admin',
    password_hash: passwordHash,
    display_name: 'Administrator',
    email: 'admin@navodita.com',
    role: 'Admin',
    is_active: true,
    failed_login_attempts: 0,
  });

  console.log('Seeded default admin user (admin / admin123).');
};
