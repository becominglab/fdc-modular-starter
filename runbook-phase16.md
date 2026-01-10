# Phase 16: Lean Canvas（リーンキャンバス）

## 目標

ビジネスツール第二弾として、Lean Canvas（9ブロック）を実装：
- 9ブロックのグリッドレイアウト
- 各ブロックの編集機能
- 製品セクション（フロント/ミドル/バック）
- カスタマージャーニー可視化

---

## Lean Canvas とは

```
スタートアップ向けビジネスモデル設計ツール。
9つのブロックで事業の全体像を1枚で表現します。

┌─────────────┬─────────────┬─────────────┬─────────────┬─────────────┐
│   課題      │   解決策    │  独自の     │  圧倒的     │   顧客      │
│  Problem    │  Solution   │  価値提案   │  優位性     │ セグメント  │
│             │             │ Unique Value│  Unfair     │  Customer   │
│             │             │ Proposition │  Advantage  │  Segments   │
├─────────────┼─────────────┼─────────────┼─────────────┼─────────────┤
│   主要      │             │             │             │ チャネル    │
│   指標      │             │             │             │  Channels   │
│ Key Metrics │             │             │             │             │
├─────────────┴─────────────┴─────────────┴─────────────┴─────────────┤
│        コスト構造                 │          収益の流れ             │
│        Cost Structure             │          Revenue Streams        │
└───────────────────────────────────┴─────────────────────────────────┘

【フロー】
ブランド選択 → キャンバス作成 → 9ブロック入力 → ジャーニー表示
```

---

## 習得する新しい概念

| 概念 | 説明 |
|------|------|
| Lean Canvas | スタートアップ向けビジネスモデル設計ツール |
| 9ブロック | 課題、顧客セグメント、独自の価値提案など9項目 |
| CSS Grid | 複雑なグリッドレイアウトを効率的に実装 |
| カスタマージャーニー | 顧客体験の流れを可視化 |

---

## 前提条件

- [ ] Phase 15 完了（Brand Strategy 動作）
- [ ] Supabase + 認証が動作
- [ ] 開発サーバーが起動している

---

## Step 1: データベーススキーマ作成

### 1.1 マイグレーションファイル作成

**ファイル:** `supabase/migrations/20260110_phase16_lean_canvas.sql`

```sql
-- Phase 16: Lean Canvas（リーンキャンバス）

-- =============================================
-- lean_canvas テーブル
-- =============================================
CREATE TABLE IF NOT EXISTS lean_canvas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Lean Canvas',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_lean_canvas_brand_id ON lean_canvas(brand_id);
CREATE INDEX IF NOT EXISTS idx_lean_canvas_user_id ON lean_canvas(user_id);

-- RLS 有効化
ALTER TABLE lean_canvas ENABLE ROW LEVEL SECURITY;

-- RLS ポリシー
DROP POLICY IF EXISTS "Users can view own lean canvas" ON lean_canvas;
CREATE POLICY "Users can view own lean canvas" ON lean_canvas
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own lean canvas" ON lean_canvas;
CREATE POLICY "Users can insert own lean canvas" ON lean_canvas
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own lean canvas" ON lean_canvas;
CREATE POLICY "Users can update own lean canvas" ON lean_canvas
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own lean canvas" ON lean_canvas;
CREATE POLICY "Users can delete own lean canvas" ON lean_canvas
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- lean_canvas_blocks テーブル（9ブロック）
-- =============================================
CREATE TABLE IF NOT EXISTS lean_canvas_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canvas_id UUID NOT NULL REFERENCES lean_canvas(id) ON DELETE CASCADE,
  block_type TEXT NOT NULL CHECK (block_type IN (
    'problem', 'solution', 'unique_value',
    'unfair_advantage', 'customer_segments',
    'key_metrics', 'channels',
    'cost_structure', 'revenue_streams'
  )),
  content JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(canvas_id, block_type)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_lean_canvas_blocks_canvas_id ON lean_canvas_blocks(canvas_id);

-- RLS 有効化
ALTER TABLE lean_canvas_blocks ENABLE ROW LEVEL SECURITY;

-- RLS ポリシー（lean_canvas 経由で権限チェック）
DROP POLICY IF EXISTS "Users can view own canvas blocks" ON lean_canvas_blocks;
CREATE POLICY "Users can view own canvas blocks" ON lean_canvas_blocks
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM lean_canvas WHERE lean_canvas.id = lean_canvas_blocks.canvas_id AND lean_canvas.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert own canvas blocks" ON lean_canvas_blocks;
CREATE POLICY "Users can insert own canvas blocks" ON lean_canvas_blocks
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM lean_canvas WHERE lean_canvas.id = lean_canvas_blocks.canvas_id AND lean_canvas.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update own canvas blocks" ON lean_canvas_blocks;
CREATE POLICY "Users can update own canvas blocks" ON lean_canvas_blocks
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM lean_canvas WHERE lean_canvas.id = lean_canvas_blocks.canvas_id AND lean_canvas.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete own canvas blocks" ON lean_canvas_blocks;
CREATE POLICY "Users can delete own canvas blocks" ON lean_canvas_blocks
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM lean_canvas WHERE lean_canvas.id = lean_canvas_blocks.canvas_id AND lean_canvas.user_id = auth.uid())
  );

-- コメント
COMMENT ON TABLE lean_canvas IS 'Lean Canvas（リーンキャンバス）';
COMMENT ON TABLE lean_canvas_blocks IS 'Lean Canvas の9ブロック';
COMMENT ON COLUMN lean_canvas_blocks.block_type IS 'problem, solution, unique_value, unfair_advantage, customer_segments, key_metrics, channels, cost_structure, revenue_streams';
COMMENT ON COLUMN lean_canvas_blocks.content IS '箇条書きリスト（JSON配列）';
```

