const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');
const pdfService = require('../services/pdf.service');
const { getCompanyProfile } = require('../utils/getCompanyProfile');

router.use(authenticate);

// Helper: fetch document data for PDF generation
async function fetchDocumentData(type, id) {
  const company = await getCompanyProfile();

  switch (type) {
    case 'invoice': {
      const invoice = await db('invoices').where({ id }).first();
      if (!invoice) throw new Error('Invoice not found');
      const items = await db('invoice_items').where({ invoice_id: id }).orderBy('sort_order');
      const customer = await db('customers').where({ id: invoice.customer_id }).first() || {};
      return { invoice, items, company, customer };
    }
    case 'quotation': {
      const quotation = await db('quotations').where({ id }).first();
      if (!quotation) throw new Error('Quotation not found');
      const items = await db('quotation_items').where({ quotation_id: id }).orderBy('sort_order');
      const customer = await db('customers').where({ id: quotation.customer_id }).first() || {};
      return { quotation, items, company, customer };
    }
    case 'bill': {
      const bill = await db('bills').where({ id }).first();
      if (!bill) throw new Error('Bill not found');
      const items = await db('bill_items').where({ bill_id: id }).orderBy('sort_order');
      const vendor = await db('vendors').where({ id: bill.vendor_id }).first() || {};
      return { bill, items, company, vendor };
    }
    case 'purchase-order': {
      const purchaseOrder = await db('purchase_orders').where({ id }).first();
      if (!purchaseOrder) throw new Error('Purchase order not found');
      const items = await db('purchase_order_items').where({ purchase_order_id: id }).orderBy('sort_order');
      const vendor = await db('vendors').where({ id: purchaseOrder.vendor_id }).first() || {};
      return { purchaseOrder, items, company, vendor };
    }
    case 'delivery-challan': {
      const challan = await db('delivery_challans').where({ id }).first();
      if (!challan) throw new Error('Delivery challan not found');
      const items = await db('delivery_challan_items').where({ delivery_challan_id: id }).orderBy('sort_order');
      const customer = await db('customers').where({ id: challan.customer_id }).first() || {};
      return { challan, items, company, customer };
    }
    case 'credit-note': {
      const creditNote = await db('credit_notes').where({ id }).first();
      if (!creditNote) throw new Error('Credit note not found');
      const items = await db('credit_note_items').where({ credit_note_id: id }).orderBy('sort_order');
      const customer = await db('customers').where({ id: creditNote.customer_id }).first() || {};
      return { creditNote, items, company, customer };
    }
    case 'debit-note': {
      const debitNote = await db('debit_notes').where({ id }).first();
      if (!debitNote) throw new Error('Debit note not found');
      const items = await db('debit_note_items').where({ debit_note_id: id }).orderBy('sort_order');
      const vendor = await db('vendors').where({ id: debitNote.vendor_id }).first() || {};
      return { debitNote, items, company, vendor };
    }
    case 'eway-bill': {
      const ewayBill = await db('eway_bills').where({ id }).first();
      if (!ewayBill) throw new Error('E-Way bill not found');
      const items = await db('eway_bill_items').where({ eway_bill_id: id }).orderBy('sort_order');
      const customer = await db('customers').where({ id: ewayBill.customer_id }).first() || {};
      return { ewayBill, items, company, customer };
    }
    case 'payment-received': {
      const payment = await db('payments_received').where({ id }).first();
      if (!payment) throw new Error('Payment not found');
      const customer = await db('customers').where({ id: payment.customer_id }).first() || {};
      const allocations = await db('payment_received_allocations as a')
        .leftJoin('invoices as i', 'a.invoice_id', 'i.id')
        .where('a.payment_received_id', id)
        .select('a.*', 'i.invoice_number', 'i.total_amount as invoice_amount');
      return { payment, company, customer, allocations };
    }
    case 'salary': {
      const salary = await db('salary_records').where({ id }).first();
      if (!salary) throw new Error('Salary record not found');
      const employee = await db('employees').where({ id: salary.employee_id }).first() || {};
      if (employee.department_id) {
        const dept = await db('departments').where({ id: employee.department_id }).first();
        if (dept) employee.department = dept.name;
      }
      return { salary, employee, company };
    }
    case 'payment-made': {
      const payment = await db('payments_made').where({ id }).first();
      if (!payment) throw new Error('Payment not found');
      const vendor = await db('vendors').where({ id: payment.vendor_id }).first() || {};
      const allocations = await db('payment_made_allocations as a')
        .leftJoin('bills as b', 'a.bill_id', 'b.id')
        .where('a.payment_made_id', id)
        .select('a.*', 'b.bill_number', 'b.total_amount as bill_amount');
      return { payment, company, vendor, allocations };
    }
    case 'expense': {
      const expense = await db('expenses').where({ id }).first();
      if (!expense) throw new Error('Expense not found');
      const vendor = expense.vendor_id ? (await db('vendors').where({ id: expense.vendor_id }).first() || {}) : {};
      return { expense, company, vendor };
    }
    case 'packing-list': {
      const packingList = await db('packing_lists').where({ id }).first();
      if (!packingList) throw new Error('Packing list not found');
      const items = await db('packing_list_items').where({ packing_list_id: id }).orderBy('sort_order');
      const customer = await db('customers').where({ id: packingList.customer_id }).first() || {};
      return { packingList, items, company, customer };
    }
    case 'employee': {
      const employee = await db('employees').where({ id }).first();
      if (!employee) throw new Error('Employee not found');
      if (employee.department_id) {
        const dept = await db('departments').where({ id: employee.department_id }).first();
        if (dept) employee.department = dept.name;
      }
      return { employee, company };
    }
    case 'customer': {
      const customer = await db('customers').where({ id }).first();
      if (!customer) throw new Error('Customer not found');
      return { customer, company };
    }
    case 'vendor': {
      const vendor = await db('vendors').where({ id }).first();
      if (!vendor) throw new Error('Vendor not found');
      return { vendor, company };
    }
    case 'journal-entry': {
      const journalEntry = await db('journal_entries').where({ id }).first();
      if (!journalEntry) throw new Error('Journal entry not found');
      const lines = await db('journal_lines')
        .leftJoin('chart_of_accounts', 'journal_lines.account_id', 'chart_of_accounts.id')
        .where({ journal_entry_id: id })
        .select('journal_lines.*', 'chart_of_accounts.account_name', 'chart_of_accounts.account_code');
      return { journalEntry, lines, company };
    }
    case 'gst-filing': {
      const gstFiling = await db('gst_filings').where({ id }).first();
      if (!gstFiling) throw new Error('GST filing not found');
      return { gstFiling, company };
    }
    case 'tds-liability': {
      const tdsLiability = await db('tds_liabilities').where({ id }).first();
      if (!tdsLiability) throw new Error('TDS liability not found');
      return { tdsLiability, company };
    }
    case 'tds-challan': {
      const tdsChallan = await db('tds_challans').where({ id }).first();
      if (!tdsChallan) throw new Error('TDS challan not found');
      const liabilities = await db('tds_liabilities').where({ challan_id: id });
      return { tdsChallan, liabilities, company };
    }
    case 'costing': {
      const costingSheet = await db('costing_sheets').where({ id }).first();
      if (!costingSheet) throw new Error('Costing sheet not found');
      // Items are linked through costing_versions, get the default version first
      const version = await db('costing_versions')
        .where({ costing_sheet_id: id })
        .orderBy('version_number', 'asc')
        .first();
      const versionId = version?.id;
      const fabricItems = versionId ? await db('costing_fabric_items').where({ costing_version_id: versionId }) : [];
      const trimItems = versionId ? await db('costing_trim_items').where({ costing_version_id: versionId }) : [];
      const packingItems = versionId ? await db('costing_packing_items').where({ costing_version_id: versionId }) : [];
      return { costingSheet, fabricItems, trimItems, packingItems, company };
    }
    case 'item': {
      const item = await db('items').where({ id }).first();
      if (!item) throw new Error('Item not found');
      return { item, company };
    }
    default:
      throw new Error(`Unsupported document type: ${type}`);
  }
}

