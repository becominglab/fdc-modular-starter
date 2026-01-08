# Phase 10: Action Map（施策管理）実装ランブック

## 目標

FDC 3層アーキテクチャの「戦術層」として、Action Map（施策管理）を実装し、Task との連携によるボトムアップ進捗計算を実現する。

```
┌─────────────────────────────────────────────────────┐
│  戦略層 (OKR)         ← Phase 11で実装予定           │
├─────────────────────────────────────────────────────┤
│  戦術層 (Action Map)  ← 今回実装                     │
│    └─ ActionItem      ← 施策内の個別作業             │
├─────────────────────────────────────────────────────┤
│  実行層 (Task)        ← Phase 9で実装済み            │
│    └─ 4象限管理                                      │
└─────────────────────────────────────────────────────┘
```

## 前提条件

- [ ] Phase 9 完了（Task 4象限管理が動作している）
- [ ] Supabase プロジェクトにアクセス可能

---

## Step 1: Supabase テーブル作成

### 1.1 action_maps テーブル

Supabase ダッシュボード → SQL Editor で実行：

```sql
-- Action Maps テーブル
CREATE TABLE IF NOT EXISTS action_maps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  target_period_start DATE,
  target_period_end DATE,
  is_archived BOOLEAN DEFAULT FALSE,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 有効化
ALTER TABLE action_maps ENABLE ROW LEVEL SECURITY;

-- RLS ポリシー
CREATE POLICY "Users can view own action_maps"
  ON action_maps FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own action_maps"
  ON action_maps FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own action_maps"
  ON action_maps FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own action_maps"
  ON action_maps FOR DELETE
  USING (auth.uid() = user_id);

-- インデックス
CREATE INDEX idx_action_maps_user_id ON action_maps(user_id);
CREATE INDEX idx_action_maps_is_archived ON action_maps(is_archived);
```

- [ ] action_maps テーブル作成完了

### 1.2 action_items テーブル

```sql
-- Action Items テーブル
CREATE TABLE IF NOT EXISTS action_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action_map_id UUID REFERENCES action_maps(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'blocked', 'done')),
  parent_item_id UUID REFERENCES action_items(id) ON DELETE SET NULL,
  sort_order INTEGER DEFAULT 0,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 有効化
ALTER TABLE action_items ENABLE ROW LEVEL SECURITY;

-- RLS ポリシー
CREATE POLICY "Users can view own action_items"
  ON action_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own action_items"
  ON action_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own action_items"
  ON action_items FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own action_items"
  ON action_items FOR DELETE
  USING (auth.uid() = user_id);

-- インデックス
CREATE INDEX idx_action_items_action_map_id ON action_items(action_map_id);
CREATE INDEX idx_action_items_user_id ON action_items(user_id);
CREATE INDEX idx_action_items_status ON action_items(status);
CREATE INDEX idx_action_items_parent ON action_items(parent_item_id);
```

- [ ] action_items テーブル作成完了

### 1.3 tasks テーブルに action_item_id 追加

```sql
-- tasks テーブルに action_item_id カラム追加
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS action_item_id UUID REFERENCES action_items(id) ON DELETE SET NULL;

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_tasks_action_item_id ON tasks(action_item_id);
```

- [ ] tasks テーブル更新完了

---

## Step 2: 型定義

### 2.1 ActionMap 型定義

**ファイル**: `lib/types/action-map.ts`

