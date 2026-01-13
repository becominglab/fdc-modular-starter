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

    // 商品取得（セクション経由で所有者確認）
    const { data: product, error: productError } = await supabase
      .from('products')
      .select(`
        *,
        product_sections!inner(user_id)
      `)
      .eq('id', productId)
      .eq('product_sections.user_id', user.id)
      .single();

    if (productError || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // product_sections を除外して返す
    const { product_sections: _, ...productData } = product;
    return NextResponse.json(productData);
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

    // 所有者確認
    const { data: existingProduct } = await supabase
      .from('products')
      .select(`
        id,
        product_sections!inner(user_id)
      `)
      .eq('id', productId)
      .eq('product_sections.user_id', user.id)
      .single();

    if (!existingProduct) {
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

    // 所有者確認
    const { data: existingProduct } = await supabase
      .from('products')
      .select(`
        id,
        product_sections!inner(user_id)
      `)
      .eq('id', productId)
      .eq('product_sections.user_id', user.id)
      .single();

    if (!existingProduct) {
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
