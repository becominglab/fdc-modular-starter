# Phase 19: Super Admin (SA) ダッシュボード

## 目標

システム全体を管理する Super Admin (SA) 機能を実装します。

### 習得する概念

- **Super Admin (SA)**: システム全体を管理する最上位権限
- **マルチテナント管理**: 複数ワークスペースの一元管理
- **システムメトリクス**: ユーザー数、API 呼び出し数などの指標
- **セキュリティ監視**: 不正アクセスの検知

### 権限階層

```
Super Admin (SA)
  │ ← システム全体を管理
  ├─ Workspace 1
  │    ├─ OWNER ← ワークスペースを所有
  │    ├─ ADMIN ← メンバー管理可能
  │    └─ MEMBER ← 一般ユーザー
  └─ Workspace 2
       ├─ OWNER
       └─ ...
```

---

## Step 1: Supabase テーブル更新

### 1.1 profiles テーブルに is_super_admin カラム追加

Supabase Dashboard → SQL Editor で実行:

```sql
-- profiles に is_super_admin カラムを追加
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT FALSE;

-- 自分を Super Admin に設定（メールアドレスを置き換え）
UPDATE profiles
SET is_super_admin = TRUE
WHERE email = 'YOUR_EMAIL@example.com';
```

### 1.2 system_metrics テーブル作成

```sql
-- システムメトリクス記録テーブル
CREATE TABLE IF NOT EXISTS system_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type TEXT NOT NULL,
  value NUMERIC NOT NULL DEFAULT 0,
  details JSONB DEFAULT '{}',
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_system_metrics_type_date
ON system_metrics(metric_type, recorded_at DESC);

-- RLS
ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;

-- SA のみ読み取り可能
CREATE POLICY "SA can read system_metrics"
ON system_metrics FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_super_admin = TRUE
  )
);

-- SA のみ挿入可能
CREATE POLICY "SA can insert system_metrics"
ON system_metrics FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_super_admin = TRUE
  )
);
```

### 1.3 security_events テーブル作成

```sql
-- セキュリティイベント記録テーブル
CREATE TABLE IF NOT EXISTS security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  user_id UUID REFERENCES auth.users(id),
  ip_address TEXT,
  user_agent TEXT,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_security_events_type
ON security_events(event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_security_events_severity
ON security_events(severity, created_at DESC);

-- RLS
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;

-- SA のみアクセス可能
CREATE POLICY "SA can manage security_events"
ON security_events FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_super_admin = TRUE
  )
);
```

### 確認ポイント

- [ ] profiles テーブルに is_super_admin カラムが追加された
- [ ] 自分のアカウントが is_super_admin = true になっている
- [ ] system_metrics テーブルが作成された
- [ ] security_events テーブルが作成された
- [ ] RLS ポリシーが設定された

---

## Step 2: 型定義の作成

### ファイル: `lib/types/super-admin.ts`

```typescript
/**
 * lib/types/super-admin.ts
 *
 * Super Admin 機能の型定義
 */

// テナント（ワークスペース）概要
export interface TenantSummary {
  id: string;
  name: string;
  slug: string;
  ownerEmail: string;
  memberCount: number;
  createdAt: string;
  lastActivityAt: string | null;
}

// システムメトリクスの種類
export type MetricType =
  | 'active_users'
  | 'total_workspaces'
  | 'api_calls'
  | 'storage_used'
  | 'invitations_sent';

// システムメトリクス
export interface SystemMetric {
  id: string;
  metricType: MetricType;
  value: number;
  details: Record<string, unknown>;
  recordedAt: string;
}

// システム統計サマリー
export interface SystemStats {
  totalUsers: number;
  activeUsersToday: number;
  totalWorkspaces: number;
  pendingInvitations: number;
  securityEventsToday: number;
}

// セキュリティイベントの重要度
export type SecuritySeverity = 'info' | 'warning' | 'critical';

// セキュリティイベントの種類
export type SecurityEventType =
  | 'login_success'
  | 'login_failed'
  | 'password_reset'
  | 'account_locked'
  | 'suspicious_activity'
  | 'permission_denied';

// セキュリティイベント
export interface SecurityEvent {
  id: string;
  eventType: SecurityEventType;
  severity: SecuritySeverity;
  userId: string | null;
  userEmail?: string;
  ipAddress: string | null;
  userAgent: string | null;
  details: Record<string, unknown>;
  createdAt: string;
}

// ユーザー管理用
export interface ManagedUser {
  id: string;
  email: string;
  fullName: string | null;
  isSuperAdmin: boolean;
  isActive: boolean;
  createdAt: string;
  lastSignIn: string | null;
  workspaceCount: number;
}

// ユーザー操作
export type UserAction = 'activate' | 'deactivate' | 'delete' | 'grant_sa' | 'revoke_sa';
```

### 確認ポイント

- [ ] `lib/types/super-admin.ts` が作成された
- [ ] 全ての型が正しく定義されている

---

## Step 3: API Routes 作成

### 3.1 SA 権限チェックヘルパー

