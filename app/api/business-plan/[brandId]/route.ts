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
