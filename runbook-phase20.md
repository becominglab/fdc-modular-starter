# Phase 20: ワークスペース管理者機能

## 目標

Phase 5 の RBAC を活用し、ワークスペース管理者機能を実装：
- メンバー一覧・ロール表示
- 招待機能（招待リンク生成）
- ロール変更（OWNER/ADMIN/MEMBER）
- 監査ログ（操作履歴）

---

## ワークスペース管理とは

```
ワークスペースのメンバーと権限を管理する機能。

┌─────────────────────────────────────────────────────────────────┐
│                        OWNER（オーナー）                         │
│  - 全権限                                                       │
│  - ワークスペース削除                                            │
│  - 他のOWNER任命                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                        ADMIN（管理者）                           │
│  - メンバー招待                                                  │
│  - ロール変更（MEMBER のみ）                                     │
│  - メンバー削除（MEMBER のみ）                                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                        MEMBER（メンバー）                        │
│  - 通常の操作のみ                                               │
│  - 管理機能へのアクセス不可                                      │
└─────────────────────────────────────────────────────────────────┘

【フロー】
管理者ページ → メンバー一覧 → 招待/ロール変更/削除 → 監査ログ記録
```

---

## 習得する新しい概念

| 概念 | 説明 |
|------|------|
| ワークスペース管理 | メンバーの追加・削除・権限変更 |
| 招待トークン | URLに埋め込む一時的な認証情報 |
| 監査ログ | 誰がいつ何をしたかの操作履歴 |
| 権限チェック | クライアント + サーバーの両方で検証 |

---

## 前提条件

- [ ] Phase 5 完了（RBAC 動作）
- [ ] workspace_members テーブルにロール情報がある
- [ ] Supabase + 認証が動作
- [ ] 開発サーバーが起動している

---

## Step 1: データベーススキーマ作成

### 1.1 マイグレーションファイル作成

**ファイル:** `supabase/migrations/20260114_phase20_admin.sql`

```sql
-- Phase 20: ワークスペース管理者機能

-- =============================================
-- invitations テーブル（招待）
-- =============================================
CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_invitations_workspace_id ON invitations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);

-- RLS 有効化
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- RLS ポリシー（OWNER/ADMIN のみ）
DROP POLICY IF EXISTS "Admins can view workspace invitations" ON invitations;
CREATE POLICY "Admins can view workspace invitations" ON invitations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = invitations.workspace_id
        AND workspace_members.user_id = auth.uid()
        AND workspace_members.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Admins can create invitations" ON invitations;
CREATE POLICY "Admins can create invitations" ON invitations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = invitations.workspace_id
        AND workspace_members.user_id = auth.uid()
        AND workspace_members.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Admins can delete invitations" ON invitations;
CREATE POLICY "Admins can delete invitations" ON invitations
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = invitations.workspace_id
        AND workspace_members.user_id = auth.uid()
        AND workspace_members.role IN ('owner', 'admin')
    )
  );

-- =============================================
-- audit_logs テーブル（監査ログ）
-- =============================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_audit_logs_workspace_id ON audit_logs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- RLS 有効化
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS ポリシー（OWNER/ADMIN のみ閲覧可、挿入は全メンバー）
DROP POLICY IF EXISTS "Admins can view audit logs" ON audit_logs;
CREATE POLICY "Admins can view audit logs" ON audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = audit_logs.workspace_id
        AND workspace_members.user_id = auth.uid()
        AND workspace_members.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Members can insert audit logs" ON audit_logs;
CREATE POLICY "Members can insert audit logs" ON audit_logs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = audit_logs.workspace_id
        AND workspace_members.user_id = auth.uid()
    )
  );

-- コメント
COMMENT ON TABLE invitations IS 'ワークスペース招待';
COMMENT ON TABLE audit_logs IS '監査ログ（操作履歴）';
COMMENT ON COLUMN invitations.token IS '招待トークン（URL埋め込み用）';
COMMENT ON COLUMN invitations.expires_at IS '招待の有効期限';
COMMENT ON COLUMN audit_logs.action IS '操作種別: invite_sent, invite_accepted, role_changed, member_removed, etc.';
COMMENT ON COLUMN audit_logs.details IS '操作の詳細情報（JSON）';
```

### 1.2 マイグレーション実行

```bash
supabase db push
```

### 確認ポイント

- [ ] マイグレーションが成功した
- [ ] invitations テーブルが作成された
- [ ] audit_logs テーブルが作成された
- [ ] RLS ポリシーが設定された

---

## Step 2: 型定義の作成

### 2.1 管理者機能型定義

**ファイル:** `lib/types/admin.ts`

