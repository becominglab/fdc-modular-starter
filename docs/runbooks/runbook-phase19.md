# Phase 19: Super Admin（システム全体管理）機能

## 概要
システム全体を管理するSuper Admin（SA）機能を実装し、全テナント・ワークスペースの管理、ユーザー管理、システムメトリクス表示、セキュリティ監視を可能にする。

## 習得する新しい概念

| 概念 | 説明 |
|------|------|
| Super Admin (SA) | システム全体を管理する最上位権限 |
| マルチテナント | 複数の組織を1つのシステムで管理 |
| システムメトリクス | ユーザー数、API呼び出し数などの指標 |
| セキュリティ監視 | 不正アクセスの検知 |

## 権限階層

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

## 前提条件
- [ ] Phase 18 完了（ワークスペース管理が動作）
- [ ] Supabase プロジェクトにアクセス可能

---

## Step 1: Supabase テーブル更新

### 1.1 profiles テーブルに is_super_admin カラム追加

Supabase ダッシュボード > SQL Editor で実行:

```sql
-- profiles テーブルに is_super_admin カラム追加
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT false;

-- 既存ユーザーを SA に昇格させる場合（メールアドレスで指定）
-- UPDATE profiles SET is_super_admin = true WHERE email = 'admin@example.com';

-- SA用のRLSポリシー追加（SA は全データ読み取り可能）
CREATE POLICY "Super admins can read all profiles" ON profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );
```

### 1.2 system_metrics テーブル作成

```sql
-- system_metrics テーブル作成
CREATE TABLE IF NOT EXISTS system_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type TEXT NOT NULL CHECK (metric_type IN ('active_users', 'api_calls', 'storage_used', 'login_count')),
  value NUMERIC NOT NULL DEFAULT 0,
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_system_metrics_type_date
  ON system_metrics(metric_type, recorded_at DESC);

-- RLS有効化
ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;

-- SA のみ読み取り可能
CREATE POLICY "Super admins can read system_metrics" ON system_metrics
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

-- SA のみ書き込み可能
CREATE POLICY "Super admins can insert system_metrics" ON system_metrics
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );
```

### 1.3 security_events テーブル作成

```sql
-- security_events テーブル作成（不審なアクセス記録用）
CREATE TABLE IF NOT EXISTS security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL CHECK (event_type IN ('failed_login', 'suspicious_activity', 'permission_denied', 'rate_limit_exceeded')),
  user_id UUID REFERENCES auth.users(id),
  ip_address INET,
  user_agent TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_security_events_type_date
  ON security_events(event_type, created_at DESC);

-- RLS有効化
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;

-- SA のみ読み取り可能
CREATE POLICY "Super admins can read security_events" ON security_events
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );
```

**確認ポイント:**
- [ ] profiles テーブルに is_super_admin カラムが追加された
- [ ] system_metrics テーブルが作成された
- [ ] security_events テーブルが作成された
- [ ] RLS ポリシーが正しく設定された

---

## Step 2: 型定義作成

### ファイル: `lib/types/super-admin.ts`

```typescript
/**
 * lib/types/super-admin.ts
 *
 * Super Admin 関連の型定義
 */

// テナント（ワークスペース）サマリー
export interface TenantSummary {
  workspaceId: string;
  workspaceName: string;
  ownerEmail: string;
  memberCount: number;
  createdAt: string;
  lastActivityAt: string | null;
  isActive: boolean;
}

// システムメトリクス
export type MetricType = 'active_users' | 'api_calls' | 'storage_used' | 'login_count';

export interface SystemMetric {
  id: string;
  metricType: MetricType;
  value: number;
  recordedAt: string;
  metadata?: Record<string, unknown>;
}

// システム統計サマリー
export interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  totalWorkspaces: number;
  totalTasks: number;
  totalProspects: number;
  totalClients: number;
}

// セキュリティイベント
export type SecurityEventType =
  | 'failed_login'
  | 'suspicious_activity'
  | 'permission_denied'
  | 'rate_limit_exceeded';

export interface SecurityEvent {
  id: string;
  eventType: SecurityEventType;
  userId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  details: Record<string, unknown>;
  createdAt: string;
}

// ユーザー管理用
export interface ManagedUser {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  isSuperAdmin: boolean;
  isActive: boolean;
  createdAt: string;
  lastSignInAt: string | null;
  workspaceCount: number;
}

// ユーザーアクション
export type UserAction = 'suspend' | 'activate' | 'delete' | 'promote_sa' | 'demote_sa';
```

