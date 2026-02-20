const express = require('express');
const router = express.Router();
const controller = require('../controllers/paymentMade.controller');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.get('/stats', controller.getStats);
router.get('/', controller.list);
router.get('/:id', controller.getById);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', authorize('Admin'), controller.remove);

module.exports = router;
