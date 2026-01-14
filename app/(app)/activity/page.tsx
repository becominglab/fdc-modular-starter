/**
 * app/(app)/activity/page.tsx
 *
 * アクティビティログページ
 */

'use client';

import { useEffect, useCallback, useState } from 'react';
import { Activity, RefreshCw, AlertCircle, Plus, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useActivity } from '@/lib/hooks/useActivity';
import { ActivityTimeline } from '@/components/activity/ActivityTimeline';
import { ActivityFiltersComponent } from '@/components/activity/ActivityFilters';

export default function ActivityPage() {
  const { user } = useAuth();
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [noWorkspace, setNoWorkspace] = useState(false);
  const [creating, setCreating] = useState(false);

  // ワークスペース作成
  const handleCreateWorkspace = async () => {
    if (creating) return;
    setCreating(true);
    try {
      const res = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'マイワークスペース',
          slug: `workspace-${Date.now()}`,
          description: '自動作成されたワークスペース',
        }),
      });
      if (res.ok) {
        const workspace = await res.json();
        setWorkspaceId(workspace.id);
        setNoWorkspace(false);
      }
    } catch (err) {
      console.error('Failed to create workspace:', err);
    } finally {
      setCreating(false);
    }
  };

  // ワークスペースを取得
  useEffect(() => {
    if (user?.id) {
      const fetchWorkspace = async () => {
        try {
          const res = await fetch('/api/workspaces');
          if (res.ok) {
            const data = await res.json();
            if (data.workspaces && data.workspaces.length > 0) {
              setWorkspaceId(data.workspaces[0].id);
            } else {
              setNoWorkspace(true);
            }
          }
        } catch {
          // エラー無視
        } finally {
          setPageLoading(false);
        }
      };
      fetchWorkspace();
    } else {
      // デモモードの場合
      const session = localStorage.getItem('fdc_session');
      if (session) {
        try {
          const parsed = JSON.parse(session);
          setWorkspaceId(parsed.workspaceId || 'demo-workspace');
        } catch {
          setWorkspaceId('demo-workspace');
        }
      }
      setPageLoading(false);
    }
  }, [user]);

  const {
    logs,
    loading,
    hasMore,
    filters,
    applyFilters,
    loadMore,
    refresh,
    fetchLogs,
  } = useActivity(workspaceId || '');

  const handleRefresh = useCallback(() => {
    refresh();
  }, [refresh]);

  // Initial fetch when workspaceId is set
  useEffect(() => {
    if (workspaceId) {
      fetchLogs(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  // ローディング中
  if (pageLoading) {
    return (
      <div className="activity-page">
        <div className="activity-empty">読み込み中...</div>
      </div>
    );
  }

  // ワークスペースが存在しない場合
  if (noWorkspace || !workspaceId) {
    return (
      <div className="activity-page">
        <header className="page-header">
          <div className="page-header-left">
            <Activity size={24} />
            <h1>アクティビティ</h1>
          </div>
        </header>
        <div className="activity-empty">
          <AlertCircle size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
          <h3 style={{ marginBottom: '8px' }}>ワークスペースがありません</h3>
          <p style={{ marginBottom: '20px' }}>ワークスペースを作成して、アクティビティを確認しましょう。</p>
          <button
            onClick={handleCreateWorkspace}
            disabled={creating}
            className="btn btn-primary"
          >
            {creating ? (
              <>
                <Loader2 className="animate-spin" size={16} />
                作成中...
              </>
            ) : (
              <>
                <Plus size={16} />
                ワークスペースを作成
              </>
            )}
          </button>
        </div>
      </div>
    );
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
            onClick={handleRefresh}
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
