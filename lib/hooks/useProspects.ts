'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import {
  fetchProspects,
  createProspect,
  updateProspect,
  updateProspectStatus,
  deleteProspect,
} from '@/lib/api/prospects';
import type {
  Prospect,
  ProspectStatus,
  CreateProspectInput,
  UpdateProspectInput,
  KANBAN_STATUSES,
} from '@/lib/types/prospect';

export type ViewMode = 'kanban' | 'list';

export function useProspects() {
  const { user } = useAuth();
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [statusFilter, setStatusFilter] = useState<ProspectStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');

  // リード取得
  const loadProspects = useCallback(async () => {
    if (!user) {
      setProspects([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const data = await fetchProspects(
        statusFilter !== 'all' ? statusFilter : undefined,
        searchQuery || undefined
      );
      setProspects(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('リードの取得に失敗しました'));
    } finally {
      setIsLoading(false);
    }
  }, [user, statusFilter, searchQuery]);

  // 初期読み込みとフィルター変更時の再読み込み
  useEffect(() => {
    loadProspects();
  }, [loadProspects]);

  // リード追加
  const addProspect = useCallback(
    async (input: CreateProspectInput) => {
      if (!user) return;

      try {
        const newProspect = await createProspect(input);
        setProspects((prev) => [newProspect, ...prev]);
        return newProspect;
      } catch (err) {
        setError(err instanceof Error ? err : new Error('リードの作成に失敗しました'));
        throw err;
      }
    },
    [user]
  );

  // リード更新
  const handleUpdateProspect = useCallback(
    async (id: string, input: UpdateProspectInput) => {
      try {
        const updated = await updateProspect(id, input);
        setProspects((prev) =>
          prev.map((p) => (p.id === id ? updated : p))
        );
        return updated;
      } catch (err) {
        setError(err instanceof Error ? err : new Error('リードの更新に失敗しました'));
        throw err;
      }
    },
    []
  );

  // ステータス更新（Kanban用）
  const handleUpdateStatus = useCallback(
    async (id: string, status: ProspectStatus) => {
      try {
        const updated = await updateProspectStatus(id, status);
        setProspects((prev) =>
          prev.map((p) => (p.id === id ? updated : p))
        );
        return updated;
      } catch (err) {
        setError(err instanceof Error ? err : new Error('ステータスの更新に失敗しました'));
        throw err;
      }
    },
    []
  );

  // リード削除
  const handleDeleteProspect = useCallback(async (id: string) => {
    try {
      await deleteProspect(id);
      setProspects((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err : new Error('リードの削除に失敗しました'));
      throw err;
    }
  }, []);

  // ステータス別にグループ化（Kanban用）
  const prospectsByStatus = useMemo(() => {
    const grouped: Record<ProspectStatus, Prospect[]> = {
      new: [],
      approaching: [],
      negotiating: [],
      proposing: [],
      won: [],
      lost: [],
    };

    for (const prospect of prospects) {
      grouped[prospect.status].push(prospect);
    }

    return grouped;
  }, [prospects]);

  // 統計情報
  const stats = useMemo(
    () => ({
      total: prospects.length,
      new: prospects.filter((p) => p.status === 'new').length,
      approaching: prospects.filter((p) => p.status === 'approaching').length,
      negotiating: prospects.filter((p) => p.status === 'negotiating').length,
      proposing: prospects.filter((p) => p.status === 'proposing').length,
      won: prospects.filter((p) => p.status === 'won').length,
      lost: prospects.filter((p) => p.status === 'lost').length,
    }),
    [prospects]
  );

  return {
    prospects,
    prospectsByStatus,
    isLoading,
    error,
    statusFilter,
    searchQuery,
    viewMode,
    stats,
    addProspect,
    updateProspect: handleUpdateProspect,
    updateStatus: handleUpdateStatus,
    deleteProspect: handleDeleteProspect,
    setStatusFilter,
    setSearchQuery,
    setViewMode,
    reload: loadProspects,
  };
}
