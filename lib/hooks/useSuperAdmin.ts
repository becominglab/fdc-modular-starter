/**
 * lib/hooks/useSuperAdmin.ts
 *
 * Super Admin 機能用 React Hooks
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import type {
  SystemStats,
  TenantSummary,
  ManagedUser,
  SecurityEvent,
  UserAction,
} from '@/lib/types/super-admin';

// システム統計フック
export function useSystemStats() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/super-admin/stats');
      if (!res.ok) {
        throw new Error('Failed to fetch stats');
      }
      const data = await res.json();
      setStats(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, error, refetch: fetchStats };
}

// テナント一覧フック
export function useTenants(initialSearch = '') {
  const [tenants, setTenants] = useState<TenantSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(initialSearch);

  const fetchTenants = useCallback(async (searchQuery?: string) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);

      const res = await fetch(`/api/super-admin/tenants?${params}`);
      if (!res.ok) {
        throw new Error('Failed to fetch tenants');
      }
      const data = await res.json();
      setTenants(data.tenants || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTenants(search);
  }, [fetchTenants, search]);

  return { tenants, loading, error, search, setSearch, refetch: fetchTenants };
}

// ユーザー一覧フック
export function useUsers(initialSearch = '') {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(initialSearch);

  const fetchUsers = useCallback(async (searchQuery?: string) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);

      const res = await fetch(`/api/super-admin/users?${params}`);
      if (!res.ok) {
        throw new Error('Failed to fetch users');
      }
      const data = await res.json();
      setUsers(data.users || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  const executeUserAction = useCallback(async (userId: string, action: UserAction) => {
    try {
      const res = await fetch(`/api/super-admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to execute action');
      }

      // リストを更新
      await fetchUsers(search);
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }, [fetchUsers, search]);

  useEffect(() => {
    fetchUsers(search);
  }, [fetchUsers, search]);

  return { users, loading, error, search, setSearch, executeUserAction, refetch: fetchUsers };
}

// セキュリティイベントフック
export function useSecurityEvents(initialSeverity?: string) {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [severity, setSeverity] = useState<string | undefined>(initialSeverity);

  const fetchEvents = useCallback(async (severityFilter?: string) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (severityFilter) params.set('severity', severityFilter);

      const res = await fetch(`/api/super-admin/security-events?${params}`);
      if (!res.ok) {
        throw new Error('Failed to fetch security events');
      }
      const data = await res.json();
      setEvents(data.events || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents(severity);
  }, [fetchEvents, severity]);

  return { events, loading, error, severity, setSeverity, refetch: fetchEvents };
}
