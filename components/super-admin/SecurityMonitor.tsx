/**
 * components/super-admin/SecurityMonitor.tsx
 *
 * セキュリティイベントモニター
 */

'use client';

import { Shield, AlertTriangle, AlertCircle, Info, Filter } from 'lucide-react';
import type { SecurityEvent } from '@/lib/types/super-admin';

interface SecurityMonitorProps {
  events: SecurityEvent[];
  loading: boolean;
  severity?: string;
  onSeverityChange: (severity: string | undefined) => void;
}

const severityConfig = {
  low: { icon: Info, label: '低', className: 'sa-severity--low' },
  medium: { icon: AlertCircle, label: '中', className: 'sa-severity--medium' },
  high: { icon: AlertTriangle, label: '高', className: 'sa-severity--high' },
};

export function SecurityMonitor({ events, loading, severity, onSeverityChange }: SecurityMonitorProps) {
  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatEventType = (type: string) => {
    const typeMap: Record<string, string> = {
      login_failed: 'ログイン失敗',
      login_success: 'ログイン成功',
      user_activated: 'ユーザー有効化',
      user_deactivated: 'ユーザー無効化',
      user_deleted: 'ユーザー削除',
      sa_granted: 'SA権限付与',
      sa_revoked: 'SA権限剥奪',
      password_changed: 'パスワード変更',
      suspicious_activity: '不審なアクティビティ',
    };
    return typeMap[type] || type;
  };

  return (
    <div className="sa-section">
      <div className="sa-section-header">
        <h2 className="sa-section-title">
          <Shield size={20} />
          セキュリティイベント
        </h2>
        <div className="sa-filter-box">
          <Filter size={16} />
          <select
            value={severity || ''}
            onChange={(e) => onSeverityChange(e.target.value || undefined)}
            className="sa-filter-select"
          >
            <option value="">すべて</option>
            <option value="low">低</option>
            <option value="medium">中</option>
            <option value="high">高</option>
          </select>
        </div>
      </div>

      <div className="sa-events-list">
        {loading ? (
          <div className="sa-events-loading">読み込み中...</div>
        ) : events.length === 0 ? (
          <div className="sa-events-empty">セキュリティイベントはありません</div>
        ) : (
          events.map((event) => {
            const config = severityConfig[event.severity as keyof typeof severityConfig] || severityConfig.low;
            const Icon = config.icon;

            return (
              <div key={event.id} className={`sa-event-item ${config.className}`}>
                <div className="sa-event-icon">
                  <Icon size={18} />
                </div>
                <div className="sa-event-content">
                  <div className="sa-event-header">
                    <span className="sa-event-type">{formatEventType(event.eventType)}</span>
                    <span className={`sa-severity-badge ${config.className}`}>{config.label}</span>
                  </div>
                  <div className="sa-event-details">
                    {event.userEmail && <span>ユーザー: {event.userEmail}</span>}
                    {event.ipAddress && <span>IP: {event.ipAddress}</span>}
                  </div>
                  <div className="sa-event-time">{formatDateTime(event.createdAt)}</div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
