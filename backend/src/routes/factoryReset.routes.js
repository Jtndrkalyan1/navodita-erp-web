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

// ── POST /soft-reset ─ Clear transactions, keep master data ──────
router.post('/soft-reset', async (req, res, next) => {
  try {
    const { password, confirmText } = req.body;

    if (!password) {
      return res.status(400).json({ success: false, message: 'Password is required for security verification.' });
    }

    if (confirmText !== 'SOFT RESET') {
      return res.status(400).json({
        success: false,
        message: 'Confirmation text does not match. Send { "confirmText": "SOFT RESET" }.',
      });
    }

    const isValid = await verifyPassword(req.user.id, password);
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Incorrect password. Reset denied.' });
    }

    // Soft reset: delete transactions, keep master data (customers, vendors, items, employees, bank accounts, departments)
    const tablesToDelete = [
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
      // Parent transaction tables
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
      'investor_orders',
      'investor_partners',
      'inventory_items',
      'inventory_categories',
      'advances',
    ];

    await db.transaction(async (trx) => {
      for (const table of tablesToDelete) {
        try {
          await trx(table).del();
        } catch (e) {
          // Table may not exist, skip
        }
      }
    });

    // Log the action
    try {
      await db('audit_logs').insert({
        user_id: req.user.id,
        action: 'SOFT_RESET',
        entity_type: 'System',
        entity_id: null,
        details: JSON.stringify({ type: 'soft_reset', performed_by: req.user.id }),
        performed_at: new Date(),
      });
    } catch (e) {
      // audit_logs was just deleted, that's fine
    }

    res.json({
      success: true,
      message: 'Soft reset complete. Transaction data cleared. Master data (customers, vendors, items, employees) preserved.',
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /factory-reset ─ Delete all business data ───────────────
router.post('/factory-reset', async (req, res, next) => {
  try {
    const { password, confirmText } = req.body;

    if (!password) {
      return res.status(400).json({ success: false, message: 'Password is required for security verification.' });
    }

    if (confirmText !== 'FACTORY RESET') {
      return res.status(400).json({
        success: false,
        message: 'Confirmation text does not match. Send { "confirmText": "FACTORY RESET" }.',
      });
    }

    const isValid = await verifyPassword(req.user.id, password);
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Incorrect password. Reset denied.' });
    }

    const tablesToDelete = [
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
    ];

    await db.transaction(async (trx) => {
      for (const table of tablesToDelete) {
        try {
          await trx(table).del();
        } catch (e) {
          // Table may not exist, skip
        }
      }
    });

    res.json({
      success: true,
      message: 'Factory reset complete. All business data cleared. Company profile, user accounts, and settings preserved.',
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /lock-erase ─ Complete wipe (fresh install) ─────────────
router.post('/lock-erase', async (req, res, next) => {
  try {
    const { password, confirmText } = req.body;

    if (!password) {
      return res.status(400).json({ success: false, message: 'Password is required for security verification.' });
    }

    if (confirmText !== 'LOCK ERASE') {
      return res.status(400).json({
        success: false,
        message: 'Confirmation text does not match. Send { "confirmText": "LOCK ERASE" }.',
      });
    }

    const isValid = await verifyPassword(req.user.id, password);
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Incorrect password. Lock erase denied.' });
    }

    const currentUserId = req.user.id;

    const tablesToDelete = [
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
      // Config & profile tables (NOT deleted in factory reset)
      'company_profile',
      'webauthn_credentials',
      'secure_vault_settings',
    ];

    await db.transaction(async (trx) => {
      for (const table of tablesToDelete) {
        try {
          await trx(table).del();
        } catch (e) {
          // skip
        }
      }

      // Delete all users EXCEPT current user
      await trx('app_users').whereNot({ id: currentUserId }).del();

      // Reset app_settings to defaults
      try {
        await trx('app_settings').del();
      } catch (e) {
        // skip
      }
    });

    res.json({
      success: true,
      message: 'Lock erase complete. Everything wiped. Only your user account remains. Application is now a fresh install.',
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
