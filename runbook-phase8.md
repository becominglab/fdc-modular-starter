# Phase 8: アプローチ履歴管理 - Runbook

## 概要

リード（見込み客）へのアプローチ（接触）履歴を記録・分析する機能を実装します。

### 習得する概念

| 概念 | 説明 |
|------|------|
| **1対多リレーション** | 1つのProspectに複数のApproachが紐付く |
| **タイムライン** | 時系列でデータを表示するUI（SNSフィード形式） |
| **集計クエリ** | COUNT, GROUP BY などでデータを統計化 |
| **PDCA分析** | Plan→Do→Check→Actのサイクルで改善 |

### 前提条件

- [ ] Phase 6-7 完了（リード・クライアント管理が動作）
- [ ] Supabase に prospects テーブルが存在

---

## Step 1: Supabase テーブル作成

### 1.1 SQL実行

Supabase Dashboard → SQL Editor で以下を実行：

```sql
-- approaches テーブル（アプローチ履歴）
CREATE TABLE approaches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  prospect_id UUID NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('call', 'email', 'meeting', 'visit', 'other')),
  content TEXT NOT NULL,
  result TEXT,
  approached_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_approaches_prospect_id ON approaches(prospect_id);
CREATE INDEX idx_approaches_user_id ON approaches(user_id);
CREATE INDEX idx_approaches_approached_at ON approaches(approached_at DESC);
CREATE INDEX idx_approaches_type ON approaches(type);

-- RLS 有効化
ALTER TABLE approaches ENABLE ROW LEVEL SECURITY;

-- RLS ポリシー
CREATE POLICY "Users can view own approaches"
  ON approaches FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own approaches"
  ON approaches FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own approaches"
  ON approaches FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own approaches"
  ON approaches FOR DELETE
  USING (auth.uid() = user_id);
```

### 確認ポイント

- [ ] approaches テーブルが作成された
- [ ] RLS ポリシーが4つ設定された
- [ ] インデックスが4つ作成された

---

## Step 2: 型定義

### 2.1 Approach 型

**ファイル:** `lib/types/approach.ts`

```typescript
/**
 * lib/types/approach.ts
 *
 * アプローチ（接触履歴）の型定義
 */

// アプローチタイプ
export type ApproachType = 'call' | 'email' | 'meeting' | 'visit' | 'other';

// アプローチタイプのラベル
export const APPROACH_TYPE_LABELS: Record<ApproachType, string> = {
  call: '電話',
  email: 'メール',
  meeting: '会議',
  visit: '訪問',
  other: 'その他',
};

// アプローチ型
export interface Approach {
  id: string;
  prospect_id: string;
  user_id: string;
  type: ApproachType;
  content: string;
  result: string | null;
  approached_at: string;
  created_at: string;
  updated_at: string;
}

// アプローチ作成入力
export interface CreateApproachInput {
  prospect_id: string;
  type: ApproachType;
  content: string;
  result?: string;
  approached_at?: string;
}

// アプローチ更新入力
export interface UpdateApproachInput {
  type?: ApproachType;
  content?: string;
  result?: string;
  approached_at?: string;
}

// アプローチ統計
export interface ApproachStats {
  total: number;
  thisMonth: number;
  thisWeek: number;
  byType: Record<ApproachType, number>;
}
```

### 2.2 データベース型更新

**ファイル:** `lib/types/database.ts`

既存ファイルの `Database` interface 内に追加：