```typescript
/**
 * lib/types/admin.ts
 *
 * ワークスペース管理者機能の型定義
 */

// ワークスペースロール
export type WorkspaceRole = 'owner' | 'admin' | 'member';

// 招待
export interface Invitation {
  id: string;
  workspace_id: string;
  email: string;
  role: 'admin' | 'member';
  token: string;
  expires_at: string;
  created_by: string;
  accepted_at: string | null;
  created_at: string;
}

// 招待作成用
export interface InvitationCreate {
  workspace_id: string;
  email: string;
  role?: 'admin' | 'member';
}

// 監査ログアクション
export type AuditAction =
  | 'invite_sent'
  | 'invite_accepted'
  | 'invite_revoked'
  | 'role_changed'
  | 'member_removed'
  | 'workspace_updated'
  | 'workspace_deleted';

// 監査ログ
export interface AuditLog {
  id: string;
  workspace_id: string;
  user_id: string;
  action: AuditAction | string;
  target_type: string | null;
  target_id: string | null;
  details: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

// メンバー（workspace_members + users 情報）
export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  joined_at: string;
  user?: {
    id: string;
    email: string;
    full_name?: string;
    avatar_url?: string;
  };
}

// ロール変更用
export interface RoleChangeRequest {
  member_id: string;
  new_role: WorkspaceRole;
}

// ロール表示情報
export const ROLE_INFO: Record<WorkspaceRole, {
  label: string;
  labelEn: string;
  description: string;
  color: string;
  canManageMembers: boolean;
  canDeleteWorkspace: boolean;
}> = {
  owner: {
    label: 'オーナー',
    labelEn: 'Owner',
    description: '全権限を持つワークスペースの所有者',
    color: '#f59e0b',
    canManageMembers: true,
    canDeleteWorkspace: true,
  },
  admin: {
    label: '管理者',
    labelEn: 'Admin',
    description: 'メンバー管理が可能な管理者',
    color: '#8b5cf6',
    canManageMembers: true,
    canDeleteWorkspace: false,
  },
  member: {
    label: 'メンバー',
    labelEn: 'Member',
    description: '通常のメンバー',
    color: '#6b7280',
    canManageMembers: false,
    canDeleteWorkspace: false,
  },
};

// 監査ログアクション表示情報
export const AUDIT_ACTION_INFO: Record<string, {
  label: string;
  icon: string;
}> = {
  invite_sent: { label: '招待を送信', icon: 'mail' },
  invite_accepted: { label: '招待を承諾', icon: 'check' },
  invite_revoked: { label: '招待を取り消し', icon: 'x' },
  role_changed: { label: 'ロールを変更', icon: 'shield' },
  member_removed: { label: 'メンバーを削除', icon: 'user-minus' },
  workspace_updated: { label: 'ワークスペースを更新', icon: 'edit' },
  workspace_deleted: { label: 'ワークスペースを削除', icon: 'trash' },
};

// 権限チェックヘルパー
export function canManageRole(
  actorRole: WorkspaceRole,
  targetRole: WorkspaceRole
): boolean {
  // OWNER は全てのロールを管理可能
  if (actorRole === 'owner') return true;
  // ADMIN は MEMBER のみ管理可能
  if (actorRole === 'admin' && targetRole === 'member') return true;
  return false;
}

export function canChangeToRole(
  actorRole: WorkspaceRole,
  newRole: WorkspaceRole
): boolean {
  // OWNER は全てのロールに変更可能
  if (actorRole === 'owner') return true;
  // ADMIN は MEMBER への変更のみ可能
  if (actorRole === 'admin' && newRole === 'member') return true;
  return false;
}
```

### 確認ポイント

- [ ] `lib/types/admin.ts` が作成された
- [ ] Invitation, AuditLog インターフェースが定義されている
- [ ] ROLE_INFO に各ロールの情報がある
- [ ] 権限チェックヘルパー関数がある

---

## Step 3: API Routes 作成

### 3.1 メンバー管理 API

**ファイル:** `app/api/workspaces/[workspaceId]/members/route.ts`

