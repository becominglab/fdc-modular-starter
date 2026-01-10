# Phase 15: 10ポイントブランド戦略

## 目標

ビジネスツールの第一弾として、10ポイントブランド戦略を実装：
- ブランドの基本情報（名前、タグライン、ストーリー）
- 10ポイント要素の編集
- ガイドライン表示
- トーン&マナーチェック

---

## 10ポイントブランド戦略とは

```
ブランドを10の観点から整理し、一貫性のあるブランド体験を設計します：

┌─────────────────────────────────────────────────────────────┐
│  1. Mission（ミッション）     - 存在意義・使命              │
│  2. Vision（ビジョン）        - 目指す未来像                │
│  3. Target Audience          - 誰のためのブランドか         │
│  4. Unique Value             - 提供する独自の価値           │
│  5. Brand Personality        - ブランドの人格・性格         │
│  6. Tone & Voice             - コミュニケーションの調子     │
│  7. Visual Identity          - 視覚的な表現ルール           │
│  8. Key Messages             - 伝えるべき核心メッセージ     │
│  9. Competitors              - 競合との位置づけ             │
│ 10. Differentiators          - 差別化ポイント               │
└─────────────────────────────────────────────────────────────┘

【フロー】
ブランド作成 → 10ポイント入力 → ガイドライン生成 → トンマナチェック
```

---

## 習得する新しい概念

| 概念 | 説明 |
|------|------|
| ブランド戦略 | 企業・製品のイメージを計画的に構築する戦略 |
| 10ポイント | ミッション、ビジョン、ターゲット、差別化など10項目で整理 |
| トーン&マナー | ブランドの「声」と「振る舞い」のルール |
| Glass morphism | すりガラス効果を使ったモダンUIデザイン |

---

## 前提条件

- [ ] Phase 1-14 完了
- [ ] Supabase + 認証が動作
- [ ] 開発サーバーが起動している

---

## Step 1: データベーススキーマ作成

### 1.1 マイグレーションファイル作成

**ファイル:** `supabase/migrations/20260110_phase15_brand.sql`

```sql
-- Phase 15: 10ポイントブランド戦略

-- =============================================
-- brands テーブル
-- =============================================
CREATE TABLE IF NOT EXISTS brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  tagline TEXT,
  story TEXT,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#3B82F6',
  secondary_color TEXT DEFAULT '#10B981',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_brands_user_id ON brands(user_id);

-- RLS 有効化
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;

-- RLS ポリシー
DROP POLICY IF EXISTS "Users can view own brands" ON brands;
CREATE POLICY "Users can view own brands" ON brands
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own brands" ON brands;
CREATE POLICY "Users can insert own brands" ON brands
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own brands" ON brands;
CREATE POLICY "Users can update own brands" ON brands
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own brands" ON brands;
CREATE POLICY "Users can delete own brands" ON brands
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- brand_points テーブル（10ポイント）
-- =============================================
CREATE TABLE IF NOT EXISTS brand_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  point_type TEXT NOT NULL CHECK (point_type IN (
    'mission', 'vision', 'target_audience', 'unique_value',
    'brand_personality', 'tone_voice', 'visual_identity',
    'key_messages', 'competitors', 'differentiators'
  )),
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(brand_id, point_type)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_brand_points_brand_id ON brand_points(brand_id);

-- RLS 有効化
ALTER TABLE brand_points ENABLE ROW LEVEL SECURITY;

-- RLS ポリシー（brands 経由で権限チェック）
DROP POLICY IF EXISTS "Users can view own brand points" ON brand_points;
CREATE POLICY "Users can view own brand points" ON brand_points
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM brands WHERE brands.id = brand_points.brand_id AND brands.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert own brand points" ON brand_points;
CREATE POLICY "Users can insert own brand points" ON brand_points
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM brands WHERE brands.id = brand_points.brand_id AND brands.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update own brand points" ON brand_points;
CREATE POLICY "Users can update own brand points" ON brand_points
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM brands WHERE brands.id = brand_points.brand_id AND brands.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete own brand points" ON brand_points;
CREATE POLICY "Users can delete own brand points" ON brand_points
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM brands WHERE brands.id = brand_points.brand_id AND brands.user_id = auth.uid())
  );

-- コメント
COMMENT ON TABLE brands IS 'ブランド基本情報';
COMMENT ON TABLE brand_points IS '10ポイントブランド戦略';
COMMENT ON COLUMN brand_points.point_type IS 'mission, vision, target_audience, unique_value, brand_personality, tone_voice, visual_identity, key_messages, competitors, differentiators';
```

### 1.2 マイグレーション実行

```bash
supabase db push
```

### 確認ポイント

- [ ] マイグレーションが成功した
- [ ] brands テーブルが作成された
- [ ] brand_points テーブルが作成された
- [ ] RLS ポリシーが設定された

---

## Step 2: 型定義の作成

### 2.1 ブランド型定義

**ファイル:** `lib/types/brand.ts`

