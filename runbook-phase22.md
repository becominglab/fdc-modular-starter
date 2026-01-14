# Phase 22: アクティビティログ（タイムライン表示）

## 概要

ワークスペース内のアクティビティをタイムライン形式で表示。
既存の `audit_logs` テーブルを活用し、ユーザーの操作履歴を可視化。

## 機能

- アクティビティタイムライン表示
- アクション種別フィルター
- 日付範囲フィルター
- ユーザー別フィルター
- 無限スクロール（ページネーション）

## 実装ステップ

### Step 1: 型定義の作成

```typescript
// lib/types/activity.ts

export type ActivityAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'invite'
  | 'accept'
  | 'reject'
  | 'login'
  | 'logout';

export type ActivityResource =
  | 'task'
  | 'prospect'
  | 'client'
  | 'brand'
  | 'objective'
  | 'key_result'
  | 'invitation'
  | 'member'
  | 'workspace';

export interface ActivityLog {
  id: string;
  workspace_id: string;
  user_id: string;
  action: ActivityAction;
  resource_type: ActivityResource;
  resource_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
  // Joined data
  user_email?: string;
  user_name?: string;
}

export interface ActivityFilters {
  action?: ActivityAction;
  resource_type?: ActivityResource;
  user_id?: string;
  from_date?: string;
  to_date?: string;
}

export interface ActivityResponse {
  logs: ActivityLog[];
  hasMore: boolean;
  nextCursor: string | null;
}
```

### Step 2: API 作成

```typescript
// app/api/workspaces/[workspaceId]/activity/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const { workspaceId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const cursor = searchParams.get('cursor');
    const action = searchParams.get('action');
    const resourceType = searchParams.get('resource_type');
    const userId = searchParams.get('user_id');
    const fromDate = searchParams.get('from_date');
    const toDate = searchParams.get('to_date');

    const serviceClient = createServiceClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (serviceClient as any)
      .from('audit_logs')
      .select(`
        id,
        workspace_id,
        user_id,
        action,
        resource_type,
        resource_id,
        details,
        created_at
      `)
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(limit + 1);

    // Filters
    if (action) {
      query = query.eq('action', action);
    }
    if (resourceType) {
      query = query.eq('resource_type', resourceType);
    }
    if (userId) {
      query = query.eq('user_id', userId);
    }
    if (fromDate) {
      query = query.gte('created_at', fromDate);
    }
    if (toDate) {
      query = query.lte('created_at', toDate);
    }
    if (cursor) {
      query = query.lt('created_at', cursor);
    }

    const { data: logs, error } = await query;

    if (error) {
      console.error('Activity fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 500 });
    }

    const hasMore = logs.length > limit;
    const results = hasMore ? logs.slice(0, limit) : logs;
    const nextCursor = hasMore ? results[results.length - 1].created_at : null;

    // Get user info for each log
    const userIds = [...new Set(results.map((log: { user_id: string }) => log.user_id))];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profiles } = await (serviceClient as any)
      .from('profiles')
      .select('id, email, full_name')
      .in('id', userIds);

    const profileMap = new Map(
      (profiles || []).map((p: { id: string; email: string; full_name: string | null }) => [
        p.id,
        { email: p.email, name: p.full_name }
      ])
    );

    const logsWithUser = results.map((log: { user_id: string }) => ({
      ...log,
      user_email: profileMap.get(log.user_id)?.email,
      user_name: profileMap.get(log.user_id)?.name,
    }));

    return NextResponse.json({
      logs: logsWithUser,
      hasMore,
      nextCursor,
    });
  } catch (error) {
    console.error('Activity GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### Step 3: フック作成

```typescript
// lib/hooks/useActivity.ts

'use client';

import { useState, useCallback } from 'react';
import type { ActivityLog, ActivityFilters, ActivityResponse } from '@/lib/types/activity';

