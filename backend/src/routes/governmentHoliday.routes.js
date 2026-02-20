const express = require('express');
const router = express.Router();
const controller = require('../controllers/governmentHoliday.controller');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.get('/', controller.list);
router.get('/:id', controller.getById);
router.post('/', controller.create);
router.post('/seed', controller.seed);
router.put('/:id', controller.update);
router.delete('/:id', authorize('Admin'), controller.remove);

module.exports = router;
