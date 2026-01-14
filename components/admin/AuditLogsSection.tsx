'use client';

/**
 * components/admin/AuditLogsSection.tsx
 *
 * 監査ログセクション
 */

import { History, Loader2, ChevronDown } from 'lucide-react';
import type { AuditLog } from '@/lib/types/admin';
import { AUDIT_ACTION_INFO } from '@/lib/types/admin';

interface AuditLogsSectionProps {
  logs: AuditLog[];
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
}

export function AuditLogsSection({
  logs,
  loading,
  hasMore,
  onLoadMore,
}: AuditLogsSectionProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getActionLabel = (action: string) => {
    return AUDIT_ACTION_INFO[action]?.label || action;
  };

  const formatDetails = (details: Record<string, unknown>) => {
    const parts: string[] = [];

    if (details.email) parts.push(`${details.email}`);
    if (details.old_role && details.new_role) {
      parts.push(`${details.old_role} → ${details.new_role}`);
    }
    if (details.removed_role) parts.push(`(${details.removed_role})`);

    return parts.join(' ');
  };

  return (
    <div className="admin-section audit-logs-section">
      <div className="section-header">
        <History size={20} />
        <h2>操作履歴</h2>
      </div>

      {loading && logs.length === 0 ? (
        <div className="section-loading">
          <Loader2 className="animate-spin" size={24} />
        </div>
      ) : logs.length === 0 ? (
        <div className="empty-message">
          <p>操作履歴がありません</p>
        </div>
      ) : (
        <>
          <div className="audit-logs-list">
            {logs.map(log => (
              <div key={log.id} className="audit-log-item">
                <div className="log-time">{formatDate(log.created_at)}</div>
                <div className="log-content">
                  <span className="log-action">{getActionLabel(log.action)}</span>
                  <span className="log-details">{formatDetails(log.details)}</span>
                </div>
              </div>
            ))}
          </div>

          {hasMore && (
            <button
              onClick={onLoadMore}
              className="load-more-btn"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <>
                  <ChevronDown size={16} />
                  もっと見る
                </>
              )}
            </button>
          )}
        </>
      )}
    </div>
  );
}
