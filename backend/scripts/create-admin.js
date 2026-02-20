/**
 * Create Admin User Script
 * Run this after deploying to Hostinger to create the initial admin user
 *
 * Usage: node scripts/create-admin.js
 */

require('dotenv').config();
const db = require('../src/config/database');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

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

    // Check if we're using MySQL (doesn't auto-generate UUIDs)
    const isMySQL = db.client.config.client === 'mysql' || db.client.config.client === 'mysql2';

    // Create admin user
    const adminData = {
      username: 'admin',
      email: 'admin@navodita.com',
      password_hash: hashedPassword,
      full_name: 'System Administrator',
      role: 'Admin',
      is_active: true,
      failed_login_attempts: 0,
      created_at: new Date(),
      updated_at: new Date(),
    };

    // Add UUID for MySQL
    if (isMySQL) {
      adminData.id = uuidv4();
    }

    const [user] = await db('app_users')
      .insert(adminData)
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