### 1.2 マイグレーション実行

```bash
supabase db push
```

### 確認ポイント

- [ ] マイグレーションが成功した
- [ ] lean_canvas テーブルが作成された
- [ ] lean_canvas_blocks テーブルが作成された
- [ ] RLS ポリシーが設定された

---

## Step 2: 型定義の作成

### 2.1 Lean Canvas 型定義

**ファイル:** `lib/types/lean-canvas.ts`

```typescript
/**
 * lib/types/lean-canvas.ts
 *
 * Lean Canvas（リーンキャンバス）の型定義
 */

// 9ブロックの種類
export type LeanCanvasBlockType =
  | 'problem'
  | 'solution'
  | 'unique_value'
  | 'unfair_advantage'
  | 'customer_segments'
  | 'key_metrics'
  | 'channels'
  | 'cost_structure'
  | 'revenue_streams';

// Lean Canvas 基本情報
export interface LeanCanvas {
  id: string;
  brand_id: string;
  user_id: string;
  title: string;
  description?: string | null;
  created_at: string;
  updated_at: string;
}

// Lean Canvas ブロック
export interface LeanCanvasBlock {
  id: string;
  canvas_id: string;
  block_type: LeanCanvasBlockType;
  content: string[];  // 箇条書きリスト
  created_at: string;
  updated_at: string;
}

// キャンバス作成用
export interface LeanCanvasCreate {
  brand_id: string;
  title?: string;
  description?: string;
}

// キャンバス更新用
export interface LeanCanvasUpdate {
  title?: string;
  description?: string | null;
}

// ブロック更新用
export interface LeanCanvasBlockUpdate {
  content: string[];
}

// 9ブロックの表示情報
export const LEAN_CANVAS_BLOCK_INFO: Record<LeanCanvasBlockType, {
  label: string;
  labelEn: string;
  description: string;
  placeholder: string;
  gridArea: string;
  color: string;
  order: number;
}> = {
  problem: {
    label: '課題',
    labelEn: 'Problem',
    description: '顧客が抱える上位3つの課題',
    placeholder: '例: 情報が分散している、時間がかかる...',
    gridArea: 'problem',
    color: '#ef4444',
    order: 1,
  },
  solution: {
    label: '解決策',
    labelEn: 'Solution',
    description: '各課題に対する解決策',
    placeholder: '例: 一元管理システム、自動化...',
    gridArea: 'solution',
    color: '#3b82f6',
    order: 2,
  },
  unique_value: {
    label: '独自の価値提案',
    labelEn: 'Unique Value Proposition',
    description: '他にはない独自の価値',
    placeholder: '例: シンプルで直感的なUI...',
    gridArea: 'unique-value',
    color: '#8b5cf6',
    order: 3,
  },
  unfair_advantage: {
    label: '圧倒的な優位性',
    labelEn: 'Unfair Advantage',
    description: '簡単に真似できない強み',
    placeholder: '例: 独自の技術、専門知識...',
    gridArea: 'unfair-advantage',
    color: '#f59e0b',
    order: 4,
  },
  customer_segments: {
    label: '顧客セグメント',
    labelEn: 'Customer Segments',
    description: 'ターゲット顧客',
    placeholder: '例: スタートアップ創業者、SMB...',
    gridArea: 'customer-segments',
    color: '#10b981',
    order: 5,
  },
  key_metrics: {
    label: '主要指標',
    labelEn: 'Key Metrics',
    description: '成功を測る指標',
    placeholder: '例: MAU、コンバージョン率...',
    gridArea: 'key-metrics',
    color: '#6366f1',
    order: 6,
  },
  channels: {
    label: 'チャネル',
    labelEn: 'Channels',
    description: '顧客にリーチする方法',
    placeholder: '例: SNS、口コミ、広告...',
    gridArea: 'channels',
    color: '#ec4899',
    order: 7,
  },
  cost_structure: {
    label: 'コスト構造',
    labelEn: 'Cost Structure',
    description: '主要なコスト項目',
    placeholder: '例: 人件費、サーバー費用...',
    gridArea: 'cost-structure',
    color: '#64748b',
    order: 8,
  },
  revenue_streams: {
    label: '収益の流れ',
    labelEn: 'Revenue Streams',
    description: '収益源',
    placeholder: '例: サブスク、従量課金...',
    gridArea: 'revenue-streams',
    color: '#22c55e',
    order: 9,
  },
};

// ブロックタイプの配列（表示順）
export const LEAN_CANVAS_BLOCK_TYPES: LeanCanvasBlockType[] = [
  'problem',
  'customer_segments',
  'unique_value',
  'solution',
  'unfair_advantage',
  'key_metrics',
  'channels',
  'cost_structure',
  'revenue_streams',
];

// グリッドレイアウト用の順序（左上から右下）
export const LEAN_CANVAS_GRID_ORDER: LeanCanvasBlockType[] = [
  'problem',
  'solution',
  'unique_value',
  'unfair_advantage',
  'customer_segments',
  'key_metrics',
  'channels',
  'cost_structure',
  'revenue_streams',
];
```

### 確認ポイント

- [ ] `lib/types/lean-canvas.ts` が作成された
- [ ] LeanCanvasBlockType に9種類が定義されている
- [ ] LEAN_CANVAS_BLOCK_INFO に各ブロックの表示情報がある

---

## Step 3: API Routes 作成

### 3.1 Lean Canvas CRUD API

