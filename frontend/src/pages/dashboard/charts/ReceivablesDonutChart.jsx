import React, { useState, useEffect } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import apiClient from '../../../api/client';

const COLORS = ['#4DB6AC', '#7BA7CC', '#D4A054', '#E57373', '#9B8EC4'];
const LABELS = ['Current', '1-30 Days', '31-60 Days', '61-90 Days', '90+ Days'];

export default function ReceivablesDonutChart({ dateParams = {} }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await apiClient.get('/dashboard/charts/receivables', { params: dateParams });
        const d = res.data?.data;
        if (d) {
          const chartData = [
            { name: 'Current', value: d.current || 0 },
            { name: '1-30 Days', value: d.overdue1to30 || 0 },
            { name: '31-60 Days', value: d.overdue31to60 || 0 },
            { name: '61-90 Days', value: d.overdue61to90 || 0 },
            { name: '90+ Days', value: d.overdueAbove90 || 0 },
          ].filter((item) => item.value > 0);
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
        No receivables data
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={2}
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={entry.name} fill={COLORS[LABELS.indexOf(entry.name)] || COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) => [`\u20B9${Number(value).toLocaleString('en-IN')}`, undefined]}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E5E7EB' }}
        />
        <Legend
          wrapperStyle={{ fontSize: 11 }}
          formatter={(value) => <span className="text-[#6B7280]">{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
