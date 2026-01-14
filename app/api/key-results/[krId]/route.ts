import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { logActivityForUser } from '@/lib/utils/audit-log';

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  target_value: z.number().positive().optional(),
  current_value: z.number().min(0).optional(),
  unit: z.string().optional(),
});

type RouteParams = { params: Promise<{ krId: string }> };

// GET: Key Result 詳細取得
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { krId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('key_results')
      .select(`
        *,
        action_maps (
          id,
          title
        )
      `)
      .eq('id', krId)
      .eq('user_id', user.id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: '見つかりません' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Key Result GET error:', error);
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 });
  }
}

// PATCH: Key Result 更新
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { krId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const body = await request.json();
    const result = updateSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: '入力データが不正です', issues: result.error.issues },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('key_results')
      .update(result.data)
      .eq('id', krId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Key Result update error:', error);
      return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 });
    }

    // アクティビティログ記録
    await logActivityForUser({
      userId: user.id,
      action: 'update',
      resourceType: 'key_result',
      resourceId: krId,
      details: { title: data.title, changes: result.data },
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error('Key Result PATCH error:', error);
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 });
  }
}

// DELETE: Key Result 削除
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { krId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // 削除前にKR情報を取得（ログ用）
    const { data: existingKr } = await supabase
      .from('key_results')
      .select('title')
      .eq('id', krId)
      .eq('user_id', user.id)
      .single();

    // 紐付いたActionMapsの key_result_id をクリア
    await supabase
      .from('action_maps')
      .update({ key_result_id: null })
      .eq('key_result_id', krId);

    const { error } = await supabase
      .from('key_results')
      .delete()
      .eq('id', krId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Key Result delete error:', error);
      return NextResponse.json({ error: '削除に失敗しました' }, { status: 500 });
    }

    // アクティビティログ記録
    await logActivityForUser({
      userId: user.id,
      action: 'delete',
      resourceType: 'key_result',
      resourceId: krId,
      details: { title: existingKr?.title },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Key Result DELETE error:', error);
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 });
  }
}
