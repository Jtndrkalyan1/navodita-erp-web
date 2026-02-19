/**
 * StatementImport.jsx
 * Full bank statement import flow with preview, bank format selection, drag-and-drop.
 * Ported from NavoditaERP Swift BankingViews pattern.
 * Supports: CSV and Excel files from ICICI, HDFC, SBI, Kotak, Axis, and Auto-detect.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  HiOutlineCloudArrowUp,
  HiOutlineDocumentArrowUp,
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiOutlineExclamationTriangle,
  HiOutlineArrowPath,
  HiOutlineArrowUpRight,
  HiOutlineArrowDownLeft,
  HiOutlineTableCells,
  HiOutlineChevronRight,
  HiOutlineChevronLeft,
  HiOutlineInformationCircle,
  HiOutlineBuildingLibrary,
  HiOutlineCurrencyRupee,
  HiOutlineTrash,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import apiClient from '../../api/client';

/* ─── Helpers ──────────────────────────────────────────────────────────── */

function formatIndianCurrency(value) {
  if (value == null || isNaN(value)) return '\u20B90.00';
  const num = Number(value);
  const isNegative = num < 0;
  const abs = Math.abs(num);
  const [intPart, decPart] = abs.toFixed(2).split('.');
  let result = '';
  const len = intPart.length;
  if (len <= 3) {
    result = intPart;
  } else {
    result = intPart.slice(-3);
    let remaining = intPart.slice(0, -3);
    while (remaining.length > 2) {
      result = remaining.slice(-2) + ',' + result;
      remaining = remaining.slice(0, -2);
    }
    if (remaining.length > 0) {
      result = remaining + ',' + result;
    }
  }
  return `${isNegative ? '-' : ''}\u20B9${result}.${decPart}`;
}