```typescript
/**
 * app/api/workspaces/[workspaceId]/members/route.ts
 *
 * GET /api/workspaces/:workspaceId/members - メンバー一覧取得
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET: メンバー一覧取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const { workspaceId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ワークスペースメンバー確認
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    // OWNER/ADMIN のみメンバー一覧取得可能
    if (!['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // メンバー一覧取得
    const { data: members, error } = await supabase
      .from('workspace_members')
      .select(`
        id,
        workspace_id,
        user_id,
        role,
        joined_at:created_at
      `)
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Members fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 });
    }

    return NextResponse.json(members);
  } catch (error) {
    console.error('Members GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### 3.2 個別メンバー API（ロール変更・削除）

**ファイル:** `app/api/workspaces/[workspaceId]/members/[memberId]/route.ts`

```typescript
/**
 * app/api/workspaces/[workspaceId]/members/[memberId]/route.ts
 *
 * PATCH /api/workspaces/:workspaceId/members/:memberId - ロール変更
 * DELETE /api/workspaces/:workspaceId/members/:memberId - メンバー削除
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const updateRoleSchema = z.object({
  role: z.enum(['admin', 'member']),
});

// PATCH: ロール変更
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; memberId: string }> }
) {
  try {
    const { workspaceId, memberId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 操作者のロール確認
    const { data: actorMembership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single();

    if (!actorMembership || !['owner', 'admin'].includes(actorMembership.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 対象メンバーの確認
    const { data: targetMember } = await supabase
      .from('workspace_members')
      .select('*')
      .eq('id', memberId)
      .eq('workspace_id', workspaceId)
      .single();

    if (!targetMember) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // OWNER は変更不可（OWNER のみ OWNER を変更可能）
    if (targetMember.role === 'owner' && actorMembership.role !== 'owner') {
      return NextResponse.json({ error: 'Cannot change owner role' }, { status: 403 });
    }

    // ADMIN は MEMBER のみ変更可能
    if (actorMembership.role === 'admin' && targetMember.role !== 'member') {
      return NextResponse.json({ error: 'Admins can only change member roles' }, { status: 403 });
    }

    const body = await request.json();
    const result = updateRoleSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', issues: result.error.issues },
        { status: 400 }
      );
    }

    // ADMIN は owner ロールへの変更不可
    if (actorMembership.role === 'admin' && result.data.role === 'owner') {
      return NextResponse.json({ error: 'Admins cannot assign owner role' }, { status: 403 });
    }

    const oldRole = targetMember.role;

    // ロール更新
    const { data: updated, error: updateError } = await supabase
      .from('workspace_members')
      .update({ role: result.data.role })
      .eq('id', memberId)
      .select()
      .single();

    if (updateError) {
      console.error('Role update error:', updateError);
      return NextResponse.json({ error: 'Failed to update role' }, { status: 500 });
    }

    // 監査ログ記録
    await supabase.from('audit_logs').insert({
      workspace_id: workspaceId,
      user_id: user.id,
      action: 'role_changed',
      target_type: 'member',
      target_id: memberId,
      details: {
        target_user_id: targetMember.user_id,
        old_role: oldRole,
        new_role: result.data.role,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Member PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE: メンバー削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; memberId: string }> }
) {
  try {
    const { workspaceId, memberId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 操作者のロール確認
    const { data: actorMembership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single();

    if (!actorMembership || !['owner', 'admin'].includes(actorMembership.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 対象メンバーの確認
    const { data: targetMember } = await supabase
      .from('workspace_members')
      .select('*')
      .eq('id', memberId)
      .eq('workspace_id', workspaceId)
      .single();

    if (!targetMember) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // 自分自身は削除不可
    if (targetMember.user_id === user.id) {
      return NextResponse.json({ error: 'Cannot remove yourself' }, { status: 400 });
    }

    // OWNER は削除不可
    if (targetMember.role === 'owner') {
      return NextResponse.json({ error: 'Cannot remove owner' }, { status: 403 });
    }

    // ADMIN は MEMBER のみ削除可能
    if (actorMembership.role === 'admin' && targetMember.role !== 'member') {
      return NextResponse.json({ error: 'Admins can only remove members' }, { status: 403 });
    }

    // メンバー削除
    const { error: deleteError } = await supabase
      .from('workspace_members')
      .delete()
      .eq('id', memberId);

    if (deleteError) {
      console.error('Member delete error:', deleteError);
      return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });
    }

    // 監査ログ記録
    await supabase.from('audit_logs').insert({
      workspace_id: workspaceId,
      user_id: user.id,
      action: 'member_removed',
      target_type: 'member',
      target_id: memberId,
      details: {
        removed_user_id: targetMember.user_id,
        removed_role: targetMember.role,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Member DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### 3.3 招待 API

**ファイル:** `app/api/workspaces/[workspaceId]/invitations/route.ts`

```typescript
/**
 * app/api/workspaces/[workspaceId]/invitations/route.ts
 *
 * GET /api/workspaces/:workspaceId/invitations - 招待一覧取得
 * POST /api/workspaces/:workspaceId/invitations - 招待作成
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import crypto from 'crypto';

const createInvitationSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  role: z.enum(['admin', 'member']).optional().default('member'),
});

// GET: 招待一覧取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const { workspaceId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 権限確認
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single();

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 招待一覧取得（未承諾のみ）
    const { data: invitations, error } = await supabase
      .from('invitations')
      .select('*')
      .eq('workspace_id', workspaceId)
      .is('accepted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Invitations fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch invitations' }, { status: 500 });
    }

    return NextResponse.json(invitations);
  } catch (error) {
    console.error('Invitations GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: 招待作成
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const { workspaceId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 権限確認
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single();

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const result = createInvitationSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', issues: result.error.issues },
        { status: 400 }
      );
    }

    // ADMIN は admin ロールの招待不可
    if (membership.role === 'admin' && result.data.role === 'admin') {
      return NextResponse.json({ error: 'Admins cannot invite admins' }, { status: 403 });
    }

    // 既存の未承諾招待確認
    const { data: existingInvitation } = await supabase
      .from('invitations')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('email', result.data.email)
      .is('accepted_at', null)
      .single();

    if (existingInvitation) {
      return NextResponse.json(
        { error: 'Invitation already sent to this email' },
        { status: 409 }
      );
    }

    // トークン生成
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7日間有効

    // 招待作成
    const { data: invitation, error: createError } = await supabase
      .from('invitations')
      .insert({
        workspace_id: workspaceId,
        email: result.data.email,
        role: result.data.role,
        token,
        expires_at: expiresAt.toISOString(),
        created_by: user.id,
      })
      .select()
      .single();

    if (createError) {
      console.error('Invitation create error:', createError);
      return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 });
    }

    // 監査ログ記録
    await supabase.from('audit_logs').insert({
      workspace_id: workspaceId,
      user_id: user.id,
      action: 'invite_sent',
      target_type: 'invitation',
      target_id: invitation.id,
      details: {
        email: result.data.email,
        role: result.data.role,
      },
    });

    return NextResponse.json(invitation, { status: 201 });
  } catch (error) {
    console.error('Invitations POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### 3.4 招待削除 API

**ファイル:** `app/api/workspaces/[workspaceId]/invitations/[invitationId]/route.ts`

```typescript
/**
 * app/api/workspaces/[workspaceId]/invitations/[invitationId]/route.ts
 *
 * DELETE /api/workspaces/:workspaceId/invitations/:invitationId - 招待取り消し
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// DELETE: 招待取り消し
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; invitationId: string }> }
) {
  try {
    const { workspaceId, invitationId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 権限確認
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single();

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 招待確認
    const { data: invitation } = await supabase
      .from('invitations')
      .select('*')
      .eq('id', invitationId)
      .eq('workspace_id', workspaceId)
      .single();

    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    // 招待削除
    const { error: deleteError } = await supabase
      .from('invitations')
      .delete()
      .eq('id', invitationId);

    if (deleteError) {
      console.error('Invitation delete error:', deleteError);
      return NextResponse.json({ error: 'Failed to revoke invitation' }, { status: 500 });
    }

    // 監査ログ記録
    await supabase.from('audit_logs').insert({
      workspace_id: workspaceId,
      user_id: user.id,
      action: 'invite_revoked',
      target_type: 'invitation',
      target_id: invitationId,
      details: {
        email: invitation.email,
        role: invitation.role,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Invitation DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### 3.5 監査ログ API

**ファイル:** `app/api/workspaces/[workspaceId]/audit-logs/route.ts`

```typescript
/**
 * app/api/workspaces/[workspaceId]/audit-logs/route.ts
 *
 * GET /api/workspaces/:workspaceId/audit-logs - 監査ログ一覧取得
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET: 監査ログ一覧取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const { workspaceId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 権限確認
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single();

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // クエリパラメータ
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const action = searchParams.get('action');

    // 監査ログ取得
    let query = supabase
      .from('audit_logs')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (action) {
      query = query.eq('action', action);
    }

    const { data: logs, error } = await query;

    if (error) {
      console.error('Audit logs fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 });
    }

    return NextResponse.json(logs);
  } catch (error) {
    console.error('Audit logs GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### 確認ポイント

- [ ] `app/api/workspaces/[workspaceId]/members/route.ts` が作成された
- [ ] `app/api/workspaces/[workspaceId]/members/[memberId]/route.ts` が作成された
- [ ] `app/api/workspaces/[workspaceId]/invitations/route.ts` が作成された
- [ ] `app/api/workspaces/[workspaceId]/invitations/[invitationId]/route.ts` が作成された
- [ ] `app/api/workspaces/[workspaceId]/audit-logs/route.ts` が作成された

---

## Step 4: React Hooks 作成

### 4.1 管理者機能 Hook

**ファイル:** `lib/hooks/useWorkspaceAdmin.ts`

```typescript
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
      setMembers(prev => prev.map(m => m.id === memberId ? updated : m));
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

  return {
    invitations,
    loading,
    error,
    refetch: fetchInvitations,
    sendInvitation,
    revokeInvitation,
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
```

### 確認ポイント

- [ ] `lib/hooks/useWorkspaceAdmin.ts` が作成された
- [ ] `useWorkspaceMembers` でメンバー管理ができる
- [ ] `useInvitations` で招待管理ができる
- [ ] `useAuditLogs` で監査ログ取得ができる

---

## Step 5: UI コンポーネント作成

### 5.1 ロールバッジコンポーネント

**ファイル:** `components/admin/RoleBadge.tsx`

```typescript
'use client';

/**
 * components/admin/RoleBadge.tsx
 *
 * ロール表示バッジ
 */

