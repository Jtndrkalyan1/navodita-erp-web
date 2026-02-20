const express = require('express');
const router = express.Router();
const controller = require('../controllers/bill.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { createBillSchema, updateBillSchema, deleteBillSchema } = require('../schemas/bill.schema');

router.use(authenticate);

router.get('/stats', controller.getStats);
router.get('/', controller.list);
router.get('/:id', controller.getById);
router.post('/', validate(createBillSchema), controller.create);
router.put('/:id', validate(updateBillSchema), controller.update);
router.delete('/:id', validate(deleteBillSchema), authorize('Admin'), controller.remove);

module.exports = router;
