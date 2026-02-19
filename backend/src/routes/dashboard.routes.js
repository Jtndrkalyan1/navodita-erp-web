const express = require('express');
const router = express.Router();
const controller = require('../controllers/dashboard.controller');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/summary', controller.getSummary);
router.get('/charts/cash-flow', controller.getCashFlow);
router.get('/charts/receivables', controller.getReceivablesChart);
router.get('/charts/expenses', controller.getExpenseBreakdown);
router.get('/charts/income-expense', controller.getIncomeExpenseChart);
router.get('/recent-activity', controller.getRecentActivity);

module.exports = router;
