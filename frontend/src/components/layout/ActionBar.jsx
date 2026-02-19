import React from 'react';
import { HiOutlineXMark } from 'react-icons/hi2';

/**
 * ActionBar - Floating action bar that appears when items are selected.
 *
 * Props:
 *   selectedCount - Number of currently selected items
 *   actions       - Array of { label, icon: ReactIconComponent, onClick, variant: 'default'|'danger' }
 *   onClear       - Callback to clear the selection
 */
export default function ActionBar({ selectedCount = 0, actions = [], onClear }) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-[#1B2631] text-white rounded-lg shadow-xl px-5 py-3 animate-[slideUp_0.2s_ease-out]">
      <span className="text-sm font-medium whitespace-nowrap">
        {selectedCount} selected
      </span>

      <div className="w-px h-5 bg-gray-500" />

      <div className="flex items-center gap-1">
        {actions.map((action, index) => {
          const Icon = action.icon;
          const isDanger = action.variant === 'danger';
          return (
            <button
              key={index}
              onClick={action.onClick}
              className={`inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md transition-colors duration-150 cursor-pointer ${
                isDanger
                  ? 'text-red-300 hover:bg-red-500/20'
                  : 'text-gray-200 hover:bg-white/10'
              }`}
            >
              {Icon && <Icon className="w-4 h-4" />}
              {action.label}
            </button>
          );
        })}
      </div>

      {onClear && (
        <>
          <div className="w-px h-5 bg-gray-500" />
          <button
            onClick={onClear}
            className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-white/10 transition-colors duration-150 cursor-pointer"
            aria-label="Clear selection"
          >
            <HiOutlineXMark className="w-4 h-4" />
          </button>
        </>
      )}
    </div>
  );
}
