/**
 * ZohoMigrationPage.jsx
 * Full Zoho Books data migration/import wizard.
 * Supports CSV file uploads for: Customers, Vendors, Items, Invoices, Bills,
 * Expenses, Bank Accounts, Chart of Accounts, Employees.
 * 4-step flow: Select categories -> Upload files -> Preview & map -> Import.
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  HiOutlineCloudArrowUp,
  HiOutlineCheckCircle,
  HiOutlineArrowRight,
  HiOutlineArrowLeft,
  HiOutlineDocumentText,
  HiOutlineDocumentArrowUp,
  HiOutlineXCircle,
  HiOutlineExclamationTriangle,
  HiOutlineInformationCircle,
  HiOutlineTableCells,
  HiOutlineArrowPath,
  HiOutlineUserGroup,
  HiOutlineBuildingStorefront,
  HiOutlineCube,
  HiOutlineDocumentDuplicate,
  HiOutlineClipboardDocumentList,
  HiOutlineBanknotes,
  HiOutlineBuildingLibrary,
  HiOutlineChartBar,
  HiOutlineUsers,
  HiOutlineTrash,
  HiOutlineChevronDown,
  HiOutlineChevronUp,
  HiOutlineLightBulb,
  HiOutlineArrowTopRightOnSquare,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import apiClient from '../../api/client';

// ── Constants ─────────────────────────────────────────────────────

const STEPS = [
  { key: 'select', label: 'Select Data' },
  { key: 'upload', label: 'Upload Files' },
  { key: 'preview', label: 'Preview & Map' },
  { key: 'import', label: 'Import' },
];

const IMPORT_CATEGORIES = [
  {
    id: 'customers',
    label: 'Customers',
    icon: HiOutlineUserGroup,
    description: 'Customer contacts, addresses, and billing details',
    zohoExportPath: 'Contacts > Customers > Export',
    sampleFields: ['Customer Name', 'Email', 'Phone', 'Billing Address', 'GSTIN', 'Place of Supply'],
    fieldMappings: {
      'Customer Name': 'name',
      'Display Name': 'name',
      'Company Name': 'company_name',
      'Email': 'email',
      'Email Address': 'email',
      'Phone': 'phone',
      'Phone Number': 'phone',
      'Mobile': 'mobile',
      'Mobile Number': 'mobile',
      'Billing Address': 'billing_address',
      'Billing Street': 'billing_address',
      'Billing City': 'billing_city',
      'Billing State': 'billing_state',
      'Billing Zip': 'billing_zip',
      'Billing Code': 'billing_zip',
      'Billing Country': 'billing_country',
      'Shipping Address': 'shipping_address',
      'Shipping Street': 'shipping_address',
      'Shipping City': 'shipping_city',
      'Shipping State': 'shipping_state',
      'Shipping Zip': 'shipping_zip',
      'Shipping Code': 'shipping_zip',
      'Shipping Country': 'shipping_country',
      'GSTIN': 'gstin',
      'GST Number': 'gstin',
      'GST Treatment': 'gst_treatment',
      'PAN': 'pan',
      'PAN Number': 'pan',
      'Place of Supply': 'place_of_supply',
      'Payment Terms': 'payment_terms',
      'Currency Code': 'currency_code',
      'Opening Balance': 'opening_balance',
      'Notes': 'notes',
      'Website': 'website',
    },
  },
  {
    id: 'vendors',
    label: 'Vendors',
    icon: HiOutlineBuildingStorefront,
    description: 'Vendor/supplier contacts and payment details',
    zohoExportPath: 'Contacts > Vendors > Export',
    sampleFields: ['Vendor Name', 'Email', 'Phone', 'Billing Address', 'GSTIN', 'PAN'],
    fieldMappings: {
      'Vendor Name': 'name',
      'Display Name': 'name',
      'Company Name': 'company_name',
      'Email': 'email',
      'Email Address': 'email',
      'Phone': 'phone',
      'Phone Number': 'phone',
      'Mobile': 'mobile',
      'Billing Address': 'billing_address',
      'Billing Street': 'billing_address',
      'Billing City': 'billing_city',
      'Billing State': 'billing_state',
      'Billing Zip': 'billing_zip',
      'Billing Country': 'billing_country',
      'GSTIN': 'gstin',
      'GST Number': 'gstin',
      'GST Treatment': 'gst_treatment',
      'PAN': 'pan',
      'PAN Number': 'pan',
      'TDS Section': 'tds_section',
      'Payment Terms': 'payment_terms',
      'Currency Code': 'currency_code',
      'Opening Balance': 'opening_balance',
      'Notes': 'notes',
      'Website': 'website',
    },
  },
  {
    id: 'items',
    label: 'Items',
    icon: HiOutlineCube,
    description: 'Products, services, and inventory items',
    zohoExportPath: 'Items > Export Items',
    sampleFields: ['Item Name', 'SKU', 'Rate', 'HSN/SAC', 'Tax Rate', 'Unit'],
    fieldMappings: {
      'Item Name': 'name',
      'Name': 'name',
      'SKU': 'sku',
      'Description': 'description',
      'Rate': 'rate',
      'Selling Price': 'rate',
      'Purchase Rate': 'purchase_rate',
      'Purchase Price': 'purchase_rate',
      'Cost Price': 'purchase_rate',
      'HSN/SAC': 'hsn_sac',
      'HSN Code': 'hsn_sac',
      'SAC Code': 'hsn_sac',
      'Tax Rate': 'tax_rate',
      'Tax Percentage': 'tax_rate',
      'Tax Name': 'tax_name',
      'Unit': 'unit',
      'UOM': 'unit',
      'Type': 'type',
      'Item Type': 'type',
      'Product Type': 'type',
      'Opening Stock': 'opening_stock',
      'Stock On Hand': 'opening_stock',
      'Reorder Level': 'reorder_level',
      'Reorder Point': 'reorder_level',
      'Account': 'account',
      'Sales Account': 'sales_account',
      'Purchase Account': 'purchase_account',
    },
  },
  {
    id: 'invoices',
    label: 'Invoices',
    icon: HiOutlineDocumentDuplicate,
    description: 'Sales invoices with line items and payment status',
    zohoExportPath: 'Sales > Invoices > Export',
    sampleFields: ['Invoice Number', 'Customer Name', 'Invoice Date', 'Due Date', 'Total', 'Status'],
    fieldMappings: {
      'Invoice Number': 'invoice_number',
      'Invoice#': 'invoice_number',
      'Invoice Date': 'invoice_date',
      'Due Date': 'due_date',
      'Customer Name': 'customer_name',
      'Customer': 'customer_name',
      'Item Name': 'item_name',
      'Item': 'item_name',
      'Quantity': 'quantity',
      'Qty': 'quantity',
      'Rate': 'rate',
      'Price': 'rate',
      'Amount': 'amount',
      'Tax': 'tax_amount',
      'Tax Amount': 'tax_amount',
      'Discount': 'discount',
      'Sub Total': 'subtotal',
      'SubTotal': 'subtotal',
      'Total': 'total',
      'Grand Total': 'total',
      'Balance Due': 'balance_due',
      'Status': 'status',
      'Place of Supply': 'place_of_supply',
      'Notes': 'notes',
      'Terms': 'terms',
      'Payment Terms': 'payment_terms',
      'Reference Number': 'reference_number',
      'PO Number': 'po_number',
      'Salesperson': 'salesperson',
    },
  },
  {
    id: 'bills',
    label: 'Bills',
    icon: HiOutlineClipboardDocumentList,
    description: 'Purchase bills and vendor invoices',
    zohoExportPath: 'Purchases > Bills > Export',
    sampleFields: ['Bill Number', 'Vendor Name', 'Bill Date', 'Due Date', 'Total', 'Status'],
    fieldMappings: {
      'Bill Number': 'bill_number',
      'Bill#': 'bill_number',
      'Bill Date': 'bill_date',
      'Due Date': 'due_date',
      'Vendor Name': 'vendor_name',
      'Vendor': 'vendor_name',
      'Item Name': 'item_name',
      'Quantity': 'quantity',
      'Rate': 'rate',
      'Amount': 'amount',
      'Tax': 'tax_amount',
      'Tax Amount': 'tax_amount',
      'Discount': 'discount',
      'Sub Total': 'subtotal',
      'Total': 'total',
      'Balance Due': 'balance_due',
      'Status': 'status',
      'Notes': 'notes',
      'Reference Number': 'reference_number',
      'PO Number': 'po_number',
    },
  },
  {
    id: 'expenses',
    label: 'Expenses',
    icon: HiOutlineBanknotes,
    description: 'Business expenses and reimbursements',
    zohoExportPath: 'Purchases > Expenses > Export',
    sampleFields: ['Date', 'Category', 'Amount', 'Vendor', 'Description', 'Reference'],
    fieldMappings: {
      'Date': 'date',
      'Expense Date': 'date',
      'Category': 'category',
      'Expense Account': 'category',
      'Account Name': 'category',
      'Amount': 'amount',
      'Total': 'amount',
      'Vendor Name': 'vendor_name',
      'Vendor': 'vendor_name',
      'Paid Through': 'paid_through',
      'Description': 'description',
      'Notes': 'description',
      'Reference': 'reference',
      'Reference Number': 'reference',
      'Reference#': 'reference',
      'Tax': 'tax_amount',
      'Tax Amount': 'tax_amount',
      'Is Billable': 'is_billable',
      'Customer Name': 'customer_name',
      'Currency': 'currency',
    },
  },
  {
    id: 'bank_accounts',
    label: 'Bank Accounts',
    icon: HiOutlineBuildingLibrary,
    description: 'Bank accounts and opening balances',
    zohoExportPath: 'Banking > Export',
    sampleFields: ['Account Name', 'Bank Name', 'Account Number', 'IFSC Code', 'Balance'],
    fieldMappings: {
      'Account Name': 'account_name',
      'Bank Name': 'bank_name',
      'Account Number': 'account_number',
      'Account Type': 'account_type',
      'IFSC Code': 'ifsc_code',
      'IFSC': 'ifsc_code',
      'Branch': 'branch',
      'Currency': 'currency',
      'Currency Code': 'currency',
      'Opening Balance': 'opening_balance',
      'Balance': 'opening_balance',
      'Description': 'description',
      'Is Primary': 'is_primary',
    },
  },
  {
    id: 'chart_of_accounts',
    label: 'Chart of Accounts',
    icon: HiOutlineChartBar,
    description: 'Account hierarchy and classification',
    zohoExportPath: 'Accountant > Chart of Accounts > Export',
    sampleFields: ['Account Name', 'Account Code', 'Account Type', 'Parent Account', 'Description'],
    fieldMappings: {
      'Account Name': 'account_name',
      'Name': 'account_name',
      'Account Code': 'account_code',
      'Code': 'account_code',
      'Account Type': 'account_type',
      'Type': 'account_type',
      'Parent Account': 'parent_account',
      'Parent': 'parent_account',
      'Description': 'description',
      'Is Active': 'is_active',
      'Status': 'is_active',
      'Currency Code': 'currency_code',
    },
  },
  {
    id: 'employees',
    label: 'Employees',
    icon: HiOutlineUsers,
    description: 'Employee records and department assignments',
    zohoExportPath: 'Payroll > Employees > Export',
    sampleFields: ['Employee Name', 'Email', 'Department', 'Designation', 'Date of Joining'],
    fieldMappings: {
      'Employee Name': 'name',
      'Name': 'name',
      'First Name': 'first_name',
      'Last Name': 'last_name',
      'Email': 'email',
      'Email Address': 'email',
      'Phone': 'phone',
      'Mobile': 'mobile',
      'Department': 'department',
      'Designation': 'designation',
      'Date of Joining': 'date_of_joining',
      'Joining Date': 'date_of_joining',
      'Date of Birth': 'date_of_birth',
      'PAN': 'pan',
      'PAN Number': 'pan',
      'Aadhar': 'aadhar',
      'Aadhar Number': 'aadhar',
      'Bank Account Number': 'bank_account_number',
      'IFSC Code': 'ifsc_code',
      'Salary': 'salary',
      'Basic Salary': 'basic_salary',
      'CTC': 'ctc',
      'Gender': 'gender',
      'Address': 'address',
      'Status': 'status',
    },
  },
];

const PREVIEW_ROWS = 5;

// ── Helpers ───────────────────────────────────────────────────────

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '');
  if (lines.length === 0) return { headers: [], rows: [] };

  const parseLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const values = parseLine(line);
    const row = {};
    headers.forEach((h, i) => {
      row[h] = values[i] || '';
    });
    return row;
  });

  return { headers, rows };
}

function autoMapFields(csvHeaders, categoryMappings) {
  const mapping = {};
  csvHeaders.forEach((header) => {
    const normalizedHeader = header.trim();
    // Direct match
    if (categoryMappings[normalizedHeader]) {
      mapping[normalizedHeader] = categoryMappings[normalizedHeader];
      return;
    }
    // Case-insensitive match
    const lowerHeader = normalizedHeader.toLowerCase();
    const matchKey = Object.keys(categoryMappings).find(
      (k) => k.toLowerCase() === lowerHeader
    );
    if (matchKey) {
      mapping[normalizedHeader] = categoryMappings[matchKey];
      return;
    }
    // Partial match
    const partialKey = Object.keys(categoryMappings).find(
      (k) =>
        lowerHeader.includes(k.toLowerCase()) || k.toLowerCase().includes(lowerHeader)
    );
    if (partialKey) {
      mapping[normalizedHeader] = categoryMappings[partialKey];
      return;
    }
    // No match — skip
    mapping[normalizedHeader] = '__skip__';
  });
  return mapping;
}

function getTargetFieldOptions(category) {
  const cat = IMPORT_CATEGORIES.find((c) => c.id === category);
  if (!cat) return [];
  const unique = [...new Set(Object.values(cat.fieldMappings))];
  return unique.sort();
}

// ── Spinner Component ─────────────────────────────────────────────

function Spinner({ className = 'w-4 h-4' }) {
  return (
    <svg className={`${className} animate-spin`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

// ── Step Indicator ────────────────────────────────────────────────

function StepIndicator({ currentStep }) {
  return (
    <div className="flex items-center gap-1 mb-8">
      {STEPS.map((s, i) => (
        <React.Fragment key={s.key}>
          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                i < currentStep
                  ? 'bg-green-500 text-white'
                  : i === currentStep
                  ? 'bg-[#0071DC] text-white'
                  : 'bg-[#E5E7EB] text-[#6B7280]'
              }`}
            >
              {i < currentStep ? (
                <HiOutlineCheckCircle className="w-4 h-4" />
              ) : (
                i + 1
              )}
            </div>
            <span
              className={`text-sm font-medium hidden sm:inline ${
                i === currentStep
                  ? 'text-[#0071DC]'
                  : i < currentStep
                  ? 'text-green-600'
                  : 'text-[#6B7280]'
              }`}
            >
              {s.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div
              className={`flex-1 h-0.5 mx-2 rounded ${
                i < currentStep ? 'bg-green-500' : 'bg-[#E5E7EB]'
              }`}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ── File Upload Zone ──────────────────────────────────────────────

function FileUploadZone({ categoryId, label, file, onFileSelect, onRemove }) {
  const fileInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const isValidFile = (f) => {
    const name = f.name.toLowerCase();
    return name.endsWith('.csv') || name.endsWith('.pdf');
  };

  const getFileType = (f) => {
    if (!f) return '';
    return f.name.toLowerCase().endsWith('.pdf') ? 'PDF' : 'CSV';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && isValidFile(droppedFile)) {
      onFileSelect(categoryId, droppedFile);
    } else {
      toast.error('Please upload a CSV or PDF file');
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (isValidFile(selectedFile)) {
        onFileSelect(categoryId, selectedFile);
      } else {
        toast.error('Please upload a CSV or PDF file');
      }
    }
  };

  const fileType = getFileType(file);
  const isPDF = fileType === 'PDF';

  return (
    <div>
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragOver
            ? 'border-[#0071DC] bg-blue-50'
            : file
            ? isPDF
              ? 'border-red-300 bg-red-50/50'
              : 'border-green-300 bg-green-50'
            : 'border-[#E5E7EB] hover:border-[#0071DC]/40'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {file ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isPDF ? (
                <svg className="w-8 h-8 text-red-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="9" y1="15" x2="15" y2="15" />
                </svg>
              ) : (
                <HiOutlineDocumentArrowUp className="w-8 h-8 text-green-500 shrink-0" />
              )}
              <div className="text-left">
                <p className="text-sm font-medium text-[#333]">{file.name}</p>
                <p className="text-xs text-[#6B7280]">
                  {file.size > 1024 * 1024
                    ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
                    : `${(file.size / 1024).toFixed(1)} KB`}{' '}
                  — {fileType} file
                </p>
                {isPDF && (
                  <p className="text-xs text-amber-600 mt-0.5">
                    PDF data will be extracted automatically. For best results, use CSV format.
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={() => onRemove(categoryId)}
              className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700 font-medium shrink-0 cursor-pointer"
            >
              <HiOutlineTrash className="w-3.5 h-3.5" />
              Remove
            </button>
          </div>
        ) : (
          <div>
            <HiOutlineCloudArrowUp className="w-10 h-10 text-[#9CA3AF] mx-auto mb-2" />
            <p className="text-sm text-[#6B7280]">
              Drag and drop your <span className="font-medium text-[#333]">{label}</span> file here, or{' '}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-[#0071DC] hover:text-[#005BB5] font-medium cursor-pointer"
              >
                browse
              </button>
            </p>
            <p className="text-xs text-[#9CA3AF] mt-1">CSV or PDF files, up to 50 MB</p>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.pdf"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
    </div>
  );
}

// ── Field Mapping Row ─────────────────────────────────────────────

function FieldMappingSelect({ csvHeader, currentMapping, targetOptions, onChange }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="w-1/3">
        <span className="text-sm font-mono text-[#333] bg-gray-50 px-2 py-1 rounded border border-[#E5E7EB]">
          {csvHeader}
        </span>
      </div>
      <HiOutlineArrowRight className="w-4 h-4 text-[#9CA3AF] shrink-0" />
      <div className="flex-1">
        <select
          value={currentMapping}
          onChange={(e) => onChange(csvHeader, e.target.value)}
          className={`w-full px-3 py-1.5 border border-[#E5E7EB] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC] transition-colors ${
            currentMapping === '__skip__' ? 'text-[#9CA3AF]' : 'text-[#333]'
          }`}
        >
          <option value="__skip__">-- Skip this field --</option>
          {targetOptions.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────

export default function ZohoMigrationPage() {
  // Wizard state
  const [step, setStep] = useState(0);

  // Step 1: Category selection
  const [selectedCategories, setSelectedCategories] = useState([]);

  // Step 2: File uploads (categoryId -> File)
  const [files, setFiles] = useState({});

  // Step 3: Parsed CSV data and field mappings
  const [parsedData, setParsedData] = useState({}); // categoryId -> { headers, rows }
  const [fieldMappings, setFieldMappings] = useState({}); // categoryId -> { csvHeader: targetField }
  const [activePreviewCategory, setActivePreviewCategory] = useState(null);

  // Step 4: Import state
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({}); // categoryId -> { status, imported, skipped, errors, total }
  const [overallComplete, setOverallComplete] = useState(false);

  // UI
  const [showTips, setShowTips] = useState(true);

  // ── Step 1 Handlers ─────────────────────────────────────────────

  const toggleCategory = (categoryId) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const selectAllCategories = () => {
    if (selectedCategories.length === IMPORT_CATEGORIES.length) {
      setSelectedCategories([]);
    } else {
      setSelectedCategories(IMPORT_CATEGORIES.map((c) => c.id));
    }
  };

  // ── Step 2 Handlers ─────────────────────────────────────────────

  const handleFileSelect = async (categoryId, file) => {
    setFiles((prev) => ({ ...prev, [categoryId]: file }));

    // If PDF, auto-detect the document type and suggest correct category
    if (file.name.toLowerCase().endsWith('.pdf')) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await apiClient.post('/zoho-migration/detect-pdf', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 30000,
        });
        const { detectedType, documentNumber } = res.data || {};
        if (detectedType && detectedType !== 'unknown' && detectedType !== categoryId) {
          toast.success(
            `PDF auto-detected as "${detectedType}"${documentNumber ? ` (${documentNumber})` : ''}. ` +
            `Moved to the correct category.`,
            { duration: 4000 }
          );
          // Move the file to the detected category
          setFiles((prev) => {
            const next = { ...prev };
            delete next[categoryId];
            next[detectedType] = file;
            return next;
          });
          // Auto-select the detected category if not already selected
          setSelectedCategories((prev) =>
            prev.includes(detectedType) ? prev : [...prev, detectedType]
          );
        } else if (detectedType && detectedType !== 'unknown') {
          toast.success(
            `PDF detected as "${detectedType}"${documentNumber ? ` (${documentNumber})` : ''}.`,
            { duration: 3000 }
          );
        }
      } catch {
        // Detection failed silently, user will map manually
      }
    }
  };

  const handleFileRemove = (categoryId) => {
    setFiles((prev) => {
      const next = { ...prev };
      delete next[categoryId];
      return next;
    });
    setParsedData((prev) => {
      const next = { ...prev };
      delete next[categoryId];
      return next;
    });
    setFieldMappings((prev) => {
      const next = { ...prev };
      delete next[categoryId];
      return next;
    });
  };

  // ── Step 3: Parse & Preview ─────────────────────────────────────

  const parseAllFiles = useCallback(async () => {
    const newParsed = {};
    const newMappings = {};

    for (const categoryId of selectedCategories) {
      const file = files[categoryId];
      if (!file) continue;

      const isPDF = file.name.toLowerCase().endsWith('.pdf');

      try {
        let headers, rows;

        if (isPDF) {
          // Send PDF to backend for extraction
          const formData = new FormData();
          formData.append('file', file);
          formData.append('category', categoryId);

          const res = await apiClient.post('/zoho-migration/parse-pdf', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 60000,
          });

          const preview = res.data?.preview;
          if (!preview || !preview.headers || preview.headers.length === 0) {
            toast.error(`Could not extract data from PDF for ${categoryId}. Try using a CSV file.`);
            continue;
          }

          headers = preview.headers;
          // Convert sampleRows to full row format — the backend returns rows as arrays
          // We need objects keyed by header
          if (preview.totalRows > 0) {
            // Re-read the converted CSV filename from the preview
            // For the preview, convert array rows to object rows
            rows = preview.sampleRows.map((row) => {
              const obj = {};
              headers.forEach((h, i) => {
                obj[h] = Array.isArray(row) ? (row[i] || '') : (row[h] || '');
              });
              return obj;
            });
            // Store the server filename for import
            if (preview.filename) {
              // We'll use the server-generated CSV file for actual import
              file._serverFilename = preview.filename;
            }
            if (preview.extractionNote) {
              toast.success(preview.extractionNote);
            }
            // Set totalRows from the server response
            newParsed[categoryId] = { headers, rows, totalRows: preview.totalRows, isPDF: true, serverFilename: preview.filename };
          } else {
            toast.error(`No tabular data extracted from PDF for ${categoryId}.`);
            continue;
          }
        } else {
          // Regular CSV — parse client-side
          const text = await file.text();
          const parsed = parseCSV(text);
          headers = parsed.headers;
          rows = parsed.rows;

          if (headers.length === 0 || rows.length === 0) {
            toast.error(`No data found in ${categoryId} file`);
            continue;
          }

          newParsed[categoryId] = { headers, rows };
        }

        // Auto-map fields
        const category = IMPORT_CATEGORIES.find((c) => c.id === categoryId);
        if (category) {
          newMappings[categoryId] = autoMapFields(headers, category.fieldMappings);
        }
      } catch (err) {
        const msg = err.response?.data?.error || err.message;
        toast.error(`Failed to parse ${categoryId} file: ${msg}`);
      }
    }

    setParsedData(newParsed);
    setFieldMappings(newMappings);

    // Set first category with data as active preview
    const firstWithData = selectedCategories.find((id) => newParsed[id]);
    if (firstWithData) {
      setActivePreviewCategory(firstWithData);
    }
  }, [selectedCategories, files]);

  const handleMappingChange = (categoryId, csvHeader, targetField) => {
    setFieldMappings((prev) => ({
      ...prev,
      [categoryId]: {
        ...prev[categoryId],
        [csvHeader]: targetField,
      },
    }));
  };

  // ── Step 4: Import ──────────────────────────────────────────────

  const handleImport = async () => {
    setImporting(true);
    setOverallComplete(false);

    const categoriesToImport = selectedCategories.filter((id) => parsedData[id]);

    // Initialize progress
    const initialProgress = {};
    categoriesToImport.forEach((id) => {
      initialProgress[id] = {
        status: 'pending',
        imported: 0,
        skipped: 0,
        errors: 0,
        errorMessages: [],
        total: parsedData[id]?.rows.length || 0,
      };
    });
    setImportProgress(initialProgress);

    for (const categoryId of categoriesToImport) {
      // Mark as in progress
      setImportProgress((prev) => ({
        ...prev,
        [categoryId]: { ...prev[categoryId], status: 'importing' },
      }));

      try {
        const file = files[categoryId];
        const mapping = fieldMappings[categoryId] || {};

        // Upload the file
        const formData = new FormData();
        formData.append('file', file);
        formData.append('category', categoryId);
        formData.append('field_mapping', JSON.stringify(mapping));

        const uploadRes = await apiClient.post('/zoho-migration/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 120000,
        });

        const uploadData = uploadRes.data?.data || uploadRes.data || {};
        const fileId = uploadData.file_id || uploadData.id;

        // Trigger import
        const importRes = await apiClient.post('/zoho-migration/import', {
          category: categoryId,
          file_id: fileId,
          field_mapping: mapping,
        }, {
          timeout: 300000,
        });

        const result = importRes.data?.data || importRes.data || {};

        setImportProgress((prev) => ({
          ...prev,
          [categoryId]: {
            status: 'complete',
            imported: result.imported_count || result.imported || 0,
            skipped: result.skipped_count || result.skipped || 0,
            errors: result.error_count || result.errors?.length || 0,
            errorMessages: result.errors || result.error_messages || [],
            total: result.total_count || result.total || parsedData[categoryId]?.rows.length || 0,
          },
        }));
      } catch (err) {
        const msg =
          err.response?.data?.error ||
          err.response?.data?.message ||
          `Failed to import ${categoryId}`;

        setImportProgress((prev) => ({
          ...prev,
          [categoryId]: {
            ...prev[categoryId],
            status: 'error',
            errorMessages: [msg],
          },
        }));

        toast.error(msg);
      }
    }

    setImporting(false);
    setOverallComplete(true);
    toast.success('Migration process completed');
  };

  // ── Navigation ──────────────────────────────────────────────────

  const canGoNext = () => {
    switch (step) {
      case 0:
        return selectedCategories.length > 0;
      case 1: {
        // At least one file uploaded for a selected category
        return selectedCategories.some((id) => files[id]);
      }
      case 2: {
        // At least one category has parsed data
        return selectedCategories.some((id) => parsedData[id]);
      }
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (step === 1) {
      // Moving to preview - parse files first
      parseAllFiles();
      setStep(2);
      return;
    }
    if (step === 2) {
      handleImport();
      setStep(3);
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const handleBack = () => {
    if (step === 3 && overallComplete) {
      // Reset everything
      setStep(0);
      setSelectedCategories([]);
      setFiles({});
      setParsedData({});
      setFieldMappings({});
      setImportProgress({});
      setOverallComplete(false);
      return;
    }
    setStep((s) => Math.max(0, s - 1));
  };

  // ── Computed values ─────────────────────────────────────────────

  const uploadedCount = selectedCategories.filter((id) => files[id]).length;
  const missingFiles = selectedCategories.filter((id) => !files[id]);

  // ── Render ──────────────────────────────────────────────────────

  return (
    <div className="pb-8">
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-lg bg-[#0071DC]/10 flex items-center justify-center">
            <HiOutlineCloudArrowUp className="w-5 h-5 text-[#0071DC]" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-[#333]">Import from Zoho Books</h1>
            <p className="text-sm text-[#6B7280]">
              Migrate your data from Zoho Books using CSV or PDF file exports
            </p>
          </div>
        </div>
      </div>

      {/* Tips Section */}
      <div className="mb-6">
        <button
          onClick={() => setShowTips(!showTips)}
          className="inline-flex items-center gap-2 text-sm font-medium text-[#0071DC] hover:text-[#005BB5] transition-colors cursor-pointer"
        >
          <HiOutlineLightBulb className="w-4 h-4" />
          How to export data from Zoho Books
          {showTips ? (
            <HiOutlineChevronUp className="w-3.5 h-3.5" />
          ) : (
            <HiOutlineChevronDown className="w-3.5 h-3.5" />
          )}
        </button>
        {showTips && (
          <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <HiOutlineInformationCircle className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-2">Steps to export your Zoho Books data:</p>
                <ol className="space-y-1.5 list-decimal list-inside text-blue-700">
                  <li>
                    Log in to your{' '}
                    <a
                      href="https://books.zoho.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#0071DC] hover:underline inline-flex items-center gap-0.5"
                    >
                      Zoho Books account
                      <HiOutlineArrowTopRightOnSquare className="w-3 h-3" />
                    </a>
                  </li>
                  <li>
                    For a complete backup: Go to <strong>Settings</strong> (gear icon) &rarr;{' '}
                    <strong>Data Backup</strong> &rarr; Click <strong>Download</strong>
                  </li>
                  <li>The backup ZIP file contains CSV files for all your data modules</li>
                  <li>Extract the ZIP and upload individual CSV files below</li>
                  <li>
                    For individual modules: Navigate to each section (e.g., Sales &rarr; Invoices)
                    and use the <strong>Export</strong> option (usually the three-dot menu or hamburger icon)
                  </li>
                </ol>
                <div className="mt-3 p-3 bg-white/60 rounded-lg border border-blue-100">
                  <p className="text-xs text-blue-600 font-medium">
                    Tip: The Data Backup option gives you all CSV files at once, which is the easiest
                    approach for a complete migration.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Step Indicator */}
      <div className="bg-white rounded-lg border border-[#E5E7EB] p-6">
        <StepIndicator currentStep={step} />

        {/* ── Step 0: Select What to Import ──────────────────────── */}
        {step === 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-[#333]">Select Data to Import</h3>
                <p className="text-sm text-[#6B7280] mt-1">
                  Choose which data categories you want to import from Zoho Books
                </p>
              </div>
              <button
                onClick={selectAllCategories}
                className="text-sm font-medium text-[#0071DC] hover:text-[#005BB5] transition-colors cursor-pointer"
              >
                {selectedCategories.length === IMPORT_CATEGORIES.length
                  ? 'Deselect All'
                  : 'Select All'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {IMPORT_CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isSelected = selectedCategories.includes(cat.id);
                return (
                  <label
                    key={cat.id}
                    className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      isSelected
                        ? 'border-[#0071DC] bg-[#0071DC]/5 ring-1 ring-[#0071DC]/20'
                        : 'border-[#E5E7EB] hover:border-[#0071DC]/30 hover:bg-[#F9FAFB]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleCategory(cat.id)}
                      className="mt-0.5 w-4 h-4 text-[#0071DC] border-[#D1D5DB] rounded focus:ring-[#0071DC]/20"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Icon className={`w-4 h-4 ${isSelected ? 'text-[#0071DC]' : 'text-[#6B7280]'}`} />
                        <p className="text-sm font-semibold text-[#333]">{cat.label}</p>
                      </div>
                      <p className="text-xs text-[#6B7280] mt-1">{cat.description}</p>
                    </div>
                  </label>
                );
              })}
            </div>

            {selectedCategories.length > 0 && (
              <div className="mt-4 p-3 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]">
                <p className="text-sm text-[#6B7280]">
                  <span className="font-medium text-[#333]">{selectedCategories.length}</span>{' '}
                  {selectedCategories.length === 1 ? 'category' : 'categories'} selected for import
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Step 1: Upload Files ───────────────────────────────── */}
        {step === 1 && (
          <div>
            <div className="mb-4">
              <h3 className="text-base font-semibold text-[#333]">Upload Files</h3>
              <p className="text-sm text-[#6B7280] mt-1">
                Upload a CSV or PDF file for each selected category. CSV is recommended for best results.{' '}
                <span className="font-medium text-[#333]">
                  {uploadedCount} of {selectedCategories.length}
                </span>{' '}
                files uploaded.
              </p>
            </div>

            {/* Upload progress summary */}
            {uploadedCount > 0 && (
              <div className="mb-4">
                <div className="w-full bg-[#E5E7EB] rounded-full h-2">
                  <div
                    className="bg-[#0071DC] h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${(uploadedCount / selectedCategories.length) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}

            <div className="space-y-5">
              {selectedCategories.map((categoryId) => {
                const cat = IMPORT_CATEGORIES.find((c) => c.id === categoryId);
                if (!cat) return null;
                const Icon = cat.icon;

                return (
                  <div key={categoryId}>
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="w-4 h-4 text-[#6B7280]" />
                      <h4 className="text-sm font-semibold text-[#333]">{cat.label}</h4>
                      {files[categoryId] && (
                        <HiOutlineCheckCircle className="w-4 h-4 text-green-500" />
                      )}
                    </div>
                    <p className="text-xs text-[#9CA3AF] mb-2">
                      Zoho export path: <span className="font-mono">{cat.zohoExportPath}</span>
                    </p>
                    <FileUploadZone
                      categoryId={categoryId}
                      label={cat.label}
                      file={files[categoryId]}
                      onFileSelect={handleFileSelect}
                      onRemove={handleFileRemove}
                    />
                  </div>
                );
              })}
            </div>

            {/* Warning for missing files */}
            {missingFiles.length > 0 && uploadedCount > 0 && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <HiOutlineExclamationTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <div className="text-xs text-amber-700">
                    <p className="font-medium">
                      {missingFiles.length} {missingFiles.length === 1 ? 'category' : 'categories'} without files:
                    </p>
                    <p className="mt-0.5">
                      {missingFiles
                        .map((id) => IMPORT_CATEGORIES.find((c) => c.id === id)?.label)
                        .join(', ')}
                    </p>
                    <p className="mt-1 text-amber-600">
                      Categories without uploaded files will be skipped during import.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Step 2: Preview & Map Fields ───────────────────────── */}
        {step === 2 && (
          <div>
            <div className="mb-4">
              <h3 className="text-base font-semibold text-[#333]">Preview & Field Mapping</h3>
              <p className="text-sm text-[#6B7280] mt-1">
                Review parsed data and adjust field mappings if needed. Fields are auto-mapped from
                common Zoho Books column names.
              </p>
            </div>

            {/* Category tabs */}
            {Object.keys(parsedData).length > 1 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {selectedCategories
                  .filter((id) => parsedData[id])
                  .map((categoryId) => {
                    const cat = IMPORT_CATEGORIES.find((c) => c.id === categoryId);
                    if (!cat) return null;
                    const Icon = cat.icon;
                    const isActive = activePreviewCategory === categoryId;

                    return (
                      <button
                        key={categoryId}
                        onClick={() => setActivePreviewCategory(categoryId)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors cursor-pointer ${
                          isActive
                            ? 'bg-[#0071DC]/5 text-[#0071DC] border-[#0071DC]'
                            : 'border-[#E5E7EB] text-[#6B7280] hover:bg-gray-50 hover:text-[#333]'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {cat.label}
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded-full ${
                            isActive ? 'bg-[#0071DC]/10 text-[#0071DC]' : 'bg-gray-100 text-[#6B7280]'
                          }`}
                        >
                          {parsedData[categoryId]?.rows.length || 0}
                        </span>
                      </button>
                    );
                  })}
              </div>
            )}

            {activePreviewCategory && parsedData[activePreviewCategory] && (
              <div>
                {/* Data preview table */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <HiOutlineTableCells className="w-4 h-4 text-[#6B7280]" />
                    <h4 className="text-sm font-semibold text-[#333]">
                      Data Preview
                      <span className="font-normal text-[#6B7280] ml-2">
                        (showing first {Math.min(PREVIEW_ROWS, parsedData[activePreviewCategory].rows.length)} of{' '}
                        {parsedData[activePreviewCategory].rows.length} rows)
                      </span>
                    </h4>
                  </div>
                  <div className="overflow-x-auto border border-[#E5E7EB] rounded-lg">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                          <th className="px-3 py-2.5 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                            #
                          </th>
                          {parsedData[activePreviewCategory].headers.map((h) => (
                            <th
                              key={h}
                              className="px-3 py-2.5 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider whitespace-nowrap"
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E5E7EB]">
                        {parsedData[activePreviewCategory].rows
                          .slice(0, PREVIEW_ROWS)
                          .map((row, idx) => (
                            <tr key={idx} className="hover:bg-[#F9FAFB] transition-colors">
                              <td className="px-3 py-2 text-xs text-[#9CA3AF]">{idx + 1}</td>
                              {parsedData[activePreviewCategory].headers.map((h) => (
                                <td
                                  key={h}
                                  className="px-3 py-2 text-[#333] text-sm whitespace-nowrap max-w-[200px] truncate"
                                  title={row[h] || ''}
                                >
                                  {row[h] || <span className="text-[#9CA3AF]">--</span>}
                                </td>
                              ))}
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Field Mapping */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <HiOutlineArrowPath className="w-4 h-4 text-[#6B7280]" />
                    <h4 className="text-sm font-semibold text-[#333]">Field Mapping</h4>
                  </div>
                  <p className="text-xs text-[#6B7280] mb-3">
                    Map CSV columns to the corresponding fields in Navodita ERP. Fields marked
                    &ldquo;Skip&rdquo; will not be imported.
                  </p>

                  <div className="bg-[#F9FAFB] rounded-lg border border-[#E5E7EB] p-4">
                    <div className="flex items-center gap-3 pb-2 mb-2 border-b border-[#E5E7EB]">
                      <div className="w-1/3 text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                        CSV Column
                      </div>
                      <div className="w-4" />
                      <div className="flex-1 text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                        Maps To
                      </div>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {parsedData[activePreviewCategory].headers.map((header) => (
                        <FieldMappingSelect
                          key={header}
                          csvHeader={header}
                          currentMapping={
                            fieldMappings[activePreviewCategory]?.[header] || '__skip__'
                          }
                          targetOptions={getTargetFieldOptions(activePreviewCategory)}
                          onChange={(csvH, target) =>
                            handleMappingChange(activePreviewCategory, csvH, target)
                          }
                        />
                      ))}
                    </div>
                  </div>

                  {/* Mapping summary */}
                  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <HiOutlineCheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                      <p className="text-xs text-green-700">
                        <span className="font-medium">
                          {
                            Object.values(fieldMappings[activePreviewCategory] || {}).filter(
                              (v) => v !== '__skip__'
                            ).length
                          }
                        </span>{' '}
                        of {parsedData[activePreviewCategory].headers.length} fields mapped
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {Object.keys(parsedData).length === 0 && (
              <div className="text-center py-10 text-[#6B7280]">
                <HiOutlineDocumentText className="w-12 h-12 text-[#D1D5DB] mx-auto mb-3" />
                <p className="text-sm">No files were successfully parsed.</p>
                <p className="text-xs mt-1">Please go back and check your CSV files.</p>
              </div>
            )}
          </div>
        )}

        {/* ── Step 3: Import Progress & Results ──────────────────── */}
        {step === 3 && (
          <div>
            <div className="mb-6 text-center">
              {overallComplete ? (
                <>
                  <HiOutlineCheckCircle className="w-14 h-14 text-green-500 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-[#333]">Migration Complete</h3>
                  <p className="text-sm text-[#6B7280] mt-1">
                    Your Zoho Books data has been processed. Review the results below.
                  </p>
                </>
              ) : (
                <>
                  <div className="w-14 h-14 rounded-full bg-[#0071DC]/10 flex items-center justify-center mx-auto mb-3">
                    <Spinner className="w-6 h-6 text-[#0071DC]" />
                  </div>
                  <h3 className="text-lg font-semibold text-[#333]">Importing Data...</h3>
                  <p className="text-sm text-[#6B7280] mt-1">
                    Please wait while your data is being imported. This may take a few minutes.
                  </p>
                </>
              )}
            </div>

            {/* Overall summary cards */}
            {overallComplete && (
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="p-4 bg-green-50 rounded-lg border border-green-200 text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {Object.values(importProgress).reduce((sum, p) => sum + (p.imported || 0), 0)}
                  </p>
                  <p className="text-xs text-green-700 font-medium mt-1">Records Imported</p>
                </div>
                <div className="p-4 bg-amber-50 rounded-lg border border-amber-200 text-center">
                  <p className="text-2xl font-bold text-amber-600">
                    {Object.values(importProgress).reduce((sum, p) => sum + (p.skipped || 0), 0)}
                  </p>
                  <p className="text-xs text-amber-700 font-medium mt-1">Skipped</p>
                </div>
                <div className="p-4 bg-red-50 rounded-lg border border-red-200 text-center">
                  <p className="text-2xl font-bold text-red-600">
                    {Object.values(importProgress).reduce((sum, p) => sum + (p.errors || 0), 0)}
                  </p>
                  <p className="text-xs text-red-700 font-medium mt-1">Errors</p>
                </div>
              </div>
            )}

            {/* Per-category progress */}
            <div className="space-y-3">
              {selectedCategories
                .filter((id) => importProgress[id])
                .map((categoryId) => {
                  const cat = IMPORT_CATEGORIES.find((c) => c.id === categoryId);
                  if (!cat) return null;
                  const Icon = cat.icon;
                  const progress = importProgress[categoryId];

                  const statusColor =
                    progress.status === 'complete'
                      ? 'border-green-200 bg-green-50/50'
                      : progress.status === 'error'
                      ? 'border-red-200 bg-red-50/50'
                      : progress.status === 'importing'
                      ? 'border-[#0071DC]/30 bg-blue-50/50'
                      : 'border-[#E5E7EB]';

                  return (
                    <div
                      key={categoryId}
                      className={`rounded-lg border ${statusColor} p-4 transition-colors`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Icon className="w-5 h-5 text-[#6B7280]" />
                          <div>
                            <p className="text-sm font-semibold text-[#333]">{cat.label}</p>
                            <p className="text-xs text-[#6B7280]">
                              {progress.total} total records
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {progress.status === 'pending' && (
                            <span className="text-xs font-medium text-[#6B7280] bg-gray-100 px-2.5 py-1 rounded-full">
                              Pending
                            </span>
                          )}
                          {progress.status === 'importing' && (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#0071DC] bg-blue-100 px-2.5 py-1 rounded-full">
                              <Spinner className="w-3 h-3" />
                              Importing...
                            </span>
                          )}
                          {progress.status === 'complete' && (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-2.5 py-1 rounded-full">
                              <HiOutlineCheckCircle className="w-3.5 h-3.5" />
                              Complete
                            </span>
                          )}
                          {progress.status === 'error' && (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-100 px-2.5 py-1 rounded-full">
                              <HiOutlineXCircle className="w-3.5 h-3.5" />
                              Error
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Progress bar */}
                      {progress.status === 'importing' && (
                        <div className="mt-3">
                          <div className="w-full bg-[#E5E7EB] rounded-full h-1.5">
                            <div className="bg-[#0071DC] h-1.5 rounded-full animate-pulse w-2/3" />
                          </div>
                        </div>
                      )}

                      {/* Result details */}
                      {(progress.status === 'complete' || progress.status === 'error') && (
                        <div className="mt-3 flex items-center gap-4 text-xs">
                          {progress.imported > 0 && (
                            <span className="text-green-600 font-medium">
                              {progress.imported} imported
                            </span>
                          )}
                          {progress.skipped > 0 && (
                            <span className="text-amber-600 font-medium">
                              {progress.skipped} skipped
                            </span>
                          )}
                          {progress.errors > 0 && (
                            <span className="text-red-600 font-medium">
                              {progress.errors} errors
                            </span>
                          )}
                        </div>
                      )}

                      {/* Error messages */}
                      {progress.errorMessages && progress.errorMessages.length > 0 && (
                        <div className="mt-2 p-2 bg-red-50 rounded border border-red-100">
                          <ul className="text-xs text-red-700 space-y-0.5">
                            {progress.errorMessages.slice(0, 3).map((msg, i) => (
                              <li key={i}>{typeof msg === 'string' ? msg : JSON.stringify(msg)}</li>
                            ))}
                            {progress.errorMessages.length > 3 && (
                              <li className="text-red-500">
                                ...and {progress.errorMessages.length - 3} more
                              </li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* ── Navigation Buttons ─────────────────────────────────── */}
        <div className="flex items-center justify-between mt-8 pt-5 border-t border-[#E5E7EB]">
          <button
            onClick={handleBack}
            disabled={importing}
            className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
              step === 0
                ? 'invisible'
                : 'text-[#333] bg-white border border-[#E5E7EB] hover:bg-[#F9FAFB] disabled:opacity-40'
            }`}
          >
            <HiOutlineArrowLeft className="w-4 h-4" />
            {step === 3 && overallComplete ? 'Start New Import' : 'Back'}
          </button>

          {step < 3 && (
            <button
              onClick={handleNext}
              disabled={!canGoNext()}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0071DC] text-white text-sm font-medium rounded-lg hover:bg-[#005BB5] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              {step === 2 ? (
                <>
                  <HiOutlineCloudArrowUp className="w-4 h-4" />
                  Start Import
                </>
              ) : (
                <>
                  Next
                  <HiOutlineArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
