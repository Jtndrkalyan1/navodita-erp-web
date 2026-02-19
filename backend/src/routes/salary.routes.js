const express = require('express');
const router = express.Router();
const controller = require('../controllers/salary.controller');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/', controller.list);
router.get('/:id', controller.getById);
router.post('/', controller.create);
router.post('/generate', controller.generate);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);

module.exports = router;
