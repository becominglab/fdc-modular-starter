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
  description: z.string().nullish(),
  price_type: z.enum(['free', 'fixed', 'range', 'custom']).optional(),
  price_min: z.union([z.number(), z.null()]).optional(),
  price_max: z.union([z.number(), z.null()]).optional(),
  price_label: z.string().nullish(),
  delivery_type: z.enum(['online', 'offline', 'hybrid']).optional(),
  duration: z.string().nullish(),
  features: z.array(z.string()).optional().default([]),
  target_audience: z.string().nullish(),
  conversion_goal: z.string().nullish(),
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
      return NextResponse.json({ error: 'Product section not found' }, { status: 404 });
    }

    // tier でフィルタ（オプション）
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
      return NextResponse.json({ error: 'Product section not found' }, { status: 404 });
    }

    const body = await request.json();
    const result = createProductSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', issues: result.error.issues },
        { status: 400 }
      );
    }

    // 同じ層の最大 sort_order を取得
    const { data: maxOrderData } = await supabase
      .from('products')
      .select('sort_order')
      .eq('section_id', sectionId)
      .eq('tier', result.data.tier)
      .order('sort_order', { ascending: false })
      .limit(1);

    const nextOrder = maxOrderData && maxOrderData.length > 0
      ? maxOrderData[0].sort_order + 1
      : 0;

    // 商品作成
    const { data: product, error: createError } = await supabase
      .from('products')
      .insert({
        section_id: sectionId,
        tier: result.data.tier,
        name: result.data.name,
        description: result.data.description,
        price_type: result.data.price_type || 'fixed',
        price_min: result.data.price_min,
        price_max: result.data.price_max,
        price_label: result.data.price_label,
        delivery_type: result.data.delivery_type || 'online',
        duration: result.data.duration,
        features: result.data.features || [],
        target_audience: result.data.target_audience,
        conversion_goal: result.data.conversion_goal,
        is_flagship: result.data.is_flagship || false,
        sort_order: nextOrder,
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
