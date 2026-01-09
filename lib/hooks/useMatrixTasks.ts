'use client';

/**
 * lib/hooks/useMatrixTasks.ts
 *
 * 4象限マトリクス用タスク管理 Hook
 */

import { useState, useEffect, useCallback } from 'react';
import type { Task, Suit } from '@/lib/types/task';

interface MatrixTasks {
  spade: Task[];
  heart: Task[];
  diamond: Task[];
  club: Task[];
  unassigned: Task[];
}

interface UseMatrixTasksOptions {
  includeCompleted?: boolean;
  autoFetch?: boolean;
}

export function useMatrixTasks(options: UseMatrixTasksOptions = {}) {
  const { includeCompleted = false, autoFetch = true } = options;

  const [tasks, setTasks] = useState<MatrixTasks>({
    spade: [],
    heart: [],
    diamond: [],
    club: [],
    unassigned: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (includeCompleted) {
        params.set('includeCompleted', 'true');
      }

      const response = await fetch(`/api/tasks/by-suit?${params}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch tasks');
      }

      const data = await response.json();
      setTasks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [includeCompleted]);

  useEffect(() => {
    if (autoFetch) {
      fetchTasks();
    }
  }, [fetchTasks, autoFetch]);

  // タスクの象限を更新
  const updateTaskSuit = useCallback(async (taskId: string, newSuit: Suit) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/suit`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ suit: newSuit }),
      });

      if (!response.ok) {
        throw new Error('Failed to update task suit');
      }

      const updatedTask = await response.json();

      // ローカルステートを更新
      setTasks(prev => {
        const newTasks = { ...prev };

        // 全象限から該当タスクを削除
        for (const suit of ['spade', 'heart', 'diamond', 'club', 'unassigned'] as const) {
          newTasks[suit] = newTasks[suit].filter(t => t.id !== taskId);
        }

        // 新しい象限に追加
        newTasks[newSuit] = [updatedTask, ...newTasks[newSuit]];

        return newTasks;
      });

      return updatedTask;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  }, []);

  // イベントからタスク作成
  const createTaskFromEvent = useCallback(async (
    eventId: string,
    eventSummary: string,
    suit: Suit,
    eventDescription?: string,
    eventStart?: string
  ) => {
    try {
      const response = await fetch('/api/tasks/from-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          eventId,
          eventSummary,
          eventDescription,
          eventStart,
          suit,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create task');
      }

      const newTask = await response.json();

      // ローカルステートを更新
      setTasks(prev => ({
        ...prev,
        [suit]: [newTask, ...prev[suit]],
      }));

      return newTask;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  }, []);

  // 各象限のタスク数
  const counts = {
    spade: tasks.spade.length,
    heart: tasks.heart.length,
    diamond: tasks.diamond.length,
    club: tasks.club.length,
    unassigned: tasks.unassigned.length,
    total: tasks.spade.length + tasks.heart.length + tasks.diamond.length + tasks.club.length,
  };

  return {
    tasks,
    counts,
    isLoading,
    error,
    refetch: fetchTasks,
    updateTaskSuit,
    createTaskFromEvent,
  };
}