```typescript
/**
 * Action Map（施策管理）の型定義
 * Phase 10: 戦術層の実装
 */

// ActionItem のステータス
export type ActionItemStatus = 'not_started' | 'in_progress' | 'blocked' | 'done';

// ActionItem の優先度
export type ActionItemPriority = 'low' | 'medium' | 'high';

// ActionMap インターフェース
export interface ActionMap {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  target_period_start?: string;
  target_period_end?: string;
  is_archived: boolean;
  version: number;
  created_at: string;
  updated_at: string;
  // 計算フィールド（API側で算出）
  progress_rate?: number;
  action_items?: ActionItem[];
}

// ActionItem インターフェース
export interface ActionItem {
  id: string;
  action_map_id: string;
  user_id: string;
  title: string;
  description?: string;
  due_date?: string;
  priority: ActionItemPriority;
  status: ActionItemStatus;
  parent_item_id?: string;
  sort_order: number;
  version: number;
  created_at: string;
  updated_at: string;
  // 計算フィールド
  progress_rate?: number;
  linked_task_count?: number;
  completed_task_count?: number;
}

// 作成用入力型
export interface CreateActionMapInput {
  title: string;
  description?: string;
  target_period_start?: string;
  target_period_end?: string;
}

export interface CreateActionItemInput {
  action_map_id: string;
  title: string;
  description?: string;
  due_date?: string;
  priority?: ActionItemPriority;
  parent_item_id?: string;
}

// 更新用入力型
export interface UpdateActionMapInput {
  title?: string;
  description?: string;
  target_period_start?: string | null;
  target_period_end?: string | null;
  is_archived?: boolean;
}

export interface UpdateActionItemInput {
  title?: string;
  description?: string;
  due_date?: string | null;
  priority?: ActionItemPriority;
  status?: ActionItemStatus;
  sort_order?: number;
}

// ステータス設定
export const ACTION_ITEM_STATUS_CONFIG: Record<ActionItemStatus, { label: string; color: string; bgColor: string }> = {
  not_started: { label: '未着手', color: '#6b7280', bgColor: '#f3f4f6' },
  in_progress: { label: '進行中', color: '#3b82f6', bgColor: '#dbeafe' },
  blocked: { label: 'ブロック', color: '#ef4444', bgColor: '#fee2e2' },
  done: { label: '完了', color: '#22c55e', bgColor: '#dcfce7' },
};

// 優先度設定
export const ACTION_ITEM_PRIORITY_CONFIG: Record<ActionItemPriority, { label: string; color: string; bgColor: string }> = {
  low: { label: '低', color: '#6b7280', bgColor: '#f3f4f6' },
  medium: { label: '中', color: '#f59e0b', bgColor: '#fef3c7' },
  high: { label: '高', color: '#ef4444', bgColor: '#fee2e2' },
};
```

- [ ] lib/types/action-map.ts 作成完了

### 2.2 Task 型に action_item_id 追加

**ファイル**: `lib/types/task.ts` に追加

```typescript
// Task インターフェースに追加
export interface Task {
  // ... 既存フィールド
  action_item_id?: string;  // ActionItem との紐付け
}

// UpdateTaskInput に追加
export interface UpdateTaskInput {
  // ... 既存フィールド
  action_item_id?: string | null;
}
```

- [ ] lib/types/task.ts 更新完了

---

## Step 3: API ルート作成

### 3.1 ActionMap API

**ファイル**: `app/api/action-maps/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const createSchema = z.object({
  title: z.string().min(1, 'タイトルは必須です'),
  description: z.string().optional(),
  target_period_start: z.string().optional(),
  target_period_end: z.string().optional(),
});

// GET: ActionMap 一覧取得（進捗率計算付き）
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const includeArchived = searchParams.get('include_archived') === 'true';

    let query = supabase
      .from('action_maps')
      .select(`
        *,
        action_items (
          id,
          status
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!includeArchived) {
      query = query.eq('is_archived', false);
    }

    const { data, error } = await query;

    if (error) {
      console.error('ActionMaps fetch error:', error);
      return NextResponse.json({ error: '取得に失敗しました' }, { status: 500 });
    }

    // 進捗率を計算
    const mapsWithProgress = data.map(map => {
      const items = map.action_items || [];
      const totalItems = items.length;
      const doneItems = items.filter((item: { status: string }) => item.status === 'done').length;
      const progressRate = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;

      return {
        ...map,
        progress_rate: progressRate,
        action_items: undefined, // レスポンスから除外
      };
    });

    return NextResponse.json(mapsWithProgress);
  } catch (error) {
    console.error('ActionMaps GET error:', error);
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 });
  }
}

// POST: ActionMap 作成
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const body = await request.json();
    const result = createSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: '入力データが不正です', issues: result.error.issues },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('action_maps')
      .insert({
        ...result.data,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('ActionMap create error:', error);
      return NextResponse.json({ error: '作成に失敗しました' }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('ActionMaps POST error:', error);
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 });
  }
}
```

- [ ] app/api/action-maps/route.ts 作成完了

### 3.2 ActionMap 個別 API

**ファイル**: `app/api/action-maps/[mapId]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  target_period_start: z.string().optional().nullable(),
  target_period_end: z.string().optional().nullable(),
  is_archived: z.boolean().optional(),
});

