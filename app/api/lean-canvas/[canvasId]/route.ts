/**
 * app/api/lean-canvas/[canvasId]/route.ts
 *
 * GET /api/lean-canvas/:canvasId - キャンバス詳細取得
 * PATCH /api/lean-canvas/:canvasId - キャンバス更新
 * DELETE /api/lean-canvas/:canvasId - キャンバス削除
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const updateCanvasSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
});

// GET: キャンバス詳細取得（ブロック含む）
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ canvasId: string }> }
) {
  try {
    const { canvasId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // キャンバス取得
    const { data: canvas, error: canvasError } = await supabase
      .from('lean_canvas')
      .select('*')
      .eq('id', canvasId)
      .eq('user_id', user.id)
      .single();

    if (canvasError || !canvas) {
      return NextResponse.json({ error: 'Canvas not found' }, { status: 404 });
    }

    // ブロック取得
    const { data: blocks, error: blocksError } = await supabase
      .from('lean_canvas_blocks')
      .select('*')
      .eq('canvas_id', canvasId)
      .order('block_type');

    if (blocksError) {
      console.error('Canvas blocks fetch error:', blocksError);
    }

    return NextResponse.json({
      ...canvas,
      blocks: blocks || [],
    });
  } catch (error) {
    console.error('Canvas GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH: キャンバス更新
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ canvasId: string }> }
) {
  try {
    const { canvasId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const result = updateCanvasSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', issues: result.error.issues },
        { status: 400 }
      );
    }

    const { data: canvas, error: updateError } = await supabase
      .from('lean_canvas')
      .update({
        ...result.data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', canvasId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Canvas update error:', updateError);
      return NextResponse.json({ error: 'Failed to update canvas' }, { status: 500 });
    }

    return NextResponse.json(canvas);
  } catch (error) {
    console.error('Canvas PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE: キャンバス削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ canvasId: string }> }
) {
  try {
    const { canvasId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error: deleteError } = await supabase
      .from('lean_canvas')
      .delete()
      .eq('id', canvasId)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Canvas delete error:', deleteError);
      return NextResponse.json({ error: 'Failed to delete canvas' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Canvas DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