import { Shield, Crown, User } from 'lucide-react';
import type { WorkspaceRole } from '@/lib/types/admin';
import { ROLE_INFO } from '@/lib/types/admin';

interface RoleBadgeProps {
  role: WorkspaceRole;
  size?: 'sm' | 'md';
}

const ROLE_ICONS = {
  owner: Crown,
  admin: Shield,
  member: User,
};

export function RoleBadge({ role, size = 'md' }: RoleBadgeProps) {
  const info = ROLE_INFO[role];
  const Icon = ROLE_ICONS[role];
  const iconSize = size === 'sm' ? 12 : 14;

  return (
    <span
      className={`role-badge role-badge-${size}`}
      style={{ '--role-color': info.color } as React.CSSProperties}
    >
      <Icon size={iconSize} />
      {info.label}
    </span>
  );
}
```

### 5.2 メンバー一覧コンポーネント

**ファイル:** `components/admin/MembersSection.tsx`

```typescript
'use client';

/**
 * components/admin/MembersSection.tsx
 *
 * メンバー一覧セクション
 */

import { useState } from 'react';
import { Users, MoreVertical, UserMinus, Shield, User, Loader2 } from 'lucide-react';
import type { WorkspaceMember, WorkspaceRole } from '@/lib/types/admin';
import { canManageRole } from '@/lib/types/admin';
import { RoleBadge } from './RoleBadge';

interface MembersSectionProps {
  members: WorkspaceMember[];
  currentUserRole: WorkspaceRole;
  currentUserId: string;
  loading: boolean;
  onChangeRole: (memberId: string, newRole: WorkspaceRole) => Promise<boolean>;
  onRemoveMember: (memberId: string) => Promise<boolean>;
}