type RouteParams = { params: Promise<{ mapId: string }> };

// GET: ActionMap 詳細取得（ActionItems + 進捗付き）
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { mapId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // ActionMap と ActionItems を取得
    const { data: actionMap, error: mapError } = await supabase
      .from('action_maps')
      .select('*')
      .eq('id', mapId)
      .eq('user_id', user.id)
      .single();

    if (mapError || !actionMap) {
      return NextResponse.json({ error: '見つかりません' }, { status: 404 });
    }

    // ActionItems を取得
    const { data: actionItems, error: itemsError } = await supabase
      .from('action_items')
      .select('*')
      .eq('action_map_id', mapId)
      .order('sort_order', { ascending: true });

    if (itemsError) {
      console.error('ActionItems fetch error:', itemsError);
    }

    // 各 ActionItem の進捗率を計算（紐付くTaskから）
    const itemsWithProgress = await Promise.all(
      (actionItems || []).map(async (item) => {
        const { data: tasks } = await supabase
          .from('tasks')
          .select('status')
          .eq('action_item_id', item.id);

        const totalTasks = tasks?.length || 0;
        const doneTasks = tasks?.filter(t => t.status === 'done').length || 0;
        const progressRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

        return {
          ...item,
          progress_rate: progressRate,
          linked_task_count: totalTasks,
          completed_task_count: doneTasks,
        };
      })
    );

    // ActionMap 全体の進捗率
    const totalItems = itemsWithProgress.length;
    const doneItems = itemsWithProgress.filter(item => item.status === 'done').length;
    const mapProgressRate = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;

    return NextResponse.json({
      ...actionMap,
      progress_rate: mapProgressRate,
      action_items: itemsWithProgress,
    });
  } catch (error) {
    console.error('ActionMap GET error:', error);
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 });
  }
}

// PATCH: ActionMap 更新
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { mapId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const body = await request.json();
    const result = updateSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: '入力データが不正です', issues: result.error.issues },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('action_maps')
      .update({
        ...result.data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', mapId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('ActionMap update error:', error);
      return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('ActionMap PATCH error:', error);
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 });
  }
}

// DELETE: ActionMap 削除
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { mapId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { error } = await supabase
      .from('action_maps')
      .delete()
      .eq('id', mapId)
      .eq('user_id', user.id);

    if (error) {
      console.error('ActionMap delete error:', error);
      return NextResponse.json({ error: '削除に失敗しました' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('ActionMap DELETE error:', error);
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 });
  }
}
```

- [ ] app/api/action-maps/[mapId]/route.ts 作成完了

### 3.3 ActionItems API

**ファイル**: `app/api/action-maps/[mapId]/items/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const createSchema = z.object({
  title: z.string().min(1, 'タイトルは必須です'),
  description: z.string().optional(),
  due_date: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  parent_item_id: z.string().uuid().optional(),
});

type RouteParams = { params: Promise<{ mapId: string }> };

// GET: ActionItems 一覧取得
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { mapId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('action_items')
      .select('*')
      .eq('action_map_id', mapId)
      .eq('user_id', user.id)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('ActionItems fetch error:', error);
      return NextResponse.json({ error: '取得に失敗しました' }, { status: 500 });
    }

    // 各アイテムの進捗率を計算
    const itemsWithProgress = await Promise.all(
      data.map(async (item) => {
        const { data: tasks } = await supabase
          .from('tasks')
          .select('status')
          .eq('action_item_id', item.id);

        const totalTasks = tasks?.length || 0;
        const doneTasks = tasks?.filter(t => t.status === 'done').length || 0;
        const progressRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

        return {
          ...item,
          progress_rate: progressRate,
          linked_task_count: totalTasks,
          completed_task_count: doneTasks,
        };
      })
    );

    return NextResponse.json(itemsWithProgress);
  } catch (error) {
    console.error('ActionItems GET error:', error);
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 });
  }
}

