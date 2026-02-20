const express = require('express');
const router = express.Router();
const controller = require('../controllers/invoice.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { createInvoiceSchema, updateInvoiceSchema, deleteInvoiceSchema } = require('../schemas/invoice.schema');

router.use(authenticate);

router.get('/stats', controller.getStats);
router.get('/', controller.list);
router.get('/:id', controller.getById);
router.post('/', validate(createInvoiceSchema), controller.create);
router.put('/:id', validate(updateInvoiceSchema), controller.update);
router.delete('/:id', validate(deleteInvoiceSchema), authorize('Admin'), controller.remove);

module.exports = router;
