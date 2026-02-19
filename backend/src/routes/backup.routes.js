const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// ── Helper: verify user password ─────────────────────────────────
async function verifyPassword(userId, password) {
  const user = await db('app_users').where({ id: userId }).first();
  if (!user) return false;
  return bcrypt.compare(password, user.password_hash);
}

// ── Helper: ensure backups table exists ──────────────────────────
async function ensureBackupsTable() {
  await db.schema.hasTable('backups').then(async (exists) => {
    if (!exists) {
      await db.schema.createTable('backups', (table) => {
        table.increments('id').primary();
        table.integer('user_id').unsigned().notNullable();
        table.string('backup_name', 255).notNullable();
        table.text('backup_data', 'longtext').notNullable();
        table.timestamp('created_at').defaultTo(db.fn.now());
      });
    }
  });
}

// Tables to back up (in order)
const backupTables = [
  'customers', 'customer_addresses', 'vendors', 'vendor_addresses', 'items',
  'employees', 'departments', 'bank_accounts', 'company_profile', 'app_settings',
  'invoices', 'invoice_items', 'quotations', 'quotation_items', 'bills', 'bill_items',
  'credit_notes', 'credit_note_items', 'debit_notes', 'debit_note_items',
  'delivery_challans', 'delivery_challan_items', 'packing_lists', 'packing_list_items', 'packing_list_sub_items',
  'eway_bills', 'eway_bill_items', 'purchase_orders', 'purchase_order_items',
  'payments_received', 'payment_received_allocations', 'payments_made', 'payment_made_allocations',
  'expenses', 'journal_entries', 'journal_lines',
  'costing_sheets', 'costing_versions', 'costing_fabric_items', 'costing_trim_items', 'costing_packing_items', 'style_costings',
  'salary_records', 'bank_transactions', 'gst_filings',
  'tds_liabilities', 'tds_challans', 'currency_adjustments',
  'audit_logs', 'documents', 'secure_documents', 'offer_letters', 'joining_letters',
  'government_holidays', 'hr_policies',
  'investor_orders', 'investor_partners', 'investor_transactions', 'investor_monthly_summary',
  'inventory_items', 'inventory_categories', 'inventory_transactions',
  'advances', 'advance_recoveries',
];

// Delete order for restore (child tables first, then parents — same as factory reset)
const deleteOrder = [
  // Child / junction tables
  'payment_received_allocations',
  'payment_made_allocations',
  'invoice_items',
  'quotation_items',
  'bill_items',
  'credit_note_items',
  'debit_note_items',
  'delivery_challan_items',
  'packing_list_sub_items',
  'packing_list_items',
  'eway_bill_items',
  'purchase_order_items',
  'journal_lines',
  'costing_fabric_items',
  'costing_trim_items',
  'costing_packing_items',
  'costing_versions',
  'style_costings',
  'inventory_transactions',
  'advance_recoveries',
  'investor_transactions',
  'investor_monthly_summary',
  'customer_addresses',
  'vendor_addresses',
  // Parent tables
  'payments_received',
  'payments_made',
  'invoices',
  'quotations',
  'bills',
  'credit_notes',
  'debit_notes',
  'delivery_challans',
  'packing_lists',
  'eway_bills',
  'purchase_orders',
  'expenses',
  'journal_entries',
  'costing_sheets',
  'salary_records',
  'bank_transactions',
  'gst_filings',
  'tds_liabilities',
  'tds_challans',
  'currency_adjustments',
  'audit_logs',
  'documents',
  'secure_documents',
  'offer_letters',
  'joining_letters',
  'government_holidays',
  'hr_policies',
  'investor_orders',
  'investor_partners',
  'inventory_items',
  'inventory_categories',
  'advances',
  // Master tables
  'customers',
  'vendors',
  'items',
  'employees',
  'departments',
  'bank_accounts',
  'company_profile',
  'app_settings',
];