// POST: ActionItem 作成
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { mapId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // ActionMap の存在確認
    const { data: actionMap } = await supabase
      .from('action_maps')
      .select('id')
      .eq('id', mapId)
      .eq('user_id', user.id)
      .single();

    if (!actionMap) {
      return NextResponse.json({ error: 'ActionMapが見つかりません' }, { status: 404 });
    }

    const body = await request.json();
    const result = createSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: '入力データが不正です', issues: result.error.issues },
        { status: 400 }
      );
    }

    // sort_order を取得
    const { data: lastItem } = await supabase
      .from('action_items')
      .select('sort_order')
      .eq('action_map_id', mapId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single();

    const nextSortOrder = (lastItem?.sort_order || 0) + 1;

    const { data, error } = await supabase
      .from('action_items')
      .insert({
        ...result.data,
        action_map_id: mapId,
        user_id: user.id,
        sort_order: nextSortOrder,
      })
      .select()
      .single();

    if (error) {
      console.error('ActionItem create error:', error);
      return NextResponse.json({ error: '作成に失敗しました' }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('ActionItems POST error:', error);
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 });
  }
}
```

- [ ] app/api/action-maps/[mapId]/items/route.ts 作成完了

### 3.4 ActionItem 個別 API

**ファイル**: `app/api/action-items/[itemId]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  due_date: z.string().optional().nullable(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  status: z.enum(['not_started', 'in_progress', 'blocked', 'done']).optional(),
  sort_order: z.number().optional(),
});

type RouteParams = { params: Promise<{ itemId: string }> };

// GET: ActionItem 詳細（紐付くTask一覧付き）
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { itemId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { data: item, error } = await supabase
      .from('action_items')
      .select('*')
      .eq('id', itemId)
      .eq('user_id', user.id)
      .single();

    if (error || !item) {
      return NextResponse.json({ error: '見つかりません' }, { status: 404 });
    }

    // 紐付くタスクを取得
    const { data: tasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('action_item_id', itemId)
      .order('created_at', { ascending: false });

    const totalTasks = tasks?.length || 0;
    const doneTasks = tasks?.filter(t => t.status === 'done').length || 0;
    const progressRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

    return NextResponse.json({
      ...item,
      progress_rate: progressRate,
      linked_task_count: totalTasks,
      completed_task_count: doneTasks,
      tasks: tasks || [],
    });
  } catch (error) {
    console.error('ActionItem GET error:', error);
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 });
  }
}

// PATCH: ActionItem 更新
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { itemId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const body = await request.json();
    const result = updateSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: '入力データが不正です', issues: result.error.issues },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('action_items')
      .update({
        ...result.data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', itemId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('ActionItem update error:', error);
      return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('ActionItem PATCH error:', error);
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 });
  }
}

// DELETE: ActionItem 削除
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { itemId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // 紐付くタスクの action_item_id を解除
    await supabase
      .from('tasks')
      .update({ action_item_id: null })
      .eq('action_item_id', itemId);

    const { error } = await supabase
      .from('action_items')
      .delete()
      .eq('id', itemId)
      .eq('user_id', user.id);

    if (error) {
      console.error('ActionItem delete error:', error);
      return NextResponse.json({ error: '削除に失敗しました' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('ActionItem DELETE error:', error);
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 });
  }
}
```

- [ ] app/api/action-items/[itemId]/route.ts 作成完了

---

## Step 4: カスタムフック作成

### 4.1 useActionMaps フック

**ファイル**: `lib/hooks/useActionMaps.ts`

```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import type { ActionMap, CreateActionMapInput, UpdateActionMapInput } from '@/lib/types/action-map';

