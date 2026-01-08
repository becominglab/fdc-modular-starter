import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const createSchema = z.object({
  title: z.string().min(1, 'タイトルは必須です'),
  description: z.string().optional(),
  due_date: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  parent_item_id: z.string().uuid().optional(),
});

type RouteParams = { params: Promise<{ mapId: string }> };

// GET: ActionItems 一覧取得
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { mapId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('action_items')
      .select('*')
      .eq('action_map_id', mapId)
      .eq('user_id', user.id)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('ActionItems fetch error:', error);
      return NextResponse.json({ error: '取得に失敗しました' }, { status: 500 });
    }

    // 各アイテムの進捗率を計算
    const itemsWithProgress = await Promise.all(
      (data || []).map(async (item) => {
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

    return NextResponse.json(itemsWithProgress);
  } catch (error) {
    console.error('ActionItems GET error:', error);
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 });
  }
}

// POST: ActionItem 作成
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { mapId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { data: actionMap } = await supabase
      .from('action_maps')
      .select('id')
      .eq('id', mapId)
      .eq('user_id', user.id)
      .single();

    if (!actionMap) {
      return NextResponse.json({ error: 'ActionMapが見つかりません' }, { status: 404 });
    }

    const body = await request.json();
    const result = createSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: '入力データが不正です', issues: result.error.issues },
        { status: 400 }
      );
    }

    const { data: lastItem } = await supabase
      .from('action_items')
      .select('sort_order')
      .eq('action_map_id', mapId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single();

    const nextSortOrder = (lastItem?.sort_order || 0) + 1;

    const { data, error } = await supabase
      .from('action_items')
      .insert({
        ...result.data,
        action_map_id: mapId,
        user_id: user.id,
        sort_order: nextSortOrder,
      })
      .select()
      .single();

    if (error) {
      console.error('ActionItem create error:', error);
      return NextResponse.json({ error: '作成に失敗しました' }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('ActionItems POST error:', error);
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 });
  }
}
