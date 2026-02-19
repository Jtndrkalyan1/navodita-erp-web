import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  HiOutlineArrowLeft,
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlineExclamationTriangle,
  HiOutlineCheckCircle,
  HiOutlineMagnifyingGlass,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import apiClient from '../../api/client';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges';

// ── Helpers ─────────────────────────────────────────────────────

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
    return '--';
  }
}

// ── Empty line template ─────────────────────────────────────────

const EMPTY_LINE = {
  account_id: '',
  description: '',
  debit_amount: '',
  credit_amount: '',
};

// ── Searchable Account Dropdown ─────────────────────────────────

function AccountDropdown({ value, accounts, onChange }) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  const selectedAccount = accounts.find((a) => String(a.id) === String(value));

  const filtered = useMemo(() => {
    if (!search.trim()) return accounts;
    const q = search.toLowerCase();
    return accounts.filter(
      (a) =>
        (a.account_name || '').toLowerCase().includes(q) ||
        (a.account_code || '').toLowerCase().includes(q)
    );
  }, [accounts, search]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full px-2 py-1.5 border border-[#E5E7EB] rounded text-sm text-left bg-white focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC] truncate"
      >
        {selectedAccount
          ? `${selectedAccount.account_code} - ${selectedAccount.account_name}`
          : '-- Select Account --'}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 mt-1 w-full bg-white border border-[#E5E7EB] rounded-lg shadow-lg max-h-60 overflow-hidden">
            <div className="p-2 border-b border-[#E5E7EB]">
              <div className="relative">
                <HiOutlineMagnifyingGlass className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-7 pr-2 py-1.5 border border-[#E5E7EB] rounded text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-1 focus:ring-[#0071DC]/30"
                  placeholder="Search accounts..."
                  autoFocus
                />
              </div>
            </div>
            <div className="overflow-y-auto max-h-48">
              <button
                type="button"
                onClick={() => {
                  onChange('');
                  setOpen(false);
                  setSearch('');
                }}
                className="w-full text-left px-3 py-2 text-sm text-[#9CA3AF] hover:bg-[#F3F4F6]"
              >
                -- None --
              </button>
              {filtered.length === 0 ? (
                <div className="px-3 py-4 text-sm text-[#9CA3AF] text-center">
                  No accounts found
                </div>
              ) : (
                filtered.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => {
                      onChange(a.id);
                      setOpen(false);
                      setSearch('');
                    }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-[#F3F4F6] transition-colors ${
                      String(a.id) === String(value)
                        ? 'bg-blue-50 text-[#0071DC] font-medium'
                        : 'text-[#333]'
                    }`}
                  >
                    <span className="text-[#6B7280] font-mono text-xs mr-1.5">
                      {a.account_code}
                    </span>
                    {a.account_name}
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────

export default function JournalEntryFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  // Form state
  const [formData, setFormData] = useState({
    entry_number: '',
    entry_date: new Date().toISOString().split('T')[0],
    reference: '',
    description: '',
    status: 'Draft',
  });

  const [lines, setLines] = useState([{ ...EMPTY_LINE }, { ...EMPTY_LINE }]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const { setIsDirty } = useUnsavedChanges();

  // ── Fetch chart of accounts ─────────────────────────────────

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const response = await apiClient.get('/chart-of-accounts', {
          params: { limit: 500 },
        });
        setAccounts(response.data?.data || []);
      } catch {
        setAccounts([]);
      }
    };
    fetchAccounts();
  }, []);

  // ── Fetch existing entry for edit mode ──────────────────────

  useEffect(() => {
    if (!isEdit) return;
    const fetchEntry = async () => {
      setLoading(true);
      try {
        const response = await apiClient.get(`/journal-entries/${id}`);
        const entry = response.data?.data;
        if (!entry) {
          toast.error('Journal entry not found');
          navigate('/journal-entries');
          return;
        }
        setFormData({
          entry_number: entry.entry_number || '',
          entry_date: entry.entry_date ? entry.entry_date.split('T')[0] : '',
          reference: entry.reference || '',
          description: entry.description || entry.notes || '',
          status: entry.status || 'Draft',
        });
        const entryLines = (entry.lines || []).map((l) => ({
          account_id: l.account_id || '',
          description: l.description || '',
          debit_amount:
            l.debit_amount != null && Number(l.debit_amount) !== 0
              ? String(l.debit_amount)
              : l.debit != null && Number(l.debit) !== 0
              ? String(l.debit)
              : '',
          credit_amount:
            l.credit_amount != null && Number(l.credit_amount) !== 0
              ? String(l.credit_amount)
              : l.credit != null && Number(l.credit) !== 0
              ? String(l.credit)
              : '',
        }));
        setLines(
          entryLines.length >= 2
            ? entryLines
            : [
                ...entryLines,
                ...Array(2 - entryLines.length)
                  .fill(null)
                  .map(() => ({ ...EMPTY_LINE })),
              ]
        );
      } catch (err) {
        if (err.response?.status === 404) {
          toast.error('Journal entry not found');
          navigate('/journal-entries');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchEntry();
  }, [id, isEdit, navigate]);

  // ── Handlers ────────────────────────────────────────────────

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setIsDirty(true);
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleLineChange = (index, field, value) => {
    setIsDirty(true);
    setLines((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      // If debit is entered, clear credit and vice versa
      if (field === 'debit_amount' && value) {
        updated[index].credit_amount = '';
      } else if (field === 'credit_amount' && value) {
        updated[index].debit_amount = '';
      }
      return updated;
    });
    // Clear line-level errors
    if (errors.lines || errors.balance) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.lines;
        delete next.balance;
        return next;
      });
    }
  };

  const addLine = () => {
    setLines((prev) => [...prev, { ...EMPTY_LINE }]);
  };

  const removeLine = (index) => {
    if (lines.length <= 2) {
      toast.error('A journal entry must have at least 2 lines');
      return;
    }
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Totals ──────────────────────────────────────────────────

  const totalDebit = lines.reduce(
    (sum, l) => sum + (parseFloat(l.debit_amount) || 0),
    0
  );
  const totalCredit = lines.reduce(
    (sum, l) => sum + (parseFloat(l.credit_amount) || 0),
    0
  );
  const difference = Math.abs(totalDebit - totalCredit);
  const isBalanced = difference < 0.01;

  // ── Validation ──────────────────────────────────────────────

  const validate = () => {
    const newErrors = {};

    if (!formData.entry_date) {
      newErrors.entry_date = 'Entry date is required';
    }

    // Check lines have valid data
    const validLines = lines.filter(
      (l) =>
        l.account_id &&
        (parseFloat(l.debit_amount) > 0 || parseFloat(l.credit_amount) > 0)
    );
    if (validLines.length < 2) {
      newErrors.lines =
        'At least 2 lines with accounts and amounts are required';
    }

    if (!isBalanced) {
      newErrors.balance = `Total debit (${formatIndianCurrency(
        totalDebit
      )}) must equal total credit (${formatIndianCurrency(totalCredit)})`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ── Submit ──────────────────────────────────────────────────

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      toast.error('Please fix the validation errors');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        entry_number: formData.entry_number || undefined,
        entry_date: formData.entry_date,
        reference: formData.reference || '',
        description: formData.description || '',
        status: formData.status,
        total_debit: totalDebit,
        total_credit: totalCredit,
        lines: lines
          .filter(
            (l) =>
              l.account_id &&
              (parseFloat(l.debit_amount) > 0 || parseFloat(l.credit_amount) > 0)
          )
          .map((l) => ({
            account_id: l.account_id,
            description: l.description || '',
            debit_amount: parseFloat(l.debit_amount) || 0,
            credit_amount: parseFloat(l.credit_amount) || 0,
          })),
      };

      if (isEdit) {
        await apiClient.put(`/journal-entries/${id}`, payload);
        toast.success('Journal entry updated successfully');
        setIsDirty(false);
        navigate(`/journal-entries/${id}`);
      } else {
        const response = await apiClient.post('/journal-entries', payload);
        const newId = response.data?.data?.id;
        toast.success('Journal entry created successfully');
        setIsDirty(false);
        navigate(newId ? `/journal-entries/${newId}` : '/journal-entries');
      }
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Failed to save journal entry';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // ── Loading ─────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#0071DC] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-[#6B7280]">Loading journal entry...</span>
        </div>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────

  return (
    <div className="max-w-5xl pb-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg hover:bg-[#F3F4F6] transition-colors"
          title="Go back"
        >
          <HiOutlineArrowLeft className="w-5 h-5 text-[#6B7280]" />
        </button>
        <div>
          <h1 className="text-2xl font-semibold text-[#333]">
            {isEdit ? 'Edit Journal Entry' : 'New Journal Entry'}
          </h1>
          <p className="text-sm text-[#6B7280] mt-0.5">
            {isEdit
              ? 'Update journal entry details'
              : 'Record a manual journal entry'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* ── Entry Info Section ───────────────────────────────── */}
        <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6 mb-6">
          <h2 className="text-base font-semibold text-[#333] mb-4">
            Entry Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Entry Number */}
            <div>
              <label className="block text-sm font-medium text-[#333] mb-1">
                Entry Number
              </label>
              <input
                type="text"
                name="entry_number"
                value={formData.entry_number}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
                placeholder="Auto-generated if empty"
              />
            </div>

            {/* Entry Date */}
            <div>
              <label className="block text-sm font-medium text-[#333] mb-1">
                Entry Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="entry_date"
                value={formData.entry_date}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg text-sm text-[#333] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC] ${
                  errors.entry_date
                    ? 'border-red-400 bg-red-50'
                    : 'border-[#E5E7EB]'
                }`}
              />
              {errors.entry_date && (
                <p className="text-xs text-red-500 mt-1">{errors.entry_date}</p>
              )}
            </div>

            {/* Reference */}
            <div>
              <label className="block text-sm font-medium text-[#333] mb-1">
                Reference
              </label>
              <input
                type="text"
                name="reference"
                value={formData.reference}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
                placeholder="Reference number or note"
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-[#333] mb-1">
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] bg-white focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
              >
                <option value="Draft">Draft</option>
                <option value="Posted">Posted</option>
                <option value="Reversed">Reversed</option>
              </select>
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-[#333] mb-1">
                Description
              </label>
              <input
                type="text"
                name="description"
                value={formData.description}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
                placeholder="Brief description of this journal entry"
              />
            </div>
          </div>
        </div>

        {/* ── Journal Lines Section ────────────────────────────── */}
        <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-[#333]">
              Journal Lines
            </h2>
            <button
              type="button"
              onClick={addLine}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[#0071DC] border border-[#0071DC] rounded-lg hover:bg-blue-50 transition-colors"
            >
              <HiOutlinePlus className="w-4 h-4" />
              Add Line
            </button>
          </div>

          {/* Error messages */}
          {errors.lines && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700">
              <HiOutlineExclamationTriangle className="w-4 h-4 flex-shrink-0" />
              {errors.lines}
            </div>
          )}
          {errors.balance && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-sm text-amber-700">
              <HiOutlineExclamationTriangle className="w-4 h-4 flex-shrink-0" />
              {errors.balance}
            </div>
          )}

          {/* Lines table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider w-[35%]">
                    Account <span className="text-red-500">*</span>
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider w-[25%]">
                    Description
                  </th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold text-[#6B7280] uppercase tracking-wider w-[15%]">
                    Debit
                  </th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold text-[#6B7280] uppercase tracking-wider w-[15%]">
                    Credit
                  </th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold text-[#6B7280] uppercase tracking-wider w-[10%]" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {lines.map((line, index) => (
                  <tr key={index} className="hover:bg-[#FAFBFC]">
                    <td className="px-3 py-2">
                      <AccountDropdown
                        value={line.account_id}
                        accounts={accounts}
                        onChange={(val) =>
                          handleLineChange(index, 'account_id', val)
                        }
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={line.description}
                        onChange={(e) =>
                          handleLineChange(index, 'description', e.target.value)
                        }
                        className="w-full px-2 py-1.5 border border-[#E5E7EB] rounded text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
                        placeholder="Description"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={line.debit_amount}
                        onChange={(e) =>
                          handleLineChange(index, 'debit_amount', e.target.value)
                        }
                        className="w-full px-2 py-1.5 border border-[#E5E7EB] rounded text-sm text-[#333] text-right placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
                        placeholder="0.00"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={line.credit_amount}
                        onChange={(e) =>
                          handleLineChange(
                            index,
                            'credit_amount',
                            e.target.value
                          )
                        }
                        className="w-full px-2 py-1.5 border border-[#E5E7EB] rounded text-sm text-[#333] text-right placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
                        placeholder="0.00"
                      />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => removeLine(index)}
                        className="p-1.5 rounded hover:bg-red-50 text-[#9CA3AF] hover:text-red-600 transition-colors"
                        title="Remove line"
                      >
                        <HiOutlineTrash className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                {/* Totals row */}
                <tr className="border-t-2 border-[#E5E7EB] bg-[#F9FAFB]">
                  <td
                    colSpan={2}
                    className="px-3 py-3 text-right text-sm font-semibold text-[#333]"
                  >
                    Totals
                  </td>
                  <td className="px-3 py-3 text-right text-sm font-bold text-[#333] tabular-nums">
                    {formatIndianCurrency(totalDebit)}
                  </td>
                  <td className="px-3 py-3 text-right text-sm font-bold text-[#333] tabular-nums">
                    {formatIndianCurrency(totalCredit)}
                  </td>
                  <td />
                </tr>

                {/* Difference warning row */}
                {!isBalanced && totalDebit + totalCredit > 0 && (
                  <tr className="bg-red-50">
                    <td
                      colSpan={2}
                      className="px-3 py-2 text-right text-sm font-medium text-red-700"
                    >
                      <HiOutlineExclamationTriangle className="w-4 h-4 inline mr-1" />
                      Difference
                    </td>
                    <td
                      colSpan={2}
                      className="px-3 py-2 text-right text-sm font-medium text-red-700 tabular-nums"
                    >
                      {formatIndianCurrency(difference)}
                    </td>
                    <td />
                  </tr>
                )}

                {/* Balanced indicator */}
                {isBalanced && totalDebit > 0 && (
                  <tr className="bg-green-50">
                    <td
                      colSpan={5}
                      className="px-3 py-2 text-center text-sm font-medium text-green-700"
                    >
                      <HiOutlineCheckCircle className="w-4 h-4 inline mr-1" />
                      Entry is balanced
                    </td>
                  </tr>
                )}
              </tfoot>
            </table>
          </div>
        </div>

        {/* ── Notes Section ────────────────────────────────────── */}
        <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6 mb-6">
          <h2 className="text-base font-semibold text-[#333] mb-4">Notes</h2>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC] resize-vertical"
            placeholder="Internal notes about this journal entry..."
          />
        </div>

        {/* ── Form Actions ─────────────────────────────────────── */}
        <div className="flex items-center justify-end gap-3 pb-8">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-5 py-2 text-sm font-medium text-[#333] bg-white border border-[#E5E7EB] rounded-lg hover:bg-[#F9FAFB] transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-[#0071DC] rounded-lg hover:bg-[#005BB5] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            {saving
              ? isEdit
                ? 'Updating...'
                : 'Creating...'
              : isEdit
              ? 'Update Entry'
              : 'Create Entry'}
          </button>
        </div>
      </form>
    </div>
  );
}