export function useActionMaps() {
  const { user } = useAuth();
  const [actionMaps, setActionMaps] = useState<ActionMap[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadActionMaps = useCallback(async (includeArchived = false) => {
    if (!user) {
      setActionMaps([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const url = `/api/action-maps${includeArchived ? '?include_archived=true' : ''}`;
      const response = await fetch(url, { credentials: 'include' });

      if (!response.ok) {
        throw new Error('ActionMapsの取得に失敗しました');
      }

      const data = await response.json();
      setActionMaps(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('エラーが発生しました'));
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadActionMaps();
  }, [loadActionMaps]);

  const createActionMap = useCallback(async (input: CreateActionMapInput) => {
    const response = await fetch('/api/action-maps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || '作成に失敗しました');
    }

    const newMap = await response.json();
    setActionMaps(prev => [newMap, ...prev]);
    return newMap;
  }, []);

  const updateActionMap = useCallback(async (id: string, input: UpdateActionMapInput) => {
    const response = await fetch(`/api/action-maps/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('更新に失敗しました');
    }

    const updated = await response.json();
    setActionMaps(prev => prev.map(m => m.id === id ? updated : m));
    return updated;
  }, []);

  const deleteActionMap = useCallback(async (id: string) => {
    const response = await fetch(`/api/action-maps/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('削除に失敗しました');
    }

    setActionMaps(prev => prev.filter(m => m.id !== id));
  }, []);

  const archiveActionMap = useCallback(async (id: string) => {
    return updateActionMap(id, { is_archived: true });
  }, [updateActionMap]);

  return {
    actionMaps,
    isLoading,
    error,
    createActionMap,
    updateActionMap,
    deleteActionMap,
    archiveActionMap,
    reload: loadActionMaps,
  };
}
```

- [ ] lib/hooks/useActionMaps.ts 作成完了

### 4.2 useActionItems フック

**ファイル**: `lib/hooks/useActionItems.ts`

```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import type { ActionItem, CreateActionItemInput, UpdateActionItemInput } from '@/lib/types/action-map';

export function useActionItems(actionMapId: string | null) {
  const { user } = useAuth();
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadActionItems = useCallback(async () => {
    if (!user || !actionMapId) {
      setActionItems([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`/api/action-maps/${actionMapId}/items`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('ActionItemsの取得に失敗しました');
      }

      const data = await response.json();
      setActionItems(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('エラーが発生しました'));
    } finally {
      setIsLoading(false);
    }
  }, [user, actionMapId]);

  useEffect(() => {
    loadActionItems();
  }, [loadActionItems]);

  const createActionItem = useCallback(async (input: Omit<CreateActionItemInput, 'action_map_id'>) => {
    if (!actionMapId) throw new Error('ActionMap IDが必要です');

    const response = await fetch(`/api/action-maps/${actionMapId}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || '作成に失敗しました');
    }

    const newItem = await response.json();
    setActionItems(prev => [...prev, newItem]);
    return newItem;
  }, [actionMapId]);

  const updateActionItem = useCallback(async (id: string, input: UpdateActionItemInput) => {
    const response = await fetch(`/api/action-items/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('更新に失敗しました');
    }

    const updated = await response.json();
    setActionItems(prev => prev.map(item => item.id === id ? updated : item));
    return updated;
  }, []);

  const deleteActionItem = useCallback(async (id: string) => {
    const response = await fetch(`/api/action-items/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('削除に失敗しました');
    }

    setActionItems(prev => prev.filter(item => item.id !== id));
  }, []);

  const updateStatus = useCallback(async (id: string, status: ActionItem['status']) => {
    return updateActionItem(id, { status });
  }, [updateActionItem]);

  return {
    actionItems,
    isLoading,
    error,
    createActionItem,
    updateActionItem,
    deleteActionItem,
    updateStatus,
    reload: loadActionItems,
  };
}
```

- [ ] lib/hooks/useActionItems.ts 作成完了

---

## Step 5: UI コンポーネント作成

### 5.1 ActionMapList コンポーネント

**ファイル**: `components/action-map/ActionMapList.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Plus, Archive, MoreVertical, Trash2, Edit } from 'lucide-react';
import type { ActionMap } from '@/lib/types/action-map';

interface ActionMapListProps {
  actionMaps: ActionMap[];
  onSelect: (map: ActionMap) => void;
  onCreate: () => void;
  onEdit: (map: ActionMap) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
  selectedId?: string;
}

export function ActionMapList({
  actionMaps,
  onSelect,
  onCreate,
  onEdit,
  onArchive,
  onDelete,
  selectedId,
}: ActionMapListProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {/* 新規作成ボタン */}
      <button
        onClick={onCreate}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 16px',
          backgroundColor: '#667eea',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontWeight: 'bold',
          fontSize: '14px',
        }}
      >
        <Plus size={18} />
        新規ActionMap
      </button>

      {/* ActionMap リスト */}
      {actionMaps.map(map => (
        <div
          key={map.id}
          onClick={() => onSelect(map)}
          style={{
            padding: '12px 16px',
            backgroundColor: selectedId === map.id ? '#eff6ff' : 'white',
            border: selectedId === map.id ? '2px solid #3b82f6' : '1px solid #e5e7eb',
            borderRadius: '8px',
            cursor: 'pointer',
            position: 'relative',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', color: '#1f2937' }}>
                {map.title}
              </h4>
              {map.description && (
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#6b7280' }}>
                  {map.description}
                </p>
              )}
            </div>

            {/* 進捗バー */}
            <div style={{ width: '60px', textAlign: 'right' }}>
              <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#3b82f6' }}>
                {map.progress_rate || 0}%
              </span>
              <div style={{
                marginTop: '4px',
                height: '4px',
                backgroundColor: '#e5e7eb',
                borderRadius: '2px',
                overflow: 'hidden',
              }}>
                <div style={{
                  width: `${map.progress_rate || 0}%`,
                  height: '100%',
                  backgroundColor: '#3b82f6',
                  transition: 'width 0.3s',
                }} />
              </div>
            </div>

            {/* メニューボタン */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setOpenMenuId(openMenuId === map.id ? null : map.id);
              }}
              style={{
                marginLeft: '8px',
                padding: '4px',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: '#6b7280',
              }}
            >
              <MoreVertical size={16} />
            </button>

            {/* ドロップダウンメニュー */}
            {openMenuId === map.id && (
              <div
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '40px',
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  zIndex: 10,
                  minWidth: '120px',
                }}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(map);
                    setOpenMenuId(null);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '8px 12px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '13px',
                  }}
                >
                  <Edit size={14} />
                  編集
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onArchive(map.id);
                    setOpenMenuId(null);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '8px 12px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '13px',
                  }}
                >
                  <Archive size={14} />
                  アーカイブ
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('削除しますか？')) {
                      onDelete(map.id);
                    }
                    setOpenMenuId(null);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '8px 12px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '13px',
                    color: '#ef4444',
                  }}
                >
                  <Trash2 size={14} />
                  削除
                </button>
              </div>
            )}
          </div>
        </div>
      ))}

      {actionMaps.length === 0 && (
        <div style={{
          padding: '32px',
          textAlign: 'center',
          color: '#9ca3af',
          fontSize: '14px',
        }}>
          ActionMapがありません
        </div>
      )}
    </div>
  );
}
```

- [ ] components/action-map/ActionMapList.tsx 作成完了

### 5.2 ActionItemList コンポーネント

**ファイル**: `components/action-map/ActionItemList.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Plus, CheckCircle, Clock, AlertCircle, Circle } from 'lucide-react';
import type { ActionItem } from '@/lib/types/action-map';
import { ACTION_ITEM_STATUS_CONFIG, ACTION_ITEM_PRIORITY_CONFIG } from '@/lib/types/action-map';

interface ActionItemListProps {
  items: ActionItem[];
  onAdd: () => void;
  onStatusChange: (id: string, status: ActionItem['status']) => void;
  onSelect: (item: ActionItem) => void;
}

const StatusIcon = ({ status }: { status: ActionItem['status'] }) => {
  switch (status) {
    case 'done':
      return <CheckCircle size={18} color="#22c55e" />;
    case 'in_progress':
      return <Clock size={18} color="#3b82f6" />;
    case 'blocked':
      return <AlertCircle size={18} color="#ef4444" />;
    default:
      return <Circle size={18} color="#9ca3af" />;
  }
};

export function ActionItemList({ items, onAdd, onStatusChange, onSelect }: ActionItemListProps) {
  return (
    <div>
      {/* ヘッダー */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
      }}>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>
          ActionItems ({items.length})
        </h3>
        <button
          onClick={onAdd}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '6px 12px',
            backgroundColor: '#f3f4f6',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '13px',
          }}
        >
          <Plus size={14} />
          追加
        </button>
      </div>

      {/* アイテムリスト */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {items.map(item => {
          const statusConfig = ACTION_ITEM_STATUS_CONFIG[item.status];
          const priorityConfig = ACTION_ITEM_PRIORITY_CONFIG[item.priority];

          return (
            <div
              key={item.id}
              onClick={() => onSelect(item)}
              style={{
                padding: '12px',
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                {/* ステータスアイコン */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const nextStatus = item.status === 'done' ? 'not_started' : 'done';
                    onStatusChange(item.id, nextStatus);
                  }}
                  style={{
                    padding: '2px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <StatusIcon status={item.status} />
                </button>

                {/* 内容 */}
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: '500',
                    color: item.status === 'done' ? '#9ca3af' : '#1f2937',
                    textDecoration: item.status === 'done' ? 'line-through' : 'none',
                  }}>
                    {item.title}
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginTop: '6px',
                    flexWrap: 'wrap',
                  }}>
                    {/* ステータスバッジ */}
                    <span style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      backgroundColor: statusConfig.bgColor,
                      color: statusConfig.color,
                    }}>
                      {statusConfig.label}
                    </span>

                    {/* 優先度バッジ */}
                    <span style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      backgroundColor: priorityConfig.bgColor,
                      color: priorityConfig.color,
                    }}>
                      {priorityConfig.label}
                    </span>

                    {/* タスク数 */}
                    {(item.linked_task_count ?? 0) > 0 && (
                      <span style={{
                        fontSize: '11px',
                        color: '#6b7280',
                      }}>
                        {item.completed_task_count}/{item.linked_task_count} Tasks
                      </span>
                    )}
                  </div>
                </div>

                {/* 進捗率 */}
                <div style={{ textAlign: 'right', minWidth: '50px' }}>
                  <span style={{
                    fontSize: '14px',
                    fontWeight: 'bold',
                    color: '#3b82f6',
                  }}>
                    {item.progress_rate || 0}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {items.length === 0 && (
          <div style={{
            padding: '24px',
            textAlign: 'center',
            color: '#9ca3af',
            fontSize: '14px',
            border: '2px dashed #e5e7eb',
            borderRadius: '8px',
          }}>
            ActionItemがありません
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] components/action-map/ActionItemList.tsx 作成完了

### 5.3 ActionMap ページ

**ファイル**: `app/(app)/action-maps/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Map } from 'lucide-react';
import { useActionMaps } from '@/lib/hooks/useActionMaps';
import { useActionItems } from '@/lib/hooks/useActionItems';
import { ActionMapList } from '@/components/action-map/ActionMapList';
import { ActionItemList } from '@/components/action-map/ActionItemList';
import type { ActionMap, ActionItem } from '@/lib/types/action-map';

export default function ActionMapsPage() {
  const { actionMaps, isLoading, createActionMap, updateActionMap, deleteActionMap, archiveActionMap } = useActionMaps();
  const [selectedMap, setSelectedMap] = useState<ActionMap | null>(null);
  const { actionItems, createActionItem, updateStatus } = useActionItems(selectedMap?.id || null);

  const handleCreateMap = async () => {
    const title = prompt('ActionMapのタイトルを入力');
    if (title) {
      const newMap = await createActionMap({ title });
      setSelectedMap(newMap);
    }
  };

  const handleEditMap = async (map: ActionMap) => {
    const title = prompt('新しいタイトル', map.title);
    if (title && title !== map.title) {
      await updateActionMap(map.id, { title });
    }
  };

  const handleAddItem = async () => {
    const title = prompt('ActionItemのタイトルを入力');
    if (title) {
      await createActionItem({ title });
    }
  };

  const handleSelectItem = (item: ActionItem) => {
    // TODO: 詳細モーダルを開く
    console.log('Selected item:', item);
  };

  if (isLoading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        読み込み中...
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* ヘッダー */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '24px',
      }}>
        <Map size={28} color="#667eea" />
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>
          Action Map
        </h1>
      </div>

      {/* 2カラムレイアウト */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '320px 1fr',
        gap: '24px',
        alignItems: 'start',
      }}>
        {/* 左: ActionMap リスト */}
        <div style={{
          backgroundColor: '#f9fafb',
          padding: '16px',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
        }}>
          <ActionMapList
            actionMaps={actionMaps}
            onSelect={setSelectedMap}
            onCreate={handleCreateMap}
            onEdit={handleEditMap}
            onArchive={archiveActionMap}
            onDelete={deleteActionMap}
            selectedId={selectedMap?.id}
          />
        </div>

        {/* 右: ActionItems */}
        <div style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          minHeight: '400px',
        }}>
          {selectedMap ? (
            <>
              <div style={{ marginBottom: '20px' }}>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>
                  {selectedMap.title}
                </h2>
                {selectedMap.description && (
                  <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: '14px' }}>
                    {selectedMap.description}
                  </p>
                )}
                <div style={{
                  marginTop: '12px',
                  padding: '12px',
                  backgroundColor: '#f3f4f6',
                  borderRadius: '8px',
                }}>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                    全体進捗
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      flex: 1,
                      height: '8px',
                      backgroundColor: '#e5e7eb',
                      borderRadius: '4px',
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        width: `${selectedMap.progress_rate || 0}%`,
                        height: '100%',
                        backgroundColor: '#3b82f6',
                        transition: 'width 0.3s',
                      }} />
                    </div>
                    <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#3b82f6' }}>
                      {selectedMap.progress_rate || 0}%
                    </span>
                  </div>
                </div>
              </div>

              <ActionItemList
                items={actionItems}
                onAdd={handleAddItem}
                onStatusChange={updateStatus}
                onSelect={handleSelectItem}
              />
            </>
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '300px',
              color: '#9ca3af',
            }}>
              <Map size={48} strokeWidth={1} />
              <p style={{ marginTop: '12px' }}>
                ActionMapを選択してください
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] app/(app)/action-maps/page.tsx 作成完了

