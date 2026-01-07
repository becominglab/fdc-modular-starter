/**
 * lib/hooks/useApproaches.ts
 *
 * アプローチ管理用カスタムフック
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Approach, CreateApproachInput, UpdateApproachInput, ApproachStats } from '@/lib/types/approach';
import {
  fetchApproaches,
  createApproach,
  updateApproach as updateApproachApi,
  deleteApproach as deleteApproachApi,
  fetchApproachStats,
} from '@/lib/api/approaches';

interface UseApproachesOptions {
  prospectId?: string;
}

export function useApproaches(options: UseApproachesOptions = {}) {
  const { prospectId } = options;
  const [approaches, setApproaches] = useState<Approach[]>([]);
  const [stats, setStats] = useState<ApproachStats>({
    total: 0,
    thisMonth: 0,
    thisWeek: 0,
    byType: { call: 0, email: 0, meeting: 0, visit: 0, other: 0 },
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // アプローチ一覧取得
  const loadApproaches = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchApproaches(prospectId);
      setApproaches(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('取得に失敗しました'));
    } finally {
      setIsLoading(false);
    }
  }, [prospectId]);

  // 統計取得
  const loadStats = useCallback(async () => {
    try {
      const data = await fetchApproachStats();
      setStats(data);
    } catch (err) {
      console.error('Stats load error:', err);
    }
  }, []);

  // 初回読み込み
  useEffect(() => {
    loadApproaches();
    loadStats();
  }, [loadApproaches, loadStats]);

  // アプローチ追加
  const addApproach = useCallback(async (input: CreateApproachInput) => {
    const newApproach = await createApproach(input);
    setApproaches((prev) => [newApproach, ...prev]);
    await loadStats();
    return newApproach;
  }, [loadStats]);

  // アプローチ更新
  const updateApproach = useCallback(async (id: string, input: UpdateApproachInput) => {
    const updated = await updateApproachApi(id, input);
    setApproaches((prev) =>
      prev.map((a) => (a.id === id ? updated : a))
    );
    return updated;
  }, []);

  // アプローチ削除
  const deleteApproach = useCallback(async (id: string) => {
    await deleteApproachApi(id);
    setApproaches((prev) => prev.filter((a) => a.id !== id));
    await loadStats();
  }, [loadStats]);

  return {
    approaches,
    stats,
    isLoading,
    error,
    addApproach,
    updateApproach,
    deleteApproach,
    refresh: loadApproaches,
  };
}
