const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

/**
 * GET /api/settings
 * Return all app settings as a flat object { key: value, ... }
 */
router.get('/', async (req, res, next) => {
  try {
    const rows = await db('app_settings').select('setting_key', 'setting_value', 'setting_type');
    const settings = {};
    for (const row of rows) {
      let val = row.setting_value;
      if (row.setting_type === 'number') val = parseFloat(val) || 0;
      else if (row.setting_type === 'boolean') val = val === 'true' || val === '1';
      else if (row.setting_type === 'json') { try { val = JSON.parse(val); } catch { /* keep string */ } }
      settings[row.setting_key] = val;
    }
    res.json({ data: settings });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/settings
 * Upsert all settings from the request body { key: value, ... }
 */
router.put('/', async (req, res, next) => {
  try {
    const body = req.body || {};
    const trx = await db.transaction();
    try {
      for (const [key, value] of Object.entries(body)) {
        if (key === 'id' || key === 'created_at' || key === 'updated_at') continue;

        // Determine type
        let settingType = 'string';
        if (typeof value === 'number') settingType = 'number';
        else if (typeof value === 'boolean') settingType = 'boolean';
        else if (typeof value === 'object' && value !== null) settingType = 'json';

        const strValue = settingType === 'json' ? JSON.stringify(value) : String(value ?? '');

        // Determine category from key prefix
        let category = 'general';
        if (key.startsWith('invoice_')) category = 'invoice';
        else if (key.startsWith('quotation_')) category = 'quotation';
        else if (key.startsWith('bill_')) category = 'bill';
        else if (key.startsWith('smtp_') || key.startsWith('email_')) category = 'email';
        else if (key.startsWith('notify_')) category = 'notifications';
        else if (key.startsWith('default_gst') || key.startsWith('company_state') || key.startsWith('lut_')) category = 'tax';
        else if (key.startsWith('auto_lock') || key.startsWith('two_factor') || key.startsWith('session_') || key.startsWith('ip_') || key.startsWith('max_login') || key.startsWith('require_')) category = 'security';
        else if (key.startsWith('ai_')) category = 'ai';

        // Upsert
        const existing = await trx('app_settings').where('setting_key', key).first();
        if (existing) {
          await trx('app_settings')
            .where('setting_key', key)
            .update({ setting_value: strValue, setting_type: settingType, category, updated_at: new Date() });
        } else {
          await trx('app_settings').insert({
            setting_key: key,
            setting_value: strValue,
            setting_type: settingType,
            category,
          });
        }
      }
      await trx.commit();
      res.json({ message: 'Settings saved successfully' });
    } catch (err) {
      await trx.rollback();
      throw err;
    }
  } catch (err) {
    next(err);
  }
});

module.exports = router;
