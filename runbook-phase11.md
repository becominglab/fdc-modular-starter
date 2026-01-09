# Phase 11: OKR（戦略層）実装ランブック

## 目標

FDC 3層アーキテクチャの「戦略層」として、OKR（目標管理）を実装し、全体の進捗をボトムアップで自動計算できるようにする。

## 完成イメージ

```
┌────────────────────────────────────────┐
│ OKR（戦略層）                           │
│   Objective: 売上を2倍にする            │
│   進捗: 50%                             │
│     └─ Key Result: MRR 100万円達成      │
│        進捗: 50%（現在50万円/目標100万円）│
└───────────────────┬────────────────────┘
                    │ 紐付け
┌───────────────────▼────────────────────┐
│ Action Map（戦術層）                    │
│   進捗: 50%（ActionItem平均）           │
└───────────────────┬────────────────────┘
                    │ 紐付け
┌───────────────────▼────────────────────┐
│ Task（実行層）                          │
│   完了率: 3/6 = 50%                     │
└────────────────────────────────────────┘
```

---

## Step 1: Supabase マイグレーション作成

### 1.1 マイグレーションファイル作成

**ファイル:** `supabase/migrations/20260109_phase11_okr.sql`

```sql
-- =============================================
-- Phase 11: OKR（戦略層）テーブル作成
-- =============================================

-- 1. objectives テーブル
CREATE TABLE IF NOT EXISTS objectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  period TEXT NOT NULL,  -- 'Q1 2025', '2025年上期' など
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. key_results テーブル
CREATE TABLE IF NOT EXISTS key_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  objective_id UUID NOT NULL REFERENCES objectives(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  target_value NUMERIC NOT NULL DEFAULT 100,
  current_value NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT '%',  -- '%', '円', '件', '人' など
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. action_maps に key_result_id を追加
ALTER TABLE action_maps
ADD COLUMN IF NOT EXISTS key_result_id UUID REFERENCES key_results(id) ON DELETE SET NULL;

-- 4. RLS ポリシー設定
ALTER TABLE objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE key_results ENABLE ROW LEVEL SECURITY;

-- objectives ポリシー
CREATE POLICY "Users can view own objectives" ON objectives
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own objectives" ON objectives
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own objectives" ON objectives
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own objectives" ON objectives
  FOR DELETE USING (auth.uid() = user_id);

-- key_results ポリシー
CREATE POLICY "Users can view own key_results" ON key_results
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own key_results" ON key_results
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own key_results" ON key_results
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own key_results" ON key_results
  FOR DELETE USING (auth.uid() = user_id);

-- 5. インデックス作成
CREATE INDEX IF NOT EXISTS idx_objectives_user_id ON objectives(user_id);
CREATE INDEX IF NOT EXISTS idx_key_results_objective_id ON key_results(objective_id);
CREATE INDEX IF NOT EXISTS idx_key_results_user_id ON key_results(user_id);
CREATE INDEX IF NOT EXISTS idx_action_maps_key_result_id ON action_maps(key_result_id);

-- 6. updated_at 自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_objectives_updated_at
  BEFORE UPDATE ON objectives
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_key_results_updated_at
  BEFORE UPDATE ON key_results
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 1.2 マイグレーション実行

```bash
supabase db push
```

### 確認ポイント

- [ ] マイグレーションがエラーなく完了
- [ ] objectives テーブルが作成された
- [ ] key_results テーブルが作成された
- [ ] action_maps に key_result_id カラムが追加された

---

## Step 2: 型定義作成

### 2.1 Supabase 型を再生成

```bash
supabase gen types typescript --project-id scxftlglgylcepwucmoj > lib/supabase/database.types.ts
cp lib/supabase/database.types.ts lib/types/database.ts
```

### 2.2 OKR 型定義ファイル作成

**ファイル:** `lib/types/okr.ts`

```typescript
/**
 * OKR（目標管理）の型定義
 * Phase 11: FDC 3層アーキテクチャの戦略層
 */