```typescript
/**
 * lib/types/brand.ts
 *
 * 10ポイントブランド戦略の型定義
 */

// 10ポイントの種類
export type BrandPointType =
  | 'mission'
  | 'vision'
  | 'target_audience'
  | 'unique_value'
  | 'brand_personality'
  | 'tone_voice'
  | 'visual_identity'
  | 'key_messages'
  | 'competitors'
  | 'differentiators';

// ブランド基本情報
export interface Brand {
  id: string;
  user_id: string;
  name: string;
  tagline?: string | null;
  story?: string | null;
  logo_url?: string | null;
  primary_color?: string;
  secondary_color?: string;
  created_at: string;
  updated_at: string;
}

// ブランドポイント（10項目）
export interface BrandPoint {
  id: string;
  brand_id: string;
  point_type: BrandPointType;
  content: string;
  created_at: string;
  updated_at: string;
}

// ブランド作成用
export interface BrandCreate {
  name: string;
  tagline?: string;
  story?: string;
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
}

// ブランド更新用
export interface BrandUpdate {
  name?: string;
  tagline?: string | null;
  story?: string | null;
  logo_url?: string | null;
  primary_color?: string;
  secondary_color?: string;
}

// ポイント更新用
export interface BrandPointUpdate {
  content: string;
}

// 10ポイントの表示情報
export const BRAND_POINT_INFO: Record<BrandPointType, {
  label: string;
  labelEn: string;
  description: string;
  placeholder: string;
  icon: string;
  order: number;
}> = {
  mission: {
    label: 'ミッション',
    labelEn: 'Mission',
    description: 'ブランドの存在意義・使命',
    placeholder: '私たちは〇〇を通じて、△△を実現します',
    icon: '🎯',
    order: 1,
  },
  vision: {
    label: 'ビジョン',
    labelEn: 'Vision',
    description: '目指す未来像',
    placeholder: '〇〇年後、私たちは△△な世界を創ります',
    icon: '🔮',
    order: 2,
  },
  target_audience: {
    label: 'ターゲット',
    labelEn: 'Target Audience',
    description: '誰のためのブランドか',
    placeholder: '〇〇に悩む△△な人々',
    icon: '👥',
    order: 3,
  },
  unique_value: {
    label: '独自価値',
    labelEn: 'Unique Value',
    description: '提供する独自の価値',
    placeholder: '私たちだけが提供できる〇〇',
    icon: '💎',
    order: 4,
  },
  brand_personality: {
    label: 'ブランド人格',
    labelEn: 'Brand Personality',
    description: 'ブランドの人格・性格',
    placeholder: '信頼できる、革新的、親しみやすい...',
    icon: '🎭',
    order: 5,
  },
  tone_voice: {
    label: 'トーン&ボイス',
    labelEn: 'Tone & Voice',
    description: 'コミュニケーションの調子',
    placeholder: 'フレンドリーだが専門的、簡潔で明確...',
    icon: '🗣️',
    order: 6,
  },
  visual_identity: {
    label: 'ビジュアル',
    labelEn: 'Visual Identity',
    description: '視覚的な表現ルール',
    placeholder: 'ミニマル、モダン、温かみのある配色...',
    icon: '🎨',
    order: 7,
  },
  key_messages: {
    label: 'キーメッセージ',
    labelEn: 'Key Messages',
    description: '伝えるべき核心メッセージ',
    placeholder: '常に伝えたい3つのメッセージ',
    icon: '💬',
    order: 8,
  },
  competitors: {
    label: '競合分析',
    labelEn: 'Competitors',
    description: '競合との位置づけ',
    placeholder: '主要競合と私たちの違い',
    icon: '⚔️',
    order: 9,
  },
  differentiators: {
    label: '差別化',
    labelEn: 'Differentiators',
    description: '明確な差別化ポイント',
    placeholder: '競合にはない私たちだけの強み',
    icon: '🏆',
    order: 10,
  },
};

// ポイントタイプの配列（表示順）
export const BRAND_POINT_TYPES: BrandPointType[] = [
  'mission',
  'vision',
  'target_audience',
  'unique_value',
  'brand_personality',
  'tone_voice',
  'visual_identity',
  'key_messages',
  'competitors',
  'differentiators',
];
```

### 確認ポイント

- [ ] `lib/types/brand.ts` が作成された
- [ ] BrandPointType に10種類が定義されている
- [ ] BRAND_POINT_INFO に各ポイントの表示情報がある

---

## Step 3: API Routes 作成

### 3.1 ブランド CRUD API

**ファイル:** `app/api/brands/route.ts`

