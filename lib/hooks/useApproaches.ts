/**
 * lib/hooks/useApproaches.ts
 *
 * アプローチ管理用カスタムフック（PDCA対応版）
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import type {
  Approach,
  CreateApproachInput,
  UpdateApproachInput,
  ApproachStats,
  ApproachGoal,
  CreateGoalInput,
} from '@/lib/types/approach';
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

// 初期統計値
const initialStats: ApproachStats = {
  total: 0,
  thisMonth: 0,
  thisWeek: 0,
  byType: { call: 0, email: 0, meeting: 0, visit: 0, other: 0 },
  successRate: 0,
  byResultStatus: { success: 0, pending: 0, failed: 0 },
  weeklyGoal: null,
  monthlyGoal: null,
  weeklyAchievementRate: null,
  monthlyAchievementRate: null,
};

export function useApproaches(options: UseApproachesOptions = {}) {
  const { prospectId } = options;
  const [approaches, setApproaches] = useState<Approach[]>([]);
  const [stats, setStats] = useState<ApproachStats>(initialStats);
  const [goals, setGoals] = useState<ApproachGoal[]>([]);
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

  // 目標取得
  const loadGoals = useCallback(async () => {
    try {
      const response = await fetch('/api/approaches/goals');
      if (response.ok) {
        const data = await response.json();
        setGoals(data);
      }
    } catch (err) {
      console.error('Goals load error:', err);
    }
  }, []);

  // 初回読み込み
  useEffect(() => {
    loadApproaches();
    loadStats();
    loadGoals();
  }, [loadApproaches, loadStats, loadGoals]);

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
    await loadStats();
    return updated;
  }, [loadStats]);

  // アプローチ削除
  const deleteApproach = useCallback(async (id: string) => {
    await deleteApproachApi(id);
    setApproaches((prev) => prev.filter((a) => a.id !== id));
    await loadStats();
  }, [loadStats]);

  // 目標設定
  const setGoal = useCallback(async (input: CreateGoalInput) => {
    const response = await fetch('/api/approaches/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '目標の設定に失敗しました');
    }
    const newGoal = await response.json();
    await loadGoals();
    await loadStats();
    return newGoal;
  }, [loadGoals, loadStats]);

  return {
    approaches,
    stats,
    goals,
    isLoading,
    error,
    addApproach,
    updateApproach,
    deleteApproach,
    setGoal,
    refresh: loadApproaches,
    refreshStats: loadStats,
  };
}