// ── POST /create ─ Create a backup ──────────────────────────────
router.post('/create', async (req, res, next) => {
  try {
    const { password, backupName } = req.body;

    if (!password) {
      return res.status(400).json({ success: false, message: 'Password is required for security verification.' });
    }

    const isValid = await verifyPassword(req.user.id, password);
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Incorrect password. Backup denied.' });
    }

    // Generate default backup name if not provided
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const defaultName = `Backup_${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}`;
    const finalName = backupName && backupName.trim() ? backupName.trim() : defaultName;

    // Collect data from all tables
    const backupData = {};
    for (const table of backupTables) {
      try {
        const rows = await db(table).select('*');
        backupData[table] = rows;
      } catch (e) {
        // Table may not exist, skip
        backupData[table] = [];
      }
    }

    // Ensure backups table exists
    await ensureBackupsTable();

    // Store the backup
    const [id] = await db('backups').insert({
      user_id: req.user.id,
      backup_name: finalName,
      backup_data: JSON.stringify(backupData),
      created_at: new Date(),
    });

    const backup = await db('backups').where({ id }).select('id', 'backup_name', 'created_at').first();

    res.json({
      success: true,
      message: 'Backup created',
      backup: {
        id: backup.id,
        backup_name: backup.backup_name,
        created_at: backup.created_at,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /list ─ List all backups ────────────────────────────────
router.get('/list', async (req, res, next) => {
  try {
    await ensureBackupsTable();

    const backups = await db('backups')
      .select('id', 'backup_name', 'created_at')
      .orderBy('created_at', 'desc');

    res.json({ success: true, backups });
  } catch (err) {
    next(err);
  }
});

// ── POST /restore ─ Restore from a backup ───────────────────────
router.post('/restore', async (req, res, next) => {
  try {
    const { password, backupId } = req.body;

    if (!password) {
      return res.status(400).json({ success: false, message: 'Password is required for security verification.' });
    }

    if (!backupId) {
      return res.status(400).json({ success: false, message: 'Backup ID is required.' });
    }

    const isValid = await verifyPassword(req.user.id, password);
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Incorrect password. Restore denied.' });
    }

    await ensureBackupsTable();

    const backup = await db('backups').where({ id: backupId }).first();
    if (!backup) {
      return res.status(404).json({ success: false, message: 'Backup not found.' });
    }

    const backupData = JSON.parse(backup.backup_data);

    await db.transaction(async (trx) => {
      // Delete all tables in the correct order (child tables first)
      for (const table of deleteOrder) {
        try {
          await trx(table).del();
        } catch (e) {
          // Table may not exist, skip
        }
      }

      // Insert backup data table by table
      for (const table of backupTables) {
        try {
          const rows = backupData[table];
          if (rows && rows.length > 0) {
            await trx.batchInsert(table, rows, 100);
          }
        } catch (e) {
          // Table may not exist or schema mismatch, skip
        }
      }
    });

    res.json({ success: true, message: 'Backup restored successfully' });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /delete/:id ─ Delete a backup ────────────────────────
router.delete('/delete/:id', async (req, res, next) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ success: false, message: 'Password is required for security verification.' });
    }

    const isValid = await verifyPassword(req.user.id, password);
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Incorrect password. Delete denied.' });
    }

    await ensureBackupsTable();

    const backup = await db('backups').where({ id: req.params.id }).first();
    if (!backup) {
      return res.status(404).json({ success: false, message: 'Backup not found.' });
    }

    await db('backups').where({ id: req.params.id }).del();

    res.json({ success: true, message: 'Backup deleted' });
  } catch (err) {
    next(err);
  }
});

// ── POST /rename/:id ─ Rename a backup ──────────────────────────
router.post('/rename/:id', async (req, res, next) => {
  try {
    const { backupName } = req.body;

    if (!backupName || !backupName.trim()) {
      return res.status(400).json({ success: false, message: 'Backup name is required.' });
    }

    await ensureBackupsTable();

    const backup = await db('backups').where({ id: req.params.id }).first();
    if (!backup) {
      return res.status(404).json({ success: false, message: 'Backup not found.' });
    }

    await db('backups').where({ id: req.params.id }).update({ backup_name: backupName.trim() });

    res.json({ success: true, message: 'Backup renamed' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
