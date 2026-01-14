/**
 * components/admin/SecurityMonitor.tsx
 *
 * セキュリティイベントモニター
 */

'use client';

import { useState, useEffect } from 'react';
import { Shield, AlertTriangle, Clock, Loader2 } from 'lucide-react';
import type { SecurityEvent } from '@/lib/types/super-admin';

const EVENT_LABELS: Record<string, { label: string; color: string }> = {
  login_success: { label: 'ログイン成功', color: 'text-green-600 bg-green-50' },
  login_failed: { label: 'ログイン失敗', color: 'text-yellow-600 bg-yellow-50' },
  password_reset: { label: 'パスワードリセット', color: 'text-blue-600 bg-blue-50' },
  account_locked: { label: 'アカウントロック', color: 'text-red-600 bg-red-50' },
  suspicious_activity: { label: '不審な活動', color: 'text-red-600 bg-red-50' },
  permission_denied: { label: '権限拒否', color: 'text-orange-600 bg-orange-50' },
  user_activated: { label: 'ユーザー有効化', color: 'text-green-600 bg-green-50' },
  user_deactivated: { label: 'ユーザー無効化', color: 'text-orange-600 bg-orange-50' },
  user_deleted: { label: 'ユーザー削除', color: 'text-red-600 bg-red-50' },
  sa_granted: { label: 'SA権限付与', color: 'text-indigo-600 bg-indigo-50' },
  sa_revoked: { label: 'SA権限剥奪', color: 'text-purple-600 bg-purple-50' },
};

export function SecurityMonitor() {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const res = await fetch('/api/super-admin/security-events?limit=20');
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
      }
    } catch (error) {
      console.error('Failed to fetch security events:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border shadow-sm">
      <div className="p-4 border-b">
        <div className="flex items-center gap-2">
          <Shield size={20} className="text-gray-500" />
          <h3 className="font-medium">セキュリティモニター</h3>
        </div>
        <p className="text-sm text-gray-500 mt-1">最新20件のイベント</p>
      </div>

      {/* イベント一覧 */}
      <div className="divide-y max-h-80 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="animate-spin text-gray-400" size={24} />
          </div>
        ) : events.length === 0 ? (
          <div className="py-8 text-center text-gray-400">
            イベントがありません
          </div>
        ) : (
          events.map((event) => {
            const config = EVENT_LABELS[event.eventType] || { label: event.eventType, color: 'text-gray-600 bg-gray-50' };
            return (
              <div key={event.id} className="p-3 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={14} className={config.color.split(' ')[0]} />
                    <span className={`text-xs px-1.5 py-0.5 rounded ${config.color}`}>
                      {config.label}
                    </span>
                    {event.userEmail && (
                      <span className="text-xs text-gray-500">{event.userEmail}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Clock size={12} />
                    {new Date(event.createdAt).toLocaleString('ja-JP')}
                  </div>
                </div>
                {event.ipAddress && (
                  <p className="text-xs text-gray-500 mt-1">IP: {event.ipAddress}</p>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