#### ファイル: `lib/supabase/check-super-admin.ts`

```typescript
/**
 * lib/supabase/check-super-admin.ts
 *
 * Super Admin 権限チェック
 */

import { createClient, createServiceClient } from './server';

export async function checkSuperAdmin(): Promise<{
  isSuperAdmin: boolean;
  userId: string | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { isSuperAdmin: false, userId: null, error: 'Unauthorized' };
    }

    const serviceClient = createServiceClient();
    const { data: profile } = await serviceClient
      .from('profiles')
      .select('is_super_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_super_admin) {
      return { isSuperAdmin: false, userId: user.id, error: 'Forbidden: Super Admin only' };
    }

    return { isSuperAdmin: true, userId: user.id, error: null };
  } catch {
    return { isSuperAdmin: false, userId: null, error: 'Internal error' };
  }
}
```

### 3.2 システム統計 API

#### ファイル: `app/api/super-admin/stats/route.ts`

```typescript
/**
 * app/api/super-admin/stats/route.ts
 *
 * GET /api/super-admin/stats - システム統計取得
 */

import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { checkSuperAdmin } from '@/lib/supabase/check-super-admin';
import type { SystemStats } from '@/lib/types/super-admin';

export async function GET() {
  try {
    const { isSuperAdmin, error } = await checkSuperAdmin();
    if (!isSuperAdmin) {
      return NextResponse.json({ error }, { status: error === 'Unauthorized' ? 401 : 403 });
    }

    const serviceClient = createServiceClient();

    // 総ユーザー数
    const { count: totalUsers } = await serviceClient
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    // 総ワークスペース数
    const { count: totalWorkspaces } = await serviceClient
      .from('workspaces')
      .select('*', { count: 'exact', head: true });

    // 保留中の招待数
    const { count: pendingInvitations } = await serviceClient
      .from('invitations')
      .select('*', { count: 'exact', head: true })
      .gt('expires_at', new Date().toISOString());

    // 今日のセキュリティイベント数
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count: securityEventsToday } = await serviceClient
      .from('security_events')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString());

    // 今日アクティブなユーザー数（簡易: 今日ログインしたユーザー）
    const { count: activeUsersToday } = await serviceClient
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('updated_at', today.toISOString());

    const stats: SystemStats = {
      totalUsers: totalUsers || 0,
      activeUsersToday: activeUsersToday || 0,
      totalWorkspaces: totalWorkspaces || 0,
      pendingInvitations: pendingInvitations || 0,
      securityEventsToday: securityEventsToday || 0,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Super admin stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### 3.3 テナント一覧 API

#### ファイル: `app/api/super-admin/tenants/route.ts`

```typescript
/**
 * app/api/super-admin/tenants/route.ts
 *
 * GET /api/super-admin/tenants - 全テナント（ワークスペース）一覧
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { checkSuperAdmin } from '@/lib/supabase/check-super-admin';
import type { TenantSummary } from '@/lib/types/super-admin';

export async function GET(request: NextRequest) {
  try {
    const { isSuperAdmin, error } = await checkSuperAdmin();
    if (!isSuperAdmin) {
      return NextResponse.json({ error }, { status: error === 'Unauthorized' ? 401 : 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const serviceClient = createServiceClient();

    // ワークスペース取得
    let query = serviceClient
      .from('workspaces')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.or(`name.ilike.%${search}%,slug.ilike.%${search}%`);
    }

    const { data: workspaces, error: wsError } = await query;

    if (wsError) {
      console.error('Workspaces fetch error:', wsError);
      return NextResponse.json({ error: 'Failed to fetch workspaces' }, { status: 500 });
    }

    // 各ワークスペースの詳細情報を取得
    const tenants: TenantSummary[] = await Promise.all(
      (workspaces || []).map(async (ws) => {
        // メンバー数
        const { count: memberCount } = await serviceClient
          .from('workspace_members')
          .select('*', { count: 'exact', head: true })
          .eq('workspace_id', ws.id);

        // オーナー情報
        const { data: owner } = await serviceClient
          .from('workspace_members')
          .select('user_id')
          .eq('workspace_id', ws.id)
          .eq('role', 'owner')
          .single();

        let ownerEmail = 'Unknown';
        if (owner) {
          const { data: profile } = await serviceClient
            .from('profiles')
            .select('email')
            .eq('id', owner.user_id)
            .single();
          ownerEmail = profile?.email || 'Unknown';
        }

        // 最終アクティビティ（監査ログから）
        const { data: lastActivity } = await serviceClient
          .from('audit_logs')
          .select('created_at')
          .eq('workspace_id', ws.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        return {
          id: ws.id,
          name: ws.name,
          slug: ws.slug,
          ownerEmail,
          memberCount: memberCount || 0,
          createdAt: ws.created_at,
          lastActivityAt: lastActivity?.created_at || null,
        };
      })
    );

    return NextResponse.json({ tenants, total: tenants.length });
  } catch (error) {
    console.error('Super admin tenants error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### 3.4 ユーザー管理 API

#### ファイル: `app/api/super-admin/users/route.ts`

```typescript
/**
 * app/api/super-admin/users/route.ts
 *
 * GET /api/super-admin/users - 全ユーザー一覧
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { checkSuperAdmin } from '@/lib/supabase/check-super-admin';
import type { ManagedUser } from '@/lib/types/super-admin';

export async function GET(request: NextRequest) {
  try {
    const { isSuperAdmin, error } = await checkSuperAdmin();
    if (!isSuperAdmin) {
      return NextResponse.json({ error }, { status: error === 'Unauthorized' ? 401 : 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const serviceClient = createServiceClient();

    // プロフィール取得
    let query = serviceClient
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);
    }

    const { data: profiles, error: profileError } = await query;

    if (profileError) {
      console.error('Profiles fetch error:', profileError);
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    // 各ユーザーのワークスペース数を取得
    const users: ManagedUser[] = await Promise.all(
      (profiles || []).map(async (profile) => {
        const { count: workspaceCount } = await serviceClient
          .from('workspace_members')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', profile.id);

        return {
          id: profile.id,
          email: profile.email || '',
          fullName: profile.full_name,
          isSuperAdmin: profile.is_super_admin || false,
          isActive: profile.is_active !== false, // デフォルト true
          createdAt: profile.created_at,
          lastSignIn: profile.updated_at,
          workspaceCount: workspaceCount || 0,
        };
      })
    );

    return NextResponse.json({ users, total: users.length });
  } catch (error) {
    console.error('Super admin users error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### 3.5 ユーザー操作 API

#### ファイル: `app/api/super-admin/users/[userId]/route.ts`

```typescript
/**
 * app/api/super-admin/users/[userId]/route.ts
 *
 * PATCH /api/super-admin/users/:userId - ユーザー状態更新
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { checkSuperAdmin } from '@/lib/supabase/check-super-admin';
import type { UserAction } from '@/lib/types/super-admin';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const { isSuperAdmin, userId: adminId, error } = await checkSuperAdmin();

    if (!isSuperAdmin) {
      return NextResponse.json({ error }, { status: error === 'Unauthorized' ? 401 : 403 });
    }

    const body = await request.json();
    const action: UserAction = body.action;

    if (!['activate', 'deactivate', 'grant_sa', 'revoke_sa'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // 自分自身の SA 権限は削除不可
    if (action === 'revoke_sa' && userId === adminId) {
      return NextResponse.json({ error: 'Cannot revoke your own super admin' }, { status: 400 });
    }

    const serviceClient = createServiceClient();

    // 更新内容を決定
    const updates: Record<string, boolean> = {};
    switch (action) {
      case 'activate':
        updates.is_active = true;
        break;
      case 'deactivate':
        updates.is_active = false;
        break;
      case 'grant_sa':
        updates.is_super_admin = true;
        break;
      case 'revoke_sa':
        updates.is_super_admin = false;
        break;
    }

    const { data: updated, error: updateError } = await serviceClient
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      console.error('User update error:', updateError);
      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
    }

    // セキュリティイベント記録
    await serviceClient.from('security_events').insert({
      event_type: `user_${action}`,
      severity: action.includes('sa') ? 'warning' : 'info',
      user_id: userId,
      details: {
        action,
        performed_by: adminId,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Super admin user update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### 3.6 セキュリティイベント API

#### ファイル: `app/api/super-admin/security-events/route.ts`

```typescript
/**
 * app/api/super-admin/security-events/route.ts
 *
 * GET /api/super-admin/security-events - セキュリティイベント一覧
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { checkSuperAdmin } from '@/lib/supabase/check-super-admin';

export async function GET(request: NextRequest) {
  try {
    const { isSuperAdmin, error } = await checkSuperAdmin();
    if (!isSuperAdmin) {
      return NextResponse.json({ error }, { status: error === 'Unauthorized' ? 401 : 403 });
    }

    const { searchParams } = new URL(request.url);
    const severity = searchParams.get('severity');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    const serviceClient = createServiceClient();

    let query = serviceClient
      .from('security_events')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (severity) {
      query = query.eq('severity', severity);
    }

    const { data: events, error: fetchError } = await query;

    if (fetchError) {
      console.error('Security events fetch error:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
    }

    // ユーザー情報を付加
    const enrichedEvents = await Promise.all(
      (events || []).map(async (event) => {
        if (event.user_id) {
          const { data: profile } = await serviceClient
            .from('profiles')
            .select('email')
            .eq('id', event.user_id)
            .single();
          return { ...event, userEmail: profile?.email };
        }
        return event;
      })
    );

    return NextResponse.json({ events: enrichedEvents });
  } catch (error) {
    console.error('Super admin security events error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### 確認ポイント

- [ ] `lib/supabase/check-super-admin.ts` が作成された
- [ ] `app/api/super-admin/stats/route.ts` が作成された
- [ ] `app/api/super-admin/tenants/route.ts` が作成された
- [ ] `app/api/super-admin/users/route.ts` が作成された
- [ ] `app/api/super-admin/users/[userId]/route.ts` が作成された
- [ ] `app/api/super-admin/security-events/route.ts` が作成された

---

## Step 4: React Hooks 作成

### ファイル: `lib/hooks/useSuperAdmin.ts`

```typescript
/**
 * lib/hooks/useSuperAdmin.ts
 *
 * Super Admin 機能用カスタムフック
 */

