const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

// All routes require authentication + admin role
router.use(authenticate);
router.use(authorize('Admin'));

// Valid roles (matches frontend ROLES constant)
const VALID_ROLES = ['Admin', 'Accounts', 'CA', 'Accountant', 'HR', 'Sales', 'Purchase', 'Master', 'Viewer'];

// ── GET / ─ List all users with pagination and search ────────────
router.get('/', async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 50,
      search = '',
      role,
      is_active,
    } = req.query;

    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
    const pageLimit = Math.min(100, Math.max(1, parseInt(limit)));

    let query = db('app_users')
      .select(
        'id',
        'username',
        'display_name',
        'email',
        'role',
        'is_active',
        'last_login_at',
        'created_at',
        'updated_at'
      );

    // Search across username, display_name, email
    if (search) {
      query = query.where(function () {
        this.where('username', 'ilike', `%${search}%`)
          .orWhere('display_name', 'ilike', `%${search}%`)
          .orWhere('email', 'ilike', `%${search}%`);
      });
    }

    // Filter by role
    if (role) {
      query = query.where('role', role);
    }

    // Filter by active status
    if (is_active !== undefined) {
      query = query.where('is_active', is_active === 'true');
    }

    // Get total count
    const countQuery = query.clone().clearSelect().clearOrder().count('* as total').first();
    const { total } = await countQuery;

    // Get paginated results
    const users = await query
      .orderBy('created_at', 'desc')
      .limit(pageLimit)
      .offset(offset);

    // Map display_name -> full_name for frontend compatibility
    const mapped = users.map((u) => ({
      id: u.id,
      username: u.username,
      full_name: u.display_name,
      display_name: u.display_name,
      email: u.email,
      role: u.role,
      is_active: u.is_active,
      last_login: u.last_login_at,
      last_login_at: u.last_login_at,
      created_at: u.created_at,
      updated_at: u.updated_at,
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

// ── GET /:id ─ Get single user ──────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const user = await db('app_users')
      .select(
        'id',
        'username',
        'display_name',
        'email',
        'role',
        'is_active',
        'last_login_at',
        'failed_login_attempts',
        'locked_until',
        'created_at',
        'updated_at'
      )
      .where({ id: req.params.id })
      .first();

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      data: {
        id: user.id,
        username: user.username,
        full_name: user.display_name,
        display_name: user.display_name,
        email: user.email,
        role: user.role,
        is_active: user.is_active,
        last_login: user.last_login_at,
        last_login_at: user.last_login_at,
        failed_login_attempts: user.failed_login_attempts,
        locked_until: user.locked_until,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── POST / ─ Create new user ────────────────────────────────────
router.post('/', async (req, res, next) => {
  try {
    const { username, password, full_name, display_name, email, role } = req.body;

    // Validation
    if (!username || !username.trim()) {
      return res.status(400).json({ message: 'Username is required' });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const userRole = role || 'Viewer';
    if (!VALID_ROLES.includes(userRole)) {
      return res.status(400).json({
        message: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}`,
      });
    }

    // Check unique username
    const existingUsername = await db('app_users')
      .where({ username: username.trim() })
      .first();
    if (existingUsername) {
      return res.status(409).json({ message: 'Username already exists' });
    }

    // Check unique email (if provided)
    if (email && email.trim()) {
      const existingEmail = await db('app_users')
        .where({ email: email.trim() })
        .first();
      if (existingEmail) {
        return res.status(409).json({ message: 'Email already exists' });
      }
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // The frontend sends full_name, map it to display_name for the DB
    const nameValue = full_name || display_name || username;

    const [newUser] = await db('app_users')
      .insert({
        username: username.trim(),
        password_hash,
        display_name: nameValue.trim(),
        email: email ? email.trim() : null,
        role: userRole,
        is_active: true,
      })
      .returning(['id', 'username', 'display_name', 'email', 'role', 'is_active', 'created_at']);

    // Audit log
    await db('audit_logs').insert({
      user_id: req.user.id,
      action: 'CREATE',
      entity_type: 'AppUser',
      entity_id: newUser.id,
      new_values: JSON.stringify({
        username: newUser.username,
        display_name: newUser.display_name,
        email: newUser.email,
        role: newUser.role,
      }),
      ip_address: req.ip,
      performed_at: new Date(),
    });

    res.status(201).json({
      data: {
        id: newUser.id,
        username: newUser.username,
        full_name: newUser.display_name,
        display_name: newUser.display_name,
        email: newUser.email,
        role: newUser.role,
        is_active: newUser.is_active,
        created_at: newUser.created_at,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── PUT /:id ─ Update user ──────────────────────────────────────
router.put('/:id', async (req, res, next) => {
  try {
    const { full_name, display_name, email, role, is_active, password } = req.body;

    const existing = await db('app_users')
      .where({ id: req.params.id })
      .first();

    if (!existing) {
      return res.status(404).json({ message: 'User not found' });
    }

    const updates = {};
    const oldValues = {};

    // Map full_name -> display_name for DB
    const nameValue = full_name || display_name;
    if (nameValue !== undefined) {
      oldValues.display_name = existing.display_name;
      updates.display_name = nameValue.trim();
    }

    if (email !== undefined) {
      // Check unique email if changed
      if (email && email.trim() && email.trim() !== existing.email) {
        const emailExists = await db('app_users')
          .where({ email: email.trim() })
          .whereNot({ id: req.params.id })
          .first();
        if (emailExists) {
          return res.status(409).json({ message: 'Email already exists' });
        }
      }
      oldValues.email = existing.email;
      updates.email = email ? email.trim() : null;
    }

    if (role !== undefined) {
      if (!VALID_ROLES.includes(role)) {
        return res.status(400).json({
          message: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}`,
        });
      }
      oldValues.role = existing.role;
      updates.role = role;
    }

    if (is_active !== undefined) {
      oldValues.is_active = existing.is_active;
      updates.is_active = is_active;
    }

    // Hash new password if provided
    if (password && password.trim()) {
      if (password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters' });
      }
      updates.password_hash = await bcrypt.hash(password, 10);
    }

    updates.updated_at = new Date();

    const [updated] = await db('app_users')
      .where({ id: req.params.id })
      .update(updates)
      .returning([
        'id',
        'username',
        'display_name',
        'email',
        'role',
        'is_active',
        'last_login_at',
        'created_at',
        'updated_at',
      ]);

    // Audit log
    await db('audit_logs').insert({
      user_id: req.user.id,
      action: 'UPDATE',
      entity_type: 'AppUser',
      entity_id: updated.id,
      old_values: JSON.stringify(oldValues),
      new_values: JSON.stringify(updates),
      ip_address: req.ip,
      performed_at: new Date(),
    });

    res.json({
      data: {
        id: updated.id,
        username: updated.username,
        full_name: updated.display_name,
        display_name: updated.display_name,
        email: updated.email,
        role: updated.role,
        is_active: updated.is_active,
        last_login: updated.last_login_at,
        last_login_at: updated.last_login_at,
        created_at: updated.created_at,
        updated_at: updated.updated_at,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /:id ─ Delete user ───────────────────────────────────
router.delete('/:id', async (req, res, next) => {
  try {
    // Don't allow deleting yourself
    if (req.params.id === req.user.id) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    const existing = await db('app_users')
      .where({ id: req.params.id })
      .first();

    if (!existing) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Soft delete: deactivate the user
    await db('app_users')
      .where({ id: req.params.id })
      .update({ is_active: false, updated_at: new Date() });

    // Audit log
    await db('audit_logs').insert({
      user_id: req.user.id,
      action: 'DELETE',
      entity_type: 'AppUser',
      entity_id: req.params.id,
      old_values: JSON.stringify({
        username: existing.username,
        display_name: existing.display_name,
        is_active: existing.is_active,
      }),
      ip_address: req.ip,
      performed_at: new Date(),
    });

    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
