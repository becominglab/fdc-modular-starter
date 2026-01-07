# Phase 5: チーム機能（ワークスペース）ランブック

## 目標

チーム機能の基盤を作る：
- ワークスペース（チーム）の作成・管理
- メンバー招待・削除
- ロール別権限制御（OWNER/ADMIN/MEMBER）

## 前提条件

- [ ] Phase 4 完了（Google OAuth 認証が動作）
- [ ] Supabase プロジェクトが作成済み
- [ ] `npm run dev` で http://localhost:3000 にアクセスできる

---

## 習得する新しい概念

### ワークスペース
チームや組織ごとにデータを分離する単位。ユーザーは複数のワークスペースに所属可能。

### マルチテナント
1つのアプリで複数の組織を扱うアーキテクチャ。データはワークスペースごとに分離。

### RBAC（Role-Based Access Control）
ロールで権限を管理する方式。ユーザーにロールを割り当て、ロールに権限を紐づける。

### 中間テーブル
users と workspaces の多対多関係を表現するテーブル（workspace_members）。

---

## ロール権限設計

| 操作 | OWNER | ADMIN | MEMBER |
|------|-------|-------|--------|
| タスク作成・編集 | ○ | ○ | ○ |
| メンバー招待 | ○ | ○ | × |
| メンバー削除 | ○ | ○ | × |
| ワークスペース設定 | ○ | ○ | × |
| ワークスペース削除 | ○ | × | × |
| OWNER 変更 | ○ | × | × |

---

## Step 1: データベーステーブルの作成

### 1.1 Supabase ダッシュボードで SQL を実行

1. https://supabase.com/dashboard にアクセス
2. プロジェクトを選択
3. 「SQL Editor」を開く
4. 以下の SQL を実行:

```sql
-- =====================================================
-- ワークスペーステーブルの作成
-- =====================================================
CREATE TABLE IF NOT EXISTS workspaces (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- スラッグのインデックス
CREATE INDEX IF NOT EXISTS workspaces_slug_idx ON workspaces(slug);

-- =====================================================
-- ワークスペースメンバーテーブルの作成（中間テーブル）
-- =====================================================
CREATE TYPE workspace_role AS ENUM ('owner', 'admin', 'member');

CREATE TABLE IF NOT EXISTS workspace_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role workspace_role NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);

-- インデックス
CREATE INDEX IF NOT EXISTS workspace_members_workspace_id_idx ON workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS workspace_members_user_id_idx ON workspace_members(user_id);

-- =====================================================
-- Row Level Security (RLS) の設定
-- =====================================================

-- workspaces テーブル
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

-- ポリシー: メンバーは自分が所属するワークスペースを参照可能
CREATE POLICY "Members can view their workspaces"
  ON workspaces FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = workspaces.id
      AND workspace_members.user_id = auth.uid()
    )
  );

-- ポリシー: 認証済みユーザーはワークスペースを作成可能
CREATE POLICY "Authenticated users can create workspaces"
  ON workspaces FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ポリシー: OWNER/ADMIN はワークスペースを更新可能
CREATE POLICY "Owners and admins can update workspaces"
  ON workspaces FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = workspaces.id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role IN ('owner', 'admin')
    )
  );

-- ポリシー: OWNER のみワークスペースを削除可能
CREATE POLICY "Only owners can delete workspaces"
  ON workspaces FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = workspaces.id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role = 'owner'
    )
  );

-- workspace_members テーブル
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

-- ポリシー: メンバーは同じワークスペースのメンバーを参照可能
CREATE POLICY "Members can view workspace members"
  ON workspace_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members AS wm
      WHERE wm.workspace_id = workspace_members.workspace_id
      AND wm.user_id = auth.uid()
    )
  );

-- ポリシー: OWNER/ADMIN はメンバーを追加可能
CREATE POLICY "Owners and admins can add members"
  ON workspace_members FOR INSERT
  WITH CHECK (
    -- 新規ワークスペース作成時は自分自身を OWNER として追加可能
    (user_id = auth.uid() AND role = 'owner')
    OR
    -- 既存ワークスペースには OWNER/ADMIN のみ追加可能
    EXISTS (
      SELECT 1 FROM workspace_members AS wm
      WHERE wm.workspace_id = workspace_members.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin')
    )
  );

-- ポリシー: OWNER/ADMIN はメンバーを更新可能（ロール変更）
CREATE POLICY "Owners and admins can update members"
  ON workspace_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members AS wm
      WHERE wm.workspace_id = workspace_members.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin')
    )
  );

-- ポリシー: OWNER/ADMIN はメンバーを削除可能、または自分自身を削除可能
CREATE POLICY "Owners and admins can remove members"
  ON workspace_members FOR DELETE
  USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM workspace_members AS wm
      WHERE wm.workspace_id = workspace_members.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin')
    )
  );

-- =====================================================
-- updated_at 自動更新トリガー
-- =====================================================
CREATE TRIGGER update_workspaces_updated_at
  BEFORE UPDATE ON workspaces
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workspace_members_updated_at
  BEFORE UPDATE ON workspace_members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### 確認ポイント

- [ ] `workspaces` テーブルが作成された
- [ ] `workspace_members` テーブルが作成された
- [ ] `workspace_role` 型が作成された
- [ ] RLS ポリシーが有効化された
- [ ] インデックスが作成された

---

## Step 2: 型定義の追加

### 2.1 ワークスペース型の定義

**ファイルパス:** `lib/types/workspace.ts`

```typescript
/**
 * ワークスペースロールの型
 */
