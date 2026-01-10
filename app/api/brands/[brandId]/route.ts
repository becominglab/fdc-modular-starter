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
