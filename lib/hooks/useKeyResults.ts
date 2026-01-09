'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import type { KeyResult, CreateKeyResultInput, UpdateKeyResultInput } from '@/lib/types/okr';

export function useKeyResults(objectiveId: string | null) {
  const { user } = useAuth();
  const [keyResults, setKeyResults] = useState<KeyResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadKeyResults = useCallback(async () => {
    if (!user || !objectiveId) {
      setKeyResults([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`/api/objectives/${objectiveId}/key-results`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('取得に失敗しました');
      const data = await response.json();
      setKeyResults(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('エラーが発生しました'));
    } finally {
      setIsLoading(false);
    }
  }, [user, objectiveId]);

  useEffect(() => {
    loadKeyResults();
  }, [loadKeyResults]);

  const addKeyResult = useCallback(async (input: Omit<CreateKeyResultInput, 'objective_id'>) => {
    if (!objectiveId) throw new Error('Objective IDが必要です');
    const response = await fetch(`/api/objectives/${objectiveId}/key-results`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...input, objective_id: objectiveId }),
      credentials: 'include',
    });
    if (!response.ok) throw new Error('作成に失敗しました');
    const newKr = await response.json();
    setKeyResults(prev => [...prev, newKr]);
    return newKr;
  }, [objectiveId]);

  const updateKeyResult = useCallback(async (id: string, input: UpdateKeyResultInput) => {
    const response = await fetch(`/api/key-results/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      credentials: 'include',
    });
    if (!response.ok) throw new Error('更新に失敗しました');
    const updated = await response.json();
    setKeyResults(prev => prev.map(kr => kr.id === id ? { ...kr, ...updated } : kr));
    return updated;
  }, []);

  const deleteKeyResult = useCallback(async (id: string) => {
    const response = await fetch(`/api/key-results/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!response.ok) throw new Error('削除に失敗しました');
    setKeyResults(prev => prev.filter(kr => kr.id !== id));
  }, []);

  return {
    keyResults,
    isLoading,
    error,
    addKeyResult,
    updateKeyResult,
    deleteKeyResult,
    reload: loadKeyResults,
  };
}