export type WorkspaceRole = 'owner' | 'admin' | 'member';

/**
 * ワークスペースの型
 */
export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * ワークスペースメンバーの型
 */
export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  created_at: string;
  updated_at: string;
}

/**
 * メンバー情報（ユーザー情報付き）
 */
export interface WorkspaceMemberWithUser extends WorkspaceMember {
  user: {
    id: string;
    email: string;
    user_metadata: {
      full_name?: string;
      avatar_url?: string;
    };
  };
}

/**
 * ワークスペース作成の入力型
 */
export interface CreateWorkspaceInput {
  name: string;
  slug: string;
  description?: string;
}

/**
 * ワークスペース更新の入力型
 */
export interface UpdateWorkspaceInput {
  name?: string;
  description?: string;
}

/**
 * メンバー招待の入力型
 */
export interface InviteMemberInput {
  email: string;
  role: WorkspaceRole;
}

/**
 * ロール別の権限マップ
 */
export const ROLE_PERMISSIONS = {
  owner: {
    canCreateTask: true,
    canInviteMember: true,
    canRemoveMember: true,
    canUpdateWorkspace: true,
    canDeleteWorkspace: true,
    canChangeOwner: true,
  },
  admin: {
    canCreateTask: true,
    canInviteMember: true,
    canRemoveMember: true,
    canUpdateWorkspace: true,
    canDeleteWorkspace: false,
    canChangeOwner: false,
  },
  member: {
    canCreateTask: true,
    canInviteMember: false,
    canRemoveMember: false,
    canUpdateWorkspace: false,
    canDeleteWorkspace: false,
    canChangeOwner: false,
  },
} as const;

/**
 * 権限チェック関数
 */
export function hasPermission(
  role: WorkspaceRole,
  permission: keyof typeof ROLE_PERMISSIONS.owner
): boolean {
  return ROLE_PERMISSIONS[role][permission];
}
```

### 2.2 データベース型の更新

**ファイルパス:** `lib/types/database.ts` に追加

```typescript
// 既存の型定義の後に追加

export type WorkspaceRole = 'owner' | 'admin' | 'member';

export interface DbWorkspace {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbWorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  created_at: string;
  updated_at: string;
}

export type DbWorkspaceInsert = Omit<DbWorkspace, 'id' | 'created_at' | 'updated_at'>;
export type DbWorkspaceUpdate = Partial<Pick<DbWorkspace, 'name' | 'description'>>;

export type DbWorkspaceMemberInsert = Omit<DbWorkspaceMember, 'id' | 'created_at' | 'updated_at'>;
export type DbWorkspaceMemberUpdate = Pick<DbWorkspaceMember, 'role'>;
```

### 確認ポイント

- [ ] `lib/types/workspace.ts` が作成された
- [ ] `lib/types/database.ts` が更新された
- [ ] `ROLE_PERMISSIONS` が定義されている

---

## Step 3: Zod バリデーションスキーマの作成

### 3.1 Zod のインストール

```bash
npm install zod
```

### 3.2 バリデーションスキーマの作成

**ファイルパス:** `lib/validations/workspace.ts`

```typescript
import { z } from 'zod';

/**
 * スラッグのバリデーション
 * - 3〜30文字
 * - 小文字英数字とハイフンのみ
 * - ハイフンで始まらない・終わらない
 */
