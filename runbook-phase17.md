# Phase 17: 製品セクション（フロント/ミドル/バック）

## 目標

ビジネスツール第三弾として、製品セクション設計機能を実装：
- フロント商品（集客・認知）
- ミドル商品（信頼構築）
- バック商品（収益の柱）
- 製品間の導線設計
- 価格・提供形態の管理

---

## 製品セクションとは

```
サービスビジネスにおける3層の商品設計フレームワーク。

┌─────────────────────────────────────────────────────────────────┐
│                     フロント商品（Front-end）                    │
│  目的: 集客・認知獲得                                            │
│  価格: 無料〜低価格                                              │
│  例: 無料セミナー、お試し相談、サンプル、無料コンテンツ           │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                     ミドル商品（Middle-end）                     │
│  目的: 信頼構築・関係性構築                                      │
│  価格: 中価格帯                                                  │
│  例: 単発コンサル、ワークショップ、エントリー講座                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                     バック商品（Back-end）                       │
│  目的: 収益の柱・長期関係                                        │
│  価格: 高価格帯                                                  │
│  例: 年間コンサル、継続サービス、プレミアムプラン                 │
└─────────────────────────────────────────────────────────────────┘

【フロー】
ブランド選択 → 製品セクション作成 → 3層商品設計 → 導線確認
```

---

## 習得する新しい概念

| 概念 | 説明 |
|------|------|
| 製品セクション | フロント/ミドル/バックの3層構造 |
| 商品導線 | 顧客が辿る商品購入の流れ |
| 価格設計 | 各層の適切な価格帯設定 |
| 提供形態 | オンライン/オフライン/ハイブリッド |

---

## 前提条件

- [ ] Phase 16 完了（Lean Canvas 動作）
- [ ] Supabase + 認証が動作
- [ ] 開発サーバーが起動している

---

## Step 1: データベーススキーマ作成

### 1.1 マイグレーションファイル作成

**ファイル:** `supabase/migrations/20260113_phase17_product_sections.sql`

```sql
-- Phase 17: 製品セクション（フロント/ミドル/バック）

-- =============================================
-- product_sections テーブル（製品セクション）
-- =============================================
CREATE TABLE IF NOT EXISTS product_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '製品セクション',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_product_sections_brand_id ON product_sections(brand_id);
CREATE INDEX IF NOT EXISTS idx_product_sections_user_id ON product_sections(user_id);

-- RLS 有効化
ALTER TABLE product_sections ENABLE ROW LEVEL SECURITY;

-- RLS ポリシー
DROP POLICY IF EXISTS "Users can view own product sections" ON product_sections;
CREATE POLICY "Users can view own product sections" ON product_sections
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own product sections" ON product_sections;
CREATE POLICY "Users can insert own product sections" ON product_sections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own product sections" ON product_sections;
CREATE POLICY "Users can update own product sections" ON product_sections
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own product sections" ON product_sections;
CREATE POLICY "Users can delete own product sections" ON product_sections
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- products テーブル（個別商品）
-- =============================================
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES product_sections(id) ON DELETE CASCADE,
  tier TEXT NOT NULL CHECK (tier IN ('front', 'middle', 'back')),
  name TEXT NOT NULL,
  description TEXT,
  price_type TEXT NOT NULL DEFAULT 'fixed' CHECK (price_type IN ('free', 'fixed', 'range', 'custom')),
  price_min INTEGER,
  price_max INTEGER,
  price_label TEXT,
  delivery_type TEXT NOT NULL DEFAULT 'online' CHECK (delivery_type IN ('online', 'offline', 'hybrid')),
  duration TEXT,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  target_audience TEXT,
  conversion_goal TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_flagship BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_products_section_id ON products(section_id);
CREATE INDEX IF NOT EXISTS idx_products_tier ON products(tier);

-- RLS 有効化
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- RLS ポリシー（product_sections 経由で権限チェック）
DROP POLICY IF EXISTS "Users can view own products" ON products;
CREATE POLICY "Users can view own products" ON products
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM product_sections WHERE product_sections.id = products.section_id AND product_sections.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert own products" ON products;
CREATE POLICY "Users can insert own products" ON products
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM product_sections WHERE product_sections.id = products.section_id AND product_sections.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update own products" ON products;
CREATE POLICY "Users can update own products" ON products
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM product_sections WHERE product_sections.id = products.section_id AND product_sections.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete own products" ON products;
CREATE POLICY "Users can delete own products" ON products
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM product_sections WHERE product_sections.id = products.section_id AND product_sections.user_id = auth.uid())
  );

-- コメント
COMMENT ON TABLE product_sections IS '製品セクション（フロント/ミドル/バック商品群）';
COMMENT ON TABLE products IS '個別商品';
COMMENT ON COLUMN products.tier IS 'front=フロント商品, middle=ミドル商品, back=バック商品';
COMMENT ON COLUMN products.price_type IS 'free=無料, fixed=固定価格, range=価格帯, custom=要相談';
COMMENT ON COLUMN products.delivery_type IS 'online=オンライン, offline=オフライン, hybrid=ハイブリッド';
COMMENT ON COLUMN products.features IS '商品の特徴・含まれるもの（JSON配列）';
COMMENT ON COLUMN products.is_flagship IS 'その層の主力商品かどうか';
```

### 1.2 マイグレーション実行

```bash
supabase db push
```

### 確認ポイント

- [ ] マイグレーションが成功した
- [ ] product_sections テーブルが作成された
- [ ] products テーブルが作成された
- [ ] RLS ポリシーが設定された

---

## Step 2: 型定義の作成

### 2.1 製品セクション型定義

**ファイル:** `lib/types/product-section.ts`

