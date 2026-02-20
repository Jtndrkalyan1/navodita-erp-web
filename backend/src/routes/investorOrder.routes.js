const express = require('express');
const router = express.Router();
const controller = require('../controllers/investorOrder.controller');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

// Monthly summaries (must come before /:id to avoid conflict)
router.get('/summary', controller.listSummaries);
router.get('/summary/:monthYear', controller.getSummary);
router.post('/summary', controller.upsertSummary);

// Partner configuration
router.get('/partners', controller.getPartners);
router.post('/partners', controller.updatePartners);

// Partner CRUD & profile
router.post('/partners/create', controller.createPartner);
router.get('/partners/:id', controller.getPartnerById);
router.put('/partners/:id', controller.updatePartner);
router.delete('/partners/:id', authorize('Admin'), controller.deletePartner);

// Partner transactions (statement entries)
router.get('/partners/:id/transactions', controller.getPartnerTransactions);
router.post('/partners/:id/transactions', controller.createPartnerTransaction);
router.delete('/partners/transactions/:txnId', authorize('Admin'), controller.deletePartnerTransaction);

// Available months
router.get('/months', controller.getMonths);

// Recalculate
router.post('/recalculate/:monthYear', controller.recalculate);

// Create next month
router.post('/create-month/:monthYear', controller.createNextMonth);

// CRUD orders
router.get('/', controller.list);
router.get('/:id', controller.getById);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', authorize('Admin'), controller.remove);

module.exports = router;