// Objective（目標）
export interface Objective {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  period: string;  // 'Q1 2025', '2025年上期' など
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  // 計算フィールド
  progress_rate?: number;  // KRの平均進捗
  key_result_count?: number;
}

// Key Result（成果指標）
export interface KeyResult {
  id: string;
  objective_id: string;
  user_id: string;
  title: string;
  target_value: number;
  current_value: number;
  unit: string;  // '%', '円', '件', '人' など
  sort_order: number;
  created_at: string;
  updated_at: string;
  // 計算フィールド
  progress_rate?: number;  // (current_value / target_value) * 100
  action_map_count?: number;
}

// 作成用入力型
export interface CreateObjectiveInput {
  title: string;
  description?: string;
  period: string;
}

export interface UpdateObjectiveInput {
  title?: string;
  description?: string;
  period?: string;
  is_archived?: boolean;
}

export interface CreateKeyResultInput {
  objective_id: string;
  title: string;
  target_value: number;
  current_value?: number;
  unit: string;
}

export interface UpdateKeyResultInput {
  title?: string;
  target_value?: number;
  current_value?: number;
  unit?: string;
}

// 期間オプション
export const PERIOD_OPTIONS = [
  { value: 'Q1 2025', label: 'Q1 2025（1-3月）' },
  { value: 'Q2 2025', label: 'Q2 2025（4-6月）' },
  { value: 'Q3 2025', label: 'Q3 2025（7-9月）' },
  { value: 'Q4 2025', label: 'Q4 2025（10-12月）' },
  { value: '2025年上期', label: '2025年上期' },
  { value: '2025年下期', label: '2025年下期' },
  { value: '2025年通期', label: '2025年通期' },
];

// 単位オプション
export const UNIT_OPTIONS = [
  { value: '%', label: '%（パーセント）' },
  { value: '円', label: '円' },
  { value: '万円', label: '万円' },
  { value: '件', label: '件' },
  { value: '人', label: '人' },
  { value: '回', label: '回' },
  { value: 'pt', label: 'ポイント' },
];
```

### 確認ポイント

- [ ] `lib/types/okr.ts` が作成された
- [ ] Objective, KeyResult インターフェースが定義された
- [ ] PERIOD_OPTIONS, UNIT_OPTIONS が定義された

---

## Step 3: API ルート作成

### 3.1 Objectives API

**ファイル:** `app/api/objectives/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const createSchema = z.object({
  title: z.string().min(1, 'タイトルは必須です'),
  description: z.string().optional(),
  period: z.string().min(1, '期間は必須です'),
});

