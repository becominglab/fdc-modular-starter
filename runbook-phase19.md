# Phase 19: MVV（Mission/Vision/Value）統合ビュー

## 目標

MVV（Mission/Vision/Value）を管理する統合ビューを実装：
- Mission、Vision、Value の編集
- Brand + Lean Canvas + MVV の統合表示
- 折り畳み式レイアウト

---

## MVVとは

| 要素 | 意味 | 例 |
|------|------|-----|
| Mission | 存在意義・使命 | 「テクノロジーで人々を豊かに」 |
| Vision | 将来像 | 「すべての人がクリエイターに」 |
| Value | 価値観・行動指針 | 「失敗を恐れずチャレンジ」 |

```
┌─────────────────────────────────────────────────────────────────────┐
│  MVV 統合ビュー                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ▼ ブランド概要                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  ロゴ・タグライン・ストーリー                                  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ▼ Mission（使命）                                                  │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  テクノロジーで人々の生活を豊かにする                          │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ▼ Vision（将来像）                                                 │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  すべての人がクリエイターになれる世界                          │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ▼ Values（価値観）                                                 │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  • 失敗を恐れずチャレンジ                                      │   │
│  │  • ユーザーファースト                                          │   │
│  │  • 透明性のあるコミュニケーション                              │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ▶ Lean Canvas サマリー（折りたたみ）                               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 習得する新しい概念

| 概念 | 説明 |
|------|------|
| MVV | Mission/Vision/Value。企業理念の3要素 |
| 統合ビュー | 複数の情報を1画面にまとめて表示 |
| アコーディオン | クリックで開閉できる折り畳みUI |
| JSON配列 | 複数の値を1カラムに保存（values） |

---

## 前提条件

- [ ] Phase 15 完了（Brand 動作）
- [ ] Phase 16 完了（Lean Canvas 動作）
- [ ] 開発サーバーが起動している

---

## Step 1: DB マイグレーション

### 1.1 MVV テーブル作成

**ファイル:** `supabase/migrations/20260113_phase19_mvv.sql`

```sql
-- ==============================================
-- Phase 19: MVV（Mission/Vision/Value）
-- ==============================================