**確認ポイント:**
- [ ] lib/types/super-admin.ts が作成された
- [ ] 型定義がエクスポートされている

---

## Step 3: Super Admin API 作成

### 3.1 SA統計API: `app/api/super-admin/stats/route.ts`

```typescript
/**
 * app/api/super-admin/stats/route.ts
 *
 * GET /api/super-admin/stats - システム統計取得
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // SA 権限チェック
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_super_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_super_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 各種統計を取得
    const [
      { count: totalUsers },
      { count: totalWorkspaces },
      { count: totalTasks },
      { count: totalProspects },
      { count: totalClients },
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('workspaces').select('*', { count: 'exact', head: true }),
      supabase.from('tasks').select('*', { count: 'exact', head: true }),
      supabase.from('prospects').select('*', { count: 'exact', head: true }),
      supabase.from('clients').select('*', { count: 'exact', head: true }),
    ]);

    // 過去7日間のアクティブユーザー数（audit_logsから推定）
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: recentActivity } = await supabase
      .from('audit_logs')
      .select('user_id')
      .gte('created_at', sevenDaysAgo.toISOString());

    const activeUsers = new Set(recentActivity?.map(a => a.user_id) || []).size;

    return NextResponse.json({
      totalUsers: totalUsers || 0,
      activeUsers,
      totalWorkspaces: totalWorkspaces || 0,
      totalTasks: totalTasks || 0,
      totalProspects: totalProspects || 0,
      totalClients: totalClients || 0,
    });
  } catch (error) {
    console.error('Super admin stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### 3.2 テナント一覧API: `app/api/super-admin/tenants/route.ts`

```typescript
/**
 * app/api/super-admin/tenants/route.ts
 *
 * GET /api/super-admin/tenants - 全テナント（ワークスペース）一覧
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // SA 権限チェック
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_super_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_super_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // ワークスペース一覧取得
    let query = supabase
      .from('workspaces')
      .select(`
        id,
        name,
        created_at,
        workspace_members!inner(
          user_id,
          role,
          profiles!inner(email)
        )
      `, { count: 'exact' });

    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    const { data: workspaces, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // テナントサマリーに変換
    const tenants = workspaces?.map((ws) => {
      const owner = ws.workspace_members.find((m: { role: string }) => m.role === 'owner');
      return {
        workspaceId: ws.id,
        workspaceName: ws.name,
        ownerEmail: owner?.profiles?.email || 'Unknown',
        memberCount: ws.workspace_members.length,
        createdAt: ws.created_at,
        lastActivityAt: null, // 後で実装可能
        isActive: true,
      };
    }) || [];

    return NextResponse.json({
      tenants,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Super admin tenants error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### 3.3 ユーザー管理API: `app/api/super-admin/users/route.ts`

```typescript
/**
 * app/api/super-admin/users/route.ts
 *
 * GET /api/super-admin/users - 全ユーザー一覧
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // SA 権限チェック
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_super_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_super_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // ユーザー一覧取得
    let query = supabase
      .from('profiles')
      .select('*', { count: 'exact' });

    if (search) {
      query = query.or(`email.ilike.%${search}%,display_name.ilike.%${search}%`);
    }

    const { data: users, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // ワークスペース数を取得
    const userIds = users?.map(u => u.id) || [];
    const { data: memberCounts } = await supabase
      .from('workspace_members')
      .select('user_id')
      .in('user_id', userIds);

    const workspaceCountMap = new Map<string, number>();
    memberCounts?.forEach(m => {
      workspaceCountMap.set(m.user_id, (workspaceCountMap.get(m.user_id) || 0) + 1);
    });

    const managedUsers = users?.map(u => ({
      id: u.id,
      email: u.email,
      displayName: u.display_name,
      avatarUrl: u.avatar_url,
      isSuperAdmin: u.is_super_admin || false,
      isActive: true, // 停止機能実装時に更新
      createdAt: u.created_at,
      lastSignInAt: null,
      workspaceCount: workspaceCountMap.get(u.id) || 0,
    })) || [];

    return NextResponse.json({
      users: managedUsers,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Super admin users error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### 3.4 ユーザーアクションAPI: `app/api/super-admin/users/[userId]/route.ts`

```typescript
/**
 * app/api/super-admin/users/[userId]/route.ts
 *
 * PATCH /api/super-admin/users/[userId] - ユーザーステータス更新
 * DELETE /api/super-admin/users/[userId] - ユーザー削除
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { UserAction } from '@/lib/types/super-admin';

interface RouteParams {
  params: Promise<{ userId: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // SA 権限チェック
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_super_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_super_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 自分自身は変更不可
    if (userId === user.id) {
      return NextResponse.json({ error: '自分自身のステータスは変更できません' }, { status: 400 });
    }

    const body = await request.json();
    const action = body.action as UserAction;

    let updateData: Record<string, unknown> = {};

    switch (action) {
      case 'promote_sa':
        updateData = { is_super_admin: true };
        break;
      case 'demote_sa':
        updateData = { is_super_admin: false };
        break;
      case 'suspend':
        updateData = { is_active: false };
        break;
      case 'activate':
        updateData = { is_active: true };
        break;
      default:
        return NextResponse.json({ error: '無効なアクションです' }, { status: 400 });
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true, action });
  } catch (error) {
    console.error('Super admin user action error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // SA 権限チェック
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_super_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_super_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 自分自身は削除不可
    if (userId === user.id) {
      return NextResponse.json({ error: '自分自身は削除できません' }, { status: 400 });
    }

    // ユーザーのワークスペースメンバーシップを削除
    await supabase
      .from('workspace_members')
      .delete()
      .eq('user_id', userId);

    // プロフィールを削除（カスケード設定による）
    const { error: deleteError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Super admin user delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### 3.5 セキュリティイベントAPI: `app/api/super-admin/security-events/route.ts`

```typescript
/**
 * app/api/super-admin/security-events/route.ts
 *
 * GET /api/super-admin/security-events - セキュリティイベント一覧
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // SA 権限チェック
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_super_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_super_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const eventType = searchParams.get('type');
    const days = parseInt(searchParams.get('days') || '7');
    const limit = parseInt(searchParams.get('limit') || '50');

    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);

    let query = supabase
      .from('security_events')
      .select('*')
      .gte('created_at', sinceDate.toISOString())
      .order('created_at', { ascending: false })
      .limit(limit);

    if (eventType) {
      query = query.eq('event_type', eventType);
    }

    const { data: events, error } = await query;

    if (error) throw error;

    // イベントタイプ別の集計
    const summary = {
      failed_login: 0,
      suspicious_activity: 0,
      permission_denied: 0,
      rate_limit_exceeded: 0,
    };

    events?.forEach(e => {
      if (summary.hasOwnProperty(e.event_type)) {
        summary[e.event_type as keyof typeof summary]++;
      }
    });

    return NextResponse.json({
      events: events || [],
      summary,
    });
  } catch (error) {
    console.error('Super admin security events error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

**確認ポイント:**
- [ ] app/api/super-admin/stats/route.ts が作成された
- [ ] app/api/super-admin/tenants/route.ts が作成された
- [ ] app/api/super-admin/users/route.ts が作成された
- [ ] app/api/super-admin/users/[userId]/route.ts が作成された
- [ ] app/api/super-admin/security-events/route.ts が作成された

---

## Step 4: SA ダッシュボードコンポーネント作成

### 4.1 統計カード: `components/admin/SAStatsCard.tsx`

```typescript
/**
 * components/admin/SAStatsCard.tsx
 *
 * Super Admin 統計カード
 */