**ファイル:** `app/api/lean-canvas/route.ts`

```typescript
/**
 * app/api/lean-canvas/route.ts
 *
 * GET /api/lean-canvas - キャンバス一覧取得（brandId でフィルタ可）
 * POST /api/lean-canvas - キャンバス作成
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const createCanvasSchema = z.object({
  brand_id: z.string().uuid('有効なブランドIDを指定してください'),
  title: z.string().optional(),
  description: z.string().optional(),
});

// GET: キャンバス一覧取得
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get('brandId');

    let query = supabase
      .from('lean_canvas')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (brandId) {
      query = query.eq('brand_id', brandId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Lean canvas fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch canvas' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Lean canvas GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: キャンバス作成
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const result = createCanvasSchema.safeParse(body);

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

    // キャンバス作成
    const { data: canvas, error: createError } = await supabase
      .from('lean_canvas')
      .insert({
        brand_id: result.data.brand_id,
        user_id: user.id,
        title: result.data.title || 'Lean Canvas',
        description: result.data.description,
      })
      .select()
      .single();

    if (createError) {
      console.error('Canvas create error:', createError);
      return NextResponse.json({ error: 'Failed to create canvas' }, { status: 500 });
    }

    // 9ブロックの初期レコードを作成
    const blockTypes = [
      'problem', 'solution', 'unique_value',
      'unfair_advantage', 'customer_segments',
      'key_metrics', 'channels',
      'cost_structure', 'revenue_streams'
    ];

    const blockInserts = blockTypes.map(block_type => ({
      canvas_id: canvas.id,
      block_type,
      content: [],
    }));

    await supabase.from('lean_canvas_blocks').insert(blockInserts);

    return NextResponse.json(canvas, { status: 201 });
  } catch (error) {
    console.error('Lean canvas POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### 3.2 個別キャンバス API

**ファイル:** `app/api/lean-canvas/[canvasId]/route.ts`

```typescript
/**
 * app/api/lean-canvas/[canvasId]/route.ts
 *
 * GET /api/lean-canvas/:canvasId - キャンバス詳細取得
 * PATCH /api/lean-canvas/:canvasId - キャンバス更新
 * DELETE /api/lean-canvas/:canvasId - キャンバス削除
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const updateCanvasSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
});

// GET: キャンバス詳細取得（ブロック含む）
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ canvasId: string }> }
) {
  try {
    const { canvasId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // キャンバス取得
    const { data: canvas, error: canvasError } = await supabase
      .from('lean_canvas')
      .select('*')
      .eq('id', canvasId)
      .eq('user_id', user.id)
      .single();

    if (canvasError || !canvas) {
      return NextResponse.json({ error: 'Canvas not found' }, { status: 404 });
    }

    // ブロック取得
    const { data: blocks, error: blocksError } = await supabase
      .from('lean_canvas_blocks')
      .select('*')
      .eq('canvas_id', canvasId)
      .order('block_type');

    if (blocksError) {
      console.error('Canvas blocks fetch error:', blocksError);
    }

    return NextResponse.json({
      ...canvas,
      blocks: blocks || [],
    });
  } catch (error) {
    console.error('Canvas GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH: キャンバス更新
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ canvasId: string }> }
) {
  try {
    const { canvasId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const result = updateCanvasSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', issues: result.error.issues },
        { status: 400 }
      );
    }

    const { data: canvas, error: updateError } = await supabase
      .from('lean_canvas')
      .update({
        ...result.data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', canvasId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Canvas update error:', updateError);
      return NextResponse.json({ error: 'Failed to update canvas' }, { status: 500 });
    }

    return NextResponse.json(canvas);
  } catch (error) {
    console.error('Canvas PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE: キャンバス削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ canvasId: string }> }
) {
  try {
    const { canvasId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error: deleteError } = await supabase
      .from('lean_canvas')
      .delete()
      .eq('id', canvasId)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Canvas delete error:', deleteError);
      return NextResponse.json({ error: 'Failed to delete canvas' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Canvas DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### 3.3 ブロック更新 API

**ファイル:** `app/api/lean-canvas/[canvasId]/blocks/[blockType]/route.ts`

```typescript
/**
 * app/api/lean-canvas/[canvasId]/blocks/[blockType]/route.ts
 *
 * PATCH /api/lean-canvas/:canvasId/blocks/:blockType - ブロック更新
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const updateBlockSchema = z.object({
  content: z.array(z.string()),
});

const validBlockTypes = [
  'problem', 'solution', 'unique_value',
  'unfair_advantage', 'customer_segments',
  'key_metrics', 'channels',
  'cost_structure', 'revenue_streams'
];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ canvasId: string; blockType: string }> }
) {
  try {
    const { canvasId, blockType } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!validBlockTypes.includes(blockType)) {
      return NextResponse.json({ error: 'Invalid block type' }, { status: 400 });
    }

    // キャンバス所有者確認
    const { data: canvas } = await supabase
      .from('lean_canvas')
      .select('id')
      .eq('id', canvasId)
      .eq('user_id', user.id)
      .single();

    if (!canvas) {
      return NextResponse.json({ error: 'Canvas not found' }, { status: 404 });
    }

    const body = await request.json();
    const result = updateBlockSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', issues: result.error.issues },
        { status: 400 }
      );
    }

    // upsert（存在しなければ作成、あれば更新）
    const { data: block, error: upsertError } = await supabase
      .from('lean_canvas_blocks')
      .upsert({
        canvas_id: canvasId,
        block_type: blockType,
        content: result.data.content,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'canvas_id,block_type',
      })
      .select()
      .single();

    if (upsertError) {
      console.error('Block upsert error:', upsertError);
      return NextResponse.json({ error: 'Failed to update block' }, { status: 500 });
    }

    return NextResponse.json(block);
  } catch (error) {
    console.error('Block PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### 確認ポイント

- [ ] `app/api/lean-canvas/route.ts` が作成された
- [ ] `app/api/lean-canvas/[canvasId]/route.ts` が作成された
- [ ] `app/api/lean-canvas/[canvasId]/blocks/[blockType]/route.ts` が作成された

---

## Step 4: React Hooks 作成

### 4.1 Lean Canvas 管理 Hook

**ファイル:** `lib/hooks/useLeanCanvas.ts`

```typescript
'use client';

/**
 * lib/hooks/useLeanCanvas.ts
 *
 * Lean Canvas 管理 Hook
 */

