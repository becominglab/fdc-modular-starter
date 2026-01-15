/**
 * components/notifications/NotificationList.tsx
 *
 * 通知一覧コンポーネント
 */

'use client';

import { Bell, Mail, CheckSquare, Users, Info, AlertCircle, Loader2 } from 'lucide-react';
import type { Notification, NotificationType } from '@/lib/types/notification';

interface NotificationListProps {
  notifications: Notification[];
  loading: boolean;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClose: () => void;
}

const TYPE_ICONS: Record<NotificationType, typeof Bell> = {
  invitation: Mail,
  task_due: AlertCircle,
  task_assigned: CheckSquare,
  mention: Users,
  system: Bell,
  info: Info,
};

const TYPE_COLORS: Record<NotificationType, string> = {
  invitation: 'text-blue-600 bg-blue-50',
  task_due: 'text-red-600 bg-red-50',
  task_assigned: 'text-green-600 bg-green-50',
  mention: 'text-purple-600 bg-purple-50',
  system: 'text-gray-600 bg-gray-50',
  info: 'text-amber-600 bg-amber-50',
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

  return date.toLocaleDateString('ja-JP');
}

export function NotificationList({
  notifications,
  loading,
  onMarkAsRead,
  onMarkAllAsRead,
  onClose,
}: NotificationListProps) {
  const unreadNotifications = notifications.filter((n) => !n.isRead);

  const handleClick = (notification: Notification) => {
    if (!notification.isRead) {
      onMarkAsRead(notification.id);
    }
    if (notification.link) {
      window.location.href = notification.link;
      onClose();
    }
  };

  return (
    <div>
      {/* ヘッダー */}
      <div className="flex items-center justify-between p-3 border-b">
        <h3 className="font-medium text-gray-900">通知</h3>
        {unreadNotifications.length > 0 && (
          <button
            onClick={onMarkAllAsRead}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            すべて既読にする
          </button>
        )}
      </div>

      {/* 通知リスト */}
      <div className="max-h-96 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="animate-spin text-gray-400" size={24} />
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-8 text-center text-gray-400">
            <Bell size={32} className="mx-auto mb-2 opacity-50" />
            <p>通知はありません</p>
          </div>
        ) : (
          notifications.slice(0, 10).map((notification) => {
            const Icon = TYPE_ICONS[notification.type] || Bell;
            const colorClass = TYPE_COLORS[notification.type] || 'text-gray-600 bg-gray-50';

            return (
              <div
                key={notification.id}
                onClick={() => handleClick(notification)}
                className={`p-3 border-b cursor-pointer hover:bg-gray-50 transition-colors ${
                  !notification.isRead ? 'bg-blue-50/50' : ''
                }`}
              >
                <div className="flex gap-3">
                  <div className={`p-2 rounded-lg ${colorClass}`}>
                    <Icon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm ${!notification.isRead ? 'font-medium' : ''}`}>
                        {notification.title}
                      </p>
                      {!notification.isRead && (
                        <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />
                      )}
                    </div>
                    {notification.message && (
                      <p className="text-xs text-gray-500 mt-0.5 truncate">
                        {notification.message}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {formatRelativeTime(notification.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* フッター */}
      {notifications.length > 10 && (
        <div className="p-2 border-t">
          <a
            href="/notifications"
            className="block text-center text-sm text-blue-600 hover:text-blue-800"
          >
            すべての通知を見る
          </a>
        </div>
      )}
    </div>
  );
}
