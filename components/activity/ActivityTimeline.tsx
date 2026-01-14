/**
 * components/activity/ActivityTimeline.tsx
 *
 * アクティビティタイムラインコンポーネント
 */

'use client';

import { useEffect, useRef, useCallback } from 'react';
import {
  Plus, Edit, Trash2, Mail, Check, X, LogIn, LogOut,
  User, Briefcase, Target, Users, FileText, Loader2
} from 'lucide-react';
import type { ActivityLog, ActivityAction, ActivityResource } from '@/lib/types/activity';

interface ActivityTimelineProps {
  logs: ActivityLog[];
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
}

const actionIcons: Record<ActivityAction, React.ReactNode> = {
  create: <Plus size={14} />,
  update: <Edit size={14} />,
  delete: <Trash2 size={14} />,
  invite: <Mail size={14} />,
  accept: <Check size={14} />,
  reject: <X size={14} />,
  login: <LogIn size={14} />,
  logout: <LogOut size={14} />,
};

const actionLabels: Record<ActivityAction, string> = {
  create: '作成',
  update: '更新',
  delete: '削除',
  invite: '招待',
  accept: '承認',
  reject: '拒否',
  login: 'ログイン',
  logout: 'ログアウト',
};

const resourceIcons: Record<ActivityResource, React.ReactNode> = {
  task: <FileText size={14} />,
  prospect: <Users size={14} />,
  client: <Briefcase size={14} />,
  brand: <FileText size={14} />,
  objective: <Target size={14} />,
  key_result: <Target size={14} />,
  invitation: <Mail size={14} />,
  member: <User size={14} />,
  workspace: <Briefcase size={14} />,
};

const resourceLabels: Record<ActivityResource, string> = {
  task: 'タスク',
  prospect: 'リード',
  client: 'クライアント',
  brand: 'ブランド',
  objective: '目標',
  key_result: '成果指標',
  invitation: '招待',
  member: 'メンバー',
  workspace: 'ワークスペース',
};

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'たった今';
  if (minutes < 60) return `${minutes}分前`;
  if (hours < 24) return `${hours}時間前`;
  if (days < 7) return `${days}日前`;

  return date.toLocaleDateString('ja-JP', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ActivityTimeline({ logs, loading, hasMore, onLoadMore }: ActivityTimelineProps) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    const [entry] = entries;
    if (entry.isIntersecting && hasMore && !loading) {
      onLoadMore();
    }
  }, [hasMore, loading, onLoadMore]);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: '100px',
      threshold: 0,
    });

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [handleObserver]);

  if (logs.length === 0 && !loading) {
    return (
      <div className="activity-empty">
        アクティビティがありません
      </div>
    );
  }

  return (
    <div className="activity-timeline">
      {logs.map((log) => (
        <div key={log.id} className="activity-item">
          <div className={`activity-icon activity-icon--${log.action}`}>
            {actionIcons[log.action]}
          </div>
          <div className="activity-content">
            <div className="activity-header">
              <span className="activity-user">
                {log.user_name || log.user_email || '不明なユーザー'}
              </span>
              <span className="activity-action">
                が {resourceLabels[log.resource_type]} を{actionLabels[log.action]}
              </span>
            </div>
            {log.details && typeof log.details === 'object' && 'name' in log.details && (
              <div className="activity-details">
                <span className="activity-resource-name">
                  {resourceIcons[log.resource_type]}
                  {String(log.details.name)}
                </span>
              </div>
            )}
            <div className="activity-time">{formatTime(log.created_at)}</div>
          </div>
        </div>
      ))}

      <div ref={loadMoreRef} className="activity-load-more">
        {loading && (
          <div className="activity-loading">
            <Loader2 size={20} className="animate-spin" />
            <span>読み込み中...</span>
          </div>
        )}
      </div>
    </div>
  );
}
