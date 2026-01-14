/**
 * lib/hooks/useActivity.ts
 *
 * アクティビティログ取得フック（無限スクロール対応）
 */

'use client';

import { useState, useCallback, useRef } from 'react';
import type { ActivityLog, ActivityFilters, ActivityResponse } from '@/lib/types/activity';

export function useActivity(workspaceId: string) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);
  const [filters, setFilters] = useState<ActivityFilters>({});
  const filtersRef = useRef(filters);

  // filtersRef を更新
  filtersRef.current = filters;

  const buildUrl = useCallback((cursorVal: string | null, currentFilters: ActivityFilters) => {
    const params = new URLSearchParams();
    params.set('limit', '20');
    if (cursorVal) params.set('cursor', cursorVal);
    if (currentFilters.action) params.set('action', currentFilters.action);
    if (currentFilters.resource_type) params.set('resource_type', currentFilters.resource_type);
    if (currentFilters.user_id) params.set('user_id', currentFilters.user_id);
    if (currentFilters.from_date) params.set('from_date', currentFilters.from_date);
    if (currentFilters.to_date) params.set('to_date', currentFilters.to_date);
    return `/api/workspaces/${workspaceId}/activity?${params.toString()}`;
  }, [workspaceId]);

  const fetchLogs = useCallback(async (reset = false) => {
    if (!workspaceId) return;
    if (loading) return;

    setLoading(true);
    try {
      const currentCursor = reset ? null : cursor;
      const res = await fetch(buildUrl(currentCursor, filtersRef.current));

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
  }, [workspaceId, loading, cursor, buildUrl]);

  const applyFilters = useCallback((newFilters: ActivityFilters) => {
    setFilters(newFilters);
    filtersRef.current = newFilters;
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
    setCursor(null);
    setLogs([]);
    setHasMore(true);
    // fetchLogs will be called by useEffect in the page
  }, []);

  return {
    logs,
    loading,
    hasMore,
    filters,
    applyFilters,
    loadMore,
    refresh,
    fetchLogs,
  };
}
