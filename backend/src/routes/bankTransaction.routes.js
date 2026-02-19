const express = require('express');
const router = express.Router();
const multer = require('multer');
const controller = require('../controllers/bankTransaction.controller');
const { authenticate } = require('../middleware/auth');

// Multer config: store in memory for parsing (no need to persist raw files)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB max
  },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'text/csv',
      'application/csv',
      'text/comma-separated-values',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/octet-stream', // Some browsers send this for .csv
      'text/html',
      'text/plain',
      'application/pdf',
    ];
    const ext = (file.originalname || '').split('.').pop().toLowerCase();
    const allowedExtensions = ['csv', 'xlsx', 'xls', 'html', 'htm', 'txt', 'pdf'];

    if (allowed.includes(file.mimetype) || allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV, Excel (.xlsx, .xls), HTML (.html, .htm), PDF (.pdf), and text (.txt) files are allowed'), false);
    }
  },
});

router.use(authenticate);

// Static endpoints (must come before /:id)
router.get('/bank-formats', controller.getBankFormats);
router.get('/sub-accounts', controller.getSubAccounts);
router.get('/categorization-options', controller.getCategorizationOptions);
router.get('/customers-with-invoices', controller.getCustomersWithInvoices);
router.get('/vendors-with-bills', controller.getVendorsWithBills);
router.post('/import', controller.importTransactions);
router.post('/import-file', upload.single('file'), controller.importFile);
router.post('/preview', upload.single('file'), controller.previewFile);
router.post('/categorize', controller.categorize);
router.delete('/batch/:batchId', controller.removeBatch);

// CRUD
router.get('/', controller.list);
router.get('/:id', controller.getById);
router.post('/', controller.create);
router.put('/:id/categorize', controller.categorizeTransaction);
router.put('/:id/uncategorize', controller.uncategorizeTransaction);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);

module.exports = router;
