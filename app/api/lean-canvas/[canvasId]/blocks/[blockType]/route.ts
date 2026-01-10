/**
 * app/api/lean-canvas/[canvasId]/blocks/[blockType]/route.ts
 *
 * PATCH /api/lean-canvas/:canvasId/blocks/:blockType - ブロック更新
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const updateBlockSchema = z.object({
  content: z.array(z.string()),
});

const validBlockTypes = [
  'problem', 'solution', 'unique_value',
  'unfair_advantage', 'customer_segments',
  'key_metrics', 'channels',
  'cost_structure', 'revenue_streams'
];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ canvasId: string; blockType: string }> }
) {
  try {
    const { canvasId, blockType } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!validBlockTypes.includes(blockType)) {
      return NextResponse.json({ error: 'Invalid block type' }, { status: 400 });
    }

    // キャンバス所有者確認
    const { data: canvas } = await supabase
      .from('lean_canvas')
      .select('id')
      .eq('id', canvasId)
      .eq('user_id', user.id)
      .single();

    if (!canvas) {
      return NextResponse.json({ error: 'Canvas not found' }, { status: 404 });
    }

    const body = await request.json();
    const result = updateBlockSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', issues: result.error.issues },
        { status: 400 }
      );
    }

    // upsert（存在しなければ作成、あれば更新）
    const { data: block, error: upsertError } = await supabase
      .from('lean_canvas_blocks')
      .upsert({
        canvas_id: canvasId,
        block_type: blockType,
        content: result.data.content,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'canvas_id,block_type',
      })
      .select()
      .single();

    if (upsertError) {
      console.error('Block upsert error:', upsertError);
      return NextResponse.json({ error: 'Failed to update block' }, { status: 500 });
    }

    return NextResponse.json(block);
  } catch (error) {
    console.error('Block PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
