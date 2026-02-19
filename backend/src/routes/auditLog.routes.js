const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

// All routes require authentication + admin role
router.use(authenticate);
router.use(authorize('Admin'));

// ── GET / ─ List audit logs with pagination and filters ─────────
router.get('/', async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 50,
      action,
      entity_type,
      user_id,
    } = req.query;

    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
    const pageLimit = Math.min(100, Math.max(1, parseInt(limit)));

    let query = db('audit_logs as al')
      .leftJoin('app_users as u', 'al.user_id', 'u.id')
      .select(
        'al.id',
        'al.user_id',
        'u.username',
        'u.display_name as user_display_name',
        'al.action',
        'al.entity_type',
        'al.entity_id',
        'al.old_values',
        'al.new_values',
        'al.ip_address',
        'al.performed_at',
        'al.created_at'
      );

    // Filter by action
    if (action) {
      query = query.where('al.action', action);
    }

    // Filter by entity type
    if (entity_type) {
      query = query.where('al.entity_type', entity_type);
    }

    // Filter by user
    if (user_id) {
      query = query.where('al.user_id', user_id);
    }

    // Get total count
    const countQuery = query.clone().clearSelect().clearOrder().count('* as total').first();
    const { total } = await countQuery;

    // Get paginated results
    const logs = await query
      .orderBy('al.performed_at', 'desc')
      .limit(pageLimit)
      .offset(offset);

    // Parse JSON fields
    const mapped = logs.map((log) => ({
      id: log.id,
      user_id: log.user_id,
      username: log.username || 'System',
      user_display_name: log.user_display_name,
      action: log.action,
      entity_type: log.entity_type,
      entity_id: log.entity_id,
      old_values: log.old_values ? JSON.parse(log.old_values) : null,
      new_values: log.new_values ? JSON.parse(log.new_values) : null,
      ip_address: log.ip_address,
      performed_at: log.performed_at,
      created_at: log.created_at,
    }));

    res.json({
      data: mapped,
      pagination: {
        page: parseInt(page),
        limit: pageLimit,
        total: parseInt(total),
        totalPages: Math.ceil(parseInt(total) / pageLimit),
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
