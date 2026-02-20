const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { createVendorSchema, updateVendorSchema, deleteVendorSchema } = require('../schemas/vendor.schema');
const ctrl = require('../controllers/vendor.controller');
const statementController = require('../controllers/statement.controller');

// Apply auth to all routes
router.use(authenticate);

router.get('/', ctrl.list);

// GET /:id/statement - Get vendor ledger statement
router.get('/:id/statement', statementController.getVendorStatement);

router.get('/:id', ctrl.getById);
router.post('/', validate(createVendorSchema), ctrl.create);
router.put('/:id', validate(updateVendorSchema), ctrl.update);
router.delete('/:id', validate(deleteVendorSchema), authorize('Admin'), ctrl.remove);

module.exports = router;
