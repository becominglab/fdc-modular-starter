/**
 * app/(app)/activity/page.tsx
 *
 * アクティビティログページ
 */

'use client';

import { useEffect, useCallback, useMemo } from 'react';
import { Activity, RefreshCw } from 'lucide-react';
import { useCurrentWorkspace, useWorkspaces } from '@/lib/hooks/useWorkspace';
import { useActivity } from '@/lib/hooks/useActivity';
import { ActivityTimeline } from '@/components/activity/ActivityTimeline';
import { ActivityFiltersComponent } from '@/components/activity/ActivityFilters';

export default function ActivityPage() {
  const { currentWorkspaceId } = useCurrentWorkspace();
  const { workspaces } = useWorkspaces();

  const currentWorkspace = useMemo(() => {
    if (!currentWorkspaceId) return workspaces[0] || null;
    return workspaces.find(w => w.id === currentWorkspaceId) || workspaces[0] || null;
  }, [currentWorkspaceId, workspaces]);

  const {
    logs,
    loading,
    hasMore,
    filters,
    applyFilters,
    loadMore,
    refresh,
    fetchLogs,
  } = useActivity(currentWorkspace?.id || '');

  const handleRefresh = useCallback(() => {
    refresh();
  }, [refresh]);

  // Initial fetch and on refresh
  useEffect(() => {
    if (currentWorkspace?.id && logs.length === 0) {
      fetchLogs(true);
    }
  }, [currentWorkspace?.id, logs.length, fetchLogs]);

  // Fetch when filters change
  useEffect(() => {
    if (currentWorkspace?.id) {
      fetchLogs(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

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
