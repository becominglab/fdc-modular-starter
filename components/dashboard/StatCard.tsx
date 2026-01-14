/**
 * components/dashboard/StatCard.tsx
 *
 * 統計カードコンポーネント
 */

'use client';

import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number | string;
  subValue?: string;
  icon: LucideIcon;
  color?: 'primary' | 'secondary' | 'accent' | 'success';
  trend?: {
    value: number;
    label: string;
  };
}

const colorClasses = {
  primary: 'bg-red-50 text-red-600',
  secondary: 'bg-blue-50 text-blue-600',
  accent: 'bg-amber-50 text-amber-600',
  success: 'bg-green-50 text-green-600',
};

export function StatCard({
  title,
  value,
  subValue,
  icon: Icon,
  color = 'secondary',
  trend,
}: StatCardProps) {
  return (
    <div className="bg-white rounded-lg border p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-500 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subValue && (
            <p className="text-sm text-gray-500 mt-1">{subValue}</p>
          )}
          {trend && (
            <p className={`text-sm mt-1 ${trend.value >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {trend.value >= 0 ? '+' : ''}{trend.value}% {trend.label}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon size={24} />
        </div>
      </div>
    </div>
  );
}
