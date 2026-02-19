import React, { useCallback } from 'react';
import { HiOutlinePlus, HiOutlineTrash } from 'react-icons/hi2';
import { formatIndianNumber } from '../data-display/CurrencyCell';

/**
 * LineItemEditor - Editable line items table for invoices/bills/quotations.
 *
 * Props:
 *   items     - Array of line item objects:
 *               { itemName, description, hsn, quantity, rate, gstPercent }
 *   onChange  - Callback: (updatedItems) => void
 *   onAdd     - Callback to add a new blank row (or default handler used)
 *   onRemove  - Callback: (index) => void (or default handler used)
 *   readOnly  - Boolean, disables editing
 *   className - Additional CSS classes
 *
 * Each line item auto-computes: amount = quantity * rate
 * Footer shows: Subtotal, GST breakdown, Total
 */

const EMPTY_ITEM = {
  itemName: '',
  description: '',
  hsn: '',
  quantity: 1,
  rate: 0,
  gstPercent: 18,
};

export default function LineItemEditor({
  items = [],
  onChange,
  onAdd,
  onRemove,
  readOnly = false,
  className = '',
}) {
  const updateItem = useCallback(
    (index, field, value) => {
      const updated = items.map((item, i) => {
        if (i !== index) return item;
        return { ...item, [field]: value };
      });
      onChange?.(updated);
    },
    [items, onChange]
  );

  const handleAdd = useCallback(() => {
    if (onAdd) {
      onAdd();
    } else {
      onChange?.([...items, { ...EMPTY_ITEM }]);
    }
  }, [items, onChange, onAdd]);

  const handleRemove = useCallback(
    (index) => {
      if (onRemove) {
        onRemove(index);
      } else {
        onChange?.(items.filter((_, i) => i !== index));
      }
    },
    [items, onChange, onRemove]
  );

  const computeAmount = (item) => {
    const qty = Number(item.quantity) || 0;
    const rate = Number(item.rate) || 0;
    return qty * rate;
  };

  const subtotal = items.reduce((sum, item) => sum + computeAmount(item), 0);

  // Group GST by percentage for footer breakdown
  const gstBreakdown = {};
  items.forEach((item) => {
    const pct = Number(item.gstPercent) || 0;
    const amt = computeAmount(item);
    const gst = (amt * pct) / 100;
    if (pct > 0) {
      gstBreakdown[pct] = (gstBreakdown[pct] || 0) + gst;
    }
  });

  const totalGst = Object.values(gstBreakdown).reduce((s, v) => s + v, 0);
  const grandTotal = subtotal + totalGst;

  const inputClass = readOnly
    ? 'bg-transparent border-0 text-sm text-[var(--zoho-text)] cursor-default'
    : 'w-full px-2 py-1.5 text-sm border border-transparent rounded bg-transparent text-[var(--zoho-text)] hover:border-[var(--zoho-border)] focus:border-[#0071DC] focus:ring-1 focus:ring-[#0071DC]/20 focus:outline-none transition-colors';

  return (
    <div className={`bg-white border border-[var(--zoho-border)] rounded-lg overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-[var(--zoho-border)]">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--zoho-text-secondary)] w-8">
                #
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--zoho-text-secondary)] min-w-[180px]">
                Item Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--zoho-text-secondary)] min-w-[140px]">
                Description
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--zoho-text-secondary)] w-28">
                HSN/SAC
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--zoho-text-secondary)] w-24">
                Qty
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--zoho-text-secondary)] w-28">
                Rate
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--zoho-text-secondary)] w-24">
                GST %
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--zoho-text-secondary)] w-32">
                Amount
              </th>
              {!readOnly && (
                <th className="px-4 py-3 w-10" />
              )}
            </tr>
          </thead>

          <tbody>
            {items.map((item, index) => {
              const amount = computeAmount(item);
              return (
                <tr
                  key={index}
                  className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors"
                >
                  <td className="px-4 py-2 text-xs text-[var(--zoho-text-secondary)]">
                    {index + 1}
                  </td>
                  <td className="px-3 py-1">
                    <input
                      type="text"
                      value={item.itemName || ''}
                      onChange={(e) => updateItem(index, 'itemName', e.target.value)}
                      placeholder="Item name"
                      readOnly={readOnly}
                      className={inputClass}
                    />
                  </td>
                  <td className="px-3 py-1">
                    <input
                      type="text"
                      value={item.description || ''}
                      onChange={(e) => updateItem(index, 'description', e.target.value)}
                      placeholder="Description"
                      readOnly={readOnly}
                      className={inputClass}
                    />
                  </td>
                  <td className="px-3 py-1">
                    <input
                      type="text"
                      value={item.hsn || ''}
                      onChange={(e) => updateItem(index, 'hsn', e.target.value)}
                      placeholder="HSN"
                      readOnly={readOnly}
                      className={inputClass}
                    />
                  </td>
                  <td className="px-3 py-1">
                    <input
                      type="number"
                      value={item.quantity ?? ''}
                      onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                      min="0"
                      step="1"
                      readOnly={readOnly}
                      className={`${inputClass} text-right`}
                    />
                  </td>
                  <td className="px-3 py-1">
                    <input
                      type="number"
                      value={item.rate ?? ''}
                      onChange={(e) => updateItem(index, 'rate', e.target.value)}
                      min="0"
                      step="0.01"
                      readOnly={readOnly}
                      className={`${inputClass} text-right`}
                    />
                  </td>
                  <td className="px-3 py-1">
                    <input
                      type="number"
                      value={item.gstPercent ?? ''}
                      onChange={(e) => updateItem(index, 'gstPercent', e.target.value)}
                      min="0"
                      max="100"
                      step="0.1"
                      readOnly={readOnly}
                      className={`${inputClass} text-right`}
                    />
                  </td>
                  <td className="px-4 py-2 text-right text-sm font-medium text-[var(--zoho-text)] tabular-nums">
                    {'\u20B9'}{formatIndianNumber(amount)}
                  </td>
                  {!readOnly && (
                    <td className="px-2 py-2">
                      <button
                        onClick={() => handleRemove(index)}
                        className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                        aria-label={`Remove item ${index + 1}`}
                      >
                        <HiOutlineTrash className="w-4 h-4" />
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}

            {items.length === 0 && (
              <tr>
                <td
                  colSpan={readOnly ? 8 : 9}
                  className="px-4 py-8 text-center text-sm text-gray-400"
                >
                  No line items added yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add button */}
      {!readOnly && (
        <div className="px-4 py-3 border-t border-gray-100">
          <button
            onClick={handleAdd}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#0071DC] hover:text-[#005BB5] transition-colors cursor-pointer"
          >
            <HiOutlinePlus className="w-4 h-4" />
            Add Line Item
          </button>
        </div>
      )}

      {/* Totals */}
      {items.length > 0 && (
        <div className="border-t border-[var(--zoho-border)] bg-gray-50 px-4 py-3">
          <div className="flex flex-col items-end gap-1.5">
            <div className="flex items-center gap-8 text-sm">
              <span className="text-[var(--zoho-text-secondary)] w-28 text-right">Subtotal</span>
              <span className="font-medium text-[var(--zoho-text)] w-32 text-right tabular-nums">
                {'\u20B9'}{formatIndianNumber(subtotal)}
              </span>
            </div>

            {Object.entries(gstBreakdown)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([pct, amt]) => (
                <div key={pct} className="flex items-center gap-8 text-sm">
                  <span className="text-[var(--zoho-text-secondary)] w-28 text-right">
                    GST ({pct}%)
                  </span>
                  <span className="text-[var(--zoho-text)] w-32 text-right tabular-nums">
                    {'\u20B9'}{formatIndianNumber(amt)}
                  </span>
                </div>
              ))}

            <div className="flex items-center gap-8 text-sm pt-1.5 border-t border-gray-200 mt-1">
              <span className="font-semibold text-[var(--zoho-text)] w-28 text-right">Total</span>
              <span className="font-semibold text-[var(--zoho-text)] w-32 text-right tabular-nums">
                {'\u20B9'}{formatIndianNumber(grandTotal)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
