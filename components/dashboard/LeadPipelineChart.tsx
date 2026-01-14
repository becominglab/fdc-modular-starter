/**
 * components/dashboard/LeadPipelineChart.tsx
 *
 * リードパイプライン円グラフ
 */

'use client';

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';

interface LeadsByStatus {
  new: number;
  approaching: number;
  negotiating: number;
  proposing: number;
  won: number;
  lost: number;
}

interface LeadPipelineChartProps {
  data: LeadsByStatus;
}

const STATUS_CONFIG = [
  { key: 'new', name: '新規', color: '#3b82f6' },
  { key: 'approaching', name: 'アプローチ中', color: '#f59e0b' },
  { key: 'negotiating', name: '商談中', color: '#8b5cf6' },
  { key: 'proposing', name: '提案中', color: '#ec4899' },
  { key: 'won', name: '成約', color: '#22c55e' },
  { key: 'lost', name: '失注', color: '#6b7280' },
];

export function LeadPipelineChart({ data }: LeadPipelineChartProps) {
  const chartData = STATUS_CONFIG.map(({ key, name, color }) => ({
    name,
    value: data[key as keyof LeadsByStatus],
    color,
  })).filter((item) => item.value > 0);

  if (chartData.length === 0) {
    return (
      <div className="bg-white rounded-lg border p-4 shadow-sm">
        <h3 className="text-sm font-medium text-gray-700 mb-4">リードパイプライン</h3>
        <div className="h-64 flex items-center justify-center text-gray-400">
          データがありません
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border p-4 shadow-sm">
      <h3 className="text-sm font-medium text-gray-700 mb-4">リードパイプライン</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
              label={({ name, value }) => `${name}: ${value}`}
              labelLine={false}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
              }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
