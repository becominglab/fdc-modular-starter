/**
 * app/api/lean-canvas/route.ts
 *
 * GET /api/lean-canvas - キャンバス一覧取得（brandId でフィルタ可）
 * POST /api/lean-canvas - キャンバス作成
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const createCanvasSchema = z.object({
  brand_id: z.string().uuid('有効なブランドIDを指定してください'),
  title: z.string().optional(),
  description: z.string().optional(),
});

// GET: キャンバス一覧取得
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
      .from('lean_canvas')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (brandId) {
      query = query.eq('brand_id', brandId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Lean canvas fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch canvas' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Lean canvas GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: キャンバス作成
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const result = createCanvasSchema.safeParse(body);

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

    // キャンバス作成
    const { data: canvas, error: createError } = await supabase
      .from('lean_canvas')
      .insert({
        brand_id: result.data.brand_id,
        user_id: user.id,
        title: result.data.title || 'Lean Canvas',
        description: result.data.description,
      })
      .select()
      .single();

    if (createError) {
      console.error('Canvas create error:', createError);
      return NextResponse.json({ error: 'Failed to create canvas' }, { status: 500 });
    }

    // 9ブロックの初期レコードを作成
    const blockTypes = [
      'problem', 'solution', 'unique_value',
      'unfair_advantage', 'customer_segments',
      'key_metrics', 'channels',
      'cost_structure', 'revenue_streams'
    ];

    const blockInserts = blockTypes.map(block_type => ({
      canvas_id: canvas.id,
      block_type,
      content: [],
    }));

    await supabase.from('lean_canvas_blocks').insert(blockInserts);

    return NextResponse.json(canvas, { status: 201 });
  } catch (error) {
    console.error('Lean canvas POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
