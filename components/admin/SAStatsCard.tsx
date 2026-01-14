/**
 * components/admin/SAStatsCard.tsx
 *
 * Super Admin 統計カード
 */

'use client';

import { LucideIcon } from 'lucide-react';

interface SAStatsCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  description?: string;
}

export function SAStatsCard({ title, value, icon: Icon, description }: SAStatsCardProps) {
  return (
    <div className="bg-white rounded-lg border p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value.toLocaleString()}</p>
          {description && (
            <p className="text-xs text-gray-400 mt-1">{description}</p>
          )}
        </div>
        <div className="p-2 bg-indigo-50 rounded-lg">
          <Icon size={20} className="text-indigo-600" />
        </div>
      </div>
    </div>
  );
}
