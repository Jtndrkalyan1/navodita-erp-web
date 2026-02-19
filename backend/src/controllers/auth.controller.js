const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { generateToken } = require('../middleware/auth');

/**
 * POST /login
 * Validate username/password with bcrypt, return JWT token + user info
 */
const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const user = await db('app_users')
      .where({ username, is_active: true })
      .first();

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if account is locked
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      return res.status(423).json({ error: 'Account is locked. Try again later.' });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      // Increment failed attempts
      const failedAttempts = (user.failed_login_attempts || 0) + 1;
      const updates = { failed_login_attempts: failedAttempts };

      // Lock account after 5 failed attempts for 30 minutes
      if (failedAttempts >= 5) {
        updates.locked_until = new Date(Date.now() + 30 * 60 * 1000);
      }

      await db('app_users').where({ id: user.id }).update(updates);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Reset failed attempts and update last login
    await db('app_users').where({ id: user.id }).update({
      failed_login_attempts: 0,
      locked_until: null,
      last_login_at: new Date(),
    });

    const token = generateToken(user.id);

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /register
 * Create new user (Admin only for protected registration)
 */
const register = async (req, res, next) => {
  try {
    const { username, password, email, display_name, role } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if username or email already exists
    const existing = await db('app_users')
      .where({ username })
      .orWhere(function () {
        if (email) this.where({ email });
      })
      .first();

    if (existing) {
      return res.status(409).json({ error: 'Username or email already exists' });
    }

    const password_hash = await bcrypt.hash(password, 12);

    const [newUser] = await db('app_users')
      .insert({
        username,
        password_hash,
        email: email || null,
        display_name: display_name || username,
        role: role || 'viewer',
        is_active: true,
      })
      .returning(['id', 'username', 'display_name', 'email', 'role', 'created_at']);

    const token = generateToken(newUser.id);

    res.status(201).json({
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
        displayName: newUser.display_name,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /refresh-token
 * Refresh JWT token
 */
const refreshToken = async (req, res, next) => {
  try {
    // req.user is set by authenticate middleware
    const token = generateToken(req.user.id);
    res.json({ token });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /me
 * Return current user from token
 */
const getMe = async (req, res, next) => {
  try {
    const user = await db('app_users')
      .select('id', 'username', 'display_name', 'email', 'role', 'is_active', 'last_login_at', 'created_at')
      .where({ id: req.user.id })
      .first();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      data: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        email: user.email,
        role: user.role,
        isActive: user.is_active,
        lastLoginAt: user.last_login_at,
        createdAt: user.created_at,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /me
 * Update current user profile
 */
const updateMe = async (req, res, next) => {
  try {
    const { display_name, email } = req.body;

    const updates = {};
    if (display_name !== undefined) updates.display_name = display_name;
    if (email !== undefined) updates.email = email;
    updates.updated_at = new Date();

    const [updated] = await db('app_users')
      .where({ id: req.user.id })
      .update(updates)
      .returning(['id', 'username', 'display_name', 'email', 'role']);

    res.json({
      data: {
        id: updated.id,
        username: updated.username,
        displayName: updated.display_name,
        email: updated.email,
        role: updated.role,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /change-password
 * Change password for current user
 */
const changePassword = async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'Current and new password are required' });
    }

    if (new_password.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const user = await db('app_users').where({ id: req.user.id }).first();

    const isValid = await bcrypt.compare(current_password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const password_hash = await bcrypt.hash(new_password, 12);

    await db('app_users')
      .where({ id: req.user.id })
      .update({ password_hash, updated_at: new Date() });

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /logout
 * Logout (client-side token invalidation)
 */
const logout = async (req, res, next) => {
  try {
    // JWT tokens are stateless; client should discard the token.
    // We log the logout event for audit purposes.
    await db('audit_logs').insert({
      user_id: req.user.id,
      action: 'LOGOUT',
      entity_type: 'AppUser',
      entity_id: req.user.id,
      performed_at: new Date(),
    });

    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  login,
  register,
  refreshToken,
  getMe,
  updateMe,
  changePassword,
  logout,
};