-- MVV テーブル
CREATE TABLE IF NOT EXISTS mvv (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mission TEXT,
  vision TEXT,
  values JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 1ブランドに1つのMVV
  CONSTRAINT unique_brand_mvv UNIQUE (brand_id)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_mvv_brand_id ON mvv(brand_id);
CREATE INDEX IF NOT EXISTS idx_mvv_user_id ON mvv(user_id);

-- RLS 有効化
ALTER TABLE mvv ENABLE ROW LEVEL SECURITY;

-- RLS ポリシー: 自分のMVVのみ
CREATE POLICY "Users can manage own mvv"
  ON mvv
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- updated_at 自動更新トリガー
CREATE OR REPLACE FUNCTION update_mvv_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER mvv_updated_at
  BEFORE UPDATE ON mvv
  FOR EACH ROW
  EXECUTE FUNCTION update_mvv_updated_at();
```

### 1.2 マイグレーション実行

```bash
supabase db push
```

### 確認ポイント

- [ ] `mvv` テーブルが作成された
- [ ] RLS ポリシーが設定された
- [ ] `unique_brand_mvv` 制約が設定された

---

## Step 2: 型定義の作成

### 2.1 MVV 型定義

**ファイル:** `lib/types/mvv.ts`

```typescript
/**
 * lib/types/mvv.ts
 *
 * MVV（Mission/Vision/Value）の型定義
 */

// MVV エンティティ
export interface MVV {
  id: string;
  brand_id: string;
  user_id: string;
  mission: string | null;
  vision: string | null;
  values: string[];
  created_at: string;
  updated_at: string;
}

// MVV 作成用
export interface MVVCreate {
  brand_id: string;
  mission?: string | null;
  vision?: string | null;
  values?: string[];
}

// MVV 更新用
export interface MVVUpdate {
  mission?: string | null;
  vision?: string | null;
  values?: string[];
}

// MVV セクション情報
export const MVV_SECTION_INFO = {
  mission: {
    label: 'Mission',
    labelJa: '使命',
    description: '会社・サービスの存在意義。なぜ存在するのか？',
    placeholder: '例: テクノロジーで人々の生活を豊かにする',
    examples: [
      'すべての人に学びの機会を届ける',
      '持続可能な社会を次世代に残す',
      'ビジネスの成長を加速させる',
    ],
  },
  vision: {
    label: 'Vision',
    labelJa: '将来像',
    description: '実現したい未来の姿。どこを目指すのか？',
    placeholder: '例: すべての人がクリエイターになれる世界',
    examples: [
      '誰もが自分らしく働ける社会',
      'テクノロジーと人間が共存する未来',
      '国境を超えてつながる世界',
    ],
  },
  values: {
    label: 'Values',
    labelJa: '価値観',
    description: '大切にする行動指針。どう行動するか？',
    placeholder: '例: ユーザーファースト',
    examples: [
      '失敗を恐れずチャレンジ',
      '透明性のあるコミュニケーション',
      'スピードを重視する',
      '多様性を尊重する',
    ],
  },
};
```

### 2.2 Supabase 型の更新

```bash
supabase gen types typescript --local > lib/supabase/database.types.ts
```

生成後、`lib/types/database.ts` にコピー：

```typescript
// lib/types/database.ts の末尾に追加

// MVV convenience types
export type MVVRow = Database['public']['Tables']['mvv']['Row'];
export type MVVInsert = Database['public']['Tables']['mvv']['Insert'];
export type MVVUpdate = Database['public']['Tables']['mvv']['Update'];
```

### 確認ポイント

- [ ] `lib/types/mvv.ts` が作成された
- [ ] MVV, MVVCreate, MVVUpdate 型が定義されている
- [ ] MVV_SECTION_INFO が定義されている

---

## Step 3: API Routes 作成

### 3.1 MVV 取得・作成 API

**ファイル:** `app/api/mvv/route.ts`

```typescript
/**
 * app/api/mvv/route.ts
 *
 * GET /api/mvv?brandId=xxx - MVV 取得
 * POST /api/mvv - MVV 作成
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const createMVVSchema = z.object({
  brand_id: z.string().uuid('有効なブランドIDを指定してください'),
  mission: z.string().nullish(),
  vision: z.string().nullish(),
  values: z.array(z.string()).optional().default([]),
});

// GET: MVV 取得
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get('brandId');

    if (!brandId) {
      return NextResponse.json({ error: 'brandId is required' }, { status: 400 });
    }

    // ブランド所有者確認
    const { data: brand } = await supabase
      .from('brands')
      .select('id')
      .eq('id', brandId)
      .eq('user_id', user.id)
      .single();

    if (!brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    // MVV 取得
    const { data: mvv, error } = await supabase
      .from('mvv')
      .select('*')
      .eq('brand_id', brandId)
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('MVV fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch MVV' }, { status: 500 });
    }

    return NextResponse.json(mvv || null);
  } catch (error) {
    console.error('MVV GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: MVV 作成
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const result = createMVVSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', issues: result.error.issues },
        { status: 400 }
      );
    }

    // ブランド所有者確認
    const { data: brand } = await supabase
      .from('brands')
      .select('id')
      .eq('id', result.data.brand_id)
      .eq('user_id', user.id)
      .single();

    if (!brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    // 既存MVV確認
    const { data: existingMVV } = await supabase
      .from('mvv')
      .select('id')
      .eq('brand_id', result.data.brand_id)
      .single();

    if (existingMVV) {
      return NextResponse.json(
        { error: 'MVV already exists for this brand' },
        { status: 409 }
      );
    }

    // MVV 作成
    const { data: mvv, error: createError } = await supabase
      .from('mvv')
      .insert({
        brand_id: result.data.brand_id,
        user_id: user.id,
        mission: result.data.mission || null,
        vision: result.data.vision || null,
        values: result.data.values || [],
      })
      .select()
      .single();

    if (createError) {
      console.error('MVV create error:', createError);
      return NextResponse.json({ error: 'Failed to create MVV' }, { status: 500 });
    }

    return NextResponse.json(mvv, { status: 201 });
  } catch (error) {
    console.error('MVV POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### 3.2 MVV 更新・削除 API

**ファイル:** `app/api/mvv/[mvvId]/route.ts`

```typescript
/**
 * app/api/mvv/[mvvId]/route.ts
 *
 * GET /api/mvv/:mvvId - MVV 詳細取得
 * PATCH /api/mvv/:mvvId - MVV 更新
 * DELETE /api/mvv/:mvvId - MVV 削除
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const updateMVVSchema = z.object({
  mission: z.string().nullish(),
  vision: z.string().nullish(),
  values: z.array(z.string()).optional(),
});

// GET: MVV 詳細取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ mvvId: string }> }
) {
  try {
    const { mvvId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: mvv, error } = await supabase
      .from('mvv')
      .select('*')
      .eq('id', mvvId)
      .eq('user_id', user.id)
      .single();

    if (error || !mvv) {
      return NextResponse.json({ error: 'MVV not found' }, { status: 404 });
    }

    return NextResponse.json(mvv);
  } catch (error) {
    console.error('MVV GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH: MVV 更新
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ mvvId: string }> }
) {
  try {
    const { mvvId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const result = updateMVVSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', issues: result.error.issues },
        { status: 400 }
      );
    }

    const { data: mvv, error: updateError } = await supabase
      .from('mvv')
      .update({
        ...result.data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', mvvId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('MVV update error:', updateError);
      return NextResponse.json({ error: 'Failed to update MVV' }, { status: 500 });
    }

    return NextResponse.json(mvv);
  } catch (error) {
    console.error('MVV PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE: MVV 削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ mvvId: string }> }
) {
  try {
    const { mvvId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error: deleteError } = await supabase
      .from('mvv')
      .delete()
      .eq('id', mvvId)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('MVV delete error:', deleteError);
      return NextResponse.json({ error: 'Failed to delete MVV' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('MVV DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### 確認ポイント

- [ ] `app/api/mvv/route.ts` が作成された
- [ ] `app/api/mvv/[mvvId]/route.ts` が作成された
- [ ] GET, POST, PATCH, DELETE が実装されている

---

## Step 4: React Hooks 作成

### 4.1 MVV Hook

**ファイル:** `lib/hooks/useMVV.ts`

```typescript
/**
 * lib/hooks/useMVV.ts
 *
 * MVV 管理用カスタムフック
 */

import { useState, useEffect, useCallback } from 'react';
import type { MVV, MVVCreate, MVVUpdate } from '@/lib/types/mvv';

export function useMVV(brandId: string | null) {
  const [mvv, setMVV] = useState<MVV | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchMVV = useCallback(async () => {
    if (!brandId) {
      setMVV(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/mvv?brandId=${brandId}`);
      if (!res.ok && res.status !== 404) {
        throw new Error('Failed to fetch MVV');
      }

      const data = await res.json();
      setMVV(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [brandId]);

  useEffect(() => {
    fetchMVV();
  }, [fetchMVV]);

  // MVV 作成
  const createMVV = async (input: MVVCreate): Promise<MVV | null> => {
    try {
      setSaving(true);
      setError(null);

      const res = await fetch('/api/mvv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      if (!res.ok) throw new Error('Failed to create MVV');

      const created = await res.json();
      setMVV(created);
      return created;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setSaving(false);
    }
  };

  // MVV 更新
  const updateMVV = async (input: MVVUpdate): Promise<boolean> => {
    if (!mvv) return false;

    try {
      setSaving(true);
      setError(null);

      const res = await fetch(`/api/mvv/${mvv.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      if (!res.ok) throw new Error('Failed to update MVV');

      const updated = await res.json();
      setMVV(updated);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    } finally {
      setSaving(false);
    }
  };

  // MVV を作成または更新（upsert的な動作）
  const saveMVV = async (input: MVVUpdate): Promise<boolean> => {
    if (!brandId) return false;

    if (mvv) {
      return await updateMVV(input);
    } else {
      const created = await createMVV({ ...input, brand_id: brandId });
      return !!created;
    }
  };

  // Value 追加
  const addValue = async (value: string): Promise<boolean> => {
    if (!value.trim()) return false;
    const newValues = [...(mvv?.values || []), value.trim()];
    return await saveMVV({ values: newValues });
  };

  // Value 削除
  const removeValue = async (index: number): Promise<boolean> => {
    const newValues = (mvv?.values || []).filter((_, i) => i !== index);
    return await saveMVV({ values: newValues });
  };

  // Value 更新
  const updateValue = async (index: number, value: string): Promise<boolean> => {
    const newValues = [...(mvv?.values || [])];
    newValues[index] = value;
    return await saveMVV({ values: newValues });
  };

  return {
    mvv,
    loading,
    error,
    saving,
    refetch: fetchMVV,
    createMVV,
    updateMVV,
    saveMVV,
    addValue,
    removeValue,
    updateValue,
  };
}
```

### 確認ポイント

- [ ] `lib/hooks/useMVV.ts` が作成された
- [ ] saveMVV で upsert 動作が実装されている

---

## Step 5: UI コンポーネント作成

### 5.1 折り畳みコンポーネント

**ファイル:** `components/mvv/Collapsible.tsx`

```typescript
'use client';

/**
 * components/mvv/Collapsible.tsx
 *
 * 折り畳み（アコーディオン）コンポーネント
 */

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface CollapsibleProps {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function Collapsible({
  title,
  subtitle,
  defaultOpen = false,
  children,
  className = '',
}: CollapsibleProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`collapsible ${isOpen ? 'open' : ''} ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="collapsible-header"
        aria-expanded={isOpen}
      >
        <div className="collapsible-icon">
          {isOpen ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
        </div>
        <div className="collapsible-title">
          <span className="title-text">{title}</span>
          {subtitle && <span className="subtitle-text">{subtitle}</span>}
        </div>
      </button>
      {isOpen && (
        <div className="collapsible-content">
          {children}
        </div>
      )}
    </div>
  );
}
```

### 5.2 MVV セクションコンポーネント

**ファイル:** `components/mvv/MVVSection.tsx`

```typescript
'use client';

/**
 * components/mvv/MVVSection.tsx
 *
 * MVV（Mission/Vision/Value）編集セクション
 */

import { useState } from 'react';
import { Edit, Save, X, Plus, Trash2, Loader2, Target, Eye, Heart } from 'lucide-react';
import type { MVV, MVVUpdate } from '@/lib/types/mvv';
import { MVV_SECTION_INFO } from '@/lib/types/mvv';

interface MVVSectionProps {
  mvv: MVV | null;
  saving: boolean;
  onSave: (data: MVVUpdate) => Promise<boolean>;
  onAddValue: (value: string) => Promise<boolean>;
  onRemoveValue: (index: number) => Promise<boolean>;
  onUpdateValue: (index: number, value: string) => Promise<boolean>;
}

export function MVVSection({
  mvv,
  saving,
  onSave,
  onAddValue,
  onRemoveValue,
  onUpdateValue,
}: MVVSectionProps) {
  const [editingField, setEditingField] = useState<'mission' | 'vision' | null>(null);
  const [editValue, setEditValue] = useState('');
  const [newValue, setNewValue] = useState('');
  const [editingValueIndex, setEditingValueIndex] = useState<number | null>(null);
  const [editingValueText, setEditingValueText] = useState('');

  const handleEditStart = (field: 'mission' | 'vision') => {
    setEditingField(field);
    setEditValue(mvv?.[field] || '');
  };

  const handleEditSave = async () => {
    if (!editingField) return;
    const success = await onSave({ [editingField]: editValue.trim() || null });
    if (success) {
      setEditingField(null);
      setEditValue('');
    }
  };

  const handleEditCancel = () => {
    setEditingField(null);
    setEditValue('');
  };

  const handleAddValue = async () => {
    if (!newValue.trim()) return;
    const success = await onAddValue(newValue.trim());
    if (success) {
      setNewValue('');
    }
  };

  const handleValueEditStart = (index: number) => {
    setEditingValueIndex(index);
    setEditingValueText(mvv?.values[index] || '');
  };

  const handleValueEditSave = async () => {
    if (editingValueIndex === null) return;
    const success = await onUpdateValue(editingValueIndex, editingValueText.trim());
    if (success) {
      setEditingValueIndex(null);
      setEditingValueText('');
    }
  };

  const sectionIcons = {
    mission: Target,
    vision: Eye,
    values: Heart,
  };

  return (
    <div className="mvv-section">
      {/* Mission */}
      <div className="mvv-item">
        <div className="mvv-item-header">
          <div className="mvv-item-icon mission">
            <Target size={20} />
          </div>
          <div className="mvv-item-label">
            <h3>{MVV_SECTION_INFO.mission.label}</h3>
            <span className="label-ja">{MVV_SECTION_INFO.mission.labelJa}</span>
          </div>
          {editingField !== 'mission' && (
            <button
              onClick={() => handleEditStart('mission')}
              className="btn-icon"
              disabled={saving}
            >
              <Edit size={16} />
            </button>
          )}
        </div>
        <p className="mvv-item-description">{MVV_SECTION_INFO.mission.description}</p>

        {editingField === 'mission' ? (
          <div className="mvv-edit-form">
            <textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              placeholder={MVV_SECTION_INFO.mission.placeholder}
              className="form-textarea"
              rows={3}
              autoFocus
            />
            <div className="edit-actions">
              <button onClick={handleEditCancel} className="btn btn-secondary" disabled={saving}>
                <X size={14} /> キャンセル
              </button>
              <button onClick={handleEditSave} className="btn btn-primary" disabled={saving}>
                {saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                保存
              </button>
            </div>
          </div>
        ) : (
          <div className="mvv-item-content">
            {mvv?.mission ? (
              <p className="content-text">{mvv.mission}</p>
            ) : (
              <p className="content-empty">未設定</p>
            )}
          </div>
        )}
      </div>

      {/* Vision */}
      <div className="mvv-item">
        <div className="mvv-item-header">
          <div className="mvv-item-icon vision">
            <Eye size={20} />
          </div>
          <div className="mvv-item-label">
            <h3>{MVV_SECTION_INFO.vision.label}</h3>
            <span className="label-ja">{MVV_SECTION_INFO.vision.labelJa}</span>
          </div>
          {editingField !== 'vision' && (
            <button
              onClick={() => handleEditStart('vision')}
              className="btn-icon"
              disabled={saving}
            >
              <Edit size={16} />
            </button>
          )}
        </div>
        <p className="mvv-item-description">{MVV_SECTION_INFO.vision.description}</p>

        {editingField === 'vision' ? (
          <div className="mvv-edit-form">
            <textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              placeholder={MVV_SECTION_INFO.vision.placeholder}
              className="form-textarea"
              rows={3}
              autoFocus
            />
            <div className="edit-actions">
              <button onClick={handleEditCancel} className="btn btn-secondary" disabled={saving}>
                <X size={14} /> キャンセル
              </button>
              <button onClick={handleEditSave} className="btn btn-primary" disabled={saving}>
                {saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                保存
              </button>
            </div>
          </div>
        ) : (
          <div className="mvv-item-content">
            {mvv?.vision ? (
              <p className="content-text">{mvv.vision}</p>
            ) : (
              <p className="content-empty">未設定</p>
            )}
          </div>
        )}
      </div>

      {/* Values */}
      <div className="mvv-item values">
        <div className="mvv-item-header">
          <div className="mvv-item-icon values">
            <Heart size={20} />
          </div>
          <div className="mvv-item-label">
            <h3>{MVV_SECTION_INFO.values.label}</h3>
            <span className="label-ja">{MVV_SECTION_INFO.values.labelJa}</span>
          </div>
        </div>
        <p className="mvv-item-description">{MVV_SECTION_INFO.values.description}</p>

        <div className="values-list">
          {(mvv?.values || []).map((value, index) => (
            <div key={index} className="value-item">
              {editingValueIndex === index ? (
                <div className="value-edit">
                  <input
                    type="text"
                    value={editingValueText}
                    onChange={(e) => setEditingValueText(e.target.value)}
                    className="form-input"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleValueEditSave();
                      if (e.key === 'Escape') {
                        setEditingValueIndex(null);
                        setEditingValueText('');
                      }
                    }}
                  />
                  <button
                    onClick={handleValueEditSave}
                    className="btn-icon"
                    disabled={saving}
                  >
                    <Save size={14} />
                  </button>
                  <button
                    onClick={() => {
                      setEditingValueIndex(null);
                      setEditingValueText('');
                    }}
                    className="btn-icon"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <>
                  <span className="value-text">{value}</span>
                  <div className="value-actions">
                    <button
                      onClick={() => handleValueEditStart(index)}
                      className="btn-icon"
                      disabled={saving}
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      onClick={() => onRemoveValue(index)}
                      className="btn-icon btn-danger"
                      disabled={saving}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        <div className="value-add">
          <input
            type="text"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            placeholder={MVV_SECTION_INFO.values.placeholder}
            className="form-input"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddValue();
            }}
          />
          <button
            onClick={handleAddValue}
            className="btn btn-outline"
            disabled={saving || !newValue.trim()}
          >
            <Plus size={14} /> 追加
          </button>
        </div>

        {/* 例 */}
        <div className="values-examples">
          <span className="examples-label">例:</span>
          {MVV_SECTION_INFO.values.examples.map((example, i) => (
            <button
              key={i}
              onClick={() => setNewValue(example)}
              className="example-chip"
            >
              {example}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
```

### 5.3 統合ビューコンポーネント

**ファイル:** `components/mvv/UnifiedView.tsx`

```typescript
'use client';

/**
 * components/mvv/UnifiedView.tsx
 *
 * Brand + Lean Canvas + MVV 統合ビュー
 */

import Link from 'next/link';
import { Palette, LayoutGrid, Target, Edit } from 'lucide-react';
import type { Brand } from '@/lib/types/brand';
import type { LeanCanvas, LeanCanvasBlock } from '@/lib/types/lean-canvas';
import type { MVV } from '@/lib/types/mvv';
import { Collapsible } from './Collapsible';
import { LEAN_CANVAS_BLOCK_INFO } from '@/lib/types/lean-canvas';

interface UnifiedViewProps {
  brand: Brand;
  leanCanvas: (LeanCanvas & { blocks: LeanCanvasBlock[] }) | null;
  mvv: MVV | null;
}

export function UnifiedView({ brand, leanCanvas, mvv }: UnifiedViewProps) {
  return (
    <div className="unified-view">
      {/* ブランド概要 */}
      <Collapsible title="ブランド概要" subtitle={brand.name} defaultOpen>
        <div className="unified-brand">
          <div className="brand-header">
            {brand.logo_url && (
              <img src={brand.logo_url} alt={brand.name} className="brand-logo" />
            )}
            <div className="brand-info">
              <h3>{brand.name}</h3>
              {brand.tagline && <p className="tagline">{brand.tagline}</p>}
            </div>
            <Link href="/brand" className="edit-link">
              <Edit size={14} />
            </Link>
          </div>
          {brand.story && <p className="brand-story">{brand.story}</p>}
        </div>
      </Collapsible>

      {/* MVV */}
      <Collapsible title="MVV" subtitle="Mission / Vision / Values" defaultOpen>
        <div className="unified-mvv">
          {mvv ? (
            <div className="mvv-summary">
              <div className="mvv-summary-item">
                <span className="label">Mission</span>
                <p>{mvv.mission || '未設定'}</p>
              </div>
              <div className="mvv-summary-item">
                <span className="label">Vision</span>
                <p>{mvv.vision || '未設定'}</p>
              </div>
              <div className="mvv-summary-item">
                <span className="label">Values</span>
                {mvv.values.length > 0 ? (
                  <ul className="values-list">
                    {mvv.values.map((v, i) => (
                      <li key={i}>{v}</li>
                    ))}
                  </ul>
                ) : (
                  <p>未設定</p>
                )}
              </div>
            </div>
          ) : (
            <p className="empty-message">MVV が未設定です</p>
          )}
        </div>
      </Collapsible>

      {/* Lean Canvas サマリー */}
      <Collapsible title="Lean Canvas" subtitle={leanCanvas?.title}>
        {leanCanvas ? (
          <div className="unified-canvas">
            <div className="canvas-summary-grid">
              {['problem', 'customer-segments', 'unique-value', 'solution'].map(blockType => {
                const block = leanCanvas.blocks.find(b => b.block_type === blockType);
                const content = block?.content as { items?: string[] } | undefined;
                const info = LEAN_CANVAS_BLOCK_INFO[blockType as keyof typeof LEAN_CANVAS_BLOCK_INFO];

                return (
                  <div key={blockType} className="canvas-summary-item">
                    <span className="label">{info?.label}</span>
                    {content?.items && content.items.length > 0 ? (
                      <ul>
                        {content.items.slice(0, 2).map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                        {content.items.length > 2 && (
                          <li className="more">+{content.items.length - 2}件</li>
                        )}
                      </ul>
                    ) : (
                      <p className="empty">未入力</p>
                    )}
                  </div>
                );
              })}
            </div>
            <Link href={`/lean-canvas/${leanCanvas.id}`} className="view-full-link">
              全体を見る
            </Link>
          </div>
        ) : (
          <div className="empty-message">
            <p>Lean Canvas がありません</p>
            <Link href="/lean-canvas" className="btn btn-outline">
              作成する
            </Link>
          </div>
        )}
      </Collapsible>
    </div>
  );
}
```

### 5.4 インデックスファイル

**ファイル:** `components/mvv/index.ts`

```typescript
export { Collapsible } from './Collapsible';
export { MVVSection } from './MVVSection';
export { UnifiedView } from './UnifiedView';
```

### 確認ポイント

- [ ] `components/mvv/Collapsible.tsx` が作成された
- [ ] `components/mvv/MVVSection.tsx` が作成された
- [ ] `components/mvv/UnifiedView.tsx` が作成された
- [ ] `components/mvv/index.ts` でエクスポートされている

---

## Step 6: MVV ページ作成

### 6.1 MVV 統合ページ

**ファイル:** `app/(app)/mvv/page.tsx`

```typescript
'use client';

/**
 * app/(app)/mvv/page.tsx
 *
 * MVV 統合ビューページ
 */

import { useState, useEffect } from 'react';
import { Target, Loader2, ChevronDown } from 'lucide-react';
import { useBrands } from '@/lib/hooks/useBrand';
import { useMVV } from '@/lib/hooks/useMVV';
import { MVVSection, UnifiedView } from '@/components/mvv';

export default function MVVPage() {
  const { brands, isLoading: brandsLoading } = useBrands();
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const [leanCanvas, setLeanCanvas] = useState<any>(null);
  const [leanCanvasLoading, setLeanCanvasLoading] = useState(false);

  // ブランドが読み込まれたら最初のブランドを選択
  useEffect(() => {
    if (!selectedBrandId && brands.length > 0) {
      setSelectedBrandId(brands[0].id);
    }
  }, [brands, selectedBrandId]);

  const selectedBrand = brands.find(b => b.id === selectedBrandId) || null;
  const { mvv, loading, saving, saveMVV, addValue, removeValue, updateValue } = useMVV(selectedBrandId);

  // Lean Canvas 取得
  useEffect(() => {
    if (!selectedBrandId) {
      setLeanCanvas(null);
      return;
    }

    const fetchLeanCanvas = async () => {
      setLeanCanvasLoading(true);
      try {
        const res = await fetch(`/api/lean-canvas?brandId=${selectedBrandId}`);
        if (res.ok) {
          const canvases = await res.json();
          if (canvases.length > 0) {
            // 最新のキャンバスを取得
            const latestCanvas = canvases[0];
            const blocksRes = await fetch(`/api/lean-canvas/${latestCanvas.id}`);
            if (blocksRes.ok) {
              const canvasWithBlocks = await blocksRes.json();
              setLeanCanvas(canvasWithBlocks);
            }
          } else {
            setLeanCanvas(null);
          }
        }
      } catch (error) {
        console.error('Failed to fetch Lean Canvas:', error);
      } finally {
        setLeanCanvasLoading(false);
      }
    };

    fetchLeanCanvas();
  }, [selectedBrandId]);

  if (brandsLoading) {
    return (
      <div className="page-loading">
        <Loader2 className="animate-spin" size={32} />
        <p>読み込み中...</p>
      </div>
    );
  }

  if (brands.length === 0) {
    return (
      <div className="mvv-page">
        <header className="page-header">
          <div className="header-content">
            <Target size={24} />
            <h1>MVV</h1>
          </div>
        </header>
        <div className="empty-state">
          <Target size={48} />
          <h2>ブランドがありません</h2>
          <p>まず「ブランド」タブでブランドを作成してください</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mvv-page">
      <header className="page-header">
        <div className="header-content">
          <Target size={24} />
          <h1>MVV</h1>
          <span className="header-subtitle">Mission / Vision / Values</span>
        </div>
        <div className="header-actions-group">
          <div className="brand-selector">
            <select
              value={selectedBrandId || ''}
              onChange={(e) => setSelectedBrandId(e.target.value || null)}
              className="brand-select"
            >
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>
            <ChevronDown size={16} className="select-icon" />
          </div>
        </div>
      </header>

      {loading || leanCanvasLoading ? (
        <div className="page-loading">
          <Loader2 className="animate-spin" size={32} />
        </div>
      ) : (
        <div className="mvv-layout">
          {/* MVV 編集 */}
          <section className="mvv-edit-section">
            <MVVSection
              mvv={mvv}
              saving={saving}
              onSave={saveMVV}
              onAddValue={addValue}
              onRemoveValue={removeValue}
              onUpdateValue={updateValue}
            />
          </section>

          {/* 統合ビュー */}
          {selectedBrand && (
            <section className="mvv-unified-section">
              <h2>統合ビュー</h2>
              <UnifiedView
                brand={selectedBrand}
                leanCanvas={leanCanvas}
                mvv={mvv}
              />
            </section>
          )}
        </div>
      )}
    </div>
  );
}
```

### 6.2 ナビゲーション更新

**ファイル:** `app/(app)/layout.tsx` に追加

```typescript
// import に追加
import { Target } from 'lucide-react';

// NAV_ITEMS に追加
{ href: '/mvv', label: 'MVV', icon: Target },
```

### 確認ポイント

- [ ] `app/(app)/mvv/page.tsx` が作成された
- [ ] ナビゲーションに MVV リンクが追加された

---

## Step 7: CSS スタイル追加

**ファイル:** `app/globals.css` に追加

```css
/*
 * MVV 統合ビュー（Phase 19）
 */

/* ページレイアウト */
.mvv-page {
  padding: 24px 0;
}

.mvv-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;
}

@media (max-width: 1024px) {
  .mvv-layout {
    grid-template-columns: 1fr;
  }
}

/* MVV セクション */
.mvv-section {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.mvv-item {
  background: var(--bg-white);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 20px;
}

.mvv-item-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.mvv-item-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  color: white;
}

.mvv-item-icon.mission {
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
}

.mvv-item-icon.vision {
  background: linear-gradient(135deg, #8b5cf6, #6d28d9);
}

.mvv-item-icon.values {
  background: linear-gradient(135deg, #ec4899, #be185d);
}

.mvv-item-label {
  flex: 1;
}

.mvv-item-label h3 {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
}

.mvv-item-label .label-ja {
  font-size: 12px;
  color: var(--text-muted);
}

.mvv-item-description {
  font-size: 13px;
  color: var(--text-muted);
  margin-bottom: 16px;
}

.mvv-item-content {
  padding: 16px;
  background: var(--bg-gray);
  border-radius: 8px;
}

.mvv-item-content .content-text {
  font-size: 15px;
  line-height: 1.7;
  color: var(--text-dark);
  margin: 0;
}

.mvv-item-content .content-empty {
  font-size: 14px;
  color: var(--text-muted);
  font-style: italic;
  margin: 0;
}

/* 編集フォーム */
.mvv-edit-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mvv-edit-form .edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

/* Values リスト */
.values-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.value-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--bg-gray);
  border-radius: 8px;
}

.value-item .value-text {
  flex: 1;
  font-size: 14px;
}

.value-item .value-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.value-item:hover .value-actions {
  opacity: 1;
}

.value-item .value-edit {
  display: flex;
  gap: 8px;
  flex: 1;
}

.value-add {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.value-add .form-input {
  flex: 1;
}

.values-examples {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.values-examples .examples-label {
  font-size: 12px;
  color: var(--text-muted);
}

.values-examples .example-chip {
  font-size: 12px;
  padding: 4px 10px;
  background: var(--bg-gray);
  border: 1px solid var(--border);
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.values-examples .example-chip:hover {
  background: var(--primary-alpha-10);
  border-color: var(--primary);
  color: var(--primary);
}

/* 折り畳みコンポーネント */
.collapsible {
  background: var(--bg-white);
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 16px;
}

.collapsible-header {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 16px 20px;
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
}

.collapsible-header:hover {
  background: var(--bg-gray);
}

.collapsible-icon {
  color: var(--text-muted);
}

.collapsible-title {
  flex: 1;
}

.collapsible-title .title-text {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-dark);
}

.collapsible-title .subtitle-text {
  display: block;
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 2px;
}

.collapsible-content {
  padding: 0 20px 20px;
}

/* 統合ビュー */
.unified-view {
  display: flex;
  flex-direction: column;
}

.unified-brand {
  padding: 16px;
}

.unified-brand .brand-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 12px;
}

.unified-brand .brand-logo {
  width: 48px;
  height: 48px;
  object-fit: contain;
  border-radius: 8px;
  background: var(--bg-gray);
}

.unified-brand .brand-info {
  flex: 1;
}

.unified-brand .brand-info h3 {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
}

.unified-brand .tagline {
  font-size: 13px;
  color: var(--text-muted);
  margin: 4px 0 0;
}

.unified-brand .brand-story {
  font-size: 13px;
  color: var(--text-light);
  line-height: 1.6;
  margin: 0;
}

.unified-mvv .mvv-summary {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.unified-mvv .mvv-summary-item {
  padding: 12px;
  background: var(--bg-gray);
  border-radius: 8px;
}

.unified-mvv .mvv-summary-item .label {
  display: block;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 6px;
}

.unified-mvv .mvv-summary-item p {
  font-size: 14px;
  color: var(--text-dark);
  margin: 0;
}

.unified-mvv .values-list {
  list-style: disc;
  padding-left: 20px;
  margin: 0;
}

.unified-canvas .canvas-summary-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 12px;
}

.unified-canvas .canvas-summary-item {
  padding: 12px;
  background: var(--bg-gray);
  border-radius: 8px;
}

.unified-canvas .canvas-summary-item .label {
  display: block;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 6px;
}

.unified-canvas .canvas-summary-item ul {
  list-style: disc;
  padding-left: 16px;
  margin: 0;
  font-size: 13px;
}

.unified-canvas .canvas-summary-item .more {
  color: var(--text-muted);
  font-style: italic;
}

.unified-canvas .canvas-summary-item .empty {
  font-size: 13px;
  color: var(--text-muted);
  font-style: italic;
  margin: 0;
}

.unified-canvas .view-full-link {
  display: block;
  text-align: center;
  font-size: 13px;
  color: var(--primary);
}

.empty-message {
  text-align: center;
  padding: 24px;
  color: var(--text-muted);
}

.empty-message p {
  margin-bottom: 12px;
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

1. http://localhost:3000/mvv にアクセス
2. 以下を確認:
   - [ ] ブランド選択ができる
   - [ ] Mission を編集・保存できる
   - [ ] Vision を編集・保存できる
   - [ ] Values を追加・編集・削除できる
   - [ ] 統合ビューにブランド情報が表示される
   - [ ] 統合ビューに Lean Canvas サマリーが表示される
   - [ ] 折り畳みが動作する

---

## Step 10: Git プッシュ

```bash
git add -A
git commit -m "Phase 19: MVV（Mission/Vision/Value）統合ビュー

- supabase/migrations/20260113_phase19_mvv.sql: MVV テーブル作成
- lib/types/mvv.ts: MVV 型定義
- app/api/mvv/route.ts: MVV 取得・作成 API
- app/api/mvv/[mvvId]/route.ts: MVV 更新・削除 API
- lib/hooks/useMVV.ts: MVV Hook
- components/mvv/Collapsible.tsx: 折り畳みコンポーネント
- components/mvv/MVVSection.tsx: MVV 編集セクション
- components/mvv/UnifiedView.tsx: 統合ビュー
- app/(app)/mvv/page.tsx: MVV ページ
- CSS スタイル追加

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"

git push
```

---

## 完了チェックリスト

### DB マイグレーション
- [ ] `mvv` テーブル作成
- [ ] RLS ポリシー設定
- [ ] ユニーク制約（1ブランド1MVV）

### 型定義
- [ ] MVV 型
- [ ] MVVCreate / MVVUpdate 型
- [ ] MVV_SECTION_INFO 定数

### API Routes
- [ ] `GET /api/mvv?brandId=xxx`
- [ ] `POST /api/mvv`
- [ ] `GET /api/mvv/:mvvId`
- [ ] `PATCH /api/mvv/:mvvId`
- [ ] `DELETE /api/mvv/:mvvId`

### React Hooks
- [ ] `useMVV` 作成
- [ ] saveMVV（upsert）動作
- [ ] addValue / removeValue / updateValue

### UI コンポーネント
- [ ] `Collapsible` 作成
- [ ] `MVVSection` 作成
- [ ] `UnifiedView` 作成

### 統合
- [ ] `/mvv` ページ作成
- [ ] ナビゲーション更新
- [ ] 型チェック成功
- [ ] ビルド成功
- [ ] Git プッシュ完了

---

## 次のステップ（Phase 20 以降）

1. **事業計画書エクスポート**
   - Brand + MVV + Lean Canvas + Product Sections を PDF 出力
   - 営業資料・投資家向けフォーマット

2. **AI アシスタント連携**
   - MVV から Lean Canvas 提案
   - ブランドストーリー自動生成

3. **チーム共有機能**
   - MVV の共有・コメント
   - バージョン管理
