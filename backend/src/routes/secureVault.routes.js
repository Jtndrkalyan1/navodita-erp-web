const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { authenticate } = require('../middleware/auth');
const { requireVaultToken } = require('../middleware/vaultAuth');
const controller = require('../controllers/secureVault.controller');

// Ensure secure-vault upload directory exists
const uploadsDir = path.join(__dirname, '..', '..', 'uploads', 'secure-vault');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer config for secure vault uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `vault-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB for documents
  fileFilter: (req, file, cb) => {
    const allowed = [
      '.pdf', '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.tif',
      '.doc', '.docx', '.xls', '.xlsx', '.csv', '.txt', '.webp',
    ];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${ext} not allowed. Allowed: ${allowed.join(', ')}`));
    }
  },
});

// All routes require app-level authentication
router.use(authenticate);

// --- Vault management (no vault token needed) ---
// GET /status - Check if vault is set up
router.get('/status', controller.getVaultStatus);

// POST /setup - Create vault password (first time)
router.post('/setup', controller.setupVault);

// POST /unlock - Verify password, get vault token
router.post('/unlock', controller.unlockVault);

// POST /change-password - Change vault password (needs vault token)
router.post('/change-password', requireVaultToken, controller.changePassword);

// POST /reset-with-login-password - Reset vault password using login password (no vault token needed)
router.post('/reset-with-login-password', controller.resetVaultWithLoginPassword);

// --- Document operations (vault token required) ---
// GET /documents - List documents
router.get('/documents', requireVaultToken, controller.listDocuments);

// POST /documents/upload - Upload document
router.post('/documents/upload', requireVaultToken, upload.single('file'), controller.uploadDocument);

// GET /documents/:id/download - Download document
router.get('/documents/:id/download', requireVaultToken, controller.downloadDocument);

// DELETE /documents/:id - Delete document
router.delete('/documents/:id', requireVaultToken, controller.deleteDocument);

// POST /documents/:id/share - Share document via WhatsApp/Email
router.post('/documents/:id/share', requireVaultToken, controller.shareDocument);

module.exports = router;
