import React, { useState, useEffect } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from 'recharts';
import apiClient from '../../../api/client';

const COLORS = ['#5C8DB8', '#4DB6AC', '#D4A054', '#E57373', '#9B8EC4', '#C78DAE', '#6BACB8', '#D4845A'];

export default function ExpenseBreakdownChart({ dateParams = {} }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await apiClient.get('/dashboard/charts/expenses', { params: dateParams });
        const { categories, amounts } = res.data?.data || {};
        if (categories && amounts) {
          const chartData = categories
            .map((cat, i) => ({
              name: cat,
              value: amounts[i] || 0,
            }))
            .filter((item) => item.value > 0)
            .slice(0, 8); // Top 8 categories
          setData(chartData);
        }
      } catch {
        setData([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [JSON.stringify(dateParams)]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-6 h-6 border-2 border-[#0071DC] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-[#9CA3AF]">
        No expense data available
      </div>
    );
  }

  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => {
              const pct = total > 0 ? ((Number(value) / total) * 100).toFixed(1) : '0.0';
              return [`\u20B9${Number(value).toLocaleString('en-IN')} (${pct}%)`, undefined];
            }}
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E5E7EB' }}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Detailed breakdown list */}
      <div className="mt-3 space-y-1.5 max-h-48 overflow-y-auto">
        {data.map((item, idx) => {
          const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0.0';
          return (
            <div key={item.name} className="flex items-center justify-between text-xs px-1 py-1 rounded hover:bg-gray-50">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                />
                <span className="text-gray-700 truncate">{item.name}</span>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                <span className="text-gray-400 w-10 text-right">{pct}%</span>
                <span className="font-medium text-gray-800 tabular-nums w-24 text-right">
                  {'\u20B9'}{Number(item.value).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          );
        })}
        {total > 0 && (
          <div className="flex items-center justify-between text-xs px-1 pt-1.5 border-t border-gray-200 mt-1">
            <span className="font-semibold text-gray-800">Total</span>
            <span className="font-bold text-gray-900 tabular-nums">
              {'\u20B9'}{Number(total).toLocaleString('en-IN')}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
