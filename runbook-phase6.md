# Phase 6: リード（見込み客）管理機能ランブック

## 目標

CRM（顧客管理）の第一歩として、リード管理機能を実装する：
- Prospect テーブルの作成
- ファネルステータス（新規→アプローチ中→商談中→提案中→Won/Lost）
- カンバン表示とリスト表示の切替
- フィルター・検索機能

## 前提条件

- [ ] Phase 3-5 完了（Supabase接続済み、認証動作）
- [ ] ユーザーがログインできる状態
- [ ] `npm run dev` で http://localhost:3000 にアクセスできる

---

## 習得する新しい概念

### CRM（Customer Relationship Management）
顧客との関係を管理するシステム。リードの追跡、商談管理、顧客情報の一元管理を行う。

### ファネル（Funnel）
漏斗型のプロセス。多くのリードから徐々に顧客に絞り込む流れを表現。

```
新規 (100) → アプローチ中 (50) → 商談中 (20) → 提案中 (10) → 成約 (5)
```

### カンバン（Kanban）
Trello風のカード型UI。列がステータスを表し、カードをドラッグ&ドロップで移動。

### ステータス管理
データの状態遷移を追跡する仕組み。履歴管理や分析に活用。

---

## ファネルステータス設計

| ステータス | 英語 | 説明 |
|-----------|------|------|
| 新規 | new | 獲得直後、未対応 |
| アプローチ中 | approaching | 連絡・接触中 |
| 商談中 | negotiating | 具体的な話し合い中 |
| 提案中 | proposing | 見積・提案書提出済み |
| 成約 | won | 契約成立 |
| 失注 | lost | 失注・見送り |

---

## Step 1: データベーステーブルの作成

### 1.1 Supabase ダッシュボードで SQL を実行

1. https://supabase.com/dashboard にアクセス
2. プロジェクトを選択
3. 「SQL Editor」を開く
4. 以下の SQL を実行:

```sql
-- =====================================================
-- リードステータスの ENUM 型を作成
-- =====================================================
CREATE TYPE prospect_status AS ENUM (
  'new',
  'approaching',
  'negotiating',
  'proposing',
  'won',
  'lost'
);

-- =====================================================
-- prospects テーブルの作成
-- =====================================================
CREATE TABLE IF NOT EXISTS prospects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  company TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  status prospect_status NOT NULL DEFAULT 'new',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS prospects_user_id_idx ON prospects(user_id);
CREATE INDEX IF NOT EXISTS prospects_status_idx ON prospects(status);
CREATE INDEX IF NOT EXISTS prospects_created_at_idx ON prospects(created_at DESC);

-- =====================================================
-- Row Level Security (RLS) の設定
-- =====================================================
ALTER TABLE prospects ENABLE ROW LEVEL SECURITY;

-- ポリシー: 自分のリードのみ参照可能
CREATE POLICY "Users can view own prospects"
  ON prospects FOR SELECT
  USING (user_id = auth.uid());

-- ポリシー: 認証済みユーザーはリードを作成可能
CREATE POLICY "Users can create own prospects"
  ON prospects FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ポリシー: 自分のリードのみ更新可能
CREATE POLICY "Users can update own prospects"
  ON prospects FOR UPDATE
  USING (user_id = auth.uid());

-- ポリシー: 自分のリードのみ削除可能
CREATE POLICY "Users can delete own prospects"
  ON prospects FOR DELETE
  USING (user_id = auth.uid());

-- =====================================================
-- updated_at 自動更新トリガー
-- =====================================================
CREATE TRIGGER update_prospects_updated_at
  BEFORE UPDATE ON prospects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### 確認ポイント

- [ ] `prospects` テーブルが作成された
- [ ] `prospect_status` 型が作成された
- [ ] RLS ポリシーが有効化された
- [ ] インデックスが作成された

---

## Step 2: 型定義の追加

### 2.1 リード型の定義

**ファイルパス:** `lib/types/prospect.ts`

```typescript
/**
 * リードステータスの型
 */
export type ProspectStatus =
  | 'new'
  | 'approaching'
  | 'negotiating'
  | 'proposing'
  | 'won'
  | 'lost';

/**
 * リードの型
 */