export function MembersSection({
  members,
  currentUserRole,
  currentUserId,
  loading,
  onChangeRole,
  onRemoveMember,
}: MembersSectionProps) {
  const [actionMenu, setActionMenu] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);

  const handleChangeRole = async (memberId: string, newRole: WorkspaceRole) => {
    setProcessing(memberId);
    setActionMenu(null);
    await onChangeRole(memberId, newRole);
    setProcessing(null);
  };

  const handleRemove = async (memberId: string) => {
    if (!confirm('このメンバーを削除しますか？')) return;
    setProcessing(memberId);
    setActionMenu(null);
    await onRemoveMember(memberId);
    setProcessing(null);
  };

  if (loading) {
    return (
      <div className="admin-section">
        <div className="section-header">
          <Users size={20} />
          <h2>メンバー</h2>
        </div>
        <div className="section-loading">
          <Loader2 className="animate-spin" size={24} />
        </div>
      </div>
    );
  }

  return (
    <div className="admin-section">
      <div className="section-header">
        <Users size={20} />
        <h2>メンバー</h2>
        <span className="member-count">{members.length}人</span>
      </div>

      <div className="members-list">
        {members.map(member => {
          const isCurrentUser = member.user_id === currentUserId;
          const canManage = !isCurrentUser && canManageRole(currentUserRole, member.role);

          return (
            <div key={member.id} className="member-item">
              <div className="member-info">
                <div className="member-avatar">
                  {member.user?.full_name?.[0] || member.user?.email?.[0] || '?'}
                </div>
                <div className="member-details">
                  <span className="member-name">
                    {member.user?.full_name || member.user?.email || member.user_id}
                    {isCurrentUser && <span className="you-badge">あなた</span>}
                  </span>
                  <span className="member-email">{member.user?.email}</span>
                </div>
              </div>

              <div className="member-actions">
                <RoleBadge role={member.role} />

                {canManage && (
                  <div className="action-menu-wrapper">
                    <button
                      onClick={() => setActionMenu(actionMenu === member.id ? null : member.id)}
                      className="btn-icon"
                      disabled={processing === member.id}
                    >
                      {processing === member.id ? (
                        <Loader2 className="animate-spin" size={16} />
                      ) : (
                        <MoreVertical size={16} />
                      )}
                    </button>

                    {actionMenu === member.id && (
                      <div className="action-menu">
                        {member.role === 'member' && currentUserRole === 'owner' && (
                          <button onClick={() => handleChangeRole(member.id, 'admin')}>
                            <Shield size={14} />
                            管理者に昇格
                          </button>
                        )}
                        {member.role === 'admin' && currentUserRole === 'owner' && (
                          <button onClick={() => handleChangeRole(member.id, 'member')}>
                            <User size={14} />
                            メンバーに降格
                          </button>
                        )}
                        <button
                          onClick={() => handleRemove(member.id)}
                          className="danger"
                        >
                          <UserMinus size={14} />
                          削除
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

### 5.3 招待セクションコンポーネント

**ファイル:** `components/admin/InvitationsSection.tsx`

```typescript
'use client';

/**
 * components/admin/InvitationsSection.tsx
 *
 * 招待管理セクション
 */

import { useState } from 'react';
import { Mail, Plus, X, Copy, Clock, Loader2 } from 'lucide-react';
import type { Invitation, WorkspaceRole } from '@/lib/types/admin';
import { RoleBadge } from './RoleBadge';

interface InvitationsSectionProps {
  invitations: Invitation[];
  currentUserRole: WorkspaceRole;
  loading: boolean;
  onSendInvitation: (email: string, role: 'admin' | 'member') => Promise<Invitation | null>;
  onRevokeInvitation: (invitationId: string) => Promise<boolean>;
}

export function InvitationsSection({
  invitations,
  currentUserRole,
  loading,
  onSendInvitation,
  onRevokeInvitation,
}: InvitationsSectionProps) {
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'member'>('member');
  const [sending, setSending] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setSending(true);
    const result = await onSendInvitation(email.trim(), role);
    setSending(false);

    if (result) {
      setEmail('');
      setRole('member');
      setShowForm(false);
    }
  };

  const handleRevoke = async (invitationId: string) => {
    if (!confirm('この招待を取り消しますか？')) return;
    setRevoking(invitationId);
    await onRevokeInvitation(invitationId);
    setRevoking(null);
  };

  const copyInviteLink = (invitation: Invitation) => {
    const link = `${window.location.origin}/invite/${invitation.token}`;
    navigator.clipboard.writeText(link);
    setCopied(invitation.id);
    setTimeout(() => setCopied(null), 2000);
  };

  const isExpired = (expiresAt: string) => new Date(expiresAt) < new Date();

  return (
    <div className="admin-section">
      <div className="section-header">
        <Mail size={20} />
        <h2>招待</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn btn-primary btn-small"
        >
          <Plus size={14} />
          新規招待
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSend} className="invite-form">
          <div className="form-row">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="メールアドレス"
              className="form-input"
              required
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'admin' | 'member')}
              className="form-select"
              disabled={currentUserRole !== 'owner'}
            >
              <option value="member">メンバー</option>
              {currentUserRole === 'owner' && (
                <option value="admin">管理者</option>
              )}
            </select>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={sending || !email.trim()}
            >
              {sending ? <Loader2 className="animate-spin" size={14} /> : <Mail size={14} />}
              送信
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="section-loading">
          <Loader2 className="animate-spin" size={24} />
        </div>
      ) : invitations.length === 0 ? (
        <div className="empty-message">
          <p>保留中の招待はありません</p>
        </div>
      ) : (
        <div className="invitations-list">
          {invitations.map(invitation => (
            <div
              key={invitation.id}
              className={`invitation-item ${isExpired(invitation.expires_at) ? 'expired' : ''}`}
            >
              <div className="invitation-info">
                <span className="invitation-email">{invitation.email}</span>
                <div className="invitation-meta">
                  <RoleBadge role={invitation.role} size="sm" />
                  <span className="invitation-date">
                    <Clock size={12} />
                    {isExpired(invitation.expires_at)
                      ? '期限切れ'
                      : `${new Date(invitation.expires_at).toLocaleDateString('ja-JP')} まで`
                    }
                  </span>
                </div>
              </div>
              <div className="invitation-actions">
                <button
                  onClick={() => copyInviteLink(invitation)}
                  className="btn-icon"
                  title="リンクをコピー"
                >
                  {copied === invitation.id ? '✓' : <Copy size={14} />}
                </button>
                <button
                  onClick={() => handleRevoke(invitation.id)}
                  className="btn-icon btn-danger"
                  title="取り消し"
                  disabled={revoking === invitation.id}
                >
                  {revoking === invitation.id ? (
                    <Loader2 className="animate-spin" size={14} />
                  ) : (
                    <X size={14} />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### 5.4 監査ログセクションコンポーネント

**ファイル:** `components/admin/AuditLogsSection.tsx`

```typescript
'use client';

/**
 * components/admin/AuditLogsSection.tsx
 *
 * 監査ログセクション
 */

import { History, Loader2, ChevronDown } from 'lucide-react';
import type { AuditLog } from '@/lib/types/admin';
import { AUDIT_ACTION_INFO } from '@/lib/types/admin';

interface AuditLogsSectionProps {
  logs: AuditLog[];
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
}

export function AuditLogsSection({
  logs,
  loading,
  hasMore,
  onLoadMore,
}: AuditLogsSectionProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getActionLabel = (action: string) => {
    return AUDIT_ACTION_INFO[action]?.label || action;
  };

  const formatDetails = (details: Record<string, unknown>) => {
    const parts: string[] = [];

    if (details.email) parts.push(`${details.email}`);
    if (details.old_role && details.new_role) {
      parts.push(`${details.old_role} → ${details.new_role}`);
    }
    if (details.removed_role) parts.push(`(${details.removed_role})`);

    return parts.join(' ');
  };

  return (
    <div className="admin-section audit-logs-section">
      <div className="section-header">
        <History size={20} />
        <h2>操作履歴</h2>
      </div>

      {loading && logs.length === 0 ? (
        <div className="section-loading">
          <Loader2 className="animate-spin" size={24} />
        </div>
      ) : logs.length === 0 ? (
        <div className="empty-message">
          <p>操作履歴がありません</p>
        </div>
      ) : (
        <>
          <div className="audit-logs-list">
            {logs.map(log => (
              <div key={log.id} className="audit-log-item">
                <div className="log-time">{formatDate(log.created_at)}</div>
                <div className="log-content">
                  <span className="log-action">{getActionLabel(log.action)}</span>
                  <span className="log-details">{formatDetails(log.details)}</span>
                </div>
              </div>
            ))}
          </div>

          {hasMore && (
            <button
              onClick={onLoadMore}
              className="load-more-btn"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <>
                  <ChevronDown size={16} />
                  もっと見る
                </>
              )}
            </button>
          )}
        </>
      )}
    </div>
  );
}
```

### 5.5 インデックスファイル

**ファイル:** `components/admin/index.ts`

```typescript
export { RoleBadge } from './RoleBadge';
export { MembersSection } from './MembersSection';
export { InvitationsSection } from './InvitationsSection';
export { AuditLogsSection } from './AuditLogsSection';
```

### 確認ポイント

- [ ] `components/admin/RoleBadge.tsx` が作成された
- [ ] `components/admin/MembersSection.tsx` が作成された
- [ ] `components/admin/InvitationsSection.tsx` が作成された
- [ ] `components/admin/AuditLogsSection.tsx` が作成された
- [ ] `components/admin/index.ts` が作成された

---

## Step 6: 管理者ページ作成

### 6.1 管理者ページ

**ファイル:** `app/(app)/admin/page.tsx`

```typescript
'use client';

/**
 * app/(app)/admin/page.tsx
 *
 * ワークスペース管理者ページ
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Settings, Loader2, AlertTriangle } from 'lucide-react';
import { useWorkspaceMembers, useInvitations, useAuditLogs } from '@/lib/hooks/useWorkspaceAdmin';
import { MembersSection, InvitationsSection, AuditLogsSection } from '@/components/admin';
import type { WorkspaceRole } from '@/lib/types/admin';

export default function AdminPage() {
  const router = useRouter();

  // TODO: 実際のワークスペースIDとユーザー情報を取得
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [currentUserRole, setCurrentUserRole] = useState<WorkspaceRole>('member');
  const [initialLoading, setInitialLoading] = useState(true);

  // ワークスペース情報を取得
  useEffect(() => {
    const fetchWorkspaceInfo = async () => {
      try {
        // 現在のワークスペースを取得
        const res = await fetch('/api/workspaces');
        if (!res.ok) {
          if (res.status === 401) {
            router.push('/login');
            return;
          }
          throw new Error('Failed to fetch workspaces');
        }

        const workspaces = await res.json();
        if (workspaces.length > 0) {
          const ws = workspaces[0];
          setWorkspaceId(ws.id);

          // メンバーシップ情報を取得
          const memberRes = await fetch(`/api/workspaces/${ws.id}/members`);
          if (memberRes.ok) {
            const members = await memberRes.json();
            // 現在のユーザーを特定（別途取得が必要）
            // ここでは仮実装
          }
        }
      } catch (error) {
        console.error('Failed to fetch workspace info:', error);
      } finally {
        setInitialLoading(false);
      }
    };

    fetchWorkspaceInfo();
  }, [router]);

  const {
    members,
    loading: membersLoading,
    changeRole,
    removeMember,
  } = useWorkspaceMembers(workspaceId);

  const {
    invitations,
    loading: invitationsLoading,
    sendInvitation,
    revokeInvitation,
  } = useInvitations(workspaceId);

  const {
    logs,
    loading: logsLoading,
    hasMore,
    loadMore,
  } = useAuditLogs(workspaceId);

  // ローディング中
  if (initialLoading) {
    return (
      <div className="page-loading">
        <Loader2 className="animate-spin" size={32} />
        <p>読み込み中...</p>
      </div>
    );
  }

  // 権限なし
  if (!['owner', 'admin'].includes(currentUserRole)) {
    return (
      <div className="admin-page">
        <div className="access-denied">
          <AlertTriangle size={48} />
          <h2>アクセス権限がありません</h2>
          <p>このページは管理者のみアクセスできます</p>
          <button onClick={() => router.push('/dashboard')} className="btn btn-primary">
            ダッシュボードへ戻る
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <header className="page-header">
        <div className="header-content">
          <Settings size={24} />
          <h1>ワークスペース管理</h1>
        </div>
      </header>

      <div className="admin-content">
        <MembersSection
          members={members}
          currentUserRole={currentUserRole}
          currentUserId={currentUserId}
          loading={membersLoading}
          onChangeRole={changeRole}
          onRemoveMember={removeMember}
        />

        <InvitationsSection
          invitations={invitations}
          currentUserRole={currentUserRole}
          loading={invitationsLoading}
          onSendInvitation={sendInvitation}
          onRevokeInvitation={revokeInvitation}
        />

        <AuditLogsSection
          logs={logs}
          loading={logsLoading}
          hasMore={hasMore}
          onLoadMore={loadMore}
        />
      </div>
    </div>
  );
}
```

### 確認ポイント

- [ ] `app/(app)/admin/page.tsx` が作成された
- [ ] 権限チェックが実装されている
- [ ] 各セクションが表示される

---

## Step 7: CSS スタイル追加

**ファイル:** `app/globals.css` に追加

```css
/*
 * ワークスペース管理スタイル（Phase 20）
 */

/* 管理ページ */
.admin-page {
  padding: 24px 0;
}

.admin-page .page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.admin-page .header-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.admin-page .header-content h1 {
  font-size: 24px;
  font-weight: 600;
}

.admin-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* アクセス拒否 */
.access-denied {
  text-align: center;
  padding: 60px 20px;
}

.access-denied svg {
  color: var(--warning);
  margin-bottom: 16px;
}

.access-denied h2 {
  font-size: 20px;
  margin-bottom: 8px;
}

.access-denied p {
  color: var(--text-muted);
  margin-bottom: 24px;
}

/* 管理セクション */
.admin-section {
  background: var(--bg-white);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 20px;
}

.admin-section .section-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
}

.admin-section .section-header h2 {
  font-size: 16px;
  font-weight: 600;
  flex: 1;
}

.admin-section .section-header .member-count {
  font-size: 13px;
  color: var(--text-muted);
  background: var(--bg-gray);
  padding: 2px 8px;
  border-radius: 10px;
}

.admin-section .section-loading,
.admin-section .empty-message {
  text-align: center;
  padding: 32px;
  color: var(--text-muted);
}

/* ロールバッジ */
.role-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  background: color-mix(in srgb, var(--role-color) 15%, transparent);
  color: var(--role-color);
}

.role-badge-sm {
  padding: 2px 6px;
  font-size: 11px;
}

/* メンバーリスト */
.members-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.member-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: var(--bg-gray);
  border-radius: 8px;
}

.member-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.member-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 16px;
}

.member-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.member-name {
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
}

.you-badge {
  font-size: 10px;
  padding: 1px 6px;
  background: var(--primary);
  color: white;
  border-radius: 4px;
}

.member-email {
  font-size: 12px;
  color: var(--text-muted);
}

.member-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* アクションメニュー */
.action-menu-wrapper {
  position: relative;
}

.action-menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 4px;
  background: var(--bg-white);
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  min-width: 160px;
  z-index: 100;
  overflow: hidden;
}

.action-menu button {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 14px;
  background: none;
  border: none;
  font-size: 13px;
  cursor: pointer;
  text-align: left;
}

.action-menu button:hover {
  background: var(--bg-gray);
}

.action-menu button.danger {
  color: var(--danger);
}

/* 招待フォーム */
.invite-form {
  margin-bottom: 16px;
  padding: 16px;
  background: var(--bg-gray);
  border-radius: 8px;
}

.invite-form .form-row {
  display: flex;
  gap: 8px;
}

.invite-form .form-input {
  flex: 1;
}

.invite-form .form-select {
  width: 120px;
}

/* 招待リスト */
.invitations-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.invitation-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: var(--bg-gray);
  border-radius: 8px;
}

.invitation-item.expired {
  opacity: 0.6;
}

.invitation-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.invitation-email {
  font-weight: 500;
}

.invitation-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.invitation-date {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--text-muted);
}

