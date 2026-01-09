'use client';

import { useState, useEffect, useCallback } from 'react';
import type { GoogleTask, GoogleTaskList } from '@/lib/types/google-api';

interface UseGoogleTasksOptions {
  listId?: string;
  showCompleted?: boolean;
  autoFetch?: boolean;
}

export function useGoogleTasks(options: UseGoogleTasksOptions = {}) {
  const { listId, showCompleted = false, autoFetch = true } = options;

  const [tasks, setTasks] = useState<GoogleTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(true);

  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (listId) params.set('listId', listId);
      if (showCompleted) params.set('showCompleted', 'true');

      const response = await fetch(`/api/google/tasks?${params}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        if (data.code === 'NOT_CONNECTED') {
          setIsConnected(false);
          setTasks([]);
          return;
        }
        throw new Error(data.error || 'Failed to fetch tasks');
      }

      const data = await response.json();
      setTasks(data);
      setIsConnected(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [listId, showCompleted]);

  useEffect(() => {
    if (autoFetch) {
      fetchTasks();
    }
  }, [fetchTasks, autoFetch]);

  return {
    tasks,
    isLoading,
    error,
    isConnected,
    refetch: fetchTasks,
  };
}

export function useGoogleTaskLists() {
  const [taskLists, setTaskLists] = useState<GoogleTaskList[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTaskLists = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/google/tasks/lists', {
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch task lists');
      }

      const data = await response.json();
      setTaskLists(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTaskLists();
  }, [fetchTaskLists]);

  return {
    taskLists,
    isLoading,
    error,
    refetch: fetchTaskLists,
  };
}
