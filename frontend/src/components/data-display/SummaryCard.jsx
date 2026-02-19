import React from 'react';
import {
  HiArrowTrendingUp,
  HiArrowTrendingDown,
  HiMinus,
} from 'react-icons/hi2';

/**
 * SummaryCard - Dashboard KPI card with colored left border, icon, value, and trend.
 *
 * Props:
 *   title       - Card label (e.g. "Total Receivables")
 *   value       - Display value (e.g. "₹5,00,000")
 *   icon        - React icon component
 *   color       - Accent color as hex string (default: '#0071DC')
 *   trend       - 'up' | 'down' | 'neutral' (optional)
 *   trendValue  - Trend description string (e.g. "+12.5%")
 *   className   - Additional CSS classes
 */
export default function SummaryCard({
  title,
  value,
  icon: Icon,
  color = '#0071DC',
  trend,
  trendValue,
  className = '',
}) {
  const trendConfig = {
    up: {
      icon: HiArrowTrendingUp,
      textClass: 'text-green-600',
      bgClass: 'bg-green-50',
    },
    down: {
      icon: HiArrowTrendingDown,
      textClass: 'text-red-600',
      bgClass: 'bg-red-50',
    },
    neutral: {
      icon: HiMinus,
      textClass: 'text-gray-500',
      bgClass: 'bg-gray-50',
    },
  };

  const trendInfo = trend ? trendConfig[trend] : null;
  const TrendIcon = trendInfo?.icon;

  return (
    <div
      className={`bg-white rounded-lg border border-[var(--zoho-border)] p-5 flex items-start gap-4 ${className}`}
      style={{ borderLeft: `4px solid ${color}` }}
    >
      {Icon && (
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${color}15` }}
        >
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-[var(--zoho-text-secondary)] uppercase tracking-wide truncate">
          {title}
        </p>
        <p className="text-xl font-semibold text-[var(--zoho-text)] mt-1">
          {value}
        </p>

        {trendInfo && trendValue && (
          <div className="flex items-center gap-1 mt-1.5">
            <span
              className={`inline-flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded ${trendInfo.bgClass} ${trendInfo.textClass}`}
            >
              <TrendIcon className="w-3 h-3" />
              {trendValue}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
