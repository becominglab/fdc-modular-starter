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
