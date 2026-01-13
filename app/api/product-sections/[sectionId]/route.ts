/**
 * app/api/product-sections/[sectionId]/route.ts
 *
 * GET /api/product-sections/:sectionId - 製品セクション詳細取得（商品含む）
 * PATCH /api/product-sections/:sectionId - 製品セクション更新
 * DELETE /api/product-sections/:sectionId - 製品セクション削除
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const updateSectionSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
});

// GET: 製品セクション詳細取得（商品含む）
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
      return NextResponse.json({ error: 'Product section not found' }, { status: 404 });
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
    console.error('Product section GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH: 製品セクション更新
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
      console.error('Product section update error:', updateError);
      return NextResponse.json({ error: 'Failed to update product section' }, { status: 500 });
    }

    return NextResponse.json(section);
  } catch (error) {
    console.error('Product section PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE: 製品セクション削除
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
      console.error('Product section delete error:', deleteError);
      return NextResponse.json({ error: 'Failed to delete product section' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Product section DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
