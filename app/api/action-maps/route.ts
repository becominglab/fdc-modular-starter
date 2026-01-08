import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const createSchema = z.object({
  title: z.string().min(1, 'タイトルは必須です'),
  description: z.string().optional(),
  target_period_start: z.string().optional(),
  target_period_end: z.string().optional(),
});

// GET: ActionMap 一覧取得（進捗率計算付き）
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const includeArchived = searchParams.get('include_archived') === 'true';

    let query = supabase
      .from('action_maps')
      .select(`
        *,
        action_items (
          id
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!includeArchived) {
      query = query.eq('is_archived', false);
    }

    const { data, error } = await query;

    if (error) {
      console.error('ActionMaps fetch error:', error);
      return NextResponse.json({ error: '取得に失敗しました' }, { status: 500 });
    }

    // 各ActionMapの進捗率を計算（子ActionItemのTask完了率の平均）
    const mapsWithProgress = await Promise.all(
      (data || []).map(async (map) => {
        const items = map.action_items || [];
        const totalItems = items.length;

        if (totalItems === 0) {
          return {
            ...map,
            progress_rate: 0,
            action_item_count: 0,
            action_items: undefined,
          };
        }

        // 各ActionItemの進捗率を計算
        const itemProgressRates = await Promise.all(
          items.map(async (item: { id: string }) => {
            const { data: tasks } = await supabase
              .from('tasks')
              .select('status')
              .eq('action_item_id', item.id);

            const totalTasks = tasks?.length || 0;
            const doneTasks = tasks?.filter((t) => t.status === 'done').length || 0;
            return totalTasks > 0 ? (doneTasks / totalTasks) * 100 : 0;
          })
        );

        // ActionItemの進捗率の平均
        const avgProgress = Math.round(
          itemProgressRates.reduce((sum, rate) => sum + rate, 0) / itemProgressRates.length
        );

        return {
          ...map,
          progress_rate: avgProgress,
          action_item_count: totalItems,
          action_items: undefined,
        };
      })
    );

    return NextResponse.json(mapsWithProgress);
  } catch (error) {
    console.error('ActionMaps GET error:', error);
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 });
  }
}

// POST: ActionMap 作成
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const body = await request.json();
    const result = createSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: '入力データが不正です', issues: result.error.issues },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('action_maps')
      .insert({
        ...result.data,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('ActionMap create error:', error);
      return NextResponse.json({ error: '作成に失敗しました' }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('ActionMaps POST error:', error);
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 });
  }
}
