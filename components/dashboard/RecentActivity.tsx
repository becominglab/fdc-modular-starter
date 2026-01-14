/**
 * components/dashboard/RecentActivity.tsx
 *
 * 最近のアクティビティ一覧
 */

'use client';

import { Clock, Plus, Edit, Trash2, FileText, Users, CheckSquare, Target } from 'lucide-react';

interface Activity {
  id: string;
  action: string;
  resource_type: string;
  created_at: string;
  details: Record<string, unknown> | null;
}

interface RecentActivityProps {
  activities: Activity[];
}

const ACTION_ICONS: Record<string, typeof Plus> = {
  create: Plus,
  update: Edit,
  delete: Trash2,
};

const RESOURCE_ICONS: Record<string, typeof FileText> = {
  task: CheckSquare,
  prospect: Target,
  client: Users,
};

const ACTION_LABELS: Record<string, string> = {
  create: '作成',
  update: '更新',
  delete: '削除',
};

const RESOURCE_LABELS: Record<string, string> = {
  task: 'タスク',
  prospect: 'リード',
  client: 'クライアント',
  approach: 'アプローチ',
};

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'たった今';
  if (diffMins < 60) return `${diffMins}分前`;
  if (diffHours < 24) return `${diffHours}時間前`;
  if (diffDays < 7) return `${diffDays}日前`;

  return date.toLocaleDateString('ja-JP', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function RecentActivity({ activities }: RecentActivityProps) {
  if (activities.length === 0) {
    return (
      <div className="bg-white rounded-lg border p-4 shadow-sm">
        <h3 className="text-sm font-medium text-gray-700 mb-4">最近のアクティビティ</h3>
        <div className="flex items-center justify-center h-32 text-gray-400">
          アクティビティがありません
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border p-4 shadow-sm">
      <h3 className="text-sm font-medium text-gray-700 mb-4">最近のアクティビティ</h3>
      <div className="space-y-3 max-h-80 overflow-y-auto">
        {activities.map((activity) => {
          const ActionIcon = ACTION_ICONS[activity.action] || Edit;
          const ResourceIcon = RESOURCE_ICONS[activity.resource_type] || FileText;
          const actionLabel = ACTION_LABELS[activity.action] || activity.action;
          const resourceLabel = RESOURCE_LABELS[activity.resource_type] || activity.resource_type;

          return (
            <div
              key={activity.id}
              className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="p-2 bg-gray-100 rounded-lg">
                <ResourceIcon size={16} className="text-gray-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <ActionIcon size={14} className="text-gray-400" />
                  <span className="text-sm text-gray-700">
                    {resourceLabel}を{actionLabel}
                  </span>
                </div>
                {activity.details && (
                  <p className="text-xs text-gray-500 mt-0.5 truncate">
                    {typeof activity.details === 'object' && activity.details !== null
                      ? Object.entries(activity.details)
                          .slice(0, 2)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(', ')
                      : ''}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <Clock size={12} />
                <span>{formatRelativeTime(activity.created_at)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
