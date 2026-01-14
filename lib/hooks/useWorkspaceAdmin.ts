/**
 * lib/hooks/useWorkspaceAdmin.ts
 *
 * ワークスペース管理者機能用カスタムフック
 */

import { useState, useEffect, useCallback } from 'react';
import type {
  WorkspaceMember,
  Invitation,
  AuditLog,
  WorkspaceRole,
} from '@/lib/types/admin';

// メンバー管理
export function useWorkspaceMembers(workspaceId: string | null) {
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    if (!workspaceId) return;

    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/workspaces/${workspaceId}/members`);

      if (res.status === 403) {
        setError('権限がありません');
        return;
      }

      if (!res.ok) throw new Error('Failed to fetch members');

      const data = await res.json();
      setMembers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const changeRole = async (memberId: string, newRole: WorkspaceRole): Promise<boolean> => {
    if (!workspaceId) return false;

    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to change role');
      }

      const updated = await res.json();
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: updated.role } : m));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  };

  const removeMember = async (memberId: string): Promise<boolean> => {
    if (!workspaceId) return false;

    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/members/${memberId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to remove member');
      }

      setMembers(prev => prev.filter(m => m.id !== memberId));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  };

  return {
    members,
    loading,
    error,
    refetch: fetchMembers,
    changeRole,
    removeMember,
  };
}

// 招待管理
export function useInvitations(workspaceId: string | null) {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInvitations = useCallback(async () => {
    if (!workspaceId) return;

    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/workspaces/${workspaceId}/invitations`);

      if (res.status === 403) {
        setError('権限がありません');
        return;
      }

      if (!res.ok) throw new Error('Failed to fetch invitations');

      const data = await res.json();
      setInvitations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  const sendInvitation = async (email: string, role: 'admin' | 'member' = 'member'): Promise<Invitation | null> => {
    if (!workspaceId) return null;

    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to send invitation');
      }

      const invitation = await res.json();
      setInvitations(prev => [invitation, ...prev]);
      return invitation;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    }
  };

  const revokeInvitation = async (invitationId: string): Promise<boolean> => {
    if (!workspaceId) return false;

    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/invitations/${invitationId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to revoke invitation');
      }

      setInvitations(prev => prev.filter(i => i.id !== invitationId));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  };

  const updateInvitationRole = async (invitationId: string, role: 'admin' | 'member'): Promise<Invitation | null> => {
    if (!workspaceId) return null;

    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/invitations/${invitationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update invitation role');
      }

      const updated = await res.json();
      setInvitations(prev => prev.map(i => i.id === invitationId ? { ...i, role: updated.role } : i));
      return updated;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    }
  };

  return {
    invitations,
    loading,
    error,
    refetch: fetchInvitations,
    sendInvitation,
    revokeInvitation,
    updateInvitationRole,
  };
}

// 監査ログ
export function useAuditLogs(workspaceId: string | null) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchLogs = useCallback(async (offset = 0, action?: string) => {
    if (!workspaceId) return;

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        limit: '50',
        offset: offset.toString(),
      });
      if (action) params.set('action', action);

      const res = await fetch(`/api/workspaces/${workspaceId}/audit-logs?${params}`);

      if (res.status === 403) {
        setError('権限がありません');
        return;
      }

      if (!res.ok) throw new Error('Failed to fetch audit logs');

      const data = await res.json();

      if (offset === 0) {
        setLogs(data);
      } else {
        setLogs(prev => [...prev, ...data]);
      }

      setHasMore(data.length === 50);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchLogs(0);
  }, [fetchLogs]);

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchLogs(logs.length);
    }
  };

  return {
    logs,
    loading,
    error,
    hasMore,
    refetch: () => fetchLogs(0),
    loadMore,
  };
}
