'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import type { ActionMap, CreateActionMapInput, UpdateActionMapInput } from '@/lib/types/action-map';

export function useActionMaps() {
  const { user } = useAuth();
  const [actionMaps, setActionMaps] = useState<ActionMap[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadActionMaps = useCallback(async (includeArchived = false) => {
    if (!user) {
      setActionMaps([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const url = `/api/action-maps${includeArchived ? '?include_archived=true' : ''}`;
      const response = await fetch(url, { credentials: 'include' });

      if (!response.ok) {
        throw new Error('ActionMapsの取得に失敗しました');
      }

      const data = await response.json();
      setActionMaps(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('エラーが発生しました'));
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadActionMaps();
  }, [loadActionMaps]);

  const createActionMap = useCallback(async (input: CreateActionMapInput) => {
    const response = await fetch('/api/action-maps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || '作成に失敗しました');
    }

    const newMap = await response.json();
    setActionMaps(prev => [newMap, ...prev]);
    return newMap;
  }, []);

  const updateActionMap = useCallback(async (id: string, input: UpdateActionMapInput) => {
    const response = await fetch(`/api/action-maps/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('更新に失敗しました');
    }

    const updated = await response.json();
    setActionMaps(prev => prev.map(m => m.id === id ? { ...m, ...updated } : m));
    return updated;
  }, []);

  const deleteActionMap = useCallback(async (id: string) => {
    const response = await fetch(`/api/action-maps/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('削除に失敗しました');
    }

    setActionMaps(prev => prev.filter(m => m.id !== id));
  }, []);

  const archiveActionMap = useCallback(async (id: string) => {
    return updateActionMap(id, { is_archived: true });
  }, [updateActionMap]);

  return {
    actionMaps,
    isLoading,
    error,
    createActionMap,
    updateActionMap,
    deleteActionMap,
    archiveActionMap,
    reload: loadActionMaps,
  };
}