```typescript
// Tables の中に追加
approaches: {
  Row: {
    id: string;
    prospect_id: string;
    user_id: string;
    type: string;
    content: string;
    result: string | null;
    approached_at: string;
    created_at: string;
    updated_at: string;
  };
  Insert: {
    id?: string;
    prospect_id: string;
    user_id: string;
    type: string;
    content: string;
    result?: string | null;
    approached_at?: string;
    created_at?: string;
    updated_at?: string;
  };
  Update: {
    id?: string;
    prospect_id?: string;
    user_id?: string;
    type?: string;
    content?: string;
    result?: string | null;
    approached_at?: string;
    created_at?: string;
    updated_at?: string;
  };
  Relationships: [
    {
      foreignKeyName: 'approaches_prospect_id_fkey';
      columns: ['prospect_id'];
      referencedRelation: 'prospects';
      referencedColumns: ['id'];
    },
    {
      foreignKeyName: 'approaches_user_id_fkey';
      columns: ['user_id'];
      referencedRelation: 'users';
      referencedColumns: ['id'];
    }
  ];
};
```

ファイル末尾に追加：

```typescript
// Approach 型エイリアス
export type DbApproach = Database['public']['Tables']['approaches']['Row'];
export type DbApproachInsert = Database['public']['Tables']['approaches']['Insert'];
export type DbApproachUpdate = Database['public']['Tables']['approaches']['Update'];
```

### 確認ポイント

- [ ] `lib/types/approach.ts` が作成された
- [ ] `lib/types/database.ts` に approaches が追加された

---

## Step 3: バリデーション

**ファイル:** `lib/validations/approach.ts`

```typescript
/**
 * lib/validations/approach.ts
 *
 * アプローチのZodバリデーションスキーマ
 */

import { z } from 'zod';

// アプローチタイプ
const approachTypeSchema = z.enum(['call', 'email', 'meeting', 'visit', 'other'], {
  error: 'タイプを選択してください',
});

// アプローチ作成スキーマ
export const createApproachSchema = z.object({
  prospect_id: z.string().uuid({
    message: '有効なリードIDを指定してください',
  }),
  type: approachTypeSchema,
  content: z
    .string()
    .min(1, '内容を入力してください')
    .max(2000, '内容は2000文字以内で入力してください'),
  result: z
    .string()
    .max(1000, '結果は1000文字以内で入力してください')
    .optional(),
  approached_at: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?/, '日時形式が正しくありません')
    .optional(),
});

// アプローチ更新スキーマ
export const updateApproachSchema = z.object({
  type: approachTypeSchema.optional(),
  content: z
    .string()
    .min(1, '内容を入力してください')
    .max(2000, '内容は2000文字以内で入力してください')
    .optional(),
  result: z
    .string()
    .max(1000, '結果は1000文字以内で入力してください')
    .optional(),
  approached_at: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?/, '日時形式が正しくありません')
    .optional(),
});

export type CreateApproachInput = z.infer<typeof createApproachSchema>;
export type UpdateApproachInput = z.infer<typeof updateApproachSchema>;
```

### 確認ポイント

- [ ] `lib/validations/approach.ts` が作成された

---

## Step 4: API ルート

### 4.1 アプローチ一覧・作成 API

**ファイル:** `app/api/approaches/route.ts`

```typescript
/**
 * app/api/approaches/route.ts
 *
 * GET /api/approaches - アプローチ一覧取得
 * POST /api/approaches - アプローチ作成
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createApproachSchema } from '@/lib/validations/approach';

// GET: アプローチ一覧取得
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const prospectId = searchParams.get('prospect_id');

    let query = supabase
      .from('approaches')
      .select('*')
      .eq('user_id', user.id)
      .order('approached_at', { ascending: false });

    // prospect_id でフィルタ
    if (prospectId) {
      query = query.eq('prospect_id', prospectId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Approaches fetch error:', error);
      return NextResponse.json(
        { error: 'アプローチの取得に失敗しました' },
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

// POST: アプローチ作成
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const body = await request.json();
    const result = createApproachSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0]?.message || 'バリデーションエラー' },
        { status: 400 }
      );
    }

    const { prospect_id, type, content, result: approachResult, approached_at } = result.data;

    // prospect が存在し、自分のものか確認
    const { data: prospect, error: prospectError } = await supabase
      .from('prospects')
      .select('id')
      .eq('id', prospect_id)
      .eq('user_id', user.id)
      .single();

    if (prospectError || !prospect) {
      return NextResponse.json(
        { error: 'リードが見つかりません' },
        { status: 404 }
      );
    }

    const { data, error } = await supabase
      .from('approaches')
      .insert({
        prospect_id,
        user_id: user.id,
        type,
        content,
        result: approachResult,
        approached_at: approached_at || new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Approach create error:', error);
      return NextResponse.json(
        { error: 'アプローチの作成に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}
```

