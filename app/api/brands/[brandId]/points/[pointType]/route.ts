/**
 * app/api/brands/[brandId]/points/[pointType]/route.ts
 *
 * PATCH /api/brands/:brandId/points/:pointType - ポイント更新
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const updatePointSchema = z.object({
  content: z.string(),
});

const validPointTypes = [
  'mission', 'vision', 'target_audience', 'unique_value',
  'brand_personality', 'tone_voice', 'visual_identity',
  'key_messages', 'competitors', 'differentiators'
];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ brandId: string; pointType: string }> }
) {
  try {
    const { brandId, pointType } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!validPointTypes.includes(pointType)) {
      return NextResponse.json({ error: 'Invalid point type' }, { status: 400 });
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

    const body = await request.json();
    const result = updatePointSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', issues: result.error.issues },
        { status: 400 }
      );
    }

    // upsert（存在しなければ作成、あれば更新）
    const { data: point, error: upsertError } = await supabase
      .from('brand_points')
      .upsert({
        brand_id: brandId,
        point_type: pointType,
        content: result.data.content,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'brand_id,point_type',
      })
      .select()
      .single();

    if (upsertError) {
      console.error('Point upsert error:', upsertError);
      return NextResponse.json({ error: 'Failed to update point' }, { status: 500 });
    }

    return NextResponse.json(point);
  } catch (error) {
    console.error('Point PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
