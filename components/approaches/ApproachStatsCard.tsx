'use client';

import { TrendingUp, Calendar, CalendarDays, Phone, Mail, Users, MapPin } from 'lucide-react';
import type { ApproachStats, ApproachType } from '@/lib/types/approach';
import { APPROACH_TYPE_LABELS } from '@/lib/types/approach';

interface ApproachStatsCardProps {
  stats: ApproachStats;
}

const TYPE_ICONS: Record<ApproachType, typeof Phone> = {
  call: Phone,
  email: Mail,
  meeting: Users,
  visit: MapPin,
  other: TrendingUp,
};

export function ApproachStatsCard({ stats }: ApproachStatsCardProps) {
  return (
    <div className="bg-white rounded-lg border p-4">
      <h3 className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-2">
        <TrendingUp size={16} />
        アプローチ統計
      </h3>

      {/* 期間別統計 */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          <p className="text-xs text-gray-500">累計</p>
        </div>
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Calendar size={12} className="text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-blue-600">{stats.thisMonth}</p>
          <p className="text-xs text-gray-500">今月</p>
        </div>
        <div className="text-center p-3 bg-green-50 rounded-lg">
          <div className="flex items-center justify-center gap-1 mb-1">
            <CalendarDays size={12} className="text-green-600" />
          </div>
          <p className="text-2xl font-bold text-green-600">{stats.thisWeek}</p>
          <p className="text-xs text-gray-500">今週</p>
        </div>
      </div>

      {/* タイプ別統計 */}
      <div className="border-t pt-4">
        <p className="text-xs text-gray-500 mb-2">タイプ別</p>
        <div className="space-y-2">
          {(Object.keys(stats.byType) as ApproachType[]).map((type) => {
            const Icon = TYPE_ICONS[type];
            const count = stats.byType[type];
            const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0;

            return (
              <div key={type} className="flex items-center gap-2">
                <Icon size={14} className="text-gray-400" />
                <span className="text-xs text-gray-600 w-16">
                  {APPROACH_TYPE_LABELS[type]}
                </span>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 w-8 text-right">{count}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