function formatDate(dateStr) {
  if (!dateStr) return '--';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function maskAccountNumber(num) {
  if (!num) return '--';
  const str = String(num);
  if (str.length <= 4) return str;
  return 'XXXX' + str.slice(-4);
}

/* ─── Steps ────────────────────────────────────────────────────────────── */

const STEPS = [
  { key: 'account', label: 'Select Account' },
  { key: 'upload', label: 'Upload File' },
  { key: 'preview', label: 'Preview & Confirm' },
  { key: 'result', label: 'Results' },
];

/* ─── Bank Format Options ──────────────────────────────────────────────── */

const DEFAULT_BANK_FORMATS = [
  { key: 'AUTO', label: 'Auto-Detect' },
  { key: 'ICICI', label: 'ICICI Bank' },
  { key: 'HDFC', label: 'HDFC Bank' },
  { key: 'SBI', label: 'State Bank of India' },
  { key: 'KOTAK', label: 'Kotak Mahindra Bank' },
  { key: 'AXIS', label: 'Axis Bank' },
];

/* ─── Main Component ───────────────────────────────────────────────────── */

export default function StatementImport({ selectedAccount, onImportComplete }) {
  const [step, setStep] = useState(0);
  const [accounts, setAccounts] = useState([]);
  const [accountId, setAccountId] = useState(selectedAccount?.id || '');
  const [bankFormat, setBankFormat] = useState('AUTO');
  const [bankFormats, setBankFormats] = useState(DEFAULT_BANK_FORMATS);
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [previewPage, setPreviewPage] = useState(1);
  const fileInputRef = useRef(null);

  const PREVIEW_PAGE_SIZE = 20;

  // Fetch accounts
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const response = await apiClient.get('/bank-accounts');
        setAccounts(response.data?.data || []);
      } catch {
        setAccounts([]);
      }
    };
    fetchAccounts();
  }, []);

  // Fetch bank formats from backend
  useEffect(() => {
    const fetchFormats = async () => {
      try {
        const response = await apiClient.get('/bank-transactions/bank-formats');
        if (response.data?.data) {
          setBankFormats(response.data.data);
        }
      } catch {
        // Use defaults
      }
    };
    fetchFormats();
  }, []);

  // Set account from prop
  useEffect(() => {
    if (selectedAccount?.id) {
      setAccountId(selectedAccount.id);
    }
  }, [selectedAccount]);

  const selectedAccountObj = accounts.find((a) => String(a.id) === String(accountId));

  // ── File handling ─────────────────────────────────────────────────

  const isValidFile = (f) => {
    const name = (f.name || '').toLowerCase();
    return name.endsWith('.csv') || name.endsWith('.xlsx') || name.endsWith('.xls') ||
      name.endsWith('.pdf') || name.endsWith('.html') || name.endsWith('.htm') || name.endsWith('.txt');
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
      setFile(droppedFile);
      setPreviewData(null);
      setImportResult(null);
    } else {
      toast.error('Please upload a CSV, Excel, PDF, HTML, or TXT file');
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (isValidFile(selectedFile)) {
        setFile(selectedFile);
        setPreviewData(null);
        setImportResult(null);
      } else {
        toast.error('Please upload a CSV, Excel, PDF, HTML, or TXT file');
      }
    }
  };

  const clearFile = () => {
    setFile(null);
    setPreviewData(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Preview ───────────────────────────────────────────────────────

  const handlePreview = useCallback(async () => {
    if (!file) return;

    setPreviewing(true);
    setPreviewData(null);
    setPreviewPage(1);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bank_format', bankFormat);

      const response = await apiClient.post('/bank-transactions/preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setPreviewData(response.data);

      if (response.data.parsed_count > 0) {
        setStep(2); // Move to preview step
      } else {
        toast.error(
          response.data.errors?.length
            ? response.data.errors[0]
            : 'No transactions found in the file'
        );
      }
    } catch (err) {
      const msg =
        err.response?.data?.error || err.response?.data?.message || 'Failed to parse file';
      toast.error(msg);
    } finally {
      setPreviewing(false);
    }
  }, [file, bankFormat]);

  // ── Import ────────────────────────────────────────────────────────

  const handleImport = async () => {
    if (!accountId || !file) {
      toast.error('Please select an account and upload a file');
      return;
    }

    setImporting(true);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bank_account_id', accountId);
      formData.append('bank_format', bankFormat);

      const response = await apiClient.post('/bank-transactions/import-file', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setImportResult(response.data);
      setStep(3); // Move to results step
      toast.success(
        `Imported ${response.data.imported_count} transactions (${response.data.skipped_count} duplicates skipped)`
      );

      if (onImportComplete) onImportComplete();
    } catch (err) {
      const msg =
        err.response?.data?.error || err.response?.data?.message || 'Import failed';
      toast.error(msg);
    } finally {
      setImporting(false);
    }
  };

  // ── Navigation ────────────────────────────────────────────────────

  const canGoNext = () => {
    switch (step) {
      case 0:
        return !!accountId;
      case 1:
        return !!file;
      case 2:
        return previewData && previewData.parsed_count > 0;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (step === 1 && file) {
      handlePreview();
      return;
    }
    if (step === 2) {
      handleImport();
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const handleBack = () => {
    if (step === 3) {
      // Reset for new import
      setFile(null);
      setPreviewData(null);
      setImportResult(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setStep(0);
      return;
    }
    setStep((s) => Math.max(0, s - 1));
  };

  // ── Preview pagination ────────────────────────────────────────────

  const previewTransactions = previewData?.transactions || [];
  const previewTotalPages = Math.ceil(previewTransactions.length / PREVIEW_PAGE_SIZE);
  const previewSlice = previewTransactions.slice(
    (previewPage - 1) * PREVIEW_PAGE_SIZE,
    previewPage * PREVIEW_PAGE_SIZE
  );

  const previewTotalDeposits = previewTransactions.reduce(
    (sum, t) => sum + (parseFloat(t.deposit_amount) || 0),
    0
  );
  const previewTotalWithdrawals = previewTransactions.reduce(
    (sum, t) => sum + (parseFloat(t.withdrawal_amount) || 0),
    0
  );

  // ─────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Step Indicator */}
      <div className="flex items-center gap-1 mb-6">
        {STEPS.map((s, i) => (
          <React.Fragment key={s.key}>
            <div className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                  i < step
                    ? 'bg-green-500 text-white'
                    : i === step
                    ? 'bg-[#0071DC] text-white'
                    : 'bg-[#E5E7EB] text-[#6B7280]'
                }`}
              >
                {i < step ? (
                  <HiOutlineCheckCircle className="w-4 h-4" />
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={`text-xs font-medium hidden sm:inline ${
                  i === step ? 'text-[#0071DC]' : i < step ? 'text-green-600' : 'text-[#6B7280]'
                }`}
              >
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-1 rounded ${
                  i < step ? 'bg-green-500' : 'bg-[#E5E7EB]'
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* ── Step 0: Select Account ──────────────────────────────────── */}
      {step === 0 && (
        <div className="max-w-xl">
          <h3 className="text-base font-semibold text-[#333] mb-4">Select Bank Account</h3>
          <p className="text-sm text-[#6B7280] mb-4">
            Choose the bank account this statement belongs to.
          </p>

          <div className="space-y-3">
            {accounts.length === 0 ? (
              <div className="p-6 text-center border border-[#E5E7EB] rounded-lg">
                <HiOutlineBuildingLibrary className="w-10 h-10 text-[#D1D5DB] mx-auto mb-2" />
                <p className="text-sm text-[#6B7280]">No bank accounts found. Please add one first.</p>
              </div>
            ) : (
              accounts
                .filter((a) => a.is_active !== false)
                .map((acc) => (
                  <label
                    key={acc.id}
                    className={`flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-all ${
                      String(accountId) === String(acc.id)
                        ? 'border-[#0071DC] bg-blue-50 ring-1 ring-[#0071DC]/20'
                        : 'border-[#E5E7EB] hover:border-[#0071DC]/30 hover:bg-[#F9FAFB]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="bank_account"
                      value={acc.id}
                      checked={String(accountId) === String(acc.id)}
                      onChange={(e) => setAccountId(e.target.value)}
                      className="w-4 h-4 text-[#0071DC] border-[#D1D5DB] focus:ring-[#0071DC]/20"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-[#333]">{acc.account_name}</p>
                      <p className="text-xs text-[#6B7280]">
                        {acc.bank_name} - A/C {maskAccountNumber(acc.account_number)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-[#333]">
                        {formatIndianCurrency(acc.current_balance || acc.opening_balance)}
                      </p>
                      <p className="text-xs text-[#6B7280]">Balance</p>
                    </div>
                  </label>
                ))
            )}
          </div>

          {/* Bank Format Selection */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-[#333] mb-1">
              Bank Statement Format
            </label>
            <select
              value={bankFormat}
              onChange={(e) => setBankFormat(e.target.value)}
              className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] bg-white focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
            >
              {bankFormats.map((f) => (
                <option key={f.key} value={f.key}>
                  {f.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-[#9CA3AF] mt-1">
              Select your bank or use Auto-Detect to identify the format automatically.
            </p>
          </div>
        </div>
      )}

      {/* ── Step 1: Upload File ─────────────────────────────────────── */}
      {step === 1 && (
        <div className="max-w-xl">
          <h3 className="text-base font-semibold text-[#333] mb-1">Upload Bank Statement</h3>
          <p className="text-sm text-[#6B7280] mb-4">
            Upload your bank statement (CSV, Excel, PDF, HTML, or SWIFT MT940) from{' '}
            <span className="font-medium text-[#333]">
              {bankFormats.find((f) => f.key === bankFormat)?.label || bankFormat}
            </span>
            {selectedAccountObj && (
              <>
                {' '}for{' '}
                <span className="font-medium text-[#333]">
                  {selectedAccountObj.account_name}
                </span>
              </>
            )}
          </p>

          {/* Drag & Drop Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-10 text-center transition-colors ${
              dragOver
                ? 'border-[#0071DC] bg-blue-50'
                : file
                ? 'border-green-300 bg-green-50'
                : 'border-[#E5E7EB] hover:border-[#0071DC]/50'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {file ? (
              <div>
                <HiOutlineDocumentArrowUp className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <p className="text-sm font-medium text-[#333]">{file.name}</p>
                <p className="text-xs text-[#6B7280] mt-1">
                  {(file.size / 1024).toFixed(1)} KB
                  {file.name.endsWith('.csv')
                    ? ' - CSV file'
                    : file.name.endsWith('.xlsx')
                    ? ' - Excel (.xlsx) file'
                    : file.name.endsWith('.xls')
                    ? ' - Excel (.xls) file'
                    : file.name.endsWith('.pdf')
                    ? ' - PDF file'
                    : file.name.endsWith('.html') || file.name.endsWith('.htm')
                    ? ' - HTML file'
                    : file.name.endsWith('.txt')
                    ? ' - SWIFT MT940/MT950 file'
                    : ''}
                </p>
                <button
                  onClick={clearFile}
                  className="mt-3 inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700 font-medium"
                >
                  <HiOutlineXCircle className="w-3.5 h-3.5" />
                  Remove file
                </button>
              </div>
            ) : (
              <div>
                <HiOutlineCloudArrowUp className="w-12 h-12 text-[#9CA3AF] mx-auto mb-3" />
                <p className="text-sm text-[#6B7280]">
                  Drag and drop your bank statement here, or{' '}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-[#0071DC] hover:text-[#005BB5] font-medium"
                  >
                    browse
                  </button>
                </p>
                <p className="text-xs text-[#9CA3AF] mt-2">
                  Supports CSV, Excel, PDF, HTML, and SWIFT MT940/MT950 files up to 10 MB
                </p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls,.pdf,.html,.htm,.txt"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Bank-specific instructions */}
          <div className="mt-6 p-4 rounded-lg bg-[#F9FAFB] border border-[#E5E7EB]">
            <div className="flex items-start gap-2">
              <HiOutlineInformationCircle className="w-4 h-4 text-[#6B7280] mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-1">
                  How to download your bank statement
                </h4>
                <ul className="text-xs text-[#6B7280] space-y-1 leading-relaxed">
                  <li>
                    <span className="font-medium">CSV/Excel:</span> Download from your bank&apos;s internet banking portal (ICICI, HDFC, SBI, Kotak, Axis, etc.)
                  </li>
                  <li>
                    <span className="font-medium">PDF:</span> Use the PDF account statement from your bank — we extract transactions automatically
                  </li>
                  <li>
                    <span className="font-medium">HTML:</span> Save your bank&apos;s detailed statement page as HTML (e.g., ICICI Detailed Statement)
                  </li>
                  <li>
                    <span className="font-medium">SWIFT MT940/MT950:</span> Upload the .txt file — standard banking format supported by most banks
                  </li>
                  <li>
                    <span className="font-medium">Auto-Detect:</span> We automatically identify your bank and file format — just upload and we handle the rest
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Step 2: Preview & Confirm ───────────────────────────────── */}
      {step === 2 && previewData && (
        <div>
          <h3 className="text-base font-semibold text-[#333] mb-1">Preview Transactions</h3>
          <p className="text-sm text-[#6B7280] mb-4">
            Review the parsed transactions before importing them into{' '}
            <span className="font-medium text-[#333]">
              {selectedAccountObj?.account_name || 'the selected account'}
            </span>
          </p>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className="p-3 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]">
              <p className="text-xs text-[#6B7280] font-medium">Transactions Found</p>
              <p className="text-lg font-semibold text-[#333] mt-0.5">
                {previewData.parsed_count}
              </p>
            </div>
            <div className="p-3 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]">
              <p className="text-xs text-[#6B7280] font-medium">Total Deposits</p>
              <p className="text-lg font-semibold text-green-600 mt-0.5">
                {formatIndianCurrency(previewTotalDeposits)}
              </p>
            </div>
            <div className="p-3 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]">
              <p className="text-xs text-[#6B7280] font-medium">Total Withdrawals</p>
              <p className="text-lg font-semibold text-red-600 mt-0.5">
                {formatIndianCurrency(previewTotalWithdrawals)}
              </p>
            </div>
            <div className="p-3 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]">
              <p className="text-xs text-[#6B7280] font-medium">Detected Format</p>
              <p className="text-lg font-semibold text-[#333] mt-0.5">
                {bankFormats.find((f) => f.key === previewData.detected_format)?.label ||
                  previewData.detected_format}
              </p>
            </div>
          </div>

          {/* Errors/Warnings */}
          {previewData.errors && previewData.errors.length > 0 && (
            <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200">
              <div className="flex items-center gap-2 mb-1">
                <HiOutlineExclamationTriangle className="w-4 h-4 text-amber-600" />
                <p className="text-sm font-medium text-amber-800">Warnings</p>
              </div>
              <ul className="ml-6 text-xs text-amber-700 space-y-0.5">
                {previewData.errors.slice(0, 5).map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
                {previewData.errors.length > 5 && (
                  <li>...and {previewData.errors.length - 5} more</li>
                )}
              </ul>
            </div>
          )}

          {/* Column Mapping Info */}
          {previewData.mapping && (
            <div className="mb-4 p-3 rounded-lg bg-blue-50 border border-blue-200">
              <div className="flex items-center gap-2 mb-1">
                <HiOutlineTableCells className="w-4 h-4 text-blue-600" />
                <p className="text-sm font-medium text-blue-800">Column Mapping</p>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 ml-6 text-xs text-blue-700">
                {previewData.mapping.dateColumn && (
                  <span>Date: <strong>{previewData.mapping.dateColumn}</strong></span>
                )}
                {previewData.mapping.descriptionColumn && (
                  <span>Description: <strong>{previewData.mapping.descriptionColumn}</strong></span>
                )}
                {previewData.mapping.depositColumn && (
                  <span>Deposit: <strong>{previewData.mapping.depositColumn}</strong></span>
                )}
                {previewData.mapping.withdrawalColumn && (
                  <span>Withdrawal: <strong>{previewData.mapping.withdrawalColumn}</strong></span>
                )}
                {previewData.mapping.balanceColumn && (
                  <span>Balance: <strong>{previewData.mapping.balanceColumn}</strong></span>
                )}
                {previewData.mapping.referenceColumn && (
                  <span>Reference: <strong>{previewData.mapping.referenceColumn}</strong></span>
                )}
                {previewData.mapping.amountColumn && (
                  <span>Amount: <strong>{previewData.mapping.amountColumn}</strong></span>
                )}
                {previewData.mapping.drCrColumn && (
                  <span>Dr/Cr: <strong>{previewData.mapping.drCrColumn}</strong></span>
                )}
              </div>
            </div>
          )}

          {/* Transactions Table */}
          <div className="overflow-x-auto border border-[#E5E7EB] rounded-lg">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                    #
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider min-w-[200px]">
                    Description
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                    Reference
                  </th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                    Deposit
                  </th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                    Withdrawal
                  </th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                    Balance
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                    Category
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {previewSlice.map((txn, idx) => {
                  const rowNum = (previewPage - 1) * PREVIEW_PAGE_SIZE + idx + 1;
                  const deposit = parseFloat(txn.deposit_amount) || 0;
                  const withdrawal = parseFloat(txn.withdrawal_amount) || 0;

                  return (
                    <tr key={idx} className="hover:bg-[#F9FAFB] transition-colors">
                      <td className="px-3 py-2 text-[#9CA3AF] text-xs">{rowNum}</td>
                      <td className="px-3 py-2 text-[#333] whitespace-nowrap">
                        {formatDate(txn.transaction_date)}
                      </td>
                      <td className="px-3 py-2 text-[#333]">
                        <span className="text-sm line-clamp-2">{txn.description || '--'}</span>
                      </td>
                      <td className="px-3 py-2 text-[#6B7280] font-mono text-xs">
                        {txn.reference_number || '--'}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {deposit > 0 ? (
                          <span className="text-green-600 font-medium flex items-center justify-end gap-1">
                            <HiOutlineArrowDownLeft className="w-3 h-3" />
                            {formatIndianCurrency(deposit)}
                          </span>
                        ) : (
                          <span className="text-[#9CA3AF]">--</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {withdrawal > 0 ? (
                          <span className="text-red-600 font-medium flex items-center justify-end gap-1">
                            <HiOutlineArrowUpRight className="w-3 h-3" />
                            {formatIndianCurrency(withdrawal)}
                          </span>
                        ) : (
                          <span className="text-[#9CA3AF]">--</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-[#333]">
                        {txn.balance != null ? formatIndianCurrency(txn.balance) : '--'}
                      </td>
                      <td className="px-3 py-2">
                        {txn.category ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                            {txn.category}
                          </span>
                        ) : (
                          <span className="text-xs text-[#9CA3AF]">Uncategorized</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {previewTotalPages > 1 && (
            <div className="flex items-center justify-between mt-3">
              <p className="text-xs text-[#6B7280]">
                Showing {(previewPage - 1) * PREVIEW_PAGE_SIZE + 1} to{' '}
                {Math.min(previewPage * PREVIEW_PAGE_SIZE, previewTransactions.length)} of{' '}
                {previewTransactions.length} transactions
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPreviewPage((p) => Math.max(1, p - 1))}
                  disabled={previewPage <= 1}
                  className="px-2 py-1 text-xs border border-[#E5E7EB] rounded hover:bg-[#F9FAFB] disabled:opacity-40 transition-colors"
                >
                  <HiOutlineChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs text-[#6B7280]">
                  {previewPage} / {previewTotalPages}
                </span>
                <button
                  onClick={() => setPreviewPage((p) => Math.min(previewTotalPages, p + 1))}
                  disabled={previewPage >= previewTotalPages}
                  className="px-2 py-1 text-xs border border-[#E5E7EB] rounded hover:bg-[#F9FAFB] disabled:opacity-40 transition-colors"
                >
                  <HiOutlineChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Step 3: Results ─────────────────────────────────────────── */}
      {step === 3 && importResult && (
        <div className="max-w-xl">
          <div className="text-center mb-6">
            {importResult.imported_count > 0 ? (
              <HiOutlineCheckCircle className="w-16 h-16 text-green-500 mx-auto mb-3" />
            ) : (
              <HiOutlineExclamationTriangle className="w-16 h-16 text-amber-500 mx-auto mb-3" />
            )}
            <h3 className="text-lg font-semibold text-[#333]">
              {importResult.imported_count > 0 ? 'Import Complete' : 'No Transactions Imported'}
            </h3>
            <p className="text-sm text-[#6B7280] mt-1">
              {selectedAccountObj?.account_name} - {selectedAccountObj?.bank_name}
            </p>
          </div>

          {/* Result Summary */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200 text-center">
              <p className="text-2xl font-bold text-green-600">{importResult.imported_count}</p>
              <p className="text-xs text-green-700 font-medium mt-1">Imported</p>
            </div>
            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200 text-center">
              <p className="text-2xl font-bold text-amber-600">{importResult.skipped_count}</p>
              <p className="text-xs text-amber-700 font-medium mt-1">Duplicates Skipped</p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 text-center">
              <p className="text-2xl font-bold text-blue-600">{importResult.total_count}</p>
              <p className="text-xs text-blue-700 font-medium mt-1">Total Rows</p>
            </div>
          </div>

          {/* Detected Format */}
          {importResult.detected_format && (
            <div className="mb-4 p-3 rounded-lg bg-[#F9FAFB] border border-[#E5E7EB]">
              <p className="text-xs text-[#6B7280]">
                Detected Format:{' '}
                <span className="font-medium text-[#333]">
                  {bankFormats.find((f) => f.key === importResult.detected_format)?.label ||
                    importResult.detected_format}
                </span>
              </p>
              {importResult.import_batch_id && (
                <p className="text-xs text-[#9CA3AF] mt-1">
                  Batch ID: {importResult.import_batch_id}
                </p>
              )}
            </div>
          )}

          {/* Errors */}
          {importResult.errors && importResult.errors.length > 0 && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200">
              <div className="flex items-center gap-2 mb-1">
                <HiOutlineXCircle className="w-4 h-4 text-red-600" />
                <p className="text-sm font-medium text-red-800">
                  Errors ({importResult.errors.length})
                </p>
              </div>
              <ul className="ml-6 text-xs text-red-700 space-y-0.5">
                {importResult.errors.slice(0, 8).map((err, i) => (
                  <li key={i}>{typeof err === 'string' ? err : JSON.stringify(err)}</li>
                ))}
                {importResult.errors.length > 8 && (
                  <li>...and {importResult.errors.length - 8} more</li>
                )}
              </ul>
            </div>
          )}

          {/* Delete This Import */}
          {importResult.import_batch_id && (
            <div className="mt-6 pt-4 border-t border-[#E5E7EB]">
              <button
                onClick={async () => {
                  if (!window.confirm('Are you sure you want to delete this imported batch? Non-reconciled transactions will be removed.')) return;
                  try {
                    const res = await apiClient.delete(`/bank-transactions/batch/${importResult.import_batch_id}`);
                    const d = res.data?.data || {};
                    toast.success(`Deleted ${d.deleted_count} transaction${d.deleted_count !== 1 ? 's' : ''}${d.skipped_reconciled > 0 ? ` (${d.skipped_reconciled} reconciled skipped)` : ''}`);
                    setImportResult(null);
                    setFile(null);
                    setPreviewData(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                    setStep(0);
                    if (onImportComplete) onImportComplete();
                  } catch (err) {
                    toast.error(err.response?.data?.error || 'Failed to delete batch');
                  }
                }}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-red-600 hover:text-red-700 border border-red-200 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
              >
                <HiOutlineTrash className="w-4 h-4" />
                Delete This Import
              </button>
              <p className="text-xs text-[#9CA3AF] mt-1.5">
                Reconciled transactions will be preserved. Only non-reconciled transactions will be deleted.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Navigation Buttons ──────────────────────────────────────── */}
      <div className="flex items-center justify-between mt-8 pt-4 border-t border-[#E5E7EB]">
        <button
          onClick={handleBack}
          className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            step === 0
              ? 'invisible'
              : 'text-[#333] bg-white border border-[#E5E7EB] hover:bg-[#F9FAFB]'
          }`}
        >
          <HiOutlineChevronLeft className="w-4 h-4" />
          {step === 3 ? 'Import Another' : 'Back'}
        </button>

        {step < 3 && (
          <button
            onClick={handleNext}
            disabled={!canGoNext() || previewing || importing}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0071DC] text-white text-sm font-medium rounded-lg hover:bg-[#005BB5] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {(previewing || importing) && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            {previewing
              ? 'Parsing...'
              : importing
              ? 'Importing...'
              : step === 1
              ? 'Parse & Preview'
              : step === 2
              ? `Import ${previewData?.parsed_count || 0} Transactions`
              : 'Next'}
            {!previewing && !importing && <HiOutlineChevronRight className="w-4 h-4" />}
          </button>
        )}
      </div>
    </div>
  );
}