---

## Step 6: ナビゲーション追加

### 6.1 レイアウトにリンク追加

**ファイル**: `app/(app)/layout.tsx`

ナビゲーションに Action Map リンクを追加：

```typescript
// nav配列に追加
{ href: '/action-maps', label: 'Action Map', icon: Map },
```

- [ ] ナビゲーションリンク追加完了

---

## Step 7: Task との連携

### 7.1 Task 作成/編集時に ActionItem を選択可能に

**ファイル**: `components/tasks/AddTaskForm.tsx` に追加

ActionItem セレクトボックスを追加して、Task 作成時に紐付けできるようにする。

- [ ] Task フォームに ActionItem 選択を追加

### 7.2 Tasks API 更新

**ファイル**: `app/api/tasks/[taskId]/route.ts`

action_item_id の更新に対応：

```typescript
const updateSchema = z.object({
  // ... 既存フィールド
  action_item_id: z.string().uuid().optional().nullable(),
});
```

- [ ] Tasks API 更新完了

---

## 完了チェックリスト

### データベース
- [ ] action_maps テーブル作成
- [ ] action_items テーブル作成
- [ ] tasks.action_item_id カラム追加
- [ ] RLS ポリシー設定

### 型定義
- [ ] lib/types/action-map.ts 作成
- [ ] lib/types/task.ts 更新

### API
- [ ] app/api/action-maps/route.ts
- [ ] app/api/action-maps/[mapId]/route.ts
- [ ] app/api/action-maps/[mapId]/items/route.ts
- [ ] app/api/action-items/[itemId]/route.ts

### フック
- [ ] lib/hooks/useActionMaps.ts
- [ ] lib/hooks/useActionItems.ts

### UI
- [ ] components/action-map/ActionMapList.tsx
- [ ] components/action-map/ActionItemList.tsx
- [ ] app/(app)/action-maps/page.tsx
- [ ] ナビゲーションリンク追加

### 動作確認
- [ ] ActionMap の CRUD 動作
- [ ] ActionItem の CRUD 動作
- [ ] Task との紐付け動作
- [ ] 進捗率の自動計算
- [ ] ボトムアップ集計（Task → ActionItem → ActionMap）

---

## 次のステップ（Phase 11）

- OKR（Objective & Key Results）の実装
- ActionMap と OKR の連携
- 戦略層からの進捗可視化

---

**作成日**: 2025-01-08
**対象**: FDC Modular Starter Phase 10
