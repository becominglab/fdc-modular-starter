'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import {
  fetchTasks,
  createTask,
  updateTask,
  deleteTask,
  toggleTask,
} from '@/lib/api/tasks';
import type { DbTask, DbTaskUpdate } from '@/lib/types/database';
import type { TaskFilter, TaskSort, SortOrder } from '@/lib/types/task';

export function useSupabaseTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<DbTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [filter, setFilter] = useState<TaskFilter>('all');
  const [sort, setSort] = useState<TaskSort>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // タスク取得
  const loadTasks = useCallback(async () => {
    if (!user) {
      setTasks([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const data = await fetchTasks();
      setTasks(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load tasks'));
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // 初期読み込み
  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // タスク追加
  const addTask = useCallback(
    async (title: string) => {
      if (!user) return;

      try {
        const newTask = await createTask(title, user.id);
        setTasks((prev) => [newTask, ...prev]);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to create task'));
        throw err;
      }
    },
    [user]
  );

  // タスク更新
  const handleUpdateTask = useCallback(
    async (id: string, updates: DbTaskUpdate) => {
      try {
        const updatedTask = await updateTask(id, updates);
        setTasks((prev) =>
          prev.map((task) => (task.id === id ? updatedTask : task))
        );
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to update task'));
        throw err;
      }
    },
    []
  );

  // タスク削除
  const handleDeleteTask = useCallback(async (id: string) => {
    try {
      await deleteTask(id);
      setTasks((prev) => prev.filter((task) => task.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to delete task'));
      throw err;
    }
  }, []);

  // タスク完了切り替え
  const handleToggleTask = useCallback(
    async (id: string) => {
      const task = tasks.find((t) => t.id === id);
      if (!task) return;

      try {
        const updatedTask = await toggleTask(id, !task.completed);
        setTasks((prev) => prev.map((t) => (t.id === id ? updatedTask : t)));
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to toggle task'));
        throw err;
      }
    },
    [tasks]
  );

  // ソート設定
  const handleSetSort = useCallback((newSort: TaskSort, newOrder: SortOrder) => {
    setSort(newSort);
    setSortOrder(newOrder);
  }, []);

  // フィルター・ソート済みタスク
  const filteredTasks = useMemo(() => {
    let result = [...tasks];

    // フィルター適用
    if (filter === 'pending') {
      result = result.filter((t) => !t.completed);
    } else if (filter === 'completed') {
      result = result.filter((t) => t.completed);
    }

    // ソート適用
    result.sort((a, b) => {
      const aValue =
        sort === 'createdAt'
          ? new Date(a.created_at).getTime()
          : new Date(a.updated_at).getTime();
      const bValue =
        sort === 'createdAt'
          ? new Date(b.created_at).getTime()
          : new Date(b.updated_at).getTime();
      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    });

    return result;
  }, [tasks, filter, sort, sortOrder]);

  // 統計情報
  const stats = useMemo(
    () => ({
      total: tasks.length,
      completed: tasks.filter((t) => t.completed).length,
      pending: tasks.filter((t) => !t.completed).length,
    }),
    [tasks]
  );

  return {
    tasks: filteredTasks,
    allTasks: tasks,
    isLoading,
    error,
    filter,
    sort,
    sortOrder,
    stats,
    addTask,
    updateTask: handleUpdateTask,
    deleteTask: handleDeleteTask,
    toggleTask: handleToggleTask,
    setFilter,
    setSort: handleSetSort,
    reload: loadTasks,
  };
}