.invitation-actions {
  display: flex;
  gap: 4px;
}

/* 監査ログ */
.audit-logs-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 400px;
  overflow-y: auto;
}

.audit-log-item {
  display: flex;
  gap: 12px;
  padding: 10px 12px;
  background: var(--bg-gray);
  border-radius: 6px;
  font-size: 13px;
}

.log-time {
  flex-shrink: 0;
  color: var(--text-muted);
  font-size: 12px;
  min-width: 140px;
}

.log-content {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.log-action {
  font-weight: 500;
}

.log-details {
  color: var(--text-muted);
}

.load-more-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 10px;
  margin-top: 12px;
  background: transparent;
  border: 1px dashed var(--border);
  border-radius: 6px;
  color: var(--text-muted);
  font-size: 13px;
  cursor: pointer;
}

.load-more-btn:hover {
  background: var(--bg-gray);
}
```

### 確認ポイント

- [ ] CSS スタイルが追加された

---

## Step 8: 型チェック & ビルド

```bash
npm run type-check
npm run build
```

### 確認ポイント

- [ ] 型チェックがエラーなく完了
- [ ] ビルドがエラーなく完了

---

## Step 9: 動作確認

### 9.1 開発サーバー起動

```bash
npm run dev
```

### 9.2 確認項目

1. http://localhost:3000/admin にアクセス
2. 以下を確認:
   - [ ] OWNER/ADMIN 以外はアクセス拒否される
   - [ ] メンバー一覧が表示される
   - [ ] ロールバッジが正しく表示される
   - [ ] 招待フォームが動作する
   - [ ] 招待リンクがコピーできる
   - [ ] ロール変更ができる（権限に応じて）
   - [ ] メンバー削除ができる（権限に応じて）
   - [ ] 監査ログが記録・表示される

---

## Step 10: Git プッシュ

```bash
git add -A
git commit -m "Phase 20: ワークスペース管理者機能

