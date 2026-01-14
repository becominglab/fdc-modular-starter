/**
 * components/dashboard/TaskCompletionChart.tsx
 *
 * タスク完了推移グラフ
 */

'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface TaskCompletionData {
  date: string;
  completed: number;
  total: number;
}

interface TaskCompletionChartProps {
  data: TaskCompletionData[];
}

export function TaskCompletionChart({ data }: TaskCompletionChartProps) {
  const formattedData = data.map((item) => ({
    ...item,
    date: new Date(item.date).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' }),
    pending: item.total - item.completed,
  }));

  return (
    <div className="bg-white rounded-lg border p-4 shadow-sm">
      <h3 className="text-sm font-medium text-gray-700 mb-4">タスク完了推移（過去7日間）</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={formattedData} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
              }}
            />
            <Legend />
            <Bar
              dataKey="completed"
              name="完了"
              fill="#22c55e"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="pending"
              name="未完了"
              fill="#e5e7eb"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