### 4.2 アプローチ個別 API

**ファイル:** `app/api/approaches/[approachId]/route.ts`

```typescript
/**
 * app/api/approaches/[approachId]/route.ts
 *
 * GET /api/approaches/:id - アプローチ詳細取得
 * PATCH /api/approaches/:id - アプローチ更新
 * DELETE /api/approaches/:id - アプローチ削除
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { updateApproachSchema } from '@/lib/validations/approach';

type Params = Promise<{ approachId: string }>;

// GET: アプローチ詳細取得
export async function GET(request: NextRequest, { params }: { params: Params }) {
  try {
    const { approachId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('approaches')
      .select('*')
      .eq('id', approachId)
      .eq('user_id', user.id)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: 'アプローチが見つかりません' },
        { status: 404 }
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

// PATCH: アプローチ更新
export async function PATCH(request: NextRequest, { params }: { params: Params }) {
  try {
    const { approachId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const body = await request.json();
    const result = updateApproachSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0]?.message || 'バリデーションエラー' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('approaches')
      .update({
        ...result.data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', approachId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: 'アプローチの更新に失敗しました' },
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

// DELETE: アプローチ削除
export async function DELETE(request: NextRequest, { params }: { params: Params }) {
  try {
    const { approachId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { error } = await supabase
      .from('approaches')
      .delete()
      .eq('id', approachId)
      .eq('user_id', user.id);

    if (error) {
      return NextResponse.json(
        { error: 'アプローチの削除に失敗しました' },
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

### 4.3 アプローチ統計 API

**ファイル:** `app/api/approaches/stats/route.ts`

```typescript
/**
 * app/api/approaches/stats/route.ts
 *
 * GET /api/approaches/stats - アプローチ統計取得
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ApproachStats, ApproachType } from '@/lib/types/approach';

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // 全アプローチ取得
    const { data: approaches, error } = await supabase
      .from('approaches')
      .select('type, approached_at')
      .eq('user_id', user.id);

    if (error) {
      console.error('Stats fetch error:', error);
      return NextResponse.json(
        { error: '統計の取得に失敗しました' },
        { status: 500 }
      );
    }

    // 日付計算
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    // 統計計算
    const stats: ApproachStats = {
      total: approaches?.length || 0,
      thisMonth: 0,
      thisWeek: 0,
      byType: {
        call: 0,
        email: 0,
        meeting: 0,
        visit: 0,
        other: 0,
      },
    };

    approaches?.forEach((approach) => {
      const approachedAt = new Date(approach.approached_at);

      // 今月
      if (approachedAt >= startOfMonth) {
        stats.thisMonth++;
      }

      // 今週
      if (approachedAt >= startOfWeek) {
        stats.thisWeek++;
      }

      // タイプ別
      const type = approach.type as ApproachType;
      if (stats.byType[type] !== undefined) {
        stats.byType[type]++;
      }
    });

    return NextResponse.json(stats);
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

- [ ] `app/api/approaches/route.ts` が作成された
- [ ] `app/api/approaches/[approachId]/route.ts` が作成された
- [ ] `app/api/approaches/stats/route.ts` が作成された

---

## Step 5: API ヘルパー

**ファイル:** `lib/api/approaches.ts`

```typescript
/**
 * lib/api/approaches.ts
 *
 * アプローチAPI ヘルパー関数
 */

import type { Approach, CreateApproachInput, UpdateApproachInput, ApproachStats } from '@/lib/types/approach';

const API_BASE = '/api/approaches';