// HTML generators map
const htmlGenerators = {
  'invoice': pdfService.generateInvoiceHTML,
  'quotation': pdfService.generateQuotationHTML,
  'bill': pdfService.generateBillHTML,
  'purchase-order': pdfService.generatePurchaseOrderHTML,
  'delivery-challan': pdfService.generateDeliveryChallanHTML,
  'credit-note': pdfService.generateCreditNoteHTML,
  'debit-note': pdfService.generateDebitNoteHTML,
  'eway-bill': pdfService.generateEWayBillHTML,
  'payment-received': pdfService.generatePaymentReceivedHTML,
  'salary': pdfService.generateSalarySlipHTML,
  'payment-made': pdfService.generatePaymentMadeHTML,
  'expense': pdfService.generateExpenseHTML,
  'packing-list': pdfService.generatePackingListHTML,
  'employee': pdfService.generateEmployeeHTML,
  'customer': pdfService.generateCustomerHTML,
  'vendor': pdfService.generateVendorHTML,
  'journal-entry': pdfService.generateJournalEntryHTML,
  'gst-filing': pdfService.generateGSTFilingHTML,
  'tds-liability': pdfService.generateTDSLiabilityHTML,
  'tds-challan': pdfService.generateTDSChallanHTML,
  'costing': pdfService.generateCostingSheetHTML,
  'item': pdfService.generateItemHTML,
};

