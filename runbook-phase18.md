# Phase 18: ビジネスプラン統合ダッシュボード

## 目標

Phase 15-17 で作成したビジネスツールを統合し、一目で事業全体を把握できるダッシュボードを実装：
- ブランド概要表示
- Lean Canvas サマリー
- 製品セクション（3層）フロー
- 収益シミュレーション
- 進捗・完成度インジケーター

---

## 統合ダッシュボードとは

```
ブランド、Lean Canvas、製品セクションを1画面で俯瞰できるビュー。
事業計画の全体像を把握し、未完成箇所を特定できる。

┌─────────────────────────────────────────────────────────────────────┐
│  ブランド選択: [ブランド名 ▼]                    完成度: ████████░░ 80%  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────┐  ┌──────────────────────────────────────────┐ │
│  │   ブランド概要    │  │           Lean Canvas サマリー            │ │
│  │  ロゴ・タグライン │  │  課題 ✓  顧客 ✓  価値 △  解決策 ○ ...    │ │
│  │  ストーリー       │  │                                          │ │
│  └─────────────────┘  └──────────────────────────────────────────┘ │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    製品ファネル                               │  │
│  │  フロント(3) → ミドル(2) → バック(1)  予想月間収益: ¥500,000  │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  アクションアイテム                                           │  │
│  │  □ Lean Canvas の「チャネル」を記入する                       │  │
│  │  □ フロント商品を1つ追加する                                  │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 習得する新しい概念

| 概念 | 説明 |
|------|------|
| 統合ビュー | 複数機能のデータを1画面で表示 |
| 完成度計算 | 入力状況に基づく進捗の可視化 |
| 収益シミュレーション | 製品価格から予想収益を計算 |
| アクションアイテム自動生成 | 未完成箇所から次のタスクを提案 |

---

## 前提条件

- [ ] Phase 17 完了（製品セクション動作）
- [ ] ブランド、Lean Canvas、製品セクションにデータがある
- [ ] 開発サーバーが起動している

---

## Step 1: 型定義の作成

### 1.1 ビジネスプラン統合型

**ファイル:** `lib/types/business-plan.ts`

```typescript
/**
 * lib/types/business-plan.ts
 *
 * ビジネスプラン統合ダッシュボードの型定義
 */

import type { Brand } from './brand';
import type { LeanCanvas, LeanCanvasBlock } from './lean-canvas';
import type { ProductSection, Product } from './product-section';

// 完成度計算結果
export interface CompletionStatus {
  percentage: number;
  completed: number;
  total: number;
  items: CompletionItem[];
}

export interface CompletionItem {
  category: 'brand' | 'lean-canvas' | 'products';
  field: string;
  label: string;
  completed: boolean;
  priority: 'high' | 'medium' | 'low';
}

// 収益シミュレーション
export interface RevenueSimulation {
  monthly: number;
  annual: number;
  breakdown: {
    tier: 'front' | 'middle' | 'back';
    productCount: number;
    averagePrice: number;
    estimatedSales: number;
    subtotal: number;
  }[];
}

// 統合ビジネスプラン
export interface BusinessPlanOverview {
  brand: Brand | null;
  leanCanvas: (LeanCanvas & { blocks: LeanCanvasBlock[] }) | null;
  productSection: (ProductSection & { products: Product[] }) | null;
  completion: CompletionStatus;
  revenue: RevenueSimulation | null;
  actionItems: ActionItem[];
}

// アクションアイテム
export interface ActionItem {
  id: string;
  type: 'brand' | 'lean-canvas' | 'products';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  link: string;
}

// 完成度計算用の設定
export const COMPLETION_WEIGHTS = {
  brand: {
    name: { weight: 10, label: 'ブランド名', priority: 'high' as const },
    tagline: { weight: 8, label: 'タグライン', priority: 'medium' as const },
    story: { weight: 5, label: 'ブランドストーリー', priority: 'low' as const },
    logo_url: { weight: 3, label: 'ロゴ', priority: 'low' as const },
  },
  leanCanvas: {
    problem: { weight: 10, label: '課題', priority: 'high' as const },
    'customer-segments': { weight: 10, label: '顧客セグメント', priority: 'high' as const },
    'unique-value': { weight: 10, label: '独自の価値提案', priority: 'high' as const },
    solution: { weight: 8, label: '解決策', priority: 'high' as const },
    channels: { weight: 6, label: 'チャネル', priority: 'medium' as const },
    'revenue-streams': { weight: 8, label: '収益の流れ', priority: 'high' as const },
    'cost-structure': { weight: 6, label: 'コスト構造', priority: 'medium' as const },
    'key-metrics': { weight: 5, label: '主要指標', priority: 'medium' as const },
    'unfair-advantage': { weight: 4, label: '圧倒的な優位性', priority: 'low' as const },
  },
  products: {
    front: { weight: 10, label: 'フロント商品', priority: 'high' as const },
    middle: { weight: 8, label: 'ミドル商品', priority: 'medium' as const },
    back: { weight: 10, label: 'バック商品', priority: 'high' as const },
  },
};

