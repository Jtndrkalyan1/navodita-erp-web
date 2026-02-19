const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/vendor.controller');
const statementController = require('../controllers/statement.controller');

// Apply auth to all routes
router.use(authenticate);

router.get('/', ctrl.list);

// GET /:id/statement - Get vendor ledger statement
router.get('/:id/statement', statementController.getVendorStatement);

router.get('/:id', ctrl.getById);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
