const express = require('express');
const router = express.Router();
const controller = require('../controllers/invoice.controller');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/stats', controller.getStats);
router.get('/', controller.list);
router.get('/:id', controller.getById);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);

module.exports = router;