// アプローチ一覧取得
export async function fetchApproaches(prospectId?: string): Promise<Approach[]> {
  const url = prospectId ? `${API_BASE}?prospect_id=${prospectId}` : API_BASE;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('アプローチの取得に失敗しました');
  }
  return response.json();
}

// アプローチ作成
export async function createApproach(input: CreateApproachInput): Promise<Approach> {
  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'アプローチの作成に失敗しました');
  }
  return response.json();
}

// アプローチ更新
export async function updateApproach(id: string, input: UpdateApproachInput): Promise<Approach> {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'アプローチの更新に失敗しました');
  }
  return response.json();
}

// アプローチ削除
export async function deleteApproach(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'アプローチの削除に失敗しました');
  }
}

// アプローチ統計取得
export async function fetchApproachStats(): Promise<ApproachStats> {
  const response = await fetch(`${API_BASE}/stats`);
  if (!response.ok) {
    throw new Error('統計の取得に失敗しました');
  }
  return response.json();
}
```

### 確認ポイント

- [ ] `lib/api/approaches.ts` が作成された

---

## Step 6: React Hook

**ファイル:** `lib/hooks/useApproaches.ts`

```typescript
/**
 * lib/hooks/useApproaches.ts
 *
 * アプローチ管理用カスタムフック
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Approach, CreateApproachInput, UpdateApproachInput, ApproachStats } from '@/lib/types/approach';
import {
  fetchApproaches,
  createApproach,
  updateApproach as updateApproachApi,
  deleteApproach as deleteApproachApi,
  fetchApproachStats,
} from '@/lib/api/approaches';

interface UseApproachesOptions {
  prospectId?: string;
}

export function useApproaches(options: UseApproachesOptions = {}) {
  const { prospectId } = options;
  const [approaches, setApproaches] = useState<Approach[]>([]);
  const [stats, setStats] = useState<ApproachStats>({
    total: 0,
    thisMonth: 0,
    thisWeek: 0,
    byType: { call: 0, email: 0, meeting: 0, visit: 0, other: 0 },
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // アプローチ一覧取得
  const loadApproaches = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchApproaches(prospectId);
      setApproaches(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('取得に失敗しました'));
    } finally {
      setIsLoading(false);
    }
  }, [prospectId]);

  // 統計取得
  const loadStats = useCallback(async () => {
    try {
      const data = await fetchApproachStats();
      setStats(data);
    } catch (err) {
      console.error('Stats load error:', err);
    }
  }, []);

  // 初回読み込み
  useEffect(() => {
    loadApproaches();
    loadStats();
  }, [loadApproaches, loadStats]);

  // アプローチ追加
  const addApproach = useCallback(async (input: CreateApproachInput) => {
    const newApproach = await createApproach(input);
    setApproaches((prev) => [newApproach, ...prev]);
    await loadStats();
    return newApproach;
  }, [loadStats]);

  // アプローチ更新
  const updateApproach = useCallback(async (id: string, input: UpdateApproachInput) => {
    const updated = await updateApproachApi(id, input);
    setApproaches((prev) =>
      prev.map((a) => (a.id === id ? updated : a))
    );
    return updated;
  }, []);

  // アプローチ削除
  const deleteApproach = useCallback(async (id: string) => {
    await deleteApproachApi(id);
    setApproaches((prev) => prev.filter((a) => a.id !== id));
    await loadStats();
  }, [loadStats]);

  return {
    approaches,
    stats,
    isLoading,
    error,
    addApproach,
    updateApproach,
    deleteApproach,
    refresh: loadApproaches,
  };
}
```

### 確認ポイント

- [ ] `lib/hooks/useApproaches.ts` が作成された

---

## Step 7: UI コンポーネント

### 7.1 タイムラインコンポーネント

**ファイル:** `components/approaches/ApproachTimeline.tsx`

```typescript
'use client';

import { Phone, Mail, Users, MapPin, MoreHorizontal, Trash2, Edit } from 'lucide-react';
import type { Approach, ApproachType } from '@/lib/types/approach';
import { APPROACH_TYPE_LABELS } from '@/lib/types/approach';

interface ApproachTimelineProps {
  approaches: Approach[];
  onEdit?: (approach: Approach) => void;
  onDelete?: (id: string) => void;
}

const TYPE_ICONS: Record<ApproachType, typeof Phone> = {
  call: Phone,
  email: Mail,
  meeting: Users,
  visit: MapPin,
  other: MoreHorizontal,
};

const TYPE_COLORS: Record<ApproachType, string> = {
  call: 'bg-blue-100 text-blue-600',
  email: 'bg-green-100 text-green-600',
  meeting: 'bg-purple-100 text-purple-600',
  visit: 'bg-orange-100 text-orange-600',
  other: 'bg-gray-100 text-gray-600',
};

export function ApproachTimeline({ approaches, onEdit, onDelete }: ApproachTimelineProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (approaches.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        アプローチ履歴がありません
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {approaches.map((approach, index) => {
        const Icon = TYPE_ICONS[approach.type];
        const colorClass = TYPE_COLORS[approach.type];

        return (
          <div key={approach.id} className="relative pl-8">
            {/* タイムライン線 */}
            {index < approaches.length - 1 && (
              <div className="absolute left-3 top-8 bottom-0 w-0.5 bg-gray-200" />
            )}

            {/* アイコン */}
            <div className={`absolute left-0 p-1.5 rounded-full ${colorClass}`}>
              <Icon size={14} />
            </div>

            {/* コンテンツ */}
            <div className="bg-white border rounded-lg p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${colorClass}`}>
                      {APPROACH_TYPE_LABELS[approach.type]}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatDate(approach.approached_at)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-900">{approach.content}</p>
                  {approach.result && (
                    <p className="text-xs text-gray-500 mt-2 p-2 bg-gray-50 rounded">
                      結果: {approach.result}
                    </p>
                  )}
                </div>

                {/* アクション */}
                {(onEdit || onDelete) && (
                  <div className="flex gap-1">
                    {onEdit && (
                      <button
                        onClick={() => onEdit(approach)}
                        className="p-1 text-gray-400 hover:text-blue-600 rounded"
                      >
                        <Edit size={14} />
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => onDelete(approach.id)}
                        className="p-1 text-gray-400 hover:text-red-600 rounded"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

### 7.2 アプローチ追加フォーム

**ファイル:** `components/approaches/AddApproachForm.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import type { ApproachType, CreateApproachInput } from '@/lib/types/approach';
import { APPROACH_TYPE_LABELS } from '@/lib/types/approach';

interface AddApproachFormProps {
  prospectId: string;
  isOpen: boolean;
  onAdd: (input: CreateApproachInput) => Promise<void>;
  onClose: () => void;
}

const APPROACH_TYPES: ApproachType[] = ['call', 'email', 'meeting', 'visit', 'other'];

export function AddApproachForm({ prospectId, isOpen, onAdd, onClose }: AddApproachFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    type: 'call' as ApproachType,
    content: '',
    result: '',
    approached_at: new Date().toISOString().slice(0, 16),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await onAdd({
        prospect_id: prospectId,
        type: formData.type,
        content: formData.content,
        result: formData.result || undefined,
        approached_at: formData.approached_at,
      });
      setFormData({
        type: 'call',
        content: '',
        result: '',
        approached_at: new Date().toISOString().slice(0, 16),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">アプローチを記録</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              タイプ <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {APPROACH_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFormData({ ...formData, type })}
                  className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                    formData.type === type
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                  }`}
                >
                  {APPROACH_TYPE_LABELS[type]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              日時 <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              value={formData.approached_at}
              onChange={(e) => setFormData({ ...formData, approached_at: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              内容 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              rows={3}
              placeholder="アプローチの内容を入力..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              結果（任意）
            </label>
            <textarea
              value={formData.result}
              onChange={(e) => setFormData({ ...formData, result: e.target.value })}
              rows={2}
              placeholder="反応や結果を記録..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
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
              disabled={isSubmitting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              <Plus size={18} />
              {isSubmitting ? '記録中...' : '記録する'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

### 7.3 統計カード

**ファイル:** `components/approaches/ApproachStatsCard.tsx`

```typescript
'use client';

import { TrendingUp, Calendar, CalendarDays, Phone, Mail, Users, MapPin } from 'lucide-react';
import type { ApproachStats, ApproachType } from '@/lib/types/approach';
import { APPROACH_TYPE_LABELS } from '@/lib/types/approach';

interface ApproachStatsCardProps {
  stats: ApproachStats;
}

const TYPE_ICONS: Record<ApproachType, typeof Phone> = {
  call: Phone,
  email: Mail,
  meeting: Users,
  visit: MapPin,
  other: TrendingUp,
};

export function ApproachStatsCard({ stats }: ApproachStatsCardProps) {
  return (
    <div className="bg-white rounded-lg border p-4">
      <h3 className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-2">
        <TrendingUp size={16} />
        アプローチ統計
      </h3>

      {/* 期間別統計 */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          <p className="text-xs text-gray-500">累計</p>
        </div>
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Calendar size={12} className="text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-blue-600">{stats.thisMonth}</p>
          <p className="text-xs text-gray-500">今月</p>
        </div>
        <div className="text-center p-3 bg-green-50 rounded-lg">
          <div className="flex items-center justify-center gap-1 mb-1">
            <CalendarDays size={12} className="text-green-600" />
          </div>
          <p className="text-2xl font-bold text-green-600">{stats.thisWeek}</p>
          <p className="text-xs text-gray-500">今週</p>
        </div>
      </div>

      {/* タイプ別統計 */}
      <div className="border-t pt-4">
        <p className="text-xs text-gray-500 mb-2">タイプ別</p>
        <div className="space-y-2">
          {(Object.keys(stats.byType) as ApproachType[]).map((type) => {
            const Icon = TYPE_ICONS[type];
            const count = stats.byType[type];
            const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0;

            return (
              <div key={type} className="flex items-center gap-2">
                <Icon size={14} className="text-gray-400" />
                <span className="text-xs text-gray-600 w-16">
                  {APPROACH_TYPE_LABELS[type]}
                </span>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 w-8 text-right">{count}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
```

### 7.4 エクスポート

**ファイル:** `components/approaches/index.ts`

```typescript
export { ApproachTimeline } from './ApproachTimeline';
export { AddApproachForm } from './AddApproachForm';
export { ApproachStatsCard } from './ApproachStatsCard';
```

### 確認ポイント

- [ ] `components/approaches/ApproachTimeline.tsx` が作成された
- [ ] `components/approaches/AddApproachForm.tsx` が作成された
- [ ] `components/approaches/ApproachStatsCard.tsx` が作成された
- [ ] `components/approaches/index.ts` が作成された

---

## Step 8: リード詳細ページ（アプローチ表示）

**ファイル:** `app/(app)/leads/[prospectId]/page.tsx`

```typescript
'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Building2, Mail, Phone, Plus, Calendar } from 'lucide-react';
import { useApproaches } from '@/lib/hooks/useApproaches';
import { ApproachTimeline, AddApproachForm, ApproachStatsCard } from '@/components/approaches';
import type { Prospect } from '@/lib/types/prospect';

type Params = Promise<{ prospectId: string }>;

export default function ProspectDetailPage({ params }: { params: Params }) {
  const { prospectId } = use(params);
  const router = useRouter();
  const [prospect, setProspect] = useState<Prospect | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);

  const {
    approaches,
    stats,
    isLoading: approachesLoading,
    addApproach,
    deleteApproach,
  } = useApproaches({ prospectId });

  // リード情報取得
  useEffect(() => {
    async function fetchProspect() {
      try {
        const response = await fetch(`/api/prospects/${prospectId}`);
        if (!response.ok) {
          throw new Error('リードの取得に失敗しました');
        }
        const data = await response.json();
        setProspect(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'エラーが発生しました');
      } finally {
        setIsLoading(false);
      }
    }

    fetchProspect();
  }, [prospectId]);

  const handleDelete = async (id: string) => {
    if (confirm('このアプローチを削除しますか？')) {
      await deleteApproach(id);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-gray-500">
        読み込み中...
      </div>
    );
  }

  if (error || !prospect) {
    return (
      <div className="p-8 text-center text-red-500">
        {error || 'リードが見つかりません'}
      </div>
    );
  }

  return (
    <div className="py-6">
      {/* ヘッダー */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">{prospect.name}</h1>
          <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
            <span className="flex items-center gap-1">
              <Building2 size={14} />
              {prospect.company}
            </span>
            {prospect.email && (
              <span className="flex items-center gap-1">
                <Mail size={14} />
                {prospect.email}
              </span>
            )}
            {prospect.phone && (
              <span className="flex items-center gap-1">
                <Phone size={14} />
                {prospect.phone}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* メイン: タイムライン */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Calendar size={20} />
              アプローチ履歴
            </h2>
            <button
              onClick={() => setIsAddFormOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
            >
              <Plus size={16} />
              記録する
            </button>
          </div>

          {approachesLoading ? (
            <div className="text-center py-8 text-gray-500">読み込み中...</div>
          ) : (
            <ApproachTimeline
              approaches={approaches}
              onDelete={handleDelete}
            />
          )}
        </div>

        {/* サイドバー: 統計 */}
        <div>
          <ApproachStatsCard stats={stats} />
        </div>
      </div>

      {/* アプローチ追加フォーム */}
      <AddApproachForm
        prospectId={prospectId}
        isOpen={isAddFormOpen}
        onAdd={addApproach}
        onClose={() => setIsAddFormOpen(false)}
      />
    </div>
  );
}
```

### 確認ポイント

- [ ] `app/(app)/leads/[prospectId]/page.tsx` が作成された

---

## Step 9: 型チェック & ビルド

```bash
npm run type-check && npm run build
```

### 確認ポイント

- [ ] `npm run type-check` が成功した
- [ ] `npm run build` が成功した

---

## 完了チェックリスト

### Supabase

- [ ] approaches テーブルが作成された
- [ ] RLS ポリシーが設定された

### 型定義

- [ ] `lib/types/approach.ts` が作成された
- [ ] `lib/types/database.ts` に approaches が追加された

### バリデーション

- [ ] `lib/validations/approach.ts` が作成された

### API

- [ ] `app/api/approaches/route.ts` が作成された
- [ ] `app/api/approaches/[approachId]/route.ts` が作成された
- [ ] `app/api/approaches/stats/route.ts` が作成された

### ヘルパー・Hook

- [ ] `lib/api/approaches.ts` が作成された
- [ ] `lib/hooks/useApproaches.ts` が作成された

### UI コンポーネント

- [ ] `components/approaches/ApproachTimeline.tsx` が作成された
- [ ] `components/approaches/AddApproachForm.tsx` が作成された
- [ ] `components/approaches/ApproachStatsCard.tsx` が作成された
- [ ] `components/approaches/index.ts` が作成された

### ページ

- [ ] `app/(app)/leads/[prospectId]/page.tsx` が作成された

### 動作確認

- [ ] `npm run type-check` が成功した
- [ ] `npm run build` が成功した
- [ ] リード詳細ページでアプローチが記録できる
- [ ] タイムライン形式で履歴が表示される
- [ ] 統計が正しく集計される

---

## 次のステップ

Phase 8 完了後の拡張案：

1. **PDCA分析ダッシュボード**: アプローチ結果の分析画面
2. **成功率計算**: タイプ別・期間別の成功率
3. **リマインダー機能**: フォローアップ通知
4. **CSV エクスポート**: 履歴データの出力

---

**作成日**: 2025-01-07
**対象**: fdc-modular-starter Phase 8