```typescript
/**
 * lib/types/product-section.ts
 *
 * 製品セクション（フロント/ミドル/バック）の型定義
 */

// 商品層
export type ProductTier = 'front' | 'middle' | 'back';

// 価格タイプ
export type PriceType = 'free' | 'fixed' | 'range' | 'custom';

// 提供形態
export type DeliveryType = 'online' | 'offline' | 'hybrid';

// 製品セクション
export interface ProductSection {
  id: string;
  brand_id: string;
  user_id: string;
  title: string;
  description?: string | null;
  created_at: string;
  updated_at: string;
}

// 商品
export interface Product {
  id: string;
  section_id: string;
  tier: ProductTier;
  name: string;
  description?: string | null;
  price_type: PriceType;
  price_min?: number | null;
  price_max?: number | null;
  price_label?: string | null;
  delivery_type: DeliveryType;
  duration?: string | null;
  features: string[];
  target_audience?: string | null;
  conversion_goal?: string | null;
  sort_order: number;
  is_flagship: boolean;
  created_at: string;
  updated_at: string;
}

// セクション作成用
export interface ProductSectionCreate {
  brand_id: string;
  title?: string;
  description?: string;
}

// セクション更新用
export interface ProductSectionUpdate {
  title?: string;
  description?: string | null;
}

// 商品作成用
export interface ProductCreate {
  section_id: string;
  tier: ProductTier;
  name: string;
  description?: string;
  price_type?: PriceType;
  price_min?: number;
  price_max?: number;
  price_label?: string;
  delivery_type?: DeliveryType;
  duration?: string;
  features?: string[];
  target_audience?: string;
  conversion_goal?: string;
  is_flagship?: boolean;
}

// 商品更新用
export interface ProductUpdate {
  name?: string;
  description?: string | null;
  price_type?: PriceType;
  price_min?: number | null;
  price_max?: number | null;
  price_label?: string | null;
  delivery_type?: DeliveryType;
  duration?: string | null;
  features?: string[];
  target_audience?: string | null;
  conversion_goal?: string | null;
  sort_order?: number;
  is_flagship?: boolean;
}

// 層ごとの表示情報
export const PRODUCT_TIER_INFO: Record<ProductTier, {
  label: string;
  labelEn: string;
  description: string;
  purpose: string;
  priceRange: string;
  examples: string[];
  color: string;
  icon: string;
}> = {
  front: {
    label: 'フロント商品',
    labelEn: 'Front-end',
    description: '集客・認知獲得のための商品',
    purpose: '見込み客を集める',
    priceRange: '無料〜低価格',
    examples: ['無料セミナー', 'お試し相談', 'サンプル', '無料コンテンツ'],
    color: '#3b82f6',
    icon: 'megaphone',
  },
  middle: {
    label: 'ミドル商品',
    labelEn: 'Middle-end',
    description: '信頼構築・関係性構築のための商品',
    purpose: '信頼を築く',
    priceRange: '中価格帯',
    examples: ['単発コンサル', 'ワークショップ', 'エントリー講座'],
    color: '#8b5cf6',
    icon: 'handshake',
  },
  back: {
    label: 'バック商品',
    labelEn: 'Back-end',
    description: '収益の柱となる主力商品',
    purpose: '収益を上げる',
    priceRange: '高価格帯',
    examples: ['年間コンサル', '継続サービス', 'プレミアムプラン'],
    color: '#f59e0b',
    icon: 'crown',
  },
};

// 価格タイプの表示情報
export const PRICE_TYPE_INFO: Record<PriceType, {
  label: string;
  description: string;
}> = {
  free: { label: '無料', description: '無料で提供' },
  fixed: { label: '固定価格', description: '決まった価格' },
  range: { label: '価格帯', description: '最低〜最高の範囲' },
  custom: { label: '要相談', description: 'カスタム見積もり' },
};

// 提供形態の表示情報
export const DELIVERY_TYPE_INFO: Record<DeliveryType, {
  label: string;
  description: string;
}> = {
  online: { label: 'オンライン', description: 'オンラインで提供' },
  offline: { label: 'オフライン', description: '対面で提供' },
  hybrid: { label: 'ハイブリッド', description: 'オンライン+対面' },
};

// 層の順序
export const PRODUCT_TIERS: ProductTier[] = ['front', 'middle', 'back'];
```

### 確認ポイント

- [ ] `lib/types/product-section.ts` が作成された
- [ ] ProductTier に3種類が定義されている
- [ ] PRODUCT_TIER_INFO に各層の表示情報がある

---

## Step 3: API Routes 作成

### 3.1 製品セクション CRUD API

**ファイル:** `app/api/product-sections/route.ts`

