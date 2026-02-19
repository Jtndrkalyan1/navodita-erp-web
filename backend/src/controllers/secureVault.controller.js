const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const db = require('../config/database');
const { generateVaultToken } = require('../middleware/vaultAuth');
const { sendEmail, buildWhatsAppUrl, isSmtpConfigured } = require('../services/email.service');

const BCRYPT_ROUNDS = 12;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 30;

/**
 * GET /status
 * Check whether vault is set up for the current user
 */
const getVaultStatus = async (req, res, next) => {
  try {
    const settings = await db('secure_vault_settings')
      .where({ user_id: req.user.id })
      .first();

    res.json({
      isSetup: !!settings,
      isLocked: settings
        ? !!(settings.locked_until && new Date(settings.locked_until) > new Date())
        : false,
      lockedUntil: settings ? settings.locked_until : null,
      failedAttempts: settings ? settings.failed_attempts : 0,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /setup
 * First-time vault password creation
 */
const setupVault = async (req, res, next) => {
  try {
    const { password, security_question, security_answer } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({
        error: 'Password must be at least 6 characters long',
      });
    }

    // Check if already set up
    const existing = await db('secure_vault_settings')
      .where({ user_id: req.user.id })
      .first();

    if (existing) {
      return res.status(400).json({
        error: 'Vault already set up. Use change-password to update.',
      });
    }

    const vault_password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const security_answer_hash = security_answer
      ? await bcrypt.hash(security_answer.toLowerCase().trim(), BCRYPT_ROUNDS)
      : null;

    await db('secure_vault_settings').insert({
      user_id: req.user.id,
      vault_password_hash,
      security_question: security_question || null,
      security_answer_hash,
    });

    // Create uploads directory
    const uploadsDir = path.join(__dirname, '..', '..', 'uploads', 'secure-vault');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Generate vault token immediately after setup
    const vaultToken = generateVaultToken(req.user.id);

    res.status(201).json({
      message: 'Vault created successfully',
      vaultToken,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /unlock
 * Verify password and return time-limited vault token
 */
const unlockVault = async (req, res, next) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    const settings = await db('secure_vault_settings')
      .where({ user_id: req.user.id })
      .first();

    if (!settings) {
      return res.status(404).json({
        error: 'Vault not set up',
        code: 'VAULT_NOT_SETUP',
      });
    }

    // Check if locked out
    if (settings.locked_until && new Date(settings.locked_until) > new Date()) {
      return res.status(423).json({
        error: 'Vault is temporarily locked due to too many failed attempts.',
        code: 'VAULT_TEMP_LOCKED',
        locked_until: settings.locked_until,
      });
    }

    const isValid = await bcrypt.compare(password, settings.vault_password_hash);

    if (!isValid) {
      const newFailedAttempts = settings.failed_attempts + 1;
      const updateData = { failed_attempts: newFailedAttempts };

      // Lock after MAX_FAILED_ATTEMPTS
      if (newFailedAttempts >= MAX_FAILED_ATTEMPTS) {
        const lockUntil = new Date();
        lockUntil.setMinutes(lockUntil.getMinutes() + LOCKOUT_DURATION_MINUTES);
        updateData.locked_until = lockUntil;
        updateData.failed_attempts = 0;
      }

      await db('secure_vault_settings')
        .where({ id: settings.id })
        .update(updateData);

      const attemptsRemaining = MAX_FAILED_ATTEMPTS - newFailedAttempts;
      return res.status(401).json({
        error: attemptsRemaining > 0
          ? `Incorrect password. ${attemptsRemaining} attempt(s) remaining.`
          : `Too many failed attempts. Vault locked for ${LOCKOUT_DURATION_MINUTES} minutes.`,
        attemptsRemaining: Math.max(0, attemptsRemaining),
      });
    }

    // Reset failed attempts on success
    await db('secure_vault_settings')
      .where({ id: settings.id })
      .update({ failed_attempts: 0, locked_until: null });

    const vaultToken = generateVaultToken(req.user.id);

    res.json({
      message: 'Vault unlocked successfully',
      vaultToken,
      expiresIn: '15m',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /change-password
 * Change vault password (requires current password)
 */
const changePassword = async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({
        error: 'Both current_password and new_password are required',
      });
    }

    if (new_password.length < 6) {
      return res.status(400).json({
        error: 'New password must be at least 6 characters long',
      });
    }

    const settings = await db('secure_vault_settings')
      .where({ user_id: req.user.id })
      .first();

    if (!settings) {
      return res.status(404).json({ error: 'Vault not set up' });
    }

    const isValid = await bcrypt.compare(current_password, settings.vault_password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const vault_password_hash = await bcrypt.hash(new_password, BCRYPT_ROUNDS);

    await db('secure_vault_settings')
      .where({ id: settings.id })
      .update({ vault_password_hash, updated_at: new Date() });

    res.json({ message: 'Vault password changed successfully' });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /documents
 * List all secure documents for the current user (requires vault token)
 */
const listDocuments = async (req, res, next) => {
  try {
    const { folder_name, document_type, search, sort_by, sort_order = 'desc' } = req.query;

    let query = db('secure_documents').where({ user_id: req.user.id });

    if (folder_name) {
      query = query.where('folder_name', folder_name);
    }

    if (document_type) {
      query = query.where('document_type', document_type);
    }

    if (search) {
      query = query.where(function () {
        this.where('document_name', 'ilike', `%${search}%`)
          .orWhere('document_type', 'ilike', `%${search}%`)
          .orWhere('notes', 'ilike', `%${search}%`);
      });
    }

    const data = await query.orderBy(sort_by || 'created_at', sort_order);

    res.json({ data });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /documents/upload
 * Upload a document to the secure vault (requires vault token)
 */
const uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const {
      document_name,
      document_type,
      folder_name = 'Other',
      notes,
    } = req.body;

    if (!document_name) {
      return res.status(400).json({ error: 'document_name is required' });
    }

    if (!document_type) {
      return res.status(400).json({ error: 'document_type is required' });
    }

    const [doc] = await db('secure_documents')
      .insert({
        user_id: req.user.id,
        folder_name,
        document_name,
        document_type,
        file_path: req.file.path,
        file_size: req.file.size,
        mime_type: req.file.mimetype,
        notes: notes || null,
      })
      .returning('*');

    res.status(201).json({ data: doc });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /documents/:id/download
 * Download a secure document (requires vault token)
 */
const downloadDocument = async (req, res, next) => {
  try {
    const doc = await db('secure_documents')
      .where({ id: req.params.id, user_id: req.user.id })
      .first();

    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const filePath = path.resolve(doc.file_path);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found on disk' });
    }

    res.download(filePath, doc.document_name + path.extname(doc.file_path));
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /documents/:id
 * Delete a secure document (requires vault token)
 */
const deleteDocument = async (req, res, next) => {
  try {
    const doc = await db('secure_documents')
      .where({ id: req.params.id, user_id: req.user.id })
      .first();

    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Delete file from disk
    const filePath = path.resolve(doc.file_path);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await db('secure_documents').where({ id: req.params.id }).del();

    res.json({ message: 'Document deleted successfully' });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /documents/:id/share
 * Generate a share link for WhatsApp or Email
 */
const shareDocument = async (req, res, next) => {
  try {
    const doc = await db('secure_documents')
      .where({ id: req.params.id, user_id: req.user.id })
      .first();

    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const { method, recipient, message } = req.body;

    if (!method || !['whatsapp', 'email'].includes(method)) {
      return res.status(400).json({
        error: 'method must be "whatsapp" or "email"',
      });
    }

    if (!recipient) {
      return res.status(400).json({
        error: 'recipient is required (phone for WhatsApp, email for Email)',
      });
    }

    const shareMessage = message || `Sharing document: ${doc.document_name} (${doc.document_type})`;

    if (method === 'whatsapp') {
      const whatsappUrl = buildWhatsAppUrl({
        phone: recipient,
        message: shareMessage,
      });

      return res.json({
        success: true,
        method: 'whatsapp',
        shareUrl: whatsappUrl,
        document: {
          id: doc.id,
          name: doc.document_name,
          type: doc.document_type,
        },
      });
    }

    if (method === 'email') {
      const result = await sendEmail({
        to: recipient,
        subject: `Shared Document: ${doc.document_name}`,
        body: shareMessage,
      });

      return res.json({
        success: true,
        method: result.method,
        messageId: result.messageId || null,
        mailtoUrl: result.mailtoUrl || null,
        document: {
          id: doc.id,
          name: doc.document_name,
          type: doc.document_type,
        },
      });
    }
  } catch (err) {
    next(err);
  }
};

/**
 * POST /reset-with-login-password
 * Admin override: reset vault password using the user's login password
 */
const resetVaultWithLoginPassword = async (req, res, next) => {
  try {
    const { login_password, new_vault_password } = req.body;

    if (!login_password || !new_vault_password) {
      return res.status(400).json({ error: 'Login password and new vault password are required' });
    }
    if (new_vault_password.length < 6) {
      return res.status(400).json({ error: 'New vault password must be at least 6 characters' });
    }

    // Verify user's login password
    const user = await db('app_users').where({ id: req.user.id }).first();
    if (!user) return res.status(404).json({ error: 'User not found' });

    const loginValid = await bcrypt.compare(login_password, user.password_hash);
    if (!loginValid) {
      return res.status(401).json({ error: 'Login password is incorrect' });
    }

    const vault_password_hash = await bcrypt.hash(new_vault_password, BCRYPT_ROUNDS);
    const existing = await db('secure_vault_settings').where({ user_id: req.user.id }).first();

    if (existing) {
      await db('secure_vault_settings')
        .where({ id: existing.id })
        .update({ vault_password_hash, failed_attempts: 0, locked_until: null, updated_at: new Date() });
    } else {
      await db('secure_vault_settings').insert({ user_id: req.user.id, vault_password_hash });
    }

    const vaultToken = generateVaultToken(req.user.id);
    res.json({ message: 'Vault password reset successfully', vaultToken });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getVaultStatus,
  setupVault,
  unlockVault,
  changePassword,
  resetVaultWithLoginPassword,
  listDocuments,
  uploadDocument,
  downloadDocument,
  deleteDocument,
  shareDocument,
};