export function useActivity(workspaceId: string) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);
  const [filters, setFilters] = useState<ActivityFilters>({});

  const buildUrl = useCallback((cursor: string | null) => {
    const params = new URLSearchParams();
    params.set('limit', '20');
    if (cursor) params.set('cursor', cursor);
    if (filters.action) params.set('action', filters.action);
    if (filters.resource_type) params.set('resource_type', filters.resource_type);
    if (filters.user_id) params.set('user_id', filters.user_id);
    if (filters.from_date) params.set('from_date', filters.from_date);
    if (filters.to_date) params.set('to_date', filters.to_date);
    return `/api/workspaces/${workspaceId}/activity?${params.toString()}`;
  }, [workspaceId, filters]);

  const fetchLogs = useCallback(async (reset = false) => {
    if (loading) return;

    setLoading(true);
    try {
      const currentCursor = reset ? null : cursor;
      const res = await fetch(buildUrl(currentCursor));

      if (!res.ok) throw new Error('Failed to fetch');

      const data: ActivityResponse = await res.json();

      setLogs(prev => reset ? data.logs : [...prev, ...data.logs]);
      setHasMore(data.hasMore);
      setCursor(data.nextCursor);
    } catch (error) {
      console.error('Activity fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, [loading, cursor, buildUrl]);

  const applyFilters = useCallback((newFilters: ActivityFilters) => {
    setFilters(newFilters);
    setCursor(null);
    setLogs([]);
    setHasMore(true);
  }, []);

  const loadMore = useCallback(() => {
    if (hasMore && !loading) {
      fetchLogs(false);
    }
  }, [hasMore, loading, fetchLogs]);

  const refresh = useCallback(() => {
    fetchLogs(true);
  }, [fetchLogs]);

  return {
    logs,
    loading,
    hasMore,
    filters,
    applyFilters,
    loadMore,
    refresh,
  };
}
```

### Step 4: コンポーネント作成

```typescript
// components/activity/ActivityTimeline.tsx

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
            {log.details && (
              <div className="activity-details">
                {typeof log.details === 'object' && 'name' in log.details && (
                  <span className="activity-resource-name">
                    {resourceIcons[log.resource_type]}
                    {String(log.details.name)}
                  </span>
                )}
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
```

```typescript
// components/activity/ActivityFilters.tsx

'use client';

import { useState } from 'react';
import { Filter, X } from 'lucide-react';
import type { ActivityFilters, ActivityAction, ActivityResource } from '@/lib/types/activity';

interface ActivityFiltersProps {
  filters: ActivityFilters;
  onApply: (filters: ActivityFilters) => void;
}

const actions: { value: ActivityAction; label: string }[] = [
  { value: 'create', label: '作成' },
  { value: 'update', label: '更新' },
  { value: 'delete', label: '削除' },
  { value: 'invite', label: '招待' },
  { value: 'accept', label: '承認' },
];

const resources: { value: ActivityResource; label: string }[] = [
  { value: 'task', label: 'タスク' },
  { value: 'prospect', label: 'リード' },
  { value: 'client', label: 'クライアント' },
  { value: 'objective', label: '目標' },
  { value: 'invitation', label: '招待' },
];

export function ActivityFiltersComponent({ filters, onApply }: ActivityFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState<ActivityFilters>(filters);

  const handleApply = () => {
    onApply(localFilters);
    setIsOpen(false);
  };

  const handleClear = () => {
    setLocalFilters({});
    onApply({});
    setIsOpen(false);
  };

  const hasFilters = Object.values(filters).some(v => v !== undefined);

  return (
    <div className="activity-filters">
      <button
        className={`btn btn-secondary btn-small ${hasFilters ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <Filter size={16} />
        フィルター
        {hasFilters && <span className="filter-badge" />}
      </button>

      {isOpen && (
        <div className="activity-filters-dropdown">
          <div className="filter-group">
            <label>アクション</label>
            <select
              value={localFilters.action || ''}
              onChange={(e) => setLocalFilters(prev => ({
                ...prev,
                action: e.target.value as ActivityAction || undefined
              }))}
              className="input"
            >
              <option value="">すべて</option>
              {actions.map(a => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>リソース</label>
            <select
              value={localFilters.resource_type || ''}
              onChange={(e) => setLocalFilters(prev => ({
                ...prev,
                resource_type: e.target.value as ActivityResource || undefined
              }))}
              className="input"
            >
              <option value="">すべて</option>
              {resources.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>期間</label>
            <div className="date-range">
              <input
                type="date"
                value={localFilters.from_date || ''}
                onChange={(e) => setLocalFilters(prev => ({
                  ...prev,
                  from_date: e.target.value || undefined
                }))}
                className="input"
              />
              <span>〜</span>
              <input
                type="date"
                value={localFilters.to_date || ''}
                onChange={(e) => setLocalFilters(prev => ({
                  ...prev,
                  to_date: e.target.value || undefined
                }))}
                className="input"
              />
            </div>
          </div>

          <div className="filter-actions">
            <button className="btn btn-secondary btn-small" onClick={handleClear}>
              <X size={14} />
              クリア
            </button>
            <button className="btn btn-primary btn-small" onClick={handleApply}>
              適用
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

### Step 5: ページ作成

```typescript
// app/(app)/activity/page.tsx

'use client';

import { useEffect } from 'react';
import { Activity, RefreshCw } from 'lucide-react';
import { useWorkspace } from '@/lib/contexts/WorkspaceContext';
import { useActivity } from '@/lib/hooks/useActivity';
import { ActivityTimeline } from '@/components/activity/ActivityTimeline';
import { ActivityFiltersComponent } from '@/components/activity/ActivityFilters';

export default function ActivityPage() {
  const { currentWorkspace } = useWorkspace();
  const {
    logs,
    loading,
    hasMore,
    filters,
    applyFilters,
    loadMore,
    refresh,
  } = useActivity(currentWorkspace?.id || '');

  useEffect(() => {
    if (currentWorkspace?.id) {
      refresh();
    }
  }, [currentWorkspace?.id, refresh]);

  if (!currentWorkspace) {
    return <div className="loading">ワークスペースを選択してください</div>;
  }

  return (
    <div className="activity-page">
      <header className="page-header">
        <div className="page-header-left">
          <Activity size={24} />
          <h1>アクティビティ</h1>
        </div>
        <div className="page-header-right">
          <ActivityFiltersComponent filters={filters} onApply={applyFilters} />
          <button
            className="btn btn-secondary btn-small"
            onClick={refresh}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            更新
          </button>
        </div>
      </header>

      <ActivityTimeline
        logs={logs}
        loading={loading}
        hasMore={hasMore}
        onLoadMore={loadMore}
      />
    </div>
  );
}
```

### Step 6: ナビゲーション更新

`app/(app)/layout.tsx` に追加:

```typescript
import { Activity } from 'lucide-react';

// NAV_ITEMS に追加
{ href: '/activity', label: 'アクティビティ', icon: Activity },
```

### Step 7: CSS スタイル追加

```css
/* Activity Page Styles */
.activity-page {
  max-width: 800px;
  margin: 0 auto;
}

.activity-page .page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.activity-page .page-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.activity-page .page-header-left h1 {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-dark);
}

.activity-page .page-header-right {
  display: flex;
  gap: 8px;
}

/* Activity Timeline */
.activity-timeline {
  background: var(--bg-white);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
}

.activity-item {
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-light);
}

.activity-item:last-child {
  border-bottom: none;
}

.activity-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: white;
}

.activity-icon--create { background: var(--success); }
.activity-icon--update { background: var(--primary); }
.activity-icon--delete { background: var(--danger); }
.activity-icon--invite { background: var(--warning); }
.activity-icon--accept { background: var(--success); }
.activity-icon--reject { background: var(--danger); }
.activity-icon--login { background: var(--primary); }
.activity-icon--logout { background: var(--text-muted); }

.activity-content {
  flex: 1;
  min-width: 0;
}

.activity-header {
  font-size: 14px;
  color: var(--text-medium);
}

.activity-user {
  font-weight: 600;
  color: var(--text-dark);
}

.activity-details {
  margin-top: 4px;
}

.activity-resource-name {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  background: var(--bg-gray);
  border-radius: 4px;
  font-size: 13px;
  color: var(--text-medium);
}

.activity-time {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 4px;
}

.activity-empty {
  padding: 60px 20px;
  text-align: center;
  color: var(--text-muted);
  background: var(--bg-white);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.activity-load-more {
  padding: 16px;
}

.activity-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--text-muted);
  font-size: 14px;
}

/* Activity Filters */
.activity-filters {
  position: relative;
}

.activity-filters .btn.active {
  background: var(--primary-alpha-10);
  color: var(--primary);
}

.filter-badge {
  width: 8px;
  height: 8px;
  background: var(--primary);
  border-radius: 50%;
  margin-left: 4px;
}

.activity-filters-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 8px;
  background: var(--bg-white);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 16px;
  min-width: 280px;
  z-index: 100;
}

.filter-group {
  margin-bottom: 12px;
}

.filter-group label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-medium);
  margin-bottom: 4px;
}

.date-range {
  display: flex;
  align-items: center;
  gap: 8px;
}

.date-range input {
  flex: 1;
}

.date-range span {
  color: var(--text-muted);
}

.filter-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--border-light);
}
```

### Step 8: 型チェック & ビルド

```bash
npm run type-check
npm run build
```

### Step 9: 動作確認

1. `/activity` ページにアクセス
2. タイムラインが表示される
3. フィルターが機能する
4. 無限スクロールが動作する

### Step 10: Git プッシュ

```bash
git add -A
git commit -m "Phase 22: アクティビティログ（タイムライン表示）を実装"
git push origin main
```

## チェックリスト

- [ ] Step 1: 型定義の作成
- [ ] Step 2: API 作成
- [ ] Step 3: フック作成
- [ ] Step 4: コンポーネント作成
- [ ] Step 5: ページ作成
- [ ] Step 6: ナビゲーション更新
- [ ] Step 7: CSS スタイル追加
- [ ] Step 8: 型チェック & ビルド
- [ ] Step 9: 動作確認
- [ ] Step 10: Git プッシュ