```typescript
/**
 * app/api/product-sections/route.ts
 *
 * GET /api/product-sections - セクション一覧取得（brandId でフィルタ可）
 * POST /api/product-sections - セクション作成
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const createSectionSchema = z.object({
  brand_id: z.string().uuid('有効なブランドIDを指定してください'),
  title: z.string().optional(),
  description: z.string().optional(),
});

// GET: セクション一覧取得
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
      .from('product_sections')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (brandId) {
      query = query.eq('brand_id', brandId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Product sections fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch sections' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Product sections GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: セクション作成
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const result = createSectionSchema.safeParse(body);

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

    // セクション作成
    const { data: section, error: createError } = await supabase
      .from('product_sections')
      .insert({
        brand_id: result.data.brand_id,
        user_id: user.id,
        title: result.data.title || '製品セクション',
        description: result.data.description,
      })
      .select()
      .single();

    if (createError) {
      console.error('Section create error:', createError);
      return NextResponse.json({ error: 'Failed to create section' }, { status: 500 });
    }

    return NextResponse.json(section, { status: 201 });
  } catch (error) {
    console.error('Product sections POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### 3.2 個別セクション API

**ファイル:** `app/api/product-sections/[sectionId]/route.ts`

```typescript
/**
 * app/api/product-sections/[sectionId]/route.ts
 *
 * GET /api/product-sections/:sectionId - セクション詳細取得
 * PATCH /api/product-sections/:sectionId - セクション更新
 * DELETE /api/product-sections/:sectionId - セクション削除
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const updateSectionSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
});

// GET: セクション詳細取得（商品含む）
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sectionId: string }> }
) {
  try {
    const { sectionId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // セクション取得
    const { data: section, error: sectionError } = await supabase
      .from('product_sections')
      .select('*')
      .eq('id', sectionId)
      .eq('user_id', user.id)
      .single();

    if (sectionError || !section) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 });
    }

    // 商品取得
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*')
      .eq('section_id', sectionId)
      .order('tier')
      .order('sort_order');

    if (productsError) {
      console.error('Products fetch error:', productsError);
    }

    return NextResponse.json({
      ...section,
      products: products || [],
    });
  } catch (error) {
    console.error('Section GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH: セクション更新
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ sectionId: string }> }
) {
  try {
    const { sectionId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const result = updateSectionSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', issues: result.error.issues },
        { status: 400 }
      );
    }

    const { data: section, error: updateError } = await supabase
      .from('product_sections')
      .update({
        ...result.data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sectionId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Section update error:', updateError);
      return NextResponse.json({ error: 'Failed to update section' }, { status: 500 });
    }

    return NextResponse.json(section);
  } catch (error) {
    console.error('Section PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE: セクション削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sectionId: string }> }
) {
  try {
    const { sectionId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error: deleteError } = await supabase
      .from('product_sections')
      .delete()
      .eq('id', sectionId)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Section delete error:', deleteError);
      return NextResponse.json({ error: 'Failed to delete section' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Section DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### 3.3 商品 CRUD API

**ファイル:** `app/api/product-sections/[sectionId]/products/route.ts`

```typescript
/**
 * app/api/product-sections/[sectionId]/products/route.ts
 *
 * GET /api/product-sections/:sectionId/products - 商品一覧取得
 * POST /api/product-sections/:sectionId/products - 商品作成
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const createProductSchema = z.object({
  tier: z.enum(['front', 'middle', 'back']),
  name: z.string().min(1, '商品名を入力してください'),
  description: z.string().optional(),
  price_type: z.enum(['free', 'fixed', 'range', 'custom']).optional(),
  price_min: z.number().optional(),
  price_max: z.number().optional(),
  price_label: z.string().optional(),
  delivery_type: z.enum(['online', 'offline', 'hybrid']).optional(),
  duration: z.string().optional(),
  features: z.array(z.string()).optional(),
  target_audience: z.string().optional(),
  conversion_goal: z.string().optional(),
  is_flagship: z.boolean().optional(),
});

// GET: 商品一覧取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sectionId: string }> }
) {
  try {
    const { sectionId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // セクション所有者確認
    const { data: section } = await supabase
      .from('product_sections')
      .select('id')
      .eq('id', sectionId)
      .eq('user_id', user.id)
      .single();

    if (!section) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const tier = searchParams.get('tier');

    let query = supabase
      .from('products')
      .select('*')
      .eq('section_id', sectionId)
      .order('tier')
      .order('sort_order');

    if (tier) {
      query = query.eq('tier', tier);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Products fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Products GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: 商品作成
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sectionId: string }> }
) {
  try {
    const { sectionId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // セクション所有者確認
    const { data: section } = await supabase
      .from('product_sections')
      .select('id')
      .eq('id', sectionId)
      .eq('user_id', user.id)
      .single();

    if (!section) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 });
    }

    const body = await request.json();
    const result = createProductSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', issues: result.error.issues },
        { status: 400 }
      );
    }

    // 同じ層の最大sort_orderを取得
    const { data: maxOrder } = await supabase
      .from('products')
      .select('sort_order')
      .eq('section_id', sectionId)
      .eq('tier', result.data.tier)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single();

    const sortOrder = (maxOrder?.sort_order ?? -1) + 1;

    const { data: product, error: createError } = await supabase
      .from('products')
      .insert({
        section_id: sectionId,
        ...result.data,
        features: result.data.features || [],
        sort_order: sortOrder,
      })
      .select()
      .single();

    if (createError) {
      console.error('Product create error:', createError);
      return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
    }

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error('Products POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### 3.4 個別商品 API

**ファイル:** `app/api/products/[productId]/route.ts`

```typescript
/**
 * app/api/products/[productId]/route.ts
 *
 * GET /api/products/:productId - 商品詳細取得
 * PATCH /api/products/:productId - 商品更新
 * DELETE /api/products/:productId - 商品削除
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const updateProductSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  price_type: z.enum(['free', 'fixed', 'range', 'custom']).optional(),
  price_min: z.number().nullable().optional(),
  price_max: z.number().nullable().optional(),
  price_label: z.string().nullable().optional(),
  delivery_type: z.enum(['online', 'offline', 'hybrid']).optional(),
  duration: z.string().nullable().optional(),
  features: z.array(z.string()).optional(),
  target_audience: z.string().nullable().optional(),
  conversion_goal: z.string().nullable().optional(),
  sort_order: z.number().optional(),
  is_flagship: z.boolean().optional(),
});

// GET: 商品詳細取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: product, error } = await supabase
      .from('products')
      .select(`
        *,
        product_sections!inner(user_id)
      `)
      .eq('id', productId)
      .eq('product_sections.user_id', user.id)
      .single();

    if (error || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error('Product GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH: 商品更新
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 商品所有者確認
    const { data: existing } = await supabase
      .from('products')
      .select(`
        id,
        product_sections!inner(user_id)
      `)
      .eq('id', productId)
      .eq('product_sections.user_id', user.id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const body = await request.json();
    const result = updateProductSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', issues: result.error.issues },
        { status: 400 }
      );
    }

    const { data: product, error: updateError } = await supabase
      .from('products')
      .update({
        ...result.data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', productId)
      .select()
      .single();

    if (updateError) {
      console.error('Product update error:', updateError);
      return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error('Product PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE: 商品削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 商品所有者確認
    const { data: existing } = await supabase
      .from('products')
      .select(`
        id,
        product_sections!inner(user_id)
      `)
      .eq('id', productId)
      .eq('product_sections.user_id', user.id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const { error: deleteError } = await supabase
      .from('products')
      .delete()
      .eq('id', productId);

    if (deleteError) {
      console.error('Product delete error:', deleteError);
      return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Product DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### 確認ポイント

- [ ] `app/api/product-sections/route.ts` が作成された
- [ ] `app/api/product-sections/[sectionId]/route.ts` が作成された
- [ ] `app/api/product-sections/[sectionId]/products/route.ts` が作成された
- [ ] `app/api/products/[productId]/route.ts` が作成された

---

## Step 4: React Hooks 作成

### 4.1 製品セクション管理 Hook

**ファイル:** `lib/hooks/useProductSection.ts`

```typescript
/**
 * lib/hooks/useProductSection.ts
 *
 * 製品セクション管理用カスタムフック
 */

import { useState, useEffect, useCallback } from 'react';
import type {
  ProductSection,
  Product,
  ProductSectionCreate,
  ProductSectionUpdate,
  ProductCreate,
  ProductUpdate,
  ProductTier,
} from '@/lib/types/product-section';

// セクション + 商品
interface ProductSectionWithProducts extends ProductSection {
  products: Product[];
}