const slugSchema = z
  .string()
  .min(3, 'スラッグは3文字以上必要です')
  .max(30, 'スラッグは30文字以内です')
  .regex(
    /^[a-z0-9]+(-[a-z0-9]+)*$/,
    'スラッグは小文字英数字とハイフンのみ使用可能です'
  );

/**
 * ワークスペース作成のスキーマ
 */
export const createWorkspaceSchema = z.object({
  name: z
    .string()
    .min(1, '名前は必須です')
    .max(50, '名前は50文字以内です'),
  slug: slugSchema,
  description: z
    .string()
    .max(200, '説明は200文字以内です')
    .optional(),
});

/**
 * ワークスペース更新のスキーマ
 */
export const updateWorkspaceSchema = z.object({
  name: z
    .string()
    .min(1, '名前は必須です')
    .max(50, '名前は50文字以内です')
    .optional(),
  description: z
    .string()
    .max(200, '説明は200文字以内です')
    .nullable()
    .optional(),
});

/**
 * メンバー招待のスキーマ
 */
export const inviteMemberSchema = z.object({
  email: z
    .string()
    .email('有効なメールアドレスを入力してください'),
  role: z.enum(['admin', 'member'], {
    errorMap: () => ({ message: 'ロールは admin または member です' }),
  }),
});

/**
 * ロール更新のスキーマ
 */
export const updateRoleSchema = z.object({
  role: z.enum(['owner', 'admin', 'member'], {
    errorMap: () => ({ message: '有効なロールを選択してください' }),
  }),
});

// 型のエクスポート
export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
```

### 確認ポイント

- [ ] `zod` がインストールされた
- [ ] `lib/validations/workspace.ts` が作成された

---

## Step 4: ワークスペース API の作成

### 4.1 ワークスペース一覧・作成 API

**ファイルパス:** `app/api/workspaces/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createWorkspaceSchema } from '@/lib/validations/workspace';

