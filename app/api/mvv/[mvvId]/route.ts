/**
 * app/api/mvv/[mvvId]/route.ts
 *
 * GET /api/mvv/:mvvId - MVV 詳細取得
 * PATCH /api/mvv/:mvvId - MVV 更新
 * DELETE /api/mvv/:mvvId - MVV 削除
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const updateMVVSchema = z.object({
  mission: z.string().nullish(),
  vision: z.string().nullish(),
  values: z.array(z.string()).optional(),
});

// GET: MVV 詳細取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ mvvId: string }> }
) {
  try {
    const { mvvId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: mvv, error } = await supabase
      .from('mvv')
      .select('*')
      .eq('id', mvvId)
      .eq('user_id', user.id)
      .single();

    if (error || !mvv) {
      return NextResponse.json({ error: 'MVV not found' }, { status: 404 });
    }

    return NextResponse.json(mvv);
  } catch (error) {
    console.error('MVV GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH: MVV 更新
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ mvvId: string }> }
) {
  try {
    const { mvvId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const result = updateMVVSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', issues: result.error.issues },
        { status: 400 }
      );
    }

    const { data: mvv, error: updateError } = await supabase
      .from('mvv')
      .update({
        ...result.data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', mvvId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('MVV update error:', updateError);
      return NextResponse.json({ error: 'Failed to update MVV' }, { status: 500 });
    }

    return NextResponse.json(mvv);
  } catch (error) {
    console.error('MVV PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE: MVV 削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ mvvId: string }> }
) {
  try {
    const { mvvId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error: deleteError } = await supabase
      .from('mvv')
      .delete()
      .eq('id', mvvId)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('MVV delete error:', deleteError);
      return NextResponse.json({ error: 'Failed to delete MVV' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('MVV DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