import { useState, useEffect, useCallback } from 'react';
import type {
  SystemStats,
  TenantSummary,
  ManagedUser,
  SecurityEvent,
  UserAction,
} from '@/lib/types/super-admin';

// システム統計
export function useSystemStats() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/super-admin/stats');
      if (!res.ok) throw new Error('Failed to fetch stats');
      const data = await res.json();
      setStats(data);
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

// テナント管理
export function useTenants() {
  const [tenants, setTenants] = useState<TenantSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const fetchTenants = useCallback(async (searchQuery = '') => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      const res = await fetch(`/api/super-admin/tenants?${params}`);
      if (!res.ok) throw new Error('Failed to fetch tenants');
      const data = await res.json();
      setTenants(data.tenants);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTenants(search);
  }, [fetchTenants, search]);

  return { tenants, loading, error, search, setSearch, refetch: () => fetchTenants(search) };
}

// ユーザー管理
export function useManagedUsers() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const fetchUsers = useCallback(async (searchQuery = '') => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      const res = await fetch(`/api/super-admin/users?${params}`);
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();
      setUsers(data.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers(search);
  }, [fetchUsers, search]);

  const performAction = async (userId: string, action: UserAction): Promise<boolean> => {
    try {
      const res = await fetch(`/api/super-admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to perform action');
      }
      await fetchUsers(search);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  };

  return {
    users,
    loading,
    error,
    search,
    setSearch,
    performAction,
    refetch: () => fetchUsers(search),
  };
}

// セキュリティイベント
export function useSecurityEvents() {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [severity, setSeverity] = useState<string | null>(null);

  const fetchEvents = useCallback(async (severityFilter: string | null = null) => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (severityFilter) params.set('severity', severityFilter);
      const res = await fetch(`/api/super-admin/security-events?${params}`);
      if (!res.ok) throw new Error('Failed to fetch events');
      const data = await res.json();
      setEvents(data.events);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents(severity);
  }, [fetchEvents, severity]);

  return { events, loading, error, severity, setSeverity, refetch: () => fetchEvents(severity) };
}
```

### 確認ポイント

- [ ] `lib/hooks/useSuperAdmin.ts` が作成された
- [ ] 4つのフックが定義されている

---

## Step 5: UI コンポーネント作成

### 5.1 統計カード

#### ファイル: `components/super-admin/StatCard.tsx`

```typescript
'use client';

/**
 * components/super-admin/StatCard.tsx
 *
 * 統計表示カード
 */

import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  color?: string;
  subtitle?: string;
}

export function StatCard({ title, value, icon: Icon, color = 'var(--ws-secondary)', subtitle }: StatCardProps) {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ backgroundColor: `${color}20`, color }}>
        <Icon size={24} />
      </div>
      <div className="stat-content">
        <span className="stat-value">{value}</span>
        <span className="stat-title">{title}</span>
        {subtitle && <span className="stat-subtitle">{subtitle}</span>}
      </div>
    </div>
  );
}
```

### 5.2 テナント一覧

#### ファイル: `components/super-admin/TenantsTable.tsx`

```typescript
'use client';

/**
 * components/super-admin/TenantsTable.tsx
 *
 * テナント（ワークスペース）一覧テーブル
 */

import { Search, Users, Calendar, Activity } from 'lucide-react';
import type { TenantSummary } from '@/lib/types/super-admin';

interface TenantsTableProps {
  tenants: TenantSummary[];
  loading: boolean;
  search: string;
  onSearchChange: (value: string) => void;
}

export function TenantsTable({ tenants, loading, search, onSearchChange }: TenantsTableProps) {
  return (
    <div className="sa-table-container">
      <div className="sa-table-header">
        <h3>ワークスペース一覧</h3>
        <div className="sa-search">
          <Search size={16} />
          <input
            type="text"
            placeholder="検索..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="sa-loading">読み込み中...</div>
      ) : tenants.length === 0 ? (
        <div className="sa-empty">ワークスペースがありません</div>
      ) : (
        <table className="sa-table">
          <thead>
            <tr>
              <th>名前</th>
              <th>オーナー</th>
              <th><Users size={14} /> メンバー</th>
              <th><Calendar size={14} /> 作成日</th>
              <th><Activity size={14} /> 最終活動</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((tenant) => (
              <tr key={tenant.id}>
                <td>
                  <div className="tenant-name">
                    <strong>{tenant.name}</strong>
                    <span className="tenant-slug">/{tenant.slug}</span>
                  </div>
                </td>
                <td>{tenant.ownerEmail}</td>
                <td>{tenant.memberCount}</td>
                <td>{new Date(tenant.createdAt).toLocaleDateString('ja-JP')}</td>
                <td>
                  {tenant.lastActivityAt
                    ? new Date(tenant.lastActivityAt).toLocaleDateString('ja-JP')
                    : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
```

### 5.3 ユーザー管理テーブル

#### ファイル: `components/super-admin/UsersTable.tsx`

```typescript
'use client';

/**
 * components/super-admin/UsersTable.tsx
 *
 * ユーザー管理テーブル
 */

import { Search, Shield, ShieldOff, UserX, UserCheck, Loader2 } from 'lucide-react';
import { useState } from 'react';
import type { ManagedUser, UserAction } from '@/lib/types/super-admin';

interface UsersTableProps {
  users: ManagedUser[];
  loading: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  onAction: (userId: string, action: UserAction) => Promise<boolean>;
  currentUserId?: string;
}

export function UsersTable({
  users,
  loading,
  search,
  onSearchChange,
  onAction,
  currentUserId,
}: UsersTableProps) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleAction = async (userId: string, action: UserAction) => {
    const confirmMessages: Record<UserAction, string> = {
      activate: 'このユーザーを有効化しますか？',
      deactivate: 'このユーザーを無効化しますか？',
      delete: 'このユーザーを削除しますか？（この操作は取り消せません）',
      grant_sa: 'このユーザーにSuper Admin権限を付与しますか？',
      revoke_sa: 'このユーザーからSuper Admin権限を剥奪しますか？',
    };

    if (!confirm(confirmMessages[action])) return;

    setActionLoading(`${userId}-${action}`);
    await onAction(userId, action);
    setActionLoading(null);
  };

  return (
    <div className="sa-table-container">
      <div className="sa-table-header">
        <h3>ユーザー管理</h3>
        <div className="sa-search">
          <Search size={16} />
          <input
            type="text"
            placeholder="メールアドレスで検索..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="sa-loading">読み込み中...</div>
      ) : users.length === 0 ? (
        <div className="sa-empty">ユーザーがいません</div>
      ) : (
        <table className="sa-table">
          <thead>
            <tr>
              <th>ユーザー</th>
              <th>ステータス</th>
              <th>WS数</th>
              <th>登録日</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className={!user.isActive ? 'inactive' : ''}>
                <td>
                  <div className="user-info">
                    <span className="user-email">{user.email}</span>
                    {user.fullName && <span className="user-name">{user.fullName}</span>}
                    {user.isSuperAdmin && (
                      <span className="badge badge-sa">SA</span>
                    )}
                  </div>
                </td>
                <td>
                  <span className={`status-badge ${user.isActive ? 'active' : 'inactive'}`}>
                    {user.isActive ? '有効' : '無効'}
                  </span>
                </td>
                <td>{user.workspaceCount}</td>
                <td>{new Date(user.createdAt).toLocaleDateString('ja-JP')}</td>
                <td>
                  <div className="action-buttons">
                    {user.id !== currentUserId && (
                      <>
                        {user.isActive ? (
                          <button
                            onClick={() => handleAction(user.id, 'deactivate')}
                            className="btn-icon btn-warning"
                            title="無効化"
                            disabled={actionLoading === `${user.id}-deactivate`}
                          >
                            {actionLoading === `${user.id}-deactivate` ? (
                              <Loader2 className="animate-spin" size={14} />
                            ) : (
                              <UserX size={14} />
                            )}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAction(user.id, 'activate')}
                            className="btn-icon btn-success"
                            title="有効化"
                            disabled={actionLoading === `${user.id}-activate`}
                          >
                            {actionLoading === `${user.id}-activate` ? (
                              <Loader2 className="animate-spin" size={14} />
                            ) : (
                              <UserCheck size={14} />
                            )}
                          </button>
                        )}
                        {user.isSuperAdmin ? (
                          <button
                            onClick={() => handleAction(user.id, 'revoke_sa')}
                            className="btn-icon btn-danger"
                            title="SA権限剥奪"
                            disabled={actionLoading === `${user.id}-revoke_sa`}
                          >
                            {actionLoading === `${user.id}-revoke_sa` ? (
                              <Loader2 className="animate-spin" size={14} />
                            ) : (
                              <ShieldOff size={14} />
                            )}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAction(user.id, 'grant_sa')}
                            className="btn-icon"
                            title="SA権限付与"
                            disabled={actionLoading === `${user.id}-grant_sa`}
                          >
                            {actionLoading === `${user.id}-grant_sa` ? (
                              <Loader2 className="animate-spin" size={14} />
                            ) : (
                              <Shield size={14} />
                            )}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
```

### 5.4 セキュリティモニター

#### ファイル: `components/super-admin/SecurityMonitor.tsx`

```typescript
'use client';

/**
 * components/super-admin/SecurityMonitor.tsx
 *
 * セキュリティイベントモニター
 */

import { AlertTriangle, AlertCircle, Info, Filter } from 'lucide-react';
import type { SecurityEvent, SecuritySeverity } from '@/lib/types/super-admin';

interface SecurityMonitorProps {
  events: SecurityEvent[];
  loading: boolean;
  severity: string | null;
  onSeverityChange: (value: string | null) => void;
}

const severityConfig: Record<SecuritySeverity, { icon: typeof AlertTriangle; color: string; label: string }> = {
  critical: { icon: AlertTriangle, color: '#ef4444', label: '重大' },
  warning: { icon: AlertCircle, color: '#f59e0b', label: '警告' },
  info: { icon: Info, color: '#3b82f6', label: '情報' },
};

export function SecurityMonitor({ events, loading, severity, onSeverityChange }: SecurityMonitorProps) {
  return (
    <div className="security-monitor">
      <div className="security-header">
        <h3>セキュリティイベント</h3>
        <div className="severity-filter">
          <Filter size={14} />
          <select
            value={severity || ''}
            onChange={(e) => onSeverityChange(e.target.value || null)}
          >
            <option value="">すべて</option>
            <option value="critical">重大のみ</option>
            <option value="warning">警告以上</option>
            <option value="info">情報</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="sa-loading">読み込み中...</div>
      ) : events.length === 0 ? (
        <div className="sa-empty">セキュリティイベントはありません</div>
      ) : (
        <div className="security-events-list">
          {events.map((event) => {
            const config = severityConfig[event.severity as SecuritySeverity] || severityConfig.info;
            const Icon = config.icon;
            return (
              <div key={event.id} className={`security-event severity-${event.severity}`}>
                <div className="event-icon" style={{ color: config.color }}>
                  <Icon size={16} />
                </div>
                <div className="event-content">
                  <div className="event-header">
                    <span className="event-type">{event.eventType}</span>
                    <span className="event-time">
                      {new Date(event.createdAt).toLocaleString('ja-JP')}
                    </span>
                  </div>
                  {event.userEmail && (
                    <span className="event-user">{event.userEmail}</span>
                  )}
                  {event.ipAddress && (
                    <span className="event-ip">IP: {event.ipAddress}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

### 5.5 エクスポート

#### ファイル: `components/super-admin/index.ts`

```typescript
export { StatCard } from './StatCard';
export { TenantsTable } from './TenantsTable';
export { UsersTable } from './UsersTable';
export { SecurityMonitor } from './SecurityMonitor';
```

### 確認ポイント

- [ ] `components/super-admin/StatCard.tsx` が作成された
- [ ] `components/super-admin/TenantsTable.tsx` が作成された
- [ ] `components/super-admin/UsersTable.tsx` が作成された
- [ ] `components/super-admin/SecurityMonitor.tsx` が作成された
- [ ] `components/super-admin/index.ts` が作成された

---

## Step 6: SA ダッシュボードページ作成

### ファイル: `app/(app)/super-admin/page.tsx`

```typescript
'use client';

/**
 * app/(app)/super-admin/page.tsx
 *
 * Super Admin ダッシュボード
 */

import { useEffect, useState } from 'react';
import { Shield, Users, Building2, Activity, AlertTriangle, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/contexts/AuthContext';
import {
  useSystemStats,
  useTenants,
  useManagedUsers,
  useSecurityEvents,
} from '@/lib/hooks/useSuperAdmin';
import {
  StatCard,
  TenantsTable,
  UsersTable,
  SecurityMonitor,
} from '@/components/super-admin';

type TabId = 'overview' | 'tenants' | 'users' | 'security';

export default function SuperAdminPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  // SA権限チェック
  useEffect(() => {
    const checkAccess = async () => {
      try {
        const res = await fetch('/api/super-admin/stats');
        setIsSuperAdmin(res.ok);
      } catch {
        setIsSuperAdmin(false);
      } finally {
        setChecking(false);
      }
    };
    checkAccess();
  }, []);

  const { stats, loading: statsLoading } = useSystemStats();
  const { tenants, loading: tenantsLoading, search: tenantSearch, setSearch: setTenantSearch } = useTenants();
  const { users, loading: usersLoading, search: userSearch, setSearch: setUserSearch, performAction } = useManagedUsers();
  const { events, loading: eventsLoading, severity, setSeverity } = useSecurityEvents();

  if (checking) {
    return (
      <div className="sa-page">
        <div className="sa-loading-full">
          <Loader2 className="animate-spin" size={32} />
          <p>権限を確認中...</p>
        </div>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="sa-page">
        <div className="sa-access-denied">
          <Shield size={48} />
          <h2>アクセス権限がありません</h2>
          <p>このページは Super Admin のみアクセス可能です。</p>
        </div>
      </div>
    );
  }

  const tabs: { id: TabId; label: string; icon: typeof Shield }[] = [
    { id: 'overview', label: '概要', icon: Activity },
    { id: 'tenants', label: 'テナント', icon: Building2 },
    { id: 'users', label: 'ユーザー', icon: Users },
    { id: 'security', label: 'セキュリティ', icon: AlertTriangle },
  ];

  return (
    <div className="sa-page">
      <div className="sa-header">
        <Shield size={24} />
        <h1>Super Admin</h1>
      </div>

      <div className="sa-tabs">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              className={`sa-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="sa-content">
        {activeTab === 'overview' && (
          <div className="sa-overview">
            <div className="stat-cards">
              <StatCard
                title="総ユーザー数"
                value={stats?.totalUsers || 0}
                icon={Users}
                color="#3b82f6"
              />
              <StatCard
                title="今日のアクティブ"
                value={stats?.activeUsersToday || 0}
                icon={Activity}
                color="#10b981"
              />
              <StatCard
                title="ワークスペース"
                value={stats?.totalWorkspaces || 0}
                icon={Building2}
                color="#8b5cf6"
              />
              <StatCard
                title="セキュリティイベント"
                value={stats?.securityEventsToday || 0}
                icon={AlertTriangle}
                color={stats?.securityEventsToday && stats.securityEventsToday > 0 ? '#f59e0b' : '#6b7280'}
              />
            </div>

            <div className="sa-overview-sections">
              <div className="sa-section">
                <h3>最近のテナント</h3>
                <TenantsTable
                  tenants={tenants.slice(0, 5)}
                  loading={tenantsLoading}
                  search=""
                  onSearchChange={() => {}}
                />
              </div>
              <div className="sa-section">
                <SecurityMonitor
                  events={events.slice(0, 10)}
                  loading={eventsLoading}
                  severity={null}
                  onSeverityChange={() => {}}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tenants' && (
          <TenantsTable
            tenants={tenants}
            loading={tenantsLoading}
            search={tenantSearch}
            onSearchChange={setTenantSearch}
          />
        )}

        {activeTab === 'users' && (
          <UsersTable
            users={users}
            loading={usersLoading}
            search={userSearch}
            onSearchChange={setUserSearch}
            onAction={performAction}
            currentUserId={user?.id}
          />
        )}

        {activeTab === 'security' && (
          <SecurityMonitor
            events={events}
            loading={eventsLoading}
            severity={severity}
            onSeverityChange={setSeverity}
          />
        )}
      </div>
    </div>
  );
}
```

### 確認ポイント

- [ ] `app/(app)/super-admin/page.tsx` が作成された
- [ ] タブ切り替えが実装されている
- [ ] SA権限チェックが実装されている

---

## Step 7: ナビゲーション更新

### ファイル: `app/(app)/layout.tsx` を編集

NAV_ITEMS に Super Admin リンクを追加:

```typescript
import { Shield } from 'lucide-react';

// NAV_ITEMS 配列の最後に追加
{ href: '/super-admin', label: 'Super Admin', icon: Shield },
```

**注意**: Super Admin リンクは SA ユーザーのみに表示すべきですが、簡易実装では全員に表示して、ページ側でアクセス制御します。

### 確認ポイント

- [ ] ナビゲーションに Super Admin リンクが追加された

---

## Step 8: CSS スタイル追加

### ファイル: `app/globals.css` に追加

```css
/* ==========================================
   Super Admin Dashboard Styles
   ========================================== */

.sa-page {
  padding: 20px;
}

.sa-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
}

.sa-header h1 {
  font-size: 24px;
  font-weight: 600;
  color: var(--text-dark);
}

.sa-loading-full,
.sa-access-denied {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  gap: 16px;
  color: var(--text-muted);
}

.sa-access-denied h2 {
  color: var(--text-dark);
  margin: 0;
}

/* Tabs */
.sa-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  border-bottom: 1px solid var(--border);
  padding-bottom: 8px;
}

.sa-tab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border: none;
  background: none;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s;
}

.sa-tab:hover {
  background: var(--bg-hover);
  color: var(--text);
}

.sa-tab.active {
  background: var(--ws-secondary);
  color: white;
}

/* Stats Cards */
.stat-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 8px;
}

.stat-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 12px;
}

.stat-content {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-dark);
}

.stat-title {
  font-size: 14px;
  color: var(--text-muted);
}

.stat-subtitle {
  font-size: 12px;
  color: var(--text-light);
}

/* Table Container */
.sa-table-container {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
}

.sa-table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid var(--border);
}

.sa-table-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.sa-search {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 6px;
}

.sa-search input {
  border: none;
  background: none;
  outline: none;
  width: 200px;
  color: var(--text);
}

.sa-loading,
.sa-empty {
  padding: 40px;
  text-align: center;
  color: var(--text-muted);
}

/* Table */
.sa-table {
  width: 100%;
  border-collapse: collapse;
}

.sa-table th,
.sa-table td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid var(--border);
}

.sa-table th {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  background: var(--bg);
}

.sa-table tbody tr:hover {
  background: var(--bg-hover);
}

.sa-table tbody tr.inactive {
  opacity: 0.6;
}

/* Tenant Name */
.tenant-name {
  display: flex;
  flex-direction: column;
}

.tenant-slug {
  font-size: 12px;
  color: var(--text-muted);
}

/* User Info */
.user-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.user-email {
  font-weight: 500;
}

.user-name {
  font-size: 12px;
  color: var(--text-muted);
}

.badge-sa {
  display: inline-block;
  padding: 2px 6px;
  font-size: 10px;
  font-weight: 600;
  color: white;
  background: #8b5cf6;
  border-radius: 4px;
  margin-top: 4px;
  width: fit-content;
}

/* Status Badge */
.status-badge {
  display: inline-block;
  padding: 4px 8px;
  font-size: 12px;
  border-radius: 4px;
}

.status-badge.active {
  background: #dcfce7;
  color: #166534;
}

.status-badge.inactive {
  background: #fee2e2;
  color: #991b1b;
}

/* Security Monitor */
.security-monitor {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 8px;
}

.security-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid var(--border);
}

.security-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.severity-filter {
  display: flex;
  align-items: center;
  gap: 8px;
}

.severity-filter select {
  padding: 6px 12px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--bg);
  color: var(--text);
}

.security-events-list {
  max-height: 400px;
  overflow-y: auto;
}

.security-event {
  display: flex;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
}

.security-event:last-child {
  border-bottom: none;
}

.security-event.severity-critical {
  background: #fef2f2;
}

.security-event.severity-warning {
  background: #fffbeb;
}

.event-icon {
  flex-shrink: 0;
  margin-top: 2px;
}

.event-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.event-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.event-type {
  font-weight: 500;
  font-size: 14px;
}

.event-time {
  font-size: 12px;
  color: var(--text-muted);
}

.event-user,
.event-ip {
  font-size: 12px;
  color: var(--text-muted);
}

/* Overview Sections */
.sa-overview-sections {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

@media (max-width: 1024px) {
  .sa-overview-sections {
    grid-template-columns: 1fr;
  }
}

.sa-section h3 {
  margin-bottom: 16px;
  font-size: 16px;
  font-weight: 600;
}
```

### 確認ポイント

- [ ] CSS スタイルが追加された

---

## Step 9: 型チェック & ビルド

```bash
npm run type-check
npm run build
```

### 確認ポイント

- [ ] 型エラーがない
- [ ] ビルドが成功する

---

## Step 10: 動作確認

1. ブラウザで `/super-admin` にアクセス
2. SA権限がないユーザーはアクセス拒否されることを確認
3. SA権限があるユーザーでアクセスし、以下を確認:
   - [ ] 統計カードが表示される
   - [ ] テナント一覧が表示される
   - [ ] ユーザー一覧が表示される
   - [ ] セキュリティイベントが表示される
   - [ ] ユーザーの有効化/無効化ができる
   - [ ] SA権限の付与/剥奪ができる

---

## Step 11: Git プッシュ

```bash
git add -A
git commit -m "feat: Phase 19 - Super Admin ダッシュボードを実装

- Supabase テーブル: system_metrics, security_events 追加
- lib/types/super-admin.ts: SA機能の型定義
- lib/supabase/check-super-admin.ts: SA権限チェック
- app/api/super-admin/: SA専用API (stats, tenants, users, security-events)
- lib/hooks/useSuperAdmin.ts: SAフック群
- components/super-admin/: UIコンポーネント
- app/(app)/super-admin/page.tsx: SAダッシュボード

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"

git push origin main
```

---

## 完了チェックリスト

### データベース
- [ ] profiles.is_super_admin カラムが追加された
- [ ] system_metrics テーブルが作成された
- [ ] security_events テーブルが作成された
- [ ] RLS ポリシーが設定された
- [ ] 自分のアカウントが SA に設定された

### 型定義
- [ ] lib/types/super-admin.ts が作成された

### API Routes
- [ ] lib/supabase/check-super-admin.ts が作成された
- [ ] app/api/super-admin/stats/route.ts が作成された
- [ ] app/api/super-admin/tenants/route.ts が作成された
- [ ] app/api/super-admin/users/route.ts が作成された
- [ ] app/api/super-admin/users/[userId]/route.ts が作成された
- [ ] app/api/super-admin/security-events/route.ts が作成された

### React Hooks
- [ ] lib/hooks/useSuperAdmin.ts が作成された

### UI コンポーネント
- [ ] components/super-admin/StatCard.tsx が作成された
- [ ] components/super-admin/TenantsTable.tsx が作成された
- [ ] components/super-admin/UsersTable.tsx が作成された
- [ ] components/super-admin/SecurityMonitor.tsx が作成された
- [ ] components/super-admin/index.ts が作成された

### ページ
- [ ] app/(app)/super-admin/page.tsx が作成された

### スタイル
- [ ] Super Admin 用 CSS が追加された

### 品質
- [ ] 型チェックが通る
- [ ] ビルドが成功する
- [ ] SA権限チェックが正常に動作する
- [ ] Git にプッシュされた

---

## 次のステップ

Phase 19 完了後は、以下の追加機能を検討できます:

- メトリクスの定期記録（Cron Job）
- ダッシュボードのグラフ表示
- ユーザーへのメール通知
- より詳細なセキュリティ監視
