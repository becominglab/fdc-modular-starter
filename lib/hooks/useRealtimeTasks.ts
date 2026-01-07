'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
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
import type { ConnectionStatus } from '@/lib/types/realtime';

export function useRealtimeTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<DbTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [filter, setFilter] = useState<TaskFilter>('all');
  const [sort, setSort] = useState<TaskSort>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const supabaseRef = useRef(createClient());

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
      setLastSyncedAt(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load tasks'));
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Realtime サブスクリプション設定
  useEffect(() => {
    if (!user) {
      setConnectionStatus('disconnected');
      return;
    }

    setConnectionStatus('connecting');
    const supabase = supabaseRef.current;

    // チャンネル作成
    const channel = supabase
      .channel(`tasks:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tasks',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newTask = payload.new as DbTask;
          setTasks((prev) => {
            // 重複チェック（楽観的更新との競合防止）
            if (prev.some((t) => t.id === newTask.id)) {
              return prev;
            }
            return [newTask, ...prev];
          });
          setLastSyncedAt(new Date());
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tasks',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const updatedTask = payload.new as DbTask;
          setTasks((prev) =>
            prev.map((task) =>
              task.id === updatedTask.id ? updatedTask : task
            )
          );
          setLastSyncedAt(new Date());
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'tasks',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const deletedTask = payload.old as { id: string };
          setTasks((prev) =>
            prev.filter((task) => task.id !== deletedTask.id)
          );
          setLastSyncedAt(new Date());
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
        } else if (status === 'CLOSED') {
          setConnectionStatus('disconnected');
        } else if (status === 'CHANNEL_ERROR') {
          setConnectionStatus('error');
        }
      });

    channelRef.current = channel;

    // クリーンアップ
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user]);

  // 初期読み込み
  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // タスク追加（楽観的更新）
  const addTask = useCallback(
    async (title: string) => {
      if (!user) return;

      // 楽観的更新用の仮タスク
      const tempId = `temp-${Date.now()}`;
      const tempTask: DbTask = {
        id: tempId,
        user_id: user.id,
        title,
        completed: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // UIを即座に更新
      setTasks((prev) => [tempTask, ...prev]);

      try {
        const newTask = await createTask(title, user.id);
        // 仮タスクを実際のタスクに置き換え
        setTasks((prev) =>
          prev.map((task) => (task.id === tempId ? newTask : task))
        );
      } catch (err) {
        // エラー時は仮タスクを削除
        setTasks((prev) => prev.filter((task) => task.id !== tempId));
        setError(err instanceof Error ? err : new Error('Failed to create task'));
        throw err;
      }
    },
    [user]
  );

  // タスク更新（楽観的更新）
  const handleUpdateTask = useCallback(
    async (id: string, updates: DbTaskUpdate) => {
      // 元の状態を保存
      const originalTasks = tasks;

      // UIを即座に更新
      setTasks((prev) =>
        prev.map((task) =>
          task.id === id
            ? { ...task, ...updates, updated_at: new Date().toISOString() }
            : task
        )
      );

      try {
        await updateTask(id, updates);
      } catch (err) {
        // エラー時は元に戻す
        setTasks(originalTasks);
        setError(err instanceof Error ? err : new Error('Failed to update task'));
        throw err;
      }
    },
    [tasks]
  );

  // タスク削除（楽観的更新）
  const handleDeleteTask = useCallback(
    async (id: string) => {
      // 元の状態を保存
      const originalTasks = tasks;

      // UIを即座に更新
      setTasks((prev) => prev.filter((task) => task.id !== id));

      try {
        await deleteTask(id);
      } catch (err) {
        // エラー時は元に戻す
        setTasks(originalTasks);
        setError(err instanceof Error ? err : new Error('Failed to delete task'));
        throw err;
      }
    },
    [tasks]
  );

  // タスク完了切り替え（楽観的更新）
  const handleToggleTask = useCallback(
    async (id: string) => {
      const task = tasks.find((t) => t.id === id);
      if (!task) return;

      // 元の状態を保存
      const originalTasks = tasks;

      // UIを即座に更新
      setTasks((prev) =>
        prev.map((t) =>
          t.id === id
            ? { ...t, completed: !t.completed, updated_at: new Date().toISOString() }
            : t
        )
      );

      try {
        await toggleTask(id, !task.completed);
      } catch (err) {
        // エラー時は元に戻す
        setTasks(originalTasks);
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
    connectionStatus,
    lastSyncedAt,
    addTask,
    updateTask: handleUpdateTask,
    deleteTask: handleDeleteTask,
    toggleTask: handleToggleTask,
    setFilter,
    setSort: handleSetSort,
    reload: loadTasks,
  };
}
