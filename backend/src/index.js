const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const { errorHandler } = require('./middleware/errorHandler');
const db = require('./config/database');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? (process.env.FRONTEND_URL || true)
    : 'http://localhost:5173',
  credentials: true,
}));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static files (uploads)
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/dashboard', require('./routes/dashboard.routes'));
app.use('/api/customers', require('./routes/customer.routes'));
app.use('/api/vendors', require('./routes/vendor.routes'));
app.use('/api/items', require('./routes/item.routes'));
app.use('/api/invoices', require('./routes/invoice.routes'));
app.use('/api/quotations', require('./routes/quotation.routes'));
app.use('/api/bills', require('./routes/bill.routes'));
app.use('/api/purchase-orders', require('./routes/purchaseOrder.routes'));
app.use('/api/delivery-challans', require('./routes/deliveryChallan.routes'));
app.use('/api/packing-lists', require('./routes/packingList.routes'));
app.use('/api/eway-bills', require('./routes/ewayBill.routes'));
app.use('/api/credit-notes', require('./routes/creditNote.routes'));
app.use('/api/debit-notes', require('./routes/debitNote.routes'));
app.use('/api/payments-received', require('./routes/paymentReceived.routes'));
app.use('/api/payments-made', require('./routes/paymentMade.routes'));
app.use('/api/expenses', require('./routes/expense.routes'));
app.use('/api/employees', require('./routes/employee.routes'));
app.use('/api/salary', require('./routes/salary.routes'));
app.use('/api/salaries', require('./routes/salary.routes'));
app.use('/api/salary-records', require('./routes/salary.routes'));
app.use('/api/bank-accounts', require('./routes/bankAccount.routes'));
app.use('/api/bank-transactions', require('./routes/bankTransaction.routes'));
app.use('/api/chart-of-accounts', require('./routes/chartOfAccount.routes'));
app.use('/api/journal-entries', require('./routes/journalEntry.routes'));
app.use('/api/gst-filings', require('./routes/gstFiling.routes'));
app.use('/api/tds', require('./routes/tds.routes'));
app.use('/api/tds-liabilities', require('./routes/tdsLiability.routes'));
app.use('/api/tds-challans', require('./routes/tdsChallan.routes'));
app.use('/api/inventory', require('./routes/inventory.routes'));
app.use('/api/costing', require('./routes/costing.routes'));
app.use('/api/costing-sheets', require('./routes/costing.routes'));
app.use('/api/documents', require('./routes/document.routes'));
app.use('/api/company', require('./routes/company.routes'));
app.use('/api/search', require('./routes/search.routes'));
app.use('/api/reports', require('./routes/report.routes'));
app.use('/api/export', require('./routes/export.routes'));
app.use('/api/pdf', require('./routes/pdf.routes'));
app.use('/api/ai', require('./routes/ai.routes'));
app.use('/api/hsn', require('./routes/hsn.routes'));
app.use('/api/users', require('./routes/user.routes'));
app.use('/api/audit-logs', require('./routes/auditLog.routes'));
app.use('/api/webauthn', require('./routes/webauthn.routes'));
app.use('/api/share', require('./routes/share.routes'));
app.use('/api/offer-letters', require('./routes/offerLetter.routes'));
app.use('/api/joining-letters', require('./routes/joiningLetter.routes'));
app.use('/api/government-holidays', require('./routes/governmentHoliday.routes'));
app.use('/api/hr-policies', require('./routes/hrPolicy.routes'));
app.use('/api/investor-orders', require('./routes/investorOrder.routes'));
app.use('/api/secure-vault', require('./routes/secureVault.routes'));
app.use('/api/factory-reset', require('./routes/factoryReset.routes'));
app.use('/api/backups', require('./routes/backup.routes'));
app.use('/api/settings', require('./routes/settings.routes'));
app.use('/api/zoho-migration', require('./routes/zohoMigration.routes'));
app.use('/api/gst', require('./routes/gstValidation.routes'));

// Production: serve React frontend
if (process.env.NODE_ENV === 'production') {
  const frontendDist = path.join(__dirname, '..', '..', 'frontend', 'dist');
  app.use(express.static(frontendDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// Error handler (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`NavoditaERP Backend running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
