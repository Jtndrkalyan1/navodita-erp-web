const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { createCustomerSchema, updateCustomerSchema, deleteCustomerSchema } = require('../schemas/customer.schema');
const customerController = require('../controllers/customer.controller');
const statementController = require('../controllers/statement.controller');

// Apply auth to all routes
router.use(authenticate);

// GET / - List all customers with pagination, search, sort
router.get('/', customerController.list);

// GET /:id/statement - Get customer ledger statement
router.get('/:id/statement', statementController.getCustomerStatement);

// GET /:id - Get customer by ID with addresses and invoice summary
router.get('/:id', customerController.getById);

// POST / - Create customer with auto-generated code
router.post('/', validate(createCustomerSchema), customerController.create);

// PUT /:id - Update customer
router.put('/:id', validate(updateCustomerSchema), customerController.update);

// DELETE /:id - Soft delete (check no linked invoices)
router.delete('/:id', validate(deleteCustomerSchema), authorize('Admin'), customerController.remove);

module.exports = router;
