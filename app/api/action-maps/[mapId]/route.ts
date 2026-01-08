import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  target_period_start: z.string().optional().nullable(),
  target_period_end: z.string().optional().nullable(),
  is_archived: z.boolean().optional(),
});

type RouteParams = { params: Promise<{ mapId: string }> };

// GET: ActionMap 詳細取得（ActionItems + 進捗付き）
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { mapId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { data: actionMap, error: mapError } = await supabase
      .from('action_maps')
      .select('*')
      .eq('id', mapId)
      .eq('user_id', user.id)
      .single();

    if (mapError || !actionMap) {
      return NextResponse.json({ error: '見つかりません' }, { status: 404 });
    }

    const { data: actionItems, error: itemsError } = await supabase
      .from('action_items')
      .select('*')
      .eq('action_map_id', mapId)
      .order('sort_order', { ascending: true });

    if (itemsError) {
      console.error('ActionItems fetch error:', itemsError);
    }

    // 各 ActionItem の進捗率を計算
    const itemsWithProgress = await Promise.all(
      (actionItems || []).map(async (item) => {
        const { data: tasks } = await supabase
          .from('tasks')
          .select('status')
          .eq('action_item_id', item.id);

        const totalTasks = tasks?.length || 0;
        const doneTasks = tasks?.filter((t) => t.status === 'done').length || 0;
        const progressRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

        return {
          ...item,
          progress_rate: progressRate,
          linked_task_count: totalTasks,
          completed_task_count: doneTasks,
        };
      })
    );

    const totalItems = itemsWithProgress.length;
    const doneItems = itemsWithProgress.filter((item) => item.status === 'done').length;
    const mapProgressRate = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;

    return NextResponse.json({
      ...actionMap,
      progress_rate: mapProgressRate,
      action_items: itemsWithProgress,
    });
  } catch (error) {
    console.error('ActionMap GET error:', error);
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 });
  }
}

// PATCH: ActionMap 更新
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { mapId } = await params;
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
      .from('action_maps')
      .update({
        ...result.data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', mapId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('ActionMap update error:', error);
      return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('ActionMap PATCH error:', error);
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 });
  }
}

// DELETE: ActionMap 削除
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { mapId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { error } = await supabase
      .from('action_maps')
      .delete()
      .eq('id', mapId)
      .eq('user_id', user.id);

    if (error) {
      console.error('ActionMap delete error:', error);
      return NextResponse.json({ error: '削除に失敗しました' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('ActionMap DELETE error:', error);
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 });
  }
}