// セクション一覧管理
export function useProductSectionList(brandId?: string) {
  const [sections, setSections] = useState<ProductSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSections = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const url = brandId
        ? `/api/product-sections?brandId=${brandId}`
        : '/api/product-sections';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch sections');
      const data = await res.json();
      setSections(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [brandId]);

  useEffect(() => {
    fetchSections();
  }, [fetchSections]);

  const createSection = async (input: ProductSectionCreate): Promise<ProductSection | null> => {
    try {
      const res = await fetch('/api/product-sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error('Failed to create section');
      const section = await res.json();
      setSections(prev => [section, ...prev]);
      return section;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    }
  };

  const deleteSection = async (sectionId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/product-sections/${sectionId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete section');
      setSections(prev => prev.filter(s => s.id !== sectionId));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  };

  return {
    sections,
    loading,
    error,
    refetch: fetchSections,
    createSection,
    deleteSection,
  };
}

// 個別セクション管理
export function useProductSection(sectionId: string | null) {
  const [section, setSection] = useState<ProductSectionWithProducts | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSection = useCallback(async () => {
    if (!sectionId) {
      setSection(null);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/product-sections/${sectionId}`);
      if (!res.ok) throw new Error('Failed to fetch section');
      const data = await res.json();
      setSection(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [sectionId]);

  useEffect(() => {
    fetchSection();
  }, [fetchSection]);

  const updateSection = async (input: ProductSectionUpdate): Promise<boolean> => {
    if (!sectionId) return false;
    try {
      const res = await fetch(`/api/product-sections/${sectionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error('Failed to update section');
      const updated = await res.json();
      setSection(prev => prev ? { ...prev, ...updated } : null);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  };

  const addProduct = async (input: Omit<ProductCreate, 'section_id'>): Promise<Product | null> => {
    if (!sectionId) return null;
    try {
      const res = await fetch(`/api/product-sections/${sectionId}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...input, section_id: sectionId }),
      });
      if (!res.ok) throw new Error('Failed to create product');
      const product = await res.json();
      setSection(prev => {
        if (!prev) return null;
        return { ...prev, products: [...prev.products, product] };
      });
      return product;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    }
  };

  const updateProduct = async (productId: string, input: ProductUpdate): Promise<boolean> => {
    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error('Failed to update product');
      const updated = await res.json();
      setSection(prev => {
        if (!prev) return null;
        const products = prev.products.map(p => p.id === productId ? updated : p);
        return { ...prev, products };
      });
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  };

  const deleteProduct = async (productId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete product');
      setSection(prev => {
        if (!prev) return null;
        const products = prev.products.filter(p => p.id !== productId);
        return { ...prev, products };
      });
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  };

  // 層ごとの商品を取得
  const getProductsByTier = (tier: ProductTier): Product[] => {
    if (!section) return [];
    return section.products
      .filter(p => p.tier === tier)
      .sort((a, b) => a.sort_order - b.sort_order);
  };

  return {
    section,
    loading,
    error,
    refetch: fetchSection,
    updateSection,
    addProduct,
    updateProduct,
    deleteProduct,
    getProductsByTier,
  };
}
```

### 確認ポイント

- [ ] `lib/hooks/useProductSection.ts` が作成された
- [ ] `useProductSectionList` でセクション一覧管理ができる
- [ ] `useProductSection` で個別セクション + 商品管理ができる

---

## Step 5: UI コンポーネント作成

### 5.1 商品カードコンポーネント

**ファイル:** `components/product-section/ProductCard.tsx`

```typescript
'use client';

/**
 * components/product-section/ProductCard.tsx
 *
 * 商品カードコンポーネント
 */

import { useState } from 'react';
import { Edit2, Trash2, Star, ExternalLink } from 'lucide-react';
import type { Product } from '@/lib/types/product-section';
import { PRODUCT_TIER_INFO, PRICE_TYPE_INFO, DELIVERY_TYPE_INFO } from '@/lib/types/product-section';

interface ProductCardProps {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (productId: string) => void;
}

export function ProductCard({ product, onEdit, onDelete }: ProductCardProps) {
  const tierInfo = PRODUCT_TIER_INFO[product.tier];
  const priceInfo = PRICE_TYPE_INFO[product.price_type];
  const deliveryInfo = DELIVERY_TYPE_INFO[product.delivery_type];

  const formatPrice = () => {
    if (product.price_type === 'free') return '無料';
    if (product.price_type === 'custom') return '要相談';
    if (product.price_type === 'range') {
      const min = product.price_min?.toLocaleString() || '?';
      const max = product.price_max?.toLocaleString() || '?';
      return `¥${min}〜¥${max}`;
    }
    if (product.price_min) {
      return `¥${product.price_min.toLocaleString()}`;
    }
    return product.price_label || '未設定';
  };

  return (
    <div
      className="product-card"
      style={{
        '--tier-color': tierInfo.color,
      } as React.CSSProperties}
    >
      <div className="card-header">
        <div className="card-title-row">
          {product.is_flagship && (
            <Star size={14} className="flagship-icon" />
          )}
          <h4 className="card-title">{product.name}</h4>
        </div>
        <div className="card-actions">
          <button onClick={() => onEdit(product)} className="btn-icon" title="編集">
            <Edit2 size={14} />
          </button>
          <button
            onClick={() => onDelete(product.id)}
            className="btn-icon btn-danger"
            title="削除"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {product.description && (
        <p className="card-description">{product.description}</p>
      )}

      <div className="card-meta">
        <span className="meta-price">{formatPrice()}</span>
        <span className="meta-delivery">{deliveryInfo.label}</span>
        {product.duration && (
          <span className="meta-duration">{product.duration}</span>
        )}
      </div>

      {product.features.length > 0 && (
        <ul className="card-features">
          {product.features.slice(0, 3).map((feature, i) => (
            <li key={i}>{feature}</li>
          ))}
          {product.features.length > 3 && (
            <li className="more">+{product.features.length - 3} more</li>
          )}
        </ul>
      )}

      {product.conversion_goal && (
        <div className="card-goal">
          <ExternalLink size={12} />
          <span>{product.conversion_goal}</span>
        </div>
      )}
    </div>
  );
}
```

### 5.2 層ごとの商品リストコンポーネント

**ファイル:** `components/product-section/TierSection.tsx`

```typescript
'use client';

/**
 * components/product-section/TierSection.tsx
 *
 * 層（フロント/ミドル/バック）ごとの商品セクション
 */

import { Plus, Megaphone, Handshake, Crown } from 'lucide-react';
import type { Product, ProductTier } from '@/lib/types/product-section';
import { PRODUCT_TIER_INFO } from '@/lib/types/product-section';
import { ProductCard } from './ProductCard';

interface TierSectionProps {
  tier: ProductTier;
  products: Product[];
  onAddProduct: (tier: ProductTier) => void;
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
}

const TIER_ICONS = {
  front: Megaphone,
  middle: Handshake,
  back: Crown,
};

export function TierSection({
  tier,
  products,
  onAddProduct,
  onEditProduct,
  onDeleteProduct,
}: TierSectionProps) {
  const info = PRODUCT_TIER_INFO[tier];
  const Icon = TIER_ICONS[tier];

  return (
    <div
      className="tier-section"
      style={{ '--tier-color': info.color } as React.CSSProperties}
    >
      <div className="tier-header">
        <div className="tier-title">
          <Icon size={20} className="tier-icon" />
          <div>
            <h3>{info.label}</h3>
            <span className="tier-label-en">{info.labelEn}</span>
          </div>
        </div>
        <div className="tier-meta">
          <span className="tier-purpose">{info.purpose}</span>
          <span className="tier-price-range">{info.priceRange}</span>
        </div>
      </div>

      <p className="tier-description">{info.description}</p>

      <div className="tier-products">
        {products.length === 0 ? (
          <div className="tier-empty">
            <p>商品がありません</p>
            <p className="tier-examples">
              例: {info.examples.join('、')}
            </p>
          </div>
        ) : (
          products.map(product => (
            <ProductCard
              key={product.id}
              product={product}
              onEdit={onEditProduct}
              onDelete={onDeleteProduct}
            />
          ))
        )}
      </div>

      <button
        onClick={() => onAddProduct(tier)}
        className="tier-add-button"
      >
        <Plus size={16} />
        {info.label}を追加
      </button>
    </div>
  );
}
```

### 5.3 商品導線フローコンポーネント

**ファイル:** `components/product-section/ProductFlow.tsx`

```typescript
'use client';

/**
 * components/product-section/ProductFlow.tsx
 *
 * 商品導線フロー表示コンポーネント
 */

import { ArrowDown, Megaphone, Handshake, Crown, Users, DollarSign } from 'lucide-react';
import type { Product, ProductTier } from '@/lib/types/product-section';
import { PRODUCT_TIER_INFO } from '@/lib/types/product-section';

interface ProductFlowProps {
  getProductsByTier: (tier: ProductTier) => Product[];
}

export function ProductFlow({ getProductsByTier }: ProductFlowProps) {
  const frontProducts = getProductsByTier('front');
  const middleProducts = getProductsByTier('middle');
  const backProducts = getProductsByTier('back');

  const getFlagship = (products: Product[]) =>
    products.find(p => p.is_flagship) || products[0];

  return (
    <div className="product-flow">
      <h3 className="flow-title">商品導線</h3>

      <div className="flow-container">
        {/* 見込み客 */}
        <div className="flow-step flow-entry">
          <div className="step-icon">
            <Users size={24} />
          </div>
          <div className="step-content">
            <span className="step-label">見込み客</span>
          </div>
        </div>

        <ArrowDown className="flow-arrow" size={20} />

        {/* フロント */}
        <div
          className="flow-step"
          style={{ '--step-color': PRODUCT_TIER_INFO.front.color } as React.CSSProperties}
        >
          <div className="step-icon">
            <Megaphone size={24} />
          </div>
          <div className="step-content">
            <span className="step-label">フロント商品</span>
            {frontProducts.length > 0 ? (
              <span className="step-product">{getFlagship(frontProducts)?.name}</span>
            ) : (
              <span className="step-empty">未設定</span>
            )}
            <span className="step-count">{frontProducts.length}件</span>
          </div>
        </div>

        <ArrowDown className="flow-arrow" size={20} />

        {/* ミドル */}
        <div
          className="flow-step"
          style={{ '--step-color': PRODUCT_TIER_INFO.middle.color } as React.CSSProperties}
        >
          <div className="step-icon">
            <Handshake size={24} />
          </div>
          <div className="step-content">
            <span className="step-label">ミドル商品</span>
            {middleProducts.length > 0 ? (
              <span className="step-product">{getFlagship(middleProducts)?.name}</span>
            ) : (
              <span className="step-empty">未設定</span>
            )}
            <span className="step-count">{middleProducts.length}件</span>
          </div>
        </div>

        <ArrowDown className="flow-arrow" size={20} />

        {/* バック */}
        <div
          className="flow-step"
          style={{ '--step-color': PRODUCT_TIER_INFO.back.color } as React.CSSProperties}
        >
          <div className="step-icon">
            <Crown size={24} />
          </div>
          <div className="step-content">
            <span className="step-label">バック商品</span>
            {backProducts.length > 0 ? (
              <span className="step-product">{getFlagship(backProducts)?.name}</span>
            ) : (
              <span className="step-empty">未設定</span>
            )}
            <span className="step-count">{backProducts.length}件</span>
          </div>
        </div>

        <ArrowDown className="flow-arrow" size={20} />

        {/* 収益 */}
        <div className="flow-step flow-revenue">
          <div className="step-icon">
            <DollarSign size={24} />
          </div>
          <div className="step-content">
            <span className="step-label">収益化</span>
          </div>
        </div>
      </div>
    </div>
  );
}
```

### 5.4 商品編集モーダル

**ファイル:** `components/product-section/ProductEditModal.tsx`

```typescript
'use client';

/**
 * components/product-section/ProductEditModal.tsx
 *
 * 商品編集モーダル
 */

import { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import type { Product, ProductTier, ProductCreate, ProductUpdate } from '@/lib/types/product-section';
import { PRODUCT_TIER_INFO, PRICE_TYPE_INFO, DELIVERY_TYPE_INFO } from '@/lib/types/product-section';

interface ProductEditModalProps {
  product?: Product | null;
  tier?: ProductTier;
  onSave: (data: Omit<ProductCreate, 'section_id'> | ProductUpdate) => Promise<void>;
  onClose: () => void;
}

export function ProductEditModal({ product, tier, onSave, onClose }: ProductEditModalProps) {
  const isEdit = !!product;
  const currentTier = product?.tier || tier || 'front';
  const tierInfo = PRODUCT_TIER_INFO[currentTier];

  const [name, setName] = useState(product?.name || '');
  const [description, setDescription] = useState(product?.description || '');
  const [priceType, setPriceType] = useState(product?.price_type || 'fixed');
  const [priceMin, setPriceMin] = useState(product?.price_min?.toString() || '');
  const [priceMax, setPriceMax] = useState(product?.price_max?.toString() || '');
  const [priceLabel, setPriceLabel] = useState(product?.price_label || '');
  const [deliveryType, setDeliveryType] = useState(product?.delivery_type || 'online');
  const [duration, setDuration] = useState(product?.duration || '');
  const [features, setFeatures] = useState<string[]>(product?.features || []);
  const [newFeature, setNewFeature] = useState('');
  const [targetAudience, setTargetAudience] = useState(product?.target_audience || '');
  const [conversionGoal, setConversionGoal] = useState(product?.conversion_goal || '');
  const [isFlagship, setIsFlagship] = useState(product?.is_flagship || false);
  const [saving, setSaving] = useState(false);

  const handleAddFeature = () => {
    if (!newFeature.trim()) return;
    setFeatures([...features, newFeature.trim()]);
    setNewFeature('');
  };

  const handleRemoveFeature = (index: number) => {
    setFeatures(features.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    try {
      const data: Omit<ProductCreate, 'section_id'> | ProductUpdate = {
        name: name.trim(),
        description: description.trim() || null,
        price_type: priceType as ProductCreate['price_type'],
        price_min: priceMin ? parseInt(priceMin) : null,
        price_max: priceMax ? parseInt(priceMax) : null,
        price_label: priceLabel.trim() || null,
        delivery_type: deliveryType as ProductCreate['delivery_type'],
        duration: duration.trim() || null,
        features,
        target_audience: targetAudience.trim() || null,
        conversion_goal: conversionGoal.trim() || null,
        is_flagship: isFlagship,
      };

      if (!isEdit) {
        (data as ProductCreate).tier = currentTier;
      }

      await onSave(data);
      onClose();
    } catch (err) {
      console.error('Save error:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content product-edit-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header" style={{ borderColor: tierInfo.color }}>
          <h2>{isEdit ? '商品を編集' : `${tierInfo.label}を追加`}</h2>
          <button onClick={onClose} className="btn-close">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          {/* 商品名 */}
          <div className="form-group">
            <label>商品名 *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="例: 無料相談会"
              required
            />
          </div>

          {/* 説明 */}
          <div className="form-group">
            <label>説明</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="商品の概要を入力"
              rows={3}
            />
          </div>

          {/* 価格設定 */}
          <div className="form-row">
            <div className="form-group">
              <label>価格タイプ</label>
              <select value={priceType} onChange={e => setPriceType(e.target.value)}>
                {Object.entries(PRICE_TYPE_INFO).map(([key, info]) => (
                  <option key={key} value={key}>{info.label}</option>
                ))}
              </select>
            </div>

            {priceType === 'fixed' && (
              <div className="form-group">
                <label>価格（円）</label>
                <input
                  type="number"
                  value={priceMin}
                  onChange={e => setPriceMin(e.target.value)}
                  placeholder="10000"
                />
              </div>
            )}

            {priceType === 'range' && (
              <>
                <div className="form-group">
                  <label>最低価格</label>
                  <input
                    type="number"
                    value={priceMin}
                    onChange={e => setPriceMin(e.target.value)}
                    placeholder="5000"
                  />
                </div>
                <div className="form-group">
                  <label>最高価格</label>
                  <input
                    type="number"
                    value={priceMax}
                    onChange={e => setPriceMax(e.target.value)}
                    placeholder="50000"
                  />
                </div>
              </>
            )}

            {priceType === 'custom' && (
              <div className="form-group">
                <label>価格表示</label>
                <input
                  type="text"
                  value={priceLabel}
                  onChange={e => setPriceLabel(e.target.value)}
                  placeholder="例: 要見積もり"
                />
              </div>
            )}
          </div>

          {/* 提供形態 & 期間 */}
          <div className="form-row">
            <div className="form-group">
              <label>提供形態</label>
              <select value={deliveryType} onChange={e => setDeliveryType(e.target.value)}>
                {Object.entries(DELIVERY_TYPE_INFO).map(([key, info]) => (
                  <option key={key} value={key}>{info.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>期間・所要時間</label>
              <input
                type="text"
                value={duration}
                onChange={e => setDuration(e.target.value)}
                placeholder="例: 60分、3ヶ月"
              />
            </div>
          </div>

          {/* 特徴・含まれるもの */}
          <div className="form-group">
            <label>特徴・含まれるもの</label>
            <div className="features-list">
              {features.map((feature, i) => (
                <div key={i} className="feature-item">
                  <span>{feature}</span>
                  <button type="button" onClick={() => handleRemoveFeature(i)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
            <div className="feature-add">
              <input
                type="text"
                value={newFeature}
                onChange={e => setNewFeature(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddFeature())}
                placeholder="特徴を追加"
              />
              <button type="button" onClick={handleAddFeature}>
                <Plus size={16} />
              </button>
            </div>
          </div>

          {/* ターゲット */}
          <div className="form-group">
            <label>ターゲット顧客</label>
            <input
              type="text"
              value={targetAudience}
              onChange={e => setTargetAudience(e.target.value)}
              placeholder="例: 起業準備中の会社員"
            />
          </div>

          {/* 次のステップ */}
          <div className="form-group">
            <label>次のステップ（コンバージョン目標）</label>
            <input
              type="text"
              value={conversionGoal}
              onChange={e => setConversionGoal(e.target.value)}
              placeholder="例: ミドル商品への申込み"
            />
          </div>

          {/* 主力商品フラグ */}
          <div className="form-group form-checkbox">
            <label>
              <input
                type="checkbox"
                checked={isFlagship}
                onChange={e => setIsFlagship(e.target.checked)}
              />
              この層の主力商品
            </label>
          </div>
        </form>

        <div className="modal-footer">
          <button type="button" onClick={onClose} className="btn btn-secondary">
            キャンセル
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            className="btn btn-primary"
            disabled={!name.trim() || saving}
          >
            {saving ? '保存中...' : isEdit ? '更新' : '追加'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

### 5.5 インデックスファイル

**ファイル:** `components/product-section/index.ts`

```typescript
export { ProductCard } from './ProductCard';
export { TierSection } from './TierSection';
export { ProductFlow } from './ProductFlow';
export { ProductEditModal } from './ProductEditModal';
```

### 確認ポイント

- [ ] `components/product-section/ProductCard.tsx` が作成された
- [ ] `components/product-section/TierSection.tsx` が作成された
- [ ] `components/product-section/ProductFlow.tsx` が作成された
- [ ] `components/product-section/ProductEditModal.tsx` が作成された
- [ ] `components/product-section/index.ts` が作成された

---

## Step 6: 製品セクションページ作成

### 6.1 製品セクションページ

**ファイル:** `app/(app)/products/page.tsx`

```typescript
'use client';

/**
 * app/(app)/products/page.tsx
 *
 * 製品セクションページ
 */

import { useState, useEffect } from 'react';
import { Package, Plus, Loader2, ChevronDown } from 'lucide-react';
import { useBrands } from '@/lib/hooks/useBrand';
import { useProductSectionList, useProductSection } from '@/lib/hooks/useProductSection';
import { TierSection, ProductFlow, ProductEditModal } from '@/components/product-section';
import type { Product, ProductTier } from '@/lib/types/product-section';
import { PRODUCT_TIERS } from '@/lib/types/product-section';

export default function ProductsPage() {
  const { brands, isLoading: brandsLoading } = useBrands();
  const [selectedBrandId, setSelectedBrandId] = useState<string | undefined>();
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);

  // ブランドが読み込まれたら最初のブランドを選択
  useEffect(() => {
    if (!selectedBrandId && brands.length > 0) {
      setSelectedBrandId(brands[0].id);
    }
  }, [brands, selectedBrandId]);

  const { sections, loading: sectionsLoading, createSection, deleteSection } = useProductSectionList(selectedBrandId);
  const {
    section,
    loading: sectionLoading,
    addProduct,
    updateProduct,
    deleteProduct,
    getProductsByTier,
  } = useProductSection(selectedSectionId);

  // セクションが読み込まれたら最初のセクションを選択
  useEffect(() => {
    if (!selectedSectionId && sections.length > 0) {
      setSelectedSectionId(sections[0].id);
    }
  }, [sections, selectedSectionId]);

  // 編集モーダル状態
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [addingTier, setAddingTier] = useState<ProductTier | null>(null);

  const handleCreateSection = async () => {
    if (!selectedBrandId) return;
    const newSection = await createSection({ brand_id: selectedBrandId });
    if (newSection) {
      setSelectedSectionId(newSection.id);
    }
  };

  const handleAddProduct = (tier: ProductTier) => {
    setAddingTier(tier);
    setEditingProduct(null);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setAddingTier(null);
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('この商品を削除しますか？')) return;
    await deleteProduct(productId);
  };

  const handleSaveProduct = async (data: any) => {
    if (editingProduct) {
      await updateProduct(editingProduct.id, data);
    } else if (addingTier) {
      await addProduct({ ...data, tier: addingTier });
    }
    setEditingProduct(null);
    setAddingTier(null);
  };

  if (brandsLoading || sectionsLoading) {
    return (
      <div className="page-loading">
        <Loader2 className="animate-spin" size={32} />
        <p>読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="products-page">
      <header className="page-header">
        <div className="header-content">
          <Package size={24} />
          <h1>製品セクション</h1>
        </div>
        <div className="header-actions-group">
          {/* ブランド選択 */}
          <div className="brand-selector">
            <select
              value={selectedBrandId || ''}
              onChange={e => {
                setSelectedBrandId(e.target.value || undefined);
                setSelectedSectionId(null);
              }}
              className="brand-select"
            >
              {brands.length === 0 ? (
                <option value="">ブランドがありません</option>
              ) : (
                brands.map(brand => (
                  <option key={brand.id} value={brand.id}>{brand.name}</option>
                ))
              )}
            </select>
            <ChevronDown size={16} className="select-icon" />
          </div>

          {/* セクション選択 */}
          {sections.length > 0 && (
            <div className="section-selector">
              <select
                value={selectedSectionId || ''}
                onChange={e => setSelectedSectionId(e.target.value || null)}
                className="section-select"
              >
                {sections.map(s => (
                  <option key={s.id} value={s.id}>{s.title}</option>
                ))}
              </select>
              <ChevronDown size={16} className="select-icon" />
            </div>
          )}

          <button
            onClick={handleCreateSection}
            className="btn btn-primary"
            disabled={!selectedBrandId}
          >
            <Plus size={16} />
            新規セクション
          </button>
        </div>
      </header>

      {brands.length === 0 ? (
        <div className="empty-state">
          <Package size={48} />
          <h2>ブランドがありません</h2>
          <p>まず「ブランド」タブでブランドを作成してください</p>
        </div>
      ) : sections.length === 0 ? (
        <div className="empty-state">
          <Package size={48} />
          <h2>セクションがありません</h2>
          <p>「新規セクション」ボタンから製品セクションを作成してください</p>
        </div>
      ) : sectionLoading ? (
        <div className="page-loading">
          <Loader2 className="animate-spin" size={32} />
        </div>
      ) : section ? (
        <div className="products-layout">
          {/* 導線フロー */}
          <ProductFlow getProductsByTier={getProductsByTier} />

          {/* 3層表示 */}
          <div className="tiers-grid">
            {PRODUCT_TIERS.map(tier => (
              <TierSection
                key={tier}
                tier={tier}
                products={getProductsByTier(tier)}
                onAddProduct={handleAddProduct}
                onEditProduct={handleEditProduct}
                onDeleteProduct={handleDeleteProduct}
              />
            ))}
          </div>
        </div>
      ) : null}

      {/* 編集モーダル */}
      {(editingProduct || addingTier) && (
        <ProductEditModal
          product={editingProduct}
          tier={addingTier || undefined}
          onSave={handleSaveProduct}
          onClose={() => {
            setEditingProduct(null);
            setAddingTier(null);
          }}
        />
      )}
    </div>
  );
}
```

### 6.2 ナビゲーション更新

**ファイル:** `app/(app)/layout.tsx` のナビゲーションに追加

```typescript
// import に追加
import { Package } from 'lucide-react';

// NAV_ITEMS に追加
{ href: '/products', label: '製品', icon: Package },
```

### 確認ポイント

- [ ] `app/(app)/products/page.tsx` が作成された
- [ ] ナビゲーションに製品リンクが追加された

---

## Step 7: CSS スタイル追加

**ファイル:** `app/globals.css` に追加

```css
/*
 * 製品セクションスタイル（Phase 17）
 */

/* ページレイアウト */
.products-page {
  padding: 24px 0;
}

.products-page .page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
}

.products-page .header-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.products-page .header-content h1 {
  font-size: 24px;
  font-weight: 600;
}

.products-page .header-actions-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.products-page .section-selector {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.products-page .section-select {
  appearance: none;
  background: var(--bg-white);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 10px 36px 10px 14px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-medium);
  cursor: pointer;
  min-width: 160px;
}

/* 製品レイアウト */
.products-layout {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* 3層グリッド */
.tiers-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

@media (max-width: 1024px) {
  .tiers-grid {
    grid-template-columns: 1fr;
  }
}

/* 層セクション */
.tier-section {
  background: var(--bg-white);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 20px;
  border-top: 4px solid var(--tier-color, var(--primary));
}

.tier-section .tier-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.tier-section .tier-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.tier-section .tier-title h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--tier-color);
  margin: 0;
}

.tier-section .tier-label-en {
  font-size: 11px;
  color: var(--text-muted);
}

.tier-section .tier-icon {
  color: var(--tier-color);
}

.tier-section .tier-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.tier-section .tier-purpose,
.tier-section .tier-price-range {
  font-size: 11px;
  color: var(--text-muted);
}

.tier-section .tier-description {
  font-size: 13px;
  color: var(--text-muted);
  margin-bottom: 16px;
}

.tier-section .tier-products {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
  min-height: 100px;
}

.tier-section .tier-empty {
  text-align: center;
  padding: 24px;
  background: var(--bg-gray);
  border-radius: 8px;
}

.tier-section .tier-empty p {
  color: var(--text-muted);
  font-size: 13px;
  margin: 0;
}

.tier-section .tier-examples {
  font-size: 11px;
  margin-top: 8px !important;
}

.tier-section .tier-add-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 10px;
  background: transparent;
  border: 2px dashed var(--tier-color);
  border-radius: 8px;
  color: var(--tier-color);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.tier-section .tier-add-button:hover {
  background: color-mix(in srgb, var(--tier-color) 10%, transparent);
}

/* 商品カード */
.product-card {
  background: var(--bg-gray);
  border-radius: 8px;
  padding: 14px;
  border-left: 3px solid var(--tier-color);
}

.product-card .card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}

.product-card .card-title-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.product-card .flagship-icon {
  color: var(--warning);
}

.product-card .card-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-dark);
  margin: 0;
}

.product-card .card-actions {
  display: flex;
  gap: 4px;
}

.product-card .card-description {
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 10px;
}

.product-card .card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
}

.product-card .card-meta span {
  font-size: 11px;
  padding: 2px 8px;
  background: var(--bg-white);
  border-radius: 4px;
  color: var(--text-medium);
}

.product-card .meta-price {
  font-weight: 600;
  color: var(--tier-color) !important;
}

.product-card .card-features {
  list-style: none;
  padding: 0;
  margin: 0 0 10px 0;
}

.product-card .card-features li {
  font-size: 11px;
  color: var(--text-medium);
  padding-left: 12px;
  position: relative;
  margin-bottom: 4px;
}

.product-card .card-features li::before {
  content: '•';
  position: absolute;
  left: 0;
  color: var(--tier-color);
}

.product-card .card-features .more {
  color: var(--text-muted);
}

.product-card .card-goal {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--primary);
}

/* 商品導線フロー */
.product-flow {
  background: var(--bg-white);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 24px;
}

.product-flow .flow-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 20px;
  text-align: center;
}