// GET: Objective 一覧取得（進捗率計算付き）
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
      .from('objectives')
      .select(`
        *,
        key_results (
          id,
          target_value,
          current_value
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!includeArchived) {
      query = query.eq('is_archived', false);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Objectives fetch error:', error);
      return NextResponse.json({ error: '取得に失敗しました' }, { status: 500 });
    }

    // 各Objectiveの進捗率を計算（子KRの平均）
    const objectivesWithProgress = (data || []).map((obj) => {
      const krs = obj.key_results || [];
      const krCount = krs.length;

      if (krCount === 0) {
        return {
          ...obj,
          progress_rate: 0,
          key_result_count: 0,
          key_results: undefined,
        };
      }

      // 各KRの進捗率を計算
      const krProgressRates = krs.map((kr: { target_value: number; current_value: number }) => {
        if (kr.target_value === 0) return 0;
        return Math.min((kr.current_value / kr.target_value) * 100, 100);
      });

      // KRの平均進捗率
      const avgProgress = Math.round(
        krProgressRates.reduce((sum: number, rate: number) => sum + rate, 0) / krCount
      );

      return {
        ...obj,
        progress_rate: avgProgress,
        key_result_count: krCount,
        key_results: undefined,
      };
    });

    return NextResponse.json(objectivesWithProgress);
  } catch (error) {
    console.error('Objectives GET error:', error);
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 });
  }
}

// POST: Objective 作成
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
      .from('objectives')
      .insert({
        ...result.data,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Objective create error:', error);
      return NextResponse.json({ error: '作成に失敗しました' }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Objectives POST error:', error);
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 });
  }
}
```

### 3.2 Objective 詳細 API

**ファイル:** `app/api/objectives/[objectiveId]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  period: z.string().optional(),
  is_archived: z.boolean().optional(),
});

type RouteParams = { params: Promise<{ objectiveId: string }> };

// GET: Objective 詳細取得
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { objectiveId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('objectives')
      .select(`
        *,
        key_results (
          *
        )
      `)
      .eq('id', objectiveId)
      .eq('user_id', user.id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: '見つかりません' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Objective GET error:', error);
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 });
  }
}

// PATCH: Objective 更新
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { objectiveId } = await params;
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
      .from('objectives')
      .update(result.data)
      .eq('id', objectiveId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Objective update error:', error);
      return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Objective PATCH error:', error);
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 });
  }
}

// DELETE: Objective 削除
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { objectiveId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { error } = await supabase
      .from('objectives')
      .delete()
      .eq('id', objectiveId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Objective delete error:', error);
      return NextResponse.json({ error: '削除に失敗しました' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Objective DELETE error:', error);
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 });
  }
}
```

### 3.3 Key Results API

**ファイル:** `app/api/objectives/[objectiveId]/key-results/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const createSchema = z.object({
  title: z.string().min(1, 'タイトルは必須です'),
  target_value: z.number().positive('目標値は正の数である必要があります'),
  current_value: z.number().min(0).default(0),
  unit: z.string().min(1, '単位は必須です'),
});

type RouteParams = { params: Promise<{ objectiveId: string }> };

// GET: Key Results 一覧取得
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { objectiveId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('key_results')
      .select('*')
      .eq('objective_id', objectiveId)
      .eq('user_id', user.id)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Key Results fetch error:', error);
      return NextResponse.json({ error: '取得に失敗しました' }, { status: 500 });
    }

    // 各KRの進捗率を計算
    const krsWithProgress = await Promise.all(
      (data || []).map(async (kr) => {
        const progressRate = kr.target_value > 0
          ? Math.min(Math.round((kr.current_value / kr.target_value) * 100), 100)
          : 0;

        // 紐付いたActionMapの数を取得
        const { count } = await supabase
          .from('action_maps')
          .select('id', { count: 'exact', head: true })
          .eq('key_result_id', kr.id);

        return {
          ...kr,
          progress_rate: progressRate,
          action_map_count: count || 0,
        };
      })
    );

    return NextResponse.json(krsWithProgress);
  } catch (error) {
    console.error('Key Results GET error:', error);
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 });
  }
}

// POST: Key Result 作成
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { objectiveId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // Objective の存在確認
    const { data: objective } = await supabase
      .from('objectives')
      .select('id')
      .eq('id', objectiveId)
      .eq('user_id', user.id)
      .single();

    if (!objective) {
      return NextResponse.json({ error: 'Objectiveが見つかりません' }, { status: 404 });
    }

    const body = await request.json();
    const result = createSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: '入力データが不正です', issues: result.error.issues },
        { status: 400 }
      );
    }

    // sort_order を自動設定
    const { data: lastKr } = await supabase
      .from('key_results')
      .select('sort_order')
      .eq('objective_id', objectiveId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single();

    const nextSortOrder = (lastKr?.sort_order || 0) + 1;

    const { data, error } = await supabase
      .from('key_results')
      .insert({
        ...result.data,
        objective_id: objectiveId,
        user_id: user.id,
        sort_order: nextSortOrder,
      })
      .select()
      .single();

    if (error) {
      console.error('Key Result create error:', error);
      return NextResponse.json({ error: '作成に失敗しました' }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Key Results POST error:', error);
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 });
  }
}
```

### 3.4 Key Result 詳細 API

**ファイル:** `app/api/key-results/[krId]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  target_value: z.number().positive().optional(),
  current_value: z.number().min(0).optional(),
  unit: z.string().optional(),
});

type RouteParams = { params: Promise<{ krId: string }> };

// GET: Key Result 詳細取得
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { krId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('key_results')
      .select(`
        *,
        action_maps (
          id,
          title
        )
      `)
      .eq('id', krId)
      .eq('user_id', user.id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: '見つかりません' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Key Result GET error:', error);
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 });
  }
}

// PATCH: Key Result 更新
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { krId } = await params;
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
      .from('key_results')
      .update(result.data)
      .eq('id', krId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Key Result update error:', error);
      return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Key Result PATCH error:', error);
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 });
  }
}

// DELETE: Key Result 削除
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { krId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // 紐付いたActionMapsの key_result_id をクリア
    await supabase
      .from('action_maps')
      .update({ key_result_id: null })
      .eq('key_result_id', krId);

    const { error } = await supabase
      .from('key_results')
      .delete()
      .eq('id', krId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Key Result delete error:', error);
      return NextResponse.json({ error: '削除に失敗しました' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Key Result DELETE error:', error);
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 });
  }
}
```

### 確認ポイント

- [ ] `app/api/objectives/route.ts` が作成された
- [ ] `app/api/objectives/[objectiveId]/route.ts` が作成された
- [ ] `app/api/objectives/[objectiveId]/key-results/route.ts` が作成された
- [ ] `app/api/key-results/[krId]/route.ts` が作成された

---

## Step 4: カスタムフック作成

### 4.1 useObjectives フック

**ファイル:** `lib/hooks/useObjectives.ts`

```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import type { Objective, CreateObjectiveInput, UpdateObjectiveInput } from '@/lib/types/okr';

export function useObjectives() {
  const { user } = useAuth();
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadObjectives = useCallback(async () => {
    if (!user) {
      setObjectives([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch('/api/objectives', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('取得に失敗しました');
      const data = await response.json();
      setObjectives(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('エラーが発生しました'));
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadObjectives();
  }, [loadObjectives]);

  const addObjective = useCallback(async (input: CreateObjectiveInput) => {
    const response = await fetch('/api/objectives', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      credentials: 'include',
    });
    if (!response.ok) throw new Error('作成に失敗しました');
    const newObj = await response.json();
    setObjectives(prev => [newObj, ...prev]);
    return newObj;
  }, []);

  const updateObjective = useCallback(async (id: string, input: UpdateObjectiveInput) => {
    const response = await fetch(`/api/objectives/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      credentials: 'include',
    });
    if (!response.ok) throw new Error('更新に失敗しました');
    const updated = await response.json();
    setObjectives(prev => prev.map(o => o.id === id ? { ...o, ...updated } : o));
    return updated;
  }, []);

  const deleteObjective = useCallback(async (id: string) => {
    const response = await fetch(`/api/objectives/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!response.ok) throw new Error('削除に失敗しました');
    setObjectives(prev => prev.filter(o => o.id !== id));
  }, []);

  return {
    objectives,
    isLoading,
    error,
    addObjective,
    updateObjective,
    deleteObjective,
    reload: loadObjectives,
  };
}
```

### 4.2 useKeyResults フック

**ファイル:** `lib/hooks/useKeyResults.ts`

```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import type { KeyResult, CreateKeyResultInput, UpdateKeyResultInput } from '@/lib/types/okr';

export function useKeyResults(objectiveId: string | null) {
  const { user } = useAuth();
  const [keyResults, setKeyResults] = useState<KeyResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadKeyResults = useCallback(async () => {
    if (!user || !objectiveId) {
      setKeyResults([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`/api/objectives/${objectiveId}/key-results`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('取得に失敗しました');
      const data = await response.json();
      setKeyResults(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('エラーが発生しました'));
    } finally {
      setIsLoading(false);
    }
  }, [user, objectiveId]);

  useEffect(() => {
    loadKeyResults();
  }, [loadKeyResults]);

  const addKeyResult = useCallback(async (input: Omit<CreateKeyResultInput, 'objective_id'>) => {
    if (!objectiveId) throw new Error('Objective IDが必要です');
    const response = await fetch(`/api/objectives/${objectiveId}/key-results`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...input, objective_id: objectiveId }),
      credentials: 'include',
    });
    if (!response.ok) throw new Error('作成に失敗しました');
    const newKr = await response.json();
    setKeyResults(prev => [...prev, newKr]);
    return newKr;
  }, [objectiveId]);

  const updateKeyResult = useCallback(async (id: string, input: UpdateKeyResultInput) => {
    const response = await fetch(`/api/key-results/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      credentials: 'include',
    });
    if (!response.ok) throw new Error('更新に失敗しました');
    const updated = await response.json();
    setKeyResults(prev => prev.map(kr => kr.id === id ? { ...kr, ...updated } : kr));
    return updated;
  }, []);

  const deleteKeyResult = useCallback(async (id: string) => {
    const response = await fetch(`/api/key-results/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!response.ok) throw new Error('削除に失敗しました');
    setKeyResults(prev => prev.filter(kr => kr.id !== id));
  }, []);

  return {
    keyResults,
    isLoading,
    error,
    addKeyResult,
    updateKeyResult,
    deleteKeyResult,
    reload: loadKeyResults,
  };
}
```

### 確認ポイント

- [ ] `lib/hooks/useObjectives.ts` が作成された
- [ ] `lib/hooks/useKeyResults.ts` が作成された

---

## Step 5: UI コンポーネント作成

### 5.1 OKR 一覧ページ

**ファイル:** `app/(app)/okr/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Plus, Target, TrendingUp } from 'lucide-react';
import { useObjectives } from '@/lib/hooks/useObjectives';
import { ObjectiveCard } from '@/components/okr/ObjectiveCard';
import { AddObjectiveForm } from '@/components/okr/AddObjectiveForm';

export default function OKRPage() {
  const { objectives, isLoading, error, addObjective, deleteObjective } = useObjectives();
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">読み込み中...</div>;
  }

  if (error) {
    return <div className="p-8 text-center text-red-500">エラー: {error.message}</div>;
  }

  // 全体進捗を計算
  const totalProgress = objectives.length > 0
    ? Math.round(objectives.reduce((sum, o) => sum + (o.progress_rate || 0), 0) / objectives.length)
    : 0;

  return (
    <div className="py-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Target className="text-blue-600" />
            OKR
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            目標と成果指標を管理
          </p>
        </div>
        <button
          onClick={() => setIsAddFormOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <Plus size={18} />
          Objective を追加
        </button>
      </div>

      {/* 全体進捗 */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg p-6 mb-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-100 text-sm">全体進捗</p>
            <p className="text-4xl font-bold">{totalProgress}%</p>
          </div>
          <TrendingUp size={48} className="text-blue-200" />
        </div>
        <div className="mt-4 bg-blue-400/30 rounded-full h-3">
          <div
            className="bg-white rounded-full h-3 transition-all"
            style={{ width: `${totalProgress}%` }}
          />
        </div>
      </div>

      {/* Objective 一覧 */}
      {objectives.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Target className="mx-auto text-gray-300 mb-4" size={48} />
          <p className="text-gray-500">Objective がまだありません</p>
          <button
            onClick={() => setIsAddFormOpen(true)}
            className="mt-4 text-blue-600 hover:underline"
          >
            最初の Objective を作成
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {objectives.map(objective => (
            <ObjectiveCard
              key={objective.id}
              objective={objective}
              onDelete={deleteObjective}
            />
          ))}
        </div>
      )}

      {/* 追加フォーム */}
      <AddObjectiveForm
        isOpen={isAddFormOpen}
        onAdd={addObjective}
        onClose={() => setIsAddFormOpen(false)}
      />
    </div>
  );
}
```

### 5.2 ObjectiveCard コンポーネント

**ファイル:** `components/okr/ObjectiveCard.tsx`

```typescript
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Trash2, Target } from 'lucide-react';
import type { Objective } from '@/lib/types/okr';

interface ObjectiveCardProps {
  objective: Objective;
  onDelete: (id: string) => Promise<void>;
}

export function ObjectiveCard({ objective, onDelete }: ObjectiveCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm('この Objective を削除しますか？関連する Key Results も削除されます。')) return;
    setIsDeleting(true);
    try {
      await onDelete(objective.id);
    } finally {
      setIsDeleting(false);
    }
  };

  const progressColor = objective.progress_rate >= 70
    ? 'bg-green-500'
    : objective.progress_rate >= 40
    ? 'bg-yellow-500'
    : 'bg-red-500';

  return (
    <div className="bg-white rounded-lg border shadow-sm hover:shadow-md transition-shadow">
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Target size={18} className="text-blue-600" />
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                {objective.period}
              </span>
            </div>
            <Link href={`/okr/${objective.id}`} className="group">
              <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 flex items-center gap-1">
                {objective.title}
                <ChevronRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
              </h3>
            </Link>
            {objective.description && (
              <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                {objective.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">
                {objective.progress_rate || 0}%
              </p>
              <p className="text-xs text-gray-500">
                {objective.key_result_count || 0} KRs
              </p>
            </div>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="p-2 text-gray-400 hover:text-red-500 rounded"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {/* 進捗バー */}
        <div className="mt-4">
          <div className="bg-gray-100 rounded-full h-2">
            <div
              className={`${progressColor} rounded-full h-2 transition-all`}
              style={{ width: `${objective.progress_rate || 0}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
```

### 5.3 AddObjectiveForm コンポーネント

**ファイル:** `components/okr/AddObjectiveForm.tsx`

```typescript
'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import type { CreateObjectiveInput } from '@/lib/types/okr';
import { PERIOD_OPTIONS } from '@/lib/types/okr';

interface AddObjectiveFormProps {
  isOpen: boolean;
  onAdd: (input: CreateObjectiveInput) => Promise<unknown>;
  onClose: () => void;
}

export function AddObjectiveForm({ isOpen, onAdd, onClose }: AddObjectiveFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [period, setPeriod] = useState(PERIOD_OPTIONS[0].value);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      await onAdd({
        title: title.trim(),
        description: description.trim() || undefined,
        period,
      });
      setTitle('');
      setDescription('');
      setPeriod(PERIOD_OPTIONS[0].value);
      onClose();
    } catch (error) {
      console.error('Add objective error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Objective を追加</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              タイトル <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="例: 売上を2倍にする"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              説明
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="目標の詳細説明（任意）"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              期間 <span className="text-red-500">*</span>
            </label>
            <select
              value={period}
              onChange={e => setPeriod(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {PERIOD_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? '追加中...' : '追加'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

### 5.4 コンポーネント index ファイル

**ファイル:** `components/okr/index.ts`

```typescript
export { ObjectiveCard } from './ObjectiveCard';
export { AddObjectiveForm } from './AddObjectiveForm';
```

### 確認ポイント

- [ ] `app/(app)/okr/page.tsx` が作成された
- [ ] `components/okr/ObjectiveCard.tsx` が作成された
- [ ] `components/okr/AddObjectiveForm.tsx` が作成された
- [ ] `components/okr/index.ts` が作成された

---

## Step 6: ナビゲーション更新

### 6.1 レイアウトにOKRリンク追加

**ファイル:** `app/(app)/layout.tsx` に以下を追加

```typescript
// ナビゲーションリンクに追加
{ href: '/okr', label: 'OKR', icon: Target }
```

### 確認ポイント

- [ ] サイドナビに OKR リンクが表示される
- [ ] `/okr` ページにアクセスできる

---

## Step 7: ActionMap と Key Result の紐付け

### 7.1 ActionMap 作成/編集フォームに KR 選択を追加

**ファイル:** ActionMap のフォームコンポーネントに Key Result 選択を追加

```typescript
// Key Results を取得
const [keyResults, setKeyResults] = useState<KeyResult[]>([]);

useEffect(() => {
  fetch('/api/objectives')
    .then(res => res.json())
    .then(async (objectives) => {
      const allKrs: KeyResult[] = [];
      for (const obj of objectives) {
        const res = await fetch(`/api/objectives/${obj.id}/key-results`);
        const krs = await res.json();
        allKrs.push(...krs.map((kr: KeyResult) => ({
          ...kr,
          objectiveTitle: obj.title,
        })));
      }
      setKeyResults(allKrs);
    });
}, []);

// フォームに追加
<select
  value={keyResultId}
  onChange={e => setKeyResultId(e.target.value)}
>
  <option value="">-- Key Result に紐付け（任意）--</option>
  {keyResults.map(kr => (
    <option key={kr.id} value={kr.id}>
      {kr.objectiveTitle}: {kr.title}
    </option>
  ))}
</select>
```

### 確認ポイント

- [ ] ActionMap 作成時に Key Result を選択できる
- [ ] 紐付けが正しく保存される

---

## Step 8: 動作確認

### 8.1 例データ作成スクリプト

ブラウザコンソールで実行：

```javascript
// OKR 例データ作成
(async () => {
  // 1. Objective 作成
  const objRes = await fetch('/api/objectives', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: '売上を2倍にする',
      description: '今期の最重要目標',
      period: 'Q1 2025'
    })
  });
  const obj = await objRes.json();
  console.log('Objective created:', obj.id);

  // 2. Key Results 作成
  const krs = [
    { title: 'MRR 100万円達成', target_value: 100, current_value: 50, unit: '万円' },
    { title: '新規顧客 50社獲得', target_value: 50, current_value: 20, unit: '社' },
    { title: 'チャーンレート 5%以下', target_value: 5, current_value: 8, unit: '%' },
  ];

  for (const kr of krs) {
    await fetch(`/api/objectives/${obj.id}/key-results`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(kr)
    });
    console.log('Key Result created:', kr.title);
  }

  console.log('OKR example data created! Reload the page.');
})();
```

### 確認ポイント

- [ ] Objective を作成できる
- [ ] Key Result を追加できる
- [ ] Objective の進捗が KR の平均で計算される
- [ ] ActionMap を Key Result に紐付けできる

---

## 完了チェックリスト

- [ ] objectives テーブルが作成された
- [ ] key_results テーブルが作成された
- [ ] action_maps に key_result_id が追加された
- [ ] `/api/objectives` が動作する
- [ ] `/api/objectives/[id]/key-results` が動作する
- [ ] `/api/key-results/[id]` が動作する
- [ ] `/okr` ページが表示される
- [ ] Objective を作成できる
- [ ] Key Result を追加できる
- [ ] 進捗が自動計算される（KR → Objective）
- [ ] ActionMap と Key Result を紐付けできる
- [ ] Git にプッシュした

---

## 進捗計算まとめ

| レベル | 計算方法 |
|--------|----------|
| **Key Result** | current_value / target_value * 100 |
| **Objective** | 子 Key Results の平均進捗 |
| **ActionMap** | 子 ActionItems の平均進捗（Task完了率ベース） |
| **ActionItem** | 完了Task数 / 全Task数 * 100 |

```
Task完了 → ActionItem進捗更新 → ActionMap進捗更新 → (KR手動更新) → Objective進捗更新
```

---

## 次のステップ（オプション）

1. **KR の current_value を ActionMap 進捗から自動計算**
2. **ダッシュボードに OKR サマリーを表示**
3. **期間でフィルタリング**
4. **OKR のアーカイブ機能**
