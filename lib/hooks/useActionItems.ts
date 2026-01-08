'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import type { ActionItem, CreateActionItemInput, UpdateActionItemInput } from '@/lib/types/action-map';

export function useActionItems(actionMapId: string | null) {
  const { user } = useAuth();
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadActionItems = useCallback(async () => {
    if (!user || !actionMapId) {
      setActionItems([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`/api/action-maps/${actionMapId}/items`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('ActionItemsの取得に失敗しました');
      }

      const data = await response.json();
      setActionItems(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('エラーが発生しました'));
    } finally {
      setIsLoading(false);
    }
  }, [user, actionMapId]);

  useEffect(() => {
    loadActionItems();
  }, [loadActionItems]);

  const createActionItem = useCallback(async (input: Omit<CreateActionItemInput, 'action_map_id'>) => {
    if (!actionMapId) throw new Error('ActionMap IDが必要です');

    const response = await fetch(`/api/action-maps/${actionMapId}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || '作成に失敗しました');
    }

    const newItem = await response.json();
    setActionItems(prev => [...prev, newItem]);
    return newItem;
  }, [actionMapId]);

  const updateActionItem = useCallback(async (id: string, input: UpdateActionItemInput) => {
    const response = await fetch(`/api/action-items/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('更新に失敗しました');
    }

    const updated = await response.json();
    setActionItems(prev => prev.map(item => item.id === id ? { ...item, ...updated } : item));
    return updated;
  }, []);

  const deleteActionItem = useCallback(async (id: string) => {
    const response = await fetch(`/api/action-items/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('削除に失敗しました');
    }

    setActionItems(prev => prev.filter(item => item.id !== id));
  }, []);

  const updateStatus = useCallback(async (id: string, status: ActionItem['status']) => {
    return updateActionItem(id, { status });
  }, [updateActionItem]);

  return {
    actionItems,
    isLoading,
    error,
    createActionItem,
    updateActionItem,
    deleteActionItem,
    updateStatus,
    reload: loadActionItems,
  };
}
