const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/auth.controller');

// POST /login - Public
router.post('/login', ctrl.login);

// POST /register - Public
router.post('/register', ctrl.register);

// POST /refresh-token - Requires auth
router.post('/refresh-token', authenticate, ctrl.refreshToken);

// All routes below require authentication
router.use(authenticate);

// GET /me - Get current user profile
router.get('/me', ctrl.getMe);

// PUT /me - Update current user profile
router.put('/me', ctrl.updateMe);

// POST /change-password - Change password
router.post('/change-password', ctrl.changePassword);

// POST /logout - Logout (invalidate token)
router.post('/logout', ctrl.logout);

module.exports = router;
