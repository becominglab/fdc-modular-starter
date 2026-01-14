import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { logActivityForUser } from '@/lib/utils/audit-log';

const createSchema = z.object({
  title: z.string().min(1, 'タイトルは必須です'),
  target_value: z.number().positive('目標値は正の数である必要があります'),
  current_value: z.number().min(0).default(0),
  unit: z.string().min(1, '単位は必須です'),
});

type RouteParams = { params: Promise<{ objectiveId: string }> };

// GET: Key Results 一覧取得
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { objectiveId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('key_results')
      .select('*')
      .eq('objective_id', objectiveId)
      .eq('user_id', user.id)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Key Results fetch error:', error);
      return NextResponse.json({ error: '取得に失敗しました' }, { status: 500 });
    }

    // 各KRの進捗率を計算
    const krsWithProgress = await Promise.all(
      (data || []).map(async (kr) => {
        const progressRate = kr.target_value > 0
          ? Math.min(Math.round((kr.current_value / kr.target_value) * 100), 100)
          : 0;

        // 紐付いたActionMapの数を取得
        const { count } = await supabase
          .from('action_maps')
          .select('id', { count: 'exact', head: true })
          .eq('key_result_id', kr.id);

        return {
          ...kr,
          progress_rate: progressRate,
          action_map_count: count || 0,
        };
      })
    );

    return NextResponse.json(krsWithProgress);
  } catch (error) {
    console.error('Key Results GET error:', error);
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 });
  }
}

// POST: Key Result 作成
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { objectiveId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // Objective の存在確認
    const { data: objective } = await supabase
      .from('objectives')
      .select('id')
      .eq('id', objectiveId)
      .eq('user_id', user.id)
      .single();

    if (!objective) {
      return NextResponse.json({ error: 'Objectiveが見つかりません' }, { status: 404 });
    }

    const body = await request.json();
    const result = createSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: '入力データが不正です', issues: result.error.issues },
        { status: 400 }
      );
    }

    // sort_order を自動設定
    const { data: lastKr } = await supabase
      .from('key_results')
      .select('sort_order')
      .eq('objective_id', objectiveId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single();

    const nextSortOrder = (lastKr?.sort_order || 0) + 1;

    const { data, error } = await supabase
      .from('key_results')
      .insert({
        ...result.data,
        objective_id: objectiveId,
        user_id: user.id,
        sort_order: nextSortOrder,
      })
      .select()
      .single();

    if (error) {
      console.error('Key Result create error:', error);
      return NextResponse.json({ error: '作成に失敗しました' }, { status: 500 });
    }

    // アクティビティログ記録
    await logActivityForUser({
      userId: user.id,
      action: 'create',
      resourceType: 'key_result',
      resourceId: data.id,
      details: { title: data.title, target_value: data.target_value, unit: data.unit },
    });

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Key Results POST error:', error);
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 });
  }
}
