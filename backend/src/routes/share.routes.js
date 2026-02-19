const express = require('express');
const router = express.Router();
const controller = require('../controllers/share.controller');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.post('/email', controller.shareViaEmail);
router.post('/whatsapp', controller.shareViaWhatsApp);
router.get('/config', controller.getShareConfig);

module.exports = router;
