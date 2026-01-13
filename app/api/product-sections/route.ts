/**
 * app/api/product-sections/route.ts
 *
 * GET /api/product-sections - 製品セクション一覧取得（brandId でフィルタ可）
 * POST /api/product-sections - 製品セクション作成
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const createSectionSchema = z.object({
  brand_id: z.string().uuid('有効なブランドIDを指定してください'),
  title: z.string().optional(),
  description: z.string().optional(),
});

// GET: 製品セクション一覧取得
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
      return NextResponse.json({ error: 'Failed to fetch product sections' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Product sections GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: 製品セクション作成
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

    // 製品セクション作成
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
      console.error('Product section create error:', createError);
      return NextResponse.json({ error: 'Failed to create product section' }, { status: 500 });
    }

    return NextResponse.json(section, { status: 201 });
  } catch (error) {
    console.error('Product sections POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
