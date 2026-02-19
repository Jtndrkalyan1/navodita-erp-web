const express = require('express');
const router = express.Router();
const controller = require('../controllers/company.controller');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/', controller.get);
router.put('/', controller.update);

module.exports = router;
