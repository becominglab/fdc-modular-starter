'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Workspace, WorkspaceMember, WorkspaceRole } from '@/lib/types/workspace';

/**
 * ワークスペース一覧を取得するフック
 */
export function useWorkspaces() {
  const [workspaces, setWorkspaces] = useState<(Workspace & { role: WorkspaceRole })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkspaces = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/workspaces');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'ワークスペースの取得に失敗しました');
      }

      // データ構造を変換
      const formatted = data.map((item: { role: WorkspaceRole; workspace: Workspace }) => ({
        ...item.workspace,
        role: item.role,
      }));

      setWorkspaces(formatted);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  const createWorkspace = async (input: {
    name: string;
    slug: string;
    description?: string;
  }) => {
    try {
      const response = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'ワークスペースの作成に失敗しました');
      }

      // 新しいワークスペースを追加（オーナーとして）
      setWorkspaces(prev => [{ ...data, role: 'owner' as WorkspaceRole }, ...prev]);
      return data;
    } catch (err) {
      throw err instanceof Error ? err : new Error('エラーが発生しました');
    }
  };

  return {
    workspaces,
    loading,
    error,
    refetch: fetchWorkspaces,
    createWorkspace,
  };
}

/**
 * 単一ワークスペースを取得するフック
 */
export function useWorkspace(workspaceId: string | null) {
  const [workspace, setWorkspace] = useState<(Workspace & { role: WorkspaceRole }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkspace = useCallback(async () => {
    if (!workspaceId) {
      setWorkspace(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/workspaces/${workspaceId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'ワークスペースの取得に失敗しました');
      }

      setWorkspace(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchWorkspace();
  }, [fetchWorkspace]);

  const updateWorkspace = async (input: { name?: string; description?: string | null }) => {
    if (!workspaceId) return;

    try {
      const response = await fetch(`/api/workspaces/${workspaceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'ワークスペースの更新に失敗しました');
      }

      setWorkspace(prev => prev ? { ...prev, ...data } : null);
      return data;
    } catch (err) {
      throw err instanceof Error ? err : new Error('エラーが発生しました');
    }
  };

  const deleteWorkspace = async () => {
    if (!workspaceId) return;

    try {
      const response = await fetch(`/api/workspaces/${workspaceId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'ワークスペースの削除に失敗しました');
      }

      setWorkspace(null);
      return data;
    } catch (err) {
      throw err instanceof Error ? err : new Error('エラーが発生しました');
    }
  };

  return {
    workspace,
    loading,
    error,
    refetch: fetchWorkspace,
    updateWorkspace,
    deleteWorkspace,
  };
}

/**
 * ワークスペースメンバーを管理するフック
 */
export function useWorkspaceMembers(workspaceId: string | null) {
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    if (!workspaceId) {
      setMembers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/members`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'メンバーの取得に失敗しました');
      }

      setMembers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const inviteMember = async (email: string, role: 'admin' | 'member') => {
    if (!workspaceId) return;

    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'メンバーの招待に失敗しました');
      }

      setMembers(prev => [...prev, data]);
      return data;
    } catch (err) {
      throw err instanceof Error ? err : new Error('エラーが発生しました');
    }
  };

  const updateMemberRole = async (memberId: string, role: WorkspaceRole) => {
    if (!workspaceId) return;

    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'ロールの更新に失敗しました');
      }

      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role } : m));
      return data;
    } catch (err) {
      throw err instanceof Error ? err : new Error('エラーが発生しました');
    }
  };

  const removeMember = async (memberId: string) => {
    if (!workspaceId) return;

    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/members/${memberId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'メンバーの削除に失敗しました');
      }

      setMembers(prev => prev.filter(m => m.id !== memberId));
      return data;
    } catch (err) {
      throw err instanceof Error ? err : new Error('エラーが発生しました');
    }
  };

  return {
    members,
    loading,
    error,
    refetch: fetchMembers,
    inviteMember,
    updateMemberRole,
    removeMember,
  };
}

/**
 * 現在のワークスペースコンテキスト用フック（localStorage保存）
 */
export function useCurrentWorkspace() {
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('currentWorkspaceId');
    if (stored) {
      setCurrentWorkspaceId(stored);
    }
  }, []);

  const setWorkspace = useCallback((workspaceId: string | null) => {
    if (workspaceId) {
      localStorage.setItem('currentWorkspaceId', workspaceId);
    } else {
      localStorage.removeItem('currentWorkspaceId');
    }
    setCurrentWorkspaceId(workspaceId);
  }, []);

  return {
    currentWorkspaceId,
    setCurrentWorkspace: setWorkspace,
  };
}