// GET /employee-card/:id - Generate Employee ID Card PDF (CR80 size: 85.6mm x 54mm)
router.get('/employee-card/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const company = await getCompanyProfile();
    const employee = await db('employees').where({ id }).first();
    if (!employee) return res.status(404).json({ error: 'Employee not found' });

    // Resolve department name if department_id is present
    if (employee.department_id) {
      const dept = await db('departments').where({ id: employee.department_id }).first();
      if (dept) employee.department = dept.name;
    }

    const html = pdfService.generateEmployeeCardHTML({ employee, company });
    const pdfBuffer = await pdfService.generatePDF(html, {
      landscape: true,
      width: '85.6mm',
      height: '54mm',
      margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
    });

    const empName = employee.display_name || employee.first_name || 'Employee';
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="ID-Card-${empName}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    res.send(pdfBuffer);
  } catch (err) { next(err); }
});

// Helper: get document number for filename
function getDocumentNumber(type, data) {
  switch (type) {
    case 'invoice': return data.invoice?.invoice_number;
    case 'quotation': return data.quotation?.quotation_number;
    case 'bill': return data.bill?.bill_number;
    case 'purchase-order': return data.purchaseOrder?.po_number;
    case 'delivery-challan': return data.challan?.challan_number;
    case 'credit-note': return data.creditNote?.credit_note_number;
    case 'debit-note': return data.debitNote?.debit_note_number;
    case 'eway-bill': return data.ewayBill?.eway_bill_number;
    case 'payment-received': return data.payment?.payment_number;
    case 'payment-made': return data.payment?.payment_number;
    case 'salary': {
      const emp = data.employee?.display_name || data.employee?.first_name || 'Employee';
      const month = data.salary?.month || '';
      const year = data.salary?.year || '';
      return `Salary-${emp}-${month}-${year}`;
    }
    case 'expense': return data.expense?.reference_number || `Expense-${data.expense?.id}`;
    case 'packing-list': return data.packingList?.packing_list_number;
    case 'employee': return data.employee?.employee_id || data.employee?.display_name;
    case 'customer': return data.customer?.display_name;
    case 'vendor': return data.vendor?.display_name;
    case 'journal-entry': return data.journalEntry?.entry_number || `JE-${data.journalEntry?.id}`;
    case 'gst-filing': return data.gstFiling?.filing_period || `GST-${data.gstFiling?.id}`;
    case 'tds-liability': return `TDS-${data.tdsLiability?.id}`;
    case 'tds-challan': return data.tdsChallan?.challan_number || `TDS-Challan-${data.tdsChallan?.id}`;
    case 'costing': return data.costingSheet?.style_number || `Costing-${data.costingSheet?.id}`;
    case 'item': return data.item?.sku || data.item?.name;
    default: return null;
  }
}

// GET /:type/:id - Preview PDF inline
router.get('/:type/:id', async (req, res, next) => {
  try {
    const { type, id } = req.params;
    const data = await fetchDocumentData(type, id);
    const generator = htmlGenerators[type];
    if (!generator) return res.status(400).json({ error: `Unsupported type: ${type}` });

    const html = generator(data);
    const pdfBuffer = await pdfService.generatePDF(html);

    // Use document number as filename (like Zoho Books does)
    const docNumber = getDocumentNumber(type, data) || `${type}-${id}`;
    // Sanitize filename - remove chars that are invalid in filenames
    const safeFilename = docNumber.replace(/[\/\\:*?"<>|]/g, '-');

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${safeFilename}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    res.send(pdfBuffer);
  } catch (err) { next(err); }
});

// GET /:type/:id/download - Force download PDF
router.get('/:type/:id/download', async (req, res, next) => {
  try {
    const { type, id } = req.params;
    const data = await fetchDocumentData(type, id);
    const generator = htmlGenerators[type];
    if (!generator) return res.status(400).json({ error: `Unsupported type: ${type}` });

    const html = generator(data);
    const pdfBuffer = await pdfService.generatePDF(html);

    const docNumber = getDocumentNumber(type, data) || `${type}-${id}`;
    const safeFilename = docNumber.replace(/[\/\\:*?"<>|]/g, '-');

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${safeFilename}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    res.send(pdfBuffer);
  } catch (err) { next(err); }
});

// POST /generate/bulk - Bulk salary slips
router.post('/generate/bulk', async (req, res, next) => {
  try {
    const { documentType, documentIds } = req.body;
    if (documentType !== 'salary') {
      return res.status(400).json({ error: 'Bulk generation only supports salary slips currently' });
    }

    const pdfs = [];
    for (const id of documentIds) {
      const data = await fetchDocumentData('salary', id);
      const html = pdfService.generateSalarySlipHTML(data);
      const pdfBuffer = await pdfService.generatePDF(html);
      pdfs.push({ id, name: `${data.employee.display_name || id}.pdf`, buffer: pdfBuffer });
    }

    if (pdfs.length === 1) {
      res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${pdfs[0].name}"` });
      return res.send(pdfs[0].buffer);
    }

    res.json({ message: `Generated ${pdfs.length} salary slips`, count: pdfs.length });
  } catch (err) { next(err); }
});

module.exports = router;
