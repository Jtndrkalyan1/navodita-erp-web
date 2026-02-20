/**
 * Create Admin User Script
 * Run this after deploying to Hostinger to create the initial admin user
 *
 * Usage: node scripts/create-admin.js
 */

require('dotenv').config();
const db = require('../src/config/database');
const bcrypt = require('bcryptjs');

async function createAdminUser() {
  try {
    console.log('Creating admin user...');

    // Check if admin already exists
    const existing = await db('app_users')
      .where({ username: 'admin' })
      .first();

    if (existing) {
      console.log('❌ Admin user already exists!');
      console.log('Username:', existing.username);
      console.log('Email:', existing.email);
      console.log('\nIf you need to reset the password, delete the user first or use a different username.');
      process.exit(1);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('Admin@123', 10);

    // Create admin user
    const [user] = await db('app_users')
      .insert({
        username: 'admin',
        email: 'admin@navodita.com',
        password_hash: hashedPassword,
        full_name: 'System Administrator',
        role: 'Admin',
        is_active: true,
        failed_login_attempts: 0,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning('*');

    console.log('✅ Admin user created successfully!\n');
    console.log('═══════════════════════════════════════');
    console.log('  Username: admin');
    console.log('  Password: Admin@123');
    console.log('  Email:    admin@navodita.com');
    console.log('  Role:     Admin');
    console.log('═══════════════════════════════════════\n');
    console.log('⚠️  IMPORTANT: Change this password immediately after first login!');
    console.log('   Go to Settings → Users → Change Password\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run the script
createAdminUser();