import { useState, useEffect, useCallback } from 'react';
import type {
  LeanCanvas,
  LeanCanvasBlock,
  LeanCanvasCreate,
  LeanCanvasUpdate,
  LeanCanvasBlockType,
} from '@/lib/types/lean-canvas';

interface LeanCanvasWithBlocks extends LeanCanvas {
  blocks: LeanCanvasBlock[];
}

// キャンバス一覧管理
export function useLeanCanvasList(brandId?: string) {
  const [canvasList, setCanvasList] = useState<LeanCanvas[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCanvasList = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const url = brandId
        ? `/api/lean-canvas?brandId=${brandId}`
        : '/api/lean-canvas';

      const response = await fetch(url, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch canvas list');
      }

      const data = await response.json();
      setCanvasList(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [brandId]);

  useEffect(() => {
    fetchCanvasList();
  }, [fetchCanvasList]);

  const createCanvas = useCallback(async (input: LeanCanvasCreate) => {
    const response = await fetch('/api/lean-canvas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to create canvas');
    }

    const newCanvas = await response.json();
    setCanvasList(prev => [newCanvas, ...prev]);
    return newCanvas;
  }, []);

  const deleteCanvas = useCallback(async (canvasId: string) => {
    const response = await fetch(`/api/lean-canvas/${canvasId}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to delete canvas');
    }

    setCanvasList(prev => prev.filter(c => c.id !== canvasId));
  }, []);

  return {
    canvasList,
    isLoading,
    error,
    refetch: fetchCanvasList,
    createCanvas,
    deleteCanvas,
  };
}

// 個別キャンバス管理
export function useLeanCanvas(canvasId: string | null) {
  const [canvas, setCanvas] = useState<LeanCanvasWithBlocks | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCanvas = useCallback(async () => {
    if (!canvasId) {
      setCanvas(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/lean-canvas/${canvasId}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch canvas');
      }

      const data = await response.json();
      setCanvas(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [canvasId]);

  useEffect(() => {
    fetchCanvas();
  }, [fetchCanvas]);

  const updateCanvas = useCallback(async (updates: LeanCanvasUpdate) => {
    if (!canvasId) return;

    const response = await fetch(`/api/lean-canvas/${canvasId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error('Failed to update canvas');
    }

    const updated = await response.json();
    setCanvas(prev => prev ? { ...prev, ...updated } : null);
    return updated;
  }, [canvasId]);

  const updateBlock = useCallback(async (blockType: LeanCanvasBlockType, content: string[]) => {
    if (!canvasId) return;

    const response = await fetch(`/api/lean-canvas/${canvasId}/blocks/${blockType}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ content }),
    });

    if (!response.ok) {
      throw new Error('Failed to update block');
    }

    const updatedBlock = await response.json();

    // ローカルステート更新
    setCanvas(prev => {
      if (!prev) return null;
      const blocks = prev.blocks.map(b =>
        b.block_type === blockType ? { ...b, content: updatedBlock.content } : b
      );
      // もし存在しなければ追加
      if (!blocks.find(b => b.block_type === blockType)) {
        blocks.push(updatedBlock);
      }
      return { ...prev, blocks };
    });

    return updatedBlock;
  }, [canvasId]);

  // ブロックの内容を取得
  const getBlockContent = useCallback((blockType: LeanCanvasBlockType): string[] => {
    if (!canvas) return [];
    const block = canvas.blocks.find(b => b.block_type === blockType);
    return block?.content || [];
  }, [canvas]);

  // 入力済みブロック数
  const filledBlocksCount = canvas?.blocks.filter(b =>
    Array.isArray(b.content) && b.content.length > 0
  ).length || 0;

  return {
    canvas,
    isLoading,
    error,
    refetch: fetchCanvas,
    updateCanvas,
    updateBlock,
    getBlockContent,
    filledBlocksCount,
  };
}
```

### 確認ポイント

- [ ] `lib/hooks/useLeanCanvas.ts` が作成された
- [ ] `useLeanCanvasList` でキャンバス一覧管理ができる
- [ ] `useLeanCanvas` で個別キャンバス + ブロック管理ができる

---

## Step 5: UI コンポーネント作成

### 5.1 CSS Grid スタイル追加

**ファイル:** `app/globals.css` に追加

```css
/*
 * Lean Canvas Grid（Phase 16）
 */
.lean-canvas-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  grid-template-rows: repeat(3, minmax(150px, auto));
  gap: 12px;
}

.lean-canvas-grid .block-problem {
  grid-column: 1;
  grid-row: 1 / 3;
}

.lean-canvas-grid .block-solution {
  grid-column: 2;
  grid-row: 1;
}

.lean-canvas-grid .block-key-metrics {
  grid-column: 2;
  grid-row: 2;
}

.lean-canvas-grid .block-unique-value {
  grid-column: 3;
  grid-row: 1 / 3;
}

.lean-canvas-grid .block-unfair-advantage {
  grid-column: 4;
  grid-row: 1;
}

.lean-canvas-grid .block-channels {
  grid-column: 4;
  grid-row: 2;
}

.lean-canvas-grid .block-customer-segments {
  grid-column: 5;
  grid-row: 1 / 3;
}

.lean-canvas-grid .block-cost-structure {
  grid-column: 1 / 3;
  grid-row: 3;
}

.lean-canvas-grid .block-revenue-streams {
  grid-column: 3 / 6;
  grid-row: 3;
}

@media (max-width: 1024px) {
  .lean-canvas-grid {
    grid-template-columns: repeat(2, 1fr);
    grid-template-rows: repeat(9, minmax(120px, auto));
  }

  .lean-canvas-grid .block-problem,
  .lean-canvas-grid .block-solution,
  .lean-canvas-grid .block-unique-value,
  .lean-canvas-grid .block-unfair-advantage,
  .lean-canvas-grid .block-customer-segments,
  .lean-canvas-grid .block-key-metrics,
  .lean-canvas-grid .block-channels,
  .lean-canvas-grid .block-cost-structure,
  .lean-canvas-grid .block-revenue-streams {
    grid-column: auto;
    grid-row: auto;
  }
}
```

### 5.2 ブロック編集コンポーネント

**ファイル:** `components/lean-canvas/BlockEditor.tsx`

```typescript
'use client';

/**
 * components/lean-canvas/BlockEditor.tsx
 *
 * Lean Canvas ブロック編集コンポーネント
 */

import { useState, useEffect } from 'react';
import { Plus, X, GripVertical } from 'lucide-react';
import {
  LEAN_CANVAS_BLOCK_INFO,
  type LeanCanvasBlockType,
} from '@/lib/types/lean-canvas';

interface BlockEditorProps {
  blockType: LeanCanvasBlockType;
  content: string[];
  onSave: (content: string[]) => Promise<void>;
  className?: string;
}

export function BlockEditor({ blockType, content, onSave, className = '' }: BlockEditorProps) {
  const info = LEAN_CANVAS_BLOCK_INFO[blockType];
  const [items, setItems] = useState<string[]>(content);
  const [newItem, setNewItem] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // 親からの content が変わったら同期
  useEffect(() => {
    setItems(content);
  }, [content]);

  const handleAddItem = async () => {
    if (!newItem.trim()) return;

    const updatedItems = [...items, newItem.trim()];
    setItems(updatedItems);
    setNewItem('');

    setIsSaving(true);
    try {
      await onSave(updatedItems);
    } catch (err) {
      console.error('Failed to save:', err);
      setItems(items); // rollback
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveItem = async (index: number) => {
    const updatedItems = items.filter((_, i) => i !== index);
    setItems(updatedItems);

    setIsSaving(true);
    try {
      await onSave(updatedItems);
    } catch (err) {
      console.error('Failed to save:', err);
      setItems(items); // rollback
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddItem();
    }
  };

  return (
    <div
      className={`glass-card-light ${className}`}
      style={{
        padding: '16px',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderTop: `3px solid ${info.color}`,
      }}
    >
      {/* ヘッダー */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h3 style={{
            fontSize: '14px',
            fontWeight: 700,
            color: info.color,
            margin: 0,
          }}>
            {info.label}
          </h3>
          <span style={{
            fontSize: '11px',
            color: 'var(--text-muted)',
          }}>
            {info.labelEn}
          </span>
        </div>
        <p style={{
          fontSize: '11px',
          color: 'var(--text-muted)',
          margin: '4px 0 0 0',
        }}>
          {info.description}
        </p>
      </div>

      {/* アイテムリスト */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        marginBottom: '12px',
      }}>
        {items.length === 0 ? (
          <p style={{
            fontSize: '12px',
            color: 'var(--text-muted)',
            fontStyle: 'italic',
            padding: '8px 0',
          }}>
            {info.placeholder}
          </p>
        ) : (
          items.map((item, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 10px',
                background: 'var(--bg-gray)',
                borderRadius: '6px',
                fontSize: '13px',
              }}
            >
              <GripVertical size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />
              <span style={{ flex: 1, color: 'var(--text-dark)' }}>{item}</span>
              <button
                onClick={() => handleRemoveItem(index)}
                style={{
                  padding: '4px',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  flexShrink: 0,
                }}
              >
                <X size={14} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* 入力欄 */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          type="text"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="追加..."
          className="glass-input"
          style={{
            flex: 1,
            padding: '8px 10px',
            fontSize: '13px',
          }}
        />
        <button
          onClick={handleAddItem}
          disabled={!newItem.trim() || isSaving}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '8px',
            background: newItem.trim() ? info.color : 'var(--bg-gray)',
            color: newItem.trim() ? 'white' : 'var(--text-muted)',
            border: 'none',
            borderRadius: '6px',
            cursor: newItem.trim() ? 'pointer' : 'not-allowed',
          }}
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}
```

### 5.3 キャンバスグリッドコンポーネント

**ファイル:** `components/lean-canvas/CanvasGrid.tsx`

```typescript
'use client';

/**
 * components/lean-canvas/CanvasGrid.tsx
 *
 * Lean Canvas 9ブロックグリッド
 */

import { BlockEditor } from './BlockEditor';
import {
  LEAN_CANVAS_BLOCK_INFO,
  type LeanCanvasBlock,
  type LeanCanvasBlockType,
} from '@/lib/types/lean-canvas';

interface CanvasGridProps {
  blocks: LeanCanvasBlock[];
  onUpdateBlock: (blockType: LeanCanvasBlockType, content: string[]) => Promise<void>;
}

const GRID_BLOCKS: { type: LeanCanvasBlockType; className: string }[] = [
  { type: 'problem', className: 'block-problem' },
  { type: 'solution', className: 'block-solution' },
  { type: 'key_metrics', className: 'block-key-metrics' },
  { type: 'unique_value', className: 'block-unique-value' },
  { type: 'unfair_advantage', className: 'block-unfair-advantage' },
  { type: 'channels', className: 'block-channels' },
  { type: 'customer_segments', className: 'block-customer-segments' },
  { type: 'cost_structure', className: 'block-cost-structure' },
  { type: 'revenue_streams', className: 'block-revenue-streams' },
];

export function CanvasGrid({ blocks, onUpdateBlock }: CanvasGridProps) {
  const getBlockContent = (blockType: LeanCanvasBlockType): string[] => {
    const block = blocks.find(b => b.block_type === blockType);
    return Array.isArray(block?.content) ? block.content : [];
  };

  const filledCount = blocks.filter(b =>
    Array.isArray(b.content) && b.content.length > 0
  ).length;

  return (
    <div>
      {/* 進捗 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '16px',
      }}>
        <h2 style={{
          fontSize: '18px',
          fontWeight: 700,
          color: 'var(--text-dark)',
          margin: 0,
        }}>
          9ブロック
        </h2>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <div style={{
            width: '100px',
            height: '6px',
            background: 'var(--bg-gray)',
            borderRadius: '3px',
            overflow: 'hidden',
          }}>
            <div
              style={{
                width: `${(filledCount / 9) * 100}%`,
                height: '100%',
                background: filledCount === 9 ? 'var(--success)' : 'var(--primary)',
                transition: 'width 0.3s',
              }}
            />
          </div>
          <span style={{
            fontSize: '12px',
            fontWeight: 600,
            color: filledCount === 9 ? 'var(--success)' : 'var(--text-muted)',
          }}>
            {filledCount}/9
          </span>
        </div>
      </div>

      {/* グリッド */}
      <div className="lean-canvas-grid">
        {GRID_BLOCKS.map(({ type, className }) => (
          <BlockEditor
            key={type}
            blockType={type}
            content={getBlockContent(type)}
            onSave={(content) => onUpdateBlock(type, content)}
            className={className}
          />
        ))}
      </div>
    </div>
  );
}
```

### 5.4 カスタマージャーニーコンポーネント

**ファイル:** `components/lean-canvas/CustomerJourney.tsx`

```typescript
'use client';

/**
 * components/lean-canvas/CustomerJourney.tsx
 *
 * カスタマージャーニー可視化
 */

import { ArrowRight, Users, Lightbulb, Target, Heart, TrendingUp } from 'lucide-react';
import type { LeanCanvasBlock, LeanCanvasBlockType } from '@/lib/types/lean-canvas';

interface CustomerJourneyProps {
  blocks: LeanCanvasBlock[];
}

interface JourneyStep {
  icon: React.ReactNode;
  label: string;
  blockType: LeanCanvasBlockType;
  color: string;
}

const JOURNEY_STEPS: JourneyStep[] = [
  {
    icon: <Users size={20} />,
    label: '顧客セグメント',
    blockType: 'customer_segments',
    color: '#10b981',
  },
  {
    icon: <Lightbulb size={20} />,
    label: '課題認識',
    blockType: 'problem',
    color: '#ef4444',
  },
  {
    icon: <Target size={20} />,
    label: '価値提案',
    blockType: 'unique_value',
    color: '#8b5cf6',
  },
  {
    icon: <Heart size={20} />,
    label: 'チャネル',
    blockType: 'channels',
    color: '#ec4899',
  },
  {
    icon: <TrendingUp size={20} />,
    label: '収益化',
    blockType: 'revenue_streams',
    color: '#22c55e',
  },
];

export function CustomerJourney({ blocks }: CustomerJourneyProps) {
  const getBlockContent = (blockType: LeanCanvasBlockType): string[] => {
    const block = blocks.find(b => b.block_type === blockType);
    return Array.isArray(block?.content) ? block.content : [];
  };

  return (
    <div className="glass-card-light" style={{ padding: '24px' }}>
      <h2 style={{
        fontSize: '18px',
        fontWeight: 700,
        color: 'var(--text-dark)',
        margin: '0 0 20px 0',
      }}>
        カスタマージャーニー
      </h2>

      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '8px',
        overflowX: 'auto',
        paddingBottom: '8px',
      }}>
        {JOURNEY_STEPS.map((step, index) => {
          const content = getBlockContent(step.blockType);
          const hasContent = content.length > 0;

          return (
            <div key={step.blockType} style={{ display: 'flex', alignItems: 'flex-start' }}>
              {/* ステップ */}
              <div style={{
                minWidth: '160px',
                padding: '16px',
                background: hasContent ? `${step.color}10` : 'var(--bg-gray)',
                borderRadius: '12px',
                borderTop: `3px solid ${hasContent ? step.color : 'var(--border-light)'}`,
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '12px',
                  color: hasContent ? step.color : 'var(--text-muted)',
                }}>
                  {step.icon}
                  <span style={{
                    fontSize: '13px',
                    fontWeight: 600,
                  }}>
                    {step.label}
                  </span>
                </div>

                {hasContent ? (
                  <ul style={{
                    margin: 0,
                    paddingLeft: '16px',
                    fontSize: '12px',
                    color: 'var(--text-dark)',
                  }}>
                    {content.slice(0, 3).map((item, i) => (
                      <li key={i} style={{ marginBottom: '4px' }}>{item}</li>
                    ))}
                    {content.length > 3 && (
                      <li style={{ color: 'var(--text-muted)' }}>
                        +{content.length - 3} more
                      </li>
                    )}
                  </ul>
                ) : (
                  <p style={{
                    fontSize: '12px',
                    color: 'var(--text-muted)',
                    fontStyle: 'italic',
                    margin: 0,
                  }}>
                    未入力
                  </p>
                )}
              </div>

              {/* 矢印 */}
              {index < JOURNEY_STEPS.length - 1 && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 4px',
                  marginTop: '40px',
                }}>
                  <ArrowRight size={20} color="var(--text-muted)" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

### 確認ポイント

- [ ] `components/lean-canvas/BlockEditor.tsx` が作成された
- [ ] `components/lean-canvas/CanvasGrid.tsx` が作成された
- [ ] `components/lean-canvas/CustomerJourney.tsx` が作成された

---

## Step 6: Lean Canvas ページ作成

### 6.1 Lean Canvas ページ

**ファイル:** `app/(app)/lean-canvas/page.tsx`

```typescript
'use client';

/**
 * app/(app)/lean-canvas/page.tsx
 *
 * Lean Canvas ページ
 */

import { useState, useEffect } from 'react';
import { LayoutGrid, Plus, Trash2, ChevronRight } from 'lucide-react';
import { useBrands } from '@/lib/hooks/useBrand';
import { useLeanCanvasList, useLeanCanvas } from '@/lib/hooks/useLeanCanvas';
import { CanvasGrid } from '@/components/lean-canvas/CanvasGrid';
import { CustomerJourney } from '@/components/lean-canvas/CustomerJourney';

export default function LeanCanvasPage() {
  const { brands, isLoading: brandsLoading } = useBrands();
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const [selectedCanvasId, setSelectedCanvasId] = useState<string | null>(null);

  const { canvasList, isLoading: listLoading, createCanvas, deleteCanvas } = useLeanCanvasList(selectedBrandId || undefined);
  const { canvas, isLoading: canvasLoading, updateBlock } = useLeanCanvas(selectedCanvasId);

  // 最初のブランドを自動選択
  useEffect(() => {
    if (brands.length > 0 && !selectedBrandId) {
      setSelectedBrandId(brands[0].id);
    }
  }, [brands, selectedBrandId]);

  const handleCreateCanvas = async () => {
    if (!selectedBrandId) return;
    try {
      const newCanvas = await createCanvas({ brand_id: selectedBrandId });
      setSelectedCanvasId(newCanvas.id);
    } catch (err) {
      console.error('Failed to create canvas:', err);
    }
  };

  const handleDeleteCanvas = async (canvasId: string) => {
    if (!confirm('このキャンバスを削除しますか？')) return;
    try {
      await deleteCanvas(canvasId);
      if (selectedCanvasId === canvasId) {
        setSelectedCanvasId(null);
      }
    } catch (err) {
      console.error('Failed to delete canvas:', err);
    }
  };

  return (
    <div>
      {/* ヘッダー */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '24px',
      }}>
        <LayoutGrid size={28} color="var(--primary)" />
        <div>
          <h2 style={{
            fontSize: '24px',
            fontWeight: 700,
            color: 'var(--text-dark)',
            margin: 0,
          }}>
            Lean Canvas
          </h2>
          <p style={{
            fontSize: '14px',
            color: 'var(--text-muted)',
            margin: '4px 0 0 0',
          }}>
            ビジネスモデルを9ブロックで設計
          </p>
        </div>
      </div>

      {/* ブランド選択 */}
      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '20px',
        flexWrap: 'wrap',
      }}>
        {brandsLoading ? (
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>読み込み中...</p>
        ) : brands.length === 0 ? (
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
            まずブランドを作成してください
          </p>
        ) : (
          brands.map(brand => (
            <button
              key={brand.id}
              onClick={() => {
                setSelectedBrandId(brand.id);
                setSelectedCanvasId(null);
              }}
              style={{
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 500,
                background: selectedBrandId === brand.id ? 'var(--primary)' : 'var(--bg-gray)',
                color: selectedBrandId === brand.id ? 'white' : 'var(--text-dark)',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              {brand.name}
            </button>
          ))
        )}
      </div>

      {selectedBrandId && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '240px 1fr',
          gap: '24px',
        }}>
          {/* サイドバー: キャンバス一覧 */}
          <div>
            <button
              onClick={handleCreateCanvas}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                width: '100%',
                padding: '12px',
                marginBottom: '16px',
                fontSize: '14px',
                fontWeight: 500,
                background: 'var(--primary)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
              }}
            >
              <Plus size={16} />
              新規キャンバス
            </button>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {listLoading ? (
                <p style={{ fontSize: '14px', color: 'var(--text-muted)', padding: '16px' }}>
                  読み込み中...
                </p>
              ) : canvasList.length === 0 ? (
                <p style={{
                  fontSize: '14px',
                  color: 'var(--text-muted)',
                  padding: '16px',
                  textAlign: 'center',
                }}>
                  キャンバスがありません
                </p>
              ) : (
                canvasList.map(c => (
                  <div
                    key={c.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      background: selectedCanvasId === c.id ? 'var(--primary-alpha-10)' : 'white',
                      border: selectedCanvasId === c.id ? '1px solid var(--primary)' : '1px solid var(--border-light)',
                      borderRadius: '10px',
                      cursor: 'pointer',
                    }}
                    onClick={() => setSelectedCanvasId(c.id)}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontSize: '14px',
                        fontWeight: 600,
                        color: 'var(--text-dark)',
                        margin: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {c.title}
                      </p>
                      <p style={{
                        fontSize: '11px',
                        color: 'var(--text-muted)',
                        margin: '2px 0 0 0',
                      }}>
                        {new Date(c.created_at).toLocaleDateString('ja-JP')}
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCanvas(c.id);
                        }}
                        style={{
                          padding: '6px',
                          background: 'transparent',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          color: 'var(--text-muted)',
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                      <ChevronRight size={16} color="var(--text-muted)" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* メインコンテンツ */}
          <div>
            {!selectedCanvasId ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '60px',
                background: 'var(--bg-gray)',
                borderRadius: '16px',
                textAlign: 'center',
              }}>
                <LayoutGrid size={48} color="var(--text-muted)" style={{ opacity: 0.5, marginBottom: '16px' }} />
                <p style={{ fontSize: '16px', color: 'var(--text-muted)' }}>
                  キャンバスを選択または作成してください
                </p>
              </div>
            ) : canvasLoading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                読み込み中...
              </div>
            ) : canvas ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* カスタマージャーニー */}
                <CustomerJourney blocks={canvas.blocks} />

                {/* 9ブロックグリッド */}
                <CanvasGrid
                  blocks={canvas.blocks}
                  onUpdateBlock={updateBlock}
                />
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
```

### 6.2 ナビゲーション更新

**ファイル:** `app/(app)/layout.tsx` のナビゲーションに追加

```typescript
// import に追加
import { LayoutGrid } from 'lucide-react';

// NAV_ITEMS に追加
{ href: '/lean-canvas', label: 'Lean Canvas', icon: LayoutGrid },
```

### 確認ポイント

- [ ] `app/(app)/lean-canvas/page.tsx` が作成された
- [ ] ナビゲーションに Lean Canvas リンクが追加された

---

## Step 7: 型チェック & ビルド

```bash
# 型を再生成
supabase gen types typescript --project-id "$(grep NEXT_PUBLIC_SUPABASE_URL .env.local | cut -d'/' -f3 | cut -d'.' -f1)" > lib/supabase/database.types.ts

# lib/types/database.ts を更新（lib/supabase/database.types.ts をコピー後、型エイリアスを追加）

npm run type-check
npm run build
```

### 確認ポイント

- [ ] 型チェックがエラーなく完了
- [ ] ビルドがエラーなく完了

---

## Step 8: 動作確認

### 8.1 開発サーバー起動

```bash
npm run dev
```

### 8.2 確認項目

1. http://localhost:3000/lean-canvas にアクセス
2. 以下を確認:
   - [ ] ブランド選択ができる
   - [ ] キャンバス作成ができる
   - [ ] 9ブロックが正しいレイアウトで表示される
   - [ ] 各ブロックに箇条書きを追加できる
   - [ ] カスタマージャーニーが表示される
   - [ ] 編集内容が保存される

---

## Step 9: Git プッシュ

```bash
git add -A
git commit -m "Phase 16: Lean Canvas（リーンキャンバス）

- supabase/migrations: lean_canvas, lean_canvas_blocks テーブル + RLS
- lib/types/lean-canvas.ts: LeanCanvasBlockType(9種類) + LEAN_CANVAS_BLOCK_INFO
- app/api/lean-canvas: CRUD API Routes
- app/api/lean-canvas/[canvasId]/blocks/[blockType]: ブロック更新 API
- lib/hooks/useLeanCanvas.ts: useLeanCanvasList / useLeanCanvas Hooks
- components/lean-canvas/BlockEditor.tsx: ブロック編集
- components/lean-canvas/CanvasGrid.tsx: 9ブロックグリッド
- components/lean-canvas/CustomerJourney.tsx: ジャーニー可視化
- app/(app)/lean-canvas/page.tsx: Lean Canvas ページ
- CSS Grid レイアウト追加

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"

git push
```

---

## 完了チェックリスト

### データベース
- [ ] lean_canvas テーブル作成
- [ ] lean_canvas_blocks テーブル作成
- [ ] RLS ポリシー設定
- [ ] マイグレーション成功

### 型定義
- [ ] LeanCanvasBlockType（9種類）
- [ ] LeanCanvas / LeanCanvasBlock インターフェース
- [ ] LEAN_CANVAS_BLOCK_INFO（表示情報）

### API Routes
- [ ] `GET/POST /api/lean-canvas` 作成
- [ ] `GET/PATCH/DELETE /api/lean-canvas/:canvasId` 作成
- [ ] `PATCH /api/lean-canvas/:canvasId/blocks/:blockType` 作成

### React Hooks
- [ ] `useLeanCanvasList` 作成
- [ ] `useLeanCanvas` 作成
- [ ] ブロック取得・更新機能

### UI コンポーネント
- [ ] `BlockEditor` 作成（箇条書き編集）
- [ ] `CanvasGrid` 作成（9ブロックグリッド）
- [ ] `CustomerJourney` 作成（ジャーニー可視化）
- [ ] CSS Grid レイアウト適用

### 統合
- [ ] `/lean-canvas` ページ作成
- [ ] ナビゲーション更新
- [ ] 型チェック成功
- [ ] ビルド成功
- [ ] Git プッシュ完了

---

## 次のステップ（Phase 17 以降）

1. **製品セクション**
   - フロント/ミドル/バック商品の設計
   - 価格設定・提供形態

2. **AI 連携**
   - ブランド情報から Lean Canvas 自動生成
   - 競合分析・差別化提案

3. **エクスポート機能**
   - Canvas を PDF/画像でエクスポート
   - プレゼン用フォーマット