// 収益シミュレーション用のデフォルト値
export const REVENUE_DEFAULTS = {
  front: { salesPerMonth: 20, conversionRate: 0.3 },
  middle: { salesPerMonth: 6, conversionRate: 0.5 },
  back: { salesPerMonth: 3, conversionRate: 1.0 },
};
```

### 確認ポイント

- [ ] `lib/types/business-plan.ts` が作成された
- [ ] CompletionStatus, RevenueSimulation 型が定義されている
- [ ] COMPLETION_WEIGHTS に重み付け設定がある

---

## Step 2: API Routes 作成

### 2.1 ビジネスプラン概要 API

**ファイル:** `app/api/business-plan/[brandId]/route.ts`

```typescript
/**
 * app/api/business-plan/[brandId]/route.ts
 *
 * GET /api/business-plan/:brandId - ビジネスプラン統合データ取得
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  COMPLETION_WEIGHTS,
  REVENUE_DEFAULTS,
  type CompletionStatus,
  type CompletionItem,
  type RevenueSimulation,
  type ActionItem,
} from '@/lib/types/business-plan';

// 完成度計算
function calculateCompletion(
  brand: Record<string, unknown> | null,
  leanCanvasBlocks: Array<{ block_type: string; content: unknown }>,
  products: Array<{ tier: string }>
): CompletionStatus {
  const items: CompletionItem[] = [];
  let totalWeight = 0;
  let completedWeight = 0;

  // ブランド
  if (brand) {
    for (const [field, config] of Object.entries(COMPLETION_WEIGHTS.brand)) {
      const value = brand[field];
      const completed = !!value && String(value).trim() !== '';
      items.push({
        category: 'brand',
        field,
        label: config.label,
        completed,
        priority: config.priority,
      });
      totalWeight += config.weight;
      if (completed) completedWeight += config.weight;
    }
  }

  // Lean Canvas
  for (const [blockType, config] of Object.entries(COMPLETION_WEIGHTS.leanCanvas)) {
    const block = leanCanvasBlocks.find(b => b.block_type === blockType);
    const content = block?.content as { items?: string[] } | undefined;
    const completed = !!content?.items && content.items.length > 0;
    items.push({
      category: 'lean-canvas',
      field: blockType,
      label: config.label,
      completed,
      priority: config.priority,
    });
    totalWeight += config.weight;
    if (completed) completedWeight += config.weight;
  }

  // 製品
  for (const [tier, config] of Object.entries(COMPLETION_WEIGHTS.products)) {
    const hasProduct = products.some(p => p.tier === tier);
    items.push({
      category: 'products',
      field: tier,
      label: config.label,
      completed: hasProduct,
      priority: config.priority,
    });
    totalWeight += config.weight;
    if (hasProduct) completedWeight += config.weight;
  }

  const percentage = totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0;
  const completed = items.filter(i => i.completed).length;

  return { percentage, completed, total: items.length, items };
}

// 収益シミュレーション
function calculateRevenue(
  products: Array<{ tier: string; price_type: string; price_min: number | null }>
): RevenueSimulation {
  const breakdown: RevenueSimulation['breakdown'] = [];

  for (const tier of ['front', 'middle', 'back'] as const) {
    const tierProducts = products.filter(p => p.tier === tier);
    const defaults = REVENUE_DEFAULTS[tier];

    const averagePrice = tierProducts.length > 0
      ? tierProducts.reduce((sum, p) => {
          if (p.price_type === 'free') return sum;
          return sum + (p.price_min || 0);
        }, 0) / tierProducts.filter(p => p.price_type !== 'free').length || 0
      : 0;

    const estimatedSales = defaults.salesPerMonth;
    const subtotal = Math.round(averagePrice * estimatedSales * defaults.conversionRate);

    breakdown.push({
      tier,
      productCount: tierProducts.length,
      averagePrice: Math.round(averagePrice),
      estimatedSales,
      subtotal,
    });
  }

  const monthly = breakdown.reduce((sum, b) => sum + b.subtotal, 0);

  return {
    monthly,
    annual: monthly * 12,
    breakdown,
  };
}

// アクションアイテム生成
function generateActionItems(completion: CompletionStatus): ActionItem[] {
  const items: ActionItem[] = [];

  // 未完成で優先度の高いものからアクションアイテムを生成
  const incomplete = completion.items
    .filter(i => !i.completed)
    .sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    })
    .slice(0, 5);

  for (const item of incomplete) {
    let link = '/';
    let description = '';

    switch (item.category) {
      case 'brand':
        link = '/brand';
        description = `ブランドページで「${item.label}」を設定しましょう`;
        break;
      case 'lean-canvas':
        link = '/lean-canvas';
        description = `Lean Canvasの「${item.label}」を記入しましょう`;
        break;
      case 'products':
        link = '/product-sections';
        description = `${item.label}を追加して商品ラインナップを完成させましょう`;
        break;
    }

    items.push({
      id: `${item.category}-${item.field}`,
      type: item.category,
      title: `${item.label}を設定する`,
      description,
      priority: item.priority,
      link,
    });
  }

  return items;
}

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
    const { data: brand } = await supabase
      .from('brands')
      .select('*')
      .eq('id', brandId)
      .eq('user_id', user.id)
      .single();

    if (!brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    // Lean Canvas 取得（最新のもの）
    const { data: leanCanvas } = await supabase
      .from('lean_canvas')
      .select('*')
      .eq('brand_id', brandId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    let leanCanvasBlocks: Array<{ block_type: string; content: unknown }> = [];
    if (leanCanvas) {
      const { data: blocks } = await supabase
        .from('lean_canvas_blocks')
        .select('*')
        .eq('canvas_id', leanCanvas.id);
      leanCanvasBlocks = blocks || [];
    }

    // 製品セクション取得（最新のもの）
    const { data: productSection } = await supabase
      .from('product_sections')
      .select('*')
      .eq('brand_id', brandId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    let products: Array<{ tier: string; price_type: string; price_min: number | null }> = [];
    if (productSection) {
      const { data: prods } = await supabase
        .from('products')
        .select('*')
        .eq('section_id', productSection.id);
      products = prods || [];
    }

    // 完成度計算
    const completion = calculateCompletion(brand, leanCanvasBlocks, products);

    // 収益シミュレーション
    const revenue = products.length > 0 ? calculateRevenue(products) : null;

    // アクションアイテム生成
    const actionItems = generateActionItems(completion);

    return NextResponse.json({
      brand,
      leanCanvas: leanCanvas ? { ...leanCanvas, blocks: leanCanvasBlocks } : null,
      productSection: productSection ? { ...productSection, products } : null,
      completion,
      revenue,
      actionItems,
    });
  } catch (error) {
    console.error('Business plan GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### 確認ポイント

- [ ] `app/api/business-plan/[brandId]/route.ts` が作成された
- [ ] 完成度計算ロジックが実装されている
- [ ] 収益シミュレーションが実装されている

---

## Step 3: React Hooks 作成

### 3.1 ビジネスプラン Hook

**ファイル:** `lib/hooks/useBusinessPlan.ts`

```typescript
/**
 * lib/hooks/useBusinessPlan.ts
 *
 * ビジネスプラン統合データ取得 Hook
 */

