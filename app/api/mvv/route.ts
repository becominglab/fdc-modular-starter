/**
 * app/api/mvv/route.ts
 *
 * GET /api/mvv?brandId=xxx - MVV 取得
 * POST /api/mvv - MVV 作成
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const createMVVSchema = z.object({
  brand_id: z.string().uuid('有効なブランドIDを指定してください'),
  mission: z.string().nullish(),
  vision: z.string().nullish(),
  values: z.array(z.string()).optional().default([]),
});

// GET: MVV 取得
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get('brandId');

    if (!brandId) {
      return NextResponse.json({ error: 'brandId is required' }, { status: 400 });
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

    // MVV 取得
    const { data: mvv, error } = await supabase
      .from('mvv')
      .select('*')
      .eq('brand_id', brandId)
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('MVV fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch MVV' }, { status: 500 });
    }

    return NextResponse.json(mvv || null);
  } catch (error) {
    console.error('MVV GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: MVV 作成
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const result = createMVVSchema.safeParse(body);

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

    // 既存MVV確認
    const { data: existingMVV } = await supabase
      .from('mvv')
      .select('id')
      .eq('brand_id', result.data.brand_id)
      .single();

    if (existingMVV) {
      return NextResponse.json(
        { error: 'MVV already exists for this brand' },
        { status: 409 }
      );
    }

    // MVV 作成
    const { data: mvv, error: createError } = await supabase
      .from('mvv')
      .insert({
        brand_id: result.data.brand_id,
        user_id: user.id,
        mission: result.data.mission || null,
        vision: result.data.vision || null,
        values: result.data.values || [],
      })
      .select()
      .single();

    if (createError) {
      console.error('MVV create error:', createError);
      return NextResponse.json({ error: 'Failed to create MVV' }, { status: 500 });
    }

    return NextResponse.json(mvv, { status: 201 });
  } catch (error) {
    console.error('MVV POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