- supabase/migrations: invitations, audit_logs テーブル + RLS
- lib/types/admin.ts: 管理者機能型定義
- app/api/workspaces/[workspaceId]/members: メンバー管理 API
- app/api/workspaces/[workspaceId]/invitations: 招待管理 API
- app/api/workspaces/[workspaceId]/audit-logs: 監査ログ API
- lib/hooks/useWorkspaceAdmin.ts: 管理者機能フック
- components/admin: RoleBadge, MembersSection, InvitationsSection, AuditLogsSection
- app/(app)/admin/page.tsx: 管理者ページ
- CSS スタイル追加

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"

git push
```

---

## 完了チェックリスト

### データベース
- [ ] invitations テーブル作成
- [ ] audit_logs テーブル作成
- [ ] RLS ポリシー設定
- [ ] マイグレーション成功

### 型定義
- [ ] WorkspaceRole 型
- [ ] Invitation インターフェース
- [ ] AuditLog インターフェース
- [ ] ROLE_INFO 定数
- [ ] 権限チェックヘルパー関数

### API Routes
- [ ] `GET /api/workspaces/:id/members` 作成
- [ ] `PATCH/DELETE /api/workspaces/:id/members/:memberId` 作成
- [ ] `GET/POST /api/workspaces/:id/invitations` 作成
- [ ] `DELETE /api/workspaces/:id/invitations/:invitationId` 作成
- [ ] `GET /api/workspaces/:id/audit-logs` 作成

### React Hooks
- [ ] `useWorkspaceMembers` 作成
- [ ] `useInvitations` 作成
- [ ] `useAuditLogs` 作成

### UI コンポーネント
- [ ] `RoleBadge` 作成
- [ ] `MembersSection` 作成
- [ ] `InvitationsSection` 作成
- [ ] `AuditLogsSection` 作成

### 統合
- [ ] `/admin` ページ作成
- [ ] 権限チェック実装
- [ ] 監査ログ記録実装
- [ ] 型チェック成功
- [ ] ビルド成功
- [ ] Git プッシュ完了

---

## 次のステップ（Phase 21 以降）

1. **招待承諾機能**
   - `/invite/:token` ページ
   - トークン検証
   - メンバー追加処理

2. **メール通知**
   - 招待メール送信
   - Resend / SendGrid 連携

3. **ワークスペース設定**
   - ワークスペース名変更
   - ワークスペース削除
