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
          id,
          status
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

    // 進捗率を計算
    const mapsWithProgress = (data || []).map((map) => {
      const items = map.action_items || [];
      const totalItems = items.length;
      const doneItems = items.filter((item: { status: string | null }) => item.status === 'done').length;
      const progressRate = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;

      return {
        ...map,
        progress_rate: progressRate,
        action_items: undefined,
      };
    });

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
