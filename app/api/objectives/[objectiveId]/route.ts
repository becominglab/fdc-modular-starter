import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { logActivityForUser } from '@/lib/utils/audit-log';

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  period: z.string().optional(),
  is_archived: z.boolean().optional(),
});

type RouteParams = { params: Promise<{ objectiveId: string }> };

// GET: Objective 詳細取得
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { objectiveId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('objectives')
      .select(`
        *,
        key_results (
          *
        )
      `)
      .eq('id', objectiveId)
      .eq('user_id', user.id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: '見つかりません' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Objective GET error:', error);
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 });
  }
}

// PATCH: Objective 更新
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { objectiveId } = await params;
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
      .from('objectives')
      .update(result.data)
      .eq('id', objectiveId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Objective update error:', error);
      return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 });
    }

    // アクティビティログ記録
    await logActivityForUser({
      userId: user.id,
      action: 'update',
      resourceType: 'objective',
      resourceId: objectiveId,
      details: { title: data.title, changes: result.data },
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error('Objective PATCH error:', error);
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 });
  }
}

// DELETE: Objective 削除
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { objectiveId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // 削除前にObjective情報を取得（ログ用）
    const { data: existingObjective } = await supabase
      .from('objectives')
      .select('title')
      .eq('id', objectiveId)
      .eq('user_id', user.id)
      .single();

    const { error } = await supabase
      .from('objectives')
      .delete()
      .eq('id', objectiveId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Objective delete error:', error);
      return NextResponse.json({ error: '削除に失敗しました' }, { status: 500 });
    }

    // アクティビティログ記録
    await logActivityForUser({
      userId: user.id,
      action: 'delete',
      resourceType: 'objective',
      resourceId: objectiveId,
      details: { title: existingObjective?.title },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Objective DELETE error:', error);
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 });
  }
}
