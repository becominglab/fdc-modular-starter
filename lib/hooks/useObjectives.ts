'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import type { Objective, CreateObjectiveInput, UpdateObjectiveInput } from '@/lib/types/okr';

export function useObjectives() {
  const { user } = useAuth();
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadObjectives = useCallback(async () => {
    if (!user) {
      setObjectives([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch('/api/objectives', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('取得に失敗しました');
      const data = await response.json();
      setObjectives(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('エラーが発生しました'));
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadObjectives();
  }, [loadObjectives]);

  const addObjective = useCallback(async (input: CreateObjectiveInput) => {
    const response = await fetch('/api/objectives', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      credentials: 'include',
    });
    if (!response.ok) throw new Error('作成に失敗しました');
    const newObj = await response.json();
    setObjectives(prev => [newObj, ...prev]);
    return newObj;
  }, []);

  const updateObjective = useCallback(async (id: string, input: UpdateObjectiveInput) => {
    const response = await fetch(`/api/objectives/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      credentials: 'include',
    });
    if (!response.ok) throw new Error('更新に失敗しました');
    const updated = await response.json();
    setObjectives(prev => prev.map(o => o.id === id ? { ...o, ...updated } : o));
    return updated;
  }, []);

  const deleteObjective = useCallback(async (id: string) => {
    const response = await fetch(`/api/objectives/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!response.ok) throw new Error('削除に失敗しました');
    setObjectives(prev => prev.filter(o => o.id !== id));
  }, []);

  return {
    objectives,
    isLoading,
    error,
    addObjective,
    updateObjective,
    deleteObjective,
    reload: loadObjectives,
  };
}