.product-flow .flow-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.product-flow .flow-step {
  display: flex;
  align-items: center;
  gap: 16px;
  width: 100%;
  max-width: 400px;
  padding: 16px 20px;
  background: var(--bg-gray);
  border-radius: 10px;
  border-left: 4px solid var(--step-color, var(--text-muted));
}

.product-flow .flow-entry,
.product-flow .flow-revenue {
  background: linear-gradient(135deg, var(--primary-alpha-10) 0%, var(--primary-alpha-05) 100%);
  border-left-color: var(--primary);
}

.product-flow .step-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-white);
  border-radius: 50%;
  color: var(--step-color, var(--primary));
  flex-shrink: 0;
}

.product-flow .step-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.product-flow .step-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--step-color, var(--text-dark));
}

.product-flow .step-product {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-dark);
}

.product-flow .step-empty {
  font-size: 12px;
  color: var(--text-muted);
  font-style: italic;
}

.product-flow .step-count {
  font-size: 11px;
  color: var(--text-muted);
}

.product-flow .flow-arrow {
  color: var(--text-muted);
}

/* 商品編集モーダル */
.product-edit-modal {
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
}

.product-edit-modal .modal-header {
  border-bottom: 3px solid var(--primary);
}

.product-edit-modal .form-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
}

.product-edit-modal .features-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 8px;
}