export interface Prospect {
  id: string;
  user_id: string;
  name: string;
  company: string;
  email: string | null;
  phone: string | null;
  status: ProspectStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * リード作成の入力型
 */
export interface CreateProspectInput {
  name: string;
  company: string;
  email?: string;
  phone?: string;
  status?: ProspectStatus;
  notes?: string;
}

/**
 * リード更新の入力型
 */
export interface UpdateProspectInput {
  name?: string;
  company?: string;
  email?: string | null;
  phone?: string | null;
  status?: ProspectStatus;
  notes?: string | null;
}

/**
 * ステータスの表示情報
 */
export const PROSPECT_STATUS_CONFIG = {
  new: {
    label: '新規',
    color: 'bg-gray-100 text-gray-800',
    kanbanColor: 'bg-gray-50 border-gray-200',
  },
  approaching: {
    label: 'アプローチ中',
    color: 'bg-blue-100 text-blue-800',
    kanbanColor: 'bg-blue-50 border-blue-200',
  },
  negotiating: {
    label: '商談中',
    color: 'bg-yellow-100 text-yellow-800',
    kanbanColor: 'bg-yellow-50 border-yellow-200',
  },
  proposing: {
    label: '提案中',
    color: 'bg-purple-100 text-purple-800',
    kanbanColor: 'bg-purple-50 border-purple-200',
  },
  won: {
    label: '成約',
    color: 'bg-green-100 text-green-800',
    kanbanColor: 'bg-green-50 border-green-200',
  },
  lost: {
    label: '失注',
    color: 'bg-red-100 text-red-800',
    kanbanColor: 'bg-red-50 border-red-200',
  },
} as const;

/**
 * カンバン表示用のステータス順序（won/lostは除外）
 */
export const KANBAN_STATUSES: ProspectStatus[] = [
  'new',
  'approaching',
  'negotiating',
  'proposing',
];

/**
 * 全ステータス
 */
export const ALL_STATUSES: ProspectStatus[] = [
  'new',
  'approaching',
  'negotiating',
  'proposing',
  'won',
  'lost',
];
```

### 2.2 データベース型の更新

**ファイルパス:** `lib/types/database.ts` に追加

```typescript
// 既存の型定義の後に追加

export type ProspectStatus =
  | 'new'
  | 'approaching'
  | 'negotiating'
  | 'proposing'
  | 'won'
  | 'lost';

export interface DbProspect {
  id: string;
  user_id: string;
  name: string;
  company: string;
  email: string | null;
  phone: string | null;
  status: ProspectStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type DbProspectInsert = Omit<DbProspect, 'id' | 'created_at' | 'updated_at'>;
export type DbProspectUpdate = Partial<Omit<DbProspect, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;
```

### 確認ポイント

- [ ] `lib/types/prospect.ts` が作成された
- [ ] `lib/types/database.ts` が更新された
- [ ] `PROSPECT_STATUS_CONFIG` が定義されている

---

## Step 3: Zod バリデーションスキーマの作成

**ファイルパス:** `lib/validations/prospect.ts`

```typescript
import { z } from 'zod';

/**
 * ステータスのスキーマ
 */
const prospectStatusSchema = z.enum([
  'new',
  'approaching',
  'negotiating',
  'proposing',
  'won',
  'lost',
], {
  error: '有効なステータスを選択してください',
});

/**
 * リード作成のスキーマ
 */
export const createProspectSchema = z.object({
  name: z
    .string()
    .min(1, '名前は必須です')
    .max(100, '名前は100文字以内です'),
  company: z
    .string()
    .min(1, '会社名は必須です')
    .max(100, '会社名は100文字以内です'),
  email: z
    .string()
    .email('有効なメールアドレスを入力してください')
    .optional()
    .or(z.literal('')),
  phone: z
    .string()
    .max(20, '電話番号は20文字以内です')
    .optional()
    .or(z.literal('')),
  status: prospectStatusSchema.optional().default('new'),
  notes: z
    .string()
    .max(1000, 'メモは1000文字以内です')
    .optional()
    .or(z.literal('')),
});

/**
 * リード更新のスキーマ
 */
export const updateProspectSchema = z.object({
  name: z
    .string()
    .min(1, '名前は必須です')
    .max(100, '名前は100文字以内です')
    .optional(),
  company: z
    .string()
    .min(1, '会社名は必須です')
    .max(100, '会社名は100文字以内です')
    .optional(),
  email: z
    .string()
    .email('有効なメールアドレスを入力してください')
    .nullable()
    .optional(),
  phone: z
    .string()
    .max(20, '電話番号は20文字以内です')
    .nullable()
    .optional(),
  status: prospectStatusSchema.optional(),
  notes: z
    .string()
    .max(1000, 'メモは1000文字以内です')
    .nullable()
    .optional(),
});

/**
 * ステータス更新のスキーマ
 */
export const updateStatusSchema = z.object({
  status: prospectStatusSchema,
});

// 型のエクスポート
export type CreateProspectInput = z.infer<typeof createProspectSchema>;
export type UpdateProspectInput = z.infer<typeof updateProspectSchema>;
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
```

### 確認ポイント

- [ ] `lib/validations/prospect.ts` が作成された

---

## Step 4: リード API の作成

### 4.1 リード一覧・作成 API

**ファイルパス:** `app/api/prospects/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createProspectSchema } from '@/lib/validations/prospect';

/**
 * GET /api/prospects
 * リード一覧を取得
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    let query = supabase
      .from('prospects')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    // ステータスフィルター
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    // 検索フィルター
    if (search) {
      query = query.or(`name.ilike.%${search}%,company.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching prospects:', error);
      return NextResponse.json(
        { error: 'リードの取得に失敗しました' },
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
 * POST /api/prospects
 * 新規リードを作成
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
    const validation = createProspectSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, company, email, phone, status, notes } = validation.data;

    const { data: prospect, error } = await supabase
      .from('prospects')
      .insert({
        user_id: user.id,
        name,
        company,
        email: email || null,
        phone: phone || null,
        status: status || 'new',
        notes: notes || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating prospect:', error);
      return NextResponse.json(
        { error: 'リードの作成に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json(prospect, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}
```

### 4.2 個別リード API

**ファイルパス:** `app/api/prospects/[prospectId]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { updateProspectSchema } from '@/lib/validations/prospect';

interface RouteParams {
  params: Promise<{ prospectId: string }>;
}

/**
 * GET /api/prospects/[prospectId]
 * リード詳細を取得
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { prospectId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    const { data: prospect, error } = await supabase
      .from('prospects')
      .select('*')
      .eq('id', prospectId)
      .eq('user_id', user.id)
      .single();

    if (error || !prospect) {
      return NextResponse.json(
        { error: 'リードが見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json(prospect);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/prospects/[prospectId]
 * リードを更新
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { prospectId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = updateProspectSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    // 空文字を null に変換
    const updateData = Object.fromEntries(
      Object.entries(validation.data).map(([key, value]) => [
        key,
        value === '' ? null : value,
      ])
    );

    const { data: prospect, error } = await supabase
      .from('prospects')
      .update(updateData)
      .eq('id', prospectId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating prospect:', error);
      return NextResponse.json(
        { error: 'リードの更新に失敗しました' },
        { status: 500 }
      );
    }

    if (!prospect) {
      return NextResponse.json(
        { error: 'リードが見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json(prospect);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/prospects/[prospectId]
 * リードを削除
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { prospectId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    const { error } = await supabase
      .from('prospects')
      .delete()
      .eq('id', prospectId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting prospect:', error);
      return NextResponse.json(
        { error: 'リードの削除に失敗しました' },
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

- [ ] `app/api/prospects/route.ts` が作成された
- [ ] `app/api/prospects/[prospectId]/route.ts` が作成された

---

## Step 5: useProspects フックの作成

**ファイルパス:** `lib/hooks/useProspects.ts`

```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Prospect, ProspectStatus, CreateProspectInput, UpdateProspectInput } from '@/lib/types/prospect';

interface UseProspectsOptions {
  status?: ProspectStatus | 'all';
  search?: string;
}

export function useProspects(options: UseProspectsOptions = {}) {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProspects = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (options.status && options.status !== 'all') {
        params.set('status', options.status);
      }
      if (options.search) {
        params.set('search', options.search);
      }

      const url = `/api/prospects${params.toString() ? `?${params}` : ''}`;
      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'リードの取得に失敗しました');
      }

      setProspects(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  }, [options.status, options.search]);

  useEffect(() => {
    fetchProspects();
  }, [fetchProspects]);

  const createProspect = async (input: CreateProspectInput) => {
    try {
      const response = await fetch('/api/prospects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'リードの作成に失敗しました');
      }

      setProspects(prev => [data, ...prev]);
      return data;
    } catch (err) {
      throw err instanceof Error ? err : new Error('エラーが発生しました');
    }
  };

  const updateProspect = async (id: string, input: UpdateProspectInput) => {
    try {
      const response = await fetch(`/api/prospects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'リードの更新に失敗しました');
      }

      setProspects(prev => prev.map(p => p.id === id ? data : p));
      return data;
    } catch (err) {
      throw err instanceof Error ? err : new Error('エラーが発生しました');
    }
  };

  const updateStatus = async (id: string, status: ProspectStatus) => {
    return updateProspect(id, { status });
  };

  const deleteProspect = async (id: string) => {
    try {
      const response = await fetch(`/api/prospects/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'リードの削除に失敗しました');
      }

      setProspects(prev => prev.filter(p => p.id !== id));
      return data;
    } catch (err) {
      throw err instanceof Error ? err : new Error('エラーが発生しました');
    }
  };

  // ステータス別にグループ化（カンバン用）
  const prospectsByStatus = prospects.reduce((acc, prospect) => {
    if (!acc[prospect.status]) {
      acc[prospect.status] = [];
    }
    acc[prospect.status].push(prospect);
    return acc;
  }, {} as Record<ProspectStatus, Prospect[]>);

  return {
    prospects,
    prospectsByStatus,
    loading,
    error,
    refetch: fetchProspects,
    createProspect,
    updateProspect,
    updateStatus,
    deleteProspect,
  };
}
```

### 確認ポイント

- [ ] `lib/hooks/useProspects.ts` が作成された

---

## Step 6: UI コンポーネントの作成

### 6.1 カンバンカード

**ファイルパス:** `app/(app)/leads/_components/KanbanCard.tsx`

```typescript
'use client';

import type { Prospect } from '@/lib/types/prospect';

interface KanbanCardProps {
  prospect: Prospect;
  onEdit: (prospect: Prospect) => void;
  onDelete: (id: string) => void;
}

export function KanbanCard({ prospect, onEdit, onDelete }: KanbanCardProps) {
  return (
    <div
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => onEdit(prospect)}
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-medium text-gray-900 truncate">{prospect.name}</h3>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(prospect.id);
          }}
          className="text-gray-400 hover:text-red-500 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <p className="text-sm text-gray-600 truncate mb-2">{prospect.company}</p>

      {prospect.email && (
        <p className="text-xs text-gray-500 truncate">{prospect.email}</p>
      )}

      <div className="mt-3 pt-3 border-t border-gray-100">
        <p className="text-xs text-gray-400">
          {new Date(prospect.created_at).toLocaleDateString('ja-JP')}
        </p>
      </div>
    </div>
  );
}
```

### 6.2 カンバンビュー

**ファイルパス:** `app/(app)/leads/_components/KanbanView.tsx`

```typescript
'use client';

import type { Prospect, ProspectStatus } from '@/lib/types/prospect';
import { KANBAN_STATUSES, PROSPECT_STATUS_CONFIG } from '@/lib/types/prospect';
import { KanbanCard } from './KanbanCard';

interface KanbanViewProps {
  prospectsByStatus: Record<ProspectStatus, Prospect[]>;
  onStatusChange: (id: string, status: ProspectStatus) => void;
  onEdit: (prospect: Prospect) => void;
  onDelete: (id: string) => void;
}

export function KanbanView({
  prospectsByStatus,
  onStatusChange,
  onEdit,
  onDelete,
}: KanbanViewProps) {
  const handleDragStart = (e: React.DragEvent, prospectId: string) => {
    e.dataTransfer.setData('prospectId', prospectId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, status: ProspectStatus) => {
    e.preventDefault();
    const prospectId = e.dataTransfer.getData('prospectId');
    if (prospectId) {
      onStatusChange(prospectId, status);
    }
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {KANBAN_STATUSES.map((status) => {
        const config = PROSPECT_STATUS_CONFIG[status];
        const prospects = prospectsByStatus[status] || [];

        return (
          <div
            key={status}
            className={`flex-shrink-0 w-72 rounded-lg border ${config.kanbanColor}`}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, status)}
          >
            <div className="p-3 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-700">{config.label}</h3>
                <span className="text-sm text-gray-500 bg-white px-2 py-0.5 rounded-full">
                  {prospects.length}
                </span>
              </div>
            </div>

            <div className="p-2 space-y-2 min-h-[200px]">
              {prospects.map((prospect) => (
                <div
                  key={prospect.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, prospect.id)}
                >
                  <KanbanCard
                    prospect={prospect}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

### 6.3 リストビュー

**ファイルパス:** `app/(app)/leads/_components/ListView.tsx`

```typescript
'use client';

import type { Prospect, ProspectStatus } from '@/lib/types/prospect';
import { ALL_STATUSES, PROSPECT_STATUS_CONFIG } from '@/lib/types/prospect';

interface ListViewProps {
  prospects: Prospect[];
  onStatusChange: (id: string, status: ProspectStatus) => void;
  onEdit: (prospect: Prospect) => void;
  onDelete: (id: string) => void;
}

export function ListView({
  prospects,
  onStatusChange,
  onEdit,
  onDelete,
}: ListViewProps) {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              名前
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              会社
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              ステータス
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              作成日
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              操作
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {prospects.map((prospect) => (
            <tr key={prospect.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <button
                  onClick={() => onEdit(prospect)}
                  className="text-sm font-medium text-gray-900 hover:text-blue-600"
                >
                  {prospect.name}
                </button>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {prospect.company}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <select
                  value={prospect.status}
                  onChange={(e) => onStatusChange(prospect.id, e.target.value as ProspectStatus)}
                  className={`text-xs px-2 py-1 rounded-full border-0 ${PROSPECT_STATUS_CONFIG[prospect.status].color}`}
                >
                  {ALL_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {PROSPECT_STATUS_CONFIG[status].label}
                    </option>
                  ))}
                </select>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {new Date(prospect.created_at).toLocaleDateString('ja-JP')}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                <button
                  onClick={() => onDelete(prospect.id)}
                  className="text-red-600 hover:text-red-900"
                >
                  削除
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {prospects.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          リードがありません
        </div>
      )}
    </div>
  );
}
```

### 6.4 リード追加フォーム

**ファイルパス:** `app/(app)/leads/_components/AddProspectForm.tsx`

```typescript
'use client';

import { useState } from 'react';
import type { CreateProspectInput, ProspectStatus } from '@/lib/types/prospect';
import { ALL_STATUSES, PROSPECT_STATUS_CONFIG } from '@/lib/types/prospect';

interface AddProspectFormProps {
  onSubmit: (input: CreateProspectInput) => Promise<void>;
  onCancel: () => void;
}

export function AddProspectForm({ onSubmit, onCancel }: AddProspectFormProps) {
  const [formData, setFormData] = useState<CreateProspectInput>({
    name: '',
    company: '',
    email: '',
    phone: '',
    status: 'new',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await onSubmit(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          名前 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          会社名 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.company}
          onChange={(e) => setFormData({ ...formData, company: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          メールアドレス
        </label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          電話番号
        </label>
        <input
          type="tel"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          ステータス
        </label>
        <select
          value={formData.status}
          onChange={(e) => setFormData({ ...formData, status: e.target.value as ProspectStatus })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {ALL_STATUSES.map((status) => (
            <option key={status} value={status}>
              {PROSPECT_STATUS_CONFIG[status].label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          メモ
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? '作成中...' : '作成'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors"
        >
          キャンセル
        </button>
      </div>
    </form>
  );
}
```

### 6.5 リード編集モーダル

**ファイルパス:** `app/(app)/leads/_components/EditProspectModal.tsx`

```typescript
'use client';

import { useState } from 'react';
import type { Prospect, UpdateProspectInput, ProspectStatus } from '@/lib/types/prospect';
import { ALL_STATUSES, PROSPECT_STATUS_CONFIG } from '@/lib/types/prospect';

interface EditProspectModalProps {
  prospect: Prospect;
  onSubmit: (id: string, input: UpdateProspectInput) => Promise<void>;
  onClose: () => void;
}

export function EditProspectModal({ prospect, onSubmit, onClose }: EditProspectModalProps) {
  const [formData, setFormData] = useState<UpdateProspectInput>({
    name: prospect.name,
    company: prospect.company,
    email: prospect.email,
    phone: prospect.phone,
    status: prospect.status,
    notes: prospect.notes,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await onSubmit(prospect.id, formData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-semibold">リード編集</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              名前 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              会社名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.company || ''}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              メールアドレス
            </label>
            <input
              type="email"
              value={formData.email || ''}
              onChange={(e) => setFormData({ ...formData, email: e.target.value || null })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              電話番号
            </label>
            <input
              type="tel"
              value={formData.phone || ''}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value || null })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ステータス
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as ProspectStatus })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {ALL_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {PROSPECT_STATUS_CONFIG[status].label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              メモ
            </label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value || null })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? '更新中...' : '更新'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors"
            >
              キャンセル
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

### 確認ポイント

- [ ] `app/(app)/leads/_components/KanbanCard.tsx` が作成された
- [ ] `app/(app)/leads/_components/KanbanView.tsx` が作成された
- [ ] `app/(app)/leads/_components/ListView.tsx` が作成された
- [ ] `app/(app)/leads/_components/AddProspectForm.tsx` が作成された
- [ ] `app/(app)/leads/_components/EditProspectModal.tsx` が作成された

---

## Step 7: リード一覧ページの作成

**ファイルパス:** `app/(app)/leads/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useProspects } from '@/lib/hooks/useProspects';
import type { Prospect, ProspectStatus, CreateProspectInput, UpdateProspectInput } from '@/lib/types/prospect';
import { ALL_STATUSES, PROSPECT_STATUS_CONFIG } from '@/lib/types/prospect';
import { KanbanView } from './_components/KanbanView';
import { ListView } from './_components/ListView';
import { AddProspectForm } from './_components/AddProspectForm';
import { EditProspectModal } from './_components/EditProspectModal';

type ViewMode = 'kanban' | 'list';

export default function LeadsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [statusFilter, setStatusFilter] = useState<ProspectStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProspect, setEditingProspect] = useState<Prospect | null>(null);

  const {
    prospects,
    prospectsByStatus,
    loading,
    error,
    createProspect,
    updateProspect,
    updateStatus,
    deleteProspect,
  } = useProspects({
    status: statusFilter,
    search: searchQuery,
  });

  const handleCreate = async (input: CreateProspectInput) => {
    await createProspect(input);
    setShowAddForm(false);
  };

  const handleUpdate = async (id: string, input: UpdateProspectInput) => {
    await updateProspect(id, input);
    setEditingProspect(null);
  };

  const handleStatusChange = async (id: string, status: ProspectStatus) => {
    await updateStatus(id, status);
  };

  const handleDelete = async (id: string) => {
    if (confirm('このリードを削除しますか？')) {
      await deleteProspect(id);
    }
  };

  return (
    <div className="p-6">
      {/* ヘッダー */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">リード管理</h1>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          新規リード
        </button>
      </div>