'use client';

import { LucideIcon } from 'lucide-react';

interface SAStatsCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  description?: string;
}

export function SAStatsCard({ title, value, icon: Icon, description }: SAStatsCardProps) {
  return (
    <div className="bg-white rounded-lg border p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value.toLocaleString()}</p>
          {description && (
            <p className="text-xs text-gray-400 mt-1">{description}</p>
          )}
        </div>
        <div className="p-2 bg-indigo-50 rounded-lg">
          <Icon size={20} className="text-indigo-600" />
        </div>
      </div>
    </div>
  );
}
```

### 4.2 テナント一覧: `components/admin/TenantList.tsx`

```typescript
/**
 * components/admin/TenantList.tsx
 *
 * テナント（ワークスペース）一覧
 */

'use client';

import { useState, useEffect } from 'react';
import { Search, Building2, Users, Loader2 } from 'lucide-react';
import type { TenantSummary } from '@/lib/types/super-admin';

export function TenantList() {
  const [tenants, setTenants] = useState<TenantSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchTenants();
  }, [search]);

  const fetchTenants = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);

      const res = await fetch(`/api/super-admin/tenants?${params}`);
      if (res.ok) {
        const data = await res.json();
        setTenants(data.tenants);
      }
    } catch (error) {
      console.error('Failed to fetch tenants:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border shadow-sm">
      <div className="p-4 border-b">
        <div className="flex items-center gap-2">
          <Building2 size={20} className="text-gray-500" />
          <h3 className="font-medium">テナント一覧</h3>
        </div>
        <div className="mt-3 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="ワークスペース名で検索..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border rounded-md text-sm"
          />
        </div>
      </div>

      <div className="divide-y max-h-96 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="animate-spin text-gray-400" size={24} />
          </div>
        ) : tenants.length === 0 ? (
          <div className="py-8 text-center text-gray-400">
            テナントがありません
          </div>
        ) : (
          tenants.map((tenant) => (
            <div key={tenant.workspaceId} className="p-4 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{tenant.workspaceName}</p>
                  <p className="text-sm text-gray-500">{tenant.ownerEmail}</p>
                </div>
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <Users size={14} />
                  <span>{tenant.memberCount}</span>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                作成: {new Date(tenant.createdAt).toLocaleDateString('ja-JP')}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
```

### 4.3 ユーザー管理: `components/admin/UserManagement.tsx`

```typescript
/**
 * components/admin/UserManagement.tsx
 *
 * ユーザー管理コンポーネント
 */

'use client';

import { useState, useEffect } from 'react';
import { Search, User, Shield, ShieldOff, Trash2, Loader2 } from 'lucide-react';
import type { ManagedUser, UserAction } from '@/lib/types/super-admin';

export function UserManagement() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, [search]);

  const fetchUsers = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);

      const res = await fetch(`/api/super-admin/users?${params}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (userId: string, action: UserAction) => {
    if (!confirm(`この操作を実行しますか？`)) return;

    setActionLoading(userId);
    try {
      const res = await fetch(`/api/super-admin/users/${userId}`, {
        method: action === 'delete' ? 'DELETE' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (res.ok) {
        fetchUsers();
      }
    } catch (error) {
      console.error('Action failed:', error);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="bg-white rounded-lg border shadow-sm">
      <div className="p-4 border-b">
        <div className="flex items-center gap-2">
          <User size={20} className="text-gray-500" />
          <h3 className="font-medium">ユーザー管理</h3>
        </div>
        <div className="mt-3 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="メールアドレスで検索..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border rounded-md text-sm"
          />
        </div>
      </div>

      <div className="divide-y max-h-96 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="animate-spin text-gray-400" size={24} />
          </div>
        ) : users.length === 0 ? (
          <div className="py-8 text-center text-gray-400">
            ユーザーがいません
          </div>
        ) : (
          users.map((user) => (
            <div key={user.id} className="p-4 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                    <User size={16} className="text-gray-500" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">
                        {user.displayName || user.email}
                      </p>
                      {user.isSuperAdmin && (
                        <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded">
                          SA
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {actionLoading === user.id ? (
                    <Loader2 className="animate-spin text-gray-400" size={16} />
                  ) : (
                    <>
                      <button
                        onClick={() => handleAction(
                          user.id,
                          user.isSuperAdmin ? 'demote_sa' : 'promote_sa'
                        )}
                        className="p-1.5 text-gray-400 hover:text-indigo-600 rounded"
                        title={user.isSuperAdmin ? 'SA権限を解除' : 'SAに昇格'}
                      >
                        {user.isSuperAdmin ? <ShieldOff size={16} /> : <Shield size={16} />}
                      </button>
                      <button
                        onClick={() => handleAction(user.id, 'delete')}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded"
                        title="削除"
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                WS: {user.workspaceCount} | 作成: {new Date(user.createdAt).toLocaleDateString('ja-JP')}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
```

### 4.4 セキュリティモニター: `components/admin/SecurityMonitor.tsx`

```typescript
/**
 * components/admin/SecurityMonitor.tsx
 *
 * セキュリティイベントモニター
 */

'use client';

import { useState, useEffect } from 'react';
import { Shield, AlertTriangle, Clock, Loader2 } from 'lucide-react';
import type { SecurityEvent } from '@/lib/types/super-admin';

const EVENT_LABELS: Record<string, { label: string; color: string }> = {
  failed_login: { label: 'ログイン失敗', color: 'text-yellow-600 bg-yellow-50' },
  suspicious_activity: { label: '不審な活動', color: 'text-red-600 bg-red-50' },
  permission_denied: { label: '権限拒否', color: 'text-orange-600 bg-orange-50' },
  rate_limit_exceeded: { label: 'レート制限', color: 'text-blue-600 bg-blue-50' },
};

export function SecurityMonitor() {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const res = await fetch('/api/super-admin/security-events?days=7&limit=20');
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events);
        setSummary(data.summary);
      }
    } catch (error) {
      console.error('Failed to fetch security events:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalEvents = Object.values(summary).reduce((a, b) => a + b, 0);

  return (
    <div className="bg-white rounded-lg border shadow-sm">
      <div className="p-4 border-b">
        <div className="flex items-center gap-2">
          <Shield size={20} className="text-gray-500" />
          <h3 className="font-medium">セキュリティモニター</h3>
        </div>
        <p className="text-sm text-gray-500 mt-1">過去7日間: {totalEvents}件</p>
      </div>

      {/* サマリー */}
      <div className="grid grid-cols-2 gap-2 p-4 border-b">
        {Object.entries(EVENT_LABELS).map(([key, { label, color }]) => (
          <div key={key} className={`px-3 py-2 rounded-lg ${color.split(' ')[1]}`}>
            <p className={`text-xs ${color.split(' ')[0]}`}>{label}</p>
            <p className={`text-lg font-bold ${color.split(' ')[0]}`}>
              {summary[key] || 0}
            </p>
          </div>
        ))}
      </div>

      {/* イベント一覧 */}
      <div className="divide-y max-h-64 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="animate-spin text-gray-400" size={24} />
          </div>
        ) : events.length === 0 ? (
          <div className="py-8 text-center text-gray-400">
            イベントがありません
          </div>
        ) : (
          events.map((event) => {
            const config = EVENT_LABELS[event.eventType] || { label: event.eventType, color: 'text-gray-600 bg-gray-50' };
            return (
              <div key={event.id} className="p-3 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={14} className={config.color.split(' ')[0]} />
                    <span className={`text-xs px-1.5 py-0.5 rounded ${config.color}`}>
                      {config.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Clock size={12} />
                    {new Date(event.createdAt).toLocaleString('ja-JP')}
                  </div>
                </div>
                {event.ipAddress && (
                  <p className="text-xs text-gray-500 mt-1">IP: {event.ipAddress}</p>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
```

**確認ポイント:**
- [ ] components/admin/SAStatsCard.tsx が作成された
- [ ] components/admin/TenantList.tsx が作成された
- [ ] components/admin/UserManagement.tsx が作成された
- [ ] components/admin/SecurityMonitor.tsx が作成された

---

## Step 5: 管理ページ更新

### ファイル: `app/(app)/admin/page.tsx`

```typescript
/**
 * app/(app)/admin/page.tsx
 *
 * 管理者ページ（SA機能を含む）
 */

'use client';

import { useEffect, useState } from 'react';
import { Shield, Users, Building2, CheckSquare, Target, Briefcase, Loader2 } from 'lucide-react';
import { SAStatsCard } from '@/components/admin/SAStatsCard';
import { TenantList } from '@/components/admin/TenantList';
import { UserManagement } from '@/components/admin/UserManagement';
import { SecurityMonitor } from '@/components/admin/SecurityMonitor';
import type { SystemStats } from '@/lib/types/super-admin';

export default function AdminPage() {
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean | null>(null);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSuperAdmin();
  }, []);

  const checkSuperAdmin = async () => {
    try {
      const res = await fetch('/api/super-admin/stats');
      if (res.ok) {
        const data = await res.json();
        setIsSuperAdmin(true);
        setStats(data);
      } else if (res.status === 403) {
        setIsSuperAdmin(false);
      }
    } catch {
      setIsSuperAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-gray-400" size={32} />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="text-center py-16">
        <Shield size={48} className="mx-auto text-gray-300 mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">アクセス権限がありません</h2>
        <p className="text-gray-500">このページはSuper Admin専用です。</p>
      </div>
    );
  }

  return (
    <div>
      {/* ヘッダー */}
      <div className="flex items-center gap-3 mb-6">
        <Shield size={28} className="text-indigo-600" />
        <h2 className="text-2xl font-bold text-gray-900">Super Admin</h2>
      </div>

      {/* 統計カード */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <SAStatsCard
            title="総ユーザー"
            value={stats.totalUsers}
            icon={Users}
          />
          <SAStatsCard
            title="アクティブ"
            value={stats.activeUsers}
            icon={Users}
            description="過去7日間"
          />
          <SAStatsCard
            title="ワークスペース"
            value={stats.totalWorkspaces}
            icon={Building2}
          />
          <SAStatsCard
            title="タスク"
            value={stats.totalTasks}
            icon={CheckSquare}
          />
          <SAStatsCard
            title="リード"
            value={stats.totalProspects}
            icon={Target}
          />
          <SAStatsCard
            title="クライアント"
            value={stats.totalClients}
            icon={Briefcase}
          />
        </div>
      )}

      {/* メインコンテンツ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TenantList />
        <UserManagement />
      </div>

      {/* セキュリティモニター */}
      <div className="mt-6">
        <SecurityMonitor />
      </div>
    </div>
  );
}
```

**確認ポイント:**
- [ ] app/(app)/admin/page.tsx が更新された
- [ ] SA以外はアクセス拒否される

---

## Step 6: 型生成 & ビルド確認

```bash
# Supabase 型生成
npm run supabase:types

# TypeScript 型チェック
npm run type-check

# ビルド
npm run build
```

**確認ポイント:**
- [ ] 型チェックが通る
- [ ] ビルドが成功する

---

## Step 7: 動作確認

### 7.1 SA権限の付与

Supabase SQL Editor で実行:
```sql
-- 自分のユーザーを SA に昇格
UPDATE profiles
SET is_super_admin = true
WHERE email = 'your-email@example.com';
```

### 7.2 機能テスト

1. `/admin` にアクセス
2. 統計カードが表示される
3. テナント一覧が表示される
4. ユーザー管理が機能する
5. セキュリティモニターが表示される

**確認ポイント:**
- [ ] SA でない場合はアクセス拒否画面が表示される
- [ ] SA の場合はダッシュボードが表示される
- [ ] テナント検索が機能する
- [ ] ユーザーの SA 昇格/降格が機能する
- [ ] ユーザー削除が機能する

---

## 完了チェックリスト

- [ ] **Step 1**: Supabase テーブル更新完了
  - [ ] profiles に is_super_admin カラム追加
  - [ ] system_metrics テーブル作成
  - [ ] security_events テーブル作成
  - [ ] RLS ポリシー設定

- [ ] **Step 2**: 型定義作成完了
  - [ ] lib/types/super-admin.ts

- [ ] **Step 3**: API 作成完了
  - [ ] /api/super-admin/stats
  - [ ] /api/super-admin/tenants
  - [ ] /api/super-admin/users
  - [ ] /api/super-admin/users/[userId]
  - [ ] /api/super-admin/security-events

- [ ] **Step 4**: コンポーネント作成完了
  - [ ] SAStatsCard
  - [ ] TenantList
  - [ ] UserManagement
  - [ ] SecurityMonitor

- [ ] **Step 5**: 管理ページ更新完了
  - [ ] app/(app)/admin/page.tsx

- [ ] **Step 6**: ビルド確認完了
  - [ ] 型チェック成功
  - [ ] ビルド成功

- [ ] **Step 7**: 動作確認完了
  - [ ] SA 権限チェック動作
  - [ ] 統計表示
  - [ ] テナント管理
  - [ ] ユーザー管理
  - [ ] セキュリティ監視

---

## 注意事項

1. **セキュリティ**: SA API は必ず権限チェックを実装
2. **自己保護**: 自分自身の SA 権限削除は禁止
3. **監査**: 重要な操作はログに記録
4. **RLS**: SA は全データにアクセス可能だが、ポリシーは厳格に設定
