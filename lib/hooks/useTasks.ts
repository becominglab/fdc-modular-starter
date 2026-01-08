'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import type { Task, Suit, TaskStatus, CreateTaskInput, UpdateTaskInput } from '@/lib/types/task';

export function useTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // タスク取得
  const loadTasks = useCallback(async () => {
    if (!user) {
      setTasks([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch('/api/tasks?include_joker=true');
      if (!response.ok) {
        throw new Error('タスクの取得に失敗しました');
      }
      const data = await response.json();
      setTasks(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('エラーが発生しました'));
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // タスク作成
  const addTask = useCallback(async (input: CreateTaskInput) => {
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        throw new Error('タスクの作成に失敗しました');
      }
      const newTask = await response.json();
      setTasks(prev => [newTask, ...prev]);
      return newTask;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('エラーが発生しました'));
      throw err;
    }
  }, []);

  // タスク更新
  const updateTask = useCallback(async (id: string, input: UpdateTaskInput) => {
    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        throw new Error('タスクの更新に失敗しました');
      }
      const updated = await response.json();
      setTasks(prev => prev.map(t => t.id === id ? updated : t));
      return updated;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('エラーが発生しました'));
      throw err;
    }
  }, []);

  // Suit更新（ドラッグ&ドロップ用）
  const updateSuit = useCallback(async (id: string, suit: Suit | null) => {
    return updateTask(id, { suit: suit ?? undefined });
  }, [updateTask]);

  // ステータス更新
  const updateStatus = useCallback(async (id: string, status: TaskStatus) => {
    return updateTask(id, { status });
  }, [updateTask]);

  // タスク削除
  const deleteTask = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        throw new Error('タスクの削除に失敗しました');
      }
      setTasks(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err : new Error('エラーが発生しました'));
      throw err;
    }
  }, []);

  // Suit別グループ化
  const tasksBySuit = useMemo(() => {
    const grouped: Record<Suit | 'joker', Task[]> = {
      spade: [],
      heart: [],
      diamond: [],
      club: [],
      joker: [],
    };

    for (const task of tasks) {
      if (task.suit) {
        grouped[task.suit].push(task);
      } else {
        grouped.joker.push(task);
      }
    }

    return grouped;
  }, [tasks]);

  // 統計情報
  const stats = useMemo(() => ({
    total: tasks.length,
    byStatus: {
      not_started: tasks.filter(t => t.status === 'not_started').length,
      in_progress: tasks.filter(t => t.status === 'in_progress').length,
      done: tasks.filter(t => t.status === 'done').length,
    },
    bySuit: {
      spade: tasks.filter(t => t.suit === 'spade').length,
      heart: tasks.filter(t => t.suit === 'heart').length,
      diamond: tasks.filter(t => t.suit === 'diamond').length,
      club: tasks.filter(t => t.suit === 'club').length,
      joker: tasks.filter(t => !t.suit).length,
    },
  }), [tasks]);

  return {
    tasks,
    tasksBySuit,
    stats,
    isLoading,
    error,
    addTask,
    updateTask,
    updateSuit,
    updateStatus,
    deleteTask,
    reload: loadTasks,
  };
}