      {/* フィルター・検索バー */}
      <div className="flex flex-wrap gap-4 mb-6">
        {/* ビュー切替 */}
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode('kanban')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'kanban'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            カンバン
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'list'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            リスト
          </button>
        </div>

        {/* ステータスフィルター */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ProspectStatus | 'all')}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">すべてのステータス</option>
          {ALL_STATUSES.map((status) => (
            <option key={status} value={status}>
              {PROSPECT_STATUS_CONFIG[status].label}
            </option>
          ))}
        </select>

        {/* 検索 */}
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="名前・会社名で検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* ローディング */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {/* ビュー */}
          {viewMode === 'kanban' ? (
            <KanbanView
              prospectsByStatus={prospectsByStatus}
              onStatusChange={handleStatusChange}
              onEdit={setEditingProspect}
              onDelete={handleDelete}
            />
          ) : (
            <ListView
              prospects={prospects}
              onStatusChange={handleStatusChange}
              onEdit={setEditingProspect}
              onDelete={handleDelete}
            />
          )}
        </>
      )}

      {/* 新規作成モーダル */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-lg font-semibold">新規リード</h2>
              <button
                onClick={() => setShowAddForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4">
              <AddProspectForm
                onSubmit={handleCreate}
                onCancel={() => setShowAddForm(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* 編集モーダル */}
      {editingProspect && (
        <EditProspectModal
          prospect={editingProspect}
          onSubmit={handleUpdate}
          onClose={() => setEditingProspect(null)}
        />
      )}
    </div>
  );
}
```

### 確認ポイント

- [ ] `app/(app)/leads/page.tsx` が作成された

---

## Step 8: ナビゲーションの更新

**ファイルパス:** `app/(app)/layout.tsx` に追加

リード管理へのリンクを追加:

```typescript
// ナビゲーションリンクの配列に追加
const navLinks = [
  { href: '/dashboard', label: 'ダッシュボード' },
  { href: '/tasks', label: 'タスク' },
  { href: '/leads', label: 'リード' },  // 追加
  // ...
];
```

### 確認ポイント

- [ ] ナビゲーションに「リード」リンクが追加された

---

## Step 9: 型チェックとビルド確認

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

## Step 10: 動作確認

### 10.1 基本機能テスト

1. リード作成
   - [ ] 新規リードが作成できる
   - [ ] 必須項目（名前、会社名）がバリデーションされる

2. リード一覧
   - [ ] カンバンビューが表示される
   - [ ] リストビューに切り替えられる
   - [ ] ステータスフィルターが動作する
   - [ ] 検索が動作する

3. ステータス変更
   - [ ] カンバンでドラッグ&ドロップできる
   - [ ] リストでセレクトボックスから変更できる

4. リード編集・削除
   - [ ] 編集モーダルが開く
   - [ ] 更新が反映される
   - [ ] 削除確認後に削除される

### 10.2 RLS確認

- [ ] 自分のリードのみ表示される
- [ ] 他ユーザーのリードにはアクセスできない

---

## 完了チェックリスト

### データベース設定

- [ ] `prospects` テーブルが作成された
- [ ] `prospect_status` ENUM 型が作成された
- [ ] RLS ポリシーが設定された（4件）
- [ ] インデックスが作成された

### ファイル作成

- [ ] `lib/types/prospect.ts` - リード型定義
- [ ] `lib/validations/prospect.ts` - Zod バリデーション
- [ ] `app/api/prospects/route.ts` - 一覧・作成 API
- [ ] `app/api/prospects/[prospectId]/route.ts` - 詳細・更新・削除 API
- [ ] `lib/hooks/useProspects.ts` - リードフック
- [ ] `app/(app)/leads/page.tsx` - リード一覧ページ
- [ ] `app/(app)/leads/_components/KanbanCard.tsx` - カンバンカード
- [ ] `app/(app)/leads/_components/KanbanView.tsx` - カンバンビュー
- [ ] `app/(app)/leads/_components/ListView.tsx` - リストビュー
- [ ] `app/(app)/leads/_components/AddProspectForm.tsx` - 追加フォーム
- [ ] `app/(app)/leads/_components/EditProspectModal.tsx` - 編集モーダル

### ファイル修正

- [ ] `lib/types/database.ts` - リード型追加
- [ ] `app/(app)/layout.tsx` - ナビゲーション更新

### 機能確認

- [ ] リード作成ができる
- [ ] カンバンビューが動作する
- [ ] リストビューが動作する
- [ ] ステータス変更（D&D/セレクト）ができる
- [ ] フィルター・検索が動作する
- [ ] RLS が正しく機能する

### 品質確認

- [ ] `npm run type-check` がエラーなし
- [ ] `npm run build` がエラーなし

---

## 次のステップ

Phase 6 が完了したら、以下の拡張が可能：
- リード詳細ページ
- アクティビティログ（接触履歴）
- CSV インポート/エクスポート
- ダッシュボードにファネル分析グラフ
- メール送信機能

---

## トラブルシューティング

### ドラッグ&ドロップが動作しない

1. `draggable` 属性が設定されているか確認
2. `onDragStart`, `onDragOver`, `onDrop` ハンドラーを確認
3. `e.preventDefault()` が `onDragOver` で呼ばれているか確認

### RLS でアクセス拒否される

```sql
-- ポリシーの確認
SELECT * FROM pg_policies WHERE tablename = 'prospects';

-- user_id の確認
SELECT auth.uid();
```

### ENUM 型が作成できない

```sql
-- 既存の型を確認
SELECT typname FROM pg_type WHERE typname = 'prospect_status';

-- 削除して再作成
DROP TYPE IF EXISTS prospect_status CASCADE;
CREATE TYPE prospect_status AS ENUM ('new', 'approaching', 'negotiating', 'proposing', 'won', 'lost');
```

### 検索が動作しない

1. `ilike` が正しく使われているか確認
2. インデックスが作成されているか確認
3. 検索クエリが空文字でないか確認