.product-edit-modal .feature-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--bg-gray);
  border-radius: 6px;
  font-size: 13px;
}

.product-edit-modal .feature-item button {
  background: transparent;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: var(--text-muted);
}

.product-edit-modal .feature-item button:hover {
  color: var(--danger);
}

.product-edit-modal .feature-add {
  display: flex;
  gap: 8px;
}

.product-edit-modal .feature-add input {
  flex: 1;
}

.product-edit-modal .feature-add button {
  padding: 8px 12px;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.product-edit-modal .form-checkbox label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.product-edit-modal .form-checkbox input {
  width: 16px;
  height: 16px;
}
```

### 確認ポイント

- [ ] CSS スタイルが追加された

---

## Step 8: 型チェック & ビルド

```bash
# 型を再生成
npx supabase gen types --lang=typescript --project-id "$(grep NEXT_PUBLIC_SUPABASE_URL .env.local | cut -d'/' -f3 | cut -d'.' -f1)" --schema public > lib/database.types.ts

# lib/types/database.ts を更新
cp lib/database.types.ts lib/types/database.ts
# 末尾に型エイリアスを追加

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

1. http://localhost:3000/products にアクセス
2. 以下を確認:
   - [ ] ブランド選択ができる
   - [ ] セクション作成ができる
   - [ ] 3層（フロント/ミドル/バック）が表示される
   - [ ] 各層に商品を追加できる
   - [ ] 商品の編集・削除ができる
   - [ ] 商品導線フローが表示される
   - [ ] 主力商品の設定ができる

---

## Step 10: Git プッシュ

```bash
git add -A
git commit -m "Phase 17: 製品セクション（フロント/ミドル/バック）

- supabase/migrations: product_sections, products テーブル + RLS
- lib/types/product-section.ts: ProductTier, PRODUCT_TIER_INFO
- app/api/product-sections: セクション CRUD API Routes
- app/api/products: 商品 CRUD API Routes
- lib/hooks/useProductSection.ts: useProductSectionList / useProductSection Hooks
- components/product-section/ProductCard.tsx: 商品カード
- components/product-section/TierSection.tsx: 層ごとのセクション
- components/product-section/ProductFlow.tsx: 商品導線フロー
- components/product-section/ProductEditModal.tsx: 商品編集モーダル
- app/(app)/products/page.tsx: 製品セクションページ
- CSS スタイル追加

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"

git push
```

---

## 完了チェックリスト

### データベース
- [ ] product_sections テーブル作成
- [ ] products テーブル作成
- [ ] RLS ポリシー設定
- [ ] マイグレーション成功

### 型定義
- [ ] ProductTier（3種類）
- [ ] Product / ProductSection インターフェース
- [ ] PRODUCT_TIER_INFO（表示情報）

### API Routes
- [ ] `GET/POST /api/product-sections` 作成
- [ ] `GET/PATCH/DELETE /api/product-sections/:sectionId` 作成
- [ ] `GET/POST /api/product-sections/:sectionId/products` 作成
- [ ] `GET/PATCH/DELETE /api/products/:productId` 作成

### React Hooks
- [ ] `useProductSectionList` 作成
- [ ] `useProductSection` 作成
- [ ] 商品 CRUD 機能

### UI コンポーネント
- [ ] `ProductCard` 作成
- [ ] `TierSection` 作成
- [ ] `ProductFlow` 作成
- [ ] `ProductEditModal` 作成

### 統合
- [ ] `/products` ページ作成
- [ ] ナビゲーション更新
- [ ] 型チェック成功
- [ ] ビルド成功
- [ ] Git プッシュ完了

---

## 次のステップ（Phase 18 以降）

1. **AI 連携**
   - Lean Canvas からの商品提案自動生成
   - 価格設定アドバイス

2. **統合ビュー**
   - ブランド → Lean Canvas → 製品セクションの連携表示
   - ダッシュボードへの組み込み

3. **エクスポート機能**
   - 製品ラインナップを PDF でエクスポート
   - 営業資料用フォーマット