```typescript
/**
 * app/api/brands/route.ts
 *
 * GET /api/brands - ブランド一覧取得
 * POST /api/brands - ブランド作成
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const createBrandSchema = z.object({
  name: z.string().min(1, 'ブランド名は必須です'),
  tagline: z.string().optional(),
  story: z.string().optional(),
  logo_url: z.string().url().optional().or(z.literal('')),
  primary_color: z.string().optional(),
  secondary_color: z.string().optional(),
});

// GET: ブランド一覧取得
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('brands')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Brands fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch brands' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Brands GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: ブランド作成
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const result = createBrandSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', issues: result.error.issues },
        { status: 400 }
      );
    }

    // ブランド作成
    const { data: brand, error: createError } = await supabase
      .from('brands')
      .insert({
        ...result.data,
        user_id: user.id,
      })
      .select()
      .single();

    if (createError) {
      console.error('Brand create error:', createError);
      return NextResponse.json({ error: 'Failed to create brand' }, { status: 500 });
    }

    // 10ポイントの初期レコードを作成
    const pointTypes = [
      'mission', 'vision', 'target_audience', 'unique_value',
      'brand_personality', 'tone_voice', 'visual_identity',
      'key_messages', 'competitors', 'differentiators'
    ];

    const pointInserts = pointTypes.map(point_type => ({
      brand_id: brand.id,
      point_type,
      content: '',
    }));

    await supabase.from('brand_points').insert(pointInserts);

    return NextResponse.json(brand, { status: 201 });
  } catch (error) {
    console.error('Brands POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### 3.2 個別ブランド API

**ファイル:** `app/api/brands/[brandId]/route.ts`

```typescript
/**
 * app/api/brands/[brandId]/route.ts
 *
 * GET /api/brands/:brandId - ブランド詳細取得
 * PATCH /api/brands/:brandId - ブランド更新
 * DELETE /api/brands/:brandId - ブランド削除
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const updateBrandSchema = z.object({
  name: z.string().min(1).optional(),
  tagline: z.string().nullable().optional(),
  story: z.string().nullable().optional(),
  logo_url: z.string().url().optional().or(z.literal('')).nullable(),
  primary_color: z.string().optional(),
  secondary_color: z.string().optional(),
});

// GET: ブランド詳細取得（ポイント含む）
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ brandId: string }> }
) {
  try {
    const { brandId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ブランド取得
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('*')
      .eq('id', brandId)
      .eq('user_id', user.id)
      .single();

    if (brandError || !brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    // ポイント取得
    const { data: points, error: pointsError } = await supabase
      .from('brand_points')
      .select('*')
      .eq('brand_id', brandId)
      .order('point_type');

    if (pointsError) {
      console.error('Brand points fetch error:', pointsError);
    }

    return NextResponse.json({
      ...brand,
      points: points || [],
    });
  } catch (error) {
    console.error('Brand GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH: ブランド更新
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ brandId: string }> }
) {
  try {
    const { brandId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const result = updateBrandSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', issues: result.error.issues },
        { status: 400 }
      );
    }

    const { data: brand, error: updateError } = await supabase
      .from('brands')
      .update({
        ...result.data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', brandId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Brand update error:', updateError);
      return NextResponse.json({ error: 'Failed to update brand' }, { status: 500 });
    }

    return NextResponse.json(brand);
  } catch (error) {
    console.error('Brand PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE: ブランド削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ brandId: string }> }
) {
  try {
    const { brandId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error: deleteError } = await supabase
      .from('brands')
      .delete()
      .eq('id', brandId)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Brand delete error:', deleteError);
      return NextResponse.json({ error: 'Failed to delete brand' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Brand DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### 3.3 ブランドポイント更新 API

**ファイル:** `app/api/brands/[brandId]/points/[pointType]/route.ts`

```typescript
/**
 * app/api/brands/[brandId]/points/[pointType]/route.ts
 *
 * PATCH /api/brands/:brandId/points/:pointType - ポイント更新
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const updatePointSchema = z.object({
  content: z.string(),
});

const validPointTypes = [
  'mission', 'vision', 'target_audience', 'unique_value',
  'brand_personality', 'tone_voice', 'visual_identity',
  'key_messages', 'competitors', 'differentiators'
];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ brandId: string; pointType: string }> }
) {
  try {
    const { brandId, pointType } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!validPointTypes.includes(pointType)) {
      return NextResponse.json({ error: 'Invalid point type' }, { status: 400 });
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

    const body = await request.json();
    const result = updatePointSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', issues: result.error.issues },
        { status: 400 }
      );
    }

    // upsert（存在しなければ作成、あれば更新）
    const { data: point, error: upsertError } = await supabase
      .from('brand_points')
      .upsert({
        brand_id: brandId,
        point_type: pointType,
        content: result.data.content,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'brand_id,point_type',
      })
      .select()
      .single();

    if (upsertError) {
      console.error('Point upsert error:', upsertError);
      return NextResponse.json({ error: 'Failed to update point' }, { status: 500 });
    }

    return NextResponse.json(point);
  } catch (error) {
    console.error('Point PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### 確認ポイント

- [ ] `app/api/brands/route.ts` が作成された
- [ ] `app/api/brands/[brandId]/route.ts` が作成された
- [ ] `app/api/brands/[brandId]/points/[pointType]/route.ts` が作成された

---

## Step 4: React Hooks 作成

### 4.1 ブランド管理 Hook

**ファイル:** `lib/hooks/useBrand.ts`

```typescript
'use client';

/**
 * lib/hooks/useBrand.ts
 *
 * ブランド管理 Hook
 */

import { useState, useEffect, useCallback } from 'react';
import type { Brand, BrandPoint, BrandCreate, BrandUpdate, BrandPointType } from '@/lib/types/brand';

interface BrandWithPoints extends Brand {
  points: BrandPoint[];
}

