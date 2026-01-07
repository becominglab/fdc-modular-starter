'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import {
  fetchClients,
  createClient,
  updateClient,
  deleteClient,
  convertProspectToClient,
} from '@/lib/api/clients';
import type {
  Client,
  CreateClientInput,
  UpdateClientInput,
  ConvertToClientInput,
} from '@/lib/types/client';

export function useClients() {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // クライアント取得
  const loadClients = useCallback(async () => {
    if (!user) {
      setClients([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const data = await fetchClients(searchQuery || undefined);
      setClients(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('クライアントの取得に失敗しました'));
    } finally {
      setIsLoading(false);
    }
  }, [user, searchQuery]);

  // 初期読み込みと検索変更時の再読み込み
  useEffect(() => {
    loadClients();
  }, [loadClients]);

  // クライアント追加
  const addClient = useCallback(
    async (input: CreateClientInput) => {
      if (!user) return;

      try {
        const newClient = await createClient(input);
        setClients((prev) => [newClient, ...prev]);
        return newClient;
      } catch (err) {
        setError(err instanceof Error ? err : new Error('クライアントの作成に失敗しました'));
        throw err;
      }
    },
    [user]
  );

  // クライアント更新
  const handleUpdateClient = useCallback(
    async (id: string, input: UpdateClientInput) => {
      try {
        const updated = await updateClient(id, input);
        setClients((prev) =>
          prev.map((c) => (c.id === id ? updated : c))
        );
        return updated;
      } catch (err) {
        setError(err instanceof Error ? err : new Error('クライアントの更新に失敗しました'));
        throw err;
      }
    },
    []
  );

  // クライアント削除
  const handleDeleteClient = useCallback(async (id: string) => {
    try {
      await deleteClient(id);
      setClients((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err : new Error('クライアントの削除に失敗しました'));
      throw err;
    }
  }, []);

  // リード→クライアント変換
  const handleConvertProspect = useCallback(
    async (input: ConvertToClientInput) => {
      try {
        const newClient = await convertProspectToClient(input);
        setClients((prev) => [newClient, ...prev]);
        return newClient;
      } catch (err) {
        setError(err instanceof Error ? err : new Error('クライアントへの変換に失敗しました'));
        throw err;
      }
    },
    []
  );

  // 統計情報
  const stats = useMemo(
    () => ({
      total: clients.length,
      thisMonth: clients.filter((c) => {
        const contractDate = new Date(c.contract_date);
        const now = new Date();
        return (
          contractDate.getMonth() === now.getMonth() &&
          contractDate.getFullYear() === now.getFullYear()
        );
      }).length,
    }),
    [clients]
  );

  return {
    clients,
    isLoading,
    error,
    searchQuery,
    stats,
    addClient,
    updateClient: handleUpdateClient,
    deleteClient: handleDeleteClient,
    convertProspect: handleConvertProspect,
    setSearchQuery,
    reload: loadClients,
  };
}