import { useState, useEffect, useCallback } from 'react';
import type { BusinessPlanOverview } from '@/lib/types/business-plan';

export function useBusinessPlan(brandId: string | null) {
  const [data, setData] = useState<BusinessPlanOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!brandId) {
      setData(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/business-plan/${brandId}`);
      if (!res.ok) throw new Error('Failed to fetch business plan');

      const result = await res.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [brandId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}
```

### 確認ポイント

- [ ] `lib/hooks/useBusinessPlan.ts` が作成された

---

## Step 4: UI コンポーネント作成

### 4.1 完成度インジケーター

**ファイル:** `components/business-plan/CompletionIndicator.tsx`

```typescript
'use client';

/**
 * components/business-plan/CompletionIndicator.tsx
 *
 * 完成度表示コンポーネント
 */

import { CheckCircle, Circle, AlertCircle } from 'lucide-react';
import type { CompletionStatus } from '@/lib/types/business-plan';

interface CompletionIndicatorProps {
  completion: CompletionStatus;
  showDetails?: boolean;
}

export function CompletionIndicator({ completion, showDetails = false }: CompletionIndicatorProps) {
  const getColorClass = (percentage: number) => {
    if (percentage >= 80) return 'completion-high';
    if (percentage >= 50) return 'completion-medium';
    return 'completion-low';
  };

  return (
    <div className={`completion-indicator ${getColorClass(completion.percentage)}`}>
      <div className="completion-header">
        <span className="completion-label">完成度</span>
        <span className="completion-percentage">{completion.percentage}%</span>
      </div>

      <div className="completion-bar">
        <div
          className="completion-bar-fill"
          style={{ width: `${completion.percentage}%` }}
        />
      </div>

      <div className="completion-stats">
        <span>{completion.completed} / {completion.total} 項目完了</span>
      </div>

      {showDetails && (
        <div className="completion-details">
          {['brand', 'lean-canvas', 'products'].map(category => {
            const categoryItems = completion.items.filter(i => i.category === category);
            const categoryCompleted = categoryItems.filter(i => i.completed).length;
            const categoryLabel = {
              brand: 'ブランド',
              'lean-canvas': 'Lean Canvas',
              products: '製品セクション',
            }[category];

            return (
              <div key={category} className="completion-category">
                <span className="category-label">{categoryLabel}</span>
                <span className="category-count">
                  {categoryCompleted}/{categoryItems.length}
                </span>
                <div className="category-items">
                  {categoryItems.map(item => (
                    <div
                      key={item.field}
                      className={`category-item ${item.completed ? 'completed' : ''}`}
                    >
                      {item.completed ? (
                        <CheckCircle size={12} />
                      ) : item.priority === 'high' ? (
                        <AlertCircle size={12} />
                      ) : (
                        <Circle size={12} />
                      )}
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

### 4.2 収益シミュレーション表示

**ファイル:** `components/business-plan/RevenueSimulation.tsx`

```typescript
'use client';

/**
 * components/business-plan/RevenueSimulation.tsx
 *
 * 収益シミュレーション表示コンポーネント
 */

import { TrendingUp, DollarSign } from 'lucide-react';
import type { RevenueSimulation as RevenueSimulationType } from '@/lib/types/business-plan';
import { PRODUCT_TIER_INFO } from '@/lib/types/product-section';

interface RevenueSimulationProps {
  revenue: RevenueSimulationType;
}

export function RevenueSimulation({ revenue }: RevenueSimulationProps) {
  return (
    <div className="revenue-simulation">
      <div className="revenue-header">
        <TrendingUp size={20} />
        <h3>収益シミュレーション</h3>
      </div>

      <div className="revenue-totals">
        <div className="revenue-total monthly">
          <span className="total-label">月間予想</span>
          <span className="total-value">¥{revenue.monthly.toLocaleString()}</span>
        </div>
        <div className="revenue-total annual">
          <span className="total-label">年間予想</span>
          <span className="total-value">¥{revenue.annual.toLocaleString()}</span>
        </div>
      </div>

      <div className="revenue-breakdown">
        <table>
          <thead>
            <tr>
              <th>商品層</th>
              <th>商品数</th>
              <th>平均単価</th>
              <th>販売数/月</th>
              <th>小計</th>
            </tr>
          </thead>
          <tbody>
            {revenue.breakdown.map(item => {
              const tierInfo = PRODUCT_TIER_INFO[item.tier];
              return (
                <tr key={item.tier}>
                  <td>
                    <span
                      className="tier-badge"
                      style={{ backgroundColor: tierInfo.color }}
                    >
                      {tierInfo.label}
                    </span>
                  </td>
                  <td>{item.productCount}</td>
                  <td>¥{item.averagePrice.toLocaleString()}</td>
                  <td>{item.estimatedSales}</td>
                  <td className="subtotal">¥{item.subtotal.toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="revenue-note">
        * 予想販売数は一般的なコンバージョン率に基づく概算です
      </p>
    </div>
  );
}
```

### 4.3 アクションアイテムリスト

**ファイル:** `components/business-plan/ActionItemList.tsx`

```typescript
'use client';

/**
 * components/business-plan/ActionItemList.tsx
 *
 * 次のアクションアイテム表示
 */

import Link from 'next/link';
import { ArrowRight, AlertTriangle, Info, Lightbulb } from 'lucide-react';
import type { ActionItem } from '@/lib/types/business-plan';

interface ActionItemListProps {
  items: ActionItem[];
}

export function ActionItemList({ items }: ActionItemListProps) {
  if (items.length === 0) {
    return (
      <div className="action-items-complete">
        <Lightbulb size={24} />
        <p>すべてのアイテムが完了しています！</p>
      </div>
    );
  }

  const getPriorityIcon = (priority: ActionItem['priority']) => {
    switch (priority) {
      case 'high':
        return <AlertTriangle size={16} className="priority-high" />;
      case 'medium':
        return <Info size={16} className="priority-medium" />;
      default:
        return <Lightbulb size={16} className="priority-low" />;
    }
  };

  return (
    <div className="action-items">
      <h3>次のアクション</h3>
      <ul className="action-list">
        {items.map(item => (
          <li key={item.id} className={`action-item priority-${item.priority}`}>
            <div className="action-icon">
              {getPriorityIcon(item.priority)}
            </div>
            <div className="action-content">
              <span className="action-title">{item.title}</span>
              <span className="action-description">{item.description}</span>
            </div>
            <Link href={item.link} className="action-link">
              <ArrowRight size={16} />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### 4.4 ブランドサマリー

**ファイル:** `components/business-plan/BrandSummary.tsx`

```typescript
'use client';

/**
 * components/business-plan/BrandSummary.tsx
 *
 * ブランド概要表示
 */

import Link from 'next/link';
import { Palette, Edit } from 'lucide-react';
import type { Brand } from '@/lib/types/brand';

interface BrandSummaryProps {
  brand: Brand;
}

export function BrandSummary({ brand }: BrandSummaryProps) {
  return (
    <div className="brand-summary">
      <div className="summary-header">
        <Palette size={20} />
        <h3>ブランド</h3>
        <Link href="/brand" className="edit-link">
          <Edit size={14} />
        </Link>
      </div>

      <div className="summary-content">
        {brand.logo_url && (
          <img src={brand.logo_url} alt={brand.name} className="brand-logo" />
        )}
        <div className="brand-info">
          <h4 className="brand-name">{brand.name}</h4>
          {brand.tagline && (
            <p className="brand-tagline">{brand.tagline}</p>
          )}
        </div>
      </div>

      {brand.story && (
        <p className="brand-story">{brand.story}</p>
      )}
    </div>
  );
}
```

### 4.5 Lean Canvas サマリー

**ファイル:** `components/business-plan/LeanCanvasSummary.tsx`

```typescript
'use client';

/**
 * components/business-plan/LeanCanvasSummary.tsx
 *
 * Lean Canvas 概要表示
 */

import Link from 'next/link';
import { LayoutGrid, Edit, CheckCircle, Circle } from 'lucide-react';
import type { LeanCanvas, LeanCanvasBlock } from '@/lib/types/lean-canvas';
import { LEAN_CANVAS_BLOCK_INFO } from '@/lib/types/lean-canvas';

interface LeanCanvasSummaryProps {
  canvas: LeanCanvas & { blocks: LeanCanvasBlock[] };
}

export function LeanCanvasSummary({ canvas }: LeanCanvasSummaryProps) {
  const blockTypes = [
    'problem',
    'customer-segments',
    'unique-value',
    'solution',
    'channels',
    'revenue-streams',
    'cost-structure',
    'key-metrics',
    'unfair-advantage',
  ];

  return (
    <div className="lean-canvas-summary">
      <div className="summary-header">
        <LayoutGrid size={20} />
        <h3>Lean Canvas</h3>
        <Link href={`/lean-canvas/${canvas.id}`} className="edit-link">
          <Edit size={14} />
        </Link>
      </div>

      <div className="canvas-blocks-grid">
        {blockTypes.map(blockType => {
          const block = canvas.blocks.find(b => b.block_type === blockType);
          const content = block?.content as { items?: string[] } | undefined;
          const hasContent = !!content?.items && content.items.length > 0;
          const info = LEAN_CANVAS_BLOCK_INFO[blockType as keyof typeof LEAN_CANVAS_BLOCK_INFO];

          return (
            <div
              key={blockType}
              className={`canvas-block-item ${hasContent ? 'completed' : ''}`}
            >
              {hasContent ? (
                <CheckCircle size={14} className="block-icon completed" />
              ) : (
                <Circle size={14} className="block-icon" />
              )}
              <span className="block-label">{info?.label || blockType}</span>
              {hasContent && (
                <span className="block-count">{content.items?.length}件</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

### 4.6 製品ファネルサマリー

**ファイル:** `components/business-plan/ProductFunnelSummary.tsx`

```typescript
'use client';

/**
 * components/business-plan/ProductFunnelSummary.tsx
 *
 * 製品ファネル概要表示
 */

import Link from 'next/link';
import { Package, Edit, ArrowRight } from 'lucide-react';
import type { ProductSection, Product } from '@/lib/types/product-section';
import { PRODUCT_TIER_INFO } from '@/lib/types/product-section';

interface ProductFunnelSummaryProps {
  section: ProductSection & { products: Product[] };
}

export function ProductFunnelSummary({ section }: ProductFunnelSummaryProps) {
  const getProductsByTier = (tier: 'front' | 'middle' | 'back') =>
    section.products.filter(p => p.tier === tier);

  const frontProducts = getProductsByTier('front');
  const middleProducts = getProductsByTier('middle');
  const backProducts = getProductsByTier('back');

  return (
    <div className="product-funnel-summary">
      <div className="summary-header">
        <Package size={20} />
        <h3>製品ファネル</h3>
        <Link href={`/product-sections/${section.id}`} className="edit-link">
          <Edit size={14} />
        </Link>
      </div>

      <div className="funnel-flow">
        {(['front', 'middle', 'back'] as const).map((tier, index) => {
          const products = tier === 'front' ? frontProducts
            : tier === 'middle' ? middleProducts : backProducts;
          const info = PRODUCT_TIER_INFO[tier];
          const flagship = products.find(p => p.is_flagship) || products[0];

          return (
            <div key={tier} className="funnel-stage">
              <div
                className="stage-card"
                style={{ borderColor: info.color }}
              >
                <span
                  className="stage-badge"
                  style={{ backgroundColor: info.color }}
                >
                  {info.label}
                </span>
                <span className="stage-count">{products.length}件</span>
                {flagship && (
                  <span className="stage-flagship">{flagship.name}</span>
                )}
              </div>
              {index < 2 && (
                <ArrowRight size={16} className="funnel-arrow" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

### 4.7 インデックスファイル

**ファイル:** `components/business-plan/index.ts`

```typescript
export { CompletionIndicator } from './CompletionIndicator';
export { RevenueSimulation } from './RevenueSimulation';
export { ActionItemList } from './ActionItemList';
export { BrandSummary } from './BrandSummary';
export { LeanCanvasSummary } from './LeanCanvasSummary';
export { ProductFunnelSummary } from './ProductFunnelSummary';
```

### 確認ポイント

- [ ] `components/business-plan/` 以下にコンポーネントが作成された
- [ ] インデックスファイルでエクスポートされている

---

## Step 5: ビジネスプランページ作成

### 5.1 統合ダッシュボードページ

**ファイル:** `app/(app)/business-plan/page.tsx`

```typescript
'use client';

/**
 * app/(app)/business-plan/page.tsx
 *
 * ビジネスプラン統合ダッシュボード
 */

import { useState, useEffect } from 'react';
import { Briefcase, Loader2, ChevronDown, Plus } from 'lucide-react';
import { useBrands } from '@/lib/hooks/useBrand';
import { useBusinessPlan } from '@/lib/hooks/useBusinessPlan';
import {
  CompletionIndicator,
  RevenueSimulation,
  ActionItemList,
  BrandSummary,
  LeanCanvasSummary,
  ProductFunnelSummary,
} from '@/components/business-plan';

export default function BusinessPlanPage() {
  const { brands, isLoading: brandsLoading } = useBrands();
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);

  // ブランドが読み込まれたら最初のブランドを選択
  useEffect(() => {
    if (!selectedBrandId && brands.length > 0) {
      setSelectedBrandId(brands[0].id);
    }
  }, [brands, selectedBrandId]);

  const { data, loading, error } = useBusinessPlan(selectedBrandId);

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
      <div className="business-plan-page">
        <header className="page-header">
          <div className="header-content">
            <Briefcase size={24} />
            <h1>ビジネスプラン</h1>
          </div>
        </header>
        <div className="empty-state">
          <Briefcase size={48} />
          <h2>ブランドがありません</h2>
          <p>まず「ブランド」タブでブランドを作成してください</p>
        </div>
      </div>
    );
  }

  return (
    <div className="business-plan-page">
      <header className="page-header">
        <div className="header-content">
          <Briefcase size={24} />
          <h1>ビジネスプラン</h1>
        </div>
        <div className="header-actions-group">
          <div className="brand-selector">
            <select
              value={selectedBrandId || ''}
              onChange={e => setSelectedBrandId(e.target.value || null)}
              className="brand-select"
            >
              {brands.map(brand => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>
            <ChevronDown size={16} className="select-icon" />
          </div>
        </div>
      </header>

      {loading ? (
        <div className="page-loading">
          <Loader2 className="animate-spin" size={32} />
        </div>
      ) : error ? (
        <div className="page-error">
          <p>エラー: {error}</p>
        </div>
      ) : data ? (
        <div className="business-plan-layout">
          {/* 完成度 */}
          <section className="plan-section completion-section">
            <CompletionIndicator completion={data.completion} showDetails />
          </section>

          {/* 上段: ブランド + Lean Canvas */}
          <div className="plan-row">
            <section className="plan-section">
              {data.brand && <BrandSummary brand={data.brand} />}
            </section>
            <section className="plan-section">
              {data.leanCanvas ? (
                <LeanCanvasSummary canvas={data.leanCanvas} />
              ) : (
                <div className="empty-section">
                  <p>Lean Canvas がありません</p>
                  <a href="/lean-canvas" className="btn btn-outline">
                    <Plus size={14} /> 作成する
                  </a>
                </div>
              )}
            </section>
          </div>

          {/* 中段: 製品ファネル */}
          <section className="plan-section">
            {data.productSection ? (
              <ProductFunnelSummary section={data.productSection} />
            ) : (
              <div className="empty-section">
                <p>製品セクションがありません</p>
                <a href="/product-sections" className="btn btn-outline">
                  <Plus size={14} /> 作成する
                </a>
              </div>
            )}
          </section>

          {/* 収益シミュレーション */}
          {data.revenue && data.revenue.monthly > 0 && (
            <section className="plan-section">
              <RevenueSimulation revenue={data.revenue} />
            </section>
          )}

          {/* アクションアイテム */}
          <section className="plan-section">
            <ActionItemList items={data.actionItems} />
          </section>
        </div>
      ) : null}
    </div>
  );
}
```

### 5.2 ナビゲーション更新

**ファイル:** `app/(app)/layout.tsx` に追加

```typescript
// import に追加
import { Briefcase } from 'lucide-react';

// NAV_ITEMS に追加（製品セクションの後）
{ href: '/business-plan', label: 'ビジネスプラン', icon: Briefcase },
```

### 確認ポイント

- [ ] `app/(app)/business-plan/page.tsx` が作成された
- [ ] ナビゲーションにリンクが追加された

---

## Step 6: CSS スタイル追加

**ファイル:** `app/globals.css` に追加

```css
/*
 * ビジネスプラン統合ダッシュボード（Phase 18）
 */

/* ページレイアウト */
.business-plan-page {
  padding: 24px 0;
}

.business-plan-layout {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.plan-row {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 24px;
}

@media (max-width: 900px) {
  .plan-row {
    grid-template-columns: 1fr;
  }
}

.plan-section {
  background: var(--bg-white);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 20px;
}

.plan-section .summary-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-light);
}

.plan-section .summary-header h3 {
  flex: 1;
  font-size: 16px;
  font-weight: 600;
  margin: 0;
}

.plan-section .edit-link {
  color: var(--text-muted);
  padding: 4px;
}

.plan-section .edit-link:hover {
  color: var(--primary);
}

.empty-section {
  text-align: center;
  padding: 32px;
  color: var(--text-muted);
}

.empty-section p {
  margin-bottom: 12px;
}

/* 完成度インジケーター */
.completion-indicator {
  --completion-color: var(--success);
}

.completion-indicator.completion-medium {
  --completion-color: var(--warning);
}

.completion-indicator.completion-low {
  --completion-color: var(--danger);
}

.completion-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 8px;
}

.completion-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-dark);
}

.completion-percentage {
  font-size: 24px;
  font-weight: 700;
  color: var(--completion-color);
}

.completion-bar {
  height: 8px;
  background: var(--bg-gray);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.completion-bar-fill {
  height: 100%;
  background: var(--completion-color);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.completion-stats {
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 16px;
}

.completion-details {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.completion-category {
  padding: 12px;
  background: var(--bg-gray);
  border-radius: 8px;
}

.completion-category .category-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-dark);
}

.completion-category .category-count {
  font-size: 12px;
  color: var(--text-muted);
  margin-left: 8px;
}

.completion-category .category-items {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.completion-category .category-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--text-muted);
  padding: 4px 8px;
  background: var(--bg-white);
  border-radius: 4px;
}

.completion-category .category-item.completed {
  color: var(--success);
}

.completion-category .category-item svg {
  flex-shrink: 0;
}

/* ブランドサマリー */
.brand-summary .summary-content {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 12px;
}

.brand-summary .brand-logo {
  width: 60px;
  height: 60px;
  object-fit: contain;
  border-radius: 8px;
  background: var(--bg-gray);
}

.brand-summary .brand-name {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 4px 0;
}

.brand-summary .brand-tagline {
  font-size: 13px;
  color: var(--text-muted);
  margin: 0;
}

.brand-summary .brand-story {
  font-size: 13px;
  color: var(--text-light);
  line-height: 1.6;
  margin: 0;
}

/* Lean Canvas サマリー */
.canvas-blocks-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.canvas-block-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  background: var(--bg-gray);
  border-radius: 6px;
  font-size: 12px;
  color: var(--text-muted);
}

.canvas-block-item.completed {
  background: var(--success-alpha-10);
  color: var(--success);
}

.canvas-block-item .block-icon.completed {
  color: var(--success);
}

.canvas-block-item .block-count {
  margin-left: auto;
  font-weight: 500;
}

/* 製品ファネルサマリー */
.funnel-flow {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px 0;
}

.funnel-stage {
  display: flex;
  align-items: center;
  gap: 8px;
}

.funnel-stage .stage-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 16px 24px;
  background: var(--bg-gray);
  border-radius: 8px;
  border-top: 3px solid;
  min-width: 140px;
}

.funnel-stage .stage-badge {
  font-size: 11px;
  font-weight: 600;
  color: white;
  padding: 2px 8px;
  border-radius: 4px;
}

.funnel-stage .stage-count {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-dark);
}

.funnel-stage .stage-flagship {
  font-size: 12px;
  color: var(--text-muted);
  text-align: center;
}

.funnel-arrow {
  color: var(--text-muted);
  flex-shrink: 0;
}

/* 収益シミュレーション */
.revenue-simulation .revenue-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.revenue-simulation .revenue-header h3 {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
}

.revenue-totals {
  display: flex;
  gap: 24px;
  margin-bottom: 20px;
}

.revenue-total {
  flex: 1;
  padding: 16px;
  background: var(--bg-gray);
  border-radius: 8px;
  text-align: center;
}

.revenue-total .total-label {
  display: block;
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 4px;
}

.revenue-total .total-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--success);
}

.revenue-total.annual .total-value {
  color: var(--primary);
}

.revenue-breakdown table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.revenue-breakdown th,
.revenue-breakdown td {
  padding: 10px 12px;
  text-align: left;
  border-bottom: 1px solid var(--border-light);
}

.revenue-breakdown th {
  font-weight: 600;
  color: var(--text-muted);
  font-size: 11px;
  text-transform: uppercase;
}

.revenue-breakdown .tier-badge {
  font-size: 10px;
  font-weight: 600;
  color: white;
  padding: 2px 6px;
  border-radius: 3px;
}

.revenue-breakdown .subtotal {
  font-weight: 600;
  color: var(--text-dark);
}

.revenue-note {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 12px;
  text-align: right;
}

/* アクションアイテム */
.action-items h3 {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
}

.action-items-complete {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 32px;
  color: var(--success);
}

.action-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.action-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--bg-gray);
  border-radius: 8px;
  border-left: 3px solid var(--text-muted);
}

.action-item.priority-high {
  border-left-color: var(--danger);
}

.action-item.priority-medium {
  border-left-color: var(--warning);
}

.action-item.priority-low {
  border-left-color: var(--text-muted);
}

.action-item .action-icon {
  flex-shrink: 0;
}

.action-item .action-icon .priority-high {
  color: var(--danger);
}

.action-item .action-icon .priority-medium {
  color: var(--warning);
}

.action-item .action-icon .priority-low {
  color: var(--text-muted);
}

.action-item .action-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.action-item .action-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-dark);
}

.action-item .action-description {
  font-size: 12px;
  color: var(--text-muted);
}

.action-item .action-link {
  color: var(--primary);
  padding: 8px;
  border-radius: 6px;
}

.action-item .action-link:hover {
  background: var(--primary-alpha-10);
}
```

### 確認ポイント

- [ ] CSS スタイルが追加された

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

1. http://localhost:3000/business-plan にアクセス
2. 以下を確認:
   - [ ] ブランド選択ができる
   - [ ] 完成度が表示される
   - [ ] ブランド概要が表示される
   - [ ] Lean Canvas サマリーが表示される
   - [ ] 製品ファネルが表示される
   - [ ] 収益シミュレーションが表示される
   - [ ] アクションアイテムが表示される
   - [ ] 各セクションの編集リンクが機能する

---

## Step 9: Git プッシュ

```bash
git add -A
git commit -m "Phase 18: ビジネスプラン統合ダッシュボード

- lib/types/business-plan.ts: 統合ビュー型定義
- app/api/business-plan/[brandId]/route.ts: 統合データ取得 API
- lib/hooks/useBusinessPlan.ts: ビジネスプラン Hook
- components/business-plan/CompletionIndicator.tsx: 完成度表示
- components/business-plan/RevenueSimulation.tsx: 収益シミュレーション
- components/business-plan/ActionItemList.tsx: アクションアイテム
- components/business-plan/BrandSummary.tsx: ブランド概要
- components/business-plan/LeanCanvasSummary.tsx: Lean Canvas サマリー
- components/business-plan/ProductFunnelSummary.tsx: 製品ファネル
- app/(app)/business-plan/page.tsx: 統合ダッシュボード
- CSS スタイル追加

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"

git push
```

---

## 完了チェックリスト

### 型定義
- [ ] CompletionStatus / CompletionItem
- [ ] RevenueSimulation
- [ ] BusinessPlanOverview
- [ ] ActionItem
- [ ] COMPLETION_WEIGHTS

### API Routes
- [ ] `GET /api/business-plan/:brandId` 作成
- [ ] 完成度計算ロジック
- [ ] 収益シミュレーションロジック
- [ ] アクションアイテム生成

### React Hooks
- [ ] `useBusinessPlan` 作成

### UI コンポーネント
- [ ] `CompletionIndicator` 作成
- [ ] `RevenueSimulation` 作成
- [ ] `ActionItemList` 作成
- [ ] `BrandSummary` 作成
- [ ] `LeanCanvasSummary` 作成
- [ ] `ProductFunnelSummary` 作成

### 統合
- [ ] `/business-plan` ページ作成
- [ ] ナビゲーション更新
- [ ] 型チェック成功
- [ ] ビルド成功
- [ ] Git プッシュ完了

---

## 次のステップ（Phase 19 以降）

1. **エクスポート機能**
   - ビジネスプラン全体を PDF でエクスポート
   - 営業資料・投資家向け資料フォーマット

2. **AI アシスタント連携**
   - 未完成項目の自動提案
   - Lean Canvas からの商品提案

3. **チーム共有機能**
   - ビジネスプランの共有・コメント
   - バージョン管理