export function useBrands() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBrands = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/brands', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch brands');
      }

      const data = await response.json();
      setBrands(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

  const createBrand = useCallback(async (input: BrandCreate) => {
    const response = await fetch('/api/brands', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to create brand');
    }

    const newBrand = await response.json();
    setBrands(prev => [newBrand, ...prev]);
    return newBrand;
  }, []);

  const deleteBrand = useCallback(async (brandId: string) => {
    const response = await fetch(`/api/brands/${brandId}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to delete brand');
    }

    setBrands(prev => prev.filter(b => b.id !== brandId));
  }, []);

  return {
    brands,
    isLoading,
    error,
    refetch: fetchBrands,
    createBrand,
    deleteBrand,
  };
}

export function useBrand(brandId: string | null) {
  const [brand, setBrand] = useState<BrandWithPoints | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBrand = useCallback(async () => {
    if (!brandId) {
      setBrand(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/brands/${brandId}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch brand');
      }

      const data = await response.json();
      setBrand(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [brandId]);

  useEffect(() => {
    fetchBrand();
  }, [fetchBrand]);

  const updateBrand = useCallback(async (updates: BrandUpdate) => {
    if (!brandId) return;

    const response = await fetch(`/api/brands/${brandId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error('Failed to update brand');
    }

    const updated = await response.json();
    setBrand(prev => prev ? { ...prev, ...updated } : null);
    return updated;
  }, [brandId]);

  const updatePoint = useCallback(async (pointType: BrandPointType, content: string) => {
    if (!brandId) return;

    const response = await fetch(`/api/brands/${brandId}/points/${pointType}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ content }),
    });

    if (!response.ok) {
      throw new Error('Failed to update point');
    }

    const updatedPoint = await response.json();

    // ローカルステート更新
    setBrand(prev => {
      if (!prev) return null;
      const points = prev.points.map(p =>
        p.point_type === pointType ? updatedPoint : p
      );
      // もし存在しなければ追加
      if (!points.find(p => p.point_type === pointType)) {
        points.push(updatedPoint);
      }
      return { ...prev, points };
    });

    return updatedPoint;
  }, [brandId]);

  // ポイントを取得するヘルパー
  const getPoint = useCallback((pointType: BrandPointType): string => {
    if (!brand) return '';
    const point = brand.points.find(p => p.point_type === pointType);
    return point?.content || '';
  }, [brand]);

  // 入力済みポイント数
  const filledPointsCount = brand?.points.filter(p => p.content.trim() !== '').length || 0;

  return {
    brand,
    isLoading,
    error,
    refetch: fetchBrand,
    updateBrand,
    updatePoint,
    getPoint,
    filledPointsCount,
  };
}
```

### 確認ポイント

- [ ] `lib/hooks/useBrand.ts` が作成された
- [ ] `useBrands` でブランド一覧管理ができる
- [ ] `useBrand` で個別ブランド + ポイント管理ができる

---

## Step 5: UI コンポーネント作成

### 5.1 Glass morphism スタイル

**ファイル:** `app/globals.css` に追加

```css
/* Glass morphism */
.glass-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
}

.glass-card-light {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 16px;
}

.glass-input {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  transition: all 0.2s;
}

.glass-input:focus {
  background: rgba(255, 255, 255, 0.95);
  border-color: var(--primary);
  outline: none;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}
```

### 5.2 ブランドプロファイルコンポーネント

**ファイル:** `components/brand/BrandProfile.tsx`

```typescript
'use client';

/**
 * components/brand/BrandProfile.tsx
 *
 * ブランド基本情報表示・編集
 */

import { useState } from 'react';
import { Edit2, Save, X } from 'lucide-react';
import type { Brand, BrandUpdate } from '@/lib/types/brand';

interface BrandProfileProps {
  brand: Brand;
  onUpdate: (updates: BrandUpdate) => Promise<void>;
}

export function BrandProfile({ brand, onUpdate }: BrandProfileProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(brand.name);
  const [tagline, setTagline] = useState(brand.tagline || '');
  const [story, setStory] = useState(brand.story || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdate({ name, tagline, story });
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to save:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setName(brand.name);
    setTagline(brand.tagline || '');
    setStory(brand.story || '');
    setIsEditing(false);
  };

  return (
    <div className="glass-card-light" style={{ padding: '24px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '20px',
      }}>
        <h2 style={{
          fontSize: '20px',
          fontWeight: 700,
          color: 'var(--text-dark)',
          margin: 0,
        }}>
          ブランドプロファイル
        </h2>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              fontSize: '13px',
              background: 'var(--primary)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            <Edit2 size={14} />
            編集
          </button>
        ) : (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleCancel}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 12px',
                fontSize: '13px',
                background: 'var(--bg-gray)',
                color: 'var(--text-dark)',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              <X size={14} />
              キャンセル
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 12px',
                fontSize: '13px',
                background: 'var(--success)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: isSaving ? 'not-allowed' : 'pointer',
                opacity: isSaving ? 0.7 : 1,
              }}
            >
              <Save size={14} />
              {isSaving ? '保存中...' : '保存'}
            </button>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* ブランド名 */}
        <div>
          <label style={{
            display: 'block',
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--text-muted)',
            marginBottom: '6px',
          }}>
            ブランド名
          </label>
          {isEditing ? (
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="glass-input"
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '16px',
                fontWeight: 600,
              }}
            />
          ) : (
            <p style={{
              fontSize: '24px',
              fontWeight: 700,
              color: 'var(--text-dark)',
              margin: 0,
            }}>
              {brand.name}
            </p>
          )}
        </div>

        {/* タグライン */}
        <div>
          <label style={{
            display: 'block',
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--text-muted)',
            marginBottom: '6px',
          }}>
            タグライン
          </label>
          {isEditing ? (
            <input
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="ブランドを一言で表すフレーズ"
              className="glass-input"
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '14px',
              }}
            />
          ) : (
            <p style={{
              fontSize: '16px',
              color: brand.tagline ? 'var(--text-dark)' : 'var(--text-muted)',
              margin: 0,
              fontStyle: brand.tagline ? 'normal' : 'italic',
            }}>
              {brand.tagline || '未設定'}
            </p>
          )}
        </div>

        {/* ストーリー */}
        <div>
          <label style={{
            display: 'block',
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--text-muted)',
            marginBottom: '6px',
          }}>
            ブランドストーリー
          </label>
          {isEditing ? (
            <textarea
              value={story}
              onChange={(e) => setStory(e.target.value)}
              placeholder="ブランドの背景や想いを記述"
              className="glass-input"
              rows={4}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '14px',
                resize: 'vertical',
              }}
            />
          ) : (
            <p style={{
              fontSize: '14px',
              color: brand.story ? 'var(--text-dark)' : 'var(--text-muted)',
              margin: 0,
              lineHeight: 1.6,
              fontStyle: brand.story ? 'normal' : 'italic',
              whiteSpace: 'pre-wrap',
            }}>
              {brand.story || '未設定'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
```

### 5.3 10ポイント編集コンポーネント

**ファイル:** `components/brand/BrandPoints.tsx`

```typescript
'use client';

/**
 * components/brand/BrandPoints.tsx
 *
 * 10ポイントブランド戦略編集
 */

import { useState } from 'react';
import { ChevronDown, ChevronUp, Check, Circle } from 'lucide-react';
import {
  BRAND_POINT_INFO,
  BRAND_POINT_TYPES,
  type BrandPoint,
  type BrandPointType,
} from '@/lib/types/brand';

interface BrandPointsProps {
  points: BrandPoint[];
  onUpdatePoint: (pointType: BrandPointType, content: string) => Promise<void>;
}

interface PointCardProps {
  pointType: BrandPointType;
  content: string;
  onSave: (content: string) => Promise<void>;
}

function PointCard({ pointType, content, onSave }: PointCardProps) {
  const info = BRAND_POINT_INFO[pointType];
  const [isExpanded, setIsExpanded] = useState(false);
  const [editContent, setEditContent] = useState(content);
  const [isSaving, setIsSaving] = useState(false);
  const hasContent = content.trim() !== '';

  const handleSave = async () => {
    if (editContent === content) return;
    setIsSaving(true);
    try {
      await onSave(editContent);
    } catch (err) {
      console.error('Failed to save point:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="glass-card-light"
      style={{
        overflow: 'hidden',
        transition: 'all 0.2s',
      }}
    >
      {/* ヘッダー */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '20px' }}>{info.icon}</span>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{
                fontSize: '15px',
                fontWeight: 600,
                color: 'var(--text-dark)',
                margin: 0,
              }}>
                {info.label}
              </h3>
              <span style={{
                fontSize: '12px',
                color: 'var(--text-muted)',
              }}>
                {info.labelEn}
              </span>
            </div>
            <p style={{
              fontSize: '12px',
              color: 'var(--text-muted)',
              margin: '2px 0 0 0',
            }}>
              {info.description}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {hasContent ? (
            <Check size={16} color="var(--success)" />
          ) : (
            <Circle size={16} color="var(--text-muted)" />
          )}
          {isExpanded ? (
            <ChevronUp size={20} color="var(--text-muted)" />
          ) : (
            <ChevronDown size={20} color="var(--text-muted)" />
          )}
        </div>
      </button>

      {/* 展開エリア */}
      {isExpanded && (
        <div style={{
          padding: '0 20px 20px 20px',
          borderTop: '1px solid var(--border-light)',
        }}>
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            onBlur={handleSave}
            placeholder={info.placeholder}
            className="glass-input"
            rows={4}
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '14px',
              marginTop: '16px',
              resize: 'vertical',
            }}
          />
          {isSaving && (
            <p style={{
              fontSize: '12px',
              color: 'var(--text-muted)',
              marginTop: '8px',
            }}>
              保存中...
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function BrandPoints({ points, onUpdatePoint }: BrandPointsProps) {
  const filledCount = points.filter(p => p.content.trim() !== '').length;

  const getPointContent = (pointType: BrandPointType): string => {
    const point = points.find(p => p.point_type === pointType);
    return point?.content || '';
  };

  return (
    <div>
      {/* 進捗 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '20px',
      }}>
        <h2 style={{
          fontSize: '20px',
          fontWeight: 700,
          color: 'var(--text-dark)',
          margin: 0,
        }}>
          10ポイント戦略
        </h2>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <div style={{
            width: '120px',
            height: '8px',
            background: 'var(--bg-gray)',
            borderRadius: '4px',
            overflow: 'hidden',
          }}>
            <div
              style={{
                width: `${(filledCount / 10) * 100}%`,
                height: '100%',
                background: filledCount === 10 ? 'var(--success)' : 'var(--primary)',
                transition: 'width 0.3s',
              }}
            />
          </div>
          <span style={{
            fontSize: '13px',
            fontWeight: 600,
            color: filledCount === 10 ? 'var(--success)' : 'var(--text-muted)',
          }}>
            {filledCount}/10
          </span>
        </div>
      </div>

      {/* ポイント一覧 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {BRAND_POINT_TYPES.map(pointType => (
          <PointCard
            key={pointType}
            pointType={pointType}
            content={getPointContent(pointType)}
            onSave={(content) => onUpdatePoint(pointType, content)}
          />
        ))}
      </div>
    </div>
  );
}
```

### 5.4 トーン&マナーチェックコンポーネント

**ファイル:** `components/brand/TonmanaCheck.tsx`

```typescript
'use client';

/**
 * components/brand/TonmanaCheck.tsx
 *
 * トーン&マナー一貫性チェック
 */

import { useState } from 'react';
import { MessageSquare, CheckCircle2, AlertTriangle, Sparkles } from 'lucide-react';
import type { BrandPoint, BrandPointType } from '@/lib/types/brand';

interface TonmanaCheckProps {
  brandName: string;
  points: BrandPoint[];
}

interface CheckResult {
  score: number;
  feedback: string[];
  suggestions: string[];
}

export function TonmanaCheck({ brandName, points }: TonmanaCheckProps) {
  const [inputText, setInputText] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<CheckResult | null>(null);

  const getPointContent = (type: BrandPointType): string => {
    return points.find(p => p.point_type === type)?.content || '';
  };

  const toneVoice = getPointContent('tone_voice');
  const brandPersonality = getPointContent('brand_personality');
  const keyMessages = getPointContent('key_messages');

  const handleCheck = () => {
    if (!inputText.trim()) return;

    setIsChecking(true);

    // シンプルなルールベースチェック
    setTimeout(() => {
      const feedback: string[] = [];
      const suggestions: string[] = [];
      let score = 70; // ベーススコア

      // 長さチェック
      if (inputText.length < 20) {
        feedback.push('テキストが短すぎます');
        score -= 10;
      }

      // ブランド名含有チェック
      if (inputText.includes(brandName)) {
        feedback.push('ブランド名が含まれています');
        score += 5;
      }

      // トーン&ボイスキーワードチェック
      if (toneVoice) {
        const toneKeywords = toneVoice.split(/[、,，\s]+/).filter(k => k.length > 1);
        const matchedTone = toneKeywords.filter(k => inputText.includes(k));
        if (matchedTone.length > 0) {
          feedback.push(`トーンキーワード「${matchedTone.join('」「')}」が反映されています`);
          score += matchedTone.length * 3;
        } else {
          suggestions.push(`トーン「${toneVoice}」を意識した表現を検討してください`);
        }
      }

      // ブランド人格チェック
      if (brandPersonality) {
        const personalityKeywords = brandPersonality.split(/[、,，\s]+/).filter(k => k.length > 1);
        const matchedPersonality = personalityKeywords.filter(k => inputText.includes(k));
        if (matchedPersonality.length > 0) {
          feedback.push(`ブランド人格「${matchedPersonality.join('」「')}」が表現されています`);
          score += matchedPersonality.length * 3;
        }
      }

      // キーメッセージチェック
      if (keyMessages) {
        const messageKeywords = keyMessages.split(/[、,，\n]+/).filter(k => k.length > 2);
        const matchedMessages = messageKeywords.filter(k => inputText.includes(k));
        if (matchedMessages.length > 0) {
          feedback.push(`キーメッセージが含まれています`);
          score += 10;
        } else {
          suggestions.push('キーメッセージの要素を含めることを検討してください');
        }
      }

      // スコア調整
      score = Math.min(100, Math.max(0, score));

      if (feedback.length === 0) {
        feedback.push('基本的なチェックを通過しました');
      }

      setResult({ score, feedback, suggestions });
      setIsChecking(false);
    }, 500);
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'var(--success)';
    if (score >= 60) return 'var(--warning, #f59e0b)';
    return 'var(--error)';
  };

  return (
    <div className="glass-card-light" style={{ padding: '24px' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '20px',
      }}>
        <MessageSquare size={24} color="var(--primary)" />
        <div>
          <h2 style={{
            fontSize: '20px',
            fontWeight: 700,
            color: 'var(--text-dark)',
            margin: 0,
          }}>
            トーン&マナーチェック
          </h2>
          <p style={{
            fontSize: '13px',
            color: 'var(--text-muted)',
            margin: '4px 0 0 0',
          }}>
            テキストがブランドガイドラインに沿っているかチェック
          </p>
        </div>
      </div>

      {/* 必要なポイントの確認 */}
      {(!toneVoice && !brandPersonality) && (
        <div style={{
          padding: '12px 16px',
          background: 'var(--warning, #fef3c7)',
          borderRadius: '8px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <AlertTriangle size={16} color="var(--warning, #f59e0b)" />
          <p style={{ fontSize: '13px', color: 'var(--text-dark)', margin: 0 }}>
            「トーン&ボイス」と「ブランド人格」を設定すると、より正確なチェックができます
          </p>
        </div>
      )}

      {/* 入力エリア */}
      <div style={{ marginBottom: '16px' }}>
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="チェックしたいテキストを入力してください（例：SNS投稿、メール文面、広告コピーなど）"
          className="glass-input"
          rows={5}
          style={{
            width: '100%',
            padding: '12px',
            fontSize: '14px',
            resize: 'vertical',
          }}
        />
      </div>

      {/* チェックボタン */}
      <button
        onClick={handleCheck}
        disabled={!inputText.trim() || isChecking}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          width: '100%',
          padding: '12px',
          fontSize: '14px',
          fontWeight: 600,
          background: inputText.trim() ? 'var(--primary)' : 'var(--bg-gray)',
          color: inputText.trim() ? 'white' : 'var(--text-muted)',
          border: 'none',
          borderRadius: '8px',
          cursor: inputText.trim() ? 'pointer' : 'not-allowed',
        }}
      >
        <Sparkles size={16} />
        {isChecking ? 'チェック中...' : 'チェックする'}
      </button>

      {/* 結果表示 */}
      {result && (
        <div style={{
          marginTop: '20px',
          padding: '16px',
          background: 'var(--bg-gray)',
          borderRadius: '12px',
        }}>
          {/* スコア */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              border: `4px solid ${getScoreColor(result.score)}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
            }}>
              <span style={{
                fontSize: '24px',
                fontWeight: 700,
                color: getScoreColor(result.score),
              }}>
                {result.score}
              </span>
              <span style={{
                fontSize: '10px',
                color: 'var(--text-muted)',
              }}>
                / 100
              </span>
            </div>
          </div>

          {/* フィードバック */}
          {result.feedback.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <h4 style={{
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--text-dark)',
                marginBottom: '8px',
              }}>
                <CheckCircle2 size={14} style={{ marginRight: '6px', color: 'var(--success)' }} />
                良い点
              </h4>
              <ul style={{
                margin: 0,
                paddingLeft: '20px',
                fontSize: '13px',
                color: 'var(--text-muted)',
              }}>
                {result.feedback.map((f, i) => (
                  <li key={i} style={{ marginBottom: '4px' }}>{f}</li>
                ))}
              </ul>
            </div>
          )}

          {/* 改善提案 */}
          {result.suggestions.length > 0 && (
            <div>
              <h4 style={{
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--text-dark)',
                marginBottom: '8px',
              }}>
                <Sparkles size={14} style={{ marginRight: '6px', color: 'var(--primary)' }} />
                改善提案
              </h4>
              <ul style={{
                margin: 0,
                paddingLeft: '20px',
                fontSize: '13px',
                color: 'var(--text-muted)',
              }}>
                {result.suggestions.map((s, i) => (
                  <li key={i} style={{ marginBottom: '4px' }}>{s}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

### 確認ポイント

- [ ] `components/brand/BrandProfile.tsx` が作成された
- [ ] `components/brand/BrandPoints.tsx` が作成された
- [ ] `components/brand/TonmanaCheck.tsx` が作成された

---

## Step 6: ブランドページ作成

### 6.1 ブランド一覧・詳細ページ

**ファイル:** `app/(app)/brand/page.tsx`

```typescript
'use client';

/**
 * app/(app)/brand/page.tsx
 *
 * ブランド戦略ページ
 */

import { useState } from 'react';
import { Palette, Plus, Trash2, ChevronRight } from 'lucide-react';
import { useBrands, useBrand } from '@/lib/hooks/useBrand';
import { BrandProfile } from '@/components/brand/BrandProfile';
import { BrandPoints } from '@/components/brand/BrandPoints';
import { TonmanaCheck } from '@/components/brand/TonmanaCheck';

export default function BrandPage() {
  const { brands, isLoading: brandsLoading, createBrand, deleteBrand } = useBrands();
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');

  const { brand, isLoading: brandLoading, updateBrand, updatePoint } = useBrand(selectedBrandId);

  const handleCreateBrand = async () => {
    if (!newBrandName.trim()) return;
    setIsCreating(true);
    try {
      const newBrand = await createBrand({ name: newBrandName.trim() });
      setSelectedBrandId(newBrand.id);
      setNewBrandName('');
    } catch (err) {
      console.error('Failed to create brand:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteBrand = async (brandId: string) => {
    if (!confirm('このブランドを削除しますか？')) return;
    try {
      await deleteBrand(brandId);
      if (selectedBrandId === brandId) {
        setSelectedBrandId(null);
      }
    } catch (err) {
      console.error('Failed to delete brand:', err);
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
        <Palette size={28} color="var(--primary)" />
        <div>
          <h2 style={{
            fontSize: '24px',
            fontWeight: 700,
            color: 'var(--text-dark)',
            margin: 0,
          }}>
            ブランド戦略
          </h2>
          <p style={{
            fontSize: '14px',
            color: 'var(--text-muted)',
            margin: '4px 0 0 0',
          }}>
            10ポイントでブランドを整理
          </p>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '280px 1fr',
        gap: '24px',
      }}>
        {/* サイドバー: ブランド一覧 */}
        <div>
          {/* 新規作成 */}
          <div style={{
            marginBottom: '16px',
            padding: '16px',
            background: 'var(--bg-gray)',
            borderRadius: '12px',
          }}>
            <input
              type="text"
              value={newBrandName}
              onChange={(e) => setNewBrandName(e.target.value)}
              placeholder="新しいブランド名"
              className="glass-input"
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: '14px',
                marginBottom: '8px',
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateBrand();
              }}
            />
            <button
              onClick={handleCreateBrand}
              disabled={!newBrandName.trim() || isCreating}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                width: '100%',
                padding: '10px',
                fontSize: '14px',
                fontWeight: 500,
                background: newBrandName.trim() ? 'var(--primary)' : 'var(--border-light)',
                color: newBrandName.trim() ? 'white' : 'var(--text-muted)',
                border: 'none',
                borderRadius: '8px',
                cursor: newBrandName.trim() ? 'pointer' : 'not-allowed',
              }}
            >
              <Plus size={16} />
              {isCreating ? '作成中...' : '作成'}
            </button>
          </div>

          {/* ブランド一覧 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {brandsLoading ? (
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', padding: '16px' }}>
                読み込み中...
              </p>
            ) : brands.length === 0 ? (
              <p style={{
                fontSize: '14px',
                color: 'var(--text-muted)',
                padding: '16px',
                textAlign: 'center',
              }}>
                ブランドがありません
              </p>
            ) : (
              brands.map(b => (
                <div
                  key={b.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    background: selectedBrandId === b.id ? 'var(--primary-alpha-10)' : 'white',
                    border: selectedBrandId === b.id ? '1px solid var(--primary)' : '1px solid var(--border-light)',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onClick={() => setSelectedBrandId(b.id)}
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
                      {b.name}
                    </p>
                    {b.tagline && (
                      <p style={{
                        fontSize: '12px',
                        color: 'var(--text-muted)',
                        margin: '2px 0 0 0',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {b.tagline}
                      </p>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteBrand(b.id);
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
          {!selectedBrandId ? (
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
              <Palette size={48} color="var(--text-muted)" style={{ opacity: 0.5, marginBottom: '16px' }} />
              <p style={{ fontSize: '16px', color: 'var(--text-muted)' }}>
                ブランドを選択または作成してください
              </p>
            </div>
          ) : brandLoading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              読み込み中...
            </div>
          ) : brand ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* プロファイル */}
              <BrandProfile brand={brand} onUpdate={updateBrand} />

              {/* 10ポイント */}
              <BrandPoints points={brand.points} onUpdatePoint={updatePoint} />

              {/* トンマナチェック */}
              <TonmanaCheck brandName={brand.name} points={brand.points} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
```

### 6.2 ナビゲーション更新

**ファイル:** `app/(app)/layout.tsx` のナビゲーションに追加

```typescript
// import に追加
import { Palette } from 'lucide-react';

// NAV_ITEMS に追加
{ href: '/brand', label: 'ブランド', icon: Palette },
```

### 確認ポイント

- [ ] `app/(app)/brand/page.tsx` が作成された
- [ ] ナビゲーションにブランドリンクが追加された

---

## Step 7: 型チェック & ビルド

```bash
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

1. http://localhost:3000/brand にアクセス
2. 以下を確認:
   - [ ] ブランド作成ができる
   - [ ] 10ポイントの展開・編集ができる
   - [ ] 編集内容が保存される
   - [ ] トーン&マナーチェックが動作する
   - [ ] Glass morphism スタイルが適用されている

---

## Step 9: Git プッシュ

```bash
git add -A
git commit -m "Phase 15: 10ポイントブランド戦略

- supabase/migrations: brands, brand_points テーブル + RLS
- lib/types/brand.ts: BrandPointType(10種類) + BRAND_POINT_INFO
- app/api/brands: CRUD API Routes
- app/api/brands/[brandId]/points/[pointType]: ポイント更新 API
- lib/hooks/useBrand.ts: useBrands / useBrand Hooks
- components/brand/BrandProfile.tsx: 基本情報編集
- components/brand/BrandPoints.tsx: 10ポイント編集（アコーディオン）
- components/brand/TonmanaCheck.tsx: トーン&マナーチェック
- app/(app)/brand/page.tsx: ブランドページ
- Glass morphism スタイル追加

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"

git push
```

---

## 完了チェックリスト

### データベース
- [ ] brands テーブル作成
- [ ] brand_points テーブル作成
- [ ] RLS ポリシー設定
- [ ] マイグレーション成功

### 型定義
- [ ] BrandPointType（10種類）
- [ ] Brand / BrandPoint インターフェース
- [ ] BRAND_POINT_INFO（表示情報）

### API Routes
- [ ] `GET/POST /api/brands` 作成
- [ ] `GET/PATCH/DELETE /api/brands/:brandId` 作成
- [ ] `PATCH /api/brands/:brandId/points/:pointType` 作成

### React Hooks
- [ ] `useBrands` 作成
- [ ] `useBrand` 作成
- [ ] ポイント取得・更新機能

### UI コンポーネント
- [ ] `BrandProfile` 作成
- [ ] `BrandPoints`（アコーディオン）作成
- [ ] `TonmanaCheck` 作成
- [ ] Glass morphism スタイル適用

### 統合
- [ ] `/brand` ページ作成
- [ ] ナビゲーション更新
- [ ] 型チェック成功
- [ ] ビルド成功
- [ ] Git プッシュ完了

---

## 次のステップ（Phase 16 以降）

1. **AI 連携**
   - Claude API でトンマナチェック強化
   - ブランドメッセージ生成支援

2. **ビジュアルアイデンティティ**
   - カラーパレット設定
   - ロゴアップロード
   - プレビュー機能

3. **エクスポート機能**
   - ブランドガイドラインPDF生成
   - ブランドアセット一括ダウンロード
