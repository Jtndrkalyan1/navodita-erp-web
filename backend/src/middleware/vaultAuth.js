const jwt = require('jsonwebtoken');
const db = require('../config/database');

const VAULT_SECRET = process.env.VAULT_SECRET || 'navodita-vault-secret-key';
const VAULT_TOKEN_EXPIRY = '15m'; // 15 minutes

/**
 * Generate a vault-specific JWT token (separate from app auth token)
 * This token is short-lived and only grants access to vault operations
 */
const generateVaultToken = (userId) => {
  return jwt.sign(
    { userId, type: 'vault_access' },
    VAULT_SECRET,
    { expiresIn: VAULT_TOKEN_EXPIRY }
  );
};

/**
 * Middleware: Validate vault token from x-vault-token header
 * Must be used AFTER the main authenticate middleware
 */
const requireVaultToken = async (req, res, next) => {
  try {
    const vaultToken = req.headers['x-vault-token'];

    if (!vaultToken) {
      return res.status(403).json({
        error: 'Vault access token required. Please unlock the vault first.',
        code: 'VAULT_LOCKED',
      });
    }

    const decoded = jwt.verify(vaultToken, VAULT_SECRET);

    if (decoded.type !== 'vault_access') {
      return res.status(403).json({
        error: 'Invalid vault token type',
        code: 'VAULT_LOCKED',
      });
    }

    // Ensure the vault token belongs to the authenticated user
    if (decoded.userId !== req.user.id) {
      return res.status(403).json({
        error: 'Vault token does not match authenticated user',
        code: 'VAULT_LOCKED',
      });
    }

    // Check that vault settings exist for this user
    const vaultSettings = await db('secure_vault_settings')
      .where({ user_id: req.user.id })
      .first();

    if (!vaultSettings) {
      return res.status(403).json({
        error: 'Vault not set up. Please create a vault password first.',
        code: 'VAULT_NOT_SETUP',
      });
    }

    // Check if vault is temporarily locked due to too many failed attempts
    if (vaultSettings.locked_until && new Date(vaultSettings.locked_until) > new Date()) {
      return res.status(423).json({
        error: 'Vault is temporarily locked due to too many failed attempts.',
        code: 'VAULT_TEMP_LOCKED',
        locked_until: vaultSettings.locked_until,
      });
    }

    req.vaultSettings = vaultSettings;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(403).json({
        error: 'Vault session expired. Please unlock again.',
        code: 'VAULT_EXPIRED',
      });
    }
    return res.status(403).json({
      error: 'Invalid vault token',
      code: 'VAULT_LOCKED',
    });
  }
};

module.exports = {
  generateVaultToken,
  requireVaultToken,
  VAULT_SECRET,
};