/**
 * GET /api/workspaces
 * ユーザーが所属するワークスペース一覧を取得
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    const { data, error } = await supabase
      .from('workspace_members')
      .select(`
        role,
        workspace:workspaces (
          id,
          name,
          slug,
          description,
          created_at,
          updated_at
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching workspaces:', error);
      return NextResponse.json(
        { error: 'ワークスペースの取得に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/workspaces
 * 新規ワークスペースを作成
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = createWorkspaceSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { name, slug, description } = validation.data;

    // スラッグの重複チェック
    const { data: existing } = await supabase
      .from('workspaces')
      .select('id')
      .eq('slug', slug)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'このスラッグは既に使用されています' },
        { status: 400 }
      );
    }

    // ワークスペースを作成
    const { data: workspace, error: createError } = await supabase
      .from('workspaces')
      .insert({ name, slug, description: description || null })
      .select()
      .single();

    if (createError) {
      console.error('Error creating workspace:', createError);
      return NextResponse.json(
        { error: 'ワークスペースの作成に失敗しました' },
        { status: 500 }
      );
    }

    // 作成者を OWNER として追加
    const { error: memberError } = await supabase
      .from('workspace_members')
      .insert({
        workspace_id: workspace.id,
        user_id: user.id,
        role: 'owner',
      });

    if (memberError) {
      console.error('Error adding owner:', memberError);
      // ワークスペースを削除（ロールバック）
      await supabase.from('workspaces').delete().eq('id', workspace.id);
      return NextResponse.json(
        { error: 'ワークスペースの作成に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json(workspace, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}
```

### 4.2 個別ワークスペース API

**ファイルパス:** `app/api/workspaces/[workspaceId]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { updateWorkspaceSchema } from '@/lib/validations/workspace';

interface RouteParams {
  params: Promise<{ workspaceId: string }>;
}

/**
 * GET /api/workspaces/[workspaceId]
 * ワークスペース詳細を取得
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { workspaceId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    // メンバーシップを確認
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: 'ワークスペースが見つかりません' },
        { status: 404 }
      );
    }

    const { data: workspace, error } = await supabase
      .from('workspaces')
      .select('*')
      .eq('id', workspaceId)
      .single();

    if (error || !workspace) {
      return NextResponse.json(
        { error: 'ワークスペースが見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...workspace,
      role: membership.role,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/workspaces/[workspaceId]
 * ワークスペースを更新
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { workspaceId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    // 権限チェック（OWNER/ADMIN のみ）
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single();

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json(
        { error: '権限がありません' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = updateWorkspaceSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { data: workspace, error } = await supabase
      .from('workspaces')
      .update(validation.data)
      .eq('id', workspaceId)
      .select()
      .single();

    if (error) {
      console.error('Error updating workspace:', error);
      return NextResponse.json(
        { error: 'ワークスペースの更新に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json(workspace);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/workspaces/[workspaceId]
 * ワークスペースを削除
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { workspaceId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    // 権限チェック（OWNER のみ）
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single();

    if (!membership || membership.role !== 'owner') {
      return NextResponse.json(
        { error: '権限がありません' },
        { status: 403 }
      );
    }

    const { error } = await supabase
      .from('workspaces')
      .delete()
      .eq('id', workspaceId);

    if (error) {
      console.error('Error deleting workspace:', error);
      return NextResponse.json(
        { error: 'ワークスペースの削除に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}
```

### 確認ポイント

- [ ] `app/api/workspaces/route.ts` が作成された
- [ ] `app/api/workspaces/[workspaceId]/route.ts` が作成された

---

## Step 5: メンバー管理 API の作成

**ファイルパス:** `app/api/workspaces/[workspaceId]/members/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { inviteMemberSchema } from '@/lib/validations/workspace';

interface RouteParams {
  params: Promise<{ workspaceId: string }>;
}

/**
 * GET /api/workspaces/[workspaceId]/members
 * メンバー一覧を取得
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { workspaceId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    // メンバーシップを確認
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: 'ワークスペースが見つかりません' },
        { status: 404 }
      );
    }

    // メンバー一覧を取得（ユーザー情報付き）
    const { data: members, error } = await supabase
      .from('workspace_members')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching members:', error);
      return NextResponse.json(
        { error: 'メンバーの取得に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json(members);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/workspaces/[workspaceId]/members
 * メンバーを招待
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { workspaceId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    // 権限チェック（OWNER/ADMIN のみ）
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single();

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json(
        { error: '権限がありません' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = inviteMemberSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { email, role } = validation.data;

    // ユーザーを検索（メールアドレスで）
    // 注: 本番環境では招待メール送信などの仕組みが必要
    const { data: invitedUser } = await supabase
      .from('auth.users')
      .select('id')
      .eq('email', email)
      .single();

    if (!invitedUser) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません。先にサインアップが必要です。' },
        { status: 404 }
      );
    }

    // 既にメンバーかチェック
    const { data: existingMember } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', invitedUser.id)
      .single();

    if (existingMember) {
      return NextResponse.json(
        { error: 'このユーザーは既にメンバーです' },
        { status: 400 }
      );
    }

    // メンバーを追加
    const { data: newMember, error } = await supabase
      .from('workspace_members')
      .insert({
        workspace_id: workspaceId,
        user_id: invitedUser.id,
        role,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding member:', error);
      return NextResponse.json(
        { error: 'メンバーの追加に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json(newMember, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}
```

### 5.2 個別メンバー API

**ファイルパス:** `app/api/workspaces/[workspaceId]/members/[memberId]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { updateRoleSchema } from '@/lib/validations/workspace';

interface RouteParams {
  params: Promise<{ workspaceId: string; memberId: string }>;
}

/**
 * PATCH /api/workspaces/[workspaceId]/members/[memberId]
 * メンバーのロールを更新
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { workspaceId, memberId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    // 権限チェック（OWNER のみロール変更可能）
    const { data: myMembership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single();

    if (!myMembership || myMembership.role !== 'owner') {
      return NextResponse.json(
        { error: '権限がありません' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = updateRoleSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { role } = validation.data;

    // OWNER を別のユーザーに移譲する場合、自分を ADMIN に降格
    if (role === 'owner') {
      await supabase
        .from('workspace_members')
        .update({ role: 'admin' })
        .eq('workspace_id', workspaceId)
        .eq('user_id', user.id);
    }

    const { data: member, error } = await supabase
      .from('workspace_members')
      .update({ role })
      .eq('id', memberId)
      .eq('workspace_id', workspaceId)
      .select()
      .single();

    if (error) {
      console.error('Error updating member role:', error);
      return NextResponse.json(
        { error: 'ロールの更新に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json(member);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/workspaces/[workspaceId]/members/[memberId]
 * メンバーを削除
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { workspaceId, memberId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    // 対象メンバーを取得
    const { data: targetMember } = await supabase
      .from('workspace_members')
      .select('user_id, role')
      .eq('id', memberId)
      .eq('workspace_id', workspaceId)
      .single();

    if (!targetMember) {
      return NextResponse.json(
        { error: 'メンバーが見つかりません' },
        { status: 404 }
      );
    }

    // OWNER は削除不可
    if (targetMember.role === 'owner') {
      return NextResponse.json(
        { error: 'オーナーは削除できません' },
        { status: 400 }
      );
    }

    // 自分自身を削除する場合、または OWNER/ADMIN の場合のみ許可
    const { data: myMembership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single();

    const isRemovingSelf = targetMember.user_id === user.id;
    const hasPermission = myMembership && ['owner', 'admin'].includes(myMembership.role);

    if (!isRemovingSelf && !hasPermission) {
      return NextResponse.json(
        { error: '権限がありません' },
        { status: 403 }
      );
    }

    const { error } = await supabase
      .from('workspace_members')
      .delete()
      .eq('id', memberId);

    if (error) {
      console.error('Error removing member:', error);
      return NextResponse.json(
        { error: 'メンバーの削除に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}
```

### 確認ポイント

- [ ] `app/api/workspaces/[workspaceId]/members/route.ts` が作成された
- [ ] `app/api/workspaces/[workspaceId]/members/[memberId]/route.ts` が作成された

---

## Step 6: useWorkspace フックの作成

**ファイルパス:** `lib/hooks/useWorkspace.ts`

```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import type {
  Workspace,
  WorkspaceMember,
  WorkspaceRole,
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
} from '@/lib/types/workspace';

interface WorkspaceWithRole extends Workspace {
  role: WorkspaceRole;
}

export function useWorkspaces() {
  const [workspaces, setWorkspaces] = useState<WorkspaceWithRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchWorkspaces = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/workspaces');
      if (!res.ok) {
        throw new Error('ワークスペースの取得に失敗しました');
      }
      const data = await res.json();
      // データを変換
      const formatted = data.map((item: { role: WorkspaceRole; workspace: Workspace }) => ({
        ...item.workspace,
        role: item.role,
      }));
      setWorkspaces(formatted);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  const createWorkspace = useCallback(async (input: CreateWorkspaceInput) => {
    const res = await fetch('/api/workspaces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'ワークスペースの作成に失敗しました');
    }

    const workspace = await res.json();
    setWorkspaces((prev) => [{ ...workspace, role: 'owner' }, ...prev]);
    return workspace;
  }, []);

  return {
    workspaces,
    isLoading,
    error,
    createWorkspace,
    refetch: fetchWorkspaces,
  };
}

export function useWorkspace(workspaceId: string) {
  const [workspace, setWorkspace] = useState<WorkspaceWithRole | null>(null);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchWorkspace = useCallback(async () => {
    try {
      setIsLoading(true);
      const [wsRes, membersRes] = await Promise.all([
        fetch(`/api/workspaces/${workspaceId}`),
        fetch(`/api/workspaces/${workspaceId}/members`),
      ]);

      if (!wsRes.ok) {
        throw new Error('ワークスペースの取得に失敗しました');
      }

      const wsData = await wsRes.json();
      const membersData = membersRes.ok ? await membersRes.json() : [];

      setWorkspace(wsData);
      setMembers(membersData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    if (workspaceId) {
      fetchWorkspace();
    }
  }, [workspaceId, fetchWorkspace]);

  const updateWorkspace = useCallback(
    async (input: UpdateWorkspaceInput) => {
      const res = await fetch(`/api/workspaces/${workspaceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '更新に失敗しました');
      }

      const updated = await res.json();
      setWorkspace((prev) => (prev ? { ...prev, ...updated } : null));
      return updated;
    },
    [workspaceId]
  );

  const deleteWorkspace = useCallback(async () => {
    const res = await fetch(`/api/workspaces/${workspaceId}`, {
      method: 'DELETE',
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || '削除に失敗しました');
    }
  }, [workspaceId]);

  const inviteMember = useCallback(
    async (email: string, role: 'admin' | 'member') => {
      const res = await fetch(`/api/workspaces/${workspaceId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '招待に失敗しました');
      }

      const newMember = await res.json();
      setMembers((prev) => [...prev, newMember]);
      return newMember;
    },
    [workspaceId]
  );

  const updateMemberRole = useCallback(
    async (memberId: string, role: WorkspaceRole) => {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/members/${memberId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role }),
        }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'ロール変更に失敗しました');
      }

      const updated = await res.json();
      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? updated : m))
      );
      return updated;
    },
    [workspaceId]
  );

  const removeMember = useCallback(
    async (memberId: string) => {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/members/${memberId}`,
        { method: 'DELETE' }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '削除に失敗しました');
      }

      setMembers((prev) => prev.filter((m) => m.id !== memberId));
    },
    [workspaceId]
  );

  return {
    workspace,
    members,
    isLoading,
    error,
    updateWorkspace,
    deleteWorkspace,
    inviteMember,
    updateMemberRole,
    removeMember,
    refetch: fetchWorkspace,
  };
}
```

### 確認ポイント

- [ ] `lib/hooks/useWorkspace.ts` が作成された
- [ ] `useWorkspaces` フックが定義されている
- [ ] `useWorkspace` フックが定義されている

---

## Step 7: 動作確認

### 7.1 API テスト（curl または Postman）

```bash
# ワークスペース作成（要認証）
curl -X POST http://localhost:3000/api/workspaces \
  -H "Content-Type: application/json" \
  -d '{"name": "テストチーム", "slug": "test-team"}'
```

### 7.2 機能テスト

1. ワークスペース作成
   - [ ] 新規ワークスペースが作成される
   - [ ] 作成者が OWNER になる

2. メンバー招待（OWNER/ADMIN）
   - [ ] メンバーを追加できる
   - [ ] ロールを指定できる

3. メンバー削除
   - [ ] OWNER/ADMIN はメンバーを削除できる
   - [ ] MEMBER は自分のみ退出できる
   - [ ] OWNER は削除できない

4. 権限チェック
   - [ ] MEMBER はメンバー管理できない
   - [ ] ADMIN はワークスペース削除できない

---

## Step 8: 型チェックとビルド確認

```bash
# 型チェック
npm run type-check

# ビルド確認
npm run build
```

### 確認ポイント

- [ ] `npm run type-check` がエラーなしで完了
- [ ] `npm run build` がエラーなしで完了

---

## 完了チェックリスト

### データベース設定

- [ ] `workspaces` テーブルが作成された
- [ ] `workspace_members` テーブルが作成された
- [ ] `workspace_role` 型が作成された
- [ ] RLS ポリシーが設定された

### ファイル作成

- [ ] `lib/types/workspace.ts` - ワークスペース型定義
- [ ] `lib/validations/workspace.ts` - Zod バリデーション
- [ ] `app/api/workspaces/route.ts` - 一覧・作成 API
- [ ] `app/api/workspaces/[workspaceId]/route.ts` - 詳細・更新・削除 API
- [ ] `app/api/workspaces/[workspaceId]/members/route.ts` - メンバー一覧・招待 API
- [ ] `app/api/workspaces/[workspaceId]/members/[memberId]/route.ts` - メンバー更新・削除 API
- [ ] `lib/hooks/useWorkspace.ts` - ワークスペースフック

### ファイル修正

- [ ] `lib/types/database.ts` - ワークスペース型追加

### 機能確認

- [ ] ワークスペース作成ができる
- [ ] メンバー招待ができる（OWNER/ADMIN）
- [ ] メンバー削除ができる（OWNER/ADMIN）
- [ ] ロール変更ができる（OWNER）
- [ ] 権限制御が正しく動作する

### 品質確認

- [ ] `npm run type-check` がエラーなし
- [ ] `npm run build` がエラーなし

---

## 次のステップ

Phase 5 が完了したら、以下の拡張が可能：
- ワークスペース切り替え UI
- タスクのワークスペース紐付け
- 招待メール送信機能
- ワークスペース設定画面

---

## トラブルシューティング

### RLS でアクセス拒否される

```sql
-- ポリシーの確認
SELECT * FROM pg_policies WHERE tablename = 'workspaces';
SELECT * FROM pg_policies WHERE tablename = 'workspace_members';
```

### ENUM 型が作成できない

```sql
-- 既存の型を確認
SELECT typname FROM pg_type WHERE typname = 'workspace_role';

-- 削除して再作成
DROP TYPE IF EXISTS workspace_role CASCADE;
CREATE TYPE workspace_role AS ENUM ('owner', 'admin', 'member');
```

### メンバー招待が失敗する

1. 招待先ユーザーが存在するか確認
2. RLS ポリシーを確認
3. 権限（OWNER/ADMIN）を確認

### ワークスペースが表示されない

1. メンバーシップが正しく作成されているか確認
2. RLS の SELECT ポリシーを確認
