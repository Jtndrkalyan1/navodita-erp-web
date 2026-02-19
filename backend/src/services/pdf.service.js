/**
 * PDF Generation Service
 * Uses Puppeteer to render HTML templates to PDF
 */
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const { format, amountInWords } = require('./indianCurrency.service');

let browserInstance = null;

async function getBrowser() {
  if (!browserInstance || !browserInstance.connected) {
    browserInstance = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
  }
  return browserInstance;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatCurrency(amount, currency = 'INR') {
  return format(parseFloat(amount) || 0, currency, true);
}

function formatQty(qty) {
  const n = parseFloat(qty) || 0;
  return n % 1 === 0 ? n.toString() : n.toFixed(2);
}

// ── Base HTML template wrapper ──────────────────────────────────────────────

function baseTemplate(title, bodyContent, opts = {}) {
  const landscape = opts.landscape || false;
  const pageWidth = landscape ? '297mm' : '210mm';
  const pageHeight = landscape ? '210mm' : '297mm';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${title}</title>
<style>
  @page { size: ${pageWidth} ${pageHeight}; margin: 12mm 10mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11px; color: #333; line-height: 1.5; width: 190mm; }
  .page { width: 100%; padding: 0; }

  /* Letterhead */
  .letterhead { border-bottom: 3px solid #3F6592; margin-bottom: 12px; padding-bottom: 10px; }
  .letterhead-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
  .letterhead-logo { display: flex; align-items: center; gap: 12px; }
  .logo-icon { width: 48px; height: 48px; background: linear-gradient(135deg, #3F6592 0%, #4A7BA8 100%); border-radius: 6px; display: flex; align-items: center; justify-content: center; color: white; font-size: 22px; font-weight: bold; letter-spacing: -1px; }
  .logo-text { }
  .logo-company-name { font-size: 20px; font-weight: 800; color: #3F6592; letter-spacing: 1px; text-transform: uppercase; }
  .logo-tagline { font-size: 8px; color: #7BA3C4; text-transform: uppercase; letter-spacing: 2px; margin-top: 2px; }
  .letterhead-contact { text-align: right; font-size: 9px; color: #555; line-height: 1.6; }
  .letterhead-divider { height: 1px; background: linear-gradient(to right, #3F6592, #7BA3C4, transparent); margin: 5px 0; }
  .letterhead-bottom { display: flex; justify-content: space-between; font-size: 8px; color: #777; }

  /* Header */
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px; padding-bottom: 10px; border-bottom: 2px solid #3F6592; }
  .company-info { flex: 1; }
  .company-name { font-size: 18px; font-weight: bold; color: #3F6592; }
  .company-detail { font-size: 9px; color: #666; margin-top: 2px; }
  .doc-title { font-size: 20px; font-weight: bold; color: #333; text-align: right; }
  .doc-subtitle { font-size: 10px; color: #666; text-align: right; margin-top: 2px; }
  .status-badge { display: inline-block; padding: 3px 10px; border-radius: 3px; font-size: 9px; font-weight: bold; text-transform: uppercase; }
  .status-draft { background: #FFF3CD; color: #856404; }
  .status-final, .status-sent, .status-active, .status-paid, .status-filed, .status-deposited { background: #D4EDDA; color: #155724; }
  .status-overdue, .status-cancelled, .status-expired, .status-rejected { background: #F8D7DA; color: #721C24; }
  .status-partial { background: #D1ECF1; color: #0C5460; }
  .status-pending { background: #FFF3CD; color: #856404; }

  /* Info sections */
  .info-grid { display: flex; gap: 20px; margin-bottom: 14px; }
  .info-block { flex: 1; }
  .info-block-title { font-size: 9px; font-weight: bold; color: #999; text-transform: uppercase; margin-bottom: 5px; }
  .info-block-name { font-size: 13px; font-weight: bold; color: #333; }
  .info-block-detail { font-size: 10px; color: #555; margin-top: 2px; }

  .meta-grid { display: flex; gap: 12px; margin-bottom: 14px; flex-wrap: wrap; }
  .meta-item { background: #F8F9FA; padding: 8px 12px; border-radius: 4px; }
  .meta-label { font-size: 8px; color: #999; text-transform: uppercase; }
  .meta-value { font-size: 11px; font-weight: 600; color: #333; }

  /* Tables */
  table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
  th { background: #F0F4F8; color: #333; font-size: 9px; font-weight: 600; text-transform: uppercase; padding: 7px 8px; text-align: left; border-bottom: 1px solid #DEE2E6; }
  td { padding: 6px 8px; font-size: 10px; border-bottom: 1px solid #F0F0F0; }
  .text-right { text-align: right; }
  .text-center { text-align: center; }
  .text-bold { font-weight: 600; }

  /* Totals */
  .totals-section { display: flex; justify-content: flex-end; margin-bottom: 14px; }
  .totals-table { width: 280px; }
  .totals-table td { padding: 5px 8px; font-size: 10px; border: none; }
  .totals-table .total-row { border-top: 2px solid #333; font-size: 13px; font-weight: bold; }
  .totals-table .label { color: #666; }

  /* Amount in words */
  .amount-words { background: #F0F7FF; padding: 8px 12px; border-radius: 4px; font-size: 10px; color: #0071DC; margin-bottom: 14px; }

  /* Footer sections */
  .footer-grid { display: flex; gap: 20px; margin-top: 20px; }
  .bank-details { flex: 1; background: #F8F9FA; padding: 10px; border-radius: 4px; }
  .bank-details-title { font-size: 9px; font-weight: bold; color: #999; text-transform: uppercase; margin-bottom: 5px; }
  .bank-row { font-size: 9.5px; color: #555; margin: 3px 0; }
  .signatory { flex: 1; text-align: right; }
  .signatory-line { border-top: 1px dashed #999; width: 160px; margin-left: auto; margin-top: 40px; padding-top: 5px; }
  .signatory-text { font-size: 9px; color: #666; }

  .notes-section { margin-top: 12px; padding: 8px 10px; background: #FFFBF0; border-radius: 4px; }
  .notes-title { font-size: 9px; font-weight: bold; color: #999; }
  .notes-text { font-size: 10px; color: #555; }

  /* Salary specific */
  .salary-header { background: #F0F4F8; padding: 10px; border-radius: 4px; text-align: center; margin-bottom: 12px; }
  .emp-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 12px; background: #F8F9FA; padding: 10px; border-radius: 4px; }
  .emp-row { font-size: 10px; }
  .emp-label { color: #999; }
  .emp-value { font-weight: 600; color: #333; }
  .earn-ded-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 12px; }
  .earn-section { border: 1px solid #D4EDDA; border-radius: 4px; overflow: hidden; }
  .earn-section .section-header { background: #D4EDDA; padding: 6px 10px; font-size: 10px; font-weight: bold; color: #155724; }
  .ded-section { border: 1px solid #F8D7DA; border-radius: 4px; overflow: hidden; }
  .ded-section .section-header { background: #F8D7DA; padding: 6px 10px; font-size: 10px; font-weight: bold; color: #721C24; }
  .ed-row { display: flex; justify-content: space-between; padding: 4px 10px; font-size: 10px; }
  .ed-total { font-weight: bold; border-top: 1px solid #DEE2E6; }
  .net-pay { background: #D4EDDA; padding: 12px; border-radius: 4px; text-align: center; margin-bottom: 12px; }
  .net-pay-amount { font-size: 20px; font-weight: bold; color: #155724; }
  .net-pay-words { font-size: 10px; color: #155724; }
</style>
</head>
<body>
<div class="page">
${bodyContent}
</div>
</body>
</html>`;
}

// ── Company header helper ──────────────────────────────────────────────────

// Convert a logo URL path (e.g. /uploads/company/logo.png) to a base64 data URL
// so Puppeteer can embed it without needing a running HTTP server.
function logoToDataUrl(logoPath) {
  if (!logoPath) return null;
  try {
    // logoPath is like /uploads/company/logo.png — map to filesystem
    const BACKEND_ROOT = path.join(__dirname, '../../');
    // Strip leading slash and resolve to absolute path
    const relPath = logoPath.replace(/^\//, '');
    const absPath = path.join(BACKEND_ROOT, relPath);
    if (!fs.existsSync(absPath)) return null;
    const ext = path.extname(absPath).toLowerCase().replace('.', '');
    const mimeMap = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', svg: 'image/svg+xml', webp: 'image/webp' };
    const mime = mimeMap[ext] || 'image/png';
    const data = fs.readFileSync(absPath);
    return `data:${mime};base64,${data.toString('base64')}`;
  } catch (e) {
    return null;
  }
}

function companyHeader(company, docTitle, docMeta) {
  const statusClass = (docMeta.status || '').toLowerCase().replace(/\s+/g, '-');
  const companyName = company.company_name || '';
  const initials = companyName.split(' ').filter(w => w.length > 2).map(w => w[0]).join('').substring(0, 2).toUpperCase() || '';
  const logoDataUrl = logoToDataUrl(company.logo_path || '');
  const logoHtml = logoDataUrl
    ? `<img src="${logoDataUrl}" alt="${companyName}" style="width:48px; height:48px; object-fit:contain; border-radius:6px;" />`
    : `<div class="logo-icon">${initials}</div>`;
  const tagline = company.tagline || '';
  return `
<div class="letterhead">
  <div class="letterhead-top">
    <div class="letterhead-logo">
      ${logoHtml}
      <div class="logo-text">
        <div class="logo-company-name">${companyName}</div>
        ${tagline ? `<div class="logo-tagline">${tagline}</div>` : ''}
      </div>
    </div>
    <div class="letterhead-contact">
      <div style="font-size:9px; color:#888; font-weight:600; text-transform:uppercase; margin-bottom:1px;">Head Office</div>
      ${company.address_line1 ? `${company.address_line1}, ${company.address_line2 || ''}<br>` : ''}
      ${company.city ? `${company.city}, ${company.state || ''} - ${company.pincode || ''}<br>` : ''}
      ${company.phone ? `Tel: ${company.phone}` : ''}${company.email ? ` | ${company.email}` : ''}
      ${company.website ? `<br>${company.website}` : ''}
      ${company.factory_address ? `<div style="margin-top:4px;"><div style="font-size:9px; color:#888; font-weight:600; text-transform:uppercase; margin-bottom:1px;">Factory</div>${company.factory_address}${company.factory_city ? `, ${company.factory_city}` : ''}${company.factory_state ? `, ${company.factory_state}` : ''}${company.factory_pincode ? ` - ${company.factory_pincode}` : ''}</div>` : ''}
    </div>
  </div>
  <div class="letterhead-divider"></div>
  <div class="letterhead-bottom">
    <span>GSTIN: ${company.gstin || 'N/A'} | PAN: ${company.pan || 'N/A'}${company.cin_number ? ` | CIN: ${company.cin_number}` : ''}${company.iec_code ? ` | IEC: ${company.iec_code}` : ''}${company.tan ? ` | TAN: ${company.tan}` : ''}${company.msme_number ? ` | MSME: ${company.msme_number}` : ''}</span>
  </div>
</div>
<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
  <div class="doc-title" style="text-align:left; font-size:20px; color:#3F6592;">${docTitle}</div>
  <div style="text-align:right;">
    ${docMeta.number ? `<div class="doc-subtitle" style="font-size:11px; font-weight:600;">${docMeta.number}</div>` : ''}
    ${docMeta.status ? `<div style="margin-top: 4px;"><span class="status-badge status-${statusClass}">${docMeta.status}</span></div>` : ''}
  </div>
</div>`;
}

// ── Items table helper ─────────────────────────────────────────────────────

function itemsTable(items, currency = 'INR', showGst = true) {
  const rows = (items || []).map((item, i) => `
    <tr>
      <td class="text-center">${i + 1}</td>
      <td>${item.item_name || item.description || ''}</td>
      <td class="text-center">${item.hsn_code || ''}</td>
      <td class="text-right">${formatQty(item.quantity)}</td>
      <td class="text-right">${formatCurrency(item.rate, currency)}</td>
      ${showGst ? `<td class="text-center">${item.gst_rate || 0}%</td>` : ''}
      <td class="text-right text-bold">${formatCurrency(item.amount || (item.quantity * item.rate), currency)}</td>
    </tr>`).join('');

  return `
<table>
  <thead>
    <tr>
      <th class="text-center" style="width:30px">#</th>
      <th>Item / Description</th>
      <th class="text-center" style="width:60px">HSN</th>
      <th class="text-right" style="width:50px">Qty</th>
      <th class="text-right" style="width:80px">Rate</th>
      ${showGst ? '<th class="text-center" style="width:50px">GST %</th>' : ''}
      <th class="text-right" style="width:90px">Amount</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>`;
}

// ── Totals helper ──────────────────────────────────────────────────────────

function totalsBlock(doc, currency = 'INR') {
  const rows = [];
  rows.push(`<tr><td class="label">Subtotal</td><td class="text-right">${formatCurrency(doc.sub_total, currency)}</td></tr>`);

  if (parseFloat(doc.igst_amount) > 0) {
    rows.push(`<tr><td class="label">IGST</td><td class="text-right">${formatCurrency(doc.igst_amount, currency)}</td></tr>`);
  }
  if (parseFloat(doc.cgst_amount) > 0) {
    rows.push(`<tr><td class="label">CGST</td><td class="text-right">${formatCurrency(doc.cgst_amount, currency)}</td></tr>`);
  }
  if (parseFloat(doc.sgst_amount) > 0) {
    rows.push(`<tr><td class="label">SGST</td><td class="text-right">${formatCurrency(doc.sgst_amount, currency)}</td></tr>`);
  }
  if (parseFloat(doc.shipping_charge) > 0) {
    rows.push(`<tr><td class="label">Shipping</td><td class="text-right">${formatCurrency(doc.shipping_charge, currency)}</td></tr>`);
  }
  if (parseFloat(doc.round_off) > 0 || parseFloat(doc.round_off) < 0) {
    rows.push(`<tr><td class="label">Round Off</td><td class="text-right">${formatCurrency(doc.round_off, currency)}</td></tr>`);
  }
  rows.push(`<tr class="total-row"><td class="label">Total</td><td class="text-right">${formatCurrency(doc.total_amount, currency)}</td></tr>`);

  if (parseFloat(doc.amount_paid) > 0) {
    rows.push(`<tr><td class="label">Paid</td><td class="text-right">${formatCurrency(doc.amount_paid, currency)}</td></tr>`);
    rows.push(`<tr><td class="label text-bold">Balance Due</td><td class="text-right text-bold">${formatCurrency(doc.balance_due, currency)}</td></tr>`);
  }

  return `
<div class="totals-section">
  <table class="totals-table">${rows.join('')}</table>
</div>
<div class="amount-words"><strong>Amount in words:</strong> ${amountInWords(parseFloat(doc.total_amount) || 0)}</div>`;
}

// ── Footer helper ──────────────────────────────────────────────────────────

function footerBlock(company, notes, terms, opts = {}) {
  const showBankDetails = opts.showBankDetails !== false; // default true for invoices/bills
  const bankName = company.bank_name || '';
  const bankAccount = company.bank_account_number || '';
  const bankIFSC = company.bank_ifsc_code || '';
  const bankBranch = company.bank_branch || '';
  const hasBankDetails = bankName || bankAccount || bankIFSC || bankBranch;
  return `
${notes ? `<div class="notes-section"><div class="notes-title">Notes</div><div class="notes-text">${notes}</div></div>` : ''}
${terms ? `<div class="notes-section" style="margin-top:4px;"><div class="notes-title">Terms & Conditions</div><div class="notes-text">${terms}</div></div>` : ''}
<div class="footer-grid">
  ${showBankDetails && hasBankDetails ? `<div class="bank-details">
    <div class="bank-details-title">Bank Details</div>
    ${bankName ? `<div class="bank-row"><strong>Bank:</strong> ${bankName}</div>` : ''}
    ${bankAccount ? `<div class="bank-row"><strong>Account:</strong> ${bankAccount}</div>` : ''}
    ${bankIFSC ? `<div class="bank-row"><strong>IFSC:</strong> ${bankIFSC}</div>` : ''}
    ${bankBranch ? `<div class="bank-row"><strong>Branch:</strong> ${bankBranch}</div>` : ''}
  </div>` : '<div style="flex:1;"></div>'}
  <div class="signatory">
    <div class="signatory-line">
      <div class="signatory-text">Authorized Signatory</div>
      <div class="signatory-text">For ${company.company_name || ''}</div>
    </div>
  </div>
</div>
<div style="text-align:center; margin-top:12px; padding-top:6px; border-top:1px solid #e0e0e0;">
  <div style="font-size:7px; color:#999;">This is a computer-generated document. No signature is required.</div>
  <div style="font-size:7px; color:#3F6592; margin-top:2px;">${company.company_name || ''}${company.address_line1 ? ' | ' + company.address_line1 + ', ' + (company.city || '') : ''}${company.email ? ' | ' + company.email : ''}</div>
</div>`;
}

// ============================================================================
// DOCUMENT-SPECIFIC GENERATORS
// ============================================================================

function generateInvoiceHTML(data) {
  const { invoice, items, company, customer } = data;
  const currency = invoice.currency_code || 'INR';

  const body = `
${companyHeader(company, 'TAX INVOICE', { number: invoice.invoice_number, status: invoice.status })}

<div class="info-grid">
  <div class="info-block">
    <div class="info-block-title">Bill To</div>
    <div class="info-block-name">${customer.display_name || ''}</div>
    <div class="info-block-detail">${customer.company_name || ''}</div>
    <div class="info-block-detail">${invoice.bill_to_address_line1 || ''} ${invoice.bill_to_address_line2 || ''}</div>
    <div class="info-block-detail">${invoice.bill_to_city || ''} ${invoice.bill_to_state || ''} ${invoice.bill_to_pincode || ''}</div>
    ${customer.gstin ? `<div class="info-block-detail">GSTIN: ${customer.gstin}</div>` : ''}
  </div>
  ${invoice.ship_to_address_line1 ? `
  <div class="info-block">
    <div class="info-block-title">Ship To</div>
    <div class="info-block-detail">${invoice.ship_to_address_line1 || ''} ${invoice.ship_to_address_line2 || ''}</div>
    <div class="info-block-detail">${invoice.ship_to_city || ''} ${invoice.ship_to_state || ''} ${invoice.ship_to_pincode || ''}</div>
  </div>` : ''}
</div>

<div class="meta-grid">
  <div class="meta-item"><div class="meta-label">Invoice Date</div><div class="meta-value">${formatDate(invoice.invoice_date)}</div></div>
  <div class="meta-item"><div class="meta-label">Due Date</div><div class="meta-value">${formatDate(invoice.due_date)}</div></div>
  ${invoice.place_of_supply ? `<div class="meta-item"><div class="meta-label">Place of Supply</div><div class="meta-value">${invoice.place_of_supply}</div></div>` : ''}
  ${invoice.reference_number ? `<div class="meta-item"><div class="meta-label">Reference</div><div class="meta-value">${invoice.reference_number}</div></div>` : ''}
</div>

${itemsTable(items, currency)}
${totalsBlock(invoice, currency)}
${footerBlock(company, invoice.customer_notes, invoice.terms_and_conditions)}`;

  return baseTemplate(`Invoice ${invoice.invoice_number}`, body);
}

function generateQuotationHTML(data) {
  const { quotation, items, company, customer } = data;
  const body = `
${companyHeader(company, 'QUOTATION', { number: quotation.quotation_number, status: quotation.status })}

<div class="info-grid">
  <div class="info-block">
    <div class="info-block-title">To</div>
    <div class="info-block-name">${customer.display_name || ''}</div>
    <div class="info-block-detail">${customer.company_name || ''}</div>
    ${customer.gstin ? `<div class="info-block-detail">GSTIN: ${customer.gstin}</div>` : ''}
  </div>
</div>

<div class="meta-grid">
  <div class="meta-item"><div class="meta-label">Date</div><div class="meta-value">${formatDate(quotation.quotation_date)}</div></div>
  <div class="meta-item"><div class="meta-label">Valid Until</div><div class="meta-value">${formatDate(quotation.expiry_date)}</div></div>
  ${quotation.reference_number ? `<div class="meta-item"><div class="meta-label">Reference</div><div class="meta-value">${quotation.reference_number}</div></div>` : ''}
</div>

${itemsTable(items)}
${totalsBlock(quotation)}
${footerBlock(company, quotation.customer_notes, quotation.terms_and_conditions, { showBankDetails: false })}`;

  return baseTemplate(`Quotation ${quotation.quotation_number}`, body);
}

function generateBillHTML(data) {
  const { bill, items, company, vendor } = data;
  const currency = bill.currency_code || 'INR';
  const body = `
${companyHeader(company, 'BILL', { number: bill.bill_number, status: bill.status })}

<div class="info-grid">
  <div class="info-block">
    <div class="info-block-title">Vendor</div>
    <div class="info-block-name">${vendor.display_name || ''}</div>
    <div class="info-block-detail">${vendor.company_name || ''}</div>
    ${vendor.gstin ? `<div class="info-block-detail">GSTIN: ${vendor.gstin}</div>` : ''}
  </div>
  <div class="info-block">
    <div class="info-block-title">Vendor Invoice</div>
    <div class="info-block-detail">${bill.vendor_invoice_number || 'N/A'}</div>
    <div class="info-block-detail">${formatDate(bill.vendor_invoice_date)}</div>
  </div>
</div>

<div class="meta-grid">
  <div class="meta-item"><div class="meta-label">Bill Date</div><div class="meta-value">${formatDate(bill.bill_date)}</div></div>
  <div class="meta-item"><div class="meta-label">Due Date</div><div class="meta-value">${formatDate(bill.due_date)}</div></div>
  ${bill.place_of_supply ? `<div class="meta-item"><div class="meta-label">Place of Supply</div><div class="meta-value">${bill.place_of_supply}</div></div>` : ''}
</div>

${itemsTable(items, currency)}
${totalsBlock(bill, currency)}
${footerBlock(company, bill.notes, null)}`;

  return baseTemplate(`Bill ${bill.bill_number}`, body);
}

function generatePurchaseOrderHTML(data) {
  const { purchaseOrder, items, company, vendor } = data;
  const body = `
${companyHeader(company, 'PURCHASE ORDER', { number: purchaseOrder.po_number, status: purchaseOrder.status })}

<div class="info-grid">
  <div class="info-block">
    <div class="info-block-title">Vendor</div>
    <div class="info-block-name">${vendor.display_name || ''}</div>
    <div class="info-block-detail">${vendor.company_name || ''}</div>
    ${vendor.gstin ? `<div class="info-block-detail">GSTIN: ${vendor.gstin}</div>` : ''}
  </div>
</div>

<div class="meta-grid">
  <div class="meta-item"><div class="meta-label">PO Date</div><div class="meta-value">${formatDate(purchaseOrder.po_date)}</div></div>
  <div class="meta-item"><div class="meta-label">Expected Delivery</div><div class="meta-value">${formatDate(purchaseOrder.expected_delivery_date || purchaseOrder.expected_date)}</div></div>
</div>

${itemsTable(items)}
${totalsBlock(purchaseOrder)}
${footerBlock(company, purchaseOrder.vendor_notes || purchaseOrder.remarks, purchaseOrder.terms_and_conditions, { showBankDetails: false })}`;

  return baseTemplate(`PO ${purchaseOrder.po_number}`, body);
}

function generateDeliveryChallanHTML(data) {
  const { challan, items, company, customer } = data;
  const body = `
${companyHeader(company, 'DELIVERY CHALLAN', { number: challan.challan_number, status: challan.status })}

<div class="info-grid">
  <div class="info-block">
    <div class="info-block-title">Deliver To</div>
    <div class="info-block-name">${customer.display_name || ''}</div>
    <div class="info-block-detail">${challan.ship_to_address_line1 || ''}</div>
    <div class="info-block-detail">${challan.ship_to_city || ''} ${challan.ship_to_state || ''}</div>
  </div>
</div>

<div class="meta-grid">
  <div class="meta-item"><div class="meta-label">Date</div><div class="meta-value">${formatDate(challan.challan_date)}</div></div>
  <div class="meta-item"><div class="meta-label">Challan Type</div><div class="meta-value">${challan.challan_type || 'Supply'}</div></div>
  ${challan.vehicle_number ? `<div class="meta-item"><div class="meta-label">Vehicle</div><div class="meta-value">${challan.vehicle_number}</div></div>` : ''}
  ${challan.transporter_name ? `<div class="meta-item"><div class="meta-label">Transporter</div><div class="meta-value">${challan.transporter_name}</div></div>` : ''}
</div>

${itemsTable(items, 'INR', false)}
${footerBlock(company, challan.remarks, null, { showBankDetails: false })}`;

  return baseTemplate(`DC ${challan.challan_number}`, body);
}

function generateSalarySlipHTML(data) {
  const { salary, employee, company } = data;
  const months = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const earnings = [
    ['Basic Salary', salary.basic_salary],
    ['HRA', salary.hra],
    ['Dearness Allowance', salary.dearness_allowance],
    ['Conveyance Allowance', salary.conveyance_allowance],
    ['Medical Allowance', salary.medical_allowance],
    ['Special Allowance', salary.special_allowance],
    ['Other Allowance', salary.other_allowance],
    ['Overtime', salary.overtime_pay],
    ['Bonus', salary.bonus],
    ['Incentive', salary.incentive],
    ['Arrears', salary.arrears],
  ].filter(([, v]) => parseFloat(v) > 0);

  const deductions = [
    ['PF (Employee)', salary.pf_employee],
    ['ESI (Employee)', salary.esi_employee],
    ['Professional Tax', salary.professional_tax],
    ['Income Tax / TDS', salary.income_tax],
    ['Advance Deduction', salary.advance_deduction],
    ['Loan Deduction', salary.loan_deduction],
    ['Other Deductions', salary.other_deductions],
  ].filter(([, v]) => parseFloat(v) > 0);

  const earningsRows = earnings.map(([label, val]) => `<div class="ed-row"><span>${label}</span><span>${formatCurrency(val)}</span></div>`).join('');
  const deductionsRows = deductions.map(([label, val]) => `<div class="ed-row"><span>${label}</span><span>${formatCurrency(val)}</span></div>`).join('');

  const companyName = company.company_name || '';
  const initials = companyName.split(' ').filter(w => w.length > 2).map(w => w[0]).join('').substring(0, 2).toUpperCase() || '';
  const logoPath = company.logo_path || '';
  const salaryLogoHtml = logoPath
    ? `<img src="${logoPath}" alt="${companyName}" style="width:48px; height:48px; object-fit:contain; border-radius:6px;" />`
    : `<div class="logo-icon">${initials}</div>`;
  const salaryTagline = company.tagline || '';
  const body = `
<div class="letterhead">
  <div class="letterhead-top">
    <div class="letterhead-logo">
      ${salaryLogoHtml}
      <div class="logo-text">
        <div class="logo-company-name">${companyName}</div>
        ${salaryTagline ? `<div class="logo-tagline">${salaryTagline}</div>` : ''}
      </div>
    </div>
    <div class="letterhead-contact">
      ${company.address_line1 || ''}, ${company.address_line2 || ''}<br>
      ${company.city || ''}, ${company.state || ''} - ${company.pincode || ''}<br>
      ${company.email || ''}
    </div>
  </div>
  <div class="letterhead-divider"></div>
</div>

<div class="salary-header">
  <strong style="font-size:12px;">Salary Slip for ${months[salary.month]} ${salary.year}</strong>
</div>

<div class="emp-grid">
  <div class="emp-row"><span class="emp-label">Name:</span> <span class="emp-value">${employee.display_name || ''}</span></div>
  <div class="emp-row"><span class="emp-label">Employee ID:</span> <span class="emp-value">${employee.employee_id || ''}</span></div>
  <div class="emp-row"><span class="emp-label">Department:</span> <span class="emp-value">${employee.department || ''}</span></div>
  <div class="emp-row"><span class="emp-label">Designation:</span> <span class="emp-value">${employee.designation || ''}</span></div>
  <div class="emp-row"><span class="emp-label">Bank A/C:</span> <span class="emp-value">${employee.bank_account_number || ''}</span></div>
  <div class="emp-row"><span class="emp-label">PAN:</span> <span class="emp-value">${employee.pan_number || ''}</span></div>
  <div class="emp-row"><span class="emp-label">Working Days:</span> <span class="emp-value">${salary.total_working_days || ''}</span></div>
  <div class="emp-row"><span class="emp-label">Days Present:</span> <span class="emp-value">${salary.days_present || ''}</span></div>
  <div class="emp-row"><span class="emp-label">Days Absent:</span> <span class="emp-value">${salary.days_absent || 0}</span></div>
</div>

<div class="earn-ded-grid">
  <div class="earn-section">
    <div class="section-header">Earnings</div>
    ${earningsRows}
    <div class="ed-row ed-total"><span>Gross Earnings</span><span>${formatCurrency(salary.gross_earnings)}</span></div>
  </div>
  <div class="ded-section">
    <div class="section-header">Deductions</div>
    ${deductionsRows}
    <div class="ed-row ed-total"><span>Total Deductions</span><span>${formatCurrency(salary.total_deductions)}</span></div>
  </div>
</div>

<div class="net-pay">
  <div style="font-size:9px; color:#155724;">Net Pay</div>
  <div class="net-pay-amount">${formatCurrency(salary.net_salary)}</div>
  <div class="net-pay-words">${amountInWords(parseFloat(salary.net_salary) || 0)}</div>
</div>

${parseFloat(salary.pf_employer) > 0 || parseFloat(salary.esi_employer) > 0 ? `
<div class="notes-section">
  <div class="notes-title">Employer Contributions (Not deducted from salary)</div>
  <div class="notes-text">
    ${parseFloat(salary.pf_employer) > 0 ? `PF Employer: ${formatCurrency(salary.pf_employer)} | ` : ''}
    ${parseFloat(salary.esi_employer) > 0 ? `ESI Employer: ${formatCurrency(salary.esi_employer)}` : ''}
  </div>
</div>` : ''}

<div style="text-align:center; margin-top:16px; font-size:7px; color:#999;">
  This is a computer-generated salary slip and does not require a signature.
</div>`;

  return baseTemplate(`Salary Slip - ${employee.display_name}`, body);
}

function generateCreditNoteHTML(data) {
  const { creditNote, items, company, customer } = data;
  const body = `
${companyHeader(company, 'CREDIT NOTE', { number: creditNote.credit_note_number, status: creditNote.status })}
<div class="info-grid">
  <div class="info-block">
    <div class="info-block-title">Customer</div>
    <div class="info-block-name">${customer.display_name || ''}</div>
    ${customer.gstin ? `<div class="info-block-detail">GSTIN: ${customer.gstin}</div>` : ''}
  </div>
</div>
<div class="meta-grid">
  <div class="meta-item"><div class="meta-label">Date</div><div class="meta-value">${formatDate(creditNote.credit_note_date)}</div></div>
  ${creditNote.reason ? `<div class="meta-item"><div class="meta-label">Reason</div><div class="meta-value">${creditNote.reason}</div></div>` : ''}
</div>
${itemsTable(items)}
${totalsBlock(creditNote)}
${footerBlock(company, null, null)}`;

  return baseTemplate(`Credit Note ${creditNote.credit_note_number}`, body);
}

function generateDebitNoteHTML(data) {
  const { debitNote, items, company, vendor } = data;
  const body = `
${companyHeader(company, 'DEBIT NOTE', { number: debitNote.debit_note_number, status: debitNote.status })}
<div class="info-grid">
  <div class="info-block">
    <div class="info-block-title">Vendor</div>
    <div class="info-block-name">${vendor.display_name || ''}</div>
    ${vendor.gstin ? `<div class="info-block-detail">GSTIN: ${vendor.gstin}</div>` : ''}
  </div>
</div>
<div class="meta-grid">
  <div class="meta-item"><div class="meta-label">Date</div><div class="meta-value">${formatDate(debitNote.debit_note_date)}</div></div>
  ${debitNote.reason ? `<div class="meta-item"><div class="meta-label">Reason</div><div class="meta-value">${debitNote.reason}</div></div>` : ''}
</div>
${itemsTable(items)}
${totalsBlock(debitNote)}
${footerBlock(company, null, null)}`;

  return baseTemplate(`Debit Note ${debitNote.debit_note_number}`, body);
}

function generateEWayBillHTML(data) {
  const { ewayBill, items, company, customer } = data;
  const body = `
${companyHeader(company, 'E-WAY BILL', { number: ewayBill.eway_bill_number, status: ewayBill.status })}

<div class="meta-grid">
  <div class="meta-item"><div class="meta-label">Date</div><div class="meta-value">${formatDate(ewayBill.bill_date)}</div></div>
  <div class="meta-item"><div class="meta-label">Valid Until</div><div class="meta-value">${formatDate(ewayBill.valid_until)}</div></div>
  <div class="meta-item"><div class="meta-label">Supply Type</div><div class="meta-value">${ewayBill.supply_type || 'Outward'}</div></div>
  <div class="meta-item"><div class="meta-label">Distance</div><div class="meta-value">${ewayBill.distance_km || 0} km</div></div>
</div>

<div class="info-grid">
  <div class="info-block" style="background:#F8F9FA; padding:6px; border-radius:4px;">
    <div class="info-block-title">From (Consignor)</div>
    <div class="info-block-detail">${company.company_name || ''}</div>
    <div class="info-block-detail">GSTIN: ${company.gstin || ''}</div>
    <div class="info-block-detail">${ewayBill.dispatch_from_address || company.address_line1 || ''}</div>
  </div>
  <div class="info-block" style="background:#F8F9FA; padding:6px; border-radius:4px;">
    <div class="info-block-title">To (Consignee)</div>
    <div class="info-block-detail">${customer.display_name || ''}</div>
    <div class="info-block-detail">GSTIN: ${customer.gstin || ''}</div>
    <div class="info-block-detail">${ewayBill.ship_to_address || ''}</div>
  </div>
</div>

<div class="meta-grid" style="margin-top:8px;">
  ${ewayBill.transporter_name ? `<div class="meta-item"><div class="meta-label">Transporter</div><div class="meta-value">${ewayBill.transporter_name}</div></div>` : ''}
  ${ewayBill.vehicle_number ? `<div class="meta-item"><div class="meta-label">Vehicle</div><div class="meta-value">${ewayBill.vehicle_number}</div></div>` : ''}
  ${ewayBill.transport_mode ? `<div class="meta-item"><div class="meta-label">Mode</div><div class="meta-value">${ewayBill.transport_mode}</div></div>` : ''}
</div>

${itemsTable(items)}
${totalsBlock(ewayBill)}
<div style="text-align:center; margin-top:12px; font-size:7px; color:#999;">This is a computer-generated E-Way Bill</div>`;

  return baseTemplate(`E-Way Bill ${ewayBill.eway_bill_number}`, body);
}

function generatePaymentReceivedHTML(data) {
  const { payment, company, customer, allocations } = data;
  const currency = payment.currency_code || 'INR';

  const allocRows = (allocations || []).map((a, i) => `
    <tr>
      <td class="text-center">${i + 1}</td>
      <td>${a.invoice_number || ''}</td>
      <td class="text-right">${formatCurrency(a.invoice_amount, currency)}</td>
      <td class="text-right">${formatCurrency(a.allocated_amount, currency)}</td>
    </tr>`).join('');

  const body = `
${companyHeader(company, 'PAYMENT RECEIPT', { number: payment.payment_number })}
<div class="info-grid">
  <div class="info-block">
    <div class="info-block-title">Received From</div>
    <div class="info-block-name">${customer.display_name || ''}</div>
  </div>
</div>
<div class="meta-grid">
  <div class="meta-item"><div class="meta-label">Date</div><div class="meta-value">${formatDate(payment.payment_date)}</div></div>
  <div class="meta-item"><div class="meta-label">Amount</div><div class="meta-value">${formatCurrency(payment.amount, currency)}</div></div>
  <div class="meta-item"><div class="meta-label">Mode</div><div class="meta-value">${payment.payment_mode || ''}</div></div>
  ${payment.reference_number ? `<div class="meta-item"><div class="meta-label">Reference</div><div class="meta-value">${payment.reference_number}</div></div>` : ''}
</div>
${allocations && allocations.length > 0 ? `
<table>
  <thead><tr><th class="text-center">#</th><th>Invoice</th><th class="text-right">Invoice Amount</th><th class="text-right">Applied</th></tr></thead>
  <tbody>${allocRows}</tbody>
</table>` : ''}
<div class="amount-words"><strong>Amount in words:</strong> ${amountInWords(parseFloat(payment.amount) || 0)}</div>
${footerBlock(company, payment.notes, null)}`;

  return baseTemplate(`Payment ${payment.payment_number}`, body);
}


// ── Payment Made ──────────────────────────────────────────────────────────

function generatePaymentMadeHTML(data) {
  const { payment, company, vendor, allocations } = data;
  const currency = payment.currency_code || 'INR';

  const allocRows = (allocations || []).map((a, i) => `
    <tr>
      <td class="text-center">${i + 1}</td>
      <td>${a.bill_number || ''}</td>
      <td class="text-right">${formatCurrency(a.bill_amount, currency)}</td>
      <td class="text-right">${formatCurrency(a.allocated_amount, currency)}</td>
    </tr>`).join('');

  const body = `
${companyHeader(company, 'PAYMENT VOUCHER', { number: payment.payment_number })}
<div class="info-grid">
  <div class="info-block">
    <div class="info-block-title">Paid To</div>
    <div class="info-block-name">${vendor.display_name || ''}</div>
    <div class="info-block-detail">${vendor.company_name || ''}</div>
  </div>
</div>
<div class="meta-grid">
  <div class="meta-item"><div class="meta-label">Date</div><div class="meta-value">${formatDate(payment.payment_date)}</div></div>
  <div class="meta-item"><div class="meta-label">Amount</div><div class="meta-value">${formatCurrency(payment.amount, currency)}</div></div>
  <div class="meta-item"><div class="meta-label">Mode</div><div class="meta-value">${payment.payment_mode || ''}</div></div>
  ${payment.reference_number ? `<div class="meta-item"><div class="meta-label">Reference</div><div class="meta-value">${payment.reference_number}</div></div>` : ''}
</div>
${allocations && allocations.length > 0 ? `
<table>
  <thead><tr><th class="text-center">#</th><th>Bill</th><th class="text-right">Bill Amount</th><th class="text-right">Applied</th></tr></thead>
  <tbody>${allocRows}</tbody>
</table>` : ''}
<div class="amount-words"><strong>Amount in words:</strong> ${amountInWords(parseFloat(payment.amount) || 0)}</div>
${footerBlock(company, payment.notes, null)}`;

  return baseTemplate(`Payment ${payment.payment_number}`, body);
}

// ── Expense ───────────────────────────────────────────────────────────────

function generateExpenseHTML(data) {
  const { expense, company, vendor } = data;
  const body = `
${companyHeader(company, 'EXPENSE', { number: expense.expense_number, status: expense.status })}
<div class="info-grid">
  ${vendor.display_name ? `
  <div class="info-block">
    <div class="info-block-title">Vendor</div>
    <div class="info-block-name">${vendor.display_name || ''}</div>
  </div>` : ''}
  <div class="info-block">
    <div class="info-block-title">Category</div>
    <div class="info-block-name">${expense.category || ''}</div>
  </div>
</div>
<div class="meta-grid">
  <div class="meta-item"><div class="meta-label">Date</div><div class="meta-value">${formatDate(expense.expense_date)}</div></div>
  <div class="meta-item"><div class="meta-label">Amount</div><div class="meta-value">${formatCurrency(expense.amount)}</div></div>
  ${expense.payment_mode ? `<div class="meta-item"><div class="meta-label">Payment Mode</div><div class="meta-value">${expense.payment_mode}</div></div>` : ''}
  ${expense.reference_number ? `<div class="meta-item"><div class="meta-label">Reference</div><div class="meta-value">${expense.reference_number}</div></div>` : ''}
</div>
${expense.description ? `<div class="notes-section"><div class="notes-title">Description</div><div class="notes-text">${expense.description}</div></div>` : ''}
${expense.notes ? `<div class="notes-section" style="margin-top:4px;"><div class="notes-title">Notes</div><div class="notes-text">${expense.notes}</div></div>` : ''}
<div class="amount-words"><strong>Amount in words:</strong> ${amountInWords(parseFloat(expense.amount) || 0)}</div>`;

  return baseTemplate(`Expense ${expense.expense_number || ''}`, body);
}

// ── Packing List ──────────────────────────────────────────────────────────

function generatePackingListHTML(data) {
  const { packingList, items, company, customer } = data;

  const rows = (items || []).map((item, i) => `
    <tr>
      <td class="text-center">${i + 1}</td>
      <td>${item.item_name || item.description || ''}</td>
      <td class="text-right">${item.quantity || ''}</td>
      <td class="text-right">${item.net_weight ? item.net_weight + ' kg' : ''}</td>
      <td class="text-right">${item.gross_weight ? item.gross_weight + ' kg' : ''}</td>
      <td class="text-right">${item.length_cm && item.width_cm && item.height_cm ? item.length_cm + 'x' + item.width_cm + 'x' + item.height_cm : ''}</td>
    </tr>`).join('');

  const body = `
${companyHeader(company, 'PACKING LIST', { number: packingList.packing_number, status: packingList.status })}
<div class="info-grid">
  <div class="info-block">
    <div class="info-block-title">Customer</div>
    <div class="info-block-name">${customer.display_name || ''}</div>
    <div class="info-block-detail">${customer.company_name || ''}</div>
  </div>
  ${packingList.ship_to_address ? `
  <div class="info-block">
    <div class="info-block-title">Ship To</div>
    <div class="info-block-detail">${packingList.ship_to_address || ''}</div>
    <div class="info-block-detail">${packingList.ship_to_city || ''} ${packingList.ship_to_state || ''} ${packingList.ship_to_pincode || ''}</div>
  </div>` : ''}
</div>
<div class="meta-grid">
  <div class="meta-item"><div class="meta-label">Date</div><div class="meta-value">${formatDate(packingList.packing_date)}</div></div>
  ${packingList.total_cartons ? `<div class="meta-item"><div class="meta-label">Total Cartons</div><div class="meta-value">${packingList.total_cartons}</div></div>` : ''}
  ${packingList.total_net_weight ? `<div class="meta-item"><div class="meta-label">Net Weight</div><div class="meta-value">${packingList.total_net_weight} kg</div></div>` : ''}
  ${packingList.total_gross_weight ? `<div class="meta-item"><div class="meta-label">Gross Weight</div><div class="meta-value">${packingList.total_gross_weight} kg</div></div>` : ''}
</div>
<table>
  <thead>
    <tr>
      <th class="text-center" style="width:30px">#</th>
      <th>Description</th>
      <th class="text-right" style="width:60px">Qty</th>
      <th class="text-right" style="width:80px">Net Wt</th>
      <th class="text-right" style="width:80px">Gross Wt</th>
      <th class="text-right" style="width:100px">Dimensions (cm)</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>
${packingList.remarks ? `<div class="notes-section"><div class="notes-title">Remarks</div><div class="notes-text">${packingList.remarks}</div></div>` : ''}`;

  return baseTemplate(`Packing List ${packingList.packing_number}`, body);
}

// ── Employee ──────────────────────────────────────────────────────────────

function generateEmployeeHTML(data) {
  const { employee, company } = data;
  const body = `
${companyHeader(company, 'EMPLOYEE DETAILS', { number: employee.employee_id })}
<div class="info-grid">
  <div class="info-block">
    <div class="info-block-title">Personal Information</div>
    <div class="info-block-name">${employee.display_name || ''}</div>
    <div class="info-block-detail">Designation: ${employee.designation || 'N/A'}</div>
    <div class="info-block-detail">Department: ${employee.department || 'N/A'}</div>
    <div class="info-block-detail">Date of Joining: ${formatDate(employee.date_of_joining)}</div>
    ${employee.email ? `<div class="info-block-detail">Email: ${employee.email}</div>` : ''}
    ${employee.phone ? `<div class="info-block-detail">Phone: ${employee.phone}</div>` : ''}
  </div>
  <div class="info-block">
    <div class="info-block-title">Statutory Details</div>
    <div class="info-block-detail">PAN: ${employee.pan_number || 'N/A'}</div>
    <div class="info-block-detail">Aadhar: ${employee.aadhar_number || 'N/A'}</div>
    <div class="info-block-detail">UAN: ${employee.uan_number || 'N/A'}</div>
    <div class="info-block-detail">ESI No: ${employee.esi_number || 'N/A'}</div>
  </div>
</div>
<div class="meta-grid">
  ${employee.basic_salary ? `<div class="meta-item"><div class="meta-label">Basic Salary</div><div class="meta-value">${formatCurrency(employee.basic_salary)}</div></div>` : ''}
  ${employee.gross_salary ? `<div class="meta-item"><div class="meta-label">Gross Salary</div><div class="meta-value">${formatCurrency(employee.gross_salary)}</div></div>` : ''}
  <div class="meta-item"><div class="meta-label">Status</div><div class="meta-value">${employee.status || 'Active'}</div></div>
</div>
${employee.bank_account_number ? `
<div class="notes-section">
  <div class="notes-title">Bank Details</div>
  <div class="notes-text">Bank: ${employee.bank_name || ''} | Account: ${employee.bank_account_number || ''} | IFSC: ${employee.bank_ifsc || ''}</div>
</div>` : ''}`;

  return baseTemplate(`Employee - ${employee.display_name}`, body);
}

// ── Employee ID Card ──────────────────────────────────────────────────────

function generateEmployeeCardHTML(data) {
  const { employee, company } = data;
  const companyName = company.company_name || '';
  const displayName = employee.display_name || [employee.first_name, employee.last_name].filter(Boolean).join(' ') || '';
  const initials = displayName.split(' ').filter(w => w.length > 0).map(w => w[0]).join('').substring(0, 2).toUpperCase() || '?';
  const joiningDate = formatDate(employee.date_of_joining || employee.joining_date);
  const employeeId = employee.employee_id || employee.employee_code || '';
  const designation = employee.designation || '';
  const department = employee.department || employee.department_name || '';
  const bloodGroup = employee.blood_group || '';
  const emergencyContact = employee.emergency_contact_phone || '';
  const emergencyName = employee.emergency_contact_name || '';
  const companyPhone = company.phone || '';
  const companyEmail = company.email || '';
  const companyAddress = [
    company.address_line1 || '',
    company.address_line2 || '',
    [company.city || '', company.state || ''].filter(Boolean).join(', '),
    company.pincode || ''
  ].filter(Boolean).join(', ');

  // Employee photo URL (if available via photo_url field or constructed)
  const photoUrl = employee.photo_url || '';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Employee ID Card - ${displayName}</title>
<style>
  @page {
    size: 85.6mm 54mm;
    margin: 0;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Helvetica Neue', Arial, sans-serif;
    width: 85.6mm;
    height: 54mm;
    color: #333;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .card-page {
    width: 85.6mm;
    height: 54mm;
    overflow: hidden;
    position: relative;
    page-break-after: always;
  }

  /* ─── FRONT SIDE ─── */
  .front {
    background: #ffffff;
  }
  .front-header {
    background: linear-gradient(135deg, #3F6592 0%, #4A7BA8 50%, #5A8DB8 100%);
    padding: 3mm 4mm 2.5mm 4mm;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .front-header-left {
    display: flex;
    align-items: center;
    gap: 2mm;
  }
  .company-logo-icon {
    width: 7mm;
    height: 7mm;
    background: rgba(255,255,255,0.15);
    border-radius: 1.5mm;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 5px;
    font-weight: 800;
    letter-spacing: -0.3px;
  }
  .company-name-block {}
  .company-name-text {
    color: #ffffff;
    font-size: 7px;
    font-weight: 800;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    line-height: 1.2;
  }
  .company-tagline {
    color: rgba(255,255,255,0.65);
    font-size: 4px;
    text-transform: uppercase;
    letter-spacing: 1.2px;
    margin-top: 0.5mm;
  }
  .card-type-badge {
    color: rgba(255,255,255,0.8);
    font-size: 4px;
    text-transform: uppercase;
    letter-spacing: 1px;
    border: 0.3mm solid rgba(255,255,255,0.3);
    padding: 0.5mm 1.5mm;
    border-radius: 0.5mm;
  }

  .front-body {
    display: flex;
    padding: 3mm 4mm 2mm 4mm;
    gap: 3mm;
    height: calc(54mm - 12.5mm - 4.5mm);
  }
  .photo-section {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
  }
  .photo-circle {
    width: 17mm;
    height: 17mm;
    border-radius: 50%;
    border: 0.5mm solid #3F6592;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    background: #e8eaf6;
  }
  .photo-circle img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
  }
  .photo-initials {
    font-size: 10px;
    font-weight: 700;
    color: #3F6592;
  }
  .emp-id-under-photo {
    margin-top: 1mm;
    font-size: 4.5px;
    font-weight: 700;
    color: #3F6592;
    background: #e8eaf6;
    padding: 0.3mm 1.5mm;
    border-radius: 0.5mm;
    letter-spacing: 0.3px;
  }

  .details-section {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    gap: 0.8mm;
  }
  .emp-name {
    font-size: 8px;
    font-weight: 800;
    color: #3F6592;
    line-height: 1.2;
    margin-bottom: 0.3mm;
  }
  .emp-designation {
    font-size: 5.5px;
    color: #5A8DB8;
    font-weight: 600;
    line-height: 1.2;
    margin-bottom: 1mm;
  }
  .detail-row {
    display: flex;
    align-items: baseline;
    gap: 1mm;
    line-height: 1.3;
  }
  .detail-label {
    font-size: 4px;
    color: #9e9e9e;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    flex-shrink: 0;
    width: 14mm;
    font-weight: 600;
  }
  .detail-value {
    font-size: 5px;
    color: #333;
    font-weight: 600;
  }

  .front-footer {
    background: linear-gradient(135deg, #3F6592 0%, #4A7BA8 100%);
    height: 4.5mm;
    display: flex;
    align-items: center;
    justify-content: center;
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
  }
  .front-footer-text {
    color: rgba(255,255,255,0.7);
    font-size: 3.5px;
    letter-spacing: 0.5px;
  }

  /* ─── BACK SIDE ─── */
  .back {
    background: #ffffff;
  }
  .back-header {
    background: linear-gradient(135deg, #3F6592 0%, #4A7BA8 100%);
    padding: 2mm 4mm;
    text-align: center;
  }
  .back-header-title {
    color: #ffffff;
    font-size: 5px;
    font-weight: 700;
    letter-spacing: 1px;
    text-transform: uppercase;
  }

  .back-body {
    padding: 2.5mm 4mm 2mm 4mm;
    display: flex;
    flex-direction: column;
    gap: 1.5mm;
  }
  .back-section-title {
    font-size: 4px;
    color: #3F6592;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 0.3mm;
    border-bottom: 0.2mm solid #e8eaf6;
    padding-bottom: 0.3mm;
  }
  .back-info-row {
    display: flex;
    align-items: baseline;
    gap: 1mm;
    line-height: 1.4;
  }
  .back-label {
    font-size: 4px;
    color: #9e9e9e;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    flex-shrink: 0;
    width: 18mm;
  }
  .back-value {
    font-size: 4.5px;
    color: #333;
    font-weight: 600;
  }
  .back-address {
    font-size: 4.5px;
    color: #555;
    line-height: 1.5;
  }

  .back-barcode-section {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-top: auto;
    padding-top: 1mm;
    border-top: 0.2mm dashed #e0e0e0;
  }
  .barcode-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5mm;
  }
  .barcode-bars {
    display: flex;
    align-items: flex-end;
    gap: 0.2mm;
    height: 5mm;
  }
  .barcode-bars span {
    display: inline-block;
    background: #333;
    width: 0.3mm;
  }
  .barcode-text {
    font-size: 3.5px;
    color: #666;
    font-family: 'Courier New', monospace;
    letter-spacing: 0.5px;
  }

  .back-footer {
    background: linear-gradient(135deg, #3F6592 0%, #4A7BA8 100%);
    height: 4mm;
    display: flex;
    align-items: center;
    justify-content: center;
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
  }
  .back-footer-text {
    color: rgba(255,255,255,0.7);
    font-size: 3.5px;
    letter-spacing: 0.3px;
  }
</style>
</head>
<body>

<!-- ═══════ FRONT SIDE ═══════ -->
<div class="card-page front">
  <div class="front-header">
    <div class="front-header-left">
      ${company.logo_path ? `<img src="${company.logo_path}" alt="${companyName}" style="width:7mm; height:7mm; object-fit:contain; border-radius:1.5mm;" />` : `<div class="company-logo-icon">${companyName.split(' ').filter(w => w.length > 0).map(w => w[0]).join('').substring(0, 2).toUpperCase() || ''}</div>`}
      <div class="company-name-block">
        <div class="company-name-text">${companyName}</div>
        ${company.tagline ? `<div class="company-tagline">${company.tagline}</div>` : ''}
      </div>
    </div>
    <div class="card-type-badge">ID Card</div>
  </div>

  <div class="front-body">
    <div class="photo-section">
      <div class="photo-circle">
        ${photoUrl ? `<img src="${photoUrl}" alt="${displayName}" />` : `<div class="photo-initials">${initials}</div>`}
      </div>
      <div class="emp-id-under-photo">${employeeId}</div>
    </div>
    <div class="details-section">
      <div class="emp-name">${displayName}</div>
      <div class="emp-designation">${designation}</div>
      <div class="detail-row">
        <span class="detail-label">Department</span>
        <span class="detail-value">${department || '--'}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Employee ID</span>
        <span class="detail-value">${employeeId || '--'}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Date of Joining</span>
        <span class="detail-value">${joiningDate || '--'}</span>
      </div>
      ${bloodGroup ? `<div class="detail-row">
        <span class="detail-label">Blood Group</span>
        <span class="detail-value" style="color:#c62828; font-weight:800;">${bloodGroup}</span>
      </div>` : ''}
    </div>
  </div>

  <div class="front-footer">
    <span class="front-footer-text">This card is the property of ${companyName}. If found, please return to the address on the back.</span>
  </div>
</div>

<!-- ═══════ BACK SIDE ═══════ -->
<div class="card-page back">
  <div class="back-header">
    <div class="back-header-title">${companyName}</div>
  </div>

  <div class="back-body">
    <div>
      <div class="back-section-title">Company Address</div>
      <div class="back-address">${companyAddress}</div>
    </div>

    ${emergencyContact || emergencyName ? `<div>
      <div class="back-section-title">Emergency Contact</div>
      ${emergencyName ? `<div class="back-info-row">
        <span class="back-label">Name</span>
        <span class="back-value">${emergencyName}</span>
      </div>` : ''}
      ${emergencyContact ? `<div class="back-info-row">
        <span class="back-label">Phone</span>
        <span class="back-value">${emergencyContact}</span>
      </div>` : ''}
    </div>` : ''}

    ${bloodGroup ? `<div>
      <div class="back-info-row">
        <span class="back-label">Blood Group</span>
        <span class="back-value" style="color:#c62828; font-weight:800; font-size:5px;">${bloodGroup}</span>
      </div>
    </div>` : ''}

    <div>
      <div class="back-section-title">Contact</div>
      ${companyPhone ? `<div class="back-info-row">
        <span class="back-label">Phone</span>
        <span class="back-value">${companyPhone}</span>
      </div>` : ''}
      ${companyEmail ? `<div class="back-info-row">
        <span class="back-label">Email</span>
        <span class="back-value">${companyEmail}</span>
      </div>` : ''}
    </div>

    <div class="back-barcode-section">
      <div class="barcode-placeholder">
        <div class="barcode-bars">
          <span style="height:5mm;"></span><span style="height:3mm;"></span><span style="height:5mm;"></span><span style="height:5mm;"></span><span style="height:3mm;"></span><span style="height:5mm;"></span><span style="height:3mm;"></span><span style="height:3mm;"></span><span style="height:5mm;"></span><span style="height:3mm;"></span><span style="height:5mm;"></span><span style="height:5mm;"></span><span style="height:3mm;"></span><span style="height:5mm;"></span><span style="height:3mm;"></span><span style="height:5mm;"></span><span style="height:3mm;"></span><span style="height:5mm;"></span><span style="height:5mm;"></span><span style="height:3mm;"></span><span style="height:5mm;"></span><span style="height:3mm;"></span><span style="height:3mm;"></span><span style="height:5mm;"></span><span style="height:3mm;"></span><span style="height:5mm;"></span><span style="height:5mm;"></span><span style="height:3mm;"></span>
        </div>
        <div class="barcode-text">${employeeId || 'EMP-000'}</div>
      </div>
    </div>
  </div>

  <div class="back-footer">
    <span class="back-footer-text">${companyPhone ? 'Tel: ' + companyPhone : ''}${companyPhone && companyEmail ? ' | ' : ''}${companyEmail || ''}</span>
  </div>
</div>

</body>
</html>`;
}

// ── Customer ──────────────────────────────────────────────────────────────

function generateCustomerHTML(data) {
  const { customer, company } = data;
  const body = `
${companyHeader(company, 'CUSTOMER DETAILS', {})}
<div class="info-grid">
  <div class="info-block">
    <div class="info-block-title">Customer Information</div>
    <div class="info-block-name">${customer.display_name || ''}</div>
    ${customer.company_name ? `<div class="info-block-detail">Company: ${customer.company_name}</div>` : ''}
    ${customer.email ? `<div class="info-block-detail">Email: ${customer.email}</div>` : ''}
    ${customer.phone ? `<div class="info-block-detail">Phone: ${customer.phone}</div>` : ''}
    ${customer.gstin ? `<div class="info-block-detail">GSTIN: ${customer.gstin}</div>` : ''}
    ${customer.pan ? `<div class="info-block-detail">PAN: ${customer.pan}</div>` : ''}
  </div>
  <div class="info-block">
    <div class="info-block-title">Address</div>
    <div class="info-block-detail">${customer.billing_address_line1 || ''}</div>
    <div class="info-block-detail">${customer.billing_address_line2 || ''}</div>
    <div class="info-block-detail">${customer.billing_city || ''} ${customer.billing_state || ''} ${customer.billing_pincode || ''}</div>
    <div class="info-block-detail">${customer.billing_country || ''}</div>
  </div>
</div>
<div class="meta-grid">
  ${customer.payment_terms ? `<div class="meta-item"><div class="meta-label">Payment Terms</div><div class="meta-value">${customer.payment_terms}</div></div>` : ''}
  ${customer.currency_code ? `<div class="meta-item"><div class="meta-label">Currency</div><div class="meta-value">${customer.currency_code}</div></div>` : ''}
  <div class="meta-item"><div class="meta-label">Status</div><div class="meta-value">${customer.is_active !== false ? 'Active' : 'Inactive'}</div></div>
</div>
${customer.notes ? `<div class="notes-section"><div class="notes-title">Notes</div><div class="notes-text">${customer.notes}</div></div>` : ''}`;

  return baseTemplate(`Customer - ${customer.display_name}`, body);
}

// ── Vendor ────────────────────────────────────────────────────────────────

function generateVendorHTML(data) {
  const { vendor, company } = data;
  const body = `
${companyHeader(company, 'VENDOR DETAILS', {})}
<div class="info-grid">
  <div class="info-block">
    <div class="info-block-title">Vendor Information</div>
    <div class="info-block-name">${vendor.display_name || ''}</div>
    ${vendor.company_name ? `<div class="info-block-detail">Company: ${vendor.company_name}</div>` : ''}
    ${vendor.email ? `<div class="info-block-detail">Email: ${vendor.email}</div>` : ''}
    ${vendor.phone ? `<div class="info-block-detail">Phone: ${vendor.phone}</div>` : ''}
    ${vendor.gstin ? `<div class="info-block-detail">GSTIN: ${vendor.gstin}</div>` : ''}
    ${vendor.pan ? `<div class="info-block-detail">PAN: ${vendor.pan}</div>` : ''}
    ${vendor.msme_number ? `<div class="info-block-detail">MSME: ${vendor.msme_number}</div>` : ''}
  </div>
  <div class="info-block">
    <div class="info-block-title">Address</div>
    <div class="info-block-detail">${vendor.billing_address_line1 || ''}</div>
    <div class="info-block-detail">${vendor.billing_address_line2 || ''}</div>
    <div class="info-block-detail">${vendor.billing_city || ''} ${vendor.billing_state || ''} ${vendor.billing_pincode || ''}</div>
    <div class="info-block-detail">${vendor.billing_country || ''}</div>
  </div>
</div>
<div class="meta-grid">
  ${vendor.payment_terms ? `<div class="meta-item"><div class="meta-label">Payment Terms</div><div class="meta-value">${vendor.payment_terms}</div></div>` : ''}
  ${vendor.currency_code ? `<div class="meta-item"><div class="meta-label">Currency</div><div class="meta-value">${vendor.currency_code}</div></div>` : ''}
  ${vendor.tds_section ? `<div class="meta-item"><div class="meta-label">TDS Section</div><div class="meta-value">Sec ${vendor.tds_section}</div></div>` : ''}
</div>
${vendor.notes ? `<div class="notes-section"><div class="notes-title">Notes</div><div class="notes-text">${vendor.notes}</div></div>` : ''}`;

  return baseTemplate(`Vendor - ${vendor.display_name}`, body);
}

// ── Journal Entry ─────────────────────────────────────────────────────────

function generateJournalEntryHTML(data) {
  const { journalEntry, lines, company } = data;

  const lineRows = (lines || []).map((line, i) => `
    <tr>
      <td class="text-center">${i + 1}</td>
      <td>${line.account_code ? line.account_code + ' - ' : ''}${line.account_name || ''}</td>
      <td>${line.description || ''}</td>
      <td class="text-right">${parseFloat(line.debit_amount) > 0 ? formatCurrency(line.debit_amount) : ''}</td>
      <td class="text-right">${parseFloat(line.credit_amount) > 0 ? formatCurrency(line.credit_amount) : ''}</td>
    </tr>`).join('');

  const totalDebit = (lines || []).reduce((s, l) => s + (parseFloat(l.debit_amount) || 0), 0);
  const totalCredit = (lines || []).reduce((s, l) => s + (parseFloat(l.credit_amount) || 0), 0);

  const body = `
${companyHeader(company, 'JOURNAL ENTRY', { number: journalEntry.entry_number, status: journalEntry.status })}
<div class="meta-grid">
  <div class="meta-item"><div class="meta-label">Date</div><div class="meta-value">${formatDate(journalEntry.entry_date)}</div></div>
  ${journalEntry.reference_number ? `<div class="meta-item"><div class="meta-label">Reference</div><div class="meta-value">${journalEntry.reference_number}</div></div>` : ''}
  ${journalEntry.journal_type ? `<div class="meta-item"><div class="meta-label">Type</div><div class="meta-value">${journalEntry.journal_type}</div></div>` : ''}
</div>
<table>
  <thead>
    <tr>
      <th class="text-center" style="width:30px">#</th>
      <th>Account</th>
      <th>Description</th>
      <th class="text-right" style="width:100px">Debit</th>
      <th class="text-right" style="width:100px">Credit</th>
    </tr>
  </thead>
  <tbody>${lineRows}</tbody>
  <tfoot>
    <tr style="font-weight:bold; border-top: 2px solid #333;">
      <td></td><td colspan="2" class="text-right"><strong>Total</strong></td>
      <td class="text-right"><strong>${formatCurrency(totalDebit)}</strong></td>
      <td class="text-right"><strong>${formatCurrency(totalCredit)}</strong></td>
    </tr>
  </tfoot>
</table>
${journalEntry.narration ? `<div class="notes-section"><div class="notes-title">Narration</div><div class="notes-text">${journalEntry.narration}</div></div>` : ''}
${journalEntry.notes ? `<div class="notes-section" style="margin-top:4px;"><div class="notes-title">Notes</div><div class="notes-text">${journalEntry.notes}</div></div>` : ''}`;

  return baseTemplate(`Journal Entry ${journalEntry.entry_number}`, body);
}

// ── GST Filing ────────────────────────────────────────────────────────────

function generateGSTFilingHTML(data) {
  const { gstFiling, company } = data;
  const totalIgst = parseFloat(gstFiling.total_igst) || 0;
  const totalCgst = parseFloat(gstFiling.total_cgst) || 0;
  const totalSgst = parseFloat(gstFiling.total_sgst) || 0;
  const totalCess = parseFloat(gstFiling.total_cess) || 0;
  const totalTaxLiability = parseFloat(gstFiling.total_tax_liability) || (totalIgst + totalCgst + totalSgst + totalCess);
  const totalItc = parseFloat(gstFiling.total_itc) || parseFloat(gstFiling.total_itc_claimed) || 0;
  const netPayable = parseFloat(gstFiling.net_tax_payable) || 0;
  const lateFee = parseFloat(gstFiling.late_fee) || 0;
  const interest = parseFloat(gstFiling.interest) || 0;

  const body = `
${companyHeader(company, 'GST FILING', { number: gstFiling.return_type || gstFiling.filing_type, status: gstFiling.status })}
<div class="meta-grid">
  <div class="meta-item"><div class="meta-label">Return Type</div><div class="meta-value">${gstFiling.return_type || gstFiling.filing_type || ''}</div></div>
  <div class="meta-item"><div class="meta-label">Period</div><div class="meta-value">${gstFiling.filing_period || gstFiling.period || ''}</div></div>
  <div class="meta-item"><div class="meta-label">Financial Year</div><div class="meta-value">FY ${gstFiling.financial_year || ''}</div></div>
  <div class="meta-item"><div class="meta-label">Due Date</div><div class="meta-value">${formatDate(gstFiling.due_date)}</div></div>
  <div class="meta-item"><div class="meta-label">Filing Date</div><div class="meta-value">${formatDate(gstFiling.filing_date)}</div></div>
  ${gstFiling.arn_number ? `<div class="meta-item"><div class="meta-label">ARN</div><div class="meta-value">${gstFiling.arn_number}</div></div>` : ''}
</div>
<table>
  <thead><tr><th>Component</th><th class="text-right">Amount</th></tr></thead>
  <tbody>
    <tr><td>IGST</td><td class="text-right">${formatCurrency(totalIgst)}</td></tr>
    <tr><td>CGST</td><td class="text-right">${formatCurrency(totalCgst)}</td></tr>
    <tr><td>SGST</td><td class="text-right">${formatCurrency(totalSgst)}</td></tr>
    <tr><td>Cess</td><td class="text-right">${formatCurrency(totalCess)}</td></tr>
    <tr style="font-weight:bold; border-top:1px solid #333;"><td>Total Tax Liability</td><td class="text-right">${formatCurrency(totalTaxLiability)}</td></tr>
    <tr><td>ITC Claimed</td><td class="text-right" style="color:green">${formatCurrency(totalItc)}</td></tr>
    <tr style="font-weight:bold; border-top:1px solid #333;"><td>Net Tax Payable</td><td class="text-right">${formatCurrency(netPayable)}</td></tr>
    ${lateFee > 0 ? `<tr><td>Late Fee</td><td class="text-right" style="color:red">${formatCurrency(lateFee)}</td></tr>` : ''}
    ${interest > 0 ? `<tr><td>Interest</td><td class="text-right" style="color:red">${formatCurrency(interest)}</td></tr>` : ''}
    ${(lateFee > 0 || interest > 0) ? `<tr style="font-weight:bold; border-top:1px solid #333;"><td>Total Payable</td><td class="text-right">${formatCurrency(netPayable + lateFee + interest)}</td></tr>` : ''}
  </tbody>
</table>
${gstFiling.remarks || gstFiling.notes ? `<div class="notes-section"><div class="notes-title">Remarks</div><div class="notes-text">${gstFiling.remarks || gstFiling.notes}</div></div>` : ''}`;

  return baseTemplate('GST Filing', body);
}

// ── TDS Liability ─────────────────────────────────────────────────────────

function generateTDSLiabilityHTML(data) {
  const { tdsLiability, company } = data;
  const baseAmount = parseFloat(tdsLiability.base_amount) || parseFloat(tdsLiability.payment_amount) || 0;
  const tdsAmount = parseFloat(tdsLiability.tds_amount) || 0;
  const surcharge = parseFloat(tdsLiability.surcharge) || 0;
  const cess = parseFloat(tdsLiability.cess) || 0;
  const totalTds = parseFloat(tdsLiability.total_tds) || (tdsAmount + surcharge + cess);

  const body = `
${companyHeader(company, 'TDS LIABILITY', { status: tdsLiability.status })}
<div class="info-grid">
  <div class="info-block">
    <div class="info-block-title">Deductee</div>
    <div class="info-block-name">${tdsLiability.deductee_name || tdsLiability.vendor_name || ''}</div>
    <div class="info-block-detail">PAN: ${tdsLiability.deductee_pan || 'N/A'}</div>
    <div class="info-block-detail">Section: ${tdsLiability.section ? 'Sec ' + tdsLiability.section : 'N/A'}</div>
  </div>
</div>
<div class="meta-grid">
  <div class="meta-item"><div class="meta-label">Deduction Date</div><div class="meta-value">${formatDate(tdsLiability.deduction_date || tdsLiability.payment_date)}</div></div>
  <div class="meta-item"><div class="meta-label">Base Amount</div><div class="meta-value">${formatCurrency(baseAmount)}</div></div>
  <div class="meta-item"><div class="meta-label">TDS Rate</div><div class="meta-value">${tdsLiability.tds_rate != null ? tdsLiability.tds_rate + '%' : 'N/A'}</div></div>
</div>
<table>
  <thead><tr><th>Component</th><th class="text-right">Amount</th></tr></thead>
  <tbody>
    <tr><td>TDS Amount</td><td class="text-right">${formatCurrency(tdsAmount)}</td></tr>
    ${surcharge > 0 ? `<tr><td>Surcharge</td><td class="text-right">${formatCurrency(surcharge)}</td></tr>` : ''}
    ${cess > 0 ? `<tr><td>Education Cess</td><td class="text-right">${formatCurrency(cess)}</td></tr>` : ''}
    <tr style="font-weight:bold; border-top:2px solid #333;"><td>Total TDS</td><td class="text-right">${formatCurrency(totalTds)}</td></tr>
  </tbody>
</table>
${tdsLiability.remarks || tdsLiability.notes ? `<div class="notes-section"><div class="notes-title">Remarks</div><div class="notes-text">${tdsLiability.remarks || tdsLiability.notes}</div></div>` : ''}`;

  return baseTemplate('TDS Liability', body);
}

// ── TDS Challan ───────────────────────────────────────────────────────────

function generateTDSChallanHTML(data) {
  const { tdsChallan, liabilities, company } = data;
  const tdsAmount = parseFloat(tdsChallan.total_tds_amount) || 0;
  const surcharge = parseFloat(tdsChallan.total_surcharge) || 0;
  const cess = parseFloat(tdsChallan.total_cess) || 0;
  const totalAmount = parseFloat(tdsChallan.total_amount) || parseFloat(tdsChallan.amount) || (tdsAmount + surcharge + cess);

  const liabRows = (liabilities || []).map((l, i) => `
    <tr>
      <td class="text-center">${i + 1}</td>
      <td>${l.deductee_name || l.vendor_name || ''}</td>
      <td>${l.deductee_pan || ''}</td>
      <td>${l.section ? 'Sec ' + l.section : ''}</td>
      <td class="text-right">${formatCurrency(l.total_tds || l.tds_amount)}</td>
    </tr>`).join('');

  const body = `
${companyHeader(company, 'TDS CHALLAN', { number: tdsChallan.challan_number, status: tdsChallan.status })}
<div class="meta-grid">
  <div class="meta-item"><div class="meta-label">Challan No</div><div class="meta-value">${tdsChallan.challan_number || ''}</div></div>
  <div class="meta-item"><div class="meta-label">BSR Code</div><div class="meta-value">${tdsChallan.bsr_code || ''}</div></div>
  <div class="meta-item"><div class="meta-label">Deposit Date</div><div class="meta-value">${formatDate(tdsChallan.deposit_date || tdsChallan.challan_date)}</div></div>
  ${tdsChallan.assessment_year ? `<div class="meta-item"><div class="meta-label">Assessment Year</div><div class="meta-value">AY ${tdsChallan.assessment_year}</div></div>` : ''}
  ${tdsChallan.section ? `<div class="meta-item"><div class="meta-label">Section</div><div class="meta-value">Sec ${tdsChallan.section}</div></div>` : ''}
</div>
<table>
  <thead><tr><th>Component</th><th class="text-right">Amount</th></tr></thead>
  <tbody>
    <tr><td>TDS Amount</td><td class="text-right">${formatCurrency(tdsAmount)}</td></tr>
    ${surcharge > 0 ? `<tr><td>Surcharge</td><td class="text-right">${formatCurrency(surcharge)}</td></tr>` : ''}
    ${cess > 0 ? `<tr><td>Education Cess</td><td class="text-right">${formatCurrency(cess)}</td></tr>` : ''}
    <tr style="font-weight:bold; border-top:2px solid #333;"><td>Total Deposit</td><td class="text-right">${formatCurrency(totalAmount)}</td></tr>
  </tbody>
</table>
${liabilities && liabilities.length > 0 ? `
<div style="margin-top:12px;">
<table>
  <thead><tr><th class="text-center">#</th><th>Deductee</th><th>PAN</th><th>Section</th><th class="text-right">TDS Amount</th></tr></thead>
  <tbody>${liabRows}</tbody>
</table>
</div>` : ''}
${tdsChallan.remarks || tdsChallan.notes ? `<div class="notes-section"><div class="notes-title">Remarks</div><div class="notes-text">${tdsChallan.remarks || tdsChallan.notes}</div></div>` : ''}`;

  return baseTemplate(`TDS Challan ${tdsChallan.challan_number || ''}`, body);
}

// ── Costing Sheet ─────────────────────────────────────────────────────────

function generateCostingSheetHTML(data) {
  const { costingSheet, fabricItems, trimItems, packingItems, company } = data;

  function costRows(items, cols) {
    return (items || []).map((item, i) => {
      const cells = cols.map(c => `<td class="${c.align === 'right' ? 'text-right' : ''}">${c.format ? c.format(item[c.key]) : (item[c.key] ?? '')}</td>`).join('');
      return '<tr><td class="text-center">' + (i+1) + '</td>' + cells + '</tr>';
    }).join('');
  }

  const fabricTotal = (fabricItems || []).reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
  const trimTotal = (trimItems || []).reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
  const packingTotal = (packingItems || []).reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
  const totalCost = parseFloat(costingSheet.total_cost) || (fabricTotal + trimTotal + packingTotal);
  const sellingPrice = parseFloat(costingSheet.selling_price) || 0;
  const margin = sellingPrice > 0 ? ((sellingPrice - totalCost) / sellingPrice * 100).toFixed(1) : 0;

  const fRows = costRows(fabricItems, [
    { key: 'name', label: 'Name' },
    { key: 'width', align: 'right', format: v => v ? v + '"' : '' },
    { key: 'consumption', align: 'right', format: v => v ? Number(v).toFixed(2) : '' },
    { key: 'rate', align: 'right', format: v => formatCurrency(v) },
    { key: 'amount', align: 'right', format: v => formatCurrency(v) },
  ]);
  const tRows = costRows(trimItems, [
    { key: 'name', label: 'Name' },
    { key: 'consumption', align: 'right', format: v => v ? Number(v).toFixed(2) : '' },
    { key: 'rate', align: 'right', format: v => formatCurrency(v) },
    { key: 'amount', align: 'right', format: v => formatCurrency(v) },
  ]);
  const pRows = costRows(packingItems, [
    { key: 'name', label: 'Name' },
    { key: 'qty', align: 'right' },
    { key: 'rate', align: 'right', format: v => formatCurrency(v) },
    { key: 'amount', align: 'right', format: v => formatCurrency(v) },
  ]);

  const body = `
${companyHeader(company, 'COSTING SHEET', { number: costingSheet.sheet_number, status: costingSheet.status })}
<div class="meta-grid">
  ${costingSheet.style_name ? `<div class="meta-item"><div class="meta-label">Style</div><div class="meta-value">${costingSheet.style_name}</div></div>` : ''}
  ${costingSheet.customer_name ? `<div class="meta-item"><div class="meta-label">Customer</div><div class="meta-value">${costingSheet.customer_name}</div></div>` : ''}
  <div class="meta-item"><div class="meta-label">Total Cost</div><div class="meta-value">${formatCurrency(totalCost)}</div></div>
  <div class="meta-item"><div class="meta-label">Selling Price</div><div class="meta-value">${formatCurrency(sellingPrice)}</div></div>
  <div class="meta-item"><div class="meta-label">Margin</div><div class="meta-value">${margin}%</div></div>
</div>

${fabricItems && fabricItems.length > 0 ? `
<div style="margin-bottom:8px;"><strong style="font-size:10px;">Fabric Cost</strong></div>
<table>
  <thead><tr><th class="text-center" style="width:25px">#</th><th>Fabric</th><th class="text-right">Width</th><th class="text-right">Consumption</th><th class="text-right">Rate</th><th class="text-right">Amount</th></tr></thead>
  <tbody>${fRows}</tbody>
  <tfoot><tr style="font-weight:bold; border-top:1px solid #333;"><td></td><td colspan="4" class="text-right">Fabric Subtotal</td><td class="text-right">${formatCurrency(fabricTotal)}</td></tr></tfoot>
</table>` : ''}

${trimItems && trimItems.length > 0 ? `
<div style="margin-bottom:8px; margin-top:8px;"><strong style="font-size:10px;">Trim Cost</strong></div>
<table>
  <thead><tr><th class="text-center" style="width:25px">#</th><th>Trim</th><th class="text-right">Consumption</th><th class="text-right">Rate</th><th class="text-right">Amount</th></tr></thead>
  <tbody>${tRows}</tbody>
  <tfoot><tr style="font-weight:bold; border-top:1px solid #333;"><td></td><td colspan="3" class="text-right">Trim Subtotal</td><td class="text-right">${formatCurrency(trimTotal)}</td></tr></tfoot>
</table>` : ''}

${packingItems && packingItems.length > 0 ? `
<div style="margin-bottom:8px; margin-top:8px;"><strong style="font-size:10px;">Packing Cost</strong></div>
<table>
  <thead><tr><th class="text-center" style="width:25px">#</th><th>Item</th><th class="text-right">Qty</th><th class="text-right">Rate</th><th class="text-right">Amount</th></tr></thead>
  <tbody>${pRows}</tbody>
  <tfoot><tr style="font-weight:bold; border-top:1px solid #333;"><td></td><td colspan="3" class="text-right">Packing Subtotal</td><td class="text-right">${formatCurrency(packingTotal)}</td></tr></tfoot>
</table>` : ''}

<div class="totals-section" style="margin-top:12px;">
  <table class="totals-table">
    <tr><td class="label">Fabric Cost</td><td class="text-right">${formatCurrency(fabricTotal)}</td></tr>
    <tr><td class="label">Trim Cost</td><td class="text-right">${formatCurrency(trimTotal)}</td></tr>
    <tr><td class="label">Packing Cost</td><td class="text-right">${formatCurrency(packingTotal)}</td></tr>
    <tr class="total-row"><td class="label">Total Cost</td><td class="text-right">${formatCurrency(totalCost)}</td></tr>
    <tr><td class="label">Selling Price</td><td class="text-right">${formatCurrency(sellingPrice)}</td></tr>
    <tr><td class="label">Margin</td><td class="text-right text-bold">${margin}%</td></tr>
  </table>
</div>
${costingSheet.remarks ? `<div class="notes-section"><div class="notes-title">Remarks</div><div class="notes-text">${costingSheet.remarks}</div></div>` : ''}`;

  return baseTemplate(`Costing Sheet ${costingSheet.sheet_number || ''}`, body);
}

// ── Item ──────────────────────────────────────────────────────────────────

function generateItemHTML(data) {
  const { item, company } = data;
  const body = `
${companyHeader(company, 'ITEM DETAILS', {})}
<div class="info-grid">
  <div class="info-block">
    <div class="info-block-title">Item Information</div>
    <div class="info-block-name">${item.name || ''}</div>
    <div class="info-block-detail">Type: ${item.item_type || 'Goods'}</div>
    ${item.sku ? `<div class="info-block-detail">SKU: ${item.sku}</div>` : ''}
    ${item.hsn_code ? `<div class="info-block-detail">HSN/SAC: ${item.hsn_code}</div>` : ''}
    ${item.unit ? `<div class="info-block-detail">Unit: ${item.unit}</div>` : ''}
  </div>
  <div class="info-block">
    <div class="info-block-title">Pricing</div>
    <div class="info-block-detail">Selling Price: ${formatCurrency(item.selling_price)}</div>
    <div class="info-block-detail">Purchase Price: ${formatCurrency(item.purchase_price)}</div>
    <div class="info-block-detail">GST Rate: ${item.gst_rate != null ? item.gst_rate + '%' : 'N/A'}</div>
    ${item.cess_rate ? `<div class="info-block-detail">Cess Rate: ${item.cess_rate}%</div>` : ''}
  </div>
</div>
${item.description ? `<div class="notes-section"><div class="notes-title">Description</div><div class="notes-text">${item.description}</div></div>` : ''}
${item.notes ? `<div class="notes-section" style="margin-top:4px;"><div class="notes-title">Notes</div><div class="notes-text">${item.notes}</div></div>` : ''}`;

  return baseTemplate(`Item - ${item.name}`, body);
}

// ============================================================================
// MAIN PDF GENERATION FUNCTION
// ============================================================================

async function generatePDF(html, options = {}) {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfOptions = {
      landscape: options.landscape || false,
      printBackground: true,
      margin: options.margin || { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
    };

    // Use custom width/height if provided, otherwise default to A4
    if (options.width && options.height) {
      pdfOptions.width = options.width;
      pdfOptions.height = options.height;
    } else {
      pdfOptions.format = 'A4';
    }

    const pdfUint8 = await page.pdf(pdfOptions);

    return Buffer.from(pdfUint8);
  } finally {
    await page.close();
  }
}

async function closeBrowser() {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}

module.exports = {
  generatePDF,
  closeBrowser,
  generateInvoiceHTML,
  generateQuotationHTML,
  generateBillHTML,
  generatePurchaseOrderHTML,
  generateDeliveryChallanHTML,
  generateSalarySlipHTML,
  generateCreditNoteHTML,
  generateDebitNoteHTML,
  generateEWayBillHTML,
  generatePaymentReceivedHTML,
  generatePaymentMadeHTML,
  generateExpenseHTML,
  generatePackingListHTML,
  generateEmployeeHTML,
  generateEmployeeCardHTML,
  generateCustomerHTML,
  generateVendorHTML,
  generateJournalEntryHTML,
  generateGSTFilingHTML,
  generateTDSLiabilityHTML,
  generateTDSChallanHTML,
  generateCostingSheetHTML,
  generateItemHTML,
  formatCurrency,
  formatDate,
};
